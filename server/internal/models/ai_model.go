package models

import (
	"time"

	"gorm.io/gorm"
)

type AiModel struct {
	gorm.Model
	ModelID              string    `json:"id" gorm:"uniqueIndex"`
	Name                 string    `json:"name"`
	Provider             string    `json:"provider"`
	Category             string    `json:"category"` // text, image, audio, video
	IsEnabled            bool      `json:"isEnabled" gorm:"default:true"`
	IsNew                bool      `json:"isNew" gorm:"default:true"`
	LastSyncDate         time.Time `json:"lastSyncDate"`
	LastTestStatus       string    `json:"lastTestStatus"`   // online, offline, error
	LastResponseTime     int64     `json:"lastResponseTime"` // ms
	IsRecommended        bool      `json:"isRecommended" gorm:"default:false"`
	IsRagEnabled         bool      `json:"isRagEnabled" gorm:"default:false"`
	LatencyTier          string    `json:"latencyTier" gorm:"default:'medium'"`        // fast, medium, slow
	IntelligenceTier     string    `json:"intelligenceTier" gorm:"default:'standard'"` // smart, standard, fast
	IsAutoRoutingEnabled bool      `json:"isAutoRoutingEnabled" gorm:"default:false"`
}
