package models

import "time"

// UserDeviceToken stores push tokens per user/device.
// It enables multi-device delivery while keeping legacy users.push_token fallback.
type UserDeviceToken struct {
	ID uint `json:"id" gorm:"primaryKey"`

	UserID uint   `json:"userId" gorm:"not null;uniqueIndex:idx_user_device_tokens_user_token,priority:1;index:idx_user_device_tokens_user_invalidated,priority:1"`
	Token  string `json:"token" gorm:"type:text;not null;uniqueIndex:idx_user_device_tokens_user_token,priority:2;index:idx_user_device_tokens_token"`

	Provider string `json:"provider" gorm:"type:varchar(16);not null;default:'fcm'"`
	Platform string `json:"platform" gorm:"type:varchar(16);not null;default:'android'"`

	DeviceID   string `json:"deviceId,omitempty" gorm:"type:varchar(128)"`
	AppVersion string `json:"appVersion,omitempty" gorm:"type:varchar(64)"`

	LastSeenAt    time.Time  `json:"lastSeenAt" gorm:"not null"`
	InvalidatedAt *time.Time `json:"invalidatedAt,omitempty" gorm:"index:idx_user_device_tokens_user_invalidated,priority:2"`
	FailCount     int        `json:"failCount" gorm:"not null;default:0"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
