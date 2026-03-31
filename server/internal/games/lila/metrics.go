package lila

import (
	"context"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

type MetricsSnapshot struct {
	QueueDepth             map[string]int64 `json:"queueDepth"`
	ActiveMatches          int64            `json:"activeMatches"`
	FinishedMatchesToday   int64            `json:"finishedMatchesToday"`
	OpenRounds             int64            `json:"openRounds"`
	SettlementFailures     int64            `json:"settlementFailures"`
	PurchaseFailures       int64            `json:"purchaseFailures"`
	Reconnects             int64            `json:"reconnects"`
	BonusLedgerEntries     int64            `json:"bonusLedgerEntries"`
	DharmaFundReservations int64            `json:"dharmaFundReservations"`
	At                     time.Time        `json:"at"`
}

func BuildMetricsSnapshot(ctx context.Context, db *gorm.DB) (MetricsSnapshot, error) {
	snapshot := MetricsSnapshot{
		QueueDepth: make(map[string]int64),
		At:         time.Now(),
	}
	if db == nil {
		return snapshot, nil
	}

	var queueRows []struct {
		Mode  models.LilaGameMode
		Count int64
	}
	if err := db.WithContext(ctx).
		Model(&models.LilaQueueEntry{}).
		Select("mode, COUNT(*) AS count").
		Where("status IN ?", []models.LilaQueueStatus{models.LilaQueueStatusWaiting, models.LilaQueueStatusReady}).
		Group("mode").
		Scan(&queueRows).Error; err != nil {
		return snapshot, err
	}
	for _, row := range queueRows {
		snapshot.QueueDepth[string(row.Mode)] = row.Count
	}

	if err := db.WithContext(ctx).Model(&models.LilaMatch{}).Where("status = ?", models.LilaMatchStatusActive).Count(&snapshot.ActiveMatches).Error; err != nil {
		return snapshot, err
	}

	startOfDay := time.Now().Truncate(24 * time.Hour)
	if err := db.WithContext(ctx).Model(&models.LilaMatch{}).
		Where("status = ? AND finished_at >= ?", models.LilaMatchStatusFinished, startOfDay).
		Count(&snapshot.FinishedMatchesToday).Error; err != nil {
		return snapshot, err
	}

	if err := db.WithContext(ctx).Model(&models.LilaRound{}).Where("status IN ?", []models.LilaRoundStatus{models.LilaRoundStatusPending, models.LilaRoundStatusRunning}).Count(&snapshot.OpenRounds).Error; err != nil {
		return snapshot, err
	}

	if err := db.WithContext(ctx).Model(&models.LilaMatch{}).Where("status = ? AND abandoned_reason <> ''", models.LilaMatchStatusAbandoned).Count(&snapshot.SettlementFailures).Error; err != nil {
		return snapshot, err
	}

	if err := db.WithContext(ctx).Model(&models.LilaPurchase{}).Where("status = ?", models.LilaPurchaseStatusFailed).Count(&snapshot.PurchaseFailures).Error; err != nil {
		return snapshot, err
	}

	if err := db.WithContext(ctx).Model(&models.LilaMatch{}).Where("reconnect_count > 0").Count(&snapshot.Reconnects).Error; err != nil {
		return snapshot, err
	}

	if err := db.WithContext(ctx).Model(&models.LilaBonusLedgerEntry{}).Count(&snapshot.BonusLedgerEntries).Error; err != nil {
		return snapshot, err
	}

	if err := db.WithContext(ctx).Model(&models.LilaDharmaFundRecord{}).Where("status IN ?", []models.LilaDharmaFundStatus{models.LilaDharmaFundStatusPending, models.LilaDharmaFundStatusReserved}).Count(&snapshot.DharmaFundReservations).Error; err != nil {
		return snapshot, err
	}

	return snapshot, nil
}
