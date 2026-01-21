package handlers

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AdsHandler struct {
	mapService *services.MapService
}

func NewAdsHandler() *AdsHandler {
	return &AdsHandler{
		mapService: services.NewMapService(database.DB),
	}
}

// GetAds returns a paginated list of ads with filters
func (h *AdsHandler) GetAds(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.Ad{}).Preload("Photos").Preload("User")

	// Only show active ads by default
	status := c.Query("status", "active")
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	// Filter by ad type
	adType := c.Query("adType")
	if adType != "" {
		query = query.Where("ad_type = ?", adType)
	}

	// Filter by category
	category := c.Query("category")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Filter by city
	city := c.Query("city")
	if city != "" {
		query = query.Where("city = ?", city)
	}

	// Filter by price range
	minPrice := c.Query("minPrice")
	if minPrice != "" {
		if min, err := strconv.ParseFloat(minPrice, 64); err == nil {
			query = query.Where("price >= ? OR is_free = true", min)
		}
	}

	maxPrice := c.Query("maxPrice")
	if maxPrice != "" {
		if max, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			query = query.Where("price <= ? OR is_free = true", max)
		}
	}

	// Filter free only
	isFree := c.Query("isFree")
	if isFree == "true" {
		query = query.Where("is_free = true")
	}

	// Search
	search := c.Query("search")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Sorting
	sort := c.Query("sort", "newest")
	switch sort {
	case "price_asc":
		query = query.Order("COALESCE(price, 0) ASC")
	case "price_desc":
		query = query.Order("COALESCE(price, 999999999) DESC")
	case "popular":
		query = query.Order("views_count DESC")
	default: // newest
		query = query.Order("created_at DESC")
	}

	var ads []models.Ad
	if err := query.Offset(offset).Limit(limit).Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	// Check favorites for current user
	userIDStr := c.Query("userId")
	var userFavorites []uint
	if userIDStr != "" {
		if userID, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			var favorites []models.AdFavorite
			database.DB.Where("user_id = ?", userID).Find(&favorites)
			for _, f := range favorites {
				userFavorites = append(userFavorites, f.AdID)
			}
		}
	}

	// Build response
	responses := make([]models.AdResponse, len(ads))
	for i, ad := range ads {
		isFavorite := false
		for _, favID := range userFavorites {
			if favID == ad.ID {
				isFavorite = true
				break
			}
		}

		responses[i] = models.AdResponse{
			Ad:         ad,
			IsFavorite: isFavorite,
		}

		// Add author info if user loaded
		if ad.User != nil {
			responses[i].Author = &models.AdAuthor{
				ID:            ad.User.ID,
				SpiritualName: ad.User.SpiritualName,
				KarmicName:    ad.User.KarmicName,
				AvatarURL:     ad.User.AvatarURL,
				City:          ad.User.City,
				MemberSince:   ad.User.CreatedAt.Format("2006-01-02"),
			}
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return c.JSON(models.AdListResponse{
		Ads:        responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	})
}

// GetAd returns a single ad by ID
func (h *AdsHandler) GetAd(c *fiber.Ctx) error {
	id := c.Params("id")

	var ad models.Ad
	if err := database.DB.Preload("Photos").Preload("User").First(&ad, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ad not found",
		})
	}

	// Increment view count
	database.DB.Model(&ad).Update("views_count", ad.ViewsCount+1)

	// Check if favorited by current user
	userIDStr := c.Query("userId")
	isFavorite := false
	if userIDStr != "" {
		if userID, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			var count int64
			database.DB.Model(&models.AdFavorite{}).Where("user_id = ? AND ad_id = ?", userID, ad.ID).Count(&count)
			isFavorite = count > 0
		}
	}

	// Build author info
	var author *models.AdAuthor
	if ad.User != nil {
		// Count user's ads
		var adsCount int64
		database.DB.Model(&models.Ad{}).Where("user_id = ? AND status = ?", ad.UserID, "active").Count(&adsCount)

		author = &models.AdAuthor{
			ID:            ad.User.ID,
			SpiritualName: ad.User.SpiritualName,
			KarmicName:    ad.User.KarmicName,
			AvatarURL:     ad.User.AvatarURL,
			City:          ad.User.City,
			MemberSince:   ad.User.CreatedAt.Format("2006-01-02"),
			AdsCount:      int(adsCount),
			IsVerified:    ad.User.IsProfileComplete,
		}
	}

	return c.JSON(models.AdResponse{
		Ad:         ad,
		IsFavorite: isFavorite,
		Author:     author,
	})
}

// CreateAd creates a new ad
func (h *AdsHandler) CreateAd(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.AdCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Title == "" || len(req.Title) < 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title must be at least 5 characters",
		})
	}
	if req.Description == "" || len(req.Description) < 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Description must be at least 10 characters",
		})
	}

	// Set defaults
	currency := req.Currency
	if currency == "" {
		currency = "RUB"
	}

	expiresAt := time.Now().AddDate(0, 0, 30).Format(time.RFC3339)

	ad := models.Ad{
		UserID:       userID,
		AdType:       req.AdType,
		Category:     req.Category,
		Title:        req.Title,
		Description:  req.Description,
		Price:        req.Price,
		Currency:     currency,
		IsNegotiable: req.IsNegotiable,
		IsFree:       req.IsFree,
		City:         req.City,
		District:     req.District,
		ShowProfile:  req.ShowProfile,
		Phone:        req.Phone,
		Email:        req.Email,
		Status:       models.AdStatusActive, // Auto-approve for now, can add moderation later
		ExpiresAt:    expiresAt,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
	}

	// Geocode city if coordinates are missing
	if (ad.Latitude == nil || ad.Longitude == nil) && ad.City != "" && h.mapService != nil {
		geocoded, err := h.mapService.GeocodeCity(ad.City)
		if err == nil {
			ad.Latitude = &geocoded.Latitude
			ad.Longitude = &geocoded.Longitude
			// Normalize city name
			ad.City = geocoded.City
		}
	}

	if err := database.DB.Create(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create ad",
		})
	}

	// Create photo records
	for i, photoURL := range req.Photos {
		photo := models.AdPhoto{
			AdID:     ad.ID,
			PhotoURL: photoURL,
			Position: i,
		}
		database.DB.Create(&photo)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":      ad.ID,
		"status":  ad.Status,
		"message": "Ad created successfully",
	})
}

// UpdateAd updates an existing ad
func (h *AdsHandler) UpdateAd(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ad not found",
		})
	}

	// Check ownership
	if ad.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only edit your own ads",
		})
	}

	var req models.AdCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update fields
	updateMap := map[string]interface{}{
		"ad_type":       req.AdType,
		"category":      req.Category,
		"title":         req.Title,
		"description":   req.Description,
		"price":         req.Price,
		"is_negotiable": req.IsNegotiable,
		"is_free":       req.IsFree,
		"city":          req.City,
		"district":      req.District,
		"show_profile":  req.ShowProfile,
		"phone":         req.Phone,
		"email":         req.Email,
	}

	if req.Currency != "" {
		updateMap["currency"] = req.Currency
	}

	if err := database.DB.Model(&ad).Updates(updateMap).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update ad",
		})
	}

	// Re-geocode if city changed and coordinates not provided
	cityChanged := req.City != "" && req.City != ad.City
	if cityChanged || (req.Latitude == nil && ad.Latitude == nil) {
		if (req.Latitude == nil || req.Longitude == nil) && ad.City != "" && h.mapService != nil {
			geocoded, err := h.mapService.GeocodeCity(ad.City)
			if err == nil {
				database.DB.Model(&ad).Updates(map[string]interface{}{
					"latitude":  geocoded.Latitude,
					"longitude": geocoded.Longitude,
					"city":      geocoded.City,
				})
			}
		} else if req.Latitude != nil && req.Longitude != nil {
			database.DB.Model(&ad).Updates(map[string]interface{}{
				"latitude":  req.Latitude,
				"longitude": req.Longitude,
			})
		}
	}

	// Update photos if provided
	if len(req.Photos) > 0 {
		// Delete existing photos
		database.DB.Where("ad_id = ?", ad.ID).Delete(&models.AdPhoto{})

		// Create new photos
		for i, photoURL := range req.Photos {
			photo := models.AdPhoto{
				AdID:     ad.ID,
				PhotoURL: photoURL,
				Position: i,
			}
			database.DB.Create(&photo)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad updated successfully",
	})
}

// DeleteAd deletes an ad
func (h *AdsHandler) DeleteAd(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ad not found",
		})
	}

	// Check ownership (or admin role later)
	if ad.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only delete your own ads",
		})
	}

	// Delete photos first
	database.DB.Where("ad_id = ?", ad.ID).Delete(&models.AdPhoto{})

	// Delete favorites
	database.DB.Where("ad_id = ?", ad.ID).Delete(&models.AdFavorite{})

	// Delete the ad
	if err := database.DB.Delete(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not delete ad",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad deleted successfully",
	})
}

// ToggleFavorite adds or removes an ad from favorites
func (h *AdsHandler) ToggleFavorite(c *fiber.Ctx) error {
	adID := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	adIDUint, err := strconv.ParseUint(adID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}

	// Check if already favorited
	var existing models.AdFavorite
	result := database.DB.Where("user_id = ? AND ad_id = ?", userID, adIDUint).First(&existing)

	if result.Error == nil {
		// Remove from favorites
		database.DB.Delete(&existing)

		// Decrement favorites count
		database.DB.Model(&models.Ad{}).Where("id = ?", adIDUint).Update("favorites_count", database.DB.Raw("favorites_count - 1"))

		return c.JSON(fiber.Map{
			"isFavorite": false,
		})
	}

	// Add to favorites
	favorite := models.AdFavorite{
		UserID: userID,
		AdID:   uint(adIDUint),
	}
	if err := database.DB.Create(&favorite).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not add to favorites",
		})
	}

	// Increment favorites count
	database.DB.Model(&models.Ad{}).Where("id = ?", adIDUint).Update("favorites_count", database.DB.Raw("favorites_count + 1"))

	return c.JSON(fiber.Map{
		"isFavorite": true,
	})
}

// GetFavorites returns user's favorite ads
func (h *AdsHandler) GetFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var favorites []models.AdFavorite
	if err := database.DB.Where("user_id = ?", userID).Find(&favorites).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch favorites",
		})
	}

	// Get ad IDs
	var adIDs []uint
	for _, f := range favorites {
		adIDs = append(adIDs, f.AdID)
	}

	if len(adIDs) == 0 {
		return c.JSON([]models.AdResponse{})
	}

	// Fetch ads
	var ads []models.Ad
	if err := database.DB.Preload("Photos").Preload("User").Where("id IN ?", adIDs).Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	// Build response
	responses := make([]models.AdResponse, len(ads))
	for i, ad := range ads {
		responses[i] = models.AdResponse{
			Ad:         ad,
			IsFavorite: true,
		}
		if ad.User != nil {
			responses[i].Author = &models.AdAuthor{
				ID:            ad.User.ID,
				SpiritualName: ad.User.SpiritualName,
				KarmicName:    ad.User.KarmicName,
				AvatarURL:     ad.User.AvatarURL,
				City:          ad.User.City,
			}
		}
	}

	return c.JSON(responses)
}

// GetMyAds returns user's own ads
func (h *AdsHandler) GetMyAds(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var ads []models.Ad
	if err := database.DB.Preload("Photos").Where("user_id = ?", userID).Order("created_at DESC").Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	return c.JSON(ads)
}

// GetAdCategories returns available categories
func (h *AdsHandler) GetAdCategories(c *fiber.Ctx) error {
	categories := []map[string]interface{}{
		{"id": "yoga_wellness", "emoji": "🧘", "label": map[string]string{"ru": "Йога и Веллнесс", "en": "Yoga & Wellness"}},
		{"id": "ayurveda", "emoji": "🌿", "label": map[string]string{"ru": "Аюрведа", "en": "Ayurveda"}},
		{"id": "goods", "emoji": "📦", "label": map[string]string{"ru": "Товары", "en": "Goods"}},
		{"id": "services", "emoji": "🛠️", "label": map[string]string{"ru": "Услуги", "en": "Services"}},
		{"id": "housing", "emoji": "🏠", "label": map[string]string{"ru": "Жильё", "en": "Housing"}},
		{"id": "furniture", "emoji": "🪑", "label": map[string]string{"ru": "Мебель", "en": "Furniture"}},
		{"id": "spiritual", "emoji": "🕉️", "label": map[string]string{"ru": "Духовные практики", "en": "Spiritual"}},
		{"id": "education", "emoji": "📚", "label": map[string]string{"ru": "Образование", "en": "Education"}},
		{"id": "events", "emoji": "🎭", "label": map[string]string{"ru": "Мероприятия", "en": "Events"}},
		{"id": "charity", "emoji": "💝", "label": map[string]string{"ru": "Благотворительность", "en": "Charity"}},
	}
	return c.JSON(categories)
}

// GetAdCities returns cities with ads
func (h *AdsHandler) GetAdCities(c *fiber.Ctx) error {
	var cities []string
	if err := database.DB.Model(&models.Ad{}).
		Where("status = ?", "active").
		Distinct().
		Pluck("city", &cities).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch cities",
		})
	}
	return c.JSON(cities)
}

// GetAdStats returns statistics about ads
func (h *AdsHandler) GetAdStats(c *fiber.Ctx) error {
	var totalAds int64
	var activeAds int64

	database.DB.Model(&models.Ad{}).Count(&totalAds)
	database.DB.Model(&models.Ad{}).Where("status = ?", "active").Count(&activeAds)

	// Count by category
	type CategoryCount struct {
		Category string
		Count    int64
	}
	var categoryCounts []CategoryCount
	database.DB.Model(&models.Ad{}).
		Select("category, count(*) as count").
		Where("status = ?", "active").
		Group("category").
		Scan(&categoryCounts)

	byCategory := make(map[string]int64)
	for _, cc := range categoryCounts {
		byCategory[cc.Category] = cc.Count
	}

	// Count by type
	type TypeCount struct {
		AdType string
		Count  int64
	}
	var typeCounts []TypeCount
	database.DB.Model(&models.Ad{}).
		Select("ad_type, count(*) as count").
		Where("status = ?", "active").
		Group("ad_type").
		Scan(&typeCounts)

	byType := make(map[string]int64)
	for _, tc := range typeCounts {
		byType[tc.AdType] = tc.Count
	}

	return c.JSON(models.AdStatsResponse{
		TotalAds:   totalAds,
		ActiveAds:  activeAds,
		ByCategory: byCategory,
		ByType:     byType,
	})
}

// ReportAd reports an ad for moderation
func (h *AdsHandler) ReportAd(c *fiber.Ctx) error {
	adID := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	adIDUint, err := strconv.ParseUint(adID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}

	var req struct {
		Reason  string `json:"reason"`
		Comment string `json:"comment"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	report := models.AdReport{
		AdID:       uint(adIDUint),
		ReporterID: userID,
		Reason:     req.Reason,
		Comment:    req.Comment,
	}

	if err := database.DB.Create(&report).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create report",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Report submitted successfully",
	})
}

// UploadAdPhoto uploads a photo for an ad
func (h *AdsHandler) UploadAdPhoto(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No photo provided",
		})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("ads/u%d_%d%s", userID, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				return c.JSON(fiber.Map{
					"url": imageURL,
				})
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := "./uploads/ads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("ads_u%d_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/ads/" + filename
	return c.JSON(fiber.Map{
		"url": imageURL,
	})
}

// ContactSeller initiates a chat with the seller
func (h *AdsHandler) ContactSeller(c *fiber.Ctx) error {
	adID := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Method string `json:"method"` // "message"
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	var ad models.Ad
	if err := database.DB.Preload("User").First(&ad, adID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	if ad.UserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "You cannot message yourself"})
	}

	// Logic for "message" - ensure a private room exists
	if req.Method == "message" {
		var roomID uint
		var roomName string

		// 1. Check for existing private room between these two users
		type Result struct {
			ID   uint
			Name string
		}
		var result Result

		// This query finds a room where both users are members.
		err := database.DB.Raw(`
			SELECT r.id, r.name
			FROM rooms r
			JOIN room_members rm1 ON r.id = rm1.room_id
			JOIN room_members rm2 ON r.id = rm2.room_id
			WHERE r.is_public = false 
			AND rm1.user_id = ? 
			AND rm2.user_id = ?
			LIMIT 1
		`, userID, ad.UserID).Scan(&result).Error

		if err == nil && result.ID != 0 {
			roomID = result.ID
			roomName = result.Name
		} else {
			// 2. Create new private room
			currentUser := models.User{}
			database.DB.First(&currentUser, userID)

			sellerName := ad.User.SpiritualName
			if sellerName == "" {
				sellerName = ad.User.KarmicName
			}

			buyerName := currentUser.SpiritualName
			if buyerName == "" {
				buyerName = currentUser.KarmicName
			}

			roomName = fmt.Sprintf("%s & %s", buyerName, sellerName)
			newRoom := models.Room{
				Name:        roomName,
				Description: fmt.Sprintf("Chat regarding ad: %s", ad.Title),
				OwnerID:     userID,
				IsPublic:    false,
				AiEnabled:   false,
			}

			if err := database.DB.Create(&newRoom).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create chat room"})
			}
			roomID = newRoom.ID

			// Add members
			members := []models.RoomMember{
				{RoomID: roomID, UserID: userID, Role: "admin"},
				{RoomID: roomID, UserID: ad.UserID, Role: "member"},
			}
			database.DB.Create(&members)
		}

		return c.JSON(fiber.Map{
			"success":  true,
			"roomId":   roomID,
			"roomName": roomName,
			"message":  "Chat room ready",
		})
	}

	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only message method is supported"})
}

// ================== ADMIN ENDPOINTS ==================

// GetAdminAds returns all ads with admin filters (including pending/rejected)
func (h *AdsHandler) GetAdminAds(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.Ad{}).Preload("Photos").Preload("User")

	// Filter by status (allow all statuses for admin)
	status := c.Query("status")
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	// Filter by category
	category := c.Query("category")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Filter by ad type
	adType := c.Query("adType")
	if adType != "" {
		query = query.Where("ad_type = ?", adType)
	}

	// Search
	search := c.Query("search")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Filter by user
	userID := c.Query("userId")
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Order by created_at DESC
	query = query.Order("created_at DESC")

	var ads []models.Ad
	if err := query.Offset(offset).Limit(limit).Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	// Build response with author info
	responses := make([]models.AdResponse, len(ads))
	for i, ad := range ads {
		responses[i] = models.AdResponse{
			Ad: ad,
		}
		if ad.User != nil {
			responses[i].Author = &models.AdAuthor{
				ID:            ad.User.ID,
				SpiritualName: ad.User.SpiritualName,
				KarmicName:    ad.User.KarmicName,
				AvatarURL:     ad.User.AvatarURL,
				City:          ad.User.City,
			}
		}
	}

	return c.JSON(fiber.Map{
		"ads":        responses,
		"total":      total,
		"page":       page,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

// UpdateAdStatus updates the status of an ad (approve/reject/archive)
func (h *AdsHandler) UpdateAdStatus(c *fiber.Ctx) error {
	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	var req struct {
		Status  string `json:"status"`
		Comment string `json:"comment"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate status
	validStatuses := map[string]bool{"pending": true, "active": true, "rejected": true, "archived": true}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	// Update ad
	ad.Status = models.AdStatus(req.Status)
	ad.ModerationComment = req.Comment
	now := time.Now().Format(time.RFC3339)
	ad.ModeratedAt = &now

	if err := database.DB.Save(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad status updated",
		"status":  ad.Status,
	})
}

// AdminUpdateAd allows admin to edit any ad
func (h *AdsHandler) AdminUpdateAd(c *fiber.Ctx) error {
	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	var req struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Price       float64 `json:"price"`
		City        string  `json:"city"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Update fields if provided
	if req.Title != "" {
		ad.Title = req.Title
	}
	if req.Description != "" {
		ad.Description = req.Description
	}
	if req.Category != "" {
		ad.Category = models.AdCategory(req.Category)
	}
	if req.Price > 0 {
		ad.Price = &req.Price
	}
	if req.City != "" {
		ad.City = req.City
	}

	if err := database.DB.Save(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad updated successfully",
		"ad":      ad,
	})
}

// AdminDeleteAd permanently deletes an ad
func (h *AdsHandler) AdminDeleteAd(c *fiber.Ctx) error {
	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	// Delete photos
	database.DB.Where("ad_id = ?", adID).Delete(&models.AdPhoto{})

	// Delete favorites
	database.DB.Where("ad_id = ?", adID).Delete(&models.AdFavorite{})

	// Delete reports
	database.DB.Where("ad_id = ?", adID).Delete(&models.AdReport{})

	// Delete ad (hard delete)
	if err := database.DB.Unscoped().Delete(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad deleted permanently",
	})
}

// GetAdminStats returns statistics for the admin dashboard
func (h *AdsHandler) GetAdminStats(c *fiber.Ctx) error {
	var totalAds, pendingAds, activeAds, rejectedAds, archivedAds int64

	database.DB.Model(&models.Ad{}).Count(&totalAds)
	database.DB.Model(&models.Ad{}).Where("status = ?", "pending").Count(&pendingAds)
	database.DB.Model(&models.Ad{}).Where("status = ?", "active").Count(&activeAds)
	database.DB.Model(&models.Ad{}).Where("status = ?", "rejected").Count(&rejectedAds)
	database.DB.Model(&models.Ad{}).Where("status = ?", "archived").Count(&archivedAds)

	// Categories breakdown
	type CategoryCount struct {
		Category string
		Count    int64
	}
	var categoryBreakdown []CategoryCount
	database.DB.Model(&models.Ad{}).
		Select("category, COUNT(*) as count").
		Group("category").
		Scan(&categoryBreakdown)

	categoriesMap := make(map[string]int64)
	for _, cb := range categoryBreakdown {
		categoriesMap[cb.Category] = cb.Count
	}

	return c.JSON(fiber.Map{
		"total":      totalAds,
		"pending":    pendingAds,
		"active":     activeAds,
		"rejected":   rejectedAds,
		"archived":   archivedAds,
		"categories": categoriesMap,
	})
}
