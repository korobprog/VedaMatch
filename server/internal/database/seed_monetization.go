package database

import (
	"strconv"
	"strings"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

func SeedMonetizationConfigs() {
	if DB == nil {
		return
	}
	_ = SeedMonetizationConfigsWithDB(DB)
}

func SeedMonetizationConfigsWithDB(db *gorm.DB) error {
	if db == nil {
		return nil
	}

	proPlans := []models.ProPlanConfig{
		{
			Code:      "pro_7d",
			Days:      7,
			PriceLkm:  getSeedSettingInt(db, "PRO_PLAN_7D_LKM", 99),
			Title:     "PRO 7 дней",
			Badge:     "Старт",
			IsEnabled: true,
		},
		{
			Code:      "pro_30d",
			Days:      30,
			PriceLkm:  getSeedSettingInt(db, "PRO_PLAN_30D_LKM", 299),
			Title:     "PRO 30 дней",
			Badge:     "Популярный",
			IsPopular: true,
			IsEnabled: true,
		},
		{
			Code:      "pro_90d",
			Days:      90,
			PriceLkm:  getSeedSettingInt(db, "PRO_PLAN_90D_LKM", 799),
			Title:     "PRO 90 дней",
			Badge:     "Выгодно",
			IsEnabled: true,
		},
	}
	for _, plan := range proPlans {
		if err := db.Where("code = ?", plan.Code).
			FirstOrCreate(&models.ProPlanConfig{}, plan).Error; err != nil {
			return err
		}
	}

	if err := db.Where("singleton_key = ?", "default").FirstOrCreate(&models.ChatTranscribeBillingConfigModel{}, models.ChatTranscribeBillingConfigModel{
		SingletonKey:            "default",
		IsEnabled:               getSeedSettingBool(db, "CHAT_TRANSCRIBE_BILLING_ENABLED", true),
		FreeMinPerWeek:          getSeedSettingInt(db, "CHAT_TRANSCRIBE_FREE_MIN_PER_WEEK", 5),
		PricePerMinLkm:          getSeedSettingInt(db, "CHAT_TRANSCRIBE_PRICE_PER_MIN_LKM", 3),
		LongAudioThresholdMin:   getSeedSettingInt(db, "CHAT_TRANSCRIBE_LONG_AUDIO_THRESHOLD_MIN", 5),
		LongAudioPricePerMinLkm: getSeedSettingInt(db, "CHAT_TRANSCRIBE_LONG_AUDIO_PRICE_PER_MIN_LKM", 2),
		MinChargeLkm:            getSeedSettingInt(db, "CHAT_TRANSCRIBE_MIN_CHARGE_LKM", 1),
	}).Error; err != nil {
		return err
	}

	if err := db.Where("singleton_key = ?", "default").FirstOrCreate(&models.YatraBillingConfigModel{}, models.YatraBillingConfigModel{
		SingletonKey: "default",
		IsEnabled:    getSeedSettingBool(db, "YATRA_BILLING_ENABLED", false),
		DailyFeeLkm:  getSeedSettingInt(db, "YATRA_DAILY_FEE_LKM", 10),
	}).Error; err != nil {
		return err
	}

	if err := db.Where("singleton_key = ?", "default").FirstOrCreate(&models.ServiceFeeConfigModel{}, models.ServiceFeeConfigModel{
		SingletonKey:   "default",
		IsEnabled:      getSeedSettingBool(db, "SERVICES_PLATFORM_FEE_ENABLED", true),
		PercentBps:     getSeedSettingInt(db, "SERVICES_PLATFORM_FEE_PERCENT_BPS", 800),
		CapLkm:         getSeedSettingInt(db, "SERVICES_PLATFORM_FEE_CAP_LKM", 300),
		ApplyNoShow:    getSeedSettingBool(db, "SERVICES_PLATFORM_FEE_APPLY_NO_SHOW", true),
		RolloutPercent: getSeedSettingInt(db, "SERVICES_PLATFORM_FEE_ROLLOUT_PERCENT", 100),
	}).Error; err != nil {
		return err
	}

	if err := db.Where("singleton_key = ?", "default").FirstOrCreate(&models.MarketFeeConfigModel{}, models.MarketFeeConfigModel{
		SingletonKey:   "default",
		IsEnabled:      getSeedSettingBool(db, "MARKET_PLATFORM_FEE_ENABLED", true),
		PercentBps:     getSeedSettingInt(db, "MARKET_PLATFORM_FEE_PERCENT_BPS", 800),
		CapLkm:         getSeedSettingInt(db, "MARKET_PLATFORM_FEE_CAP_LKM", 300),
		RolloutPercent: getSeedSettingInt(db, "MARKET_PLATFORM_FEE_ROLLOUT_PERCENT", 100),
	}).Error; err != nil {
		return err
	}

	if err := db.Where("singleton_key = ?", "default").FirstOrCreate(&models.CafeFeeConfigModel{}, models.CafeFeeConfigModel{
		SingletonKey:   "default",
		IsEnabled:      getSeedSettingBool(db, "CAFE_PLATFORM_FEE_ENABLED", false),
		PercentBps:     getSeedSettingInt(db, "CAFE_PLATFORM_FEE_PERCENT_BPS", 800),
		CapLkm:         getSeedSettingInt(db, "CAFE_PLATFORM_FEE_CAP_LKM", 250),
		MinOrderLkm:    getSeedSettingInt(db, "CAFE_PLATFORM_FEE_MIN_ORDER_LKM", 100),
		RolloutPercent: getSeedSettingInt(db, "CAFE_PLATFORM_FEE_ROLLOUT_PERCENT", 0),
	}).Error; err != nil {
		return err
	}

	return nil
}

func getSeedSettingValue(db *gorm.DB, key string) string {
	var setting models.SystemSetting
	if err := db.Select("value").Where("key = ?", key).First(&setting).Error; err != nil {
		return ""
	}
	return strings.TrimSpace(setting.Value)
}

func getSeedSettingInt(db *gorm.DB, key string, fallback int) int {
	value := getSeedSettingValue(db, key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getSeedSettingBool(db *gorm.DB, key string, fallback bool) bool {
	value := strings.ToLower(getSeedSettingValue(db, key))
	switch value {
	case "1", "true", "on", "yes":
		return true
	case "0", "false", "off", "no":
		return false
	default:
		return fallback
	}
}
