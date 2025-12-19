package models

import (
	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	SenderID    uint   `json:"senderId" gorm:"index"`
	RecipientID uint   `json:"recipientId" gorm:"index"`
	Content     string `json:"content"`
	Type        string `json:"type" gorm:"default:'text'"` // 'text', 'image'
}
