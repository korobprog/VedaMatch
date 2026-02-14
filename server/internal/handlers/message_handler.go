package handlers

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/websocket"
	"time"

	"github.com/gofiber/fiber/v2"
)

type MessageHandler struct {
	aiService       *services.AiChatService
	hub             *websocket.Hub
	walletService   *services.WalletService
	referralService *services.ReferralService
}

func NewMessageHandler(aiService *services.AiChatService, hub *websocket.Hub, walletService *services.WalletService, referralService *services.ReferralService) *MessageHandler {
	return &MessageHandler{
		aiService:       aiService,
		hub:             hub,
		walletService:   walletService,
		referralService: referralService,
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

	// LKM Billing: Check if this is an AI-enabled room
	aiEnabled := false
	if msg.RoomID != 0 {
		var room models.Room
		if err := database.DB.First(&room, msg.RoomID).Error; err == nil {
			aiEnabled = room.AiEnabled
		}
	}

	// If AI is enabled, charge 1 LKM per message
	if aiEnabled && h.walletService != nil {
		// Get user ID from JWT (prefer JWT over body for security)
		userID := middleware.GetUserID(c)
		if userID == 0 {
			userID = msg.SenderID // Fallback to message sender
		}

		// Generate idempotent key: userID + timestamp + first 20 chars of content
		contentHash := msg.Content
		if len(contentHash) > 20 {
			contentHash = contentHash[:20]
		}
		dedupKey := fmt.Sprintf("ai_msg_%d_%d_%s", userID, time.Now().UnixNano(), contentHash)

		// Attempt to spend 1 LKM
		err := h.walletService.Spend(userID, 1, dedupKey, "AI Chat message")
		if err != nil {
			log.Printf("[Billing] LKM spend failed for user %d: %v", userID, err)
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error":   "Недостаточно LKM для отправки сообщения",
				"message": "Пополните баланс для использования AI Chat",
				"code":    "INSUFFICIENT_LKM",
			})
		}
		log.Printf("[Billing] Charged 1 LKM from user %d for AI message", userID)

		// Referral Activation: If this is the user's first spend, activate their referral
		if h.referralService != nil {
			go func(uid uint) {
				if err := h.referralService.ProcessActivation(uid); err != nil {
					log.Printf("[Referral] Activation failed for user %d: %v", uid, err)
				}
			}(userID)
		}
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
	if msg.RoomID != 0 && h.aiService != nil && aiEnabled {
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

	var reply string
	var mapData map[string]interface{}
	var err error

	// Check if the last message is asking about news
	if len(lastMessages) > 0 {
		lastUserMsg := lastMessages[len(lastMessages)-1].Content

		useLegacyNewsShortcut := h.aiService == nil || !h.aiService.IsDomainAssistantMessagesEnabled()
		if useLegacyNewsShortcut && services.IsNewsQuery(lastUserMsg) {
			// User is asking about news
			log.Printf("[AI] Detected news query: %s", lastUserMsg)

			// Check if it's a specific search or general query
			searchQuery := services.ExtractNewsSearchQuery(lastUserMsg)
			if searchQuery != "" {
				// Specific search
				reply, err = services.GetNewsAIService().SearchAndSummarizeNews(searchQuery, "ru")
			} else {
				// General "what's new" query
				reply, err = services.GetNewsAIService().GetLatestNewsSummary("ru", 5)
			}

			if err != nil {
				log.Printf("[AI] News query error: %v", err)
				// Fall back to regular AI response
				reply, mapData, err = h.aiService.GenerateReply(room.Name, lastMessages)
			}
		} else {
			// Regular AI response
			reply, mapData, err = h.aiService.GenerateReply(room.Name, lastMessages)
		}
	} else {
		reply, mapData, err = h.aiService.GenerateReply(room.Name, lastMessages)
	}

	if err != nil {
		log.Printf("AI Reply Error: %v", err)
		return
	}

	aiMsg := models.Message{
		SenderID: 0, // 0 for AI/System
		RoomID:   roomID,
		Content:  reply,
		MapData:  mapData,
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
