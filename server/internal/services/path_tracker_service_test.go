package services

import (
	"errors"
	"testing"
)

func TestApplyGuardrailsLowLoadKeepsOnlyLowDifficulty(t *testing.T) {
	svc := &PathTrackerService{}
	input := []stepCandidate{
		{Format: "practice", Difficulty: "low"},
		{Format: "service", Difficulty: "high"},
		{Format: "audio", Difficulty: "medium"},
	}

	got := svc.ApplyGuardrails(input, "low", 0, "")
	if len(got) != 1 {
		t.Fatalf("expected 1 candidate, got %d", len(got))
	}
	if got[0].Difficulty != "low" {
		t.Fatalf("expected low difficulty, got %s", got[0].Difficulty)
	}
}

func TestParseStepContentFromCodeFence(t *testing.T) {
	raw := "```json\n{\"title\":\"Шаг\",\"instructions\":[\"Сделай 3 вдоха\"],\"fallbackText\":\"Ок\",\"actions\":[{\"id\":\"simplify\",\"label\":\"Упростить\"}],\"tone\":\"supportive\"}\n```"
	parsed, err := parseStepContent(raw)
	if err != nil {
		t.Fatalf("parseStepContent error: %v", err)
	}
	if parsed.Title != "Шаг" {
		t.Fatalf("expected title Шаг, got %s", parsed.Title)
	}
	if len(parsed.Instructions) != 1 {
		t.Fatalf("expected 1 instruction, got %d", len(parsed.Instructions))
	}
}

func TestIsValidAvailableMinutes(t *testing.T) {
	valid := []int{3, 5, 10}
	for _, v := range valid {
		if !isValidAvailableMinutes(v) {
			t.Fatalf("expected %d to be valid", v)
		}
	}
	invalid := []int{0, 1, 7, 15}
	for _, v := range invalid {
		if isValidAvailableMinutes(v) {
			t.Fatalf("expected %d to be invalid", v)
		}
	}
}

func TestParseIntWithDefault(t *testing.T) {
	if got := parseIntWithDefault("42", 7); got != 42 {
		t.Fatalf("expected 42, got %d", got)
	}
	if got := parseIntWithDefault("bad", 7); got != 7 {
		t.Fatalf("expected fallback 7, got %d", got)
	}
	if got := parseIntWithDefault("", 9); got != 9 {
		t.Fatalf("expected fallback 9, got %d", got)
	}
}

func TestParseUintSet(t *testing.T) {
	set := parseUintSet("1,2,abc,0, 5")
	if len(set) != 3 {
		t.Fatalf("expected 3 valid ids, got %d", len(set))
	}
	if _, ok := set[1]; !ok {
		t.Fatalf("expected id 1")
	}
	if _, ok := set[2]; !ok {
		t.Fatalf("expected id 2")
	}
	if _, ok := set[5]; !ok {
		t.Fatalf("expected id 5")
	}
}

func TestUnlockSequenceByRole(t *testing.T) {
	userSeq := unlockSequenceByRole("user")
	if len(userSeq) == 0 {
		t.Fatalf("expected non-empty user sequence")
	}
	if userSeq[0] != "multimedia" {
		t.Fatalf("expected user sequence to start with multimedia, got %s", userSeq[0])
	}

	devoteeSeq := unlockSequenceByRole("devotee")
	if len(devoteeSeq) == 0 || devoteeSeq[0] != "seva" {
		t.Fatalf("expected devotee sequence to start with seva")
	}
}

func TestIsKnownUnlockServiceID(t *testing.T) {
	if !isKnownUnlockServiceID("news") {
		t.Fatalf("expected news to be recognized")
	}
	if !isKnownUnlockServiceID(" Video_Circles ") {
		t.Fatalf("expected video_circles to be recognized case-insensitively")
	}
	if isKnownUnlockServiceID("unknown_service") {
		t.Fatalf("unexpected unknown service to be recognized")
	}
}

func TestNormalizeUnlockServiceID(t *testing.T) {
	if got := normalizeUnlockServiceID(" Video_Circles "); got != "video_circles" {
		t.Fatalf("expected normalized value video_circles, got %q", got)
	}
	if got := normalizeUnlockServiceID("video-circles"); got != "video_circles" {
		t.Fatalf("expected normalized alias video_circles, got %q", got)
	}
	if got := normalizeUnlockServiceID(" video circles "); got != "video_circles" {
		t.Fatalf("expected normalized spaced alias video_circles, got %q", got)
	}
}

func TestNormalizePathTrackerSortBy(t *testing.T) {
	cases := map[string]string{
		"deliveryStatus":  "deliverystatus",
		"delivery_status": "deliverystatus",
		"delivery-status": "deliverystatus",
		"created_at":      "createdat",
		" createdAt ":     "createdat",
	}
	for in, want := range cases {
		if got := normalizePathTrackerSortBy(in); got != want {
			t.Fatalf("normalizePathTrackerSortBy(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSuggestedServiceTitleNormalizesInput(t *testing.T) {
	if got := suggestedServiceTitle(" Video_Circles "); got != "Видео Кружки" {
		t.Fatalf("expected normalized title for video circles, got %q", got)
	}
	if got := suggestedServiceTitle("unknown"); got != "" {
		t.Fatalf("expected empty title for unknown service, got %q", got)
	}
}

func TestMarkUnlockOpenedRejectsInvalidServiceID(t *testing.T) {
	svc := &PathTrackerService{}

	if err := svc.MarkUnlockOpened(1, " "); !errors.Is(err, ErrInvalidUnlockService) {
		t.Fatalf("expected ErrInvalidUnlockService for empty service id, got %v", err)
	}
	if err := svc.MarkUnlockOpened(1, "unknown"); !errors.Is(err, ErrInvalidUnlockService) {
		t.Fatalf("expected ErrInvalidUnlockService for unknown service id, got %v", err)
	}
}

func TestResolvePathTrackerTimezone(t *testing.T) {
	if got := resolvePathTrackerTimezone("UTC", "Europe/Moscow"); got != "UTC" {
		t.Fatalf("expected override timezone UTC, got %q", got)
	}
	if got := resolvePathTrackerTimezone("Bad/Zone", "Europe/Moscow"); got != "Europe/Moscow" {
		t.Fatalf("expected fallback to user timezone, got %q", got)
	}
	if got := resolvePathTrackerTimezone("Bad/Zone", "Also/Bad"); got != "UTC" {
		t.Fatalf("expected final fallback UTC, got %q", got)
	}
}

func TestApplyPhase3ExperimentVariantA(t *testing.T) {
	svc := &PathTrackerService{}
	candidates := []stepCandidate{
		{Format: "communication", Difficulty: "medium"},
		{Format: "practice", Difficulty: "low"},
		{Format: "text", Difficulty: "low"},
	}
	profile := trajectoryProfile{Segment: "steady_builder"}

	got := svc.ApplyPhase3Experiment(candidates, "user", profile, "medium", 5, "variant_a")
	if len(got) != 3 {
		t.Fatalf("expected 3 candidates, got %d", len(got))
	}
	if got[0].Format != "practice" && got[0].Format != "text" {
		t.Fatalf("expected prioritized practice/text first, got %s", got[0].Format)
	}
}

func TestApplyPhase3ExperimentControlNoChange(t *testing.T) {
	svc := &PathTrackerService{}
	candidates := []stepCandidate{
		{Format: "communication", Difficulty: "medium"},
		{Format: "practice", Difficulty: "low"},
	}
	profile := trajectoryProfile{Segment: "steady_builder"}

	got := svc.ApplyPhase3Experiment(candidates, "user", profile, "medium", 5, "control")
	if got[0].Format != "communication" {
		t.Fatalf("expected original order in control, got %s first", got[0].Format)
	}
}

func TestExtractDurationFromInstructionsWithPunctuation(t *testing.T) {
	got := extractDurationFromInstructions([]string{"Сделай 5) глубоких вдохов."})
	if got != 5 {
		t.Fatalf("expected duration 5, got %d", got)
	}
}

func TestApplyCompletionStreakIgnoresOlderCompletionDate(t *testing.T) {
	last, current, best := applyCompletionStreak("2026-02-10", 4, 6, "2026-02-08")
	if last != "2026-02-10" {
		t.Fatalf("expected last active date to stay unchanged, got %q", last)
	}
	if current != 4 {
		t.Fatalf("expected current streak to stay 4, got %d", current)
	}
	if best != 6 {
		t.Fatalf("expected best streak to stay 6, got %d", best)
	}
}

func TestApplyCompletionStreakConsecutiveDayIncrements(t *testing.T) {
	last, current, best := applyCompletionStreak("2026-02-10", 4, 4, "2026-02-11")
	if last != "2026-02-11" {
		t.Fatalf("expected last active date to move forward, got %q", last)
	}
	if current != 5 {
		t.Fatalf("expected current streak to increment to 5, got %d", current)
	}
	if best != 5 {
		t.Fatalf("expected best streak to update to 5, got %d", best)
	}
}

func TestApplyCompletionStreakGapResetsCurrent(t *testing.T) {
	last, current, best := applyCompletionStreak("2026-02-10", 4, 7, "2026-02-14")
	if last != "2026-02-14" {
		t.Fatalf("expected last active date to move to completion date, got %q", last)
	}
	if current != 1 {
		t.Fatalf("expected current streak reset to 1, got %d", current)
	}
	if best != 7 {
		t.Fatalf("expected best streak to stay 7, got %d", best)
	}
}
