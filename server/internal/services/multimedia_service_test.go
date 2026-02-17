package services

import "testing"

func TestSanitizeUploadFolder(t *testing.T) {
	t.Parallel()

	if got, err := sanitizeUploadFolder(" media/uploads "); err != nil || got != "media/uploads" {
		t.Fatalf("expected sanitized folder media/uploads, got=%q err=%v", got, err)
	}
	if _, err := sanitizeUploadFolder(""); err == nil {
		t.Fatalf("expected error for empty folder")
	}
	if _, err := sanitizeUploadFolder("../uploads"); err == nil {
		t.Fatalf("expected error for path traversal folder")
	}
	if _, err := sanitizeUploadFolder("/absolute/path"); err == nil {
		t.Fatalf("expected error for absolute folder")
	}
	if _, err := sanitizeUploadFolder("uploads\\nested"); err == nil {
		t.Fatalf("expected error for windows-style path separator")
	}
}

func TestNormalizeLimit(t *testing.T) {
	t.Parallel()

	if got := normalizeLimit(0); got != defaultPaginationLimit {
		t.Fatalf("limit=0 -> %d, want %d", got, defaultPaginationLimit)
	}
	if got := normalizeLimit(-5); got != defaultPaginationLimit {
		t.Fatalf("limit=-5 -> %d, want %d", got, defaultPaginationLimit)
	}
	if got := normalizeLimit(15); got != 15 {
		t.Fatalf("limit=15 -> %d, want 15", got)
	}
	if got := normalizeLimit(1000); got != maxPaginationLimit {
		t.Fatalf("limit=1000 -> %d, want %d", got, maxPaginationLimit)
	}
}

func TestCalculateMultimediaTotalPages(t *testing.T) {
	t.Parallel()

	if got := calculateMultimediaTotalPages(0, 20); got != 1 {
		t.Fatalf("expected min page count 1, got %d", got)
	}
	if got := calculateMultimediaTotalPages(101, 20); got != 6 {
		t.Fatalf("expected 6 pages, got %d", got)
	}
	if got := calculateMultimediaTotalPages(10, 0); got != 1 {
		t.Fatalf("expected fallback page count 1, got %d", got)
	}
}
