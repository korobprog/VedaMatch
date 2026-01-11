package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// NewsSchedulerService manages background fetching of news from sources
type NewsSchedulerService struct {
	db            *gorm.DB
	parserService *ParserService
	ticker        *time.Ticker
	stopChan      chan struct{}
	running       bool
	mu            sync.Mutex
}

// NewNewsSchedulerService creates a new scheduler service
func NewNewsSchedulerService() *NewsSchedulerService {
	return &NewsSchedulerService{
		db:            database.DB,
		parserService: NewParserService(),
		stopChan:      make(chan struct{}),
	}
}

// Start begins the background scheduler
func (s *NewsSchedulerService) Start(interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		log.Println("[NewsScheduler] Already running")
		return
	}

	s.ticker = time.NewTicker(interval)
	s.running = true

	log.Printf("[NewsScheduler] Started with interval %v", interval)

	go func() {
		// Run immediately on start
		s.processAllSources()

		for {
			select {
			case <-s.ticker.C:
				s.processAllSources()
			case <-s.stopChan:
				log.Println("[NewsScheduler] Stopped")
				return
			}
		}
	}()
}

// Stop stops the background scheduler
func (s *NewsSchedulerService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return
	}

	s.ticker.Stop()
	close(s.stopChan)
	s.running = false
}

// processAllSources fetches news from all active sources
func (s *NewsSchedulerService) processAllSources() {
	log.Println("[NewsScheduler] Processing all active sources...")

	var sources []models.NewsSource
	if err := s.db.Where("is_active = ?", true).Find(&sources).Error; err != nil {
		log.Printf("[NewsScheduler] Error fetching sources: %v", err)
		return
	}

	log.Printf("[NewsScheduler] Found %d active sources", len(sources))

	for _, source := range sources {
		// Check if it's time to fetch based on interval
		if !s.shouldFetch(source) {
			continue
		}

		go s.processSource(source)
	}
}

// shouldFetch checks if enough time has passed since last fetch
func (s *NewsSchedulerService) shouldFetch(source models.NewsSource) bool {
	if source.LastFetchedAt == nil {
		return true
	}

	interval := time.Duration(source.FetchInterval) * time.Second
	return time.Since(*source.LastFetchedAt) >= interval
}

// processSource fetches and saves news from a single source
func (s *NewsSchedulerService) processSource(source models.NewsSource) {
	log.Printf("[NewsScheduler] Processing source: %s (%s)", source.Name, source.SourceType)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Get the source URL based on type
	sourceURL := s.getSourceURL(source)
	if sourceURL == "" {
		s.updateSourceError(source.ID, "No valid URL configured")
		return
	}

	// Parse the source
	items, err := s.parserService.Parse(ctx, string(source.SourceType), sourceURL)
	if err != nil {
		log.Printf("[NewsScheduler] Error parsing source %s: %v", source.Name, err)
		s.updateSourceError(source.ID, err.Error())
		return
	}

	log.Printf("[NewsScheduler] Parsed %d items from %s", len(items), source.Name)

	// Save parsed items
	newCount := 0
	for _, item := range items {
		if s.saveNewsItem(source, item) {
			newCount++
		}
	}

	log.Printf("[NewsScheduler] Saved %d new items from %s", newCount, source.Name)

	// Update last fetched time
	s.updateSourceSuccess(source.ID)
}

// getSourceURL returns the URL to fetch based on source type
func (s *NewsSchedulerService) getSourceURL(source models.NewsSource) string {
	switch source.SourceType {
	case models.NewsSourceTypeRSS, models.NewsSourceTypeURL:
		return source.URL
	case models.NewsSourceTypeVK:
		// Return VK group ID for the parser
		if source.VKGroupID != "" {
			return source.VKGroupID
		}
		return source.URL
	case models.NewsSourceTypeTelegram:
		// Return Telegram channel ID for the parser
		id := source.TelegramID
		if id == "" {
			id = source.URL
		}
		if source.TGParserType == "web" {
			return "WEB:" + id
		}
		return id
	default:
		return source.URL
	}
}

// saveNewsItem saves a parsed item to the database if it doesn't exist
func (s *NewsSchedulerService) saveNewsItem(source models.NewsSource, item ParsedContent) bool {
	// Check for duplicates by external ID or URL
	var existing models.NewsItem
	query := s.db.Where("source_id = ?", source.ID)

	if item.ExternalID != "" {
		query = query.Where("external_id = ?", item.ExternalID)
	} else if item.SourceURL != "" {
		query = query.Where("original_url = ?", item.SourceURL)
	}

	if err := query.First(&existing).Error; err == nil {
		// Already exists
		return false
	}

	// Determine status based on source mode
	status := models.NewsItemStatusDraft
	if source.Mode == models.NewsSourceModeAutoPublish {
		status = models.NewsItemStatusPublished
	}

	// Determine which language fields to fill
	titleRu, titleEn := "", ""
	contentRu, contentEn := "", ""
	summaryRu, summaryEn := "", ""

	if item.Language == "ru" {
		titleRu = item.Title
		contentRu = item.Content
		summaryRu = item.Summary
	} else {
		titleEn = item.Title
		contentEn = item.Content
		summaryEn = item.Summary
	}

	// Create news item
	newsItem := models.NewsItem{
		SourceID:         source.ID,
		OriginalTitle:    item.Title,
		OriginalContent:  item.Content,
		OriginalLang:     item.Language,
		OriginalURL:      item.SourceURL,
		OriginalImageURL: item.ImageURL,
		TitleRu:          titleRu,
		TitleEn:          titleEn,
		SummaryRu:        summaryRu,
		SummaryEn:        summaryEn,
		ContentRu:        contentRu,
		ContentEn:        contentEn,
		ImageURL:         item.ImageURL,
		Tags:             joinTags(item.Tags, source.DefaultTags),
		Status:           status,
		ExternalID:       item.ExternalID,
	}

	// Set published date
	if !item.PublishedAt.IsZero() {
		newsItem.PublishedAt = &item.PublishedAt
	}
	if status == models.NewsItemStatusPublished {
		now := time.Now()
		newsItem.PublishedAt = &now
	}

	if err := s.db.Create(&newsItem).Error; err != nil {
		log.Printf("[NewsScheduler] Error saving news item: %v", err)
		return false
	}

	// Trigger AI processing in background
	go func(id uint) {
		if err := GetNewsAIService().ProcessNewsItem(id); err != nil {
			log.Printf("[NewsScheduler] Error in AI processing for item %d: %v", id, err)
		}
	}(newsItem.ID)

	return true
}

// updateSourceError marks source as having an error
func (s *NewsSchedulerService) updateSourceError(sourceID uint, errMsg string) {
	s.db.Model(&models.NewsSource{}).Where("id = ?", sourceID).Updates(map[string]interface{}{
		"last_error":      errMsg,
		"last_fetched_at": time.Now(),
	})
}

// updateSourceSuccess marks source as successfully fetched
func (s *NewsSchedulerService) updateSourceSuccess(sourceID uint) {
	s.db.Model(&models.NewsSource{}).Where("id = ?", sourceID).Updates(map[string]interface{}{
		"last_error":      nil,
		"last_fetched_at": time.Now(),
	})
}

// FetchSourceNow immediately fetches news from a specific source
func (s *NewsSchedulerService) FetchSourceNow(sourceID uint) error {
	var source models.NewsSource
	if err := s.db.First(&source, sourceID).Error; err != nil {
		return fmt.Errorf("source not found: %w", err)
	}

	go s.processSource(source)
	return nil
}

// Helper function to join tags
func joinTags(itemTags []string, defaultTags string) string {
	allTags := make([]string, 0)

	// Add item tags
	allTags = append(allTags, itemTags...)

	// Add default tags from source
	if defaultTags != "" {
		for _, tag := range splitTags(defaultTags) {
			// Avoid duplicates
			found := false
			for _, existing := range allTags {
				if existing == tag {
					found = true
					break
				}
			}
			if !found {
				allTags = append(allTags, tag)
			}
		}
	}

	return joinTagsToString(allTags)
}

func splitTags(tags string) []string {
	result := make([]string, 0)
	for _, tag := range strings.Split(tags, ",") {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			result = append(result, tag)
		}
	}
	return result
}

func joinTagsToString(tags []string) string {
	return strings.Join(tags, ",")
}

// Global instance
var newsScheduler *NewsSchedulerService

// GetNewsScheduler returns the global scheduler instance
func GetNewsScheduler() *NewsSchedulerService {
	if newsScheduler == nil {
		newsScheduler = NewNewsSchedulerService()
	}
	return newsScheduler
}

// StartNewsScheduler starts the global news scheduler
func StartNewsScheduler() {
	scheduler := GetNewsScheduler()
	scheduler.Start(5 * time.Minute) // Check every 5 minutes
}

// StopNewsScheduler stops the global news scheduler
func StopNewsScheduler() {
	if newsScheduler != nil {
		newsScheduler.Stop()
	}
}
