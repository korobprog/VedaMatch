package services

import "testing"

func TestNormalizeCafeOrderItemStatus(t *testing.T) {
	t.Parallel()

	if got := normalizeCafeOrderItemStatus(" READY "); got != "ready" {
		t.Fatalf("normalized status = %q, want ready", got)
	}
	if got := normalizeCafeOrderItemStatus(""); got != "" {
		t.Fatalf("empty status should stay empty, got %q", got)
	}
}

func TestIsValidOrderItemStatus(t *testing.T) {
	t.Parallel()

	valid := []string{"pending", "preparing", "ready", "cancelled", " READY "}
	for _, status := range valid {
		if !isValidOrderItemStatus(status) {
			t.Fatalf("expected %q to be valid", status)
		}
	}

	invalid := []string{"done", "served", ""}
	for _, status := range invalid {
		if isValidOrderItemStatus(status) {
			t.Fatalf("expected %q to be invalid", status)
		}
	}
}

func TestCalculateCafeOrderTotalPages(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		total int64
		limit int
		want  int
	}{
		{name: "empty list still has one page", total: 0, limit: 20, want: 1},
		{name: "exact page", total: 40, limit: 20, want: 2},
		{name: "partial page rounds up", total: 41, limit: 20, want: 3},
		{name: "invalid limit falls back to one page", total: 100, limit: 0, want: 1},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := calculateCafeOrderTotalPages(tc.total, tc.limit); got != tc.want {
				t.Fatalf("total=%d limit=%d -> %d, want %d", tc.total, tc.limit, got, tc.want)
			}
		})
	}
}

func TestIsOrderNumberConflict(t *testing.T) {
	t.Parallel()

	if isOrderNumberConflict(nil) {
		t.Fatalf("nil error must not be conflict")
	}
	if !isOrderNumberConflict(assertErr("duplicate key value violates unique constraint order_number")) {
		t.Fatalf("expected duplicate order_number error to be conflict")
	}
	if isOrderNumberConflict(assertErr("some random error")) {
		t.Fatalf("unexpected conflict classification")
	}
}

type errString string

func (e errString) Error() string { return string(e) }

func assertErr(message string) error {
	return errString(message)
}
