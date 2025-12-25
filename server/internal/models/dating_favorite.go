package models

import "gorm.io/gorm"

type DatingFavorite struct {
	gorm.Model
	UserID             uint   `json:"userId"`
	CandidateID        uint   `json:"candidateId"`
	Candidate          User   `json:"candidate" gorm:"foreignKey:CandidateID"`
	CompatibilityScore string `json:"compatibilityScore"` // Stores the AI report
}
