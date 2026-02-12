package handlers

import (
	"errors"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func parseBoundedQueryInt(c *fiber.Ctx, key string, def int, min int, max int) int {
	value := def
	if raw := c.Query(key); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			value = parsed
		}
	}
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

func requireYatraAdminUserID(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	return userID, nil
}

// YatraAdminHandler handles admin endpoints for yatra management
type YatraAdminHandler struct {
	yatraAdminService     *services.YatraAdminService
	reportService         *services.YatraReportService
	organizerAdminService *services.OrganizerAdminService
	analyticsService      *services.YatraAnalyticsService
	notificationService   *services.AdminNotificationService
	templateService       *services.ModerationTemplateService
}

// NewYatraAdminHandler creates a new admin handler
func NewYatraAdminHandler() *YatraAdminHandler {
	// Initialize services with dependencies
	notificationService := services.NewAdminNotificationService(database.DB)
	reportService := services.NewYatraReportService(database.DB, notificationService)
	organizerAdminService := services.NewOrganizerAdminService(database.DB, notificationService)

	mapService := services.NewMapService(database.DB)
	yatraService := services.NewYatraService(database.DB, mapService)
	yatraAdminService := services.NewYatraAdminService(database.DB, yatraService, notificationService)

	analyticsService := services.NewYatraAnalyticsService(database.DB)
	templateService := services.NewModerationTemplateService(database.DB)

	return &YatraAdminHandler{
		yatraAdminService:     yatraAdminService,
		reportService:         reportService,
		organizerAdminService: organizerAdminService,
		analyticsService:      analyticsService,
		notificationService:   notificationService,
		templateService:       templateService,
	}
}

// ... existing code ...

// ==================== TEMPLATES & BROADCAST ====================

// GetTemplates returns all templates
// GET /api/admin/yatra/templates
func (h *YatraAdminHandler) GetTemplates(c *fiber.Ctx) error {
	templates, err := h.templateService.GetTemplates()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get templates"})
	}
	return c.JSON(templates)
}

// CreateTemplate creates a new template
// POST /api/admin/yatra/templates
func (h *YatraAdminHandler) CreateTemplate(c *fiber.Ctx) error {
	var req models.ModerationTemplateCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	template, err := h.templateService.CreateTemplate(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(template)
}

// UpdateTemplate updates a template
// PUT /api/admin/yatra/templates/:id
func (h *YatraAdminHandler) UpdateTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid template ID"})
	}
	var req models.ModerationTemplateUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	template, err := h.templateService.UpdateTemplate(uint(id), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(template)
}

// DeleteTemplate deletes a template
// DELETE /api/admin/yatra/templates/:id
func (h *YatraAdminHandler) DeleteTemplate(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid template ID"})
	}
	if err := h.templateService.DeleteTemplate(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Template deleted"})
}

// BroadcastEmail sends mass emails
// POST /api/admin/yatra/broadcast
func (h *YatraAdminHandler) BroadcastEmail(c *fiber.Ctx) error {
	var req struct {
		TemplateID      uint   `json:"template_id"`
		RecipientFilter string `json:"recipient_filter"` // all_organizers, active_organizers
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	count, err := h.templateService.BroadcastEmail(req.TemplateID, req.RecipientFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Broadcast initiated",
		"count":   count,
	})
}

// ==================== YATRA MANAGEMENT ====================

// GetAllYatras returns all yatras (admin view with drafts, cancelled, etc.)
// GET /api/admin/yatra
func (h *YatraAdminHandler) GetAllYatras(c *fiber.Ctx) error {
	filters := services.AdminYatraFilters{
		YatraFilters: models.YatraFilters{
			Theme:    models.YatraTheme(c.Query("theme")),
			Status:   models.YatraStatus(c.Query("status")),
			City:     c.Query("city"),
			Language: c.Query("language"),
			Search:   c.Query("search"),
		},
		IncludeDrafts:    c.Query("include_drafts") == "true",
		IncludeCancelled: c.Query("include_cancelled") == "true",
		IncludeCompleted: c.Query("include_completed") == "true",
		ReportedOnly:     c.Query("reported_only") == "true",
	}

	if c.Query("organizer_id") != "" {
		if orgID, err := strconv.ParseUint(c.Query("organizer_id"), 10, 32); err == nil {
			orgIDUint := uint(orgID)
			filters.OrganizerID = &orgIDUint
		}
	}

	if c.Query("page") != "" {
		filters.Page = parseBoundedQueryInt(c, "page", 1, 1, 100000)
	}

	if c.Query("limit") != "" {
		filters.Limit = parseBoundedQueryInt(c, "limit", 20, 1, 200)
	}

	yatras, total, err := h.yatraAdminService.GetAllYatras(filters)
	if err != nil {
		log.Printf("[YatraAdminHandler] Error getting yatras: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get yatras"})
	}

	return c.JSON(fiber.Map{
		"yatras": yatras,
		"total":  total,
		"page":   filters.Page,
	})
}

// GetYatraStats returns overall yatra statistics
// GET /api/admin/yatra/stats
func (h *YatraAdminHandler) GetYatraStats(c *fiber.Ctx) error {
	stats, err := h.yatraAdminService.GetYatraStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get stats"})
	}

	return c.JSON(stats)
}

// ApproveYatra approves a draft yatra
// POST /api/admin/yatra/:id/approve
func (h *YatraAdminHandler) ApproveYatra(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var req struct {
		Notes string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.yatraAdminService.ApproveYatra(uint(yatraID), adminID, req.Notes); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Yatra approved"})
}

// RejectYatra rejects a yatra with reason
// POST /api/admin/yatra/:id/reject
func (h *YatraAdminHandler) RejectYatra(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.BodyParser(&req); err != nil || req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Reason is required"})
	}

	if err := h.yatraAdminService.RejectYatra(uint(yatraID), adminID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Yatra rejected"})
}

// ForceCancelYatra cancels a yatra (admin override)
// POST /api/admin/yatra/:id/cancel
func (h *YatraAdminHandler) ForceCancelYatra(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.BodyParser(&req); err != nil || req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Reason is required"})
	}

	if err := h.yatraAdminService.ForceCancelYatra(uint(yatraID), adminID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Yatra cancelled"})
}

// UpdateYatra updates yatra (admin can edit any field)
// PUT /api/admin/yatra/:id
func (h *YatraAdminHandler) UpdateYatra(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	yatra, err := h.yatraAdminService.UpdateYatra(uint(yatraID), adminID, updates)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(yatra)
}

// GetYatraParticipants returns all participants (admin view)
// GET /api/admin/yatra/:id/participants
func (h *YatraAdminHandler) GetYatraParticipants(c *fiber.Ctx) error {
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	participants, err := h.yatraAdminService.GetYatraParticipants(uint(yatraID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get participants"})
	}

	return c.JSON(participants)
}

// RemoveParticipant removes a participant (admin power)
// DELETE /api/admin/yatra/:id/participants/:participantId
func (h *YatraAdminHandler) RemoveParticipant(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}
	participantID, err := strconv.ParseUint(c.Params("participantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid participant ID"})
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.yatraAdminService.RemoveParticipant(uint(yatraID), uint(participantID), adminID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Participant removed"})
}

// ==================== ORGANIZER MANAGEMENT ====================

// GetOrganizers returns list of organizers with stats
// GET /api/admin/organizers
func (h *YatraAdminHandler) GetOrganizers(c *fiber.Ctx) error {
	filters := services.OrganizerFilters{
		BlockedOnly: c.Query("blocked_only") == "true",
		TopRated:    c.Query("top_rated") == "true",
		MinYatras:   0,
	}

	if c.Query("min_yatras") != "" {
		if min, err := strconv.Atoi(c.Query("min_yatras")); err == nil {
			filters.MinYatras = min
		}
	}

	if c.Query("page") != "" {
		filters.Page = parseBoundedQueryInt(c, "page", 1, 1, 100000)
	}

	if c.Query("limit") != "" {
		filters.Limit = parseBoundedQueryInt(c, "limit", 20, 1, 200)
	}

	organizers, total, err := h.organizerAdminService.GetOrganizers(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get organizers"})
	}

	return c.JSON(fiber.Map{
		"organizers": organizers,
		"total":      total,
		"page":       filters.Page,
	})
}

// GetOrganizerStats returns detailed stats for an organizer
// GET /api/admin/organizers/:id/stats
func (h *YatraAdminHandler) GetOrganizerStats(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	stats, err := h.organizerAdminService.GetOrganizerStats(uint(userID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get stats"})
	}

	return c.JSON(stats)
}

// BlockOrganizer blocks an organizer
// POST /api/admin/organizers/:id/block
func (h *YatraAdminHandler) BlockOrganizer(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req models.OrganizerBlockCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.organizerAdminService.BlockOrganizer(uint(userID), adminID, req.Reason, req.Duration); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Organizer blocked"})
}

// UnblockOrganizer removes block from organizer
// DELETE /api/admin/organizers/:id/block
func (h *YatraAdminHandler) UnblockOrganizer(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	if err := h.organizerAdminService.UnblockOrganizer(uint(userID), adminID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Organizer unblocked"})
}

// ==================== REPORTS MANAGEMENT ====================

// GetReports returns all reports with filters
// GET /api/admin/yatra-reports
func (h *YatraAdminHandler) GetReports(c *fiber.Ctx) error {
	filters := models.YatraReportFilters{
		Status:     models.YatraReportStatus(c.Query("status")),
		TargetType: models.YatraReportTargetType(c.Query("target_type")),
	}

	if c.Query("target_id") != "" {
		if id, err := strconv.ParseUint(c.Query("target_id"), 10, 32); err == nil {
			idUint := uint(id)
			filters.TargetID = &idUint
		}
	}

	if c.Query("page") != "" {
		filters.Page = parseBoundedQueryInt(c, "page", 1, 1, 100000)
	}

	if c.Query("limit") != "" {
		filters.Limit = parseBoundedQueryInt(c, "limit", 20, 1, 200)
	}

	reports, total, err := h.reportService.GetAllReports(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get reports"})
	}

	return c.JSON(fiber.Map{
		"reports": reports,
		"total":   total,
		"page":    filters.Page,
	})
}

// GetReport returns a single report with details
// GET /api/admin/yatra-reports/:id
func (h *YatraAdminHandler) GetReport(c *fiber.Ctx) error {
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID"})
	}

	report, err := h.reportService.GetReport(uint(reportID))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get report"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Report not found"})
	}

	return c.JSON(report)
}

// UpdateReport updates report status/notes
// PUT /api/admin/yatra-reports/:id
func (h *YatraAdminHandler) UpdateReport(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID"})
	}

	var req models.YatraReportUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	report, err := h.reportService.UpdateReport(uint(reportID), adminID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(report)
}

// ResolveReport marks report as resolved
// POST /api/admin/yatra-reports/:id/resolve
func (h *YatraAdminHandler) ResolveReport(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID"})
	}

	var req struct {
		Notes string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.reportService.ResolveReport(uint(reportID), adminID, req.Notes); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Report resolved"})
}

// DismissReport dismisses a report
// POST /api/admin/yatra-reports/:id/dismiss
func (h *YatraAdminHandler) DismissReport(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	reportID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid report ID"})
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.reportService.DismissReport(uint(reportID), adminID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Report dismissed"})
}

// ==================== ANALYTICS ====================

// GetTopOrganizers returns top organizers
// GET /api/admin/yatra/analytics/top-organizers
func (h *YatraAdminHandler) GetTopOrganizers(c *fiber.Ctx) error {
	limit := parseBoundedQueryInt(c, "limit", 10, 1, 100)

	orderBy := c.Query("order_by") // "total", "rating", "participants", "completed"
	if orderBy == "" {
		orderBy = "total"
	}

	rankings, err := h.analyticsService.GetTopOrganizers(limit, orderBy)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get rankings"})
	}

	return c.JSON(rankings)
}

// GetGeography returns geographic distribution
// GET /api/admin/yatra/analytics/geography
func (h *YatraAdminHandler) GetGeography(c *fiber.Ctx) error {
	points, err := h.analyticsService.GetGeographyData()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get geography data"})
	}

	return c.JSON(points)
}

// GetThemes returns theme popularity trends
// GET /api/admin/yatra/analytics/themes
func (h *YatraAdminHandler) GetThemes(c *fiber.Ctx) error {
	trends, err := h.analyticsService.GetThemeTrends()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get theme trends"})
	}

	return c.JSON(trends)
}

// GetTrends returns time-based trends
// GET /api/admin/yatra/analytics/trends
func (h *YatraAdminHandler) GetTrends(c *fiber.Ctx) error {
	period := c.Query("period") // "month"
	months := parseBoundedQueryInt(c, "months", 12, 1, 60)

	trends, err := h.analyticsService.GetTimeTrends(period, months)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get trends"})
	}

	return c.JSON(trends)
}

// ==================== NOTIFICATIONS ====================

// GetNotifications returns admin notifications
// GET /api/admin/notifications
func (h *YatraAdminHandler) GetNotifications(c *fiber.Ctx) error {
	unreadOnly := c.Query("unread_only") == "true"
	page := parseBoundedQueryInt(c, "page", 1, 1, 100000)
	limit := parseBoundedQueryInt(c, "limit", 50, 1, 200)

	notifications, total, err := h.notificationService.GetNotifications(unreadOnly, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get notifications"})
	}

	return c.JSON(fiber.Map{
		"notifications": notifications,
		"total":         total,
		"page":          page,
	})
}

// MarkNotificationRead marks notification as read
// POST /api/admin/notifications/:id/read
func (h *YatraAdminHandler) MarkNotificationRead(c *fiber.Ctx) error {
	adminID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	notifID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid notification ID"})
	}

	if err := h.notificationService.MarkAsRead(uint(notifID), adminID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Marked as read"})
}

// ==================== PUBLIC REPORT ENDPOINTS ====================

// CreateYatraReport creates a report against a yatra
// POST /api/yatra/:id/report (Protected)
func (h *YatraAdminHandler) CreateYatraReport(c *fiber.Ctx) error {
	userID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var req struct {
		Reason      models.YatraReportReason `json:"reason" binding:"required"`
		Description string                   `json:"description"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	reportReq := models.YatraReportCreateRequest{
		TargetType:  models.ReportTargetYatra,
		TargetID:    uint(yatraID),
		Reason:      req.Reason,
		Description: req.Description,
	}

	report, err := h.reportService.CreateReport(userID, reportReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(report)
}

// CreateOrganizerReport creates a report against an organizer
// POST /api/organizer/:id/report (Protected)
func (h *YatraAdminHandler) CreateOrganizerReport(c *fiber.Ctx) error {
	userID, err := requireYatraAdminUserID(c)
	if err != nil {
		return err
	}
	organizerID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid organizer ID"})
	}

	var req struct {
		Reason      models.YatraReportReason `json:"reason" binding:"required"`
		Description string                   `json:"description"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	reportReq := models.YatraReportCreateRequest{
		TargetType:  models.ReportTargetOrganizer,
		TargetID:    uint(organizerID),
		Reason:      req.Reason,
		Description: req.Description,
	}

	report, err := h.reportService.CreateReport(userID, reportReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(report)
}
