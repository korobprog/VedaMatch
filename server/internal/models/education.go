package models

import (
	"time"

	"gorm.io/gorm"
)

type EducationCourse struct {
	gorm.Model
	Title           string        `json:"title"`
	Description     string        `gorm:"type:text" json:"description"`
	Organization    string        `gorm:"index" json:"organization"` // e.g., "ISKCON", "Gaudiya Math"
	ImageURL        string        `json:"image_url"`
	IsPublished     bool          `gorm:"default:false" json:"is_published"`
	ScriptureBookID *uint         `json:"scripture_book_id"`
	ScriptureBook   *ScriptureBook `gorm:"foreignKey:ScriptureBookID" json:"scripture_book,omitempty"`
	Modules         []EducationModule `gorm:"foreignKey:CourseID" json:"modules,omitempty"`
}

type EducationModule struct {
	gorm.Model
	CourseID    uint            `gorm:"index" json:"course_id"`
	Title       string          `json:"title"`
	Description string          `gorm:"type:text" json:"description"`
	Order       int             `json:"order"`
	Questions   []ExamQuestion  `gorm:"foreignKey:ModuleID" json:"questions,omitempty"`
}

type ExamQuestion struct {
	gorm.Model
	ModuleID       uint           `gorm:"index" json:"module_id"`
	Text           string         `gorm:"type:text" json:"text"`
	Type           string         `gorm:"default:'multiple_choice'" json:"type"` // multiple_choice, boolean
	Organization   string         `gorm:"index" json:"organization"`             // To override course org if needed
	VerseReference string         `json:"verse_reference"`                       // Optional link to ScriptureVerse code
	Points         int            `gorm:"default:1" json:"points"`
	Options        []AnswerOption `gorm:"foreignKey:QuestionID" json:"options,omitempty"`
}

type AnswerOption struct {
	gorm.Model
	QuestionID  uint   `gorm:"index" json:"question_id"`
	Text        string `json:"text"`
	IsCorrect   bool   `json:"is_correct"`
	Explanation string `gorm:"type:text" json:"explanation"`
}

type UserExamAttempt struct {
	gorm.Model
	UserID      uint      `gorm:"index" json:"user_id"`
	User        User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ModuleID    uint      `gorm:"index" json:"module_id"`
	Module      EducationModule `gorm:"foreignKey:ModuleID" json:"module,omitempty"`
	Score       int       `json:"score"`
	TotalPoints int       `json:"total_points"`
	Passed      bool      `json:"passed"`
	CompletedAt time.Time `json:"completed_at"`
}

type UserModuleProgress struct {
	gorm.Model
	UserID          uint            `gorm:"index" json:"user_id"`
	ModuleID        uint            `gorm:"index" json:"module_id"`
	Status          string          `gorm:"default:'not_started'" json:"status"` // not_started, in_progress, completed
	ProgressPercent int             `gorm:"default:0" json:"progress_percent"`
	LastAccessedAt  time.Time       `json:"last_accessed_at"`
}
