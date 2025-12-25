package models

import (
	"gorm.io/gorm"
)

type SystemSetting struct {
	gorm.Model
	Key   string `json:"key" gorm:"uniqueIndex"`
	Value string `json:"value"`
}
