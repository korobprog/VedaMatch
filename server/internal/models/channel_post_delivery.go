package models

import "time"

type ChannelPostDeliveryType string

type ChannelPostDeliveryStatus string

const (
	ChannelPostDeliveryTypePush ChannelPostDeliveryType = "push"
	ChannelPostDeliveryTypeDM   ChannelPostDeliveryType = "dm"
)

const (
	ChannelPostDeliveryStatusPending ChannelPostDeliveryStatus = "pending"
	ChannelPostDeliveryStatusSuccess ChannelPostDeliveryStatus = "success"
	ChannelPostDeliveryStatusFailed  ChannelPostDeliveryStatus = "failed"
)

// ChannelPostDelivery stores idempotent personal fanout status for each post/user/type.
type ChannelPostDelivery struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	PostID uint         `json:"postId" gorm:"not null;index:idx_channel_post_delivery_unique,unique"`
	Post   *ChannelPost `json:"post,omitempty" gorm:"foreignKey:PostID"`

	UserID uint  `json:"userId" gorm:"not null;index:idx_channel_post_delivery_unique,unique"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	DeliveryType ChannelPostDeliveryType   `json:"deliveryType" gorm:"type:varchar(10);not null;index:idx_channel_post_delivery_unique,unique"`
	DeliveredAt  *time.Time                `json:"deliveredAt"`
	Status       ChannelPostDeliveryStatus `json:"status" gorm:"type:varchar(20);not null;default:'pending';index"`
}

func (ChannelPostDelivery) TableName() string {
	return "channel_post_deliveries"
}
