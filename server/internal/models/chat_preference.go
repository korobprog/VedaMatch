package models

import (
	"time"

	"gorm.io/gorm"
)

// ChatPreference stores per-user dialog-level settings (mute/pin) for P2P chats.
type ChatPreference struct {
	gorm.Model
	UserID     uint       `json:"userId" gorm:"not null;index;uniqueIndex:idx_chat_preferences_user_peer"`
	PeerUserID uint       `json:"peerUserId" gorm:"not null;index;uniqueIndex:idx_chat_preferences_user_peer"`
	Muted      bool       `json:"muted" gorm:"not null;default:false;index"`
	Pinned     bool       `json:"pinned" gorm:"not null;default:false;index"`
	PinnedAt   *time.Time `json:"pinnedAt,omitempty" gorm:"index"`
}

func (ChatPreference) TableName() string {
	return "chat_preferences"
}

