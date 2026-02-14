package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func integrationPostgresDSN() string {
	host := envOrDefault("DB_HOST", "localhost")
	port := envOrDefault("DB_PORT", "5435")
	user := envOrDefault("DB_USER", "raguser")
	password := envOrDefault("DB_PASSWORD", "ragpassword")
	name := envOrDefault("DB_NAME", "ragdb")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, name)
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func setupAuthPushTokenIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.UserDeviceToken{}))

	tx := db.Begin()
	require.NoError(t, tx.Error)

	database.DB = tx
	services.ResetPushServiceForTests()

	t.Cleanup(func() {
		_ = tx.Rollback().Error
		services.ResetPushServiceForTests()
	})

	return tx
}

func newAuthHandlerWithUserContext(handler *AuthHandler, userID uint) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", fmt.Sprintf("%d", userID))
		return c.Next()
	})
	app.Put("/update-push-token", handler.UpdatePushToken)
	app.Post("/push-tokens/register", handler.RegisterPushToken)
	app.Post("/push-tokens/unregister", handler.UnregisterPushToken)
	return app
}

func createIntegrationUser(t *testing.T, suffix string) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("push-it-%s-%d@vedicai.local", suffix, time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Push",
		IsProfileComplete: true,
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

func TestRegisterPushToken_IntegrationDualWrite(t *testing.T) {
	setupAuthPushTokenIntegrationDB(t)

	user := createIntegrationUser(t, "register")
	handler := NewAuthHandler(nil, nil)
	app := newAuthHandlerWithUserContext(handler, user.ID)

	body := map[string]any{
		"token":      "reg-token-1",
		"provider":   "fcm",
		"platform":   "android",
		"deviceId":   "device-reg-1",
		"appVersion": "1.0.0",
	}
	payload, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/push-tokens/register", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.Equal(t, true, result["ok"])
	require.Equal(t, true, result["isNew"])
	require.NotZero(t, int(result["tokenId"].(float64)))

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.Equal(t, "reg-token-1", refreshed.PushToken)

	var token models.UserDeviceToken
	require.NoError(t, database.DB.Where("user_id = ? AND token = ?", user.ID, "reg-token-1").First(&token).Error)
	require.Equal(t, "fcm", token.Provider)
	require.Equal(t, "android", token.Platform)
	require.Equal(t, "device-reg-1", token.DeviceID)
	require.Equal(t, "1.0.0", token.AppVersion)
	require.Nil(t, token.InvalidatedAt)
}

func TestUpdatePushToken_IntegrationUpsertNoDuplicates(t *testing.T) {
	setupAuthPushTokenIntegrationDB(t)

	user := createIntegrationUser(t, "legacy")
	handler := NewAuthHandler(nil, nil)
	app := newAuthHandlerWithUserContext(handler, user.ID)

	first := `{"pushToken":"legacy-token-1","provider":"fcm","platform":"ios","deviceId":"device-upd-1","appVersion":"1.0.0"}`
	req1 := httptest.NewRequest("PUT", "/update-push-token", bytes.NewBufferString(first))
	req1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(req1)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp1.StatusCode)

	second := `{"pushToken":"legacy-token-1","provider":"fcm","platform":"ios","deviceId":"device-upd-1","appVersion":"1.1.0"}`
	req2 := httptest.NewRequest("PUT", "/update-push-token", bytes.NewBufferString(second))
	req2.Header.Set("Content-Type", "application/json")
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp2.StatusCode)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.Equal(t, "legacy-token-1", refreshed.PushToken)

	var count int64
	require.NoError(t, database.DB.Model(&models.UserDeviceToken{}).Where("user_id = ? AND token = ?", user.ID, "legacy-token-1").Count(&count).Error)
	require.EqualValues(t, 1, count)

	var token models.UserDeviceToken
	require.NoError(t, database.DB.Where("user_id = ? AND token = ?", user.ID, "legacy-token-1").First(&token).Error)
	require.Equal(t, "1.1.0", token.AppVersion)
	require.Nil(t, token.InvalidatedAt)
}

func TestUnregisterPushToken_IntegrationByDeviceID(t *testing.T) {
	setupAuthPushTokenIntegrationDB(t)

	user := createIntegrationUser(t, "unregister")
	require.NoError(t, database.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("push_token", "unreg-token-1").Error)

	now := time.Now()
	require.NoError(t, database.DB.Create(&models.UserDeviceToken{
		UserID:     user.ID,
		Token:      "unreg-token-1",
		Provider:   "fcm",
		Platform:   "android",
		DeviceID:   "device-unreg-1",
		AppVersion: "1.0.0",
		LastSeenAt: now,
		FailCount:  0,
	}).Error)
	require.NoError(t, database.DB.Create(&models.UserDeviceToken{
		UserID:     user.ID,
		Token:      "unreg-token-2",
		Provider:   "fcm",
		Platform:   "android",
		DeviceID:   "device-unreg-1",
		AppVersion: "1.0.0",
		LastSeenAt: now,
		FailCount:  0,
	}).Error)

	handler := NewAuthHandler(nil, nil)
	app := newAuthHandlerWithUserContext(handler, user.ID)

	req := httptest.NewRequest("POST", "/push-tokens/unregister", bytes.NewBufferString(`{"deviceId":"device-unreg-1"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.Equal(t, true, result["ok"])
	require.EqualValues(t, 2, int(result["invalidated"].(float64)))

	var invalidatedCount int64
	require.NoError(t, database.DB.Model(&models.UserDeviceToken{}).
		Where("user_id = ? AND device_id = ? AND invalidated_at IS NOT NULL", user.ID, "device-unreg-1").
		Count(&invalidatedCount).Error)
	require.EqualValues(t, 2, invalidatedCount)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.Equal(t, "", refreshed.PushToken)
}
