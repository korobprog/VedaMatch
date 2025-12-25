package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	model := models.AiModel{
		ModelID:        "gpt5",
		Name:           "GPT-5 (Perplexity)",
		Provider:       "Perplexity",
		Category:       "text",
		IsEnabled:      true,
		IsNew:          true,
		LastSyncDate:   time.Now(),
		LastTestStatus: "online",
		IsRecommended:  true,
	}

	if err := database.DB.Where("\"ModelID\" = ?", "gpt5").First(&models.AiModel{}).Error; err != nil {
		if err := database.DB.Create(&model).Error; err != nil {
			log.Fatalf("Error creating model: %v", err)
		}
		fmt.Println("Created model: gpt5")
	} else {
		fmt.Println("Model gpt5 already exists")
	}
}
