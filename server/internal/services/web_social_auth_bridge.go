package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"
)

const (
	webSocialAuthStateTTL    = 10 * time.Minute
	webSocialAuthStatePrefix = "web_social_auth:state:"
)

var (
	ErrWebSocialAuthStateInvalid     = errors.New("web social auth state is invalid")
	ErrWebSocialAuthStateExpired     = errors.New("web social auth state is expired")
	ErrWebSocialAuthStateConsumed    = errors.New("web social auth state is already consumed")
	ErrWebSocialAuthProviderMismatch = errors.New("web social auth provider mismatch")
)

type WebSocialAuthState struct {
	State        string    `json:"state"`
	Provider     string    `json:"provider"`
	DeviceID     string    `json:"deviceId,omitempty"`
	TargetOrigin string    `json:"targetOrigin"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type webSocialAuthMemoryStore struct {
	mu    sync.Mutex
	items map[string]WebSocialAuthState
}

var defaultWebSocialAuthMemoryStore = &webSocialAuthMemoryStore{
	items: make(map[string]WebSocialAuthState),
}

type WebSocialAuthBridgeService struct {
	redis *RedisService
	now   func() time.Time
}

func NewWebSocialAuthBridgeService() *WebSocialAuthBridgeService {
	return &WebSocialAuthBridgeService{
		redis: NewRedisService(),
		now:   time.Now,
	}
}

func buildWebSocialAuthState() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.TrimRight(base64.RawURLEncoding.EncodeToString(buf), "="), nil
}

func (s *WebSocialAuthBridgeService) CreateState(provider string, deviceID string, targetOrigin string) (WebSocialAuthState, error) {
	state, err := buildWebSocialAuthState()
	if err != nil {
		return WebSocialAuthState{}, err
	}

	now := s.now().UTC()
	entry := WebSocialAuthState{
		State:        state,
		Provider:     strings.TrimSpace(strings.ToLower(provider)),
		DeviceID:     strings.TrimSpace(deviceID),
		TargetOrigin: strings.TrimSpace(targetOrigin),
		Status:       "pending",
		CreatedAt:    now,
		ExpiresAt:    now.Add(webSocialAuthStateTTL),
	}
	if err := s.saveState(entry); err != nil {
		return WebSocialAuthState{}, err
	}
	return entry, nil
}

func (s *WebSocialAuthBridgeService) ConsumeState(provider string, state string) (WebSocialAuthState, error) {
	entry, err := s.loadState(state)
	if err != nil {
		return WebSocialAuthState{}, err
	}
	if entry.Status == "consumed" {
		return WebSocialAuthState{}, ErrWebSocialAuthStateConsumed
	}
	if normalizedProvider := strings.TrimSpace(strings.ToLower(provider)); normalizedProvider != "" && entry.Provider != normalizedProvider {
		return WebSocialAuthState{}, ErrWebSocialAuthProviderMismatch
	}
	if err := s.deleteState(entry.State); err != nil {
		return WebSocialAuthState{}, err
	}
	entry.Status = "consumed"
	_ = s.saveState(entry)
	return entry, nil
}

func (s *WebSocialAuthBridgeService) saveState(entry WebSocialAuthState) error {
	if strings.TrimSpace(entry.State) == "" || strings.TrimSpace(entry.TargetOrigin) == "" || strings.TrimSpace(entry.Provider) == "" {
		return ErrWebSocialAuthStateInvalid
	}

	defaultWebSocialAuthMemoryStore.save(entry)
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
	return client.Set(context.Background(), webSocialAuthStatePrefix+entry.State, payload, ttl).Err()
}

func (s *WebSocialAuthBridgeService) loadState(state string) (WebSocialAuthState, error) {
	normalizedState := strings.TrimSpace(state)
	if normalizedState == "" {
		return WebSocialAuthState{}, ErrWebSocialAuthStateInvalid
	}

	if s.redis != nil && s.redis.IsConnected() {
		client := s.redis.GetClient()
		if client != nil {
			raw, err := client.Get(context.Background(), webSocialAuthStatePrefix+normalizedState).Result()
			if err == nil {
				var entry WebSocialAuthState
				if unmarshalErr := json.Unmarshal([]byte(raw), &entry); unmarshalErr == nil {
					if isWebSocialAuthStateExpired(entry) {
						_ = s.deleteState(normalizedState)
						return WebSocialAuthState{}, ErrWebSocialAuthStateExpired
					}
					return entry, nil
				}
			}
		}
	}

	entry, ok := defaultWebSocialAuthMemoryStore.load(normalizedState)
	if !ok {
		return WebSocialAuthState{}, ErrWebSocialAuthStateInvalid
	}
	if isWebSocialAuthStateExpired(entry) {
		_ = s.deleteState(normalizedState)
		return WebSocialAuthState{}, ErrWebSocialAuthStateExpired
	}
	return entry, nil
}

func (s *WebSocialAuthBridgeService) deleteState(state string) error {
	normalizedState := strings.TrimSpace(state)
	if normalizedState == "" {
		return ErrWebSocialAuthStateInvalid
	}

	defaultWebSocialAuthMemoryStore.delete(normalizedState)
	if s.redis == nil || !s.redis.IsConnected() {
		return nil
	}

	client := s.redis.GetClient()
	if client == nil {
		return nil
	}
	return client.Del(context.Background(), webSocialAuthStatePrefix+normalizedState).Err()
}

func isWebSocialAuthStateExpired(entry WebSocialAuthState) bool {
	if entry.ExpiresAt.IsZero() {
		return true
	}
	return !entry.ExpiresAt.After(time.Now().UTC())
}

func (s *webSocialAuthMemoryStore) save(entry WebSocialAuthState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[entry.State] = entry
}

func (s *webSocialAuthMemoryStore) load(state string) (WebSocialAuthState, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.items[state]
	if !ok {
		return WebSocialAuthState{}, false
	}
	return entry, true
}

func (s *webSocialAuthMemoryStore) delete(state string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.items, state)
}
