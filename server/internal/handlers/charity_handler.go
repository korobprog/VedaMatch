package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"time"

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
	result := database.DB.Where("status != ?", models.OrgStatusDraft).Find(&orgs)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": result.Error.Error()})
	}
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

// GetKarmaFeed returns recent public donations for karma ticker
func (h *CharityHandler) GetKarmaFeed(c *fiber.Ctx) error {
	projectIDStr := c.Query("projectId")
	limitStr := c.Query("limit", "20")

	var projectID uint = 0
	if projectIDStr != "" {
		if pid, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = uint(pid)
		}
	}

	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	donations, err := h.Service.GetRecentDonations(projectID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Transform to karma feed format (hide sensitive data)
	type KarmaItem struct {
		ID           uint   `json:"id"`
		DonorName    string `json:"donorName"`
		DonorAvatar  string `json:"donorAvatar"`
		ProjectTitle string `json:"projectTitle"`
		Amount       int    `json:"amount"`
		Message      string `json:"message"`
		CreatedAt    string `json:"createdAt"`
	}

	feed := make([]KarmaItem, 0, len(donations))
	for _, d := range donations {
		item := KarmaItem{
			ID:        d.ID,
			Amount:    d.Amount,
			Message:   d.KarmaMessage,
			CreatedAt: d.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if d.DonorUser != nil {
			item.DonorName = d.DonorUser.SpiritualName
			if item.DonorName == "" {
				item.DonorName = d.DonorUser.KarmicName
			}
			item.DonorAvatar = d.DonorUser.AvatarURL
		}

		if d.Project != nil {
			item.ProjectTitle = d.Project.Title
		}

		feed = append(feed, item)
	}

	return c.JSON(fiber.Map{"feed": feed})
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

// GetPendingOrganizations returns all organizations pending verification
func (h *CharityHandler) GetPendingOrganizations(c *fiber.Ctx) error {
	status := c.Query("status", "pending")

	var orgs []models.CharityOrganization
	query := database.DB.Preload("OwnerUser").Order("created_at DESC")

	if status != "all" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&orgs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"organizations": orgs})
}

// ApproveOrganization approves a charity organization
func (h *CharityHandler) ApproveOrganization(c *fiber.Ctx) error {
	orgID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization ID"})
	}

	var org models.CharityOrganization
	if err := database.DB.First(&org, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Organization not found"})
	}

	now := time.Now()
	org.Status = models.OrgStatusVerified
	org.VerifiedAt = &now

	if err := database.DB.Save(&org).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("[Admin] Approved organization %d: %s", orgID, org.Name)
	return c.JSON(fiber.Map{"status": "approved", "organization": org})
}

// RejectOrganization rejects a charity organization
func (h *CharityHandler) RejectOrganization(c *fiber.Ctx) error {
	orgID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organization ID"})
	}

	type RejectRequest struct {
		Reason string `json:"reason"`
	}
	var req RejectRequest
	c.BodyParser(&req)

	var org models.CharityOrganization
	if err := database.DB.First(&org, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Organization not found"})
	}

	org.Status = models.OrgStatusBlocked
	org.RejectionReason = req.Reason

	if err := database.DB.Save(&org).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("[Admin] Rejected organization %d: %s (reason: %s)", orgID, org.Name, req.Reason)
	return c.JSON(fiber.Map{"status": "rejected", "organization": org})
}

// GetPendingProjects returns all projects pending moderation
func (h *CharityHandler) GetPendingProjects(c *fiber.Ctx) error {
	status := c.Query("status", "moderation")

	var projects []models.CharityProject
	query := database.DB.Preload("Organization").Order("created_at DESC")

	if status != "all" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"projects": projects})
}

// ApproveProject approves a charity project
func (h *CharityHandler) ApproveProject(c *fiber.Ctx) error {
	projectID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid project ID"})
	}

	var project models.CharityProject
	if err := database.DB.First(&project, projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	project.Status = models.ProjectStatusActive

	if err := database.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("[Admin] Approved project %d: %s", projectID, project.Title)
	return c.JSON(fiber.Map{"status": "approved", "project": project})
}

// RejectProject rejects a charity project
func (h *CharityHandler) RejectProject(c *fiber.Ctx) error {
	projectID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid project ID"})
	}

	type RejectRequest struct {
		Reason string `json:"reason"`
	}
	var req RejectRequest
	c.BodyParser(&req)

	var project models.CharityProject
	if err := database.DB.First(&project, projectID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	project.Status = models.ProjectStatusBlocked
	project.RejectionReason = req.Reason

	if err := database.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("[Admin] Rejected project %d: %s (reason: %s)", projectID, project.Title, req.Reason)
	return c.JSON(fiber.Map{"status": "rejected", "project": project})
}

// GetCharityStats returns charity dashboard statistics
func (h *CharityHandler) GetCharityStats(c *fiber.Ctx) error {
	var stats struct {
		TotalOrganizations   int64 `json:"totalOrganizations"`
		PendingOrganizations int64 `json:"pendingOrganizations"`
		TotalProjects        int64 `json:"totalProjects"`
		ActiveProjects       int64 `json:"activeProjects"`
		PendingProjects      int64 `json:"pendingProjects"`
		TotalDonations       int64 `json:"totalDonations"`
		TotalRaised          int64 `json:"totalRaised"`
		PendingDonations     int64 `json:"pendingDonations"`
	}

	database.DB.Model(&models.CharityOrganization{}).Count(&stats.TotalOrganizations)
	database.DB.Model(&models.CharityOrganization{}).Where("status = ?", models.OrgStatusPending).Count(&stats.PendingOrganizations)
	database.DB.Model(&models.CharityProject{}).Count(&stats.TotalProjects)
	database.DB.Model(&models.CharityProject{}).Where("status = ?", models.ProjectStatusActive).Count(&stats.ActiveProjects)
	database.DB.Model(&models.CharityProject{}).Where("status = ?", models.ProjectStatusModeration).Count(&stats.PendingProjects)
	database.DB.Model(&models.CharityDonation{}).Count(&stats.TotalDonations)
	database.DB.Model(&models.CharityDonation{}).Select("COALESCE(SUM(amount), 0)").Row().Scan(&stats.TotalRaised)
	database.DB.Model(&models.CharityDonation{}).Where("status = ?", models.DonationStatusPending).Count(&stats.PendingDonations)

	return c.JSON(stats)
}
