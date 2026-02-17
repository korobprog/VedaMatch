package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func TestSafeImageExtension(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "jpg", in: "photo.jpg", want: ".jpg"},
		{name: "uppercase", in: "photo.PNG", want: ".png"},
		{name: "invalid extension", in: "file.exe", want: ".jpg"},
		{name: "path traversal", in: "../photo.webp", want: ".webp"},
		{name: "no extension", in: "photo", want: ".jpg"},
		{name: "trim spaces and heif", in: " photo.heif ", want: ".heif"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := safeImageExtension(tc.in); got != tc.want {
				t.Fatalf("safeImageExtension(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestParseCafeBoolQuery(t *testing.T) {
	if !parseCafeBoolQuery("TRUE") {
		t.Fatalf("expected TRUE to parse as true")
	}
	if !parseCafeBoolQuery("1") {
		t.Fatalf("expected 1 to parse as true")
	}
	if parseCafeBoolQuery("off") {
		t.Fatalf("expected off to parse as false")
	}
}

func TestIsCafeNotFoundError(t *testing.T) {
	if !isCafeNotFoundError(gorm.ErrRecordNotFound) {
		t.Fatalf("expected direct gorm.ErrRecordNotFound to match")
	}
	if !isCafeNotFoundError(fmt.Errorf("wrapped: %w", gorm.ErrRecordNotFound)) {
		t.Fatalf("expected wrapped gorm.ErrRecordNotFound to match")
	}
	if !isCafeNotFoundError(errors.New("cafe not found")) {
		t.Fatalf("expected textual not found error to match")
	}
	if isCafeNotFoundError(errors.New("database timeout")) {
		t.Fatalf("did not expect unrelated error to match")
	}
}

func TestIsValidDishType(t *testing.T) {
	if !isValidDishType(models.DishTypeFood) {
		t.Fatalf("expected food type to be valid")
	}
	if isValidDishType(models.DishType("unknown")) {
		t.Fatalf("expected unknown dish type to be invalid")
	}
}

func TestIsBonusPercentValidationError(t *testing.T) {
	if !isBonusPercentValidationError(errors.New("maxBonusLkmPercent must be between 0 and 100")) {
		t.Fatalf("expected maxBonusLkmPercent validation error to match")
	}
	if isBonusPercentValidationError(errors.New("some other validation error")) {
		t.Fatalf("did not expect unrelated validation error to match")
	}
}

func TestParsePositiveCafeParam(t *testing.T) {
	app := fiber.New()
	app.Get("/:id", func(c *fiber.Ctx) error {
		id, err := parsePositiveCafeParam(c, "id", "Invalid cafe ID")
		if err != nil {
			return err
		}
		return c.JSON(fiber.Map{"id": id})
	})

	reqValid := httptest.NewRequest("GET", "/7", nil)
	respValid, err := app.Test(reqValid)
	if err != nil {
		t.Fatalf("valid request failed: %v", err)
	}
	defer respValid.Body.Close()
	var payload map[string]uint
	if err := json.NewDecoder(respValid.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["id"] != 7 {
		t.Fatalf("expected parsed id=7, got %d", payload["id"])
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
