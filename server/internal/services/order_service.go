package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// OrderService handles order-related business logic
type OrderService struct {
	productService *ProductService
}

// NewOrderService creates a new OrderService
func NewOrderService() *OrderService {
	return &OrderService{
		productService: NewProductService(),
	}
}

// Errors
var (
	ErrOrderNotFound      = errors.New("order not found")
	ErrUnauthorizedOrder  = errors.New("unauthorized to access this order")
	ErrEmptyCart          = errors.New("cart is empty")
	ErrInvalidOrderStatus = errors.New("invalid order status transition")
)

// CreateOrder creates a new order from cart items
func (s *OrderService) CreateOrder(buyerID uint, req models.OrderCreateRequest) (*models.Order, error) {
	if len(req.Items) == 0 {
		return nil, ErrEmptyCart
	}

	// Get shop info
	var shop models.Shop
	if err := database.DB.First(&shop, req.ShopID).Error; err != nil {
		return nil, errors.New("shop not found")
	}

	// Start transaction
	tx := database.DB.Begin()

	// Process items and calculate totals
	var orderItems []models.OrderItem
	var subtotal float64

	for _, cartItem := range req.Items {
		product, err := s.productService.GetProduct(cartItem.ProductID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("product %d not found", cartItem.ProductID)
		}

		// Verify product belongs to the shop
		if product.ShopID != req.ShopID {
			tx.Rollback()
			return nil, fmt.Errorf("product %d does not belong to shop %d", cartItem.ProductID, req.ShopID)
		}

		var unitPrice float64
		var variantName, sku, imageURL string

		if cartItem.VariantID != nil {
			// Find variant
			for _, v := range product.Variants {
				if v.ID == *cartItem.VariantID {
					if v.Price != nil {
						unitPrice = *v.Price
					} else {
						unitPrice = product.BasePrice
					}
					// Check for sale price on variant
					if v.SalePrice != nil && *v.SalePrice > 0 {
						unitPrice = *v.SalePrice
					}
					variantName = v.Name
					sku = v.SKU
					imageURL = v.ImageURL
					break
				}
			}
		} else {
			unitPrice = product.BasePrice
			if product.SalePrice != nil && *product.SalePrice > 0 {
				unitPrice = *product.SalePrice
			}
		}

		// Check stock
		if product.TrackStock {
			if cartItem.VariantID != nil {
				if err := s.productService.ReserveStock(product.ID, cartItem.VariantID, cartItem.Quantity); err != nil {
					tx.Rollback()
					return nil, fmt.Errorf("insufficient stock for %s", product.Name)
				}
			} else if product.Stock < cartItem.Quantity {
				tx.Rollback()
				return nil, fmt.Errorf("insufficient stock for %s", product.Name)
			}
		}

		if imageURL == "" {
			imageURL = product.MainImageURL
		}

		itemTotal := unitPrice * float64(cartItem.Quantity)
		subtotal += itemTotal

		orderItem := models.OrderItem{
			ProductID:   product.ID,
			VariantID:   cartItem.VariantID,
			ProductName: product.Name,
			VariantName: variantName,
			SKU:         sku,
			ImageURL:    imageURL,
			UnitPrice:   unitPrice,
			Quantity:    cartItem.Quantity,
			Total:       itemTotal,
		}

		// For digital products, copy the digital URL
		if product.ProductType == models.ProductTypeDigital {
			orderItem.DigitalURL = product.DigitalURL
		}

		orderItems = append(orderItems, orderItem)
	}

	// Generate order number
	orderNumber := s.generateOrderNumber()

	order := models.Order{
		OrderNumber:     orderNumber,
		BuyerID:         buyerID,
		ShopID:          req.ShopID,
		SellerID:        shop.OwnerID,
		Status:          models.OrderStatusNew,
		ItemsCount:      len(orderItems),
		Subtotal:        subtotal,
		Total:           subtotal, // No delivery fee for now
		Currency:        "RUB",
		DeliveryType:    req.DeliveryType,
		DeliveryAddress: req.DeliveryAddress,
		DeliveryNote:    req.DeliveryNote,
		BuyerName:       req.BuyerName,
		BuyerPhone:      req.BuyerPhone,
		BuyerEmail:      req.BuyerEmail,
		BuyerNote:       req.BuyerNote,
		Source:          normalizeOrderSource(req.Source),
		SourcePostID:    req.SourcePostID,
		SourceChannelID: req.SourceChannelID,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create order items
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
		if err := tx.Create(&orderItems[i]).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	// Update shop orders count
	tx.Model(&models.Shop{}).Where("id = ?", req.ShopID).
		UpdateColumn("orders_count", gorm.Expr("orders_count + 1"))

	// Update product sales count
	for _, item := range orderItems {
		tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
			UpdateColumn("sales_count", gorm.Expr("sales_count + ?", item.Quantity))
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	if order.Source == "channel_post" {
		if err := GetMetricsService().Increment(MetricOrdersFromChannelTotal, 1); err != nil {
			// Metrics must not block business flow.
			fmt.Printf("[Orders] metric increment failed (%s): %v\n", MetricOrdersFromChannelTotal, err)
		}
	}

	// Load full order with items
	database.DB.Preload("Items").First(&order, order.ID)

	return &order, nil
}

func normalizeOrderSource(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) > 80 {
		return value[:80]
	}
	return value
}

// GetOrder retrieves an order by ID
func (s *OrderService) GetOrder(orderID uint) (*models.Order, error) {
	var order models.Order
	if err := database.DB.
		Preload("Items").
		Preload("Buyer").
		Preload("Shop").
		First(&order, orderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

// GetOrderByNumber retrieves an order by order number
func (s *OrderService) GetOrderByNumber(orderNumber string) (*models.Order, error) {
	var order models.Order
	if err := database.DB.
		Preload("Items").
		Preload("Buyer").
		Preload("Shop").
		Where("order_number = ?", orderNumber).
		First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

// GetBuyerOrders retrieves orders for a buyer
func (s *OrderService) GetBuyerOrders(buyerID uint, filters models.OrderFilters) (*models.OrderListResponse, error) {
	filters.BuyerID = &buyerID
	return s.getOrders(filters)
}

// GetSellerOrders retrieves orders for a seller's shop
func (s *OrderService) GetSellerOrders(sellerID uint, filters models.OrderFilters) (*models.OrderListResponse, error) {
	// Find seller's shop
	var shop models.Shop
	if err := database.DB.Where("owner_id = ?", sellerID).First(&shop).Error; err != nil {
		return nil, errors.New("shop not found")
	}
	filters.ShopID = &shop.ID
	return s.getOrders(filters)
}

// getOrders is a helper function for querying orders
func (s *OrderService) getOrders(filters models.OrderFilters) (*models.OrderListResponse, error) {
	query := database.DB.Model(&models.Order{})

	if filters.ShopID != nil {
		query = query.Where("shop_id = ?", *filters.ShopID)
	}
	if filters.BuyerID != nil {
		query = query.Where("buyer_id = ?", *filters.BuyerID)
	}
	if filters.SellerID != nil {
		query = query.Where("seller_id = ?", *filters.SellerID)
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.Source != "" {
		query = query.Where("source = ?", normalizeOrderSource(filters.Source))
	}
	if filters.SourcePostID != nil {
		query = query.Where("source_post_id = ?", *filters.SourcePostID)
	}
	if filters.SourceChannelID != nil {
		query = query.Where("source_channel_id = ?", *filters.SourceChannelID)
	}
	if filters.Search != "" {
		query = query.Where("order_number ILIKE ?", "%"+filters.Search+"%")
	}

	var total int64
	query.Count(&total)

	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	switch filters.Sort {
	case "oldest":
		query = query.Order("created_at ASC")
	default:
		query = query.Order("created_at DESC")
	}

	var orders []models.Order
	if err := query.
		Preload("Items").
		Preload("Buyer").
		Preload("Shop").
		Offset(offset).
		Limit(limit).
		Find(&orders).Error; err != nil {
		return nil, err
	}

	var responses []models.OrderResponse
	for _, o := range orders {
		resp := models.OrderResponse{Order: o}
		if o.Buyer != nil {
			resp.BuyerInfo = &models.OrderUserInfo{
				ID:            o.Buyer.ID,
				SpiritualName: o.Buyer.SpiritualName,
				KarmicName:    o.Buyer.KarmicName,
				AvatarURL:     o.Buyer.AvatarURL,
			}
		}
		if o.Shop != nil {
			resp.ShopInfo = &models.OrderShopInfo{
				ID:      o.Shop.ID,
				Name:    o.Shop.Name,
				LogoURL: o.Shop.LogoURL,
				City:    o.Shop.City,
			}
		}
		responses = append(responses, resp)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.OrderListResponse{
		Orders:     responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

// UpdateOrderStatus updates order status (seller only)
func (s *OrderService) UpdateOrderStatus(orderID uint, sellerID uint, status models.OrderStatus) (*models.Order, error) {
	order, err := s.GetOrder(orderID)
	if err != nil {
		return nil, err
	}

	// Verify seller owns the shop
	if order.SellerID != sellerID {
		return nil, ErrUnauthorizedOrder
	}

	// Validate status transition
	if !s.isValidStatusTransition(order.Status, status) {
		return nil, ErrInvalidOrderStatus
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status": status,
	}

	switch status {
	case models.OrderStatusConfirmed:
		updates["confirmed_at"] = now
	case models.OrderStatusShipped:
		updates["shipped_at"] = now
		// Deduct stock on shipment
		for _, item := range order.Items {
			s.productService.DeductStock(item.ProductID, item.VariantID, item.Quantity)
		}
	case models.OrderStatusDelivered:
		updates["delivered_at"] = now
	case models.OrderStatusCompleted:
		updates["completed_at"] = now
	}

	if err := database.DB.Model(&order).Updates(updates).Error; err != nil {
		return nil, err
	}

	order.Status = status
	return order, nil
}

// CancelOrder cancels an order
func (s *OrderService) CancelOrder(orderID uint, userID uint, reason string) (*models.Order, error) {
	order, err := s.GetOrder(orderID)
	if err != nil {
		return nil, err
	}

	// Check if user is buyer or seller
	if order.BuyerID != userID && order.SellerID != userID {
		return nil, ErrUnauthorizedOrder
	}

	// Can only cancel if status is new or confirmed
	if order.Status != models.OrderStatusNew && order.Status != models.OrderStatusConfirmed {
		return nil, errors.New("order cannot be cancelled at this stage")
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":        models.OrderStatusCancelled,
		"cancelled_at":  now,
		"cancelled_by":  userID,
		"cancel_reason": reason,
	}

	// Restore reserved stock if order was confirmed
	if order.Status == models.OrderStatusConfirmed {
		for _, item := range order.Items {
			// Restore reserved stock
			if item.VariantID != nil {
				database.DB.Model(&models.ProductVariant{}).
					Where("id = ?", *item.VariantID).
					Update("reserved", gorm.Expr("reserved - ?", item.Quantity))
			}
		}
	}

	if err := database.DB.Model(&order).Updates(updates).Error; err != nil {
		return nil, err
	}

	order.Status = models.OrderStatusCancelled
	return order, nil
}

// MarkNotificationSent marks that seller was notified
func (s *OrderService) MarkNotificationSent(orderID uint) error {
	now := time.Now()
	return database.DB.Model(&models.Order{}).Where("id = ?", orderID).
		Updates(map[string]interface{}{
			"notification_sent":    true,
			"notification_sent_at": now,
		}).Error
}

// Helper: generate unique order number
func (s *OrderService) generateOrderNumber() string {
	now := time.Now()
	return fmt.Sprintf("SM-%s-%d", now.Format("20060102"), now.UnixNano()%100000)
}

// Helper: validate status transitions
func (s *OrderService) isValidStatusTransition(from, to models.OrderStatus) bool {
	validTransitions := map[models.OrderStatus][]models.OrderStatus{
		models.OrderStatusNew:       {models.OrderStatusConfirmed, models.OrderStatusCancelled},
		models.OrderStatusConfirmed: {models.OrderStatusPaid, models.OrderStatusShipped, models.OrderStatusCancelled},
		models.OrderStatusPaid:      {models.OrderStatusShipped},
		models.OrderStatusShipped:   {models.OrderStatusDelivered},
		models.OrderStatusDelivered: {models.OrderStatusCompleted, models.OrderStatusDispute},
	}

	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}

	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}
