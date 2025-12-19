package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	// Initialize DB
	database.Connect()

	ragService := services.NewRAGService()

	testUsers := []models.User{
		{
			KarmicName:    "Alex Petrov",
			SpiritualName: "Arjuna Das",
			Email:         "arjuna@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "Russia",
			City:          "Moscow",
			Identity:      "Devotee",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Prabhupada",
			Dob:           "1990-01-01",
		},
		{
			KarmicName:    "Sita Devi",
			SpiritualName: "Sita Gopi",
			Email:         "sita@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "India",
			City:          "Vrindavan",
			Identity:      "Practitioner",
			Diet:          "Vegan",
			Madh:          "Gaudiya",
			Mentor:        "Guru",
			Dob:           "1995-05-10",
		},
		{
			KarmicName:    "John Smith",
			SpiritualName: "Janaka Muni",
			Email:         "john@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "USA",
			City:          "Los Angeles",
			Identity:      "Student",
			Diet:          "Lacto-Vegetarian",
			Madh:          "Brahma",
			Mentor:        "Teacher",
			Dob:           "1985-11-20",
		},
	}

	for _, u := range testUsers {
		// Hash password
		hashed, _ := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		u.Password = string(hashed)
		u.IsProfileComplete = true

		// Check if exists
		var existing models.User
		if err := database.DB.Where("email = ?", u.Email).First(&existing).Error; err == nil {
			log.Printf("User %s already exists, skipping...", u.Email)
			continue
		}

		if err := database.DB.Create(&u).Error; err != nil {
			log.Printf("Failed to create user %s: %v", u.Email, err)
			continue
		}

		log.Printf("Created user: %s. Uploading to RAG...", u.Email)
		fileID, err := ragService.UploadProfile(u)
		if err != nil {
			log.Printf("RAG Error for %s: %v", u.Email, err)
		} else {
			u.RagFileID = fileID
			database.DB.Model(&u).Update("rag_file_id", fileID)
			log.Printf("RAG Success for %s: %s", u.Email, fileID)
		}
	}

	log.Println("Seeding completed!")
}
