package services

import (
	"rag-agent-server/internal/models"
	"testing"
	"time"
)

func TestEkadashiServiceGetCalendarRestrictedToApprovedRoles(t *testing.T) {
	service := &EkadashiService{}
	if _, err := service.GetCalendar(0, "user", "2026-03", "iskcon", "Asia/Vladivostok", "Vladivostok", "Russia"); err == nil {
		t.Fatalf("expected forbidden error for non-approved role")
	}
}

func TestEkadashiServiceGetCalendarAllowsAdminRole(t *testing.T) {
	service := &EkadashiService{}
	if _, err := service.GetCalendar(0, "admin", "2026-03", "iskcon", "Asia/Vladivostok", "Vladivostok", "Russia"); err != nil {
		t.Fatalf("unexpected error for admin role: %v", err)
	}
}

func TestHasEkadashiCalendarAccessAllowsProBypass(t *testing.T) {
	if !hasEkadashiCalendarAccess(models.User{GodModeEnabled: true}, models.RoleUser) {
		t.Fatalf("god mode user should have ekadashi calendar access")
	}
	if !hasEkadashiCalendarAccess(models.User{CurrentPlan: "pro_monthly"}, models.RoleUser) {
		t.Fatalf("pro plan user should have ekadashi calendar access")
	}
	if hasEkadashiCalendarAccess(models.User{CurrentPlan: "trial"}, models.RoleUser) {
		t.Fatalf("trial user should not have ekadashi calendar access")
	}
}

func TestEkadashiServiceGetCalendarReturnsMonthDaysAndEvents(t *testing.T) {
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
	if len(result.Events) < len(result.Days) {
		t.Fatalf("expected combined calendar events, got days=%d events=%d", len(result.Days), len(result.Events))
	}
	if result.Days[0].OrganizationID != "iskcon" {
		t.Fatalf("unexpected org: %s", result.Days[0].OrganizationID)
	}
	if result.ProviderDecision.Mode == "" || result.ProviderDecision.Source == "" {
		t.Fatalf("expected provider decision metadata, got %+v", result.ProviderDecision)
	}
	foundAppearance := false
	for _, event := range result.Events {
		if event.EventType == "appearance" {
			foundAppearance = true
			break
		}
	}
	if !foundAppearance {
		t.Fatalf("expected commemorative appearance event in month response")
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

func TestEkadashiServiceGetDayReturnsCommemorativeEvent(t *testing.T) {
	service := &EkadashiService{}
	result, err := service.GetDay(0, "devotee", "2026-03-06", "iskcon", "Asia/Kolkata", "Mayapur", "India")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.EventType != "appearance" {
		t.Fatalf("expected appearance event, got %s", result.EventType)
	}
	if result.PersonSlug == "" {
		t.Fatalf("expected commemorative person slug")
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
