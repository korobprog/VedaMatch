package main

import (
	"fmt"
	"math/rand"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
)

var madhs = []string{
	"Brahma-Madhva-Gaudiya",
	"Sri Sampradaya (Ramanuja)",
	"Brahma Sampradaya (Madhvacharya)",
	"Rudra Sampradaya (Vishnuswami)",
	"Kumara Sampradaya (Nimbarka)",
	"Other",
}

var yogas = []string{
	"Bhakti",
	"Hatha",
	"Jnana",
	"Karma",
	"Ashtanga",
	"Kriya",
	"Other",
}

var gunas = []string{
	"Sattva (Goodness)",
	"Rajas (Passion)",
	"Tamas (Ignorance)",
	"Transcendental",
}

func main() {
	fmt.Println("Loading .env...")
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found (using defaults/env vars)")
	}

	fmt.Println("Connecting to database...")
	database.Connect()

	// Auto-migrate to ensure columns exist
	database.DB.AutoMigrate(&models.User{})

	var users []models.User
	result := database.DB.Find(&users)
	if result.Error != nil {
		fmt.Printf("Error finding users: %v\n", result.Error)
		return
	}

	rand.Seed(time.Now().UnixNano())

	fmt.Printf("Updating %d users...\n", len(users))
	for _, u := range users {
		// Only update if missing or just force update all for testing distribution
		updated := false

		if u.Madh == "" || true {
			u.Madh = madhs[rand.Intn(len(madhs))]
			updated = true
		}
		if u.YogaStyle == "" || true {
			u.YogaStyle = yogas[rand.Intn(len(yogas))]
			updated = true
		}
		if u.Guna == "" || true {
			u.Guna = gunas[rand.Intn(len(gunas))]
			updated = true
		}

		// Ensure profile is complete/dating enabled for testing
		if u.Role != "admin" {
			u.DatingEnabled = true
			u.IsProfileComplete = true
			updated = true
		}

		if updated {
			if err := database.DB.Save(&u).Error; err != nil {
				fmt.Printf("Failed to update user %d: %v\n", u.ID, err)
			} else {
				fmt.Printf("Updated User %d: %s | %s | %s\n", u.ID, u.Madh, u.YogaStyle, u.Guna)
			}
		}
	}
	fmt.Println("Done updating users.")
}
