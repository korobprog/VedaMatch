package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== YATRA (TOUR) ====================

// YatraStatus represents the status of a yatra/tour
type YatraStatus string

const (
	YatraStatusDraft     YatraStatus = "draft"     // Not published yet
	YatraStatusOpen      YatraStatus = "open"      // Accepting participants
	YatraStatusFull      YatraStatus = "full"      // Max participants reached
	YatraStatusActive    YatraStatus = "active"    // Tour is in progress
	YatraStatusCompleted YatraStatus = "completed" // Tour finished
	YatraStatusCancelled YatraStatus = "cancelled" // Tour cancelled
)

type YatraBillingState string

const (
	YatraBillingStateActive             YatraBillingState = "active"
	YatraBillingStatePausedInsufficient YatraBillingState = "paused_insufficient"
	YatraBillingStateStopped            YatraBillingState = "stopped"
)

type YatraBillingPauseReason string

const (
	YatraBillingPauseReasonNone             YatraBillingPauseReason = "none"
	YatraBillingPauseReasonInsufficientLKM  YatraBillingPauseReason = "insufficient_lkm"
	YatraBillingPauseReasonOrganizerStopped YatraBillingPauseReason = "organizer_stopped"
)

// YatraTheme represents popular pilgrimage destinations
type YatraTheme string

const (
	YatraThemeVrindavan     YatraTheme = "vrindavan"
	YatraThemeMayapur       YatraTheme = "mayapur"
	YatraThemeJagannathPuri YatraTheme = "jagannath_puri"
	YatraThemeTirupati      YatraTheme = "tirupati"
	YatraThemeVaranasi      YatraTheme = "varanasi"
	YatraThemeHaridwar      YatraTheme = "haridwar"
	YatraThemeRishikesh     YatraTheme = "rishikesh"
	YatraThemeNavadhama     YatraTheme = "navadhama"
	YatraThemeCharDham      YatraTheme = "char_dham"
	YatraThemeOther         YatraTheme = "other"
)

// Yatra represents a spiritual pilgrimage tour
type Yatra struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Organizer
	OrganizerID uint  `json:"organizerId" gorm:"not null;index"`
	Organizer   *User `json:"organizer,omitempty" gorm:"foreignKey:OrganizerID"`

	// Basic Info
	Title       string     `json:"title" gorm:"type:varchar(200);not null"`
	Description string     `json:"description" gorm:"type:text"`
	Theme       YatraTheme `json:"theme" gorm:"type:varchar(50);index"`

	// Dates
	StartDate time.Time `json:"startDate" gorm:"not null;index"`
	EndDate   time.Time `json:"endDate" gorm:"not null"`

	// Location (starting point)
	StartCity      string   `json:"startCity" gorm:"type:varchar(100)"`
	StartAddress   string   `json:"startAddress" gorm:"type:varchar(500)"`
	StartLatitude  *float64 `json:"startLatitude" gorm:"type:decimal(10,8)"`
	StartLongitude *float64 `json:"startLongitude" gorm:"type:decimal(11,8)"`

	// End location
	EndCity      string   `json:"endCity" gorm:"type:varchar(100)"`
	EndLatitude  *float64 `json:"endLatitude" gorm:"type:decimal(10,8)"`
	EndLongitude *float64 `json:"endLongitude" gorm:"type:decimal(11,8)"`

	// Route (array of waypoints as JSON)
	// Format: [{"name": "Temple", "lat": 27.5, "lng": 77.6, "order": 1, "description": "..."}]
	RoutePoints string `json:"routePoints" gorm:"type:text"`

	// Capacity
	MaxParticipants int `json:"maxParticipants" gorm:"default:20"`
	MinParticipants int `json:"minParticipants" gorm:"default:1"`

	// Info
	Requirements   string `json:"requirements" gorm:"type:text"`           // Physical requirements, visa, etc.
	CostEstimate   string `json:"costEstimate" gorm:"type:text"`           // Estimated cost info (text)
	Accommodation  string `json:"accommodation" gorm:"type:text"`          // Where staying info
	Transportation string `json:"transportation" gorm:"type:varchar(100)"` // bus, train, shared, etc.
	Language       string `json:"language" gorm:"type:varchar(20);default:'en'"`

	// Media
	CoverImageURL string `json:"coverImageUrl" gorm:"type:varchar(500)"`
	Photos        string `json:"photos" gorm:"type:text"` // JSON array of URLs

	// Status
	Status YatraStatus `json:"status" gorm:"type:varchar(20);default:'draft';index"`

	// Billing
	BillingState         YatraBillingState       `json:"billingState" gorm:"type:varchar(32);default:'active';index"`
	BillingPaused        bool                    `json:"billingPaused" gorm:"default:false;index"`
	BillingPauseReason   YatraBillingPauseReason `json:"billingPauseReason" gorm:"type:varchar(32);default:'none'"`
	BillingConsentAt     *time.Time              `json:"billingConsentAt"`
	BillingNextChargeAt  *time.Time              `json:"billingNextChargeAt" gorm:"index"`
	BillingLastChargedAt *time.Time              `json:"billingLastChargedAt"`
	BillingStoppedAt     *time.Time              `json:"billingStoppedAt"`
	DailyFeeLkm          int                     `json:"dailyFeeLkm" gorm:"-"`

	// Chat Room (auto-created when first participant joins)
	ChatRoomID *uint `json:"chatRoomId" gorm:"index"`
	ChatRoom   *Room `json:"chatRoom,omitempty" gorm:"foreignKey:ChatRoomID"`

	// Stats
	ViewsCount       int `json:"viewsCount" gorm:"default:0"`
	ParticipantCount int `json:"participantCount" gorm:"default:0"` // Cached count of approved

	// Relations
	Participants []YatraParticipant `json:"participants,omitempty" gorm:"foreignKey:YatraID"`
}

// ==================== YATRA PARTICIPANTS ====================

// YatraParticipantStatus represents the status of a participant
type YatraParticipantStatus string

const (
	YatraParticipantPending  YatraParticipantStatus = "pending"  // Waiting for approval
	YatraParticipantApproved YatraParticipantStatus = "approved" // Accepted
	YatraParticipantRejected YatraParticipantStatus = "rejected" // Not accepted
	YatraParticipantLeft     YatraParticipantStatus = "left"     // Left the group
)

// YatraParticipantRole represents the role in the tour group
type YatraParticipantRole string

const (
	YatraRoleMember    YatraParticipantRole = "member"    // Regular participant
	YatraRoleAssistant YatraParticipantRole = "assistant" // Helper to organizer
	YatraRoleGuide     YatraParticipantRole = "guide"     // Local guide
)

// YatraParticipant represents a user's participation in a yatra
type YatraParticipant struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	YatraID uint   `json:"yatraId" gorm:"not null;index;uniqueIndex:idx_yatra_user"`
	Yatra   *Yatra `json:"yatra,omitempty" gorm:"foreignKey:YatraID"`

	UserID uint  `json:"userId" gorm:"not null;index;uniqueIndex:idx_yatra_user"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Status and Role
	Status YatraParticipantStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`
	Role   YatraParticipantRole   `json:"role" gorm:"type:varchar(20);default:'member'"`

	// Application
	Message string `json:"message" gorm:"type:text"` // Message from applicant

	// Moderation
	ReviewedAt *time.Time `json:"reviewedAt"`
	ReviewedBy *uint      `json:"reviewedBy"` // Organizer ID

	// Emergency contact (optional)
	EmergencyContact string `json:"emergencyContact" gorm:"type:varchar(200)"`
}

// ==================== SHELTER (ACCOMMODATION) ====================

// ShelterType represents the type of accommodation
type ShelterType string

const (
	ShelterTypeAshram     ShelterType = "ashram"     // Temple/Ashram guesthouse
	ShelterTypeGuestHouse ShelterType = "guesthouse" // Simple guesthouse
	ShelterTypeHomeStay   ShelterType = "homestay"   // Stay with a family
	ShelterTypeRoom       ShelterType = "room"       // Single room rental
	ShelterTypeApartment  ShelterType = "apartment"  // Full apartment
	ShelterTypeDharamsala ShelterType = "dharamsala" // Traditional pilgrim rest house
)

// ShelterStatus represents the status of a shelter listing
type ShelterStatus string

const (
	ShelterStatusActive   ShelterStatus = "active"
	ShelterStatusInactive ShelterStatus = "inactive"
	ShelterStatusPending  ShelterStatus = "pending" // Awaiting moderation
)

// Shelter represents an accommodation listing
type Shelter struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Host
	HostID uint  `json:"hostId" gorm:"not null;index"`
	Host   *User `json:"host,omitempty" gorm:"foreignKey:HostID"`

	// Basic Info
	Title       string      `json:"title" gorm:"type:varchar(200);not null"`
	Description string      `json:"description" gorm:"type:text"`
	Type        ShelterType `json:"type" gorm:"type:varchar(30);not null;index"`

	// Location
	City      string   `json:"city" gorm:"type:varchar(100);not null;index"`
	Country   string   `json:"country" gorm:"type:varchar(100)"`
	Address   string   `json:"address" gorm:"type:varchar(500)"`
	Latitude  *float64 `json:"latitude" gorm:"type:decimal(10,8)"`
	Longitude *float64 `json:"longitude" gorm:"type:decimal(11,8)"`

	// Near which holy place
	NearTemple string `json:"nearTemple" gorm:"type:varchar(200)"` // e.g., "ISKCON Vrindavan"

	// Capacity & Pricing
	Capacity      int    `json:"capacity" gorm:"default:1"`              // Max guests
	Rooms         int    `json:"rooms" gorm:"default:1"`                 // Number of rooms
	PricePerNight string `json:"pricePerNight" gorm:"type:varchar(100)"` // Text field: "500 INR" or "Free (seva)"
	MinStay       int    `json:"minStay" gorm:"default:1"`               // Minimum nights

	// Amenities (JSON array)
	// ["wifi", "ac", "hot_water", "prasadam", "kitchen", "laundry", "parking"]
	Amenities string `json:"amenities" gorm:"type:text"`

	// Rules
	VegetarianOnly bool   `json:"vegetarianOnly" gorm:"default:true"`
	NoSmoking      bool   `json:"noSmoking" gorm:"default:true"`
	NoAlcohol      bool   `json:"noAlcohol" gorm:"default:true"`
	HouseRules     string `json:"houseRules" gorm:"type:text"`

	// Contact
	Phone    string `json:"phone" gorm:"type:varchar(30)"`
	WhatsApp string `json:"whatsapp" gorm:"type:varchar(30)"`
	Email    string `json:"email" gorm:"type:varchar(100)"`

	// Media
	Photos string `json:"photos" gorm:"type:text"` // JSON array of URLs

	// Seva Exchange (can stay for free in exchange for service)
	SevaExchange    bool   `json:"sevaExchange" gorm:"default:false"`
	SevaDescription string `json:"sevaDescription" gorm:"type:text"` // What seva is needed

	// Status
	Status ShelterStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`

	// Stats
	Rating       float64 `json:"rating" gorm:"type:decimal(2,1);default:0"`
	ReviewsCount int     `json:"reviewsCount" gorm:"default:0"`
	ViewsCount   int     `json:"viewsCount" gorm:"default:0"`

	// Relations
	Reviews []ShelterReview `json:"reviews,omitempty" gorm:"foreignKey:ShelterID"`
}

// ==================== SHELTER REVIEWS ====================

// ShelterReview represents a review for a shelter
type ShelterReview struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ShelterID uint     `json:"shelterId" gorm:"not null;index"`
	Shelter   *Shelter `json:"shelter,omitempty" gorm:"foreignKey:ShelterID"`

	AuthorID uint  `json:"authorId" gorm:"not null;index"`
	Author   *User `json:"author,omitempty" gorm:"foreignKey:AuthorID"`

	// Rating breakdown
	Rating            int `json:"rating" gorm:"not null"`             // Overall 1-5
	CleanlinessRating int `json:"cleanlinessRating" gorm:"default:0"` // 1-5
	LocationRating    int `json:"locationRating" gorm:"default:0"`    // 1-5
	ValueRating       int `json:"valueRating" gorm:"default:0"`       // 1-5
	HospitalityRating int `json:"hospitalityRating" gorm:"default:0"` // 1-5

	// Content
	Comment string `json:"comment" gorm:"type:text"`
	Photos  string `json:"photos" gorm:"type:text"` // JSON array

	// Dates stayed
	StayedFrom *time.Time `json:"stayedFrom"`
	StayedTo   *time.Time `json:"stayedTo"`

	// Did host provide seva opportunity as promised?
	SevaVerified *bool `json:"sevaVerified"` // Only if shelter has SevaExchange
}

// ==================== DTOs ====================

// YatraCreateRequest for creating a new yatra
type YatraCreateRequest struct {
	Title           string     `json:"title" binding:"required,min=5,max=200"`
	Description     string     `json:"description"`
	Theme           YatraTheme `json:"theme"`
	StartDate       string     `json:"startDate" binding:"required"` // ISO format
	EndDate         string     `json:"endDate" binding:"required"`
	StartCity       string     `json:"startCity"`
	StartAddress    string     `json:"startAddress"`
	StartLatitude   *float64   `json:"startLatitude"`
	StartLongitude  *float64   `json:"startLongitude"`
	EndCity         string     `json:"endCity"`
	EndLatitude     *float64   `json:"endLatitude"`
	EndLongitude    *float64   `json:"endLongitude"`
	RoutePoints     string     `json:"routePoints"` // JSON
	MaxParticipants int        `json:"maxParticipants"`
	MinParticipants int        `json:"minParticipants"`
	Requirements    string     `json:"requirements"`
	CostEstimate    string     `json:"costEstimate"`
	Accommodation   string     `json:"accommodation"`
	Transportation  string     `json:"transportation"`
	Language        string     `json:"language"`
	CoverImageURL   string     `json:"coverImageUrl"`
}

// YatraJoinRequest for joining a yatra
type YatraJoinRequest struct {
	Message          string `json:"message"`
	EmergencyContact string `json:"emergencyContact"`
}

type YatraPublishRequest struct {
	BillingConsent bool `json:"billingConsent"`
}

// ShelterCreateRequest for creating a shelter
type ShelterCreateRequest struct {
	Title           string      `json:"title" binding:"required,min=5,max=200"`
	Description     string      `json:"description"`
	Type            ShelterType `json:"type" binding:"required"`
	City            string      `json:"city" binding:"required"`
	Country         string      `json:"country"`
	Address         string      `json:"address"`
	Latitude        *float64    `json:"latitude"`
	Longitude       *float64    `json:"longitude"`
	NearTemple      string      `json:"nearTemple"`
	Capacity        int         `json:"capacity"`
	Rooms           int         `json:"rooms"`
	PricePerNight   string      `json:"pricePerNight"`
	MinStay         int         `json:"minStay"`
	Amenities       string      `json:"amenities"` // JSON
	VegetarianOnly  bool        `json:"vegetarianOnly"`
	NoSmoking       bool        `json:"noSmoking"`
	NoAlcohol       bool        `json:"noAlcohol"`
	HouseRules      string      `json:"houseRules"`
	Phone           string      `json:"phone"`
	WhatsApp        string      `json:"whatsapp"`
	Email           string      `json:"email"`
	Photos          string      `json:"photos"` // JSON
	SevaExchange    bool        `json:"sevaExchange"`
	SevaDescription string      `json:"sevaDescription"`
}

// ShelterReviewCreateRequest for creating a review
type ShelterReviewCreateRequest struct {
	Rating            int    `json:"rating" binding:"required,min=1,max=5"`
	CleanlinessRating int    `json:"cleanlinessRating"`
	LocationRating    int    `json:"locationRating"`
	ValueRating       int    `json:"valueRating"`
	HospitalityRating int    `json:"hospitalityRating"`
	Comment           string `json:"comment"`
	Photos            string `json:"photos"`
	StayedFrom        string `json:"stayedFrom"`
	StayedTo          string `json:"stayedTo"`
	SevaVerified      *bool  `json:"sevaVerified"`
}

// YatraFilters for searching yatras
type YatraFilters struct {
	Theme       YatraTheme  `json:"theme"`
	Status      YatraStatus `json:"status"`
	OrganizerID *uint       `json:"organizerId"`
	StartAfter  string      `json:"startAfter"`  // ISO date
	StartBefore string      `json:"startBefore"` // ISO date
	City        string      `json:"city"`
	Language    string      `json:"language"`
	Search      string      `json:"search"`
	Page        int         `json:"page"`
	Limit       int         `json:"limit"`
}

// ShelterFilters for searching shelters
type ShelterFilters struct {
	City      string      `json:"city"`
	Type      ShelterType `json:"type"`
	NearLat   *float64    `json:"nearLat"`
	NearLng   *float64    `json:"nearLng"`
	RadiusKm  *float64    `json:"radiusKm"`
	MinRating *float64    `json:"minRating"`
	SevaOnly  bool        `json:"sevaOnly"` // Only seva exchange
	MaxPrice  *int        `json:"maxPrice"` // For filtering
	Search    string      `json:"search"`
	Page      int         `json:"page"`
	Limit     int         `json:"limit"`
}

// ==================== YATRA REVIEWS ====================

// YatraReview represents a review for a completed yatra
type YatraReview struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	YatraID uint   `json:"yatraId" gorm:"not null;index"`
	Yatra   *Yatra `json:"yatra,omitempty" gorm:"foreignKey:YatraID"`

	AuthorID uint  `json:"authorId" gorm:"not null;index"`
	Author   *User `json:"author,omitempty" gorm:"foreignKey:AuthorID"`

	// Rating breakdown
	OverallRating       int `json:"overallRating" gorm:"not null"`        // Overall 1-5
	OrganizerRating     int `json:"organizerRating" gorm:"default:0"`     // 1-5
	RouteRating         int `json:"routeRating" gorm:"default:0"`         // 1-5
	AccommodationRating int `json:"accommodationRating" gorm:"default:0"` // 1-5
	ValueRating         int `json:"valueRating" gorm:"default:0"`         // 1-5

	// Content
	Comment string `json:"comment" gorm:"type:text"`
	Photos  string `json:"photos" gorm:"type:text"` // JSON array

	// Would recommend?
	Recommendation bool `json:"recommendation" gorm:"default:true"`
}

// YatraReviewCreateRequest for creating a yatra review
type YatraReviewCreateRequest struct {
	OverallRating       int    `json:"overallRating" binding:"required,min=1,max=5"`
	OrganizerRating     int    `json:"organizerRating"`
	RouteRating         int    `json:"routeRating"`
	AccommodationRating int    `json:"accommodationRating"`
	ValueRating         int    `json:"valueRating"`
	Comment             string `json:"comment"`
	Photos              string `json:"photos"`
	Recommendation      *bool  `json:"recommendation"`
}

// OrganizerStats represents statistics for a yatra organizer
type OrganizerStats struct {
	OrganizedCount    int     `json:"organizedCount"`
	AverageRating     float64 `json:"averageRating"`
	TotalParticipants int     `json:"totalParticipants"`
	Recommendations   int     `json:"recommendations"`
}
