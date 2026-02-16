package middleware

import (
	"net/http/httptest"
	"testing"

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
