package models

import (
	"time"

	"gorm.io/gorm"
)

// YatraReportTargetType represents what the report is about
type YatraReportTargetType string

const (
	ReportTargetYatra     YatraReportTargetType = "yatra"
	ReportTargetOrganizer YatraReportTargetType = "organizer"
)

// YatraReportReason represents common report reasons
type YatraReportReason string

const (
	ReportReasonInappropriate    YatraReportReason = "inappropriate"
	ReportReasonScam             YatraReportReason = "scam"
	ReportReasonCancelledLastMin YatraReportReason = "cancelled_last_minute"
	ReportReasonMisleadingInfo   YatraReportReason = "misleading_info"
	ReportReasonPoorOrganization YatraReportReason = "poor_organization"
	ReportReasonSafetyViolation  YatraReportReason = "safety_violation"
	ReportReasonOther            YatraReportReason = "other"
)

// YatraReportStatus represents the status of a report
type YatraReportStatus string

const (
	ReportStatusPending   YatraReportStatus = "pending"
	ReportStatusReviewing YatraReportStatus = "reviewing"
	ReportStatusResolved  YatraReportStatus = "resolved"
	ReportStatusDismissed YatraReportStatus = "dismissed"
)

// YatraReport represents a user report about a yatra or organizer
type YatraReport struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Reporter
	ReporterUserID uint  `json:"reporterUserId" gorm:"not null;index"`
	Reporter       *User `json:"reporter,omitempty" gorm:"foreignKey:ReporterUserID"`

	// Target
	TargetType YatraReportTargetType `json:"targetType" gorm:"type:varchar(20);not null;index"`
	TargetID   uint                  `json:"targetId" gorm:"not null;index"`

	// Report details
	Reason      YatraReportReason `json:"reason" gorm:"type:varchar(50);not null"`
	Description string            `json:"description" gorm:"type:text"`

	// Moderation
	Status     YatraReportStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`
	AdminNotes string            `json:"adminNotes" gorm:"type:text"` // Admin's response

	// Resolution
	ResolvedBy *uint      `json:"resolvedBy" gorm:"index"`
	Resolver   *User      `json:"resolver,omitempty" gorm:"foreignKey:ResolvedBy"`
	ResolvedAt *time.Time `json:"resolvedAt"`
}

// YatraReportCreateRequest DTO for creating a report
type YatraReportCreateRequest struct {
	TargetType  YatraReportTargetType `json:"targetType" binding:"required"`
	TargetID    uint                  `json:"targetId" binding:"required"`
	Reason      YatraReportReason     `json:"reason" binding:"required"`
	Description string                `json:"description"`
}

// YatraReportFilters for filtering reports
type YatraReportFilters struct {
	Status     YatraReportStatus     `json:"status"`
	TargetType YatraReportTargetType `json:"targetType"`
	TargetID   *uint                 `json:"targetId"`
	ReporterID *uint                 `json:"reporterId"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
}

// YatraReportUpdateRequest for admin updating a report
type YatraReportUpdateRequest struct {
	Status     YatraReportStatus `json:"status"`
	AdminNotes string            `json:"adminNotes"`
}
