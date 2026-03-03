package models

import "time"

type CallDirection string

const (
	CallDirectionIncoming CallDirection = "incoming"
	CallDirectionOutgoing CallDirection = "outgoing"
)

type CallQualityFeedback struct {
	ID uint `gorm:"primarykey" json:"id"`

	CallSessionID string `json:"callSessionId" gorm:"type:varchar(128);not null;index;uniqueIndex:ux_call_feedback_rater_session"`
	RaterUserID   uint   `json:"raterUserId" gorm:"not null;index;uniqueIndex:ux_call_feedback_rater_session"`
	PeerUserID    uint   `json:"peerUserId" gorm:"not null;index"`

	Direction   CallDirection `json:"direction" gorm:"type:varchar(16);not null;default:'outgoing';index"`
	StartedAt   *time.Time    `json:"startedAt,omitempty"`
	EndedAt     *time.Time    `json:"endedAt,omitempty"`
	DurationSec int           `json:"durationSec" gorm:"default:0"`
	Rating      int           `json:"rating" gorm:"not null;index"`
	Reasons     []string      `json:"reasons" gorm:"type:jsonb;serializer:json"`
	Comment     string        `json:"comment,omitempty" gorm:"type:varchar(500)"`

	Platform    string `json:"platform,omitempty" gorm:"type:varchar(32);index"`
	NetworkType string `json:"networkType,omitempty" gorm:"type:varchar(64)"`
	AppVersion  string `json:"appVersion,omitempty" gorm:"type:varchar(64)"`
	DeviceModel string `json:"deviceModel,omitempty" gorm:"type:varchar(128)"`

	SupportTransferAmount int        `json:"supportTransferAmount" gorm:"default:0"`
	SupportTransferAt     *time.Time `json:"supportTransferAt,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
