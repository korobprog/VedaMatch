package handlers

import (
	"errors"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type connectService interface {
	GetFeed(userID uint, req models.ConnectFeedRequest) (*models.ConnectFeedResponse, error)
	GetProfile(userID uint) (*models.ConnectMatchProfile, error)
	UpsertProfile(userID uint, req models.ConnectMatchProfileUpsertRequest) (*models.ConnectMatchProfile, error)
	CreateOpportunity(userID uint, req models.ConnectOpportunityCreateRequest) (*models.ConnectOpportunity, error)
	Apply(userID, opportunityID uint, req models.ConnectApplyRequest) (*models.ConnectApplication, error)
	GetOpportunity(userID, opportunityID uint) (*models.ConnectOpportunityDetailResponse, error)
	GetCommunity(userID, communityID uint) (*models.ConnectCommunityDetailResponse, error)
}

type ConnectHandler struct {
	service connectService
}

func NewConnectHandler() *ConnectHandler {
	return &ConnectHandler{service: services.NewConnectService()}
}

func NewConnectHandlerWithService(service connectService) *ConnectHandler {
	return &ConnectHandler{service: service}
}

func (h *ConnectHandler) GetFeed(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	result, err := h.service.GetFeed(userID, models.ConnectFeedRequest{
		City:                strings.TrimSpace(c.Query("city")),
		District:            strings.TrimSpace(c.Query("district")),
		Category:            strings.TrimSpace(c.Query("category")),
		EntryLevel:          strings.TrimSpace(c.Query("entryLevel")),
		ParticipationFormat: strings.TrimSpace(c.Query("participationFormat")),
		Mode:                strings.TrimSpace(c.Query("mode")),
		NewcomerOnly:        parseBoolQuery(c.Query("newcomerOnly")),
		NearbyOnly:          parseBoolQuery(c.Query("nearbyOnly")),
		Limit:               parseIntQuery(c.Query("limit"), 12),
	})
	if err != nil {
		return respondConnectError(c, err)
	}
	return c.JSON(result)
}

func (h *ConnectHandler) GetProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	result, err := h.service.GetProfile(userID)
	if err != nil {
		return respondConnectError(c, err)
	}
	return c.JSON(fiber.Map{"profile": result})
}

func (h *ConnectHandler) UpsertProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.ConnectMatchProfileUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	result, err := h.service.UpsertProfile(userID, req)
	if err != nil {
		return respondConnectError(c, err)
	}
	return c.JSON(fiber.Map{"profile": result})
}

func (h *ConnectHandler) CreateOpportunity(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.ConnectOpportunityCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	result, err := h.service.CreateOpportunity(userID, req)
	if err != nil {
		return respondConnectError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(result)
}

func (h *ConnectHandler) Apply(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	opportunityID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || opportunityID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid opportunity id"})
	}
	var req models.ConnectApplyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	result, applyErr := h.service.Apply(userID, uint(opportunityID), req)
	if applyErr != nil {
		return respondConnectError(c, applyErr)
	}
	return c.Status(fiber.StatusCreated).JSON(result)
}

func (h *ConnectHandler) GetOpportunity(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	opportunityID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || opportunityID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid opportunity id"})
	}
	result, getErr := h.service.GetOpportunity(userID, uint(opportunityID))
	if getErr != nil {
		return respondConnectError(c, getErr)
	}
	return c.JSON(result)
}

func (h *ConnectHandler) GetCommunity(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	communityID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || communityID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid community id"})
	}
	result, getErr := h.service.GetCommunity(userID, uint(communityID))
	if getErr != nil {
		return respondConnectError(c, getErr)
	}
	return c.JSON(result)
}

func respondConnectError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrConnectUnauthorized):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrConnectInvalidPayload):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrConnectOpportunityMissing), errors.Is(err, services.ErrConnectCommunityMissing):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
}

func parseBoolQuery(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	return normalized == "1" || normalized == "true" || normalized == "yes"
}

func parseIntQuery(value string, fallback int) int {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(trimmed)
	if err != nil {
		return fallback
	}
	return parsed
}
