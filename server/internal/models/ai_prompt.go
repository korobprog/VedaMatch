package models

import "gorm.io/gorm"

// PromptScope defines the scope/category of a prompt
type PromptScope string

const (
	ScopeGlobal     PromptScope = "global"     // Applies to all users
	ScopeSampradaya PromptScope = "sampradaya" // Based on user's sampradaya (madh field)
	ScopeIdentity   PromptScope = "identity"   // Based on user's identity (Vaishnava, Shaiva, etc.)
	ScopeDiet       PromptScope = "diet"       // Based on user's diet
	ScopeGuna       PromptScope = "guna"       // Based on user's guna
	ScopeYogaStyle  PromptScope = "yogaStyle"  // Based on user's yoga style
)

// AIPrompt represents a configurable AI prompt managed by admins
type AIPrompt struct {
	gorm.Model
	Name        string      `json:"name" gorm:"not null;size:255"`         // Prompt name for admin identification
	Content     string      `json:"content" gorm:"type:text;not null"`     // The actual prompt text
	Scope       PromptScope `json:"scope" gorm:"size:50;default:'global'"` // Scope of application
	ScopeValue  string      `json:"scopeValue" gorm:"size:100"`            // Value to match (e.g., "Gaudiya" for sampradaya)
	Priority    int         `json:"priority" gorm:"default:0"`             // Higher priority = applied first
	IsActive    bool        `json:"isActive" gorm:"default:true"`          // Whether the prompt is active
	Description string      `json:"description" gorm:"type:text"`          // Description for admin reference
}

// TableName specifies the table name for AIPrompt
func (AIPrompt) TableName() string {
	return "ai_prompts"
}

// GetScopeOptions returns available scope options for the admin UI
func GetScopeOptions() []map[string]string {
	return []map[string]string{
		{"value": "global", "label": "Глобальный (для всех)"},
		{"value": "sampradaya", "label": "Сампрадая"},
		{"value": "identity", "label": "Идентичность"},
		{"value": "diet", "label": "Диета"},
		{"value": "guna", "label": "Гуна"},
		{"value": "yogaStyle", "label": "Стиль йоги"},
	}
}

// GetSampradayaOptions returns available sampradaya values
func GetSampradayaOptions() []string {
	return []string{
		"Gaudiya",
		"ISKCON",
		"Madhva",
		"Ramanuja",
		"Nimbarka",
		"Vallabha",
		"Shaiva",
		"Shakta",
		"Other",
	}
}
