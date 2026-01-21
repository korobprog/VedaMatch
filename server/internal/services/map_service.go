package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

// MapService handles map-related operations
type MapService struct {
	db             *gorm.DB
	geoapifyAPIKey string
	httpClient     *http.Client
}

// NewMapService creates a new map service instance
func NewMapService(db *gorm.DB) *MapService {
	return &MapService{
		db:             db,
		geoapifyAPIKey: os.Getenv("MAP_GEOAPIFY"),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetMarkers retrieves markers for the given bounding box and categories
func (s *MapService) GetMarkers(req models.MapMarkersRequest) (*models.MapMarkersResponse, error) {
	var markers []models.MapMarker
	limit := req.Limit
	if limit <= 0 || limit > 2000 {
		limit = 200
	}

	// Calculate limits per category
	categoryCount := len(req.Categories)
	if categoryCount == 0 {
		// Default to all categories
		req.Categories = []models.MarkerType{
			models.MarkerTypeUser,
			models.MarkerTypeShop,
			models.MarkerTypeAd,
			models.MarkerTypeCafe,
		}
		categoryCount = 4
	}
	limitPerCategory := limit / categoryCount

	var truncatedUsers, truncatedShops, truncatedAds, truncatedCafes int

	for _, cat := range req.Categories {
		switch cat {
		case models.MarkerTypeUser:
			userMarkers, truncated := s.getUserMarkers(req.MapBoundingBox, req.UserLat, req.UserLng, limitPerCategory)
			markers = append(markers, userMarkers...)
			truncatedUsers = truncated
		case models.MarkerTypeShop:
			shopMarkers, truncated := s.getShopMarkers(req.MapBoundingBox, req.UserLat, req.UserLng, limitPerCategory)
			markers = append(markers, shopMarkers...)
			truncatedShops = truncated
		case models.MarkerTypeAd:
			adMarkers, truncated := s.getAdMarkers(req.MapBoundingBox, req.UserLat, req.UserLng, limitPerCategory)
			markers = append(markers, adMarkers...)
			truncatedAds = truncated
		case models.MarkerTypeCafe:
			cafeMarkers, truncated := s.getCafeMarkers(req.MapBoundingBox, req.UserLat, req.UserLng, limitPerCategory)
			markers = append(markers, cafeMarkers...)
			truncatedCafes = truncated
		}
	}

	return &models.MapMarkersResponse{
		Markers:    markers,
		Total:      len(markers),
		TruncatedU: truncatedUsers,
		TruncatedS: truncatedShops,
		TruncatedA: truncatedAds,
		TruncatedC: truncatedCafes,
	}, nil
}

// getUserMarkers retrieves user markers from the database
func (s *MapService) getUserMarkers(bbox models.MapBoundingBox, userLat, userLng *float64, limit int) ([]models.MapMarker, int) {
	var users []models.User
	var totalCount int64

	query := s.db.Model(&models.User{}).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("latitude >= ? AND latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("longitude >= ? AND longitude <= ?", bbox.LngMin, bbox.LngMax).
		Where("is_blocked = ?", false)

	query.Count(&totalCount)

	if userLat != nil && userLng != nil {
		// Order by distance if user location provided
		query = query.Order(fmt.Sprintf(
			"((%f - latitude) * (%f - latitude) + (%f - longitude) * (%f - longitude)) ASC",
			*userLat, *userLat, *userLng, *userLng,
		))
	}

	query.Limit(limit).Find(&users)

	markers := make([]models.MapMarker, 0, len(users))
	for _, user := range users {
		if user.Latitude == nil || user.Longitude == nil {
			continue
		}

		name := user.SpiritualName
		if name == "" {
			name = user.KarmicName
		}

		var distance float64
		if userLat != nil && userLng != nil {
			distance = haversineDistance(*userLat, *userLng, *user.Latitude, *user.Longitude)
		}

		markers = append(markers, models.MapMarker{
			ID:        user.ID,
			Type:      models.MarkerTypeUser,
			Title:     name,
			Subtitle:  user.City,
			Latitude:  *user.Latitude,
			Longitude: *user.Longitude,
			AvatarURL: user.AvatarURL,
			Category:  user.Identity,
			Distance:  distance,
			Status:    "active", // Users in this query are not blocked
			Data: map[string]any{
				"yatra":         user.Yatra,
				"datingEnabled": user.DatingEnabled,
			},
		})
	}

	truncated := 0
	if int(totalCount) > limit {
		truncated = int(totalCount) - limit
	}

	return markers, truncated
}

// getShopMarkers retrieves shop markers from the database
func (s *MapService) getShopMarkers(bbox models.MapBoundingBox, userLat, userLng *float64, limit int) ([]models.MapMarker, int) {
	var shops []models.Shop
	var totalCount int64

	query := s.db.Model(&models.Shop{}).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("latitude >= ? AND latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("longitude >= ? AND longitude <= ?", bbox.LngMin, bbox.LngMax).
		Where("status = ?", models.ShopStatusActive)

	query.Count(&totalCount)

	if userLat != nil && userLng != nil {
		query = query.Order(fmt.Sprintf(
			"((%f - latitude) * (%f - latitude) + (%f - longitude) * (%f - longitude)) ASC",
			*userLat, *userLat, *userLng, *userLng,
		))
	}

	query.Limit(limit).Find(&shops)

	markers := make([]models.MapMarker, 0, len(shops))
	for _, shop := range shops {
		if shop.Latitude == nil || shop.Longitude == nil {
			continue
		}

		var distance float64
		if userLat != nil && userLng != nil {
			distance = haversineDistance(*userLat, *userLng, *shop.Latitude, *shop.Longitude)
		}

		markers = append(markers, models.MapMarker{
			ID:        shop.ID,
			Type:      models.MarkerTypeShop,
			Title:     shop.Name,
			Subtitle:  shop.City,
			Latitude:  *shop.Latitude,
			Longitude: *shop.Longitude,
			AvatarURL: shop.LogoURL,
			Category:  string(shop.Category),
			Rating:    shop.Rating,
			Distance:  distance,
			Status:    string(shop.Status),
			Data: map[string]any{
				"description":   shop.Description,
				"productsCount": shop.ProductsCount,
				"reviewsCount":  shop.ReviewsCount,
			},
		})
	}

	truncated := 0
	if int(totalCount) > limit {
		truncated = int(totalCount) - limit
	}

	return markers, truncated
}

// getAdMarkers retrieves ad markers from the database
func (s *MapService) getAdMarkers(bbox models.MapBoundingBox, userLat, userLng *float64, limit int) ([]models.MapMarker, int) {
	var ads []models.Ad
	var totalCount int64

	query := s.db.Model(&models.Ad{}).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("latitude >= ? AND latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("longitude >= ? AND longitude <= ?", bbox.LngMin, bbox.LngMax).
		Where("status = ?", models.AdStatusActive)

	query.Count(&totalCount)

	if userLat != nil && userLng != nil {
		query = query.Order(fmt.Sprintf(
			"((%f - latitude) * (%f - latitude) + (%f - longitude) * (%f - longitude)) ASC",
			*userLat, *userLat, *userLng, *userLng,
		))
	}

	query.Limit(limit).Preload("Photos").Find(&ads)

	markers := make([]models.MapMarker, 0, len(ads))
	for _, ad := range ads {
		if ad.Latitude == nil || ad.Longitude == nil {
			continue
		}

		var distance float64
		if userLat != nil && userLng != nil {
			distance = haversineDistance(*userLat, *userLng, *ad.Latitude, *ad.Longitude)
		}

		// Get first photo URL if available
		avatarURL := ""
		if len(ad.Photos) > 0 {
			avatarURL = ad.Photos[0].PhotoURL
		}

		markers = append(markers, models.MapMarker{
			ID:        ad.ID,
			Type:      models.MarkerTypeAd,
			Title:     ad.Title,
			Subtitle:  ad.City,
			Latitude:  *ad.Latitude,
			Longitude: *ad.Longitude,
			AvatarURL: avatarURL,
			Category:  string(ad.Category),
			Distance:  distance,
			Status:    string(ad.Status),
			Data: map[string]any{
				"adType":   ad.AdType,
				"price":    ad.Price,
				"currency": ad.Currency,
				"isFree":   ad.IsFree,
			},
		})
	}

	truncated := 0
	if int(totalCount) > limit {
		truncated = int(totalCount) - limit
	}

	return markers, truncated
}

// getCafeMarkers retrieves cafe markers from the database
func (s *MapService) getCafeMarkers(bbox models.MapBoundingBox, userLat, userLng *float64, limit int) ([]models.MapMarker, int) {
	var cafes []models.Cafe
	var totalCount int64

	query := s.db.Model(&models.Cafe{}).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("latitude >= ? AND latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("longitude >= ? AND longitude <= ?", bbox.LngMin, bbox.LngMax).
		Where("status = ?", models.CafeStatusActive)

	query.Count(&totalCount)

	if userLat != nil && userLng != nil {
		query = query.Order(fmt.Sprintf(
			"((%f - latitude) * (%f - latitude) + (%f - longitude) * (%f - longitude)) ASC",
			*userLat, *userLat, *userLng, *userLng,
		))
	}

	query.Limit(limit).Find(&cafes)

	markers := make([]models.MapMarker, 0, len(cafes))
	for _, cafe := range cafes {
		if cafe.Latitude == nil || cafe.Longitude == nil {
			continue
		}

		var distance float64
		if userLat != nil && userLng != nil {
			distance = haversineDistance(*userLat, *userLng, *cafe.Latitude, *cafe.Longitude)
		}

		markers = append(markers, models.MapMarker{
			ID:        cafe.ID,
			Type:      models.MarkerTypeCafe,
			Title:     cafe.Name,
			Subtitle:  cafe.Address,
			Latitude:  *cafe.Latitude,
			Longitude: *cafe.Longitude,
			AvatarURL: cafe.LogoURL,
			Category:  "cafe",
			Rating:    cafe.Rating,
			Distance:  distance,
			Status:    string(cafe.Status),
			Data: map[string]any{
				"hasDelivery": cafe.HasDelivery,
				"hasTakeaway": cafe.HasTakeaway,
				"hasDineIn":   cafe.HasDineIn,
				"avgPrepTime": cafe.AvgPrepTime,
			},
		})
	}

	truncated := 0
	if int(totalCount) > limit {
		truncated = int(totalCount) - limit
	}

	return markers, truncated
}

// GetSummary retrieves cluster summary by cities
func (s *MapService) GetSummary() (*models.MapSummaryResponse, error) {
	log.Println("[MapService] GetSummary called")
	clusters := make(map[string]*models.MapCluster)

	var totalUsersWithCoords int64
	s.db.Model(&models.User{}).Where("latitude IS NOT NULL AND longitude IS NOT NULL AND is_blocked = ?", false).Count(&totalUsersWithCoords)

	var totalShopsWithCoords int64
	s.db.Model(&models.Shop{}).Where("latitude IS NOT NULL AND longitude IS NOT NULL AND status = ?", models.ShopStatusActive).Count(&totalShopsWithCoords)

	var totalAdsWithCoords int64
	s.db.Model(&models.Ad{}).Where("latitude IS NOT NULL AND longitude IS NOT NULL AND status = ?", models.AdStatusActive).Count(&totalAdsWithCoords)

	log.Printf("[MapService] GetSummary: Users: %d, Shops: %d, Ads: %d", totalUsersWithCoords, totalShopsWithCoords, totalAdsWithCoords)

	// Get user counts by city
	var userStats []struct {
		City      string
		Latitude  float64
		Longitude float64
		Count     int
	}

	s.db.Model(&models.User{}).
		Select("city, AVG(latitude) as latitude, AVG(longitude) as longitude, COUNT(*) as count").
		Where("city IS NOT NULL AND city != ''").
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("is_blocked = ?", false).
		Group("city").
		Scan(&userStats)

	for _, stat := range userStats {
		if stat.City == "" {
			continue
		}
		key := strings.ToLower(stat.City)
		if _, exists := clusters[key]; !exists {
			clusters[key] = &models.MapCluster{
				City:      stat.City,
				Latitude:  stat.Latitude,
				Longitude: stat.Longitude,
			}
		}
		clusters[key].UserCount = stat.Count
		clusters[key].TotalCount += stat.Count
	}

	// Get shop counts by city
	var shopStats []struct {
		City      string
		Latitude  float64
		Longitude float64
		Count     int
	}

	s.db.Model(&models.Shop{}).
		Select("city, AVG(latitude) as latitude, AVG(longitude) as longitude, COUNT(*) as count").
		Where("city IS NOT NULL AND city != ''").
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("status = ?", models.ShopStatusActive).
		Group("city").
		Scan(&shopStats)

	for _, stat := range shopStats {
		if stat.City == "" {
			continue
		}
		key := strings.ToLower(stat.City)
		if _, exists := clusters[key]; !exists {
			clusters[key] = &models.MapCluster{
				City:      stat.City,
				Latitude:  stat.Latitude,
				Longitude: stat.Longitude,
			}
		}
		clusters[key].ShopCount = stat.Count
		clusters[key].TotalCount += stat.Count
	}

	// Get ad counts by city
	var adStats []struct {
		City      string
		Latitude  float64
		Longitude float64
		Count     int
	}

	s.db.Model(&models.Ad{}).
		Select("city, AVG(latitude) as latitude, AVG(longitude) as longitude, COUNT(*) as count").
		Where("city IS NOT NULL AND city != ''").
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("status = ?", models.AdStatusActive).
		Group("city").
		Scan(&adStats)

	for _, stat := range adStats {
		if stat.City == "" {
			continue
		}
		key := strings.ToLower(stat.City)
		if _, exists := clusters[key]; !exists {
			clusters[key] = &models.MapCluster{
				City:      stat.City,
				Latitude:  stat.Latitude,
				Longitude: stat.Longitude,
			}
		}
		clusters[key].AdCount = stat.Count
		clusters[key].TotalCount += stat.Count
	}

	// Get cafe counts by city
	var cafeStats []struct {
		City      string
		Latitude  float64
		Longitude float64
		Count     int
	}

	s.db.Model(&models.Cafe{}).
		Select("city, AVG(latitude) as latitude, AVG(longitude) as longitude, COUNT(*) as count").
		Where("city IS NOT NULL AND city != ''").
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("status = ?", models.CafeStatusActive).
		Group("city").
		Scan(&cafeStats)

	for _, stat := range cafeStats {
		if stat.City == "" {
			continue
		}
		key := strings.ToLower(stat.City)
		if _, exists := clusters[key]; !exists {
			clusters[key] = &models.MapCluster{
				City:      stat.City,
				Latitude:  stat.Latitude,
				Longitude: stat.Longitude,
			}
		}
		clusters[key].CafeCount = stat.Count
		clusters[key].TotalCount += stat.Count
	}

	// Convert map to slice
	result := make([]models.MapCluster, 0, len(clusters))
	for _, cluster := range clusters {
		result = append(result, *cluster)
	}

	return &models.MapSummaryResponse{
		Clusters: result,
		Total:    len(result),
	}, nil
}

// GetRoute proxies routing request to Geoapify
func (s *MapService) GetRoute(req models.GeoapifyRouteRequest) (map[string]any, error) {
	mode := req.Mode
	if mode == "" {
		mode = "walk"
	}

	url := fmt.Sprintf(
		"https://api.geoapify.com/v1/routing?waypoints=%f,%f|%f,%f&mode=%s&apiKey=%s",
		req.StartLat, req.StartLng,
		req.EndLat, req.EndLng,
		mode,
		s.geoapifyAPIKey,
	)

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch route: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return result, nil
}

// Autocomplete proxies autocomplete request to Geoapify
func (s *MapService) Autocomplete(req models.GeoapifyAutocompleteRequest) (map[string]any, error) {
	limit := req.Limit
	if limit <= 0 || limit > 10 {
		limit = 5
	}

	url := fmt.Sprintf(
		"https://api.geoapify.com/v1/geocode/autocomplete?text=%s&limit=%d&apiKey=%s",
		req.Text,
		limit,
		s.geoapifyAPIKey,
	)

	// Add bias if location provided
	if req.Lat != nil && req.Lng != nil {
		url += fmt.Sprintf("&bias=proximity:%f,%f", *req.Lng, *req.Lat)
	}

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch autocomplete: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return result, nil
}

// GetTileURL returns the tile URL template for Geoapify
func (s *MapService) GetTileURL() string {
	// Using positron-smooth-dark style for Vedic-friendly dark theme
	return fmt.Sprintf(
		"https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}@2x.png?apiKey=%s",
		s.geoapifyAPIKey,
	)
}

// haversineDistance calculates the distance between two points in km
func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth radius in km

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLon/2)*math.Sin(deltaLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// GeocodedCity represents the result of geocoding a city
type GeocodedCity struct {
	City      string
	Country   string
	Latitude  float64
	Longitude float64
}

// GeocodeCity geocodes a city name and returns normalized city name with coordinates
func (s *MapService) GeocodeCity(cityName string) (*GeocodedCity, error) {
	if cityName == "" {
		return nil, fmt.Errorf("city name is empty")
	}

	// Use Geoapify geocoding API with type=city filter
	url := fmt.Sprintf(
		"https://api.geoapify.com/v1/geocode/search?text=%s&type=city&limit=1&apiKey=%s",
		cityName,
		s.geoapifyAPIKey,
	)

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to geocode city: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read geocode response: %w", err)
	}

	var result struct {
		Features []struct {
			Properties struct {
				City    string  `json:"city"`
				Country string  `json:"country"`
				Lat     float64 `json:"lat"`
				Lon     float64 `json:"lon"`
			} `json:"properties"`
		} `json:"features"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse geocode response: %w", err)
	}

	if len(result.Features) == 0 {
		return nil, fmt.Errorf("city not found: %s", cityName)
	}

	feature := result.Features[0].Properties

	// Normalize city name - use the one from API response
	normalizedCity := feature.City
	if normalizedCity == "" {
		// Fallback: use original but clean it up
		normalizedCity = strings.TrimSpace(cityName)
	}

	return &GeocodedCity{
		City:      normalizedCity,
		Country:   feature.Country,
		Latitude:  feature.Lat,
		Longitude: feature.Lon,
	}, nil
}

// GeocodedLocation represents the result of geocoding an address/location
type GeocodedLocation struct {
	Formatted string
	City      string
	Country   string
	Latitude  float64
	Longitude float64
}

// GeocodeLocation geocodes an address string and returns coordinates
func (s *MapService) GeocodeLocation(query string) (*GeocodedLocation, error) {
	if query == "" {
		return nil, fmt.Errorf("query is empty")
	}

	// Use Geoapify geocoding API without type restriction
	url := fmt.Sprintf(
		"https://api.geoapify.com/v1/geocode/search?text=%s&limit=1&apiKey=%s",
		strings.ReplaceAll(query, " ", "%20"),
		s.geoapifyAPIKey,
	)

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to geocode location: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read geocode response: %w", err)
	}

	var result struct {
		Features []struct {
			Properties struct {
				Formatted string  `json:"formatted"`
				City      string  `json:"city"`
				Country   string  `json:"country"`
				Lat       float64 `json:"lat"`
				Lon       float64 `json:"lon"`
			} `json:"properties"`
		} `json:"features"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse geocode response: %w", err)
	}

	if len(result.Features) == 0 {
		return nil, fmt.Errorf("location not found: %s", query)
	}

	feature := result.Features[0].Properties

	return &GeocodedLocation{
		Formatted: feature.Formatted,
		City:      feature.City,
		Country:   feature.Country,
		Latitude:  feature.Lat,
		Longitude: feature.Lon,
	}, nil
}
