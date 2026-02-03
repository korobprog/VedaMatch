package models

import (
	"time"

	"gorm.io/gorm"
)

// AdminNotificationType represents the type of admin notification
type AdminNotificationType string

const (
	NotificationNewYatra          AdminNotificationType = "new_yatra"
	NotificationYatraReport       AdminNotificationType = "yatra_report"
	NotificationOrganizerReport   AdminNotificationType = "organizer_report"
	NotificationYatraCancelled    AdminNotificationType = "yatra_cancelled_soon"
	NotificationHighPriorityIssue AdminNotificationType = "high_priority_issue"
)

// AdminNotification represents a notification for admin users
type AdminNotification struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Notification details
	Type    AdminNotificationType `json:"type" gorm:"type:varchar(50);not null;index"`
	Message string                `json:"message" gorm:"type:text;not null"`
	LinkTo  string                `json:"linkTo" gorm:"type:varchar(500)"` // URL to related resource

	// Related IDs (for filtering/grouping)
	YatraID  *uint `json:"yatraId" gorm:"index"`
	ReportID *uint `json:"reportId" gorm:"index"`
	UserID   *uint `json:"userId" gorm:"index"` // Related user (organizer, reported user)

	// Read status
	Read   bool       `json:"read" gorm:"default:false;index"`
	ReadAt *time.Time `json:"readAt"`
	ReadBy *uint      `json:"readBy"` // Which admin read it
}

// AdminNotificationCreateRequest DTO for creating a notification
type AdminNotificationCreateRequest struct {
	Type     AdminNotificationType `json:"type" binding:"required"`
	Message  string                `json:"message" binding:"required"`
	LinkTo   string                `json:"linkTo"`
	YatraID  *uint                 `json:"yatraId"`
	ReportID *uint                 `json:"reportId"`
	UserID   *uint                 `json:"userId"`
}
