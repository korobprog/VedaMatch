package handlers

import (
	"strconv"
	"strings"

	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type MonetizationHandler struct {
	service *services.MonetizationService
}

func NewMonetizationHandler() *MonetizationHandler {
	return &MonetizationHandler{service: services.NewMonetizationService()}
}

func (h *MonetizationHandler) GetOverview(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	overview, err := h.service.GetOverview()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(overview)
}

func (h *MonetizationHandler) GetServiceTariffs(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	serviceID := parseUintQuery(c.Query("serviceId"))
	ownerID := parseUintQuery(c.Query("ownerId"))
	active := parseOptionalBool(c.Query("active"))
	items, err := h.service.ListServiceTariffs(serviceID, ownerID, active, c.Query("search"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"items": items})
}

func (h *MonetizationHandler) UpdatePro(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationProUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateProConfig(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateChatTranscribe(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationChatTranscribeUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateChatTranscribeConfig(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateYatraBilling(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationYatraBillingUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateYatraBillingConfig(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateServiceFee(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationServiceFeeUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateServiceFeeConfig(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateMarketFee(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationMarketFeeUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateMarketFeeConfig(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateCafeFee(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationCafeFeeUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateCafeFeeConfig(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateShopPlans(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationShopPlansUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateShopPlans(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *MonetizationHandler) UpdateShopPromotions(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	var req services.MonetizationShopPromotionsUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if err := h.service.UpdateShopPromotions(adminID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func parseUintQuery(raw string) uint {
	value, err := strconv.ParseUint(strings.TrimSpace(raw), 10, 64)
	if err != nil {
		return 0
	}
	return uint(value)
}

func parseOptionalBool(raw string) *bool {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	switch trimmed {
	case "true", "1", "yes", "on":
		value := true
		return &value
	case "false", "0", "no", "off":
		value := false
		return &value
	default:
		return nil
	}
}
