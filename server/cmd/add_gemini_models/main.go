package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	database.Connect()

	// Add Gemini models
	geminiModels := []models.AiModel{
		{
			ModelID:          "gemini-2.5-flash",
			Name:             "Gemini 2.5 Flash",
			Provider:         "Google",
			Category:         "text",
			IsEnabled:        true,
			IsNew:            true,
			LastSyncDate:     time.Now(),
			LastTestStatus:   "",
			IsRecommended:    true,
			LatencyTier:      "fast",
			IntelligenceTier: "standard",
		},
		{
			ModelID:          "gemini-2.0-flash-exp",
			Name:             "Gemini 2.0 Flash (Exp)",
			Provider:         "Google",
			Category:         "text",
			IsEnabled:        true,
			IsNew:            true,
			LastSyncDate:     time.Now(),
			LastTestStatus:   "",
			IsRecommended:    false,
			LatencyTier:      "fast",
			IntelligenceTier: "standard",
		},
		{
			ModelID:          "gemini-1.5-pro",
			Name:             "Gemini 1.5 Pro",
			Provider:         "Google",
			Category:         "text",
			IsEnabled:        true,
			IsNew:            true,
			LastSyncDate:     time.Now(),
			LastTestStatus:   "",
			IsRecommended:    false,
			LatencyTier:      "medium",
			IntelligenceTier: "smart",
		},
	}

	for _, m := range geminiModels {
		var existing models.AiModel
		if err := database.DB.Where("model_id = ?", m.ModelID).First(&existing).Error; err != nil {
			// Not found, create it
			if err := database.DB.Create(&m).Error; err != nil {
				log.Printf("Error creating model %s: %v", m.ModelID, err)
			} else {
				log.Printf("Created model: %s (%s)", m.ModelID, m.Name)
			}
		} else {
			log.Printf("Model %s already exists, skipping.", m.ModelID)
		}
	}

	log.Println("Done adding Gemini models.")
}
