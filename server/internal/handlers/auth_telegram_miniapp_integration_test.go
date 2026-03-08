package handlers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
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
	require.NoError(t, tx.Where("key = ?", "TELEGRAM_AUTH_ENABLED").
		Assign(models.SystemSetting{Value: "true"}).
		FirstOrCreate(&models.SystemSetting{Key: "TELEGRAM_AUTH_ENABLED"}).Error)
	require.NoError(t, tx.Where("key = ?", "TELEGRAM_AUTH_BOT_TOKEN").
		Assign(models.SystemSetting{Value: "test-telegram-auth-token"}).
		FirstOrCreate(&models.SystemSetting{Key: "TELEGRAM_AUTH_BOT_TOKEN"}).Error)
	require.NoError(t, tx.Where("key = ?", "TELEGRAM_AUTH_MAX_AGE_SEC").
		Assign(models.SystemSetting{Value: "300"}).
		FirstOrCreate(&models.SystemSetting{Key: "TELEGRAM_AUTH_MAX_AGE_SEC"}).Error)

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
	app.Get("/auth/telegram/callback", handler.TelegramMobileCallback)
	app.Get("/api/auth/telegram/callback", handler.TelegramMobileCallback)
	app.Post("/api/auth/telegram/mobile/start", handler.TelegramMobileAuthStart)
	app.Post("/api/auth/telegram/mobile/complete", handler.TelegramMobileAuthComplete)
	app.Post("/api/auth/telegram/mobile/exchange", handler.TelegramMobileAuthExchange)
	app.Post("/api/auth/telegram/miniapp/login", handler.TelegramMiniAppLogin)
	app.Post("/api/auth/telegram/miniapp/link", handler.TelegramMiniAppLink)
	return app
}

func createAuthTelegramTestUser(t *testing.T, attrs authTelegramTestUserAttrs) models.User {
	t.Helper()

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(attrs.Password), bcrypt.DefaultCost)
	require.NoError(t, err)

	user := models.User{
		Email:             strings.TrimSpace(strings.ToLower(attrs.Email)),
		Password:          string(passwordHash),
		KarmicName:        "telegram-user",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		GoogleSub:         fmt.Sprintf("test-google-sub-%d", time.Now().UnixNano()),
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
		Email:          fmt.Sprintf("linked-%d@VedaMatch.local", time.Now().UnixNano()),
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

	email := fmt.Sprintf("link-%d@VedaMatch.local", time.Now().UnixNano())
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
		Email:          fmt.Sprintf("owner-%d@VedaMatch.local", time.Now().UnixNano()),
		Password:       "password123",
		TelegramUserID: &telegramID,
	})

	email := fmt.Sprintf("target-%d@VedaMatch.local", time.Now().UnixNano())
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

func TestAuthTelegramMiniAppLink_RebindForSameUser(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	oldTelegramID := int64(704444)
	email := fmt.Sprintf("rebind-%d@VedaMatch.local", time.Now().UnixNano())
	user := createAuthTelegramTestUser(t, authTelegramTestUserAttrs{
		Email:          email,
		Password:       "password123",
		TelegramUserID: &oldTelegramID,
	})

	newTelegramID := int64(704445)
	initData := buildHandlerTelegramInitData(t, "test-telegram-auth-token", time.Now().UTC().Unix()-10, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     fmt.Sprintf(`{"id":%d,"first_name":"Re","last_name":"Bind","username":"rebind_user","language_code":"ru"}`, newTelegramID),
	})

	payload, _ := json.Marshal(map[string]string{
		"initData": initData,
		"email":    email,
		"password": "password123",
		"deviceId": "tg-miniapp-device-rebind",
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
	require.EqualValues(t, newTelegramID, *refreshed.TelegramUserID)
	require.Equal(t, "rebind_user", refreshed.TelegramUsername)
}

func TestAuthTelegramMobileBridge_StartCompleteExchange(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	startPayload, _ := json.Marshal(map[string]string{
		"deviceId": "tg-mobile-device-1",
	})
	startReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/start", bytes.NewBuffer(startPayload))
	startReq.Header.Set("Content-Type", "application/json")

	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, startResp.StatusCode)

	var startBody map[string]interface{}
	require.NoError(t, json.NewDecoder(startResp.Body).Decode(&startBody))
	state := strings.TrimSpace(fmt.Sprintf("%v", startBody["state"]))
	launchURL := strings.TrimSpace(fmt.Sprintf("%v", startBody["launchUrl"]))
	require.NotEmpty(t, state)
	require.Contains(t, launchURL, "https://t.me/vedamatch_bot?startapp=vm_auth_")

	authPayload, _ := json.Marshal(map[string]interface{}{
		"token":        "telegram-access-token",
		"accessToken":  "telegram-access-token",
		"refreshToken": "telegram-refresh-token",
		"sessionId":    42,
		"user": map[string]interface{}{
			"ID":    1001,
			"email": "telegram@example.com",
		},
	})
	completePayload, _ := json.Marshal(map[string]interface{}{
		"state":       state,
		"authPayload": json.RawMessage(authPayload),
	})
	completeReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/complete", bytes.NewBuffer(completePayload))
	completeReq.Header.Set("Content-Type", "application/json")

	completeResp, err := app.Test(completeReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, completeResp.StatusCode)

	var completeBody map[string]interface{}
	require.NoError(t, json.NewDecoder(completeResp.Body).Decode(&completeBody))
	require.Equal(t, state, strings.TrimSpace(fmt.Sprintf("%v", completeBody["state"])))
	require.Equal(t, fmt.Sprintf("https://api.vedamatch.ru/auth/telegram/callback?state=%s", url.QueryEscape(state)), strings.TrimSpace(fmt.Sprintf("%v", completeBody["deepLink"])))

	exchangePayload, _ := json.Marshal(map[string]string{
		"state":    state,
		"deviceId": "tg-mobile-device-1",
	})
	exchangeReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/exchange", bytes.NewBuffer(exchangePayload))
	exchangeReq.Header.Set("Content-Type", "application/json")

	exchangeResp, err := app.Test(exchangeReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, exchangeResp.StatusCode)

	var exchangeBody map[string]interface{}
	require.NoError(t, json.NewDecoder(exchangeResp.Body).Decode(&exchangeBody))
	require.Equal(t, "telegram-access-token", exchangeBody["accessToken"])
	require.Equal(t, "telegram-refresh-token", exchangeBody["refreshToken"])

	replayReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/exchange", bytes.NewBuffer(exchangePayload))
	replayReq.Header.Set("Content-Type", "application/json")

	replayResp, err := app.Test(replayReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusConflict, replayResp.StatusCode)
}

func TestAuthTelegramMobileCallback_RendersFallbackRedirectPage(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	req := httptest.NewRequest("GET", "/auth/telegram/callback?state=test-state", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	body, readErr := io.ReadAll(resp.Body)
	require.NoError(t, readErr)
	rendered := string(body)
	require.Contains(t, rendered, "Авторизация завершена. Возвращаемся в приложение VedaMatch...")
	require.Contains(t, rendered, "vedamatch://auth/telegram/callback?state=test-state")
	require.Contains(t, rendered, "Открыть VedaMatch")
}

func TestAuthTelegramMobileBridge_RejectsDeviceMismatch(t *testing.T) {
	setupAuthTelegramMiniAppIntegrationDB(t)
	app := newAuthTelegramMiniAppTestApp()

	startPayload, _ := json.Marshal(map[string]string{
		"deviceId": "tg-mobile-device-2",
	})
	startReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/start", bytes.NewBuffer(startPayload))
	startReq.Header.Set("Content-Type", "application/json")

	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, startResp.StatusCode)

	var startBody map[string]interface{}
	require.NoError(t, json.NewDecoder(startResp.Body).Decode(&startBody))
	state := strings.TrimSpace(fmt.Sprintf("%v", startBody["state"]))

	authPayload, _ := json.Marshal(map[string]interface{}{
		"token":       "telegram-access-token",
		"accessToken": "telegram-access-token",
		"user": map[string]interface{}{
			"ID":    1002,
			"email": "telegram2@example.com",
		},
	})
	completePayload, _ := json.Marshal(map[string]interface{}{
		"state":       state,
		"authPayload": json.RawMessage(authPayload),
	})
	completeReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/complete", bytes.NewBuffer(completePayload))
	completeReq.Header.Set("Content-Type", "application/json")

	completeResp, err := app.Test(completeReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, completeResp.StatusCode)

	exchangePayload, _ := json.Marshal(map[string]string{
		"state":    state,
		"deviceId": "other-device",
	})
	exchangeReq := httptest.NewRequest("POST", "/api/auth/telegram/mobile/exchange", bytes.NewBuffer(exchangePayload))
	exchangeReq.Header.Set("Content-Type", "application/json")

	exchangeResp, err := app.Test(exchangeReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, exchangeResp.StatusCode)
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
