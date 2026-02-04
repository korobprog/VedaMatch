package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== SERVICE SCHEDULE (РАСПИСАНИЕ) ====================

// ServiceSchedule represents a time slot when the service is available
type ServiceSchedule struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Parent service
	ServiceID uint     `json:"serviceId" gorm:"not null;index"`
	Service   *Service `json:"service,omitempty" gorm:"foreignKey:ServiceID"`

	// For weekly recurring slots
	DayOfWeek *int   `json:"dayOfWeek"`                        // 0=Sunday, 1=Monday, ... 6=Saturday
	TimeStart string `json:"timeStart" gorm:"type:varchar(5)"` // Format: "HH:MM" (e.g., "09:00")
	TimeEnd   string `json:"timeEnd" gorm:"type:varchar(5)"`   // Format: "HH:MM" (e.g., "17:00")

	// For specific date slots
	SpecificDate *time.Time `json:"specificDate" gorm:"type:date"`

	// For group services: max participants per slot
	MaxParticipants int `json:"maxParticipants" gorm:"default:1"`

	// Slot duration in minutes (overrides tariff duration)
	SlotDuration int `json:"slotDuration" gorm:"default:60"`

	// Buffer time between slots (minutes)
	BufferMinutes int `json:"bufferMinutes" gorm:"default:0"`

	// Active flag
	IsActive bool `json:"isActive" gorm:"default:true"`

	// Timezone (for proper slot calculation)
	Timezone string `json:"timezone" gorm:"type:varchar(50);default:'Europe/Moscow'"`
}

// ==================== DTOs ====================

// ScheduleCreateRequest for creating a new schedule slot
type ScheduleCreateRequest struct {
	DayOfWeek       *int   `json:"dayOfWeek"` // For weekly
	TimeStart       string `json:"timeStart" binding:"required"`
	TimeEnd         string `json:"timeEnd" binding:"required"`
	SpecificDate    string `json:"specificDate"` // ISO format for specific date
	MaxParticipants int    `json:"maxParticipants"`
	SlotDuration    int    `json:"slotDuration"`
	BufferMinutes   int    `json:"bufferMinutes"`
	Timezone        string `json:"timezone"`
}

// ScheduleUpdateRequest for updating a schedule
type ScheduleUpdateRequest struct {
	DayOfWeek       *int    `json:"dayOfWeek"`
	TimeStart       *string `json:"timeStart"`
	TimeEnd         *string `json:"timeEnd"`
	SpecificDate    *string `json:"specificDate"`
	MaxParticipants *int    `json:"maxParticipants"`
	SlotDuration    *int    `json:"slotDuration"`
	BufferMinutes   *int    `json:"bufferMinutes"`
	IsActive        *bool   `json:"isActive"`
	Timezone        *string `json:"timezone"`
}

// AvailableSlot represents a single available time slot for booking
type AvailableSlot struct {
	StartTime      time.Time `json:"startTime"`
	EndTime        time.Time `json:"endTime"`
	SpotsAvailable int       `json:"spotsAvailable"` // For group services
	ScheduleID     uint      `json:"scheduleId"`     // Reference to the schedule
}

// SlotsRequest for getting available slots
type SlotsRequest struct {
	Date     string `json:"date"`     // ISO format: "2026-02-04"
	DateFrom string `json:"dateFrom"` // For range queries
	DateTo   string `json:"dateTo"`   // For range queries
	Timezone string `json:"timezone"` // Client timezone
}

// SlotsResponse for available slots
type SlotsResponse struct {
	ServiceID uint            `json:"serviceId"`
	Date      string          `json:"date"`
	Slots     []AvailableSlot `json:"slots"`
}

// WeeklyScheduleResponse returns aggregated weekly configuration
type WeeklyScheduleResponse struct {
	WeeklySlots       map[string]WeeklyDayConfig `json:"weeklySlots"` // key is day number "1", "2"...
	SlotDuration      int                        `json:"slotDuration"`
	BreakBetween      int                        `json:"breakBetween"`
	MaxBookingsPerDay int                        `json:"maxBookingsPerDay"`
}

type WeeklyDayConfig struct {
	Enabled bool       `json:"enabled"`
	Slots   []TimeSlot `json:"slots"`
}

type TimeSlot struct {
	StartTime string `json:"startTime"` // "09:00"
	EndTime   string `json:"endTime"`   // "10:00"
}

// WeeklyScheduleRequest for updating weekly schedule
type WeeklyScheduleRequest struct {
	WeeklySlots       map[string]WeeklyDayConfig `json:"weeklySlots"`
	BreakBetween      *int                       `json:"breakBetween"`
	MaxBookingsPerDay *int                       `json:"maxBookingsPerDay"`
}
