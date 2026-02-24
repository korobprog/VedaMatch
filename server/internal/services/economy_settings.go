package services

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
)

const (
	defaultWelcomeBonusLKM = 50
	minWelcomeBonusLKM     = 0
	maxWelcomeBonusLKM     = 100000
)

func parseBoundedInt(raw string, fallback int, min int, max int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

// GetWelcomeBonusLKM returns current Welcome Bonus amount from system settings.
// Priority: DB setting -> environment variable -> default.
func GetWelcomeBonusLKM() int {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "WELCOME_BONUS_LKM").First(&setting).Error; err == nil {
		return parseBoundedInt(setting.Value, defaultWelcomeBonusLKM, minWelcomeBonusLKM, maxWelcomeBonusLKM)
	}

	if envValue := strings.TrimSpace(os.Getenv("WELCOME_BONUS_LKM")); envValue != "" {
		return parseBoundedInt(envValue, defaultWelcomeBonusLKM, minWelcomeBonusLKM, maxWelcomeBonusLKM)
	}

	return defaultWelcomeBonusLKM
}
