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

func TestResolveHolyPlaceSlug(t *testing.T) {
	t.Parallel()

	req := models.HolyPlaceUpsertRequest{TitleEn: "Sri Dham Mayapur"}
	if got := resolveHolyPlaceSlug(req); got != "sri-dham-mayapur" {
		t.Fatalf("unexpected slug %q", got)
	}
}

func TestResolveDhamaCollectionSlug(t *testing.T) {
	t.Parallel()

	req := models.DhamaCollectionUpsertRequest{TitleEn: "Braj Mandal"}
	if got := resolveDhamaCollectionSlug(req); got != "braj-mandal" {
		t.Fatalf("unexpected collection slug %q", got)
	}
}

func TestSelectHolyPlaceLocaleInitializesEmptyRelations(t *testing.T) {
	t.Parallel()

	resp := selectHolyPlaceLocale(models.HolyPlace{
		TitleEn:            "Vrindavan",
		ShortDescriptionEn: "Sacred city",
	}, "en")

	if resp.LinkedMedia == nil {
		t.Fatalf("expected linkedMedia to be initialized")
	}
	if resp.LinkedYatras == nil {
		t.Fatalf("expected linkedYatras to be initialized")
	}
	if len(resp.LinkedMedia) != 0 || len(resp.LinkedYatras) != 0 {
		t.Fatalf("expected empty linked relations, got media=%d yatras=%d", len(resp.LinkedMedia), len(resp.LinkedYatras))
	}
}

func TestBuildDhamaCollectionSummaryFallsBackToEnglish(t *testing.T) {
	t.Parallel()

	collection := models.DhamaCollection{
		TitleRu:       "Сердце Кришна-лилы",
		TitleEn:       "Heartland of Krishna-lila",
		DescriptionEn: "English collection description",
	}

	summary := buildDhamaCollectionSummary(collection, "hi", 2)
	if summary.Title != "Heartland of Krishna-lila" {
		t.Fatalf("expected english title fallback, got %q", summary.Title)
	}
	if summary.Description != "English collection description" {
		t.Fatalf("expected english description fallback, got %q", summary.Description)
	}
	if summary.PlacesCount != 2 {
		t.Fatalf("expected placesCount=2, got %d", summary.PlacesCount)
	}
}
