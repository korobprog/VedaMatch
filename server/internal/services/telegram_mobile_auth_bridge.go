package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	telegramMobileAuthTTL         = 10 * time.Minute
	telegramMobileAuthStatePrefix = "telegram_auth:mobile:state:"
	telegramMobileAuthStartPrefix = "vm_auth_"
	defaultTelegramBotURL         = "https://t.me/vedamatch_bot"
	defaultTelegramMobileCallback = "vedamatch://auth/telegram/callback"
	defaultTelegramUniversalAuth  = "https://api.vedamatch.ru/auth/telegram/callback"
)

var (
	ErrTelegramMobileAuthStateInvalid   = errors.New("telegram mobile auth state is invalid")
	ErrTelegramMobileAuthStateExpired   = errors.New("telegram mobile auth state is expired")
	ErrTelegramMobileAuthStateConsumed  = errors.New("telegram mobile auth state is already consumed")
	ErrTelegramMobileAuthStateNotReady  = errors.New("telegram mobile auth state is not ready")
	ErrTelegramMobileAuthDeviceMismatch = errors.New("telegram mobile auth device mismatch")
)

type TelegramMobileAuthState struct {
	State       string          `json:"state"`
	DeviceID    string          `json:"deviceId,omitempty"`
	Status      string          `json:"status"`
	AuthPayload json.RawMessage `json:"authPayload,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
	ExpiresAt   time.Time       `json:"expiresAt"`
}

type telegramMobileAuthMemoryStore struct {
	mu    sync.Mutex
	items map[string]TelegramMobileAuthState
}

var defaultTelegramMobileAuthMemoryStore = &telegramMobileAuthMemoryStore{
	items: make(map[string]TelegramMobileAuthState),
}

func buildTelegramMobileAuthState() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.TrimRight(base64.RawURLEncoding.EncodeToString(buf), "="), nil
}

func BuildTelegramMobileStartParam(state string) string {
	trimmed := strings.TrimSpace(state)
	if trimmed == "" {
		return telegramMobileAuthStartPrefix
	}
	return telegramMobileAuthStartPrefix + trimmed
}

func ExtractTelegramMobileStateFromStartParam(raw string) string {
	value := strings.TrimSpace(raw)
	if !strings.HasPrefix(value, telegramMobileAuthStartPrefix) {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(value, telegramMobileAuthStartPrefix))
}

func normalizeTelegramBotURL(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return defaultTelegramBotURL
	}

	if strings.HasPrefix(value, "@") {
		value = "https://t.me/" + strings.TrimPrefix(value, "@")
	} else if !strings.Contains(value, "://") {
		if strings.Contains(value, "t.me/") {
			value = "https://" + strings.TrimPrefix(strings.TrimPrefix(value, "https://"), "http://")
		} else {
			value = "https://t.me/" + strings.TrimPrefix(value, "@")
		}
	}

	if !strings.Contains(strings.ToLower(value), "t.me/") {
		return defaultTelegramBotURL
	}
	return value
}

func (s *TelegramAuthService) ResolveMobileAuthLaunchURL(state string) string {
	baseURL := strings.TrimSpace(s.getSetting("TELEGRAM_AUTH_BOT_URL"))
	if baseURL == "" {
		baseURL = strings.TrimSpace(s.getSetting("SUPPORT_TELEGRAM_BOT_URL"))
	}
	normalized := normalizeTelegramBotURL(baseURL)
	separator := "?"
	if strings.Contains(normalized, "?") {
		separator = "&"
	}
	return normalized + separator + "startapp=" + url.QueryEscape(BuildTelegramMobileStartParam(state))
}

func (s *TelegramAuthService) ResolveMobileAuthDeepLink(state string) string {
	query := url.Values{}
	query.Set("state", strings.TrimSpace(state))
	return defaultTelegramUniversalAuth + "?" + query.Encode()
}

func (s *TelegramAuthService) ResolveMobileAuthNativeDeepLink(state string) string {
	query := url.Values{}
	query.Set("state", strings.TrimSpace(state))
	return defaultTelegramMobileCallback + "?" + query.Encode()
}

func (s *TelegramAuthService) CreateMobileAuthState(deviceID string) (TelegramMobileAuthState, error) {
	state, err := buildTelegramMobileAuthState()
	if err != nil {
		return TelegramMobileAuthState{}, err
	}

	now := s.now().UTC()
	entry := TelegramMobileAuthState{
		State:     state,
		DeviceID:  strings.TrimSpace(deviceID),
		Status:    "pending",
		CreatedAt: now,
		ExpiresAt: now.Add(telegramMobileAuthTTL),
	}

	if err := s.saveMobileAuthState(entry); err != nil {
		return TelegramMobileAuthState{}, err
	}
	return entry, nil
}

func (s *TelegramAuthService) CompleteMobileAuthState(state string, authPayload json.RawMessage) (TelegramMobileAuthState, error) {
	entry, err := s.loadMobileAuthState(state)
	if err != nil {
		return TelegramMobileAuthState{}, err
	}
	if entry.Status == "consumed" {
		return TelegramMobileAuthState{}, ErrTelegramMobileAuthStateConsumed
	}
	if entry.Status == "ready" && len(entry.AuthPayload) > 0 {
		return entry, nil
	}

	entry.Status = "ready"
	entry.AuthPayload = append(json.RawMessage(nil), authPayload...)
	if err := s.saveMobileAuthState(entry); err != nil {
		return TelegramMobileAuthState{}, err
	}
	return entry, nil
}

func (s *TelegramAuthService) ConsumeMobileAuthState(state string, deviceID string) (json.RawMessage, error) {
	entry, err := s.loadMobileAuthState(state)
	if err != nil {
		return nil, err
	}
	if entry.Status == "consumed" {
		return nil, ErrTelegramMobileAuthStateConsumed
	}
	if entry.Status != "ready" || len(entry.AuthPayload) == 0 {
		return nil, ErrTelegramMobileAuthStateNotReady
	}

	normalizedDeviceID := strings.TrimSpace(deviceID)
	if entry.DeviceID != "" && normalizedDeviceID != "" && entry.DeviceID != normalizedDeviceID {
		return nil, ErrTelegramMobileAuthDeviceMismatch
	}
	if entry.DeviceID != "" && normalizedDeviceID == "" {
		return nil, ErrTelegramMobileAuthDeviceMismatch
	}

	if err := s.deleteMobileAuthState(entry.State); err != nil {
		return nil, err
	}

	entry.Status = "consumed"
	_ = s.saveMobileAuthState(entry)
	return append(json.RawMessage(nil), entry.AuthPayload...), nil
}

func (s *TelegramAuthService) saveMobileAuthState(entry TelegramMobileAuthState) error {
	if strings.TrimSpace(entry.State) == "" {
		return ErrTelegramMobileAuthStateInvalid
	}
	defaultTelegramMobileAuthMemoryStore.save(entry)

	if s.redis == nil || !s.redis.IsConnected() {
		return nil
	}
	client := s.redis.GetClient()
	if client == nil {
		return nil
	}

	payload, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	ttl := time.Until(entry.ExpiresAt)
	if ttl <= 0 {
		ttl = time.Second
	}
	return client.Set(context.Background(), telegramMobileAuthStatePrefix+entry.State, payload, ttl).Err()
}

func (s *TelegramAuthService) loadMobileAuthState(state string) (TelegramMobileAuthState, error) {
	normalizedState := strings.TrimSpace(state)
	if normalizedState == "" {
		return TelegramMobileAuthState{}, ErrTelegramMobileAuthStateInvalid
	}

	if s.redis != nil && s.redis.IsConnected() {
		client := s.redis.GetClient()
		if client != nil {
			raw, err := client.Get(context.Background(), telegramMobileAuthStatePrefix+normalizedState).Result()
			if err == nil {
				var entry TelegramMobileAuthState
				if unmarshalErr := json.Unmarshal([]byte(raw), &entry); unmarshalErr == nil {
					if isTelegramMobileAuthExpired(entry) {
						_ = s.deleteMobileAuthState(normalizedState)
						return TelegramMobileAuthState{}, ErrTelegramMobileAuthStateExpired
					}
					return entry, nil
				}
			}
		}
	}

	entry, ok := defaultTelegramMobileAuthMemoryStore.load(normalizedState)
	if !ok {
		return TelegramMobileAuthState{}, ErrTelegramMobileAuthStateInvalid
	}
	if isTelegramMobileAuthExpired(entry) {
		_ = s.deleteMobileAuthState(normalizedState)
		return TelegramMobileAuthState{}, ErrTelegramMobileAuthStateExpired
	}
	return entry, nil
}

func (s *TelegramAuthService) deleteMobileAuthState(state string) error {
	normalizedState := strings.TrimSpace(state)
	if normalizedState == "" {
		return ErrTelegramMobileAuthStateInvalid
	}
	defaultTelegramMobileAuthMemoryStore.delete(normalizedState)

	if s.redis == nil || !s.redis.IsConnected() {
		return nil
	}
	client := s.redis.GetClient()
	if client == nil {
		return nil
	}
	return client.Del(context.Background(), telegramMobileAuthStatePrefix+normalizedState).Err()
}

func isTelegramMobileAuthExpired(entry TelegramMobileAuthState) bool {
	if entry.ExpiresAt.IsZero() {
		return true
	}
	return time.Now().UTC().After(entry.ExpiresAt)
}

func (s *telegramMobileAuthMemoryStore) save(entry TelegramMobileAuthState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneExpiredLocked()
	s.items[entry.State] = entry
}

func (s *telegramMobileAuthMemoryStore) load(state string) (TelegramMobileAuthState, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneExpiredLocked()
	entry, ok := s.items[state]
	return entry, ok
}

func (s *telegramMobileAuthMemoryStore) delete(state string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.items, state)
}

func (s *telegramMobileAuthMemoryStore) pruneExpiredLocked() {
	now := time.Now().UTC()
	for key, entry := range s.items {
		if entry.ExpiresAt.IsZero() || now.After(entry.ExpiresAt) {
			delete(s.items, key)
		}
	}
}

func ValidateTelegramMobileAuthPayload(raw json.RawMessage) error {
	if len(raw) == 0 {
		return fmt.Errorf("authPayload is required")
	}
	var payload struct {
		Token       string          `json:"token"`
		AccessToken string          `json:"accessToken"`
		User        json.RawMessage `json:"user"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("authPayload is invalid")
	}
	if strings.TrimSpace(payload.AccessToken) == "" && strings.TrimSpace(payload.Token) == "" {
		return fmt.Errorf("authPayload token is missing")
	}
	if len(payload.User) == 0 {
		return fmt.Errorf("authPayload user is missing")
	}
	return nil
}
