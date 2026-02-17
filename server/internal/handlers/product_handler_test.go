package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func runParsePositiveIntQueryTest(t *testing.T, rawQuery string, defaultValue int, maxValue int) int {
	t.Helper()

	app := fiber.New()
	got := -1
	app.Get("/", func(c *fiber.Ctx) error {
		got = parsePositiveIntQuery(c, "page", defaultValue, maxValue)
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest("GET", "/?"+rawQuery, nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}

	return got
}

func TestParsePositiveIntQuery(t *testing.T) {
	t.Parallel()

	if got := runParsePositiveIntQueryTest(t, "", 1, 100); got != 1 {
		t.Fatalf("empty query -> %d, want 1", got)
	}
	if got := runParsePositiveIntQueryTest(t, "page=bad", 1, 100); got != 1 {
		t.Fatalf("invalid query -> %d, want 1", got)
	}
	if got := runParsePositiveIntQueryTest(t, "page=0", 1, 100); got != 1 {
		t.Fatalf("zero query -> %d, want 1", got)
	}
	if got := runParsePositiveIntQueryTest(t, "page=150", 1, 100); got != 100 {
		t.Fatalf("clamped query -> %d, want 100", got)
	}
	if got := runParsePositiveIntQueryTest(t, "page=%20%2042%20", 1, 100); got != 42 {
		t.Fatalf("trimmed query -> %d, want 42", got)
	}
}
