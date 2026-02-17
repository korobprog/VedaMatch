package services

import (
	"testing"
	"unicode/utf8"

	"rag-agent-server/internal/models"
)

func TestTrimErrorPayloadRuneAware(t *testing.T) {
	t.Parallel()

	payload := []byte("Привет мир, это длинное сообщение об ошибке")
	out := trimErrorPayload(payload, 10)

	if !utf8.ValidString(out) {
		t.Fatalf("trimmed payload must be valid UTF-8")
	}
	if utf8.RuneCountInString(out) != 13 { // 10 runes + "..."
		t.Fatalf("unexpected rune count %d, want 13", utf8.RuneCountInString(out))
	}
	if out[len(out)-3:] != "..." {
		t.Fatalf("expected ellipsis suffix, got %q", out)
	}
}

func TestNormalizeMarkerTypes(t *testing.T) {
	t.Parallel()

	in := []models.MarkerType{
		models.MarkerTypeUser,
		models.MarkerType(" SHOP "),
		models.MarkerTypeAd,
		models.MarkerTypeAd,
		models.MarkerType("unknown"),
	}
	out := normalizeMarkerTypes(in)
	if len(out) != 3 {
		t.Fatalf("normalized marker count = %d, want 3", len(out))
	}
	if out[0] != models.MarkerTypeUser || out[1] != models.MarkerTypeShop || out[2] != models.MarkerTypeAd {
		t.Fatalf("unexpected normalized output: %#v", out)
	}
}

func TestIsValidRouteMode(t *testing.T) {
	t.Parallel()

	valid := []string{"walk", "drive", "truck", "bicycle", "transit"}
	for _, mode := range valid {
		if !isValidRouteMode(mode) {
			t.Fatalf("expected %q to be valid", mode)
		}
	}
	if isValidRouteMode("plane") {
		t.Fatalf("plane must be invalid route mode")
	}
}

func TestHaversineDistance(t *testing.T) {
	t.Parallel()

	if d := haversineDistance(55.7558, 37.6173, 55.7558, 37.6173); d != 0 {
		t.Fatalf("distance for same points = %f, want 0", d)
	}
	if d := haversineDistance(55.7558, 37.6173, 59.9311, 30.3609); d <= 0 {
		t.Fatalf("distance between different points must be positive, got %f", d)
	}
}

func TestValidateMapBoundingBox(t *testing.T) {
	t.Parallel()

	valid := models.MapBoundingBox{
		LatMin: 55.0,
		LatMax: 56.0,
		LngMin: 37.0,
		LngMax: 38.0,
	}
	if err := validateMapBoundingBox(valid); err != nil {
		t.Fatalf("expected valid bbox, got error: %v", err)
	}

	invalidRange := models.MapBoundingBox{
		LatMin: 56.0,
		LatMax: 55.0,
		LngMin: 37.0,
		LngMax: 38.0,
	}
	if err := validateMapBoundingBox(invalidRange); err == nil {
		t.Fatalf("expected invalid range error")
	}

	invalidLat := models.MapBoundingBox{
		LatMin: -95.0,
		LatMax: 55.0,
		LngMin: 37.0,
		LngMax: 38.0,
	}
	if err := validateMapBoundingBox(invalidLat); err == nil {
		t.Fatalf("expected invalid latitude error")
	}
}

func TestGetMarkersUnknownCategoriesReturnsEmpty(t *testing.T) {
	t.Parallel()

	svc := &MapService{}
	resp, err := svc.GetMarkers(models.MapMarkersRequest{
		MapBoundingBox: models.MapBoundingBox{
			LatMin: 55.0,
			LatMax: 56.0,
			LngMin: 37.0,
			LngMax: 38.0,
		},
		Categories: []models.MarkerType{"unknown"},
		Limit:      100,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Total != 0 || len(resp.Markers) != 0 {
		t.Fatalf("expected empty response for unknown categories, got total=%d markers=%d", resp.Total, len(resp.Markers))
	}
}

func TestGetMarkersInvalidBoundingBox(t *testing.T) {
	t.Parallel()

	svc := &MapService{}
	_, err := svc.GetMarkers(models.MapMarkersRequest{
		MapBoundingBox: models.MapBoundingBox{
			LatMin: 91.0,
			LatMax: 92.0,
			LngMin: 37.0,
			LngMax: 38.0,
		},
	})
	if err == nil {
		t.Fatalf("expected bbox validation error")
	}
}
