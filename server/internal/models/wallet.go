package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== WALLET (КОШЕЛЁК ЛАКШМИ) ====================

// Wallet represents a user's LakshMoney (game currency) wallet
type Wallet struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Owner
	UserID uint  `json:"userId" gorm:"not null;uniqueIndex"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Balance in Лакшми
	Balance int `json:"balance" gorm:"default:1000"` // Initial balance: 1000 LakshMoney

	// Statistics
	TotalEarned int `json:"totalEarned" gorm:"default:0"` // Total credits received
	TotalSpent  int `json:"totalSpent" gorm:"default:0"`  // Total debits made

	// Currency info (for display)
	Currency     string `json:"currency" gorm:"-"`     // Always "LKM"
	CurrencyName string `json:"currencyName" gorm:"-"` // "Лакшми"

	// Relations
	Transactions []WalletTransaction `json:"transactions,omitempty" gorm:"foreignKey:WalletID"`
}

// BeforeCreate sets default currency fields
func (w *Wallet) AfterFind(tx *gorm.DB) error {
	w.Currency = "LKM"
	w.CurrencyName = "LakshMoney" // Default, frontend will localize
	return nil
}

// ==================== WALLET TRANSACTION (ТРАНЗАКЦИЯ) ====================

// TransactionType represents the type of wallet transaction
type TransactionType string

const (
	TransactionTypeCredit TransactionType = "credit" // Пополнение (заработок)
	TransactionTypeDebit  TransactionType = "debit"  // Списание (оплата)
	TransactionTypeBonus  TransactionType = "bonus"  // Бонус от системы
	TransactionTypeRefund TransactionType = "refund" // Возврат
)

// WalletTransaction represents a single transaction in a wallet
type WalletTransaction struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	// Parent wallet
	WalletID uint    `json:"walletId" gorm:"not null;index"`
	Wallet   *Wallet `json:"wallet,omitempty" gorm:"foreignKey:WalletID"`

	// Transaction details
	Type   TransactionType `json:"type" gorm:"type:varchar(20);not null"`
	Amount int             `json:"amount" gorm:"not null"` // Positive for credit, positive for debit (type determines direction)

	// Description
	Description string `json:"description" gorm:"type:varchar(500)"`

	// Related booking (if applicable)
	BookingID *uint `json:"bookingId" gorm:"index"`

	// Related wallet (for transfers between users)
	RelatedWalletID *uint   `json:"relatedWalletId" gorm:"index"`
	RelatedWallet   *Wallet `json:"relatedWallet,omitempty" gorm:"foreignKey:RelatedWalletID"`

	// Balance after this transaction
	BalanceAfter int `json:"balanceAfter" gorm:"not null"`
}

// ==================== DTOs ====================

// WalletResponse for API response
type WalletResponse struct {
	ID           uint   `json:"id"`
	UserID       uint   `json:"userId"`
	Balance      int    `json:"balance"`
	Currency     string `json:"currency"`
	CurrencyName string `json:"currencyName"`
	TotalEarned  int    `json:"totalEarned"`
	TotalSpent   int    `json:"totalSpent"`
}

// TransferRequest for transferring Лакшми between wallets
type TransferRequest struct {
	ToUserID    uint   `json:"toUserId" binding:"required"`
	Amount      int    `json:"amount" binding:"required,min=1"`
	Description string `json:"description"`
	BookingID   *uint  `json:"bookingId"` // If transfer is for a booking
}

// TransactionFilters for filtering transactions
type TransactionFilters struct {
	Type     TransactionType `json:"type"`
	DateFrom string          `json:"dateFrom"` // ISO format
	DateTo   string          `json:"dateTo"`   // ISO format
	Page     int             `json:"page"`
	Limit    int             `json:"limit"`
}

// TransactionListResponse for paginated list
type TransactionListResponse struct {
	Transactions []WalletTransaction `json:"transactions"`
	Total        int64               `json:"total"`
	Page         int                 `json:"page"`
	Limit        int                 `json:"limit"`
	TotalPages   int                 `json:"totalPages"`
}

// WalletStatsResponse for wallet dashboard
type WalletStatsResponse struct {
	Balance      int `json:"balance"`
	TotalEarned  int `json:"totalEarned"`
	TotalSpent   int `json:"totalSpent"`
	ThisMonthIn  int `json:"thisMonthIn"`
	ThisMonthOut int `json:"thisMonthOut"`
	PendingIn    int `json:"pendingIn"`  // Pending incoming from confirmed bookings
	PendingOut   int `json:"pendingOut"` // Pending outgoing for pending bookings
}
