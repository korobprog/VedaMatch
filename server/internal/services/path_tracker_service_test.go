package services

import "testing"

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
