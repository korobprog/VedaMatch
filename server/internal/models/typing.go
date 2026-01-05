package models

type TypingEvent struct {
	SenderID    uint   `json:"senderId"`
	RecipientID uint   `json:"recipientId"`
	IsTyping    bool   `json:"isTyping"`
	Type        string `json:"type"` // "typing"
}
