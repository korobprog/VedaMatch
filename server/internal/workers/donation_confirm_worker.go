package workers

import (
	"errors"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// StartDonationConfirmWorker starts a background worker that auto-confirms donations
// after the 24-hour cooling-off period expires
func StartDonationConfirmWorker() {
	// Register task in scheduler (runs every 10 minutes)
	// We use the services.GlobalScheduler pattern from other workers
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		// Run immediately on start
		processExpiredDonations()

		for range ticker.C {
			processExpiredDonations()
		}
	}()

	log.Println("[Worker] Donation Confirm Worker started (interval: 10m)")
}

// processExpiredDonations finds pending donations past their refund deadline
// and confirms them (moves funds from holding to confirmed)
func processExpiredDonations() {
	now := time.Now()

	// Find donations that are:
	// 1. Status = pending
	// 2. CanRefundUntil has passed
	var donations []models.CharityDonation
	err := database.DB.
		Preload("Project.Organization").
		Where("status = ? AND can_refund_until < ?", models.DonationStatusPending, now).
		Find(&donations).Error

	if err != nil {
		log.Printf("[DonationWorker] Error fetching expired donations: %v", err)
		return
	}

	if len(donations) == 0 {
		return
	}

	log.Printf("[DonationWorker] Processing %d expired donations for auto-confirmation", len(donations))

	for _, donation := range donations {
		err := confirmDonation(&donation)
		if err != nil {
			log.Printf("[DonationWorker] Error confirming donation %d: %v", donation.ID, err)
			continue
		}

		log.Printf("[DonationWorker] Auto-confirmed donation %d (Amount: %d LKM to Project: %d)",
			donation.ID, donation.Amount, donation.ProjectID)
	}
}

// confirmDonation updates the donation status to confirmed
func confirmDonation(donation *models.CharityDonation) error {
	now := time.Now()

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Confirm donation only if still pending
		result := tx.Model(&models.CharityDonation{}).
			Where("id = ? AND status = ?", donation.ID, models.DonationStatusPending).
			Updates(map[string]interface{}{
				"status":       models.DonationStatusConfirmed,
				"confirmed_at": &now,
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			// Donation already confirmed/refunded
			return nil
		}

		// Move held funds to organization balance
		if donation.Project == nil || donation.Project.Organization == nil || donation.Project.Organization.WalletID == nil {
			return errors.New("organization wallet not configured")
		}
		var orgWallet models.Wallet
		if err := tx.First(&orgWallet, *donation.Project.Organization.WalletID).Error; err != nil {
			return err
		}

		if err := tx.Model(&orgWallet).Updates(map[string]interface{}{
			"balance":        gorm.Expr("balance + ?", donation.Amount),
			"frozen_balance": gorm.Expr("frozen_balance - ?", donation.Amount),
			"total_earned":   gorm.Expr("total_earned + ?", donation.Amount),
		}).Error; err != nil {
			return err
		}

		return nil
	})
}
