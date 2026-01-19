package models

import (
	"time"

	"gorm.io/gorm"
)

// SubscriptionTier represents user subscription level
type SubscriptionTier string

const (
	TierFree    SubscriptionTier = "free"
	TierBasic   SubscriptionTier = "basic"
	TierPremium SubscriptionTier = "premium"
	TierAdmin   SubscriptionTier = "admin"
)

// UserSubscription represents user's subscription status
type UserSubscription struct {
	gorm.Model
	UserID       uint             `json:"userId" gorm:"uniqueIndex"`
	Tier         SubscriptionTier `json:"tier" gorm:"default:'free'"`
	ExpiresAt    *time.Time       `json:"expiresAt"`                     // nil = never expires (for admin)
	ModelsAccess string           `json:"modelsAccess" gorm:"type:text"` // JSON array of allowed model IDs, empty = all for tier
	MaxTokens    int              `json:"maxTokens" gorm:"default:0"`    // 0 = unlimited
	UsedTokens   int              `json:"usedTokens" gorm:"default:0"`   // tokens used this period
	ResetAt      *time.Time       `json:"resetAt"`                       // when token counter resets
	Features     string           `json:"features" gorm:"type:text"`     // JSON array of feature flags
}

// SubscriptionPlan represents available subscription plans
type SubscriptionPlan struct {
	gorm.Model
	Name          string  `json:"name"`
	Tier          string  `json:"tier" gorm:"uniqueIndex"`
	Description   string  `json:"description"`
	PriceMonthly  float64 `json:"priceMonthly"`  // in RUB
	PriceYearly   float64 `json:"priceYearly"`   // in RUB
	MaxTokens     int     `json:"maxTokens"`     // per month, 0 = unlimited
	ModelsAllowed string  `json:"modelsAllowed"` // JSON array or "all"
	Features      string  `json:"features"`      // JSON array of features
	IsActive      bool    `json:"isActive" gorm:"default:true"`
}

// HasAccess checks if user has access to a specific model
func (s *UserSubscription) HasAccess(modelID string) bool {
	// Admin has full access
	if s.Tier == TierAdmin {
		return true
	}

	// Check if subscription is expired
	if s.ExpiresAt != nil && s.ExpiresAt.Before(time.Now()) {
		return false
	}

	// If no specific models restriction, allow based on tier
	if s.ModelsAccess == "" || s.ModelsAccess == "[]" {
		return true // all models allowed for this tier
	}

	// TODO: Parse ModelsAccess JSON and check if modelID is in list
	return true
}

// IsExpired checks if subscription has expired
func (s *UserSubscription) IsExpired() bool {
	if s.Tier == TierAdmin {
		return false // Admin never expires
	}
	if s.ExpiresAt == nil {
		return false
	}
	return s.ExpiresAt.Before(time.Now())
}

// CanUseTokens checks if user can use more tokens
func (s *UserSubscription) CanUseTokens(needed int) bool {
	if s.Tier == TierAdmin {
		return true
	}
	if s.MaxTokens == 0 {
		return true // unlimited
	}
	return s.UsedTokens+needed <= s.MaxTokens
}
