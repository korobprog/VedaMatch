package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	// Create a test "looking" ad
	price := 3000.0
	ad := models.Ad{
		UserID:       3, // Arjuna Das
		AdType:       models.AdTypeLooking,
		Category:     models.AdCategoryYogaWellness,
		Title:        "API Test - Looking for Yoga Teacher",
		Description:  "I am looking for an experienced yoga teacher for private lessons. Preferably in the morning hours, 2-3 times per week. Must have at least 5 years of experience.",
		Price:        &price,
		Currency:     "RUB",
		IsNegotiable: true,
		IsFree:       false,
		City:         "Moscow",
		ShowProfile:  true,
		Status:       models.AdStatusActive,
		ExpiresAt:    time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
	}

	if err := database.DB.Create(&ad).Error; err != nil {
		log.Printf("Failed to create ad: %v", err)
		return
	}

	// Add S3 photo
	photo := models.AdPhoto{
		AdID:     ad.ID,
		PhotoURL: "https://s3.twcstorage.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/ads/u2_1767866363.jpg",
		Position: 0,
	}
	database.DB.Create(&photo)

	log.Printf("Created test ad ID %d: %s (type: %s)", ad.ID, ad.Title, ad.AdType)
}
