package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env from current directory or parent
	godotenv.Load("../../.env")
	godotenv.Load("../.env")
	godotenv.Load(".env")

	database.Connect()

	var admins []models.User
	err := database.DB.Where("role IN ?", []string{"admin", "superadmin"}).Find(&admins).Error
	if err != nil {
		log.Fatalf("Error fetching admins: %v", err)
	}

	fmt.Println("\n--- ADMIN USERS IN DATABASE ---")
	if len(admins) == 0 {
		fmt.Println("No admin users found!")
	}
	for _, a := range admins {
		fmt.Printf("ID: %d | Email: %s | Role: %s | Name: %s %s\n",
			a.ID, a.Email, a.Role, a.KarmicName, a.SpiritualName)
	}
	fmt.Println("-------------------------------\n")
}
