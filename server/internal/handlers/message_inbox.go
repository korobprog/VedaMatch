package handlers

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/websocket"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type directConversationBroadcaster interface {
	Broadcast(msg models.Message, targetUserIDs ...uint)
	BroadcastConversationUpdated(event websocket.ConversationUpdatedEvent)
	BroadcastMessageRead(event websocket.MessageReadEvent)
}

type directConversationFilter string

const (
	directConversationFilterAll      directConversationFilter = "all"
	directConversationFilterUnread   directConversationFilter = "unread"
	directConversationFilterPinned   directConversationFilter = "pinned"
	directConversationFilterRequests directConversationFilter = "requests"
	directConversationFilterArchived directConversationFilter = "archived"
)

type directConversationRelationship string

const (
	directConversationRelationshipFriend          directConversationRelationship = "friend"
	directConversationRelationshipIncomingRequest directConversationRelationship = "incoming_request"
	directConversationRelationshipOutgoingRequest directConversationRelationship = "outgoing_request"
	directConversationRelationshipNone            directConversationRelationship = "none"
)

type directConversationCursor struct {
	Pinned        bool      `json:"pinned"`
	PinnedAt      time.Time `json:"pinnedAt"`
	LastMessageID uint      `json:"lastMessageId"`
	PeerUserID    uint      `json:"peerUserId"`
}

type publicUserPreview struct {
	ID              uint   `json:"ID"`
	KarmicName      string `json:"karmicName,omitempty"`
	SpiritualName   string `json:"spiritualName,omitempty"`
	Nickname        string `json:"nickname,omitempty"`
	NicknameDisplay string `json:"nicknameDisplay,omitempty"`
	DisplayName     string `json:"displayName,omitempty"`
	Email           string `json:"email,omitempty"`
	AvatarURL       string `json:"avatarUrl,omitempty"`
	LastSeen        string `json:"lastSeen,omitempty"`
}

type directConversationItem struct {
	PeerUserID      uint              `json:"peerUserId"`
	PeerUserPreview publicUserPreview `json:"peerUserPreview"`
	LastMessage     models.Message    `json:"lastMessage"`
	LastMessageAt   time.Time         `json:"lastMessageAt"`
	LastMessageType string            `json:"lastMessageType"`
	UnreadCount     int64             `json:"unreadCount"`
	Muted           bool              `json:"muted"`
	Pinned          bool              `json:"pinned"`
	PinnedAt        *time.Time        `json:"pinnedAt,omitempty"`
	Archived        bool              `json:"archived"`
	ArchivedAt      *time.Time        `json:"archivedAt,omitempty"`
	Relationship    string            `json:"relationshipStatus,omitempty"`
	FriendRequestID *uint             `json:"friendRequestId,omitempty"`
}

type directConversationRow struct {
	PeerUserID      uint
	LastMessageID   uint
	UnreadCount     int64
	Muted           bool
	Pinned          bool
	PinnedAt        *time.Time
	Archived        bool
	ArchivedAt      *time.Time
	Relationship    string
	FriendRequestID *uint
}

type directConversationListResponse struct {
	Items      []directConversationItem `json:"items"`
	HasMore    bool                     `json:"hasMore"`
	NextCursor *string                  `json:"nextCursor,omitempty"`
}

func parseDirectConversationFilter(raw string) (directConversationFilter, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", string(directConversationFilterAll):
		return directConversationFilterAll, nil
	case string(directConversationFilterUnread):
		return directConversationFilterUnread, nil
	case string(directConversationFilterPinned):
		return directConversationFilterPinned, nil
	case string(directConversationFilterRequests):
		return directConversationFilterRequests, nil
	case string(directConversationFilterArchived):
		return directConversationFilterArchived, nil
	default:
		return "", fmt.Errorf("invalid filter")
	}
}

func encodeDirectConversationCursor(cursor directConversationCursor) (string, error) {
	data, err := json.Marshal(cursor)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

func decodeDirectConversationCursor(raw string) (*directConversationCursor, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}

	data, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor")
	}

	var cursor directConversationCursor
	if err := json.Unmarshal(data, &cursor); err != nil {
		return nil, fmt.Errorf("invalid cursor")
	}

	return &cursor, nil
}

func (h *MessageHandler) ListConversations(c *fiber.Ctx) error {
	if database.DB == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database is not initialized"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	filter, err := parseDirectConversationFilter(c.Query("filter"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid filter"})
	}

	searchQuery := strings.TrimSpace(c.Query("q"))

	cursor, err := decodeDirectConversationCursor(c.Query("cursor"))
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

	rows, err := loadDirectConversationRows(userID, filter, cursor, limit, searchQuery)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load conversations"})
	}

	if len(rows) == 0 {
		return c.JSON(directConversationListResponse{
			Items:   []directConversationItem{},
			HasMore: false,
		})
	}

	messageIDs := make([]uint, 0, len(rows))
	peerIDs := make([]uint, 0, len(rows))
	for _, row := range rows {
		messageIDs = append(messageIDs, row.LastMessageID)
		peerIDs = append(peerIDs, row.PeerUserID)
	}

	var messages []models.Message
	if err := database.DB.Where("id IN ?", messageIDs).Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load conversation messages"})
	}
	messageByID := make(map[uint]models.Message, len(messages))
	for _, msg := range messages {
		messageByID[msg.ID] = msg
	}

	var users []models.User
	if err := database.DB.Where("id IN ?", peerIDs).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load conversation users"})
	}
	userByID := make(map[uint]models.User, len(users))
	for _, user := range users {
		userByID[user.ID] = user
	}

	items := make([]directConversationItem, 0, len(rows))
	for _, row := range rows {
		msg, ok := messageByID[row.LastMessageID]
		if !ok {
			continue
		}

		peer := userByID[row.PeerUserID]
		items = append(items, directConversationItem{
			PeerUserID:      row.PeerUserID,
			PeerUserPreview: buildPublicUserPreview(peer, row.PeerUserID),
			LastMessage:     msg,
			LastMessageAt:   msg.CreatedAt,
			LastMessageType: msg.Type,
			UnreadCount:     row.UnreadCount,
			Muted:           row.Muted,
			Pinned:          row.Pinned,
			PinnedAt:        row.PinnedAt,
			Archived:        row.Archived,
			ArchivedAt:      row.ArchivedAt,
			Relationship:    row.Relationship,
			FriendRequestID: row.FriendRequestID,
		})
	}

	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}

	var nextCursor *string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		encoded, encErr := encodeDirectConversationCursor(directConversationCursor{
			Pinned:        last.Pinned,
			PinnedAt:      timeValueOrZero(last.PinnedAt),
			LastMessageID: last.LastMessage.ID,
			PeerUserID:    last.PeerUserID,
		})
		if encErr == nil {
			nextCursor = &encoded
		}
	}

	return c.JSON(directConversationListResponse{
		Items:      items,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	})
}

func (h *MessageHandler) MarkConversationRead(c *fiber.Ctx) error {
	if database.DB == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database is not initialized"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	peerUserID, err := parseRequiredPositiveUint(c.Params("peerUserId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid peerUserId"})
	}
	if peerUserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot mark self conversation as read"})
	}

	now := time.Now().UTC()
	tx := database.DB.Model(&models.Message{}).Where(
		"room_id = 0 AND sender_id = ? AND recipient_id = ? AND read_at IS NULL",
		peerUserID, userID,
	).Update("read_at", now)
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update read state"})
	}

	latest, err := loadLatestDirectMessage(peerUserID, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load conversation state"})
	}

	if tx.RowsAffected > 0 {
		if h.hub != nil && latest != nil {
			h.hub.BroadcastMessageRead(websocket.MessageReadEvent{
				SenderID:             latest.SenderID,
				RecipientID:          latest.RecipientID,
				PeerUserID:           peerUserID,
				MessageID:            latest.ID,
				ReadThroughMessageID: latest.ID,
				ReadAt:               now,
				TargetUserIDs:        []uint{userID},
			})
			h.hub.BroadcastMessageRead(websocket.MessageReadEvent{
				SenderID:             latest.SenderID,
				RecipientID:          latest.RecipientID,
				PeerUserID:           userID,
				MessageID:            latest.ID,
				ReadThroughMessageID: latest.ID,
				ReadAt:               now,
				TargetUserIDs:        []uint{peerUserID},
			})
			h.broadcastDirectConversationUpdatedForPair(userID, peerUserID)
		}
	}

	var conversation *directConversationItem
	if latest != nil {
		if item, buildErr := buildDirectConversationItem(userID, peerUserID, *latest); buildErr == nil {
			conversation = &item
		}
	}

	return c.JSON(fiber.Map{
		"peerUserId":   peerUserID,
		"updatedRows":  tx.RowsAffected,
		"unreadCount":  0,
		"conversation": conversation,
	})
}

func (h *MessageHandler) broadcastDirectConversationUpdated(latest models.Message) {
	if h.hub == nil {
		return
	}

	h.broadcastConversationStateForUser(latest.SenderID, latest.RecipientID, latest, nil)
	h.broadcastConversationStateForUser(latest.RecipientID, latest.SenderID, latest, nil)
}

func (h *MessageHandler) broadcastDirectConversationUpdatedForPair(senderID, recipientID uint) {
	if h.hub == nil {
		return
	}

	latest, err := loadLatestDirectMessage(senderID, recipientID)
	if err != nil || latest == nil {
		return
	}

	h.broadcastConversationStateForUser(senderID, recipientID, *latest, nil)
	h.broadcastConversationStateForUser(recipientID, senderID, *latest, nil)
}

func (h *MessageHandler) broadcastConversationStateForUser(currentUserID, peerUserID uint, latest models.Message, readAt *time.Time) {
	if h.hub == nil {
		return
	}

	item, err := buildDirectConversationItem(currentUserID, peerUserID, latest)
	if err != nil {
		return
	}

	lastMessageAt := item.LastMessageAt.UTC()
	h.hub.BroadcastConversationUpdated(websocket.ConversationUpdatedEvent{
		SenderID:        latest.SenderID,
		RecipientID:     latest.RecipientID,
		PeerUserID:      peerUserID,
		MessageID:       latest.ID,
		LastMessage:     latest.Content,
		LastMessageAt:   &lastMessageAt,
		LastMessageType: item.LastMessageType,
		UnreadCount:     item.UnreadCount,
		Muted:           item.Muted,
		Pinned:          item.Pinned,
		PinnedAt:        item.PinnedAt,
		Archived:        item.Archived,
		ArchivedAt:      item.ArchivedAt,
		Relationship:    item.Relationship,
		FriendRequestID: item.FriendRequestID,
		ReadAt:          readAt,
		TargetUserIDs:   []uint{currentUserID},
	})
}

func broadcastDirectConversationStateToUser(hub directConversationBroadcaster, currentUserID, peerUserID uint) {
	if hub == nil || currentUserID == 0 || peerUserID == 0 {
		return
	}

	latest, err := loadLatestDirectMessage(currentUserID, peerUserID)
	if err != nil || latest == nil {
		return
	}

	item, err := buildDirectConversationItem(currentUserID, peerUserID, *latest)
	if err != nil {
		return
	}

	lastMessageAt := item.LastMessageAt.UTC()
	hub.BroadcastConversationUpdated(websocket.ConversationUpdatedEvent{
		SenderID:        latest.SenderID,
		RecipientID:     latest.RecipientID,
		PeerUserID:      peerUserID,
		MessageID:       latest.ID,
		LastMessage:     latest.Content,
		LastMessageAt:   &lastMessageAt,
		LastMessageType: item.LastMessageType,
		UnreadCount:     item.UnreadCount,
		Muted:           item.Muted,
		Pinned:          item.Pinned,
		PinnedAt:        item.PinnedAt,
		Archived:        item.Archived,
		ArchivedAt:      item.ArchivedAt,
		Relationship:    item.Relationship,
		FriendRequestID: item.FriendRequestID,
		TargetUserIDs:   []uint{currentUserID},
	})
}

func clearArchivedDirectPreference(userID, peerUserID uint) error {
	if database.DB == nil || userID == 0 || peerUserID == 0 {
		return nil
	}

	return database.DB.Model(&models.ChatPreference{}).
		Where("user_id = ? AND peer_user_id = ? AND archived = ?", userID, peerUserID, true).
		Updates(map[string]any{
			"archived":    false,
			"archived_at": nil,
		}).Error
}

func clearArchivedDirectPreferencesForPair(senderID, recipientID uint) error {
	if err := clearArchivedDirectPreference(senderID, recipientID); err != nil {
		return err
	}
	if err := clearArchivedDirectPreference(recipientID, senderID); err != nil {
		return err
	}
	return nil
}

func loadLatestDirectMessage(senderID, recipientID uint) (*models.Message, error) {
	if database.DB == nil {
		return nil, fmt.Errorf("database is not initialized")
	}

	var msg models.Message
	err := database.DB.Where(
		"room_id = 0 AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))",
		senderID, recipientID, recipientID, senderID,
	).Order("id DESC").First(&msg).Error
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func loadDirectConversationRows(userID uint, filter directConversationFilter, cursor *directConversationCursor, limit int, searchQuery string) ([]directConversationRow, error) {
	if database.DB == nil {
		return nil, fmt.Errorf("database is not initialized")
	}

	query := `
WITH direct_messages AS (
	SELECT
		m.id,
		CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END AS peer_user_id
	FROM messages m
	WHERE m.room_id = 0 AND (m.sender_id = ? OR m.recipient_id = ?)
),
last_messages AS (
	SELECT DISTINCT ON (peer_user_id)
		peer_user_id,
		id AS last_message_id
	FROM direct_messages
	ORDER BY peer_user_id, id DESC
),
unread_counts AS (
	SELECT
		sender_id AS peer_user_id,
		COUNT(*) AS unread_count
	FROM messages
	WHERE room_id = 0 AND recipient_id = ? AND read_at IS NULL
	GROUP BY sender_id
),
friend_edges AS (
	SELECT friend_id AS peer_user_id
	FROM friends
	WHERE user_id = ?
),
outgoing_requests AS (
	SELECT id, receiver_id AS peer_user_id
	FROM friend_requests
	WHERE sender_id = ? AND status = ?
),
incoming_requests AS (
	SELECT id, sender_id AS peer_user_id
	FROM friend_requests
	WHERE receiver_id = ? AND status = ?
)
SELECT
	lm.peer_user_id,
	lm.last_message_id,
	COALESCE(uc.unread_count, 0) AS unread_count,
	COALESCE(pref.muted, false) AS muted,
	COALESCE(pref.pinned, false) AS pinned,
	pref.pinned_at AS pinned_at,
	COALESCE(pref.archived, false) AS archived,
	pref.archived_at AS archived_at,
	CASE
		WHEN fe.peer_user_id IS NOT NULL THEN 'friend'
		WHEN ir.peer_user_id IS NOT NULL THEN 'incoming_request'
		WHEN orq.peer_user_id IS NOT NULL THEN 'outgoing_request'
		ELSE 'none'
	END AS relationship,
	CASE
		WHEN ir.id IS NOT NULL THEN ir.id
		WHEN orq.id IS NOT NULL THEN orq.id
		ELSE NULL
	END AS friend_request_id
FROM last_messages lm
JOIN messages last_msg ON last_msg.id = lm.last_message_id
JOIN users peer ON peer.id = lm.peer_user_id
LEFT JOIN unread_counts uc ON uc.peer_user_id = lm.peer_user_id
LEFT JOIN chat_preferences pref ON pref.user_id = ? AND pref.peer_user_id = lm.peer_user_id
LEFT JOIN friend_edges fe ON fe.peer_user_id = lm.peer_user_id
LEFT JOIN outgoing_requests orq ON orq.peer_user_id = lm.peer_user_id
LEFT JOIN incoming_requests ir ON ir.peer_user_id = lm.peer_user_id
WHERE 1=1`

	args := []any{
		userID,
		userID,
		userID,
		userID,
		userID,
		userID,
		models.FriendRequestStatusPending,
		userID,
		models.FriendRequestStatusPending,
		userID,
	}

	switch filter {
	case directConversationFilterAll:
		query += ` AND COALESCE(pref.archived, false) = false`
	case directConversationFilterUnread:
		query += ` AND COALESCE(uc.unread_count, 0) > 0 AND COALESCE(pref.archived, false) = false`
	case directConversationFilterPinned:
		query += ` AND COALESCE(pref.pinned, false) = true AND COALESCE(pref.archived, false) = false`
	case directConversationFilterRequests:
		query += ` AND COALESCE(pref.archived, false) = false AND fe.peer_user_id IS NULL`
	case directConversationFilterArchived:
		query += ` AND COALESCE(pref.archived, false) = true`
	default:
		return nil, fmt.Errorf("invalid filter")
	}

	if trimmed := strings.TrimSpace(searchQuery); trimmed != "" {
		searchPattern := "%" + strings.ToLower(trimmed) + "%"
		query += `
	AND (
		LOWER(COALESCE(peer.spiritual_name, '')) LIKE ?
		OR LOWER(COALESCE(peer.karmic_name, '')) LIKE ?
		OR LOWER(COALESCE(peer.nickname_display, '')) LIKE ?
		OR LOWER(COALESCE(peer.nickname, '')) LIKE ?
		OR LOWER(COALESCE(peer.email, '')) LIKE ?
		OR LOWER(COALESCE(last_msg.content, '')) LIKE ?
	)`
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if cursor != nil {
		query += `
	AND (
		CASE WHEN COALESCE(pref.pinned, false) THEN 1 ELSE 0 END,
		COALESCE(pref.pinned_at, to_timestamp(0)),
		lm.last_message_id,
		lm.peer_user_id
	) < (?, ?, ?, ?)`
		args = append(args, boolToInt(cursor.Pinned), cursor.PinnedAt, cursor.LastMessageID, cursor.PeerUserID)
	}

	query += `
ORDER BY
	COALESCE(pref.pinned, false) DESC,
	COALESCE(pref.pinned_at, to_timestamp(0)) DESC,
	lm.last_message_id DESC,
	lm.peer_user_id DESC
LIMIT ?`
	args = append(args, limit+1)

	var rows []directConversationRow
	if err := database.DB.Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func buildDirectConversationItem(currentUserID, peerUserID uint, latest models.Message) (directConversationItem, error) {
	row := directConversationRow{
		PeerUserID:    peerUserID,
		LastMessageID: latest.ID,
	}
	preview, err := loadPublicUserPreview(peerUserID)
	if err != nil {
		return directConversationItem{}, err
	}

	unreadCount, muted, pinned, pinnedAt, err := loadDirectConversationMeta(currentUserID, peerUserID)
	if err != nil {
		return directConversationItem{}, err
	}
	archived, archivedAt, err := loadDirectConversationArchiveMeta(currentUserID, peerUserID)
	if err != nil {
		return directConversationItem{}, err
	}

	row.UnreadCount = unreadCount
	row.Muted = muted
	row.Pinned = pinned
	row.PinnedAt = pinnedAt
	row.Archived = archived
	row.ArchivedAt = archivedAt

	relationship, friendRequestID, err := loadDirectConversationRelationship(currentUserID, peerUserID)
	if err != nil {
		return directConversationItem{}, err
	}
	row.Relationship = relationship
	row.FriendRequestID = friendRequestID

	return directConversationItem{
		PeerUserID:      peerUserID,
		PeerUserPreview: preview,
		LastMessage:     latest,
		LastMessageAt:   latest.CreatedAt,
		LastMessageType: latest.Type,
		UnreadCount:     row.UnreadCount,
		Muted:           row.Muted,
		Pinned:          row.Pinned,
		PinnedAt:        row.PinnedAt,
		Archived:        row.Archived,
		ArchivedAt:      row.ArchivedAt,
		Relationship:    row.Relationship,
		FriendRequestID: row.FriendRequestID,
	}, nil
}

func loadDirectConversationRelationship(userID, peerUserID uint) (string, *uint, error) {
	if database.DB == nil {
		return string(directConversationRelationshipNone), nil, fmt.Errorf("database is not initialized")
	}

	var friendCount int64
	if err := database.DB.Model(&models.Friend{}).
		Where("user_id = ? AND friend_id = ?", userID, peerUserID).
		Count(&friendCount).Error; err != nil {
		return "", nil, err
	}
	if friendCount > 0 {
		return string(directConversationRelationshipFriend), nil, nil
	}

	var incomingRequest models.FriendRequest
	if err := database.DB.Model(&models.FriendRequest{}).
		Where("sender_id = ? AND receiver_id = ? AND status = ?", peerUserID, userID, models.FriendRequestStatusPending).
		Order("id DESC").
		First(&incomingRequest).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, err
	}
	if incomingRequest.ID > 0 {
		requestID := incomingRequest.ID
		return string(directConversationRelationshipIncomingRequest), &requestID, nil
	}

	var outgoingRequest models.FriendRequest
	if err := database.DB.Model(&models.FriendRequest{}).
		Where("sender_id = ? AND receiver_id = ? AND status = ?", userID, peerUserID, models.FriendRequestStatusPending).
		Order("id DESC").
		First(&outgoingRequest).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, err
	}
	if outgoingRequest.ID > 0 {
		requestID := outgoingRequest.ID
		return string(directConversationRelationshipOutgoingRequest), &requestID, nil
	}

	return string(directConversationRelationshipNone), nil, nil
}

func loadDirectConversationMeta(userID, peerUserID uint) (int64, bool, bool, *time.Time, error) {
	if database.DB == nil {
		return 0, false, false, nil, fmt.Errorf("database is not initialized")
	}

	type metaRow struct {
		UnreadCount int64      `gorm:"column:unread_count"`
		Muted       bool       `gorm:"column:muted"`
		Pinned      bool       `gorm:"column:pinned"`
		PinnedAt    *time.Time `gorm:"column:pinned_at"`
	}

	var row metaRow
	err := database.DB.Raw(`
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM messages
		WHERE room_id = 0 AND sender_id = ? AND recipient_id = ? AND read_at IS NULL
	), 0) AS unread_count,
	COALESCE(pref.muted, false) AS muted,
	COALESCE(pref.pinned, false) AS pinned,
	pref.pinned_at AS pinned_at
FROM chat_preferences pref
WHERE pref.user_id = ? AND pref.peer_user_id = ?
LIMIT 1`,
		peerUserID, userID, userID, peerUserID,
	).Scan(&row).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, false, false, nil, err
	}

	if row.UnreadCount == 0 && !row.Muted && !row.Pinned && row.PinnedAt == nil {
		row = metaRow{}
		_ = database.DB.Raw(`
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM messages
		WHERE room_id = 0 AND sender_id = ? AND recipient_id = ? AND read_at IS NULL
	), 0) AS unread_count
`, peerUserID, userID).Scan(&row).Error
	}

	return row.UnreadCount, row.Muted, row.Pinned, row.PinnedAt, nil
}

func loadDirectConversationArchiveMeta(userID, peerUserID uint) (bool, *time.Time, error) {
	if database.DB == nil {
		return false, nil, fmt.Errorf("database is not initialized")
	}

	type archiveRow struct {
		Archived   bool       `gorm:"column:archived"`
		ArchivedAt *time.Time `gorm:"column:archived_at"`
	}

	var row archiveRow
	err := database.DB.Raw(`
SELECT
	COALESCE(pref.archived, false) AS archived,
	pref.archived_at AS archived_at
FROM chat_preferences pref
WHERE pref.user_id = ? AND pref.peer_user_id = ?
LIMIT 1`,
		userID, peerUserID,
	).Scan(&row).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil, err
	}

	return row.Archived, row.ArchivedAt, nil
}

func loadPublicUserPreview(userID uint) (publicUserPreview, error) {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return publicUserPreview{}, err
	}
	return buildPublicUserPreview(user, userID), nil
}

func buildPublicUserPreview(user models.User, fallbackID uint) publicUserPreview {
	displayName := resolveDirectChatDisplayName(user, fallbackID)
	nicknameDisplay := strings.TrimSpace(user.NicknameDisplay)
	if nicknameDisplay == "" && strings.TrimSpace(user.Nickname) != "" {
		nicknameDisplay = "@" + strings.TrimSpace(user.Nickname)
	}

	return publicUserPreview{
		ID:              user.ID,
		KarmicName:      strings.TrimSpace(user.KarmicName),
		SpiritualName:   strings.TrimSpace(user.SpiritualName),
		Nickname:        strings.TrimSpace(user.Nickname),
		NicknameDisplay: nicknameDisplay,
		DisplayName:     displayName,
		Email:           strings.TrimSpace(user.Email),
		AvatarURL:       strings.TrimSpace(user.AvatarURL),
		LastSeen:        strings.TrimSpace(user.LastSeen),
	}
}

func resolveDirectChatDisplayName(user models.User, fallbackID uint) string {
	for _, candidate := range []string{
		strings.TrimSpace(user.SpiritualName),
		strings.TrimSpace(user.KarmicName),
		strings.TrimSpace(user.NicknameDisplay),
		func() string {
			if nickname := strings.TrimSpace(user.Nickname); nickname != "" {
				return "@" + nickname
			}
			return ""
		}(),
		strings.TrimSpace(user.Email),
	} {
		if candidate != "" {
			return candidate
		}
	}
	return fmt.Sprintf("User #%d", fallbackID)
}

func timeValueOrZero(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return value.UTC()
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
