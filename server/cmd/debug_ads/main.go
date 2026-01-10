package main

import (
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load("../.env")
	database.Connect()

	var adCount int64
	database.DB.Model(&models.Ad{}).Count(&adCount)
	fmt.Printf("Ads count: %d\n", adCount)

	var photoCount int64
	database.DB.Model(&models.AdPhoto{}).Count(&photoCount)
	fmt.Printf("Photos count: %d\n", photoCount)

	var ads []models.Ad
	database.DB.Preload("Photos").Find(&ads)
	for _, ad := range ads {
		fmt.Printf("Ad ID %d: %s, Photos: %d\n", ad.ID, ad.Title, len(ad.Photos))
		for _, p := range ad.Photos {
			fmt.Printf("  - %s\n", p.PhotoURL)
		}
	}
}
