package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestURLDecodePreservesPlusInPath(t *testing.T) {
	decoded, err := urlDecode("series/my+video.mp4")
	if err != nil {
		t.Fatalf("urlDecode returned error: %v", err)
	}
	if decoded != "series/my+video.mp4" {
		t.Fatalf("unexpected decode result: %q", decoded)
	}
}

func TestURLDecodePathEscapes(t *testing.T) {
	decoded, err := urlDecode("series%2Fclip%20one.mp4")
	if err != nil {
		t.Fatalf("urlDecode returned error: %v", err)
	}
	if decoded != "series/clip one.mp4" {
		t.Fatalf("unexpected decode result: %q", decoded)
	}
}

func TestIsSeriesAdminRequest(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		c.Locals("userRole", c.Query("role"))
		if isSeriesAdminRequest(c) {
			return c.SendStatus(fiber.StatusOK)
		}
		return c.SendStatus(fiber.StatusForbidden)
	})

	tests := []struct {
		role       string
		statusCode int
	}{
		{role: "admin", statusCode: fiber.StatusOK},
		{role: "superadmin", statusCode: fiber.StatusOK},
		{role: "user", statusCode: fiber.StatusForbidden},
		{role: "", statusCode: fiber.StatusForbidden},
	}

	for _, tc := range tests {
		req := httptest.NewRequest("GET", "/?role="+tc.role, nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("app.Test failed for role %q: %v", tc.role, err)
		}
		if resp.StatusCode != tc.statusCode {
			t.Fatalf("role %q expected status %d, got %d", tc.role, tc.statusCode, resp.StatusCode)
		}
	}
}
