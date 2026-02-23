package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
)

func TestProtected_AllowsSupportWebhookWithoutJWT(t *testing.T) {
	app := fiber.New()
	app.Use(Protected())
	app.Post("/api/integrations/telegram/support/webhook", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("POST", "/api/integrations/telegram/support/webhook", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app test failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200 for support webhook without auth, got %d", resp.StatusCode)
	}
}

func TestProtected_RejectsOtherRoutesWithoutJWT(t *testing.T) {
	app := fiber.New()
	app.Use(Protected())
	app.Get("/api/private/ping", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/api/private/ping", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app test failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401 for route without auth, got %d", resp.StatusCode)
	}
}

func TestShouldLogAuthFailure_SuppressesWithinWindow(t *testing.T) {
	resetAuthLogSuppressionState()

	base := time.Unix(1_700_000_000, 0).UTC()

	shouldLog, suppressed := shouldLogAuthFailure("invalid_token", "/api/admin/notifications", "10.0.1.14", base)
	if !shouldLog || suppressed != 0 {
		t.Fatalf("expected first event to log without suppressed count, got shouldLog=%v suppressed=%d", shouldLog, suppressed)
	}

	shouldLog, suppressed = shouldLogAuthFailure("invalid_token", "/api/admin/notifications", "10.0.1.14", base.Add(20*time.Second))
	if shouldLog || suppressed != 0 {
		t.Fatalf("expected second event in window to be suppressed, got shouldLog=%v suppressed=%d", shouldLog, suppressed)
	}

	shouldLog, suppressed = shouldLogAuthFailure("invalid_token", "/api/admin/notifications", "10.0.1.14", base.Add(61*time.Second))
	if !shouldLog || suppressed != 1 {
		t.Fatalf("expected first event after window to log with suppressed=1, got shouldLog=%v suppressed=%d", shouldLog, suppressed)
	}
}

func TestShouldLogAuthFailure_DifferentKeysDoNotSuppressEachOther(t *testing.T) {
	resetAuthLogSuppressionState()

	base := time.Unix(1_700_000_000, 0).UTC()

	shouldLog, suppressed := shouldLogAuthFailure("invalid_token", "/api/admin/notifications", "10.0.1.14", base)
	if !shouldLog || suppressed != 0 {
		t.Fatalf("unexpected result for first key: shouldLog=%v suppressed=%d", shouldLog, suppressed)
	}

	shouldLog, suppressed = shouldLogAuthFailure("missing_authorization_header", "/api/rag/domains", "10.0.1.14", base.Add(10*time.Second))
	if !shouldLog || suppressed != 0 {
		t.Fatalf("expected different key to log independently, got shouldLog=%v suppressed=%d", shouldLog, suppressed)
	}
}
