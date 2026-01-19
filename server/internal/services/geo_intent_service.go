package services

import (
	"context"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
)

// GeoIntent represents detected geographic intent from user query
type GeoIntent struct {
	Type        string             `json:"type"`        // "search_users", "search_shops", "search_ads", "find_nearby", "route"
	SearchQuery string             `json:"searchQuery"` // Original search query
	Filters     GeoFilters         `json:"filters"`     // Categories to show
	FocusCity   string             `json:"focusCity"`   // City to focus on
	Markers     []models.MapMarker `json:"markers"`     // Found markers
}

// GeoFilters specifies which categories to display
type GeoFilters struct {
	ShowUsers bool `json:"showUsers"`
	ShowShops bool `json:"showShops"`
	ShowAds   bool `json:"showAds"`
}

// GeoIntentService detects geographic intents and provides map data
type GeoIntentService struct {
	mapService *MapService
}

// NewGeoIntentService creates a new geo intent service
func NewGeoIntentService(mapService *MapService) *GeoIntentService {
	return &GeoIntentService{
		mapService: mapService,
	}
}

// GeoKeywords for intent detection
var geoKeywords = map[string][]string{
	"location": {
		"где", "найти", "найди", "поблизости", "рядом", "ближайший", "покажи на карте",
		"where", "find", "nearby", "closest", "show on map", "location",
	},
	"users": {
		"люди", "пользователи", "преданные", "вайшнавы", "кто рядом", "кто живет",
		"people", "users", "devotees", "vaishnavas", "who lives",
	},
	"shops": {
		"магазин", "магазины", "где купить", "товары", "продукты", "прасад",
		"shop", "shops", "store", "where to buy", "products", "prasadam",
	},
	"ads": {
		"объявления", "сдается", "куплю", "продам", "услуги", "работа",
		"ads", "listings", "for sale", "looking for", "services", "jobs",
	},
	"city": {
		"в москве", "в питере", "в санкт-петербурге", "в городе", "город",
		"in moscow", "in saint petersburg", "in city", "city",
	},
}

// DetectGeoIntent analyzes user message and detects geographic intent
func (s *GeoIntentService) DetectGeoIntent(ctx context.Context, userMessage string) (*GeoIntent, error) {
	messageLower := strings.ToLower(userMessage)

	// Check if message contains location-related keywords
	hasLocationIntent := false
	for _, kw := range geoKeywords["location"] {
		if strings.Contains(messageLower, kw) {
			hasLocationIntent = true
			break
		}
	}

	if !hasLocationIntent {
		return nil, nil // No geo intent detected
	}

	log.Printf("[GeoIntentService] Detected location intent in message: %s", userMessage)

	// Determine filters based on keywords
	filters := GeoFilters{
		ShowUsers: true,
		ShowShops: true,
		ShowAds:   true,
	}

	// Check for specific category mentions
	hasUsers := geoContainsKeyword(messageLower, geoKeywords["users"])
	hasShops := geoContainsKeyword(messageLower, geoKeywords["shops"])
	hasAds := geoContainsKeyword(messageLower, geoKeywords["ads"])

	// If any specific category is mentioned, filter to only those
	if hasUsers || hasShops || hasAds {
		filters = GeoFilters{
			ShowUsers: hasUsers,
			ShowShops: hasShops,
			ShowAds:   hasAds,
		}
	}

	// Detect city mention
	focusCity := s.extractCity(messageLower)

	// Create intent
	intent := &GeoIntent{
		Type:        "search_map",
		SearchQuery: userMessage,
		Filters:     filters,
		FocusCity:   focusCity,
	}

	// Fetch relevant markers based on intent
	markers, err := s.fetchMarkersForIntent(intent)
	if err != nil {
		log.Printf("[GeoIntentService] Error fetching markers: %v", err)
	} else {
		intent.Markers = markers
	}

	return intent, nil
}

// geoContainsKeyword checks if text contains any of the keywords
func geoContainsKeyword(text string, keywords []string) bool {
	for _, kw := range keywords {
		if strings.Contains(text, kw) {
			return true
		}
	}
	return false
}

// extractCity tries to extract city name from message
func (s *GeoIntentService) extractCity(messageLower string) string {
	cityPatterns := map[string]string{
		"в москве":            "Москва",
		"в питере":            "Санкт-Петербург",
		"в санкт-петербурге":  "Санкт-Петербург",
		"в екатеринбурге":     "Екатеринбург",
		"в новосибирске":      "Новосибирск",
		"в казани":            "Казань",
		"in moscow":           "Москва",
		"in saint petersburg": "Санкт-Петербург",
	}

	for pattern, city := range cityPatterns {
		if strings.Contains(messageLower, pattern) {
			return city
		}
	}

	return ""
}

// fetchMarkersForIntent gets markers based on intent
func (s *GeoIntentService) fetchMarkersForIntent(intent *GeoIntent) ([]models.MapMarker, error) {
	var markers []models.MapMarker
	db := database.DB

	limit := 5 // Limit markers shown in chat response

	// Fetch users if needed
	if intent.Filters.ShowUsers {
		var users []models.User
		query := db.Where("latitude IS NOT NULL AND longitude IS NOT NULL")
		if intent.FocusCity != "" {
			query = query.Where("city = ?", intent.FocusCity)
		}
		if err := query.Limit(limit).Find(&users).Error; err == nil {
			for _, u := range users {
				// Skip users without coordinates
				if u.Latitude == nil || u.Longitude == nil {
					continue
				}
				name := u.SpiritualName
				if name == "" {
					name = u.KarmicName
				}
				markers = append(markers, models.MapMarker{
					ID:        u.ID,
					Type:      models.MarkerTypeUser,
					Title:     name,
					Subtitle:  u.City,
					Latitude:  *u.Latitude,
					Longitude: *u.Longitude,
					AvatarURL: u.AvatarURL,
				})
			}
		}
	}

	// Fetch shops if needed
	if intent.Filters.ShowShops {
		var shops []models.Shop
		query := db.Where("latitude IS NOT NULL AND longitude IS NOT NULL AND status = ?", "active")
		if intent.FocusCity != "" {
			query = query.Where("city = ?", intent.FocusCity)
		}
		if err := query.Limit(limit).Find(&shops).Error; err == nil {
			for _, sh := range shops {
				// Skip shops without coordinates
				if sh.Latitude == nil || sh.Longitude == nil {
					continue
				}
				markers = append(markers, models.MapMarker{
					ID:        sh.ID,
					Type:      models.MarkerTypeShop,
					Title:     sh.Name,
					Subtitle:  sh.City,
					Latitude:  *sh.Latitude,
					Longitude: *sh.Longitude,
					AvatarURL: sh.LogoURL,
					Category:  string(sh.Category),
					Rating:    sh.Rating,
				})
			}
		}
	}

	// Fetch ads if needed
	if intent.Filters.ShowAds {
		var ads []models.Ad
		query := db.Where("latitude IS NOT NULL AND longitude IS NOT NULL AND status = ?", "active")
		if intent.FocusCity != "" {
			query = query.Where("city = ?", intent.FocusCity)
		}
		if err := query.Limit(limit).Find(&ads).Error; err == nil {
			for _, ad := range ads {
				// Skip ads without coordinates
				if ad.Latitude == nil || ad.Longitude == nil {
					continue
				}
				// Get first photo URL if available
				var imageURL string
				if len(ad.Photos) > 0 {
					imageURL = ad.Photos[0].PhotoURL
				}
				markers = append(markers, models.MapMarker{
					ID:        ad.ID,
					Type:      models.MarkerTypeAd,
					Title:     ad.Title,
					Subtitle:  ad.City,
					Latitude:  *ad.Latitude,
					Longitude: *ad.Longitude,
					AvatarURL: imageURL,
					Category:  string(ad.Category),
				})
			}
		}
	}

	return markers, nil
}

// FormatMapResponse formats geo intent as AI-friendly response with metadata
func (s *GeoIntentService) FormatMapResponse(intent *GeoIntent) (string, map[string]interface{}) {
	if intent == nil || len(intent.Markers) == 0 {
		return "", nil
	}

	// Build text response
	var response strings.Builder
	response.WriteString("🗺️ Вот что я нашел на карте:\n\n")

	// Group by type
	userCount, shopCount, adCount := 0, 0, 0
	for _, m := range intent.Markers {
		switch m.Type {
		case models.MarkerTypeUser:
			userCount++
		case models.MarkerTypeShop:
			shopCount++
		case models.MarkerTypeAd:
			adCount++
		}
	}

	if userCount > 0 {
		response.WriteString("👤 **Люди:** ")
		first := true
		for _, m := range intent.Markers {
			if m.Type == models.MarkerTypeUser {
				if !first {
					response.WriteString(", ")
				}
				response.WriteString(m.Title)
				if m.Subtitle != "" {
					response.WriteString(" (" + m.Subtitle + ")")
				}
				first = false
			}
		}
		response.WriteString("\n\n")
	}

	if shopCount > 0 {
		response.WriteString("🏪 **Магазины:** ")
		first := true
		for _, m := range intent.Markers {
			if m.Type == models.MarkerTypeShop {
				if !first {
					response.WriteString(", ")
				}
				response.WriteString(m.Title)
				if m.Subtitle != "" {
					response.WriteString(" (" + m.Subtitle + ")")
				}
				first = false
			}
		}
		response.WriteString("\n\n")
	}

	if adCount > 0 {
		response.WriteString("📢 **Объявления:** ")
		first := true
		for _, m := range intent.Markers {
			if m.Type == models.MarkerTypeAd {
				if !first {
					response.WriteString(", ")
				}
				response.WriteString(m.Title)
				first = false
			}
		}
		response.WriteString("\n\n")
	}

	response.WriteString("Нажмите **\"Показать на карте\"** чтобы увидеть расположение.")

	// Build mapData for frontend
	mapData := map[string]interface{}{
		"markers": intent.Markers,
		"filters": map[string]bool{
			"showUsers": intent.Filters.ShowUsers,
			"showShops": intent.Filters.ShowShops,
			"showAds":   intent.Filters.ShowAds,
		},
		"searchQuery": intent.SearchQuery,
	}

	if intent.FocusCity != "" {
		// Get city coordinates from first marker in that city
		for _, m := range intent.Markers {
			if m.Subtitle == intent.FocusCity {
				mapData["focusLocation"] = map[string]interface{}{
					"latitude":  m.Latitude,
					"longitude": m.Longitude,
					"zoom":      12,
				}
				break
			}
		}
	}

	return response.String(), mapData
}
