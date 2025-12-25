package models

import "gorm.io/gorm"

type DatingCompatibility struct {
	gorm.Model
	UserID            uint   `json:"userId" gorm:"index:idx_user_candidate"`
	CandidateID       uint   `json:"candidateId" gorm:"index:idx_user_candidate"`
	CompatibilityText string `json:"compatibilityText"`
}
