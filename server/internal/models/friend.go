package models

import (
	"gorm.io/gorm"
)

type Friend struct {
	gorm.Model
	UserID   uint `json:"userId" gorm:"index"`
	FriendID uint `json:"friendId" gorm:"index"`
}
