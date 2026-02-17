package services

import (
	"math"
	"testing"

	"rag-agent-server/internal/models"
)

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

	expected := int64(math.MaxInt64 / 2)
	if math.MaxInt64%2 != 0 {
		expected++
	}
	maxInt := int64(^uint(0) >> 1)
	if expected > maxInt {
		expected = maxInt
	}
	if got := calculateCafeOrderTotalPages(math.MaxInt64, 2); got != int(expected) {
		t.Fatalf("large total pages = %d, want %d", got, expected)
	}
}

func TestClampCafeOrderLimit(t *testing.T) {
	t.Parallel()

	if got := clampCafeOrderLimit(0, 10, 100); got != 10 {
		t.Fatalf("expected fallback limit=10, got %d", got)
	}
	if got := clampCafeOrderLimit(101, 10, 100); got != 10 {
		t.Fatalf("expected fallback for too large limit, got %d", got)
	}
	if got := clampCafeOrderLimit(50, 10, 100); got != 50 {
		t.Fatalf("expected valid limit=50, got %d", got)
	}
}

func TestCalculateCafeOrderPaginationOffset(t *testing.T) {
	t.Parallel()

	if got := calculateCafeOrderPaginationOffset(2, 20); got != 20 {
		t.Fatalf("expected offset=20, got %d", got)
	}
	if got := calculateCafeOrderPaginationOffset(0, 20); got != 0 {
		t.Fatalf("expected offset=0 for invalid page, got %d", got)
	}
	if got := calculateCafeOrderPaginationOffset(10, 0); got != 0 {
		t.Fatalf("expected offset=0 for invalid limit, got %d", got)
	}

	maxInt := int(^uint(0) >> 1)
	if got := calculateCafeOrderPaginationOffset(maxInt, 2); got != maxInt {
		t.Fatalf("expected clamped offset=%d, got %d", maxInt, got)
	}
}

func TestClampCafeOrderInt64ToInt(t *testing.T) {
	t.Parallel()

	if got := clampCafeOrderInt64ToInt(42); got != 42 {
		t.Fatalf("expected 42, got %d", got)
	}

	maxInt := int(^uint(0) >> 1)
	if got := clampCafeOrderInt64ToInt(math.MaxInt64); got != maxInt {
		t.Fatalf("expected clamped max=%d, got %d", maxInt, got)
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

func TestIsValidCafeOrderStatus(t *testing.T) {
	t.Parallel()

	if !isValidCafeOrderStatus(models.CafeOrderStatusReady) {
		t.Fatalf("ready status should be valid")
	}
	if isValidCafeOrderStatus(models.CafeOrderStatus("unknown")) {
		t.Fatalf("unknown status should be invalid")
	}
}

func TestNormalizeCafePaymentMethod(t *testing.T) {
	t.Parallel()

	if got := normalizeCafePaymentMethod(" CARD_TERMINAL "); got != "card_terminal" {
		t.Fatalf("normalized payment method = %q, want card_terminal", got)
	}
	if got := normalizeCafePaymentMethod(""); got != "" {
		t.Fatalf("empty payment method should remain empty, got %q", got)
	}
}

func TestIsValidCafePaymentMethod(t *testing.T) {
	t.Parallel()

	valid := []string{"cash", " card_terminal ", "LKM", ""}
	for _, method := range valid {
		if !isValidCafePaymentMethod(method) {
			t.Fatalf("expected %q to be valid payment method", method)
		}
	}

	invalid := []string{"paypal", "wire"}
	for _, method := range invalid {
		if isValidCafePaymentMethod(method) {
			t.Fatalf("expected %q to be invalid payment method", method)
		}
	}
}

func TestCanTransitionCafeOrderStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		current   models.CafeOrderStatus
		next      models.CafeOrderStatus
		orderType models.CafeOrderType
		want      bool
	}{
		{name: "new to confirmed", current: models.CafeOrderStatusNew, next: models.CafeOrderStatusConfirmed, orderType: models.CafeOrderTypeTakeaway, want: true},
		{name: "new to completed not allowed", current: models.CafeOrderStatusNew, next: models.CafeOrderStatusCompleted, orderType: models.CafeOrderTypeTakeaway, want: false},
		{name: "ready dine in to served", current: models.CafeOrderStatusReady, next: models.CafeOrderStatusServed, orderType: models.CafeOrderTypeDineIn, want: true},
		{name: "ready dine in to completed blocked", current: models.CafeOrderStatusReady, next: models.CafeOrderStatusCompleted, orderType: models.CafeOrderTypeDineIn, want: false},
		{name: "ready delivery to delivering", current: models.CafeOrderStatusReady, next: models.CafeOrderStatusDelivering, orderType: models.CafeOrderTypeDelivery, want: true},
		{name: "ready takeaway to completed", current: models.CafeOrderStatusReady, next: models.CafeOrderStatusCompleted, orderType: models.CafeOrderTypeTakeaway, want: true},
		{name: "delivering to completed", current: models.CafeOrderStatusDelivering, next: models.CafeOrderStatusCompleted, orderType: models.CafeOrderTypeDelivery, want: true},
		{name: "completed cannot transition", current: models.CafeOrderStatusCompleted, next: models.CafeOrderStatusCancelled, orderType: models.CafeOrderTypeTakeaway, want: false},
		{name: "same status idempotent", current: models.CafeOrderStatusPreparing, next: models.CafeOrderStatusPreparing, orderType: models.CafeOrderTypeTakeaway, want: true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := canTransitionCafeOrderStatus(tc.current, tc.next, tc.orderType); got != tc.want {
				t.Fatalf("transition %s -> %s (%s) = %v, want %v", tc.current, tc.next, tc.orderType, got, tc.want)
			}
		})
	}
}

type errString string

func (e errString) Error() string { return string(e) }

func assertErr(message string) error {
	return errString(message)
}
