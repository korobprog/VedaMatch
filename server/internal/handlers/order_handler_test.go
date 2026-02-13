package handlers

import (
	"net/http/httptest"
	"testing"

	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

type mockOrderService struct {
	getBuyerOrdersFn  func(buyerID uint, filters models.OrderFilters) (*models.OrderListResponse, error)
	getSellerOrdersFn func(sellerID uint, filters models.OrderFilters) (*models.OrderListResponse, error)
}

func (m *mockOrderService) CreateOrder(buyerID uint, req models.OrderCreateRequest) (*models.Order, error) {
	return &models.Order{}, nil
}

func (m *mockOrderService) GetOrder(orderID uint) (*models.Order, error) {
	return &models.Order{}, nil
}

func (m *mockOrderService) GetBuyerOrders(buyerID uint, filters models.OrderFilters) (*models.OrderListResponse, error) {
	if m.getBuyerOrdersFn != nil {
		return m.getBuyerOrdersFn(buyerID, filters)
	}
	return &models.OrderListResponse{Orders: []models.OrderResponse{}, Page: filters.Page, TotalPages: 1}, nil
}

func (m *mockOrderService) GetSellerOrders(sellerID uint, filters models.OrderFilters) (*models.OrderListResponse, error) {
	if m.getSellerOrdersFn != nil {
		return m.getSellerOrdersFn(sellerID, filters)
	}
	return &models.OrderListResponse{Orders: []models.OrderResponse{}, Page: filters.Page, TotalPages: 1}, nil
}

func (m *mockOrderService) UpdateOrderStatus(orderID uint, sellerID uint, status models.OrderStatus) (*models.Order, error) {
	return &models.Order{}, nil
}

func (m *mockOrderService) CancelOrder(orderID uint, userID uint, reason string) (*models.Order, error) {
	return &models.Order{}, nil
}

func (m *mockOrderService) MarkNotificationSent(orderID uint) error {
	return nil
}

func TestOrderHandler_GetMyOrders_ParsesChannelFilters(t *testing.T) {
	app := fiber.New()
	handler := NewOrderHandlerWithService(&mockOrderService{
		getBuyerOrdersFn: func(buyerID uint, filters models.OrderFilters) (*models.OrderListResponse, error) {
			if buyerID != 55 {
				t.Fatalf("buyerID=%d, want=55", buyerID)
			}
			if filters.Source != "channel_post" {
				t.Fatalf("source=%q, want=channel_post", filters.Source)
			}
			if filters.SourcePostID == nil || *filters.SourcePostID != 12 {
				t.Fatalf("sourcePostID=%v, want=12", filters.SourcePostID)
			}
			if filters.SourceChannelID == nil || *filters.SourceChannelID != 34 {
				t.Fatalf("sourceChannelID=%v, want=34", filters.SourceChannelID)
			}
			if filters.Page != 2 {
				t.Fatalf("page=%d, want=2", filters.Page)
			}
			if filters.Limit != 15 {
				t.Fatalf("limit=%d, want=15", filters.Limit)
			}
			if filters.Status != models.OrderStatusConfirmed {
				t.Fatalf("status=%q, want=%q", filters.Status, models.OrderStatusConfirmed)
			}
			return &models.OrderListResponse{Orders: []models.OrderResponse{}, Page: filters.Page, TotalPages: 1}, nil
		},
	})

	app.Get("/orders/my", func(c *fiber.Ctx) error {
		c.Locals("userID", "55")
		return handler.GetMyOrders(c)
	})

	req := httptest.NewRequest("GET", "/orders/my?page=2&limit=15&status=confirmed&source=channel_post&sourcePostId=12&sourceChannelId=34", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}
}

func TestOrderHandler_GetSellerOrders_InvalidSourcePostIDIgnored(t *testing.T) {
	app := fiber.New()
	handler := NewOrderHandlerWithService(&mockOrderService{
		getSellerOrdersFn: func(sellerID uint, filters models.OrderFilters) (*models.OrderListResponse, error) {
			if sellerID != 77 {
				t.Fatalf("sellerID=%d, want=77", sellerID)
			}
			if filters.Source != "channel_post" {
				t.Fatalf("source=%q, want=channel_post", filters.Source)
			}
			if filters.SourcePostID != nil {
				t.Fatalf("sourcePostID should be nil for invalid value, got=%v", filters.SourcePostID)
			}
			if filters.SourceChannelID == nil || *filters.SourceChannelID != 44 {
				t.Fatalf("sourceChannelID=%v, want=44", filters.SourceChannelID)
			}
			return &models.OrderListResponse{Orders: []models.OrderResponse{}, Page: 1, TotalPages: 1}, nil
		},
	})

	app.Get("/orders/seller", func(c *fiber.Ctx) error {
		c.Locals("userID", "77")
		return handler.GetSellerOrders(c)
	})

	req := httptest.NewRequest("GET", "/orders/seller?source=channel_post&sourcePostId=bad&sourceChannelId=44", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}
}
