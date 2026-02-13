package handlers

import (
	"log"
	"strconv"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

// VideoHandler handles video-related HTTP requests
type VideoHandler struct {
	service *services.VideoService
}

// NewVideoHandler creates a new video handler
func NewVideoHandler() *VideoHandler {
	return &VideoHandler{
		service: services.NewVideoService(database.DB),
	}
}

// UploadVideo handles video file upload
// @Summary Upload a new video
// @Description Upload a video file and start transcoding
// @Tags Video
// @Accept multipart/form-data
// @Produce json
// @Param video formance file true "Video file"
// @Param title formData string true "Video title"
// @Param description formData string false "Video description"
// @Param categoryId formData int false "Category ID"
// @Param artist formData string false "Artist/Speaker name"
// @Param madh formData string false "Spiritual tradition"
// @Param language formData string false "Language code"
// @Param year formData int false "Year"
// @Param isFeatured formData bool false "Featured video"
// @Success 201 {object} services.UploadVideoResponse
// @Router /api/admin/video/upload [post]
func (h *VideoHandler) UploadVideo(c *fiber.Ctx) error {
	// Get user from context
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Check admin role
	if user.Role != "admin" && user.Role != "superadmin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	// Get file from form
	file, err := c.FormFile("video")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Video file is required",
		})
	}

	// Parse form data
	var categoryID *uint
	if catStr := c.FormValue("categoryId"); catStr != "" {
		if id, err := strconv.ParseUint(catStr, 10, 32); err == nil {
			catID := uint(id)
			categoryID = &catID
		}
	}

	year := 0
	if yearStr := c.FormValue("year"); yearStr != "" {
		year, _ = strconv.Atoi(yearStr)
	}

	req := services.UploadVideoRequest{
		Title:       c.FormValue("title"),
		Description: c.FormValue("description"),
		CategoryID:  categoryID,
		Artist:      c.FormValue("artist"),
		Madh:        c.FormValue("madh"),
		Language:    c.FormValue("language"),
		Year:        year,
		IsFeatured:  c.FormValue("isFeatured") == "true",
	}

	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required",
		})
	}

	// Upload video
	result, err := h.service.UploadVideo(c.Context(), file, req, user.ID)
	if err != nil {
		log.Printf("[VideoHandler] Upload error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(result)
}

// GetTranscodingProgress returns transcoding progress for a job
// @Summary Get transcoding progress
// @Tags Video
// @Param jobId path string true "Job ID"
// @Success 200 {object} models.TranscodingProgressResponse
// @Router /api/video/progress/{jobId} [get]
func (h *VideoHandler) GetTranscodingProgress(c *fiber.Ctx) error {
	jobID := c.Params("jobId")
	if jobID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Job ID is required",
		})
	}

	progress, err := h.service.GetTranscodingProgress(jobID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Job not found",
		})
	}

	return c.JSON(progress)
}

// GetVideoPlayback returns video playback info
// @Summary Get video playback info
// @Tags Video
// @Param id path int true "Video ID"
// @Success 200 {object} models.VideoPlaybackInfo
// @Router /api/video/{id}/playback [get]
func (h *VideoHandler) GetVideoPlayback(c *fiber.Ctx) error {
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Get user ID if logged in
	var userID *uint
	if user, ok := c.Locals("user").(*models.User); ok && user != nil {
		userID = &user.ID
	}

	info, err := h.service.GetVideoPlaybackInfo(uint(videoID), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	return c.JSON(info)
}

// SaveProgress saves user's watch progress
// @Summary Save watch progress
// @Tags Video
// @Param id path int true "Video ID"
// @Param body body object true "Progress data"
// @Success 200 {object} fiber.Map
// @Router /api/video/{id}/progress [post]
func (h *VideoHandler) SaveProgress(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	var body struct {
		Position int `json:"position"`
		Duration int `json:"duration"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := h.service.SaveUserProgress(user.ID, uint(videoID), body.Position, body.Duration); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save progress",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// GetProgress returns user's watch progress
// @Summary Get watch progress
// @Tags Video
// @Param id path int true "Video ID"
// @Success 200 {object} fiber.Map
// @Router /api/video/{id}/progress [get]
func (h *VideoHandler) GetProgress(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	position, err := h.service.GetUserProgress(user.ID, uint(videoID))
	if err != nil {
		position = 0 // Return 0 if no progress found
	}

	return c.JSON(fiber.Map{
		"position": position,
	})
}

// UploadSubtitle adds subtitles to a video
// @Summary Upload subtitles
// @Tags Video
// @Accept multipart/form-data
// @Param id path int true "Video ID"
// @Param subtitle formData file true "VTT subtitle file"
// @Param language formData string true "Language code (ru, en, hi)"
// @Param label formData string true "Display label"
// @Param isDefault formData bool false "Set as default"
// @Success 200 {object} fiber.Map
// @Router /api/admin/video/{id}/subtitle [post]
func (h *VideoHandler) UploadSubtitle(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil || (user.Role != "admin" && user.Role != "superadmin") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	file, err := c.FormFile("subtitle")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Subtitle file is required",
		})
	}

	language := c.FormValue("language")
	if language == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Language is required",
		})
	}

	label := c.FormValue("label")
	if label == "" {
		label = language // Use language code as fallback
	}

	isDefault := c.FormValue("isDefault") == "true"

	if err := h.service.AddSubtitle(c.Context(), uint(videoID), file, language, label, isDefault); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Subtitle added successfully",
	})
}

// DeleteSubtitle removes a subtitle
// @Summary Delete subtitle
// @Tags Video
// @Param subtitleId path int true "Subtitle ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/video/subtitle/{subtitleId} [delete]
func (h *VideoHandler) DeleteSubtitle(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil || (user.Role != "admin" && user.Role != "superadmin") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	subtitleID, err := strconv.ParseUint(c.Params("subtitleId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid subtitle ID",
		})
	}

	if err := h.service.DeleteSubtitle(uint(subtitleID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// RetryTranscoding retries a failed transcoding job
// @Summary Retry transcoding
// @Tags Video
// @Param id path int true "Video ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/video/{id}/retry [post]
func (h *VideoHandler) RetryTranscoding(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil || (user.Role != "admin" && user.Role != "superadmin") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	jobID, err := h.service.RetryTranscoding(uint(videoID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"jobId":   jobID,
	})
}

// DeleteVideo deletes a video
// @Summary Delete video
// @Tags Video
// @Param id path int true "Video ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/video/{id} [delete]
func (h *VideoHandler) DeleteVideo(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil || (user.Role != "admin" && user.Role != "superadmin") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	if err := h.service.DeleteVideo(c.Context(), uint(videoID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// GetVideos returns list of videos (extends existing multimedia handler)
// @Summary Get videos list
// @Tags Video
// @Param status query string false "Filter by transcoding status"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} fiber.Map
// @Router /api/video [get]
func (h *VideoHandler) GetVideos(c *fiber.Ctx) error {
	status := c.Query("status") // pending, processing, completed, failed
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build query
	query := database.DB.Model(&models.MediaTrack{}).Where("media_type = ?", "video")

	if status != "" {
		query = query.Where("transcoding_status = ?", status)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count videos"})
	}

	// Get videos
	var videos []models.MediaTrack
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&videos).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch videos"})
	}

	return c.JSON(fiber.Map{
		"videos": videos,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

// RegisterVideoRoutes registers video routes
func RegisterVideoRoutes(app *fiber.App) {
	handler := NewVideoHandler()

	// Public routes
	video := app.Group("/api/video")
	video.Get("/", handler.GetVideos)
	video.Get("/:id/playback", handler.GetVideoPlayback)
	video.Get("/progress/:jobId", handler.GetTranscodingProgress)

	// Authenticated routes
	videoAuth := app.Group("/api/video", middleware.Protected())
	videoAuth.Get("/:id/progress", handler.GetProgress)
	videoAuth.Post("/:id/progress", handler.SaveProgress)

	// Admin routes
	adminVideo := app.Group("/api/admin/video", middleware.AdminProtected())
	adminVideo.Post("/upload", handler.UploadVideo)
	adminVideo.Post("/:id/subtitle", handler.UploadSubtitle)
	adminVideo.Post("/:id/retry", handler.RetryTranscoding)
	adminVideo.Delete("/subtitle/:subtitleId", handler.DeleteSubtitle)
	adminVideo.Delete("/:id", handler.DeleteVideo)
}
