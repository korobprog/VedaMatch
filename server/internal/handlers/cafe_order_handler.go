package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// CafeOrderHandler handles cafe order-related HTTP requests
type CafeOrderHandler struct {
	orderService *services.CafeOrderService
	cafeService  *services.CafeService
}

// NewCafeOrderHandler creates a new cafe order handler instance
func NewCafeOrderHandler() *CafeOrderHandler {
	mapService := services.NewMapService(database.DB)
	cafeService := services.NewCafeService(database.DB, mapService)
	dishService := services.NewDishService(database.DB)
	orderService := services.NewCafeOrderService(database.DB, dishService)

	return &CafeOrderHandler{
		orderService: orderService,
		cafeService:  cafeService,
	}
}

// ===== Orders =====

// CreateOrder creates a new order
// POST /api/cafe-orders
func (h *CafeOrderHandler) CreateOrder(c *fiber.Ctx) error {
	var customerID *uint
	var req models.CafeOrderCreateRequest
	if err := c.BodyParser(&req); err != nil {
		log.Printf("[CafeOrderHandler] BodyParser error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	log.Printf("[CafeOrderHandler] Creating order: CafeID=%d, Type=%s, Items=%d", req.CafeID, req.OrderType, len(req.Items))

	// Get customer from context (if authenticated)
	uid := middleware.GetUserID(c)
	if uid != 0 {
		customerID = &uid
		log.Printf("[CafeOrderHandler] Authenticated user: %d", uid)
	}

	order, err := h.orderService.CreateOrder(customerID, req)
	if err != nil {
		log.Printf("[CafeOrderHandler] CreateOrder service error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// TODO: Send WebSocket notification to cafe staff

	return c.Status(fiber.StatusCreated).JSON(order)
}

// GetOrder returns an order by ID
// GET /api/cafe-orders/:id
func (h *CafeOrderHandler) GetOrder(c *fiber.Ctx) error {
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	return c.JSON(order)
}

// ListOrders returns a list of orders for a cafe
// GET /api/cafes/:id/orders
func (h *CafeOrderHandler) ListOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	// Check staff access
	if !h.hasStaffAccess(uint(cafeID), userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	filters := models.CafeOrderFilters{
		CafeID: uint(cafeID),
		Sort:   c.Query("sort"),
	}

	if c.Query("status") != "" {
		filters.Status = models.CafeOrderStatus(c.Query("status"))
	}
	if c.Query("order_type") != "" {
		filters.OrderType = models.CafeOrderType(c.Query("order_type"))
	}
	if c.Query("table_id") != "" {
		if tid, err := strconv.ParseUint(c.Query("table_id"), 10, 32); err == nil {
			tableID := uint(tid)
			filters.TableID = &tableID
		}
	}
	if c.Query("is_paid") != "" {
		isPaid := c.Query("is_paid") == "true"
		filters.IsPaid = &isPaid
	}
	if c.Query("date_from") != "" {
		if t, err := time.Parse("2006-01-02", c.Query("date_from")); err == nil {
			filters.DateFrom = &t
		}
	}
	if c.Query("date_to") != "" {
		if t, err := time.Parse("2006-01-02", c.Query("date_to")); err == nil {
			filters.DateTo = &t
		}
	}
	if c.Query("page") != "" {
		if page, err := strconv.Atoi(c.Query("page")); err == nil {
			filters.Page = page
		}
	}
	if c.Query("limit") != "" {
		if limit, err := strconv.Atoi(c.Query("limit")); err == nil {
			filters.Limit = limit
		}
	}

	orders, err := h.orderService.ListOrders(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list orders"})
	}

	return c.JSON(orders)
}

// GetActiveOrders returns active orders grouped by status
// GET /api/cafes/:id/orders/active
func (h *CafeOrderHandler) GetActiveOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	orders, err := h.orderService.GetActiveOrders(uint(cafeID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get active orders"})
	}

	return c.JSON(orders)
}

// UpdateOrderStatus updates the status of an order
// PUT /api/cafe-orders/:id/status
func (h *CafeOrderHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	// Get order to check cafe
	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	if !h.hasStaffAccess(order.CafeID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req struct {
		Status models.CafeOrderStatus `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.orderService.UpdateOrderStatus(uint(orderID), req.Status, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update order status"})
	}

	// TODO: Send WebSocket notification to customer

	return c.JSON(fiber.Map{"message": "Order status updated", "status": req.Status})
}

// CancelOrder cancels an order
// POST /api/cafe-orders/:id/cancel
func (h *CafeOrderHandler) CancelOrder(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	// Customer can cancel their own order, or staff can cancel
	isCustomer := order.CustomerID != nil && *order.CustomerID == userID
	isStaff := h.hasStaffAccess(order.CafeID, userID)

	if !isCustomer && !isStaff {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req models.CafeOrderCancelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.orderService.CancelOrder(uint(orderID), userID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Order cancelled"})
}

// MarkAsPaid marks an order as paid
// POST /api/cafe-orders/:id/pay
func (h *CafeOrderHandler) MarkAsPaid(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	if !h.hasStaffAccess(order.CafeID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req struct {
		PaymentMethod string `json:"paymentMethod"`
	}
	if err := c.BodyParser(&req); err != nil {
		req.PaymentMethod = "cash"
	}

	if err := h.orderService.MarkAsPaid(uint(orderID), req.PaymentMethod); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to mark as paid"})
	}

	return c.JSON(fiber.Map{"message": "Order marked as paid"})
}

// ===== Order Item Status =====

// UpdateItemStatus updates the status of an order item
// PUT /api/cafe-orders/:id/items/:itemId/status
func (h *CafeOrderHandler) UpdateItemStatus(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}
	itemID, err := strconv.ParseUint(c.Params("itemId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"})
	}

	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	if !h.hasStaffAccess(order.CafeID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.orderService.UpdateItemStatus(uint(itemID), req.Status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update item status"})
	}

	return c.JSON(fiber.Map{"message": "Item status updated"})
}

// ===== Stats =====

// GetOrderStats returns order statistics
// GET /api/cafes/:id/orders/stats
func (h *CafeOrderHandler) GetOrderStats(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	stats, err := h.orderService.GetOrderStats(uint(cafeID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get stats"})
	}

	return c.JSON(stats)
}

// ===== Customer History =====

// GetMyOrders returns customer's order history
// GET /api/cafe-orders/my
func (h *CafeOrderHandler) GetMyOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	limit := 10
	if c.Query("limit") != "" {
		if l, err := strconv.Atoi(c.Query("limit")); err == nil {
			limit = l
		}
	}

	orders, err := h.orderService.GetCustomerOrderHistory(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get orders"})
	}

	return c.JSON(orders)
}

// RepeatOrder creates a new order based on a previous order
// POST /api/cafe-orders/:id/repeat
func (h *CafeOrderHandler) RepeatOrder(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	// Verify this was the customer's order
	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}

	if order.CustomerID == nil || *order.CustomerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not your order"})
	}

	newOrder, err := h.orderService.RepeatOrder(userID, uint(orderID))
	if err != nil {
		log.Printf("[CafeOrderHandler] Error repeating order: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(newOrder)
}

// ===== Helper =====

func (h *CafeOrderHandler) hasStaffAccess(cafeID, userID uint) bool {
	if h.cafeService.IsCafeOwner(cafeID, userID) {
		return true
	}
	isStaff, _ := h.cafeService.IsStaff(cafeID, userID)
	return isStaff
}
