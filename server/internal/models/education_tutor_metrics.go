package models

import "time"

const (
	EduTutorLatencyKindTurn      = "turn"
	EduTutorLatencyKindRetrieval = "retrieval"
)

// EducationTutorLatencyEvent stores latency samples for tutor observability.
type EducationTutorLatencyEvent struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null;default:0;index"`
	Kind         string    `json:"kind" gorm:"type:varchar(32);not null;index"`
	LatencyMs    int64     `json:"latency_ms" gorm:"not null;default:0;index"`
	SourcesCount int       `json:"sources_count" gorm:"not null;default:0"`
	Confidence   float64   `json:"confidence" gorm:"type:decimal(6,4);not null;default:0"`
	CreatedAt    time.Time `json:"created_at" gorm:"index"`
}
