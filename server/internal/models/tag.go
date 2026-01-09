package models

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name string `json:"name" gorm:"uniqueIndex"`
	Type string `json:"type"` // skill, interest, seva
}

type UserTag struct {
	gorm.Model
	UserID uint `json:"userId" gorm:"uniqueIndex:idx_user_tag"`
	TagID  uint `json:"tagId" gorm:"uniqueIndex:idx_user_tag"`
}
