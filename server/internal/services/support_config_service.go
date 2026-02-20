package services

import (
	"fmt"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
)

type SupportConfig struct {
	Enabled                     bool   `json:"enabled"`
	ProjectID                   int    `json:"projectId"`
	DefaultAmount               int    `json:"defaultAmount"`
	CooldownHours               int    `json:"cooldownHours"`
	PlatformContributionEnabled bool   `json:"platformContributionEnabled"`
	PlatformContributionDefault int    `json:"platformContributionDefault"`
	ConfigSource                string `json:"configSource"`
	Service                     string `json:"service"`
}

func normalizeSupportService(raw string) string {
	s := strings.TrimSpace(strings.ToLower(raw))
	if s == "" {
		return "rooms"
	}
	switch s {
	case "rooms", "seva", "travel", "multimedia", "other":
		return s
	default:
		return "other"
	}
}

func getSystemSettingValue(key string) (string, bool) {
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

func parseSupportBoolWithDefault(value string, fallback bool) bool {
	if value == "" {
		return fallback
	}
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "on", "yes":
		return true
	case "0", "false", "off", "no":
		return false
	default:
		return fallback
	}
}

func parseSupportIntWithDefault(value string, fallback int, min int) int {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	if parsed < min {
		return fallback
	}
	return parsed
}

func SupportFundAccountCode(service string) string {
	switch normalizeSupportService(service) {
	case "rooms":
		return "rooms_fund"
	case "seva":
		return "seva_fund"
	case "multimedia":
		return "multimedia_fund"
	default:
		return "platform_fund"
	}
}

func ResolveSupportConfig(service string) SupportConfig {
	svc := normalizeSupportService(service)
	cfg := SupportConfig{
		Enabled:                     true,
		DefaultAmount:               20,
		CooldownHours:               24,
		PlatformContributionEnabled: true,
		PlatformContributionDefault: 5,
		ConfigSource:                "none",
		Service:                     svc,
	}

	prefix := fmt.Sprintf("support.%s", svc)
	if v, ok := getSystemSettingValue(prefix + ".enabled"); ok {
		cfg.Enabled = parseSupportBoolWithDefault(v, cfg.Enabled)
		cfg.ConfigSource = "db"
	}
	if v, ok := getSystemSettingValue(prefix + ".project_id"); ok {
		cfg.ProjectID = parseSupportIntWithDefault(v, 0, 1)
		cfg.ConfigSource = "db"
	}
	if v, ok := getSystemSettingValue(prefix + ".default_amount"); ok {
		cfg.DefaultAmount = parseSupportIntWithDefault(v, cfg.DefaultAmount, 1)
		cfg.ConfigSource = "db"
	}
	if v, ok := getSystemSettingValue(prefix + ".cooldown_hours"); ok {
		cfg.CooldownHours = parseSupportIntWithDefault(v, cfg.CooldownHours, 1)
		cfg.ConfigSource = "db"
	}
	if v, ok := getSystemSettingValue(prefix + ".platform_contribution_enabled"); ok {
		cfg.PlatformContributionEnabled = parseSupportBoolWithDefault(v, cfg.PlatformContributionEnabled)
		cfg.ConfigSource = "db"
	}
	if v, ok := getSystemSettingValue(prefix + ".platform_contribution_default"); ok {
		cfg.PlatformContributionDefault = parseSupportIntWithDefault(v, cfg.PlatformContributionDefault, 0)
		cfg.ConfigSource = "db"
	}

	if cfg.ConfigSource != "db" {
		envPrefix := strings.ToUpper(svc) + "_SUPPORT_"
		cfg.Enabled = parseSupportBoolWithDefault(os.Getenv(envPrefix+"ENABLED"), cfg.Enabled)
		cfg.ProjectID = parseSupportIntWithDefault(os.Getenv(envPrefix+"PROJECT_ID"), cfg.ProjectID, 1)
		cfg.DefaultAmount = parseSupportIntWithDefault(os.Getenv(envPrefix+"DEFAULT_AMOUNT"), cfg.DefaultAmount, 1)
		cfg.CooldownHours = parseSupportIntWithDefault(os.Getenv(envPrefix+"PROMPT_COOLDOWN_HOURS"), cfg.CooldownHours, 1)
		cfg.PlatformContributionEnabled = parseSupportBoolWithDefault(os.Getenv(envPrefix+"PLATFORM_CONTRIBUTION_ENABLED"), cfg.PlatformContributionEnabled)
		cfg.PlatformContributionDefault = parseSupportIntWithDefault(os.Getenv(envPrefix+"PLATFORM_CONTRIBUTION_DEFAULT"), cfg.PlatformContributionDefault, 0)
		if strings.TrimSpace(os.Getenv(envPrefix+"PROJECT_ID")) != "" {
			cfg.ConfigSource = "env"
		}
	}

	if cfg.ProjectID <= 0 {
		cfg.Enabled = false
		if cfg.ConfigSource == "none" {
			cfg.ConfigSource = "none"
		}
	}

	return cfg
}
