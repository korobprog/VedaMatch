package handlers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"testing"
	"time"

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

func TestParseRoleScopeParam(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		expected []string
	}{
		{name: "empty when absent", query: "/", expected: nil},
		{name: "single valid role", query: "/?role_scope=user", expected: []string{"user"}},
		{name: "multiple valid roles", query: "/?role_scope=user,yogi,devotee", expected: []string{"user", "yogi", "devotee"}},
		{name: "invalid values ignored", query: "/?role_scope=user,invalid,admin", expected: []string{"user"}},
		{name: "deduplicates and trims", query: "/?role_scope= user ,yogi,user ", expected: []string{"user", "yogi"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Get("/", func(c *fiber.Ctx) error {
				got := parseRoleScopeParam(c)
				if len(got) != len(tt.expected) {
					t.Fatalf("parseRoleScopeParam() len = %d, want %d", len(got), len(tt.expected))
				}
				for i := range got {
					if got[i] != tt.expected[i] {
						t.Fatalf("parseRoleScopeParam()[%d] = %q, want %q", i, got[i], tt.expected[i])
					}
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

func TestVideoCircles_SmokeFlow(t *testing.T) {
	premiumPrice := 30
	var circle models.VideoCircleResponse
	liked := false

	svc := &mockVideoCircleService{
		createCircleFn: func(userID uint, role string, req models.VideoCircleCreateRequest) (*models.VideoCircleResponse, error) {
			circle = models.VideoCircleResponse{
				ID:           101,
				AuthorID:     userID,
				MediaURL:     req.MediaURL,
				Status:       models.VideoCircleStatusActive,
				DurationSec:  60,
				ExpiresAt:    time.Now().Add(30 * time.Minute),
				RemainingSec: 1800,
			}
			return &circle, nil
		},
		addInteractionFn: func(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error) {
			if req.Type == models.VideoCircleInteractionLike {
				if liked {
					if circle.LikeCount > 0 {
						circle.LikeCount--
					}
					liked = false
				} else {
					circle.LikeCount++
					liked = true
				}
			}
			if req.Type == models.VideoCircleInteractionComment {
				circle.CommentCount++
			}
			if req.Type == models.VideoCircleInteractionChat {
				circle.ChatCount++
			}
			return &models.VideoCircleInteractionResponse{
				CircleID:     circle.ID,
				LikeCount:    circle.LikeCount,
				CommentCount: circle.CommentCount,
				ChatCount:    circle.ChatCount,
				LikedByUser:  liked,
			}, nil
		},
		applyBoostFn: func(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
			circle.ExpiresAt = circle.ExpiresAt.Add(60 * time.Minute)
			circle.RemainingSec += 3600
			if req.BoostType == models.VideoBoostTypePremium {
				circle.PremiumBoostActive = true
			}
			return &models.VideoBoostResponse{
				CircleID:           circle.ID,
				BoostType:          string(req.BoostType),
				ChargedLkm:         premiumPrice,
				ExpiresAt:          circle.ExpiresAt,
				RemainingSec:       circle.RemainingSec,
				PremiumBoostActive: circle.PremiumBoostActive,
			}, nil
		},
		listTariffsFn: func() ([]models.VideoTariff, error) {
			return []models.VideoTariff{
				{
					Model:           models.VideoTariff{}.Model,
					Code:            models.VideoTariffCodePremiumBoost,
					PriceLkm:        premiumPrice,
					DurationMinutes: 60,
					IsActive:        true,
				},
			}, nil
		},
		updateTariffFn: func(id uint, req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
			if req.PriceLkm > 0 {
				premiumPrice = req.PriceLkm
			}
			return &models.VideoTariff{
				Model:           models.VideoTariff{}.Model,
				Code:            models.VideoTariffCodePremiumBoost,
				PriceLkm:        premiumPrice,
				DurationMinutes: 60,
				IsActive:        true,
			}, nil
		},
	}

	handler := NewVideoCircleHandlerWithService(svc)
	app := fiber.New()

	protected := func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		c.Locals("userRole", models.RoleUser)
		return c.Next()
	}
	admin := func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		c.Locals("userRole", models.RoleAdmin)
		return c.Next()
	}

	app.Post("/video-circles", protected, handler.CreateVideoCircle)
	app.Post("/video-circles/:id/interactions", protected, handler.AddInteraction)
	app.Post("/video-circles/:id/boost", protected, handler.BoostCircle)
	app.Get("/video-tariffs", handler.GetTariffs)
	app.Put("/admin/video-tariffs/:id", admin, handler.UpdateTariff)

	reqCreate := httptest.NewRequest("POST", "/video-circles", strings.NewReader(`{"mediaUrl":"https://cdn.test/circle.mp4","city":"Moscow","matha":"gaudiya","category":"kirtan"}`))
	reqCreate.Header.Set("Content-Type", "application/json")
	resCreate, err := app.Test(reqCreate)
	if err != nil {
		t.Fatalf("create request failed: %v", err)
	}
	if resCreate.StatusCode != fiber.StatusCreated {
		t.Fatalf("create status = %d, want %d", resCreate.StatusCode, fiber.StatusCreated)
	}

	reqLike := httptest.NewRequest("POST", "/video-circles/101/interactions", strings.NewReader(`{"type":"like","action":"toggle"}`))
	reqLike.Header.Set("Content-Type", "application/json")
	resLike, err := app.Test(reqLike)
	if err != nil {
		t.Fatalf("like request failed: %v", err)
	}
	if resLike.StatusCode != fiber.StatusOK {
		t.Fatalf("like status = %d, want %d", resLike.StatusCode, fiber.StatusOK)
	}

	reqBoost1 := httptest.NewRequest("POST", "/video-circles/101/boost", strings.NewReader(`{"boostType":"premium"}`))
	reqBoost1.Header.Set("Content-Type", "application/json")
	resBoost1, err := app.Test(reqBoost1)
	if err != nil {
		t.Fatalf("boost1 request failed: %v", err)
	}
	if resBoost1.StatusCode != fiber.StatusOK {
		t.Fatalf("boost1 status = %d, want %d", resBoost1.StatusCode, fiber.StatusOK)
	}

	var boostBody1 map[string]any
	if err := json.NewDecoder(resBoost1.Body).Decode(&boostBody1); err != nil {
		t.Fatalf("decode boost1 body: %v", err)
	}
	if int(boostBody1["chargedLkm"].(float64)) != 30 {
		t.Fatalf("chargedLkm boost1 = %v, want 30", boostBody1["chargedLkm"])
	}

	reqUpdateTariff := httptest.NewRequest("PUT", "/admin/video-tariffs/1", strings.NewReader(`{"priceLkm":55}`))
	reqUpdateTariff.Header.Set("Content-Type", "application/json")
	resUpdateTariff, err := app.Test(reqUpdateTariff)
	if err != nil {
		t.Fatalf("update tariff request failed: %v", err)
	}
	if resUpdateTariff.StatusCode != fiber.StatusOK {
		t.Fatalf("update tariff status = %d, want %d", resUpdateTariff.StatusCode, fiber.StatusOK)
	}

	reqBoost2 := httptest.NewRequest("POST", "/video-circles/101/boost", strings.NewReader(`{"boostType":"premium"}`))
	reqBoost2.Header.Set("Content-Type", "application/json")
	resBoost2, err := app.Test(reqBoost2)
	if err != nil {
		t.Fatalf("boost2 request failed: %v", err)
	}
	if resBoost2.StatusCode != fiber.StatusOK {
		t.Fatalf("boost2 status = %d, want %d", resBoost2.StatusCode, fiber.StatusOK)
	}

	var boostBody2 map[string]any
	if err := json.NewDecoder(resBoost2.Body).Decode(&boostBody2); err != nil {
		t.Fatalf("decode boost2 body: %v", err)
	}
	if int(boostBody2["chargedLkm"].(float64)) != 55 {
		t.Fatalf("chargedLkm boost2 = %v, want 55", boostBody2["chargedLkm"])
	}

	resTariffs, err := app.Test(httptest.NewRequest("GET", "/video-tariffs", nil))
	if err != nil {
		t.Fatalf("get tariffs request failed: %v", err)
	}
	if resTariffs.StatusCode != fiber.StatusOK {
		t.Fatalf("tariffs status = %d, want %d", resTariffs.StatusCode, fiber.StatusOK)
	}
}

func TestVideoCircles_ExpiredFlowReturnsConflict(t *testing.T) {
	svc := &mockVideoCircleService{
		addInteractionFn: func(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error) {
			return nil, services.ErrCircleExpired
		},
		applyBoostFn: func(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
			return nil, services.ErrCircleExpired
		},
	}

	handler := NewVideoCircleHandlerWithService(svc)
	app := fiber.New()

	protected := func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		c.Locals("userRole", models.RoleUser)
		return c.Next()
	}

	app.Post("/video-circles/:id/interactions", protected, handler.AddInteraction)
	app.Post("/video-circles/:id/boost", protected, handler.BoostCircle)

	reqInteraction := httptest.NewRequest("POST", "/video-circles/999/interactions", strings.NewReader(`{"type":"like","action":"toggle"}`))
	reqInteraction.Header.Set("Content-Type", "application/json")
	resInteraction, err := app.Test(reqInteraction)
	if err != nil {
		t.Fatalf("interaction request failed: %v", err)
	}
	if resInteraction.StatusCode != fiber.StatusConflict {
		t.Fatalf("interaction status = %d, want %d", resInteraction.StatusCode, fiber.StatusConflict)
	}
	var interactionBody map[string]any
	if err := json.NewDecoder(resInteraction.Body).Decode(&interactionBody); err != nil {
		t.Fatalf("decode interaction body: %v", err)
	}
	if interactionBody["code"] != "CIRCLE_EXPIRED" {
		t.Fatalf("interaction code = %v, want CIRCLE_EXPIRED", interactionBody["code"])
	}

	reqBoost := httptest.NewRequest("POST", "/video-circles/999/boost", strings.NewReader(`{"boostType":"premium"}`))
	reqBoost.Header.Set("Content-Type", "application/json")
	resBoost, err := app.Test(reqBoost)
	if err != nil {
		t.Fatalf("boost request failed: %v", err)
	}
	if resBoost.StatusCode != fiber.StatusConflict {
		t.Fatalf("boost status = %d, want %d", resBoost.StatusCode, fiber.StatusConflict)
	}
	var boostBody map[string]any
	if err := json.NewDecoder(resBoost.Body).Decode(&boostBody); err != nil {
		t.Fatalf("decode boost body: %v", err)
	}
	if boostBody["code"] != "CIRCLE_EXPIRED" {
		t.Fatalf("boost code = %v, want CIRCLE_EXPIRED", boostBody["code"])
	}
}

func TestVideoCircles_BoostInsufficientLKMReturnsPaymentRequired(t *testing.T) {
	svc := &mockVideoCircleService{
		applyBoostFn: func(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
			return nil, services.ErrInsufficientLKM
		},
	}

	handler := NewVideoCircleHandlerWithService(svc)
	app := fiber.New()

	protected := func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		c.Locals("userRole", models.RoleUser)
		return c.Next()
	}

	app.Post("/video-circles/:id/boost", protected, handler.BoostCircle)

	reqBoost := httptest.NewRequest("POST", "/video-circles/777/boost", strings.NewReader(`{"boostType":"premium"}`))
	reqBoost.Header.Set("Content-Type", "application/json")
	resBoost, err := app.Test(reqBoost)
	if err != nil {
		t.Fatalf("boost request failed: %v", err)
	}
	if resBoost.StatusCode != fiber.StatusPaymentRequired {
		t.Fatalf("boost status = %d, want %d", resBoost.StatusCode, fiber.StatusPaymentRequired)
	}
	var boostBody map[string]any
	if err := json.NewDecoder(resBoost.Body).Decode(&boostBody); err != nil {
		t.Fatalf("decode boost body: %v", err)
	}
	if boostBody["code"] != "INSUFFICIENT_LKM" {
		t.Fatalf("boost code = %v, want INSUFFICIENT_LKM", boostBody["code"])
	}
}
