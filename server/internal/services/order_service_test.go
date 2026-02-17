package services

import "testing"

func TestCalculateOrderTotalPages(t *testing.T) {
	t.Parallel()

	if got := calculateOrderTotalPages(0, 20); got != 1 {
		t.Fatalf("expected minimum total pages to be 1, got %d", got)
	}
	if got := calculateOrderTotalPages(101, 20); got != 6 {
		t.Fatalf("expected 6 pages, got %d", got)
	}
	if got := calculateOrderTotalPages(10, 0); got != 1 {
		t.Fatalf("expected fallback total pages to be 1, got %d", got)
	}
	maxInt := int64(^uint(0) >> 1)
	if got := calculateOrderTotalPages(maxInt, 1); got != int(maxInt) {
		t.Fatalf("expected capped max int pages=%d, got %d", maxInt, got)
	}
}

func TestNormalizeMarketPaymentMethod(t *testing.T) {
	t.Parallel()

	if got := normalizeMarketPaymentMethod(""); got != "external" {
		t.Fatalf("empty method = %q, want external", got)
	}
	if got := normalizeMarketPaymentMethod("  LKM  "); got != "lkm" {
		t.Fatalf("trim/lower method = %q, want lkm", got)
	}
	if !isValidMarketPaymentMethod("external") {
		t.Fatalf("external should be valid")
	}
	if isValidMarketPaymentMethod("card") {
		t.Fatalf("card should be invalid")
	}
}
