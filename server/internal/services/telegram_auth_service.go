package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/url"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

var (
	ErrTelegramAuthDisabled        = errors.New("telegram auth is disabled")
	ErrTelegramAuthBotTokenMissing = errors.New("telegram auth bot token is not configured")
	ErrTelegramInitDataInvalid     = errors.New("telegram initData is invalid")
	ErrTelegramInitDataExpired     = errors.New("telegram initData is expired")
	ErrTelegramInitDataReplay      = errors.New("telegram initData replay detected")
)

const (
	defaultTelegramAuthMaxAgeSec = 300
	telegramAuthReplayPrefix     = "telegram_auth:miniapp:replay:"
	defaultCISLanguageCodes      = "ru,uk,be,kk,uz,ky,tg,hy,az,mo"
)

type TelegramMiniAppUser struct {
	ID           int64
	Username     string
	FirstName    string
	LastName     string
	LanguageCode string
}

type TelegramAuthService struct {
	db               *gorm.DB
	redis            *RedisService
	now              func() time.Time
	settingsProvider func(string) string
	replayGuard      func(string, time.Duration) error
}

func NewTelegramAuthService(db *gorm.DB) *TelegramAuthService {
	if db == nil {
		db = database.DB
	}
	return &TelegramAuthService{
		db:    db,
		redis: NewRedisService(),
		now:   time.Now,
	}
}

func NewTelegramAuthServiceWithDeps(
	db *gorm.DB,
	redis *RedisService,
	settingsProvider func(string) string,
	replayGuard func(string, time.Duration) error,
	now func() time.Time,
) *TelegramAuthService {
	if db == nil {
		db = database.DB
	}
	if now == nil {
		now = time.Now
	}
	return &TelegramAuthService{
		db:               db,
		redis:            redis,
		now:              now,
		settingsProvider: settingsProvider,
		replayGuard:      replayGuard,
	}
}

func (s *TelegramAuthService) ResolveAuthBotToken() string {
	token := strings.TrimSpace(s.getSetting("TELEGRAM_AUTH_BOT_TOKEN"))
	if token != "" {
		return token
	}
	return strings.TrimSpace(s.getSetting("SUPPORT_TELEGRAM_BOT_TOKEN"))
}

func (s *TelegramAuthService) IsCISLanguage(code string) bool {
	language := strings.ToLower(strings.TrimSpace(code))
	if language == "" {
		return false
	}
	if sep := strings.IndexAny(language, "-_"); sep > 0 {
		language = language[:sep]
	}

	for _, item := range s.cisLanguageCodes() {
		if language == item {
			return true
		}
	}
	return false
}

func (s *TelegramAuthService) CheckReplay(initDataHash string) error {
	hash := strings.TrimSpace(strings.ToLower(initDataHash))
	if hash == "" {
		return ErrTelegramInitDataInvalid
	}
	ttl := time.Duration(s.maxAgeSeconds()) * time.Second

	if s.replayGuard != nil {
		return s.replayGuard(hash, ttl)
	}

	if s.redis == nil || !s.redis.IsConnected() {
		log.Printf("[TelegramAuth] replay guard skipped: redis unavailable")
		return nil
	}
	client := s.redis.GetClient()
	if client == nil {
		log.Printf("[TelegramAuth] replay guard skipped: redis client is nil")
		return nil
	}

	allowed, err := client.SetNX(context.Background(), telegramAuthReplayPrefix+hash, "1", ttl).Result()
	if err != nil {
		log.Printf("[TelegramAuth] replay guard skipped: redis setnx error: %v", err)
		return nil
	}
	if !allowed {
		return ErrTelegramInitDataReplay
	}
	return nil
}

func (s *TelegramAuthService) VerifyMiniAppInitData(initData string) (TelegramMiniAppUser, error) {
	return s.VerifyMiniAppInitDataWithPurpose(initData, "default")
}

func (s *TelegramAuthService) VerifyMiniAppInitDataWithPurpose(initData string, purpose string) (TelegramMiniAppUser, error) {
	if !s.isEnabled() {
		return TelegramMiniAppUser{}, ErrTelegramAuthDisabled
	}

	raw := strings.TrimSpace(initData)
	if raw == "" {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	botToken := s.ResolveAuthBotToken()
	if botToken == "" {
		return TelegramMiniAppUser{}, ErrTelegramAuthBotTokenMissing
	}

	values, err := url.ParseQuery(raw)
	if err != nil {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	receivedHash := strings.ToLower(strings.TrimSpace(values.Get("hash")))
	if len(receivedHash) != 64 {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	authDateRaw := strings.TrimSpace(values.Get("auth_date"))
	authDateUnix, err := strconv.ParseInt(authDateRaw, 10, 64)
	if err != nil || authDateUnix <= 0 {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	dataCheckString := buildTelegramDataCheckString(values)
	if !verifyTelegramMiniAppHash(dataCheckString, receivedHash, botToken) {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	now := s.now().UTC()
	authTime := time.Unix(authDateUnix, 0).UTC()
	if now.Sub(authTime) > time.Duration(s.maxAgeSeconds())*time.Second {
		return TelegramMiniAppUser{}, ErrTelegramInitDataExpired
	}
	if authTime.After(now.Add(30 * time.Second)) {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	sum := sha256.Sum256([]byte(raw))
	initDataHash := hex.EncodeToString(sum[:])
	replayKey := initDataHash
	normalizedPurpose := strings.TrimSpace(strings.ToLower(purpose))
	if normalizedPurpose != "" {
		replayKey = normalizedPurpose + ":" + initDataHash
	}
	if err := s.CheckReplay(replayKey); err != nil {
		return TelegramMiniAppUser{}, err
	}

	rawUser := strings.TrimSpace(values.Get("user"))
	if rawUser == "" {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	var parsedUser struct {
		ID           int64  `json:"id"`
		Username     string `json:"username"`
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		LanguageCode string `json:"language_code"`
	}
	if err := json.Unmarshal([]byte(rawUser), &parsedUser); err != nil {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}
	if parsedUser.ID <= 0 {
		return TelegramMiniAppUser{}, ErrTelegramInitDataInvalid
	}

	return TelegramMiniAppUser{
		ID:           parsedUser.ID,
		Username:     strings.TrimSpace(parsedUser.Username),
		FirstName:    strings.TrimSpace(parsedUser.FirstName),
		LastName:     strings.TrimSpace(parsedUser.LastName),
		LanguageCode: strings.TrimSpace(parsedUser.LanguageCode),
	}, nil
}

func (s *TelegramAuthService) isEnabled() bool {
	return parseBoolSetting(s.getSetting("TELEGRAM_AUTH_ENABLED"), true)
}

func (s *TelegramAuthService) maxAgeSeconds() int {
	raw := strings.TrimSpace(s.getSetting("TELEGRAM_AUTH_MAX_AGE_SEC"))
	if raw == "" {
		return defaultTelegramAuthMaxAgeSec
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return defaultTelegramAuthMaxAgeSec
	}
	if parsed > 3600 {
		return 3600
	}
	return parsed
}

func (s *TelegramAuthService) cisLanguageCodes() []string {
	raw := strings.TrimSpace(s.getSetting("TELEGRAM_AUTH_CIS_LANG_CODES"))
	if raw == "" {
		raw = defaultCISLanguageCodes
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.ToLower(strings.TrimSpace(part))
		if item == "" {
			continue
		}
		if sep := strings.IndexAny(item, "-_"); sep > 0 {
			item = item[:sep]
		}
		result = append(result, item)
	}
	return result
}

func (s *TelegramAuthService) getSetting(key string) string {
	if s.settingsProvider != nil {
		return strings.TrimSpace(s.settingsProvider(key))
	}
	if s.db != nil {
		var setting models.SystemSetting
		if err := s.db.Where("key = ?", key).First(&setting).Error; err == nil {
			value := strings.TrimSpace(setting.Value)
			if value != "" {
				return value
			}
		}
	}
	return strings.TrimSpace(os.Getenv(key))
}

func parseBoolSetting(raw string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "on", "enabled":
		return true
	case "0", "false", "no", "off", "disabled":
		return false
	default:
		return fallback
	}
}

func buildTelegramDataCheckString(values url.Values) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		if key == "hash" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		value := ""
		if list := values[key]; len(list) > 0 {
			value = list[0]
		}
		lines = append(lines, key+"="+value)
	}
	return strings.Join(lines, "\n")
}

func verifyTelegramMiniAppHash(dataCheckString, receivedHash, botToken string) bool {
	seedMAC := hmac.New(sha256.New, []byte("WebAppData"))
	_, _ = seedMAC.Write([]byte(botToken))
	secret := seedMAC.Sum(nil)

	checkMAC := hmac.New(sha256.New, secret)
	_, _ = checkMAC.Write([]byte(dataCheckString))
	expectedHash := hex.EncodeToString(checkMAC.Sum(nil))

	receivedHash = strings.ToLower(strings.TrimSpace(receivedHash))
	if len(receivedHash) != len(expectedHash) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(receivedHash), []byte(expectedHash)) == 1
}
