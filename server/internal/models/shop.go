package models

import (
	"time"

	"gorm.io/gorm"
)

// ShopCategory represents the type of shop
type ShopCategory string

const (
	ShopCategoryFood         ShopCategory = "food"
	ShopCategoryClothing     ShopCategory = "clothing"
	ShopCategoryBooks        ShopCategory = "books"
	ShopCategoryHandicrafts  ShopCategory = "handicrafts"
	ShopCategoryIncense      ShopCategory = "incense"
	ShopCategoryJewelry      ShopCategory = "jewelry"
	ShopCategoryAyurveda     ShopCategory = "ayurveda"
	ShopCategoryMusicalInstr ShopCategory = "musical_instruments"
	ShopCategoryArt          ShopCategory = "art"
	ShopCategoryDigitalGoods ShopCategory = "digital_goods"
	ShopCategoryServices     ShopCategory = "services"
	ShopCategoryOther        ShopCategory = "other"
)

// ShopStatus represents the status of a shop
type ShopStatus string

const (
	ShopStatusPending   ShopStatus = "pending"
	ShopStatusActive    ShopStatus = "active"
	ShopStatusSuspended ShopStatus = "suspended"
	ShopStatusClosed    ShopStatus = "closed"
)

// Shop represents a seller's store in the marketplace
type Shop struct {
	gorm.Model
	OwnerID uint  `json:"ownerId" gorm:"not null;index"`
	Owner   *User `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	// Basic Info
	Name        string       `json:"name" gorm:"type:varchar(200);not null"`
	Slug        string       `json:"slug" gorm:"type:varchar(200);uniqueIndex"`
	Description string       `json:"description" gorm:"type:text"`
	Category    ShopCategory `json:"category" gorm:"type:varchar(50);not null;index"`

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
	VK        string `json:"vk" gorm:"type:varchar(100)"`

	// Working Hours (JSON stored as string)
	WorkingHours string `json:"workingHours" gorm:"type:text"`

	// Status & Moderation
	Status            ShopStatus `json:"status" gorm:"type:varchar(20);default:'pending';index"`
	ModerationComment string     `json:"moderationComment" gorm:"type:text"`
	ModeratedBy       *uint      `json:"moderatedBy"`
	ModeratedAt       *time.Time `json:"moderatedAt"`

	// Technical Room for notifications
	TechRoomID *uint `json:"techRoomId" gorm:"index"`

	// Stats
	ViewsCount    int     `json:"viewsCount" gorm:"default:0"`
	OrdersCount   int     `json:"ordersCount" gorm:"default:0"`
	Rating        float64 `json:"rating" gorm:"type:decimal(2,1);default:0"`
	ReviewsCount  int     `json:"reviewsCount" gorm:"default:0"`
	ProductsCount int     `json:"productsCount" gorm:"default:0"`

	// Relations
	Products []Product    `json:"products,omitempty" gorm:"foreignKey:ShopID"`
	Reviews  []ShopReview `json:"reviews,omitempty" gorm:"foreignKey:ShopID"`
}

// ShopReview represents a review for a shop
type ShopReview struct {
	gorm.Model
	ShopID uint  `json:"shopId" gorm:"not null;index"`
	UserID uint  `json:"userId" gorm:"not null;index"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Rating  int    `json:"rating" gorm:"not null"` // 1-5
	Comment string `json:"comment" gorm:"type:text"`
}

// ShopCreateRequest for creating a new shop
type ShopCreateRequest struct {
	Name         string       `json:"name" binding:"required,min=2,max=200"`
	Description  string       `json:"description" binding:"max=2000"`
	Category     ShopCategory `json:"category" binding:"required"`
	City         string       `json:"city" binding:"required"`
	Address      string       `json:"address"`
	Latitude     *float64     `json:"latitude"`
	Longitude    *float64     `json:"longitude"`
	Phone        string       `json:"phone"`
	Email        string       `json:"email"`
	Website      string       `json:"website"`
	Telegram     string       `json:"telegram"`
	Instagram    string       `json:"instagram"`
	VK           string       `json:"vk"`
	WorkingHours string       `json:"workingHours"`
	LogoURL      string       `json:"logoUrl"`
	CoverURL     string       `json:"coverUrl"`
}

// ShopUpdateRequest for updating a shop
type ShopUpdateRequest struct {
	Name         *string       `json:"name"`
	Description  *string       `json:"description"`
	Category     *ShopCategory `json:"category"`
	City         *string       `json:"city"`
	Address      *string       `json:"address"`
	Latitude     *float64      `json:"latitude"`
	Longitude    *float64      `json:"longitude"`
	Phone        *string       `json:"phone"`
	Email        *string       `json:"email"`
	Website      *string       `json:"website"`
	Telegram     *string       `json:"telegram"`
	Instagram    *string       `json:"instagram"`
	VK           *string       `json:"vk"`
	WorkingHours *string       `json:"workingHours"`
	LogoURL      *string       `json:"logoUrl"`
	CoverURL     *string       `json:"coverUrl"`
}

// ShopFilters for querying shops
type ShopFilters struct {
	Category  ShopCategory `json:"category"`
	City      string       `json:"city"`
	Status    ShopStatus   `json:"status"`
	OwnerID   *uint        `json:"ownerId"`
	Search    string       `json:"search"`
	NearLat   *float64     `json:"nearLat"`
	NearLng   *float64     `json:"nearLng"`
	RadiusKm  *float64     `json:"radiusKm"`
	MinRating *float64     `json:"minRating"`
	Sort      string       `json:"sort"` // newest, rating, popular
	Page      int          `json:"page"`
	Limit     int          `json:"limit"`
}

// ShopResponse for API responses
type ShopResponse struct {
	Shop
	OwnerInfo *ShopOwnerInfo `json:"ownerInfo,omitempty"`
	Distance  *float64       `json:"distance,omitempty"` // km, when geo filter is used
}

// ShopOwnerInfo simplified user info for shop display
type ShopOwnerInfo struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName"`
	KarmicName    string `json:"karmicName"`
	AvatarURL     string `json:"avatarUrl"`
	IsVerified    bool   `json:"isVerified"`
}

// ShopListResponse for paginated list
type ShopListResponse struct {
	Shops      []ShopResponse `json:"shops"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	TotalPages int            `json:"totalPages"`
}

// ShopStatsResponse for seller dashboard
type ShopStatsResponse struct {
	TotalViews     int     `json:"totalViews"`
	TotalOrders    int     `json:"totalOrders"`
	TotalRevenue   float64 `json:"totalRevenue"`
	AverageRating  float64 `json:"averageRating"`
	TotalProducts  int     `json:"totalProducts"`
	ActiveProducts int     `json:"activeProducts"`
	PendingOrders  int     `json:"pendingOrders"`
}
