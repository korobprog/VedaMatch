package main

import (
	"fmt"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("Loading .env...")
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found")
	} else {
		fmt.Println(".env loaded successfully")
	}

	fmt.Println("Connecting to database...")
	database.Connect()
	fmt.Println("Connected to database successfully")

	var users []models.User
	result := database.DB.Find(&users)
	if result.Error != nil {
		fmt.Printf("Error finding users: %v\n", result.Error)
		return
	}

	fmt.Printf("Total users found in database: %d\n", len(users))
	for _, u := range users {
		fmt.Printf("ID: %d, Email: '%s', Role: '%s', Name: '%s', Dating: %v\n", u.ID, u.Email, u.Role, u.SpiritualName, u.DatingEnabled)
	}

	superEmail := os.Getenv("SUPERADMIN_EMAIL")
	fmt.Printf("Environment SUPERADMIN_EMAIL: '%s'\n", superEmail)
}
