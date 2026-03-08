package services

import (
	"testing"

	"rag-agent-server/internal/models"
)

func TestNormalizeDhamaLocale(t *testing.T) {
	t.Parallel()

	if got := normalizeDhamaLocale("ru-RU"); got != "ru" {
		t.Fatalf("expected ru, got %q", got)
	}
	if got := normalizeDhamaLocale("hi-IN"); got != "hi" {
		t.Fatalf("expected hi, got %q", got)
	}
	if got := normalizeDhamaLocale("en-US"); got != "en" {
		t.Fatalf("expected en, got %q", got)
	}
	if got := normalizeDhamaLocale("de"); got != "" {
		t.Fatalf("expected empty locale, got %q", got)
	}
}

func TestNormalizeIndiaCountry(t *testing.T) {
	t.Parallel()

	for _, input := range []string{"India", "bharat", "IN", ""} {
		got, err := normalizeIndiaCountry(input)
		if err != nil {
			t.Fatalf("unexpected error for %q: %v", input, err)
		}
		if got != "India" {
			t.Fatalf("expected India, got %q", got)
		}
	}
	if _, err := normalizeIndiaCountry("Nepal"); err == nil {
		t.Fatalf("expected non-India validation error")
	}
}

func TestSelectHolyPlaceLocaleFallsBackToEnglish(t *testing.T) {
	t.Parallel()

	place := models.HolyPlace{
		TitleRu:            "Вриндаван",
		TitleEn:            "Vrindavan",
		ShortDescriptionEn: "Sacred city",
		DescriptionEn:      "English description",
	}

	resp := selectHolyPlaceLocale(place, "hi")
	if resp.Title != "Vrindavan" {
		t.Fatalf("expected english title fallback, got %q", resp.Title)
	}
	if resp.ShortDescription != "Sacred city" {
		t.Fatalf("expected english short description fallback, got %q", resp.ShortDescription)
	}
}

func TestSlugifyHolyPlace(t *testing.T) {
	t.Parallel()

	if got := slugifyHolyPlace(" Sri Dham Mayapur "); got != "sri-dham-mayapur" {
		t.Fatalf("unexpected slug %q", got)
	}
}
