package models

import "time"

const (
	PortalServiceModeVisible = "visible"
	PortalServiceModeBeta    = "beta"
	PortalServiceModeHidden  = "hidden"
)

type PortalServiceVisibility struct {
	ServiceID          string  `json:"serviceId" gorm:"primaryKey;size:80"`
	Mode               string  `json:"mode" gorm:"size:20;not null;default:'visible'"`
	TesterAllowlist    string  `json:"testerAllowlist" gorm:"type:text"`
	MaintenanceMessage *string `json:"maintenanceMessage,omitempty" gorm:"type:text"`
	UpdatedByUserID    *uint   `json:"updatedByUserId,omitempty" gorm:"index"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (PortalServiceVisibility) TableName() string {
	return "portal_service_visibility"
}
