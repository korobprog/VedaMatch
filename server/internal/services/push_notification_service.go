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
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if user.PushToken == "" {
		return nil
	}

	return s.SendToTokens([]string{user.PushToken}, message)
}

// SendToTokens sends a push notification to a list of tokens, automatically choosing the provider
func (s *PushNotificationService) SendToTokens(tokens []string, message PushMessage) error {
	var fcmTokens []string
	var expoTokens []string

	for _, token := range tokens {
		if token == "" {
			continue
		}
		// Expo tokens start with "ExponentPushToken["
		if len(token) > 20 && token[:20] == "ExponentPushToken[" {
			expoTokens = append(expoTokens, token)
		} else {
			// Assume others are FCM tokens
			fcmTokens = append(fcmTokens, token)
		}
	}

	var errs []error

	if len(fcmTokens) > 0 {
		if err := s.SendViaFCM(fcmTokens, message); err != nil {
			errs = append(errs, err)
		}
	}

	if len(expoTokens) > 0 {
		if err := s.SendViaExpo(expoTokens, message); err != nil {
			errs = append(errs, err)
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors sending push: %v", errs)
	}

	return nil
}

// SendToAll sends a push notification to all users who have a token
func (s *PushNotificationService) SendToAll(message PushMessage) error {
	var tokens []string
	if err := s.db.Model(&models.User{}).Where("push_token != ''").Pluck("push_token", &tokens).Error; err != nil {
		return err
	}

	if len(tokens) == 0 {
		return nil
	}

	return s.SendToTokens(tokens, message)
}

// SendNewsNotification sends a push notification for a news item to subscribers
func (s *PushNotificationService) SendNewsNotification(newsItem models.NewsItem) error {
	if !newsItem.IsImportant {
		log.Printf("[PUSH] News %d is not marked as important, skipping push", newsItem.ID)
		return nil
	}

	// 1. Find subscribers for this source
	var tokens []string
	err := s.db.Table("user_news_subscriptions").
		Select("users.push_token").
		Joins("JOIN users ON users.id = user_news_subscriptions.user_id").
		Where("user_news_subscriptions.source_id = ? AND users.push_token != ''", newsItem.SourceID).
		Pluck("push_token", &tokens).Error

	if err != nil {
		return fmt.Errorf("failed to fetch subscribers: %w", err)
	}

	if len(tokens) == 0 {
		log.Printf("[PUSH] No subscribers for source %d, skipping push", newsItem.SourceID)
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

	log.Printf("[PUSH] Sending targeted push for news %d to %d subscribers", newsItem.ID, len(tokens))
	return s.SendToTokens(tokens, message)
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

	// FCM has a limit of 1000 tokens per multicast request
	const batchSize = 1000
	for i := 0; i < len(tokens); i += batchSize {
		end := i + batchSize
		if end > len(tokens) {
			end = len(tokens)
		}
		
		batch := tokens[i:end]
		
		fcmMsg := FCMMessage{
			RegistrationIDs: batch,
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
			log.Printf("[PUSH] FCM batch send error: %v", err)
			continue
		}
		
		if resp.StatusCode != http.StatusOK {
			log.Printf("[PUSH] FCM batch returned status %d", resp.StatusCode)
		}
		resp.Body.Close()
	}

	return nil
}

// SendViaExpo sends notification using Expo Push API
func (s *PushNotificationService) SendViaExpo(tokens []string, message PushMessage) error {
	if len(tokens) == 0 {
		return nil
	}

	expoMsg := ExpoMessage{
		To:    tokens,
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