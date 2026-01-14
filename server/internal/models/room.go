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
	AiEnabled   bool   `json:"aiEnabled" gorm:"default:false"`
	ImageURL    string `json:"imageUrl"`

	// New fields for Joint Reading
	StartTime        string `json:"startTime"` // Stored as ISO string or you can use time.Time
	Location         string `json:"location"`  // City, Country, Yatra
	Language         string `json:"language"`
	BookCode         string `json:"bookCode"` // e.g. "bg", "sb"
	CurrentChapter   int    `json:"currentChapter" gorm:"default:1"`
	CurrentVerse     int    `json:"currentVerse" gorm:"default:1"`
	ActiveReaderID   uint   `json:"activeReaderId" gorm:"default:0"`
	ShowPurport      bool   `json:"showPurport" gorm:"default:false"`
	NotificationSent bool   `json:"notificationSent" gorm:"default:false"`
}

type RoomMember struct {
	gorm.Model
	RoomID uint   `json:"roomId" gorm:"index:idx_room_user,unique"`
	UserID uint   `json:"userId" gorm:"index:idx_room_user,unique"`
	Role   string `json:"role" gorm:"default:'member'"` // 'admin', 'member'
}
