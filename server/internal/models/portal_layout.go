package models

import (
	"gorm.io/gorm"
)

// UserPortalLayout stores the user's portal layout configuration
type UserPortalLayout struct {
	gorm.Model
	UserID       uint   `json:"userId" gorm:"uniqueIndex"`
	LayoutJSON   string `json:"layoutJson" gorm:"type:text"` // Full layout object as JSON
	LastModified int64  `json:"lastModified"`                // Timestamp for sync
}
