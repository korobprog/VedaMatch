package handlers

import (
	"errors"
	"fmt"
	"strconv"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type orderService interface {
	CreateOrder(buyerID uint, req models.OrderCreateRequest) (*models.Order, error)
	GetOrder(orderID uint) (*models.Order, error)
	GetBuyerOrders(buyerID uint, filters models.OrderFilters) (*models.OrderListResponse, error)
	GetSellerOrders(sellerID uint, filters models.OrderFilters) (*models.OrderListResponse, error)
	UpdateOrderStatus(orderID uint, sellerID uint, status models.OrderStatus) (*models.Order, error)
	CancelOrder(orderID uint, userID uint, reason string) (*models.Order, error)
	MarkNotificationSent(orderID uint) error
}

type OrderHandler struct {
	orderService orderService
	shopService  *services.ShopService
}

func NewOrderHandler() *OrderHandler {
	return NewOrderHandlerWithService(services.NewOrderService())
}

func NewOrderHandlerWithService(orderService orderService) *OrderHandler {
	return &OrderHandler{
		orderService: orderService,
		shopService:  services.NewShopService(),
	}
}

// ==================== BUYER ENDPOINTS ====================

// CreateOrder creates a new order from cart
func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.OrderCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate
	if req.ShopID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Shop ID is required",
		})
	}
	if len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cart is empty",
		})
	}
	if req.BuyerName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Buyer name is required",
		})
	}

	order, err := h.orderService.CreateOrder(userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// TODO: Send notification to seller's tech room
	// This would use the rooms/messaging service to notify seller
	go h.notifySellerAboutOrder(order)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"orderId":     order.ID,
		"orderNumber": order.OrderNumber,
		"message":     "Order placed successfully! The seller will be notified.",
	})
}

// GetMyOrders returns buyer's orders
func (h *OrderHandler) GetMyOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	filters := models.OrderFilters{
		Status: models.OrderStatus(c.Query("status")),
		Search: c.Query("search"),
		Sort:   c.Query("sort", "newest"),
		Source: c.Query("source"),
	}
	if sourcePostID := parseOptionalUintQuery(c, "sourcePostId"); sourcePostID != nil {
		filters.SourcePostID = sourcePostID
	}
	if sourceChannelID := parseOptionalUintQuery(c, "sourceChannelId"); sourceChannelID != nil {
		filters.SourceChannelID = sourceChannelID
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	filters.Page = page
	filters.Limit = limit

	result, err := h.orderService.GetBuyerOrders(userID, filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch orders",
		})
	}

	return c.JSON(result)
}

// GetOrder returns a single order by ID
func (h *OrderHandler) GetOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	orderID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid order ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Order not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch order",
		})
	}

	// Check if user is buyer or seller
	if order.BuyerID != userID && order.SellerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You don't have access to this order",
		})
	}

	// Build response
	response := models.OrderResponse{Order: *order}
	if order.Buyer != nil {
		response.BuyerInfo = &models.OrderUserInfo{
			ID:            order.Buyer.ID,
			SpiritualName: order.Buyer.SpiritualName,
			KarmicName:    order.Buyer.KarmicName,
			AvatarURL:     order.Buyer.AvatarURL,
		}
	}
	if order.Shop != nil {
		response.ShopInfo = &models.OrderShopInfo{
			ID:      order.Shop.ID,
			Name:    order.Shop.Name,
			LogoURL: order.Shop.LogoURL,
			City:    order.Shop.City,
		}
	}

	return c.JSON(response)
}

// CancelOrder cancels an order (buyer)
func (h *OrderHandler) CancelOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	orderID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid order ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.OrderCancelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	order, err := h.orderService.CancelOrder(uint(orderID), userID, req.Reason)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Order not found",
			})
		}
		if errors.Is(err, services.ErrUnauthorizedOrder) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You don't have access to this order",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Order cancelled successfully",
		"order":   order,
	})
}

// ==================== SELLER ENDPOINTS ====================

// GetSellerOrders returns orders for seller's shop
func (h *OrderHandler) GetSellerOrders(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	filters := models.OrderFilters{
		Status: models.OrderStatus(c.Query("status")),
		Search: c.Query("search"),
		Sort:   c.Query("sort", "newest"),
		Source: c.Query("source"),
	}
	if sourcePostID := parseOptionalUintQuery(c, "sourcePostId"); sourcePostID != nil {
		filters.SourcePostID = sourcePostID
	}
	if sourceChannelID := parseOptionalUintQuery(c, "sourceChannelId"); sourceChannelID != nil {
		filters.SourceChannelID = sourceChannelID
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	filters.Page = page
	filters.Limit = limit

	result, err := h.orderService.GetSellerOrders(userID, filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch orders",
		})
	}

	return c.JSON(result)
}

// UpdateOrderStatus updates order status (seller)
func (h *OrderHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	orderID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid order ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.OrderUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Status == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Status is required",
		})
	}

	order, err := h.orderService.UpdateOrderStatus(uint(orderID), userID, *req.Status)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Order not found",
			})
		}
		if errors.Is(err, services.ErrUnauthorizedOrder) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You can only manage orders for your shop",
			})
		}
		if errors.Is(err, services.ErrInvalidOrderStatus) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid status transition",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update order",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Order status updated",
		"order":   order,
	})
}

// ContactBuyer initiates chat with buyer (seller)
func (h *OrderHandler) ContactBuyer(c *fiber.Ctx) error {
	id := c.Params("id")
	orderID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid order ID",
		})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	order, err := h.orderService.GetOrder(uint(orderID))
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Order not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch order",
		})
	}

	// Verify this is the seller
	if order.SellerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only seller can contact buyer through this endpoint",
		})
	}

	// Return deep link to buyer's contact
	return c.JSON(fiber.Map{
		"buyerId":   order.BuyerID,
		"buyerName": order.BuyerName,
		"deepLink":  fmt.Sprintf("sattva://contacts/%d", order.BuyerID),
	})
}

// notifySellerAboutOrder sends notification to seller's tech room
func (h *OrderHandler) notifySellerAboutOrder(order *models.Order) {
	// Get shop with tech room
	var shop models.Shop
	if err := database.DB.First(&shop, order.ShopID).Error; err != nil {
		fmt.Printf("[Order Notification] failed to load shop %d for order %d: %v\n", order.ShopID, order.ID, err)
		return
	}

	// If shop has a tech room, send notification there
	if shop.TechRoomID != nil {
		// Get buyer info
		var buyer models.User
		if err := database.DB.First(&buyer, order.BuyerID).Error; err != nil {
			fmt.Printf("[Order Notification] failed to load buyer %d for order %d: %v\n", order.BuyerID, order.ID, err)
		}

		buyerName := buyer.SpiritualName
		if buyerName == "" {
			buyerName = buyer.KarmicName
		}
		if buyerName == "" {
			buyerName = "Покупатель"
		}

		notification := models.OrderNotification{
			OrderID:     order.ID,
			OrderNumber: order.OrderNumber,
			BuyerID:     order.BuyerID,
			BuyerName:   buyerName,
			ItemsCount:  order.ItemsCount,
			Total:       order.Total,
			Currency:    order.Currency,
			DeepLink:    fmt.Sprintf("sattva://contacts/%d", order.BuyerID),
		}

		// TODO: Send message to tech room using room service
		// For now, log the notification
		fmt.Printf("[Order Notification] Shop %d: New order #%s (ID: %d) from %s (UserID: %d), %d items, Total: %.2f %s. DeepLink: %s\n",
			order.ShopID, notification.OrderNumber, notification.OrderID, notification.BuyerName, notification.BuyerID, notification.ItemsCount, notification.Total, notification.Currency, notification.DeepLink)
	}

	// Mark notification as sent
	if err := h.orderService.MarkNotificationSent(order.ID); err != nil {
		fmt.Printf("[Order Notification] failed to mark notification sent for order %d: %v\n", order.ID, err)
	}
}

func parseOptionalUintQuery(c *fiber.Ctx, key string) *uint {
	value := c.Query(key)
	if value == "" {
		return nil
	}
	parsed, err := strconv.ParseUint(value, 10, 32)
	if err != nil {
		return nil
	}
	result := uint(parsed)
	return &result
}
