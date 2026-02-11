package services

import (
	"errors"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// WalletService handles wallet operations
type WalletService struct{}

// NewWalletService creates a new wallet service
func NewWalletService() *WalletService {
	return &WalletService{}
}

func (s *WalletService) getOrCreateWalletTx(tx *gorm.DB, userID uint) (*models.Wallet, error) {
	var wallet models.Wallet
	err := tx.Where("user_id = ?", userID).First(&wallet).Error
	if err == nil {
		return &wallet, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	wallet = models.Wallet{
		UserID:         &userID,
		Type:           models.WalletTypePersonal,
		Balance:        0,
		PendingBalance: 50,
		FrozenBalance:  0,
		TotalEarned:    0,
		TotalSpent:     0,
	}

	if err := tx.Create(&wallet).Error; err != nil {
		return nil, err
	}

	welcomeTx := models.WalletTransaction{
		WalletID:     wallet.ID,
		Type:         models.TransactionTypeBonus,
		Amount:       50,
		Description:  "Welcome Bonus (Pending activation)",
		BalanceAfter: 0,
	}
	if err := tx.Create(&welcomeTx).Error; err != nil {
		return nil, err
	}

	return &wallet, nil
}

// GetOrCreateWallet gets user's wallet or creates one with initial balance
func (s *WalletService) GetOrCreateWallet(userID uint) (*models.Wallet, error) {
	var wallet models.Wallet

	err := database.DB.Where("user_id = ?", userID).First(&wallet).Error
	if err == nil {
		return &wallet, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create new wallet with Welcome Bonus (Pending)
	// Strategy: 0 Active + 50 Pending (unlocked after profile completion)
	wallet = models.Wallet{
		UserID:         &userID,
		Type:           models.WalletTypePersonal,
		Balance:        0,  // Active balance starts at 0
		PendingBalance: 50, // Welcome bonus (locked)
		FrozenBalance:  0,
		TotalEarned:    0,
		TotalSpent:     0,
	}

	if err := database.DB.Create(&wallet).Error; err != nil {
		return nil, err
	}

	// Record welcome bonus transaction
	welcomeTx := models.WalletTransaction{
		WalletID:     wallet.ID,
		Type:         models.TransactionTypeBonus,
		Amount:       50,
		Description:  "Welcome Bonus (Pending activation)",
		BalanceAfter: 0, // Active balance is still 0
	}
	if err := database.DB.Create(&welcomeTx).Error; err != nil {
		return nil, err
	}

	log.Printf("[Wallet] Created wallet for user %d with 0 Active + 50 Pending LKM", userID)
	return &wallet, nil
}

// GetBalance returns user's current balance
func (s *WalletService) GetBalance(userID uint) (*models.WalletResponse, error) {
	wallet, err := s.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}

	var respUserID uint
	if wallet.UserID != nil {
		respUserID = *wallet.UserID
	}
	return &models.WalletResponse{
		ID:             wallet.ID,
		UserID:         respUserID,
		Balance:        wallet.Balance,
		PendingBalance: wallet.PendingBalance,
		FrozenBalance:  wallet.FrozenBalance,
		Currency:       "LKM",
		CurrencyName:   "LakshMoney",
		TotalEarned:    wallet.TotalEarned,
		TotalSpent:     wallet.TotalSpent,
	}, nil
}

// Transfer transfers Лакшми from one wallet to another
func (s *WalletService) Transfer(fromUserID, toUserID uint, amount int, description string, bookingID *uint) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	if fromUserID == toUserID {
		return errors.New("cannot transfer to yourself")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Transfer"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Lock sender's wallet to prevent concurrent overspend.
		var fromWallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", fromUserID).First(&fromWallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				createdWallet, createErr := s.getOrCreateWalletTx(tx, fromUserID)
				if createErr != nil {
					return createErr
				}
				fromWallet = *createdWallet
			} else {
				return err
			}
		}

		if fromWallet.Balance < amount {
			return errors.New("insufficient balance")
		}

		// Lock receiver's wallet (or create if doesn't exist).
		var toWallet models.Wallet
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", toUserID).First(&toWallet).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			createdWallet, createErr := s.getOrCreateWalletTx(tx, toUserID)
			if createErr != nil {
				return createErr
			}
			toWallet = *createdWallet
		} else if err != nil {
			return err
		}

		// Debit from sender
		newFromBalance := fromWallet.Balance - amount
		if err := tx.Model(&fromWallet).Updates(map[string]interface{}{
			"balance":     newFromBalance,
			"total_spent": fromWallet.TotalSpent + amount,
		}).Error; err != nil {
			return err
		}

		// Credit to receiver
		newToBalance := toWallet.Balance + amount
		if err := tx.Model(&toWallet).Updates(map[string]interface{}{
			"balance":      newToBalance,
			"total_earned": toWallet.TotalEarned + amount,
		}).Error; err != nil {
			return err
		}

		// Record debit transaction
		debitTx := models.WalletTransaction{
			WalletID:        fromWallet.ID,
			Type:            models.TransactionTypeDebit,
			Amount:          amount,
			Description:     description,
			BookingID:       bookingID,
			RelatedWalletID: &toWallet.ID,
			BalanceAfter:    newFromBalance,
		}
		if err := tx.Create(&debitTx).Error; err != nil {
			return err
		}

		// Record credit transaction
		creditTx := models.WalletTransaction{
			WalletID:        toWallet.ID,
			Type:            models.TransactionTypeCredit,
			Amount:          amount,
			Description:     description,
			BookingID:       bookingID,
			RelatedWalletID: &fromWallet.ID,
			BalanceAfter:    newToBalance,
		}
		if err := tx.Create(&creditTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Transfer: %d LKM from user %d to user %d", amount, fromUserID, toUserID)
		return nil
	})
}

// AddBonus adds bonus Лакшми to user's wallet
func (s *WalletService) AddBonus(userID uint, amount int, description string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Bonus credited"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		wallet, err := s.getOrCreateWalletTx(tx, userID)
		if err != nil {
			return err
		}

		newBalance := wallet.Balance + amount
		if err := tx.Model(wallet).Updates(map[string]interface{}{
			"balance":      newBalance,
			"total_earned": wallet.TotalEarned + amount,
		}).Error; err != nil {
			return err
		}

		// Record bonus transaction
		bonusTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeBonus,
			Amount:       amount,
			Description:  description,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&bonusTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Bonus: %d LKM to user %d", amount, userID)

		// Send Push Notification (if not welcome bonus, as it's typically processed silently/internally)
		// Also skip generic bonus notification for referrals, as ReferralService sends a more detailed one.
		descLower := strings.ToLower(description)
		if !strings.Contains(descLower, "welcome") && !strings.Contains(descLower, "реферальный") {
			go func() {
				GetPushService().SendWalletBonusReceived(userID, amount, description)
			}()
		}

		return nil
	})
}

// Refund refunds Лакшми to user's wallet
func (s *WalletService) Refund(userID uint, amount int, description string, bookingID *uint) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Refund"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		wallet, err := s.getOrCreateWalletTx(tx, userID)
		if err != nil {
			return err
		}

		newBalance := wallet.Balance + amount
		if err := tx.Model(wallet).Updates(map[string]interface{}{
			"balance":     newBalance,
			"total_spent": gorm.Expr("GREATEST(total_spent - ?, 0)", amount),
		}).Error; err != nil {
			return err
		}

		// Record refund transaction
		refundTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeRefund,
			Amount:       amount,
			Description:  description,
			BookingID:    bookingID,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&refundTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Refund: %d LKM to user %d", amount, userID)
		return nil
	})
}

// GetTransactions returns paginated transactions for a wallet
func (s *WalletService) GetTransactions(userID uint, filters models.TransactionFilters) (*models.TransactionListResponse, error) {
	wallet, err := s.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}

	query := database.DB.Where("wallet_id = ?", wallet.ID)
	filters.Type = models.TransactionType(strings.TrimSpace(string(filters.Type)))
	filters.DateFrom = strings.TrimSpace(filters.DateFrom)
	filters.DateTo = strings.TrimSpace(filters.DateTo)

	// Apply filters
	if filters.Type != "" {
		query = query.Where("type = ?", filters.Type)
	}

	if filters.DateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			query = query.Where("created_at >= ?", dateFrom)
		}
	}

	if filters.DateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			query = query.Where("created_at < ?", dateTo.AddDate(0, 0, 1))
		}
	}

	// Count total
	var total int64
	if err := query.Model(&models.WalletTransaction{}).Count(&total).Error; err != nil {
		return nil, err
	}

	// Pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Fetch transactions
	var transactions []models.WalletTransaction
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&transactions).Error; err != nil {
		return nil, err
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &models.TransactionListResponse{
		Transactions: transactions,
		Total:        total,
		Page:         page,
		Limit:        limit,
		TotalPages:   totalPages,
	}, nil
}

// GetStats returns wallet statistics
func (s *WalletService) GetStats(userID uint) (*models.WalletStatsResponse, error) {
	wallet, err := s.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}

	// Calculate this month stats
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var thisMonthIn int
	if err := database.DB.Model(&models.WalletTransaction{}).
		Where("wallet_id = ? AND type IN (?, ?) AND created_at >= ?",
			wallet.ID, models.TransactionTypeCredit, models.TransactionTypeBonus, startOfMonth).
		Select("COALESCE(SUM(amount), 0)").Scan(&thisMonthIn).Error; err != nil {
		return nil, err
	}

	var thisMonthOut int
	if err := database.DB.Model(&models.WalletTransaction{}).
		Where("wallet_id = ? AND type = ? AND created_at >= ?",
			wallet.ID, models.TransactionTypeDebit, startOfMonth).
		Select("COALESCE(SUM(amount), 0)").Scan(&thisMonthOut).Error; err != nil {
		return nil, err
	}

	return &models.WalletStatsResponse{
		Balance:      wallet.Balance,
		TotalEarned:  wallet.TotalEarned,
		TotalSpent:   wallet.TotalSpent,
		ThisMonthIn:  thisMonthIn,
		ThisMonthOut: thisMonthOut,
	}, nil
}

// ==================== NEW MVP METHODS ====================

// Spend deducts LKM from user's wallet with idempotency protection
// dedupKey prevents double-spending (use messageID, requestID, etc.)
func (s *WalletService) Spend(userID uint, amount int, dedupKey string, description string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	dedupKey = strings.TrimSpace(dedupKey)
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Spend"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Lock wallet for update
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				if _, createErr := s.getOrCreateWalletTx(tx, userID); createErr != nil {
					return createErr
				}
				if lockErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
					Where("user_id = ?", userID).First(&wallet).Error; lockErr != nil {
					return lockErr
				}
			} else {
				return err
			}
		}

		// Check for duplicate transaction (idempotency) scoped to this wallet.
		if dedupKey != "" {
			var existing models.WalletTransaction
			if err := tx.Where("wallet_id = ? AND dedup_key = ?", wallet.ID, dedupKey).First(&existing).Error; err == nil {
				log.Printf("[Wallet] Duplicate spend blocked: wallet=%d dedup=%s", wallet.ID, dedupKey)
				return nil // Already processed, return success
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		if wallet.Balance < amount {
			return errors.New("insufficient balance")
		}

		// Deduct balance
		newBalance := wallet.Balance - amount
		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"balance":     newBalance,
			"total_spent": wallet.TotalSpent + amount,
		}).Error; err != nil {
			return err
		}

		// Record transaction
		spendTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeDebit,
			Amount:       amount,
			Description:  description,
			DedupKey:     dedupKey,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&spendTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Spend: %d LKM from user %d (dedup: %s)", amount, userID, dedupKey)

		// Trigger referral activation asynchronously (if user was referred)
		go func(uid uint) {
			referralService := NewReferralService(s)
			if err := referralService.ProcessActivation(uid); err != nil {
				log.Printf("[Wallet] Referral activation failed for user %d: %v", uid, err)
			}
		}(userID)

		return nil
	})
}

// AdminCharge adds LKM to user's wallet (God Mode)
func (s *WalletService) AdminCharge(adminID, userID uint, amount int, reason string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return errors.New("reason is required for admin actions")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		wallet, err := s.getOrCreateWalletTx(tx, userID)
		if err != nil {
			return err
		}

		newBalance := wallet.Balance + amount
		if err := tx.Model(wallet).Updates(map[string]interface{}{
			"balance":      newBalance,
			"total_earned": wallet.TotalEarned + amount,
		}).Error; err != nil {
			return err
		}

		// Record admin action
		adminTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeAdminCharge,
			Amount:       amount,
			Description:  "Admin charge: " + reason,
			AdminID:      &adminID,
			Reason:       reason,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&adminTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] AdminCharge: %d LKM to user %d by admin %d (reason: %s)", amount, userID, adminID, reason)
		return nil
	})
}

// AdminSeize removes LKM from user's wallet (God Mode)
func (s *WalletService) AdminSeize(adminID, userID uint, amount int, reason string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return errors.New("reason is required for admin actions")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return errors.New("wallet not found")
		}

		if wallet.Balance < amount {
			return errors.New("insufficient balance to seize")
		}

		newBalance := wallet.Balance - amount
		if err := tx.Model(&wallet).Update("balance", newBalance).Error; err != nil {
			return err
		}

		// Record admin action
		seizeTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeAdminSeize,
			Amount:       amount,
			Description:  "Admin seize: " + reason,
			AdminID:      &adminID,
			Reason:       reason,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&seizeTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] AdminSeize: %d LKM from user %d by admin %d (reason: %s)", amount, userID, adminID, reason)
		return nil
	})
}

// ActivatePendingBalance unlocks pending balance (Welcome Bonus) to active
// Called when user completes profile or performs qualifying action
func (s *WalletService) ActivatePendingBalance(userID uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return errors.New("wallet not found")
		}

		if wallet.PendingBalance <= 0 {
			return nil // Nothing to activate
		}

		pendingAmount := wallet.PendingBalance
		newBalance := wallet.Balance + pendingAmount

		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"balance":         newBalance,
			"pending_balance": 0,
			"total_earned":    wallet.TotalEarned + pendingAmount,
		}).Error; err != nil {
			return err
		}

		// Record activation
		activateTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeBonus,
			Amount:       pendingAmount,
			Description:  "Welcome Bonus Activated",
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&activateTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Activated %d pending LKM for user %d", pendingAmount, userID)

		// Send Push Notification
		go func() {
			GetPushService().SendWalletBalanceActivated(userID, pendingAmount)
		}()

		return nil
	})
}

// HoldFunds freezes funds for a booking (not spent yet)
func (s *WalletService) HoldFunds(userID uint, amount int, bookingID uint, description string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Funds hold"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return errors.New("wallet not found")
		}

		if wallet.Balance < amount {
			return errors.New("insufficient balance")
		}

		newBalance := wallet.Balance - amount
		newFrozen := wallet.FrozenBalance + amount

		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"balance":        newBalance,
			"frozen_balance": newFrozen,
		}).Error; err != nil {
			return err
		}

		// Record hold
		holdTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeHold,
			Amount:       amount,
			Description:  description,
			BookingID:    &bookingID,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&holdTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Hold: %d LKM from user %d for booking %d", amount, userID, bookingID)
		return nil
	})
}

// ReleaseFunds releases held funds to provider or back to user
func (s *WalletService) ReleaseFunds(userID uint, amount int, bookingID uint, toUserID uint, description string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Funds release"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return errors.New("wallet not found")
		}

		if wallet.FrozenBalance < amount {
			return errors.New("insufficient frozen balance")
		}

		// Reduce frozen balance
		newFrozen := wallet.FrozenBalance - amount
		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"frozen_balance": newFrozen,
			"total_spent":    wallet.TotalSpent + amount,
		}).Error; err != nil {
			return err
		}

		// Record release from sender
		releaseTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeRelease,
			Amount:       amount,
			Description:  description,
			BookingID:    &bookingID,
			BalanceAfter: wallet.Balance, // Active balance unchanged
		}
		if err := tx.Create(&releaseTx).Error; err != nil {
			return err
		}

		// Credit to provider
		var toWallet models.Wallet
		err := tx.Where("user_id = ?", toUserID).First(&toWallet).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create wallet for provider if doesn't exist
			toWallet = models.Wallet{UserID: &toUserID, Type: models.WalletTypePersonal, Balance: 0, PendingBalance: 0, FrozenBalance: 0}
			if err := tx.Create(&toWallet).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		}

		newToBalance := toWallet.Balance + amount
		if err := tx.Model(&toWallet).Updates(map[string]interface{}{
			"balance":      newToBalance,
			"total_earned": toWallet.TotalEarned + amount,
		}).Error; err != nil {
			return err
		}

		// Record credit to provider
		creditTx := models.WalletTransaction{
			WalletID:        toWallet.ID,
			Type:            models.TransactionTypeCredit,
			Amount:          amount,
			Description:     description,
			BookingID:       &bookingID,
			RelatedWalletID: &wallet.ID,
			BalanceAfter:    newToBalance,
		}
		if err := tx.Create(&creditTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Release: %d LKM from user %d to user %d (booking %d)", amount, userID, toUserID, bookingID)
		return nil
	})
}

// RefundHold returns held funds back to user's active balance
func (s *WalletService) RefundHold(userID uint, amount int, bookingID uint, description string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Hold refund"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			return errors.New("wallet not found")
		}

		if wallet.FrozenBalance < amount {
			return errors.New("insufficient frozen balance")
		}

		newBalance := wallet.Balance + amount
		newFrozen := wallet.FrozenBalance - amount

		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"balance":        newBalance,
			"frozen_balance": newFrozen,
		}).Error; err != nil {
			return err
		}

		// Record refund
		refundTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeRefund,
			Amount:       amount,
			Description:  description,
			BookingID:    &bookingID,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&refundTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] RefundHold: %d LKM to user %d (booking %d cancelled)", amount, userID, bookingID)
		return nil
	})
}
