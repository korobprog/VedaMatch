package handlers

import (
	"log"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"
	sfuService "rag-agent-server/internal/services/sfu"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type RoomSFUHandler struct {
	cfg            config.SFUConfig
	liveKitService *sfuService.LiveKitService
}

func NewRoomSFUHandler() *RoomSFUHandler {
	cfg := config.LoadSFUConfig()
	return &RoomSFUHandler{
		cfg:            cfg,
		liveKitService: sfuService.NewLiveKitService(cfg),
	}
}

func (h *RoomSFUHandler) GetRoomConfig(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	if h.cfg.RequireMembership {
		if _, accessErr := ensureRoomAccess(room, actorID, true); accessErr != nil {
			_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenDeniedTotal, 1)
			return respondRoomAccessError(c, accessErr)
		}
	} else {
		if _, accessErr := ensureRoomAccess(room, actorID, false); accessErr != nil {
			_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenDeniedTotal, 1)
			return respondRoomAccessError(c, accessErr)
		}
	}

	return c.JSON(fiber.Map{
		"enabled":               h.cfg.Enabled,
		"provider":              h.cfg.Provider,
		"maxParticipants":       h.cfg.MaxParticipants,
		"maxSubscriptions":      h.cfg.MaxSubscriptions,
		"videoPreset":           h.cfg.VideoPreset,
		"dynacastEnabled":       h.cfg.DynacastEnabled,
		"adaptiveStreamEnabled": h.cfg.AdaptiveStreamEnabled,
		"simulcastEnabled":      h.cfg.SimulcastEnabled,
	})
}

func (h *RoomSFUHandler) IssueRoomToken(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenDeniedTotal, 1)
		return respondRoomLoadError(c, err)
	}

	needMember := h.cfg.RequireMembership
	actorRole, accessErr := ensureRoomAccess(room, actorID, needMember)
	if accessErr != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenDeniedTotal, 1)
		return respondRoomAccessError(c, accessErr)
	}
	if actorRole == "" {
		actorRole = "member"
	}

	if err := h.cfg.ValidateForTokenIssue(); err != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenErrorTotal, 1)
		log.Printf("[RoomSFU] token_issue_failed room_id=%d actor_id=%d actor_role=%s provider=%s error=%v",
			roomID, actorID, actorRole, h.cfg.Provider, err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Room video is temporarily unavailable",
		})
	}

	var body struct {
		ParticipantName string                 `json:"participantName"`
		Metadata        map[string]interface{} `json:"metadata"`
	}
	if err := c.BodyParser(&body); err != nil && !strings.Contains(strings.ToLower(err.Error()), "empty") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	result, issueErr := h.liveKitService.IssueRoomToken(sfuService.IssueTokenInput{
		UserID:          actorID,
		RoomID:          roomID,
		Role:            actorRole,
		ParticipantName: strings.TrimSpace(body.ParticipantName),
		Metadata:        sanitizeSFUMetadata(body.Metadata),
	})
	if issueErr != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenErrorTotal, 1)
		log.Printf("[RoomSFU] token_issue_failed room_id=%d actor_id=%d actor_role=%s provider=%s error=%v",
			roomID, actorID, actorRole, h.cfg.Provider, issueErr)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue room token"})
	}

	_ = services.GetMetricsService().Increment(services.MetricRoomSFUTokenIssuedTotal, 1)
	log.Printf("[RoomSFU] token_issued room_id=%d actor_id=%d actor_role=%s provider=%s",
		roomID, actorID, actorRole, h.cfg.Provider)

	return c.JSON(result)
}

func sanitizeSFUMetadata(metadata map[string]interface{}) map[string]interface{} {
	if len(metadata) == 0 {
		return map[string]interface{}{}
	}
	allowed := map[string]struct{}{
		"platform":   {},
		"device":     {},
		"appVersion": {},
		"locale":     {},
	}
	sanitized := make(map[string]interface{})
	for key, value := range metadata {
		normalized := strings.TrimSpace(key)
		if normalized == "" {
			continue
		}
		if _, ok := allowed[normalized]; !ok {
			continue
		}
		switch typed := value.(type) {
		case string:
			trimmed := strings.TrimSpace(typed)
			if trimmed != "" {
				sanitized[normalized] = trimmed
			}
		case bool, float64, int, int32, int64, uint, uint32, uint64:
			sanitized[normalized] = typed
		}
	}
	return sanitized
}
