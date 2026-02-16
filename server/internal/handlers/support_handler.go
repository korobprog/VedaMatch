package handlers

import (
	"errors"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type SupportHandler struct {
	service *services.TelegramSupportService
}

func NewSupportHandler() *SupportHandler {
	return &SupportHandler{
		service: services.NewTelegramSupportService(database.DB),
	}
}

func requireSupportAdmin(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !models.IsAdminRole(middleware.GetUserRole(c)) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	return userID, nil
}

func getSupportSecret() string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "SUPPORT_TELEGRAM_WEBHOOK_SECRET").First(&setting).Error; err == nil {
		if strings.TrimSpace(setting.Value) != "" {
			return strings.TrimSpace(setting.Value)
		}
	}
	return strings.TrimSpace(os.Getenv("SUPPORT_TELEGRAM_WEBHOOK_SECRET"))
}

// TelegramWebhook processes incoming support-bot updates.
// POST /api/integrations/telegram/support/webhook
func (h *SupportHandler) TelegramWebhook(c *fiber.Ctx) error {
	expectedSecret := getSupportSecret()
	if expectedSecret != "" {
		receivedSecret := strings.TrimSpace(c.Get("X-Telegram-Bot-Api-Secret-Token"))
		if receivedSecret != expectedSecret {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid webhook secret"})
		}
	}

	var update services.TelegramUpdate
	if err := c.BodyParser(&update); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot parse update"})
	}

	if err := h.service.ProcessUpdate(c.UserContext(), &update); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// ListConversations returns support conversations.
// GET /api/admin/support/conversations
func (h *SupportHandler) ListConversations(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	page := parseSupportInt(c.Query("page"), 1, 1, 100000)
	limit := parseSupportInt(c.Query("limit"), 30, 1, 200)
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))

	query := database.DB.Model(&models.SupportConversation{}).Preload("Contact")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count conversations"})
	}

	var items []models.SupportConversation
	if err := query.Order("last_message_at DESC NULLS LAST, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list conversations"})
	}

	return c.JSON(fiber.Map{
		"conversations": items,
		"total":         total,
		"page":          page,
		"limit":         limit,
	})
}

// GetConversationMessages returns messages for one conversation.
// GET /api/admin/support/conversations/:id/messages
func (h *SupportHandler) GetConversationMessages(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	conversationID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid conversation id"})
	}

	var messages []models.SupportMessage
	if err := database.DB.Where("conversation_id = ?", uint(conversationID)).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load messages"})
	}

	return c.JSON(fiber.Map{
		"messages": messages,
	})
}

// ResolveConversation resolves an open support conversation.
// POST /api/admin/support/conversations/:id/resolve
func (h *SupportHandler) ResolveConversation(c *fiber.Ctx) error {
	adminID, err := requireSupportAdmin(c)
	if err != nil {
		return err
	}

	conversationID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid conversation id"})
	}

	updates := map[string]interface{}{
		"status":      models.SupportConversationStatusResolved,
		"resolved_at": time.Now().UTC(),
		"resolved_by": adminID,
	}
	result := database.DB.Model(&models.SupportConversation{}).
		Where("id = ?", uint(conversationID)).
		Updates(updates)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to resolve conversation"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation not found"})
	}

	return c.JSON(fiber.Map{"message": "conversation resolved"})
}

// SendDirect sends a direct support message to a Telegram chat id.
// POST /api/admin/support/send-direct
func (h *SupportHandler) SendDirect(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	var req struct {
		ChatID int64  `json:"chatId"`
		Text   string `json:"text"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	if err := h.service.SendDirectMessage(c.UserContext(), req.ChatID, req.Text); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "sent"})
}

// ListFAQ returns FAQ entries for support AI.
// GET /api/admin/support/faq
func (h *SupportHandler) ListFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	var items []models.SupportFAQItem
	if err := database.DB.Order("priority DESC, id DESC").Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load faq"})
	}
	return c.JSON(fiber.Map{"items": items})
}

// CreateFAQ creates FAQ entry.
// POST /api/admin/support/faq
func (h *SupportHandler) CreateFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	var req models.SupportFAQItem
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	req.Question = strings.TrimSpace(req.Question)
	req.Answer = strings.TrimSpace(req.Answer)
	if req.Question == "" || req.Answer == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "question and answer are required"})
	}

	if err := database.DB.Create(&req).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create faq"})
	}
	return c.Status(fiber.StatusCreated).JSON(req)
}

// UpdateFAQ updates FAQ entry.
// PUT /api/admin/support/faq/:id
func (h *SupportHandler) UpdateFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid faq id"})
	}

	var existing models.SupportFAQItem
	if err := database.DB.First(&existing, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "faq not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load faq"})
	}

	var req models.SupportFAQItem
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	updates := map[string]interface{}{
		"question":  strings.TrimSpace(req.Question),
		"answer":    strings.TrimSpace(req.Answer),
		"keywords":  strings.TrimSpace(req.Keywords),
		"priority":  req.Priority,
		"is_active": req.IsActive,
	}
	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update faq"})
	}

	if err := database.DB.First(&existing, existing.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to reload faq"})
	}
	return c.JSON(existing)
}

// DeleteFAQ removes FAQ entry.
// DELETE /api/admin/support/faq/:id
func (h *SupportHandler) DeleteFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid faq id"})
	}

	result := database.DB.Delete(&models.SupportFAQItem{}, uint(id))
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete faq"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "faq not found"})
	}

	return c.JSON(fiber.Map{"message": "deleted"})
}

func parseSupportInt(raw string, def int, min int, max int) int {
	value := def
	if strings.TrimSpace(raw) != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			value = parsed
		}
	}
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}
