package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== SERVICE TARIFF (ТАРИФ) ====================

// ServiceTariff represents a pricing tier for a service
type ServiceTariff struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Parent service
	ServiceID uint     `json:"serviceId" gorm:"not null;index"`
	Service   *Service `json:"service,omitempty" gorm:"foreignKey:ServiceID"`

	// Tariff info
	Name               string `json:"name" gorm:"type:varchar(100);not null"`
	Price              int    `json:"price" gorm:"not null"`                          // In Лакшми (game currency)
	Currency           string `json:"currency" gorm:"type:varchar(10);default:'LKS'"` // LKS = Лакшми
	MaxBonusLkmPercent int    `json:"maxBonusLkmPercent" gorm:"default:0"`            // 0..100% can be paid with bonus LKM

	// Session details
	DurationMinutes int `json:"durationMinutes"`                // Duration of one session
	SessionsCount   int `json:"sessionsCount" gorm:"default:1"` // Number of sessions included
	ValidityDays    int `json:"validityDays"`                   // Validity period (for subscriptions)

	// What's included (JSON array of strings)
	// Example: ["Личная консультация", "Запись сессии", "Поддержка 7 дней"]
	Includes string `json:"includes" gorm:"type:text"`

	// Flags
	IsDefault bool `json:"isDefault" gorm:"default:false"` // Default tariff for this service
	IsActive  bool `json:"isActive" gorm:"default:true"`   // Available for purchase

	// Display order
	SortOrder int `json:"sortOrder" gorm:"default:0"`
}

// ==================== DTOs ====================

// TariffCreateRequest for creating a new tariff
type TariffCreateRequest struct {
	Name               string `json:"name" binding:"required,min=1,max=100"`
	Price              int    `json:"price" binding:"required,min=0"`
	Currency           string `json:"currency"`
	MaxBonusLkmPercent int    `json:"maxBonusLkmPercent"`
	DurationMinutes    int    `json:"durationMinutes"`
	SessionsCount      int    `json:"sessionsCount"`
	ValidityDays       int    `json:"validityDays"`
	Includes           string `json:"includes"` // JSON array
	IsDefault          bool   `json:"isDefault"`
	SortOrder          int    `json:"sortOrder"`
}

// TariffUpdateRequest for updating a tariff
type TariffUpdateRequest struct {
	Name               *string `json:"name"`
	Price              *int    `json:"price"`
	Currency           *string `json:"currency"`
	MaxBonusLkmPercent *int    `json:"maxBonusLkmPercent"`
	DurationMinutes    *int    `json:"durationMinutes"`
	SessionsCount      *int    `json:"sessionsCount"`
	ValidityDays       *int    `json:"validityDays"`
	Includes           *string `json:"includes"`
	IsDefault          *bool   `json:"isDefault"`
	IsActive           *bool   `json:"isActive"`
	SortOrder          *int    `json:"sortOrder"`
}
