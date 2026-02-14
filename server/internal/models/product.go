package models

import (
	"gorm.io/gorm"
)

// ProductType represents physical or digital product
type ProductType string

const (
	ProductTypePhysical ProductType = "physical"
	ProductTypeDigital  ProductType = "digital"
)

// ProductStatus represents the status of a product
type ProductStatus string

const (
	ProductStatusDraft    ProductStatus = "draft"
	ProductStatusActive   ProductStatus = "active"
	ProductStatusInactive ProductStatus = "inactive"
	ProductStatusSoldOut  ProductStatus = "sold_out"
)

// ProductCategory represents product categories
type ProductCategory string

const (
	ProductCategoryBooks          ProductCategory = "books"
	ProductCategoryClothing       ProductCategory = "clothing"
	ProductCategoryFood           ProductCategory = "food"
	ProductCategoryIncense        ProductCategory = "incense"
	ProductCategoryJewelry        ProductCategory = "jewelry"
	ProductCategoryAyurveda       ProductCategory = "ayurveda"
	ProductCategoryMusicInstr     ProductCategory = "music_instruments"
	ProductCategoryArt            ProductCategory = "art"
	ProductCategoryHomeDecor      ProductCategory = "home_decor"
	ProductCategoryCosmetics      ProductCategory = "cosmetics"
	ProductCategoryDigitalCourses ProductCategory = "digital_courses"
	ProductCategoryDigitalBooks   ProductCategory = "digital_books"
	ProductCategoryAccessories    ProductCategory = "accessories"
	ProductCategoryOther          ProductCategory = "other"
)

// Product represents a product in a shop
type Product struct {
	gorm.Model
	ShopID uint  `json:"shopId" gorm:"not null;index"`
	Shop   *Shop `json:"shop,omitempty" gorm:"foreignKey:ShopID"`

	// Basic Info
	Name             string          `json:"name" gorm:"type:varchar(300);not null"`
	Slug             string          `json:"slug" gorm:"type:varchar(300);index"`
	ShortDescription string          `json:"shortDescription" gorm:"type:varchar(500)"`
	FullDescription  string          `json:"fullDescription" gorm:"type:text"`
	Category         ProductCategory `json:"category" gorm:"type:varchar(50);not null;index"`
	Tags             string          `json:"tags" gorm:"type:text"` // JSON array stored as string

	// Type & Content
	ProductType   ProductType `json:"productType" gorm:"type:varchar(20);not null;default:'physical'"`
	ExternalURL   string      `json:"externalUrl" gorm:"type:varchar(500)"`   // Optional: buy on external site
	DigitalURL    string      `json:"digitalUrl" gorm:"type:varchar(500)"`    // For digital products: download link
	DigitalFileID string      `json:"digitalFileId" gorm:"type:varchar(100)"` // For S3 stored digital goods

	// Pricing (base price, can be overridden by variants)
	BasePrice          float64  `json:"basePrice" gorm:"type:decimal(12,2);not null"`
	SalePrice          *float64 `json:"salePrice" gorm:"type:decimal(12,2)"`
	Currency           string   `json:"currency" gorm:"type:varchar(10);default:'RUB'"`
	MaxBonusLkmPercent int      `json:"maxBonusLkmPercent" gorm:"default:0"` // 0..100% can be paid with bonus LKM

	// Stock (for products without variants)
	Stock          int  `json:"stock" gorm:"default:0"`
	TrackStock     bool `json:"trackStock" gorm:"default:true"`
	AllowBackorder bool `json:"allowBackorder" gorm:"default:false"`

	// Status
	Status ProductStatus `json:"status" gorm:"type:varchar(20);default:'draft';index"`

	// SEO & Display
	MainImageURL string `json:"mainImageUrl" gorm:"type:varchar(500)"`

	// Shipping (for physical products)
	Weight     *float64 `json:"weight" gorm:"type:decimal(8,2)"`     // kg
	Dimensions string   `json:"dimensions" gorm:"type:varchar(100)"` // "LxWxH" in cm

	// Stats
	ViewsCount     int     `json:"viewsCount" gorm:"default:0"`
	SalesCount     int     `json:"salesCount" gorm:"default:0"`
	Rating         float64 `json:"rating" gorm:"type:decimal(2,1);default:0"`
	ReviewsCount   int     `json:"reviewsCount" gorm:"default:0"`
	FavoritesCount int     `json:"favoritesCount" gorm:"default:0"`

	// Relations
	Variants  []ProductVariant  `json:"variants,omitempty" gorm:"foreignKey:ProductID"`
	Images    []ProductImage    `json:"images,omitempty" gorm:"foreignKey:ProductID"`
	Reviews   []ProductReview   `json:"reviews,omitempty" gorm:"foreignKey:ProductID"`
	Favorites []ProductFavorite `json:"-" gorm:"foreignKey:ProductID"`
}

// ProductVariant represents a specific SKU (size/color combination)
type ProductVariant struct {
	gorm.Model
	ProductID uint     `json:"productId" gorm:"not null;index"`
	Product   *Product `json:"-" gorm:"foreignKey:ProductID"`

	// SKU identifier
	SKU string `json:"sku" gorm:"type:varchar(100);uniqueIndex"`

	// Variant attributes (stored as JSON)
	// Example: {"color": "red", "size": "L"}
	Attributes string `json:"attributes" gorm:"type:text;not null"`

	// Display name for this variant
	Name string `json:"name" gorm:"type:varchar(200)"`

	// Pricing (overrides base price if set)
	Price     *float64 `json:"price" gorm:"type:decimal(12,2)"`
	SalePrice *float64 `json:"salePrice" gorm:"type:decimal(12,2)"`

	// Stock for this variant
	Stock    int `json:"stock" gorm:"default:0"`
	Reserved int `json:"reserved" gorm:"default:0"` // Reserved in active carts/orders

	// Image specific to this variant
	ImageURL string `json:"imageUrl" gorm:"type:varchar(500)"`

	// Status
	IsActive bool `json:"isActive" gorm:"default:true"`
}

// ProductImage represents a product gallery image
type ProductImage struct {
	gorm.Model
	ProductID uint   `json:"productId" gorm:"not null;index"`
	ImageURL  string `json:"imageUrl" gorm:"type:varchar(500);not null"`
	Position  int    `json:"position" gorm:"default:0"`
	AltText   string `json:"altText" gorm:"type:varchar(200)"`
}

// ProductReview represents a customer review
type ProductReview struct {
	gorm.Model
	ProductID uint  `json:"productId" gorm:"not null;index"`
	UserID    uint  `json:"userId" gorm:"not null;index"`
	User      *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	OrderID   *uint `json:"orderId" gorm:"index"` // Optional: verified purchase

	Rating  int    `json:"rating" gorm:"not null"` // 1-5
	Title   string `json:"title" gorm:"type:varchar(200)"`
	Comment string `json:"comment" gorm:"type:text"`

	// Helpful votes
	HelpfulCount int `json:"helpfulCount" gorm:"default:0"`

	// Moderation
	IsVerifiedPurchase bool `json:"isVerifiedPurchase" gorm:"default:false"`
	IsApproved         bool `json:"isApproved" gorm:"default:true"`
}

// ProductFavorite represents a user's favorite product
type ProductFavorite struct {
	gorm.Model
	UserID    uint `json:"userId" gorm:"not null;uniqueIndex:idx_user_product"`
	ProductID uint `json:"productId" gorm:"not null;uniqueIndex:idx_user_product;index"`
}

// ===== Request/Response DTOs =====

// ProductCreateRequest for creating a new product
type ProductCreateRequest struct {
	Name               string                 `json:"name" binding:"required,min=2,max=300"`
	ShortDescription   string                 `json:"shortDescription" binding:"max=500"`
	FullDescription    string                 `json:"fullDescription"`
	Category           ProductCategory        `json:"category" binding:"required"`
	Tags               []string               `json:"tags"`
	ProductType        ProductType            `json:"productType" binding:"required"`
	ExternalURL        string                 `json:"externalUrl"`
	DigitalURL         string                 `json:"digitalUrl"`
	BasePrice          float64                `json:"basePrice" binding:"required,min=0"`
	SalePrice          *float64               `json:"salePrice"`
	Currency           string                 `json:"currency"`
	MaxBonusLkmPercent int                    `json:"maxBonusLkmPercent"`
	Stock              int                    `json:"stock"`
	TrackStock         bool                   `json:"trackStock"`
	MainImageURL       string                 `json:"mainImageUrl"`
	Images             []string               `json:"images"`
	Weight             *float64               `json:"weight"`
	Dimensions         string                 `json:"dimensions"`
	Variants           []VariantCreateRequest `json:"variants"`
}

// VariantCreateRequest for creating product variants
type VariantCreateRequest struct {
	SKU        string            `json:"sku" binding:"required"`
	Attributes map[string]string `json:"attributes" binding:"required"`
	Name       string            `json:"name"`
	Price      *float64          `json:"price"`
	SalePrice  *float64          `json:"salePrice"`
	Stock      int               `json:"stock"`
	ImageURL   string            `json:"imageUrl"`
}

// ProductUpdateRequest for updating a product
type ProductUpdateRequest struct {
	Name               *string          `json:"name"`
	ShortDescription   *string          `json:"shortDescription"`
	FullDescription    *string          `json:"fullDescription"`
	Category           *ProductCategory `json:"category"`
	Tags               []string         `json:"tags"`
	ProductType        *ProductType     `json:"productType"`
	ExternalURL        *string          `json:"externalUrl"`
	BasePrice          *float64         `json:"basePrice"`
	SalePrice          *float64         `json:"salePrice"`
	MaxBonusLkmPercent *int             `json:"maxBonusLkmPercent"`
	Stock              *int             `json:"stock"`
	Status             *ProductStatus   `json:"status"`
	MainImageURL       *string          `json:"mainImageUrl"`
	Weight             *float64         `json:"weight"`
	Dimensions         *string          `json:"dimensions"`
}

// ProductFilters for querying products
type ProductFilters struct {
	ShopID      *uint           `json:"shopId"`
	Category    ProductCategory `json:"category"`
	ProductType ProductType     `json:"productType"`
	City        string          `json:"city"` // Filter by shop's city
	MinPrice    *float64        `json:"minPrice"`
	MaxPrice    *float64        `json:"maxPrice"`
	InStock     *bool           `json:"inStock"`
	Status      ProductStatus   `json:"status"`
	Search      string          `json:"search"`
	Tags        []string        `json:"tags"`
	MinRating   *float64        `json:"minRating"`
	Sort        string          `json:"sort"` // newest, price_asc, price_desc, popular, rating
	Page        int             `json:"page"`
	Limit       int             `json:"limit"`
}

// ProductResponse for API responses
type ProductResponse struct {
	Product
	ShopInfo     *ProductShopInfo `json:"shopInfo,omitempty"`
	IsFavorite   bool             `json:"isFavorite"`
	CurrentPrice float64          `json:"currentPrice"` // Calculated sale/base price
	IsOnSale     bool             `json:"isOnSale"`
}

// ProductShopInfo simplified shop info for product display
type ProductShopInfo struct {
	ID      uint    `json:"id"`
	Name    string  `json:"name"`
	LogoURL string  `json:"logoUrl"`
	City    string  `json:"city"`
	Rating  float64 `json:"rating"`
}

// ProductListResponse for paginated list
type ProductListResponse struct {
	Products   []ProductResponse `json:"products"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	TotalPages int               `json:"totalPages"`
}

// ReviewCreateRequest for creating a review
type ReviewCreateRequest struct {
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Title   string `json:"title" binding:"max=200"`
	Comment string `json:"comment" binding:"max=2000"`
}

// InventoryUpdateRequest for stock updates
type InventoryUpdateRequest struct {
	VariantID uint `json:"variantId"`
	Stock     int  `json:"stock" binding:"min=0"`
	Reserved  int  `json:"reserved" binding:"min=0"`
}
