package handlers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"testing"

	"github.com/gofiber/fiber/v2"
)

type mockPathTrackerService struct {
	enabled       bool
	markUnlockErr error
}

func (m *mockPathTrackerService) IsEnabled() bool {
	return m.enabled
}

func (m *mockPathTrackerService) IsEnabledForUser(userID uint) bool {
	return m.enabled
}

func (m *mockPathTrackerService) MaybeEmitMonitoringAlerts() {}

func (m *mockPathTrackerService) GetToday(userID uint) (*services.TodayView, error) {
	return &services.TodayView{}, nil
}

func (m *mockPathTrackerService) GetWeeklySummary(userID uint) (*services.WeeklySummaryView, error) {
	return &services.WeeklySummaryView{}, nil
}

func (m *mockPathTrackerService) GetMetricsSummary() (*services.PathTrackerMetricsSummary, error) {
	return &services.PathTrackerMetricsSummary{}, nil
}

func (m *mockPathTrackerService) GetAnalytics(days int) (*services.PathTrackerAnalytics, error) {
	return &services.PathTrackerAnalytics{}, nil
}

func (m *mockPathTrackerService) GetOpsSnapshot() (*services.PathTrackerOpsSnapshot, error) {
	return &services.PathTrackerOpsSnapshot{}, nil
}

func (m *mockPathTrackerService) GetAlertEvents(page int, pageSize int, deliveryStatus string, alertType string, sortBy string, sortDir string) ([]services.PathTrackerAlertEventView, int64, error) {
	return []services.PathTrackerAlertEventView{}, 0, nil
}

func (m *mockPathTrackerService) RetryAlertEvent(alertID uint) (*services.PathTrackerAlertEventView, error) {
	return &services.PathTrackerAlertEventView{ID: alertID, DeliveryStatus: "sent"}, nil
}

func (m *mockPathTrackerService) RetryFailedAlerts(minutes int, limit int) (*services.PathTrackerAlertRetrySummary, error) {
	return &services.PathTrackerAlertRetrySummary{}, nil
}

func (m *mockPathTrackerService) GetUnlockStatus(userID uint, role string) (*services.PathTrackerUnlockStatus, error) {
	return &services.PathTrackerUnlockStatus{}, nil
}

func (m *mockPathTrackerService) MarkUnlockOpened(userID uint, serviceID string) error {
	return m.markUnlockErr
}

func (m *mockPathTrackerService) SaveCheckin(userID uint, input services.CheckinInput) (*models.DailyCheckin, error) {
	return &models.DailyCheckin{
		UserID:           userID,
		MoodCode:         input.MoodCode,
		EnergyCode:       input.EnergyCode,
		AvailableMinutes: input.AvailableMinutes,
	}, nil
}

func (m *mockPathTrackerService) GenerateStep(userID uint) (*services.DailyStepView, error) {
	return &services.DailyStepView{}, nil
}

func (m *mockPathTrackerService) CompleteStep(userID uint, stepID uint) (*services.DailyStepView, error) {
	return &services.DailyStepView{}, nil
}

func (m *mockPathTrackerService) ReflectStep(userID, stepID uint, resultMood, reflectionText string) (string, error) {
	return "ok", nil
}

func (m *mockPathTrackerService) AssistantHelp(userID, stepID uint, requestType, message string) (*services.AssistantResult, error) {
	return &services.AssistantResult{Reply: "ok"}, nil
}

func TestPathTrackerSaveCheckinRequiresAuth(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: true})
	app.Post("/checkin", handler.SaveCheckin)

	req := httptest.NewRequest("POST", "/checkin", bytes.NewBufferString(`{"moodCode":"calm","energyCode":"medium","availableMinutes":5}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusUnauthorized)
	}
}

func TestPathTrackerSaveCheckinValidatesMinutes(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: true})
	app.Post("/checkin", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.SaveCheckin(c)
	})

	req := httptest.NewRequest("POST", "/checkin", bytes.NewBufferString(`{"moodCode":"calm","energyCode":"medium","availableMinutes":7}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusBadRequest)
	}
}

func TestPathTrackerSaveCheckinSuccess(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: true})
	app.Post("/checkin", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.SaveCheckin(c)
	})

	req := httptest.NewRequest("POST", "/checkin", bytes.NewBufferString(`{"moodCode":"calm","energyCode":"medium","availableMinutes":5}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}

	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["checkin"] == nil {
		t.Fatalf("expected checkin in response")
	}
}

func TestPathTrackerSaveCheckinBlockedByRollout(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: false})
	app.Post("/checkin", func(c *fiber.Ctx) error {
		c.Locals("userID", "7")
		return handler.SaveCheckin(c)
	})

	req := httptest.NewRequest("POST", "/checkin", bytes.NewBufferString(`{"moodCode":"calm","energyCode":"medium","availableMinutes":5}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusForbidden)
	}
}

func TestPathTrackerUnlockOpenedValidatesServiceID(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: true})
	app.Post("/unlock-opened", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.MarkUnlockOpened(c)
	})

	req := httptest.NewRequest("POST", "/unlock-opened", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusBadRequest)
	}
}

func TestPathTrackerUnlockOpenedSuccess(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: true})
	app.Post("/unlock-opened", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.MarkUnlockOpened(c)
	})

	req := httptest.NewRequest("POST", "/unlock-opened", bytes.NewBufferString(`{"serviceId":"news"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
}

func TestPathTrackerUnlockOpenedInvalidService(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{
		enabled:       true,
		markUnlockErr: services.ErrInvalidUnlockService,
	})
	app.Post("/unlock-opened", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.MarkUnlockOpened(c)
	})

	req := httptest.NewRequest("POST", "/unlock-opened", bytes.NewBufferString(`{"serviceId":"unknown"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusBadRequest)
	}
}

func TestPathTrackerGetAlertEventsPagination(t *testing.T) {
	app := fiber.New()
	handler := NewPathTrackerHandlerWithService(&mockPathTrackerService{enabled: true})
	app.Get("/alerts", handler.GetAlertEvents)

	req := httptest.NewRequest("GET", "/alerts?page=2&pageSize=11&status=failed&type=path_tracker_generate_error_rate_high&sortBy=createdAt&sortDir=asc", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}

	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got := int(body["page"].(float64)); got != 2 {
		t.Fatalf("page = %d, want 2", got)
	}
	if got := int(body["pageSize"].(float64)); got != 11 {
		t.Fatalf("pageSize = %d, want 11", got)
	}
}
