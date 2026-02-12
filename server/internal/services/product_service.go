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

func isValidProductType(productType models.ProductType) bool {
	switch productType {
	case models.ProductTypePhysical, models.ProductTypeDigital:
		return true
	default:
		return false
	}
}

func isValidProductStatus(status models.ProductStatus) bool {
	switch status {
	case models.ProductStatusDraft, models.ProductStatusActive, models.ProductStatusInactive, models.ProductStatusSoldOut:
		return true
	default:
		return false
	}
}

// CreateProduct creates a new product
func (s *ProductService) CreateProduct(shopID uint, req models.ProductCreateRequest) (*models.Product, error) {
	// Verify shop exists
	var shop models.Shop
	if err := database.DB.First(&shop, shopID).Error; err != nil {
		return nil, ErrShopRequired
	}

	req.Name = strings.TrimSpace(req.Name)
	req.ShortDescription = strings.TrimSpace(req.ShortDescription)
	req.FullDescription = strings.TrimSpace(req.FullDescription)
	req.ExternalURL = strings.TrimSpace(req.ExternalURL)
	req.DigitalURL = strings.TrimSpace(req.DigitalURL)
	req.Currency = strings.TrimSpace(req.Currency)
	req.Category = models.ProductCategory(strings.TrimSpace(string(req.Category)))
	req.ProductType = models.ProductType(strings.TrimSpace(string(req.ProductType)))
	req.MainImageURL = strings.TrimSpace(req.MainImageURL)
	req.Dimensions = strings.TrimSpace(req.Dimensions)
	if req.Name == "" {
		return nil, errors.New("name is required")
	}
	if !isValidProductType(req.ProductType) {
		return nil, errors.New("invalid product type")
	}
	if req.Category == "" {
		return nil, errors.New("category is required")
	}
	if req.BasePrice < 0 {
		return nil, errors.New("base price cannot be negative")
	}
	if req.SalePrice != nil {
		if *req.SalePrice < 0 {
			return nil, errors.New("sale price cannot be negative")
		}
		if *req.SalePrice > req.BasePrice {
			return nil, errors.New("sale price cannot exceed base price")
		}
	}
	if req.Stock < 0 {
		return nil, errors.New("stock cannot be negative")
	}
	if req.Weight != nil && *req.Weight < 0 {
		return nil, errors.New("weight cannot be negative")
	}

	// Generate slug
	slug := s.generateSlug(req.Name)

	// Convert tags to JSON string
	tagsJSON := ""
	if len(req.Tags) > 0 {
		tagsBytes, err := json.Marshal(req.Tags)
		if err != nil {
			return nil, err
		}
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
		imgURL = strings.TrimSpace(imgURL)
		if imgURL == "" {
			continue
		}
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
		varReq.SKU = strings.TrimSpace(varReq.SKU)
		varReq.Name = strings.TrimSpace(varReq.Name)
		varReq.ImageURL = strings.TrimSpace(varReq.ImageURL)
		if varReq.SKU == "" {
			tx.Rollback()
			return nil, errors.New("variant sku is required")
		}
		attrJSON, err := json.Marshal(varReq.Attributes)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
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
	if err := tx.Model(&models.Shop{}).Where("id = ?", shopID).
		UpdateColumn("products_count", gorm.Expr("products_count + 1")).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Load relations
	if err := database.DB.Preload("Variants").Preload("Images").First(&product, product.ID).Error; err != nil {
		return nil, err
	}

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
		product.Name = strings.TrimSpace(*req.Name)
	}
	if req.ShortDescription != nil {
		product.ShortDescription = strings.TrimSpace(*req.ShortDescription)
	}
	if req.FullDescription != nil {
		product.FullDescription = strings.TrimSpace(*req.FullDescription)
	}
	if req.Category != nil {
		nextCategory := models.ProductCategory(strings.TrimSpace(string(*req.Category)))
		if nextCategory == "" {
			return nil, errors.New("category is required")
		}
		product.Category = nextCategory
	}
	if req.Tags != nil {
		tagsBytes, err := json.Marshal(req.Tags)
		if err != nil {
			return nil, err
		}
		product.Tags = string(tagsBytes)
	}
	if req.ProductType != nil {
		nextType := models.ProductType(strings.TrimSpace(string(*req.ProductType)))
		if !isValidProductType(nextType) {
			return nil, errors.New("invalid product type")
		}
		product.ProductType = nextType
	}
	if req.ExternalURL != nil {
		product.ExternalURL = strings.TrimSpace(*req.ExternalURL)
	}
	if req.BasePrice != nil {
		if *req.BasePrice < 0 {
			return nil, errors.New("base price cannot be negative")
		}
		if product.SalePrice != nil && *product.SalePrice > *req.BasePrice {
			return nil, errors.New("sale price cannot exceed base price")
		}
		product.BasePrice = *req.BasePrice
	}
	if req.SalePrice != nil {
		if *req.SalePrice < 0 {
			return nil, errors.New("sale price cannot be negative")
		}
		if *req.SalePrice > product.BasePrice {
			return nil, errors.New("sale price cannot exceed base price")
		}
		product.SalePrice = req.SalePrice
	}
	if req.Stock != nil {
		if *req.Stock < 0 {
			return nil, errors.New("stock cannot be negative")
		}
		product.Stock = *req.Stock
	}
	if req.Status != nil {
		nextStatus := models.ProductStatus(strings.TrimSpace(string(*req.Status)))
		if !isValidProductStatus(nextStatus) {
			return nil, errors.New("invalid product status")
		}
		product.Status = nextStatus
	}
	if req.MainImageURL != nil {
		product.MainImageURL = strings.TrimSpace(*req.MainImageURL)
	}
	if req.Weight != nil {
		if *req.Weight < 0 {
			return nil, errors.New("weight cannot be negative")
		}
		product.Weight = req.Weight
	}
	if req.Dimensions != nil {
		product.Dimensions = strings.TrimSpace(*req.Dimensions)
	}
	if strings.TrimSpace(product.Name) == "" {
		return nil, errors.New("name is required")
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
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

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
	filters.Category = models.ProductCategory(strings.TrimSpace(string(filters.Category)))
	filters.ProductType = models.ProductType(strings.TrimSpace(string(filters.ProductType)))
	filters.City = strings.TrimSpace(filters.City)
	filters.Search = strings.TrimSpace(filters.Search)
	filters.Sort = strings.TrimSpace(filters.Sort)

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
	if err := tx.Where("product_id = ?", productID).Delete(&models.ProductVariant{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Delete images
	if err := tx.Where("product_id = ?", productID).Delete(&models.ProductImage{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Delete product
	if err := tx.Delete(&product).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Update shop products count
	if err := tx.Model(&models.Shop{}).Where("id = ?", shopID).
		UpdateColumn("products_count", gorm.Expr("CASE WHEN products_count > 0 THEN products_count - 1 ELSE 0 END")).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// UpdateStock updates stock for a product or variant
func (s *ProductService) UpdateStock(productID uint, variantID *uint, quantity int) error {
	if quantity < 0 {
		return errors.New("stock quantity cannot be negative")
	}
	if variantID != nil {
		result := database.DB.Model(&models.ProductVariant{}).
			Where("id = ? AND product_id = ?", *variantID, productID).
			Update("stock", quantity)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			var exists int64
			if err := database.DB.Model(&models.ProductVariant{}).
				Where("id = ? AND product_id = ?", *variantID, productID).
				Count(&exists).Error; err != nil {
				return err
			}
			if exists == 0 {
				return ErrVariantNotFound
			}
		}
		return nil
	}
	result := database.DB.Model(&models.Product{}).
		Where("id = ?", productID).
		Update("stock", quantity)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrProductNotFound
	}
	return nil
}

// ReserveStock reserves stock for an order (used during checkout)
func (s *ProductService) ReserveStock(productID uint, variantID *uint, quantity int) error {
	if quantity <= 0 {
		return errors.New("quantity must be greater than zero")
	}
	if variantID != nil {
		// Atomic reservation prevents race conditions and negative availability.
		result := database.DB.Model(&models.ProductVariant{}).
			Where("id = ? AND product_id = ? AND (stock - reserved) >= ?", *variantID, productID, quantity).
			Update("reserved", gorm.Expr("reserved + ?", quantity))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			var exists int64
			if err := database.DB.Model(&models.ProductVariant{}).
				Where("id = ? AND product_id = ?", *variantID, productID).
				Count(&exists).Error; err != nil {
				return err
			}
			if exists == 0 {
				return ErrVariantNotFound
			}
			return ErrInsufficientStock
		}
		return nil
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
	if quantity <= 0 {
		return errors.New("quantity must be greater than zero")
	}
	if variantID != nil {
		result := database.DB.Model(&models.ProductVariant{}).
			Where("id = ? AND product_id = ? AND stock >= ? AND reserved >= ?", *variantID, productID, quantity, quantity).
			Updates(map[string]interface{}{
				"stock":    gorm.Expr("stock - ?", quantity),
				"reserved": gorm.Expr("reserved - ?", quantity),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			var exists int64
			if err := database.DB.Model(&models.ProductVariant{}).
				Where("id = ? AND product_id = ?", *variantID, productID).
				Count(&exists).Error; err != nil {
				return err
			}
			if exists == 0 {
				return ErrVariantNotFound
			}
			return ErrInsufficientStock
		}
		return nil
	}
	result := database.DB.Model(&models.Product{}).
		Where("id = ? AND (track_stock = false OR stock >= ?)", productID, quantity).
		Update("stock", gorm.Expr("CASE WHEN track_stock THEN stock - ? ELSE stock END", quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		var product models.Product
		if err := database.DB.Select("id", "track_stock", "stock").First(&product, productID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrProductNotFound
			}
			return err
		}
		if product.TrackStock {
			return ErrInsufficientStock
		}
	}
	return nil
}

// IncrementViewCount increments product view counter
func (s *ProductService) IncrementViewCount(productID uint) error {
	return database.DB.Model(&models.Product{}).Where("id = ?", productID).
		UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error
}

// ToggleFavorite adds or removes product from favorites
func (s *ProductService) ToggleFavorite(userID, productID uint) (bool, error) {
	var product models.Product
	if err := database.DB.Select("id").First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrProductNotFound
		}
		return false, err
	}

	var existing models.ProductFavorite
	result := database.DB.Where("user_id = ? AND product_id = ?", userID, productID).First(&existing)

	if result.Error == nil {
		tx := database.DB.Begin()
		// Remove from favorites
		if err := tx.Delete(&existing).Error; err != nil {
			tx.Rollback()
			return false, err
		}
		if err := tx.Model(&models.Product{}).Where("id = ?", productID).
			UpdateColumn("favorites_count", gorm.Expr("CASE WHEN favorites_count > 0 THEN favorites_count - 1 ELSE 0 END")).Error; err != nil {
			tx.Rollback()
			return false, err
		}
		if err := tx.Commit().Error; err != nil {
			return false, err
		}
		return false, nil
	}
	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return false, result.Error
	}

	// Add to favorites
	favorite := models.ProductFavorite{
		UserID:    userID,
		ProductID: productID,
	}
	tx := database.DB.Begin()
	if err := tx.Create(&favorite).Error; err != nil {
		tx.Rollback()
		return false, err
	}
	if err := tx.Model(&models.Product{}).Where("id = ?", productID).
		UpdateColumn("favorites_count", gorm.Expr("favorites_count + 1")).Error; err != nil {
		tx.Rollback()
		return false, err
	}
	if err := tx.Commit().Error; err != nil {
		return false, err
	}
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
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
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
	if err := tx.Model(&models.ProductReview{}).
		Where("product_id = ? AND is_approved = ?", productID, true).
		Select("AVG(rating) as avg_rating, COUNT(*) as count").
		Scan(&stats).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

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
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = strings.ReplaceAll(slug, " ", "-")
	reg := regexp.MustCompile(`[^a-zа-яё0-9-]`)
	slug = reg.ReplaceAllString(slug, "")
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "product"
	}

	// Add timestamp for uniqueness
	slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix())
	return slug
}
