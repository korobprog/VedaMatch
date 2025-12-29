package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: .env file not found, creating models without specific env vars")
	}

	// Connect to DB
	database.Connect()

	pollinationsModel := models.AiModel{
		ModelID:              "flux-pollinations", // Unique ID
		Name:                 "Flux (Pollinations)",
		Provider:             "PollinationsAI",
		Category:             "image",
		IsEnabled:            true,
		IsNew:                true,
		LastSyncDate:         time.Now(),
		IsRecommended:        true,
		LatencyTier:          "fast",
		IntelligenceTier:     "standard",
		IsAutoRoutingEnabled: true,
	}

	var existing models.AiModel
	if err := database.DB.Where("model_id = ?", pollinationsModel.ModelID).First(&existing).Error; err != nil {
		// Not found, create
		if err := database.DB.Create(&pollinationsModel).Error; err != nil {
			log.Fatalf("Error creating model: %v", err)
		}
		log.Printf("Successfully created model: %s", pollinationsModel.Name)
	} else {
		// Update
		database.DB.Model(&existing).Updates(map[string]interface{}{
			"is_enabled":              true,
			"is_recommended":          true,
			"is_auto_routing_enabled": true,
			"provider":                "PollinationsAI",
			"latency_tier":            "fast",
		})
		log.Printf("Model %s updated", pollinationsModel.Name)
	}
}
