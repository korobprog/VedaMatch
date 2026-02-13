package handlers

import (
	"bytes"
	"net/http/httptest"
	"testing"
	"time"

	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

type mockBookingService struct {
	createFn func(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error)
}

func (m *mockBookingService) Create(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error) {
	if m.createFn != nil {
		return m.createFn(serviceID, clientID, req)
	}
	return &models.ServiceBooking{}, nil
}
func (m *mockBookingService) GetMyBookings(clientID uint, filters models.BookingFilters) (*models.BookingListResponse, error) {
	return &models.BookingListResponse{}, nil
}
func (m *mockBookingService) GetIncomingBookings(ownerID uint, filters models.BookingFilters) (*models.BookingListResponse, error) {
	return &models.BookingListResponse{}, nil
}
func (m *mockBookingService) GetUpcoming(ownerID uint) (*models.UpcomingBookingsResponse, error) {
	return &models.UpcomingBookingsResponse{}, nil
}
func (m *mockBookingService) Confirm(bookingID, ownerID uint, req models.BookingActionRequest) (*models.ServiceBooking, error) {
	return &models.ServiceBooking{}, nil
}
func (m *mockBookingService) Cancel(bookingID, userID uint, req models.BookingActionRequest) (*models.ServiceBooking, error) {
	return &models.ServiceBooking{}, nil
}
func (m *mockBookingService) Complete(bookingID, ownerID uint, req models.BookingActionRequest) (*models.ServiceBooking, error) {
	return &models.ServiceBooking{}, nil
}
func (m *mockBookingService) MarkNoShow(bookingID, ownerID uint) (*models.ServiceBooking, error) {
	return &models.ServiceBooking{}, nil
}

type mockBookingCalendarService struct{}

func (m *mockBookingCalendarService) GetSlotsForRange(serviceID uint, dateFrom, dateTo, timezone string) ([]models.SlotsResponse, error) {
	return []models.SlotsResponse{}, nil
}
func (m *mockBookingCalendarService) GetAvailableSlots(serviceID uint, date, timezone string) (*models.SlotsResponse, error) {
	return &models.SlotsResponse{}, nil
}
func (m *mockBookingCalendarService) GetBusyTimes(userID uint, dateFrom, dateTo string) ([]models.ServiceBooking, error) {
	return []models.ServiceBooking{}, nil
}

func TestBookingHandler_Book_PassesChannelAttribution(t *testing.T) {
	app := fiber.New()
	handler := NewBookingHandler(&mockBookingService{
		createFn: func(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error) {
			if serviceID != 12 {
				t.Fatalf("serviceID=%d, want=12", serviceID)
			}
			if clientID != 99 {
				t.Fatalf("clientID=%d, want=99", clientID)
			}
			if req.TariffID != 5 {
				t.Fatalf("tariffID=%d, want=5", req.TariffID)
			}
			if req.Source != "channel_post" {
				t.Fatalf("source=%q, want=channel_post", req.Source)
			}
			if req.SourcePostID == nil || *req.SourcePostID != 77 {
				t.Fatalf("sourcePostID=%v, want=77", req.SourcePostID)
			}
			if req.SourceChannelID == nil || *req.SourceChannelID != 33 {
				t.Fatalf("sourceChannelID=%v, want=33", req.SourceChannelID)
			}
			return &models.ServiceBooking{}, nil
		},
	}, &mockBookingCalendarService{})

	app.Post("/services/:id/book", func(c *fiber.Ctx) error {
		c.Locals("userID", "99")
		return handler.Book(c)
	})

	body := `{
		"tariffId": 5,
		"scheduledAt": "2026-02-20T12:30:00Z",
		"clientNote": "Имена на ягью",
		"source": "channel_post",
		"sourcePostId": 77,
		"sourceChannelId": 33
	}`
	req := httptest.NewRequest("POST", "/services/12/book", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusCreated {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusCreated)
	}
}

func TestBookingHandler_Book_InvalidDateFormat(t *testing.T) {
	app := fiber.New()
	serviceCalled := false
	handler := NewBookingHandler(&mockBookingService{
		createFn: func(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error) {
			serviceCalled = true
			return &models.ServiceBooking{}, nil
		},
	}, &mockBookingCalendarService{})

	app.Post("/services/:id/book", func(c *fiber.Ctx) error {
		c.Locals("userID", "12")
		return handler.Book(c)
	})

	req := httptest.NewRequest("POST", "/services/3/book", bytes.NewBufferString(`{
		"tariffId": 5,
		"scheduledAt": "20.02.2026 12:30"
	}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusBadRequest)
	}
	if serviceCalled {
		t.Fatalf("booking service should not be called for invalid date")
	}
}

func TestBookingHandler_Book_ParsesScheduledAtRFC3339(t *testing.T) {
	app := fiber.New()
	handler := NewBookingHandler(&mockBookingService{
		createFn: func(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error) {
			expected, _ := time.Parse(time.RFC3339, "2026-02-20T12:30:00+03:00")
			if !req.ScheduledAt.Equal(expected) {
				t.Fatalf("scheduledAt=%s, want=%s", req.ScheduledAt.Format(time.RFC3339), expected.Format(time.RFC3339))
			}
			return &models.ServiceBooking{}, nil
		},
	}, &mockBookingCalendarService{})

	app.Post("/services/:id/book", func(c *fiber.Ctx) error {
		c.Locals("userID", "44")
		return handler.Book(c)
	})

	req := httptest.NewRequest("POST", "/services/9/book", bytes.NewBufferString(`{
		"tariffId": 1,
		"scheduledAt": "2026-02-20T12:30:00+03:00"
	}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusCreated {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusCreated)
	}
}
