package handlers

import (
	"errors"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type adminPushCampaignService interface {
	CreateCampaign(actorID uint, req models.AdminPushCampaignCreateRequest) (*models.AdminPushCampaign, error)
	ListCampaigns(filters services.AdminPushCampaignListFilters) ([]models.AdminPushCampaign, int64, error)
	GetCampaign(id uint) (*models.AdminPushCampaign, error)
	GetCampaignRecipients(campaignID uint, page, limit int) ([]services.AdminPushCampaignRecipientView, int64, error)
	CancelCampaign(id uint) error
}

func (h *AdminHandler) CreatePushCampaign(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var req models.AdminPushCampaignCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	campaign, err := h.pushCampaignService.CreateCampaign(adminID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(campaign)
}

func (h *AdminHandler) ListPushCampaigns(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	page := parseAdminQueryInt(c.Query("page"), 1, 1, 100000)
	limit := parseAdminQueryInt(c.Query("limit"), 20, 1, 100)
	items, total, err := h.pushCampaignService.ListCampaigns(services.AdminPushCampaignListFilters{
		Status: c.Query("status"),
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load push campaigns"})
	}

	return c.JSON(fiber.Map{
		"campaigns": items,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

func (h *AdminHandler) GetPushCampaign(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	campaignID, err := parsePositiveAdminParamInt(c, "id", "Invalid campaign ID")
	if err != nil {
		return err
	}
	page := parseAdminQueryInt(c.Query("page"), 1, 1, 100000)
	limit := parseAdminQueryInt(c.Query("limit"), 50, 1, 200)

	campaign, err := h.pushCampaignService.GetCampaign(uint(campaignID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Campaign not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load push campaign"})
	}

	recipients, total, err := h.pushCampaignService.GetCampaignRecipients(uint(campaignID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load campaign recipients"})
	}

	return c.JSON(fiber.Map{
		"campaign":        campaign,
		"recipients":      recipients,
		"recipientsTotal": total,
		"page":            page,
		"limit":           limit,
	})
}

func (h *AdminHandler) CancelPushCampaign(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	campaignID, err := parsePositiveAdminParamInt(c, "id", "Invalid campaign ID")
	if err != nil {
		return err
	}

	if err := h.pushCampaignService.CancelCampaign(uint(campaignID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Campaign cancelled"})
}
