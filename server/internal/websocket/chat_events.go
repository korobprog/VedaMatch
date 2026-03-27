package websocket

import "time"

type ConversationUpdatedEvent struct {
	Type            string     `json:"type"`
	SenderID        uint       `json:"senderId"`
	RecipientID     uint       `json:"recipientId"`
	PeerUserID      uint       `json:"peerUserId"`
	MessageID       uint       `json:"messageId"`
	LastMessage     string     `json:"lastMessage,omitempty"`
	LastMessageAt   *time.Time `json:"lastMessageAt,omitempty"`
	LastMessageType string     `json:"lastMessageType,omitempty"`
	UnreadCount     int64      `json:"unreadCount"`
	Muted           bool       `json:"muted"`
	Pinned          bool       `json:"pinned"`
	PinnedAt        *time.Time `json:"pinnedAt,omitempty"`
	Archived        bool       `json:"archived"`
	ArchivedAt      *time.Time `json:"archivedAt,omitempty"`
	Relationship    string     `json:"relationshipStatus,omitempty"`
	FriendRequestID *uint      `json:"friendRequestId,omitempty"`
	ReadAt          *time.Time `json:"readAt,omitempty"`
	TargetUserIDs   []uint     `json:"-"`
}

func (e ConversationUpdatedEvent) GetType() string      { return "conversation_updated" }
func (e ConversationUpdatedEvent) GetSenderID() uint    { return e.SenderID }
func (e ConversationUpdatedEvent) GetRecipientID() uint { return e.RecipientID }
func (e ConversationUpdatedEvent) GetRoomID() uint      { return 0 }
func (e ConversationUpdatedEvent) GetTargetUserIDs() []uint {
	return e.TargetUserIDs
}

type MessageReadEvent struct {
	Type                 string    `json:"type"`
	SenderID             uint      `json:"senderId"`
	RecipientID          uint      `json:"recipientId"`
	PeerUserID           uint      `json:"peerUserId"`
	MessageID            uint      `json:"messageId"`
	ReadThroughMessageID uint      `json:"readThroughMessageId"`
	ReadAt               time.Time `json:"readAt"`
	TargetUserIDs        []uint    `json:"-"`
}

func (e MessageReadEvent) GetType() string      { return "message_read" }
func (e MessageReadEvent) GetSenderID() uint    { return e.SenderID }
func (e MessageReadEvent) GetRecipientID() uint { return e.RecipientID }
func (e MessageReadEvent) GetRoomID() uint      { return 0 }
func (e MessageReadEvent) GetTargetUserIDs() []uint {
	return e.TargetUserIDs
}
