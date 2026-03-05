package models

import "time"

const (
	ChatTranscribeJobStatusPending   = "pending"
	ChatTranscribeJobStatusCompleted = "completed"
	ChatTranscribeJobStatusFailed    = "failed"
)

// ChatTranscribeJob tracks billing/idempotency state for message transcription requests.
type ChatTranscribeJob struct {
	ID                 uint       `json:"id" gorm:"primaryKey"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	MessageID          uint       `json:"messageId" gorm:"not null;uniqueIndex"`
	RequestedByUserID  uint       `json:"requestedByUserId" gorm:"not null;index"`
	Status             string     `json:"status" gorm:"type:varchar(24);not null;index;default:'pending'"`
	AudioMinutes       int        `json:"audioMinutes" gorm:"not null;default:1"`
	FreeMinutesUsed    int        `json:"freeMinutesUsed" gorm:"not null;default:0"`
	PaidMinutes        int        `json:"paidMinutes" gorm:"not null;default:0"`
	ChargedLkm         int        `json:"chargedLkm" gorm:"not null;default:0"`
	PricePerMinuteLkm  int        `json:"pricePerMinuteLkm" gorm:"not null;default:0"`
	TariffType         string     `json:"tariffType" gorm:"type:varchar(24);not null;default:'free'"`
	WeekKey            string     `json:"weekKey" gorm:"type:varchar(16);not null;default:''"`
	ChargeDedupKey     string     `json:"chargeDedupKey" gorm:"type:varchar(120);not null;default:''"`
	RefundDedupKey     string     `json:"refundDedupKey" gorm:"type:varchar(120);not null;default:''"`
	LastError          string     `json:"lastError" gorm:"type:text;not null;default:''"`
	TranscriptCachedAt *time.Time `json:"transcriptCachedAt,omitempty"`
}

func (ChatTranscribeJob) TableName() string {
	return "chat_transcribe_job"
}
