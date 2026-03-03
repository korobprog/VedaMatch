package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"rag-agent-server/internal/models"
	"strings"
	"testing"
	"time"

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

func TestParseAdBoolWithDefault(t *testing.T) {
	if !parseAdBoolWithDefault(" TRUE ", false) {
		t.Fatalf("expected TRUE to parse as true")
	}
	if parseAdBoolWithDefault("off", true) {
		t.Fatalf("expected off to parse as false")
	}
	if !parseAdBoolWithDefault("invalid", true) {
		t.Fatalf("expected fallback=true for invalid bool")
	}
}

func TestNormalizeAdSort(t *testing.T) {
	if got := normalizeAdSort(" PRICE_ASC "); got != "price_asc" {
		t.Fatalf("expected price_asc, got %q", got)
	}
	if got := normalizeAdSort("unknown"); got != "newest" {
		t.Fatalf("expected fallback newest, got %q", got)
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
	maxInt := int64(^uint(0) >> 1)
	if got := calculateAdTotalPages(maxInt, 1); got != int(maxInt) {
		t.Fatalf("expected capped max int pages=%d, got %d", maxInt, got)
	}
}

func TestValidateFestivalFields_RequiresStartForEvents(t *testing.T) {
	req := models.AdCreateRequest{
		Category: models.AdCategoryEvents,
	}
	_, err := validateFestivalFields(req, true)
	if err == nil {
		t.Fatalf("expected validation error when festivalStartAt is missing")
	}
}

func TestValidateFestivalFields_EndBeforeStart(t *testing.T) {
	req := models.AdCreateRequest{
		FestivalStartAt: "2026-03-03T12:00:00+03:00",
		FestivalEndAt:   "2026-03-03T11:00:00+03:00",
	}
	_, err := validateFestivalFields(req, true)
	if err == nil {
		t.Fatalf("expected validation error for end before start")
	}
}

func TestValidateFestivalFields_DefaultTimezoneAndIDLimits(t *testing.T) {
	req := models.AdCreateRequest{
		FestivalStartAt:    "2026-03-03T12:00:00+03:00",
		FestivalTimezone:   "Bad/Timezone",
		PreacherChannelIDs: []uint{1, 2, 2, 0, 3},
		LinkedServiceIDs:   []uint{11, 11, 12},
	}

	fields, err := validateFestivalFields(req, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fields.Timezone != defaultFestivalTimezone {
		t.Fatalf("expected default timezone %q, got %q", defaultFestivalTimezone, fields.Timezone)
	}
	if len(fields.PreacherIDs) != 3 {
		t.Fatalf("expected 3 deduped preacher IDs, got %d", len(fields.PreacherIDs))
	}
	if len(fields.LinkedServiceIDs) != 2 {
		t.Fatalf("expected 2 deduped linked services, got %d", len(fields.LinkedServiceIDs))
	}
}

func TestParseFestivalMonthRange(t *testing.T) {
	month, start, end, err := parseFestivalMonthRange("2026-03")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if month != "2026-03" {
		t.Fatalf("unexpected month: %s", month)
	}
	if start.Format("2006-01-02") != "2026-03-01" {
		t.Fatalf("unexpected range start: %s", start.Format(time.RFC3339))
	}
	if end.Format("2006-01-02") != "2026-03-31" {
		t.Fatalf("unexpected range end: %s", end.Format(time.RFC3339))
	}
}

func TestIsSadhuOccurrenceSuppressed(t *testing.T) {
	start := time.Date(2026, 3, 3, 10, 0, 0, 0, time.UTC)
	end := start.Add(2 * time.Hour)
	intervals := map[uint][]linkedServiceInterval{
		100: {
			{Start: start, End: end},
		},
	}

	if !isSadhuOccurrenceSuppressed(intervals, 100, start.Add(30*time.Minute)) {
		t.Fatalf("expected occurrence to be suppressed inside interval")
	}
	if isSadhuOccurrenceSuppressed(intervals, 100, end.Add(time.Minute)) {
		t.Fatalf("expected occurrence outside interval to be visible")
	}
}
