package models

import (
	"gorm.io/gorm"
)

type Media struct {
	gorm.Model
	UserID    uint   `json:"userId"`
	URL       string `json:"url"`
	IsProfile bool   `json:"isProfile" gorm:"default:false"`
}
