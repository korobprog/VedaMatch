package models

import (
	"time"

	"gorm.io/gorm"
)

type VideoCircleStatus string

type VideoCircleInteractionType string

type VideoTariffCode string

type VideoBoostType string

const (
	VideoCircleStatusActive  VideoCircleStatus = "active"
	VideoCircleStatusExpired VideoCircleStatus = "expired"
	VideoCircleStatusDeleted VideoCircleStatus = "deleted"
)

const (
	VideoCircleInteractionLike    VideoCircleInteractionType = "like"
	VideoCircleInteractionComment VideoCircleInteractionType = "comment"
	VideoCircleInteractionChat    VideoCircleInteractionType = "chat"
)

const (
	VideoTariffCodeLKMBoost     VideoTariffCode = "lkm_boost"
	VideoTariffCodeCityBoost    VideoTariffCode = "city_boost"
	VideoTariffCodePremiumBoost VideoTariffCode = "premium_boost"
)

const (
	VideoBoostTypeLKM     VideoBoostType = "lkm"
	VideoBoostTypeCity    VideoBoostType = "city"
	VideoBoostTypePremium VideoBoostType = "premium"
)

type VideoCircle struct {
	gorm.Model
	AuthorID           uint              `json:"authorId" gorm:"index;not null"`
	Author             *User             `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
	MediaURL           string            `json:"mediaUrl" gorm:"type:varchar(800);not null"`
	ThumbnailURL       string            `json:"thumbnailUrl" gorm:"type:varchar(800)"`
	City               string            `json:"city" gorm:"type:varchar(120);index"`
	Matha              string            `json:"matha" gorm:"type:varchar(120);index"`
	Category           string            `json:"category" gorm:"type:varchar(120);index"`
	Status             VideoCircleStatus `json:"status" gorm:"type:varchar(20);index;default:'active'"`
	DurationSec        int               `json:"durationSec" gorm:"default:60"`
	ExpiresAt          time.Time         `json:"expiresAt" gorm:"index"`
	PremiumBoostActive bool              `json:"premiumBoostActive" gorm:"default:false"`
	LikeCount          int               `json:"likeCount" gorm:"default:0"`
	CommentCount       int               `json:"commentCount" gorm:"default:0"`
	ChatCount          int               `json:"chatCount" gorm:"default:0"`
}

type VideoCircleInteraction struct {
	ID        uint                       `json:"id" gorm:"primaryKey"`
	CircleID  uint                       `json:"circleId" gorm:"index;not null"`
	Circle    *VideoCircle               `json:"circle,omitempty" gorm:"foreignKey:CircleID"`
	UserID    uint                       `json:"userId" gorm:"index;not null"`
	User      *User                      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Type      VideoCircleInteractionType `json:"type" gorm:"type:varchar(20);index;not null"`
	Value     int                        `json:"value" gorm:"default:1"`
	CreatedAt time.Time                  `json:"createdAt"`
	UpdatedAt time.Time                  `json:"updatedAt"`
}

type VideoTariff struct {
	gorm.Model
	Code            VideoTariffCode `json:"code" gorm:"type:varchar(40);uniqueIndex;not null"`
	PriceLkm        int             `json:"priceLkm" gorm:"not null;default:0"`
	DurationMinutes int             `json:"durationMinutes" gorm:"not null;default:60"`
	IsActive        bool            `json:"isActive" gorm:"default:true;index"`
	UpdatedBy       *uint           `json:"updatedBy" gorm:"index"`
}

type VideoCircleBillingLog struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	CircleID      uint           `json:"circleId" gorm:"index;not null"`
	Circle        *VideoCircle   `json:"circle,omitempty" gorm:"foreignKey:CircleID"`
	UserID        uint           `json:"userId" gorm:"index;not null"`
	User          *User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	BoostType     VideoBoostType `json:"boostType" gorm:"type:varchar(20);index;not null"`
	TariffID      uint           `json:"tariffId" gorm:"index;not null"`
	Tariff        *VideoTariff   `json:"tariff,omitempty" gorm:"foreignKey:TariffID"`
	ChargedLkm    int            `json:"chargedLkm" gorm:"not null;default:0"`
	BypassReason  string         `json:"bypassReason" gorm:"type:varchar(120)"`
	BalanceBefore int            `json:"balanceBefore" gorm:"not null;default:0"`
	BalanceAfter  int            `json:"balanceAfter" gorm:"not null;default:0"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type VideoCircleListParams struct {
	City     string
	Matha    string
	Category string
	Status   string
	Sort     string
	Page     int
	Limit    int
}

type VideoCircleResponse struct {
	ID                 uint              `json:"id"`
	AuthorID           uint              `json:"authorId"`
	MediaURL           string            `json:"mediaUrl"`
	ThumbnailURL       string            `json:"thumbnailUrl"`
	City               string            `json:"city"`
	Matha              string            `json:"matha"`
	Category           string            `json:"category"`
	Status             VideoCircleStatus `json:"status"`
	DurationSec        int               `json:"durationSec"`
	ExpiresAt          time.Time         `json:"expiresAt"`
	RemainingSec       int               `json:"remainingSec"`
	PremiumBoostActive bool              `json:"premiumBoostActive"`
	LikeCount          int               `json:"likeCount"`
	CommentCount       int               `json:"commentCount"`
	ChatCount          int               `json:"chatCount"`
	CreatedAt          time.Time         `json:"createdAt"`
}

type VideoCircleListResponse struct {
	Circles    []VideoCircleResponse `json:"circles"`
	Total      int64                 `json:"total"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
	TotalPages int                   `json:"totalPages"`
}

type VideoCircleInteractionRequest struct {
	Type   VideoCircleInteractionType `json:"type"`
	Action string                     `json:"action"`
}

type VideoCircleInteractionResponse struct {
	CircleID     uint `json:"circleId"`
	LikeCount    int  `json:"likeCount"`
	CommentCount int  `json:"commentCount"`
	ChatCount    int  `json:"chatCount"`
	LikedByUser  bool `json:"likedByUser"`
}

type VideoBoostRequest struct {
	BoostType VideoBoostType `json:"boostType"`
}

type VideoBoostResponse struct {
	CircleID           uint      `json:"circleId"`
	BoostType          string    `json:"boostType"`
	ChargedLkm         int       `json:"chargedLkm"`
	BypassReason       string    `json:"bypassReason,omitempty"`
	ExpiresAt          time.Time `json:"expiresAt"`
	RemainingSec       int       `json:"remainingSec"`
	PremiumBoostActive bool      `json:"premiumBoostActive"`
	BalanceBefore      int       `json:"balanceBefore"`
	BalanceAfter       int       `json:"balanceAfter"`
}

type VideoTariffUpsertRequest struct {
	Code            VideoTariffCode `json:"code"`
	PriceLkm        int             `json:"priceLkm"`
	DurationMinutes int             `json:"durationMinutes"`
	IsActive        *bool           `json:"isActive"`
}

func (VideoCircle) TableName() string            { return "video_circles" }
func (VideoCircleInteraction) TableName() string { return "video_circle_interactions" }
func (VideoTariff) TableName() string            { return "video_tariffs" }
func (VideoCircleBillingLog) TableName() string  { return "video_circle_billing_logs" }
