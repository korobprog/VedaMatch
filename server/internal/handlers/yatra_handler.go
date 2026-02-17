package handlers

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// YatraHandler handles yatra/travel-related HTTP requests
type YatraHandler struct {
	yatraService   *services.YatraService
	shelterService *services.ShelterService
}

func requireYatraUserID(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	return userID, nil
}

func parseBoundedYatraQueryInt(c *fiber.Ctx, key string, def int, min int, max int) int {
	value := def
	raw := strings.TrimSpace(c.Query(key))
	if raw != "" {
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

func parseYatraBoolQuery(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
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
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
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
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get yatra"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Yatra not found"})
	}

	return c.JSON(yatra)
}

// ListYatras returns a list of yatras
// GET /api/yatra
func (h *YatraHandler) ListYatras(c *fiber.Ctx) error {
	filters := models.YatraFilters{
		City:     strings.TrimSpace(c.Query("city")),
		Language: strings.TrimSpace(c.Query("language")),
		Search:   strings.TrimSpace(c.Query("search")),
		Page:     parseBoundedYatraQueryInt(c, "page", 1, 1, 100000),
		Limit:    parseBoundedYatraQueryInt(c, "limit", 20, 1, 200),
	}

	if theme := strings.TrimSpace(c.Query("theme")); theme != "" {
		filters.Theme = models.YatraTheme(theme)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		filters.Status = models.YatraStatus(status)
	}
	if startAfter := strings.TrimSpace(c.Query("start_after")); startAfter != "" {
		filters.StartAfter = startAfter
	}
	if startBefore := strings.TrimSpace(c.Query("start_before")); startBefore != "" {
		filters.StartBefore = startBefore
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
		"limit":  filters.Limit,
	})
}

// UpdateYatra updates a yatra
// PUT /api/yatra/:id
func (h *YatraHandler) UpdateYatra(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
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

	yatra, err := h.yatraService.UpdateYatra(uint(yatraID), userID, updates)
	if err != nil {
		return respondYatraDomainError(c, err)
	}

	return c.JSON(yatra)
}

// PublishYatra publishes a draft yatra
// POST /api/yatra/:id/publish
func (h *YatraHandler) PublishYatra(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	if err := h.yatraService.PublishYatra(uint(yatraID), userID); err != nil {
		return respondYatraDomainError(c, err)
	}

	return c.JSON(fiber.Map{"message": "Yatra published"})
}

// DeleteYatra deletes a yatra
// DELETE /api/yatra/:id
func (h *YatraHandler) DeleteYatra(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
	}
	yatraID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid yatra ID"})
	}

	if err := h.yatraService.DeleteYatra(uint(yatraID), userID); err != nil {
		return respondYatraDomainError(c, err)
	}

	return c.JSON(fiber.Map{"message": "Yatra deleted"})
}

// GetMyYatras returns user's yatras (organized and participating)
// GET /api/yatra/my
func (h *YatraHandler) GetMyYatras(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
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
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
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
	userID, err := requireYatraUserID(c)
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

	if err := h.yatraService.ApproveParticipant(uint(yatraID), uint(participantID), userID); err != nil {
		return respondYatraDomainError(c, err)
	}

	return c.JSON(fiber.Map{"message": "Participant approved"})
}

// RejectParticipant rejects a join request
// POST /api/yatra/:id/participants/:participantId/reject
func (h *YatraHandler) RejectParticipant(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
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

	if err := h.yatraService.RejectParticipant(uint(yatraID), uint(participantID), userID); err != nil {
		return respondYatraDomainError(c, err)
	}

	return c.JSON(fiber.Map{"message": "Participant rejected"})
}

// RemoveParticipant removes a participant
// DELETE /api/yatra/:id/participants/:participantId
func (h *YatraHandler) RemoveParticipant(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
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

	if err := h.yatraService.RemoveParticipant(uint(yatraID), uint(participantID), userID); err != nil {
		return respondYatraDomainError(c, err)
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
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get shelter"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Shelter not found"})
	}

	return c.JSON(shelter)
}

// ListShelters returns a list of shelters
// GET /api/shelter
func (h *YatraHandler) ListShelters(c *fiber.Ctx) error {
	filters := models.ShelterFilters{
		City:   strings.TrimSpace(c.Query("city")),
		Search: strings.TrimSpace(c.Query("search")),
		Page:   parseBoundedYatraQueryInt(c, "page", 1, 1, 100000),
		Limit:  parseBoundedYatraQueryInt(c, "limit", 20, 1, 200),
	}

	if shelterType := strings.TrimSpace(c.Query("type")); shelterType != "" {
		filters.Type = models.ShelterType(shelterType)
	}
	if parseYatraBoolQuery(c.Query("seva_only")) {
		filters.SevaOnly = true
	}
	if minRating := strings.TrimSpace(c.Query("min_rating")); minRating != "" {
		if rating, err := strconv.ParseFloat(minRating, 64); err == nil {
			filters.MinRating = &rating
		}
	}
	nearLat := strings.TrimSpace(c.Query("near_lat"))
	nearLng := strings.TrimSpace(c.Query("near_lng"))
	if nearLat != "" && nearLng != "" {
		if lat, err := strconv.ParseFloat(nearLat, 64); err == nil {
			filters.NearLat = &lat
		}
		if lng, err := strconv.ParseFloat(nearLng, 64); err == nil {
			filters.NearLng = &lng
		}
		if radius, err := strconv.ParseFloat(strings.TrimSpace(c.Query("radius_km")), 64); err == nil {
			filters.RadiusKm = &radius
		} else {
			defaultRadius := 50.0
			filters.RadiusKm = &defaultRadius
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
		"limit":    filters.Limit,
	})
}

// UpdateShelter updates a shelter
// PUT /api/shelter/:id
func (h *YatraHandler) UpdateShelter(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
	}
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
		return respondYatraDomainError(c, err)
	}

	return c.JSON(shelter)
}

// DeleteShelter deletes a shelter
// DELETE /api/shelter/:id
func (h *YatraHandler) DeleteShelter(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
	}
	shelterID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid shelter ID"})
	}

	if err := h.shelterService.DeleteShelter(uint(shelterID), userID); err != nil {
		return respondYatraDomainError(c, err)
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

	page := parseBoundedYatraQueryInt(c, "page", 1, 1, 100000)
	limit := parseBoundedYatraQueryInt(c, "limit", 10, 1, 100)

	reviews, total, err := h.shelterService.GetShelterReviews(uint(shelterID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get reviews"})
	}

	return c.JSON(fiber.Map{
		"reviews": reviews,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// DeleteShelterReview deletes a review
// DELETE /api/shelter/:id/reviews/:reviewId
func (h *YatraHandler) DeleteShelterReview(c *fiber.Ctx) error {
	userID, err := requireYatraUserID(c)
	if err != nil {
		return err
	}
	reviewID, err := strconv.ParseUint(c.Params("reviewId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid review ID"})
	}

	if err := h.shelterService.DeleteReview(uint(reviewID), userID); err != nil {
		return respondYatraDomainError(c, err)
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
			fileName := fmt.Sprintf("travel/%s/u%d_%d%s", uploadType, userID, time.Now().UnixNano(), ext)
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
	filename := fmt.Sprintf("%s_u%d_%d%s", uploadType, userID, time.Now().UnixNano(), ext)
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

	page := parseBoundedYatraQueryInt(c, "page", 1, 1, 100000)
	limit := parseBoundedYatraQueryInt(c, "limit", 10, 1, 100)

	reviews, total, avgRating, err := h.yatraService.GetYatraReviews(uint(yatraID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get reviews"})
	}

	return c.JSON(fiber.Map{
		"reviews":       reviews,
		"total":         total,
		"averageRating": avgRating,
		"page":          page,
		"limit":         limit,
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

func respondYatraDomainError(c *fiber.Ctx, err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Not found"})
	}

	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(msg, "not authorized"), strings.Contains(msg, "forbidden"):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case strings.Contains(msg, "not found"):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case strings.Contains(msg, "invalid"), strings.Contains(msg, "required"), strings.Contains(msg, "already"), strings.Contains(msg, "cannot"), strings.Contains(msg, "full"):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
	}
}
