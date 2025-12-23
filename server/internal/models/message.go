package models

import (
	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	SenderID    uint   `json:"senderId" gorm:"index"`
	RecipientID uint   `json:"recipientId" gorm:"index"` // For 1-on-1 chats
	RoomID      uint   `json:"roomId" gorm:"index"`      // For group chats
	Content     string `json:"content"`
	Type        string `json:"type" gorm:"default:'text'"` // 'text', 'image'
}
