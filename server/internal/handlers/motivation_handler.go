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

// ---- public DTOs ----

type motivationPublicPost struct {
	ID          uint       `json:"id"`
	Theme       string     `json:"theme"`
	ImageURL    string     `json:"imageUrl"`
	Language    string     `json:"language"`
	Title       string     `json:"title"`
	Text        string     `json:"text"`
	PublishedAt *time.Time `json:"publishedAt"`
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
		Preload("Translations").
		Where("status = ?", models.MotivationPostStatusPublished).
		Order("published_at DESC, id DESC").
		Limit(limit + 1)

	if cursor, err := strconv.Atoi(c.Query("cursor")); err == nil && cursor > 0 {
		query = query.Where("id < ?", cursor)
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
	if err := database.DB.Preload("Translations").
		Where("id = ? AND status = ?", id, models.MotivationPostStatusPublished).
		First(&post).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(toPublicPost(&post, c.Query("lang")))
}

// ---- admin ----

type motivationCreateRequest struct {
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

	post, err := h.service.CreateDraft(services.CreatePostParams{
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
	query := database.DB.Preload("Translations").Order("created_at DESC").Limit(200)
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
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
	if err := database.DB.Preload("Translations").First(&post, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(post)
}

type motivationUpdateRequest struct {
	ImageURL     *string `json:"imageUrl"`
	Action       string  `json:"action"` // "publish" | "unpublish"
	Translations []struct {
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
	database.DB.Preload("Translations").First(&updated, id)
	return c.JSON(updated)
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
