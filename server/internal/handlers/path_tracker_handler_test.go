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
	enabled bool
}

func (m *mockPathTrackerService) IsEnabled() bool {
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
