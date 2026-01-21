package models

import (
	"time"

	"gorm.io/gorm"
)

// CafeStatus represents the status of a cafe
type CafeStatus string

const (
	CafeStatusPending   CafeStatus = "pending"
	CafeStatusActive    CafeStatus = "active"
	CafeStatusSuspended CafeStatus = "suspended"
	CafeStatusClosed    CafeStatus = "closed"
)

// Cafe represents a cafe/restaurant in the system
type Cafe struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Owner
	OwnerID uint  `json:"ownerId" gorm:"not null;index"`
	Owner   *User `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	// Basic Info
	Name        string `json:"name" gorm:"type:varchar(200);not null"`
	Slug        string `json:"slug" gorm:"type:varchar(200);uniqueIndex"`
	Description string `json:"description" gorm:"type:text"`

	// Branding
	LogoURL  string `json:"logoUrl" gorm:"type:varchar(500)"`
	CoverURL string `json:"coverUrl" gorm:"type:varchar(500)"`

	// Location
	City      string   `json:"city" gorm:"type:varchar(100);not null;index"`
	Address   string   `json:"address" gorm:"type:varchar(500)"`
	Latitude  *float64 `json:"latitude" gorm:"type:decimal(10,8)"`
	Longitude *float64 `json:"longitude" gorm:"type:decimal(11,8)"`

	// Contact & Links
	Phone     string `json:"phone" gorm:"type:varchar(30)"`
	Email     string `json:"email" gorm:"type:varchar(100)"`
	Website   string `json:"website" gorm:"type:varchar(200)"`
	Telegram  string `json:"telegram" gorm:"type:varchar(100)"`
	Instagram string `json:"instagram" gorm:"type:varchar(100)"`

	// Working Hours (JSON stored as string, e.g., {"mon":"09:00-22:00","tue":"09:00-22:00",...})
	WorkingHours string `json:"workingHours" gorm:"type:text"`

	// Cafe-specific settings
	HasDelivery     bool    `json:"hasDelivery" gorm:"default:false"`
	HasTakeaway     bool    `json:"hasTakeaway" gorm:"default:true"`
	HasDineIn       bool    `json:"hasDineIn" gorm:"default:true"`
	DeliveryRadiusM float64 `json:"deliveryRadiusM" gorm:"type:decimal(10,2);default:5000"` // Delivery radius in meters
	MinOrderAmount  float64 `json:"minOrderAmount" gorm:"type:decimal(10,2);default:0"`     // Minimum order for delivery
	DeliveryFee     float64 `json:"deliveryFee" gorm:"type:decimal(10,2);default:0"`        // Delivery fee

	// Average preparation time in minutes
	AvgPrepTime int `json:"avgPrepTime" gorm:"default:30"`

	// Status & Moderation
	Status            CafeStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`
	ModerationComment string     `json:"moderationComment" gorm:"type:text"`
	ModeratedBy       *uint      `json:"moderatedBy"`
	ModeratedAt       *time.Time `json:"moderatedAt"`

	// Technical Room for notifications (WebSocket room for staff)
	TechRoomID *uint `json:"techRoomId" gorm:"index"`

	// Stats
	ViewsCount   int     `json:"viewsCount" gorm:"default:0"`
	OrdersCount  int     `json:"ordersCount" gorm:"default:0"`
	Rating       float64 `json:"rating" gorm:"type:decimal(2,1);default:0"`
	ReviewsCount int     `json:"reviewsCount" gorm:"default:0"`

	// Relations
	Tables     []CafeTable    `json:"tables,omitempty" gorm:"foreignKey:CafeID"`
	Categories []DishCategory `json:"categories,omitempty" gorm:"foreignKey:CafeID"`
	Reviews    []CafeReview   `json:"reviews,omitempty" gorm:"foreignKey:CafeID"`
	Staff      []CafeStaff    `json:"staff,omitempty" gorm:"foreignKey:CafeID"`
}

// CafeStaffRole represents the role of a staff member
type CafeStaffRole string

const (
	CafeStaffRoleAdmin   CafeStaffRole = "admin"   // Full access
	CafeStaffRoleManager CafeStaffRole = "manager" // Manage orders, menu
	CafeStaffRoleWaiter  CafeStaffRole = "waiter"  // Handle orders, calls
	CafeStaffRoleKitchen CafeStaffRole = "kitchen" // See orders, update status
)

// CafeStaff represents a staff member of a cafe
type CafeStaff struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	CafeID    uint           `json:"cafeId" gorm:"not null;index;uniqueIndex:idx_cafe_user"`
	UserID    uint           `json:"userId" gorm:"not null;index;uniqueIndex:idx_cafe_user"`
	User      *User          `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Role     CafeStaffRole `json:"role" gorm:"type:varchar(20);not null;default:'waiter'"`
	IsActive bool          `json:"isActive" gorm:"default:true"`
}

// CafeTable represents a table in the cafe (for visual editor)
type CafeTable struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CafeID uint `json:"cafeId" gorm:"not null;index"`

	// Table identification
	Number string `json:"number" gorm:"type:varchar(20);not null"` // e.g., "1", "A2", "VIP1"
	Name   string `json:"name" gorm:"type:varchar(100)"`           // Optional display name

	// Position in visual editor (percentage or pixels)
	PosX float64 `json:"posX" gorm:"type:decimal(10,4);default:0"` // X position
	PosY float64 `json:"posY" gorm:"type:decimal(10,4);default:0"` // Y position

	// Table properties
	Seats    int  `json:"seats" gorm:"default:4"`       // Number of seats
	IsActive bool `json:"isActive" gorm:"default:true"` // Is table available

	// QR Code ID (for scanning)
	QRCodeID string `json:"qrCodeId" gorm:"type:varchar(100);uniqueIndex"`

	// Current status
	IsOccupied     bool       `json:"isOccupied" gorm:"default:false"`
	CurrentOrderID *uint      `json:"currentOrderId"`
	OccupiedSince  *time.Time `json:"occupiedSince"`

	// Reservations
	UpcomingReservation *TableReservation  `json:"upcomingReservation,omitempty" gorm:"-"` // Virtual field for most recent upcoming reservation
	Reservations        []TableReservation `json:"reservations,omitempty" gorm:"foreignKey:TableID"`
}

// TableReservation represents a table booking
type TableReservation struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	TableID uint `json:"tableId" gorm:"not null;index"`
	CafeID  uint `json:"cafeId" gorm:"not null;index"`
	UserID  uint `json:"userId" gorm:"not null;index"`

	CustomerName  string    `json:"customerName" gorm:"type:varchar(100)"`
	CustomerPhone string    `json:"customerPhone" gorm:"type:varchar(20)"`
	StartTime     time.Time `json:"startTime" gorm:"not null"`
	EndTime       time.Time `json:"endTime" gorm:"not null"`
	GuestsCount   int       `json:"guestsCount" gorm:"default:1"`
	Status        string    `json:"status" gorm:"type:varchar(20);default:'confirmed'"` // confirmed, cancelled, completed
	Note          string    `json:"note" gorm:"type:text"`
}

// WaiterCallReason represents why the customer is calling the waiter
type WaiterCallReason string

const (
	WaiterCallReasonBill    WaiterCallReason = "bill"    // Request the bill
	WaiterCallReasonHelp    WaiterCallReason = "help"    // Need assistance
	WaiterCallReasonCleanup WaiterCallReason = "cleanup" // Clean table
	WaiterCallReasonReorder WaiterCallReason = "reorder" // Want to order more
	WaiterCallReasonProblem WaiterCallReason = "problem" // Issue with order
)

// WaiterCallStatus represents the status of a waiter call
type WaiterCallStatus string

const (
	WaiterCallStatusPending      WaiterCallStatus = "pending"
	WaiterCallStatusAcknowledged WaiterCallStatus = "acknowledged"
	WaiterCallStatusCompleted    WaiterCallStatus = "completed"
	WaiterCallStatusCancelled    WaiterCallStatus = "cancelled"
)

// WaiterCall represents a customer's call for waiter
type WaiterCall struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CafeID  uint  `json:"cafeId" gorm:"not null;index"`
	TableID uint  `json:"tableId" gorm:"not null;index"`
	UserID  *uint `json:"userId" gorm:"index"` // Optional - guest can call too

	Reason WaiterCallReason `json:"reason" gorm:"type:varchar(20);not null"`
	Note   string           `json:"note" gorm:"type:text"` // Additional message
	Status WaiterCallStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`

	// Handling
	HandledBy   *uint      `json:"handledBy" gorm:"index"` // Staff user ID
	HandledAt   *time.Time `json:"handledAt"`
	CompletedAt *time.Time `json:"completedAt"`

	// Relations
	Table *CafeTable `json:"table,omitempty" gorm:"foreignKey:TableID"`
	User  *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// CafeReview represents a review for a cafe
type CafeReview struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CafeID uint  `json:"cafeId" gorm:"not null;index"`
	UserID uint  `json:"userId" gorm:"not null;index"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Rating  int    `json:"rating" gorm:"not null"` // 1-5
	Comment string `json:"comment" gorm:"type:text"`

	// Optional: link to specific order
	OrderID *uint `json:"orderId" gorm:"index"`
}

// ===== Request/Response DTOs =====

// CafeCreateRequest for creating a new cafe
type CafeCreateRequest struct {
	Name         string   `json:"name" binding:"required,min=2,max=200"`
	Description  string   `json:"description" binding:"max=2000"`
	City         string   `json:"city" binding:"required"`
	Address      string   `json:"address"`
	Latitude     *float64 `json:"latitude"`
	Longitude    *float64 `json:"longitude"`
	Phone        string   `json:"phone"`
	Email        string   `json:"email"`
	Website      string   `json:"website"`
	Telegram     string   `json:"telegram"`
	Instagram    string   `json:"instagram"`
	WorkingHours string   `json:"workingHours"`
	LogoURL      string   `json:"logoUrl"`
	CoverURL     string   `json:"coverUrl"`
	HasDelivery  bool     `json:"hasDelivery"`
	HasTakeaway  bool     `json:"hasTakeaway"`
	HasDineIn    bool     `json:"hasDineIn"`
}

// CafeUpdateRequest for updating a cafe
type CafeUpdateRequest struct {
	Name            *string  `json:"name"`
	Description     *string  `json:"description"`
	City            *string  `json:"city"`
	Address         *string  `json:"address"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	Phone           *string  `json:"phone"`
	Email           *string  `json:"email"`
	Website         *string  `json:"website"`
	Telegram        *string  `json:"telegram"`
	Instagram       *string  `json:"instagram"`
	WorkingHours    *string  `json:"workingHours"`
	LogoURL         *string  `json:"logoUrl"`
	CoverURL        *string  `json:"coverUrl"`
	HasDelivery     *bool    `json:"hasDelivery"`
	HasTakeaway     *bool    `json:"hasTakeaway"`
	HasDineIn       *bool    `json:"hasDineIn"`
	DeliveryRadiusM *float64 `json:"deliveryRadiusM"`
	MinOrderAmount  *float64 `json:"minOrderAmount"`
	DeliveryFee     *float64 `json:"deliveryFee"`
	AvgPrepTime     *int     `json:"avgPrepTime"`
}

// CafeTableCreateRequest for creating a table
type CafeTableCreateRequest struct {
	Number   string  `json:"number" binding:"required"`
	Name     string  `json:"name"`
	PosX     float64 `json:"posX"`
	PosY     float64 `json:"posY"`
	Seats    int     `json:"seats"`
	IsActive bool    `json:"isActive"`
}

// CafeTableUpdateRequest for updating a table
type CafeTableUpdateRequest struct {
	Number   *string  `json:"number"`
	Name     *string  `json:"name"`
	PosX     *float64 `json:"posX"`
	PosY     *float64 `json:"posY"`
	Seats    *int     `json:"seats"`
	IsActive *bool    `json:"isActive"`
}

// CafeFloorLayoutRequest for bulk updating table positions
type CafeFloorLayoutRequest struct {
	Tables []CafeTablePosition `json:"tables" binding:"required"`
}

// CafeTablePosition for position updates
type CafeTablePosition struct {
	ID   uint    `json:"id" binding:"required"`
	PosX float64 `json:"posX"`
	PosY float64 `json:"posY"`
}

// WaiterCallRequest for calling a waiter
type WaiterCallRequest struct {
	TableID uint             `json:"tableId" binding:"required"`
	Reason  WaiterCallReason `json:"reason" binding:"required"`
	Note    string           `json:"note"`
}

// CafeFilters for querying cafes
type CafeFilters struct {
	City        string     `json:"city"`
	Status      CafeStatus `json:"status"`
	OwnerID     *uint      `json:"ownerId"`
	Search      string     `json:"search"`
	NearLat     *float64   `json:"nearLat"`
	NearLng     *float64   `json:"nearLng"`
	RadiusKm    *float64   `json:"radiusKm"`
	MinRating   *float64   `json:"minRating"`
	HasDelivery *bool      `json:"hasDelivery"`
	Sort        string     `json:"sort"` // newest, rating, popular, distance
	Page        int        `json:"page"`
	Limit       int        `json:"limit"`
}

// CafeResponse for API responses
type CafeResponse struct {
	Cafe
	OwnerInfo *CafeOwnerInfo `json:"ownerInfo,omitempty"`
	Distance  *float64       `json:"distance,omitempty"` // km, when geo filter is used
}

// CafeOwnerInfo simplified user info for cafe display
type CafeOwnerInfo struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName"`
	KarmicName    string `json:"karmicName"`
	AvatarURL     string `json:"avatarUrl"`
}

// CafeListResponse for paginated list
type CafeListResponse struct {
	Cafes      []CafeResponse `json:"cafes"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	TotalPages int            `json:"totalPages"`
}

// CafeDetailResponse for detailed cafe view (includes menu)
type CafeDetailResponse struct {
	Cafe
	OwnerInfo  *CafeOwnerInfo `json:"ownerInfo,omitempty"`
	Categories []DishCategory `json:"categories"`
	Tables     []CafeTable    `json:"tables"`
	Distance   *float64       `json:"distance,omitempty"`
}
