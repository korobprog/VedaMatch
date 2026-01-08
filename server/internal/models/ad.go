package models

import (
	"gorm.io/gorm"
)

// AdType represents whether user is looking for something or offering
type AdType string

const (
	AdTypeLooking  AdType = "looking"
	AdTypeOffering AdType = "offering"
)

// AdCategory represents the category of the ad
type AdCategory string

const (
	AdCategoryWork         AdCategory = "work"
	AdCategoryRealEstate   AdCategory = "real_estate"
	AdCategorySpiritual    AdCategory = "spiritual"
	AdCategoryEducation    AdCategory = "education"
	AdCategoryGoods        AdCategory = "goods"
	AdCategoryFood         AdCategory = "food"
	AdCategoryTransport    AdCategory = "transport"
	AdCategoryEvents       AdCategory = "events"
	AdCategoryServices     AdCategory = "services"
	AdCategoryCharity      AdCategory = "charity"
	AdCategoryYogaWellness AdCategory = "yoga_wellness"
	AdCategoryAyurveda     AdCategory = "ayurveda"
	AdCategoryHousing      AdCategory = "housing"
	AdCategoryFurniture    AdCategory = "furniture"
)

// AdStatus represents the moderation status of the ad
type AdStatus string

const (
	AdStatusPending  AdStatus = "pending"
	AdStatusActive   AdStatus = "active"
	AdStatusRejected AdStatus = "rejected"
	AdStatusArchived AdStatus = "archived"
)

// Ad represents a marketplace listing
type Ad struct {
	gorm.Model
	UserID uint  `json:"userId" gorm:"not null;index"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Type and Category
	AdType   AdType     `json:"adType" gorm:"type:varchar(20);not null;index"`
	Category AdCategory `json:"category" gorm:"type:varchar(50);not null;index"`

	// Main content
	Title       string `json:"title" gorm:"type:varchar(200);not null"`
	Description string `json:"description" gorm:"type:text;not null"`

	// Pricing
	Price        *float64 `json:"price" gorm:"type:decimal(10,2)"`
	Currency     string   `json:"currency" gorm:"type:varchar(10);default:'RUB'"`
	IsNegotiable bool     `json:"isNegotiable" gorm:"default:false"`
	IsFree       bool     `json:"isFree" gorm:"default:false"`

	// Location
	City      string   `json:"city" gorm:"type:varchar(100);not null;index"`
	District  string   `json:"district" gorm:"type:varchar(100)"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`

	// Contacts
	ShowProfile bool   `json:"showProfile" gorm:"default:true"`
	Phone       string `json:"phone" gorm:"type:varchar(20)"`
	Email       string `json:"email" gorm:"type:varchar(100)"`

	// Status and moderation
	Status            AdStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`
	ModerationComment string   `json:"moderationComment" gorm:"type:text"`
	ModeratedBy       *uint    `json:"moderatedBy"`
	ModeratedAt       *string  `json:"moderatedAt"`

	// Stats
	ViewsCount     int `json:"viewsCount" gorm:"default:0"`
	FavoritesCount int `json:"favoritesCount" gorm:"default:0"`

	// Expiration
	ExpiresAt string `json:"expiresAt"`

	// Relations
	Photos    []AdPhoto    `json:"photos" gorm:"foreignKey:AdID"`
	Favorites []AdFavorite `json:"-" gorm:"foreignKey:AdID"`
}

// AdPhoto represents a photo attached to an ad
type AdPhoto struct {
	gorm.Model
	AdID     uint   `json:"adId" gorm:"not null;index"`
	PhotoURL string `json:"photoUrl" gorm:"type:varchar(500);not null"`
	Position int    `json:"position" gorm:"default:0"`
}

// AdFavorite represents a user's favorite ad
type AdFavorite struct {
	gorm.Model
	UserID uint `json:"userId" gorm:"not null;uniqueIndex:idx_user_ad"`
	AdID   uint `json:"adId" gorm:"not null;uniqueIndex:idx_user_ad;index"`
}

// AdReport represents a report/complaint about an ad
type AdReport struct {
	gorm.Model
	AdID       uint   `json:"adId" gorm:"not null;index"`
	ReporterID uint   `json:"reporterId" gorm:"not null;index"`
	Reason     string `json:"reason" gorm:"type:varchar(50);not null"`
	Comment    string `json:"comment" gorm:"type:text"`
}

// AdFilters for querying ads
type AdFilters struct {
	AdType   AdType     `json:"adType"`
	Category AdCategory `json:"category"`
	City     string     `json:"city"`
	MinPrice *float64   `json:"minPrice"`
	MaxPrice *float64   `json:"maxPrice"`
	IsFree   *bool      `json:"isFree"`
	UserID   *uint      `json:"userId"`
	Status   AdStatus   `json:"status"`
	Search   string     `json:"search"`
	Sort     string     `json:"sort"` // newest, price_asc, price_desc, popular
	Page     int        `json:"page"`
	Limit    int        `json:"limit"`
}

// AdCreateRequest for creating a new ad
type AdCreateRequest struct {
	AdType       AdType     `json:"adType" binding:"required"`
	Category     AdCategory `json:"category" binding:"required"`
	Title        string     `json:"title" binding:"required,min=5,max=200"`
	Description  string     `json:"description" binding:"required,min=20,max=2000"`
	Price        *float64   `json:"price"`
	Currency     string     `json:"currency"`
	IsNegotiable bool       `json:"isNegotiable"`
	IsFree       bool       `json:"isFree"`
	City         string     `json:"city" binding:"required"`
	District     string     `json:"district"`
	ShowProfile  bool       `json:"showProfile"`
	Phone        string     `json:"phone"`
	Email        string     `json:"email"`
	Photos       []string   `json:"photos"` // URLs
}

// AdResponse for API responses
type AdResponse struct {
	Ad
	IsFavorite bool      `json:"isFavorite"`
	Author     *AdAuthor `json:"author,omitempty"`
}

// AdAuthor simplified user info for ad display
type AdAuthor struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName"`
	KarmicName    string `json:"karmicName"`
	AvatarURL     string `json:"avatarUrl"`
	City          string `json:"city"`
	MemberSince   string `json:"memberSince"`
	AdsCount      int    `json:"adsCount"`
	IsVerified    bool   `json:"isVerified"`
}

// AdListResponse for paginated list
type AdListResponse struct {
	Ads        []AdResponse `json:"ads"`
	Total      int64        `json:"total"`
	Page       int          `json:"page"`
	TotalPages int          `json:"totalPages"`
}

// AdStatsResponse for stats endpoint
type AdStatsResponse struct {
	TotalAds   int64            `json:"totalAds"`
	ActiveAds  int64            `json:"activeAds"`
	ByCategory map[string]int64 `json:"byCategory"`
	ByType     map[string]int64 `json:"byType"`
}
