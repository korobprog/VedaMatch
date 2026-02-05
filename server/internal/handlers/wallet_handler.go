package handlers

import (
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// WalletHandler handles wallet-related HTTP requests
type WalletHandler struct {
	walletService *services.WalletService
}

// NewWalletHandler creates a new wallet handler
func NewWalletHandler(walletService *services.WalletService) *WalletHandler {
	return &WalletHandler{
		walletService: walletService,
	}
}

// GetBalance returns user's wallet balance
// GET /api/wallet
func (h *WalletHandler) GetBalance(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	wallet, err := h.walletService.GetBalance(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(wallet)
}

// GetTransactions returns paginated transaction history
// GET /api/wallet/transactions
func (h *WalletHandler) GetTransactions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	filters := models.TransactionFilters{
		Type:     models.TransactionType(c.Query("type")),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	if page, err := strconv.Atoi(c.Query("page", "1")); err == nil {
		filters.Page = page
	}
	if limit, err := strconv.Atoi(c.Query("limit", "20")); err == nil {
		filters.Limit = limit
	}

	result, err := h.walletService.GetTransactions(userID, filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// Transfer transfers Лакшми to another user
// POST /api/wallet/transfer
func (h *WalletHandler) Transfer(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.TransferRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Amount must be positive",
		})
	}

	err := h.walletService.Transfer(userID, req.ToUserID, req.Amount, req.Description, req.BookingID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return updated balance
	wallet, _ := h.walletService.GetBalance(userID)
	return c.JSON(fiber.Map{
		"success": true,
		"wallet":  wallet,
	})
}

// GetStats returns wallet statistics
// GET /api/wallet/stats
func (h *WalletHandler) GetStats(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	stats, err := h.walletService.GetStats(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}
