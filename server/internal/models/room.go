package models

import (
	"gorm.io/gorm"
)

type Room struct {
	gorm.Model
	Name        string `json:"name"`
	Description string `json:"description"`
	OwnerID     uint   `json:"ownerId"`
	IsPublic    bool   `json:"isPublic" gorm:"default:true"`
	ImageURL    string `json:"imageUrl"`
}

type RoomMember struct {
	gorm.Model
	RoomID uint   `json:"roomId" gorm:"index:idx_room_user,unique"`
	UserID uint   `json:"userId" gorm:"index:idx_room_user,unique"`
	Role   string `json:"role" gorm:"default:'member'"` // 'admin', 'member'
}
