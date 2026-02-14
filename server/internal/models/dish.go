package models

import (
	"time"

	"gorm.io/gorm"
)

// DishCategory represents a category of dishes in a cafe menu
type DishCategory struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CafeID uint `json:"cafeId" gorm:"not null;index"`

	Name        string `json:"name" gorm:"type:varchar(100);not null"`
	Description string `json:"description" gorm:"type:text"`
	ImageURL    string `json:"imageUrl" gorm:"type:varchar(500)"`

	// Ordering
	SortOrder int `json:"sortOrder" gorm:"default:0"`

	// Status
	IsActive bool `json:"isActive" gorm:"default:true"`

	// Relations
	Dishes []Dish `json:"dishes,omitempty" gorm:"foreignKey:CategoryID"`
}

// DishType represents the type of dish
type DishType string

const (
	DishTypeFood    DishType = "food"
	DishTypeDrink   DishType = "drink"
	DishTypeDessert DishType = "dessert"
	DishTypeSnack   DishType = "snack"
	DishTypeCombo   DishType = "combo"
)

// Dish represents a menu item in a cafe
type Dish struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CafeID     uint `json:"cafeId" gorm:"not null;index"`
	CategoryID uint `json:"categoryId" gorm:"not null;index"`

	// Basic Info
	Name        string   `json:"name" gorm:"type:varchar(200);not null"`
	Description string   `json:"description" gorm:"type:text"`
	Type        DishType `json:"type" gorm:"type:varchar(20);default:'food'"`

	// Pricing
	Price              float64 `json:"price" gorm:"type:decimal(10,2);not null"`
	OldPrice           float64 `json:"oldPrice" gorm:"type:decimal(10,2)"`  // For showing discount
	MaxBonusLkmPercent int     `json:"maxBonusLkmPercent" gorm:"default:0"` // 0..100% can be paid with bonus LKM

	// Images
	ImageURL string `json:"imageUrl" gorm:"type:varchar(500)"`
	ThumbURL string `json:"thumbUrl" gorm:"type:varchar(500)"`

	// Nutrition & Properties
	Calories    int    `json:"calories" gorm:"default:0"`
	Weight      string `json:"weight" gorm:"type:varchar(50)"` // e.g., "350g", "500ml"
	CookingTime int    `json:"cookingTime" gorm:"default:0"`   // Minutes

	// Dietary info
	IsVegetarian bool `json:"isVegetarian" gorm:"default:false"`
	IsVegan      bool `json:"isVegan" gorm:"default:false"`
	IsSpicy      bool `json:"isSpicy" gorm:"default:false"`
	IsGlutenFree bool `json:"isGlutenFree" gorm:"default:false"`

	// Status
	IsActive    bool `json:"isActive" gorm:"default:true"`
	IsAvailable bool `json:"isAvailable" gorm:"default:true"` // Stop-list control
	IsFeatured  bool `json:"isFeatured" gorm:"default:false"` // Show in featured section

	// Ordering
	SortOrder int `json:"sortOrder" gorm:"default:0"`

	// Stats
	OrdersCount  int     `json:"ordersCount" gorm:"default:0"`
	Rating       float64 `json:"rating" gorm:"type:decimal(2,1);default:0"`
	ReviewsCount int     `json:"reviewsCount" gorm:"default:0"`

	// Relations
	Category    *DishCategory    `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Ingredients []DishIngredient `json:"ingredients,omitempty" gorm:"foreignKey:DishID"`
	Modifiers   []DishModifier   `json:"modifiers,omitempty" gorm:"foreignKey:DishID"`
}

// DishIngredient represents an ingredient that can be excluded from a dish
type DishIngredient struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	DishID uint `json:"dishId" gorm:"not null;index"`

	Name        string `json:"name" gorm:"type:varchar(100);not null"`
	IsRemovable bool   `json:"isRemovable" gorm:"default:true"` // Can customer request to remove?
	IsAllergen  bool   `json:"isAllergen" gorm:"default:false"` // Mark as allergen
}

// DishModifier represents an optional add-on or customization with price
type DishModifier struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	DishID uint `json:"dishId" gorm:"not null;index"`

	Name        string  `json:"name" gorm:"type:varchar(100);not null"`    // e.g., "Extra cheese"
	Price       float64 `json:"price" gorm:"type:decimal(10,2);default:0"` // Additional price
	IsDefault   bool    `json:"isDefault" gorm:"default:false"`            // Selected by default
	IsAvailable bool    `json:"isAvailable" gorm:"default:true"`           // Available now
	MaxQuantity int     `json:"maxQuantity" gorm:"default:1"`              // How many can add

	// Grouping (e.g., "Size", "Extras", "Sauce")
	GroupName  string `json:"groupName" gorm:"type:varchar(50)"`
	IsRequired bool   `json:"isRequired" gorm:"default:false"` // Must select one from group
}

// ===== Request/Response DTOs =====

// DishCategoryCreateRequest for creating a category
type DishCategoryCreateRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Description string `json:"description"`
	ImageURL    string `json:"imageUrl"`
	SortOrder   int    `json:"sortOrder"`
	IsActive    bool   `json:"isActive"`
}

// DishCategoryUpdateRequest for updating a category
type DishCategoryUpdateRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	ImageURL    *string `json:"imageUrl"`
	SortOrder   *int    `json:"sortOrder"`
	IsActive    *bool   `json:"isActive"`
}

// DishCreateRequest for creating a dish
type DishCreateRequest struct {
	CategoryID         uint     `json:"categoryId" binding:"required"`
	Name               string   `json:"name" binding:"required,min=1,max=200"`
	Description        string   `json:"description"`
	Type               DishType `json:"type"`
	Price              float64  `json:"price" binding:"required,gt=0"`
	OldPrice           float64  `json:"oldPrice"`
	MaxBonusLkmPercent int      `json:"maxBonusLkmPercent"`
	ImageURL           string   `json:"imageUrl"`
	ThumbURL           string   `json:"thumbUrl"`
	Calories           int      `json:"calories"`
	Weight             string   `json:"weight"`
	CookingTime        int      `json:"cookingTime"`
	IsVegetarian       bool     `json:"isVegetarian"`
	IsVegan            bool     `json:"isVegan"`
	IsSpicy            bool     `json:"isSpicy"`
	IsGlutenFree       bool     `json:"isGlutenFree"`
	IsActive           bool     `json:"isActive"`
	IsFeatured         bool     `json:"isFeatured"`
	SortOrder          int      `json:"sortOrder"`
}

// DishUpdateRequest for updating a dish
type DishUpdateRequest struct {
	CategoryID         *uint     `json:"categoryId"`
	Name               *string   `json:"name"`
	Description        *string   `json:"description"`
	Type               *DishType `json:"type"`
	Price              *float64  `json:"price"`
	OldPrice           *float64  `json:"oldPrice"`
	MaxBonusLkmPercent *int      `json:"maxBonusLkmPercent"`
	ImageURL           *string   `json:"imageUrl"`
	ThumbURL           *string   `json:"thumbUrl"`
	Calories           *int      `json:"calories"`
	Weight             *string   `json:"weight"`
	CookingTime        *int      `json:"cookingTime"`
	IsVegetarian       *bool     `json:"isVegetarian"`
	IsVegan            *bool     `json:"isVegan"`
	IsSpicy            *bool     `json:"isSpicy"`
	IsGlutenFree       *bool     `json:"isGlutenFree"`
	IsActive           *bool     `json:"isActive"`
	IsAvailable        *bool     `json:"isAvailable"` // For stop-list
	IsFeatured         *bool     `json:"isFeatured"`
	SortOrder          *int      `json:"sortOrder"`
}

// DishIngredientRequest for managing ingredients
type DishIngredientRequest struct {
	Name        string `json:"name" binding:"required"`
	IsRemovable bool   `json:"isRemovable"`
	IsAllergen  bool   `json:"isAllergen"`
}

// DishModifierRequest for managing modifiers
type DishModifierRequest struct {
	Name        string  `json:"name" binding:"required"`
	Price       float64 `json:"price"`
	IsDefault   bool    `json:"isDefault"`
	IsAvailable bool    `json:"isAvailable"`
	MaxQuantity int     `json:"maxQuantity"`
	GroupName   string  `json:"groupName"`
	IsRequired  bool    `json:"isRequired"`
}

// DishFilters for querying dishes
type DishFilters struct {
	CafeID       uint     `json:"cafeId"`
	CategoryID   *uint    `json:"categoryId"`
	Type         DishType `json:"type"`
	IsVegetarian *bool    `json:"isVegetarian"`
	IsVegan      *bool    `json:"isVegan"`
	IsAvailable  *bool    `json:"isAvailable"`
	IsFeatured   *bool    `json:"isFeatured"`
	Search       string   `json:"search"`
	MinPrice     *float64 `json:"minPrice"`
	MaxPrice     *float64 `json:"maxPrice"`
	Sort         string   `json:"sort"` // popular, price_asc, price_desc, rating
	Page         int      `json:"page"`
	Limit        int      `json:"limit"`
}

// DishResponse for API responses
type DishResponse struct {
	Dish
	CategoryName string `json:"categoryName,omitempty"`
}

// DishListResponse for paginated list
type DishListResponse struct {
	Dishes     []DishResponse `json:"dishes"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	TotalPages int            `json:"totalPages"`
}

// MenuResponse for full cafe menu
type MenuResponse struct {
	Categories  []MenuCategory `json:"categories"`
	TotalDishes int            `json:"totalDishes"`
}

// MenuCategory for menu display
type MenuCategory struct {
	DishCategory
	Dishes []Dish `json:"dishes"`
}

// StopListUpdateRequest for bulk updating dish availability
type StopListUpdateRequest struct {
	DishIDs     []uint `json:"dishIds" binding:"required"`
	IsAvailable bool   `json:"isAvailable"`
}
