package handlers

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// YatraHandler handles yatra/travel-related HTTP requests
type YatraHandler struct {
	yatraService   *services.YatraService
	shelterService *services.ShelterService
}

// NewYatraHandler creates a new yatra handler instance
func NewYatraHandler() *YatraHandler {
	mapService := services.NewMapService(database.DB)
	yatraService := services.NewYatraService(database.DB, mapService)
	shelterService := services.NewShelterService(database.DB, mapService)

	return &YatraHandler{
		yatraService:   yatraService,
		shelterService: shelterService,
	}
}

// ==================== YATRA ENDPOINTS ====================

// CreateYatra creates a new yatra
// POST /api/yatra
func (h *YatraHandler) CreateYatra(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.YatraCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	yatra, err := h.yatraService.CreateYatra(userID, req)
	if err != nil {
		log.Printf("[YatraHandler] Error creating yatra: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(yatra)
}

// GetYatra returns a yatra by ID
// GET /api/yatra/:id
func (h *YatraHandler) GetYatra(c *fiber.Ctx) error {
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	yatra, err := h.yatraService.GetYatra(uint(yatraID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Yatra not found"})
	}

	return c.JSON(yatra)
}

// ListYatras returns a list of yatras
// GET /api/yatra
func (h *YatraHandler) ListYatras(c *fiber.Ctx) error {
	filters := models.YatraFilters{
		City:     c.Query("city"),
		Language: c.Query("language"),
		Search:   c.Query("search"),
	}

	if c.Query("theme") != "" {
		filters.Theme = models.YatraTheme(c.Query("theme"))
	}
	if c.Query("status") != "" {
		filters.Status = models.YatraStatus(c.Query("status"))
	}
	if c.Query("start_after") != "" {
		filters.StartAfter = c.Query("start_after")
	}
	if c.Query("start_before") != "" {
		filters.StartBefore = c.Query("start_before")
	}
	if c.Query("page") != "" {
		if page, err := strconv.Atoi(c.Query("page")); err == nil {
			filters.Page = page
		}
	}
	if c.Query("limit") != "" {
		if limit, err := strconv.Atoi(c.Query("limit")); err == nil {
			filters.Limit = limit
		}
	}

	yatras, total, err := h.yatraService.ListYatras(filters)
	if err != nil {
		log.Printf("[YatraHandler] Error listing yatras: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list yatras"})
	}

	return c.JSON(fiber.Map{
		"yatras": yatras,
		"total":  total,
		"page":   filters.Page,
	})
}

// UpdateYatra updates a yatra
// PUT /api/yatra/:id
func (h *YatraHandler) UpdateYatra(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	yatra, err := h.yatraService.UpdateYatra(uint(yatraID), userID, updates)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(yatra)
}

// PublishYatra publishes a draft yatra
// POST /api/yatra/:id/publish
func (h *YatraHandler) PublishYatra(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	if err := h.yatraService.PublishYatra(uint(yatraID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Yatra published"})
}

// DeleteYatra deletes a yatra
// DELETE /api/yatra/:id
func (h *YatraHandler) DeleteYatra(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	if err := h.yatraService.DeleteYatra(uint(yatraID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Yatra deleted"})
}

// GetMyYatras returns user's yatras (organized and participating)
// GET /api/yatra/my
func (h *YatraHandler) GetMyYatras(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	organized, participating, err := h.yatraService.GetMyYatras(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get yatras"})
	}

	return c.JSON(fiber.Map{
		"organized":     organized,
		"participating": participating,
	})
}

// ==================== PARTICIPANT ENDPOINTS ====================

// JoinYatra submits a join request
// POST /api/yatra/:id/join
func (h *YatraHandler) JoinYatra(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var req models.YatraJoinRequest
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}
	}

	participant, err := h.yatraService.JoinYatra(uint(yatraID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(participant)
}

// ApproveParticipant approves a join request
// POST /api/yatra/:id/participants/:participantId/approve
func (h *YatraHandler) ApproveParticipant(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}
	participantID, err := strconv.ParseUint(c.Params("participantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid participant ID"})
	}

	if err := h.yatraService.ApproveParticipant(uint(yatraID), uint(participantID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Participant approved"})
}

// RejectParticipant rejects a join request
// POST /api/yatra/:id/participants/:participantId/reject
func (h *YatraHandler) RejectParticipant(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}
	participantID, err := strconv.ParseUint(c.Params("participantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid participant ID"})
	}

	if err := h.yatraService.RejectParticipant(uint(yatraID), uint(participantID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Participant rejected"})
}

// RemoveParticipant removes a participant
// DELETE /api/yatra/:id/participants/:participantId
func (h *YatraHandler) RemoveParticipant(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}
	participantID, err := strconv.ParseUint(c.Params("participantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid participant ID"})
	}

	if err := h.yatraService.RemoveParticipant(uint(yatraID), uint(participantID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Participant removed"})
}

// GetPendingParticipants returns pending join requests
// GET /api/yatra/:id/participants/pending
func (h *YatraHandler) GetPendingParticipants(c *fiber.Ctx) error {
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	participants, err := h.yatraService.GetPendingParticipants(uint(yatraID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get participants"})
	}

	return c.JSON(participants)
}

// ==================== SHELTER ENDPOINTS ====================

// CreateShelter creates a new shelter
// POST /api/shelter
func (h *YatraHandler) CreateShelter(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ShelterCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	shelter, err := h.shelterService.CreateShelter(userID, req)
	if err != nil {
		log.Printf("[YatraHandler] Error creating shelter: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(shelter)
}

// GetShelter returns a shelter by ID
// GET /api/shelter/:id
func (h *YatraHandler) GetShelter(c *fiber.Ctx) error {
	shelterID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid shelter ID"})
	}

	shelter, err := h.shelterService.GetShelter(uint(shelterID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Shelter not found"})
	}

	return c.JSON(shelter)
}

// ListShelters returns a list of shelters
// GET /api/shelter
func (h *YatraHandler) ListShelters(c *fiber.Ctx) error {
	filters := models.ShelterFilters{
		City:   c.Query("city"),
		Search: c.Query("search"),
	}

	if c.Query("type") != "" {
		filters.Type = models.ShelterType(c.Query("type"))
	}
	if c.Query("seva_only") == "true" {
		filters.SevaOnly = true
	}
	if c.Query("min_rating") != "" {
		if rating, err := strconv.ParseFloat(c.Query("min_rating"), 64); err == nil {
			filters.MinRating = &rating
		}
	}
	if c.Query("near_lat") != "" && c.Query("near_lng") != "" {
		if lat, err := strconv.ParseFloat(c.Query("near_lat"), 64); err == nil {
			filters.NearLat = &lat
		}
		if lng, err := strconv.ParseFloat(c.Query("near_lng"), 64); err == nil {
			filters.NearLng = &lng
		}
		if radius, err := strconv.ParseFloat(c.Query("radius_km"), 64); err == nil {
			filters.RadiusKm = &radius
		} else {
			defaultRadius := 50.0
			filters.RadiusKm = &defaultRadius
		}
	}
	if c.Query("page") != "" {
		if page, err := strconv.Atoi(c.Query("page")); err == nil {
			filters.Page = page
		}
	}
	if c.Query("limit") != "" {
		if limit, err := strconv.Atoi(c.Query("limit")); err == nil {
			filters.Limit = limit
		}
	}

	shelters, total, err := h.shelterService.ListShelters(filters)
	if err != nil {
		log.Printf("[YatraHandler] Error listing shelters: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list shelters"})
	}

	return c.JSON(fiber.Map{
		"shelters": shelters,
		"total":    total,
		"page":     filters.Page,
	})
}

// UpdateShelter updates a shelter
// PUT /api/shelter/:id
func (h *YatraHandler) UpdateShelter(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	shelterID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid shelter ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	shelter, err := h.shelterService.UpdateShelter(uint(shelterID), userID, updates)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(shelter)
}

// DeleteShelter deletes a shelter
// DELETE /api/shelter/:id
func (h *YatraHandler) DeleteShelter(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	shelterID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid shelter ID"})
	}

	if err := h.shelterService.DeleteShelter(uint(shelterID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Shelter deleted"})
}

// GetMyShelters returns user's shelters
// GET /api/shelter/my
func (h *YatraHandler) GetMyShelters(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	shelters, err := h.shelterService.GetMyShelters(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get shelters"})
	}

	return c.JSON(shelters)
}

// ==================== SHELTER REVIEWS ====================

// CreateShelterReview creates a review for a shelter
// POST /api/shelter/:id/reviews
func (h *YatraHandler) CreateShelterReview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	shelterID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid shelter ID"})
	}

	var req models.ShelterReviewCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	review, err := h.shelterService.CreateReview(uint(shelterID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(review)
}

// GetShelterReviews returns reviews for a shelter
// GET /api/shelter/:id/reviews
func (h *YatraHandler) GetShelterReviews(c *fiber.Ctx) error {
	shelterID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid shelter ID"})
	}

	page := 1
	limit := 10
	if p, err := strconv.Atoi(c.Query("page")); err == nil {
		page = p
	}
	if l, err := strconv.Atoi(c.Query("limit")); err == nil {
		limit = l
	}

	reviews, total, err := h.shelterService.GetShelterReviews(uint(shelterID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get reviews"})
	}

	return c.JSON(fiber.Map{
		"reviews": reviews,
		"total":   total,
		"page":    page,
	})
}

// DeleteShelterReview deletes a review
// DELETE /api/shelter/:id/reviews/:reviewId
func (h *YatraHandler) DeleteShelterReview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	reviewID, err := strconv.ParseUint(c.Params("reviewId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid review ID"})
	}

	if err := h.shelterService.DeleteReview(uint(reviewID), userID); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Review deleted"})
}

// ==================== PHOTO UPLOAD ====================

// UploadYatraPhoto uploads a photo for yatra/shelter
// POST /api/yatra/upload or /api/shelter/upload
func (h *YatraHandler) UploadPhoto(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No photo provided"})
	}

	// Get type from query (yatra or shelter)
	uploadType := c.Query("type", "yatra")
	if uploadType != "yatra" && uploadType != "shelter" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid upload type"})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("travel/%s/u%d_%d%s", uploadType, userID, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				return c.JSON(fiber.Map{"url": imageURL})
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := fmt.Sprintf("./uploads/travel/%s", uploadType)
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create upload directory"})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_u%d_%d%s", uploadType, userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save photo"})
	}

	imageURL := fmt.Sprintf("/uploads/travel/%s/%s", uploadType, filename)
	return c.JSON(fiber.Map{"url": imageURL})
}

// ==================== YATRA REVIEWS ====================

// GetYatraReviews returns reviews for a yatra
// GET /api/yatra/:id/reviews
func (h *YatraHandler) GetYatraReviews(c *fiber.Ctx) error {
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	page := 1
	limit := 10
	if p, err := strconv.Atoi(c.Query("page")); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}

	reviews, total, avgRating, err := h.yatraService.GetYatraReviews(uint(yatraID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get reviews"})
	}

	return c.JSON(fiber.Map{
		"reviews":       reviews,
		"total":         total,
		"averageRating": avgRating,
		"page":          page,
	})
}

// CreateYatraReview creates a review for a yatra
// POST /api/yatra/:id/reviews
func (h *YatraHandler) CreateYatraReview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	var req models.YatraReviewCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate rating
	if req.OverallRating < 1 || req.OverallRating > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Rating must be between 1 and 5"})
	}

	review, err := h.yatraService.CreateYatraReview(uint(yatraID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(review)
}

// GetOrganizerStats returns statistics for a yatra organizer
// GET /api/yatra/organizer/:userId/stats
func (h *YatraHandler) GetOrganizerStats(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	stats, err := h.yatraService.GetOrganizerStats(uint(userID))
	if err != nil {
		log.Printf("[YatraHandler] Error getting organizer stats: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get stats"})
	}

	return c.JSON(stats)
}

// GetMyParticipation returns current user's participation status for a yatra
// GET /api/yatra/:id/my-participation
func (h *YatraHandler) GetMyParticipation(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	participation, err := h.yatraService.GetUserParticipation(uint(yatraID), userID)
	if err != nil {
		// No participation found is not an error
		return c.JSON(nil)
	}

	return c.JSON(participation)
}
