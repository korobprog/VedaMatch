package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/websocket"

	"github.com/gofiber/fiber/v2"
)

type MessageHandler struct {
	aiService *services.AiChatService
	hub       *websocket.Hub
}

func NewMessageHandler(aiService *services.AiChatService, hub *websocket.Hub) *MessageHandler {
	return &MessageHandler{
		aiService: aiService,
		hub:       hub,
	}
}

func (h *MessageHandler) SendMessage(c *fiber.Ctx) error {
	var msg models.Message
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if msg.SenderID == 0 || (msg.RecipientID == 0 && msg.RoomID == 0) || msg.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "SenderID, Content and either RecipientID or RoomID are required",
		})
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save message",
		})
	}

	// Broadcast via WebSocket
	if h.hub != nil {
		h.hub.Broadcast(msg)
	}

	// Trigger AI if it's a room message and AI is enabled
	if msg.RoomID != 0 && h.aiService != nil {
		go h.handleAiResponse(msg.RoomID)
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

func (h *MessageHandler) handleAiResponse(roomID uint) {
	var room models.Room
	if err := database.DB.First(&room, roomID).Error; err != nil || !room.AiEnabled {
		return
	}

	// Fetch last messages for context
	var lastMessages []models.Message
	database.DB.Where("room_id = ?", roomID).Order("created_at desc").Limit(10).Find(&lastMessages)

	// Reverse to get chronological order
	for i, j := 0, len(lastMessages)-1; i < j; i, j = i+1, j-1 {
		lastMessages[i], lastMessages[j] = lastMessages[j], lastMessages[i]
	}

	reply, err := h.aiService.GenerateReply(room, lastMessages)
	if err != nil {
		log.Printf("AI Reply Error: %v", err)
		return
	}

	aiMsg := models.Message{
		SenderID: 0, // 0 for AI/System
		RoomID:   roomID,
		Content:  reply,
		Type:     "text",
	}
	database.DB.Create(&aiMsg)

	// Broadcast AI response
	if h.hub != nil {
		h.hub.Broadcast(aiMsg)
	}
}

func (h *MessageHandler) GetRoomSummary(c *fiber.Ctx) error {
	roomID := c.Params("id")
	var room models.Room
	if err := database.DB.First(&room, roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Room not found"})
	}

	var lastMessages []models.Message
	if err := database.DB.Where("room_id = ?", roomID).Order("created_at desc").Limit(50).Find(&lastMessages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch messages"})
	}

	summary, err := h.aiService.GetSummary(room.Name, lastMessages)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"summary": summary})
}

func (h *MessageHandler) GetMessages(c *fiber.Ctx) error {
	userId := c.Params("userId")
	recipientId := c.Params("recipientId")
	roomId := c.Query("roomId")

	query := database.DB.Order("created_at asc")
	if roomId != "" {
		query = query.Where("room_id = ?", roomId)
	} else {
		query = query.Where("(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
			userId, recipientId, recipientId, userId)
	}

	var messages []models.Message
	if err := query.Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch messages",
		})
	}

	return c.Status(fiber.StatusOK).JSON(messages)
}
