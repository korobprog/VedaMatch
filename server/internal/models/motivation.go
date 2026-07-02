package models

import (
	"time"

	"gorm.io/gorm"
)

// MotivationPostStatus tracks the lifecycle of an AI-generated motivational post.
type MotivationPostStatus string

const (
	MotivationPostStatusDraft      MotivationPostStatus = "draft"
	MotivationPostStatusGenerating MotivationPostStatus = "generating"
	MotivationPostStatusReady      MotivationPostStatus = "ready"
	MotivationPostStatusPublished  MotivationPostStatus = "published"
	MotivationPostStatusFailed     MotivationPostStatus = "failed"
)

// MotivationPostSource records who/what created the generation task.
type MotivationPostSource string

const (
	MotivationPostSourceOperator MotivationPostSource = "operator"
	MotivationPostSourceTelegram MotivationPostSource = "telegram"
)

// MotivationPost is an AI-generated motivational post (image + text) for the
// motivation.vedamatch.ru site. The original text is generated in
// OriginalLanguage and auto-translated into the configured target languages,
// stored as MotivationPostTranslation rows.
type MotivationPost struct {
	gorm.Model
	CategoryID       *uint                `json:"categoryId" gorm:"index"`
	Category         *MotivationCategory  `json:"category,omitempty" gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	Theme            string               `json:"theme" gorm:"type:text;not null"`
	SourceLinks      string               `json:"sourceLinks" gorm:"type:text"` // newline-separated URLs supplied by the operator
	CharLimit        int                  `json:"charLimit" gorm:"default:0"`
	OriginalLanguage string               `json:"originalLanguage" gorm:"type:varchar(8);not null;default:'ru'"`
	ImageURL         string               `json:"imageUrl" gorm:"type:varchar(1024)"`
	ImagePrompt      string               `json:"imagePrompt" gorm:"type:text"`
	Status           MotivationPostStatus `json:"status" gorm:"type:varchar(20);index;default:'draft'"`
	Source           MotivationPostSource `json:"source" gorm:"type:varchar(20);index;default:'operator'"`
	CreatedByUserID  *uint                `json:"createdByUserId" gorm:"index"`
	TelegramChatID   int64                `json:"telegramChatId" gorm:"index"`
	Error            string               `json:"error" gorm:"type:text"`
	PublishedAt      *time.Time           `json:"publishedAt" gorm:"index"`

	Translations []MotivationPostTranslation `json:"translations,omitempty" gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE"`
}

// MotivationCategory groups motivational posts for admin organization and public filtering.
type MotivationCategory struct {
	gorm.Model
	Name        string `json:"name" gorm:"type:varchar(120);not null"`
	Slug        string `json:"slug" gorm:"type:varchar(140);not null;uniqueIndex"`
	Description string `json:"description" gorm:"type:text"`
	Color       string `json:"color" gorm:"type:varchar(32)"`
}

// MotivationPostTranslation holds the post text for one language.
type MotivationPostTranslation struct {
	gorm.Model
	PostID   uint   `json:"postId" gorm:"not null;index;uniqueIndex:idx_motivation_translation_post_lang"`
	Language string `json:"language" gorm:"type:varchar(8);not null;uniqueIndex:idx_motivation_translation_post_lang"`
	Title    string `json:"title" gorm:"type:text"`
	Text     string `json:"text" gorm:"type:text;not null"`
}

func (MotivationPost) TableName() string {
	return "motivation_posts"
}

func (MotivationCategory) TableName() string {
	return "motivation_categories"
}

func (MotivationPostTranslation) TableName() string {
	return "motivation_post_translations"
}
