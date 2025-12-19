package models

import (
	"gorm.io/gorm"
)

type Block struct {
	gorm.Model
	UserID    uint `json:"userId" gorm:"index"`
	BlockedID uint `json:"blockedId" gorm:"index"`
}
