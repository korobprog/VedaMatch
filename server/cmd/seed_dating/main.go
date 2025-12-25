package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	password, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)

	users := []models.User{
		{
			KarmicName:        "Michael Smith",
			SpiritualName:     "Madhava Das",
			Email:             "madhava@example.com",
			Password:          string(password),
			Gender:            "Male",
			Country:           "USA",
			City:              "New York",
			Identity:          "Devotee",
			Diet:              "Vegetarian",
			Madh:              "Gaudiya Vaishnava (ISKCON)",
			Mentor:            "Srila Prabhupada",
			Dob:               "1985-06-15",
			Bio:               "Dedicated devotee seeking a partner for spiritual life and simple living.",
			Interests:         "Bhakti Yoga, Organic Gardening, Sanskrit",
			DatingEnabled:     true,
			IsProfileComplete: true,
		},
		{
			KarmicName:        "Elena Petrova",
			SpiritualName:     "Lalita Dasi",
			Email:             "lalita@example.com",
			Password:          string(password),
			Gender:            "Female",
			Country:           "Russia",
			City:              "Moscow",
			Identity:          "Devotee",
			Diet:              "Vegan",
			Madh:              "Gaudiya Vaishnava (ISKCON)",
			Mentor:            "Sivarama Swami",
			Dob:               "1990-09-20",
			Bio:               "Loves kirtan and cooking for deities. Looking for a conscious partner.",
			Interests:         "Kirtan, Ayurvedic Cooking, Spiritual Travel",
			DatingEnabled:     true,
			IsProfileComplete: true,
		},
	}

	for _, u := range users {
		var existing models.User
		if err := database.DB.Where("email = ?", u.Email).First(&existing).Error; err != nil {
			if err := database.DB.Create(&u).Error; err != nil {
				fmt.Printf("Error creating user %s: %v\n", u.Email, err)
			} else {
				fmt.Printf("Created test user: %s (ID: %d)\n", u.Email, u.ID)
			}
		} else {
			fmt.Printf("User %s already exists\n", u.Email)
		}
	}

	fmt.Println("Seeding completed at", time.Now().Format(time.RFC822))
}
