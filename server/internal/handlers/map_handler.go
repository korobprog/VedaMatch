package handlers

import (
	"encoding/json"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// MapHandler handles map-related HTTP requests
type MapHandler struct {
	mapService *services.MapService
}

// NewMapHandler creates a new map handler instance
func NewMapHandler() *MapHandler {
	return &MapHandler{
		mapService: services.NewMapService(database.DB),
	}
}

// GetMarkers returns markers for the given bounding box
// GET /api/map/markers?lat_min=...&lat_max=...&lng_min=...&lng_max=...&categories=user,shop,ad&limit=200
func (h *MapHandler) GetMarkers(c *fiber.Ctx) error {
	req := models.MapMarkersRequest{}

	// Parse bounding box
	latMin, err := strconv.ParseFloat(c.Query("lat_min", "0"), 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lat_min parameter",
		})
	}
	latMax, err := strconv.ParseFloat(c.Query("lat_max", "0"), 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lat_max parameter",
		})
	}
	lngMin, err := strconv.ParseFloat(c.Query("lng_min", "0"), 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lng_min parameter",
		})
	}
	lngMax, err := strconv.ParseFloat(c.Query("lng_max", "0"), 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid lng_max parameter",
		})
	}

	// Validate bounding box
	if latMin == 0 && latMax == 0 && lngMin == 0 && lngMax == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Bounding box parameters are required",
		})
	}

	req.LatMin = latMin
	req.LatMax = latMax
	req.LngMin = lngMin
	req.LngMax = lngMax

	// Parse categories
	categoriesStr := c.Query("categories", "")
	if categoriesStr != "" {
		categories := strings.Split(categoriesStr, ",")
		for _, cat := range categories {
			cat = strings.TrimSpace(cat)
			switch cat {
			case "user":
				req.Categories = append(req.Categories, models.MarkerTypeUser)
			case "shop":
				req.Categories = append(req.Categories, models.MarkerTypeShop)
			case "ad":
				req.Categories = append(req.Categories, models.MarkerTypeAd)
			case "cafe":
				req.Categories = append(req.Categories, models.MarkerTypeCafe)
			}
		}
	}

	// Parse limit
	limit, _ := strconv.Atoi(c.Query("limit", "200"))
	req.Limit = limit

	// Parse user location for distance calculation
	if userLatStr := c.Query("user_lat"); userLatStr != "" {
		if userLat, err := strconv.ParseFloat(userLatStr, 64); err == nil {
			req.UserLat = &userLat
		}
	}
	if userLngStr := c.Query("user_lng"); userLngStr != "" {
		if userLng, err := strconv.ParseFloat(userLngStr, 64); err == nil {
			req.UserLng = &userLng
		}
	}

	result, err := h.mapService.GetMarkers(req)
	if err != nil {
		log.Printf("[MapHandler] GetMarkers error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get markers",
		})
	}

	return c.JSON(result)
}

// GetSummary returns cluster summary by cities
// GET /api/map/summary
func (h *MapHandler) GetSummary(c *fiber.Ctx) error {
	result, err := h.mapService.GetSummary()
	if err != nil {
		log.Printf("[MapHandler] GetSummary error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get summary",
		})
	}

	return c.JSON(result)
}

// GetRoute proxies routing request to Geoapify
// POST /api/map/route
func (h *MapHandler) GetRoute(c *fiber.Ctx) error {
	var req models.GeoapifyRouteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate coordinates
	if req.StartLat == 0 || req.StartLng == 0 || req.EndLat == 0 || req.EndLng == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Start and end coordinates are required",
		})
	}

	result, err := h.mapService.GetRoute(req)
	if err != nil {
		log.Printf("[MapHandler] GetRoute error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get route",
		})
	}

	return c.JSON(result)
}

// Autocomplete proxies autocomplete request to Geoapify
// GET /api/map/autocomplete?text=...&lat=...&lng=...&limit=5
func (h *MapHandler) Autocomplete(c *fiber.Ctx) error {
	text := c.Query("text", "")
	if text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Search text is required",
		})
	}

	req := models.GeoapifyAutocompleteRequest{
		Text: text,
	}

	// Parse optional location bias
	if latStr := c.Query("lat"); latStr != "" {
		if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
			req.Lat = &lat
		}
	}
	if lngStr := c.Query("lng"); lngStr != "" {
		if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
			req.Lng = &lng
		}
	}

	limit, _ := strconv.Atoi(c.Query("limit", "5"))
	req.Limit = limit

	result, err := h.mapService.Autocomplete(req)
	if err != nil {
		log.Printf("[MapHandler] Autocomplete error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to autocomplete",
		})
	}

	return c.JSON(result)
}

// GetTileConfig returns the tile configuration for the client
// GET /api/map/config
func (h *MapHandler) GetTileConfig(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"tileUrl":     h.mapService.GetTileURL(),
		"maxZoom":     19,
		"tileSize":    256,
		"retina":      true,
		"attribution": "© Geoapify",
	})
}

// GetMarkerConfig returns marker configuration (icons, colors) for admin
// GET /api/admin/map/config
func (h *MapHandler) GetMarkerConfig(c *fiber.Ctx) error {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "map_config").First(&setting).Error; err == nil {
		var config map[string]interface{}
		if err := json.Unmarshal([]byte(setting.Value), &config); err == nil {
			return c.JSON(config)
		}
	}

	// Default marker configuration if not found in DB
	config := fiber.Map{
		"markers": fiber.Map{
			"user": fiber.Map{"icon": "account", "color": "#7C3AED"},
			"shop": fiber.Map{"icon": "store", "color": "#059669"},
			"ad":   fiber.Map{"icon": "tag", "color": "#DC2626"},
			"cafe": fiber.Map{"icon": "coffee", "color": "#EA580C"},
		},
		"cluster": fiber.Map{
			"minSize": 24,
			"maxSize": 48,
			"colors": fiber.Map{
				"small":  "#FCD34D",
				"medium": "#FB923C",
				"large":  "#EF4444",
			},
		},
	}

	return c.JSON(config)
}

// UpdateMarkerConfig updates map configuration in database
// POST /api/admin/map/config
func (h *MapHandler) UpdateMarkerConfig(c *fiber.Ctx) error {
	var config map[string]interface{}
	if err := c.BodyParser(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	configBytes, err := json.Marshal(config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to serialize config"})
	}

	var setting models.SystemSetting
	result := database.DB.Where("key = ?", "map_config").First(&setting)

	if result.Error != nil {
		setting = models.SystemSetting{
			Key:   "map_config",
			Value: string(configBytes),
		}
		if err := database.DB.Create(&setting).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create config"})
		}
	} else {
		setting.Value = string(configBytes)
		if err := database.DB.Save(&setting).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update config"})
		}
	}

	return c.JSON(fiber.Map{"status": "success", "config": config})
}

// AdminGetAllMarkers returns all markers without bounding box restriction (for admin)
// GET /api/admin/map/markers
func (h *MapHandler) AdminGetAllMarkers(c *fiber.Ctx) error {
	// Large bounding box to cover the world
	req := models.MapMarkersRequest{
		MapBoundingBox: models.MapBoundingBox{
			LatMin: -90,
			LatMax: 90,
			LngMin: -180,
			LngMax: 180,
		},
		Limit: 1000,
	}

	// Parse categories
	categoriesStr := c.Query("categories", "")
	if categoriesStr != "" {
		categories := strings.Split(categoriesStr, ",")
		for _, cat := range categories {
			cat = strings.TrimSpace(cat)
			switch cat {
			case "user":
				req.Categories = append(req.Categories, models.MarkerTypeUser)
			case "shop":
				req.Categories = append(req.Categories, models.MarkerTypeShop)
			case "ad":
				req.Categories = append(req.Categories, models.MarkerTypeAd)
			case "cafe":
				req.Categories = append(req.Categories, models.MarkerTypeCafe)
			}
		}
	}

	result, err := h.mapService.GetMarkers(req)
	if err != nil {
		log.Printf("[MapHandler] AdminGetAllMarkers error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get markers",
		})
	}

	return c.JSON(result)
}

// ToggleMarkerVisibility toggles the visibility/status of an entity from the map
// POST /api/admin/map/markers/:type/:id/toggle
func (h *MapHandler) ToggleMarkerVisibility(c *fiber.Ctx) error {
	markerType := c.Params("type")
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	db := database.DB

	switch markerType {
	case "user":
		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{"error": "Use Users Management to manage users"})

	case "shop":
		var shop models.Shop
		if err := db.First(&shop, id).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Shop not found"})
		}
		if shop.Status == "active" {
			shop.Status = "hidden"
		} else {
			shop.Status = "active"
		}
		if err := db.Save(&shop).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update shop"})
		}
		return c.JSON(fiber.Map{"status": shop.Status})

	case "ad":
		var ad models.Ad
		if err := db.First(&ad, id).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
		}
		if ad.Status == "active" {
			ad.Status = "hidden"
		} else {
			ad.Status = "active"
		}
		if err := db.Save(&ad).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update ad"})
		}
		return c.JSON(fiber.Map{"status": ad.Status})
	}

	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid marker type"})
}
