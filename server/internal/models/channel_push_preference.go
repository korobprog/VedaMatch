package models

import "gorm.io/gorm"

// ChannelSmartPushPreference stores Sadhu Sanga push filters per follower.
type ChannelSmartPushPreference struct {
	gorm.Model
	UserID        uint   `json:"userId" gorm:"not null;uniqueIndex"`
	User          User   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Enabled       bool   `json:"enabled" gorm:"default:true;index"`
	Reminder1h    bool   `json:"reminder1h" gorm:"column:reminder_1h;default:true"`
	Reminder10m   bool   `json:"reminder10m" gorm:"column:reminder_10m;default:true"`
	City          string `json:"city" gorm:"type:varchar(120)"`
	Language      string `json:"language" gorm:"type:varchar(16)"`
	TopicsJSON    string `json:"topicsJson" gorm:"type:text"`
	UseTimeWindow bool   `json:"useTimeWindow" gorm:"default:false"`
	StartHour     int    `json:"startHour" gorm:"default:8"`
	EndHour       int    `json:"endHour" gorm:"default:22"`
	Timezone      string `json:"timezone" gorm:"type:varchar(64)"`
}

type ChannelSmartPushPreferenceResponse struct {
	UserID        uint     `json:"userId"`
	Enabled       bool     `json:"enabled"`
	Reminder1h    bool     `json:"reminder1h"`
	Reminder10m   bool     `json:"reminder10m"`
	City          string   `json:"city"`
	Language      string   `json:"language"`
	Topics        []string `json:"topics"`
	UseTimeWindow bool     `json:"useTimeWindow"`
	StartHour     int      `json:"startHour"`
	EndHour       int      `json:"endHour"`
	Timezone      string   `json:"timezone"`
}

type ChannelSmartPushPreferenceUpsertRequest struct {
	Enabled       bool     `json:"enabled"`
	Reminder1h    bool     `json:"reminder1h"`
	Reminder10m   bool     `json:"reminder10m"`
	City          string   `json:"city"`
	Language      string   `json:"language"`
	Topics        []string `json:"topics"`
	UseTimeWindow bool     `json:"useTimeWindow"`
	StartHour     int      `json:"startHour"`
	EndHour       int      `json:"endHour"`
	Timezone      string   `json:"timezone"`
}

func (ChannelSmartPushPreference) TableName() string {
	return "channel_smart_push_preferences"
}
