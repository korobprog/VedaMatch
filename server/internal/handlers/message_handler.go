package handlers

import (
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/websocket"
	"strconv"
	"strings"
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
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var msg models.Message
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	msg.SenderID = userID
	msg.Content = strings.TrimSpace(msg.Content)
	if (msg.RecipientID == 0 && msg.RoomID == 0) || msg.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content and either RecipientID or RoomID are required",
		})
	}

	// LKM Billing: Check if this is an AI-enabled room
	aiEnabled := false
	roomName := ""
	var roomMemberIDs []uint
	if msg.RoomID != 0 {
		room, err := loadRoomByID(msg.RoomID)
		if err != nil {
			if errors.Is(err, errRoomNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Room not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load room"})
		}

		if _, err := ensureRoomAccess(room, userID, true); err != nil {
			return respondRoomAccessError(c, err)
		}

		aiEnabled = room.AiEnabled
		roomName = room.Name

		memberIDs, err := getRoomMemberUserIDs(room.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not resolve room members",
			})
		}
		roomMemberIDs = memberIDs
	}

	// If AI is enabled, charge 1 LKM per message
	if aiEnabled && h.walletService != nil {
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

	services.GetMessagePushService().Dispatch(msg, services.MessagePushOptions{
		RoomName:      roomName,
		RoomMemberIDs: roomMemberIDs,
	})

	// Broadcast via WebSocket
	if h.hub != nil {
		if msg.RoomID != 0 {
			h.hub.Broadcast(msg, roomMemberIDs...)
			if len(roomMemberIDs) > 0 {
				_ = services.GetMetricsService().Increment(services.MetricRoomWSDeliveryTotal, int64(len(roomMemberIDs)))
			}
		} else {
			h.hub.Broadcast(msg)
		}
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
	roomMemberIDs, roomMembersErr := getRoomMemberUserIDs(roomID)
	if roomMembersErr != nil {
		log.Printf("[AI] failed to load room members for websocket broadcast room_id=%d: %v", roomID, roomMembersErr)
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
		h.hub.Broadcast(aiMsg, roomMemberIDs...)
		if len(roomMemberIDs) > 0 {
			_ = services.GetMetricsService().Increment(services.MetricRoomWSDeliveryTotal, int64(len(roomMemberIDs)))
		}
	}
}

func (h *MessageHandler) GetRoomSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRequiredPositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}
	if _, err := ensureRoomAccess(room, userID, true); err != nil {
		return respondRoomAccessError(c, err)
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
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	roomId := c.Query("roomId")

	query := database.DB.Order("created_at asc")
	if roomId != "" {
		roomID, err := parseRequiredPositiveUint(roomId)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid room ID",
			})
		}
		room, err := loadRoomByID(roomID)
		if err != nil {
			return respondRoomLoadError(c, err)
		}
		if _, err := ensureRoomAccess(room, userID, true); err != nil {
			return respondRoomAccessError(c, err)
		}
		query = query.Where("room_id = ?", roomID)
	} else {
		recipientID, err := strconv.ParseUint(strings.TrimSpace(c.Params("recipientId")), 10, 64)
		if err != nil || recipientID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid recipient ID",
			})
		}
		query = query.Where("(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
			userID, recipientID, recipientID, userID)
	}

	var messages []models.Message
	if err := query.Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch messages",
		})
	}

	return c.Status(fiber.StatusOK).JSON(messages)
}

func (h *MessageHandler) GetMessagesHistory(c *fiber.Ctx) error {
	if !config.ChatHistoryV2Enabled() {
		middleware.SetErrorCode(c, "chat_history_disabled")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "history endpoint is disabled",
		})
	}

	startedAt := time.Now()
	userID := middleware.GetUserID(c)
	if userID == 0 {
		middleware.SetErrorCode(c, "chat_history_unauthorized")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	peerUserID, peerProvided, err := parseOptionalPositiveUint(c.Query("peerUserId"))
	if err != nil {
		middleware.SetErrorCode(c, "chat_history_invalid_peer")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid peerUserId",
		})
	}
	roomID, roomProvided, err := parseOptionalPositiveUint(c.Query("roomId"))
	if err != nil {
		middleware.SetErrorCode(c, "chat_history_invalid_room")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid roomId",
		})
	}

	if !peerProvided && !roomProvided {
		middleware.SetErrorCode(c, "chat_history_missing_target")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "peerUserId or roomId is required",
		})
	}
	if peerProvided && roomProvided {
		middleware.SetErrorCode(c, "chat_history_ambiguous_target")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "peerUserId and roomId are mutually exclusive",
		})
	}

	beforeID, beforeProvided, err := parseOptionalPositiveUint(c.Query("beforeId"))
	if err != nil {
		middleware.SetErrorCode(c, "chat_history_invalid_before")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid beforeId",
		})
	}

	limit := c.QueryInt("limit", 30)
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}

	query := database.DB.Model(&models.Message{})
	if roomProvided {
		room, roomErr := loadRoomByID(roomID)
		if roomErr != nil {
			middleware.SetErrorCode(c, "chat_history_room_not_found")
			return respondRoomLoadError(c, roomErr)
		}
		if _, accessErr := ensureRoomAccess(room, userID, true); accessErr != nil {
			middleware.SetErrorCode(c, "chat_history_room_forbidden")
			return respondRoomAccessError(c, accessErr)
		}
		query = query.Where("room_id = ?", roomID)
	} else {
		query = query.Where(
			"(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
			userID, peerUserID, peerUserID, userID,
		)
	}
	if beforeProvided {
		query = query.Where("id < ?", beforeID)
	}

	var descItems []models.Message
	if err := query.Order("id DESC").Limit(limit + 1).Find(&descItems).Error; err != nil {
		middleware.SetErrorCode(c, "chat_history_query_failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch messages history",
		})
	}

	hasMore := len(descItems) > limit
	if hasMore {
		descItems = descItems[:limit]
	}

	items := reverseMessages(descItems)
	var nextBeforeID *uint
	if hasMore && len(items) > 0 {
		oldestID := items[0].ID
		nextBeforeID = &oldestID
	}

	latencyMs := time.Since(startedAt).Milliseconds()
	if latencyMs <= 0 {
		latencyMs = 1
	}
	_ = services.GetMetricsService().Increment(services.MetricChatHistoryLatency, latencyMs)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"items":        items,
		"hasMore":      hasMore,
		"nextBeforeId": nextBeforeID,
	})
}

func parseOptionalPositiveUint(raw string) (uint, bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, false, nil
	}
	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return 0, false, fmt.Errorf("invalid positive uint")
	}
	return uint(value), true, nil
}

func parseRequiredPositiveUint(raw string) (uint, error) {
	raw = strings.TrimSpace(raw)
	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return 0, fmt.Errorf("invalid positive uint")
	}
	return uint(value), nil
}

func reverseMessages(items []models.Message) []models.Message {
	if len(items) <= 1 {
		return items
	}

	reversed := make([]models.Message, len(items))
	for i := range items {
		reversed[len(items)-1-i] = items[i]
	}
	return reversed
}
