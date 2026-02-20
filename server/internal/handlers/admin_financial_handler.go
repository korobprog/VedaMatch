package handlers

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/url"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

type serviceFundsSummary struct {
	Service      string `json:"service"`
	AccountCode  string `json:"accountCode"`
	Income       int64  `json:"income"`
	Expense      int64  `json:"expense"`
	Net          int64  `json:"net"`
	FromDate     string `json:"fromDate,omitempty"`
	ToDate       string `json:"toDate,omitempty"`
	EntryCount   int64  `json:"entryCount"`
	ConfigSource string `json:"configSource,omitempty"`
}

type fundsLedgerQuery struct {
	Service    string
	Trigger    string
	ProjectID  uint
	Account    string
	Page       int
	Limit      int
	DateFrom   *time.Time
	DateTo     *time.Time
	ExportMode bool
}

type createExpenseRequest struct {
	AccountCode string `json:"accountCode"`
	Amount      int    `json:"amount"`
	Category    string `json:"category"`
	ReasonCode  string `json:"reasonCode"`
	Note        string `json:"note"`
}

type expenseDecisionRequest struct {
	Note string `json:"note"`
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

func parseFundsDate(raw string) (*time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(raw))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func parseFundsLedgerQuery(c *fiber.Ctx) (fundsLedgerQuery, error) {
	q := fundsLedgerQuery{
		Service: strings.TrimSpace(strings.ToLower(c.Query("service", "all"))),
		Trigger: strings.TrimSpace(strings.ToLower(c.Query("trigger"))),
		Account: strings.TrimSpace(strings.ToLower(c.Query("accountCode"))),
		Page:    1,
		Limit:   50,
	}

	if q.Service == "" {
		q.Service = "all"
	}
	if rawPage := strings.TrimSpace(c.Query("page")); rawPage != "" {
		if parsed, err := strconv.Atoi(rawPage); err == nil && parsed > 0 {
			q.Page = parsed
		}
	}
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 && parsed <= 200 {
			q.Limit = parsed
		}
	}
	if rawProject := strings.TrimSpace(c.Query("projectId")); rawProject != "" {
		parsed, err := strconv.Atoi(rawProject)
		if err != nil || parsed <= 0 {
			return q, fiber.NewError(fiber.StatusBadRequest, "Invalid projectId")
		}
		q.ProjectID = uint(parsed)
	}

	dateFrom, err := parseFundsDate(c.Query("from"))
	if err != nil {
		return q, fiber.NewError(fiber.StatusBadRequest, "Invalid from date, expected YYYY-MM-DD")
	}
	dateTo, err := parseFundsDate(c.Query("to"))
	if err != nil {
		return q, fiber.NewError(fiber.StatusBadRequest, "Invalid to date, expected YYYY-MM-DD")
	}
	q.DateFrom = dateFrom
	q.DateTo = dateTo
	return q, nil
}

func applyLedgerFilters(dbq *gorm.DB, q fundsLedgerQuery) *gorm.DB {
	query := dbq
	if q.Service != "" && q.Service != "all" {
		query = query.Where("source_service = ?", q.Service)
	}
	if q.Trigger != "" {
		query = query.Where("source_trigger = ?", q.Trigger)
	}
	if q.Account != "" {
		query = query.Where("account_code = ?", q.Account)
	}
	if q.ProjectID > 0 {
		query = query.Where("project_id = ?", q.ProjectID)
	}
	if q.DateFrom != nil {
		query = query.Where("created_at >= ?", q.DateFrom.UTC())
	}
	if q.DateTo != nil {
		query = query.Where("created_at < ?", q.DateTo.Add(24*time.Hour).UTC())
	}
	return query
}

func (h *AdminFinancialHandler) GetFundsSummary(c *fiber.Ctx) error {
	if _, err := requireAdminPermission(c, string(models.AdminPermissionFinanceManager)); err != nil {
		if _, err2 := requireAdminPermission(c, string(models.AdminPermissionFinanceApprover)); err2 != nil {
			return err
		}
	}
	q, err := parseFundsLedgerQuery(c)
	if err != nil {
		return err
	}

	accountCode := q.Account
	if accountCode == "" {
		switch q.Service {
		case "rooms":
			accountCode = services.SupportFundAccountCode("rooms")
		case "seva":
			accountCode = services.SupportFundAccountCode("seva")
		default:
			accountCode = "platform_fund"
		}
	}

	base := database.DB.Model(&models.LKMLedgerEntry{}).Where("account_code = ?", accountCode)
	base = applyLedgerFilters(base, q)

	var income int64
	var expense int64
	var count int64
	base.Where("entry_type = ?", models.LKMLedgerEntryTypeCredit).Select("COALESCE(SUM(amount),0)").Scan(&income)
	base.Where("entry_type = ?", models.LKMLedgerEntryTypeDebit).Select("COALESCE(SUM(amount),0)").Scan(&expense)
	base.Count(&count)

	summary := serviceFundsSummary{
		Service:     q.Service,
		AccountCode: accountCode,
		Income:      income,
		Expense:     expense,
		Net:         income - expense,
		EntryCount:  count,
	}
	if q.DateFrom != nil {
		summary.FromDate = q.DateFrom.Format("2006-01-02")
	}
	if q.DateTo != nil {
		summary.ToDate = q.DateTo.Format("2006-01-02")
	}
	return c.JSON(summary)
}

func (h *AdminFinancialHandler) GetFundsLedger(c *fiber.Ctx) error {
	if _, err := requireAdminPermission(c, string(models.AdminPermissionFinanceManager)); err != nil {
		if _, err2 := requireAdminPermission(c, string(models.AdminPermissionFinanceApprover)); err2 != nil {
			return err
		}
	}
	q, err := parseFundsLedgerQuery(c)
	if err != nil {
		return err
	}

	base := applyLedgerFilters(database.DB.Model(&models.LKMLedgerEntry{}), q)
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not count ledger entries"})
	}

	offset := (q.Page - 1) * q.Limit
	var entries []models.LKMLedgerEntry
	if err := base.Order("created_at DESC").Offset(offset).Limit(q.Limit).Find(&entries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch ledger entries"})
	}

	return c.JSON(fiber.Map{
		"items": entries,
		"page":  q.Page,
		"limit": q.Limit,
		"total": total,
	})
}

func (h *AdminFinancialHandler) ExportFundsLedgerCSV(c *fiber.Ctx) error {
	if _, err := requireAdminPermission(c, string(models.AdminPermissionFinanceManager)); err != nil {
		if _, err2 := requireAdminPermission(c, string(models.AdminPermissionFinanceApprover)); err2 != nil {
			return err
		}
	}
	q, err := parseFundsLedgerQuery(c)
	if err != nil {
		return err
	}
	base := applyLedgerFilters(database.DB.Model(&models.LKMLedgerEntry{}), q)

	var entries []models.LKMLedgerEntry
	if err := base.Order("created_at DESC").Find(&entries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not export ledger entries"})
	}

	var b strings.Builder
	w := csv.NewWriter(&b)
	_ = w.Write([]string{"created_at", "entry_type", "amount", "account_code", "source_service", "source_trigger", "project_id", "room_id", "donation_id", "user_id", "status", "note"})
	for _, e := range entries {
		_ = w.Write([]string{
			e.CreatedAt.UTC().Format(time.RFC3339),
			string(e.EntryType),
			strconv.Itoa(e.Amount),
			e.AccountCode,
			e.SourceService,
			e.SourceTrigger,
			itoaPtr(e.ProjectID),
			itoaPtr(e.RoomID),
			itoaPtr(e.DonationID),
			itoaPtr(e.UserID),
			e.Status,
			e.Note,
		})
	}
	w.Flush()

	filename := fmt.Sprintf("funds_ledger_%s.csv", url.QueryEscape(time.Now().UTC().Format("20060102_150405")))
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.SendString(b.String())
}

func itoaPtr(v *uint) string {
	if v == nil {
		return ""
	}
	return strconv.Itoa(int(*v))
}

func (h *AdminFinancialHandler) CreateExpenseRequest(c *fiber.Ctx) error {
	adminID, err := requireAdminPermission(c, string(models.AdminPermissionFinanceManager))
	if err != nil {
		return err
	}

	var req createExpenseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if strings.TrimSpace(req.AccountCode) == "" || req.Amount <= 0 || strings.TrimSpace(req.ReasonCode) == "" || strings.TrimSpace(req.Note) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "accountCode, amount, reasonCode and note are required"})
	}

	limit := 500
	var rawSetting models.SystemSetting
	if err := database.DB.Where("key = ?", "lkm.expense.single_approval_limit").First(&rawSetting).Error; err == nil {
		if parsed, err := strconv.Atoi(strings.TrimSpace(rawSetting.Value)); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	requiredApprovals := 1
	if req.Amount > limit {
		requiredApprovals = 2
	}

	expense := models.LKMExpenseRequest{
		AccountCode:       strings.ToLower(strings.TrimSpace(req.AccountCode)),
		Amount:            req.Amount,
		Category:          strings.TrimSpace(req.Category),
		ReasonCode:        strings.TrimSpace(req.ReasonCode),
		Note:              strings.TrimSpace(req.Note),
		Status:            models.LKMExpenseStatusPending,
		RequiredApprovals: requiredApprovals,
		CurrentApprovals:  0,
		RequestedBy:       adminID,
	}
	if err := database.DB.Create(&expense).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create expense request"})
	}
	_ = database.DB.Create(&models.LKMApprovalEvent{
		ExpenseRequestID: expense.ID,
		ActorAdminID:     adminID,
		Action:           "created",
		Note:             expense.Note,
	}).Error

	return c.Status(fiber.StatusCreated).JSON(expense)
}

func (h *AdminFinancialHandler) ListExpenseRequests(c *fiber.Ctx) error {
	if _, err := requireAdminPermission(c, string(models.AdminPermissionFinanceManager)); err != nil {
		if _, err2 := requireAdminPermission(c, string(models.AdminPermissionFinanceApprover)); err2 != nil {
			return err
		}
	}
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	page := 1
	limit := 50
	if raw := strings.TrimSpace(c.Query("page")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	query := database.DB.Model(&models.LKMExpenseRequest{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not count expense requests"})
	}
	var items []models.LKMExpenseRequest
	if err := query.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch expense requests"})
	}
	return c.JSON(fiber.Map{"items": items, "page": page, "limit": limit, "total": total})
}

func (h *AdminFinancialHandler) ApproveExpenseRequest(c *fiber.Ctx) error {
	adminID, err := requireAdminPermission(c, string(models.AdminPermissionFinanceApprover))
	if err != nil {
		return err
	}
	expenseID, err := strconv.Atoi(c.Params("id"))
	if err != nil || expenseID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid expense id"})
	}
	var req expenseDecisionRequest
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var expense models.LKMExpenseRequest
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&expense, expenseID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Expense request not found"})
		}
		if expense.Status != models.LKMExpenseStatusPending {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Expense request is not pending"})
		}
		if expense.RequestedBy == adminID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Initiator cannot approve own expense request"})
		}

		nextApprovals := expense.CurrentApprovals + 1
		updates := map[string]interface{}{
			"current_approvals": nextApprovals,
		}
		_ = tx.Create(&models.LKMApprovalEvent{
			ExpenseRequestID: expense.ID,
			ActorAdminID:     adminID,
			Action:           "approved_step",
			Note:             strings.TrimSpace(req.Note),
		}).Error

		if nextApprovals >= expense.RequiredApprovals {
			updates["status"] = models.LKMExpenseStatusApproved
			updates["approved_by"] = adminID
			txGroupID := fmt.Sprintf("expense:%d:%d", expense.ID, time.Now().UnixNano())
			if err := tx.Create([]models.LKMLedgerEntry{
				{
					TxGroupID:         txGroupID,
					EntryType:         models.LKMLedgerEntryTypeDebit,
					Amount:            expense.Amount,
					AccountCode:       expense.AccountCode,
					Status:            "posted",
					SourceService:     "admin",
					SourceTrigger:     "expense_approve",
					ActorAdminID:      &adminID,
					Note:              expense.Note,
					SourceContextJSON: fmt.Sprintf(`{\"expenseRequestId\":%d}`, expense.ID),
				},
				{
					TxGroupID:         txGroupID,
					EntryType:         models.LKMLedgerEntryTypeCredit,
					Amount:            expense.Amount,
					AccountCode:       "external_expense",
					Status:            "posted",
					SourceService:     "admin",
					SourceTrigger:     "expense_approve",
					ActorAdminID:      &adminID,
					Note:              expense.Note,
					SourceContextJSON: fmt.Sprintf(`{\"expenseRequestId\":%d}`, expense.ID),
				},
			}).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not write expense ledger entries"})
			}
			_ = tx.Create(&models.LKMApprovalEvent{
				ExpenseRequestID: expense.ID,
				ActorAdminID:     adminID,
				Action:           "posted",
				Note:             strings.TrimSpace(req.Note),
			}).Error
		}

		if err := tx.Model(&models.LKMExpenseRequest{}).Where("id = ?", expense.ID).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update expense request"})
		}
		var refreshed models.LKMExpenseRequest
		if err := tx.First(&refreshed, expense.ID).Error; err == nil {
			return c.JSON(refreshed)
		}
		return c.JSON(fiber.Map{"ok": true})
	})
}

func (h *AdminFinancialHandler) RejectExpenseRequest(c *fiber.Ctx) error {
	adminID, err := requireAdminPermission(c, string(models.AdminPermissionFinanceApprover))
	if err != nil {
		return err
	}
	expenseID, err := strconv.Atoi(c.Params("id"))
	if err != nil || expenseID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid expense id"})
	}
	var req expenseDecisionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if strings.TrimSpace(req.Note) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Rejection note is required"})
	}

	var expense models.LKMExpenseRequest
	if err := database.DB.First(&expense, expenseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Expense request not found"})
	}
	if expense.Status != models.LKMExpenseStatusPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Expense request is not pending"})
	}
	if err := database.DB.Model(&expense).Updates(map[string]interface{}{
		"status":          models.LKMExpenseStatusRejected,
		"rejected_reason": strings.TrimSpace(req.Note),
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not reject expense request"})
	}
	_ = database.DB.Create(&models.LKMApprovalEvent{
		ExpenseRequestID: expense.ID,
		ActorAdminID:     adminID,
		Action:           "rejected",
		Note:             strings.TrimSpace(req.Note),
	}).Error
	return c.JSON(fiber.Map{"ok": true})
}
