package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "API_OPEN_AI").First(&setting).Error; err != nil {
		log.Printf("Error fetching setting: %v\n", err)
	} else {
		fmt.Printf("Current DB Value: %s\n", setting.Value)
	}
}
