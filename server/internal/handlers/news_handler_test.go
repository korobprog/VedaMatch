package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestValidateNewsSourceID(t *testing.T) {
	if err := validateNewsSourceID(nil); err == nil {
		t.Fatalf("expected error for nil source ID")
	}

	zero := uint(0)
	if err := validateNewsSourceID(&zero); err == nil {
		t.Fatalf("expected error for zero source ID")
	}

	valid := uint(42)
	if err := validateNewsSourceID(&valid); err != nil {
		t.Fatalf("unexpected error for valid source ID: %v", err)
	}
}

func TestValidateNewsFetchInterval(t *testing.T) {
	if err := validateNewsFetchInterval(0); err == nil {
		t.Fatalf("expected error for zero interval")
	}
	if err := validateNewsFetchInterval(-1); err == nil {
		t.Fatalf("expected error for negative interval")
	}
	if err := validateNewsFetchInterval(60); err != nil {
		t.Fatalf("unexpected error for positive interval: %v", err)
	}
}

func TestCalculateNewsTotalPages(t *testing.T) {
	if got := calculateNewsTotalPages(0, 20); got != 1 {
		t.Fatalf("expected minimum total pages 1, got %d", got)
	}
	if got := calculateNewsTotalPages(101, 20); got != 6 {
		t.Fatalf("expected total pages 6, got %d", got)
	}
	if got := calculateNewsTotalPages(10, 0); got != 1 {
		t.Fatalf("expected fallback total pages 1 for invalid limit, got %d", got)
	}
	maxInt := int64(^uint(0) >> 1)
	if got := calculateNewsTotalPages(maxInt, 1); got != int(maxInt) {
		t.Fatalf("expected capped max int pages=%d, got %d", maxInt, got)
	}
}

func TestParseNewsBoolQuery(t *testing.T) {
	if !parseNewsBoolQuery("TRUE") {
		t.Fatalf("expected TRUE to parse as true")
	}
	if !parseNewsBoolQuery("1") {
		t.Fatalf("expected 1 to parse as true")
	}
	if parseNewsBoolQuery("off") {
		t.Fatalf("expected off to parse as false")
	}
	if parseNewsBoolQuery("unexpected") {
		t.Fatalf("expected unexpected token to parse as false")
	}
}

func TestParsePositiveNewsParam(t *testing.T) {
	app := fiber.New()
	app.Get("/:id", func(c *fiber.Ctx) error {
		id, err := parsePositiveNewsParam(c, "id", "Invalid news ID")
		if err != nil {
			return err
		}
		return c.JSON(fiber.Map{"id": id})
	})

	reqValid := httptest.NewRequest("GET", "/12", nil)
	respValid, err := app.Test(reqValid)
	if err != nil {
		t.Fatalf("valid request failed: %v", err)
	}
	defer respValid.Body.Close()
	var payload map[string]uint
	if err := json.NewDecoder(respValid.Body).Decode(&payload); err != nil {
		t.Fatalf("decode valid response failed: %v", err)
	}
	if payload["id"] != 12 {
		t.Fatalf("expected parsed id=12, got %d", payload["id"])
	}

	reqZero := httptest.NewRequest("GET", "/0", nil)
	respZero, err := app.Test(reqZero)
	if err != nil {
		t.Fatalf("zero request failed: %v", err)
	}
	if respZero.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400 for zero id, got %d", respZero.StatusCode)
	}
}
