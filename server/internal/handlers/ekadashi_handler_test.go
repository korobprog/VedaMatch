package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"testing"

	"github.com/gofiber/fiber/v2"
)

type mockEkadashiService struct{}

func canUseMockEkadashi(userID uint, role string) bool {
	if role == models.RoleDevotee || models.IsAdminRole(role) {
		return true
	}
	return userID == 77
}

func (m *mockEkadashiService) ListOrganizations(userID uint, role string) ([]models.EkadashiOrganization, error) {
	if !canUseMockEkadashi(userID, role) {
		return nil, services.ErrEkadashiForbidden
	}
	return []models.EkadashiOrganization{{ID: "iskcon", Name: "ISKCON"}}, nil
}
func (m *mockEkadashiService) GetCalendar(userID uint, role, month, organizationID, timezone, city, country string) (*models.EkadashiCalendarResponse, error) {
	if !canUseMockEkadashi(userID, role) {
		return nil, services.ErrEkadashiForbidden
	}
	return &models.EkadashiCalendarResponse{
		Month:  "2026-03",
		Days:   []models.EkadashiDay{{Date: "2026-03-14", EventType: "ekadashi"}},
		Events: []models.EkadashiDay{{Date: "2026-03-06", EventType: "appearance", Title: "Appearance of Srila Bhaktivinoda Thakura"}},
		ProviderDecision: models.EkadashiProviderDecision{
			Mode:   "fallback",
			Source: "fallback_aggregator",
			Reason: "test_reason",
		},
	}, nil
}
func (m *mockEkadashiService) GetDay(userID uint, role, date, organizationID, timezone, city, country string) (*models.EkadashiDay, error) {
	if !canUseMockEkadashi(userID, role) {
		return nil, services.ErrEkadashiForbidden
	}
	return &models.EkadashiDay{Date: "2026-03-14"}, nil
}
func (m *mockEkadashiService) GetPushPreference(userID uint, role string) (*models.EkadashiPushPreferenceResponse, error) {
	if !canUseMockEkadashi(userID, role) {
		return nil, services.ErrEkadashiForbidden
	}
	return &models.EkadashiPushPreferenceResponse{UserID: userID, OrganizationID: "iskcon"}, nil
}
func (m *mockEkadashiService) UpsertPushPreference(userID uint, role string, req models.EkadashiPushPreferenceUpsertRequest) (*models.EkadashiPushPreferenceResponse, error) {
	if !canUseMockEkadashi(userID, role) {
		return nil, services.ErrEkadashiForbidden
	}
	return &models.EkadashiPushPreferenceResponse{UserID: userID, OrganizationID: req.OrganizationID}, nil
}

func TestEkadashiHandlerGetOrganizationsForbiddenForNonDevotee(t *testing.T) {
	app := fiber.New()
	handler := NewEkadashiHandlerWithService(&mockEkadashiService{})
	app.Get("/ekadashi/organizations", func(c *fiber.Ctx) error {
		c.Locals("userRole", models.RoleUser)
		return handler.GetOrganizations(c)
	})

	req := httptest.NewRequest("GET", "/ekadashi/organizations", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("test request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("unexpected status: %d", resp.StatusCode)
	}
}

func TestEkadashiHandlerGetOrganizationsSuccess(t *testing.T) {
	app := fiber.New()
	handler := NewEkadashiHandlerWithService(&mockEkadashiService{})
	app.Get("/ekadashi/organizations", func(c *fiber.Ctx) error {
		c.Locals("userRole", models.RoleAdmin)
		return handler.GetOrganizations(c)
	})

	req := httptest.NewRequest("GET", "/ekadashi/organizations", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("test request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("unexpected status: %d", resp.StatusCode)
	}
	var payload map[string][]models.EkadashiOrganization
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if len(payload["organizations"]) != 1 {
		t.Fatalf("unexpected organizations payload")
	}
}

func TestEkadashiHandlerGetOrganizationsAllowsProViewer(t *testing.T) {
	app := fiber.New()
	handler := NewEkadashiHandlerWithService(&mockEkadashiService{})
	app.Get("/ekadashi/organizations", func(c *fiber.Ctx) error {
		c.Locals("userRole", models.RoleUser)
		c.Locals("userID", uint(77))
		return handler.GetOrganizations(c)
	})

	req := httptest.NewRequest("GET", "/ekadashi/organizations", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("test request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("unexpected status: %d", resp.StatusCode)
	}
}

func TestEkadashiHandlerGetCalendarAllowsAdminRole(t *testing.T) {
	app := fiber.New()
	handler := NewEkadashiHandlerWithService(&mockEkadashiService{})
	app.Get("/ekadashi/calendar", func(c *fiber.Ctx) error {
		c.Locals("userRole", models.RoleSuperadmin)
		return handler.GetCalendar(c)
	})

	req := httptest.NewRequest("GET", "/ekadashi/calendar?month=2026-03", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("test request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("unexpected status: %d", resp.StatusCode)
	}
}

func TestEkadashiHandlerGetCalendarIncludesProviderDecisionAndEvents(t *testing.T) {
	app := fiber.New()
	handler := NewEkadashiHandlerWithService(&mockEkadashiService{})
	app.Get("/ekadashi/calendar", func(c *fiber.Ctx) error {
		c.Locals("userRole", models.RoleDevotee)
		return handler.GetCalendar(c)
	})

	req := httptest.NewRequest("GET", "/ekadashi/calendar?month=2026-03", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("test request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("unexpected status: %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	providerDecision, ok := payload["providerDecision"].(map[string]any)
	if !ok {
		t.Fatalf("expected providerDecision object, got %#v", payload["providerDecision"])
	}
	if providerDecision["reason"] != "test_reason" {
		t.Fatalf("unexpected provider decision: %#v", providerDecision)
	}
	events, ok := payload["events"].([]any)
	if !ok || len(events) != 1 {
		t.Fatalf("expected events array, got %#v", payload["events"])
	}
}
