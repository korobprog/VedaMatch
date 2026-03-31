package handlers

import "testing"

func TestParseLilaModeAliases(t *testing.T) {
	if got := parseLilaMode("duel"); got != "dharma_duel" {
		t.Fatalf("expected dharma_duel, got %s", got)
	}
	if got := parseLilaMode("survival"); got != "survival_in_samsara" {
		t.Fatalf("expected survival_in_samsara, got %s", got)
	}
}
