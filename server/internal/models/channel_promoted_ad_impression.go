package models

import "time"

// ChannelPromotedAdImpression tracks promoted ad serves inside channels feed.
type ChannelPromotedAdImpression struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"createdAt" gorm:"index"`
	UserID    uint      `json:"userId" gorm:"not null;index"`
	AdID      uint      `json:"adId" gorm:"not null;index"`
	Placement string    `json:"placement" gorm:"type:varchar(40);not null;index"`
}

func (ChannelPromotedAdImpression) TableName() string {
	return "channel_promoted_ad_impressions"
}
