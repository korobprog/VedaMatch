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
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

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
		{
			KarmicName:    "Maria Garcia",
			SpiritualName: "Mirabai Devi",
			Email:         "mirabai@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "Spain",
			City:          "Madrid",
			Identity:      "Devotee",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Guru",
			Dob:           "1988-03-15",
		},
		{
			KarmicName:    "Yuki Tanaka",
			SpiritualName: "Yamuna Das",
			Email:         "yamuna@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "Japan",
			City:          "Tokyo",
			Identity:      "Practitioner",
			Diet:          "Vegan",
			Madh:          "Gaudiya",
			Mentor:        "Teacher",
			Dob:           "1992-08-22",
		},
		{
			KarmicName:    "Anna Kowalski",
			SpiritualName: "Ananda Devi",
			Email:         "ananda@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "Poland",
			City:          "Krakow",
			Identity:      "Student",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Prabhupada",
			Dob:           "1996-12-05",
		},
		{
			KarmicName:    "Hans Mueller",
			SpiritualName: "Hari Das",
			Email:         "hari@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "Germany",
			City:          "Berlin",
			Identity:      "Devotee",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Guru",
			Dob:           "1987-07-18",
		},
		{
			KarmicName:    "Elena Rossi",
			SpiritualName: "Ekalavya Devi",
			Email:         "ekalavya@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "Italy",
			City:          "Rome",
			Identity:      "Practitioner",
			Diet:          "Vegan",
			Madh:          "Gaudiya",
			Mentor:        "Teacher",
			Dob:           "1993-04-30",
		},
		{
			KarmicName:    "James Wilson",
			SpiritualName: "Jaya Das",
			Email:         "jaya@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "Canada",
			City:          "Toronto",
			Identity:      "Student",
			Diet:          "Lacto-Vegetarian",
			Madh:          "Brahma",
			Mentor:        "Prabhupada",
			Dob:           "1991-09-12",
		},
		{
			KarmicName:    "Olga Ivanova",
			SpiritualName: "Radha Devi",
			Email:         "radha@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "Ukraine",
			City:          "Kyiv",
			Identity:      "Devotee",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Guru",
			Dob:           "1994-06-25",
		},

		{
			KarmicName:    "Pedro Silva",
			SpiritualName: "Partha Das",
			Email:         "partha@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "Brazil",
			City:          "Rio de Janeiro",
			Identity:      "Seeker",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Prabhupada",
			Dob:           "1998-02-14",
			Interests:     "Kirtan, Music",
		},
		{
			KarmicName:    "Sarah Jones",
			SpiritualName: "Satyabhama Devi",
			Email:         "satyabhama@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "Australia",
			City:          "Sydney",
			Identity:      "Devotee",
			Diet:          "Vegan",
			Madh:          "Gaudiya",
			Mentor:        "Guru",
			Dob:           "1990-11-30",
			Interests:     "Cooking, Deity Worship",
		},
		{
			KarmicName:    "Jean Dupont",
			SpiritualName: "Jagannath Das",
			Email:         "jagannath@test.com",
			Password:      "password123",
			Gender:        "Male",
			Country:       "France",
			City:          "Paris",
			Identity:      "Student",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Teacher",
			Dob:           "1985-05-20",
			Interests:     "Philosophy, Reading",
		},
		{
			KarmicName:    "Li Wei",
			SpiritualName: "Lila Devi",
			Email:         "lila@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "China",
			City:          "Beijing",
			Identity:      "Practitioner",
			Diet:          "Vegan",
			Madh:          "Brahma",
			Mentor:        "Prabhupada",
			Dob:           "1993-09-10",
			Interests:     "Yoga, Meditation",
		},
		{
			KarmicName:    "Amina Al-Fayed",
			SpiritualName: "Amrita Devi",
			Email:         "amrita@test.com",
			Password:      "password123",
			Gender:        "Female",
			Country:       "Egypt",
			City:          "Cairo",
			Identity:      "Seeker",
			Diet:          "Vegetarian",
			Madh:          "Gaudiya",
			Mentor:        "Guru",
			Dob:           "1997-04-05",
			Interests:     "Meditation, Service",
		},
	}

	for _, u := range testUsers {
		hashed, _ := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		u.Password = string(hashed)
		u.IsProfileComplete = true

		var existing models.User
		if err := database.DB.Where("email = ?", u.Email).First(&existing).Error; err == nil {
			log.Printf("User %s already exists, skipping...", u.Email)
			continue
		}

		if err := database.DB.Create(&u).Error; err != nil {
			log.Printf("Failed to create user %s: %v", u.Email, err)
			continue
		}

		log.Printf("Created user: %s (%s, %s). Uploading to RAG...", u.Email, u.Country, u.City)
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
