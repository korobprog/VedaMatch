package models

import (
	"encoding/json"
	"strings"
	"time"

	"gorm.io/gorm"
)

type AdminPushCampaignStatus string

const (
	AdminPushCampaignStatusDraft         AdminPushCampaignStatus = "draft"
	AdminPushCampaignStatusScheduled     AdminPushCampaignStatus = "scheduled"
	AdminPushCampaignStatusProcessing    AdminPushCampaignStatus = "processing"
	AdminPushCampaignStatusSent          AdminPushCampaignStatus = "sent"
	AdminPushCampaignStatusPartialFailed AdminPushCampaignStatus = "partial_failed"
	AdminPushCampaignStatusFailed        AdminPushCampaignStatus = "failed"
	AdminPushCampaignStatusCancelled     AdminPushCampaignStatus = "cancelled"
)

type AdminPushCampaignTargetMode string

const (
	AdminPushCampaignTargetUser    AdminPushCampaignTargetMode = "user"
	AdminPushCampaignTargetSegment AdminPushCampaignTargetMode = "segment"
)

type AdminPushCampaignSendMode string

const (
	AdminPushCampaignSendNow       AdminPushCampaignSendMode = "now"
	AdminPushCampaignSendScheduled AdminPushCampaignSendMode = "scheduled"
)

type AdminPushCampaignRecipientStatus string

const (
	AdminPushCampaignRecipientPending   AdminPushCampaignRecipientStatus = "pending"
	AdminPushCampaignRecipientSent      AdminPushCampaignRecipientStatus = "sent"
	AdminPushCampaignRecipientFailed    AdminPushCampaignRecipientStatus = "failed"
	AdminPushCampaignRecipientSkipped   AdminPushCampaignRecipientStatus = "skipped"
	AdminPushCampaignRecipientCancelled AdminPushCampaignRecipientStatus = "cancelled"
)

type AdminPushSegmentFilters struct {
	Role         string `json:"role,omitempty"`
	Status       string `json:"status,omitempty"`
	HasPushToken bool   `json:"hasPushToken,omitempty"`
}

type AdminPushCampaign struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CreatedBy uint   `gorm:"not null;index" json:"createdBy"`
	Title     string `gorm:"type:varchar(160);not null" json:"title"`
	Body      string `gorm:"type:text;not null" json:"body"`
	Priority  string `gorm:"type:varchar(16);not null;default:'high'" json:"priority"`

	DataJSON           string `gorm:"type:text" json:"dataJson"`
	TargetMode         string `gorm:"type:varchar(16);not null;index" json:"targetMode"`
	TargetUserID       *uint  `gorm:"index" json:"targetUserId,omitempty"`
	SegmentFiltersJSON string `gorm:"type:text" json:"segmentFiltersJson"`
	SendMode           string `gorm:"type:varchar(16);not null" json:"sendMode"`
	Status             string `gorm:"type:varchar(32);not null;index" json:"status"`

	ScheduledFor *time.Time `gorm:"index" json:"scheduledFor,omitempty"`
	StartedAt    *time.Time `json:"startedAt,omitempty"`
	FinishedAt   *time.Time `json:"finishedAt,omitempty"`
	CancelledAt  *time.Time `json:"cancelledAt,omitempty"`

	TotalRecipients int    `gorm:"not null;default:0" json:"totalRecipients"`
	SentCount       int    `gorm:"not null;default:0" json:"sentCount"`
	FailedCount     int    `gorm:"not null;default:0" json:"failedCount"`
	SkippedCount    int    `gorm:"not null;default:0" json:"skippedCount"`
	LastError       string `gorm:"type:text" json:"lastError,omitempty"`

	Data           map[string]string       `gorm:"-" json:"data,omitempty"`
	SegmentFilters AdminPushSegmentFilters `gorm:"-" json:"segmentFilters,omitempty"`
}

type AdminPushCampaignRecipient struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CampaignID uint       `gorm:"not null;index:idx_admin_push_campaign_recipient,priority:1" json:"campaignId"`
	UserID     uint       `gorm:"not null;index:idx_admin_push_campaign_recipient,priority:2;index" json:"userId"`
	Status     string     `gorm:"type:varchar(24);not null;default:'pending';index" json:"status"`
	Attempts   int        `gorm:"not null;default:0" json:"attempts"`
	Error      string     `gorm:"type:text" json:"error,omitempty"`
	SentAt     *time.Time `json:"sentAt,omitempty"`
}

type AdminPushCampaignCreateRequest struct {
	SendMode       string                  `json:"sendMode"`
	ScheduledFor   *time.Time              `json:"scheduledFor,omitempty"`
	Title          string                  `json:"title"`
	Body           string                  `json:"body"`
	Priority       string                  `json:"priority"`
	Data           map[string]string       `json:"data,omitempty"`
	TargetMode     string                  `json:"targetMode"`
	TargetUserID   *uint                   `json:"targetUserId,omitempty"`
	SegmentFilters AdminPushSegmentFilters `json:"segmentFilters,omitempty"`
}

func NormalizeAdminPushCampaignStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(AdminPushCampaignStatusDraft):
		return string(AdminPushCampaignStatusDraft)
	case string(AdminPushCampaignStatusScheduled):
		return string(AdminPushCampaignStatusScheduled)
	case string(AdminPushCampaignStatusProcessing):
		return string(AdminPushCampaignStatusProcessing)
	case string(AdminPushCampaignStatusSent):
		return string(AdminPushCampaignStatusSent)
	case string(AdminPushCampaignStatusPartialFailed):
		return string(AdminPushCampaignStatusPartialFailed)
	case string(AdminPushCampaignStatusFailed):
		return string(AdminPushCampaignStatusFailed)
	case string(AdminPushCampaignStatusCancelled):
		return string(AdminPushCampaignStatusCancelled)
	default:
		return ""
	}
}

func NormalizeAdminPushCampaignTargetMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(AdminPushCampaignTargetUser):
		return string(AdminPushCampaignTargetUser)
	case string(AdminPushCampaignTargetSegment):
		return string(AdminPushCampaignTargetSegment)
	default:
		return ""
	}
}

func NormalizeAdminPushCampaignSendMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(AdminPushCampaignSendNow):
		return string(AdminPushCampaignSendNow)
	case string(AdminPushCampaignSendScheduled):
		return string(AdminPushCampaignSendScheduled)
	default:
		return ""
	}
}

func NormalizeAdminPushRecipientStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(AdminPushCampaignRecipientPending):
		return string(AdminPushCampaignRecipientPending)
	case string(AdminPushCampaignRecipientSent):
		return string(AdminPushCampaignRecipientSent)
	case string(AdminPushCampaignRecipientFailed):
		return string(AdminPushCampaignRecipientFailed)
	case string(AdminPushCampaignRecipientSkipped):
		return string(AdminPushCampaignRecipientSkipped)
	case string(AdminPushCampaignRecipientCancelled):
		return string(AdminPushCampaignRecipientCancelled)
	default:
		return ""
	}
}

func (c *AdminPushCampaign) DataMap() map[string]string {
	if strings.TrimSpace(c.DataJSON) == "" {
		return map[string]string{}
	}
	var result map[string]string
	if err := json.Unmarshal([]byte(c.DataJSON), &result); err != nil || result == nil {
		return map[string]string{}
	}
	return result
}

func (c *AdminPushCampaign) ParsedSegmentFilters() AdminPushSegmentFilters {
	if strings.TrimSpace(c.SegmentFiltersJSON) == "" {
		return AdminPushSegmentFilters{}
	}
	var filters AdminPushSegmentFilters
	if err := json.Unmarshal([]byte(c.SegmentFiltersJSON), &filters); err != nil {
		return AdminPushSegmentFilters{}
	}
	return filters
}

func (c *AdminPushCampaign) SyncDerivedFields() {
	c.Data = c.DataMap()
	c.SegmentFilters = c.ParsedSegmentFilters()
}

func SyncAdminPushCampaignDerivedFields(items []AdminPushCampaign) {
	for i := range items {
		items[i].SyncDerivedFields()
	}
}
