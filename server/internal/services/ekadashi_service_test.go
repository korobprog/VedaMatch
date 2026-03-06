package services

import (
	"testing"
	"time"
)

func TestEkadashiServiceGetCalendarDevoteeOnly(t *testing.T) {
	service := &EkadashiService{}
	if _, err := service.GetCalendar(0, "user", "2026-03", "iskcon", "Asia/Vladivostok", "Vladivostok", "Russia"); err == nil {
		t.Fatalf("expected forbidden error for non-devotee")
	}
}

func TestEkadashiServiceGetCalendarReturnsMonthDays(t *testing.T) {
	service := &EkadashiService{}
	result, err := service.GetCalendar(0, "devotee", "2026-03", "iskcon", "Asia/Vladivostok", "Vladivostok", "Russia")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Month != "2026-03" {
		t.Fatalf("unexpected month: %s", result.Month)
	}
	if len(result.Days) == 0 {
		t.Fatalf("expected ekadashi days")
	}
	if result.Days[0].OrganizationID != "iskcon" {
		t.Fatalf("unexpected org: %s", result.Days[0].OrganizationID)
	}
	if result.ProviderDecision.Mode == "" || result.ProviderDecision.Source == "" {
		t.Fatalf("expected provider decision metadata, got %+v", result.ProviderDecision)
	}
}

func TestEkadashiServiceGetDayIncludesProviderDecision(t *testing.T) {
	service := &EkadashiService{}
	result, err := service.GetDay(0, "devotee", "2026-03-14", "default_vaishnava", "Asia/Vladivostok", "", "Russia")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ProviderDecision == nil {
		t.Fatalf("expected provider decision metadata")
	}
	if result.ProviderDecision.Mode != "fallback" {
		t.Fatalf("expected fallback provider decision, got %+v", result.ProviderDecision)
	}
	if result.ProviderDecision.Reason != "no_live_source_configured" {
		t.Fatalf("unexpected provider decision reason: %+v", result.ProviderDecision)
	}
}

func TestBuildEkadashiSequenceIncludesMarch2026(t *testing.T) {
	from := mustParseDate(t, "2026-03-01")
	to := mustParseDate(t, "2026-03-31")
	dates := buildEkadashiSequence(from, to)
	if len(dates) < 2 {
		t.Fatalf("expected at least two ekadashi dates in month, got %d", len(dates))
	}
}

func mustParseDate(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	return parsed
}
