package handlers

import (
	"errors"
	"strings"

	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type LKMTopupHandler struct {
	service *services.LKMTopupService
}

func NewLKMTopupHandler(service *services.LKMTopupService) *LKMTopupHandler {
	return &LKMTopupHandler{service: service}
}

func inferTopupChannel(c *fiber.Ctx, explicit string) string {
	if channel := strings.TrimSpace(explicit); channel != "" {
		return services.NormalizeTopupChannel(channel)
	}
	if headerChannel := strings.TrimSpace(c.Get("X-Client-Channel")); headerChannel != "" {
		return services.NormalizeTopupChannel(headerChannel)
	}
	if platform := strings.ToLower(strings.TrimSpace(c.Get("X-Client-Platform"))); platform != "" {
		switch platform {
		case "ios", "android", "mobile":
			return "mobile"
		case "telegram", "bot":
			return "bot"
		}
	}

	ua := strings.ToLower(strings.TrimSpace(c.Get("User-Agent")))
	switch {
	case strings.Contains(ua, "okhttp"),
		strings.Contains(ua, "reactnative"),
		strings.Contains(ua, "react-native"),
		strings.Contains(ua, "cfnetwork"):
		return "mobile"
	case strings.Contains(ua, "telegrambot"),
		strings.Contains(ua, "telegram"):
		return "bot"
	default:
		return "web"
	}
}

func respondLKMError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrLKMTopupNotAllowedOnMobile):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":     "Top-up creation is not allowed on mobile channel",
			"errorCode": "TOPUP_NOT_ALLOWED_ON_MOBILE",
		})
	case errors.Is(err, services.ErrLKMInvalidAmount):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "Invalid LKM amount",
			"errorCode": "INVALID_TOPUP_AMOUNT",
		})
	case errors.Is(err, services.ErrLKMGatewayDisabled):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "Selected payment gateway is disabled",
			"errorCode": "GATEWAY_DISABLED",
		})
	case errors.Is(err, services.ErrLKMUnsupportedCurrency):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "Unsupported currency",
			"errorCode": "UNSUPPORTED_CURRENCY",
		})
	case errors.Is(err, services.ErrLKMQuoteNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":     "Quote not found",
			"errorCode": "QUOTE_NOT_FOUND",
		})
	case errors.Is(err, services.ErrLKMQuoteExpired):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "Quote is expired",
			"errorCode": "QUOTE_EXPIRED",
		})
	case errors.Is(err, services.ErrLKMQuoteAlreadyUsed):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Quote already used",
			"errorCode": "QUOTE_ALREADY_USED",
		})
	case errors.Is(err, services.ErrLKMTopupNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":     "Top-up not found",
			"errorCode": "TOPUP_NOT_FOUND",
		})
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
}

func (h *LKMTopupHandler) GetPackages(c *fiber.Ctx) error {
	result, err := h.service.GetPackages(
		c.Query("region"),
		c.Query("currency"),
		c.Query("gatewayCode"),
		c.Query("paymentMethod"),
		c.Hostname(),
	)
	if err != nil {
		return respondLKMError(c, err)
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) CreateQuote(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.LKMQuoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	req.Channel = inferTopupChannel(c, req.Channel)

	if services.IsMobileTopupChannel(req.Channel) {
		return respondLKMError(c, services.ErrLKMTopupNotAllowedOnMobile)
	}

	result, err := h.service.CreateQuote(userID, req, c.Hostname())
	if err != nil {
		return respondLKMError(c, err)
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) CreateTopup(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.LKMCreateTopupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	req.Channel = inferTopupChannel(c, req.Channel)

	if services.IsMobileTopupChannel(req.Channel) {
		return respondLKMError(c, services.ErrLKMTopupNotAllowedOnMobile)
	}

	result, err := h.service.CreateTopupFromQuote(userID, req)
	if err != nil {
		return respondLKMError(c, err)
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) GetMyTopups(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	limit := parseAdminQueryInt(c.Query("limit"), 20, 1, 100)
	page := parseAdminQueryInt(c.Query("page"), 1, 1, 100000)
	items, total, err := h.service.ListUserTopups(userID, c.Query("status"), page, limit)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *LKMTopupHandler) Webhook(c *fiber.Ctx) error {
	var req services.LKMWebhookRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	gatewayCode := c.Params("gatewayCode")
	result, err := h.service.HandleWebhook(gatewayCode, req)
	if err != nil {
		return respondLKMError(c, err)
	}

	return c.JSON(fiber.Map{
		"topupId": result.TopupID,
		"status":  result.Status,
	})
}

func (h *LKMTopupHandler) GetAdminConfig(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	result, err := h.service.GetAdminConfig()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) UpdateAdminConfig(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var req services.LKMAdminConfig
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := h.service.UpdateAdminConfig(req, adminID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *LKMTopupHandler) AdminPreview(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	result, err := h.service.GetPackages(
		c.Query("region"),
		c.Query("currency"),
		c.Query("gatewayCode"),
		c.Query("paymentMethod"),
		c.Hostname(),
	)
	if err != nil {
		return respondLKMError(c, err)
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) ListTopups(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	limit := parseAdminQueryInt(c.Query("limit"), 50, 1, 200)
	topups, err := h.service.ListTopups(c.Query("status"), limit)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"items": topups})
}

func (h *LKMTopupHandler) ApproveTopup(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var req struct {
		Note string `json:"note"`
	}
	_ = c.BodyParser(&req)

	topupID := strings.TrimSpace(c.Params("topupId"))
	result, approveErr := h.service.ApproveManualTopup(topupID, adminID, req.Note)
	if approveErr != nil {
		return respondLKMError(c, approveErr)
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) RejectTopup(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var req struct {
		Note string `json:"note"`
	}
	_ = c.BodyParser(&req)

	topupID := strings.TrimSpace(c.Params("topupId"))
	result, rejectErr := h.service.RejectTopup(topupID, adminID, req.Note)
	if rejectErr != nil {
		return respondLKMError(c, rejectErr)
	}
	return c.JSON(result)
}

func (h *LKMTopupHandler) MarkTopupPaid(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var req struct {
		ExternalPaymentID string `json:"externalPaymentId"`
	}
	_ = c.BodyParser(&req)

	topupID := strings.TrimSpace(c.Params("topupId"))
	result, err := h.service.HandleWebhook("manual", services.LKMWebhookRequest{
		EventID:           uuid.NewString(),
		TopupID:           topupID,
		Status:            "paid",
		ExternalPaymentID: strings.TrimSpace(req.ExternalPaymentID),
	})
	if err != nil {
		return respondLKMError(c, err)
	}
	return c.JSON(fiber.Map{
		"topupId": result.TopupID,
		"status":  result.Status,
	})
}
