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
)

func main() {
	f, _ := os.Create("seed_log.txt")
	defer f.Close()
	log.SetOutput(f)

	log.Println("Starting seeding script...")

	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using defaults")
	}

	database.Connect()
	log.Println("Connected to database")

	photos := []string{
		"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1520333789090-1afc82db536a?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000&auto=format&fit=crop",
		"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&auto=format&fit=crop",
	}

	var users []models.User
	// Find ANY users, let's force dating_enabled = true for test if needed
	database.DB.Limit(5).Find(&users)
	log.Printf("Found %d users\n", len(users))

	if len(users) == 0 {
		log.Println("No users found in database.")
		return
	}

	uploadsDir := "./uploads/media"
	os.MkdirAll(uploadsDir, 0755)

	for i, user := range users {
		user.DatingEnabled = true
		user.IsProfileComplete = true

		photoURL := photos[i%len(photos)]
		filename := fmt.Sprintf("test_u%d_%d.jpg", user.ID, time.Now().Unix())
		localPath := filepath.Join(uploadsDir, filename)

		log.Printf("Downloading photo for user %s (ID %d) from %s\n", user.SpiritualName, user.ID, photoURL)

		err := downloadFile(photoURL, localPath)
		if err != nil {
			log.Printf("Download failed: %v\n", err)
			continue
		}

		dbPath := "/uploads/media/" + filename
		user.AvatarURL = dbPath
		database.DB.Save(&user)
		log.Printf("Set avatar for %s to %s\n", user.SpiritualName, dbPath)

		// Add to Gallery
		database.DB.Create(&models.Media{
			UserID:    user.ID,
			URL:       dbPath,
			IsProfile: true,
		})

		// Add multiple extras
		for extraIdx := 1; extraIdx <= 3; extraIdx++ {
			extraURL := photos[(i+extraIdx)%len(photos)]
			extraFilename := fmt.Sprintf("test_extra%d_u%d_%d.jpg", extraIdx, user.ID, time.Now().Unix())
			extraLocalPath := filepath.Join(uploadsDir, extraFilename)
			if err := downloadFile(extraURL, extraLocalPath); err == nil {
				database.DB.Create(&models.Media{
					UserID: user.ID,
					URL:    "/uploads/media/" + extraFilename,
				})
				log.Printf("Added extra photo %d for %s\n", extraIdx, user.SpiritualName)
			}
		}
	}
	log.Println("Seeding complete")
}

func downloadFile(url string, filepath string) error {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}
