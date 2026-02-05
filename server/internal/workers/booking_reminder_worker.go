package workers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"time"
)

// StartBookingReminderWorker starts a background worker that sends reminders for upcoming bookings
func StartBookingReminderWorker() {
	// Register task in scheduler (runs every 15 minutes)
	services.GlobalScheduler.RegisterTask("booking_reminders", 15, func() {
		checkReminders()
	})
	log.Println("[Worker] Booking Reminder Worker started (interval: 15m)")
}

func checkReminders() {
	now := time.Now()
	
	// 1. Check for 24h reminders
	// Bookings scheduled between 23.5h and 24h from now
	sendReminders(
		now.Add(23*time.Hour+45*time.Minute),
		now.Add(24*time.Hour),
		"reminder_24h",
		1440, // 24h in minutes
	)

	// 2. Check for 1h reminders
	// Bookings scheduled between 45m and 60m from now
	sendReminders(
		now.Add(45*time.Minute),
		now.Add(60*time.Minute),
		"reminder_1h",
		60, // 1h in minutes
	)
}

func sendReminders(startTime, endTime time.Time, reminderType string, minutesBefore int) {
	var bookings []models.ServiceBooking
	
	query := database.DB.Preload("Service").
		Where("status = ? AND scheduled_at >= ? AND scheduled_at <= ?", 
			models.BookingStatusConfirmed, startTime, endTime)

	if reminderType == "reminder_24h" {
		query = query.Where("reminder_24h_sent = ?", false)
	} else {
		query = query.Where("reminder_sent = ?", false)
	}

	err := query.Find(&bookings).Error

	if err != nil {
		log.Printf("[Worker] Error fetching bookings for reminders: %v", err)
		return
	}

	push := services.GetPushService()
	for _, b := range bookings {
		// Send to Client
		push.SendBookingReminder(b.ClientID, b.ID, b.Service.Title, b.ScheduledAt, minutesBefore)
		
		// Send to Provider
		push.SendBookingReminder(b.Service.OwnerID, b.ID, b.Service.Title, b.ScheduledAt, minutesBefore)
		
		// Mark as sent
		if reminderType == "reminder_24h" {
			database.DB.Model(&b).Update("reminder_24h_sent", true)
		} else {
			database.DB.Model(&b).Update("reminder_sent", true)
		}
		
		log.Printf("[Worker] Sent %s reminder for booking %d (Service: %s)", reminderType, b.ID, b.Service.Title)
	}
}
