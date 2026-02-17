package services

import (
	"math"
	"testing"
)

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
	if _, err := sanitizeUploadFolder("./uploads"); err == nil {
		t.Fatalf("expected error for dot-segment folder")
	}
	if _, err := sanitizeUploadFolder("uploads//nested"); err == nil {
		t.Fatalf("expected error for empty path segment")
	}
	if _, err := sanitizeUploadFolder("media/my folder"); err == nil {
		t.Fatalf("expected error for folder with whitespace in segment")
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

	expected := int64(math.MaxInt64 / 2)
	if math.MaxInt64%2 != 0 {
		expected++
	}
	maxInt := int64(^uint(0) >> 1)
	if expected > maxInt {
		expected = maxInt
	}
	if got := calculateMultimediaTotalPages(math.MaxInt64, 2); got != int(expected) {
		t.Fatalf("expected clamped page count %d, got %d", expected, got)
	}
}

func TestNormalizeTrackFilter(t *testing.T) {
	t.Parallel()

	in := TrackFilter{
		MediaType: " AUDIO ",
		Madh:      " ISKCON ",
		YogaStyle: " HATHA ",
		Language:  " RU ",
		Search:    "  mantra  ",
	}
	got := normalizeTrackFilter(in)
	if got.MediaType != "audio" {
		t.Fatalf("media type = %q, want audio", got.MediaType)
	}
	if got.Madh != "iskcon" {
		t.Fatalf("madh = %q, want iskcon", got.Madh)
	}
	if got.YogaStyle != "hatha" {
		t.Fatalf("yoga style = %q, want hatha", got.YogaStyle)
	}
	if got.Language != "ru" {
		t.Fatalf("language = %q, want ru", got.Language)
	}
	if got.Search != "mantra" {
		t.Fatalf("search = %q, want mantra", got.Search)
	}
}
