package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== SERVICE BOOKING (БРОНИРОВАНИЕ) ====================

// BookingStatus represents the status of a booking
type BookingStatus string

const (
	BookingStatusPending   BookingStatus = "pending"   // Waiting for confirmation
	BookingStatusConfirmed BookingStatus = "confirmed" // Confirmed by provider
	BookingStatusCancelled BookingStatus = "cancelled" // Cancelled
	BookingStatusCompleted BookingStatus = "completed" // Session completed
	BookingStatusNoShow    BookingStatus = "no_show"   // Client didn't show up
)

// ServiceBooking represents a client's booking for a service
type ServiceBooking struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Service and tariff
	ServiceID uint           `json:"serviceId" gorm:"not null;index"`
	Service   *Service       `json:"service,omitempty" gorm:"foreignKey:ServiceID"`
	TariffID  uint           `json:"tariffId" gorm:"not null;index"`
	Tariff    *ServiceTariff `json:"tariff,omitempty" gorm:"foreignKey:TariffID"`

	// Client (who booked)
	ClientID uint  `json:"clientId" gorm:"not null;index"`
	Client   *User `json:"client,omitempty" gorm:"foreignKey:ClientID"`

	// Schedule reference (optional, for recurring)
	ScheduleID *uint            `json:"scheduleId" gorm:"index"`
	Schedule   *ServiceSchedule `json:"schedule,omitempty" gorm:"foreignKey:ScheduleID"`

	// Timing
	ScheduledAt     time.Time `json:"scheduledAt" gorm:"not null;index"`
	DurationMinutes int       `json:"durationMinutes" gorm:"not null"`
	EndAt           time.Time `json:"endAt" gorm:"not null"`

	// Status
	Status BookingStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`

	// Payment (game currency)
	TransactionID  *uint `json:"transactionId" gorm:"index"`
	PricePaid      int   `json:"pricePaid" gorm:"default:0"`      // Total amount paid in Лакшми
	RegularLkmHeld int   `json:"regularLkmHeld" gorm:"default:0"` // Frozen regular LKM
	BonusLkmHeld   int   `json:"bonusLkmHeld" gorm:"default:0"`   // Frozen bonus LKM

	// Notes
	ClientNote   string `json:"clientNote" gorm:"type:text"`   // Message from client
	ProviderNote string `json:"providerNote" gorm:"type:text"` // Private notes from provider

	// Attribution (optional analytics source)
	Source          string `json:"source" gorm:"type:varchar(80);index"`
	SourcePostID    *uint  `json:"sourcePostId" gorm:"index"`
	SourceChannelID *uint  `json:"sourceChannelId" gorm:"index"`

	// Reminders tracking
	ReminderSent    bool `json:"reminderSent" gorm:"default:false"`                             // 1-hour reminder
	Reminder24hSent bool `json:"reminder24hSent" gorm:"column:reminder_24h_sent;default:false"` // 24-hour reminder

	// Moderation timestamps
	ConfirmedAt *time.Time `json:"confirmedAt"`
	CancelledAt *time.Time `json:"cancelledAt"`
	CompletedAt *time.Time `json:"completedAt"`
	CancelledBy *uint      `json:"cancelledBy"` // UserID who cancelled

	// Meeting link (generated when confirmed)
	MeetingLink string `json:"meetingLink" gorm:"type:varchar(500)"`

	// Chat room (auto-created when confirmed)
	ChatRoomID *uint `json:"chatRoomId" gorm:"index"`
	ChatRoom   *Room `json:"chatRoom,omitempty" gorm:"foreignKey:ChatRoomID"`
}

// ==================== DTOs ====================

// BookingCreateRequest for creating a new booking
type BookingCreateRequest struct {
	TariffID        uint      `json:"tariffId" binding:"required"`
	ScheduledAt     time.Time `json:"scheduledAt" binding:"required"`
	ClientNote      string    `json:"clientNote"`
	Source          string    `json:"source"`
	SourcePostID    *uint     `json:"sourcePostId"`
	SourceChannelID *uint     `json:"sourceChannelId"`
}

// BookingActionRequest for confirm/cancel/complete actions
type BookingActionRequest struct {
	Note   string `json:"note"`   // Optional note
	Reason string `json:"reason"` // For cancellation
}

// BookingFilters for searching bookings
type BookingFilters struct {
	ServiceID *uint         `json:"serviceId"`
	ClientID  *uint         `json:"clientId"`
	OwnerID   *uint         `json:"ownerId"` // For provider's incoming bookings
	Status    BookingStatus `json:"status"`
	DateFrom  string        `json:"dateFrom"` // ISO format
	DateTo    string        `json:"dateTo"`   // ISO format
	Page      int           `json:"page"`
	Limit     int           `json:"limit"`
}

// BookingListResponse for paginated list
type BookingListResponse struct {
	Bookings   []ServiceBooking `json:"bookings"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"totalPages"`
}

// UpcomingBookingsResponse for dashboard
type UpcomingBookingsResponse struct {
	Today    []ServiceBooking `json:"today"`
	Tomorrow []ServiceBooking `json:"tomorrow"`
	ThisWeek []ServiceBooking `json:"thisWeek"`
	Pending  []ServiceBooking `json:"pending"` // Awaiting confirmation
}
