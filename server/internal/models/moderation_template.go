package models

import (
	"time"

	"gorm.io/gorm"
)

// ModerationTemplateType represents the type of moderation template
type ModerationTemplateType string

const (
	TemplateYatraApproved        ModerationTemplateType = "yatra_approved"
	TemplateYatraRejected        ModerationTemplateType = "yatra_rejected"
	TemplateYatraRequiresChanges ModerationTemplateType = "yatra_requires_changes"
	TemplateReportResolved       ModerationTemplateType = "report_resolved"
	TemplateReportDismissed      ModerationTemplateType = "report_dismissed"
	TemplateOrganizerBlocked     ModerationTemplateType = "organizer_blocked"
	TemplateOrganizerWarning     ModerationTemplateType = "organizer_warning"
	TemplateBroadcast            ModerationTemplateType = "broadcast"
)

// ModerationTemplate represents an email/notification template for moderation
type ModerationTemplate struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Template details
	Name    string                 `json:"name" gorm:"type:varchar(100);not null;uniqueIndex"`
	Subject string                 `json:"subject" gorm:"type:varchar(200)"` // For emails
	Body    string                 `json:"body" gorm:"type:text;not null"`
	Type    ModerationTemplateType `json:"type" gorm:"type:varchar(50);index"`

	// Metadata
	IsDefault bool `json:"isDefault" gorm:"default:false"` // System template
	IsActive  bool `json:"isActive" gorm:"default:true"`
}

// ModerationTemplateCreateRequest DTO for creating a template
type ModerationTemplateCreateRequest struct {
	Name    string                 `json:"name" binding:"required"`
	Subject string                 `json:"subject"`
	Body    string                 `json:"body" binding:"required"`
	Type    ModerationTemplateType `json:"type"`
}

// ModerationTemplateUpdateRequest DTO for updating a template
type ModerationTemplateUpdateRequest struct {
	Name     string `json:"name"`
	Subject  string `json:"subject"`
	Body     string `json:"body"`
	IsActive *bool  `json:"isActive"`
}

// Available template variables:
// {{organizerName}} - Name of the organizer
// {{yatraTitle}} - Title of the yatra
// {{reason}} - Rejection/block reason
// {{reporterName}} - Name of the reporter
// {{adminNotes}} - Admin's notes
// {{date}} - Formatted date
