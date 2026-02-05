package services

import (
	"errors"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// WalletService handles wallet operations
type WalletService struct{}

// NewWalletService creates a new wallet service
func NewWalletService() *WalletService {
	return &WalletService{}
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

	// Create new wallet with initial balance
	wallet = models.Wallet{
		UserID:      userID,
		Balance:     1000, // Initial balance: 1000 LakshMoney
		TotalEarned: 0,
		TotalSpent:  0,
	}

	if err := database.DB.Create(&wallet).Error; err != nil {
		return nil, err
	}

	log.Printf("[Wallet] Created wallet for user %d with 1000 LakshMoney", userID)
	return &wallet, nil
}

// GetBalance returns user's current balance
func (s *WalletService) GetBalance(userID uint) (*models.WalletResponse, error) {
	wallet, err := s.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}

	return &models.WalletResponse{
		ID:           wallet.ID,
		UserID:       wallet.UserID,
		Balance:      wallet.Balance,
		Currency:     "LKM",
		CurrencyName: "LakshMoney",
		TotalEarned:  wallet.TotalEarned,
		TotalSpent:   wallet.TotalSpent,
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

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Lock sender's wallet
		var fromWallet models.Wallet
		if err := tx.Where("user_id = ?", fromUserID).First(&fromWallet).Error; err != nil {
			return errors.New("sender wallet not found")
		}

		if fromWallet.Balance < amount {
			return errors.New("insufficient balance")
		}

		// Lock receiver's wallet (or create if doesn't exist)
		var toWallet models.Wallet
		err := tx.Where("user_id = ?", toUserID).First(&toWallet).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			toWallet = models.Wallet{
				UserID:      toUserID,
				Balance:     1000,
				TotalEarned: 0,
				TotalSpent:  0,
			}
			if err := tx.Create(&toWallet).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		}

		// Debit from sender
		newFromBalance := fromWallet.Balance - amount
		if err := tx.Model(&fromWallet).Update("balance", newFromBalance).Error; err != nil {
			return err
		}
		if err := tx.Model(&fromWallet).Update("total_spent", fromWallet.TotalSpent+amount).Error; err != nil {
			return err
		}

		// Credit to receiver
		newToBalance := toWallet.Balance + amount
		if err := tx.Model(&toWallet).Update("balance", newToBalance).Error; err != nil {
			return err
		}
		if err := tx.Model(&toWallet).Update("total_earned", toWallet.TotalEarned+amount).Error; err != nil {
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

	return database.DB.Transaction(func(tx *gorm.DB) error {
		wallet, err := s.GetOrCreateWallet(userID)
		if err != nil {
			return err
		}

		newBalance := wallet.Balance + amount
		if err := tx.Model(wallet).Update("balance", newBalance).Error; err != nil {
			return err
		}
		if err := tx.Model(wallet).Update("total_earned", wallet.TotalEarned+amount).Error; err != nil {
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
		return nil
	})
}

// Refund refunds Лакшми to user's wallet
func (s *WalletService) Refund(userID uint, amount int, description string, bookingID *uint) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		wallet, err := s.GetOrCreateWallet(userID)
		if err != nil {
			return err
		}

		newBalance := wallet.Balance + amount
		if err := tx.Model(wallet).Updates(map[string]interface{}{
			"balance":     newBalance,
			"total_spent": wallet.TotalSpent - amount,
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
			query = query.Where("created_at <= ?", dateTo.Add(24*time.Hour))
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
	database.DB.Model(&models.WalletTransaction{}).
		Where("wallet_id = ? AND type IN (?, ?) AND created_at >= ?",
			wallet.ID, models.TransactionTypeCredit, models.TransactionTypeBonus, startOfMonth).
		Select("COALESCE(SUM(amount), 0)").Scan(&thisMonthIn)

	var thisMonthOut int
	database.DB.Model(&models.WalletTransaction{}).
		Where("wallet_id = ? AND type = ? AND created_at >= ?",
			wallet.ID, models.TransactionTypeDebit, startOfMonth).
		Select("COALESCE(SUM(amount), 0)").Scan(&thisMonthOut)

	return &models.WalletStatsResponse{
		Balance:      wallet.Balance,
		TotalEarned:  wallet.TotalEarned,
		TotalSpent:   wallet.TotalSpent,
		ThisMonthIn:  thisMonthIn,
		ThisMonthOut: thisMonthOut,
	}, nil
}
