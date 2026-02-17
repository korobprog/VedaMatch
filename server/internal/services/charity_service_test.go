package services

import (
	"strings"
	"testing"
)

func TestGenerateSlugTransliteration(t *testing.T) {
	slug := generateSlug("Привет Мир")
	if !strings.HasPrefix(slug, "privet-mir-") {
		t.Fatalf("expected transliterated slug prefix 'privet-mir-', got %q", slug)
	}
}

func TestGenerateSlugFallback(t *testing.T) {
	slug := generateSlug("!!!")
	if !strings.HasPrefix(slug, "charity-") {
		t.Fatalf("expected fallback slug prefix 'charity-', got %q", slug)
	}
}
