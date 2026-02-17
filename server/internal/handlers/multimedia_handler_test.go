package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestBoundedQueryInt_InvalidFallsBackToDefault(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"limit": boundedQueryInt(c, "limit", 20, 1, 100),
		})
	})

	req := httptest.NewRequest("GET", "/?limit=abc", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	defer resp.Body.Close()

	var payload map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["limit"] != 20 {
		t.Fatalf("expected default limit 20, got %d", payload["limit"])
	}
}

func TestBoundedQueryInt_ClampsRange(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"page":  boundedQueryInt(c, "page", 1, 1, 100000),
			"limit": boundedQueryInt(c, "limit", 20, 1, 100),
		})
	})

	req := httptest.NewRequest("GET", "/?page=0&limit=999", nil)
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
		t.Fatalf("expected clamped page=1, got %d", payload["page"])
	}
	if payload["limit"] != 100 {
		t.Fatalf("expected clamped limit=100, got %d", payload["limit"])
	}
}

func TestIsUnsafeFolderPath(t *testing.T) {
	if !isUnsafeFolderPath("../etc") {
		t.Fatalf("expected parent traversal to be unsafe")
	}
	if !isUnsafeFolderPath("\\\\windows") {
		t.Fatalf("expected backslash path to be unsafe")
	}
	if !isUnsafeFolderPath("/root") {
		t.Fatalf("expected absolute path to be unsafe")
	}
	if isUnsafeFolderPath("series/my-slug") {
		t.Fatalf("expected relative folder to be safe")
	}
}
