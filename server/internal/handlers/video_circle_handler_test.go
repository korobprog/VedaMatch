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

type mockVideoCircleService struct {
	listCirclesFn     func(userID uint, role string, params models.VideoCircleListParams) (*models.VideoCircleListResponse, error)
	createCircleFn    func(userID uint, role string, req models.VideoCircleCreateRequest) (*models.VideoCircleResponse, error)
	listMyCirclesFn   func(userID uint, page, limit int) (*models.VideoCircleListResponse, error)
	deleteCircleFn    func(circleID, userID uint, role string) error
	updateCircleFn    func(circleID, userID uint, role string, req models.VideoCircleUpdateRequest) (*models.VideoCircleResponse, error)
	republishCircleFn func(circleID, userID uint, role string, req models.VideoCircleRepublishRequest) (*models.VideoCircleResponse, error)
	addInteractionFn  func(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error)
	applyBoostFn      func(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error)
	listTariffsFn     func() ([]models.VideoTariff, error)
	createTariffFn    func(req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error)
	updateTariffFn    func(id uint, req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error)
}

func (m *mockVideoCircleService) ListCircles(userID uint, role string, params models.VideoCircleListParams) (*models.VideoCircleListResponse, error) {
	if m.listCirclesFn != nil {
		return m.listCirclesFn(userID, role, params)
	}
	return &models.VideoCircleListResponse{}, nil
}
func (m *mockVideoCircleService) CreateCircle(userID uint, role string, req models.VideoCircleCreateRequest) (*models.VideoCircleResponse, error) {
	if m.createCircleFn != nil {
		return m.createCircleFn(userID, role, req)
	}
	return &models.VideoCircleResponse{}, nil
}
func (m *mockVideoCircleService) ListMyCircles(userID uint, page, limit int) (*models.VideoCircleListResponse, error) {
	if m.listMyCirclesFn != nil {
		return m.listMyCirclesFn(userID, page, limit)
	}
	return &models.VideoCircleListResponse{}, nil
}
func (m *mockVideoCircleService) DeleteCircle(circleID, userID uint, role string) error {
	if m.deleteCircleFn != nil {
		return m.deleteCircleFn(circleID, userID, role)
	}
	return nil
}
func (m *mockVideoCircleService) UpdateCircle(circleID, userID uint, role string, req models.VideoCircleUpdateRequest) (*models.VideoCircleResponse, error) {
	if m.updateCircleFn != nil {
		return m.updateCircleFn(circleID, userID, role, req)
	}
	return &models.VideoCircleResponse{}, nil
}
func (m *mockVideoCircleService) RepublishCircle(circleID, userID uint, role string, req models.VideoCircleRepublishRequest) (*models.VideoCircleResponse, error) {
	if m.republishCircleFn != nil {
		return m.republishCircleFn(circleID, userID, role, req)
	}
	return &models.VideoCircleResponse{}, nil
}
func (m *mockVideoCircleService) AddInteraction(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error) {
	if m.addInteractionFn != nil {
		return m.addInteractionFn(circleID, userID, req)
	}
	return &models.VideoCircleInteractionResponse{}, nil
}
func (m *mockVideoCircleService) ApplyBoost(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
	if m.applyBoostFn != nil {
		return m.applyBoostFn(circleID, userID, role, req)
	}
	return &models.VideoBoostResponse{}, nil
}
func (m *mockVideoCircleService) ListTariffs() ([]models.VideoTariff, error) {
	if m.listTariffsFn != nil {
		return m.listTariffsFn()
	}
	return []models.VideoTariff{}, nil
}
func (m *mockVideoCircleService) CreateTariff(req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
	if m.createTariffFn != nil {
		return m.createTariffFn(req, updatedBy)
	}
	return &models.VideoTariff{}, nil
}
func (m *mockVideoCircleService) UpdateTariff(id uint, req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
	if m.updateTariffFn != nil {
		return m.updateTariffFn(id, req, updatedBy)
	}
	return &models.VideoTariff{}, nil
}

func TestNormalizeMathaParam(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		expected string
	}{
		{name: "uses matha first", query: "/?matha=gaudiya&madh=other&math=third", expected: "gaudiya"},
		{name: "falls back to madh", query: "/?madh=smarta&math=third", expected: "smarta"},
		{name: "falls back to math", query: "/?math=iskcon", expected: "iskcon"},
		{name: "empty when absent", query: "/", expected: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Get("/", func(c *fiber.Ctx) error {
				got := normalizeMathaParam(c)
				if got != tt.expected {
					t.Fatalf("normalizeMathaParam() = %q, want %q", got, tt.expected)
				}
				return c.SendStatus(fiber.StatusOK)
			})

			req := httptest.NewRequest("GET", tt.query, nil)
			res, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test error: %v", err)
			}
			if res.StatusCode != fiber.StatusOK {
				t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusOK)
			}
		})
	}
}

func TestAddInteractionLegacy_RequiresCircleID(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{})
	app.Post("/interactions", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.AddInteractionLegacy(c)
	})

	req := httptest.NewRequest("POST", "/interactions", bytes.NewBufferString(`{"type":"like","action":"toggle"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusBadRequest)
	}
}

func TestAddInteraction_ReturnsExpiredCode(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{
		addInteractionFn: func(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error) {
			return nil, services.ErrCircleExpired
		},
	})
	app.Post("/video-circles/:id/interactions", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.AddInteraction(c)
	})

	req := httptest.NewRequest("POST", "/video-circles/17/interactions", bytes.NewBufferString(`{"type":"like","action":"toggle"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusConflict {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusConflict)
	}

	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["code"] != "CIRCLE_EXPIRED" {
		t.Fatalf("code = %v, want CIRCLE_EXPIRED", body["code"])
	}
}

func TestBoostCircle_ReturnsInsufficientLKMCode(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{
		applyBoostFn: func(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
			return nil, services.ErrInsufficientLKM
		},
	})
	app.Post("/video-circles/:id/boost", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.BoostCircle(c)
	})

	req := httptest.NewRequest("POST", "/video-circles/17/boost", bytes.NewBufferString(`{"boostType":"premium"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusPaymentRequired {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusPaymentRequired)
	}

	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["code"] != "INSUFFICIENT_LKM" {
		t.Fatalf("code = %v, want INSUFFICIENT_LKM", body["code"])
	}
}

func TestBoostCircle_ReturnsExpiredCode(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{
		applyBoostFn: func(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
			return nil, services.ErrCircleExpired
		},
	})
	app.Post("/video-circles/:id/boost", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.BoostCircle(c)
	})

	req := httptest.NewRequest("POST", "/video-circles/17/boost", bytes.NewBufferString(`{"boostType":"premium"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusConflict {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusConflict)
	}
}

func TestAddInteractionLegacy_ExpiredCode(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{
		addInteractionFn: func(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error) {
			return nil, services.ErrCircleExpired
		},
	})
	app.Post("/interactions", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.AddInteractionLegacy(c)
	})

	req := httptest.NewRequest("POST", "/interactions", bytes.NewBufferString(`{"circleId":42,"type":"like","action":"toggle"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusConflict {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusConflict)
	}
}

func TestCreateTariff_OK(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{
		createTariffFn: func(req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
			return &models.VideoTariff{Code: req.Code, PriceLkm: req.PriceLkm, DurationMinutes: req.DurationMinutes}, nil
		},
	})
	app.Post("/admin/video-tariffs", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.CreateTariff(c)
	})

	req := httptest.NewRequest("POST", "/admin/video-tariffs", bytes.NewBufferString(`{"code":"premium_boost","priceLkm":50,"durationMinutes":90,"isActive":true}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusCreated {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusCreated)
	}
}

func TestUpdateTariff_OK(t *testing.T) {
	app := fiber.New()
	handler := NewVideoCircleHandlerWithService(&mockVideoCircleService{
		updateTariffFn: func(id uint, req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
			return &models.VideoTariff{Code: models.VideoTariffCodePremiumBoost, PriceLkm: req.PriceLkm, DurationMinutes: req.DurationMinutes}, nil
		},
	})
	app.Put("/admin/video-tariffs/:id", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.UpdateTariff(c)
	})

	req := httptest.NewRequest("PUT", "/admin/video-tariffs/3", bytes.NewBufferString(`{"priceLkm":70,"durationMinutes":120}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, fiber.StatusOK)
	}
}
