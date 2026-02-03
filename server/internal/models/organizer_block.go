package models

import (
	"time"

	"gorm.io/gorm"
)

// OrganizerBlock represents a block on an organizer preventing them from creating yatras
type OrganizerBlock struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Blocked user
	UserID uint  `json:"userId" gorm:"not null;index;uniqueIndex:idx_active_block"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Admin who blocked
	BlockedBy     uint  `json:"blockedBy" gorm:"not null;index"`
	BlockedByUser *User `json:"blockedByUser,omitempty" gorm:"foreignKey:BlockedBy"`

	// Block details
	Reason string `json:"reason" gorm:"type:text"`

	// Expiration (NULL = permanent)
	ExpiresAt *time.Time `json:"expiresAt"`

	// Auto-set to true when active
	IsActive bool `json:"isActive" gorm:"default:true;index;uniqueIndex:idx_active_block"`
}

// OrganizerBlockCreateRequest DTO for blocking an organizer
type OrganizerBlockCreateRequest struct {
	UserID   uint   `json:"userId" binding:"required"`
	Reason   string `json:"reason" binding:"required"`
	Duration *int   `json:"duration"` // Duration in days, nil = permanent
}

// IsExpired checks if the block has expired
func (ob *OrganizerBlock) IsExpired() bool {
	if ob.ExpiresAt == nil {
		return false // Permanent block
	}
	return time.Now().After(*ob.ExpiresAt)
}
