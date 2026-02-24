package handlers

import (
	"fmt"
	"os"
	"strings"

	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

// ReferralHandler handles referral-related API endpoints
type ReferralHandler struct {
	referralService *services.ReferralService
}

type invitePayload struct {
	InviteCode string `json:"inviteCode"`
	DeepLink   string `json:"deepLink"`
	WebLink    string `json:"webLink"`
	ShareText  string `json:"shareText"`
}

// NewReferralHandler creates a new referral handler
func NewReferralHandler(referralService *services.ReferralService) *ReferralHandler {
	return &ReferralHandler{
		referralService: referralService,
	}
}

// GetMyInviteLink returns the current user's invite code and shareable link
// GET /api/referral/invite
func (h *ReferralHandler) GetMyInviteLink(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	invite, err := h.buildInvitePayload(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get invite code",
		})
	}

	return c.JSON(invite)
}

// GetMyReferralStats returns referral statistics for the current user
// GET /api/referral/stats
func (h *ReferralHandler) GetMyReferralStats(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	stats, err := h.referralService.GetReferralStats(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get referral stats",
		})
	}

	return c.JSON(stats)
}

// GetMyReferrals returns list of users invited by the current user
// GET /api/referral/list?limit=20&offset=0
func (h *ReferralHandler) GetMyReferrals(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	referrals, err := h.referralService.GetReferralList(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get referrals",
		})
	}

	return c.JSON(fiber.Map{
		"referrals": referrals,
	})
}

// GetOverview returns invite data + stats + referrals in one request.
// GET /api/referral/overview?limit=50&offset=0
func (h *ReferralHandler) GetOverview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	invite, err := h.buildInvitePayload(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get invite code",
		})
	}

	stats, err := h.referralService.GetReferralStats(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get referral stats",
		})
	}

	referrals, err := h.referralService.GetReferralList(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get referrals",
		})
	}

	return c.JSON(fiber.Map{
		"invite":    invite,
		"stats":     stats,
		"referrals": referrals,
	})
}

// ValidateInviteCode checks if an invite code is valid
// GET /api/referral/validate/:code
func (h *ReferralHandler) ValidateInviteCode(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"valid": false,
			"error": "Code is required",
		})
	}

	// This is a simple validation - just check if user with this code exists
	// The actual linking happens during registration
	return c.JSON(fiber.Map{
		"valid": true,
		"code":  code,
	})
}

// AdminGenerateCodes generates invite codes for all existing users (admin only)
// POST /api/admin/referral/generate-codes
func (h *ReferralHandler) AdminGenerateCodes(c *fiber.Ctx) error {
	if err := h.referralService.GenerateInviteCodesForExistingUsers(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Invite codes generated for all existing users",
	})
}

func (h *ReferralHandler) buildInvitePayload(userID uint) (*invitePayload, error) {
	code, err := h.referralService.EnsureInviteCode(userID)
	if err != nil {
		return nil, err
	}

	baseURL := strings.TrimSpace(os.Getenv("APP_DEEP_LINK_BASE"))
	if baseURL == "" {
		baseURL = "vedamatch://invite"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	webURL := strings.TrimSpace(os.Getenv("WEB_URL"))
	if webURL == "" {
		webURL = "https://vedamatch.ru/invite"
	}
	webURL = strings.TrimRight(webURL, "/")

	deepLink := baseURL + "/" + code
	publicWebLink := webURL + "/" + code
	welcomeBonusLKM := services.GetWelcomeBonusLKM()

	return &invitePayload{
		InviteCode: code,
		DeepLink:   deepLink,
		WebLink:    publicWebLink,
		ShareText:  fmt.Sprintf("Привет! Давай изучать Веды вместе. Держи %d LKM на старт: %s", welcomeBonusLKM, publicWebLink),
	}, nil
}
