package handlers

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
	productService *services.ProductService
	shopService    *services.ShopService
}

func parsePositiveIntQuery(c *fiber.Ctx, key string, defaultValue int) int {
	raw := c.Query(key, strconv.Itoa(defaultValue))
	val, err := strconv.Atoi(raw)
	if err != nil || val <= 0 {
		return defaultValue
	}
	return val
}

func (h *ProductHandler) UploadProductPhoto(c *fiber.Ctx) error {
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

	if file.Size <= 0 || file.Size > 20*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid file size (max 20MB)",
		})
	}
	contentType := strings.ToLower(file.Header.Get("Content-Type"))
	if !strings.HasPrefix(contentType, "image/") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Only image files are allowed",
		})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("products/u%d_%d%s", userID, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				return c.JSON(fiber.Map{
					"url": imageURL,
				})
			}
			log.Printf("[ProductHandler] S3 upload failed, falling back to local storage: %v", err)
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := "./uploads/products"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("prod_u%d_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/products/" + filename
	return c.JSON(fiber.Map{
		"url": imageURL,
	})
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		productService: services.NewProductService(),
		shopService:    services.NewShopService(),
	}
}

// ==================== PUBLIC ENDPOINTS ====================

// GetProducts returns a paginated list of products with filters
func (h *ProductHandler) GetProducts(c *fiber.Ctx) error {
	filters := models.ProductFilters{
		Category:    models.ProductCategory(c.Query("category")),
		ProductType: models.ProductType(c.Query("productType")),
		City:        c.Query("city"),
		Search:      c.Query("search"),
		Sort:        c.Query("sort", "newest"),
	}

	// Parse shop ID
	if shopIDStr := c.Query("shopId"); shopIDStr != "" {
		if shopID, err := strconv.ParseUint(shopIDStr, 10, 32); err == nil {
			uid := uint(shopID)
			filters.ShopID = &uid
		}
	}

	// Parse pagination
	filters.Page = parsePositiveIntQuery(c, "page", 1)
	filters.Limit = parsePositiveIntQuery(c, "limit", 20)

	// Parse price filters
	if minPrice := c.Query("minPrice"); minPrice != "" {
		if val, err := strconv.ParseFloat(minPrice, 64); err == nil {
			filters.MinPrice = &val
		}
	}
	if maxPrice := c.Query("maxPrice"); maxPrice != "" {
		if val, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			filters.MaxPrice = &val
		}
	}

	// Parse inStock filter
	if inStock := c.Query("inStock"); inStock == "true" {
		t := true
		filters.InStock = &t
	}

	// Parse rating filter
	if minRating := c.Query("minRating"); minRating != "" {
		if val, err := strconv.ParseFloat(minRating, 64); err == nil {
			filters.MinRating = &val
		}
	}

	result, err := h.productService.GetProducts(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch products",
		})
	}

	return c.JSON(result)
}

// GetProduct returns a single product by ID
func (h *ProductHandler) GetProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	product, err := h.productService.GetProduct(uint(productID))
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Product not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch product",
		})
	}

	// Increment view count
	h.productService.IncrementViewCount(uint(productID))

	// Build response
	response := models.ProductResponse{Product: *product}

	// Calculate current price
	if product.SalePrice != nil && *product.SalePrice > 0 {
		response.CurrentPrice = *product.SalePrice
		response.IsOnSale = true
	} else {
		response.CurrentPrice = product.BasePrice
	}

	// Add shop info
	if product.Shop != nil {
		response.ShopInfo = &models.ProductShopInfo{
			ID:      product.Shop.ID,
			Name:    product.Shop.Name,
			LogoURL: product.Shop.LogoURL,
			City:    product.Shop.City,
			Rating:  product.Shop.Rating,
		}
	}

	return c.JSON(response)
}

// GetProductCategories returns available product categories
func (h *ProductHandler) GetProductCategories(c *fiber.Ctx) error {
	categories := []map[string]interface{}{
		{"id": "books", "emoji": "📚", "label": map[string]string{"ru": "Книги", "en": "Books"}},
		{"id": "clothing", "emoji": "👕", "label": map[string]string{"ru": "Одежда", "en": "Clothing"}},
		{"id": "food", "emoji": "🍲", "label": map[string]string{"ru": "Еда", "en": "Food"}},
		{"id": "incense", "emoji": "🪔", "label": map[string]string{"ru": "Благовония", "en": "Incense"}},
		{"id": "jewelry", "emoji": "💍", "label": map[string]string{"ru": "Украшения", "en": "Jewelry"}},
		{"id": "ayurveda", "emoji": "🌿", "label": map[string]string{"ru": "Аюрведа", "en": "Ayurveda"}},
		{"id": "music_instruments", "emoji": "🎵", "label": map[string]string{"ru": "Муз. инструменты", "en": "Musical Instruments"}},
		{"id": "art", "emoji": "🖼️", "label": map[string]string{"ru": "Искусство", "en": "Art"}},
		{"id": "home_decor", "emoji": "🏠", "label": map[string]string{"ru": "Декор для дома", "en": "Home Decor"}},
		{"id": "cosmetics", "emoji": "💄", "label": map[string]string{"ru": "Косметика", "en": "Cosmetics"}},
		{"id": "digital_courses", "emoji": "🎓", "label": map[string]string{"ru": "Онлайн курсы", "en": "Digital Courses"}},
		{"id": "digital_books", "emoji": "📱", "label": map[string]string{"ru": "Электронные книги", "en": "E-Books"}},
		{"id": "accessories", "emoji": "👜", "label": map[string]string{"ru": "Аксессуары", "en": "Accessories"}},
		{"id": "other", "emoji": "📦", "label": map[string]string{"ru": "Другое", "en": "Other"}},
	}
	return c.JSON(categories)
}

// GetShopProducts returns products for a specific shop
func (h *ProductHandler) GetShopProducts(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	id, err := strconv.ParseUint(shopID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid shop ID",
		})
	}

	page := parsePositiveIntQuery(c, "page", 1)
	limit := parsePositiveIntQuery(c, "limit", 20)

	result, err := h.productService.GetProductsByShop(uint(id), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch products",
		})
	}

	return c.JSON(result)
}

// ==================== SELLER ENDPOINTS ====================

// CreateProduct creates a new product (seller only)
func (h *ProductHandler) CreateProduct(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get seller's shop
	shop, err := h.shopService.GetMyShop(userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You need to create a shop first",
		})
	}

	var req models.ProductCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Name == "" || len(req.Name) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Product name must be at least 2 characters",
		})
	}
	if req.Category == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Category is required",
		})
	}
	if req.BasePrice < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Price cannot be negative",
		})
	}

	product, err := h.productService.CreateProduct(shop.ID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create product",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":      product.ID,
		"slug":    product.Slug,
		"message": "Product created successfully",
	})
}

// UpdateProduct updates an existing product (seller only)
func (h *ProductHandler) UpdateProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get seller's shop
	shop, err := h.shopService.GetMyShop(userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have a shop",
		})
	}

	var req models.ProductUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	product, err := h.productService.UpdateProduct(uint(productID), shop.ID, req)
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Product not found",
			})
		}
		if errors.Is(err, services.ErrUnauthorizedProduct) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You can only edit your own products",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update product",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Product updated successfully",
		"product": product,
	})
}

// DeleteProduct deletes a product (seller only)
func (h *ProductHandler) DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get seller's shop
	shop, err := h.shopService.GetMyShop(userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have a shop",
		})
	}

	err = h.productService.DeleteProduct(uint(productID), shop.ID)
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Product not found",
			})
		}
		if errors.Is(err, services.ErrUnauthorizedProduct) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You can only delete your own products",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not delete product",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Product deleted successfully",
	})
}

// GetMyProducts returns products for seller's shop
func (h *ProductHandler) GetMyProducts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	shop, err := h.shopService.GetMyShop(userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "You don't have a shop yet",
			"hasShop": false,
		})
	}

	page := parsePositiveIntQuery(c, "page", 1)
	limit := parsePositiveIntQuery(c, "limit", 20)

	result, err := h.productService.GetProductsByShop(shop.ID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch products",
		})
	}

	return c.JSON(result)
}

// UpdateStock updates stock for a product/variant
func (h *ProductHandler) UpdateStock(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Verify ownership
	shop, err := h.shopService.GetMyShop(userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have a shop",
		})
	}

	product, err := h.productService.GetProduct(uint(productID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Product not found",
		})
	}
	if product.ShopID != shop.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only manage your own products",
		})
	}

	var req models.InventoryUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var variantID *uint
	if req.VariantID > 0 {
		variantID = &req.VariantID
	}

	if err := h.productService.UpdateStock(uint(productID), variantID, req.Stock); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update stock",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Stock updated successfully",
	})
}

// ToggleFavorite adds or removes product from favorites
func (h *ProductHandler) ToggleFavorite(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	isFavorite, err := h.productService.ToggleFavorite(userID, uint(productID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not toggle favorite",
		})
	}

	return c.JSON(fiber.Map{
		"isFavorite": isFavorite,
	})
}

// AddReview adds a review to a product
func (h *ProductHandler) AddReview(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.ReviewCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	review, err := h.productService.AddReview(userID, uint(productID), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(review)
}

// GetProductReviews returns reviews for a product
func (h *ProductHandler) GetProductReviews(c *fiber.Ctx) error {
	id := c.Params("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	page := parsePositiveIntQuery(c, "page", 1)
	limit := parsePositiveIntQuery(c, "limit", 10)

	reviews, total, err := h.productService.GetReviews(uint(productID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch reviews",
		})
	}

	return c.JSON(fiber.Map{
		"reviews": reviews,
		"total":   total,
		"page":    page,
	})
}
