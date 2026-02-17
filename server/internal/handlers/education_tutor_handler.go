package handlers

import (
	"strings"

	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type EducationTutorHandler struct {
	service *services.EducationTutorService
}

func NewEducationTutorHandler(service *services.EducationTutorService) *EducationTutorHandler {
	return &EducationTutorHandler{service: service}
}

func (h *EducationTutorHandler) TutorTurn(c *fiber.Ctx) error {
	if h.service == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor service unavailable"})
	}
	if !h.service.IsEnabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor is disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.TutorTurnRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.UserID = userID
	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message is required"})
	}
	if len(req.History) > 12 {
		req.History = req.History[len(req.History)-12:]
	}

	resp, err := h.service.Turn(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *EducationTutorHandler) GetStatus(c *fiber.Ctx) error {
	if h.service == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor service unavailable"})
	}

	return c.JSON(fiber.Map{
		"enabled": h.service.IsEnabled(),
	})
}

func (h *EducationTutorHandler) GetWeakTopics(c *fiber.Ctx) error {
	if h.service == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor service unavailable"})
	}
	if !h.service.IsEnabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor is disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	items, err := h.service.GetWeakTopics(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"items": items})
}

func (h *EducationTutorHandler) ClearMemory(c *fiber.Ctx) error {
	if h.service == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor service unavailable"})
	}
	if !h.service.IsEnabled() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Tutor is disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	scope := strings.TrimSpace(c.Query("scope", "all"))
	result, err := h.service.ClearMemory(userID, scope)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"deleted": result})
}
