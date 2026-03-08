package handlers

import (
	"errors"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DhamaHandler struct {
	service *services.DhamaService
}

func NewDhamaHandler() *DhamaHandler {
	return &DhamaHandler{
		service: services.NewDhamaService(database.DB),
	}
}

func parseDhamaBoundedInt(c *fiber.Ctx, key string, def int, min int, max int) int {
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

func parseDhamaOptionalFloat(c *fiber.Ctx, key string) (*float64, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil, nil
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Invalid "+key)
	}
	return &value, nil
}

func parseDhamaFeatured(value string) *bool {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	switch trimmed {
	case "1", "true", "yes", "on":
		v := true
		return &v
	case "0", "false", "no", "off":
		v := false
		return &v
	default:
		return nil
	}
}

func parseDhamaLocale(c *fiber.Ctx) string {
	if locale := strings.TrimSpace(c.Query("locale")); locale != "" {
		return locale
	}
	if locale := strings.TrimSpace(c.Get("X-Locale")); locale != "" {
		return locale
	}
	if locale := strings.TrimSpace(c.Get("Accept-Language")); locale != "" {
		return locale
	}
	return ""
}

func parseDhamaFilters(c *fiber.Ctx, includeStatus bool) (models.HolyPlaceFilters, error) {
	latMin, err := parseDhamaOptionalFloat(c, "lat_min")
	if err != nil {
		return models.HolyPlaceFilters{}, err
	}
	latMax, err := parseDhamaOptionalFloat(c, "lat_max")
	if err != nil {
		return models.HolyPlaceFilters{}, err
	}
	lngMin, err := parseDhamaOptionalFloat(c, "lng_min")
	if err != nil {
		return models.HolyPlaceFilters{}, err
	}
	lngMax, err := parseDhamaOptionalFloat(c, "lng_max")
	if err != nil {
		return models.HolyPlaceFilters{}, err
	}

	filters := models.HolyPlaceFilters{
		Search:    strings.TrimSpace(c.Query("search")),
		PlaceType: strings.TrimSpace(c.Query("type")),
		State:     strings.TrimSpace(c.Query("state")),
		City:      strings.TrimSpace(c.Query("city")),
		Tradition: strings.TrimSpace(c.Query("tradition")),
		Featured:  parseDhamaFeatured(c.Query("featured")),
		Page:      parseDhamaBoundedInt(c, "page", 1, 1, 100000),
		Limit:     parseDhamaBoundedInt(c, "limit", 20, 1, 100),
		LatMin:    latMin,
		LatMax:    latMax,
		LngMin:    lngMin,
		LngMax:    lngMax,
	}
	if includeStatus {
		filters.Status = models.HolyPlaceStatus(strings.TrimSpace(c.Query("status")))
	}
	return filters, nil
}

func parsePositiveDhamaParam(c *fiber.Ctx, key string, message string) (uint, error) {
	raw := strings.TrimSpace(c.Params(key))
	parsed, err := strconv.ParseUint(raw, 10, 32)
	if err != nil || parsed == 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, message)
	}
	return uint(parsed), nil
}

func (h *DhamaHandler) ListPlaces(c *fiber.Ctx) error {
	filters, err := parseDhamaFilters(c, false)
	if err != nil {
		return err
	}
	viewerID := middleware.GetUserID(c)
	items, total, locale, err := h.service.ListPublicHolyPlaces(filters, parseDhamaLocale(c), viewerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list dhama places"})
	}
	return c.JSON(fiber.Map{
		"places": items,
		"total":  total,
		"page":   filters.Page,
		"limit":  filters.Limit,
		"locale": locale,
	})
}

func (h *DhamaHandler) GetPlace(c *fiber.Ctx) error {
	viewerID := middleware.GetUserID(c)
	place, err := h.service.GetPublicHolyPlaceBySlug(c.Params("slug"), parseDhamaLocale(c), viewerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dhama place not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load dhama place"})
	}
	return c.JSON(place)
}

func (h *DhamaHandler) GetMapMarkers(c *fiber.Ctx) error {
	filters, err := parseDhamaFilters(c, false)
	if err != nil {
		return err
	}
	viewerID := middleware.GetUserID(c)
	markers, locale, err := h.service.GetPublicHolyPlaceMapMarkers(filters, parseDhamaLocale(c), viewerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load dhama markers"})
	}
	return c.JSON(fiber.Map{
		"markers": markers,
		"locale":  locale,
	})
}

func (h *DhamaHandler) GetFilters(c *fiber.Ctx) error {
	filters, err := h.service.GetHolyPlaceFilters()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load dhama filters"})
	}
	return c.JSON(filters)
}

func (h *DhamaHandler) AdminListPlaces(c *fiber.Ctx) error {
	filters, err := parseDhamaFilters(c, true)
	if err != nil {
		return err
	}
	places, total, err := h.service.ListAdminHolyPlaces(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list dhama places"})
	}
	return c.JSON(fiber.Map{
		"places": places,
		"total":  total,
		"page":   filters.Page,
		"limit":  filters.Limit,
	})
}

func (h *DhamaHandler) AdminGetPlace(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	place, err := h.service.GetAdminHolyPlace(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dhama place not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load dhama place"})
	}
	return c.JSON(place)
}

func (h *DhamaHandler) AdminCreatePlace(c *fiber.Ctx) error {
	var req models.HolyPlaceUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	place, err := h.service.CreateHolyPlace(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(place)
}

func (h *DhamaHandler) AdminUpdatePlace(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	var req models.HolyPlaceUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	place, err := h.service.UpdateHolyPlace(id, req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dhama place not found"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(place)
}

func (h *DhamaHandler) AdminPublishPlace(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	if err := h.service.PublishHolyPlace(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to publish dhama place"})
	}
	return c.JSON(fiber.Map{"message": "Dhama place published"})
}

func (h *DhamaHandler) AdminArchivePlace(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	if err := h.service.ArchiveHolyPlace(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to archive dhama place"})
	}
	return c.JSON(fiber.Map{"message": "Dhama place archived"})
}

func (h *DhamaHandler) AdminDeletePlace(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	if err := h.service.DeleteHolyPlace(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete dhama place"})
	}
	return c.JSON(fiber.Map{"message": "Dhama place deleted"})
}

func (h *DhamaHandler) AdminAttachMedia(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	var body struct {
		MediaTrackID uint `json:"mediaTrackId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := h.service.AttachMedia(id, body.MediaTrackID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Media attached"})
}

func (h *DhamaHandler) AdminDetachMedia(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	mediaTrackID, err := parsePositiveDhamaParam(c, "mediaTrackId", "Invalid mediaTrackId")
	if err != nil {
		return err
	}
	if err := h.service.DetachMedia(id, mediaTrackID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to detach media"})
	}
	return c.JSON(fiber.Map{"message": "Media detached"})
}

func (h *DhamaHandler) AdminAttachYatra(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	var body struct {
		YatraID uint `json:"yatraId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := h.service.AttachYatra(id, body.YatraID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Yatra attached"})
}

func (h *DhamaHandler) AdminDetachYatra(c *fiber.Ctx) error {
	id, err := parsePositiveDhamaParam(c, "id", "Invalid holy place ID")
	if err != nil {
		return err
	}
	yatraID, err := parsePositiveDhamaParam(c, "yatraId", "Invalid yatraId")
	if err != nil {
		return err
	}
	if err := h.service.DetachYatra(id, yatraID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to detach yatra"})
	}
	return c.JSON(fiber.Map{"message": "Yatra detached"})
}
