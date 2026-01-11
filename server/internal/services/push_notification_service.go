package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// PushNotificationService handles sending push notifications
type PushNotificationService struct {
	db           *gorm.DB
	fcmServerKey string
	expoPushURL  string
	fcmURL       string
	httpClient   *http.Client
}

// PushMessage represents a push notification message
type PushMessage struct {
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Data     map[string]string `json:"data,omitempty"`
	ImageURL string            `json:"imageUrl,omitempty"`
}

// FCMMessage represents the FCM message format
type FCMMessage struct {
	To              string   `json:"to,omitempty"`
	RegistrationIDs []string `json:"registration_ids,omitempty"`
	Notification    struct {
		Title    string `json:"title"`
		Body     string `json:"body"`
		ImageURL string `json:"image,omitempty"`
	} `json:"notification"`
	Data map[string]string `json:"data,omitempty"`
}

// ExpoMessage represents the Expo Push notification format
type ExpoMessage struct {
	To    []string          `json:"to"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
	Sound string            `json:"sound,omitempty"`
	Badge int               `json:"badge,omitempty"`
}

// NewPushNotificationService creates a new push notification service
func NewPushNotificationService() *PushNotificationService {
	return &PushNotificationService{
		db:           database.DB,
		fcmServerKey: os.Getenv("FCM_SERVER_KEY"),
		expoPushURL:  "https://exp.host/--/api/v2/push/send",
		fcmURL:       "https://fcm.googleapis.com/fcm/send",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendToUser sends a push notification to a specific user
func (s *PushNotificationService) SendToUser(userID uint, message PushMessage) error {
	// Get user's push tokens
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// TODO: When push token field is added to User model, use it here
	// For now, just log
	log.Printf("[PUSH] Would send to user %d: %s", userID, message.Title)
	return nil
}

// SendToAll sends a push notification to all users
func (s *PushNotificationService) SendToAll(message PushMessage) error {
	log.Printf("[PUSH] Broadcasting to all users: %s", message.Title)

	// Get all users with push tokens
	// TODO: When push tokens table is implemented, fetch tokens and send

	return nil
}

// SendNewsNotification sends a push notification for a news item
func (s *PushNotificationService) SendNewsNotification(newsItem models.NewsItem) error {
	if !newsItem.IsImportant {
		log.Printf("[PUSH] News %d is not marked as important, skipping push", newsItem.ID)
		return nil
	}

	message := PushMessage{
		Title:    "📰 " + newsItem.TitleRu,
		Body:     truncatePushBody(newsItem.SummaryRu, 150),
		ImageURL: newsItem.ImageURL,
		Data: map[string]string{
			"type":   "news",
			"newsId": fmt.Sprintf("%d", newsItem.ID),
		},
	}

	log.Printf("[PUSH] Sending news notification for item %d: %s", newsItem.ID, newsItem.TitleRu)

	// Send to all users
	return s.SendToAll(message)
}

// SendViaFCM sends notification using Firebase Cloud Messaging
func (s *PushNotificationService) SendViaFCM(tokens []string, message PushMessage) error {
	if s.fcmServerKey == "" {
		log.Printf("[PUSH] FCM_SERVER_KEY not set, skipping FCM send")
		return nil
	}

	if len(tokens) == 0 {
		return nil
	}

	fcmMsg := FCMMessage{
		RegistrationIDs: tokens,
		Data:            message.Data,
	}
	fcmMsg.Notification.Title = message.Title
	fcmMsg.Notification.Body = message.Body
	fcmMsg.Notification.ImageURL = message.ImageURL

	jsonData, err := json.Marshal(fcmMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal FCM message: %w", err)
	}

	req, err := http.NewRequest("POST", s.fcmURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create FCM request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "key="+s.fcmServerKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("FCM request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("FCM returned status %d", resp.StatusCode)
	}

	log.Printf("[PUSH] FCM notification sent successfully to %d tokens", len(tokens))
	return nil
}

// SendViaExpo sends notification using Expo Push API
func (s *PushNotificationService) SendViaExpo(tokens []string, message PushMessage) error {
	if len(tokens) == 0 {
		return nil
	}

	// Filter only Expo tokens
	var expoTokens []string
	for _, token := range tokens {
		if len(token) > 20 && token[:20] == "ExponentPushToken[" {
			expoTokens = append(expoTokens, token)
		}
	}

	if len(expoTokens) == 0 {
		return nil
	}

	expoMsg := ExpoMessage{
		To:    expoTokens,
		Title: message.Title,
		Body:  message.Body,
		Data:  message.Data,
		Sound: "default",
	}

	jsonData, err := json.Marshal([]ExpoMessage{expoMsg})
	if err != nil {
		return fmt.Errorf("failed to marshal Expo message: %w", err)
	}

	req, err := http.NewRequest("POST", s.expoPushURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create Expo request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("Expo request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Expo returned status %d", resp.StatusCode)
	}

	log.Printf("[PUSH] Expo notification sent successfully to %d tokens", len(expoTokens))
	return nil
}

// Helper function
func truncatePushBody(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}

// Global instance
var pushService *PushNotificationService
var pushServiceOnce sync.Once

// GetPushService returns the global push notification service
func GetPushService() *PushNotificationService {
	pushServiceOnce.Do(func() {
		pushService = NewPushNotificationService()
	})
	return pushService
}

// SendNewsPushNotification is a convenience function for sending news push notifications
func SendNewsPushNotification(newsItem models.NewsItem) {
	go func() {
		if err := GetPushService().SendNewsNotification(newsItem); err != nil {
			log.Printf("[PUSH] Error sending news notification: %v", err)
		}
	}()
}
