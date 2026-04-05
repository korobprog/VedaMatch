package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ChatPreferenceUpdateRequest struct {
	Muted    *bool `json:"muted"`
	Pinned   *bool `json:"pinned"`
	Archived *bool `json:"archived"`
}

type ShareContactRequest struct {
	RecipientID  uint `json:"recipientId"`
	RoomID       uint `json:"roomId"`
	TargetUserID uint `json:"targetUserId"`
}

type MessageTranscribeRequest struct {
	Language string `json:"language"`
}

var (
	errTranscribeInProgress = errors.New("transcription in progress")
	errTranscribeCompleted  = errors.New("transcription already completed")
)

func (h *MessageHandler) GetMessageMediaIndex(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	peerUserID, peerProvided, err := parseOptionalPositiveUint(c.Query("peerUserId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid peerUserId"})
	}
	roomID, roomProvided, err := parseOptionalPositiveUint(c.Query("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid roomId"})
	}
	if !peerProvided && !roomProvided {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "peerUserId or roomId is required"})
	}
	if peerProvided && roomProvided {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "peerUserId and roomId are mutually exclusive"})
	}

	cursorID, cursorProvided, err := parseOptionalPositiveUint(c.Query("cursor"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cursor"})
	}

	limit := c.QueryInt("limit", 30)
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}

	mediaTypes := parseMessageMediaTypes(c.Query("types"))
	query := database.DB.Model(&models.Message{}).Where("type IN ?", mediaTypes)

	if roomProvided {
		room, roomErr := loadRoomByID(roomID)
		if roomErr != nil {
			return respondRoomLoadError(c, roomErr)
		}
		if _, accessErr := ensureRoomAccess(room, userID, true); accessErr != nil {
			return respondRoomAccessError(c, accessErr)
		}
		query = query.Where("room_id = ?", roomID)
	} else {
		query = query.Where(
			"(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
			userID, peerUserID, peerUserID, userID,
		)
	}

	if cursorProvided {
		query = query.Where("id < ?", cursorID)
	}

	var items []models.Message
	if err := query.Order("id DESC").Limit(limit + 1).Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch media index"})
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	var nextCursor *uint
	if hasMore && len(items) > 0 {
		next := items[len(items)-1].ID
		nextCursor = &next
	}

	return c.JSON(fiber.Map{
		"items":      items,
		"hasMore":    hasMore,
		"nextCursor": nextCursor,
	})
}

func (h *MessageHandler) SearchMessages(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	queryText := strings.TrimSpace(c.Query("q"))
	if queryText == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "q is required"})
	}

	peerUserID, peerProvided, err := parseOptionalPositiveUint(c.Query("peerUserId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid peerUserId"})
	}
	roomID, roomProvided, err := parseOptionalPositiveUint(c.Query("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid roomId"})
	}
	if !peerProvided && !roomProvided {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "peerUserId or roomId is required"})
	}
	if peerProvided && roomProvided {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "peerUserId and roomId are mutually exclusive"})
	}

	cursorID, cursorProvided, err := parseOptionalPositiveUint(c.Query("cursor"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cursor"})
	}

	includeTranscripts := strings.EqualFold(strings.TrimSpace(c.Query("includeTranscripts")), "true")
	limit := c.QueryInt("limit", 30)
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}

	searchValue := "%" + strings.ToLower(queryText) + "%"
	query := database.DB.Model(&models.Message{})

	if includeTranscripts {
		query = query.Where(
			"(LOWER(content) LIKE ? OR LOWER(CAST(map_data AS TEXT)) LIKE ?)",
			searchValue,
			searchValue,
		)
	} else {
		query = query.Where("LOWER(content) LIKE ?", searchValue)
	}

	if roomProvided {
		room, roomErr := loadRoomByID(roomID)
		if roomErr != nil {
			return respondRoomLoadError(c, roomErr)
		}
		if _, accessErr := ensureRoomAccess(room, userID, true); accessErr != nil {
			return respondRoomAccessError(c, accessErr)
		}
		query = query.Where("room_id = ?", roomID)
	} else {
		query = query.Where(
			"(sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)",
			userID, peerUserID, peerUserID, userID,
		)
	}

	if cursorProvided {
		query = query.Where("id < ?", cursorID)
	}

	var items []models.Message
	if err := query.Order("id DESC").Limit(limit + 1).Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not search messages"})
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}
	var nextCursor *uint
	if hasMore && len(items) > 0 {
		next := items[len(items)-1].ID
		nextCursor = &next
	}

	return c.JSON(fiber.Map{
		"items":      items,
		"hasMore":    hasMore,
		"nextCursor": nextCursor,
	})
}

func (h *MessageHandler) UpdateChatPreference(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	peerUserID, err := parseRequiredPositiveUint(c.Params("peerUserId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid peerUserId"})
	}
	if peerUserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot update self preference"})
	}

	var req ChatPreferenceUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Muted == nil && req.Pinned == nil && req.Archived == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "muted, pinned or archived is required"})
	}

	var pref models.ChatPreference
	err = database.DB.Where("user_id = ? AND peer_user_id = ?", userID, peerUserID).First(&pref).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load chat preference"})
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		pref = models.ChatPreference{
			UserID:     userID,
			PeerUserID: peerUserID,
		}
	}

	if req.Muted != nil {
		pref.Muted = *req.Muted
	}
	if req.Pinned != nil {
		pref.Pinned = *req.Pinned
		if *req.Pinned {
			now := time.Now().UTC()
			pref.PinnedAt = &now
		} else {
			pref.PinnedAt = nil
		}
	}
	if req.Archived != nil {
		pref.Archived = *req.Archived
		if *req.Archived {
			now := time.Now().UTC()
			pref.ArchivedAt = &now
		} else {
			pref.ArchivedAt = nil
		}
	}

	if pref.ID == 0 {
		if err := database.DB.Create(&pref).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create chat preference"})
		}
	} else {
		if err := database.DB.Save(&pref).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update chat preference"})
		}
	}

	broadcastDirectConversationStateToUser(h.hub, userID, peerUserID)

	return c.JSON(pref)
}

func (h *MessageHandler) ShareContact(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req ShareContactRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.TargetUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "targetUserId is required"})
	}
	if (req.RecipientID == 0 && req.RoomID == 0) || (req.RecipientID != 0 && req.RoomID != 0) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "recipientId or roomId is required"})
	}

	var target models.User
	if err := database.DB.First(&target, req.TargetUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Target user not found"})
	}

	roomName := ""
	var roomMemberIDs []uint
	if req.RoomID != 0 {
		room, roomErr := loadRoomByID(req.RoomID)
		if roomErr != nil {
			return respondRoomLoadError(c, roomErr)
		}
		if _, accessErr := ensureRoomAccess(room, userID, true); accessErr != nil {
			return respondRoomAccessError(c, accessErr)
		}
		memberIDs, membersErr := getRoomMemberUserIDs(req.RoomID)
		if membersErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not resolve room members"})
		}
		roomName = room.Name
		roomMemberIDs = memberIDs
	}

	contactCard := map[string]interface{}{
		"id":            target.ID,
		"nickname":      target.Nickname,
		"spiritualName": target.SpiritualName,
		"karmicName":    target.KarmicName,
		"avatarUrl":     target.AvatarURL,
		"city":          target.City,
		"country":       target.Country,
	}
	msg := models.Message{
		SenderID:    userID,
		RecipientID: req.RecipientID,
		RoomID:      req.RoomID,
		Type:        "contact_card",
		Content:     fmt.Sprintf("contact:%d", target.ID),
		MapData: map[string]interface{}{
			"contact": contactCard,
		},
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save message"})
	}
	if msg.RoomID == 0 {
		_ = clearArchivedDirectPreferencesForPair(msg.SenderID, msg.RecipientID)
	}

	services.GetMessagePushService().Dispatch(msg, services.MessagePushOptions{
		RoomName:      roomName,
		RoomMemberIDs: roomMemberIDs,
	})

	if h.hub != nil {
		if msg.RoomID != 0 {
			h.hub.Broadcast(msg, roomMemberIDs...)
			if len(roomMemberIDs) > 0 {
				_ = services.GetMetricsService().Increment(services.MetricRoomWSDeliveryTotal, int64(len(roomMemberIDs)))
			}
		} else {
			h.hub.Broadcast(msg)
			broadcastDirectConversationStateToUser(h.hub, msg.SenderID, msg.RecipientID)
			broadcastDirectConversationStateToUser(h.hub, msg.RecipientID, msg.SenderID)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

func (h *MessageHandler) GetTranscribeQuote(c *fiber.Ctx) error {
	if !config.ChatTranscriptionEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	messageID, err := parseRequiredPositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid message id"})
	}

	msg, accessErr := h.loadTranscribableMessage(c, userID, messageID)
	if accessErr != nil {
		return accessErr
	}

	durationSec := services.ResolveChatAudioDurationSec(c.UserContext(), msg)
	billingService := services.NewChatTranscribeBillingService(h.walletService)

	var billing services.ChatTranscribeBilling
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		quote, _, quoteErr := billingService.GetQuoteTx(tx, userID, durationSec)
		if quoteErr != nil {
			return quoteErr
		}
		billing = quote
		return nil
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not calculate quote"})
	}

	return c.JSON(fiber.Map{
		"messageId": msg.ID,
		"billing":   billing,
	})
}

func (h *MessageHandler) TranscribeMessage(c *fiber.Ctx) error {
	if !config.ChatTranscriptionEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	messageID, err := parseRequiredPositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid message id"})
	}

	var req MessageTranscribeRequest
	_ = c.BodyParser(&req)

	msg, accessErr := h.loadTranscribableMessage(c, userID, messageID)
	if accessErr != nil {
		return accessErr
	}

	durationSec := services.ResolveChatAudioDurationSec(c.UserContext(), msg)
	cachedBilling := buildZeroChargeTranscribeBilling(durationSec)
	if cachedTranscript, ok := extractCompletedTranscript(msg.MapData); ok {
		return c.JSON(fiber.Map{
			"messageId":  msg.ID,
			"transcript": cachedTranscript,
			"billing":    cachedBilling,
		})
	}

	startedAt := time.Now()
	billingService := services.NewChatTranscribeBillingService(h.walletService)

	var transcribeJob models.ChatTranscribeJob
	var billingApply *services.ChatTranscribeBillingApplyResult
	var completedTranscript map[string]interface{}

	txErr := database.DB.Transaction(func(tx *gorm.DB) error {
		jobErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("message_id = ?", msg.ID).
			First(&transcribeJob).Error
		if jobErr == nil {
			switch strings.ToLower(strings.TrimSpace(transcribeJob.Status)) {
			case models.ChatTranscribeJobStatusPending:
				return errTranscribeInProgress
			case models.ChatTranscribeJobStatusCompleted:
				if transcript, ok := extractCompletedTranscript(msg.MapData); ok {
					completedTranscript = transcript
					return errTranscribeCompleted
				}
			}
		} else if !errors.Is(jobErr, gorm.ErrRecordNotFound) {
			return jobErr
		} else {
			transcribeJob = models.ChatTranscribeJob{
				MessageID:         msg.ID,
				RequestedByUserID: userID,
				Status:            models.ChatTranscribeJobStatusPending,
			}
			if createErr := tx.Create(&transcribeJob).Error; createErr != nil {
				return createErr
			}
		}

		billingResult, billingErr := billingService.ConsumeQuotaAndChargeTx(tx, userID, msg.ID, durationSec)
		if billingErr != nil {
			return billingErr
		}
		billingApply = billingResult

		updates := map[string]interface{}{
			"requested_by_user_id": userID,
			"status":               models.ChatTranscribeJobStatusPending,
			"audio_minutes":        billingResult.Billing.AudioMinutes,
			"free_minutes_used":    billingResult.Billing.FreeMinutesUsed,
			"paid_minutes":         billingResult.Billing.PaidMinutes,
			"charged_lkm":          billingResult.Billing.ChargedLkm,
			"price_per_minute_lkm": billingResult.Billing.PricePerMinuteLkm,
			"tariff_type":          billingResult.Billing.TariffType,
			"week_key":             billingResult.WeekKey,
			"charge_dedup_key":     billingResult.ChargeDedup,
			"refund_dedup_key":     billingResult.RefundDedup,
			"last_error":           "",
			"transcript_cached_at": nil,
		}
		if updateErr := tx.Model(&models.ChatTranscribeJob{}).Where("id = ?", transcribeJob.ID).Updates(updates).Error; updateErr != nil {
			return updateErr
		}
		return tx.First(&transcribeJob, transcribeJob.ID).Error
	})
	if errors.Is(txErr, errTranscribeInProgress) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Расшифровка уже выполняется",
			"code":  "TRANSCRIBE_IN_PROGRESS",
		})
	}
	if errors.Is(txErr, errTranscribeCompleted) {
		return c.JSON(fiber.Map{
			"messageId":  msg.ID,
			"transcript": completedTranscript,
			"billing":    buildCachedJobBilling(transcribeJob),
		})
	}
	if errors.Is(txErr, services.ErrChatTranscribeInsufficientLKM) {
		_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingFailedTotal, 1)
		return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
			"error": "Недостаточно LKM для расшифровки",
			"code":  "INSUFFICIENT_LKM",
		})
	}
	if txErr != nil {
		_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingFailedTotal, 1)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not initialize transcription"})
	}

	if billingApply != nil {
		if billingApply.Billing.FreeMinutesUsed > 0 {
			_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingFreeMinTotal, int64(billingApply.Billing.FreeMinutesUsed))
		}
		if billingApply.Billing.PaidMinutes > 0 {
			_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingPaidMinTotal, int64(billingApply.Billing.PaidMinutes))
		}
		if billingApply.Billing.ChargedLkm > 0 {
			_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingChargedTotal, int64(billingApply.Billing.ChargedLkm))
		}
	}

	result, transcribeErr := services.TranscribeChatAudio(c.UserContext(), strings.TrimSpace(msg.Content), req.Language)
	if transcribeErr != nil {
		log.Printf("[MessageTranscribe] user=%d message=%d failed: %v", userID, msg.ID, transcribeErr)
		_ = services.GetMetricsService().Increment(services.MetricChatTranscribeFailTotal, 1)
		_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingFailedTotal, 1)
		if compensationErr := h.failTranscribeJobAndCompensate(userID, msg.ID, transcribeJob, billingApply, transcribeErr.Error()); compensationErr == nil {
			if billingApply != nil && billingApply.Billing.ChargedLkm > 0 {
				_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingRefundTotal, int64(billingApply.Billing.ChargedLkm))
			}
		}
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Transcription failed"})
	}

	transcript := map[string]interface{}{
		"status":    "completed",
		"text":      result.Text,
		"model":     result.Model,
		"language":  strings.TrimSpace(result.Language),
		"updatedAt": time.Now().UTC().Format(time.RFC3339),
	}
	persistErr := database.DB.Transaction(func(tx *gorm.DB) error {
		var lockedMsg models.Message
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&lockedMsg, msg.ID).Error; err != nil {
			return err
		}
		if lockedMsg.MapData == nil {
			lockedMsg.MapData = map[string]interface{}{}
		}
		lockedMsg.MapData["transcript"] = transcript

		// Marshal to JSON bytes so GORM's json serializer works correctly
		jsonBytes, err := json.Marshal(lockedMsg.MapData)
		if err != nil {
			return fmt.Errorf("failed to marshal map_data: %w", err)
		}
		// Use raw SQL to set the jsonb column directly
		if err := tx.Exec(
			"UPDATE messages SET map_data = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
			string(jsonBytes),
			time.Now().UTC(),
			lockedMsg.ID,
		).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		return tx.Model(&models.ChatTranscribeJob{}).Where("id = ?", transcribeJob.ID).Updates(map[string]interface{}{
			"status":               models.ChatTranscribeJobStatusCompleted,
			"last_error":           "",
			"transcript_cached_at": now,
			"updated_at":           now,
		}).Error
	})
	if persistErr != nil {
		_ = services.GetMetricsService().Increment(services.MetricChatTranscribeFailTotal, 1)
		_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingFailedTotal, 1)
		if compensationErr := h.failTranscribeJobAndCompensate(userID, msg.ID, transcribeJob, billingApply, "persist failed"); compensationErr == nil {
			if billingApply != nil && billingApply.Billing.ChargedLkm > 0 {
				_ = services.GetMetricsService().Increment(services.MetricChatTranscribeBillingRefundTotal, int64(billingApply.Billing.ChargedLkm))
			}
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not persist transcription"})
	}

	_ = services.GetMetricsService().Increment(services.MetricChatTranscribeTotal, 1)
	latencyMs := time.Since(startedAt).Milliseconds()
	if latencyMs < 1 {
		latencyMs = 1
	}
	_ = services.GetMetricsService().Increment(services.MetricChatTranscribeLatencyMsTotal, latencyMs)

	if h.hub != nil {
		eventMessage := models.Message{
			SenderID:    msg.SenderID,
			RecipientID: msg.RecipientID,
			RoomID:      msg.RoomID,
			Type:        "message_transcription_updated",
			MapData: map[string]interface{}{
				"messageId":  msg.ID,
				"transcript": transcript,
			},
		}
		if msg.RoomID != 0 {
			memberIDs, membersErr := getRoomMemberUserIDs(msg.RoomID)
			if membersErr == nil {
				h.hub.Broadcast(eventMessage, memberIDs...)
			}
		} else {
			h.hub.Broadcast(eventMessage)
		}
	}

	return c.JSON(fiber.Map{
		"messageId":  msg.ID,
		"transcript": transcript,
		"billing":    pickTranscribeBillingResponse(billingApply, durationSec),
	})
}

func (h *MessageHandler) loadTranscribableMessage(c *fiber.Ctx, userID uint, messageID uint) (*models.Message, error) {
	var msg models.Message
	if err := database.DB.First(&msg, messageID).Error; err != nil {
		return nil, c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Message not found"})
	}

	if msg.RoomID != 0 {
		room, roomErr := loadRoomByID(msg.RoomID)
		if roomErr != nil {
			return nil, respondRoomLoadError(c, roomErr)
		}
		if _, accessErr := ensureRoomAccess(room, userID, true); accessErr != nil {
			return nil, respondRoomAccessError(c, accessErr)
		}
	} else if msg.SenderID != userID && msg.RecipientID != userID {
		return nil, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	messageType := strings.ToLower(strings.TrimSpace(msg.Type))
	mimeType := strings.ToLower(strings.TrimSpace(msg.MimeType))
	if messageType != "audio" && !strings.HasPrefix(mimeType, "audio/") {
		return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Message is not audio"})
	}

	audioURL := strings.TrimSpace(msg.Content)
	if _, err := services.NormalizeChatTranscriptionMediaURL(audioURL); err != nil {
		return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Audio URL is not available"})
	}

	return &msg, nil
}

func extractCompletedTranscript(mapData map[string]interface{}) (map[string]interface{}, bool) {
	if mapData == nil {
		return nil, false
	}
	rawTranscript, ok := mapData["transcript"]
	if !ok || rawTranscript == nil {
		return nil, false
	}

	transcript, ok := rawTranscript.(map[string]interface{})
	if !ok {
		return nil, false
	}
	text := strings.TrimSpace(fmt.Sprintf("%v", transcript["text"]))
	status := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", transcript["status"])))
	if status == "" {
		status = "completed"
		transcript["status"] = "completed"
	}
	if status != "completed" || text == "" {
		return nil, false
	}
	return transcript, true
}

func buildZeroChargeTranscribeBilling(durationSec int) services.ChatTranscribeBilling {
	cfg := services.ResolveChatTranscribeBillingConfig()
	return services.ChatTranscribeBilling{
		AudioMinutes:         services.ComputeChatTranscribeAudioMinutes(durationSec),
		FreeMinutesUsed:      0,
		PaidMinutes:          0,
		ChargedLkm:           0,
		PricePerMinuteLkm:    0,
		TariffType:           services.ChatTranscribeTariffTypeFree,
		WeeklyQuotaTotal:     cfg.FreeMinPerWeek,
		WeeklyQuotaRemaining: cfg.FreeMinPerWeek,
	}
}

func buildCachedJobBilling(job models.ChatTranscribeJob) services.ChatTranscribeBilling {
	cfg := services.ResolveChatTranscribeBillingConfig()
	audioMinutes := job.AudioMinutes
	if audioMinutes < 1 {
		audioMinutes = 1
	}
	remaining := cfg.FreeMinPerWeek
	if remaining < 0 {
		remaining = 0
	}
	return services.ChatTranscribeBilling{
		AudioMinutes:         audioMinutes,
		FreeMinutesUsed:      0,
		PaidMinutes:          0,
		ChargedLkm:           0,
		PricePerMinuteLkm:    job.PricePerMinuteLkm,
		TariffType:           services.ChatTranscribeTariffTypeFree,
		WeeklyQuotaTotal:     cfg.FreeMinPerWeek,
		WeeklyQuotaRemaining: remaining,
	}
}

func pickTranscribeBillingResponse(billingApply *services.ChatTranscribeBillingApplyResult, durationSec int) services.ChatTranscribeBilling {
	if billingApply != nil {
		return billingApply.Billing
	}
	return buildZeroChargeTranscribeBilling(durationSec)
}

func (h *MessageHandler) failTranscribeJobAndCompensate(userID uint, messageID uint, job models.ChatTranscribeJob, billingApply *services.ChatTranscribeBillingApplyResult, lastError string) error {
	billingService := services.NewChatTranscribeBillingService(h.walletService)
	errorText := strings.TrimSpace(lastError)
	if errorText == "" {
		errorText = "transcription failed"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		if billingApply != nil {
			weekKey := billingApply.WeekKey
			if strings.TrimSpace(weekKey) == "" {
				weekKey = strings.TrimSpace(job.WeekKey)
			}

			refundDedup := strings.TrimSpace(job.RefundDedupKey)
			if refundDedup == "" {
				refundDedup = fmt.Sprintf("transcribe_refund:%d:%d", userID, messageID)
			}
			if err := billingService.RefundAndRollbackTx(
				tx,
				userID,
				weekKey,
				billingApply.Billing.FreeMinutesUsed,
				billingApply.Billing.ChargedLkm,
				refundDedup,
			); err != nil {
				return err
			}
		}

		return tx.Model(&models.ChatTranscribeJob{}).Where("id = ?", job.ID).Updates(map[string]interface{}{
			"status":     models.ChatTranscribeJobStatusFailed,
			"last_error": errorText,
		}).Error
	})
}

func parseMessageMediaTypes(raw string) []string {
	allowed := map[string]struct{}{
		"image":        {},
		"audio":        {},
		"document":     {},
		"video_circle": {},
	}

	if strings.TrimSpace(raw) == "" {
		return []string{"image", "audio", "document", "video_circle"}
	}

	parts := strings.Split(raw, ",")
	types := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for _, part := range parts {
		item := strings.TrimSpace(strings.ToLower(part))
		if item == "" {
			continue
		}
		if _, ok := allowed[item]; !ok {
			continue
		}
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		types = append(types, item)
	}
	if len(types) == 0 {
		return []string{"image", "audio", "document", "video_circle"}
	}
	return types
}
