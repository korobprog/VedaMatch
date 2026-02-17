package handlers

import (
	"errors"
	"log"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type MultimediaHandler struct {
	service *services.MultimediaService
}

func requireMultimediaUserID(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !models.IsAdminRole(middleware.GetUserRole(c)) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	return userID, nil
}

func boundedQueryInt(c *fiber.Ctx, key string, def int, min int, max int) int {
	value := c.QueryInt(key, def)
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

func isUnsafeFolderPath(path string) bool {
	if strings.Contains(path, "..") || strings.Contains(path, "\\") {
		return true
	}
	return strings.HasPrefix(path, "/")
}

func respondMultimediaDomainError(c *fiber.Ctx, err error, notFoundMsg string) error {
	if err == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": notFoundMsg})
	}

	errText := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(errText, "invalid") || strings.Contains(errText, "required") || strings.Contains(errText, "inactive") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
}

func NewMultimediaHandler() *MultimediaHandler {
	return &MultimediaHandler{
		service: services.NewMultimediaService(),
	}
}

// --- Categories ---

// GetCategories godoc
// @Summary Get media categories
// @Tags Multimedia
// @Param type query string false "Filter by type (bhajan, lecture, kirtan, film)"
// @Success 200 {array} models.MediaCategory
// @Router /api/multimedia/categories [get]
func (h *MultimediaHandler) GetCategories(c *fiber.Ctx) error {
	mediaType := c.Query("type")
	categories, err := h.service.GetCategories(mediaType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(categories)
}

// --- Tracks ---

// GetTracks godoc
// @Summary Get media tracks with filters
// @Tags Multimedia
// @Param type query string false "audio or video"
// @Param categoryId query int false "Category ID"
// @Param madh query string false "Filter by spiritual tradition"
// @Param yogaStyle query string false "Filter by yoga style"
// @Param language query string false "Filter by language"
// @Param search query string false "Search term"
// @Param featured query bool false "Only featured"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} services.TrackListResponse
// @Router /api/multimedia/tracks [get]
func (h *MultimediaHandler) GetTracks(c *fiber.Ctx) error {
	categoryID := c.QueryInt("categoryId", 0)
	if categoryID < 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	filter := services.TrackFilter{
		MediaType:  c.Query("type"),
		CategoryID: uint(categoryID),
		Madh:       c.Query("madh"),
		YogaStyle:  c.Query("yogaStyle"),
		Language:   c.Query("language"),
		Search:     c.Query("search"),
		Featured:   c.QueryBool("featured"),
		Page:       boundedQueryInt(c, "page", 1, 1, 100000),
		Limit:      boundedQueryInt(c, "limit", 20, 1, 100),
	}

	result, err := h.service.GetTracks(filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
}

// GetTrack godoc
// @Summary Get track by ID
// @Tags Multimedia
// @Param id path int true "Track ID"
// @Success 200 {object} models.MediaTrack
// @Router /api/multimedia/tracks/{id} [get]
func (h *MultimediaHandler) GetTrack(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	track, err := h.service.GetTrackByID(uint(id))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch track"})
		}
		return c.Status(404).JSON(fiber.Map{"error": "Track not found"})
	}
	return c.JSON(track)
}

// CreateTrack godoc
// @Summary Create a new track (admin only)
// @Tags Multimedia
// @Accept json
// @Param track body models.MediaTrack true "Track data"
// @Success 201 {object} models.MediaTrack
// @Router /api/admin/multimedia/tracks [post]
func (h *MultimediaHandler) CreateTrack(c *fiber.Ctx) error {
	userID, err := requireMultimediaUserID(c)
	if err != nil {
		return err
	}

	var track models.MediaTrack
	if err := c.BodyParser(&track); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	track.CreatedByID = userID

	if err := h.service.CreateTrack(&track); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(track)
}

// UpdateTrack godoc
// @Summary Update a track (admin only)
// @Tags Multimedia
// @Param id path int true "Track ID"
// @Param updates body map[string]interface{} true "Updates"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/tracks/{id} [put]
func (h *MultimediaHandler) UpdateTrack(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	var track models.MediaTrack
	if err := c.BodyParser(&track); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	track.ID = uint(id)

	if err := h.service.UpdateTrack(&track); err != nil {
		return respondMultimediaDomainError(c, err, "Track not found")
	}
	return c.JSON(fiber.Map{"message": "Track updated"})
}

// DeleteTrack godoc
// @Summary Delete a track (admin only)
// @Tags Multimedia
// @Param id path int true "Track ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/tracks/{id} [delete]
func (h *MultimediaHandler) DeleteTrack(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	if err := h.service.DeleteTrack(uint(id)); err != nil {
		return respondMultimediaDomainError(c, err, "Track not found")
	}
	return c.JSON(fiber.Map{"message": "Track deleted"})
}

// --- Radio Stations ---

// GetRadioStations godoc
// @Summary Get radio stations
// @Tags Multimedia
// @Param madh query string false "Filter by spiritual tradition"
// @Success 200 {array} models.RadioStation
// @Router /api/multimedia/radio [get]
func (h *MultimediaHandler) GetRadioStations(c *fiber.Ctx) error {
	madh := c.Query("madh")
	stations, err := h.service.GetRadioStations(madh)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stations)
}

// GetRadioStation godoc
// @Summary Get radio station by ID
// @Tags Multimedia
// @Param id path int true "Station ID"
// @Success 200 {object} models.RadioStation
// @Router /api/multimedia/radio/{id} [get]
func (h *MultimediaHandler) GetRadioStation(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid station ID"})
	}

	station, err := h.service.GetRadioStationByID(uint(id))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch station"})
		}
		return c.Status(404).JSON(fiber.Map{"error": "Station not found"})
	}
	return c.JSON(station)
}

// CreateRadioStation godoc
// @Summary Create a new radio station (admin only)
// @Tags Multimedia
// @Accept json
// @Param station body models.RadioStation true "Station data"
// @Success 201 {object} models.RadioStation
// @Router /api/admin/multimedia/radio [post]
func (h *MultimediaHandler) CreateRadioStation(c *fiber.Ctx) error {
	userID, err := requireMultimediaUserID(c)
	if err != nil {
		return err
	}

	var station models.RadioStation
	if err := c.BodyParser(&station); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	station.CreatedByID = userID

	if err := h.service.CreateRadioStation(&station); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(station)
}

// UpdateRadioStation godoc
// @Summary Update a radio station (admin only)
// @Tags Multimedia
// @Param id path int true "Station ID"
// @Param updates body map[string]interface{} true "Updates"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/radio/{id} [put]
func (h *MultimediaHandler) UpdateRadioStation(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid station ID"})
	}

	var station models.RadioStation
	if err := c.BodyParser(&station); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	station.ID = uint(id)

	if err := h.service.UpdateRadioStation(&station); err != nil {
		return respondMultimediaDomainError(c, err, "Station not found")
	}
	return c.JSON(fiber.Map{"message": "Station updated"})
}

// DeleteRadioStation godoc
// @Summary Delete a radio station (admin only)
// @Tags Multimedia
// @Param id path int true "Station ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/radio/{id} [delete]
func (h *MultimediaHandler) DeleteRadioStation(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid station ID"})
	}

	if err := h.service.DeleteRadioStation(uint(id)); err != nil {
		return respondMultimediaDomainError(c, err, "Station not found")
	}
	return c.JSON(fiber.Map{"message": "Station deleted"})
}

// --- TV Channels ---

// GetTVChannels godoc
// @Summary Get TV channels
// @Tags Multimedia
// @Param madh query string false "Filter by spiritual tradition"
// @Success 200 {array} models.TVChannel
// @Router /api/multimedia/tv [get]
func (h *MultimediaHandler) GetTVChannels(c *fiber.Ctx) error {
	madh := c.Query("madh")
	channels, err := h.service.GetTVChannels(madh)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(channels)
}

// GetTVChannel godoc
// @Summary Get TV channel by ID
// @Tags Multimedia
// @Param id path int true "Channel ID"
// @Success 200 {object} models.TVChannel
// @Router /api/multimedia/tv/{id} [get]
func (h *MultimediaHandler) GetTVChannel(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	channel, err := h.service.GetTVChannelByID(uint(id))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch channel"})
		}
		return c.Status(404).JSON(fiber.Map{"error": "Channel not found"})
	}
	return c.JSON(channel)
}

// CreateTVChannel godoc
// @Summary Create a new TV channel (admin only)
// @Tags Multimedia
// @Accept json
// @Param channel body models.TVChannel true "Channel data"
// @Success 201 {object} models.TVChannel
// @Router /api/admin/multimedia/tv [post]
func (h *MultimediaHandler) CreateTVChannel(c *fiber.Ctx) error {
	userID, err := requireMultimediaUserID(c)
	if err != nil {
		return err
	}

	var channel models.TVChannel
	if err := c.BodyParser(&channel); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	channel.CreatedByID = userID

	if err := h.service.CreateTVChannel(&channel); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(channel)
}

// UpdateTVChannel godoc
// @Summary Update a TV channel (admin only)
// @Tags Multimedia
// @Param id path int true "Channel ID"
// @Param updates body map[string]interface{} true "Updates"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/tv/{id} [put]
func (h *MultimediaHandler) UpdateTVChannel(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	var channel models.TVChannel
	if err := c.BodyParser(&channel); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	channel.ID = uint(id)

	if err := h.service.UpdateTVChannel(&channel); err != nil {
		return respondMultimediaDomainError(c, err, "Channel not found")
	}
	return c.JSON(fiber.Map{"message": "Channel updated"})
}

// DeleteTVChannel godoc
// @Summary Delete a TV channel (admin only)
// @Tags Multimedia
// @Param id path int true "Channel ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/tv/{id} [delete]
func (h *MultimediaHandler) DeleteTVChannel(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	if err := h.service.DeleteTVChannel(uint(id)); err != nil {
		return respondMultimediaDomainError(c, err, "Channel not found")
	}
	return c.JSON(fiber.Map{"message": "Channel deleted"})
}

// --- Upload ---

// UploadMedia godoc
// @Summary Upload media file to S3 (admin only) - for small files only
// @Tags Multimedia
// @Accept multipart/form-data
// @Param file formance file true "Media file"
// @Param folder formdata string false "Upload folder (audio/video/images)"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/upload [post]
func (h *MultimediaHandler) UploadMedia(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file uploaded"})
	}

	folder := strings.TrimSpace(c.FormValue("folder", "multimedia"))
	if isUnsafeFolderPath(folder) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid folder"})
	}

	url, err := h.service.UploadToS3(file, folder)
	if err != nil {
		log.Printf("[MultimediaHandler] Upload error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"url":      url,
		"filename": file.Filename,
		"size":     file.Size,
	})
}

// GetPresignedURL godoc
// @Summary Get presigned URL for direct S3 upload (for large files)
// @Tags Multimedia
// @Accept json
// @Param body body map[string]string true "filename and folder"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/presign [post]
func (h *MultimediaHandler) GetPresignedURL(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	var body struct {
		Filename    string `json:"filename"`
		Folder      string `json:"folder"`
		ContentType string `json:"contentType"`
		SeriesSlug  string `json:"seriesSlug"` // Optional: series folder name
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.Filename == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Filename is required"})
	}

	// Determine folder path
	folder := strings.TrimSpace(body.Folder)
	if body.SeriesSlug != "" {
		if strings.Contains(body.SeriesSlug, "..") || strings.Contains(body.SeriesSlug, "/") || strings.Contains(body.SeriesSlug, "\\") {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid series slug"})
		}
		// Create folder structure: series/{series-slug}/
		folder = "series/" + body.SeriesSlug
	} else if folder == "" {
		folder = "videos"
	}
	if isUnsafeFolderPath(folder) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid folder"})
	}

	if body.ContentType == "" {
		body.ContentType = "video/mp4"
	}

	presignedURL, finalURL, err := h.service.GetPresignedUploadURL(body.Filename, folder, body.ContentType)
	if err != nil {
		log.Printf("[MultimediaHandler] Presign error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"uploadUrl": presignedURL,
		"finalUrl":  finalURL,
		"folder":    folder,
	})
}

// --- User Suggestions (UGC) ---

// CreateSuggestion godoc
// @Summary Submit content suggestion
// @Tags Multimedia
// @Accept json
// @Param suggestion body models.UserMediaSuggestion true "Suggestion data"
// @Success 201 {object} models.UserMediaSuggestion
// @Router /api/multimedia/suggest [post]
func (h *MultimediaHandler) CreateSuggestion(c *fiber.Ctx) error {
	var suggestion models.UserMediaSuggestion
	if err := c.BodyParser(&suggestion); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	suggestion.UserID = userID
	suggestion.Status = "pending"

	if err := h.service.CreateSuggestion(&suggestion); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(suggestion)
}

// GetPendingSuggestions godoc
// @Summary Get pending suggestions (admin only)
// @Tags Multimedia
// @Success 200 {array} models.UserMediaSuggestion
// @Router /api/admin/multimedia/suggestions [get]
func (h *MultimediaHandler) GetPendingSuggestions(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	suggestions, err := h.service.GetPendingSuggestions()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(suggestions)
}

// ReviewSuggestion godoc
// @Summary Review a suggestion (admin only)
// @Tags Multimedia
// @Param id path int true "Suggestion ID"
// @Param review body map[string]interface{} true "Review data"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/suggestions/{id}/review [post]
func (h *MultimediaHandler) ReviewSuggestion(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid suggestion ID"})
	}

	var body struct {
		Status    string `json:"status"` // approved or rejected
		AdminNote string `json:"adminNote"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.Status != "approved" && body.Status != "rejected" {
		return c.Status(400).JSON(fiber.Map{"error": "Status must be 'approved' or 'rejected'"})
	}

	userID, err := requireMultimediaUserID(c)
	if err != nil {
		return err
	}

	if err := h.service.ReviewSuggestion(uint(id), body.Status, body.AdminNote, userID); err != nil {
		return respondMultimediaDomainError(c, err, "Suggestion not found")
	}
	return c.JSON(fiber.Map{"message": "Suggestion reviewed"})
}

// --- Favorites ---

// AddToFavorites godoc
// @Summary Add track to favorites
// @Tags Multimedia
// @Param id path int true "Track ID"
// @Success 200 {object} fiber.Map
// @Router /api/multimedia/tracks/{id}/favorite [post]
func (h *MultimediaHandler) AddToFavorites(c *fiber.Ctx) error {
	trackID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.AddToFavorites(userID, uint(trackID)); err != nil {
		return respondMultimediaDomainError(c, err, "Track not found")
	}
	return c.JSON(fiber.Map{"message": "Added to favorites"})
}

// RemoveFromFavorites godoc
// @Summary Remove track from favorites
// @Tags Multimedia
// @Param id path int true "Track ID"
// @Success 200 {object} fiber.Map
// @Router /api/multimedia/tracks/{id}/favorite [delete]
func (h *MultimediaHandler) RemoveFromFavorites(c *fiber.Ctx) error {
	trackID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.RemoveFromFavorites(userID, uint(trackID)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Removed from favorites"})
}

// GetFavorites godoc
// @Summary Get user's favorite tracks
// @Tags Multimedia
// @Success 200 {array} models.MediaTrack
// @Router /api/multimedia/favorites [get]
func (h *MultimediaHandler) GetFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	page := boundedQueryInt(c, "page", 1, 1, 100000)
	limit := boundedQueryInt(c, "limit", 20, 1, 100)

	tracks, total, err := h.service.GetUserFavorites(userID, page, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"tracks": tracks,
		"total":  total,
		"page":   page,
	})
}

// --- Stats ---

// GetStats godoc
// @Summary Get multimedia statistics (admin only)
// @Tags Multimedia
// @Success 200 {object} services.MultimediaStats
// @Router /api/admin/multimedia/stats [get]
func (h *MultimediaHandler) GetStats(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	stats, err := h.service.GetStats()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

// --- Categories Admin ---

// CreateCategory godoc
// @Summary Create a new category (admin only)
// @Tags Multimedia
// @Accept json
// @Param category body models.MediaCategory true "Category data"
// @Success 201 {object} models.MediaCategory
// @Router /api/admin/multimedia/categories [post]
func (h *MultimediaHandler) CreateCategory(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	var category models.MediaCategory
	if err := c.BodyParser(&category); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.CreateCategory(&category); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(category)
}

// UpdateCategory godoc
// @Summary Update a category (admin only)
// @Tags Multimedia
// @Param id path int true "Category ID"
// @Param updates body map[string]interface{} true "Updates"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/categories/{id} [put]
func (h *MultimediaHandler) UpdateCategory(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	var category models.MediaCategory
	if err := c.BodyParser(&category); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	category.ID = uint(id)

	if err := h.service.UpdateCategory(&category); err != nil {
		return respondMultimediaDomainError(c, err, "Category not found")
	}
	return c.JSON(fiber.Map{"message": "Category updated"})
}

// DeleteCategory godoc
// @Summary Delete a category (admin only)
// @Tags Multimedia
// @Param id path int true "Category ID"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/categories/{id} [delete]
func (h *MultimediaHandler) DeleteCategory(c *fiber.Ctx) error {
	if _, err := requireMultimediaUserID(c); err != nil {
		return err
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	if err := h.service.DeleteCategory(uint(id)); err != nil {
		return respondMultimediaDomainError(c, err, "Category not found")
	}
	return c.JSON(fiber.Map{"message": "Category deleted"})
}

func (h *MultimediaHandler) RestoreRadioScheduler() {
	log.Println("[Scheduler] Initializing Radio Health Check task...")
	services.GlobalScheduler.RegisterTask("radio_health_check", 10, func() {
		h.service.CheckRadioStatus()
	})
}
