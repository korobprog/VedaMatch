package main

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Root of the project where .env is
	godotenv.Load(".env")

	database.Connect()

	email := os.Getenv("SUPERADMIN_EMAIL")
	password := os.Getenv("SUPERADMIN_PASSWORD")

	if email == "" || password == "" {
		log.Fatal("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env")
	}

	fmt.Printf("Resetting admin for: %s\n", email)

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	var user models.User
	result := database.DB.Where("email = ?", email).First(&user)

	if result.Error == nil {
		fmt.Printf("User found (ID: %d). Updating to superadmin...\n", user.ID)
		database.DB.Model(&user).Updates(map[string]interface{}{
			"role":                "superadmin",
			"password":            string(hashedPassword),
			"is_profile_complete": true,
		})
	} else {
		fmt.Println("User not found. Creating new superadmin...")
		user = models.User{
			Email:             email,
			Password:          string(hashedPassword),
			Role:              "superadmin",
			KarmicName:        "Super",
			SpiritualName:     "Admin",
			IsProfileComplete: true,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			log.Fatalf("Failed to create admin: %v", err)
		}
	}

	fmt.Println("Admin reset successful! Try logging in now.")
}
