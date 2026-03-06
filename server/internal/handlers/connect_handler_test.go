package handlers

import (
	"bytes"
	"net/http/httptest"
	"testing"

	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type mockConnectService struct {
	getFeedFn           func(userID uint, req models.ConnectFeedRequest) (*models.ConnectFeedResponse, error)
	getProfileFn        func(userID uint) (*models.ConnectMatchProfile, error)
	upsertProfileFn     func(userID uint, req models.ConnectMatchProfileUpsertRequest) (*models.ConnectMatchProfile, error)
	createOpportunityFn func(userID uint, req models.ConnectOpportunityCreateRequest) (*models.ConnectOpportunity, error)
	applyFn             func(userID, opportunityID uint, req models.ConnectApplyRequest) (*models.ConnectApplication, error)
	submitFeedbackFn    func(userID, opportunityID uint, req models.ConnectFeedbackCreateRequest) (*models.ConnectFeedback, error)
	getOpportunityFn    func(userID, opportunityID uint) (*models.ConnectOpportunityDetailResponse, error)
	getCommunityFn      func(userID, communityID uint) (*models.ConnectCommunityDetailResponse, error)
	listModerationFn    func(status string) ([]models.ConnectOpportunity, error)
	listApplicationsFn  func(actorID, opportunityID uint, status string) ([]models.ConnectApplication, error)
	moderateFn          func(opportunityID, adminID uint, approve bool, reason string) (*models.ConnectOpportunity, error)
	updateApplicationFn func(applicationID, adminID uint, req models.ConnectApplicationStatusUpdateRequest) (*models.ConnectApplication, error)
}

func (m *mockConnectService) GetFeed(userID uint, req models.ConnectFeedRequest) (*models.ConnectFeedResponse, error) {
	if m.getFeedFn != nil {
		return m.getFeedFn(userID, req)
	}
	return &models.ConnectFeedResponse{}, nil
}
func (m *mockConnectService) GetProfile(userID uint) (*models.ConnectMatchProfile, error) {
	if m.getProfileFn != nil {
		return m.getProfileFn(userID)
	}
	return &models.ConnectMatchProfile{}, nil
}
func (m *mockConnectService) UpsertProfile(userID uint, req models.ConnectMatchProfileUpsertRequest) (*models.ConnectMatchProfile, error) {
	if m.upsertProfileFn != nil {
		return m.upsertProfileFn(userID, req)
	}
	return &models.ConnectMatchProfile{}, nil
}
func (m *mockConnectService) CreateOpportunity(userID uint, req models.ConnectOpportunityCreateRequest) (*models.ConnectOpportunity, error) {
	if m.createOpportunityFn != nil {
		return m.createOpportunityFn(userID, req)
	}
	return &models.ConnectOpportunity{}, nil
}
func (m *mockConnectService) Apply(userID, opportunityID uint, req models.ConnectApplyRequest) (*models.ConnectApplication, error) {
	if m.applyFn != nil {
		return m.applyFn(userID, opportunityID, req)
	}
	return &models.ConnectApplication{}, nil
}
func (m *mockConnectService) SubmitFeedback(userID, opportunityID uint, req models.ConnectFeedbackCreateRequest) (*models.ConnectFeedback, error) {
	if m.submitFeedbackFn != nil {
		return m.submitFeedbackFn(userID, opportunityID, req)
	}
	return &models.ConnectFeedback{}, nil
}
func (m *mockConnectService) GetOpportunity(userID, opportunityID uint) (*models.ConnectOpportunityDetailResponse, error) {
	if m.getOpportunityFn != nil {
		return m.getOpportunityFn(userID, opportunityID)
	}
	return &models.ConnectOpportunityDetailResponse{}, nil
}
func (m *mockConnectService) GetCommunity(userID, communityID uint) (*models.ConnectCommunityDetailResponse, error) {
	if m.getCommunityFn != nil {
		return m.getCommunityFn(userID, communityID)
	}
	return &models.ConnectCommunityDetailResponse{}, nil
}
func (m *mockConnectService) ListOpportunitiesForModeration(status string) ([]models.ConnectOpportunity, error) {
	if m.listModerationFn != nil {
		return m.listModerationFn(status)
	}
	return []models.ConnectOpportunity{}, nil
}
func (m *mockConnectService) ListApplications(actorID, opportunityID uint, status string) ([]models.ConnectApplication, error) {
	if m.listApplicationsFn != nil {
		return m.listApplicationsFn(actorID, opportunityID, status)
	}
	return []models.ConnectApplication{}, nil
}
func (m *mockConnectService) ModerateOpportunity(opportunityID, adminID uint, approve bool, reason string) (*models.ConnectOpportunity, error) {
	if m.moderateFn != nil {
		return m.moderateFn(opportunityID, adminID, approve, reason)
	}
	return &models.ConnectOpportunity{}, nil
}
func (m *mockConnectService) UpdateApplicationStatus(actorID, applicationID uint, req models.ConnectApplicationStatusUpdateRequest) (*models.ConnectApplication, error) {
	if m.updateApplicationFn != nil {
		return m.updateApplicationFn(applicationID, actorID, req)
	}
	return &models.ConnectApplication{}, nil
}

func TestConnectHandlerGetFeedPassesFilters(t *testing.T) {
	app := fiber.New()
	handler := NewConnectHandlerWithService(&mockConnectService{
		getFeedFn: func(userID uint, req models.ConnectFeedRequest) (*models.ConnectFeedResponse, error) {
			if userID != 42 {
				t.Fatalf("userID=%d, want=42", userID)
			}
			if req.City != "Moscow" || req.EntryLevel != "intro" || !req.NewcomerOnly {
				t.Fatalf("unexpected req: %+v", req)
			}
			return &models.ConnectFeedResponse{}, nil
		},
	})
	app.Get("/connect/feed", func(c *fiber.Ctx) error {
		c.Locals("userID", "42")
		return handler.GetFeed(c)
	})

	req := httptest.NewRequest("GET", "/connect/feed?city=Moscow&entryLevel=intro&newcomerOnly=true", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusOK)
	}
}

func TestConnectHandlerSubmitFeedbackCreated(t *testing.T) {
	app := fiber.New()
	handler := NewConnectHandlerWithService(&mockConnectService{
		submitFeedbackFn: func(userID, opportunityID uint, req models.ConnectFeedbackCreateRequest) (*models.ConnectFeedback, error) {
			if userID != 8 || opportunityID != 13 {
				t.Fatalf("unexpected ids user=%d opportunity=%d", userID, opportunityID)
			}
			if req.Rating != 5 || !req.WouldReturn {
				t.Fatalf("unexpected req: %+v", req)
			}
			return &models.ConnectFeedback{ID: 21, Rating: req.Rating}, nil
		},
	})
	app.Post("/connect/opportunities/:id/feedback", func(c *fiber.Ctx) error {
		c.Locals("userID", "8")
		return handler.SubmitFeedback(c)
	})

	req := httptest.NewRequest("POST", "/connect/opportunities/13/feedback", bytes.NewBufferString(`{
		"rating":5,
		"comment":"Warm and clear",
		"wouldReturn":true
	}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusCreated)
	}
}

func TestConnectHandlerSubmitFeedbackRequiresApplication(t *testing.T) {
	app := fiber.New()
	handler := NewConnectHandlerWithService(&mockConnectService{
		submitFeedbackFn: func(userID, opportunityID uint, req models.ConnectFeedbackCreateRequest) (*models.ConnectFeedback, error) {
			return nil, services.ErrConnectFeedbackNotAllowed
		},
	})
	app.Post("/connect/opportunities/:id/feedback", func(c *fiber.Ctx) error {
		c.Locals("userID", "8")
		return handler.SubmitFeedback(c)
	})

	req := httptest.NewRequest("POST", "/connect/opportunities/13/feedback", bytes.NewBufferString(`{"rating":5}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusForbidden)
	}
}

func TestConnectHandlerCreateOpportunityCreated(t *testing.T) {
	app := fiber.New()
	handler := NewConnectHandlerWithService(&mockConnectService{
		createOpportunityFn: func(userID uint, req models.ConnectOpportunityCreateRequest) (*models.ConnectOpportunity, error) {
			if userID != 7 {
				t.Fatalf("userID=%d, want=7", userID)
			}
			if req.Title != "Serve prasadam" {
				t.Fatalf("title=%q", req.Title)
			}
			return &models.ConnectOpportunity{ID: 11, Title: req.Title}, nil
		},
	})
	app.Post("/connect/opportunities", func(c *fiber.Ctx) error {
		c.Locals("userID", "7")
		return handler.CreateOpportunity(c)
	})

	req := httptest.NewRequest("POST", "/connect/opportunities", bytes.NewBufferString(`{
		"title":"Serve prasadam",
		"category":"prasadam",
		"entryLevel":"intro",
		"participationFormat":"offline"
	}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusCreated)
	}
}

func TestConnectHandlerApproveOpportunity(t *testing.T) {
	app := fiber.New()
	handler := NewConnectHandlerWithService(&mockConnectService{
		moderateFn: func(opportunityID, adminID uint, approve bool, reason string) (*models.ConnectOpportunity, error) {
			if opportunityID != 19 {
				t.Fatalf("opportunityID=%d, want=19", opportunityID)
			}
			if adminID != 3 {
				t.Fatalf("adminID=%d, want=3", adminID)
			}
			if !approve {
				t.Fatalf("approve=false, want=true")
			}
			if reason != "looks good" {
				t.Fatalf("reason=%q", reason)
			}
			return &models.ConnectOpportunity{ID: 19, Status: models.ConnectOpportunityStatusActive}, nil
		},
	})
	app.Post("/admin/connect/opportunities/:id/approve", func(c *fiber.Ctx) error {
		c.Locals("userID", "3")
		c.Locals("userRole", "admin")
		return handler.ApproveOpportunity(c)
	})

	req := httptest.NewRequest("POST", "/admin/connect/opportunities/19/approve", bytes.NewBufferString(`{"reason":"looks good"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusOK)
	}
}

func TestConnectHandlerUpdateApplicationStatus(t *testing.T) {
	app := fiber.New()
	handler := NewConnectHandlerWithService(&mockConnectService{
		updateApplicationFn: func(applicationID, adminID uint, req models.ConnectApplicationStatusUpdateRequest) (*models.ConnectApplication, error) {
			if applicationID != 41 || adminID != 3 {
				t.Fatalf("unexpected ids application=%d admin=%d", applicationID, adminID)
			}
			if req.Status != models.ConnectApplicationAttended {
				t.Fatalf("status=%q", req.Status)
			}
			if req.Note != "checked in on-site" {
				t.Fatalf("note=%q", req.Note)
			}
			return &models.ConnectApplication{ID: 41, Status: req.Status, ReviewNote: req.Note}, nil
		},
	})
	app.Post("/admin/connect/applications/:id/status", func(c *fiber.Ctx) error {
		c.Locals("userID", "3")
		c.Locals("userRole", "admin")
		return handler.UpdateApplicationStatus(c)
	})

	req := httptest.NewRequest("POST", "/admin/connect/applications/41/status", bytes.NewBufferString(`{
		"status":"attended",
		"note":"checked in on-site"
	}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusOK)
	}
}
