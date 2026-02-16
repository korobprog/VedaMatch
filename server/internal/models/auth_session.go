package models

import "time"

// AuthSession stores long-lived refresh sessions for device-level auth lifecycle.
type AuthSession struct {
	ID uint `json:"id" gorm:"primaryKey"`

	UserID uint   `json:"userId" gorm:"not null;index"`
	User   *User  `json:"user,omitempty" gorm:"foreignKey:UserID"`
	DeviceID string `json:"deviceId,omitempty" gorm:"type:varchar(128);index"`

	RefreshTokenHash string `json:"-" gorm:"type:char(64);not null;uniqueIndex"`

	ExpiresAt  time.Time  `json:"expiresAt" gorm:"not null;index"`
	RevokedAt  *time.Time `json:"revokedAt,omitempty" gorm:"index"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
