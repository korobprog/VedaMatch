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

type VideoCircleHandler struct {
	service *services.VideoCircleService
}

func NewVideoCircleHandler() *VideoCircleHandler {
	return &VideoCircleHandler{service: services.NewVideoCircleService()}
}

func (h *VideoCircleHandler) GetVideoCircles(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	params := models.VideoCircleListParams{
		City:     strings.TrimSpace(c.Query("city")),
		Matha:    normalizeMathaParam(c),
		Category: strings.TrimSpace(c.Query("category")),
		Status:   strings.TrimSpace(c.Query("status")),
		Sort:     strings.TrimSpace(c.Query("sort")),
		Page:     c.QueryInt("page", 1),
		Limit:    c.QueryInt("limit", 20),
	}

	result, err := h.service.ListCircles(userID, middleware.GetUserRole(c), params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

func (h *VideoCircleHandler) AddInteraction(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	var req models.VideoCircleInteractionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.service.AddInteraction(uint(circleID64), userID, req)
	if err != nil {
		if errors.Is(err, services.ErrCircleExpired) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Circle expired",
				"code":  "CIRCLE_EXPIRED",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) BoostCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	var req models.VideoBoostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.service.ApplyBoost(uint(circleID64), userID, middleware.GetUserRole(c), req)
	if err != nil {
		if errors.Is(err, services.ErrCircleExpired) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Circle expired",
				"code":  "CIRCLE_EXPIRED",
			})
		}
		if errors.Is(err, services.ErrInsufficientLKM) {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error": "Недостаточно LKM",
				"code":  "INSUFFICIENT_LKM",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) GetTariffs(c *fiber.Ctx) error {
	tariffs, err := h.service.ListTariffs()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"tariffs": tariffs})
}

func (h *VideoCircleHandler) CreateTariff(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var req models.VideoTariffUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item, err := h.service.CreateTariff(req, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *VideoCircleHandler) UpdateTariff(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	id64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tariff id"})
	}

	var req models.VideoTariffUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item, err := h.service.UpdateTariff(uint(id64), req, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(item)
}

func normalizeMathaParam(c *fiber.Ctx) string {
	matha := strings.TrimSpace(c.Query("matha"))
	if matha != "" {
		return matha
	}
	matha = strings.TrimSpace(c.Query("madh"))
	if matha != "" {
		return matha
	}
	return strings.TrimSpace(c.Query("math"))
}
