package lila

import (
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	if db == nil {
		return nil
	}
	return db.AutoMigrate(
		&models.LilaQuestion{},
		&models.LilaQueueEntry{},
		&models.LilaMatch{},
		&models.LilaRound{},
		&models.LilaAnswer{},
		&models.LilaSiddhiUsage{},
		&models.LilaProfile{},
		&models.LilaQuest{},
		&models.LilaQuestProgress{},
		&models.LilaGuruLink{},
		&models.LilaStoreItem{},
		&models.LilaPurchase{},
		&models.LilaPassSeason{},
		&models.LilaPassProgress{},
		&models.LilaSubscription{},
		&models.LilaGift{},
		&models.LilaDharmaFundRecord{},
		&models.LilaBonusLedgerEntry{},
	)
}
