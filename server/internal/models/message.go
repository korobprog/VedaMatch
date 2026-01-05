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
	Type        string `json:"type" gorm:"default:'text'"` // 'text', 'image', 'audio', 'document'

	FileName  string `json:"fileName,omitempty"`  // Original file name
	FileSize  int64  `json:"fileSize,omitempty"`  // File size in bytes
	MimeType  string `json:"mimeType,omitempty"`  // MIME type
	Duration  int    `json:"duration,omitempty"`  // Audio duration in seconds
	Thumbnail string `json:"thumbnail,omitempty"` // Thumbnail URL for images
}
