package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func downloadFile(url string, destPath string) error {
	// Create dir if not exists
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	// Check if already exists
	if _, err := os.Stat(destPath); err == nil {
		return nil // already downloaded
	}

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	password, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)

	// Ensure upload dir
	uploadsDir := "uploads/dating"

	usersData := []struct {
		User   models.User
		Photos []string // URLs to download
	}{
		{
			User: models.User{
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
			Photos: []string{
				"https://randomuser.me/api/portraits/men/32.jpg",
				"https://randomuser.me/api/portraits/men/33.jpg",
				"https://randomuser.me/api/portraits/men/34.jpg",
			},
		},
		{
			User: models.User{
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
			Photos: []string{
				"https://randomuser.me/api/portraits/women/44.jpg",
				"https://randomuser.me/api/portraits/women/45.jpg",
				"https://randomuser.me/api/portraits/women/46.jpg",
			},
		},
	}

	for _, item := range usersData {
		var u models.User
		// Create or Get User
		if err := database.DB.Where("email = ?", item.User.Email).First(&u).Error; err != nil {
			u = item.User
			if err := database.DB.Create(&u).Error; err != nil {
				fmt.Printf("Error creating user %s: %v\n", u.Email, err)
				continue
			}
			fmt.Printf("Created test user: %s (ID: %d)\n", u.Email, u.ID)
		} else {
			fmt.Printf("User %s already exists (ID: %d)\n", u.Email, u.ID)
		}

		// Process Photos
		for i, photoUrl := range item.Photos {
			fileName := fmt.Sprintf("user_%d_photo_%d.jpg", u.ID, i)
			localPath := filepath.Join(uploadsDir, fileName)

			if err := downloadFile(photoUrl, localPath); err != nil {
				fmt.Printf("Failed to download photo %s: %v\n", photoUrl, err)
				continue
			}

			// Add to Media table if not exists
			dbUrl := fmt.Sprintf("/uploads/dating/%s", fileName)
			var existingMedia models.Media
			if err := database.DB.Where("user_id = ? AND url = ?", u.ID, dbUrl).First(&existingMedia).Error; err != nil {
				isProfile := (i == 0) // First photo is profile
				media := models.Media{
					UserID:    u.ID,
					URL:       dbUrl,
					IsProfile: isProfile,
				}
				database.DB.Create(&media)
				fmt.Printf("Added photo for user %d: %s\n", u.ID, dbUrl)

				if isProfile {
					database.DB.Model(&u).Update("avatar_url", dbUrl)
				}
			}
		}
	}

	fmt.Println("Seeding completed at", time.Now().Format(time.RFC822))
}
