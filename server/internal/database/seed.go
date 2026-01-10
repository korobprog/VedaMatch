package database

import (
	"log"
	"rag-agent-server/internal/models"
	"time"
)

// SeedGeminiModels adds Gemini models if they don't exist
func SeedGeminiModels() {
	geminiModels := []models.AiModel{
		{
			ModelID:              "gemini-2.5-flash",
			Name:                 "Gemini 2.5 Flash",
			Provider:             "Google",
			Category:             "text",
			IsEnabled:            true,
			IsNew:                false,
			LastSyncDate:         time.Now(),
			IsRecommended:        true,
			LatencyTier:          "fast",
			IntelligenceTier:     "smart",
			IsAutoRoutingEnabled: true,
		},
		{
			ModelID:              "gemini-2.5-flash-lite",
			Name:                 "Gemini 2.5 Flash Lite",
			Provider:             "Google",
			Category:             "text",
			IsEnabled:            true,
			IsNew:                false,
			LastSyncDate:         time.Now(),
			IsRecommended:        false,
			LatencyTier:          "fast",
			IntelligenceTier:     "standard",
			IsAutoRoutingEnabled: true,
		},
	}

	for _, m := range geminiModels {
		var existing models.AiModel
		if err := DB.Where("model_id = ?", m.ModelID).First(&existing).Error; err != nil {
			// Not found, create it
			if err := DB.Create(&m).Error; err != nil {
				log.Printf("[Seed] Error creating model %s: %v", m.ModelID, err)
			} else {
				log.Printf("[Seed] Created Gemini model: %s", m.ModelID)
			}
		} else {
			// Model exists - ensure AutoRouting is enabled for Gemini
			if !existing.IsAutoRoutingEnabled || !existing.IsEnabled {
				DB.Model(&existing).Updates(map[string]interface{}{
					"is_enabled":              true,
					"is_auto_routing_enabled": true,
					"provider":                "Google",
				})
				log.Printf("[Seed] Updated Gemini model %s: AutoRouting enabled", m.ModelID)
			}
		}
	}
}

// SeedSystemSettings adds default system settings
func SeedSystemSettings() {
	settings := []models.SystemSetting{
		{
			Key:   "DEFAULT_ASTRO_MODEL",
			Value: "gemini-2.5-flash",
		},
		{
			Key:   "LM_GEMINI",
			Value: "", // User will fill this in admin panel or .env fallback will work
		},
		{
			Key:   "ROUTEWAY_API_KEY",
			Value: "", // Routeway.ai API key for unified LLM access
		},
		{
			Key:   "ROUTEWAY_API_URL",
			Value: "https://api.routeway.ai/v1/chat/completions",
		},
	}

	for _, s := range settings {
		var existing models.SystemSetting
		if err := DB.Where("key = ?", s.Key).First(&existing).Error; err != nil {
			DB.Create(&s)
			log.Printf("[Seed] Created system setting: %s", s.Key)
		}
	}
}
