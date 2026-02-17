package services

import (
	"math"
	"testing"

	"rag-agent-server/internal/models"
)

func TestCalculateCafeTotalPages(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		total int64
		limit int
		want  int
	}{
		{name: "empty list has one page", total: 0, limit: 20, want: 1},
		{name: "single page", total: 20, limit: 20, want: 1},
		{name: "partial second page", total: 21, limit: 20, want: 2},
		{name: "invalid limit fallback", total: 100, limit: 0, want: 1},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := calculateCafeTotalPages(tc.total, tc.limit); got != tc.want {
				t.Fatalf("total=%d limit=%d -> %d, want %d", tc.total, tc.limit, got, tc.want)
			}
		})
	}

	expected := int64(math.MaxInt64 / 2)
	if math.MaxInt64%2 != 0 {
		expected++
	}
	maxInt := int64(^uint(0) >> 1)
	if expected > maxInt {
		expected = maxInt
	}
	if got := calculateCafeTotalPages(math.MaxInt64, 2); got != int(expected) {
		t.Fatalf("large total pages = %d, want %d", got, expected)
	}
}

func TestValidateCafeUpdateNumericFields(t *testing.T) {
	t.Parallel()

	validRadius := 5000.0
	validMinOrder := 300.0
	validFee := 100.0
	validPrep := 30
	validLat := 55.75
	validLng := 37.61
	validReq := models.CafeUpdateRequest{
		Latitude:        &validLat,
		Longitude:       &validLng,
		DeliveryRadiusM: &validRadius,
		MinOrderAmount:  &validMinOrder,
		DeliveryFee:     &validFee,
		AvgPrepTime:     &validPrep,
	}
	if err := validateCafeUpdateNumericFields(validReq); err != nil {
		t.Fatalf("unexpected error for valid request: %v", err)
	}

	negativeRadius := -1.0
	if err := validateCafeUpdateNumericFields(models.CafeUpdateRequest{DeliveryRadiusM: &negativeRadius}); err == nil {
		t.Fatalf("expected negative radius error")
	}

	negativeMinOrder := -10.0
	if err := validateCafeUpdateNumericFields(models.CafeUpdateRequest{MinOrderAmount: &negativeMinOrder}); err == nil {
		t.Fatalf("expected negative min order error")
	}

	negativeFee := -10.0
	if err := validateCafeUpdateNumericFields(models.CafeUpdateRequest{DeliveryFee: &negativeFee}); err == nil {
		t.Fatalf("expected negative delivery fee error")
	}

	zeroPrep := 0
	if err := validateCafeUpdateNumericFields(models.CafeUpdateRequest{AvgPrepTime: &zeroPrep}); err == nil {
		t.Fatalf("expected non-positive avg prep time error")
	}

	invalidLat := 95.0
	if err := validateCafeUpdateNumericFields(models.CafeUpdateRequest{Latitude: &invalidLat}); err == nil {
		t.Fatalf("expected invalid latitude error")
	}

	invalidLng := -190.0
	if err := validateCafeUpdateNumericFields(models.CafeUpdateRequest{Longitude: &invalidLng}); err == nil {
		t.Fatalf("expected invalid longitude error")
	}
}

func TestNormalizeCafeListFilters(t *testing.T) {
	t.Parallel()

	in := models.CafeFilters{
		City:   "  Moscow  ",
		Search: "  prasadam  ",
		Status: models.CafeStatus(" ACTIVE "),
		Sort:   " RATING ",
	}
	got := normalizeCafeListFilters(in)

	if got.City != "Moscow" {
		t.Fatalf("normalized city = %q, want Moscow", got.City)
	}
	if got.Search != "prasadam" {
		t.Fatalf("normalized search = %q, want prasadam", got.Search)
	}
	if got.Status != models.CafeStatusActive {
		t.Fatalf("normalized status = %q, want %q", got.Status, models.CafeStatusActive)
	}
	if got.Sort != "rating" {
		t.Fatalf("normalized sort = %q, want rating", got.Sort)
	}
}

func TestCalculateCafeMarkerTruncated(t *testing.T) {
	t.Parallel()

	if got := calculateCafeMarkerTruncated(10, 10); got != 0 {
		t.Fatalf("expected truncated=0, got %d", got)
	}
	if got := calculateCafeMarkerTruncated(15, 10); got != 5 {
		t.Fatalf("expected truncated=5, got %d", got)
	}

	maxInt := int(^uint(0) >> 1)
	if got := calculateCafeMarkerTruncated(math.MaxInt64, 0); got != maxInt {
		t.Fatalf("expected clamped truncated=%d, got %d", maxInt, got)
	}
}
