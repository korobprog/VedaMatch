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
	SubmitFeedback(userID, opportunityID uint, req models.ConnectFeedbackCreateRequest) (*models.ConnectFeedback, error)
	GetOpportunity(userID, opportunityID uint) (*models.ConnectOpportunityDetailResponse, error)
	GetCommunity(userID, communityID uint) (*models.ConnectCommunityDetailResponse, error)
	ListOpportunitiesForModeration(status string) ([]models.ConnectOpportunity, error)
	ListApplications(actorID, opportunityID uint, status string) ([]models.ConnectApplication, error)
	ModerateOpportunity(opportunityID, adminID uint, approve bool, reason string) (*models.ConnectOpportunity, error)
	UpdateApplicationStatus(actorID, applicationID uint, req models.ConnectApplicationStatusUpdateRequest) (*models.ConnectApplication, error)
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

func (h *ConnectHandler) SubmitFeedback(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	opportunityID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || opportunityID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid opportunity id"})
	}
	var req models.ConnectFeedbackCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	result, feedbackErr := h.service.SubmitFeedback(userID, uint(opportunityID), req)
	if feedbackErr != nil {
		return respondConnectError(c, feedbackErr)
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

func (h *ConnectHandler) ListPendingOpportunities(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	items, err := h.service.ListOpportunitiesForModeration(strings.TrimSpace(c.Query("status")))
	if err != nil {
		return respondConnectError(c, err)
	}
	return c.JSON(fiber.Map{"opportunities": items})
}

func (h *ConnectHandler) ListApplications(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	opportunityRef := strings.TrimSpace(c.Params("id"))
	if opportunityRef == "" {
		opportunityRef = strings.TrimSpace(c.Query("opportunityId"))
	}
	opportunityID, err := strconv.ParseUint(opportunityRef, 10, 64)
	if err != nil || opportunityID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid opportunity id"})
	}
	items, listErr := h.service.ListApplications(actorID, uint(opportunityID), strings.TrimSpace(c.Query("status")))
	if listErr != nil {
		return respondConnectError(c, listErr)
	}
	return c.JSON(fiber.Map{"applications": items})
}

func (h *ConnectHandler) ApproveOpportunity(c *fiber.Ctx) error {
	return h.moderateOpportunity(c, true)
}

func (h *ConnectHandler) RejectOpportunity(c *fiber.Ctx) error {
	return h.moderateOpportunity(c, false)
}

func (h *ConnectHandler) UpdateApplicationStatus(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	applicationID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || applicationID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid application id"})
	}
	var req models.ConnectApplicationStatusUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	result, updateErr := h.service.UpdateApplicationStatus(actorID, uint(applicationID), req)
	if updateErr != nil {
		return respondConnectError(c, updateErr)
	}
	return c.JSON(result)
}

func (h *ConnectHandler) moderateOpportunity(c *fiber.Ctx, approve bool) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	opportunityID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || opportunityID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid opportunity id"})
	}
	var req models.ConnectModerationRequest
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}
	}
	adminID := middleware.GetUserID(c)
	result, moderateErr := h.service.ModerateOpportunity(uint(opportunityID), adminID, approve, req.Reason)
	if moderateErr != nil {
		return respondConnectError(c, moderateErr)
	}
	return c.JSON(result)
}

func respondConnectError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrConnectUnauthorized):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrConnectInvalidPayload):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrConnectFeedbackNotAllowed):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrConnectForbidden):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrConnectOpportunityMissing), errors.Is(err, services.ErrConnectCommunityMissing), errors.Is(err, services.ErrConnectApplicationMissing):
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
