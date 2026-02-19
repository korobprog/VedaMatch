package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type SFUConfig struct {
	Provider          string
	Enabled           bool
	RequireMembership bool

	LiveKitAPIKey    string
	LiveKitAPISecret string
	LiveKitWSURL     string

	RoomTokenTTL time.Duration

	MaxParticipants       int
	MaxSubscriptions      int
	VideoPreset           string
	DynacastEnabled       bool
	AdaptiveStreamEnabled bool
	SimulcastEnabled      bool
}

func parseIntEnv(key string, defaultValue int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return defaultValue
	}
	return parsed
}

func parseDurationMinutesEnv(key string, defaultMinutes int) time.Duration {
	minutes := parseIntEnv(key, defaultMinutes)
	return time.Duration(minutes) * time.Minute
}

func LoadSFUConfig() SFUConfig {
	provider := strings.TrimSpace(strings.ToLower(os.Getenv("ROOM_SFU_PROVIDER")))
	if provider == "" {
		provider = "livekit"
	}
	return SFUConfig{
		Provider:              provider,
		Enabled:               RoomSFUEnabled(),
		RequireMembership:     RoomSFURequireMembership(),
		LiveKitAPIKey:         strings.TrimSpace(os.Getenv("LIVEKIT_API_KEY")),
		LiveKitAPISecret:      strings.TrimSpace(os.Getenv("LIVEKIT_API_SECRET")),
		LiveKitWSURL:          strings.TrimSpace(os.Getenv("LIVEKIT_WS_URL")),
		RoomTokenTTL:          parseDurationMinutesEnv("ROOM_SFU_TOKEN_TTL_MINUTES", 15),
		MaxParticipants:       parseIntEnv("ROOM_SFU_MAX_PARTICIPANTS", 50),
		MaxSubscriptions:      parseIntEnv("ROOM_SFU_MAX_SUBSCRIPTIONS", 9),
		VideoPreset:           strings.TrimSpace(firstNonEmpty(os.Getenv("ROOM_SFU_VIDEO_PRESET"), "balanced")),
		DynacastEnabled:       FlagEnabled("ROOM_SFU_DYNACAST_ENABLED", true),
		AdaptiveStreamEnabled: FlagEnabled("ROOM_SFU_ADAPTIVE_STREAM_ENABLED", true),
		SimulcastEnabled:      FlagEnabled("ROOM_SFU_SIMULCAST_ENABLED", true),
	}
}

func (c SFUConfig) ValidateForTokenIssue() error {
	if !c.Enabled {
		return fmt.Errorf("room_sfu_disabled")
	}
	if c.Provider != "livekit" {
		return fmt.Errorf("unsupported_room_sfu_provider")
	}
	if c.LiveKitAPIKey == "" || c.LiveKitAPISecret == "" || c.LiveKitWSURL == "" {
		return fmt.Errorf("livekit_credentials_not_configured")
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
