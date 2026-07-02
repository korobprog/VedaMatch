package handlers

import (
	"context"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gofiber/fiber/v2"
)

type MotivationHandler struct {
	service *services.MotivationService
}

func NewMotivationHandler() *MotivationHandler {
	return &MotivationHandler{
		service: services.NewMotivationService(database.DB),
	}
}

func normalizeMotivationCategorySlug(input string) string {
	input = strings.ToLower(strings.TrimSpace(input))
	var b strings.Builder
	prevDash := false
	for _, r := range input {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	slug := strings.Trim(b.String(), "-")
	if slug == "" {
		return "category"
	}
	return slug
}

func uniqueMotivationCategorySlug(base string, excludeID uint) string {
	slug := normalizeMotivationCategorySlug(base)
	candidate := slug
	for i := 2; ; i++ {
		var count int64
		query := database.DB.Unscoped().Model(&models.MotivationCategory{}).Where("slug = ?", candidate)
		if excludeID > 0 {
			query = query.Where("id <> ?", excludeID)
		}
		query.Count(&count)
		if count == 0 {
			return candidate
		}
		candidate = slug + "-" + strconv.Itoa(i)
	}
}

func ensureMotivationCategoryExists(categoryID *uint) error {
	if categoryID == nil || *categoryID == 0 {
		return nil
	}
	var category models.MotivationCategory
	return database.DB.First(&category, *categoryID).Error
}

func nullableMotivationCategoryID(categoryID *uint) *uint {
	if categoryID == nil || *categoryID == 0 {
		return nil
	}
	return categoryID
}

// ---- public DTOs ----

type motivationPublicCategory struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

type motivationPublicPost struct {
	ID          uint                      `json:"id"`
	CategoryID  *uint                     `json:"categoryId,omitempty"`
	Category    *motivationPublicCategory `json:"category,omitempty"`
	Theme       string                    `json:"theme"`
	ImageURL    string                    `json:"imageUrl"`
	Language    string                    `json:"language"`
	Title       string                    `json:"title"`
	Text        string                    `json:"text"`
	PublishedAt *time.Time                `json:"publishedAt"`
}

// pickTranslation chooses the best translation for lang with fallback to the
// post's original language, then English, then the first available.
func pickTranslation(post *models.MotivationPost, lang string) *models.MotivationPostTranslation {
	lang = strings.ToLower(strings.TrimSpace(lang))
	var byOriginal, byEnglish, first *models.MotivationPostTranslation
	for i := range post.Translations {
		t := &post.Translations[i]
		if first == nil {
			first = t
		}
		if t.Language == lang {
			return t
		}
		if t.Language == post.OriginalLanguage {
			byOriginal = t
		}
		if t.Language == "en" {
			byEnglish = t
		}
	}
	if byEnglish != nil {
		return byEnglish
	}
	if byOriginal != nil {
		return byOriginal
	}
	return first
}

func toPublicPost(post *models.MotivationPost, lang string) motivationPublicPost {
	dto := motivationPublicPost{
		ID:          post.ID,
		Theme:       post.Theme,
		ImageURL:    post.ImageURL,
		PublishedAt: post.PublishedAt,
	}
	if post.Category != nil {
		dto.CategoryID = post.CategoryID
		dto.Category = &motivationPublicCategory{
			ID:    post.Category.ID,
			Name:  post.Category.Name,
			Slug:  post.Category.Slug,
			Color: post.Category.Color,
		}
	}
	if t := pickTranslation(post, lang); t != nil {
		dto.Language = t.Language
		dto.Title = t.Title
		dto.Text = t.Text
	}
	return dto
}

// ListPublishedPosts GET /api/motivation/posts?lang=&limit=&cursor=
func (h *MotivationHandler) ListPublishedPosts(c *fiber.Ctx) error {
	lang := c.Query("lang")
	limit := 20
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 && v <= 100 {
		limit = v
	}

	query := database.DB.
		Preload("Category").
		Preload("Translations").
		Where("status = ?", models.MotivationPostStatusPublished).
		Order("published_at DESC, id DESC").
		Limit(limit + 1)

	if cursor, err := strconv.Atoi(c.Query("cursor")); err == nil && cursor > 0 {
		query = query.Where("id < ?", cursor)
	}
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		query = query.Joins("JOIN motivation_categories ON motivation_categories.id = motivation_posts.category_id").
			Where("motivation_categories.slug = ? OR motivation_categories.id::text = ?", category, category)
	}

	var posts []models.MotivationPost
	if err := query.Find(&posts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load posts"})
	}

	var nextCursor *uint
	if len(posts) > limit {
		last := posts[limit-1]
		posts = posts[:limit]
		id := last.ID
		nextCursor = &id
	}

	items := make([]motivationPublicPost, 0, len(posts))
	for i := range posts {
		items = append(items, toPublicPost(&posts[i], lang))
	}

	return c.JSON(fiber.Map{"posts": items, "nextCursor": nextCursor})
}

// GetPublishedPost GET /api/motivation/posts/:id?lang=
func (h *MotivationHandler) GetPublishedPost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var post models.MotivationPost
	if err := database.DB.Preload("Category").Preload("Translations").
		Where("id = ? AND status = ?", id, models.MotivationPostStatusPublished).
		First(&post).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(toPublicPost(&post, c.Query("lang")))
}

// ---- admin ----

type motivationCreateRequest struct {
	CategoryID       *uint  `json:"categoryId"`
	Theme            string `json:"theme"`
	SourceLinks      string `json:"sourceLinks"`
	CharLimit        int    `json:"charLimit"`
	OriginalLanguage string `json:"originalLanguage"`
}

// AdminCreatePost POST /api/admin/motivation/posts
func (h *MotivationHandler) AdminCreatePost(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req motivationCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if strings.TrimSpace(req.Theme) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "theme is required"})
	}
	req.CategoryID = nullableMotivationCategoryID(req.CategoryID)
	if err := ensureMotivationCategoryExists(req.CategoryID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "category not found"})
	}

	post, err := h.service.CreateDraft(services.CreatePostParams{
		CategoryID:       req.CategoryID,
		Theme:            req.Theme,
		SourceLinks:      req.SourceLinks,
		CharLimit:        req.CharLimit,
		OriginalLanguage: req.OriginalLanguage,
		Source:           models.MotivationPostSourceOperator,
		CreatedByUserID:  &userID,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Run the AI pipeline in the background; the client polls for status.
	go func(postID uint) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		_ = h.service.RunGeneration(ctx, postID)
	}(post.ID)

	return c.Status(fiber.StatusAccepted).JSON(post)
}

// AdminListPosts GET /api/admin/motivation/posts?status=
func (h *MotivationHandler) AdminListPosts(c *fiber.Ctx) error {
	query := database.DB.Preload("Category").Preload("Translations").Order("created_at DESC").Limit(200)
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if categoryID, err := strconv.Atoi(c.Query("categoryId")); err == nil && categoryID > 0 {
		query = query.Where("category_id = ?", categoryID)
	}
	var posts []models.MotivationPost
	if err := query.Find(&posts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load posts"})
	}
	return c.JSON(fiber.Map{"posts": posts})
}

// AdminGetPost GET /api/admin/motivation/posts/:id
func (h *MotivationHandler) AdminGetPost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var post models.MotivationPost
	if err := database.DB.Preload("Category").Preload("Translations").First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(post)
}

type motivationUpdateRequest struct {
	CategoryID    *uint   `json:"categoryId"`
	ClearCategory bool    `json:"clearCategory"`
	ImageURL      *string `json:"imageUrl"`
	Action        string  `json:"action"` // "publish" | "unpublish"
	Translations  []struct {
		Language string `json:"language"`
		Title    string `json:"title"`
		Text     string `json:"text"`
	} `json:"translations"`
}

// AdminUpdatePost PATCH /api/admin/motivation/posts/:id
func (h *MotivationHandler) AdminUpdatePost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var post models.MotivationPost
	if err := database.DB.First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	var req motivationUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	updates := map[string]interface{}{}
	if req.ImageURL != nil {
		updates["image_url"] = strings.TrimSpace(*req.ImageURL)
	}
	if req.ClearCategory {
		updates["category_id"] = nil
	} else if req.CategoryID != nil {
		req.CategoryID = nullableMotivationCategoryID(req.CategoryID)
		if req.CategoryID == nil {
			updates["category_id"] = nil
		} else {
			if err := ensureMotivationCategoryExists(req.CategoryID); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "category not found"})
			}
			updates["category_id"] = *req.CategoryID
		}
	}
	switch strings.ToLower(strings.TrimSpace(req.Action)) {
	case "publish":
		now := time.Now().UTC()
		updates["status"] = models.MotivationPostStatusPublished
		updates["published_at"] = &now
	case "unpublish":
		updates["status"] = models.MotivationPostStatusReady
		updates["published_at"] = nil
	}
	if len(updates) > 0 {
		if err := database.DB.Model(&post).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
		}
	}

	for _, t := range req.Translations {
		lang := strings.ToLower(strings.TrimSpace(t.Language))
		if lang == "" {
			continue
		}
		translation := models.MotivationPostTranslation{PostID: post.ID, Language: lang}
		database.DB.Where("post_id = ? AND language = ?", post.ID, lang).
			Assign(map[string]interface{}{"title": t.Title, "text": t.Text}).
			FirstOrCreate(&translation)
	}

	var updated models.MotivationPost
	database.DB.Preload("Category").Preload("Translations").First(&updated, id)
	return c.JSON(updated)
}

type motivationCategoryRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

// AdminListCategories GET /api/admin/motivation/categories
func (h *MotivationHandler) AdminListCategories(c *fiber.Ctx) error {
	var categories []models.MotivationCategory
	if err := database.DB.Order("name ASC").Find(&categories).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load categories"})
	}
	return c.JSON(fiber.Map{"categories": categories})
}

// AdminCreateCategory POST /api/admin/motivation/categories
func (h *MotivationHandler) AdminCreateCategory(c *fiber.Ctx) error {
	var req motivationCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}
	slugSource := req.Slug
	if strings.TrimSpace(slugSource) == "" {
		slugSource = name
	}
	category := models.MotivationCategory{
		Name:        name,
		Slug:        uniqueMotivationCategorySlug(slugSource, 0),
		Description: strings.TrimSpace(req.Description),
		Color:       strings.TrimSpace(req.Color),
	}
	if err := database.DB.Create(&category).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create category"})
	}
	return c.Status(fiber.StatusCreated).JSON(category)
}

// AdminUpdateCategory PATCH /api/admin/motivation/categories/:id
func (h *MotivationHandler) AdminUpdateCategory(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var category models.MotivationCategory
	if err := database.DB.First(&category, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	var req motivationCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	updates := map[string]interface{}{}
	if name := strings.TrimSpace(req.Name); name != "" {
		updates["name"] = name
	}
	if slug := strings.TrimSpace(req.Slug); slug != "" {
		updates["slug"] = uniqueMotivationCategorySlug(slug, category.ID)
	}
	updates["description"] = strings.TrimSpace(req.Description)
	updates["color"] = strings.TrimSpace(req.Color)
	if err := database.DB.Model(&category).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update category"})
	}
	database.DB.First(&category, id)
	return c.JSON(category)
}

// AdminRegeneratePost POST /api/admin/motivation/posts/:id/regenerate
func (h *MotivationHandler) AdminRegeneratePost(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var post models.MotivationPost
	if err := database.DB.First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	go func(postID uint) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		_, _ = h.service.Regenerate(ctx, postID)
	}(post.ID)

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"status": "regenerating", "id": post.ID})
}
