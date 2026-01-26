package handlers

import (
	"log"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type MultimediaHandler struct {
	service *services.MultimediaService
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
	filter := services.TrackFilter{
		MediaType:  c.Query("type"),
		CategoryID: uint(c.QueryInt("categoryId", 0)),
		Madh:       c.Query("madh"),
		YogaStyle:  c.Query("yogaStyle"),
		Language:   c.Query("language"),
		Search:     c.Query("search"),
		Featured:   c.QueryBool("featured"),
		Page:       c.QueryInt("page", 1),
		Limit:      c.QueryInt("limit", 20),
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
	var track models.MediaTrack
	if err := c.BodyParser(&track); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Get admin ID from context
	userID := c.Locals("userId")
	if userID != nil {
		track.CreatedByID = userID.(uint)
	}

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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.UpdateTrack(uint(id), updates); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid track ID"})
	}

	if err := h.service.DeleteTrack(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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
	var station models.RadioStation
	if err := c.BodyParser(&station); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID := c.Locals("userId")
	if userID != nil {
		station.CreatedByID = userID.(uint)
	}

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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid station ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.UpdateRadioStation(uint(id), updates); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid station ID"})
	}

	if err := h.service.DeleteRadioStation(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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
	var channel models.TVChannel
	if err := c.BodyParser(&channel); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID := c.Locals("userId")
	if userID != nil {
		channel.CreatedByID = userID.(uint)
	}

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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.UpdateTVChannel(uint(id), updates); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	if err := h.service.DeleteTVChannel(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Channel deleted"})
}

// --- Upload ---

// UploadMedia godoc
// @Summary Upload media file to S3 (admin only)
// @Tags Multimedia
// @Accept multipart/form-data
// @Param file formance file true "Media file"
// @Param folder formdata string false "Upload folder (audio/video/images)"
// @Success 200 {object} fiber.Map
// @Router /api/admin/multimedia/upload [post]
func (h *MultimediaHandler) UploadMedia(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file uploaded"})
	}

	folder := c.FormValue("folder", "multimedia")

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

	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	suggestion.UserID = userID.(uint)
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

	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.ReviewSuggestion(uint(id), body.Status, body.AdminNote, userID.(uint)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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

	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.AddToFavorites(userID.(uint), uint(trackID)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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

	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.RemoveFromFavorites(userID.(uint), uint(trackID)); err != nil {
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
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	tracks, total, err := h.service.GetUserFavorites(userID.(uint), page, limit)
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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.UpdateCategory(uint(id), updates); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
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
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	if err := h.service.DeleteCategory(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Category deleted"})
}
