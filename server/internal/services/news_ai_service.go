package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// NewsAIService handles AI processing of news content
type NewsAIService struct {
	db            *gorm.DB
	aiChatService *AiChatService
}

// NewNewsAIService creates a new NewsAIService
func NewNewsAIService() *NewsAIService {
	return &NewsAIService{
		db:            database.DB,
		aiChatService: NewAiChatService(),
	}
}

// ProcessNewsItem applies AI processing to a news item
func (s *NewsAIService) ProcessNewsItem(newsID uint) error {
	var newsItem models.NewsItem
	if err := s.db.First(&newsItem, newsID).Error; err != nil {
		return fmt.Errorf("news item not found: %w", err)
	}

	// Skip if already processed
	if newsItem.AIProcessed {
		log.Printf("[NewsAI] Item %d already processed, skipping", newsID)
		return nil
	}

	log.Printf("[NewsAI] Processing news item ID: %d", newsID)

	// Get original content
	originalContent := newsItem.OriginalContent
	if originalContent == "" {
		originalContent = newsItem.ContentRu
		if originalContent == "" {
			originalContent = newsItem.ContentEn
		}
	}

	if originalContent == "" {
		return fmt.Errorf("no content to process")
	}

	// 1. Generate summary if missing
	if newsItem.SummaryRu == "" && newsItem.OriginalLang == "ru" {
		summary, err := s.GenerateSummary(originalContent, "ru")
		if err != nil {
			log.Printf("[NewsAI] Error generating RU summary: %v", err)
		} else {
			newsItem.SummaryRu = summary
		}
	}

	// 2. Apply style transfer (Sattva style) if enabled
	var source models.NewsSource
	hasSource := false
	if err := s.db.First(&source, newsItem.SourceID).Error; err == nil {
		hasSource = true
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("[NewsAI] Failed to load source %d for item %d: %v", newsItem.SourceID, newsItem.ID, err)
	}

	if hasSource && source.StyleTransfer && newsItem.ContentRu == "" && newsItem.OriginalLang == "ru" {
		styledContent, err := s.ApplyStyleTransfer(originalContent)
		if err != nil {
			log.Printf("[NewsAI] Error applying style transfer: %v", err)
			newsItem.ContentRu = originalContent
		} else {
			newsItem.ContentRu = styledContent
		}
	} else if newsItem.ContentRu == "" && newsItem.OriginalLang == "ru" {
		newsItem.ContentRu = originalContent
	}

	// 3. Translate if needed
	if hasSource && source.AutoTranslate {
		if newsItem.OriginalLang == "ru" && newsItem.TitleEn == "" {
			titleEn, err := s.TranslateToEnglish(newsItem.TitleRu)
			if err != nil {
				log.Printf("[NewsAI] Error translating title: %v", err)
			} else {
				newsItem.TitleEn = titleEn
			}

			if newsItem.ContentRu != "" && newsItem.ContentEn == "" {
				contentEn, err := s.TranslateToEnglish(newsItem.ContentRu)
				if err != nil {
					log.Printf("[NewsAI] Error translating content: %v", err)
				} else {
					newsItem.ContentEn = contentEn
				}
			}

			if newsItem.SummaryRu != "" && newsItem.SummaryEn == "" {
				summaryEn, err := s.TranslateToEnglish(newsItem.SummaryRu)
				if err != nil {
					log.Printf("[NewsAI] Error translating summary: %v", err)
				} else {
					newsItem.SummaryEn = summaryEn
				}
			}
		} else if newsItem.OriginalLang == "en" && newsItem.TitleRu == "" {
			titleRu, err := s.TranslateToRussian(newsItem.TitleEn)
			if err != nil {
				log.Printf("[NewsAI] Error translating title: %v", err)
			} else {
				newsItem.TitleRu = titleRu
			}
		}
	}

	// 4. Auto-tag if no tags
	if newsItem.Tags == "" || newsItem.Category == "" {
		category, tags, err := s.ClassifyContent(originalContent)
		if err != nil {
			log.Printf("[NewsAI] Error classifying content: %v", err)
		} else {
			if newsItem.Category == "" {
				newsItem.Category = category
			}
			if newsItem.Tags == "" {
				newsItem.Tags = strings.Join(tags, ",")
			}
		}
	}

	// 5. Inherit target audience from source if empty
	if hasSource {
		if newsItem.TargetMadh == "" {
			newsItem.TargetMadh = source.TargetMadh
		}
		if newsItem.TargetYoga == "" {
			newsItem.TargetYoga = source.TargetYoga
		}
		if newsItem.TargetIdentity == "" {
			newsItem.TargetIdentity = source.TargetIdentity
		}
	}

	// 6. Deep classification (detect missing targets)
	if newsItem.TargetMadh == "" || newsItem.TargetIdentity == "" {
		madh, yoga, identity, err := s.DeepClassifyTarget(originalContent)
		if err == nil {
			if newsItem.TargetMadh == "" {
				newsItem.TargetMadh = madh
			}
			if newsItem.TargetYoga == "" {
				newsItem.TargetYoga = yoga
			}
			if newsItem.TargetIdentity == "" {
				newsItem.TargetIdentity = identity
			}
		}
	}

	// Mark as processed
	now := time.Now()
	newsItem.AIProcessed = true
	newsItem.AIProcessedAt = &now

	if err := s.db.Save(&newsItem).Error; err != nil {
		return fmt.Errorf("failed to save processed item: %w", err)
	}

	log.Printf("[NewsAI] Successfully processed news item ID: %d", newsID)
	return nil
}

// GenerateSummary creates a short summary of the content
func (s *NewsAIService) GenerateSummary(content string, lang string) (string, error) {
	langInstruction := "на русском языке"
	if lang == "en" {
		langInstruction = "in English"
	}

	prompt := fmt.Sprintf(`Сделай краткое summary (2-3 предложения) %s для следующего текста новости. 
Ответь только summary, без пояснений:

%s`, langInstruction, truncateText(content, 3000))

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		return "", fmt.Errorf("AI request failed: %w", err)
	}

	return strings.TrimSpace(response), nil
}

// ApplyStyleTransfer rewrites content in Sattva/spiritual style
func (s *NewsAIService) ApplyStyleTransfer(content string) (string, error) {
	prompt := fmt.Sprintf(`Перепиши следующий текст новости в духовном, саттвичном стиле. 
Сохрани ключевые факты, но добавь позитивную, возвышающую интонацию.
Избегай негатива и конфликтов, фокусируйся на конструктивных аспектах.
Ответь только переписанным текстом:

%s`, truncateText(content, 4000))

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		return "", fmt.Errorf("AI style transfer failed: %w", err)
	}

	return strings.TrimSpace(response), nil
}

// TranslateToEnglish translates Russian text to English
func (s *NewsAIService) TranslateToEnglish(text string) (string, error) {
	if text == "" {
		return "", nil
	}

	prompt := fmt.Sprintf(`Translate the following Russian text to English. 
Respond with only the translation, no explanations:

%s`, truncateText(text, 4000))

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		return "", fmt.Errorf("translation failed: %w", err)
	}

	return strings.TrimSpace(response), nil
}

// TranslateToRussian translates English text to Russian
func (s *NewsAIService) TranslateToRussian(text string) (string, error) {
	if text == "" {
		return "", nil
	}

	prompt := fmt.Sprintf(`Переведи следующий английский текст на русский язык.
Ответь только переводом, без пояснений:

%s`, truncateText(text, 4000))

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		return "", fmt.Errorf("translation failed: %w", err)
	}

	return strings.TrimSpace(response), nil
}

// ClassifyContent determines category and tags for content
// DeepClassifyTarget uses AI to detect spiritual tradition, yoga style, and identity from content
func (s *NewsAIService) DeepClassifyTarget(content string) (madh, yoga, identity string, err error) {
	prompt := fmt.Sprintf(`Проанализируй текст новости и определи, к какой духовной традиции (Madh), стилю йоги или социальной категории (Identity) он относится.
Текст: %s

Возможные значения для madh (примеры): iskcon, gaudiya, vedic, krishna-consciousness, srivaishnava, bvs-source.
Возможные значения для yoga (примеры): bhakti, hatha, kundalini, meditation, kirtan.
Возможные значения для identity (примеры): brahmana, seeker, teacher, mentor, leader.

Ответь строго в формате JSON:
{
  "madh": "название традиции через запятую (например: iskcon, gaudiya)",
  "yoga": "стиль йоги через запятую (например: bhakti, meditation)",
  "identity": "категория через запятую (например: seeker, teacher)"
}
Если не можешь определить - оставь поле пустым.`, truncateText(content, 1000))

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		return "", "", "", err
	}

	// Try to extract JSON from response
	re := regexp.MustCompile(`\{.*\}`)
	jsonStr := re.FindString(response)
	if jsonStr == "" {
		return "", "", "", fmt.Errorf("no JSON found in AI response")
	}

	var result struct {
		Madh     string `json:"madh"`
		Yoga     string `json:"yoga"`
		Identity string `json:"identity"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return "", "", "", err
	}

	return result.Madh, result.Yoga, result.Identity, nil
}

func (s *NewsAIService) ClassifyContent(content string) (string, []string, error) {
	prompt := fmt.Sprintf(`Проанализируй следующий текст новости и определи:
1. Категорию (одну из: spiritual, events, education, wellness, community, other)
2. Теги (до 5 релевантных тегов через запятую)

Ответь в формате:
CATEGORY: [категория]
TAGS: [тег1, тег2, тег3]

Текст:
%s`, truncateText(content, 2000))

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		return "", nil, fmt.Errorf("classification failed: %w", err)
	}

	// Parse response
	category := "other"
	var tags []string

	lines := strings.Split(response, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToUpper(line), "CATEGORY:") {
			category = strings.TrimSpace(strings.TrimPrefix(line, "CATEGORY:"))
			category = strings.TrimPrefix(category, "category:")
			category = strings.ToLower(strings.TrimSpace(category))
		} else if strings.HasPrefix(strings.ToUpper(line), "TAGS:") {
			tagStr := strings.TrimSpace(strings.TrimPrefix(line, "TAGS:"))
			tagStr = strings.TrimPrefix(tagStr, "tags:")
			for _, tag := range strings.Split(tagStr, ",") {
				tag = strings.TrimSpace(tag)
				if tag != "" {
					tags = append(tags, tag)
				}
			}
		}
	}

	return category, tags, nil
}

// ProcessPendingNews processes all unprocessed news items
func (s *NewsAIService) ProcessPendingNews(ctx context.Context, limit int) error {
	var items []models.NewsItem
	if err := s.db.Where("ai_processed = ? OR ai_processed IS NULL", false).
		Order("created_at ASC").
		Limit(limit).
		Find(&items).Error; err != nil {
		return fmt.Errorf("failed to fetch pending items: %w", err)
	}

	log.Printf("[NewsAI] Found %d items to process", len(items))

	for _, item := range items {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if err := s.ProcessNewsItem(item.ID); err != nil {
				log.Printf("[NewsAI] Error processing item %d: %v", item.ID, err)
				// Save error
				if saveErr := s.db.Model(&item).Updates(map[string]interface{}{
					"ai_processing_error": err.Error(),
				}).Error; saveErr != nil {
					log.Printf("[NewsAI] Failed to persist processing error for item %d: %v", item.ID, saveErr)
				}
			}
			// Rate limiting - wait between requests
			time.Sleep(2 * time.Second)
		}
	}

	return nil
}

// Helper function to truncate text
func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}

// ==================== AI ASSISTANT INTEGRATION ====================

// GetLatestNewsSummary returns a summary of the latest news for the AI assistant
func (s *NewsAIService) GetLatestNewsSummary(lang string, limit int) (string, error) {
	if limit <= 0 {
		limit = 5
	}

	var newsItems []models.NewsItem
	if err := s.db.Where("status = ?", models.NewsItemStatusPublished).
		Order("published_at DESC").
		Limit(limit).
		Find(&newsItems).Error; err != nil {
		return "", fmt.Errorf("failed to fetch news: %w", err)
	}

	if len(newsItems) == 0 {
		if lang == "en" {
			return "There are no news in the system yet.", nil
		}
		return "В системе пока нет новостей.", nil
	}

	// Build news list for summarization
	var newsTexts []string
	for i, item := range newsItems {
		title := item.TitleRu
		summary := item.SummaryRu
		if lang == "en" && item.TitleEn != "" {
			title = item.TitleEn
			summary = item.SummaryEn
		}
		if summary == "" {
			summary = truncateText(item.ContentRu, 200)
			if lang == "en" && item.ContentEn != "" {
				summary = truncateText(item.ContentEn, 200)
			}
		}
		newsTexts = append(newsTexts, fmt.Sprintf("%d. %s: %s", i+1, title, summary))
	}

	newsContext := strings.Join(newsTexts, "\n")

	prompt := fmt.Sprintf("Вот список последних новостей:\n\n%s\n\n", newsContext)
	if lang == "en" {
		prompt += "Please provide a brief, friendly summary of these news items in English. Be concise but informative."
	} else {
		prompt += "Пожалуйста, сделай краткий, дружелюбный обзор этих новостей на русском языке. Будь кратким, но информативным."
	}

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		// Fallback: just return the list
		if lang == "en" {
			return "📰 Latest news:\n" + newsContext, nil
		}
		return "📰 Последние новости:\n" + newsContext, nil
	}

	return response, nil
}

// SearchAndSummarizeNews searches news by query and returns a summary
func (s *NewsAIService) SearchAndSummarizeNews(query string, lang string) (string, error) {
	// Search in news
	searchPattern := "%" + query + "%"

	var newsItems []models.NewsItem
	dbQuery := s.db.Where("status = ?", models.NewsItemStatusPublished)

	if lang == "en" {
		dbQuery = dbQuery.Where("title_en ILIKE ? OR summary_en ILIKE ? OR content_en ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	} else {
		dbQuery = dbQuery.Where("title_ru ILIKE ? OR summary_ru ILIKE ? OR content_ru ILIKE ? OR tags ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if err := dbQuery.Order("published_at DESC").Limit(5).Find(&newsItems).Error; err != nil {
		return "", fmt.Errorf("search failed: %w", err)
	}

	if len(newsItems) == 0 {
		if lang == "en" {
			return fmt.Sprintf("I couldn't find any news about '%s'.", query), nil
		}
		return fmt.Sprintf("Я не нашёл новостей по запросу '%s'.", query), nil
	}

	// Build context
	var newsTexts []string
	for _, item := range newsItems {
		title := item.TitleRu
		summary := item.SummaryRu
		if lang == "en" && item.TitleEn != "" {
			title = item.TitleEn
			summary = item.SummaryEn
		}
		if summary == "" {
			summary = truncateText(item.ContentRu, 300)
		}
		newsTexts = append(newsTexts, fmt.Sprintf("- %s: %s", title, summary))
	}

	newsContext := strings.Join(newsTexts, "\n")

	prompt := fmt.Sprintf("Пользователь спрашивает о: %s\n\nНайденные новости:\n%s\n\n", query, newsContext)
	if lang == "en" {
		prompt += "Based on these news articles, provide a helpful summary answering the user's query in English."
	} else {
		prompt += "Основываясь на этих новостях, дай полезный ответ на запрос пользователя на русском языке."
	}

	response, err := s.aiChatService.GenerateSimpleResponse(prompt)
	if err != nil {
		if lang == "en" {
			return "📰 Found news:\n" + newsContext, nil
		}
		return "📰 Найденные новости:\n" + newsContext, nil
	}

	return response, nil
}

// IsNewsQuery checks if the user message is asking about news
func IsNewsQuery(message string) bool {
	message = strings.ToLower(message)

	newsKeywords := []string{
		"новости", "новость", "что нового", "последние новости",
		"расскажи новости", "какие новости", "есть новости",
		"news", "what's new", "latest news", "any news",
		"tell me news", "what happened", "updates",
	}

	for _, keyword := range newsKeywords {
		if strings.Contains(message, keyword) {
			return true
		}
	}

	return false
}

// ExtractNewsSearchQuery extracts the search topic from a news query
func ExtractNewsSearchQuery(message string) string {
	message = strings.ToLower(message)

	// Remove common prefixes
	prefixes := []string{
		"расскажи о новостях про", "расскажи новости про", "новости про", "новости о",
		"что нового про", "что нового о", "есть новости про", "есть новости о",
		"news about", "tell me about", "what's new about", "any news about",
		"search news for", "find news about",
	}

	for _, prefix := range prefixes {
		if strings.HasPrefix(message, prefix) {
			return strings.TrimSpace(strings.TrimPrefix(message, prefix))
		}
	}

	return ""
}

// Global instance
var newsAIService *NewsAIService

// GetNewsAIService returns the global NewsAIService instance
func GetNewsAIService() *NewsAIService {
	if newsAIService == nil {
		newsAIService = NewNewsAIService()
	}
	return newsAIService
}
