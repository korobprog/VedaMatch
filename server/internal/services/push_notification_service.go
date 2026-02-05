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
	Priority string            `json:"priority,omitempty"`
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
	Data     map[string]string `json:"data,omitempty"`
	Priority string            `json:"priority,omitempty"`
}

// ExpoMessage represents the Expo Push notification format
type ExpoMessage struct {
	To       []string          `json:"to"`
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Data     map[string]string `json:"data,omitempty"`
	Sound    string            `json:"sound,omitempty"`
	Badge    int               `json:"badge,omitempty"`
	Priority string            `json:"priority,omitempty"`
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

// SendCallNotification sends a VoIP push notification for incoming calls
func (s *PushNotificationService) SendCallNotification(targetUserID uint, callerName string, roomID string, isVideo bool) error {
	message := PushMessage{
		Title:    "Incoming Call",
		Body:     fmt.Sprintf("%s is calling...", callerName),
		Priority: "high",
		Data: map[string]string{
			"type":       "voip_call",
			"callerName": callerName,
			"uuid":       roomID,
			"hasVideo":   fmt.Sprintf("%v", isVideo),
		},
	}
	return s.SendToUser(targetUserID, message)
}

// ==================== BOOKING NOTIFICATIONS ====================

// SendNewBookingToProvider notifies provider about a new booking request
func (s *PushNotificationService) SendNewBookingToProvider(providerID uint, bookingID uint, serviceName string, clientName string, scheduledAt time.Time) error {
	message := PushMessage{
		Title:    "📅 Новая запись!",
		Body:     fmt.Sprintf("%s записался на \"%s\" на %s", clientName, serviceName, formatTime(scheduledAt)),
		Priority: "high",
		Data: map[string]string{
			"type":      "new_booking",
			"bookingId": fmt.Sprintf("%d", bookingID),
			"screen":    "IncomingBookings",
		},
	}
	return s.SendToUser(providerID, message)
}

// SendBookingConfirmedToClient notifies client that booking was confirmed
func (s *PushNotificationService) SendBookingConfirmedToClient(clientID uint, bookingID uint, serviceName string, scheduledAt time.Time) error {
	message := PushMessage{
		Title:    "✅ Запись подтверждена!",
		Body:     fmt.Sprintf("Ваша запись на \"%s\" подтверждена на %s", serviceName, formatTime(scheduledAt)),
		Priority: "default",
		Data: map[string]string{
			"type":      "booking_confirmed",
			"bookingId": fmt.Sprintf("%d", bookingID),
			"screen":    "MyBookings",
		},
	}
	return s.SendToUser(clientID, message)
}

// SendBookingCancelledToClient notifies client that booking was cancelled
func (s *PushNotificationService) SendBookingCancelledToClient(clientID uint, bookingID uint, serviceName string, reason string) error {
	body := fmt.Sprintf("Запись на \"%s\" отменена", serviceName)
	if reason != "" {
		body += ": " + reason
	}
	message := PushMessage{
		Title:    "❌ Запись отменена",
		Body:     body,
		Priority: "high",
		Data: map[string]string{
			"type":      "booking_cancelled",
			"bookingId": fmt.Sprintf("%d", bookingID),
			"screen":    "MyBookings",
		},
	}
	return s.SendToUser(clientID, message)
}

// SendBookingCancelledToProvider notifies provider that client cancelled
func (s *PushNotificationService) SendBookingCancelledToProvider(providerID uint, bookingID uint, serviceName string, clientName string) error {
	message := PushMessage{
		Title:    "❌ Клиент отменил запись",
		Body:     fmt.Sprintf("%s отменил запись на \"%s\"", clientName, serviceName),
		Priority: "high",
		Data: map[string]string{
			"type":      "booking_cancelled_by_client",
			"bookingId": fmt.Sprintf("%d", bookingID),
			"screen":    "IncomingBookings",
		},
	}
	return s.SendToUser(providerID, message)
}

// SendBookingReminder sends a reminder before the appointment
func (s *PushNotificationService) SendBookingReminder(userID uint, bookingID uint, serviceName string, scheduledAt time.Time, minutesBefore int) error {
	var body string
	if minutesBefore <= 60 {
		body = fmt.Sprintf("Через %d минут начинается \"%s\"", minutesBefore, serviceName)
	} else {
		body = fmt.Sprintf("Через %d часов \"%s\"", minutesBefore/60, serviceName)
	}

	message := PushMessage{
		Title:    "⏰ Напоминание",
		Body:     body,
		Priority: "high",
		Data: map[string]string{
			"type":      "booking_reminder",
			"bookingId": fmt.Sprintf("%d", bookingID),
			"screen":    "ServiceBooking",
		},
	}
	return s.SendToUser(userID, message)
}

// SendBookingCompleted notifies both parties about completed booking
func (s *PushNotificationService) SendBookingCompleted(clientID uint, bookingID uint, serviceName string, providerName string) error {
	message := PushMessage{
		Title:    "🎉 Консультация завершена",
		Body:     fmt.Sprintf("Спасибо за использование \"%s\"! Оставьте отзыв о %s", serviceName, providerName),
		Priority: "default",
		Data: map[string]string{
			"type":      "booking_completed",
			"bookingId": fmt.Sprintf("%d", bookingID),
			"screen":    "MyBookings",
		},
	}
	return s.SendToUser(clientID, message)
}

// ==================== WALLET & REFERRAL NOTIFICATIONS ====================

// SendWalletBonusReceived notifies user about a bonus credit
func (s *PushNotificationService) SendWalletBonusReceived(userID uint, amount int, reason string) error {
	message := PushMessage{
		Title:    "💰 Начисление LKM",
		Body:     fmt.Sprintf("Вам начислено %d LKM: %s", amount, reason),
		Priority: "high",
		Data: map[string]string{
			"type":   "wallet_bonus",
			"amount": fmt.Sprintf("%d", amount),
			"screen": "Wallet",
		},
	}
	return s.SendToUser(userID, message)
}

// SendReferralJoined notifies referrer that a new friend joined
func (s *PushNotificationService) SendReferralJoined(referrerID uint, friendName string) error {
	message := PushMessage{
		Title:    "🤝 Новый друг в Сангхе!",
		Body:     fmt.Sprintf("%s присоединился по вашей ссылке", friendName),
		Priority: "default",
		Data: map[string]string{
			"type":   "referral_joined",
			"screen": "InviteFriends",
		},
	}
	return s.SendToUser(referrerID, message)
}

// SendReferralActivated notifies referrer that a friend has activated (made first spend)
func (s *PushNotificationService) SendReferralActivated(referrerID uint, friendName string, reward int) error {
	message := PushMessage{
		Title:    "🌟 Друг активировался!",
		Body:     fmt.Sprintf("Ваш друг %s совершил первую трату. Вам начислено %d LKM!", friendName, reward),
		Priority: "high",
		Data: map[string]string{
			"type":   "referral_activated",
			"amount": fmt.Sprintf("%d", reward),
			"screen": "InviteFriends",
		},
	}
	return s.SendToUser(referrerID, message)
}

// SendWalletBalanceActivated notifies user that their pending balance is now active
func (s *PushNotificationService) SendWalletBalanceActivated(userID uint, amount int) error {
	message := PushMessage{
		Title:    "✨ Бонус разморожен!",
		Body:     fmt.Sprintf("Ваши %d LKM теперь доступны для использования. Тратьте их на AI и услуги!", amount),
		Priority: "high",
		Data: map[string]string{
			"type":   "wallet_activated",
			"amount": fmt.Sprintf("%d", amount),
			"screen": "Wallet",
		},
	}
	return s.SendToUser(userID, message)
}

// formatTime helper for readable time format in Russian
func formatTime(t time.Time) string {
	months := []string{"", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"}
	return fmt.Sprintf("%d %s в %02d:%02d", t.Day(), months[t.Month()], t.Hour(), t.Minute())
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
			Priority:        message.Priority,
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
		To:       tokens,
		Title:    message.Title,
		Body:     message.Body,
		Data:     message.Data,
		Sound:    "default",
		Priority: message.Priority,
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
