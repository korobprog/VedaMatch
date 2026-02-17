package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/websocket"
	"strings"
	"time"

	"gorm.io/gorm"
)

// CafeOrderService handles cafe order-related operations
type CafeOrderService struct {
	db            *gorm.DB
	dishService   *DishService
	walletService *WalletService
}

func isValidCafePaymentMethod(method string) bool {
	switch method {
	case "", "cash", "card_terminal", "lkm":
		return true
	default:
		return false
	}
}

func isValidOrderItemStatus(status string) bool {
	switch normalizeCafeOrderItemStatus(status) {
	case "pending", "preparing", "ready", "cancelled":
		return true
	default:
		return false
	}
}

func normalizeCafeOrderItemStatus(status string) string {
	return strings.ToLower(strings.TrimSpace(status))
}

func calculateCafeOrderTotalPages(total int64, limit int) int {
	if limit <= 0 {
		return 1
	}
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}
	return totalPages
}

// NewCafeOrderService creates a new cafe order service instance
func NewCafeOrderService(db *gorm.DB, dishService *DishService) *CafeOrderService {
	return &CafeOrderService{
		db:            db,
		dishService:   dishService,
		walletService: NewWalletService(),
	}
}

// ===== Order CRUD =====

// CreateOrder creates a new cafe order
func (s *CafeOrderService) CreateOrder(customerID *uint, req models.CafeOrderCreateRequest) (*models.CafeOrder, error) {
	req.CustomerName = strings.TrimSpace(req.CustomerName)
	req.DeliveryAddress = strings.TrimSpace(req.DeliveryAddress)
	req.DeliveryPhone = strings.TrimSpace(req.DeliveryPhone)
	req.CustomerNote = strings.TrimSpace(req.CustomerNote)
	req.PaymentMethod = strings.TrimSpace(req.PaymentMethod)
	if req.PaymentMethod == "" {
		req.PaymentMethod = "cash"
	}

	if len(req.Items) == 0 {
		return nil, errors.New("order must contain at least one item")
	}
	if req.OrderType == "" {
		req.OrderType = models.CafeOrderTypeTakeaway
	}
	switch req.OrderType {
	case models.CafeOrderTypeDineIn, models.CafeOrderTypeTakeaway, models.CafeOrderTypeDelivery:
	default:
		return nil, errors.New("invalid order type")
	}
	if !isValidCafePaymentMethod(req.PaymentMethod) {
		return nil, errors.New("invalid payment method")
	}

	// Validate order type requirements
	if req.OrderType == models.CafeOrderTypeDineIn && req.TableID == nil {
		return nil, errors.New("table ID required for dine-in orders")
	}
	if req.OrderType == models.CafeOrderTypeDelivery && req.DeliveryAddress == "" {
		return nil, errors.New("delivery address required for delivery orders")
	}
	if req.OrderType == models.CafeOrderTypeDelivery && req.DeliveryPhone == "" {
		return nil, errors.New("delivery phone required for delivery orders")
	}

	// Load cafe for VedaMatch/payment and delivery settings.
	var cafe models.Cafe
	if err := s.db.First(&cafe, req.CafeID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, errors.New("cafe not found")
	}

	// Calculate order totals
	var items []models.CafeOrderItem
	var subtotal float64
	bonusCapLKM := 0
	dishIDs := make([]uint, 0)

	for _, itemReq := range req.Items {
		if itemReq.Quantity <= 0 {
			return nil, fmt.Errorf("invalid quantity for dish %d", itemReq.DishID)
		}

		dish, err := s.dishService.GetDish(itemReq.DishID)
		if err != nil {
			return nil, fmt.Errorf("dish %d not found", itemReq.DishID)
		}
		if dish.CafeID != req.CafeID {
			return nil, fmt.Errorf("dish %d does not belong to this cafe", itemReq.DishID)
		}

		if !dish.IsActive || !dish.IsAvailable {
			return nil, fmt.Errorf("dish %s is currently unavailable", dish.Name)
		}

		itemTotal := dish.Price * float64(itemReq.Quantity)

		// Handle modifiers
		var modifiers []models.CafeOrderItemModifier
		for _, modReq := range itemReq.Modifiers {
			var modifier models.DishModifier
			if err := s.db.Where("id = ? AND dish_id = ? AND is_available = ?", modReq.ModifierID, dish.ID, true).
				First(&modifier).Error; err != nil {
				return nil, fmt.Errorf("modifier %d not found", modReq.ModifierID)
			}

			qty := modReq.Quantity
			if qty == 0 {
				qty = 1
			}
			if qty < 0 {
				return nil, fmt.Errorf("invalid modifier quantity for modifier %d", modReq.ModifierID)
			}
			if modifier.MaxQuantity > 0 && qty > modifier.MaxQuantity {
				return nil, fmt.Errorf("modifier %d quantity exceeds maximum allowed", modReq.ModifierID)
			}

			modTotal := modifier.Price * float64(qty)
			itemTotal += modTotal

			modifiers = append(modifiers, models.CafeOrderItemModifier{
				ModifierID:   modifier.ID,
				ModifierName: modifier.Name,
				Price:        modifier.Price,
				Quantity:     qty,
				Total:        modTotal,
			})
		}

		// Handle removed ingredients
		removedIngredientsJSON := ""
		if len(itemReq.RemovedIngredients) > 0 {
			jsonBytes, err := json.Marshal(itemReq.RemovedIngredients)
			if err != nil {
				return nil, errors.New("failed to serialize removed ingredients")
			}
			removedIngredientsJSON = string(jsonBytes)
		}

		items = append(items, models.CafeOrderItem{
			DishID:             dish.ID,
			DishName:           dish.Name,
			ImageURL:           dish.ImageURL,
			UnitPrice:          dish.Price,
			Quantity:           itemReq.Quantity,
			Total:              itemTotal,
			RemovedIngredients: removedIngredientsJSON,
			CustomerNote:       strings.TrimSpace(itemReq.Note),
			Status:             "pending",
			Modifiers:          modifiers,
		})

		if cafe.IsVedaMatch {
			itemTotalLKM := moneyToLKM(itemTotal)
			bonusCapLKM += itemTotalLKM * clampBonusPercent(dish.MaxBonusLkmPercent) / 100
		}

		subtotal += itemTotal
		dishIDs = append(dishIDs, dish.ID)
	}

	if req.OrderType == models.CafeOrderTypeDineIn && req.TableID != nil {
		var table models.CafeTable
		if err := s.db.Where("id = ? AND cafe_id = ? AND is_active = ?", *req.TableID, req.CafeID, true).First(&table).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, err
			}
			return nil, errors.New("table not found for this cafe")
		}
	}

	deliveryFee := 0.0
	if req.OrderType == models.CafeOrderTypeDelivery {
		deliveryFee = cafe.DeliveryFee
	}

	total := subtotal + deliveryFee

	// Generate order number
	orderNumber := s.generateOrderNumber(req.CafeID)

	// Calculate estimated ready time
	estimatedReadyAt := time.Now().UTC().Add(time.Duration(cafe.AvgPrepTime) * time.Minute)

	order := &models.CafeOrder{
		OrderNumber:       orderNumber,
		CafeID:            req.CafeID,
		CustomerID:        customerID,
		CustomerName:      req.CustomerName,
		OrderType:         req.OrderType,
		TableID:           req.TableID,
		DeliveryAddress:   req.DeliveryAddress,
		DeliveryLatitude:  req.DeliveryLat,
		DeliveryLongitude: req.DeliveryLng,
		DeliveryPhone:     req.DeliveryPhone,
		Status:            models.CafeOrderStatusNew,
		ItemsCount:        len(items),
		Subtotal:          subtotal,
		DeliveryFee:       deliveryFee,
		Total:             total,
		Currency:          "RUB",
		PaymentMethod:     req.PaymentMethod,
		CustomerNote:      req.CustomerNote,
		EstimatedReadyAt:  &estimatedReadyAt,
		Items:             items,
	}
	shouldTriggerReferralActivation := false

	// Create order in transaction
	createOrderTx := func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		// If dine-in, update table status
		if req.OrderType == models.CafeOrderTypeDineIn && req.TableID != nil {
			now := time.Now().UTC()
			updateResult := tx.Model(&models.CafeTable{}).
				Where("id = ? AND cafe_id = ? AND is_occupied = ?", *req.TableID, req.CafeID, false).
				Updates(map[string]interface{}{
					"is_occupied":      true,
					"current_order_id": order.ID,
					"occupied_since":   now,
				})
			if updateResult.Error != nil {
				return updateResult.Error
			}
			if updateResult.RowsAffected == 0 {
				return errors.New("table is already occupied")
			}
		}

		if req.PaymentMethod == "lkm" {
			if customerID == nil || *customerID == 0 {
				return errors.New("authentication required for lkm payment")
			}
			totalLKM := moneyToLKM(order.Total)
			if totalLKM < 0 {
				return errors.New("invalid order amount")
			}

			effectiveBonusCap := bonusCapLKM
			if effectiveBonusCap > totalLKM {
				effectiveBonusCap = totalLKM
			}

			paymentAllocation := SpendAllocation{}
			if totalLKM > 0 {
				allocation, _, err := s.walletService.spendTxWithOptions(
					tx,
					*customerID,
					totalLKM,
					fmt.Sprintf("cafe_order_%d", order.ID),
					"Оплата заказа в кафе "+cafe.Name,
					SpendOptions{
						AllowBonus:      cafe.IsVedaMatch && effectiveBonusCap > 0,
						MaxBonusPercent: 100,
						MaxBonusAmount:  effectiveBonusCap,
					},
				)
				if err != nil {
					return fmt.Errorf("payment failed: %w", err)
				}
				paymentAllocation = allocation
				shouldTriggerReferralActivation = true
			}

			now := time.Now().UTC()
			if err := tx.Model(order).Updates(map[string]interface{}{
				"is_paid":          true,
				"paid_at":          now,
				"regular_lkm_paid": paymentAllocation.RegularAmount,
				"bonus_lkm_paid":   paymentAllocation.BonusAmount,
			}).Error; err != nil {
				return err
			}
			order.IsPaid = true
			order.PaidAt = &now
			order.RegularLkmPaid = paymentAllocation.RegularAmount
			order.BonusLkmPaid = paymentAllocation.BonusAmount
		}

		// Increment dish order counts
		if len(dishIDs) > 0 {
			if err := tx.Model(&models.Dish{}).
				Where("id IN ?", dishIDs).
				UpdateColumn("orders_count", gorm.Expr("orders_count + 1")).Error; err != nil {
				return err
			}
		}

		return nil
	}

	err := s.db.Transaction(createOrderTx)
	for attempt := 0; attempt < 3 && err != nil && isOrderNumberConflict(err); attempt++ {
		order.OrderNumber = s.generateOrderNumber(req.CafeID)
		err = s.db.Transaction(createOrderTx)
	}

	if err != nil {
		return nil, err
	}
	if shouldTriggerReferralActivation && customerID != nil && *customerID != 0 {
		go func(uid uint) {
			referralService := NewReferralService(s.walletService)
			if err := referralService.ProcessActivation(uid); err != nil {
				fmt.Printf("[CafeOrders] referral activation failed for user %d: %v\n", uid, err)
			}
		}(*customerID)
	}

	// Send WebSocket notification to cafe staff
	websocket.NotifyNewOrder(order.CafeID, map[string]interface{}{
		"orderId":      order.ID,
		"orderNumber":  order.OrderNumber,
		"orderType":    order.OrderType,
		"tableId":      order.TableID,
		"itemsCount":   order.ItemsCount,
		"total":        order.Total,
		"customerName": order.CustomerName,
	}, customerID)

	return order, nil
}

// GetOrder returns an order by ID
func (s *CafeOrderService) GetOrder(orderID uint) (*models.CafeOrderResponse, error) {
	var order models.CafeOrder
	err := s.db.Preload("Items").
		Preload("Items.Modifiers").
		Preload("Customer").
		Preload("Cafe").
		Preload("Table").
		First(&order, orderID).Error

	if err != nil {
		return nil, err
	}

	response := &models.CafeOrderResponse{CafeOrder: order}

	if order.Customer != nil {
		response.CustomerInfo = &models.CafeOrderCustomerInfo{
			ID:            order.Customer.ID,
			SpiritualName: order.Customer.SpiritualName,
			KarmicName:    order.Customer.KarmicName,
			AvatarURL:     order.Customer.AvatarURL,
		}
	}

	if order.Cafe != nil {
		response.CafeInfo = &models.CafeOrderCafeInfo{
			ID:      order.Cafe.ID,
			Name:    order.Cafe.Name,
			LogoURL: order.Cafe.LogoURL,
			Address: order.Cafe.Address,
		}
	}

	if order.Table != nil {
		response.TableInfo = &models.CafeOrderTableInfo{
			ID:     order.Table.ID,
			Number: order.Table.Number,
			Name:   order.Table.Name,
		}
	}

	return response, nil
}

// ListOrders returns a paginated list of orders
func (s *CafeOrderService) ListOrders(filters models.CafeOrderFilters) (*models.CafeOrderListResponse, error) {
	filters.Search = strings.TrimSpace(filters.Search)
	filters.Sort = strings.TrimSpace(filters.Sort)

	query := s.db.Model(&models.CafeOrder{})

	// Apply filters
	if filters.CafeID != 0 {
		query = query.Where("cafe_id = ?", filters.CafeID)
	}
	if filters.CustomerID != nil {
		query = query.Where("customer_id = ?", *filters.CustomerID)
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.OrderType != "" {
		query = query.Where("order_type = ?", filters.OrderType)
	}
	if filters.TableID != nil {
		query = query.Where("table_id = ?", *filters.TableID)
	}
	if filters.IsPaid != nil {
		query = query.Where("is_paid = ?", *filters.IsPaid)
	}
	if filters.DateFrom != nil {
		query = query.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		query = query.Where("created_at <= ?", *filters.DateTo)
	}
	if filters.Search != "" {
		query = query.Where("order_number ILIKE ?", "%"+filters.Search+"%")
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
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Sorting
	switch filters.Sort {
	case "oldest":
		query = query.Order("created_at ASC")
	default:
		query = query.Order("created_at DESC")
	}

	var orders []models.CafeOrder
	err := query.Preload("Items").
		Preload("Customer").
		Preload("Cafe").
		Preload("Table").
		Offset(offset).Limit(limit).
		Find(&orders).Error
	if err != nil {
		return nil, err
	}

	// Build response
	responses := make([]models.CafeOrderResponse, len(orders))
	for i, order := range orders {
		responses[i] = models.CafeOrderResponse{CafeOrder: order}
		if order.Customer != nil {
			responses[i].CustomerInfo = &models.CafeOrderCustomerInfo{
				ID:            order.Customer.ID,
				SpiritualName: order.Customer.SpiritualName,
				KarmicName:    order.Customer.KarmicName,
				AvatarURL:     order.Customer.AvatarURL,
			}
		}
		if order.Cafe != nil {
			responses[i].CafeInfo = &models.CafeOrderCafeInfo{
				ID:      order.Cafe.ID,
				Name:    order.Cafe.Name,
				LogoURL: order.Cafe.LogoURL,
			}
		}
		if order.Table != nil {
			responses[i].TableInfo = &models.CafeOrderTableInfo{
				ID:     order.Table.ID,
				Number: order.Table.Number,
				Name:   order.Table.Name,
			}
		}
	}

	return &models.CafeOrderListResponse{
		Orders:     responses,
		Total:      total,
		Page:       page,
		TotalPages: calculateCafeOrderTotalPages(total, limit),
	}, nil
}

// GetActiveOrders returns active orders grouped by status
func (s *CafeOrderService) GetActiveOrders(cafeID uint) (*models.ActiveOrdersResponse, error) {
	activeStatuses := []models.CafeOrderStatus{
		models.CafeOrderStatusNew,
		models.CafeOrderStatusConfirmed,
		models.CafeOrderStatusPreparing,
		models.CafeOrderStatusReady,
	}

	var orders []models.CafeOrder
	err := s.db.Where("cafe_id = ? AND status IN ?", cafeID, activeStatuses).
		Preload("Items").
		Preload("Customer").
		Preload("Table").
		Order("created_at ASC").
		Find(&orders).Error
	if err != nil {
		return nil, err
	}

	response := &models.ActiveOrdersResponse{
		New:       make([]models.CafeOrderResponse, 0),
		Preparing: make([]models.CafeOrderResponse, 0),
		Ready:     make([]models.CafeOrderResponse, 0),
	}

	for _, order := range orders {
		orderResp := models.CafeOrderResponse{CafeOrder: order}
		if order.Customer != nil {
			orderResp.CustomerInfo = &models.CafeOrderCustomerInfo{
				ID:            order.Customer.ID,
				SpiritualName: order.Customer.SpiritualName,
				KarmicName:    order.Customer.KarmicName,
				AvatarURL:     order.Customer.AvatarURL,
			}
		}
		if order.Table != nil {
			orderResp.TableInfo = &models.CafeOrderTableInfo{
				ID:     order.Table.ID,
				Number: order.Table.Number,
				Name:   order.Table.Name,
			}
		}

		switch order.Status {
		case models.CafeOrderStatusNew:
			response.New = append(response.New, orderResp)
		case models.CafeOrderStatusConfirmed, models.CafeOrderStatusPreparing:
			response.Preparing = append(response.Preparing, orderResp)
		case models.CafeOrderStatusReady:
			response.Ready = append(response.Ready, orderResp)
		}
	}

	response.Total = len(orders)
	return response, nil
}

// UpdateOrderStatus updates the status of an order
func (s *CafeOrderService) UpdateOrderStatus(orderID uint, status models.CafeOrderStatus, staffUserID uint) error {
	switch status {
	case models.CafeOrderStatusNew,
		models.CafeOrderStatusConfirmed,
		models.CafeOrderStatusPreparing,
		models.CafeOrderStatusReady,
		models.CafeOrderStatusServed,
		models.CafeOrderStatusDelivering,
		models.CafeOrderStatusCompleted,
		models.CafeOrderStatusCancelled:
	default:
		return errors.New("invalid order status")
	}

	now := time.Now().UTC()
	updates := map[string]interface{}{"status": status}

	switch status {
	case models.CafeOrderStatusConfirmed:
		updates["confirmed_at"] = now
		updates["accepted_by"] = staffUserID
	case models.CafeOrderStatusPreparing:
		updates["preparing_at"] = now
		updates["prepared_by"] = staffUserID
	case models.CafeOrderStatusReady:
		updates["ready_at"] = now
	case models.CafeOrderStatusServed:
		updates["served_at"] = now
		updates["served_by"] = staffUserID
	case models.CafeOrderStatusDelivering:
		updates["delivered_by"] = staffUserID
	case models.CafeOrderStatusCompleted:
		updates["completed_at"] = now
	case models.CafeOrderStatusCancelled:
		updates["cancelled_at"] = now
		updates["cancelled_by"] = staffUserID
	}

	var order models.CafeOrder
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		updateResult := tx.Model(&models.CafeOrder{}).Where("id = ?", orderID).Updates(updates)
		if updateResult.Error != nil {
			return updateResult.Error
		}
		if updateResult.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}

		if err := tx.First(&order, orderID).Error; err != nil {
			return err
		}

		// If completed/cancelled and was dine-in, free the table.
		if status == models.CafeOrderStatusCompleted || status == models.CafeOrderStatusCancelled {
			if order.TableID != nil {
				if err := tx.Model(&models.CafeTable{}).Where("id = ?", *order.TableID).Updates(map[string]interface{}{
					"is_occupied":      false,
					"current_order_id": nil,
					"occupied_since":   nil,
				}).Error; err != nil {
					return err
				}
			}

			// Update cafe orders count only for completed orders.
			if status == models.CafeOrderStatusCompleted {
				if err := tx.Model(&models.Cafe{}).Where("id = ?", order.CafeID).
					UpdateColumn("orders_count", gorm.Expr("orders_count + 1")).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return err
	}

	// Send WebSocket notification after successful commit.
	websocket.NotifyOrderStatusUpdate(order.CafeID, orderID, string(status), order.CustomerID)

	return nil
}

// CancelOrder cancels an order
func (s *CafeOrderService) CancelOrder(orderID uint, userID uint, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "cancelled"
	}
	now := time.Now().UTC()

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var order models.CafeOrder
		if err := tx.First(&order, orderID).Error; err != nil {
			return err
		}

		// Can't cancel already completed or cancelled orders
		if order.Status == models.CafeOrderStatusCompleted || order.Status == models.CafeOrderStatusCancelled {
			return errors.New("order cannot be cancelled")
		}

		orderUpdates := map[string]interface{}{
			"status":        models.CafeOrderStatusCancelled,
			"cancelled_at":  now,
			"cancelled_by":  userID,
			"cancel_reason": reason,
		}

		if order.PaymentMethod == "lkm" && order.IsPaid && order.CustomerID != nil && (order.RegularLkmPaid+order.BonusLkmPaid) > 0 {
			if err := s.walletService.refundTxWithSplit(
				tx,
				*order.CustomerID,
				order.RegularLkmPaid,
				order.BonusLkmPaid,
				"Возврат за отмену заказа "+order.OrderNumber,
				nil,
			); err != nil {
				return err
			}
			orderUpdates["is_paid"] = false
			orderUpdates["paid_at"] = nil
			orderUpdates["regular_lkm_paid"] = 0
			orderUpdates["bonus_lkm_paid"] = 0
		}

		// Update order
		if err := tx.Model(&order).Updates(orderUpdates).Error; err != nil {
			return err
		}

		// Free table if was dine-in
		if order.TableID != nil {
			if err := tx.Model(&models.CafeTable{}).Where("id = ?", *order.TableID).Updates(map[string]interface{}{
				"is_occupied":      false,
				"current_order_id": nil,
				"occupied_since":   nil,
			}).Error; err != nil {
				return err
			}
		}

		return nil
	})

	return err
}

// MarkAsPaid marks an order as paid
func (s *CafeOrderService) MarkAsPaid(orderID uint, paymentMethod string) error {
	paymentMethod = strings.TrimSpace(paymentMethod)
	if paymentMethod == "" {
		return errors.New("payment method is required")
	}
	if paymentMethod == "lkm" {
		return errors.New("lkm payment is processed automatically on order creation")
	}
	if !isValidCafePaymentMethod(paymentMethod) {
		return errors.New("invalid payment method")
	}

	var order models.CafeOrder
	if err := s.db.Select("id", "status").First(&order, orderID).Error; err != nil {
		return err
	}
	if order.Status == models.CafeOrderStatusCancelled {
		return errors.New("cancelled order cannot be marked as paid")
	}

	now := time.Now().UTC()
	updateResult := s.db.Model(&models.CafeOrder{}).Where("id = ?", orderID).Updates(map[string]interface{}{
		"is_paid":        true,
		"paid_at":        now,
		"payment_method": paymentMethod,
	})
	if updateResult.Error != nil {
		return updateResult.Error
	}
	if updateResult.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// ===== Order Item Status =====

// UpdateItemStatus updates the status of an order item
func (s *CafeOrderService) UpdateItemStatus(itemID uint, status string) error {
	status = normalizeCafeOrderItemStatus(status)
	if !isValidOrderItemStatus(status) {
		return errors.New("invalid item status")
	}
	updates := map[string]interface{}{"status": status}
	if status == "ready" {
		now := time.Now().UTC()
		updates["prepared_at"] = &now
	}
	result := s.db.Model(&models.CafeOrderItem{}).Where("id = ?", itemID).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// ===== Stats =====

// GetOrderStats returns order statistics for a cafe
func (s *CafeOrderService) GetOrderStats(cafeID uint) (*models.CafeOrderStatsResponse, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	var todayOrders int64
	var todayRevenue float64
	var pendingOrders int64
	var totalOrders int64
	var totalRevenue float64

	// Today's orders
	if err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND created_at >= ? AND status != ?", cafeID, today, models.CafeOrderStatusCancelled).
		Count(&todayOrders).Error; err != nil {
		return nil, err
	}

	// Today's revenue
	if err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND created_at >= ? AND status = ?", cafeID, today, models.CafeOrderStatusCompleted).
		Select("COALESCE(SUM(total), 0)").Scan(&todayRevenue).Error; err != nil {
		return nil, err
	}

	// Pending orders
	if err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND status IN ?", cafeID,
			[]models.CafeOrderStatus{models.CafeOrderStatusNew, models.CafeOrderStatusConfirmed, models.CafeOrderStatusPreparing}).
		Count(&pendingOrders).Error; err != nil {
		return nil, err
	}

	// Total orders
	if err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND status = ?", cafeID, models.CafeOrderStatusCompleted).
		Count(&totalOrders).Error; err != nil {
		return nil, err
	}

	// Total revenue
	if err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND status = ?", cafeID, models.CafeOrderStatusCompleted).
		Select("COALESCE(SUM(total), 0)").Scan(&totalRevenue).Error; err != nil {
		return nil, err
	}

	// Average preparation time
	var avgPrepTime float64
	if err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND confirmed_at IS NOT NULL AND ready_at IS NOT NULL", cafeID).
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (ready_at - confirmed_at)) / 60), 0)").
		Scan(&avgPrepTime).Error; err != nil {
		return nil, err
	}

	return &models.CafeOrderStatsResponse{
		TodayOrders:   int(todayOrders),
		TodayRevenue:  todayRevenue,
		PendingOrders: int(pendingOrders),
		AvgPrepTime:   avgPrepTime,
		TotalOrders:   int(totalOrders),
		TotalRevenue:  totalRevenue,
	}, nil
}

// ===== Customer History =====

// GetCustomerOrderHistory returns order history for a customer
func (s *CafeOrderService) GetCustomerOrderHistory(customerID uint, limit int) ([]models.CafeOrderResponse, error) {
	if limit <= 0 {
		limit = 10
	}

	var orders []models.CafeOrder
	err := s.db.Where("customer_id = ?", customerID).
		Preload("Items").
		Preload("Cafe").
		Order("created_at DESC").
		Limit(limit).
		Find(&orders).Error
	if err != nil {
		return nil, err
	}

	responses := make([]models.CafeOrderResponse, len(orders))
	for i, order := range orders {
		responses[i] = models.CafeOrderResponse{CafeOrder: order}
		if order.Cafe != nil {
			responses[i].CafeInfo = &models.CafeOrderCafeInfo{
				ID:      order.Cafe.ID,
				Name:    order.Cafe.Name,
				LogoURL: order.Cafe.LogoURL,
				Address: order.Cafe.Address,
			}
		}
	}

	return responses, nil
}

// RepeatOrder creates a new order based on a previous order
func (s *CafeOrderService) RepeatOrder(customerID, previousOrderID uint) (*models.CafeOrder, error) {
	var prevOrder models.CafeOrder
	err := s.db.Preload("Items").Preload("Items.Modifiers").First(&prevOrder, previousOrderID).Error
	if err != nil {
		return nil, err
	}
	if prevOrder.CustomerID == nil || *prevOrder.CustomerID != customerID {
		return nil, errors.New("not authorized to repeat this order")
	}

	// Build new order request from previous order
	items := make([]models.CafeOrderItemRequest, len(prevOrder.Items))
	for i, item := range prevOrder.Items {
		modifiers := make([]models.CafeOrderModifierRequest, len(item.Modifiers))
		for j, mod := range item.Modifiers {
			modifiers[j] = models.CafeOrderModifierRequest{
				ModifierID: mod.ModifierID,
				Quantity:   mod.Quantity,
			}
		}

		var removedIngredients []string
		if item.RemovedIngredients != "" {
			if err := json.Unmarshal([]byte(item.RemovedIngredients), &removedIngredients); err != nil {
				return nil, errors.New("failed to parse removed ingredients from previous order")
			}
		}

		items[i] = models.CafeOrderItemRequest{
			DishID:             item.DishID,
			Quantity:           item.Quantity,
			RemovedIngredients: removedIngredients,
			Modifiers:          modifiers,
			Note:               item.CustomerNote,
		}
	}

	req := models.CafeOrderCreateRequest{
		CafeID:          prevOrder.CafeID,
		OrderType:       prevOrder.OrderType,
		TableID:         prevOrder.TableID,
		DeliveryAddress: prevOrder.DeliveryAddress,
		DeliveryPhone:   prevOrder.DeliveryPhone,
		DeliveryLat:     prevOrder.DeliveryLatitude,
		DeliveryLng:     prevOrder.DeliveryLongitude,
		CustomerName:    prevOrder.CustomerName,
		Items:           items,
		CustomerNote:    prevOrder.CustomerNote,
		PaymentMethod:   prevOrder.PaymentMethod,
	}

	return s.CreateOrder(&customerID, req)
}

// ===== Helpers =====

func (s *CafeOrderService) generateOrderNumber(cafeID uint) string {
	// Format: CAFE-ID-YYMMDD-XXXX
	now := time.Now().UTC()
	dateStr := now.Format("060102")

	// Get today's order count for this cafe
	todayStart := now.Truncate(24 * time.Hour)
	var count int64
	err := s.db.Model(&models.CafeOrder{}).
		Where("cafe_id = ? AND created_at >= ?", cafeID, todayStart).
		Count(&count).Error
	if err != nil {
		return fmt.Sprintf("C%d-%s-%04d", cafeID, dateStr, now.UnixNano()%10000)
	}

	return fmt.Sprintf("C%d-%s-%04d", cafeID, dateStr, count+1)
}

func isOrderNumberConflict(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") && strings.Contains(msg, "order_number")
}
