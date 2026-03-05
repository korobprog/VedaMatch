package services

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"
)

type MarketFeeConfig struct {
	Enabled        bool       `json:"enabled"`
	PercentBps     int        `json:"percentBps"`
	CapLkm         int        `json:"capLkm"`
	EffectiveFrom  *time.Time `json:"effectiveFrom,omitempty"`
	RolloutPercent int        `json:"rolloutPercent"`
	ConfigSource   string     `json:"configSource"`
}

func getMarketFeeSystemSettingValue(key string) (string, bool) {
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

func parseMarketFeeBoolWithDefault(value string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "on", "yes":
		return true
	case "0", "false", "off", "no":
		return false
	default:
		return fallback
	}
}

func parseMarketFeeIntWithDefault(value string, fallback int, min int, max int) int {
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

func parseMarketFeeTime(value string) *time.Time {
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

func ResolveMarketFeeConfig() MarketFeeConfig {
	cfg := MarketFeeConfig{
		Enabled:        true,
		PercentBps:     800,
		CapLkm:         300,
		EffectiveFrom:  nil,
		RolloutPercent: 100,
		ConfigSource:   "none",
	}

	if v, ok := getMarketFeeSystemSettingValue("MARKET_PLATFORM_FEE_ENABLED"); ok {
		cfg.Enabled = parseMarketFeeBoolWithDefault(v, cfg.Enabled)
		cfg.ConfigSource = "db"
	}
	if v, ok := getMarketFeeSystemSettingValue("MARKET_PLATFORM_FEE_PERCENT_BPS"); ok {
		cfg.PercentBps = parseMarketFeeIntWithDefault(v, cfg.PercentBps, 0, 10000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getMarketFeeSystemSettingValue("MARKET_PLATFORM_FEE_CAP_LKM"); ok {
		cfg.CapLkm = parseMarketFeeIntWithDefault(v, cfg.CapLkm, 0, 1000000000)
		cfg.ConfigSource = "db"
	}
	if v, ok := getMarketFeeSystemSettingValue("MARKET_PLATFORM_FEE_EFFECTIVE_FROM"); ok {
		cfg.EffectiveFrom = parseMarketFeeTime(v)
		cfg.ConfigSource = "db"
	}
	if v, ok := getMarketFeeSystemSettingValue("MARKET_PLATFORM_FEE_ROLLOUT_PERCENT"); ok {
		cfg.RolloutPercent = parseMarketFeeIntWithDefault(v, cfg.RolloutPercent, 0, 100)
		cfg.ConfigSource = "db"
	}

	if cfg.ConfigSource != "db" {
		cfg.Enabled = parseMarketFeeBoolWithDefault(os.Getenv("MARKET_PLATFORM_FEE_ENABLED"), cfg.Enabled)
		cfg.PercentBps = parseMarketFeeIntWithDefault(os.Getenv("MARKET_PLATFORM_FEE_PERCENT_BPS"), cfg.PercentBps, 0, 10000)
		cfg.CapLkm = parseMarketFeeIntWithDefault(os.Getenv("MARKET_PLATFORM_FEE_CAP_LKM"), cfg.CapLkm, 0, 1000000000)
		if raw := strings.TrimSpace(os.Getenv("MARKET_PLATFORM_FEE_EFFECTIVE_FROM")); raw != "" {
			cfg.EffectiveFrom = parseMarketFeeTime(raw)
		}
		cfg.RolloutPercent = parseMarketFeeIntWithDefault(os.Getenv("MARKET_PLATFORM_FEE_ROLLOUT_PERCENT"), cfg.RolloutPercent, 0, 100)
		if strings.TrimSpace(os.Getenv("MARKET_PLATFORM_FEE_ENABLED")) != "" ||
			strings.TrimSpace(os.Getenv("MARKET_PLATFORM_FEE_PERCENT_BPS")) != "" ||
			strings.TrimSpace(os.Getenv("MARKET_PLATFORM_FEE_CAP_LKM")) != "" ||
			strings.TrimSpace(os.Getenv("MARKET_PLATFORM_FEE_EFFECTIVE_FROM")) != "" ||
			strings.TrimSpace(os.Getenv("MARKET_PLATFORM_FEE_ROLLOUT_PERCENT")) != "" {
			cfg.ConfigSource = "env"
		}
	}

	return cfg
}

func IsMarketFeeEnabledForUserAt(userID uint, now time.Time) bool {
	cfg := ResolveMarketFeeConfig()
	if !cfg.Enabled {
		return false
	}
	if cfg.RolloutPercent <= 0 {
		return false
	}
	if cfg.RolloutPercent < 100 {
		bucket := int(userID % 100)
		if bucket >= cfg.RolloutPercent {
			return false
		}
	}
	if cfg.EffectiveFrom != nil && now.UTC().Before(cfg.EffectiveFrom.UTC()) {
		return false
	}
	return true
}

func CalculateMarketPlatformFee(totalLkm int, cfg MarketFeeConfig) (feeAmount int, merchantPayout int) {
	if totalLkm <= 0 || !cfg.Enabled || cfg.PercentBps <= 0 {
		return 0, maxInt(0, totalLkm)
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
