package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	KarmicName        string  `json:"karmicName"`
	SpiritualName     string  `json:"spiritualName"`
	Email             string  `json:"email" gorm:"unique"`
	Password          string  `json:"password"`
	Gender            string  `json:"gender"`
	Country           string  `json:"country"`
	City              string  `json:"city"`
	Identity          string  `json:"identity"`
	Diet              string  `json:"diet"`
	Madh              string  `json:"madh"`
	Mentor            string  `json:"mentor"`
	Dob               string  `json:"dob"`
	Bio               string  `json:"bio"`
	Interests         string  `json:"interests"`
	LookingFor        string  `json:"lookingFor"`
	MaritalStatus     string  `json:"maritalStatus"`
	BirthTime         string  `json:"birthTime"`
	BirthPlaceLink    string  `json:"birthPlaceLink"`
	DatingEnabled     bool    `json:"datingEnabled" gorm:"default:false"`
	IsProfileComplete bool    `json:"isProfileComplete" gorm:"default:false"`
	CurrentPlan       string  `json:"currentPlan" gorm:"default:'trial'"`
	Region            string  `json:"region" gorm:"default:'global'"`
	RagFileID         string  `json:"ragFileId"`
	AvatarURL         string  `json:"avatarUrl"`
	LastSeen          string  `json:"lastSeen"` // Using string for ISO format or time.Time
	Role              string  `json:"role" gorm:"default:'user'"`
	IsBlocked         bool    `json:"isBlocked" gorm:"default:false"`
	IsFlagged         bool    `json:"isFlagged" gorm:"default:false"`
	FlagReason        string  `json:"flagReason"`
	Photos            []Media `json:"photos" gorm:"foreignKey:UserID"`
}
