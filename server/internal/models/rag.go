package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Document represents a document uploaded for RAG
type Document struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title     string         `gorm:"type:varchar(255);not null" json:"title"`
	FileName  string         `gorm:"type:varchar(255);not null" json:"file_name"`
	FilePath  string         `gorm:"type:text;not null" json:"file_path"`
	FileSize  int64          `gorm:"not null" json:"file_size"`
	MimeType  string         `gorm:"type:varchar(100);not null" json:"mime_type"`
	Content   string         `gorm:"type:text" json:"content"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User      *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Status    string         `gorm:"type:varchar(50);default:'processing'" json:"status"`
	Chunks    []Chunk        `gorm:"foreignKey:DocumentID" json:"chunks,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Chunk represents a text chunk from a document
type Chunk struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	DocumentID uuid.UUID      `gorm:"type:uuid;not null;index" json:"document_id"`
	Document   *Document      `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	Content    string         `gorm:"type:text;not null" json:"content"`
	Index      int            `gorm:"not null" json:"index"`
	Embedding  Float64Array   `gorm:"type:jsonb" json:"embedding,omitempty"`
	Metadata   ChunkMetadata  `gorm:"type:jsonb" json:"metadata"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// Float64Array handles arrays for embeddings
type Float64Array []float64

func (a Float64Array) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return json.Marshal(a)
}

func (a *Float64Array) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, a)
}

// ChunkMetadata stores additional metadata for chunks
type ChunkMetadata struct {
	PageNumber   int    `json:"page_number,omitempty"`
	SectionTitle string `json:"section_title,omitempty"`
	TokenCount   int    `json:"token_count,omitempty"`
}

// ChatSession represents a RAG chat session
type ChatSession struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User        *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	DocumentIDs StringArray    `gorm:"type:text[]" json:"document_ids"`
	Title       string         `gorm:"type:varchar(255)" json:"title"`
	Messages    []ChatMessage  `gorm:"foreignKey:SessionID" json:"messages,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ChatMessage represents a message in a RAG chat session
type ChatMessage struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SessionID uuid.UUID      `gorm:"type:uuid;not null;index" json:"session_id"`
	Session   *ChatSession   `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	Role      string         `gorm:"type:varchar(20);not null" json:"role"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	Chunks    []uuid.UUID    `gorm:"type:jsonb" json:"chunks,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// StringArray handles string arrays for Postgres
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return json.Marshal(a)
}

func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, a)
}
