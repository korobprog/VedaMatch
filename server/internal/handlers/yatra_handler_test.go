package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"rag-agent-server/internal/services"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestParseBoundedYatraQueryInt(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"page":  parseBoundedYatraQueryInt(c, "page", 1, 1, 100000),
			"limit": parseBoundedYatraQueryInt(c, "limit", 20, 1, 100),
		})
	})

	req := httptest.NewRequest("GET", "/?page=abc&limit=999", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	defer resp.Body.Close()

	var payload map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["page"] != 1 {
		t.Fatalf("expected fallback page=1, got %d", payload["page"])
	}
	if payload["limit"] != 100 {
		t.Fatalf("expected clamped limit=100, got %d", payload["limit"])
	}
}

func TestRespondYatraDomainError(t *testing.T) {
	app := fiber.New()
	app.Get("/forbidden", func(c *fiber.Ctx) error {
		return respondYatraDomainError(c, errors.New("forbidden"))
	})
	app.Get("/invalid", func(c *fiber.Ctx) error {
		return respondYatraDomainError(c, errors.New("invalid yatra id"))
	})
	app.Get("/notfound", func(c *fiber.Ctx) error {
		return respondYatraDomainError(c, errors.New("not found"))
	})
	app.Get("/billing-consent", func(c *fiber.Ctx) error {
		return respondYatraDomainError(c, services.ErrYatraBillingConsentRequired)
	})
	app.Get("/billing-insufficient", func(c *fiber.Ctx) error {
		return respondYatraDomainError(c, services.ErrYatraInsufficientLKM)
	})
	app.Get("/billing-paused", func(c *fiber.Ctx) error {
		return respondYatraDomainError(c, services.ErrYatraBillingPaused)
	})

	cases := []struct {
		path   string
		status int
	}{
		{path: "/forbidden", status: fiber.StatusForbidden},
		{path: "/invalid", status: fiber.StatusBadRequest},
		{path: "/notfound", status: fiber.StatusNotFound},
		{path: "/billing-consent", status: fiber.StatusBadRequest},
		{path: "/billing-insufficient", status: fiber.StatusPaymentRequired},
		{path: "/billing-paused", status: fiber.StatusLocked},
	}

	for _, tc := range cases {
		req := httptest.NewRequest("GET", tc.path, nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("app.Test failed for %s: %v", tc.path, err)
		}
		if resp.StatusCode != tc.status {
			t.Fatalf("path %s expected status %d, got %d", tc.path, tc.status, resp.StatusCode)
		}
	}
}

func TestParseYatraBoolQuery(t *testing.T) {
	if !parseYatraBoolQuery("TRUE") {
		t.Fatalf("expected TRUE to parse as true")
	}
	if !parseYatraBoolQuery("1") {
		t.Fatalf("expected 1 to parse as true")
	}
	if parseYatraBoolQuery("off") {
		t.Fatalf("expected off to parse as false")
	}
}

func TestGetYatraChatAccess_ValidationAndAuth(t *testing.T) {
	handler := &YatraHandler{}
	appWithUser := fiber.New()
	appWithUser.Get("/yatra/:id/chat", func(c *fiber.Ctx) error {
		c.Locals("userID", "42")
		return handler.GetYatraChatAccess(c)
	})
	reqInvalidID := httptest.NewRequest(http.MethodGet, "/yatra/abc/chat", nil)
	respInvalidID, err := appWithUser.Test(reqInvalidID)
	if err != nil {
		t.Fatalf("invalid id request failed: %v", err)
	}
	if respInvalidID.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", fiber.StatusBadRequest, respInvalidID.StatusCode)
	}
}

func TestBroadcastYatra_ValidationAndAuth(t *testing.T) {
	handler := &YatraHandler{}
	appWithUser := fiber.New()
	appWithUser.Post("/yatra/:id/broadcast", func(c *fiber.Ctx) error {
		c.Locals("userID", "42")
		return handler.BroadcastYatra(c)
	})

	reqInvalidID := httptest.NewRequest(http.MethodPost, "/yatra/abc/broadcast", strings.NewReader(`{"title":"x","body":"y"}`))
	reqInvalidID.Header.Set("Content-Type", "application/json")
	respInvalidID, err := appWithUser.Test(reqInvalidID)
	if err != nil {
		t.Fatalf("invalid id request failed: %v", err)
	}
	if respInvalidID.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", fiber.StatusBadRequest, respInvalidID.StatusCode)
	}
}
