package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	var users []models.User
	if err := database.DB.Order("id DESC").Limit(15).Find(&users).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Println("Recent Users with Location:")
	fmt.Println("ID\tKarmic Name\t\tSpiritual Name\t\tEmail\t\t\tCountry\tCity")
	fmt.Println("------------------------------------------------------------------------------------------------------------------------------------------------")
	for _, u := range users {
		fmt.Printf("%d\t%s\t\t%s\t\t%s\t%s\t%s\n", u.ID, u.KarmicName, u.SpiritualName, u.Email, u.Country, u.City)
	}
}
