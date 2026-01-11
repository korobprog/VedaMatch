package services

import (
	"encoding/json"
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

// ProductService handles product-related business logic
type ProductService struct{}

// NewProductService creates a new ProductService
func NewProductService() *ProductService {
	return &ProductService{}
}

// Errors
var (
	ErrProductNotFound     = errors.New("product not found")
	ErrVariantNotFound     = errors.New("variant not found")
	ErrUnauthorizedProduct = errors.New("unauthorized to access this product")
	ErrInsufficientStock   = errors.New("insufficient stock")
	ErrShopRequired        = errors.New("shop is required to create products")
)

// CreateProduct creates a new product
func (s *ProductService) CreateProduct(shopID uint, req models.ProductCreateRequest) (*models.Product, error) {
	// Verify shop exists
	var shop models.Shop
	if err := database.DB.First(&shop, shopID).Error; err != nil {
		return nil, ErrShopRequired
	}

	// Generate slug
	slug := s.generateSlug(req.Name)

	// Convert tags to JSON string
	tagsJSON := ""
	if len(req.Tags) > 0 {
		tagsBytes, _ := json.Marshal(req.Tags)
		tagsJSON = string(tagsBytes)
	}

	product := models.Product{
		ShopID:           shopID,
		Name:             req.Name,
		Slug:             slug,
		ShortDescription: req.ShortDescription,
		FullDescription:  req.FullDescription,
		Category:         req.Category,
		Tags:             tagsJSON,
		ProductType:      req.ProductType,
		ExternalURL:      req.ExternalURL,
		DigitalURL:       req.DigitalURL,
		BasePrice:        req.BasePrice,
		SalePrice:        req.SalePrice,
		Currency:         req.Currency,
		Stock:            req.Stock,
		TrackStock:       req.TrackStock,
		MainImageURL:     req.MainImageURL,
		Weight:           req.Weight,
		Dimensions:       req.Dimensions,
		Status:           models.ProductStatusDraft,
	}

	if product.Currency == "" {
		product.Currency = "RUB"
	}

	// Create product in transaction
	tx := database.DB.Begin()

	if err := tx.Create(&product).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create images
	for i, imgURL := range req.Images {
		img := models.ProductImage{
			ProductID: product.ID,
			ImageURL:  imgURL,
			Position:  i,
		}
		if err := tx.Create(&img).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	// Create variants
	for _, varReq := range req.Variants {
		attrJSON, _ := json.Marshal(varReq.Attributes)
		variant := models.ProductVariant{
			ProductID:  product.ID,
			SKU:        varReq.SKU,
			Attributes: string(attrJSON),
			Name:       varReq.Name,
			Price:      varReq.Price,
			SalePrice:  varReq.SalePrice,
			Stock:      varReq.Stock,
			ImageURL:   varReq.ImageURL,
			IsActive:   true,
		}
		if err := tx.Create(&variant).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	// Update shop products count
	tx.Model(&models.Shop{}).Where("id = ?", shopID).
		UpdateColumn("products_count", gorm.Expr("products_count + 1"))

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Load relations
	database.DB.Preload("Variants").Preload("Images").First(&product, product.ID)

	return &product, nil
}

// UpdateProduct updates an existing product
func (s *ProductService) UpdateProduct(productID uint, shopID uint, req models.ProductUpdateRequest) (*models.Product, error) {
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		return nil, ErrProductNotFound
	}

	// Verify ownership
	if product.ShopID != shopID {
		return nil, ErrUnauthorizedProduct
	}

	// Update fields
	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.ShortDescription != nil {
		product.ShortDescription = *req.ShortDescription
	}
	if req.FullDescription != nil {
		product.FullDescription = *req.FullDescription
	}
	if req.Category != nil {
		product.Category = *req.Category
	}
	if len(req.Tags) > 0 {
		tagsBytes, _ := json.Marshal(req.Tags)
		product.Tags = string(tagsBytes)
	}
	if req.ProductType != nil {
		product.ProductType = *req.ProductType
	}
	if req.ExternalURL != nil {
		product.ExternalURL = *req.ExternalURL
	}
	if req.BasePrice != nil {
		product.BasePrice = *req.BasePrice
	}
	if req.SalePrice != nil {
		product.SalePrice = req.SalePrice
	}
	if req.Stock != nil {
		product.Stock = *req.Stock
	}
	if req.Status != nil {
		product.Status = *req.Status
	}
	if req.MainImageURL != nil {
		product.MainImageURL = *req.MainImageURL
	}
	if req.Weight != nil {
		product.Weight = req.Weight
	}
	if req.Dimensions != nil {
		product.Dimensions = *req.Dimensions
	}

	if err := database.DB.Save(&product).Error; err != nil {
		return nil, err
	}

	return &product, nil
}

// GetProduct retrieves a product by ID
func (s *ProductService) GetProduct(productID uint) (*models.Product, error) {
	var product models.Product
	if err := database.DB.
		Preload("Shop").
		Preload("Variants").
		Preload("Images").
		First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	return &product, nil
}

// GetProductsByShop retrieves products for a shop
func (s *ProductService) GetProductsByShop(shopID uint, page, limit int) (*models.ProductListResponse, error) {
	query := database.DB.Model(&models.Product{}).Where("shop_id = ?", shopID)

	var total int64
	query.Count(&total)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var products []models.Product
	if err := query.
		Preload("Variants").
		Preload("Images").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&products).Error; err != nil {
		return nil, err
	}

	var responses []models.ProductResponse
	for _, p := range products {
		resp := s.buildProductResponse(p, nil)
		responses = append(responses, resp)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.ProductListResponse{
		Products:   responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

// GetProducts retrieves products with filters (public discovery)
func (s *ProductService) GetProducts(filters models.ProductFilters) (*models.ProductListResponse, error) {
	query := database.DB.Model(&models.Product{}).
		Joins("JOIN shops ON shops.id = products.shop_id").
		Where("products.status = ?", models.ProductStatusActive).
		Where("shops.status = ?", models.ShopStatusActive)

	// Apply filters
	if filters.ShopID != nil {
		query = query.Where("products.shop_id = ?", *filters.ShopID)
	}
	if filters.Category != "" {
		query = query.Where("products.category = ?", filters.Category)
	}
	if filters.ProductType != "" {
		query = query.Where("products.product_type = ?", filters.ProductType)
	}
	if filters.City != "" {
		query = query.Where("shops.city ILIKE ?", "%"+filters.City+"%")
	}
	if filters.MinPrice != nil {
		query = query.Where("products.base_price >= ?", *filters.MinPrice)
	}
	if filters.MaxPrice != nil {
		query = query.Where("products.base_price <= ?", *filters.MaxPrice)
	}
	if filters.InStock != nil && *filters.InStock {
		query = query.Where("products.stock > 0 OR products.track_stock = false")
	}
	if filters.MinRating != nil {
		query = query.Where("products.rating >= ?", *filters.MinRating)
	}
	if filters.Search != "" {
		searchTerm := "%" + filters.Search + "%"
		query = query.Where("products.name ILIKE ? OR products.short_description ILIKE ?", searchTerm, searchTerm)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Sorting
	switch filters.Sort {
	case "price_asc":
		query = query.Order("products.base_price ASC")
	case "price_desc":
		query = query.Order("products.base_price DESC")
	case "rating":
		query = query.Order("products.rating DESC")
	case "popular":
		query = query.Order("products.sales_count DESC")
	default:
		query = query.Order("products.created_at DESC")
	}

	var products []models.Product
	if err := query.
		Preload("Shop").
		Preload("Variants").
		Preload("Images").
		Offset(offset).
		Limit(limit).
		Find(&products).Error; err != nil {
		return nil, err
	}

	var responses []models.ProductResponse
	for _, p := range products {
		resp := s.buildProductResponse(p, nil)
		responses = append(responses, resp)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.ProductListResponse{
		Products:   responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

// DeleteProduct soft-deletes a product
func (s *ProductService) DeleteProduct(productID uint, shopID uint) error {
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		return ErrProductNotFound
	}

	if product.ShopID != shopID {
		return ErrUnauthorizedProduct
	}

	tx := database.DB.Begin()

	// Delete variants
	tx.Where("product_id = ?", productID).Delete(&models.ProductVariant{})

	// Delete images
	tx.Where("product_id = ?", productID).Delete(&models.ProductImage{})

	// Delete product
	if err := tx.Delete(&product).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Update shop products count
	tx.Model(&models.Shop{}).Where("id = ?", shopID).
		UpdateColumn("products_count", gorm.Expr("products_count - 1"))

	return tx.Commit().Error
}

// UpdateStock updates stock for a product or variant
func (s *ProductService) UpdateStock(productID uint, variantID *uint, quantity int) error {
	if variantID != nil {
		return database.DB.Model(&models.ProductVariant{}).
			Where("id = ? AND product_id = ?", *variantID, productID).
			Update("stock", quantity).Error
	}
	return database.DB.Model(&models.Product{}).
		Where("id = ?", productID).
		Update("stock", quantity).Error
}

// ReserveStock reserves stock for an order (used during checkout)
func (s *ProductService) ReserveStock(productID uint, variantID *uint, quantity int) error {
	if variantID != nil {
		var variant models.ProductVariant
		if err := database.DB.First(&variant, *variantID).Error; err != nil {
			return ErrVariantNotFound
		}
		if variant.Stock-variant.Reserved < quantity {
			return ErrInsufficientStock
		}
		return database.DB.Model(&variant).
			Update("reserved", gorm.Expr("reserved + ?", quantity)).Error
	}

	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		return ErrProductNotFound
	}
	if product.TrackStock && product.Stock < quantity {
		return ErrInsufficientStock
	}
	// For products without variants, we directly reduce stock on order
	return nil
}

// DeductStock deducts stock after order confirmation
func (s *ProductService) DeductStock(productID uint, variantID *uint, quantity int) error {
	if variantID != nil {
		return database.DB.Model(&models.ProductVariant{}).
			Where("id = ? AND product_id = ?", *variantID, productID).
			Updates(map[string]interface{}{
				"stock":    gorm.Expr("stock - ?", quantity),
				"reserved": gorm.Expr("reserved - ?", quantity),
			}).Error
	}
	return database.DB.Model(&models.Product{}).
		Where("id = ?", productID).
		Update("stock", gorm.Expr("stock - ?", quantity)).Error
}

// IncrementViewCount increments product view counter
func (s *ProductService) IncrementViewCount(productID uint) error {
	return database.DB.Model(&models.Product{}).Where("id = ?", productID).
		UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error
}

// ToggleFavorite adds or removes product from favorites
func (s *ProductService) ToggleFavorite(userID, productID uint) (bool, error) {
	var existing models.ProductFavorite
	result := database.DB.Where("user_id = ? AND product_id = ?", userID, productID).First(&existing)

	if result.Error == nil {
		// Remove from favorites
		database.DB.Delete(&existing)
		database.DB.Model(&models.Product{}).Where("id = ?", productID).
			UpdateColumn("favorites_count", gorm.Expr("favorites_count - 1"))
		return false, nil
	}

	// Add to favorites
	favorite := models.ProductFavorite{
		UserID:    userID,
		ProductID: productID,
	}
	if err := database.DB.Create(&favorite).Error; err != nil {
		return false, err
	}
	database.DB.Model(&models.Product{}).Where("id = ?", productID).
		UpdateColumn("favorites_count", gorm.Expr("favorites_count + 1"))
	return true, nil
}

// AddReview adds a review to a product
func (s *ProductService) AddReview(userID, productID uint, req models.ReviewCreateRequest) (*models.ProductReview, error) {
	// Verify product exists
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		return nil, ErrProductNotFound
	}

	// Check if user has already reviewed this product
	var existingReview models.ProductReview
	if err := database.DB.Where("user_id = ? AND product_id = ?", userID, productID).First(&existingReview).Error; err == nil {
		return nil, errors.New("you have already reviewed this product")
	}

	// Check if verified purchase
	var verified bool
	var order models.Order
	err := database.DB.Joins("JOIN order_items ON order_items.order_id = orders.id").
		Where("orders.user_id = ? AND order_items.product_id = ? AND orders.status = ?", userID, productID, "completed").
		First(&order).Error
	if err == nil {
		verified = true
	}

	review := models.ProductReview{
		ProductID:          productID,
		UserID:             userID,
		Rating:             req.Rating,
		Title:              req.Title,
		Comment:            req.Comment,
		IsVerifiedPurchase: verified,
		IsApproved:         true, // Auto-approve for now
	}

	if verified {
		review.OrderID = &order.ID
	}

	tx := database.DB.Begin()

	if err := tx.Create(&review).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Update product rating and review count
	var stats struct {
		AvgRating float64
		Count     int
	}
	tx.Model(&models.ProductReview{}).
		Where("product_id = ? AND is_approved = ?", productID, true).
		Select("AVG(rating) as avg_rating, COUNT(*) as count").
		Scan(&stats)

	if err := tx.Model(&models.Product{}).Where("id = ?", productID).
		Updates(map[string]interface{}{
			"rating":        stats.AvgRating,
			"reviews_count": stats.Count,
		}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &review, nil
}

// GetReviews retrieves reviews for a product
func (s *ProductService) GetReviews(productID uint, page, limit int) ([]models.ProductReview, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	var reviews []models.ProductReview
	var total int64

	query := database.DB.Model(&models.ProductReview{}).
		Where("product_id = ? AND is_approved = ?", productID, true)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&reviews).Error; err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

// Helper: build product response
func (s *ProductService) buildProductResponse(p models.Product, userFavorites *[]uint) models.ProductResponse {
	resp := models.ProductResponse{
		Product: p,
	}

	// Calculate current price
	if p.SalePrice != nil && *p.SalePrice > 0 {
		resp.CurrentPrice = *p.SalePrice
		resp.IsOnSale = true
	} else {
		resp.CurrentPrice = p.BasePrice
		resp.IsOnSale = false
	}

	// Add shop info
	if p.Shop != nil {
		resp.ShopInfo = &models.ProductShopInfo{
			ID:      p.Shop.ID,
			Name:    p.Shop.Name,
			LogoURL: p.Shop.LogoURL,
			City:    p.Shop.City,
			Rating:  p.Shop.Rating,
		}
	}

	// Check favorites
	if userFavorites != nil {
		for _, favID := range *userFavorites {
			if favID == p.ID {
				resp.IsFavorite = true
				break
			}
		}
	}

	return resp
}

// Helper: generate slug
func (s *ProductService) generateSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	reg := regexp.MustCompile(`[^a-zа-яё0-9-]`)
	slug = reg.ReplaceAllString(slug, "")
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")

	// Add timestamp for uniqueness
	slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix())
	return slug
}
