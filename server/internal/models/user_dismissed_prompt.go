package models

import "time"

// UserDismissedPrompt stores per-user dismiss state for educational/CTA prompts.
type UserDismissedPrompt struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	UserID      uint      `json:"userId" gorm:"not null;index:idx_user_prompt,unique"`
	PromptKey   string    `json:"promptKey" gorm:"type:varchar(120);not null;index:idx_user_prompt,unique"`
	PostID      *uint     `json:"postId" gorm:"index"`
	DismissedAt time.Time `json:"dismissedAt" gorm:"not null;index"`
}

func (UserDismissedPrompt) TableName() string {
	return "user_dismissed_prompts"
}
