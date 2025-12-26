package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	database.Connect()

	faces := []string{"/uploads/media/face1.png", "/uploads/media/face2.png", "/uploads/media/face3.png"}

	var users []models.User
	database.DB.Limit(3).Find(&users)

	for i, user := range users {
		faceURL := faces[i%len(faces)]

		// Update user profile
		database.DB.Model(&user).Updates(map[string]interface{}{
			"avatar_url":          faceURL,
			"dating_enabled":      true,
			"is_profile_complete": true,
		})

		// Add to gallery if not present
		var count int64
		database.DB.Model(&models.Media{}).Where("user_id = ? AND url = ?", user.ID, faceURL).Count(&count)
		if count == 0 {
			database.DB.Create(&models.Media{
				UserID:    user.ID,
				URL:       faceURL,
				IsProfile: true,
			})
		}

		log.Printf("Assigned %s to user %s\n", faceURL, user.SpiritualName)
	}
}
