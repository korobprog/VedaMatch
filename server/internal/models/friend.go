package models

import (
	"gorm.io/gorm"
)

type Friend struct {
	gorm.Model
	UserID   uint `json:"userId" gorm:"uniqueIndex:idx_user_friend"`
	FriendID uint `json:"friendId" gorm:"uniqueIndex:idx_user_friend"`
}
