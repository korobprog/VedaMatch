package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// Helper to get UserID
func GetUserID(c *fiber.Ctx) uint {
	return middleware.GetUserID(c)
}

type CharityHandler struct {
	Service *services.CharityService
}

func NewCharityHandler(service *services.CharityService) *CharityHandler {
	return &CharityHandler{Service: service}
}

// ==================== ORGANIZATION ====================

// CreateOrganization
func (h *CharityHandler) CreateOrganization(c *fiber.Ctx) error {
	userID := GetUserID(c) // Use internal helper or middleware helper
	var req models.CreateOrganizationRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	org, err := h.Service.CreateOrganization(userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(org)
}

// GetOrganizations (Public or User's)
func (h *CharityHandler) GetOrganizations(c *fiber.Ctx) error {
	// Implement filtering logic here
	// MVP: Return all non-draft
	var orgs []models.CharityOrganization
	// ... implementation ...
	return c.JSON(orgs)
}

// ==================== PROJECT ====================

// CreateProject
func (h *CharityHandler) CreateProject(c *fiber.Ctx) error {
	userID := GetUserID(c)
	var req models.CreateProjectRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	project, err := h.Service.CreateProject(userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(project)
}

// GetProjects (Marketplace Listing)
func (h *CharityHandler) GetProjects(c *fiber.Ctx) error {
	var projects []models.CharityProject
	result := database.DB.Preload("Organization").Where("status = ?", models.ProjectStatusActive).Find(&projects)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": result.Error.Error()})
	}
	return c.JSON(fiber.Map{"projects": projects})
}

// ==================== DONATION ====================

// Donate
func (h *CharityHandler) Donate(c *fiber.Ctx) error {
	userID := GetUserID(c)
	var req models.DonateRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Validate amount
	if req.Amount < 10 { // Minimum donation
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Minimum donation amount is 10 LKM"})
	}

	resp, err := h.Service.Donate(userID, req)
	if err != nil {
		log.Printf("[Charity] Donate Error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

// RefundDonation returns donation within 24 hours
func (h *CharityHandler) RefundDonation(c *fiber.Ctx) error {
	userID := GetUserID(c)
	donationID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid donation ID"})
	}

	if err := h.Service.RefundDonation(userID, uint(donationID)); err != nil {
		log.Printf("[Charity] Refund Error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Donation refunded successfully"})
}

// GetMyDonations returns user's donation history
func (h *CharityHandler) GetMyDonations(c *fiber.Ctx) error {
	userID := GetUserID(c)
	status := c.Query("status") // Optional filter: pending, confirmed, refunded

	donations, err := h.Service.GetUserDonations(userID, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"donations": donations})
}

// ==================== EVIDENCE (REPORTS) ====================

// GetProjectEvidence returns all evidence for a project
func (h *CharityHandler) GetProjectEvidence(c *fiber.Ctx) error {
	projectID, err := strconv.Atoi(c.Params("projectId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid project ID"})
	}

	evidence, err := h.Service.GetProjectEvidence(uint(projectID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"evidence": evidence})
}

// UploadEvidence uploads a new evidence report
func (h *CharityHandler) UploadEvidence(c *fiber.Ctx) error {
	userID := GetUserID(c)

	// Parse request body
	type UploadEvidenceRequest struct {
		ProjectID    uint   `json:"projectId"`
		Type         string `json:"type"` // photo, video, receipt, report
		Title        string `json:"title"`
		Description  string `json:"description"`
		MediaURL     string `json:"mediaUrl"`
		ThumbnailURL string `json:"thumbnailUrl"`
	}

	var req UploadEvidenceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.MediaURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Media URL is required"})
	}

	// Map string type to enum
	var evidenceType models.EvidenceType
	switch req.Type {
	case "photo":
		evidenceType = models.EvidenceTypePhoto
	case "video":
		evidenceType = models.EvidenceTypeVideo
	case "receipt":
		evidenceType = models.EvidenceTypeReceipt
	case "report":
		evidenceType = models.EvidenceTypeReport
	default:
		evidenceType = models.EvidenceTypePhoto
	}

	evidence, err := h.Service.CreateEvidence(userID, req.ProjectID, evidenceType, req.Title, req.Description, req.MediaURL, req.ThumbnailURL)
	if err != nil {
		log.Printf("[Charity] UploadEvidence Error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(evidence)
}

// ==================== ADMIN ====================

// ApproveOrganization
func (h *CharityHandler) ApproveOrganization(c *fiber.Ctx) error {
	// Verify admin role
	// ...
	orgID, _ := strconv.Atoi(c.Params("id"))

	// Update status
	// ...
	return c.JSON(fiber.Map{"status": "approved", "id": orgID})
}
