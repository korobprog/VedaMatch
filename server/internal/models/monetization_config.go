package models

import "time"

type ProPlanConfig struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Code      string    `json:"code" gorm:"type:varchar(40);uniqueIndex;not null"`
	Days      int       `json:"days" gorm:"not null;default:30"`
	PriceLkm  int       `json:"priceLkm" gorm:"not null;default:0"`
	Title     string    `json:"title" gorm:"type:varchar(120);not null"`
	Badge     string    `json:"badge" gorm:"type:varchar(80)"`
	IsPopular bool      `json:"isPopular" gorm:"default:false"`
	IsEnabled bool      `json:"isEnabled" gorm:"default:true;index"`
	UpdatedBy *uint     `json:"updatedBy" gorm:"index"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ChatTranscribeBillingConfigModel struct {
	ID                      uint      `json:"id" gorm:"primaryKey"`
	SingletonKey            string    `json:"singletonKey" gorm:"type:varchar(32);uniqueIndex;not null"`
	IsEnabled               bool      `json:"isEnabled" gorm:"default:true"`
	FreeMinPerWeek          int       `json:"freeMinPerWeek" gorm:"not null;default:5"`
	PricePerMinLkm          int       `json:"pricePerMinLkm" gorm:"not null;default:3"`
	LongAudioThresholdMin   int       `json:"longAudioThresholdMin" gorm:"not null;default:5"`
	LongAudioPricePerMinLkm int       `json:"longAudioPricePerMinLkm" gorm:"not null;default:2"`
	MinChargeLkm            int       `json:"minChargeLkm" gorm:"not null;default:1"`
	UpdatedBy               *uint     `json:"updatedBy" gorm:"index"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

type YatraBillingConfigModel struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	SingletonKey string    `json:"singletonKey" gorm:"type:varchar(32);uniqueIndex;not null"`
	IsEnabled    bool      `json:"isEnabled" gorm:"default:false"`
	DailyFeeLkm  int       `json:"dailyFeeLkm" gorm:"not null;default:10"`
	UpdatedBy    *uint     `json:"updatedBy" gorm:"index"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type ServiceFeeConfigModel struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	SingletonKey   string    `json:"singletonKey" gorm:"type:varchar(32);uniqueIndex;not null"`
	IsEnabled      bool      `json:"isEnabled" gorm:"default:true"`
	PercentBps     int       `json:"percentBps" gorm:"not null;default:800"`
	CapLkm         int       `json:"capLkm" gorm:"not null;default:300"`
	ApplyNoShow    bool      `json:"applyNoShow" gorm:"default:true"`
	RolloutPercent int       `json:"rolloutPercent" gorm:"not null;default:100"`
	UpdatedBy      *uint     `json:"updatedBy" gorm:"index"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type MarketFeeConfigModel struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	SingletonKey   string     `json:"singletonKey" gorm:"type:varchar(32);uniqueIndex;not null"`
	IsEnabled      bool       `json:"isEnabled" gorm:"default:true"`
	PercentBps     int        `json:"percentBps" gorm:"not null;default:800"`
	CapLkm         int        `json:"capLkm" gorm:"not null;default:300"`
	EffectiveFrom  *time.Time `json:"effectiveFrom"`
	RolloutPercent int        `json:"rolloutPercent" gorm:"not null;default:100"`
	UpdatedBy      *uint      `json:"updatedBy" gorm:"index"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type CafeFeeConfigModel struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	SingletonKey   string     `json:"singletonKey" gorm:"type:varchar(32);uniqueIndex;not null"`
	IsEnabled      bool       `json:"isEnabled" gorm:"default:false"`
	PercentBps     int        `json:"percentBps" gorm:"not null;default:800"`
	CapLkm         int        `json:"capLkm" gorm:"not null;default:250"`
	MinOrderLkm    int        `json:"minOrderLkm" gorm:"not null;default:100"`
	EffectiveFrom  *time.Time `json:"effectiveFrom"`
	RolloutPercent int        `json:"rolloutPercent" gorm:"not null;default:0"`
	UpdatedBy      *uint      `json:"updatedBy" gorm:"index"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

func (ProPlanConfig) TableName() string                    { return "pro_plan_configs" }
func (ChatTranscribeBillingConfigModel) TableName() string { return "chat_transcribe_billing_configs" }
func (YatraBillingConfigModel) TableName() string          { return "yatra_billing_configs" }
func (ServiceFeeConfigModel) TableName() string            { return "service_fee_configs" }
func (MarketFeeConfigModel) TableName() string             { return "market_fee_configs" }
func (CafeFeeConfigModel) TableName() string               { return "cafe_fee_configs" }
