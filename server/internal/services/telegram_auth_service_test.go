package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"strconv"
	"testing"
	"time"
)

func TestTelegramAuthService_VerifyMiniAppInitData_Valid(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	settings := map[string]string{
		"TELEGRAM_AUTH_ENABLED":     "true",
		"TELEGRAM_AUTH_BOT_TOKEN":   "test-bot-token",
		"TELEGRAM_AUTH_MAX_AGE_SEC": "300",
	}
	svc := newTestTelegramAuthService(settings, now, nil)

	initData := buildTelegramTestInitData(t, "test-bot-token", now.Unix()-30, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":123456,"first_name":"Ivan","last_name":"Petrov","username":"ivan","language_code":"ru"}`,
	})

	user, err := svc.VerifyMiniAppInitData(initData)
	if err != nil {
		t.Fatalf("VerifyMiniAppInitData returned error: %v", err)
	}
	if user.ID != 123456 {
		t.Fatalf("user.ID=%d want=123456", user.ID)
	}
	if user.Username != "ivan" {
		t.Fatalf("user.Username=%q want=ivan", user.Username)
	}
	if !svc.IsCISLanguage("ru-RU") {
		t.Fatalf("expected ru-RU to be treated as CIS language")
	}
}

func TestTelegramAuthService_VerifyMiniAppInitData_InvalidHash(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	settings := map[string]string{
		"TELEGRAM_AUTH_ENABLED":   "true",
		"TELEGRAM_AUTH_BOT_TOKEN": "test-bot-token",
	}
	svc := newTestTelegramAuthService(settings, now, nil)

	values, err := url.ParseQuery(buildTelegramTestInitData(t, "test-bot-token", now.Unix()-10, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":987654,"first_name":"John"}`,
	}))
	if err != nil {
		t.Fatalf("ParseQuery failed: %v", err)
	}
	values.Set("hash", "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")

	_, verifyErr := svc.VerifyMiniAppInitData(values.Encode())
	if verifyErr != ErrTelegramInitDataInvalid {
		t.Fatalf("VerifyMiniAppInitData error=%v want=%v", verifyErr, ErrTelegramInitDataInvalid)
	}
}

func TestTelegramAuthService_VerifyMiniAppInitData_Expired(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	settings := map[string]string{
		"TELEGRAM_AUTH_ENABLED":     "true",
		"TELEGRAM_AUTH_BOT_TOKEN":   "test-bot-token",
		"TELEGRAM_AUTH_MAX_AGE_SEC": "300",
	}
	svc := newTestTelegramAuthService(settings, now, nil)

	initData := buildTelegramTestInitData(t, "test-bot-token", now.Unix()-301, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":123456,"first_name":"Ivan"}`,
	})

	_, verifyErr := svc.VerifyMiniAppInitData(initData)
	if verifyErr != ErrTelegramInitDataExpired {
		t.Fatalf("VerifyMiniAppInitData error=%v want=%v", verifyErr, ErrTelegramInitDataExpired)
	}
}

func TestTelegramAuthService_VerifyMiniAppInitData_Replay(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	settings := map[string]string{
		"TELEGRAM_AUTH_ENABLED":   "true",
		"TELEGRAM_AUTH_BOT_TOKEN": "test-bot-token",
	}

	seen := make(map[string]bool)
	replayGuard := func(hash string, _ time.Duration) error {
		if seen[hash] {
			return ErrTelegramInitDataReplay
		}
		seen[hash] = true
		return nil
	}
	svc := newTestTelegramAuthService(settings, now, replayGuard)
	initData := buildTelegramTestInitData(t, "test-bot-token", now.Unix()-20, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":123456,"first_name":"Ivan"}`,
	})

	if _, err := svc.VerifyMiniAppInitData(initData); err != nil {
		t.Fatalf("first VerifyMiniAppInitData returned error: %v", err)
	}
	if _, err := svc.VerifyMiniAppInitData(initData); err != ErrTelegramInitDataReplay {
		t.Fatalf("second VerifyMiniAppInitData error=%v want=%v", err, ErrTelegramInitDataReplay)
	}
}

func TestTelegramAuthService_VerifyMiniAppInitData_PurposeScopedReplay(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	settings := map[string]string{
		"TELEGRAM_AUTH_ENABLED":   "true",
		"TELEGRAM_AUTH_BOT_TOKEN": "test-bot-token",
	}

	seen := make(map[string]bool)
	replayGuard := func(hash string, _ time.Duration) error {
		if seen[hash] {
			return ErrTelegramInitDataReplay
		}
		seen[hash] = true
		return nil
	}
	svc := newTestTelegramAuthService(settings, now, replayGuard)
	initData := buildTelegramTestInitData(t, "test-bot-token", now.Unix()-20, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":123456,"first_name":"Ivan"}`,
	})

	if _, err := svc.VerifyMiniAppInitDataWithPurpose(initData, "miniapp_login"); err != nil {
		t.Fatalf("VerifyMiniAppInitDataWithPurpose(login) returned error: %v", err)
	}
	if _, err := svc.VerifyMiniAppInitDataWithPurpose(initData, "miniapp_link"); err != nil {
		t.Fatalf("VerifyMiniAppInitDataWithPurpose(link) returned error: %v", err)
	}
	if _, err := svc.VerifyMiniAppInitDataWithPurpose(initData, "miniapp_login"); err != ErrTelegramInitDataReplay {
		t.Fatalf("second VerifyMiniAppInitDataWithPurpose(login) error=%v want=%v", err, ErrTelegramInitDataReplay)
	}
}

func TestTelegramAuthService_ResolveAuthBotToken_FallbackToSupportToken(t *testing.T) {
	now := time.Unix(1700000000, 0).UTC()
	settings := map[string]string{
		"TELEGRAM_AUTH_ENABLED":      "true",
		"SUPPORT_TELEGRAM_BOT_TOKEN": "support-token",
	}
	svc := newTestTelegramAuthService(settings, now, nil)

	if token := svc.ResolveAuthBotToken(); token != "support-token" {
		t.Fatalf("ResolveAuthBotToken=%q want=support-token", token)
	}
}

func newTestTelegramAuthService(
	settings map[string]string,
	now time.Time,
	replayGuard func(string, time.Duration) error,
) *TelegramAuthService {
	return NewTelegramAuthServiceWithDeps(
		nil,
		nil,
		func(key string) string {
			if settings == nil {
				return ""
			}
			return settings[key]
		},
		replayGuard,
		func() time.Time { return now },
	)
}

func buildTelegramTestInitData(t *testing.T, botToken string, authDate int64, fields map[string]string) string {
	t.Helper()
	values := url.Values{}
	values.Set("auth_date", strconv.FormatInt(authDate, 10))
	for key, value := range fields {
		values.Set(key, value)
	}

	dataCheckString := buildTelegramDataCheckString(values)
	values.Set("hash", telegramTestHash(dataCheckString, botToken))
	return values.Encode()
}

func telegramTestHash(dataCheckString, botToken string) string {
	seed := hmac.New(sha256.New, []byte("WebAppData"))
	_, _ = seed.Write([]byte(botToken))
	secret := seed.Sum(nil)

	check := hmac.New(sha256.New, secret)
	_, _ = check.Write([]byte(dataCheckString))
	return hex.EncodeToString(check.Sum(nil))
}
