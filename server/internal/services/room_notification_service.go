package services

import (
	"fmt"
	"log"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

// StartRoomNotificationScheduler starts the background job for room notifications
func StartRoomNotificationScheduler() {
	log.Println("[RoomNotify] Scheduler started")
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			checkAndSendRoomNotifications()
		}
	}()
}

func checkAndSendRoomNotifications() {
	var rooms []models.Room
	now := time.Now()

	// Fetch rooms that haven't sent notification and have a start time set
	err := database.DB.Where("notification_sent = ? AND start_time != ?", false, "").Find(&rooms).Error
	if err != nil {
		log.Printf("[RoomNotify] Error fetching rooms: %v", err)
		return
	}

	pushService := GetPushService()

	for _, room := range rooms {
		// Try parsing different common ISO formats
		var startTime time.Time
		var parseErr error

		formats := []string{
			time.RFC3339,
			"2006-01-02T15:04:05.000Z",
			"2006-01-02 15:04:05",
			"2006-01-02T15:04:05Z",
		}

		for _, format := range formats {
			startTime, parseErr = time.Parse(format, room.StartTime)
			if parseErr == nil {
				break
			}
		}

		if parseErr != nil {
			// Skip if we can't parse the time
			continue
		}

		diff := startTime.Sub(now)

		// If start time is within 15 minutes (and more than 0 minutes - i.e. in future)
		if diff > 0 && diff <= 16*time.Minute {
			sendRoomNotification(room, pushService)
		} else if diff < 0 && diff > -24*time.Hour {
			// If it's already passed but within the last 24h and not notified,
			// just mark as notified to stop checking it
			database.DB.Model(&room).Update("notification_sent", true)
		}
	}
}

func sendRoomNotification(room models.Room, pushService *PushNotificationService) {
	var members []models.RoomMember
	if err := database.DB.Where("room_id = ?", room.ID).Find(&members).Error; err != nil {
		return
	}

	var userIDs []uint
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
	}

	if len(userIDs) == 0 {
		database.DB.Model(&room).Update("notification_sent", true)
		return
	}

	var tokens []string
	database.DB.Table("users").Where("id IN ? AND push_token != ?", userIDs, "").Pluck("push_token", &tokens)

	if len(tokens) == 0 {
		database.DB.Model(&room).Update("notification_sent", true)
		return
	}

	message := PushMessage{
		Title: "🌅 Совместное чтение",
		Body:  fmt.Sprintf("Чтение в комнате \"%s\" начнется через 15 минут!", room.Name),
		Data: map[string]string{
			"type":   "room_start",
			"roomId": fmt.Sprintf("%d", room.ID),
		},
	}

	// We use go routine to not block the main scheduler loop
	go func(r models.Room, tks []string) {
		err := pushService.SendToTokens(tks, message)
		if err == nil {
			database.DB.Model(&r).Update("notification_sent", true)
			log.Printf("[RoomNotify] Sent notification for room %d to %d users", r.ID, len(tks))
		} else {
			log.Printf("[RoomNotify] Error sending notifications for room %d: %v", r.ID, err)
		}
	}(room, tokens)
}
