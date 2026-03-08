package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
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

func setupAuthProviderManagementDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.SystemSetting{}))
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

	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})

	return tx
}

func newAuthProviderManagementTestApp(handler *AuthHandler) *fiber.App {
	app := fiber.New()
	app.Use("/api/auth", func(c *fiber.Ctx) error {
		if userID := strings.TrimSpace(c.Get("X-Test-User-ID")); userID != "" {
			c.Locals("userID", userID)
		}
		return c.Next()
	})
	app.Get("/api/auth/providers", handler.GetLinkedAuthProviders)
	app.Post("/api/auth/google/link", handler.GoogleLink)
	app.Post("/api/auth/vk/link", handler.VKLink)
	app.Post("/api/auth/telegram/link/start", handler.TelegramLinkStart)
	app.Post("/api/auth/telegram/link", handler.TelegramLink)
	app.Delete("/api/auth/providers/:provider", handler.UnlinkAuthProvider)
	app.Post("/api/auth/telegram/miniapp/mobile-link", handler.TelegramMiniAppMobileLink)
	return app
}

func createAuthProviderUser(t *testing.T, email string, password string) models.User {
	t.Helper()

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	user := models.User{
		Email:             strings.TrimSpace(strings.ToLower(email)),
		Password:          string(passwordHash),
		KarmicName:        "provider-user",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		InviteCode:        fmt.Sprintf("AP%06d", time.Now().UnixNano()%1000000),
		GoogleSub:         fmt.Sprintf("placeholder-google-sub-%d", time.Now().UnixNano()),
	}
	require.NoError(t, database.DB.Create(&user).Error)
	require.NoError(t, database.DB.Model(&models.User{}).
		Where("id = ?", user.ID).
		Update("google_sub", gorm.Expr("NULL")).Error)
	user.GoogleSub = ""
	return user
}

func TestAuthProviders_GetLinkedProviders(t *testing.T) {
	setupAuthProviderManagementDB(t)
	now := time.Now().UTC()
	vkID := int64(777001)
	tgID := int64(888001)
	user := createAuthProviderUser(t, fmt.Sprintf("providers-%d@example.com", time.Now().UnixNano()), "password123")
	user.GoogleSub = "google-sub-providers"
	user.GoogleEmail = "providers-google@example.com"
	user.GoogleLinkedAt = &now
	user.VKUserID = &vkID
	user.VKEmail = "providers-vk@example.com"
	user.VKLinkedAt = &now
	user.TelegramUserID = &tgID
	user.TelegramUsername = "providers_telegram"
	user.TelegramLinkedAt = &now
	require.NoError(t, database.DB.Save(&user).Error)

	app := newAuthProviderManagementTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("GET", "/api/auth/providers", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		Providers   []linkedProviderStatus `json:"providers"`
		HasPassword bool                   `json:"hasPassword"`
		MethodCount int                    `json:"methodCount"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Len(t, body.Providers, 3)
	require.True(t, body.HasPassword)
	require.Equal(t, 4, body.MethodCount)
}

func TestAuthProviders_GoogleLink_Success(t *testing.T) {
	setupAuthProviderManagementDB(t)
	t.Setenv("AUTH_GOOGLE_ENABLED", "true")
	t.Setenv("GOOGLE_WEB_CLIENT_ID", "google-web-client-id")
	user := createAuthProviderUser(t, fmt.Sprintf("google-link-%d@example.com", time.Now().UnixNano()), "password123")

	originalVerifier := googleIDTokenVerifier
	googleIDTokenVerifier = func(_ string) (*googleTokenInfo, error) {
		return &googleTokenInfo{
			Sub:           "google-link-sub",
			Email:         "google-link@example.com",
			EmailVerified: "true",
			Audience:      "google-web-client-id",
		}, nil
	}
	t.Cleanup(func() {
		googleIDTokenVerifier = originalVerifier
	})

	app := newAuthProviderManagementTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{"idToken": "google-token"})
	req := httptest.NewRequest("POST", "/api/auth/google/link", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.Equal(t, "google-link-sub", refreshed.GoogleSub)
	require.Equal(t, "google-link@example.com", refreshed.GoogleEmail)
}

func TestAuthProviders_VKLink_Conflict(t *testing.T) {
	setupAuthProviderManagementDB(t)
	t.Setenv("AUTH_VK_ENABLED", "true")

	conflictVKID := int64(544743531)
	owner := createAuthProviderUser(t, fmt.Sprintf("vk-owner-%d@example.com", time.Now().UnixNano()), "password123")
	owner.VKUserID = &conflictVKID
	owner.VKEmail = "owner-vk@example.com"
	require.NoError(t, database.DB.Save(&owner).Error)

	user := createAuthProviderUser(t, fmt.Sprintf("vk-candidate-%d@example.com", time.Now().UnixNano()), "password123")

	originalVerifier := vkAccessTokenVerifier
	vkAccessTokenVerifier = func(_ string) (*vkUserInfo, error) {
		return &vkUserInfo{UserID: conflictVKID, Email: "owner-vk@example.com"}, nil
	}
	t.Cleanup(func() {
		vkAccessTokenVerifier = originalVerifier
	})

	app := newAuthProviderManagementTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{"accessToken": "vk-token"})
	req := httptest.NewRequest("POST", "/api/auth/vk/link", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusConflict, resp.StatusCode)
}

func TestAuthProviders_UnlinkLastMethod_Blocked(t *testing.T) {
	setupAuthProviderManagementDB(t)
	now := time.Now().UTC()
	user := createAuthProviderUser(t, fmt.Sprintf("google-only-%d@oauth.vedamatch.local", time.Now().UnixNano()), "password123")
	user.GoogleSub = "google-only-sub"
	user.GoogleEmail = "google-only@example.com"
	user.GoogleLinkedAt = &now
	user.Password = ""
	require.NoError(t, database.DB.Save(&user).Error)

	app := newAuthProviderManagementTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("DELETE", "/api/auth/providers/google", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusConflict, resp.StatusCode)
}

func TestAuthProviders_UnlinkVK_SuccessWhenPasswordExists(t *testing.T) {
	setupAuthProviderManagementDB(t)
	now := time.Now().UTC()
	vkID := int64(777777)
	user := createAuthProviderUser(t, fmt.Sprintf("vk-unlink-%d@example.com", time.Now().UnixNano()), "password123")
	user.VKUserID = &vkID
	user.VKEmail = "vk-unlink@example.com"
	user.VKLinkedAt = &now
	require.NoError(t, database.DB.Save(&user).Error)

	app := newAuthProviderManagementTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("DELETE", "/api/auth/providers/vk", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.Nil(t, refreshed.VKUserID)
	require.Empty(t, refreshed.VKEmail)
}

func TestAuthProviders_TelegramLinkFlow_Success(t *testing.T) {
	setupAuthProviderManagementDB(t)
	user := createAuthProviderUser(t, fmt.Sprintf("tg-link-%d@example.com", time.Now().UnixNano()), "password123")
	app := newAuthProviderManagementTestApp(NewAuthHandler(nil, nil))

	startPayload, _ := json.Marshal(map[string]string{"deviceId": "tg-device-1"})
	startReq := httptest.NewRequest("POST", "/api/auth/telegram/link/start", bytes.NewBuffer(startPayload))
	startReq.Header.Set("Content-Type", "application/json")
	startReq.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	startResp, err := app.Test(startReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, startResp.StatusCode)

	var startBody map[string]interface{}
	require.NoError(t, json.NewDecoder(startResp.Body).Decode(&startBody))
	state := strings.TrimSpace(fmt.Sprintf("%v", startBody["state"]))
	require.NotEmpty(t, state)

	initData := buildHandlerTelegramInitData(t, "test-telegram-auth-token", time.Now().UTC().Unix()-15, map[string]string{
		"query_id": "AAH7V6YAAAAAb8R1mQ",
		"user":     `{"id":778899,"first_name":"Mobile","last_name":"Link","username":"tg_mobile_link","language_code":"ru"}`,
	})
	completePayload, _ := json.Marshal(map[string]string{
		"initData":        initData,
		"mobileAuthState": state,
	})
	completeReq := httptest.NewRequest("POST", "/api/auth/telegram/miniapp/mobile-link", bytes.NewBuffer(completePayload))
	completeReq.Header.Set("Content-Type", "application/json")

	completeResp, err := app.Test(completeReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, completeResp.StatusCode)

	linkPayload, _ := json.Marshal(map[string]string{
		"state":    state,
		"deviceId": "tg-device-1",
	})
	linkReq := httptest.NewRequest("POST", "/api/auth/telegram/link", bytes.NewBuffer(linkPayload))
	linkReq.Header.Set("Content-Type", "application/json")
	linkReq.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", user.ID))

	linkResp, err := app.Test(linkReq)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, linkResp.StatusCode)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, user.ID).Error)
	require.NotNil(t, refreshed.TelegramUserID)
	require.EqualValues(t, 778899, *refreshed.TelegramUserID)
	require.Equal(t, "tg_mobile_link", refreshed.TelegramUsername)
}
