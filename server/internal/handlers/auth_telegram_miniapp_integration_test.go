package handlers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupAuthTelegramMiniAppIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.AuthSession{}, &models.SystemSetting{}))

	tx := db.Begin()
	require.NoError(t, tx.Error)

	database.DB = tx
	require.NoError(t, tx.Create(&models.SystemSetting{Key: "TELEGRAM_AUTH_ENABLED", Value: "true"}).Error)
	require.NoError(t, tx.Create(&models.SystemSetting{Key: "TELEGRAM_AUTH_BOT_TOKEN", Value: "test-telegram-auth-token"}).Error)
	require.NoError(t, tx.Create(&models.SystemSetting{Key: "TELEGRAM_AUTH_MAX_AGE_SEC", Value: "300"}).Error)

	t.Setenv("JWT_SECRET", "telegram-miniapp-test-secret")
	t.Setenv("AUTH_REFRESH_V1", "true")

	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})

	return tx
}

func newAuthTelegramMiniAppTestApp() *fiber.App {
	app := fiber.New()
	handler := NewAuthHandler(nil, nil)
	app.Post("/api/auth/telegram/miniapp/login", handler.TelegramMiniAppLogin)
	app.Post("/api/auth/telegram/miniapp/link", handler.TelegramMiniAppLink)
	return app
}

func createAuthTelegramTestUser(t *testing.T, attrs authTelegramTestUserAttrs) models.User {
	t.Helper()

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(attrs.Password), bcrypt.DefaultCost)
	require.NoError(t, err)

	user := models.User{
		Email:             attrs.Email,
		Password:          string(passwordHash),
		KarmicName:        "telegram-user",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		InviteCode:        fmt.Sprintf("TG%06d", time.Now().UnixNano()%1000000),
	}
	if attrs.TelegramUserID != nil {
		user.TelegramUserID = attrs.TelegramUserID
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

type authTelegramTestUserAttrs struct {
	Email          string
	Password       string
	TelegramUserID *int64
}

func TestAuthTelegramMiniAppLogin_SuccessForLinkedUser(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	telegramID := int64(700001)
	_ = createAuthTelegramTestUser(t, authTelegramTestUserAttrs{
		Email:          fmt.Sprintf("linked-%d@vedicai.local", time.Now().UnixNano()),
		Password:       "password123",
		TelegramUserID: &telegramID,
	})

	initData := buildHandlerTelegramInitData(t, "test-telegram-auth-token", time.Now().UTC().Unix()-15, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     fmt.Sprintf(`{"id":%d,"first_name":"L","last_name":"U","username":"linked_user","language_code":"ru"}`, telegramID),
	})

	payload, _ := json.Marshal(map[string]string{
		"initData": initData,
		"deviceId": "tg-miniapp-device-1",
	})
	req := httptest.NewRequest("POST", "/api/auth/telegram/miniapp/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body["token"])
	require.NotEmpty(t, body["accessToken"])
	require.NotEmpty(t, body["refreshToken"])
}

func TestAuthTelegramMiniAppLogin_ReturnsLinkRequired(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	initData := buildHandlerTelegramInitData(t, "test-telegram-auth-token", time.Now().UTC().Unix()-10, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":701111,"first_name":"NoLink","username":"nolink"}`,
	})

	payload, _ := json.Marshal(map[string]string{
		"initData": initData,
	})
	req := httptest.NewRequest("POST", "/api/auth/telegram/miniapp/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusConflict, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, "TELEGRAM_LINK_REQUIRED", body["errorCode"])
}

func TestAuthTelegramMiniAppLink_Success(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	email := fmt.Sprintf("link-%d@vedicai.local", time.Now().UnixNano())
	user := createAuthTelegramTestUser(t, authTelegramTestUserAttrs{
		Email:    email,
		Password: "password123",
	})

	telegramID := int64(702222)
	initData := buildHandlerTelegramInitData(t, "test-telegram-auth-token", time.Now().UTC().Unix()-10, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     fmt.Sprintf(`{"id":%d,"first_name":"Link","last_name":"Me","username":"link_me","language_code":"en"}`, telegramID),
	})

	payload, _ := json.Marshal(map[string]string{
		"initData": initData,
		"email":    email,
		"password": "password123",
		"deviceId": "tg-miniapp-device-2",
	})
	req := httptest.NewRequest("POST", "/api/auth/telegram/miniapp/link", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body["token"])

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.NotNil(t, refreshed.TelegramUserID)
	require.EqualValues(t, telegramID, *refreshed.TelegramUserID)
	require.Equal(t, "link_me", refreshed.TelegramUsername)
}

func TestAuthTelegramMiniAppLink_Conflict(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	telegramID := int64(703333)
	_ = createAuthTelegramTestUser(t, authTelegramTestUserAttrs{
		Email:          fmt.Sprintf("owner-%d@vedicai.local", time.Now().UnixNano()),
		Password:       "password123",
		TelegramUserID: &telegramID,
	})

	email := fmt.Sprintf("target-%d@vedicai.local", time.Now().UnixNano())
	_ = createAuthTelegramTestUser(t, authTelegramTestUserAttrs{
		Email:    email,
		Password: "password123",
	})

	initData := buildHandlerTelegramInitData(t, "test-telegram-auth-token", time.Now().UTC().Unix()-10, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     fmt.Sprintf(`{"id":%d,"first_name":"Conflict","username":"conflict"}`, telegramID),
	})

	payload, _ := json.Marshal(map[string]string{
		"initData": initData,
		"email":    email,
		"password": "password123",
	})
	req := httptest.NewRequest("POST", "/api/auth/telegram/miniapp/link", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusConflict, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, "TELEGRAM_LINK_CONFLICT", body["errorCode"])
}

func buildHandlerTelegramInitData(t *testing.T, botToken string, authDate int64, fields map[string]string) string {
	t.Helper()

	values := url.Values{}
	values.Set("auth_date", strconv.FormatInt(authDate, 10))
	for key, value := range fields {
		values.Set(key, value)
	}

	dataCheck := buildHandlerTelegramDataCheck(values)
	values.Set("hash", buildHandlerTelegramHash(dataCheck, botToken))
	return values.Encode()
}

func buildHandlerTelegramDataCheck(values url.Values) string {
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

func buildHandlerTelegramHash(dataCheck, botToken string) string {
	seed := hmac.New(sha256.New, []byte("WebAppData"))
	_, _ = seed.Write([]byte(botToken))
	secret := seed.Sum(nil)

	signature := hmac.New(sha256.New, secret)
	_, _ = signature.Write([]byte(dataCheck))
	return hex.EncodeToString(signature.Sum(nil))
}
