package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	VisibilityScopePublic = "public"
	VisibilityScopeUser   = "user"
)

// AssistantDocument stores normalized domain knowledge for Domain Assistant hybrid RAG.
type AssistantDocument struct {
	ID              uuid.UUID              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Domain          string                 `gorm:"type:varchar(64);not null;index" json:"domain"`
	SourceType      string                 `gorm:"type:varchar(64);not null;index" json:"sourceType"`
	SourceID        string                 `gorm:"type:varchar(128);not null;index" json:"sourceId"`
	Title           string                 `gorm:"type:varchar(500);index" json:"title"`
	Content         string                 `gorm:"type:text;not null" json:"content"`
	SourceURL       string                 `gorm:"type:text" json:"sourceUrl"`
	Language        string                 `gorm:"type:varchar(10);not null;default:'ru';index" json:"language"`
	VisibilityScope string                 `gorm:"type:varchar(20);not null;default:'public';index" json:"visibilityScope"`
	UserID          uint                   `gorm:"not null;default:0;index" json:"userId"`
	Metadata        map[string]interface{} `gorm:"type:jsonb;serializer:json" json:"metadata"`
	Embedding       Float64Array           `gorm:"type:jsonb" json:"embedding,omitempty"`
	CreatedAt       time.Time              `json:"createdAt"`
	UpdatedAt       time.Time              `json:"updatedAt"`

	// Read-only generated column (created via SQL migration step).
	SearchVector string `gorm:"type:tsvector;->" json:"-"`
}

func (AssistantDocument) TableName() string {
	return "assistant_documents"
}

// DomainSyncState tracks last incremental sync time per domain.
type DomainSyncState struct {
	Domain       string    `gorm:"type:varchar(64);primaryKey" json:"domain"`
	LastSyncedAt time.Time `json:"lastSyncedAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (DomainSyncState) TableName() string {
	return "domain_sync_states"
}
