package lila

import (
	"testing"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

func TestShouldExpireLilaQueueEntryExpiresOldWaitingEntry(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.March, 31, 21, 0, 0, 0, time.UTC)
	entry := models.LilaQueueEntry{
		UserID:   4,
		Mode:     models.LilaGameModeDharmaDuel,
		Status:   models.LilaQueueStatusWaiting,
		JoinedAt: now.Add(-lilaQueueEntryStaleTTL - time.Minute),
	}

	if !shouldExpireLilaQueueEntry(entry, nil, now) {
		t.Fatalf("expected stale waiting entry to expire")
	}
}

func TestShouldExpireLilaQueueEntryKeepsFreshWaitingEntry(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.March, 31, 21, 0, 0, 0, time.UTC)
	entry := models.LilaQueueEntry{
		UserID:   4,
		Mode:     models.LilaGameModeDharmaDuel,
		Status:   models.LilaQueueStatusWaiting,
		JoinedAt: now.Add(-5 * time.Minute),
	}

	if shouldExpireLilaQueueEntry(entry, nil, now) {
		t.Fatalf("expected fresh waiting entry to stay active")
	}
}

func TestShouldExpireLilaQueueEntryExpiresStaleLobbyEntry(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.March, 31, 21, 0, 0, 0, time.UTC)
	matchID := uint(7)
	entry := models.LilaQueueEntry{
		UserID:   4,
		Mode:     models.LilaGameModeDharmaDuel,
		Status:   models.LilaQueueStatusMatched,
		MatchID:  &matchID,
		JoinedAt: now.Add(-15 * time.Minute),
	}
	match := &models.LilaMatch{
		Model:          gorm.Model{ID: matchID},
		Status:         models.LilaMatchStatusLobby,
		LobbyStartedAt: func() *time.Time { value := now.Add(-lilaLobbyStaleTTL - time.Minute); return &value }(),
	}

	if !shouldExpireLilaQueueEntry(entry, match, now) {
		t.Fatalf("expected stale lobby entry to expire")
	}
}

func TestShouldExpireLilaQueueEntryKeepsActiveMatchEntry(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.March, 31, 21, 0, 0, 0, time.UTC)
	matchID := uint(9)
	entry := models.LilaQueueEntry{
		UserID:   4,
		Mode:     models.LilaGameModeDharmaDuel,
		Status:   models.LilaQueueStatusReady,
		MatchID:  &matchID,
		JoinedAt: now.Add(-time.Hour),
	}
	match := &models.LilaMatch{
		Model:  gorm.Model{ID: matchID},
		Status: models.LilaMatchStatusActive,
	}

	if shouldExpireLilaQueueEntry(entry, match, now) {
		t.Fatalf("expected active match entry to stay active")
	}
}
