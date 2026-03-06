package handlers

import (
	"bytes"
	"net/http/httptest"
	"testing"

	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

type mockConnectService struct {
	getFeedFn           func(userID uint, req models.ConnectFeedRequest) (*models.ConnectFeedResponse, error)
	getProfileFn        func(userID uint) (*models.ConnectMatchProfile, error)
	upsertProfileFn     func(userID uint, req models.ConnectMatchProfileUpsertRequest) (*models.ConnectMatchProfile, error)
	createOpportunityFn func(userID uint, req models.ConnectOpportunityCreateRequest) (*models.ConnectOpportunity, error)
	applyFn             func(userID, opportunityID uint, req models.ConnectApplyRequest) (*models.ConnectApplication, error)
	getOpportunityFn    func(userID, opportunityID uint) (*models.ConnectOpportunityDetailResponse, error)
	getCommunityFn      func(userID, communityID uint) (*models.ConnectCommunityDetailResponse, error)
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
