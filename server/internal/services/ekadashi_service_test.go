package services

import (
	"testing"
	"time"

	"rag-agent-server/internal/models"
)

func isAcceptedDBMissingReason(reason string) bool {
	return reason == "db_unavailable" || reason == "no_published_data"
}

func TestEkadashiServiceGetCalendarRestrictedToApprovedRoles(t *testing.T) {
	service := &EkadashiService{}

	_, err := service.GetCalendar(0, models.RoleUser, "2026-03", "iskcon", "Asia/Vladivostok", "Khabarovsk", "Russia")
	if err != ErrEkadashiForbidden {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestEkadashiServiceGetCalendarAllowsAdminRole(t *testing.T) {
	service := &EkadashiService{}

	response, err := service.GetCalendar(0, models.RoleAdmin, "2026-03", "iskcon", "Asia/Vladivostok", "Khabarovsk", "Russia")
	if err != nil {
		t.Fatalf("expected admin access, got %v", err)
	}
	if response == nil {
		t.Fatalf("expected response")
	}
	if response.ProviderDecision.Mode != calendarProviderModeDBMissing {
		t.Fatalf("expected db_missing mode without publication, got %q", response.ProviderDecision.Mode)
	}
	if len(response.Days) != 0 {
		t.Fatalf("expected no published ekadashi days, got %d", len(response.Days))
	}
}

func TestHasEkadashiCalendarAccessAllowsProBypass(t *testing.T) {
	user := models.User{CurrentPlan: "pro"}
	if !hasEkadashiCalendarAccess(user, models.RoleUser) {
		t.Fatalf("expected pro plan bypass to allow calendar access")
	}
}

func TestEkadashiServiceGetCalendarReturnsDBMissingWithoutPublication(t *testing.T) {
	service := &EkadashiService{}

	response, err := service.GetCalendar(0, models.RoleDevotee, "2026-03", "iskcon", "Asia/Vladivostok", "Vladivostok", "Russia")
	if err != nil {
		t.Fatalf("get calendar: %v", err)
	}
	if response.ProviderDecision.Mode != calendarProviderModeDBMissing {
		t.Fatalf("expected db_missing, got %q", response.ProviderDecision.Mode)
	}
	if !isAcceptedDBMissingReason(response.ProviderDecision.Reason) {
		t.Fatalf("unexpected db_missing reason: %q", response.ProviderDecision.Reason)
	}
	if len(response.Events) != 0 || len(response.Days) != 0 {
		t.Fatalf("expected no events or days without publication, got events=%d days=%d", len(response.Events), len(response.Days))
	}
}

func TestEkadashiServiceGetDayReturnsDBMissingWithoutPublication(t *testing.T) {
	service := &EkadashiService{}

	day, err := service.GetDay(0, models.RoleDevotee, "2026-03-15", "iskcon", "Asia/Vladivostok", "Vladivostok", "Russia")
	if err != nil {
		t.Fatalf("get day: %v", err)
	}
	if day.ProviderDecision == nil {
		t.Fatalf("expected provider decision")
	}
	if day.ProviderDecision.Mode != calendarProviderModeDBMissing {
		t.Fatalf("expected db_missing, got %q", day.ProviderDecision.Mode)
	}
	if !isAcceptedDBMissingReason(day.ProviderDecision.Reason) {
		t.Fatalf("unexpected db_missing reason: %q", day.ProviderDecision.Reason)
	}
}

func TestBuildCalendarScopeForISKCONIncludesCityAndTimezone(t *testing.T) {
	org := resolveEkadashiOrganization("iskcon")

	mode, scopeKey, location := buildCalendarScope(org, locationSnapshot{
		TimeZone: "Asia/Vladivostok",
		City:     "Khabarovsk",
		Country:  "Russia",
	})

	if mode != calendarScopeModeLocation {
		t.Fatalf("expected location scope, got %q", mode)
	}
	if scopeKey != "city:khabarovsk|tz:asia/vladivostok" {
		t.Fatalf("unexpected scope key: %q", scopeKey)
	}
	if location.City != "Khabarovsk" || location.TimeZone != "Asia/Vladivostok" {
		t.Fatalf("unexpected normalized location: %+v", location)
	}
}

func TestBuildCalendarScopeForGlobalOrganizationsUsesTimezoneScope(t *testing.T) {
	org := resolveEkadashiOrganization("pure_bhakti")

	mode, scopeKey, location := buildCalendarScope(org, locationSnapshot{
		TimeZone: "Asia/Kolkata",
		City:     "Mayapur",
		Country:  "India",
	})

	if mode != calendarScopeModeTimezone {
		t.Fatalf("expected timezone scope, got %q", mode)
	}
	if scopeKey != "tz:asia/kolkata" {
		t.Fatalf("unexpected scope key: %q", scopeKey)
	}
	if location.TimeZone != "Asia/Kolkata" {
		t.Fatalf("unexpected normalized timezone: %q", location.TimeZone)
	}
}

func TestValidateImportedCalendarEventsRejectsEmpty(t *testing.T) {
	err := validateImportedCalendarEvents(nil, []time.Time{time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC)})
	if err == nil {
		t.Fatalf("expected validation error for empty import")
	}
}

func TestDedupeCalendarEventsRemovesDuplicate(t *testing.T) {
	events := []models.EkadashiDay{
		{OrganizationID: "iskcon", Date: "2026-03-15", EventType: "ekadashi", PersonSlug: "", Title: "Papa Vimochani Ekadashi"},
		{OrganizationID: "iskcon", Date: "2026-03-15", EventType: "ekadashi", PersonSlug: "", Title: "Papa Vimochani Ekadashi"},
		{OrganizationID: "iskcon", Date: "2026-03-16", EventType: "appearance", PersonSlug: "bhaktivinoda-thakura", Title: "Appearance of Srila Bhaktivinoda Thakura"},
	}

	result := dedupeCalendarEvents(events)
	if len(result) != 2 {
		t.Fatalf("expected 2 unique events, got %d", len(result))
	}
}

func TestBuildEkadashiSequenceIncludesMarch2026(t *testing.T) {
	sequence := buildEkadashiSequence(
		time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, time.March, 31, 0, 0, 0, 0, time.UTC),
	)

	if len(sequence) != 2 {
		t.Fatalf("expected 2 ekadashi dates in March 2026, got %d", len(sequence))
	}
	if sequence[0].Format("2006-01-02") != "2026-03-13" {
		t.Fatalf("unexpected first ekadashi date: %s", sequence[0].Format("2006-01-02"))
	}
	if sequence[1].Format("2006-01-02") != "2026-03-28" {
		t.Fatalf("unexpected second ekadashi date: %s", sequence[1].Format("2006-01-02"))
	}
}

func TestAutonomousCalendarProfileRulesCoverKnownOrganizations(t *testing.T) {
	expected := map[string]bool{
		"iskcon":             false,
		"sri_chaitanya_math": false,
		"pure_bhakti":        false,
		"default_vaishnava":  false,
	}

	for _, rule := range autonomousCalendarProfileRules {
		if _, ok := expected[rule.OrganizationID]; ok {
			expected[rule.OrganizationID] = true
		}
		if rule.ObservanceSlug == "" {
			t.Fatalf("observance slug must not be empty for org=%s", rule.OrganizationID)
		}
	}

	for orgID, hasRule := range expected {
		if !hasRule {
			t.Fatalf("expected autonomous calendar rules for %s", orgID)
		}
	}
}

func TestResolveAutonomousProfileRuleDateUses2026Override(t *testing.T) {
	month, day := resolveAutonomousProfileRuleDate("iskcon", "bhaktivinoda-thakura-appearance", 2026, 3, 6)
	if month != 9 || day != 24 {
		t.Fatalf("expected 2026 override 9/24, got %d/%d", month, day)
	}

	month, day = resolveAutonomousProfileRuleDate("iskcon", "bhaktivinoda-thakura-appearance", 2027, 3, 6)
	if month != 3 || day != 6 {
		t.Fatalf("expected fallback 3/6 for years without override, got %d/%d", month, day)
	}
}

func TestMergeRuntimeCuratedCalendarEventsReplacesOutdatedCuratedEntry(t *testing.T) {
	merged := mergeRuntimeCuratedCalendarEvents(
		[]models.EkadashiDay{
			{
				OrganizationID: "iskcon",
				Date:           "2026-02-25",
				EventType:      "appearance",
				CanonicalSlug:  "bhaktisiddhanta-sarasvati-appearance",
				PersonSlug:     "bhaktisiddhanta-sarasvati",
				Title:          "Appearance of Srila Bhaktisiddhanta Sarasvati Thakura",
				Source:         calendarCuratedObservanceSource,
			},
		},
		[]models.EkadashiDay{
			{
				OrganizationID: "iskcon",
				Date:           "2026-02-06",
				EventType:      "appearance",
				CanonicalSlug:  "bhaktisiddhanta-sarasvati-appearance",
				PersonSlug:     "bhaktisiddhanta-sarasvati",
				Title:          "Appearance of Srila Bhaktisiddhanta Sarasvati Thakura",
				Source:         calendarCuratedObservanceSource,
			},
		},
	)

	if len(merged) != 1 {
		t.Fatalf("expected one merged event, got %d", len(merged))
	}
	if merged[0].Date != "2026-02-06" {
		t.Fatalf("expected runtime curated date to win, got %s", merged[0].Date)
	}
}

func TestNormalizeCalendarEventPreservesCanonicalMetadata(t *testing.T) {
	service := &EkadashiService{}
	org := resolveEkadashiOrganization("iskcon")
	event := service.normalizeCalendarEvent(models.EkadashiDay{
		Date:             "2026-03-14",
		EventType:        "appearance",
		CanonicalSlug:    "gaura-purnima",
		SourceConfidence: 92,
		Title:            "Appearance of Sri Caitanya Mahaprabhu",
	}, org, nil)

	if event.CanonicalSlug != "gaura-purnima" {
		t.Fatalf("expected canonical slug to be preserved, got %q", event.CanonicalSlug)
	}
	if event.SourceConfidence != 92 {
		t.Fatalf("expected source confidence to be preserved, got %d", event.SourceConfidence)
	}
}

func TestPickCalendarPublicationForTargetPrefersSameTimezoneFallback(t *testing.T) {
	target := calendarImportTarget{
		Organization: resolveEkadashiOrganization("iskcon"),
		Location: locationSnapshot{
			TimeZone: "Europe/Moscow",
			City:     "Moscow",
			Country:  "Russia",
		},
		ScopeMode: calendarScopeModeLocation,
		ScopeKey:  "city:moscow|tz:europe/moscow",
	}

	publication, found := pickCalendarPublicationForTarget(target, []models.CalendarPublication{
		{
			OrganizationID: "iskcon",
			ScopeKey:       "city:mayapur|tz:asia/kolkata",
			ScopeMode:      calendarScopeModeLocation,
			City:           "Mayapur",
			Country:        "India",
			Timezone:       "Asia/Kolkata",
			IsActive:       true,
		},
		{
			OrganizationID: "iskcon",
			ScopeKey:       "city:tbilisi|tz:europe/moscow",
			ScopeMode:      calendarScopeModeLocation,
			City:           "Tbilisi",
			Country:        "Georgia",
			Timezone:       "Europe/Moscow",
			IsActive:       true,
		},
	})
	if !found {
		t.Fatalf("expected fallback publication to be found")
	}
	if publication.ScopeKey != "city:tbilisi|tz:europe/moscow" {
		t.Fatalf("expected same-timezone publication, got %q", publication.ScopeKey)
	}
}

func TestPickCalendarPublicationForTargetFallsBackWithoutCity(t *testing.T) {
	target := calendarImportTarget{
		Organization: resolveEkadashiOrganization("iskcon"),
		Location: locationSnapshot{
			TimeZone: "Europe/Moscow",
			City:     "",
			Country:  "Russia",
		},
		ScopeMode: calendarScopeModeLocation,
		ScopeKey:  "city_missing|tz:europe/moscow",
	}

	publication, found := pickCalendarPublicationForTarget(target, []models.CalendarPublication{
		{
			OrganizationID: "iskcon",
			ScopeKey:       "city:mayapur|tz:asia/kolkata",
			ScopeMode:      calendarScopeModeLocation,
			City:           "Mayapur",
			Country:        "India",
			Timezone:       "Asia/Kolkata",
			IsActive:       true,
		},
		{
			OrganizationID: "iskcon",
			ScopeKey:       "city:moscow|tz:europe/moscow",
			ScopeMode:      calendarScopeModeLocation,
			City:           "Moscow",
			Country:        "Russia",
			Timezone:       "Europe/Moscow",
			IsActive:       true,
		},
	})
	if !found {
		t.Fatalf("expected fallback publication without city")
	}
	if publication.ScopeKey != "city:moscow|tz:europe/moscow" {
		t.Fatalf("expected nearest same-timezone publication, got %q", publication.ScopeKey)
	}
}
