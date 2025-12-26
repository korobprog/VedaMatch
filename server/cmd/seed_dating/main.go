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

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
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
	// uploadsDir := "uploads/dating"

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
				"https://images.unsplash.com/photo-1608932931398-80f38fc81740?auto=format&fit=crop&q=80&w=1080",
				"https://images.unsplash.com/photo-1689258077068-75eb291e503b?auto=format&fit=crop&q=80&w=1080",
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
				"https://images.unsplash.com/photo-1618622127587-3261f2b2f553?auto=format&fit=crop&q=80&w=1080",
				"https://images.unsplash.com/photo-1725375176342-b317caad2a68?auto=format&fit=crop&q=80&w=1080",
			},
		},
		{
			User: models.User{
				KarmicName:        "Arjun Sharma",
				SpiritualName:     "Arjuna Das",
				Email:             "arjuna@example.com",
				Password:          string(password),
				Gender:            "Male",
				Country:           "India",
				City:              "New Delhi",
				Identity:          "Devotee",
				Diet:              "Vegetarian",
				Madh:              "Gaudiya Vaishnava (ISKCON)",
				Mentor:            "Radhanath Swami",
				Dob:               "1988-03-12",
				Bio:               "Software engineer dedicated to Bhakti. Enjoys deep philosophical discussions.",
				Interests:         "Coding, Philosophy, Kirtan, Yoga",
				DatingEnabled:     true,
				IsProfileComplete: true,
			},
			Photos: []string{
				"https://images.unsplash.com/photo-1618816566992-b5e08d3c02f9?auto=format&fit=crop&q=80&w=1080",
				"https://images.unsplash.com/photo-1617746652974-0be48cd984d1?auto=format&fit=crop&q=80&w=1080",
			},
		},
		{
			User: models.User{
				KarmicName:        "Sarah Jenkins",
				SpiritualName:     "Saraswati Devi",
				Email:             "saraswati@example.com",
				Password:          string(password),
				Gender:            "Female",
				Country:           "UK",
				City:              "London",
				Identity:          "Devotee",
				Diet:              "Vegetarian",
				Madh:              "Gaudiya Vaishnava (ISKCON)",
				Mentor:            "Jayapataka Swami",
				Dob:               "1992-11-05",
				Bio:               "Artist and teacher. Seeking someone to share a life of service and devotion.",
				Interests:         "Art, Education, Deity Worship, Nature",
				DatingEnabled:     true,
				IsProfileComplete: true,
			},
			Photos: []string{
				"https://images.unsplash.com/photo-1686699429240-3b7c20e1f60b?auto=format&fit=crop&q=80&w=1080",
				"https://images.unsplash.com/photo-1590955256683-73dbde9ca653?auto=format&fit=crop&q=80&w=1080",
			},
		},
		{
			User: models.User{
				KarmicName:        "Maria Garcia",
				SpiritualName:     "Mohini Dasi",
				Email:             "mohini@example.com",
				Password:          string(password),
				Gender:            "Female",
				Country:           "Spain",
				City:              "Madrid",
				Identity:          "Devotee",
				Diet:              "Vegan",
				Madh:              "Gaudiya Vaishnava (ISKCON)",
				Mentor:            "Bhakti Chaitanya Swami",
				Dob:               "1994-07-22",
				Bio:               "Yoga instructor and nutritionist. Loves traveling to holy places.",
				Interests:         "Yoga, Nutrition, Pilgrimage, Photography",
				DatingEnabled:     true,
				IsProfileComplete: true,
			},
			Photos: []string{
				"https://images.unsplash.com/photo-1656568726647-9092bf2b5640?auto=format&fit=crop&q=80&w=1080",
				"https://images.unsplash.com/photo-1618007032300-cb3239bf2fed?auto=format&fit=crop&q=80&w=1080",
			},
		},
	}

	// User to Local Photo mapping
	userPhotos := map[string][]string{
		"madhava@example.com":   {"stock_0.jpg", "stock_1.jpg"},
		"lalita@example.com":    {"stock_2.jpg", "stock_3.jpg"},
		"arjuna@example.com":    {"stock_4.jpg", "stock_5.jpg"},
		"saraswati@example.com": {"stock_6.jpg", "stock_7.jpg"},
		"mohini@example.com":    {"stock_8.jpg", "stock_9.jpg"},
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

		// Process Photos from mapping
		photos, ok := userPhotos[u.Email]
		if !ok {
			continue
		}

		for i, fileName := range photos {
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
			} else {
				fmt.Printf("Photo %s already exists in DB for user %d\n", dbUrl, u.ID)
			}
		}
	}

	fmt.Println("Seeding completed at", time.Now().Format(time.RFC822))
}
