package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

type AdminFinancialHandler struct{}

func NewAdminFinancialHandler() *AdminFinancialHandler {
	return &AdminFinancialHandler{}
}

// FinancialStats represents the system's economic health
type FinancialStats struct {
	TotalActiveBalances      int64             `json:"totalActiveBalances"`
	TotalBonusBalances       int64             `json:"totalBonusBalances"`
	TotalFrozenBalances      int64             `json:"totalFrozenBalances"`
	TotalFrozenBonusBalances int64             `json:"totalFrozenBonusBalances"`
	TotalPendingBalances     int64             `json:"totalPendingBalances"`
	TotalLiabilities         int64             `json:"totalLiabilities"` // Active + Frozen
	TotalRealIncome          int64             `json:"totalRealIncome"`  // SUM of all Successful Deposits
	CharityFunds             []CharityFundStat `json:"charityFunds"`

	// Aliases for Admin Frontend Compatibility
	CirculationLKM  int64 `json:"circulationLKM"`  // Active + Bonus + Frozen
	TotalIssuedLKM  int64 `json:"totalIssuedLKM"`  // Sum of all additions
	TotalSpentLKM   int64 `json:"totalSpentLKM"`   // Sum of all subtractions
	TotalPendingLKM int64 `json:"totalPendingLKM"` // Pending
}

type CharityFundStat struct {
	Name    string `json:"name"`
	Balance int64  `json:"balance"`
}

// GetFinancialStats returns the global P&L metrics
// GET /api/admin/financials/stats
func (h *AdminFinancialHandler) GetFinancialStats(c *fiber.Ctx) error {
	// Panic recovery for financial operations
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[FinancialStats] PANIC: %v", r)
		}
	}()

	var stats FinancialStats

	// 1. Calculate Liabilities (What we "owe" to users in services)
	// We sum balances from the wallets table
	database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(balance), 0)").Scan(&stats.TotalActiveBalances)
	database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(bonus_balance), 0)").Scan(&stats.TotalBonusBalances)
	database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(frozen_balance), 0)").Scan(&stats.TotalFrozenBalances)
	database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(frozen_bonus_balance), 0)").Scan(&stats.TotalFrozenBonusBalances)
	database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(pending_balance), 0)").Scan(&stats.TotalPendingBalances)

	stats.TotalLiabilities = stats.TotalActiveBalances + stats.TotalBonusBalances + stats.TotalFrozenBalances + stats.TotalFrozenBonusBalances
	stats.CirculationLKM = stats.TotalLiabilities
	stats.TotalPendingLKM = stats.TotalPendingBalances

	// 2. Calculate Real Income (Actual money entered the system via deposits)
	// We look for transactions with description or type related to deposit/purchase
	database.DB.Model(&models.WalletTransaction{}).
		Where("description LIKE ? OR description LIKE ?", "%Пополнение%", "%Deposit%").
		Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalRealIncome)

	// 3. Stats for Admin Dashboard Compatibility
	// Total Issued = SUM(amount) where amount > 0 (excluding transfers if possible, but keeping it simple for now)
	database.DB.Model(&models.WalletTransaction{}).
		Where("amount > 0").
		Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalIssuedLKM)

	// Total Spent = ABS(SUM(amount)) where amount < 0
	database.DB.Model(&models.WalletTransaction{}).
		Where("amount < 0").
		Select("COALESCE(ABS(SUM(amount)), 0)").Scan(&stats.TotalSpentLKM)

	// 4. Calculate Charity Funds
	// We look for specific descriptions or recipient types
	rows, err := database.DB.Model(&models.WalletTransaction{}).
		Where("description LIKE ?", "FUND_%").
		Select("description as name, COALESCE(SUM(amount), 0) as balance").
		Group("description").
		Rows()

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var fund CharityFundStat
			rows.Scan(&fund.Name, &fund.Balance)
			stats.CharityFunds = append(stats.CharityFunds, fund)
		}
	}

	return c.JSON(stats)
}
