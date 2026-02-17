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

// SpendOptions controls how regular and bonus balances can be used.
type SpendOptions struct {
	AllowBonus      bool
	MaxBonusPercent int // 0..100
	MaxBonusAmount  int // absolute cap in LKM; 0 means no absolute cap
}

// SpendAllocation stores split between regular and bonus balances.
type SpendAllocation struct {
	RegularAmount int
	BonusAmount   int
	TotalAmount   int
}

func normalizeSpendOptions(opts SpendOptions) SpendOptions {
	if opts.MaxBonusPercent < 0 {
		opts.MaxBonusPercent = 0
	}
	if opts.MaxBonusPercent > 100 {
		opts.MaxBonusPercent = 100
	}
	if opts.AllowBonus && opts.MaxBonusPercent == 0 {
		opts.MaxBonusPercent = 100
	}
	if !opts.AllowBonus {
		opts.MaxBonusPercent = 0
		opts.MaxBonusAmount = 0
	}
	if opts.MaxBonusAmount < 0 {
		opts.MaxBonusAmount = 0
	}
	return opts
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func calculateTotalPages(total int64, limit int) int {
	if limit <= 0 {
		return 1
	}
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}
	if totalPages == 0 {
		return 1
	}
	return totalPages
}

func calculateSpendAllocation(amount, regularBalance, bonusBalance int, opts SpendOptions) (SpendAllocation, error) {
	if amount <= 0 {
		return SpendAllocation{}, errors.New("amount must be positive")
	}
	opts = normalizeSpendOptions(opts)

	allocation := SpendAllocation{TotalAmount: amount}
	if !opts.AllowBonus || bonusBalance <= 0 {
		allocation.RegularAmount = amount
		return allocation, nil
	}

	maxBonusByPercent := amount * opts.MaxBonusPercent / 100
	if opts.MaxBonusAmount > 0 && opts.MaxBonusAmount < maxBonusByPercent {
		maxBonusByPercent = opts.MaxBonusAmount
	}
	allocation.BonusAmount = minInt(bonusBalance, maxBonusByPercent)
	allocation.RegularAmount = amount - allocation.BonusAmount

	if allocation.RegularAmount > regularBalance && allocation.BonusAmount > 0 {
		neededFromBonus := allocation.RegularAmount - regularBalance
		additionalBonusAllowed := maxBonusByPercent - allocation.BonusAmount
		if neededFromBonus > 0 && additionalBonusAllowed > 0 {
			bonusShift := minInt(neededFromBonus, minInt(additionalBonusAllowed, bonusBalance-allocation.BonusAmount))
			allocation.BonusAmount += bonusShift
			allocation.RegularAmount -= bonusShift
		}
	}

	return allocation, nil
}

func allocationFromExistingSpendTransaction(existing models.WalletTransaction, requestedAmount int) (SpendAllocation, error) {
	if existing.Amount <= 0 {
		return SpendAllocation{}, errors.New("invalid existing spend transaction amount")
	}
	if requestedAmount != existing.Amount {
		return SpendAllocation{}, errors.New("dedup key already used with different amount")
	}

	bonus := existing.BonusAmount
	if bonus < 0 {
		bonus = 0
	}
	if bonus > existing.Amount {
		bonus = existing.Amount
	}

	return SpendAllocation{
		TotalAmount:   existing.Amount,
		BonusAmount:   bonus,
		RegularAmount: existing.Amount - bonus,
	}, nil
}

func isDuplicateKeyError(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	if err == nil {
		return false
	}

	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "unique violation") ||
		strings.Contains(msg, "duplicate entry")
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
		UserID:             &userID,
		Type:               models.WalletTypePersonal,
		Balance:            0,
		BonusBalance:       0,
		PendingBalance:     50,
		FrozenBalance:      0,
		FrozenBonusBalance: 0,
		TotalEarned:        0,
		TotalSpent:         0,
	}

	if err := tx.Create(&wallet).Error; err != nil {
		if isDuplicateKeyError(err) {
			if getErr := tx.Where("user_id = ?", userID).First(&wallet).Error; getErr != nil {
				return nil, getErr
			}
			return &wallet, nil
		}
		return nil, err
	}

	welcomeTx := models.WalletTransaction{
		WalletID:     wallet.ID,
		Type:         models.TransactionTypeBonus,
		Amount:       50,
		BonusAmount:  50,
		Description:  "Welcome Bonus (Pending activation)",
		BalanceAfter: 0,
	}
	if err := tx.Create(&welcomeTx).Error; err != nil {
		return nil, err
	}

	return &wallet, nil
}

func (s *WalletService) getOrCreateLockedWalletTx(tx *gorm.DB, userID uint) (*models.Wallet, error) {
	var wallet models.Wallet
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ?", userID).First(&wallet).Error; err == nil {
		return &wallet, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if _, err := s.getOrCreateWalletTx(tx, userID); err != nil {
		return nil, err
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ?", userID).First(&wallet).Error; err != nil {
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

	created := false
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Re-check inside transaction to avoid duplicate wallet under concurrent requests.
		if txErr := tx.Where("user_id = ?", userID).First(&wallet).Error; txErr == nil {
			return nil
		} else if !errors.Is(txErr, gorm.ErrRecordNotFound) {
			return txErr
		}

		// Create new wallet with Welcome Bonus (Pending)
		// Strategy: 0 Active + 50 Pending (unlocked after profile completion)
		wallet = models.Wallet{
			UserID:             &userID,
			Type:               models.WalletTypePersonal,
			Balance:            0,  // Active regular balance starts at 0
			BonusBalance:       0,  // Active bonus is empty until pending activation
			PendingBalance:     50, // Welcome bonus (locked)
			FrozenBalance:      0,
			FrozenBonusBalance: 0,
			TotalEarned:        0,
			TotalSpent:         0,
		}

		if txErr := tx.Create(&wallet).Error; txErr != nil {
			if isDuplicateKeyError(txErr) {
				return tx.Where("user_id = ?", userID).First(&wallet).Error
			}
			return txErr
		}
		created = true

		// Record welcome bonus transaction
		welcomeTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeBonus,
			Amount:       50,
			BonusAmount:  50,
			Description:  "Welcome Bonus (Pending activation)",
			BalanceAfter: 0, // Active balance is still 0
		}
		if txErr := tx.Create(&welcomeTx).Error; txErr != nil {
			return txErr
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if created {
		log.Printf("[Wallet] Created wallet for user %d with 0 Active + 50 Pending LKM", userID)
	}
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
		ID:                 wallet.ID,
		UserID:             respUserID,
		Balance:            wallet.Balance,
		BonusBalance:       wallet.BonusBalance,
		PendingBalance:     wallet.PendingBalance,
		FrozenBalance:      wallet.FrozenBalance,
		FrozenBonusBalance: wallet.FrozenBonusBalance,
		Currency:           "LKM",
		CurrencyName:       "LakshMoney",
		TotalEarned:        wallet.TotalEarned,
		TotalSpent:         wallet.TotalSpent,
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
		fromWallet, err := s.getOrCreateLockedWalletTx(tx, fromUserID)
		if err != nil {
			return err
		}

		if fromWallet.Balance < amount {
			return errors.New("insufficient balance")
		}

		// Lock receiver's wallet (or create if doesn't exist).
		toWallet, err := s.getOrCreateLockedWalletTx(tx, toUserID)
		if err != nil {
			return err
		}

		// Debit from sender
		newFromBalance := fromWallet.Balance - amount
		if err := tx.Model(fromWallet).Updates(map[string]interface{}{
			"balance":     newFromBalance,
			"total_spent": fromWallet.TotalSpent + amount,
		}).Error; err != nil {
			return err
		}

		// Credit to receiver
		newToBalance := toWallet.Balance + amount
		if err := tx.Model(toWallet).Updates(map[string]interface{}{
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

	shouldSendPush := false
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		wallet, err := s.getOrCreateWalletTx(tx, userID)
		if err != nil {
			return err
		}

		newBonusBalance := wallet.BonusBalance + amount
		if err := tx.Model(wallet).Updates(map[string]interface{}{
			"bonus_balance": newBonusBalance,
			"total_earned":  wallet.TotalEarned + amount,
		}).Error; err != nil {
			return err
		}

		// Record bonus transaction
		bonusTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeBonus,
			Amount:       amount,
			BonusAmount:  amount,
			Description:  description,
			BalanceAfter: wallet.Balance,
		}
		if err := tx.Create(&bonusTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Bonus: %d LKM to user %d", amount, userID)

		// Send Push Notification (if not welcome bonus, as it's typically processed silently/internally)
		// Also skip generic bonus notification for referrals, as ReferralService sends a more detailed one.
		descLower := strings.ToLower(description)
		if !strings.Contains(descLower, "welcome") && !strings.Contains(descLower, "реферальный") {
			shouldSendPush = true
		}

		return nil
	}); err != nil {
		return err
	}

	if shouldSendPush {
		go func() {
			GetPushService().SendWalletBonusReceived(userID, amount, description)
		}()
	}

	return nil
}

// Refund refunds Лакшми to user's wallet
func (s *WalletService) Refund(userID uint, amount int, description string, bookingID *uint) error {
	return s.RefundWithSplit(userID, amount, 0, description, bookingID)
}

// RefundWithSplit refunds regular+bonus Лакшми to user's wallet.
func (s *WalletService) RefundWithSplit(userID uint, regularAmount int, bonusAmount int, description string, bookingID *uint) error {
	if regularAmount < 0 || bonusAmount < 0 {
		return errors.New("amount must be non-negative")
	}
	totalAmount := regularAmount + bonusAmount
	if totalAmount <= 0 {
		return errors.New("amount must be positive")
	}
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Refund"
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		return s.refundTxWithSplit(tx, userID, regularAmount, bonusAmount, description, bookingID)
	})
}

func (s *WalletService) refundTxWithSplit(tx *gorm.DB, userID uint, regularAmount int, bonusAmount int, description string, bookingID *uint) error {
	wallet, err := s.getOrCreateWalletTx(tx, userID)
	if err != nil {
		return err
	}

	totalAmount := regularAmount + bonusAmount
	newBalance := wallet.Balance + regularAmount
	newBonusBalance := wallet.BonusBalance + bonusAmount
	if err := tx.Model(wallet).Updates(map[string]interface{}{
		"balance":       newBalance,
		"bonus_balance": newBonusBalance,
		"total_spent":   gorm.Expr("GREATEST(total_spent - ?, 0)", totalAmount),
	}).Error; err != nil {
		return err
	}

	refundTx := models.WalletTransaction{
		WalletID:     wallet.ID,
		Type:         models.TransactionTypeRefund,
		Amount:       totalAmount,
		BonusAmount:  bonusAmount,
		Description:  description,
		BookingID:    bookingID,
		BalanceAfter: newBalance,
	}
	if err := tx.Create(&refundTx).Error; err != nil {
		return err
	}

	log.Printf("[Wallet] Refund: %d LKM to user %d (bonus=%d)", totalAmount, userID, bonusAmount)
	return nil
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

	return &models.TransactionListResponse{
		Transactions: transactions,
		Total:        total,
		Page:         page,
		Limit:        limit,
		TotalPages:   calculateTotalPages(total, limit),
	}, nil
}

// GetStats returns wallet statistics
func (s *WalletService) GetStats(userID uint) (*models.WalletStatsResponse, error) {
	wallet, err := s.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}

	// Calculate this month stats
	now := time.Now().UTC()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

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
		BonusBalance: wallet.BonusBalance,
		TotalBalance: wallet.Balance + wallet.BonusBalance,
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
	return s.SpendWithOptions(userID, amount, dedupKey, description, SpendOptions{
		AllowBonus:      true,
		MaxBonusPercent: 100,
	})
}

// SpendWithOptions deducts LKM from user's wallet with optional bonus usage controls.
func (s *WalletService) SpendWithOptions(userID uint, amount int, dedupKey string, description string, opts SpendOptions) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	dedupKey = strings.TrimSpace(dedupKey)
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Spend"
	}

	opts = normalizeSpendOptions(opts)
	processed := false
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		allocation, alreadyProcessed, err := s.spendTxWithOptions(tx, userID, amount, dedupKey, description, opts)
		if err != nil {
			return err
		}
		processed = !alreadyProcessed
		if processed {
			log.Printf("[Wallet] Spend: %d LKM from user %d (bonus=%d, dedup=%s)", amount, userID, allocation.BonusAmount, dedupKey)
		}
		return nil
	}); err != nil {
		return err
	}

	if processed {
		// Trigger referral activation asynchronously (if user was referred)
		go func(uid uint) {
			referralService := NewReferralService(s)
			if err := referralService.ProcessActivation(uid); err != nil {
				log.Printf("[Wallet] Referral activation failed for user %d: %v", uid, err)
			}
		}(userID)
	}

	return nil
}

func (s *WalletService) spendTxWithOptions(tx *gorm.DB, userID uint, amount int, dedupKey string, description string, opts SpendOptions) (SpendAllocation, bool, error) {
	wallet, err := s.getOrCreateLockedWalletTx(tx, userID)
	if err != nil {
		return SpendAllocation{}, false, err
	}

	if dedupKey != "" {
		var existing models.WalletTransaction
		if err := tx.Where("wallet_id = ? AND dedup_key = ? AND type = ?",
			wallet.ID, dedupKey, models.TransactionTypeDebit).
			First(&existing).Error; err == nil {
			allocation, allocErr := allocationFromExistingSpendTransaction(existing, amount)
			if allocErr != nil {
				return SpendAllocation{}, false, allocErr
			}
			log.Printf("[Wallet] Duplicate spend blocked: wallet=%d dedup=%s", wallet.ID, dedupKey)
			return allocation, true, nil
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return SpendAllocation{}, false, err
		}
	}

	allocation, allocErr := calculateSpendAllocation(amount, wallet.Balance, wallet.BonusBalance, opts)
	if allocErr != nil {
		return SpendAllocation{}, false, allocErr
	}
	if wallet.Balance < allocation.RegularAmount || wallet.BonusBalance < allocation.BonusAmount {
		return SpendAllocation{}, false, errors.New("insufficient balance")
	}

	newBalance := wallet.Balance - allocation.RegularAmount
	newBonusBalance := wallet.BonusBalance - allocation.BonusAmount
	if err := tx.Model(wallet).Updates(map[string]interface{}{
		"balance":       newBalance,
		"bonus_balance": newBonusBalance,
		"total_spent":   wallet.TotalSpent + amount,
	}).Error; err != nil {
		return SpendAllocation{}, false, err
	}

	spendTx := models.WalletTransaction{
		WalletID:     wallet.ID,
		Type:         models.TransactionTypeDebit,
		Amount:       amount,
		BonusAmount:  allocation.BonusAmount,
		Description:  description,
		DedupKey:     dedupKey,
		BalanceAfter: newBalance,
	}
	if err := tx.Create(&spendTx).Error; err != nil {
		return SpendAllocation{}, false, err
	}

	return allocation, false, nil
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
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("wallet not found")
			}
			return err
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
	activatedAmount := 0
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("wallet not found")
			}
			return err
		}

		if wallet.PendingBalance <= 0 {
			return nil // Nothing to activate
		}

		pendingAmount := wallet.PendingBalance
		newBonusBalance := wallet.BonusBalance + pendingAmount

		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"bonus_balance":   newBonusBalance,
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
			BonusAmount:  pendingAmount,
			Description:  "Welcome Bonus Activated",
			BalanceAfter: wallet.Balance,
		}
		if err := tx.Create(&activateTx).Error; err != nil {
			return err
		}

		activatedAmount = pendingAmount
		log.Printf("[Wallet] Activated %d pending LKM for user %d", pendingAmount, userID)

		return nil
	}); err != nil {
		return err
	}

	if activatedAmount > 0 {
		go func() {
			GetPushService().SendWalletBalanceActivated(userID, activatedAmount)
		}()
	}

	return nil
}

// HoldFunds freezes funds for a booking (not spent yet)
func (s *WalletService) HoldFunds(userID uint, amount int, bookingID uint, description string) error {
	_, err := s.HoldFundsWithOptions(userID, amount, bookingID, description, SpendOptions{
		AllowBonus: false,
	})
	return err
}

// HoldFundsWithOptions freezes funds for a booking with optional bonus usage limits.
func (s *WalletService) HoldFundsWithOptions(userID uint, amount int, bookingID uint, description string, opts SpendOptions) (*SpendAllocation, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be positive")
	}
	opts = normalizeSpendOptions(opts)
	description = strings.TrimSpace(description)
	if description == "" {
		description = "Funds hold"
	}

	var allocation SpendAllocation
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		var wallet models.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ?", userID).First(&wallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("wallet not found")
			}
			return err
		}

		currentAllocation, allocErr := calculateSpendAllocation(amount, wallet.Balance, wallet.BonusBalance, opts)
		if allocErr != nil {
			return allocErr
		}
		if wallet.Balance < currentAllocation.RegularAmount || wallet.BonusBalance < currentAllocation.BonusAmount {
			return errors.New("insufficient balance")
		}

		newBalance := wallet.Balance - currentAllocation.RegularAmount
		newBonusBalance := wallet.BonusBalance - currentAllocation.BonusAmount
		newFrozen := wallet.FrozenBalance + currentAllocation.RegularAmount
		newFrozenBonus := wallet.FrozenBonusBalance + currentAllocation.BonusAmount

		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"balance":              newBalance,
			"bonus_balance":        newBonusBalance,
			"frozen_balance":       newFrozen,
			"frozen_bonus_balance": newFrozenBonus,
		}).Error; err != nil {
			return err
		}

		// Record hold
		holdTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeHold,
			Amount:       amount,
			BonusAmount:  currentAllocation.BonusAmount,
			Description:  description,
			BookingID:    &bookingID,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&holdTx).Error; err != nil {
			return err
		}

		allocation = currentAllocation
		log.Printf("[Wallet] Hold: %d LKM from user %d for booking %d (bonus=%d)", amount, userID, bookingID, currentAllocation.BonusAmount)
		return nil
	}); err != nil {
		return nil, err
	}

	return &allocation, nil
}

// ReleaseFunds releases held funds to provider or back to user
func (s *WalletService) ReleaseFunds(userID uint, amount int, bookingID uint, toUserID uint, description string) error {
	return s.ReleaseFundsWithSplit(userID, amount, 0, bookingID, toUserID, description)
}

// ReleaseFundsWithSplit releases regular+bonus frozen funds to provider.
func (s *WalletService) ReleaseFundsWithSplit(userID uint, regularAmount int, bonusAmount int, bookingID uint, toUserID uint, description string) error {
	if regularAmount < 0 || bonusAmount < 0 {
		return errors.New("amount must be non-negative")
	}
	totalAmount := regularAmount + bonusAmount
	if totalAmount <= 0 {
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
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("wallet not found")
			}
			return err
		}

		if wallet.FrozenBalance < regularAmount || wallet.FrozenBonusBalance < bonusAmount {
			return errors.New("insufficient frozen balance")
		}

		// Reduce frozen balance
		newFrozen := wallet.FrozenBalance - regularAmount
		newFrozenBonus := wallet.FrozenBonusBalance - bonusAmount
		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"frozen_balance":       newFrozen,
			"frozen_bonus_balance": newFrozenBonus,
			"total_spent":          wallet.TotalSpent + totalAmount,
		}).Error; err != nil {
			return err
		}

		// Record release from sender
		releaseTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeRelease,
			Amount:       totalAmount,
			BonusAmount:  bonusAmount,
			Description:  description,
			BookingID:    &bookingID,
			BalanceAfter: wallet.Balance, // Active balance unchanged
		}
		if err := tx.Create(&releaseTx).Error; err != nil {
			return err
		}

		// Credit to provider
		toWallet, err := s.getOrCreateLockedWalletTx(tx, toUserID)
		if err != nil {
			return err
		}

		newToBalance := toWallet.Balance + totalAmount
		if err := tx.Model(toWallet).Updates(map[string]interface{}{
			"balance":      newToBalance,
			"total_earned": toWallet.TotalEarned + totalAmount,
		}).Error; err != nil {
			return err
		}

		// Record credit to provider
		creditTx := models.WalletTransaction{
			WalletID:        toWallet.ID,
			Type:            models.TransactionTypeCredit,
			Amount:          totalAmount,
			Description:     description,
			BookingID:       &bookingID,
			RelatedWalletID: &wallet.ID,
			BalanceAfter:    newToBalance,
		}
		if err := tx.Create(&creditTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] Release: %d LKM from user %d to user %d (booking %d, bonus=%d)", totalAmount, userID, toUserID, bookingID, bonusAmount)
		return nil
	})
}

// RefundHold returns held funds back to user's active balance
func (s *WalletService) RefundHold(userID uint, amount int, bookingID uint, description string) error {
	return s.RefundHoldWithSplit(userID, amount, 0, bookingID, description)
}

// RefundHoldWithSplit returns frozen regular+bonus funds back to original balances.
func (s *WalletService) RefundHoldWithSplit(userID uint, regularAmount int, bonusAmount int, bookingID uint, description string) error {
	if regularAmount < 0 || bonusAmount < 0 {
		return errors.New("amount must be non-negative")
	}
	totalAmount := regularAmount + bonusAmount
	if totalAmount <= 0 {
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
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("wallet not found")
			}
			return err
		}

		if wallet.FrozenBalance < regularAmount || wallet.FrozenBonusBalance < bonusAmount {
			return errors.New("insufficient frozen balance")
		}

		newBalance := wallet.Balance + regularAmount
		newBonusBalance := wallet.BonusBalance + bonusAmount
		newFrozen := wallet.FrozenBalance - regularAmount
		newFrozenBonus := wallet.FrozenBonusBalance - bonusAmount

		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"balance":              newBalance,
			"bonus_balance":        newBonusBalance,
			"frozen_balance":       newFrozen,
			"frozen_bonus_balance": newFrozenBonus,
		}).Error; err != nil {
			return err
		}

		// Record refund
		refundTx := models.WalletTransaction{
			WalletID:     wallet.ID,
			Type:         models.TransactionTypeRefund,
			Amount:       totalAmount,
			BonusAmount:  bonusAmount,
			Description:  description,
			BookingID:    &bookingID,
			BalanceAfter: newBalance,
		}
		if err := tx.Create(&refundTx).Error; err != nil {
			return err
		}

		log.Printf("[Wallet] RefundHold: %d LKM to user %d (booking %d cancelled, bonus=%d)", totalAmount, userID, bookingID, bonusAmount)
		return nil
	})
}
