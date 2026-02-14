package services

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

const (
	providerFCM  = "fcm"
	providerExpo = "expo"

	deliveryStatusSuccess = "success"
	deliveryStatusRetry   = "retry"
	deliveryStatusInvalid = "invalid"
	deliveryStatusFailed  = "failed"

	errorTypePermanent = "permanent"
	errorTypeTransient = "transient"
	errorTypeConfig    = "config"
	errorTypeUnknown   = "unknown"
)

// PushNotificationService handles sending push notifications
type PushNotificationService struct {
	db          *gorm.DB
	expoPushURL string
	fcmURL      string
	httpClient  *http.Client

	fcmEnvKey string

	fcmKeyMu       sync.RWMutex
	fcmKeyCached   string
	fcmKeySource   string
	fcmKeyCachedAt time.Time

	retryMaxAttempts int
	retryBaseDelay   time.Duration
	dedupeTTL        time.Duration

	recentEventsMu sync.Mutex
	recentEvents   map[string]time.Time

	rngMu sync.Mutex
	rng   *rand.Rand
}

// PushMessage represents a push notification message
type PushMessage struct {
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Data     map[string]string `json:"data,omitempty"`
	ImageURL string            `json:"imageUrl,omitempty"`
	Priority string            `json:"priority,omitempty"`
	EventKey string            `json:"-"`
}

// UserDeviceTokenInput is an API-friendly payload for token registration.
type UserDeviceTokenInput struct {
	Token      string
	Provider   string
	Platform   string
	DeviceID   string
	AppVersion string
}

// PushHealthSummary aggregates delivery metrics for admin diagnostics.
type PushHealthSummary struct {
	WindowHours         int     `json:"windowHours"`
	DeliverySuccessRate float64 `json:"delivery_success_rate"`
	InvalidTokenRate    float64 `json:"invalid_token_rate"`
	RetryRate           float64 `json:"retry_rate"`
	LatencyP95          int64   `json:"latency_p95"`
	TotalEvents         int64   `json:"total_events"`
	SuccessEvents       int64   `json:"success_events"`
	InvalidEvents       int64   `json:"invalid_events"`
	RetryEvents         int64   `json:"retry_events"`
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

type fcmBatchResponse struct {
	Success int `json:"success"`
	Failure int `json:"failure"`
	Results []struct {
		MessageID string `json:"message_id"`
		Error     string `json:"error"`
	} `json:"results"`
}

type expoPushMessage struct {
	To       string            `json:"to"`
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Data     map[string]string `json:"data,omitempty"`
	Sound    string            `json:"sound,omitempty"`
	Badge    int               `json:"badge,omitempty"`
	Priority string            `json:"priority,omitempty"`
}

type expoPushResponse struct {
	Data []struct {
		Status  string `json:"status"`
		ID      string `json:"id"`
		Message string `json:"message"`
		Details struct {
			Error string `json:"error"`
		} `json:"details"`
	} `json:"data"`
	Errors []struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"errors"`
}

type pushTokenTarget struct {
	Token    string
	Provider string
	Platform string
	UserID   *uint
}

// NewPushNotificationService creates a new push notification service
func NewPushNotificationService() *PushNotificationService {
	return &PushNotificationService{
		db:          database.DB,
		fcmEnvKey:   os.Getenv("FCM_SERVER_KEY"),
		expoPushURL: "https://exp.host/--/api/v2/push/send",
		fcmURL:      "https://fcm.googleapis.com/fcm/send",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		retryMaxAttempts: 3,
		retryBaseDelay:   350 * time.Millisecond,
		dedupeTTL:        30 * time.Second,
		recentEvents:     make(map[string]time.Time),
		rng:              rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// ResolveFCMServerKey returns FCM key and its source with DB>ENV priority.
func (s *PushNotificationService) ResolveFCMServerKey() (string, string) {
	if s == nil {
		return "", "none"
	}

	const cacheTTL = 30 * time.Second
	now := time.Now()

	s.fcmKeyMu.RLock()
	if now.Sub(s.fcmKeyCachedAt) < cacheTTL {
		key := s.fcmKeyCached
		source := s.fcmKeySource
		s.fcmKeyMu.RUnlock()
		return key, source
	}
	s.fcmKeyMu.RUnlock()

	key := ""
	dbValue := ""
	if s.db != nil {
		var setting models.SystemSetting
		if err := s.db.Where("key = ?", "FCM_SERVER_KEY").First(&setting).Error; err == nil {
			dbValue = setting.Value
		}
	}
	envKey := strings.TrimSpace(os.Getenv("FCM_SERVER_KEY"))
	if envKey == "" {
		envKey = strings.TrimSpace(s.fcmEnvKey)
	}
	key, source := resolveSettingOrEnv(dbValue, envKey)

	s.fcmKeyMu.Lock()
	s.fcmKeyCached = key
	s.fcmKeySource = source
	s.fcmKeyCachedAt = now
	s.fcmKeyMu.Unlock()

	return key, source
}

func (s *PushNotificationService) InvalidateFCMCache() {
	s.fcmKeyMu.Lock()
	s.fcmKeyCached = ""
	s.fcmKeySource = "none"
	s.fcmKeyCachedAt = time.Time{}
	s.fcmKeyMu.Unlock()
}

// UpsertUserDeviceToken registers (or re-activates) a user device token.
func (s *PushNotificationService) UpsertUserDeviceToken(userID uint, input UserDeviceTokenInput) (models.UserDeviceToken, bool, error) {
	var empty models.UserDeviceToken
	if s.db == nil {
		return empty, false, errors.New("database not initialized")
	}
	if userID == 0 {
		return empty, false, errors.New("user id is required")
	}

	token := sanitizePushToken(input.Token)
	if token == "" {
		return empty, false, errors.New("token is required")
	}

	now := time.Now()
	provider := normalizeProvider(input.Provider, token)
	platform := normalizePlatform(input.Platform)

	var existing models.UserDeviceToken
	err := s.db.Where("user_id = ? AND token = ?", userID, token).First(&existing).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return empty, false, err
		}

		created := models.UserDeviceToken{
			UserID:        userID,
			Token:         token,
			Provider:      provider,
			Platform:      platform,
			DeviceID:      strings.TrimSpace(input.DeviceID),
			AppVersion:    strings.TrimSpace(input.AppVersion),
			LastSeenAt:    now,
			InvalidatedAt: nil,
			FailCount:     0,
		}
		if err := s.db.Create(&created).Error; err != nil {
			return empty, false, err
		}
		return created, true, nil
	}

	existing.Provider = provider
	existing.Platform = platform
	existing.DeviceID = strings.TrimSpace(input.DeviceID)
	existing.AppVersion = strings.TrimSpace(input.AppVersion)
	existing.LastSeenAt = now
	existing.InvalidatedAt = nil
	existing.FailCount = 0

	if err := s.db.Save(&existing).Error; err != nil {
		return empty, false, err
	}
	return existing, false, nil
}

// UnregisterUserDeviceToken invalidates device token(s) by token or deviceID.
func (s *PushNotificationService) UnregisterUserDeviceToken(userID uint, token string, deviceID string) (int64, error) {
	if s.db == nil {
		return 0, errors.New("database not initialized")
	}
	if userID == 0 {
		return 0, errors.New("user id is required")
	}
	token = sanitizePushToken(token)
	deviceID = strings.TrimSpace(deviceID)
	if token == "" && deviceID == "" {
		return 0, errors.New("token or deviceId is required")
	}

	now := time.Now()
	query := s.db.Model(&models.UserDeviceToken{}).
		Where("user_id = ? AND invalidated_at IS NULL", userID)
	if token != "" {
		query = query.Where("token = ?", token)
	}
	if deviceID != "" {
		query = query.Where("device_id = ?", deviceID)
	}

	result := query.Updates(map[string]interface{}{
		"invalidated_at": now,
		"updated_at":     now,
	})
	if result.Error != nil {
		return 0, result.Error
	}

	if token != "" {
		_ = s.db.Model(&models.User{}).Where("id = ? AND push_token = ?", userID, token).Update("push_token", "").Error
	} else if deviceID != "" {
		var invalidatedTokens []string
		if err := s.db.Model(&models.UserDeviceToken{}).
			Where("user_id = ? AND device_id = ? AND invalidated_at IS NOT NULL", userID, deviceID).
			Pluck("token", &invalidatedTokens).Error; err == nil && len(invalidatedTokens) > 0 {
			_ = s.db.Model(&models.User{}).
				Where("id = ? AND push_token IN ?", userID, invalidatedTokens).
				Update("push_token", "").Error
		}
	}

	return result.RowsAffected, nil
}

// GetHealthSummary calculates delivery metrics over a rolling time window.
func (s *PushNotificationService) GetHealthSummary(window time.Duration) (PushHealthSummary, error) {
	summary := PushHealthSummary{}
	if window <= 0 {
		window = 24 * time.Hour
	}
	summary.WindowHours = int(window.Hours())

	if s.db == nil {
		return summary, errors.New("database not initialized")
	}

	cutoff := time.Now().Add(-window)
	var events []models.PushDeliveryEvent
	if err := s.db.Where("created_at >= ?", cutoff).Find(&events).Error; err != nil {
		return summary, err
	}

	latencies := make([]int64, 0, len(events))
	for _, evt := range events {
		summary.TotalEvents++
		switch evt.Status {
		case deliveryStatusSuccess:
			summary.SuccessEvents++
			if evt.LatencyMs > 0 {
				latencies = append(latencies, evt.LatencyMs)
			}
		case deliveryStatusInvalid:
			summary.InvalidEvents++
		case deliveryStatusRetry:
			summary.RetryEvents++
		}
	}

	summary.DeliverySuccessRate = percentage(summary.SuccessEvents, summary.TotalEvents)
	summary.InvalidTokenRate = percentage(summary.InvalidEvents, summary.TotalEvents)
	summary.RetryRate = percentage(summary.RetryEvents, summary.TotalEvents)
	if len(latencies) > 0 {
		sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
		idx := (95*len(latencies) - 1) / 100
		if idx < 0 {
			idx = 0
		}
		if idx >= len(latencies) {
			idx = len(latencies) - 1
		}
		summary.LatencyP95 = latencies[idx]
	}

	return summary, nil
}

// SendToUser sends a push notification to a specific user
func (s *PushNotificationService) SendToUser(userID uint, message PushMessage) error {
	targets, err := s.getTargetsForUser(userID)
	if err != nil {
		return err
	}
	if len(targets) == 0 {
		return nil
	}
	return s.sendToTargets(targets, message)
}

// SendToTokens sends a push notification to a list of tokens, automatically choosing the provider
func (s *PushNotificationService) SendToTokens(tokens []string, message PushMessage) error {
	targets := make([]pushTokenTarget, 0, len(tokens))
	for _, token := range tokens {
		token = sanitizePushToken(token)
		if token == "" {
			continue
		}
		targets = append(targets, pushTokenTarget{
			Token:    token,
			Provider: normalizeProvider("", token),
			Platform: "unknown",
		})
	}
	return s.sendToTargets(targets, message)
}

// SendToAll sends a push notification to all users who have active tokens
func (s *PushNotificationService) SendToAll(message PushMessage) error {
	targets, err := s.getTargetsForAllUsers()
	if err != nil {
		return err
	}
	if len(targets) == 0 {
		return nil
	}
	return s.sendToTargets(targets, message)
}

// SendNewsNotification sends a push notification for a news item to subscribers
func (s *PushNotificationService) SendNewsNotification(newsItem models.NewsItem) error {
	if !newsItem.IsImportant {
		log.Printf("[PUSH] News %d is not marked as important, skipping push", newsItem.ID)
		return nil
	}

	targets, err := s.getTargetsForNewsSource(newsItem.SourceID)
	if err != nil {
		return fmt.Errorf("failed to fetch subscribers: %w", err)
	}
	if len(targets) == 0 {
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

	log.Printf("[PUSH] Sending targeted push for news %d to %d subscribers", newsItem.ID, len(targets))
	return s.sendToTargets(targets, message)
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

// SendCharityReportWarning notifies organization owner that a report is due soon or overdue
func (s *PushNotificationService) SendCharityReportWarning(ownerID uint, projectName string, daysRemaining int) error {
	title := "⚠️ Отчет по проекту"
	body := ""
	if daysRemaining > 0 {
		body = fmt.Sprintf("Напоминание: до публикации отчета по проекту \"%s\" осталось %d дн.", projectName, daysRemaining)
	} else {
		body = fmt.Sprintf("Внимание! Отчет по проекту \"%s\" просрочен. Сбор средств приостановлен.", projectName)
	}

	message := PushMessage{
		Title:    title,
		Body:     body,
		Priority: "high",
		Data: map[string]string{
			"type":   "charity_report_warning",
			"screen": "CharityOwnerDashboard",
		},
	}
	return s.SendToUser(ownerID, message)
}

// formatTime helper for readable time format in Russian
func formatTime(t time.Time) string {
	months := []string{"", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"}
	return fmt.Sprintf("%d %s в %02d:%02d", t.Day(), months[t.Month()], t.Hour(), t.Minute())
}

// SendViaFCM sends notification using Firebase Cloud Messaging.
func (s *PushNotificationService) SendViaFCM(tokens []string, message PushMessage) error {
	targets := make([]pushTokenTarget, 0, len(tokens))
	for _, token := range tokens {
		token = sanitizePushToken(token)
		if token == "" {
			continue
		}
		targets = append(targets, pushTokenTarget{Token: token, Provider: providerFCM, Platform: "unknown"})
	}
	return s.sendProviderWithRetry(providerFCM, targets, message)
}

// SendViaExpo sends notification using Expo Push API.
func (s *PushNotificationService) SendViaExpo(tokens []string, message PushMessage) error {
	targets := make([]pushTokenTarget, 0, len(tokens))
	for _, token := range tokens {
		token = sanitizePushToken(token)
		if token == "" {
			continue
		}
		targets = append(targets, pushTokenTarget{Token: token, Provider: providerExpo, Platform: "unknown"})
	}
	return s.sendProviderWithRetry(providerExpo, targets, message)
}

func (s *PushNotificationService) sendToTargets(targets []pushTokenTarget, message PushMessage) error {
	normalized := s.normalizeAndDedupTargets(targets)
	if len(normalized) == 0 {
		return nil
	}

	if s.shouldSkipDuplicateEvent(message, normalized) {
		return nil
	}

	providerTargets := map[string][]pushTokenTarget{}
	for _, target := range normalized {
		provider := normalizeProvider(target.Provider, target.Token)
		target.Provider = provider
		providerTargets[provider] = append(providerTargets[provider], target)
	}

	var errs []error
	if fcmTargets := providerTargets[providerFCM]; len(fcmTargets) > 0 {
		if err := s.sendProviderWithRetry(providerFCM, fcmTargets, message); err != nil {
			errs = append(errs, err)
		}
	}
	if expoTargets := providerTargets[providerExpo]; len(expoTargets) > 0 {
		if err := s.sendProviderWithRetry(providerExpo, expoTargets, message); err != nil {
			errs = append(errs, err)
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors sending push: %v", errs)
	}
	return nil
}

func (s *PushNotificationService) sendProviderWithRetry(provider string, targets []pushTokenTarget, message PushMessage) error {
	if len(targets) == 0 {
		return nil
	}

	pending := targets
	var lastErr error
	for attempt := 1; attempt <= s.retryMaxAttempts && len(pending) > 0; attempt++ {
		finalAttempt := attempt == s.retryMaxAttempts
		var retryTargets []pushTokenTarget
		var err error

		switch provider {
		case providerFCM:
			retryTargets, err = s.sendFCMAttempt(pending, message, attempt, finalAttempt)
		case providerExpo:
			retryTargets, err = s.sendExpoAttempt(pending, message, attempt, finalAttempt)
		default:
			err = fmt.Errorf("unsupported provider: %s", provider)
		}

		if err != nil {
			lastErr = err
		}
		if len(retryTargets) == 0 {
			return lastErr
		}

		pending = retryTargets
		if !finalAttempt {
			time.Sleep(s.nextRetryDelay(attempt))
		}
	}

	if len(pending) > 0 {
		return fmt.Errorf("provider %s: failed to deliver %d tokens after %d attempts", provider, len(pending), s.retryMaxAttempts)
	}
	return lastErr
}

func (s *PushNotificationService) sendFCMAttempt(targets []pushTokenTarget, message PushMessage, attempt int, finalAttempt bool) ([]pushTokenTarget, error) {
	key, source := s.ResolveFCMServerKey()
	if key == "" {
		err := errors.New("fcm key is not configured")
		for _, target := range targets {
			s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeConfig, "missing_fcm_server_key", attempt, 0)
			s.bumpTokenFailCount(target.Token)
		}
		log.Printf("[PUSH] FCM key not configured; source=%s", source)
		return nil, err
	}

	const batchSize = 1000
	var retryTargets []pushTokenTarget
	var lastErr error

	for i := 0; i < len(targets); i += batchSize {
		end := i + batchSize
		if end > len(targets) {
			end = len(targets)
		}
		batch := targets[i:end]

		fcmMsg := FCMMessage{
			RegistrationIDs: make([]string, 0, len(batch)),
			Data:            message.Data,
			Priority:        message.Priority,
		}
		fcmMsg.Notification.Title = message.Title
		fcmMsg.Notification.Body = message.Body
		fcmMsg.Notification.ImageURL = message.ImageURL
		for _, target := range batch {
			fcmMsg.RegistrationIDs = append(fcmMsg.RegistrationIDs, target.Token)
		}

		jsonData, err := json.Marshal(fcmMsg)
		if err != nil {
			lastErr = fmt.Errorf("failed to marshal FCM message: %w", err)
			for _, target := range batch {
				s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeUnknown, "marshal_error", attempt, 0)
				s.bumpTokenFailCount(target.Token)
			}
			continue
		}

		req, err := http.NewRequest("POST", s.fcmURL, bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = fmt.Errorf("failed to create FCM request: %w", err)
			for _, target := range batch {
				s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeUnknown, "request_build_error", attempt, 0)
				s.bumpTokenFailCount(target.Token)
			}
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "key="+key)

		startedAt := time.Now()
		resp, err := s.httpClient.Do(req)
		latency := time.Since(startedAt)
		if err != nil {
			lastErr = fmt.Errorf("fcm request failed: %w", err)
			for _, target := range batch {
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, "transport_error", attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, "transport_error", attempt, latency)
				retryTargets = append(retryTargets, target)
			}
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("fcm returned status %d", resp.StatusCode)
			errorCode := fmt.Sprintf("http_%d", resp.StatusCode)
			errorType := errorTypeTransient
			allowRetry := !finalAttempt
			if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
				errorType = errorTypeConfig
				allowRetry = false
			}
			for _, target := range batch {
				if allowRetry {
					s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorType, errorCode, attempt, latency)
					retryTargets = append(retryTargets, target)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorType, errorCode, attempt, latency)
				s.bumpTokenFailCount(target.Token)
			}
			continue
		}

		var parsed fcmBatchResponse
		if err := json.Unmarshal(body, &parsed); err != nil {
			lastErr = fmt.Errorf("failed to parse FCM response: %w", err)
			for _, target := range batch {
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, "response_parse_error", attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, "response_parse_error", attempt, latency)
				retryTargets = append(retryTargets, target)
			}
			continue
		}

		for idx, target := range batch {
			resultErr := ""
			if idx < len(parsed.Results) {
				resultErr = strings.TrimSpace(parsed.Results[idx].Error)
			}
			if resultErr == "" {
				s.recordDeliveryEvent(target, message, deliveryStatusSuccess, "", "", attempt, latency)
				s.markTokenDeliverySuccess(target.Token)
				continue
			}

			class := classifyFCMError(resultErr)
			switch class {
			case errorTypePermanent:
				s.recordDeliveryEvent(target, message, deliveryStatusInvalid, errorTypePermanent, resultErr, attempt, latency)
				s.invalidateToken(target.Token)
			case errorTypeTransient:
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, resultErr, attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, resultErr, attempt, latency)
				retryTargets = append(retryTargets, target)
			default:
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeUnknown, resultErr, attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeUnknown, resultErr, attempt, latency)
				retryTargets = append(retryTargets, target)
			}
		}
	}

	return retryTargets, lastErr
}

func (s *PushNotificationService) sendExpoAttempt(targets []pushTokenTarget, message PushMessage, attempt int, finalAttempt bool) ([]pushTokenTarget, error) {
	const batchSize = 100
	var retryTargets []pushTokenTarget
	var lastErr error

	for i := 0; i < len(targets); i += batchSize {
		end := i + batchSize
		if end > len(targets) {
			end = len(targets)
		}
		batch := targets[i:end]

		payload := make([]expoPushMessage, 0, len(batch))
		for _, target := range batch {
			payload = append(payload, expoPushMessage{
				To:       target.Token,
				Title:    message.Title,
				Body:     message.Body,
				Data:     message.Data,
				Sound:    "default",
				Priority: message.Priority,
			})
		}

		jsonData, err := json.Marshal(payload)
		if err != nil {
			lastErr = fmt.Errorf("failed to marshal Expo message: %w", err)
			for _, target := range batch {
				s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeUnknown, "marshal_error", attempt, 0)
				s.bumpTokenFailCount(target.Token)
			}
			continue
		}

		req, err := http.NewRequest("POST", s.expoPushURL, bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = fmt.Errorf("failed to create Expo request: %w", err)
			for _, target := range batch {
				s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeUnknown, "request_build_error", attempt, 0)
				s.bumpTokenFailCount(target.Token)
			}
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Accept-Encoding", "gzip, deflate")

		startedAt := time.Now()
		resp, err := s.httpClient.Do(req)
		latency := time.Since(startedAt)
		if err != nil {
			lastErr = fmt.Errorf("expo request failed: %w", err)
			for _, target := range batch {
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, "transport_error", attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, "transport_error", attempt, latency)
				retryTargets = append(retryTargets, target)
			}
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("expo returned status %d", resp.StatusCode)
			errorCode := fmt.Sprintf("http_%d", resp.StatusCode)
			allowRetry := !finalAttempt
			for _, target := range batch {
				if allowRetry {
					s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, errorCode, attempt, latency)
					retryTargets = append(retryTargets, target)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, errorCode, attempt, latency)
				s.bumpTokenFailCount(target.Token)
			}
			continue
		}

		var parsed expoPushResponse
		if err := json.Unmarshal(body, &parsed); err != nil {
			lastErr = fmt.Errorf("failed to parse Expo response: %w", err)
			for _, target := range batch {
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, "response_parse_error", attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, "response_parse_error", attempt, latency)
				retryTargets = append(retryTargets, target)
			}
			continue
		}

		if len(parsed.Data) == 0 {
			for _, target := range batch {
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, "empty_response", attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, "empty_response", attempt, latency)
				retryTargets = append(retryTargets, target)
			}
			continue
		}

		for idx, target := range batch {
			if idx >= len(parsed.Data) {
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, "missing_result", attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, "missing_result", attempt, latency)
				retryTargets = append(retryTargets, target)
				continue
			}

			item := parsed.Data[idx]
			if strings.EqualFold(item.Status, "ok") {
				s.recordDeliveryEvent(target, message, deliveryStatusSuccess, "", "", attempt, latency)
				s.markTokenDeliverySuccess(target.Token)
				continue
			}

			errorCode := strings.TrimSpace(item.Details.Error)
			if errorCode == "" {
				errorCode = strings.TrimSpace(item.Message)
			}
			if errorCode == "" {
				errorCode = "unknown_expo_error"
			}

			class := classifyExpoError(errorCode)
			switch class {
			case errorTypePermanent:
				s.recordDeliveryEvent(target, message, deliveryStatusInvalid, errorTypePermanent, errorCode, attempt, latency)
				s.invalidateToken(target.Token)
			case errorTypeTransient:
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeTransient, errorCode, attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeTransient, errorCode, attempt, latency)
				retryTargets = append(retryTargets, target)
			default:
				if finalAttempt {
					s.recordDeliveryEvent(target, message, deliveryStatusFailed, errorTypeUnknown, errorCode, attempt, latency)
					s.bumpTokenFailCount(target.Token)
					continue
				}
				s.recordDeliveryEvent(target, message, deliveryStatusRetry, errorTypeUnknown, errorCode, attempt, latency)
				retryTargets = append(retryTargets, target)
			}
		}
	}

	return retryTargets, lastErr
}

func (s *PushNotificationService) getTargetsForUser(userID uint) ([]pushTokenTarget, error) {
	if s.db == nil {
		return nil, errors.New("database not initialized")
	}

	var user models.User
	if err := s.db.Select("id", "push_token").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	var rows []models.UserDeviceToken
	if err := s.db.Where("user_id = ? AND invalidated_at IS NULL AND token <> ''", userID).Find(&rows).Error; err != nil {
		return nil, err
	}

	targets := make([]pushTokenTarget, 0, len(rows)+1)
	uid := userID
	for _, row := range rows {
		targets = append(targets, pushTokenTarget{
			Token:    sanitizePushToken(row.Token),
			Provider: normalizeProvider(row.Provider, row.Token),
			Platform: normalizePlatform(row.Platform),
			UserID:   &uid,
		})
	}

	if len(targets) == 0 {
		legacy := sanitizePushToken(user.PushToken)
		if legacy != "" {
			targets = append(targets, pushTokenTarget{
				Token:    legacy,
				Provider: normalizeProvider("", legacy),
				Platform: "unknown",
				UserID:   &uid,
			})
		}
	}

	return s.normalizeAndDedupTargets(targets), nil
}

func (s *PushNotificationService) getTargetsForAllUsers() ([]pushTokenTarget, error) {
	if s.db == nil {
		return nil, errors.New("database not initialized")
	}

	targets := make([]pushTokenTarget, 0)

	var deviceRows []struct {
		UserID   uint
		Token    string
		Provider string
		Platform string
	}
	if err := s.db.Table("user_device_tokens").
		Select("user_id, token, provider, platform").
		Where("invalidated_at IS NULL AND token <> ''").
		Find(&deviceRows).Error; err != nil {
		return nil, err
	}
	for _, row := range deviceRows {
		uid := row.UserID
		targets = append(targets, pushTokenTarget{
			Token:    sanitizePushToken(row.Token),
			Provider: normalizeProvider(row.Provider, row.Token),
			Platform: normalizePlatform(row.Platform),
			UserID:   &uid,
		})
	}

	var legacyRows []struct {
		UserID uint
		Token  string
	}
	if err := s.db.Table("users u").
		Select("u.id AS user_id, u.push_token AS token").
		Where("u.push_token <> ''").
		Where("NOT EXISTS (SELECT 1 FROM user_device_tokens udt WHERE udt.user_id = u.id AND udt.invalidated_at IS NULL AND udt.token <> '')").
		Find(&legacyRows).Error; err != nil {
		return nil, err
	}
	for _, row := range legacyRows {
		uid := row.UserID
		targets = append(targets, pushTokenTarget{
			Token:    sanitizePushToken(row.Token),
			Provider: normalizeProvider("", row.Token),
			Platform: "unknown",
			UserID:   &uid,
		})
	}

	return s.normalizeAndDedupTargets(targets), nil
}

func (s *PushNotificationService) getTargetsForNewsSource(sourceID uint) ([]pushTokenTarget, error) {
	if s.db == nil {
		return nil, errors.New("database not initialized")
	}

	targets := make([]pushTokenTarget, 0)

	var deviceRows []struct {
		UserID   uint
		Token    string
		Provider string
		Platform string
	}
	err := s.db.Table("user_news_subscriptions uns").
		Select("udt.user_id, udt.token, udt.provider, udt.platform").
		Joins("JOIN user_device_tokens udt ON udt.user_id = uns.user_id").
		Where("uns.source_id = ? AND udt.invalidated_at IS NULL AND udt.token <> ''", sourceID).
		Find(&deviceRows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range deviceRows {
		uid := row.UserID
		targets = append(targets, pushTokenTarget{
			Token:    sanitizePushToken(row.Token),
			Provider: normalizeProvider(row.Provider, row.Token),
			Platform: normalizePlatform(row.Platform),
			UserID:   &uid,
		})
	}

	var legacyRows []struct {
		UserID uint
		Token  string
	}
	err = s.db.Table("user_news_subscriptions uns").
		Select("u.id AS user_id, u.push_token AS token").
		Joins("JOIN users u ON u.id = uns.user_id").
		Where("uns.source_id = ? AND u.push_token <> ''", sourceID).
		Where("NOT EXISTS (SELECT 1 FROM user_device_tokens udt WHERE udt.user_id = u.id AND udt.invalidated_at IS NULL AND udt.token <> '')").
		Find(&legacyRows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range legacyRows {
		uid := row.UserID
		targets = append(targets, pushTokenTarget{
			Token:    sanitizePushToken(row.Token),
			Provider: normalizeProvider("", row.Token),
			Platform: "unknown",
			UserID:   &uid,
		})
	}

	return s.normalizeAndDedupTargets(targets), nil
}

func (s *PushNotificationService) normalizeAndDedupTargets(targets []pushTokenTarget) []pushTokenTarget {
	if len(targets) == 0 {
		return nil
	}

	byToken := make(map[string]pushTokenTarget, len(targets))
	for _, target := range targets {
		token := sanitizePushToken(target.Token)
		if token == "" {
			continue
		}

		target.Token = token
		target.Provider = normalizeProvider(target.Provider, token)
		target.Platform = normalizePlatform(target.Platform)

		existing, ok := byToken[token]
		if !ok {
			byToken[token] = target
			continue
		}

		if existing.UserID == nil && target.UserID != nil {
			existing.UserID = target.UserID
		}
		if existing.Platform == "unknown" && target.Platform != "unknown" {
			existing.Platform = target.Platform
		}
		if existing.Provider == providerFCM && target.Provider == providerExpo {
			existing.Provider = target.Provider
		}
		byToken[token] = existing
	}

	result := make([]pushTokenTarget, 0, len(byToken))
	for _, target := range byToken {
		result = append(result, target)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Token < result[j].Token
	})
	return result
}

func (s *PushNotificationService) shouldSkipDuplicateEvent(message PushMessage, targets []pushTokenTarget) bool {
	eventKey := deriveEventKey(message)
	if eventKey == "" {
		return false
	}

	recipientDigest := digestRecipients(targets)
	if recipientDigest == "" {
		return false
	}

	dedupeKey := eventKey + ":" + recipientDigest
	now := time.Now()

	s.recentEventsMu.Lock()
	defer s.recentEventsMu.Unlock()

	for key, ts := range s.recentEvents {
		if now.Sub(ts) > s.dedupeTTL {
			delete(s.recentEvents, key)
		}
	}

	if lastAt, ok := s.recentEvents[dedupeKey]; ok && now.Sub(lastAt) <= s.dedupeTTL {
		log.Printf("[PUSH] Duplicate push suppressed for event key %s", eventKey)
		return true
	}

	s.recentEvents[dedupeKey] = now
	return false
}

func (s *PushNotificationService) nextRetryDelay(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	backoff := s.retryBaseDelay * time.Duration(1<<(attempt-1))
	if backoff <= 0 {
		return s.retryBaseDelay
	}

	jitterMax := int64(backoff / 2)
	if jitterMax <= 0 {
		return backoff
	}

	s.rngMu.Lock()
	jitter := time.Duration(s.rng.Int63n(jitterMax + 1))
	s.rngMu.Unlock()

	return backoff + jitter
}

func (s *PushNotificationService) recordDeliveryEvent(target pushTokenTarget, message PushMessage, status string, errorType string, errorCode string, attempt int, latency time.Duration) {
	if s.db == nil {
		return
	}

	eventType := "generic"
	if message.Data != nil {
		if t := strings.TrimSpace(message.Data["type"]); t != "" {
			eventType = t
		}
	}

	event := models.PushDeliveryEvent{
		CreatedAt: time.Now(),
		UserID:    target.UserID,
		Provider:  normalizeProvider(target.Provider, target.Token),
		Platform:  normalizePlatform(target.Platform),
		EventType: eventType,
		TokenHash: hashToken(target.Token),
		Status:    status,
		ErrorType: strings.TrimSpace(errorType),
		ErrorCode: strings.TrimSpace(errorCode),
		Attempt:   attempt,
		LatencyMs: latency.Milliseconds(),
	}

	if err := s.db.Create(&event).Error; err != nil {
		log.Printf("[PUSH] Failed to persist delivery event: %v", err)
	}
}

func (s *PushNotificationService) markTokenDeliverySuccess(token string) {
	if s.db == nil {
		return
	}
	token = sanitizePushToken(token)
	if token == "" {
		return
	}

	now := time.Now()
	_ = s.db.Model(&models.UserDeviceToken{}).
		Where("token = ?", token).
		Updates(map[string]interface{}{
			"fail_count":     0,
			"last_seen_at":   now,
			"invalidated_at": nil,
			"updated_at":     now,
		}).Error
}

func (s *PushNotificationService) bumpTokenFailCount(token string) {
	if s.db == nil {
		return
	}
	token = sanitizePushToken(token)
	if token == "" {
		return
	}

	now := time.Now()
	_ = s.db.Model(&models.UserDeviceToken{}).
		Where("token = ? AND invalidated_at IS NULL", token).
		Updates(map[string]interface{}{
			"fail_count":   gorm.Expr("fail_count + 1"),
			"last_seen_at": now,
			"updated_at":   now,
		}).Error
}

func (s *PushNotificationService) invalidateToken(token string) {
	if s.db == nil {
		return
	}
	token = sanitizePushToken(token)
	if token == "" {
		return
	}

	now := time.Now()
	_ = s.db.Model(&models.UserDeviceToken{}).
		Where("token = ? AND invalidated_at IS NULL", token).
		Updates(map[string]interface{}{
			"invalidated_at": now,
			"fail_count":     gorm.Expr("fail_count + 1"),
			"updated_at":     now,
		}).Error

	// Cleanup legacy single-token storage when provider says token is invalid.
	_ = s.db.Model(&models.User{}).Where("push_token = ?", token).Update("push_token", "").Error
}

func sanitizePushToken(token string) string {
	return strings.TrimSpace(token)
}

func normalizeProvider(provider string, token string) string {
	p := strings.TrimSpace(strings.ToLower(provider))
	switch p {
	case providerFCM, providerExpo:
		return p
	}

	token = sanitizePushToken(token)
	if strings.HasPrefix(token, "ExponentPushToken[") || strings.HasPrefix(token, "ExpoPushToken[") {
		return providerExpo
	}
	return providerFCM
}

func normalizePlatform(platform string) string {
	p := strings.TrimSpace(strings.ToLower(platform))
	switch p {
	case "ios", "android", "web":
		return p
	default:
		return "unknown"
	}
}

func classifyFCMError(errorCode string) string {
	switch strings.TrimSpace(errorCode) {
	case "InvalidRegistration", "NotRegistered", "MismatchSenderId", "MissingRegistration", "InvalidPackageName", "MessageTooBig", "InvalidDataKey", "InvalidTtl":
		return errorTypePermanent
	case "Unavailable", "InternalServerError", "DeviceMessageRateExceeded", "TopicsMessageRateExceeded":
		return errorTypeTransient
	default:
		return errorTypeUnknown
	}
}

func classifyExpoError(errorCode string) string {
	err := strings.TrimSpace(strings.ToLower(errorCode))
	switch err {
	case "devicenotregistered", "messageistoobig", "messagetoobig", "mismatchsenderid", "invalidcredentials":
		return errorTypePermanent
	case "messagerateexceeded", "expopushservererror", "toomanyrequests", "serviceunavailable", "internalerror":
		return errorTypeTransient
	default:
		if strings.Contains(err, "not registered") {
			return errorTypePermanent
		}
		if strings.Contains(err, "rate") || strings.Contains(err, "timeout") || strings.Contains(err, "tempor") {
			return errorTypeTransient
		}
		return errorTypeUnknown
	}
}

func deriveEventKey(message PushMessage) string {
	if strings.TrimSpace(message.EventKey) != "" {
		return strings.TrimSpace(message.EventKey)
	}
	if message.Data == nil {
		return ""
	}
	eventType := strings.TrimSpace(message.Data["type"])
	if eventType == "" {
		return ""
	}

	idKeys := []string{"bookingId", "newsId", "walletTxId", "orderId", "yatraId", "projectId", "roomId"}
	for _, key := range idKeys {
		if value := strings.TrimSpace(message.Data[key]); value != "" {
			return eventType + ":" + key + ":" + value
		}
	}

	return ""
}

func digestRecipients(targets []pushTokenTarget) string {
	if len(targets) == 0 {
		return ""
	}
	tokens := make([]string, 0, len(targets))
	for _, target := range targets {
		token := sanitizePushToken(target.Token)
		if token != "" {
			tokens = append(tokens, token)
		}
	}
	if len(tokens) == 0 {
		return ""
	}
	sort.Strings(tokens)
	hash := sha256.Sum256([]byte(strings.Join(tokens, "|")))
	return hex.EncodeToString(hash[:])
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(sanitizePushToken(token)))
	return hex.EncodeToString(hash[:])
}

func percentage(part int64, total int64) float64 {
	if total <= 0 {
		return 0
	}
	return (float64(part) * 100.0) / float64(total)
}

func resolveSettingOrEnv(settingValue string, envValue string) (string, string) {
	if setting := strings.TrimSpace(settingValue); setting != "" {
		return setting, "db"
	}
	if env := strings.TrimSpace(envValue); env != "" {
		return env, "env"
	}
	return "", "none"
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
