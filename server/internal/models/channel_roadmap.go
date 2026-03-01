package models

import (
	"time"

	"gorm.io/gorm"
)

type ChannelRoadmapStatus string

const (
	ChannelRoadmapStatusPast    ChannelRoadmapStatus = "past"
	ChannelRoadmapStatusCurrent ChannelRoadmapStatus = "current"
	ChannelRoadmapStatusFuture  ChannelRoadmapStatus = "future"
)

type ChannelRoadmapPoint struct {
	gorm.Model
	ChannelID uint     `json:"channelId" gorm:"not null;index:idx_channel_roadmap_channel_status_position"`
	Channel   *Channel `json:"channel,omitempty" gorm:"foreignKey:ChannelID"`

	CreatedBy uint `json:"createdBy" gorm:"not null;index"`
	UpdatedBy uint `json:"updatedBy" gorm:"not null;index"`

	Title   string `json:"title" gorm:"type:varchar(180);not null"`
	City    string `json:"city" gorm:"type:varchar(120)"`
	Address string `json:"address" gorm:"type:varchar(500)"`

	Latitude  *float64 `json:"latitude" gorm:"type:decimal(10,8)"`
	Longitude *float64 `json:"longitude" gorm:"type:decimal(11,8)"`

	Status   ChannelRoadmapStatus `json:"status" gorm:"type:varchar(16);not null;default:'future';index:idx_channel_roadmap_channel_status_position"`
	EventAt  *time.Time           `json:"eventAt" gorm:"index:idx_channel_roadmap_channel_event"`
	Position int                  `json:"position" gorm:"not null;default:0;index:idx_channel_roadmap_channel_status_position"`
	Note     string               `json:"note" gorm:"type:text"`

	MapURL string `json:"mapUrl" gorm:"-"`
}

type ChannelRoadmapResponse struct {
	ChannelID uint                  `json:"channelId"`
	Current   *ChannelRoadmapPoint  `json:"current"`
	Past      []ChannelRoadmapPoint `json:"past"`
	Future    []ChannelRoadmapPoint `json:"future"`
	Total     int                   `json:"total"`
}

type ChannelRoadmapCreateRequest struct {
	Title     string               `json:"title"`
	City      string               `json:"city"`
	Address   string               `json:"address"`
	Latitude  *float64             `json:"latitude"`
	Longitude *float64             `json:"longitude"`
	Status    ChannelRoadmapStatus `json:"status"`
	EventAt   *time.Time           `json:"eventAt"`
	Position  *int                 `json:"position"`
	Note      string               `json:"note"`
}

type ChannelRoadmapUpdateRequest struct {
	Title     *string               `json:"title"`
	City      *string               `json:"city"`
	Address   *string               `json:"address"`
	Latitude  *float64              `json:"latitude"`
	Longitude *float64              `json:"longitude"`
	Status    *ChannelRoadmapStatus `json:"status"`
	EventAt   *time.Time            `json:"eventAt"`
	Position  *int                  `json:"position"`
	Note      *string               `json:"note"`
}

type ChannelRoadmapReorderRequest struct {
	OrderedIDs []uint `json:"orderedIds"`
}

func IsValidChannelRoadmapStatus(status ChannelRoadmapStatus) bool {
	switch status {
	case ChannelRoadmapStatusPast, ChannelRoadmapStatusCurrent, ChannelRoadmapStatusFuture:
		return true
	default:
		return false
	}
}
