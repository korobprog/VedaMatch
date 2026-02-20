package models

import "time"

type YatraBillingEventStatus string

const (
	YatraBillingEventCharged            YatraBillingEventStatus = "charged"
	YatraBillingEventFailedInsufficient YatraBillingEventStatus = "failed_insufficient"
	YatraBillingEventSkippedStopped     YatraBillingEventStatus = "skipped_stopped"
	YatraBillingEventResumed            YatraBillingEventStatus = "resumed"
)

type YatraBillingEvent struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	YatraID     uint   `json:"yatraId" gorm:"not null;index"`
	OrganizerID uint   `json:"organizerId" gorm:"not null;index"`
	Yatra       *Yatra `json:"yatra,omitempty" gorm:"foreignKey:YatraID"`

	ChargeDateUTC time.Time               `json:"chargeDateUtc" gorm:"type:date;not null;index"`
	AmountLkm     int                     `json:"amountLkm" gorm:"not null"`
	Status        YatraBillingEventStatus `json:"status" gorm:"type:varchar(32);not null;index"`
	DedupKey      string                  `json:"dedupKey" gorm:"type:varchar(180);not null;uniqueIndex"`
	Reason        string                  `json:"reason" gorm:"type:varchar(255)"`
}
