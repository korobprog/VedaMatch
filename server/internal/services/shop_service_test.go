package services

import "testing"

func TestCalculateShopTotalPages(t *testing.T) {
	if got := calculateShopTotalPages(0, 20); got != 1 {
		t.Fatalf("expected 1 page for empty total, got %d", got)
	}
	if got := calculateShopTotalPages(101, 20); got != 6 {
		t.Fatalf("expected 6 pages for total=101 limit=20, got %d", got)
	}
	if got := calculateShopTotalPages(10, 0); got != 1 {
		t.Fatalf("expected 1 page for invalid limit, got %d", got)
	}

	maxInt := int64(^uint(0) >> 1)
	if got := calculateShopTotalPages(maxInt, 1); got != int(maxInt) {
		t.Fatalf("expected capped max int pages=%d, got %d", maxInt, got)
	}
}
