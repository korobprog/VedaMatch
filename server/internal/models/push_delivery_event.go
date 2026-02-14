package models

import "time"

// PushDeliveryEvent stores provider delivery outcomes without storing raw push token.
type PushDeliveryEvent struct {
	ID uint `json:"id" gorm:"primaryKey"`

	CreatedAt time.Time `json:"createdAt" gorm:"index"`

	UserID *uint `json:"userId,omitempty" gorm:"index"`

	Provider  string `json:"provider" gorm:"type:varchar(16);not null;index"`
	Platform  string `json:"platform" gorm:"type:varchar(16);not null;default:'unknown'"`
	EventType string `json:"eventType" gorm:"type:varchar(64);index"`
	TokenHash string `json:"tokenHash" gorm:"type:char(64);not null;index"`

	Status    string `json:"status" gorm:"type:varchar(24);not null;index"` // success|retry|invalid|failed
	ErrorType string `json:"errorType,omitempty" gorm:"type:varchar(24)"`
	ErrorCode string `json:"errorCode,omitempty" gorm:"type:varchar(128)"`
	Attempt   int    `json:"attempt" gorm:"not null;default:1"`
	LatencyMs int64  `json:"latencyMs" gorm:"not null;default:0"`
}
