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

	// Add working text models
	workingModels := []models.AiModel{
		{
			ModelID:        "gpt4o",
			Name:           "GPT-4o (OpenAI)",
			Provider:       "OpenAI",
			Category:       "text",
			IsEnabled:      true,
			IsNew:          false,
			LastSyncDate:   time.Now(),
			LastTestStatus: "online",
			IsRecommended:  true,
		},
		{
			ModelID:        "gpt-4-turbo",
			Name:           "GPT-4 Turbo",
			Provider:       "OpenAI",
			Category:       "text",
			IsEnabled:      true,
			IsNew:          false,
			LastSyncDate:   time.Now(),
			LastTestStatus: "online",
			IsRecommended:  false,
		},
		{
			ModelID:        "sonar-pro",
			Name:           "Sonar Pro (Perplexity)",
			Provider:       "Perplexity",
			Category:       "text",
			IsEnabled:      true,
			IsNew:          false,
			LastSyncDate:   time.Now(),
			LastTestStatus: "online",
			IsRecommended:  true,
		},
		{
			ModelID:        "claude-3-5-sonnet",
			Name:           "Claude 3.5 Sonnet",
			Provider:       "Anthropic",
			Category:       "text",
			IsEnabled:      true,
			IsNew:          false,
			LastSyncDate:   time.Now(),
			LastTestStatus: "online",
			IsRecommended:  false,
		},
	}

	for _, m := range workingModels {
		var existing models.AiModel
		if err := database.DB.Where("model_id = ?", m.ModelID).First(&existing).Error; err != nil {
			// Not found, create it
			if err := database.DB.Create(&m).Error; err != nil {
				log.Printf("Error creating model %s: %v", m.ModelID, err)
			} else {
				log.Printf("Created model: %s", m.ModelID)
			}
		} else {
			log.Printf("Model %s already exists, skipping.", m.ModelID)
		}
	}

	log.Println("Done adding text models.")
}
