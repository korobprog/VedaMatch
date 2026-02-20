package models

import (
	"time"

	"gorm.io/gorm"
)

type LKMRegion string

const (
	LKMRegionCIS    LKMRegion = "cis"
	LKMRegionNonCIS LKMRegion = "non_cis"
)

type LKMRiskAction string

const (
	LKMRiskActionAuto     LKMRiskAction = "auto"
	LKMRiskActionEnhanced LKMRiskAction = "enhanced"
	LKMRiskActionManual   LKMRiskAction = "manual"
)

type LKMTopupStatus string

const (
	LKMTopupStatusPendingPayment LKMTopupStatus = "pending_payment"
	LKMTopupStatusPaid           LKMTopupStatus = "paid"
	LKMTopupStatusManualReview   LKMTopupStatus = "manual_review"
	LKMTopupStatusCredited       LKMTopupStatus = "credited"
	LKMTopupStatusRejected       LKMTopupStatus = "rejected"
)

type LKMTopupGlobalConfig struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	SingletonKey     string  `gorm:"type:varchar(24);not null;uniqueIndex" json:"singletonKey"`
	NominalRubPerLKM float64 `gorm:"not null;default:1" json:"nominalRubPerLkm"`
}

type LKMPaymentGateway struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Code      string `gorm:"type:varchar(64);not null;uniqueIndex" json:"code"`
	Name      string `gorm:"type:varchar(128);not null" json:"name"`
	IsEnabled bool   `gorm:"default:true;index" json:"isEnabled"`
}

type LKMRegionConfig struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Region        LKMRegion `gorm:"type:varchar(24);not null;uniqueIndex" json:"region"`
	CustomMinLKM  int       `gorm:"not null;default:199" json:"customMinLkm"`
	CustomMaxLKM  int       `gorm:"not null;default:450000" json:"customMaxLkm"`
	CustomStepLKM int       `gorm:"not null;default:50" json:"customStepLkm"`
}

type LKMPackageConfig struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Region    LKMRegion `gorm:"type:varchar(24);not null;uniqueIndex:ux_lkm_package_region_amount" json:"region"`
	LKMAmount int       `gorm:"not null;uniqueIndex:ux_lkm_package_region_amount" json:"lkmAmount"`
	SortOrder int       `gorm:"not null;default:0" json:"sortOrder"`
	IsActive  bool      `gorm:"default:true;index" json:"isActive"`
}

type LKMPaymentProcessingCost struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	GatewayCode   string    `gorm:"type:varchar(64);not null;index;uniqueIndex:ux_lkm_cost_gateway_method_region" json:"gatewayCode"`
	PaymentMethod string    `gorm:"type:varchar(64);not null;default:'default';uniqueIndex:ux_lkm_cost_gateway_method_region" json:"paymentMethod"`
	Region        LKMRegion `gorm:"type:varchar(24);not null;index;uniqueIndex:ux_lkm_cost_gateway_method_region" json:"region"`
	Percent       float64   `gorm:"not null;default:0" json:"percent"`
	FixedRub      float64   `gorm:"not null;default:0" json:"fixedRub"`
	IsEnabled     bool      `gorm:"default:true;index" json:"isEnabled"`
}

type LKMManualFXRate struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Currency      string  `gorm:"type:varchar(12);not null;uniqueIndex" json:"currency"`
	RubPerUnit    float64 `gorm:"not null" json:"rubPerUnit"`
	IsActive      bool    `gorm:"default:true;index" json:"isActive"`
	LastUpdatedBy *uint   `gorm:"index" json:"lastUpdatedBy,omitempty"`
}

type LKMTopupRiskTier struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name      string        `gorm:"type:varchar(64);not null;uniqueIndex" json:"name"`
	Action    LKMRiskAction `gorm:"type:varchar(24);not null;index" json:"action"`
	MinLKM    int           `gorm:"not null" json:"minLkm"`
	MaxLKM    int           `gorm:"not null" json:"maxLkm"`
	SortOrder int           `gorm:"not null;default:0" json:"sortOrder"`
	IsEnabled bool          `gorm:"default:true;index" json:"isEnabled"`
}

type LKMQuote struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	QuoteID string `gorm:"type:varchar(80);not null;uniqueIndex" json:"quoteId"`
	UserID  uint   `gorm:"not null;index" json:"userId"`

	GatewayCode   string    `gorm:"type:varchar(64);not null;index" json:"gatewayCode"`
	PaymentMethod string    `gorm:"type:varchar(64);not null;default:'default'" json:"paymentMethod"`
	Region        LKMRegion `gorm:"type:varchar(24);not null;index" json:"region"`
	PayCurrency   string    `gorm:"type:varchar(12);not null" json:"payCurrency"`

	ReceiveLKM           int        `gorm:"not null" json:"receiveLkm"`
	NominalRub           float64    `gorm:"not null" json:"nominalRub"`
	ProcessingCostRub    float64    `gorm:"not null" json:"processingCostRub"`
	TotalRub             float64    `gorm:"not null" json:"totalRub"`
	TotalPayAmount       float64    `gorm:"not null" json:"totalPayAmount"`
	FXRateRubPerCurrency float64    `gorm:"not null" json:"fxRateRubPerCurrency"`
	ExpiresAt            time.Time  `gorm:"index;not null" json:"expiresAt"`
	UsedAt               *time.Time `gorm:"index" json:"usedAt,omitempty"`
}

type LKMTopup struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	TopupID    string `gorm:"type:varchar(80);not null;uniqueIndex" json:"topupId"`
	UserID     uint   `gorm:"not null;index" json:"userId"`
	QuoteRefID uint   `gorm:"not null;index" json:"quoteRefId"`
	QuoteID    string `gorm:"type:varchar(80);not null;index" json:"quoteId"`

	GatewayCode   string    `gorm:"type:varchar(64);not null;index" json:"gatewayCode"`
	PaymentMethod string    `gorm:"type:varchar(64);not null;default:'default'" json:"paymentMethod"`
	Region        LKMRegion `gorm:"type:varchar(24);not null;index" json:"region"`
	PayCurrency   string    `gorm:"type:varchar(12);not null" json:"payCurrency"`

	ReceiveLKM           int     `gorm:"not null" json:"receiveLkm"`
	NominalRub           float64 `gorm:"not null" json:"nominalRub"`
	ProcessingCostRub    float64 `gorm:"not null" json:"processingCostRub"`
	TotalRub             float64 `gorm:"not null" json:"totalRub"`
	TotalPayAmount       float64 `gorm:"not null" json:"totalPayAmount"`
	FXRateRubPerCurrency float64 `gorm:"not null" json:"fxRateRubPerCurrency"`

	Channel           string         `gorm:"type:varchar(24);not null;default:'web';index" json:"channel"`
	DeviceFingerprint string         `gorm:"type:varchar(200)" json:"deviceFingerprint"`
	Status            LKMTopupStatus `gorm:"type:varchar(32);not null;index" json:"status"`
	RiskAction        LKMRiskAction  `gorm:"type:varchar(24);not null;index" json:"riskAction"`
	RiskReason        string         `gorm:"type:varchar(300)" json:"riskReason"`

	ExternalPaymentID string     `gorm:"type:varchar(128);index" json:"externalPaymentId"`
	PaidAt            *time.Time `gorm:"index" json:"paidAt,omitempty"`
	CreditedAt        *time.Time `gorm:"index" json:"creditedAt,omitempty"`

	ReviewedByID *uint      `gorm:"index" json:"reviewedById,omitempty"`
	ReviewedAt   *time.Time `gorm:"index" json:"reviewedAt,omitempty"`
	ReviewNote   string     `gorm:"type:varchar(500)" json:"reviewNote"`
}

type LKMTopupWebhookEvent struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	GatewayCode string     `gorm:"type:varchar(64);not null;index;uniqueIndex:ux_lkm_webhook_gateway_event" json:"gatewayCode"`
	EventID     string     `gorm:"type:varchar(120);not null;uniqueIndex:ux_lkm_webhook_gateway_event" json:"eventId"`
	TopupID     string     `gorm:"type:varchar(80);not null;index" json:"topupId"`
	Status      string     `gorm:"type:varchar(40);not null;index" json:"status"`
	PayloadJSON string     `gorm:"type:text" json:"payloadJson"`
	ProcessedAt *time.Time `gorm:"index" json:"processedAt,omitempty"`
}
