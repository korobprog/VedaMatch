package handlers

import (
	"errors"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type ekadashiService interface {
	ListOrganizations(userID uint, role string) ([]models.EkadashiOrganization, error)
	GetCalendar(userID uint, role, month, organizationID, timezone, city, country string) (*models.EkadashiCalendarResponse, error)
	GetDay(userID uint, role, date, organizationID, timezone, city, country string) (*models.EkadashiDay, error)
	GetPushPreference(userID uint, role string) (*models.EkadashiPushPreferenceResponse, error)
	UpsertPushPreference(userID uint, role string, req models.EkadashiPushPreferenceUpsertRequest) (*models.EkadashiPushPreferenceResponse, error)
}

type EkadashiHandler struct {
	service ekadashiService
}

func NewEkadashiHandler() *EkadashiHandler {
	return &EkadashiHandler{service: services.NewEkadashiService()}
}

func NewEkadashiHandlerWithService(service ekadashiService) *EkadashiHandler {
	return &EkadashiHandler{service: service}
}

func (h *EkadashiHandler) GetOrganizations(c *fiber.Ctx) error {
	items, err := h.service.ListOrganizations(middleware.GetUserID(c), middleware.GetUserRole(c))
	if err != nil {
		return respondEkadashiError(c, err)
	}
	return c.JSON(fiber.Map{"organizations": items})
}

func (h *EkadashiHandler) GetCalendar(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	result, err := h.service.GetCalendar(
		userID,
		middleware.GetUserRole(c),
		c.Query("month"),
		c.Query("organizationId"),
		c.Query("timezone"),
		c.Query("city"),
		c.Query("country"),
	)
	if err != nil {
		return respondEkadashiError(c, err)
	}
	return c.JSON(result)
}

func (h *EkadashiHandler) GetDay(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	result, err := h.service.GetDay(
		userID,
		middleware.GetUserRole(c),
		c.Query("date"),
		c.Query("organizationId"),
		c.Query("timezone"),
		c.Query("city"),
		c.Query("country"),
	)
	if err != nil {
		return respondEkadashiError(c, err)
	}
	return c.JSON(result)
}

func (h *EkadashiHandler) GetPushPreference(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	result, err := h.service.GetPushPreference(userID, middleware.GetUserRole(c))
	if err != nil {
		return respondEkadashiError(c, err)
	}
	return c.JSON(result)
}

func (h *EkadashiHandler) UpdatePushPreference(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.EkadashiPushPreferenceUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.OrganizationID = strings.TrimSpace(req.OrganizationID)

	result, err := h.service.UpsertPushPreference(userID, middleware.GetUserRole(c), req)
	if err != nil {
		return respondEkadashiError(c, err)
	}
	return c.JSON(result)
}

func respondEkadashiError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrEkadashiForbidden):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrEkadashiInvalidMonth), errors.Is(err, services.ErrEkadashiInvalidPayload):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
}
