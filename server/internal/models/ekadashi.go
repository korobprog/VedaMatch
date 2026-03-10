package models

import "gorm.io/gorm"

type EkadashiOrganization struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Source      string `json:"source"`
	SourceURL   string `json:"sourceUrl"`
}

type EkadashiDay struct {
	EventID           string                    `json:"eventId"`
	Date              string                    `json:"date"`
	OrganizationID    string                    `json:"organizationId"`
	OrganizationName  string                    `json:"organizationName"`
	OrganizationScope string                    `json:"organizationScope,omitempty"`
	PersonSlug        string                    `json:"personSlug,omitempty"`
	ObservanceType    string                    `json:"observanceType,omitempty"`
	Timezone          string                    `json:"timezone"`
	City              string                    `json:"city"`
	Country           string                    `json:"country"`
	EventType         string                    `json:"eventType"`
	Priority          int                       `json:"priority"`
	MarkerStyleKey    string                    `json:"markerStyleKey,omitempty"`
	IsEkadashi        bool                      `json:"isEkadashi"`
	IsMahadvadashi    bool                      `json:"isMahadvadashi"`
	FastStartAt       *string                   `json:"fastStartAt"`
	FastEndAt         *string                   `json:"fastEndAt"`
	ParanaStartAt     *string                   `json:"paranaStartAt"`
	ParanaEndAt       *string                   `json:"paranaEndAt"`
	Title             string                    `json:"title"`
	Subtitle          string                    `json:"subtitle"`
	Notes             string                    `json:"notes"`
	DisplayTitle      string                    `json:"displayTitle"`
	DisplaySubtitle   string                    `json:"displaySubtitle"`
	ObservanceNotes   string                    `json:"observanceNotes"`
	Source            string                    `json:"source"`
	SourceURL         string                    `json:"sourceUrl"`
	ProviderDecision  *EkadashiProviderDecision `json:"providerDecision,omitempty"`
}

type EkadashiProviderDecision struct {
	Mode   string `json:"mode"`
	Source string `json:"source"`
	Reason string `json:"reason,omitempty"`
}

type EkadashiCalendarResponse struct {
	Month            string                   `json:"month"`
	Organization     EkadashiOrganization     `json:"organization"`
	Timezone         string                   `json:"timezone"`
	City             string                   `json:"city"`
	Country          string                   `json:"country"`
	Days             []EkadashiDay            `json:"days"`
	Events           []EkadashiDay            `json:"events"`
	Accuracy         string                   `json:"accuracy"`
	GeneratedFrom    string                   `json:"generatedFrom"`
	ProviderDecision EkadashiProviderDecision `json:"providerDecision"`
}

type EkadashiPushPreference struct {
	gorm.Model
	UserID            uint   `json:"userId" gorm:"not null;uniqueIndex"`
	User              User   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Enabled           bool   `json:"enabled" gorm:"default:true;index"`
	FastStartReminder bool   `json:"fastStartReminder" gorm:"default:true"`
	ParanaReminder    bool   `json:"paranaReminder" gorm:"default:true"`
	OrganizationID    string `json:"organizationId" gorm:"type:varchar(64);default:'iskcon'"`
	City              string `json:"city" gorm:"type:varchar(120)"`
	Country           string `json:"country" gorm:"type:varchar(120)"`
	Timezone          string `json:"timezone" gorm:"type:varchar(64)"`
	UseQuietHours     bool   `json:"useQuietHours" gorm:"default:false"`
	QuietStartHour    int    `json:"quietStartHour" gorm:"default:22"`
	QuietEndHour      int    `json:"quietEndHour" gorm:"default:8"`
}

type EkadashiPushPreferenceResponse struct {
	UserID            uint   `json:"userId"`
	Enabled           bool   `json:"enabled"`
	FastStartReminder bool   `json:"fastStartReminder"`
	ParanaReminder    bool   `json:"paranaReminder"`
	OrganizationID    string `json:"organizationId"`
	City              string `json:"city"`
	Country           string `json:"country"`
	Timezone          string `json:"timezone"`
	UseQuietHours     bool   `json:"useQuietHours"`
	QuietStartHour    int    `json:"quietStartHour"`
	QuietEndHour      int    `json:"quietEndHour"`
}

type EkadashiPushPreferenceUpsertRequest struct {
	Enabled           bool   `json:"enabled"`
	FastStartReminder bool   `json:"fastStartReminder"`
	ParanaReminder    bool   `json:"paranaReminder"`
	OrganizationID    string `json:"organizationId"`
	City              string `json:"city"`
	Country           string `json:"country"`
	Timezone          string `json:"timezone"`
	UseQuietHours     bool   `json:"useQuietHours"`
	QuietStartHour    int    `json:"quietStartHour"`
	QuietEndHour      int    `json:"quietEndHour"`
}

func (EkadashiPushPreference) TableName() string {
	return "ekadashi_push_preferences"
}

type EkadashiReminderDelivery struct {
	gorm.Model
	UserID         uint   `json:"userId" gorm:"not null;uniqueIndex:idx_ekadashi_reminder_delivery,priority:1;index"`
	ReminderType   string `json:"reminderType" gorm:"type:varchar(32);not null;uniqueIndex:idx_ekadashi_reminder_delivery,priority:2;index"`
	EventDate      string `json:"eventDate" gorm:"type:char(10);not null;uniqueIndex:idx_ekadashi_reminder_delivery,priority:3;index"`
	OrganizationID string `json:"organizationId" gorm:"type:varchar(64);not null;uniqueIndex:idx_ekadashi_reminder_delivery,priority:4"`
	DeliveredAt    string `json:"deliveredAt" gorm:"type:varchar(40);not null"`
}

func (EkadashiReminderDelivery) TableName() string {
	return "ekadashi_reminder_deliveries"
}
