package services

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"
)

type CafeFeeConfig struct {
	Enabled        bool       `json:"enabled"`
	PercentBps     int        `json:"percentBps"`
	CapLkm         int        `json:"capLkm"`
	MinOrderLkm    int        `json:"minOrderLkm"`
	EffectiveFrom  *time.Time `json:"effectiveFrom,omitempty"`
	RolloutPercent int        `json:"rolloutPercent"`
	ConfigSource   string     `json:"configSource"`
}

func getCafeFeeSystemSettingValue(key string) (string, bool) {
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

func parseCafeFeeBoolWithDefault(value string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "on", "yes":
		return true
	case "0", "false", "off", "no":
		return false
	default:
		return fallback
	}
}

func parseCafeFeeIntWithDefault(value string, fallback int, min int, max int) int {
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

func parseCafeFeeTime(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil
	}
	utc := parsed.UTC()
	return &utc
}

func ResolveCafeFeeConfig() CafeFeeConfig {
	cfg := CafeFeeConfig{
		Enabled:        false,
		PercentBps:     800,
		CapLkm:         250,
		MinOrderLkm:    100,
		EffectiveFrom:  nil,
		RolloutPercent: 0,
		ConfigSource:   "none",
	}

	if v, ok := getCafeFeeSystemSettingValue("CAFE_PLATFORM_FEE_ENABLED"); ok {
		cfg.Enabled = parseCafeFeeBoolWithDefault(v, cfg.Enabled)
		cfg.ConfigSource = "db"
	}
	if v, ok := getCafeFeeSystemSettingValue("CAFE_PLATFORM_FEE_PERCENT_BPS"); ok {
		cfg.PercentBps = parseCafeFeeIntWithDefault(v, cfg.PercentBps, 0, 10000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getCafeFeeSystemSettingValue("CAFE_PLATFORM_FEE_CAP_LKM"); ok {
		cfg.CapLkm = parseCafeFeeIntWithDefault(v, cfg.CapLkm, 0, 1000000000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getCafeFeeSystemSettingValue("CAFE_PLATFORM_FEE_MIN_ORDER_LKM"); ok {
		cfg.MinOrderLkm = parseCafeFeeIntWithDefault(v, cfg.MinOrderLkm, 0, 1000000000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getCafeFeeSystemSettingValue("CAFE_PLATFORM_FEE_EFFECTIVE_FROM"); ok {
		cfg.EffectiveFrom = parseCafeFeeTime(v)
		cfg.ConfigSource = "db"
	}
	if v, ok := getCafeFeeSystemSettingValue("CAFE_PLATFORM_FEE_ROLLOUT_PERCENT"); ok {
		cfg.RolloutPercent = parseCafeFeeIntWithDefault(v, cfg.RolloutPercent, 0, 100)
		cfg.ConfigSource = "db"
	}

	if cfg.ConfigSource != "db" {
		cfg.Enabled = parseCafeFeeBoolWithDefault(os.Getenv("CAFE_PLATFORM_FEE_ENABLED"), cfg.Enabled)
		cfg.PercentBps = parseCafeFeeIntWithDefault(os.Getenv("CAFE_PLATFORM_FEE_PERCENT_BPS"), cfg.PercentBps, 0, 10000)
		cfg.CapLkm = parseCafeFeeIntWithDefault(os.Getenv("CAFE_PLATFORM_FEE_CAP_LKM"), cfg.CapLkm, 0, 1000000000)
		cfg.MinOrderLkm = parseCafeFeeIntWithDefault(os.Getenv("CAFE_PLATFORM_FEE_MIN_ORDER_LKM"), cfg.MinOrderLkm, 0, 1000000000)
		if raw := strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_EFFECTIVE_FROM")); raw != "" {
			cfg.EffectiveFrom = parseCafeFeeTime(raw)
		}
		cfg.RolloutPercent = parseCafeFeeIntWithDefault(os.Getenv("CAFE_PLATFORM_FEE_ROLLOUT_PERCENT"), cfg.RolloutPercent, 0, 100)
		if strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_ENABLED")) != "" ||
			strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_PERCENT_BPS")) != "" ||
			strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_CAP_LKM")) != "" ||
			strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_MIN_ORDER_LKM")) != "" ||
			strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_EFFECTIVE_FROM")) != "" ||
			strings.TrimSpace(os.Getenv("CAFE_PLATFORM_FEE_ROLLOUT_PERCENT")) != "" {
			cfg.ConfigSource = "env"
		}
	}

	return cfg
}

func isCafeFeeRolloutEligible(userID uint, cfg CafeFeeConfig) bool {
	if cfg.RolloutPercent <= 0 {
		return false
	}
	if cfg.RolloutPercent >= 100 {
		return true
	}
	bucket := int(userID % 100)
	return bucket < cfg.RolloutPercent
}

func IsCafeFeeEnabledForUserAt(userID uint, now time.Time) bool {
	cfg := ResolveCafeFeeConfig()
	if !cfg.Enabled || !isCafeFeeRolloutEligible(userID, cfg) {
		return false
	}
	if cfg.EffectiveFrom != nil && now.UTC().Before(cfg.EffectiveFrom.UTC()) {
		return false
	}
	return true
}

func CalculateCafePlatformFee(totalLkm int, cfg CafeFeeConfig) (feeAmount int, merchantPayout int) {
	if totalLkm <= 0 || !cfg.Enabled || cfg.PercentBps <= 0 {
		return 0, maxInt(0, totalLkm)
	}
	if cfg.MinOrderLkm > 0 && totalLkm < cfg.MinOrderLkm {
		return 0, totalLkm
	}
	feeAmount = (totalLkm * cfg.PercentBps) / 10000
	if cfg.CapLkm > 0 && feeAmount > cfg.CapLkm {
		feeAmount = cfg.CapLkm
	}
	if feeAmount < 0 {
		feeAmount = 0
	}
	if feeAmount > totalLkm {
		feeAmount = totalLkm
	}
	merchantPayout = totalLkm - feeAmount
	if merchantPayout < 0 {
		merchantPayout = 0
	}
	return feeAmount, merchantPayout
}
