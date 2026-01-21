package services

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// ShopService handles shop-related business logic
type ShopService struct{}

// NewShopService creates a new ShopService
func NewShopService() *ShopService {
	return &ShopService{}
}

// Errors
var (
	ErrShopNotFound     = errors.New("shop not found")
	ErrShopLimitReached = errors.New("shop limit reached for this user")
	ErrShopNameTaken    = errors.New("shop name already taken")
	ErrUnauthorizedShop = errors.New("unauthorized to access this shop")
	ErrInvalidShopData  = errors.New("invalid shop data")
)

// CanCreateShop checks if user can create a new shop
// Regular users: 1 shop limit (requires subscription)
// Admins/Superadmins: unlimited
func (s *ShopService) CanCreateShop(userID uint, userRole string) (bool, error) {
	// Admins have no limits
	if userRole == "admin" || userRole == "superadmin" {
		return true, nil
	}

	// Check existing shops count for regular users
	var count int64
	if err := database.DB.Model(&models.Shop{}).Where("owner_id = ?", userID).Count(&count).Error; err != nil {
		return false, err
	}

	// Regular users limited to 1 shop
	if count >= 1 {
		return false, ErrShopLimitReached
	}

	return true, nil
}

// CreateShop creates a new shop
func (s *ShopService) CreateShop(userID uint, userRole string, req models.ShopCreateRequest) (*models.Shop, error) {
	// Check permission
	canCreate, err := s.CanCreateShop(userID, userRole)
	if err != nil {
		return nil, err
	}
	if !canCreate {
		return nil, ErrShopLimitReached
	}

	// Generate slug from name
	slug := s.generateSlug(req.Name)

	// Check if slug is unique
	var existing models.Shop
	if err := database.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		// Slug exists, append timestamp
		slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix())
	}

	shop := models.Shop{
		OwnerID:      userID,
		Name:         req.Name,
		Slug:         slug,
		Description:  req.Description,
		Category:     req.Category,
		LogoURL:      req.LogoURL,
		CoverURL:     req.CoverURL,
		City:         req.City,
		Address:      req.Address,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		Phone:        req.Phone,
		Email:        req.Email,
		Website:      req.Website,
		Telegram:     req.Telegram,
		Instagram:    req.Instagram,
		VK:           req.VK,
		WorkingHours: req.WorkingHours,
		Status:       models.ShopStatusPending, // Requires moderation
	}

	// Geocode if coordinates missing
	if (shop.Latitude == nil || shop.Longitude == nil) && shop.City != "" {
		mapService := NewMapService(database.DB)
		geocoded, err := mapService.GeocodeCity(shop.City)
		if err == nil {
			shop.Latitude = &geocoded.Latitude
			shop.Longitude = &geocoded.Longitude
			shop.City = geocoded.City
		}
	}

	if err := database.DB.Create(&shop).Error; err != nil {
		return nil, err
	}

	return &shop, nil
}

// UpdateShop updates an existing shop
func (s *ShopService) UpdateShop(shopID uint, userID uint, userRole string, req models.ShopUpdateRequest) (*models.Shop, error) {
	shop, err := s.GetShopByID(shopID)
	if err != nil {
		return nil, err
	}

	// Check permission
	if shop.OwnerID != userID && userRole != "admin" && userRole != "superadmin" {
		return nil, ErrUnauthorizedShop
	}

	// Update fields if provided
	if req.Name != nil {
		shop.Name = *req.Name
	}
	if req.Description != nil {
		shop.Description = *req.Description
	}
	if req.Category != nil {
		shop.Category = *req.Category
	}
	if req.City != nil {
		shop.City = *req.City
	}
	if req.Address != nil {
		shop.Address = *req.Address
	}
	if req.Latitude != nil {
		shop.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		shop.Longitude = req.Longitude
	}
	if req.Phone != nil {
		shop.Phone = *req.Phone
	}
	if req.Email != nil {
		shop.Email = *req.Email
	}
	if req.Website != nil {
		shop.Website = *req.Website
	}
	if req.Telegram != nil {
		shop.Telegram = *req.Telegram
	}
	if req.Instagram != nil {
		shop.Instagram = *req.Instagram
	}
	if req.VK != nil {
		shop.VK = *req.VK
	}
	if req.WorkingHours != nil {
		shop.WorkingHours = *req.WorkingHours
	}
	if req.LogoURL != nil {
		shop.LogoURL = *req.LogoURL
	}
	if req.CoverURL != nil {
		shop.CoverURL = *req.CoverURL
	}

	if err := database.DB.Save(&shop).Error; err != nil {
		return nil, err
	}
	// Re-geocode if city changed and no coordinates provided
	cityChanged := req.City != nil && *req.City != shop.City
	if cityChanged || (req.Latitude == nil && shop.Latitude == nil) {
		if (req.Latitude == nil || req.Longitude == nil) && shop.City != "" {
			mapService := NewMapService(database.DB)
			geocoded, err := mapService.GeocodeCity(shop.City)
			if err == nil {
				database.DB.Model(&shop).Updates(map[string]interface{}{
					"latitude":  geocoded.Latitude,
					"longitude": geocoded.Longitude,
					"city":      geocoded.City,
				})
			}
		}
	}

	return shop, nil
}

// GetShopByID retrieves a shop by its ID
func (s *ShopService) GetShopByID(shopID uint) (*models.Shop, error) {
	var shop models.Shop
	if err := database.DB.Preload("Owner").First(&shop, shopID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopNotFound
		}
		return nil, err
	}
	return &shop, nil
}

// GetShopBySlug retrieves a shop by its slug
func (s *ShopService) GetShopBySlug(slug string) (*models.Shop, error) {
	var shop models.Shop
	if err := database.DB.Preload("Owner").Where("slug = ?", slug).First(&shop).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopNotFound
		}
		return nil, err
	}
	return &shop, nil
}

// GetMyShop retrieves the shop owned by the user
func (s *ShopService) GetMyShop(userID uint) (*models.Shop, error) {
	var shop models.Shop
	if err := database.DB.Where("owner_id = ?", userID).First(&shop).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopNotFound
		}
		return nil, err
	}
	return &shop, nil
}

// GetShops retrieves shops with filters
func (s *ShopService) GetShops(filters models.ShopFilters) (*models.ShopListResponse, error) {
	query := database.DB.Model(&models.Shop{})

	// Apply filters
	if filters.Category != "" {
		query = query.Where("category = ?", filters.Category)
	}
	if filters.City != "" {
		query = query.Where("city ILIKE ?", "%"+filters.City+"%")
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	} else {
		// By default, only show active shops for public queries
		query = query.Where("status = ?", models.ShopStatusActive)
	}
	if filters.OwnerID != nil {
		query = query.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.Search != "" {
		searchTerm := "%" + filters.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", searchTerm, searchTerm)
	}
	if filters.MinRating != nil {
		query = query.Where("rating >= ?", *filters.MinRating)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Apply sorting
	switch filters.Sort {
	case "rating":
		query = query.Order("rating DESC")
	case "popular":
		query = query.Order("orders_count DESC")
	case "newest":
		fallthrough
	default:
		query = query.Order("created_at DESC")
	}

	var shops []models.Shop
	if err := query.Preload("Owner").Offset(offset).Limit(limit).Find(&shops).Error; err != nil {
		return nil, err
	}

	// Build response
	var shopResponses []models.ShopResponse
	for _, shop := range shops {
		resp := models.ShopResponse{Shop: shop}
		if shop.Owner != nil {
			resp.OwnerInfo = &models.ShopOwnerInfo{
				ID:            shop.Owner.ID,
				SpiritualName: shop.Owner.SpiritualName,
				KarmicName:    shop.Owner.KarmicName,
				AvatarURL:     shop.Owner.AvatarURL,
			}
		}

		// Calculate distance if geo filter is used
		if filters.NearLat != nil && filters.NearLng != nil && shop.Latitude != nil && shop.Longitude != nil {
			dist := s.calculateDistance(*filters.NearLat, *filters.NearLng, *shop.Latitude, *shop.Longitude)
			resp.Distance = &dist
		}

		shopResponses = append(shopResponses, resp)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.ShopListResponse{
		Shops:      shopResponses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

// ModerateShop allows admin to approve/reject a shop
func (s *ShopService) ModerateShop(shopID uint, moderatorID uint, status models.ShopStatus, comment string) (*models.Shop, error) {
	shop, err := s.GetShopByID(shopID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	shop.Status = status
	shop.ModerationComment = comment
	shop.ModeratedBy = &moderatorID
	shop.ModeratedAt = &now

	if err := database.DB.Save(&shop).Error; err != nil {
		return nil, err
	}

	return shop, nil
}

// IncrementViewCount increments the shop view counter
func (s *ShopService) IncrementViewCount(shopID uint) error {
	return database.DB.Model(&models.Shop{}).Where("id = ?", shopID).
		UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error
}

// Helper: generate URL-friendly slug from name
func (s *ShopService) generateSlug(name string) string {
	// Convert to lowercase
	slug := strings.ToLower(name)

	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")

	// Remove non-alphanumeric characters (keeping cyrillic)
	reg := regexp.MustCompile(`[^a-zа-яё0-9-]`)
	slug = reg.ReplaceAllString(slug, "")

	// Remove multiple consecutive hyphens
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")

	// Trim hyphens from ends
	slug = strings.Trim(slug, "-")

	return slug
}

// Helper: calculate distance between two coordinates in km (Haversine formula)
func (s *ShopService) calculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371 // km

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}
