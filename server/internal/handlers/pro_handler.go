package handlers

import (
	"errors"
	"strings"

	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type ProHandler struct {
	service *services.ProService
}

func NewProHandler(walletService *services.WalletService) *ProHandler {
	return &ProHandler{service: services.NewProService(walletService)}
}

func (h *ProHandler) GetPlans(c *fiber.Ctx) error {
	plans := h.service.GetPlans()
	return c.JSON(fiber.Map{
		"plans": plans,
	})
}

func (h *ProHandler) GetStatus(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	status, err := h.service.GetStatus(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not get PRO status",
		})
	}
	return c.JSON(status)
}

func (h *ProHandler) Purchase(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var payload struct {
		PlanCode string `json:"planCode"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	payload.PlanCode = strings.TrimSpace(payload.PlanCode)
	if payload.PlanCode == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "planCode is required",
		})
	}

	result, err := h.service.Purchase(userID, payload.PlanCode)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProDisabled):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":     "PRO subscriptions are disabled",
				"errorCode": "PRO_DISABLED",
			})
		case errors.Is(err, services.ErrProPlanNotFound):
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"error":     "Unknown plan",
				"errorCode": "UNKNOWN_PLAN",
			})
		case errors.Is(err, services.ErrProAlreadyFreeByRole):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":     "PRO is already enabled by role",
				"errorCode": "PRO_ALREADY_FREE_BY_ROLE",
			})
		case errors.Is(err, services.ErrProInsufficientLKM):
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error":     "Insufficient LKM balance",
				"errorCode": "INSUFFICIENT_LKM",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not complete PRO purchase",
			})
		}
	}

	return c.JSON(result)
}
