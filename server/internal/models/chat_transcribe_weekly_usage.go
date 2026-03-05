package models

import "time"

// ChatTranscribeWeeklyUsage stores per-user free transcription usage for one UTC ISO week.
type ChatTranscribeWeeklyUsage struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	UserID          uint      `json:"userId" gorm:"not null;index;uniqueIndex:idx_chat_transcribe_usage_user_week"`
	WeekKey         string    `json:"weekKey" gorm:"type:varchar(16);not null;index;uniqueIndex:idx_chat_transcribe_usage_user_week"`
	FreeMinutesUsed int       `json:"freeMinutesUsed" gorm:"not null;default:0"`
}

func (ChatTranscribeWeeklyUsage) TableName() string {
	return "chat_transcribe_weekly_usage"
}
