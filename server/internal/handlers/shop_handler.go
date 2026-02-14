package handlers

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ShopHandler struct {
	service *services.ShopService
}

func (h *ShopHandler) UploadShopPhoto(c *fiber.Ctx) error {
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
			fileName := fmt.Sprintf("shops/u%d_%d%s", userID, time.Now().Unix(), ext)
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
	uploadsDir := "./uploads/shops"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("shop_u%d_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/shops/" + filename
	return c.JSON(fiber.Map{
		"url": imageURL,
	})
}

func NewShopHandler() *ShopHandler {
	return &ShopHandler{
		service: services.NewShopService(),
	}
}

// ==================== PUBLIC ENDPOINTS ====================

// GetShops returns a paginated list of shops with filters
func (h *ShopHandler) GetShops(c *fiber.Ctx) error {
	filters := models.ShopFilters{
		Category: models.ShopCategory(c.Query("category")),
		City:     c.Query("city"),
		Status:   models.ShopStatus(c.Query("status")),
		Search:   c.Query("search"),
		Sort:     c.Query("sort", "newest"),
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	filters.Page = page
	filters.Limit = limit

	// Parse geo filters
	if lat := c.Query("nearLat"); lat != "" {
		if latVal, err := strconv.ParseFloat(lat, 64); err == nil {
			filters.NearLat = &latVal
		}
	}
	if lng := c.Query("nearLng"); lng != "" {
		if lngVal, err := strconv.ParseFloat(lng, 64); err == nil {
			filters.NearLng = &lngVal
		}
	}
	if radius := c.Query("radiusKm"); radius != "" {
		if radiusVal, err := strconv.ParseFloat(radius, 64); err == nil {
			filters.RadiusKm = &radiusVal
		}
	}

	// Parse rating filter
	if minRating := c.Query("minRating"); minRating != "" {
		if ratingVal, err := strconv.ParseFloat(minRating, 64); err == nil {
			filters.MinRating = &ratingVal
		}
	}
	if raw := c.Query("isVedaMatch"); raw != "" {
		if parsed, err := strconv.ParseBool(raw); err == nil {
			filters.IsVedaMatch = &parsed
		}
	}

	result, err := h.service.GetShops(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch shops",
		})
	}

	return c.JSON(result)
}

// GetShop returns a single shop by ID
func (h *ShopHandler) GetShop(c *fiber.Ctx) error {
	id := c.Params("id")
	shopID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid shop ID",
		})
	}

	shop, err := h.service.GetShopByID(uint(shopID))
	if err != nil {
		if errors.Is(err, services.ErrShopNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Shop not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch shop",
		})
	}

	// Increment view count
	h.service.IncrementViewCount(uint(shopID))

	// Build response
	response := models.ShopResponse{Shop: *shop}
	if shop.Owner != nil {
		response.OwnerInfo = &models.ShopOwnerInfo{
			ID:            shop.Owner.ID,
			SpiritualName: shop.Owner.SpiritualName,
			KarmicName:    shop.Owner.KarmicName,
			AvatarURL:     shop.Owner.AvatarURL,
		}
	}

	return c.JSON(response)
}

// GetShopBySlug returns a shop by its URL slug
func (h *ShopHandler) GetShopBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")

	shop, err := h.service.GetShopBySlug(slug)
	if err != nil {
		if errors.Is(err, services.ErrShopNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Shop not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch shop",
		})
	}

	// Increment view count
	h.service.IncrementViewCount(shop.ID)

	// Build response
	response := models.ShopResponse{Shop: *shop}
	if shop.Owner != nil {
		response.OwnerInfo = &models.ShopOwnerInfo{
			ID:            shop.Owner.ID,
			SpiritualName: shop.Owner.SpiritualName,
			KarmicName:    shop.Owner.KarmicName,
			AvatarURL:     shop.Owner.AvatarURL,
		}
	}

	return c.JSON(response)
}

// GetShopCategories returns available shop categories
func (h *ShopHandler) GetShopCategories(c *fiber.Ctx) error {
	categories := []map[string]interface{}{
		{"id": "food", "emoji": "🍲", "label": map[string]string{"ru": "Еда", "en": "Food"}},
		{"id": "clothing", "emoji": "👕", "label": map[string]string{"ru": "Одежда", "en": "Clothing"}},
		{"id": "books", "emoji": "📚", "label": map[string]string{"ru": "Книги", "en": "Books"}},
		{"id": "handicrafts", "emoji": "🎨", "label": map[string]string{"ru": "Ремёсла", "en": "Handicrafts"}},
		{"id": "incense", "emoji": "🪔", "label": map[string]string{"ru": "Благовония", "en": "Incense"}},
		{"id": "jewelry", "emoji": "💍", "label": map[string]string{"ru": "Украшения", "en": "Jewelry"}},
		{"id": "ayurveda", "emoji": "🌿", "label": map[string]string{"ru": "Аюрведа", "en": "Ayurveda"}},
		{"id": "musical_instruments", "emoji": "🎵", "label": map[string]string{"ru": "Муз. инструменты", "en": "Musical Instruments"}},
		{"id": "art", "emoji": "🖼️", "label": map[string]string{"ru": "Искусство", "en": "Art"}},
		{"id": "digital_goods", "emoji": "💾", "label": map[string]string{"ru": "Цифровые товары", "en": "Digital Goods"}},
		{"id": "services", "emoji": "🛠️", "label": map[string]string{"ru": "Услуги", "en": "Services"}},
		{"id": "other", "emoji": "📦", "label": map[string]string{"ru": "Другое", "en": "Other"}},
	}
	return c.JSON(categories)
}

// ==================== SELLER ENDPOINTS ====================

// GetMyShop returns the shop owned by the current user
func (h *ShopHandler) GetMyShop(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	shop, err := h.service.GetMyShop(userID)
	if err != nil {
		if errors.Is(err, services.ErrShopNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Shop not found",
				"hasShop": false,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch shop",
		})
	}

	return c.JSON(fiber.Map{
		"hasShop": true,
		"shop":    shop,
	})
}

// CanCreateShop checks if user can create a shop
func (h *ShopHandler) CanCreateShop(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	canCreate, err := h.service.CanCreateShop(userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrShopLimitReached) {
			return c.JSON(fiber.Map{
				"canCreate": false,
				"reason":    "shop_limit_reached",
				"message":   "You already have a shop. Regular users can have only 1 shop.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not check permission",
		})
	}

	return c.JSON(fiber.Map{
		"canCreate": canCreate,
	})
}

// CreateShop creates a new shop
func (h *ShopHandler) CreateShop(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.ShopCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Name == "" || len(req.Name) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Shop name must be at least 2 characters",
		})
	}
	if req.City == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "City is required",
		})
	}
	if req.Category == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Category is required",
		})
	}

	shop, err := h.service.CreateShop(userID, userRole, req)
	if err != nil {
		if errors.Is(err, services.ErrShopLimitReached) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Shop limit reached. Regular users can have only 1 shop.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create shop",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":      shop.ID,
		"slug":    shop.Slug,
		"status":  shop.Status,
		"message": "Shop created successfully! It will be reviewed by moderators.",
	})
}

// UpdateShop updates an existing shop
func (h *ShopHandler) UpdateShop(c *fiber.Ctx) error {
	id := c.Params("id")
	shopID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid shop ID",
		})
	}

	userID := middleware.GetUserID(c)
	userRole := middleware.GetUserRole(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.ShopUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	shop, err := h.service.UpdateShop(uint(shopID), userID, userRole, req)
	if err != nil {
		if errors.Is(err, services.ErrShopNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Shop not found",
			})
		}
		if errors.Is(err, services.ErrUnauthorizedShop) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You can only edit your own shop",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update shop",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Shop updated successfully",
		"shop":    shop,
	})
}

// GetSellerStats returns statistics for the seller dashboard
func (h *ShopHandler) GetSellerStats(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	shop, err := h.service.GetMyShop(userID)
	if err != nil {
		if errors.Is(err, services.ErrShopNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "You don't have a shop yet",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch stats",
		})
	}

	// TODO: Compute actual stats from orders
	return c.JSON(models.ShopStatsResponse{
		TotalViews:     shop.ViewsCount,
		TotalOrders:    shop.OrdersCount,
		TotalRevenue:   0, // Compute from orders
		AverageRating:  shop.Rating,
		TotalProducts:  shop.ProductsCount,
		ActiveProducts: shop.ProductsCount, // TODO: filter active
		PendingOrders:  0,                  // TODO: compute
	})
}

// ==================== ADMIN ENDPOINTS ====================

// AdminGetShops returns all shops with admin filters (including pending)
func (h *ShopHandler) AdminGetShops(c *fiber.Ctx) error {
	filters := models.ShopFilters{
		Category: models.ShopCategory(c.Query("category")),
		City:     c.Query("city"),
		Status:   models.ShopStatus(c.Query("status")), // Admin can filter by any status
		Search:   c.Query("search"),
		Sort:     c.Query("sort", "newest"),
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	filters.Page = page
	filters.Limit = limit

	// For admin, if no status filter, show all (not just active)
	if c.Query("status") == "" {
		filters.Status = "" // Empty status means no filter in admin mode
	}

	result, err := h.service.GetShops(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch shops",
		})
	}

	return c.JSON(result)
}

// AdminModerateShop approves or rejects a shop
func (h *ShopHandler) AdminModerateShop(c *fiber.Ctx) error {
	id := c.Params("id")
	shopID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid shop ID",
		})
	}

	moderatorID := middleware.GetUserID(c)
	if moderatorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req struct {
		Status  models.ShopStatus `json:"status"`
		Comment string            `json:"comment"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate status
	validStatuses := map[models.ShopStatus]bool{
		models.ShopStatusActive:    true,
		models.ShopStatusSuspended: true,
		models.ShopStatusClosed:    true,
	}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid status. Allowed: active, suspended, closed",
		})
	}

	shop, err := h.service.ModerateShop(uint(shopID), moderatorID, req.Status, req.Comment)
	if err != nil {
		if errors.Is(err, services.ErrShopNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Shop not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not moderate shop",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Shop status updated",
		"shop":    shop,
	})
}

// AdminGetShopStats returns admin statistics about shops
func (h *ShopHandler) AdminGetShopStats(c *fiber.Ctx) error {
	// TODO: Implement comprehensive admin stats
	return c.JSON(fiber.Map{
		"totalShops":   0,
		"pendingShops": 0,
		"activeShops":  0,
		"byCategory":   map[string]int64{},
	})
}
