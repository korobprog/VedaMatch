package services

import (
	"strings"
	"testing"
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
}
