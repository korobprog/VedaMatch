package services

import (
	"encoding/json"
	"math"
	"testing"
	"time"

	"rag-agent-server/internal/models"
)

func TestDefaultYatraStatusForCreate(t *testing.T) {
	t.Parallel()

	if got := defaultYatraStatusForCreate(); got != models.YatraStatusDraft {
		t.Fatalf("default status = %q, want %q", got, models.YatraStatusDraft)
	}
}

func TestResolveYatraParticipantLimits(t *testing.T) {
	t.Parallel()

	maxParticipants, minParticipants, err := resolveYatraParticipantLimits(0, 0)
	if err != nil {
		t.Fatalf("unexpected error for defaults: %v", err)
	}
	if maxParticipants != defaultYatraMaxParticipants || minParticipants != defaultYatraMinParticipants {
		t.Fatalf("unexpected defaults max=%d min=%d", maxParticipants, minParticipants)
	}

	maxParticipants, minParticipants, err = resolveYatraParticipantLimits(30, 5)
	if err != nil {
		t.Fatalf("unexpected error for explicit limits: %v", err)
	}
	if maxParticipants != 30 || minParticipants != 5 {
		t.Fatalf("unexpected explicit limits max=%d min=%d", maxParticipants, minParticipants)
	}

	if _, _, err := resolveYatraParticipantLimits(3, 5); err == nil {
		t.Fatalf("expected error when min > max")
	}
}

func TestParseYatraDateRange(t *testing.T) {
	t.Parallel()

	start, end, err := parseYatraDateRange(" 2026-02-10 ", "2026-02-11")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !start.Equal(time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected start date: %v", start)
	}
	if !end.Equal(time.Date(2026, 2, 11, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected end date: %v", end)
	}

	if _, _, err := parseYatraDateRange("bad", "2026-02-11"); err == nil {
		t.Fatalf("expected error for invalid start date")
	}
	if _, _, err := parseYatraDateRange("2026-02-10", "bad"); err == nil {
		t.Fatalf("expected error for invalid end date")
	}
	if _, _, err := parseYatraDateRange("2026-02-12", "2026-02-11"); err == nil {
		t.Fatalf("expected error when end date is before start date")
	}
}

func TestNormalizeAndValidateYatraTheme(t *testing.T) {
	t.Parallel()

	theme := normalizeYatraTheme(" Vrindavan ")
	if theme != models.YatraThemeVrindavan {
		t.Fatalf("normalized theme = %q", theme)
	}
	if !isValidYatraTheme(theme) {
		t.Fatalf("expected normalized theme to be valid")
	}
	if isValidYatraTheme(models.YatraTheme("unknown")) {
		t.Fatalf("unknown theme must be invalid")
	}
	if !isValidYatraTheme("") {
		t.Fatalf("empty theme should be valid")
	}
}

func TestParseIntFromAny(t *testing.T) {
	t.Parallel()

	if got, ok := parseIntFromAny(float64(10)); !ok || got != 10 {
		t.Fatalf("float64 integral parse failed, got=%d ok=%v", got, ok)
	}
	if _, ok := parseIntFromAny(float64(10.5)); ok {
		t.Fatalf("fractional float should be rejected")
	}
	if got, ok := parseIntFromAny(" 42 "); !ok || got != 42 {
		t.Fatalf("string parse failed, got=%d ok=%v", got, ok)
	}
	if got, ok := parseIntFromAny(json.Number("15")); !ok || got != 15 {
		t.Fatalf("json number int parse failed, got=%d ok=%v", got, ok)
	}
	if _, ok := parseIntFromAny(json.Number("15.5")); ok {
		t.Fatalf("json number float should be rejected for int parser")
	}
	if _, ok := parseIntFromAny(" "); ok {
		t.Fatalf("blank string should be rejected")
	}
	if _, ok := parseIntFromAny(uint64(math.MaxUint64)); ok {
		t.Fatalf("overflowing uint64 should be rejected")
	}
}

func TestParseFloatFromAny(t *testing.T) {
	t.Parallel()

	if got, ok := parseFloatFromAny(" 42.5 "); !ok || got != 42.5 {
		t.Fatalf("string float parse failed, got=%v ok=%v", got, ok)
	}
	if got, ok := parseFloatFromAny(json.Number("7.25")); !ok || got != 7.25 {
		t.Fatalf("json float parse failed, got=%v ok=%v", got, ok)
	}
	if _, ok := parseFloatFromAny("bad"); ok {
		t.Fatalf("invalid float string should be rejected")
	}
	if _, ok := parseFloatFromAny(math.NaN()); ok {
		t.Fatalf("NaN should be rejected")
	}
	if _, ok := parseFloatFromAny("Inf"); ok {
		t.Fatalf("Inf should be rejected")
	}
}

func TestParseYatraDateFromAny(t *testing.T) {
	t.Parallel()

	dateOnly, ok := parseYatraDateFromAny("2026-02-10")
	if !ok {
		t.Fatalf("expected date-only parse success")
	}
	if !dateOnly.Equal(time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected date-only value: %v", dateOnly)
	}

	rfc3339, ok := parseYatraDateFromAny("2026-02-10T12:30:00+03:00")
	if !ok {
		t.Fatalf("expected RFC3339 parse success")
	}
	if rfc3339.Location() != time.UTC {
		t.Fatalf("expected UTC location, got %v", rfc3339.Location())
	}

	localTime := time.Date(2026, 2, 10, 12, 30, 0, 0, time.FixedZone("X", 3*3600))
	normalized, ok := parseYatraDateFromAny(localTime)
	if !ok {
		t.Fatalf("expected time.Time parse success")
	}
	if normalized.Location() != time.UTC {
		t.Fatalf("expected normalized UTC time, got %v", normalized.Location())
	}

	if _, ok := parseYatraDateFromAny("bad"); ok {
		t.Fatalf("invalid date should be rejected")
	}
	if _, ok := parseYatraDateFromAny(time.Time{}); ok {
		t.Fatalf("zero time should be rejected")
	}
}

func TestSanitizeYatraUpdatesThemeValidation(t *testing.T) {
	t.Parallel()

	current := models.Yatra{
		StartDate:       time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
		EndDate:         time.Date(2026, 2, 12, 0, 0, 0, 0, time.UTC),
		MaxParticipants: 20,
		MinParticipants: 1,
	}

	updated, err := sanitizeYatraUpdates(map[string]interface{}{"theme": " MAYAPUR "}, current)
	if err != nil {
		t.Fatalf("unexpected error for valid theme update: %v", err)
	}
	if got, ok := updated["theme"].(models.YatraTheme); !ok || got != models.YatraThemeMayapur {
		t.Fatalf("unexpected normalized theme value: %#v", updated["theme"])
	}

	if _, err := sanitizeYatraUpdates(map[string]interface{}{"theme": "unknown"}, current); err == nil {
		t.Fatalf("expected error for unknown theme")
	}
}

func TestSanitizeYatraUpdatesCoordinateValidation(t *testing.T) {
	t.Parallel()

	current := models.Yatra{
		StartDate:       time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC),
		EndDate:         time.Date(2026, 2, 12, 0, 0, 0, 0, time.UTC),
		MaxParticipants: 20,
		MinParticipants: 1,
	}

	if _, err := sanitizeYatraUpdates(map[string]interface{}{"start_latitude": 120.0}, current); err == nil {
		t.Fatalf("expected invalid start latitude error")
	}
	if _, err := sanitizeYatraUpdates(map[string]interface{}{"end_longitude": -181.0}, current); err == nil {
		t.Fatalf("expected invalid end longitude error")
	}
}

func TestValidateOptionalCoordinates(t *testing.T) {
	t.Parallel()

	startLat := 55.75
	startLng := 37.61
	endLat := 59.93
	endLng := 30.31
	if err := validateOptionalCoordinates(&startLat, &startLng, &endLat, &endLng); err != nil {
		t.Fatalf("expected valid coordinates, got error: %v", err)
	}

	invalidLat := 95.0
	if err := validateOptionalCoordinates(&invalidLat, &startLng, nil, nil); err == nil {
		t.Fatalf("expected invalid latitude error")
	}

	invalidLng := -190.0
	if err := validateOptionalCoordinates(nil, &invalidLng, nil, nil); err == nil {
		t.Fatalf("expected invalid longitude error")
	}

	if err := validateOptionalCoordinates(&startLat, nil, nil, nil); err == nil {
		t.Fatalf("expected error for incomplete start coordinate pair")
	}
	if err := validateOptionalCoordinates(nil, nil, &endLat, nil); err == nil {
		t.Fatalf("expected error for incomplete end coordinate pair")
	}
}

func TestValidateYatraReviewRequest(t *testing.T) {
	t.Parallel()

	valid := models.YatraReviewCreateRequest{
		OverallRating:       5,
		OrganizerRating:     4,
		RouteRating:         0,
		AccommodationRating: 3,
		ValueRating:         2,
	}
	if err := validateYatraReviewRequest(valid); err != nil {
		t.Fatalf("unexpected error for valid request: %v", err)
	}

	if err := validateYatraReviewRequest(models.YatraReviewCreateRequest{OverallRating: 0}); err == nil {
		t.Fatalf("expected error for invalid overall rating")
	}
	if err := validateYatraReviewRequest(models.YatraReviewCreateRequest{OverallRating: 5, RouteRating: 6}); err == nil {
		t.Fatalf("expected error for invalid optional rating")
	}
}

func TestCalculateYatraMarkerTruncated(t *testing.T) {
	t.Parallel()

	if got := calculateYatraMarkerTruncated(5, 5); got != 0 {
		t.Fatalf("expected 0 truncated for equal counts, got %d", got)
	}
	if got := calculateYatraMarkerTruncated(12, 7); got != 5 {
		t.Fatalf("expected truncated=5, got %d", got)
	}

	maxInt := int(^uint(0) >> 1)
	if got := calculateYatraMarkerTruncated(math.MaxInt64, 0); got != maxInt {
		t.Fatalf("expected clamped truncated=%d, got %d", maxInt, got)
	}
}

func TestCalculateYatraPaginationOffset(t *testing.T) {
	t.Parallel()

	if got := calculateYatraPaginationOffset(2, 20); got != 20 {
		t.Fatalf("expected offset=20, got %d", got)
	}
	if got := calculateYatraPaginationOffset(0, 20); got != 0 {
		t.Fatalf("expected offset=0 for invalid page, got %d", got)
	}
	if got := calculateYatraPaginationOffset(10, 0); got != 0 {
		t.Fatalf("expected offset=0 for invalid limit, got %d", got)
	}

	maxInt := int(^uint(0) >> 1)
	if got := calculateYatraPaginationOffset(maxInt, 2); got != maxInt {
		t.Fatalf("expected clamped offset=%d, got %d", maxInt, got)
	}
}

func TestClampYatraInt64ToInt(t *testing.T) {
	t.Parallel()

	if got := clampYatraInt64ToInt(42); got != 42 {
		t.Fatalf("expected 42, got %d", got)
	}

	maxInt := int(^uint(0) >> 1)
	if got := clampYatraInt64ToInt(math.MaxInt64); got != maxInt {
		t.Fatalf("expected clamped max=%d, got %d", maxInt, got)
	}
}

func TestIsYatraAtCapacity(t *testing.T) {
	t.Parallel()

	if !isYatraAtCapacity(10, 10) {
		t.Fatalf("expected exact capacity to be full")
	}
	if isYatraAtCapacity(9, 10) {
		t.Fatalf("expected below capacity to be not full")
	}
	if !isYatraAtCapacity(1, 0) {
		t.Fatalf("expected non-positive max participants to be treated as full")
	}
}

func TestNormalizeYatraBroadcastTarget(t *testing.T) {
	t.Parallel()

	if got := normalizeYatraBroadcastTarget(YatraBroadcastTarget("approved")); got != YatraBroadcastTargetApproved {
		t.Fatalf("approved target normalized to %q", got)
	}
	if got := normalizeYatraBroadcastTarget(YatraBroadcastTarget("pending")); got != YatraBroadcastTargetPending {
		t.Fatalf("pending target normalized to %q", got)
	}
	if got := normalizeYatraBroadcastTarget(YatraBroadcastTarget("all")); got != YatraBroadcastTargetAll {
		t.Fatalf("all target normalized to %q", got)
	}
	if got := normalizeYatraBroadcastTarget(YatraBroadcastTarget("  unknown  ")); got != YatraBroadcastTargetApproved {
		t.Fatalf("unknown target must default to approved, got %q", got)
	}
}

func TestBuildYatraEventKey(t *testing.T) {
	t.Parallel()

	got := buildYatraEventKey("yatra_join_approved", 12, 99, 7, 555)
	want := "yatra_join_approved:yatra:12:actor:99:target:7:entity:555"
	if got != want {
		t.Fatalf("event key mismatch: got %q want %q", got, want)
	}
}
