package models

import (
	"time"

	"gorm.io/gorm"
)

type RoomInviteToken struct {
	gorm.Model
	RoomID    uint   `json:"roomId" gorm:"not null;index"`
	CreatedBy uint   `json:"createdBy" gorm:"not null;index"`
	TokenHash string `json:"-" gorm:"type:varchar(128);not null;uniqueIndex"`

	ExpiresAt *time.Time `json:"expiresAt" gorm:"index"`
	MaxUses   uint       `json:"maxUses" gorm:"default:1"`
	UsedCount uint       `json:"usedCount" gorm:"default:0"`
	RevokedAt *time.Time `json:"revokedAt" gorm:"index"`
}

func (t *RoomInviteToken) IsActive(now time.Time) bool {
	if t == nil {
		return false
	}
	if t.RevokedAt != nil {
		return false
	}
	if t.ExpiresAt != nil && now.After(*t.ExpiresAt) {
		return false
	}
	if t.MaxUses > 0 && t.UsedCount >= t.MaxUses {
		return false
	}
	return true
}
