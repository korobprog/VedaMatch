package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== SERVICE (УСЛУГА) ====================

// ServiceStatus represents the status of a service
type ServiceStatus string

const (
	ServiceStatusDraft    ServiceStatus = "draft"    // Not published yet
	ServiceStatusActive   ServiceStatus = "active"   // Available for booking
	ServiceStatusPaused   ServiceStatus = "paused"   // Temporarily unavailable
	ServiceStatusArchived ServiceStatus = "archived" // No longer available
)

// ServiceCategory represents the category of a service
type ServiceCategory string

const (
	ServiceCategoryAstrology    ServiceCategory = "astrology"    // Астрология
	ServiceCategoryPsychology   ServiceCategory = "psychology"   // Психология
	ServiceCategoryCoaching     ServiceCategory = "coaching"     // Коучинг
	ServiceCategorySpirituality ServiceCategory = "spirituality" // Духовные практики
	ServiceCategoryYagya        ServiceCategory = "yagya"        // Ягьи и ритуалы
	ServiceCategoryEducation    ServiceCategory = "education"    // Обучение
	ServiceCategoryHealth       ServiceCategory = "health"       // Здоровье/Аюрведа
	ServiceCategoryOther        ServiceCategory = "other"        // Другое
)

// ServiceFormat represents the format of a service
type ServiceFormat string

const (
	ServiceFormatIndividual   ServiceFormat = "individual"   // Индивидуальная консультация
	ServiceFormatGroup        ServiceFormat = "group"        // Групповое занятие
	ServiceFormatSubscription ServiceFormat = "subscription" // Подписка
	ServiceFormatEvent        ServiceFormat = "event"        // Разовое мероприятие
	ServiceFormatDonation     ServiceFormat = "donation"     // Донейшн/пожертвование
)

// ServiceScheduleType represents how the service is scheduled
type ServiceScheduleType string

const (
	ServiceScheduleBooking ServiceScheduleType = "booking" // По записи (календарь)
	ServiceScheduleFixed   ServiceScheduleType = "fixed"   // По расписанию (фиксированные даты)
	ServiceScheduleLive    ServiceScheduleType = "live"    // Свободное время (live)
	ServiceScheduleAnytime ServiceScheduleType = "anytime" // Без времени (доступ к контенту)
)

// ServiceChannel represents how the service is delivered
type ServiceChannel string

const (
	ServiceChannelVideo    ServiceChannel = "video"    // Встроенный видеочат платформы
	ServiceChannelZoom     ServiceChannel = "zoom"     // Zoom (ссылка)
	ServiceChannelYouTube  ServiceChannel = "youtube"  // YouTube (стрим / приватный доступ)
	ServiceChannelTelegram ServiceChannel = "telegram" // Telegram
	ServiceChannelOffline  ServiceChannel = "offline"  // Оффлайн (адрес)
	ServiceChannelFile     ServiceChannel = "file"     // Файл / запись
)

// ServiceAccessType represents how access to the service is granted
type ServiceAccessType string

const (
	ServiceAccessFree         ServiceAccessType = "free"         // Бесплатно
	ServiceAccessPaid         ServiceAccessType = "paid"         // Платно
	ServiceAccessSubscription ServiceAccessType = "subscription" // По подписке
	ServiceAccessInvite       ServiceAccessType = "invite"       // По приглашению
)

// Service represents a specialist's service/offering
type Service struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Owner (specialist)
	OwnerID uint  `json:"ownerId" gorm:"not null;index"`
	Owner   *User `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	// Basic Information
	Title         string          `json:"title" gorm:"type:varchar(200);not null"`
	Description   string          `json:"description" gorm:"type:text"`
	CoverImageURL string          `json:"coverImageUrl" gorm:"type:varchar(500)"`
	Category      ServiceCategory `json:"category" gorm:"type:varchar(50);index"`
	Language      string          `json:"language" gorm:"type:varchar(10);default:'ru'"`

	// Format (multiple selection as JSON array)
	// Example: ["individual", "group", "subscription"]
	Formats string `json:"formats" gorm:"type:text"`

	// Schedule type
	ScheduleType ServiceScheduleType `json:"scheduleType" gorm:"type:varchar(30)"`

	// Channel (delivery method)
	Channel        ServiceChannel `json:"channel" gorm:"type:varchar(30)"`
	ChannelLink    string         `json:"channelLink" gorm:"type:varchar(500)"`    // Zoom ID, Telegram link, etc.
	OfflineAddress string         `json:"offlineAddress" gorm:"type:varchar(500)"` // For offline services
	OfflineLat     *float64       `json:"offlineLat" gorm:"type:decimal(10,8)"`
	OfflineLng     *float64       `json:"offlineLng" gorm:"type:decimal(11,8)"`

	// Access type
	AccessType ServiceAccessType `json:"accessType" gorm:"type:varchar(20)"`

	// Status
	Status ServiceStatus `json:"status" gorm:"type:varchar(20);default:'draft';index"`

	// Settings (JSON)
	Settings string `json:"settings" gorm:"type:text"`

	// Statistics
	ViewsCount    int     `json:"viewsCount" gorm:"default:0"`
	BookingsCount int     `json:"bookingsCount" gorm:"default:0"`
	Rating        float64 `json:"rating" gorm:"type:decimal(2,1);default:0"`
	ReviewsCount  int     `json:"reviewsCount" gorm:"default:0"`

	// Chat Room (auto-created when first booking is confirmed)
	ChatRoomID *uint `json:"chatRoomId" gorm:"index"`
	ChatRoom   *Room `json:"chatRoom,omitempty" gorm:"foreignKey:ChatRoomID"`

	// Relations
	Tariffs   []ServiceTariff   `json:"tariffs,omitempty" gorm:"foreignKey:ServiceID"`
	Schedules []ServiceSchedule `json:"schedules,omitempty" gorm:"foreignKey:ServiceID"`
	Bookings  []ServiceBooking  `json:"bookings,omitempty" gorm:"foreignKey:ServiceID"`
}

// ==================== DTOs ====================

// ServiceCreateRequest for creating a new service
type ServiceCreateRequest struct {
	Title          string              `json:"title" binding:"required,min=3,max=200"`
	Description    string              `json:"description"`
	CoverImageURL  string              `json:"coverImageUrl"`
	Category       ServiceCategory     `json:"category"`
	Language       string              `json:"language"`
	Formats        string              `json:"formats"` // JSON array
	ScheduleType   ServiceScheduleType `json:"scheduleType"`
	Channel        ServiceChannel      `json:"channel"`
	ChannelLink    string              `json:"channelLink"`
	OfflineAddress string              `json:"offlineAddress"`
	OfflineLat     *float64            `json:"offlineLat"`
	OfflineLng     *float64            `json:"offlineLng"`
	AccessType     ServiceAccessType   `json:"accessType"`
}

// ServiceUpdateRequest for updating a service
type ServiceUpdateRequest struct {
	Title          *string              `json:"title"`
	Description    *string              `json:"description"`
	CoverImageURL  *string              `json:"coverImageUrl"`
	Category       *ServiceCategory     `json:"category"`
	Language       *string              `json:"language"`
	Formats        *string              `json:"formats"`
	ScheduleType   *ServiceScheduleType `json:"scheduleType"`
	Channel        *ServiceChannel      `json:"channel"`
	ChannelLink    *string              `json:"channelLink"`
	OfflineAddress *string              `json:"offlineAddress"`
	OfflineLat     *float64             `json:"offlineLat"`
	OfflineLng     *float64             `json:"offlineLng"`
	AccessType     *ServiceAccessType   `json:"accessType"`
	Status         *ServiceStatus       `json:"status"`
}

// ServiceFilters for searching services
type ServiceFilters struct {
	Category     ServiceCategory     `json:"category"`
	Status       ServiceStatus       `json:"status"`
	OwnerID      *uint               `json:"ownerId"`
	ScheduleType ServiceScheduleType `json:"scheduleType"`
	Channel      ServiceChannel      `json:"channel"`
	AccessType   ServiceAccessType   `json:"accessType"`
	Language     string              `json:"language"`
	Search       string              `json:"search"`
	NearLat      *float64            `json:"nearLat"`
	NearLng      *float64            `json:"nearLng"`
	RadiusKm     *float64            `json:"radiusKm"`
	Page         int                 `json:"page"`
	Limit        int                 `json:"limit"`
}

// ServiceListResponse for paginated list
type ServiceListResponse struct {
	Services   []Service `json:"services"`
	Total      int64     `json:"total"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
	TotalPages int       `json:"totalPages"`
}
