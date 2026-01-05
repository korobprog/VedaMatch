package handlers

import (
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/websocket"

	"github.com/gofiber/fiber/v2"
)

type TypingHandler struct {
	hub *websocket.Hub
}

func NewTypingHandler(hub *websocket.Hub) *TypingHandler {
	return &TypingHandler{
		hub: hub,
	}
}

func (h *TypingHandler) SetTyping(c *fiber.Ctx) error {
	var event models.TypingEvent
	if err := c.BodyParser(&event); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if event.SenderID == 0 || event.RecipientID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "SenderID and RecipientID are required",
		})
	}

	event.Type = "typing"

	if h.hub != nil {
		h.hub.BroadcastTyping(event)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
	})
}
