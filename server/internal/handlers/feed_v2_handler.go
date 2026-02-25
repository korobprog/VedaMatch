package handlers

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type FeedV2Handler struct {
	service *services.FeedV2Service
}

func NewFeedV2Handler() *FeedV2Handler {
	return &FeedV2Handler{service: services.NewFeedV2Service()}
}

func (h *FeedV2Handler) GetFeed(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !h.isFeedV2EnabledForUser(userID) {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "feed v2 is disabled"})
	}
	_ = services.GetMetricsService().Increment("feed_v2_requests_total", 1)

	orgFilter := make([]string, 0, 4)
	for _, key := range strings.Split(strings.TrimSpace(c.Query("org_filter")), ",") {
		trimmed := strings.TrimSpace(key)
		if trimmed != "" {
			orgFilter = append(orgFilter, trimmed)
		}
	}
	include := strings.ToLower(strings.TrimSpace(c.Query("include")))
	includePost := include == "" || strings.Contains(include, "posts")
	includeCirc := include == "" || strings.Contains(include, "circles")

	resp, err := h.service.GetFeed(userID, services.FeedV2Filters{
		Cursor:      strings.TrimSpace(c.Query("cursor")),
		Limit:       c.QueryInt("limit", 20),
		Mode:        strings.TrimSpace(c.Query("mode")),
		OrgFilter:   orgFilter,
		IncludePost: includePost,
		IncludeCirc: includeCirc,
	})
	if err != nil {
		_ = services.GetMetricsService().Increment("feed_v2_errors_total", 1)
		if strings.Contains(strings.ToLower(err.Error()), "cursor") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(resp)
}

func (h *FeedV2Handler) isFeedV2EnabledForUser(userID uint) bool {
	enabled := strings.ToLower(strings.TrimSpace(h.getSettingOrEnv("FEED_V2_ENABLED", "false")))
	if enabled != "true" && enabled != "1" && enabled != "yes" && enabled != "on" {
		return false
	}
	rollout := 100
	if raw := strings.TrimSpace(h.getSettingOrEnv("FEED_V2_ROLLOUT_PERCENT", "100")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			rollout = parsed
		}
	}
	if rollout >= 100 {
		return true
	}
	if rollout <= 0 {
		return false
	}
	// Stable rollout bucket per user (0..99).
	bucket := int(userID % 100)
	return bucket < rollout
}

func (h *FeedV2Handler) getSettingOrEnv(key string, fallback string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil {
		value := strings.TrimSpace(setting.Value)
		if value != "" {
			return value
		}
	}
	if env := strings.TrimSpace(os.Getenv(key)); env != "" {
		return env
	}
	return fallback
}

func (h *FeedV2Handler) GetItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	itemType := strings.TrimSpace(c.Params("type"))
	itemID, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || itemID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"})
	}
	item, err := h.service.GetItem(userID, itemType, uint(itemID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(item)
}

func (h *FeedV2Handler) TrackImpression(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	itemType := strings.TrimSpace(c.Params("type"))
	itemID, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || itemID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"})
	}
	if err := h.service.TrackImpression(userID, itemType, uint(itemID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *FeedV2Handler) AddReaction(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	itemType := strings.TrimSpace(c.Params("type"))
	itemID, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || itemID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"})
	}
	var req models.FeedV2ReactionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := h.service.AddReaction(userID, itemType, uint(itemID), req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *FeedV2Handler) ListComments(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	itemType := strings.TrimSpace(c.Params("type"))
	itemID, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || itemID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"})
	}
	comments, err := h.service.ListComments(userID, itemType, uint(itemID), c.QueryInt("limit", 30))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"comments": comments})
}

func (h *FeedV2Handler) AddComment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	itemType := strings.TrimSpace(c.Params("type"))
	itemID, err := strconv.ParseUint(strings.TrimSpace(c.Params("id")), 10, 64)
	if err != nil || itemID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"})
	}
	var req models.FeedV2CommentCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	comment, err := h.service.AddComment(userID, itemType, uint(itemID), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(comment)
}
