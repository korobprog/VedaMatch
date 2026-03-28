package handlers

import (
	"encoding/json"
	"log"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/observability"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type CallDiagnosticsHandler struct{}

func NewCallDiagnosticsHandler() *CallDiagnosticsHandler {
	return &CallDiagnosticsHandler{}
}

type createCallDiagnosticsRequest struct {
	CallSessionID string                 `json:"callSessionId"`
	PeerUserID    uint                   `json:"peerUserId"`
	RoomID        uint                   `json:"roomId"`
	Direction     string                 `json:"direction"`
	Mode          string                 `json:"mode"`
	Event         string                 `json:"event"`
	Result        string                 `json:"result"`
	Severity      string                 `json:"severity"`
	Platform      string                 `json:"platform"`
	NetworkType   string                 `json:"networkType"`
	AppVersion    string                 `json:"appVersion"`
	DeviceModel   string                 `json:"deviceModel"`
	Message       string                 `json:"message"`
	Stats         *callDiagnosticsStats  `json:"stats"`
	Metadata      map[string]interface{} `json:"metadata"`
}

type callDiagnosticsStats struct {
	DurationSec         int    `json:"durationSec"`
	LocalCandidates     int    `json:"localCandidates"`
	RemoteCandidates    int    `json:"remoteCandidates"`
	ICEConnectionState  string `json:"iceConnectionState"`
	PeerConnectionState string `json:"peerConnectionState"`
}

func (h *CallDiagnosticsHandler) Create(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req createCallDiagnosticsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	callSessionID := trimToMax(req.CallSessionID, 128)
	if callSessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "callSessionId is required"})
	}

	event := normalizeDiagnosticsToken(req.Event, 48)
	if event == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "event is required"})
	}

	result := normalizeDiagnosticsToken(req.Result, 48)
	if result == "" {
		result = "reported"
	}

	severity := normalizeDiagnosticsSeverity(req.Severity)
	mode := normalizeDiagnosticsMode(req.Mode)
	platform := normalizeDiagnosticsPlatform(req.Platform)
	networkType := normalizeDiagnosticsNetworkType(req.NetworkType)
	direction := normalizeDiagnosticsDirection(req.Direction)
	appVersion := trimToMax(req.AppVersion, 64)
	deviceModel := trimToMax(req.DeviceModel, 128)
	message := trimToMax(req.Message, 500)

	stats := sanitizeCallDiagnosticsStats(req.Stats)
	metadata := sanitizeDiagnosticsMetadata(req.Metadata)

	observability.ObserveCallDiagnostics(observability.CallDiagnosticsSample{
		Subsystem:   "client",
		Event:       event,
		Result:      result,
		Severity:    severity,
		Mode:        mode,
		Platform:    platform,
		NetworkType: networkType,
		DurationSec: stats.DurationSec,
	})

	metaJSON := ""
	if len(metadata) > 0 {
		if encoded, err := json.Marshal(metadata); err == nil {
			metaJSON = string(encoded)
		}
	}

	log.Printf(
		"[CallDiag] report user_id=%d peer_user_id=%d room_id=%d call_session_id=%s direction=%s mode=%s event=%s result=%s severity=%s platform=%s network_type=%s duration_sec=%d local_candidates=%d remote_candidates=%d ice_state=%s peer_state=%s app_version=%s device_model=%q message=%q metadata=%s",
		userID,
		req.PeerUserID,
		req.RoomID,
		callSessionID,
		direction,
		mode,
		event,
		result,
		severity,
		platform,
		networkType,
		stats.DurationSec,
		stats.LocalCandidates,
		stats.RemoteCandidates,
		stats.ICEConnectionState,
		stats.PeerConnectionState,
		appVersion,
		deviceModel,
		message,
		metaJSON,
	)

	return c.JSON(fiber.Map{"ok": true})
}

func sanitizeCallDiagnosticsStats(stats *callDiagnosticsStats) callDiagnosticsStats {
	if stats == nil {
		return callDiagnosticsStats{}
	}

	return callDiagnosticsStats{
		DurationSec:         maxInt(stats.DurationSec, 0),
		LocalCandidates:     maxInt(stats.LocalCandidates, 0),
		RemoteCandidates:    maxInt(stats.RemoteCandidates, 0),
		ICEConnectionState:  normalizeDiagnosticsToken(stats.ICEConnectionState, 32),
		PeerConnectionState: normalizeDiagnosticsToken(stats.PeerConnectionState, 32),
	}
}

func sanitizeDiagnosticsMetadata(input map[string]interface{}) map[string]interface{} {
	if len(input) == 0 {
		return nil
	}

	result := make(map[string]interface{}, len(input))
	count := 0
	for key, value := range input {
		if count >= 12 {
			break
		}
		normalizedKey := normalizeDiagnosticsToken(key, 32)
		if normalizedKey == "" {
			continue
		}

		switch typed := value.(type) {
		case string:
			trimmed := trimToMax(typed, 120)
			if trimmed == "" {
				continue
			}
			result[normalizedKey] = trimmed
		case bool:
			result[normalizedKey] = typed
		case float64:
			result[normalizedKey] = typed
		case float32:
			result[normalizedKey] = typed
		case int:
			result[normalizedKey] = typed
		case int32:
			result[normalizedKey] = typed
		case int64:
			result[normalizedKey] = typed
		case uint:
			result[normalizedKey] = typed
		case uint32:
			result[normalizedKey] = typed
		case uint64:
			result[normalizedKey] = typed
		default:
			continue
		}
		count++
	}

	if len(result) == 0 {
		return nil
	}
	return result
}

func normalizeDiagnosticsToken(value string, maxLen int) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return ""
	}

	normalized := strings.Builder{}
	lastUnderscore := false
	for _, r := range trimmed {
		isLetter := r >= 'a' && r <= 'z'
		isDigit := r >= '0' && r <= '9'
		if isLetter || isDigit {
			normalized.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			normalized.WriteRune('_')
			lastUnderscore = true
		}
	}

	value = strings.Trim(normalized.String(), "_")
	if maxLen > 0 && len(value) > maxLen {
		value = strings.Trim(value[:maxLen], "_")
	}
	return value
}

func normalizeDiagnosticsSeverity(value string) string {
	switch normalizeDiagnosticsToken(value, 16) {
	case "critical", "error", "warning", "info":
		return normalizeDiagnosticsToken(value, 16)
	default:
		return "info"
	}
}

func normalizeDiagnosticsMode(value string) string {
	switch normalizeDiagnosticsToken(value, 16) {
	case "p2p", "room", "sfu":
		return normalizeDiagnosticsToken(value, 16)
	default:
		return "unknown"
	}
}

func normalizeDiagnosticsPlatform(value string) string {
	switch normalizeDiagnosticsToken(value, 16) {
	case "ios", "android", "web", "server":
		return normalizeDiagnosticsToken(value, 16)
	default:
		return "unknown"
	}
}

func normalizeDiagnosticsNetworkType(value string) string {
	switch normalizeDiagnosticsToken(value, 24) {
	case "wifi", "cellular", "ethernet", "vpn", "unknown":
		return normalizeDiagnosticsToken(value, 24)
	default:
		return "unknown"
	}
}

func normalizeDiagnosticsDirection(value string) string {
	switch normalizeDiagnosticsToken(value, 16) {
	case "incoming", "outgoing":
		return normalizeDiagnosticsToken(value, 16)
	default:
		return "unknown"
	}
}

func trimToMax(value string, maxLen int) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if maxLen > 0 && len(trimmed) > maxLen {
		return strings.TrimSpace(trimmed[:maxLen])
	}
	return trimmed
}
