package handlers

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

type MessageHandler struct{}

func NewMessageHandler() *MessageHandler {
	return &MessageHandler{}
}

func (h *MessageHandler) SendMessage(c *fiber.Ctx) error {
	var msg models.Message
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if msg.SenderID == 0 || msg.RecipientID == 0 || msg.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "SenderID, RecipientID and Content are required",
		})
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save message",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

func (h *MessageHandler) GetMessages(c *fiber.Ctx) error {
	userId := c.Params("userId")
	recipientId := c.Params("recipientId")

	var messages []models.Message
	if err := database.DB.Where("(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
		userId, recipientId, recipientId, userId).
		Order("created_at asc").
		Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch messages",
		})
	}

	return c.Status(fiber.StatusOK).JSON(messages)
}
