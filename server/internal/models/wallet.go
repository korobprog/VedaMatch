package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== WALLET (КОШЕЛЁК ЛАКШМИ) ====================

// WalletType represents the type of wallet
type WalletType string

const (
	WalletTypePersonal WalletType = "personal" // User's personal wallet
	WalletTypeCharity  WalletType = "charity"  // Charity organization wallet
	WalletTypePlatform WalletType = "platform" // Platform system wallet (for tips, fees)
)

// Wallet represents a user's LakshMoney (game currency) wallet
type Wallet struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Wallet type
	Type WalletType `json:"type" gorm:"type:varchar(20);default:'personal';index;uniqueIndex:ux_wallet_user_type"`

	// Owner (nullable for platform wallet)
	UserID *uint `json:"userId" gorm:"index;uniqueIndex:ux_wallet_user_type"` // Unique per user+type
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// For charity wallets - link to organization
	OrganizationID *uint `json:"organizationId" gorm:"index"`

	// Balance in Лакшми
	Balance            int `json:"balance" gorm:"default:0"`            // Active regular balance (can spend everywhere)
	BonusBalance       int `json:"bonusBalance" gorm:"default:0"`       // Active bonus balance (spend restrictions apply)
	PendingBalance     int `json:"pendingBalance" gorm:"default:0"`     // Pending bonus (locked until activation)
	FrozenBalance      int `json:"frozenBalance" gorm:"default:0"`      // Frozen regular (held for bookings/charity)
	FrozenBonusBalance int `json:"frozenBonusBalance" gorm:"default:0"` // Frozen bonus (held for bookings)

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
	TransactionTypeCredit      TransactionType = "credit"       // Пополнение (заработок)
	TransactionTypeDebit       TransactionType = "debit"        // Списание (оплата)
	TransactionTypeBonus       TransactionType = "bonus"        // Бонус от системы
	TransactionTypeRefund      TransactionType = "refund"       // Возврат
	TransactionTypeHold        TransactionType = "hold"         // Заморозка (для бронирования)
	TransactionTypeRelease     TransactionType = "release"      // Разморозка
	TransactionTypeAdminCharge TransactionType = "admin_charge" // Админ: начисление
	TransactionTypeAdminSeize  TransactionType = "admin_seize"  // Админ: списание
)

// WalletTransaction represents a single transaction in a wallet
type WalletTransaction struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	// Parent wallet
	WalletID uint    `json:"walletId" gorm:"not null;index"`
	Wallet   *Wallet `json:"wallet,omitempty" gorm:"foreignKey:WalletID"`

	// Transaction details
	Type        TransactionType `json:"type" gorm:"type:varchar(20);not null"`
	Amount      int             `json:"amount" gorm:"not null"`                // Total amount
	BonusAmount int             `json:"bonusAmount" gorm:"default:0;not null"` // Part of Amount paid from bonus balance

	// Description
	Description string `json:"description" gorm:"type:varchar(500)"`

	// Related booking (if applicable)
	BookingID *uint `json:"bookingId" gorm:"index"`

	// Related wallet (for transfers between users)
	RelatedWalletID *uint   `json:"relatedWalletId" gorm:"index"`
	RelatedWallet   *Wallet `json:"relatedWallet,omitempty" gorm:"foreignKey:RelatedWalletID"`

	// Balance after this transaction
	BalanceAfter int `json:"balanceAfter" gorm:"not null"`

	// Idempotency key (to prevent double spending)
	DedupKey string `json:"dedupKey" gorm:"type:varchar(100);index"`

	// Admin audit trail
	AdminID *uint  `json:"adminId" gorm:"index"`            // Who performed admin action
	Reason  string `json:"reason" gorm:"type:varchar(500)"` // Reason for admin action
}

// ==================== DTOs ====================

// WalletResponse for API response
type WalletResponse struct {
	ID                 uint   `json:"id"`
	UserID             uint   `json:"userId"`
	Balance            int    `json:"balance"`
	BonusBalance       int    `json:"bonusBalance"`
	PendingBalance     int    `json:"pendingBalance"`
	FrozenBalance      int    `json:"frozenBalance"`
	FrozenBonusBalance int    `json:"frozenBonusBalance"`
	Currency           string `json:"currency"`
	CurrencyName       string `json:"currencyName"`
	TotalEarned        int    `json:"totalEarned"`
	TotalSpent         int    `json:"totalSpent"`
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
	BonusBalance int `json:"bonusBalance"`
	TotalBalance int `json:"totalBalance"`
	TotalEarned  int `json:"totalEarned"`
	TotalSpent   int `json:"totalSpent"`
	ThisMonthIn  int `json:"thisMonthIn"`
	ThisMonthOut int `json:"thisMonthOut"`
	PendingIn    int `json:"pendingIn"`  // Pending incoming from confirmed bookings
	PendingOut   int `json:"pendingOut"` // Pending outgoing for pending bookings
}
