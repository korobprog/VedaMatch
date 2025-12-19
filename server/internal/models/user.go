package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	KarmicName        string `json:"karmicName"`
	SpiritualName     string `json:"spiritualName"`
	Email             string `json:"email" gorm:"unique"`
	Password          string `json:"-"`
	Gender            string `json:"gender"`
	Country           string `json:"country"`
	City              string `json:"city"`
	Identity          string `json:"identity"`
	Diet              string `json:"diet"`
	Madh              string `json:"madh"`
	Mentor            string `json:"mentor"`
	Dob               string `json:"dob"`
	IsProfileComplete bool   `json:"isProfileComplete" gorm:"default:false"`
	CurrentPlan       string `json:"currentPlan" gorm:"default:'trial'"`
	Region            string `json:"region" gorm:"default:'global'"`
	RagFileID         string `json:"ragFileId"`
	AvatarURL         string `json:"avatarUrl"`
	LastSeen          string `json:"lastSeen"` // Using string for ISO format or time.Time
}
