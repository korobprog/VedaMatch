package config

import (
	"os"
	"strings"
)

func FlagEnabled(key string, defaultValue bool) bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if raw == "" {
		return defaultValue
	}

	switch raw {
	case "1", "true", "on", "yes", "enabled":
		return true
	case "0", "false", "off", "no", "disabled":
		return false
	default:
		return defaultValue
	}
}

func AuthRefreshV1Enabled() bool {
	return FlagEnabled("AUTH_REFRESH_V1", true)
}

func ChatHistoryV2Enabled() bool {
	return FlagEnabled("CHAT_HISTORY_V2", false)
}

func RAGLiteMarketEnabled() bool {
	return FlagEnabled("RAG_LITE_MARKET", false)
}

func PushP2PEnabled() bool {
	return FlagEnabled("PUSH_P2P", false)
}
