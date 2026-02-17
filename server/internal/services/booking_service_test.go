package services

import (
	"math"
	"strings"
	"testing"
	"time"
)

func TestNormalizeBookingSource(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "empty", input: "", want: ""},
		{name: "trim spaces", input: "  channel_post  ", want: "channel_post"},
		{name: "normal value", input: "manual", want: "manual"},
		{name: "truncate long", input: strings.Repeat("x", 99), want: strings.Repeat("x", 80)},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeBookingSource(tc.input)
			if got != tc.want {
				t.Fatalf("normalizeBookingSource(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestCalculateBookingTotalPages(t *testing.T) {
	t.Parallel()

	if got := calculateBookingTotalPages(0, 20); got != 1 {
		t.Fatalf("expected min total pages 1, got %d", got)
	}
	if got := calculateBookingTotalPages(101, 20); got != 6 {
		t.Fatalf("expected total pages 6, got %d", got)
	}
	if got := calculateBookingTotalPages(10, 0); got != 1 {
		t.Fatalf("expected fallback total pages 1 for invalid limit, got %d", got)
	}

	expected := int64(math.MaxInt64 / 2)
	if math.MaxInt64%2 != 0 {
		expected++
	}
	maxInt := int64(^uint(0) >> 1)
	if expected > maxInt {
		expected = maxInt
	}
	if got := calculateBookingTotalPages(math.MaxInt64, 2); got != int(expected) {
		t.Fatalf("expected bounded page count %d for large total, got %d", expected, got)
	}
}

func TestParseBookingDate(t *testing.T) {
	t.Parallel()

	got, ok := parseBookingDate(" 2026-02-01 ")
	if !ok {
		t.Fatalf("expected parse success")
	}
	if got.Format("2006-01-02") != "2026-02-01" {
		t.Fatalf("unexpected parsed date: %s", got.Format(time.RFC3339))
	}

	if _, ok := parseBookingDate(""); ok {
		t.Fatalf("expected empty date to be rejected")
	}
	if _, ok := parseBookingDate("not-a-date"); ok {
		t.Fatalf("expected invalid date to be rejected")
	}
}
