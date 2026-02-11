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
