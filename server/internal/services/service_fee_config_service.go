package services

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
)

type ServiceFeeConfig struct {
	Enabled        bool   `json:"enabled"`
	PercentBps     int    `json:"percentBps"`
	CapLkm         int    `json:"capLkm"`
	ApplyNoShow    bool   `json:"applyNoShow"`
	RolloutPercent int    `json:"rolloutPercent"`
	ConfigSource   string `json:"configSource"`
}

func getServiceFeeSystemSettingValue(key string) (string, bool) {
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

func parseServiceFeeBoolWithDefault(value string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "on", "yes":
		return true
	case "0", "false", "off", "no":
		return false
	default:
		return fallback
	}
}

func parseServiceFeeIntWithDefault(value string, fallback int, min int, max int) int {
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

func ResolveServiceFeeConfig() ServiceFeeConfig {
	cfg := ServiceFeeConfig{
		Enabled:        true,
		PercentBps:     800,
		CapLkm:         300,
		ApplyNoShow:    true,
		RolloutPercent: 100,
		ConfigSource:   "none",
	}

	if v, ok := getServiceFeeSystemSettingValue("SERVICES_PLATFORM_FEE_ENABLED"); ok {
		cfg.Enabled = parseServiceFeeBoolWithDefault(v, cfg.Enabled)
		cfg.ConfigSource = "db"
	}
	if v, ok := getServiceFeeSystemSettingValue("SERVICES_PLATFORM_FEE_PERCENT_BPS"); ok {
		cfg.PercentBps = parseServiceFeeIntWithDefault(v, cfg.PercentBps, 0, 10000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getServiceFeeSystemSettingValue("SERVICES_PLATFORM_FEE_CAP_LKM"); ok {
		cfg.CapLkm = parseServiceFeeIntWithDefault(v, cfg.CapLkm, 0, 1000000000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getServiceFeeSystemSettingValue("SERVICES_PLATFORM_FEE_APPLY_NO_SHOW"); ok {
		cfg.ApplyNoShow = parseServiceFeeBoolWithDefault(v, cfg.ApplyNoShow)
		cfg.ConfigSource = "db"
	}
	if v, ok := getServiceFeeSystemSettingValue("SERVICES_PLATFORM_FEE_ROLLOUT_PERCENT"); ok {
		cfg.RolloutPercent = parseServiceFeeIntWithDefault(v, cfg.RolloutPercent, 0, 100)
		cfg.ConfigSource = "db"
	}

	if cfg.ConfigSource != "db" {
		cfg.Enabled = parseServiceFeeBoolWithDefault(os.Getenv("SERVICES_PLATFORM_FEE_ENABLED"), cfg.Enabled)
		cfg.PercentBps = parseServiceFeeIntWithDefault(os.Getenv("SERVICES_PLATFORM_FEE_PERCENT_BPS"), cfg.PercentBps, 0, 10000)
		cfg.CapLkm = parseServiceFeeIntWithDefault(os.Getenv("SERVICES_PLATFORM_FEE_CAP_LKM"), cfg.CapLkm, 0, 1000000000)
		cfg.ApplyNoShow = parseServiceFeeBoolWithDefault(os.Getenv("SERVICES_PLATFORM_FEE_APPLY_NO_SHOW"), cfg.ApplyNoShow)
		cfg.RolloutPercent = parseServiceFeeIntWithDefault(os.Getenv("SERVICES_PLATFORM_FEE_ROLLOUT_PERCENT"), cfg.RolloutPercent, 0, 100)
		if strings.TrimSpace(os.Getenv("SERVICES_PLATFORM_FEE_ENABLED")) != "" ||
			strings.TrimSpace(os.Getenv("SERVICES_PLATFORM_FEE_PERCENT_BPS")) != "" ||
			strings.TrimSpace(os.Getenv("SERVICES_PLATFORM_FEE_CAP_LKM")) != "" ||
			strings.TrimSpace(os.Getenv("SERVICES_PLATFORM_FEE_APPLY_NO_SHOW")) != "" ||
			strings.TrimSpace(os.Getenv("SERVICES_PLATFORM_FEE_ROLLOUT_PERCENT")) != "" {
			cfg.ConfigSource = "env"
		}
	}

	return cfg
}

func IsServiceFeeEnabledForUser(userID uint) bool {
	cfg := ResolveServiceFeeConfig()
	if !cfg.Enabled {
		return false
	}
	if cfg.RolloutPercent <= 0 {
		return false
	}
	if cfg.RolloutPercent >= 100 {
		return true
	}
	bucket := int(userID % 100)
	return bucket < cfg.RolloutPercent
}

func CalculateServicePlatformFee(pricePaid int, cfg ServiceFeeConfig) (feeAmount int, providerNet int) {
	if pricePaid <= 0 || !cfg.Enabled || cfg.PercentBps <= 0 {
		return 0, maxInt(0, pricePaid)
	}
	feeAmount = (pricePaid * cfg.PercentBps) / 10000
	if cfg.CapLkm > 0 && feeAmount > cfg.CapLkm {
		feeAmount = cfg.CapLkm
	}
	if feeAmount < 0 {
		feeAmount = 0
	}
	if feeAmount > pricePaid {
		feeAmount = pricePaid
	}
	providerNet = pricePaid - feeAmount
	if providerNet < 0 {
		providerNet = 0
	}
	return feeAmount, providerNet
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
