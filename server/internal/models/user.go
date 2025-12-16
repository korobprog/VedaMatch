package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	KarmicName    string    `json:"karmicName"`
	SpiritualName string    `json:"spiritualName"`
	Email         string    `json:"email" gorm:"unique"`
	Gender        string    `json:"gender"`
	Country       string    `json:"country"`
	City          string    `json:"city"`
	Identity      string    `json:"identity"`
	Diet          string    `json:"diet"`
	Madh          string    `json:"madh"`
	Mentor        string    `json:"mentor"`
	Dob           string    `json:"dob"` // Keep as string for now to match n8n JSON body, or parse to time.Time
	RagFileID     string    `json:"ragFileId"`
}
