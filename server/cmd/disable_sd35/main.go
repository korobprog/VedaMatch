package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

func main() {
	database.Connect()

	// Disable AutoRouting for sd-3.5-large
	err := database.DB.Model(&models.AiModel{}).Where("model_id = ?", "sd-3.5-large").
		Update("is_auto_routing_enabled", false).Error

	if err != nil {
		log.Fatalf("Failed to update model: %v", err)
	}

	log.Println("Successfully disabled AutoRouting for sd-3.5-large")

	// Verify Flux status
	var flux models.AiModel
	database.DB.Where("model_id = ?", "flux").First(&flux)
	log.Printf("Flux status: Enabled=%v, AutoRouting=%v", flux.IsEnabled, flux.IsAutoRoutingEnabled)
}
