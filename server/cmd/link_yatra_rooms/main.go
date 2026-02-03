package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

func main() {
	// Initialize database connection
	database.Connect()

	log.Println("Linking existing Yatra chat rooms...")

	// Find all yatras with chat rooms
	var yatras []models.Yatra
	if err := database.DB.Where("chat_room_id IS NOT NULL").Find(&yatras).Error; err != nil {
		log.Fatalf("Failed to fetch yatras: %v", err)
	}

	log.Printf("Found %d yatras with chat rooms", len(yatras))

	for _, yatra := range yatras {
		if yatra.ChatRoomID == nil {
			continue
		}

		// Update room with yatraId
		yatraID := yatra.ID
		result := database.DB.Model(&models.Room{}).
			Where("id = ?", *yatra.ChatRoomID).
			Update("yatra_id", yatraID)

		if result.Error != nil {
			log.Printf("Failed to update room %d: %v", *yatra.ChatRoomID, result.Error)
		} else if result.RowsAffected > 0 {
			log.Printf("Linked room %d to yatra %d (%s)", *yatra.ChatRoomID, yatraID, yatra.Title)
		}
	}

	log.Println("Done! Yatra chat rooms are now properly linked.")
}
