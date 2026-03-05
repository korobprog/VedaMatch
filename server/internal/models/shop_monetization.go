package models

import "time"

type ShopPlanCode string

type ShopSubscriptionStatus string

type ShopPromotionScope string

type ShopPromotionTariffCode string

type ShopPromotionStatus string

type ShopBillingEventType string

const (
	ShopPlanCodeBasic ShopPlanCode = "basic"
	ShopPlanCodePro   ShopPlanCode = "pro_shop"
	ShopPlanCodePlus  ShopPlanCode = "plus_shop"
)

const (
	ShopSubscriptionStatusActive    ShopSubscriptionStatus = "active"
	ShopSubscriptionStatusExpired   ShopSubscriptionStatus = "expired"
	ShopSubscriptionStatusCancelled ShopSubscriptionStatus = "cancelled"
)

const (
	ShopPromotionScopeProduct ShopPromotionScope = "product"
	ShopPromotionScopeCity    ShopPromotionScope = "shop_city"
)

const (
	ShopPromotionTariffCodeProduct24h ShopPromotionTariffCode = "product_24h"
	ShopPromotionTariffCodeProduct7d  ShopPromotionTariffCode = "product_7d"
	ShopPromotionTariffCodeProduct30d ShopPromotionTariffCode = "product_30d"
	ShopPromotionTariffCodeCity24h    ShopPromotionTariffCode = "shop_city_boost_24h"
)

const (
	ShopPromotionStatusActive  ShopPromotionStatus = "active"
	ShopPromotionStatusExpired ShopPromotionStatus = "expired"
)

const (
	ShopBillingEventSubscriptionPurchase ShopBillingEventType = "subscription_purchase"
	ShopBillingEventProductPromoPurchase ShopBillingEventType = "product_promo_purchase"
	ShopBillingEventGeoBoostPurchase     ShopBillingEventType = "geo_boost_purchase"
	ShopBillingEventOrderSettlementFee   ShopBillingEventType = "order_settlement_fee"
	ShopBillingEventOrderRefund          ShopBillingEventType = "order_refund"
)

type ShopPlanTariff struct {
	ID            uint         `json:"id" gorm:"primaryKey"`
	Code          ShopPlanCode `json:"code" gorm:"type:varchar(40);uniqueIndex;not null"`
	PriceLkm      int          `json:"priceLkm" gorm:"not null;default:0"`
	ProductsLimit int          `json:"productsLimit" gorm:"not null;default:0"` // 0 = unlimited
	PriorityRank  int          `json:"priorityRank" gorm:"not null;default:0"`
	PromoSlots    int          `json:"promoSlots" gorm:"not null;default:0"`
	IsActive      bool         `json:"isActive" gorm:"default:true;index"`
	UpdatedBy     *uint        `json:"updatedBy" gorm:"index"`
	CreatedAt     time.Time    `json:"createdAt"`
	UpdatedAt     time.Time    `json:"updatedAt"`
}

type ShopSubscription struct {
	ID         uint                   `json:"id" gorm:"primaryKey"`
	ShopID     uint                   `json:"shopId" gorm:"not null;index"`
	Shop       *Shop                  `json:"shop,omitempty" gorm:"foreignKey:ShopID"`
	OwnerID    uint                   `json:"ownerId" gorm:"not null;index"`
	Owner      *User                  `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`
	PlanCode   ShopPlanCode           `json:"planCode" gorm:"type:varchar(40);index;not null"`
	Status     ShopSubscriptionStatus `json:"status" gorm:"type:varchar(20);index;not null;default:'active'"`
	StartsAt   time.Time              `json:"startsAt" gorm:"index;not null"`
	EndsAt     time.Time              `json:"endsAt" gorm:"index;not null"`
	AutoRenew  bool                   `json:"autoRenew" gorm:"default:false"`
	ChargedLkm int                    `json:"chargedLkm" gorm:"not null;default:0"`
	DedupKey   string                 `json:"dedupKey" gorm:"type:varchar(160);uniqueIndex"`
	CreatedAt  time.Time              `json:"createdAt"`
	UpdatedAt  time.Time              `json:"updatedAt"`
}

type ShopPromotionTariff struct {
	ID              uint                    `json:"id" gorm:"primaryKey"`
	Code            ShopPromotionTariffCode `json:"code" gorm:"type:varchar(60);uniqueIndex;not null"`
	Scope           ShopPromotionScope      `json:"scope" gorm:"type:varchar(20);index;not null"`
	PriceLkm        int                     `json:"priceLkm" gorm:"not null;default:0"`
	DurationMinutes int                     `json:"durationMinutes" gorm:"not null;default:60"`
	IsActive        bool                    `json:"isActive" gorm:"default:true;index"`
	UpdatedBy       *uint                   `json:"updatedBy" gorm:"index"`
	CreatedAt       time.Time               `json:"createdAt"`
	UpdatedAt       time.Time               `json:"updatedAt"`
}

type ProductPromotion struct {
	ID            uint                    `json:"id" gorm:"primaryKey"`
	ProductID     uint                    `json:"productId" gorm:"not null;index"`
	Product       *Product                `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	ShopID        uint                    `json:"shopId" gorm:"not null;index"`
	Shop          *Shop                   `json:"shop,omitempty" gorm:"foreignKey:ShopID"`
	OwnerID       uint                    `json:"ownerId" gorm:"not null;index"`
	Owner         *User                   `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`
	Status        ShopPromotionStatus     `json:"status" gorm:"type:varchar(20);index;not null;default:'active'"`
	TariffCode    ShopPromotionTariffCode `json:"tariffCode" gorm:"type:varchar(60);index;not null"`
	StartsAt      time.Time               `json:"startsAt" gorm:"index;not null"`
	EndsAt        time.Time               `json:"endsAt" gorm:"index;not null"`
	ChargedLkm    int                     `json:"chargedLkm" gorm:"not null;default:0"`
	BalanceBefore int                     `json:"balanceBefore" gorm:"not null;default:0"`
	BalanceAfter  int                     `json:"balanceAfter" gorm:"not null;default:0"`
	DedupKey      string                  `json:"dedupKey" gorm:"type:varchar(160);uniqueIndex"`
	CreatedAt     time.Time               `json:"createdAt"`
	UpdatedAt     time.Time               `json:"updatedAt"`
}

type ShopGeoBoost struct {
	ID            uint                    `json:"id" gorm:"primaryKey"`
	ShopID        uint                    `json:"shopId" gorm:"not null;index"`
	Shop          *Shop                   `json:"shop,omitempty" gorm:"foreignKey:ShopID"`
	OwnerID       uint                    `json:"ownerId" gorm:"not null;index"`
	Owner         *User                   `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`
	City          string                  `json:"city" gorm:"type:varchar(120);index;not null"`
	Status        ShopPromotionStatus     `json:"status" gorm:"type:varchar(20);index;not null;default:'active'"`
	TariffCode    ShopPromotionTariffCode `json:"tariffCode" gorm:"type:varchar(60);index;not null"`
	StartsAt      time.Time               `json:"startsAt" gorm:"index;not null"`
	EndsAt        time.Time               `json:"endsAt" gorm:"index;not null"`
	ChargedLkm    int                     `json:"chargedLkm" gorm:"not null;default:0"`
	BalanceBefore int                     `json:"balanceBefore" gorm:"not null;default:0"`
	BalanceAfter  int                     `json:"balanceAfter" gorm:"not null;default:0"`
	DedupKey      string                  `json:"dedupKey" gorm:"type:varchar(160);uniqueIndex"`
	CreatedAt     time.Time               `json:"createdAt"`
	UpdatedAt     time.Time               `json:"updatedAt"`
}

type ShopBillingLog struct {
	ID             uint                 `json:"id" gorm:"primaryKey"`
	EventType      ShopBillingEventType `json:"eventType" gorm:"type:varchar(40);index;not null"`
	ShopID         uint                 `json:"shopId" gorm:"not null;index"`
	Shop           *Shop                `json:"shop,omitempty" gorm:"foreignKey:ShopID"`
	OrderID        *uint                `json:"orderId" gorm:"index"`
	Order          *Order               `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	ProductID      *uint                `json:"productId" gorm:"index"`
	Product        *Product             `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	AmountLkm      int                  `json:"amountLkm" gorm:"not null;default:0"`
	PlatformFeeLkm int                  `json:"platformFeeLkm" gorm:"not null;default:0"`
	MerchantNetLkm int                  `json:"merchantNetLkm" gorm:"not null;default:0"`
	DedupKey       string               `json:"dedupKey" gorm:"type:varchar(160);index"`
	MetaJSON       string               `json:"metaJson" gorm:"type:text"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
}

func (ShopPlanTariff) TableName() string      { return "shop_plan_tariffs" }
func (ShopSubscription) TableName() string    { return "shop_subscriptions" }
func (ShopPromotionTariff) TableName() string { return "shop_promotion_tariffs" }
func (ProductPromotion) TableName() string    { return "product_promotions" }
func (ShopGeoBoost) TableName() string        { return "shop_geo_boosts" }
func (ShopBillingLog) TableName() string      { return "shop_billing_logs" }
