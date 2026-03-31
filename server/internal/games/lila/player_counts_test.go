package lila

import (
	"testing"

	"rag-agent-server/internal/models"
)

func TestBuildModePlayerCountsIncludesLobbyAndActivePlayers(t *testing.T) {
	t.Parallel()

	lobbyMatchID := uint(11)
	activeMatchID := uint(22)

	counts := buildModePlayerCounts(
		[]models.LilaQueueEntry{
			{UserID: 1, Mode: models.LilaGameModeDharmaDuel, Status: models.LilaQueueStatusWaiting},
			{UserID: 2, Mode: models.LilaGameModeDharmaDuel, Status: models.LilaQueueStatusReady, MatchID: &lobbyMatchID},
			{UserID: 3, Mode: models.LilaGameModeDharmaDuel, Status: models.LilaQueueStatusMatched, MatchID: &lobbyMatchID},
			{UserID: 4, Mode: models.LilaGameModeSabha, Status: models.LilaQueueStatusReady, MatchID: &activeMatchID},
		},
		map[uint]models.LilaMatchStatus{
			lobbyMatchID:  models.LilaMatchStatusLobby,
			activeMatchID: models.LilaMatchStatusActive,
		},
	)

	if got := counts[string(models.LilaGameModeDharmaDuel)]; got != 3 {
		t.Fatalf("expected duel count 3, got %d", got)
	}
	if got := counts[string(models.LilaGameModeSabha)]; got != 1 {
		t.Fatalf("expected sabha count 1, got %d", got)
	}
}

func TestBuildModePlayerCountsSkipsFinishedOrDanglingMatches(t *testing.T) {
	t.Parallel()

	finishedMatchID := uint(33)

	counts := buildModePlayerCounts(
		[]models.LilaQueueEntry{
			{UserID: 1, Mode: models.LilaGameModeDharmaDuel, Status: models.LilaQueueStatusReady, MatchID: &finishedMatchID},
			{UserID: 2, Mode: models.LilaGameModeDharmaDuel, Status: models.LilaQueueStatusMatched},
			{UserID: 3, Mode: models.LilaGameModeSurvivalSamsara, Status: models.LilaQueueStatusCancelled},
		},
		map[uint]models.LilaMatchStatus{
			finishedMatchID: models.LilaMatchStatusFinished,
		},
	)

	if got := counts[string(models.LilaGameModeDharmaDuel)]; got != 0 {
		t.Fatalf("expected duel count 0, got %d", got)
	}
	if got := counts[string(models.LilaGameModeSurvivalSamsara)]; got != 0 {
		t.Fatalf("expected survival count 0, got %d", got)
	}
}
