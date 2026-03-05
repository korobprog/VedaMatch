package services

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
)

type ChatTranscribeBillingConfig struct {
	Enabled                 bool   `json:"enabled"`
	FreeMinPerWeek          int    `json:"freeMinPerWeek"`
	PricePerMinLKM          int    `json:"pricePerMinLkm"`
	LongAudioThresholdMin   int    `json:"longAudioThresholdMin"`
	LongAudioPricePerMinLKM int    `json:"longAudioPricePerMinLkm"`
	MinChargeLKM            int    `json:"minChargeLkm"`
	ConfigSource            string `json:"configSource"`
}

const (
	chatTranscribeBillingEnabledKey            = "CHAT_TRANSCRIBE_BILLING_ENABLED"
	chatTranscribeFreeMinPerWeekKey            = "CHAT_TRANSCRIBE_FREE_MIN_PER_WEEK"
	chatTranscribePricePerMinLKMKey            = "CHAT_TRANSCRIBE_PRICE_PER_MIN_LKM"
	chatTranscribeLongAudioThresholdMinKey     = "CHAT_TRANSCRIBE_LONG_AUDIO_THRESHOLD_MIN"
	chatTranscribeLongAudioPricePerMinLKMKey   = "CHAT_TRANSCRIBE_LONG_AUDIO_PRICE_PER_MIN_LKM"
	chatTranscribeMinChargeLKMKey              = "CHAT_TRANSCRIBE_MIN_CHARGE_LKM"
	defaultChatTranscribeFreeMinPerWeek        = 5
	defaultChatTranscribePricePerMinLKM        = 3
	defaultChatTranscribeLongAudioThresholdMin = 5
	defaultChatTranscribeLongAudioPricePerMin  = 2
	defaultChatTranscribeMinChargeLKM          = 1
)

func getChatTranscribeSystemSettingValue(key string) (string, bool) {
	if database.DB == nil {
		return "", false
	}
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		return "", false
	}
	value := strings.TrimSpace(setting.Value)
	if value == "" {
		return "", false
	}
	return value, true
}

func parseChatTranscribeBoolWithDefault(value string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "on", "yes":
		return true
	case "0", "false", "off", "no":
		return false
	default:
		return fallback
	}
}

func parseChatTranscribeIntWithDefault(value string, fallback int, min int, max int) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	if parsed < min {
		return fallback
	}
	if max >= min && parsed > max {
		return fallback
	}
	return parsed
}

func resolveChatTranscribeSettingOrEnv(key string) (value string, source string, ok bool) {
	if v, exists := getChatTranscribeSystemSettingValue(key); exists {
		return v, "db", true
	}
	if env := strings.TrimSpace(os.Getenv(key)); env != "" {
		return env, "env", true
	}
	return "", "", false
}

// ResolveChatTranscribeBillingConfig loads billing config with priority:
// system_settings -> environment -> code defaults.
func ResolveChatTranscribeBillingConfig() ChatTranscribeBillingConfig {
	cfg := ChatTranscribeBillingConfig{
		Enabled:                 true,
		FreeMinPerWeek:          defaultChatTranscribeFreeMinPerWeek,
		PricePerMinLKM:          defaultChatTranscribePricePerMinLKM,
		LongAudioThresholdMin:   defaultChatTranscribeLongAudioThresholdMin,
		LongAudioPricePerMinLKM: defaultChatTranscribeLongAudioPricePerMin,
		MinChargeLKM:            defaultChatTranscribeMinChargeLKM,
		ConfigSource:            "default",
	}

	if v, source, ok := resolveChatTranscribeSettingOrEnv(chatTranscribeBillingEnabledKey); ok {
		cfg.Enabled = parseChatTranscribeBoolWithDefault(v, cfg.Enabled)
		cfg.ConfigSource = source
	}
	if v, source, ok := resolveChatTranscribeSettingOrEnv(chatTranscribeFreeMinPerWeekKey); ok {
		cfg.FreeMinPerWeek = parseChatTranscribeIntWithDefault(v, cfg.FreeMinPerWeek, 0, 10080)
		if cfg.ConfigSource == "default" || source == "db" {
			cfg.ConfigSource = source
		}
	}
	if v, source, ok := resolveChatTranscribeSettingOrEnv(chatTranscribePricePerMinLKMKey); ok {
		cfg.PricePerMinLKM = parseChatTranscribeIntWithDefault(v, cfg.PricePerMinLKM, 0, 1000000)
		if cfg.ConfigSource == "default" || source == "db" {
			cfg.ConfigSource = source
		}
	}
	if v, source, ok := resolveChatTranscribeSettingOrEnv(chatTranscribeLongAudioThresholdMinKey); ok {
		cfg.LongAudioThresholdMin = parseChatTranscribeIntWithDefault(v, cfg.LongAudioThresholdMin, 1, 10080)
		if cfg.ConfigSource == "default" || source == "db" {
			cfg.ConfigSource = source
		}
	}
	if v, source, ok := resolveChatTranscribeSettingOrEnv(chatTranscribeLongAudioPricePerMinLKMKey); ok {
		cfg.LongAudioPricePerMinLKM = parseChatTranscribeIntWithDefault(v, cfg.LongAudioPricePerMinLKM, 0, 1000000)
		if cfg.ConfigSource == "default" || source == "db" {
			cfg.ConfigSource = source
		}
	}
	if v, source, ok := resolveChatTranscribeSettingOrEnv(chatTranscribeMinChargeLKMKey); ok {
		cfg.MinChargeLKM = parseChatTranscribeIntWithDefault(v, cfg.MinChargeLKM, 0, 1000000)
		if cfg.ConfigSource == "default" || source == "db" {
			cfg.ConfigSource = source
		}
	}

	return cfg
}
