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
	"gorm.io/gorm/clause"
)

// OrderService handles order-related business logic
type OrderService struct {
	productService *ProductService
	walletService  *WalletService
}

// NewOrderService creates a new OrderService
func NewOrderService() *OrderService {
	return &OrderService{
		productService: NewProductService(),
		walletService:  NewWalletService(),
	}
}

// Errors
var (
	ErrOrderNotFound      = errors.New("order not found")
	ErrUnauthorizedOrder  = errors.New("unauthorized to access this order")
	ErrEmptyCart          = errors.New("cart is empty")
	ErrInvalidOrderStatus = errors.New("invalid order status transition")
)

func normalizeMarketPaymentMethod(method string) string {
	method = strings.ToLower(strings.TrimSpace(method))
	if method == "" {
		return "external"
	}
	return method
}

func isValidMarketPaymentMethod(method string) bool {
	switch method {
	case "external", "lkm":
		return true
	default:
		return false
	}
}

func clampBonusPercent(percent int) int {
	if percent < 0 {
		return 0
	}
	if percent > 100 {
		return 100
	}
	return percent
}

func moneyToLKM(amount float64) int {
	if amount <= 0 {
		return 0
	}
	return int(math.Round(amount))
}

func calculateOrderTotalPages(total int64, limit int) int {
	if limit <= 0 {
		return 1
	}
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages < 1 {
		return 1
	}
	return totalPages
}

// CreateOrder creates a new order from cart items
func (s *OrderService) CreateOrder(buyerID uint, req models.OrderCreateRequest) (*models.Order, error) {
	if len(req.Items) == 0 {
		return nil, ErrEmptyCart
	}
	req.PaymentMethod = normalizeMarketPaymentMethod(req.PaymentMethod)
	if !isValidMarketPaymentMethod(req.PaymentMethod) {
		return nil, errors.New("invalid payment method")
	}

	// Get shop info
	var shop models.Shop
	if err := database.DB.First(&shop, req.ShopID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, errors.New("shop not found")
	}

	// Start transaction
	tx := database.DB.Begin()

	// Process items and calculate totals
	var orderItems []models.OrderItem
	var subtotal float64
	bonusCapLKM := 0

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
			variantFound := false
			// Find variant
			for _, v := range product.Variants {
				if v.ID == *cartItem.VariantID {
					variantFound = true
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
			if !variantFound {
				tx.Rollback()
				return nil, fmt.Errorf("variant %d not found for product %d", *cartItem.VariantID, product.ID)
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
				res := tx.Model(&models.ProductVariant{}).
					Where("id = ? AND product_id = ? AND (stock - reserved) >= ?", *cartItem.VariantID, product.ID, cartItem.Quantity).
					Update("reserved", gorm.Expr("reserved + ?", cartItem.Quantity))
				if res.Error != nil {
					tx.Rollback()
					return nil, res.Error
				}
				if res.RowsAffected == 0 {
					var exists int64
					if err := tx.Model(&models.ProductVariant{}).
						Where("id = ? AND product_id = ?", *cartItem.VariantID, product.ID).
						Count(&exists).Error; err != nil {
						tx.Rollback()
						return nil, err
					}
					tx.Rollback()
					if exists == 0 {
						return nil, fmt.Errorf("variant %d not found for product %d", *cartItem.VariantID, product.ID)
					}
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
		if shop.IsVedaMatch {
			itemTotalLKM := moneyToLKM(itemTotal)
			bonusCapLKM += itemTotalLKM * clampBonusPercent(product.MaxBonusLkmPercent) / 100
		}

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
		PaymentMethod:   req.PaymentMethod,
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
	shouldTriggerReferralActivation := false

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
	if err := tx.Model(&models.Shop{}).Where("id = ?", req.ShopID).
		UpdateColumn("orders_count", gorm.Expr("orders_count + 1")).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Update product sales count
	for _, item := range orderItems {
		if err := tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
			UpdateColumn("sales_count", gorm.Expr("sales_count + ?", item.Quantity)).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if req.PaymentMethod == "lkm" {
		totalLKM := moneyToLKM(order.Total)
		if totalLKM < 0 {
			tx.Rollback()
			return nil, errors.New("invalid order amount")
		}
		if bonusCapLKM > totalLKM {
			bonusCapLKM = totalLKM
		}

		paymentAllocation := SpendAllocation{}
		if totalLKM > 0 {
			allocation, _, err := s.walletService.spendTxWithOptions(
				tx,
				buyerID,
				totalLKM,
				fmt.Sprintf("market_order_%d", order.ID),
				"Оплата заказа в магазине "+shop.Name,
				SpendOptions{
					AllowBonus:      shop.IsVedaMatch && bonusCapLKM > 0,
					MaxBonusPercent: 100,
					MaxBonusAmount:  bonusCapLKM,
				},
			)
			if err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("payment failed: %w", err)
			}
			paymentAllocation = allocation
			shouldTriggerReferralActivation = true
		}

		now := time.Now().UTC()
		paymentUpdates := map[string]interface{}{
			"is_paid":          true,
			"paid_at":          now,
			"regular_lkm_paid": paymentAllocation.RegularAmount,
			"bonus_lkm_paid":   paymentAllocation.BonusAmount,
		}
		if err := tx.Model(&order).Updates(paymentUpdates).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		order.IsPaid = true
		paidAt := now
		order.PaidAt = &paidAt
		order.RegularLkmPaid = paymentAllocation.RegularAmount
		order.BonusLkmPaid = paymentAllocation.BonusAmount
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	if shouldTriggerReferralActivation {
		go func(uid uint) {
			referralService := NewReferralService(s.walletService)
			if err := referralService.ProcessActivation(uid); err != nil {
				fmt.Printf("[Orders] referral activation failed for user %d: %v\n", uid, err)
			}
		}(buyerID)
	}

	if order.Source == "channel_post" {
		if err := GetMetricsService().Increment(MetricOrdersFromChannelTotal, 1); err != nil {
			// Metrics must not block business flow.
			fmt.Printf("[Orders] metric increment failed (%s): %v\n", MetricOrdersFromChannelTotal, err)
		}
	}

	// Load full order with items
	if err := database.DB.Preload("Items").First(&order, order.ID).Error; err != nil {
		return nil, err
	}

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
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
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
	if search := strings.TrimSpace(filters.Search); search != "" {
		query = query.Where("order_number ILIKE ?", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

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

	totalPages := calculateOrderTotalPages(total, limit)

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

	now := time.Now().UTC()
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
			if err := s.productService.DeductStock(item.ProductID, item.VariantID, item.Quantity); err != nil {
				return nil, err
			}
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
	var cancelledOrder models.Order
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			First(&cancelledOrder, orderID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOrderNotFound
			}
			return err
		}

		// Check if user is buyer or seller
		if cancelledOrder.BuyerID != userID && cancelledOrder.SellerID != userID {
			return ErrUnauthorizedOrder
		}

		// Can only cancel if status is new or confirmed
		if cancelledOrder.Status != models.OrderStatusNew && cancelledOrder.Status != models.OrderStatusConfirmed {
			return errors.New("order cannot be cancelled at this stage")
		}

		now := time.Now().UTC()
		updates := map[string]interface{}{
			"status":        models.OrderStatusCancelled,
			"cancelled_at":  now,
			"cancelled_by":  userID,
			"cancel_reason": reason,
		}

		// Restore reserved stock if order was confirmed
		if cancelledOrder.Status == models.OrderStatusConfirmed {
			for _, item := range cancelledOrder.Items {
				if item.VariantID == nil {
					continue
				}
				if err := tx.Model(&models.ProductVariant{}).
					Where("id = ?", *item.VariantID).
					Update("reserved", gorm.Expr("reserved - ?", item.Quantity)).Error; err != nil {
					return err
				}
			}
		}

		if cancelledOrder.PaymentMethod == "lkm" && cancelledOrder.IsPaid && (cancelledOrder.RegularLkmPaid+cancelledOrder.BonusLkmPaid) > 0 {
			if err := s.walletService.refundTxWithSplit(
				tx,
				cancelledOrder.BuyerID,
				cancelledOrder.RegularLkmPaid,
				cancelledOrder.BonusLkmPaid,
				"Возврат за отмену заказа "+cancelledOrder.OrderNumber,
				nil,
			); err != nil {
				return err
			}
			updates["is_paid"] = false
		}

		if err := tx.Model(&cancelledOrder).Updates(updates).Error; err != nil {
			return err
		}

		cancelledOrder.Status = models.OrderStatusCancelled
		return nil
	}); err != nil {
		return nil, err
	}

	return &cancelledOrder, nil
}

// MarkNotificationSent marks that seller was notified
func (s *OrderService) MarkNotificationSent(orderID uint) error {
	now := time.Now().UTC()
	return database.DB.Model(&models.Order{}).Where("id = ?", orderID).
		Updates(map[string]interface{}{
			"notification_sent":    true,
			"notification_sent_at": now,
		}).Error
}

// Helper: generate unique order number
func (s *OrderService) generateOrderNumber() string {
	now := time.Now().UTC()
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
