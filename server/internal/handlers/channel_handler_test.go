package handlers

import (
	"bytes"
	"errors"
	"net/http/httptest"
	"testing"
	"time"

	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type mockChannelService struct {
	isFeatureEnabledForUserFn func(userID uint) bool
	pinPostFn                 func(channelID, postID, actorID uint) (*models.ChannelPost, error)
	schedulePostFn            func(channelID, postID, actorID uint, scheduledAt time.Time) (*models.ChannelPost, error)
	trackPromotedAdClickFn    func(adID uint, viewerID uint) error
	getFeedFn                 func(filters services.ChannelFeedFilters) (*models.ChannelFeedResponse, error)
}

func (m *mockChannelService) IsFeatureEnabledForUser(userID uint) bool {
	if m.isFeatureEnabledForUserFn != nil {
		return m.isFeatureEnabledForUserFn(userID)
	}
	return true
}
func (m *mockChannelService) CreateChannel(ownerID uint, req models.ChannelCreateRequest) (*models.Channel, error) {
	return &models.Channel{}, nil
}
func (m *mockChannelService) ListPublicChannels(filters services.ChannelListFilters) (*models.ChannelListResponse, error) {
	return &models.ChannelListResponse{}, nil
}
func (m *mockChannelService) ListMyChannels(ownerID uint, filters services.ChannelListFilters) (*models.ChannelListResponse, error) {
	return &models.ChannelListResponse{}, nil
}
func (m *mockChannelService) GetChannelByID(channelID uint, viewerID uint) (*models.Channel, error) {
	return &models.Channel{OwnerID: viewerID}, nil
}
func (m *mockChannelService) GetViewerRole(channelID uint, viewerID uint) (models.ChannelMemberRole, error) {
	return models.ChannelMemberRoleOwner, nil
}
func (m *mockChannelService) UpdateChannel(channelID, actorID uint, req models.ChannelUpdateRequest) (*models.Channel, error) {
	return &models.Channel{}, nil
}
func (m *mockChannelService) UpdateChannelBranding(channelID, actorID uint, req models.ChannelBrandingUpdateRequest) (*models.Channel, error) {
	return &models.Channel{}, nil
}
func (m *mockChannelService) AddMember(channelID, actorID uint, req models.ChannelMemberAddRequest) (*models.ChannelMember, error) {
	return &models.ChannelMember{}, nil
}
func (m *mockChannelService) ListMembers(channelID, actorID uint) ([]models.ChannelMember, error) {
	return []models.ChannelMember{}, nil
}
func (m *mockChannelService) UpdateMemberRole(channelID, actorID, memberUserID uint, role models.ChannelMemberRole) (*models.ChannelMember, error) {
	return &models.ChannelMember{}, nil
}
func (m *mockChannelService) RemoveMember(channelID, actorID, memberUserID uint) error { return nil }
func (m *mockChannelService) CreatePost(channelID, actorID uint, req models.ChannelPostCreateRequest) (*models.ChannelPost, error) {
	return &models.ChannelPost{}, nil
}
func (m *mockChannelService) ListPosts(channelID, viewerID uint, page, limit int, includeDraft bool) (*models.ChannelPostListResponse, models.ChannelMemberRole, error) {
	return &models.ChannelPostListResponse{}, models.ChannelMemberRoleOwner, nil
}
func (m *mockChannelService) UpdatePost(channelID, postID, actorID uint, req models.ChannelPostUpdateRequest) (*models.ChannelPost, error) {
	return &models.ChannelPost{}, nil
}
func (m *mockChannelService) PinPost(channelID, postID, actorID uint) (*models.ChannelPost, error) {
	if m.pinPostFn != nil {
		return m.pinPostFn(channelID, postID, actorID)
	}
	return &models.ChannelPost{}, nil
}
func (m *mockChannelService) UnpinPost(channelID, postID, actorID uint) (*models.ChannelPost, error) {
	return &models.ChannelPost{}, nil
}
func (m *mockChannelService) PublishPost(channelID, postID, actorID uint) (*models.ChannelPost, error) {
	return &models.ChannelPost{}, nil
}
func (m *mockChannelService) SchedulePost(channelID, postID, actorID uint, scheduledAt time.Time) (*models.ChannelPost, error) {
	if m.schedulePostFn != nil {
		return m.schedulePostFn(channelID, postID, actorID, scheduledAt)
	}
	return &models.ChannelPost{}, nil
}
func (m *mockChannelService) TrackCTAClick(channelID, postID, viewerID uint) error { return nil }
func (m *mockChannelService) TrackPromotedAdClick(adID uint, viewerID uint) error {
	if m.trackPromotedAdClickFn != nil {
		return m.trackPromotedAdClickFn(adID, viewerID)
	}
	return nil
}
func (m *mockChannelService) GetFeed(filters services.ChannelFeedFilters) (*models.ChannelFeedResponse, error) {
	if m.getFeedFn != nil {
		return m.getFeedFn(filters)
	}
	return &models.ChannelFeedResponse{}, nil
}
func (m *mockChannelService) CreateShowcase(channelID, actorID uint, req models.ChannelShowcaseCreateRequest) (*models.ChannelShowcase, error) {
	return &models.ChannelShowcase{}, nil
}
func (m *mockChannelService) ListShowcases(channelID, viewerID uint) ([]models.ChannelShowcase, error) {
	return []models.ChannelShowcase{}, nil
}
func (m *mockChannelService) UpdateShowcase(channelID, showcaseID, actorID uint, req models.ChannelShowcaseUpdateRequest) (*models.ChannelShowcase, error) {
	return &models.ChannelShowcase{}, nil
}
func (m *mockChannelService) DeleteShowcase(channelID, showcaseID, actorID uint) error { return nil }
func (m *mockChannelService) GetMetricsSnapshot() (map[string]int64, error) {
	return map[string]int64{}, nil
}
func (m *mockChannelService) DismissPrompt(userID uint, promptKey string, postID *uint) error {
	return nil
}
func (m *mockChannelService) GetPromptDismissStatus(userID uint, promptKeys []string) (map[string]bool, error) {
	return map[string]bool{}, nil
}

func TestChannelHandler_PinPostForbidden(t *testing.T) {
	app := fiber.New()
	handler := NewChannelHandlerWithService(&mockChannelService{
		pinPostFn: func(channelID, postID, actorID uint) (*models.ChannelPost, error) {
			return nil, services.ErrChannelForbidden
		},
	})

	app.Post("/channels/:id/posts/:postId/pin", func(c *fiber.Ctx) error {
		c.Locals("userID", "10")
		return handler.PinPost(c)
	})

	req := httptest.NewRequest("POST", "/channels/1/posts/2/pin", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusForbidden)
	}
}

func TestChannelHandler_SchedulePostInvalidBody(t *testing.T) {
	app := fiber.New()
	serviceCalled := false
	handler := NewChannelHandlerWithService(&mockChannelService{
		schedulePostFn: func(channelID, postID, actorID uint, scheduledAt time.Time) (*models.ChannelPost, error) {
			serviceCalled = true
			return &models.ChannelPost{}, nil
		},
	})

	app.Post("/channels/:id/posts/:postId/schedule", func(c *fiber.Ctx) error {
		c.Locals("userID", "10")
		return handler.SchedulePost(c)
	})

	req := httptest.NewRequest("POST", "/channels/1/posts/2/schedule", bytes.NewBufferString(`{"scheduledAt":"bad-date"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusBadRequest)
	}
	if serviceCalled {
		t.Fatalf("service must not be called on invalid request body")
	}
}

func TestChannelHandler_TrackPromotedAdClickNotFound(t *testing.T) {
	app := fiber.New()
	handler := NewChannelHandlerWithService(&mockChannelService{
		trackPromotedAdClickFn: func(adID uint, viewerID uint) error {
			return errors.New("promoted ad not found")
		},
	})

	app.Post("/channels/promoted-ads/:adId/click", func(c *fiber.Ctx) error {
		c.Locals("userID", "7")
		return handler.TrackPromotedAdClick(c)
	})

	req := httptest.NewRequest("POST", "/channels/promoted-ads/5/click", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusNotFound)
	}
}

func TestChannelHandler_TrackPromotedAdClickInvalidID(t *testing.T) {
	app := fiber.New()
	handler := NewChannelHandlerWithService(&mockChannelService{})

	app.Post("/channels/promoted-ads/:adId/click", func(c *fiber.Ctx) error {
		c.Locals("userID", "7")
		return handler.TrackPromotedAdClick(c)
	})

	req := httptest.NewRequest("POST", "/channels/promoted-ads/abc/click", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusBadRequest)
	}
}

func TestChannelHandler_GetFeedInvalidChannelID(t *testing.T) {
	app := fiber.New()
	handler := NewChannelHandlerWithService(&mockChannelService{})

	app.Get("/feed", func(c *fiber.Ctx) error {
		c.Locals("userID", "11")
		return handler.GetFeed(c)
	})

	req := httptest.NewRequest("GET", "/feed?channelId=bad", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusBadRequest)
	}
}

func TestChannelHandler_GetFeedParsesFilters(t *testing.T) {
	app := fiber.New()
	handler := NewChannelHandlerWithService(&mockChannelService{
		getFeedFn: func(filters services.ChannelFeedFilters) (*models.ChannelFeedResponse, error) {
			if filters.Page != 2 {
				t.Fatalf("page=%d, want=2", filters.Page)
			}
			if filters.Limit != 10 {
				t.Fatalf("limit=%d, want=10", filters.Limit)
			}
			if filters.Search != "guru" {
				t.Fatalf("search=%q, want=%q", filters.Search, "guru")
			}
			if filters.ViewerID != 22 {
				t.Fatalf("viewerID=%d, want=22", filters.ViewerID)
			}
			if filters.ChannelID == nil || *filters.ChannelID != 7 {
				t.Fatalf("channelID=%v, want=7", filters.ChannelID)
			}
			return &models.ChannelFeedResponse{
				Posts:      []models.ChannelPost{},
				Total:      0,
				Page:       filters.Page,
				Limit:      filters.Limit,
				TotalPages: 1,
			}, nil
		},
	})

	app.Get("/feed", func(c *fiber.Ctx) error {
		c.Locals("userID", "22")
		return handler.GetFeed(c)
	})

	req := httptest.NewRequest("GET", "/feed?page=2&limit=10&search=guru&channelId=7", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}
}

func TestChannelHandler_FeatureDisabled(t *testing.T) {
	app := fiber.New()
	handler := NewChannelHandlerWithService(&mockChannelService{
		isFeatureEnabledForUserFn: func(userID uint) bool {
			return false
		},
	})

	app.Get("/feed", func(c *fiber.Ctx) error {
		c.Locals("userID", "1")
		return handler.GetFeed(c)
	})

	req := httptest.NewRequest("GET", "/feed", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusServiceUnavailable)
	}
}
