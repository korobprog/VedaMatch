package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestParseAdIntWithDefault(t *testing.T) {
	if got := parseAdIntWithDefault(" 42 ", 10); got != 42 {
		t.Fatalf("expected 42, got %d", got)
	}
	if got := parseAdIntWithDefault("bad", 10); got != 10 {
		t.Fatalf("expected fallback 10, got %d", got)
	}
}

func TestParsePagination_InvalidLimitFallsBackToDefault(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		page, limit, offset := parsePagination(c, 50)
		return c.JSON(fiber.Map{
			"page":   page,
			"limit":  limit,
			"offset": offset,
		})
	})

	req := httptest.NewRequest("GET", "/?page=2&limit=abc", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	defer resp.Body.Close()

	var payload map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	if payload["page"] != 2 {
		t.Fatalf("expected page=2, got %d", payload["page"])
	}
	if payload["limit"] != 20 {
		t.Fatalf("expected default limit=20, got %d", payload["limit"])
	}
	if payload["offset"] != 20 {
		t.Fatalf("expected offset=20, got %d", payload["offset"])
	}
}

func TestParsePagination_RespectsMaxLimit(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		page, limit, offset := parsePagination(c, 50)
		return c.JSON(fiber.Map{
			"page":   page,
			"limit":  limit,
			"offset": offset,
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
		t.Fatalf("expected page=1, got %d", payload["page"])
	}
	if payload["limit"] != 50 {
		t.Fatalf("expected clamped limit=50, got %d", payload["limit"])
	}
	if payload["offset"] != 0 {
		t.Fatalf("expected offset=0, got %d", payload["offset"])
	}
}

func TestHasMinRunes(t *testing.T) {
	if !hasMinRunes("абвгд", 5) {
		t.Fatalf("expected Cyrillic 5-rune string to pass")
	}
	if hasMinRunes("абв", 5) {
		t.Fatalf("expected short Cyrillic string to fail")
	}
}

func TestNormalizeAdPhotoURLs(t *testing.T) {
	dupes := []string{
		" https://img/1.jpg ",
		"https://img/1.jpg",
		"https://img/2.jpg",
		"",
	}
	got := normalizeAdPhotoURLs(dupes)
	if len(got) != 2 {
		t.Fatalf("expected 2 unique urls, got %d", len(got))
	}
	if got[0] != "https://img/1.jpg" || got[1] != "https://img/2.jpg" {
		t.Fatalf("unexpected normalized urls: %#v", got)
	}

	many := make([]string, 0, 15)
	for i := 0; i < 15; i++ {
		many = append(many, "https://img/"+strings.Repeat("a", i+1))
	}
	got = normalizeAdPhotoURLs(many)
	if len(got) != 10 {
		t.Fatalf("expected hard cap 10 urls, got %d", len(got))
	}
}

func TestIsValidAdStatus(t *testing.T) {
	if !isValidAdStatus(models.AdStatusActive) {
		t.Fatalf("expected active to be valid")
	}
	if isValidAdStatus(models.AdStatus("unknown")) {
		t.Fatalf("expected unknown status to be invalid")
	}
}

func TestCalculateAdTotalPages(t *testing.T) {
	if got := calculateAdTotalPages(0, 20); got != 1 {
		t.Fatalf("expected min total pages 1, got %d", got)
	}
	if got := calculateAdTotalPages(101, 20); got != 6 {
		t.Fatalf("expected total pages 6, got %d", got)
	}
	if got := calculateAdTotalPages(10, 0); got != 1 {
		t.Fatalf("expected limit safeguard pages=1, got %d", got)
	}
}
