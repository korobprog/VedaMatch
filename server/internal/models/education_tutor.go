package models

import (
	"time"
)

const (
	WeakTopicSourceExam = "exam"
	WeakTopicSourceLLM  = "llm"
)

// EducationWeakTopic stores long-term personalized weak topics for AI Tutor.
type EducationWeakTopic struct {
	ID           uint                   `json:"id" gorm:"primaryKey"`
	UserID       uint                   `json:"user_id" gorm:"not null;index:idx_weak_topic_user_key,unique"`
	TopicKey     string                 `json:"topic_key" gorm:"type:varchar(120);not null;index:idx_weak_topic_user_key,unique"`
	TopicLabel   string                 `json:"topic_label" gorm:"type:varchar(255);not null"`
	Mastery      float64                `json:"mastery" gorm:"type:decimal(5,4);not null;default:0"`
	Source       string                 `json:"source" gorm:"type:varchar(20);not null;default:'exam'"`
	LastSeenAt   time.Time              `json:"last_seen_at" gorm:"not null;index"`
	SignalsCount int                    `json:"signals_count" gorm:"not null;default:0"`
	Metadata     map[string]interface{} `json:"metadata" gorm:"type:jsonb;serializer:json"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}
