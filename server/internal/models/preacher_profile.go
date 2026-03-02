package models

import (
	"time"

	"gorm.io/gorm"
)

type PreacherProfile struct {
	gorm.Model
	UserID           uint   `json:"userId" gorm:"not null;index"`
	DisplayName      string `json:"displayName" gorm:"type:varchar(180)"`
	Bio              string `json:"bio" gorm:"type:text"`
	BirthDate        *time.Time
	BirthPlace       string `json:"birthPlace" gorm:"type:varchar(220)"`
	DepartureDate    *time.Time
	OrganizationName string `json:"organizationName" gorm:"type:varchar(180)"`
	MathKey          string `json:"mathKey" gorm:"type:varchar(120);index"`

	Events []PreacherProfileEvent `json:"events,omitempty" gorm:"foreignKey:ProfileID"`
}

type PreacherProfileEvent struct {
	gorm.Model
	ProfileID   uint   `json:"profileId" gorm:"not null;index"`
	Title       string `json:"title" gorm:"type:varchar(180);not null"`
	EventDate   *time.Time
	Description string `json:"description" gorm:"type:text"`
	Position    int    `json:"position" gorm:"not null;default:0;index"`
}

type PreacherProfileEventDTO struct {
	ID          uint    `json:"id"`
	Title       string  `json:"title"`
	EventDate   *string `json:"eventDate,omitempty"`
	Description string  `json:"description,omitempty"`
	Position    int     `json:"position"`
}

type PreacherProfileDTO struct {
	UserID           uint                      `json:"userId"`
	Bio              string                    `json:"bio,omitempty"`
	BirthDate        *string                   `json:"birthDate,omitempty"`
	BirthPlace       string                    `json:"birthPlace,omitempty"`
	DepartureDate    *string                   `json:"departureDate,omitempty"`
	OrganizationName string                    `json:"organizationName,omitempty"`
	MathKey          string                    `json:"mathKey,omitempty"`
	Events           []PreacherProfileEventDTO `json:"events"`
}

type PreacherProfileEventUpsertRequest struct {
	Title       string  `json:"title"`
	EventDate   *string `json:"eventDate"`
	Description *string `json:"description"`
	Position    *int    `json:"position"`
}

type PreacherProfileUpsertRequest struct {
	Bio              *string                             `json:"bio"`
	BirthDate        *string                             `json:"birthDate"`
	BirthPlace       *string                             `json:"birthPlace"`
	DepartureDate    *string                             `json:"departureDate"`
	OrganizationName *string                             `json:"organizationName"`
	MathKey          *string                             `json:"mathKey"`
	Events           []PreacherProfileEventUpsertRequest `json:"events"`
}
