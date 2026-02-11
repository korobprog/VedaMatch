package handlers

import (
	"encoding/json"
	"log"
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// NewsHandler handles news-related API requests
type NewsHandler struct{}

// NewNewsHandler creates a new NewsHandler
func NewNewsHandler() *NewsHandler {
	return &NewsHandler{}
}

func boundedNewsQueryInt(c *fiber.Ctx, key string, def int, min int, max int) int {
	value := c.QueryInt(key, def)
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

func isValidNewsItemStatus(status models.NewsItemStatus) bool {
	switch status {
	case models.NewsItemStatusDraft, models.NewsItemStatusPublished, models.NewsItemStatusArchived, models.NewsItemStatusDeleted:
		return true
	default:
		return false
	}
}

func isValidNewsSourceType(sourceType models.NewsSourceType) bool {
	switch sourceType {
	case models.NewsSourceTypeVK, models.NewsSourceTypeTelegram, models.NewsSourceTypeRSS, models.NewsSourceTypeURL:
		return true
	default:
		return false
	}
}

func isValidNewsSourceMode(mode models.NewsSourceMode) bool {
	switch mode {
	case models.NewsSourceModeAutoPublish, models.NewsSourceModeDraft:
		return true
	default:
		return false
	}
}

func parseNewsBoolQuery(value string) bool {
	return strings.ToLower(strings.TrimSpace(value)) == "true"
}

// ==================== PUBLIC ENDPOINTS ====================

// GetNews returns a paginated list of published news
// GET /api/news
func (h *NewsHandler) GetNews(c *fiber.Ctx) error {
	page := boundedNewsQueryInt(c, "page", 1, 1, 100000)
	limit := boundedNewsQueryInt(c, "limit", 20, 1, 100)
	lang := strings.ToLower(strings.TrimSpace(c.Query("lang", "ru")))
	if lang != "en" {
		lang = "ru"
	}
	category := strings.TrimSpace(c.Query("category", ""))
	tags := strings.TrimSpace(c.Query("tags", ""))
	search := strings.TrimSpace(c.Query("search", ""))
	madhParam := strings.TrimSpace(c.Query("madh", ""))

	personalized := parseNewsBoolQuery(c.Query("personalized", "false"))

	offset := (page - 1) * limit

	query := database.DB.Model(&models.NewsItem{}).
		Where("status = ?", models.NewsItemStatusPublished)

	// Personalized filtering (Top recommendation logic)
	if personalized {
		// Get current user from context safely
		val := c.Locals("user")
		if val != nil {
			user, ok := val.(*models.User)
			if ok && user != nil {
				// Filter news that match user's profile OR are for everyone (empty target)
				if user.Madh != "" {
					query = query.Where("(target_madh = '' OR target_madh LIKE ?)", "%"+user.Madh+"%")
				}
				if user.Identity != "" {
					query = query.Where("(target_identity = '' OR target_identity LIKE ?)", "%"+user.Identity+"%")
				}
				if user.YogaStyle != "" {
					query = query.Where("(target_yoga = '' OR target_yoga LIKE ?)", "%"+user.YogaStyle+"%")
				}
			}
		}
	}

	query = query.Order("is_important DESC, published_at DESC")

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if madhParam != "" {
		query = query.Where("target_madh LIKE ?", "%"+madhParam+"%")
	}
	if tags != "" {
		// Search for any of the provided tags (OR)
		tagList := strings.Split(tags, ",")
		conditions := make([]string, 0, len(tagList))
		args := make([]interface{}, 0, len(tagList))
		for _, tag := range tagList {
			cleanTag := strings.TrimSpace(tag)
			if cleanTag == "" {
				continue
			}
			conditions = append(conditions, "tags ILIKE ?")
			args = append(args, "%"+cleanTag+"%")
		}
		if len(conditions) > 0 {
			query = query.Where("("+strings.Join(conditions, " OR ")+")", args...)
		}
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		if lang == "en" {
			query = query.Where("title_en ILIKE ? OR summary_en ILIKE ?", searchPattern, searchPattern)
		} else {
			query = query.Where("title_ru ILIKE ? OR summary_ru ILIKE ?", searchPattern, searchPattern)
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Printf("[NEWS] Error counting news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch news"})
	}

	var newsItems []models.NewsItem
	if err := query.Preload("Source").Offset(offset).Limit(limit).Find(&newsItems).Error; err != nil {
		log.Printf("[NEWS] Error fetching news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch news"})
	}

	// Convert to responses
	responses := make([]models.NewsItemResponse, len(newsItems))
	for i, item := range newsItems {
		responses[i] = item.ToResponse(lang)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return c.JSON(models.NewsListResponse{
		News:       responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	})
}

// GetNewsItem returns a single news item by ID
// GET /api/news/:id
func (h *NewsHandler) GetNewsItem(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news ID"})
	}

	lang := strings.ToLower(strings.TrimSpace(c.Query("lang", "ru")))
	if lang != "en" {
		lang = "ru"
	}

	var newsItem models.NewsItem
	if err := database.DB.Preload("Source").First(&newsItem, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "News not found"})
	}

	// Only return published news to public
	if newsItem.Status != models.NewsItemStatusPublished {
		return c.Status(404).JSON(fiber.Map{"error": "News not found"})
	}

	// Increment view count
	if err := database.DB.Model(&newsItem).UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error; err != nil {
		log.Printf("[NEWS] Failed to increment view_count for news %d: %v", newsItem.ID, err)
	}

	return c.JSON(newsItem.ToResponse(lang))
}

// GetNewsCategories returns available news categories
// GET /api/news/categories
func (h *NewsHandler) GetNewsCategories(c *fiber.Ctx) error {
	var categories []string
	if err := database.DB.Model(&models.NewsItem{}).
		Where("status = ?", models.NewsItemStatusPublished).
		Distinct("category").
		Where("category != ''").
		Pluck("category", &categories).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch categories"})
	}

	return c.JSON(fiber.Map{"categories": categories})
}

// GetLatestNews returns the latest N news items (for widgets)
// GET /api/news/latest
func (h *NewsHandler) GetLatestNews(c *fiber.Ctx) error {
	limit := boundedNewsQueryInt(c, "limit", 3, 1, 10)
	lang := strings.ToLower(strings.TrimSpace(c.Query("lang", "ru")))
	if lang != "en" {
		lang = "ru"
	}

	var newsItems []models.NewsItem
	if err := database.DB.
		Where("status = ?", models.NewsItemStatusPublished).
		Order("published_at DESC").
		Limit(limit).
		Find(&newsItems).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch news"})
	}

	responses := make([]models.NewsItemResponse, len(newsItems))
	for i, item := range newsItems {
		responses[i] = item.ToResponse(lang)
	}

	return c.JSON(fiber.Map{"news": responses})
}

// ==================== ADMIN ENDPOINTS ====================

// GetAdminNews returns all news with filters (for admin panel)
// GET /api/admin/news
func (h *NewsHandler) GetAdminNews(c *fiber.Ctx) error {
	page := boundedNewsQueryInt(c, "page", 1, 1, 100000)
	limit := boundedNewsQueryInt(c, "limit", 20, 1, 100)
	status := strings.ToLower(strings.TrimSpace(c.Query("status", "")))
	sourceID := strings.TrimSpace(c.Query("sourceId", ""))
	category := strings.TrimSpace(c.Query("category", ""))
	search := strings.TrimSpace(c.Query("search", ""))

	offset := (page - 1) * limit

	query := database.DB.Model(&models.NewsItem{}).Order("created_at DESC")

	if status != "" {
		normalizedStatus := models.NewsItemStatus(status)
		if !isValidNewsItemStatus(normalizedStatus) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid news status filter"})
		}
		query = query.Where("status = ?", status)
	}
	if sourceID != "" {
		sid, err := strconv.ParseUint(sourceID, 10, 32)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid sourceId filter"})
		}
		query = query.Where("source_id = ?", sid)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title_ru ILIKE ? OR title_en ILIKE ?", searchPattern, searchPattern)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch news"})
	}

	var newsItems []models.NewsItem
	if err := query.Preload("Source").Offset(offset).Limit(limit).Find(&newsItems).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error fetching news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch news"})
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return c.JSON(fiber.Map{
		"news":       newsItems,
		"total":      total,
		"page":       page,
		"totalPages": totalPages,
	})
}

// GetAdminNewsItem returns a single news item for editing
// GET /api/admin/news/:id
func (h *NewsHandler) GetAdminNewsItem(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news ID"})
	}

	var newsItem models.NewsItem
	if err := database.DB.Preload("Source").First(&newsItem, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "News not found"})
	}

	return c.JSON(newsItem)
}

// CreateNews creates a new news item
// POST /api/admin/news
func (h *NewsHandler) CreateNews(c *fiber.Ctx) error {
	var req models.NewsItemCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.TitleRu = strings.TrimSpace(req.TitleRu)
	req.TitleEn = strings.TrimSpace(req.TitleEn)
	req.SummaryRu = strings.TrimSpace(req.SummaryRu)
	req.SummaryEn = strings.TrimSpace(req.SummaryEn)
	req.ContentRu = strings.TrimSpace(req.ContentRu)
	req.ContentEn = strings.TrimSpace(req.ContentEn)
	req.ImageURL = strings.TrimSpace(req.ImageURL)
	req.Tags = strings.TrimSpace(req.Tags)
	req.Category = strings.TrimSpace(req.Category)

	if req.TitleRu == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
	}
	if req.ContentRu == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Content is required"})
	}

	newsItem := models.NewsItem{
		TitleRu:     req.TitleRu,
		TitleEn:     req.TitleEn,
		SummaryRu:   req.SummaryRu,
		SummaryEn:   req.SummaryEn,
		ContentRu:   req.ContentRu,
		ContentEn:   req.ContentEn,
		ImageURL:    req.ImageURL,
		Tags:        req.Tags,
		Category:    req.Category,
		Status:      req.Status,
		IsImportant: req.IsImportant,
		ScheduledAt: req.ScheduledAt,
	}

	if req.SourceID != nil {
		newsItem.SourceID = *req.SourceID
	}

	if newsItem.Status == "" {
		newsItem.Status = models.NewsItemStatusDraft
	}
	if !isValidNewsItemStatus(newsItem.Status) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news status"})
	}

	if err := database.DB.Create(&newsItem).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error creating news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create news"})
	}

	log.Printf("[ADMIN NEWS] Created news item ID: %d, Title: %s", newsItem.ID, newsItem.TitleRu)
	return c.Status(201).JSON(newsItem)
}

// UpdateNews updates an existing news item
// PUT /api/admin/news/:id
func (h *NewsHandler) UpdateNews(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news ID"})
	}

	var newsItem models.NewsItem
	if err := database.DB.First(&newsItem, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "News not found"})
	}

	var req models.NewsItemCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.TitleRu = strings.TrimSpace(req.TitleRu)
	req.TitleEn = strings.TrimSpace(req.TitleEn)
	req.SummaryRu = strings.TrimSpace(req.SummaryRu)
	req.SummaryEn = strings.TrimSpace(req.SummaryEn)
	req.ContentRu = strings.TrimSpace(req.ContentRu)
	req.ContentEn = strings.TrimSpace(req.ContentEn)
	req.ImageURL = strings.TrimSpace(req.ImageURL)
	req.Tags = strings.TrimSpace(req.Tags)
	req.Category = strings.TrimSpace(req.Category)

	updates := map[string]interface{}{
		"title_ru":     req.TitleRu,
		"title_en":     req.TitleEn,
		"summary_ru":   req.SummaryRu,
		"summary_en":   req.SummaryEn,
		"content_ru":   req.ContentRu,
		"content_en":   req.ContentEn,
		"image_url":    req.ImageURL,
		"tags":         req.Tags,
		"category":     req.Category,
		"is_important": req.IsImportant,
		"scheduled_at": req.ScheduledAt,
	}
	if req.Status != "" {
		if !isValidNewsItemStatus(req.Status) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid news status"})
		}
		updates["status"] = req.Status
	}

	if req.SourceID != nil {
		updates["source_id"] = *req.SourceID
	}

	if err := database.DB.Model(&newsItem).Updates(updates).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error updating news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update news"})
	}

	// Reload with source
	database.DB.Preload("Source").First(&newsItem, id)

	log.Printf("[ADMIN NEWS] Updated news item ID: %d", id)
	return c.JSON(newsItem)
}

// DeleteNews deletes a news item
// DELETE /api/admin/news/:id
func (h *NewsHandler) DeleteNews(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news ID"})
	}

	var newsItem models.NewsItem
	if err := database.DB.First(&newsItem, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "News not found"})
	}

	if err := database.DB.Delete(&newsItem).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error deleting news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete news"})
	}

	log.Printf("[ADMIN NEWS] Deleted news item ID: %d", id)
	return c.JSON(fiber.Map{"message": "News deleted successfully"})
}

// PublishNews publishes a news item
// POST /api/admin/news/:id/publish
func (h *NewsHandler) PublishNews(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news ID"})
	}

	var newsItem models.NewsItem
	if err := database.DB.First(&newsItem, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "News not found"})
	}

	now := c.Context().Time()
	updates := map[string]interface{}{
		"status":       models.NewsItemStatusPublished,
		"published_at": now,
	}

	if err := database.DB.Model(&newsItem).Updates(updates).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error publishing news: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to publish news"})
	}

	// Reload the news item to get updated data
	database.DB.First(&newsItem, id)

	// Send push notification for important news
	if newsItem.IsImportant {
		services.SendNewsPushNotification(newsItem)
	}

	log.Printf("[ADMIN NEWS] Published news item ID: %d", id)
	return c.JSON(fiber.Map{"message": "News published successfully"})
}

// ProcessNewsAI triggers AI processing for a news item
// POST /api/admin/news/:id/process
func (h *NewsHandler) ProcessNewsAI(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid news ID"})
	}

	go func(newsID uint) {
		if err := services.GetNewsAIService().ProcessNewsItem(newsID); err != nil {
			log.Printf("[ADMIN NEWS] AI processing error for %d: %v", newsID, err)
		}
	}(uint(id))

	log.Printf("[ADMIN NEWS] Triggered AI processing for news item ID: %d", id)
	return c.JSON(fiber.Map{"message": "AI processing started in background"})
}

// ==================== SOURCE MANAGEMENT ====================

// GetSources returns all news sources
// GET /api/admin/news/sources
func (h *NewsHandler) GetSources(c *fiber.Ctx) error {
	page := boundedNewsQueryInt(c, "page", 1, 1, 100000)
	limit := boundedNewsQueryInt(c, "limit", 20, 1, 100)
	sourceType := strings.ToLower(strings.TrimSpace(c.Query("type", "")))
	isActive := strings.ToLower(strings.TrimSpace(c.Query("active", "")))
	search := strings.TrimSpace(c.Query("search", ""))

	offset := (page - 1) * limit

	query := database.DB.Model(&models.NewsSource{}).Order("created_at DESC")

	if sourceType != "" {
		if !isValidNewsSourceType(models.NewsSourceType(sourceType)) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid source type filter"})
		}
		query = query.Where("source_type = ?", sourceType)
	}
	switch isActive {
	case "true":
		query = query.Where("is_active = ?", true)
	case "false":
		query = query.Where("is_active = ?", false)
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sources"})
	}

	var sources []models.NewsSource
	if err := query.Offset(offset).Limit(limit).Find(&sources).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error fetching sources: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sources"})
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return c.JSON(models.NewsSourceListResponse{
		Sources:    sources,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	})
}

// GetSource returns a single news source
// GET /api/admin/news/sources/:id
func (h *NewsHandler) GetSource(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	var source models.NewsSource
	if err := database.DB.First(&source, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Source not found"})
	}

	return c.JSON(source)
}

// CreateSource creates a new news source
// POST /api/admin/news/sources
func (h *NewsHandler) CreateSource(c *fiber.Ctx) error {
	var req models.NewsSourceCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.SourceType = models.NewsSourceType(strings.ToLower(strings.TrimSpace(string(req.SourceType))))
	req.URL = strings.TrimSpace(req.URL)
	req.VKGroupID = strings.TrimSpace(req.VKGroupID)
	req.TelegramID = strings.TrimSpace(req.TelegramID)
	req.TGParserType = strings.TrimSpace(req.TGParserType)
	req.AccessToken = strings.TrimSpace(req.AccessToken)
	req.Mode = models.NewsSourceMode(strings.ToLower(strings.TrimSpace(string(req.Mode))))
	req.DefaultTags = strings.TrimSpace(req.DefaultTags)
	req.TargetMadh = strings.TrimSpace(req.TargetMadh)
	req.TargetYoga = strings.TrimSpace(req.TargetYoga)
	req.TargetIdentity = strings.TrimSpace(req.TargetIdentity)

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}
	if req.SourceType == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Source type is required"})
	}
	if !isValidNewsSourceType(req.SourceType) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source type"})
	}
	if req.Mode != "" && !isValidNewsSourceMode(req.Mode) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source mode"})
	}

	source := models.NewsSource{
		Name:           req.Name,
		Description:    req.Description,
		SourceType:     req.SourceType,
		URL:            req.URL,
		VKGroupID:      req.VKGroupID,
		TelegramID:     req.TelegramID,
		TGParserType:   req.TGParserType,
		AccessToken:    req.AccessToken,
		IsActive:       req.IsActive,
		FetchInterval:  req.FetchInterval,
		Mode:           req.Mode,
		AutoTranslate:  req.AutoTranslate,
		StyleTransfer:  req.StyleTransfer,
		DefaultTags:    req.DefaultTags,
		TargetMadh:     req.TargetMadh,
		TargetYoga:     req.TargetYoga,
		TargetIdentity: req.TargetIdentity,
	}

	if source.FetchInterval == 0 {
		source.FetchInterval = 3600 // Default 1 hour
	}
	if source.FetchInterval < 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Fetch interval must be positive"})
	}
	if source.Mode == "" {
		source.Mode = models.NewsSourceModeDraft
	}

	if err := database.DB.Create(&source).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error creating source: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create source"})
	}

	log.Printf("[ADMIN NEWS] Created source ID: %d, Name: %s, Type: %s", source.ID, source.Name, source.SourceType)
	return c.Status(201).JSON(source)
}

// UpdateSource updates an existing news source
// PUT /api/admin/news/sources/:id
func (h *NewsHandler) UpdateSource(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	var source models.NewsSource
	if err := database.DB.First(&source, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Source not found"})
	}

	var req models.NewsSourceCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	rawBody := c.Body()
	var rawFields map[string]json.RawMessage
	if err := json.Unmarshal(rawBody, &rawFields); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON body"})
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.SourceType = models.NewsSourceType(strings.ToLower(strings.TrimSpace(string(req.SourceType))))
	req.URL = strings.TrimSpace(req.URL)
	req.VKGroupID = strings.TrimSpace(req.VKGroupID)
	req.TelegramID = strings.TrimSpace(req.TelegramID)
	req.TGParserType = strings.TrimSpace(req.TGParserType)
	req.AccessToken = strings.TrimSpace(req.AccessToken)
	req.Mode = models.NewsSourceMode(strings.ToLower(strings.TrimSpace(string(req.Mode))))
	req.DefaultTags = strings.TrimSpace(req.DefaultTags)
	req.TargetMadh = strings.TrimSpace(req.TargetMadh)
	req.TargetYoga = strings.TrimSpace(req.TargetYoga)
	req.TargetIdentity = strings.TrimSpace(req.TargetIdentity)

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}
	if req.SourceType == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Source type is required"})
	}
	if !isValidNewsSourceType(req.SourceType) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source type"})
	}
	if req.Mode != "" && !isValidNewsSourceMode(req.Mode) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source mode"})
	}
	if req.FetchInterval < 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Fetch interval must be positive"})
	}

	updates := map[string]interface{}{
		"name":            req.Name,
		"description":     req.Description,
		"source_type":     req.SourceType,
		"url":             req.URL,
		"vk_group_id":     req.VKGroupID,
		"telegram_id":     req.TelegramID,
		"tg_parser_type":  req.TGParserType,
		"default_tags":    req.DefaultTags,
		"target_madh":     req.TargetMadh,
		"target_yoga":     req.TargetYoga,
		"target_identity": req.TargetIdentity,
	}

	if _, ok := rawFields["isActive"]; ok {
		updates["is_active"] = req.IsActive
	}
	if _, ok := rawFields["fetchInterval"]; ok {
		updates["fetch_interval"] = req.FetchInterval
	}
	if _, ok := rawFields["mode"]; ok {
		if req.Mode == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Mode cannot be empty"})
		}
		updates["mode"] = req.Mode
	}
	if _, ok := rawFields["autoTranslate"]; ok {
		updates["auto_translate"] = req.AutoTranslate
	}
	if _, ok := rawFields["styleTransfer"]; ok {
		updates["style_transfer"] = req.StyleTransfer
	}

	// Only update access token if provided
	if req.AccessToken != "" {
		updates["access_token"] = req.AccessToken
	}

	if err := database.DB.Model(&source).Updates(updates).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error updating source: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update source"})
	}

	// Reload
	database.DB.First(&source, id)

	log.Printf("[ADMIN NEWS] Updated source ID: %d", id)
	return c.JSON(source)
}

// DeleteSource deletes a news source
// DELETE /api/admin/news/sources/:id
func (h *NewsHandler) DeleteSource(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	var source models.NewsSource
	if err := database.DB.First(&source, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Source not found"})
	}

	// Check if source has news items
	var count int64
	if err := database.DB.Model(&models.NewsItem{}).Where("source_id = ?", id).Count(&count).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to verify source usage"})
	}
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{
			"error":   "Cannot delete source with existing news",
			"message": "Please delete or reassign news items first",
			"count":   count,
		})
	}

	if err := database.DB.Delete(&source).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error deleting source: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete source"})
	}

	log.Printf("[ADMIN NEWS] Deleted source ID: %d", id)
	return c.JSON(fiber.Map{"message": "Source deleted successfully"})
}

// ToggleSourceActive toggles the active status of a source
// POST /api/admin/news/sources/:id/toggle
func (h *NewsHandler) ToggleSourceActive(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	var source models.NewsSource
	if err := database.DB.First(&source, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Source not found"})
	}

	source.IsActive = !source.IsActive
	if err := database.DB.Save(&source).Error; err != nil {
		log.Printf("[ADMIN NEWS] Error toggling source: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to toggle source"})
	}

	log.Printf("[ADMIN NEWS] Toggled source ID: %d, IsActive: %v", id, source.IsActive)
	return c.JSON(source)
}

// FetchSourceNow triggers immediate fetch of news from a source
// POST /api/admin/news/sources/:id/fetch
func (h *NewsHandler) FetchSourceNow(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	if err := services.GetNewsScheduler().FetchSourceNow(uint(id)); err != nil {
		log.Printf("[ADMIN NEWS] Error fetching source: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("[ADMIN NEWS] Triggered fetch for source ID: %d", id)
	return c.JSON(fiber.Map{"message": "Fetch started in background"})
}

// ==================== STATS ====================

// GetNewsStats returns news statistics
// GET /api/admin/news/stats
func (h *NewsHandler) GetNewsStats(c *fiber.Ctx) error {
	var stats models.NewsStatsResponse

	// Total news
	if err := database.DB.Model(&models.NewsItem{}).Count(&stats.TotalNews).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}
	if err := database.DB.Model(&models.NewsItem{}).Where("status = ?", models.NewsItemStatusPublished).Count(&stats.PublishedNews).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}
	if err := database.DB.Model(&models.NewsItem{}).Where("status = ?", models.NewsItemStatusDraft).Count(&stats.DraftNews).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}

	// Total sources
	if err := database.DB.Model(&models.NewsSource{}).Count(&stats.TotalSources).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}
	if err := database.DB.Model(&models.NewsSource{}).Where("is_active = ?", true).Count(&stats.ActiveSources).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}

	// By category
	stats.ByCategory = make(map[string]int64)
	var categoryStats []struct {
		Category string
		Count    int64
	}
	if err := database.DB.Model(&models.NewsItem{}).
		Select("category, count(*) as count").
		Where("category != ''").
		Group("category").
		Scan(&categoryStats).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}
	for _, cs := range categoryStats {
		stats.ByCategory[cs.Category] = cs.Count
	}

	// By source
	stats.BySource = make(map[string]int64)
	var sourceStats []struct {
		SourceID uint
		Name     string
		Count    int64
	}
	if err := database.DB.Model(&models.NewsItem{}).
		Select("news_items.source_id, news_sources.name, count(*) as count").
		Joins("LEFT JOIN news_sources ON news_sources.id = news_items.source_id").
		Group("news_items.source_id, news_sources.name").
		Scan(&sourceStats).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load stats"})
	}
	for _, ss := range sourceStats {
		if ss.Name != "" {
			stats.BySource[ss.Name] = ss.Count
		}
	}

	return c.JSON(stats)
}

// ==================== SUBSCRIPTION & FAVORITES ====================

// SubscribeToSource subscribes a user to push notifications from a source
// POST /api/news/sources/:id/subscribe
func (h *NewsHandler) SubscribeToSource(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	sourceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}
	var sourceExists int64
	if err := database.DB.Model(&models.NewsSource{}).
		Where("id = ?", sourceID).
		Count(&sourceExists).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to verify source"})
	}
	if sourceExists == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Source not found"})
	}

	subscription := models.UserNewsSubscription{
		UserID:   userID,
		SourceID: uint(sourceID),
	}

	if err := database.DB.FirstOrCreate(&subscription, subscription).Error; err != nil {
		log.Printf("[NEWS] Error subscribing to source: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to subscribe"})
	}

	return c.JSON(fiber.Map{"subscribed": true})
}

// UnsubscribeFromSource unsubscribes a user from push notifications
// DELETE /api/news/sources/:id/subscribe
func (h *NewsHandler) UnsubscribeFromSource(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	sourceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	if err := database.DB.Where("user_id = ? AND source_id = ?", userID, sourceID).
		Delete(&models.UserNewsSubscription{}).Error; err != nil {
		log.Printf("[NEWS] Error unsubscribing: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to unsubscribe"})
	}

	return c.JSON(fiber.Map{"subscribed": false})
}

// GetSubscriptions returns user's subscriptions
// GET /api/news/subscriptions
func (h *NewsHandler) GetSubscriptions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var sourceIDs []uint
	if err := database.DB.Model(&models.UserNewsSubscription{}).
		Where("user_id = ?", userID).
		Pluck("source_id", &sourceIDs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch subscriptions"})
	}

	return c.JSON(fiber.Map{"subscriptions": sourceIDs})
}

// AddToFavorites adds a source to user's favorites
// POST /api/news/sources/:id/favorite
func (h *NewsHandler) AddToFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	sourceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}
	var sourceExists int64
	if err := database.DB.Model(&models.NewsSource{}).
		Where("id = ?", sourceID).
		Count(&sourceExists).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to verify source"})
	}
	if sourceExists == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Source not found"})
	}

	favorite := models.UserNewsFavorite{
		UserID:   userID,
		SourceID: uint(sourceID),
	}

	if err := database.DB.FirstOrCreate(&favorite, favorite).Error; err != nil {
		log.Printf("[NEWS] Error adding to favorites: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to add to favorites"})
	}

	return c.JSON(fiber.Map{"favorite": true})
}

// RemoveFromFavorites removes a source from user's favorites
// DELETE /api/news/sources/:id/favorite
func (h *NewsHandler) RemoveFromFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	sourceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source ID"})
	}

	if err := database.DB.Where("user_id = ? AND source_id = ?", userID, sourceID).
		Delete(&models.UserNewsFavorite{}).Error; err != nil {
		log.Printf("[NEWS] Error removing from favorites: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to remove from favorites"})
	}

	return c.JSON(fiber.Map{"favorite": false})
}

// GetFavorites returns user's favorite sources
// GET /api/news/favorites
func (h *NewsHandler) GetFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var sourceIDs []uint
	if err := database.DB.Model(&models.UserNewsFavorite{}).
		Where("user_id = ?", userID).
		Pluck("source_id", &sourceIDs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch favorites"})
	}

	return c.JSON(fiber.Map{"favorites": sourceIDs})
}
