package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestParseDhamaBoundedInt(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"page":  parseDhamaBoundedInt(c, "page", 1, 1, 100000),
			"limit": parseDhamaBoundedInt(c, "limit", 20, 1, 100),
		})
	})

	req := httptest.NewRequest("GET", "/?page=0&limit=500", nil)
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
		t.Fatalf("expected page clamp to 1, got %d", payload["page"])
	}
	if payload["limit"] != 100 {
		t.Fatalf("expected limit clamp to 100, got %d", payload["limit"])
	}
}

func TestParseDhamaFeatured(t *testing.T) {
	if value := parseDhamaFeatured("true"); value == nil || !*value {
		t.Fatalf("expected true pointer")
	}
	if value := parseDhamaFeatured("false"); value == nil || *value {
		t.Fatalf("expected false pointer")
	}
	if value := parseDhamaFeatured(""); value != nil {
		t.Fatalf("expected nil for empty")
	}
}

func TestParsePositiveDhamaParam(t *testing.T) {
	app := fiber.New()
	app.Get("/:id", func(c *fiber.Ctx) error {
		id, err := parsePositiveDhamaParam(c, "id", "Invalid ID")
		if err != nil {
			return err
		}
		return c.JSON(fiber.Map{"id": id})
	})

	validReq := httptest.NewRequest("GET", "/42", nil)
	validResp, err := app.Test(validReq)
	if err != nil {
		t.Fatalf("valid request failed: %v", err)
	}
	defer validResp.Body.Close()
	var payload map[string]uint
	if err := json.NewDecoder(validResp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["id"] != 42 {
		t.Fatalf("expected id=42, got %d", payload["id"])
	}

	invalidReq := httptest.NewRequest("GET", "/0", nil)
	invalidResp, err := app.Test(invalidReq)
	if err != nil {
		t.Fatalf("invalid request failed: %v", err)
	}
	if invalidResp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", invalidResp.StatusCode)
	}
}
