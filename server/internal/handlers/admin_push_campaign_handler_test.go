package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type mockAdminPushCampaignService struct {
	createFn        func(actorID uint, req models.AdminPushCampaignCreateRequest) (*models.AdminPushCampaign, error)
	listFn          func(filters services.AdminPushCampaignListFilters) ([]models.AdminPushCampaign, int64, error)
	getFn           func(id uint) (*models.AdminPushCampaign, error)
	getRecipientsFn func(campaignID uint, page, limit int) ([]services.AdminPushCampaignRecipientView, int64, error)
	cancelFn        func(id uint) error
}

func (m *mockAdminPushCampaignService) CreateCampaign(actorID uint, req models.AdminPushCampaignCreateRequest) (*models.AdminPushCampaign, error) {
	return m.createFn(actorID, req)
}

func (m *mockAdminPushCampaignService) ListCampaigns(filters services.AdminPushCampaignListFilters) ([]models.AdminPushCampaign, int64, error) {
	return m.listFn(filters)
}

func (m *mockAdminPushCampaignService) GetCampaign(id uint) (*models.AdminPushCampaign, error) {
	return m.getFn(id)
}

func (m *mockAdminPushCampaignService) GetCampaignRecipients(campaignID uint, page, limit int) ([]services.AdminPushCampaignRecipientView, int64, error) {
	return m.getRecipientsFn(campaignID, page, limit)
}

func (m *mockAdminPushCampaignService) CancelCampaign(id uint) error {
	return m.cancelFn(id)
}

func withAdminContext(handler fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals("userID", uint(7))
		c.Locals("userRole", models.RoleAdmin)
		return handler(c)
	}
}

func TestCreatePushCampaign(t *testing.T) {
	app := fiber.New()
	handler := &AdminHandler{
		pushCampaignService: &mockAdminPushCampaignService{
			createFn: func(actorID uint, req models.AdminPushCampaignCreateRequest) (*models.AdminPushCampaign, error) {
				if actorID != 7 {
					t.Fatalf("expected actor 7, got %d", actorID)
				}
				if req.Title != "Hello" {
					t.Fatalf("expected title Hello, got %q", req.Title)
				}
				return &models.AdminPushCampaign{ID: 15, Title: req.Title, Status: "sent"}, nil
			},
		},
	}
	app.Post("/campaigns", withAdminContext(handler.CreatePushCampaign))

	body := []byte(`{"sendMode":"now","targetMode":"user","targetUserId":42,"title":"Hello","body":"World","priority":"high"}`)
	req := httptest.NewRequest("POST", "/campaigns", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
}

func TestListPushCampaigns(t *testing.T) {
	app := fiber.New()
	handler := &AdminHandler{
		pushCampaignService: &mockAdminPushCampaignService{
			listFn: func(filters services.AdminPushCampaignListFilters) ([]models.AdminPushCampaign, int64, error) {
				if filters.Status != "scheduled" || filters.Page != 2 || filters.Limit != 10 {
					t.Fatalf("unexpected filters: %+v", filters)
				}
				return []models.AdminPushCampaign{{ID: 1, Status: "scheduled"}}, 1, nil
			},
		},
	}
	app.Get("/campaigns", withAdminContext(handler.ListPushCampaigns))

	req := httptest.NewRequest("GET", "/campaigns?status=scheduled&page=2&limit=10", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var payload struct {
		Total int `json:"total"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload.Total != 1 {
		t.Fatalf("expected total=1, got %d", payload.Total)
	}
}

func TestGetPushCampaign(t *testing.T) {
	now := time.Now().UTC()
	app := fiber.New()
	handler := &AdminHandler{
		pushCampaignService: &mockAdminPushCampaignService{
			getFn: func(id uint) (*models.AdminPushCampaign, error) {
				if id != 9 {
					t.Fatalf("expected id 9, got %d", id)
				}
				return &models.AdminPushCampaign{ID: 9, Title: "Digest", CreatedAt: now}, nil
			},
			getRecipientsFn: func(campaignID uint, page, limit int) ([]services.AdminPushCampaignRecipientView, int64, error) {
				return []services.AdminPushCampaignRecipientView{{ID: 1, UserID: 42, Status: "sent"}}, 1, nil
			},
		},
	}
	app.Get("/campaigns/:id", withAdminContext(handler.GetPushCampaign))

	req := httptest.NewRequest("GET", "/campaigns/9", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var payload struct {
		RecipientsTotal int `json:"recipientsTotal"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload.RecipientsTotal != 1 {
		t.Fatalf("expected recipientsTotal=1, got %d", payload.RecipientsTotal)
	}
}

func TestGetPushCampaignNotFound(t *testing.T) {
	app := fiber.New()
	handler := &AdminHandler{
		pushCampaignService: &mockAdminPushCampaignService{
			getFn: func(id uint) (*models.AdminPushCampaign, error) {
				return nil, gorm.ErrRecordNotFound
			},
			getRecipientsFn: func(campaignID uint, page, limit int) ([]services.AdminPushCampaignRecipientView, int64, error) {
				return nil, 0, nil
			},
		},
	}
	app.Get("/campaigns/:id", withAdminContext(handler.GetPushCampaign))

	req := httptest.NewRequest("GET", "/campaigns/5", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestCancelPushCampaign(t *testing.T) {
	app := fiber.New()
	handler := &AdminHandler{
		pushCampaignService: &mockAdminPushCampaignService{
			cancelFn: func(id uint) error {
				if id != 11 {
					t.Fatalf("expected id 11, got %d", id)
				}
				return nil
			},
		},
	}
	app.Post("/campaigns/:id/cancel", withAdminContext(handler.CancelPushCampaign))

	req := httptest.NewRequest("POST", "/campaigns/11/cancel", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestCancelPushCampaignValidationError(t *testing.T) {
	app := fiber.New()
	handler := &AdminHandler{
		pushCampaignService: &mockAdminPushCampaignService{
			cancelFn: func(id uint) error {
				return errors.New("campaign is not scheduled")
			},
		},
	}
	app.Post("/campaigns/:id/cancel", withAdminContext(handler.CancelPushCampaign))

	req := httptest.NewRequest("POST", "/campaigns/11/cancel", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}
