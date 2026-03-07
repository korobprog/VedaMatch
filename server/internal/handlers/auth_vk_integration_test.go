package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newAuthVKTestApp(handler *AuthHandler) *fiber.App {
	app := fiber.New()
	app.Get("/api/auth/social/config", handler.SocialAuthConfig)
	app.Post("/api/auth/vk/login", handler.VKLogin)
	app.Get("/api/auth/vk/web/start", handler.VKWebStart)
	app.Get("/auth/vk/web/callback", handler.VKWebCallback)
	app.Get("/api/auth/vk/callback", handler.VKCallback)
	return app
}

func setupAuthVKIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.AuthSession{}))
	tx := db.Begin()
	require.NoError(t, tx.Error)
	database.DB = tx

	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})

	return tx
}

func TestVKLogin_Disabled_ReturnsNotFound(t *testing.T) {
	setupAuthVKIntegrationDB(t)
	t.Setenv("AUTH_VK_ENABLED", "false")

	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"accessToken": "token-any",
		"deviceId":    "device-vk-1",
	})
	req := httptest.NewRequest("POST", "/api/auth/vk/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestVKLogin_InvalidToken_ReturnsUnauthorized(t *testing.T) {
	setupAuthVKIntegrationDB(t)
	t.Setenv("AUTH_VK_ENABLED", "true")

	originalVerifier := vkAccessTokenVerifier
	vkAccessTokenVerifier = func(_ string) (*vkUserInfo, error) {
		return nil, errors.New("invalid token")
	}
	t.Cleanup(func() {
		vkAccessTokenVerifier = originalVerifier
	})

	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"accessToken": "token-bad",
	})
	req := httptest.NewRequest("POST", "/api/auth/vk/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestVKLogin_ExistingUserByVKUserID_Success(t *testing.T) {
	setupAuthVKIntegrationDB(t)
	t.Setenv("AUTH_VK_ENABLED", "true")
	t.Setenv("JWT_SECRET", "vk-test-secret")
	t.Setenv("AUTH_REFRESH_V1", "true")

	vkID := int64(54418465)
	user := models.User{
		Email:             fmt.Sprintf("vk-%d@VedaMatch.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "VK Existing",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		VKUserID:          &vkID,
		VKEmail:           fmt.Sprintf("vk-%d@VedaMatch.local", time.Now().UnixNano()),
	}
	require.NoError(t, database.DB.Create(&user).Error)

	originalVerifier := vkAccessTokenVerifier
	vkAccessTokenVerifier = func(_ string) (*vkUserInfo, error) {
		return &vkUserInfo{
			UserID:     vkID,
			FirstName:  "VK",
			LastName:   "Existing",
			ScreenName: "vkexisting",
		}, nil
	}
	t.Cleanup(func() {
		vkAccessTokenVerifier = originalVerifier
	})

	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"accessToken": "token-ok",
		"deviceId":    "vk-device-1",
	})
	req := httptest.NewRequest("POST", "/api/auth/vk/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body["accessToken"])
	require.NotEmpty(t, body["refreshToken"])
	require.NotEmpty(t, body["sessionId"])
	require.NotNil(t, body["user"])
}

func TestVKLogin_AuthorizationCode_Success(t *testing.T) {
	setupAuthVKIntegrationDB(t)
	t.Setenv("AUTH_VK_ENABLED", "true")
	t.Setenv("JWT_SECRET", "vk-test-secret")
	t.Setenv("AUTH_REFRESH_V1", "true")

	originalExchanger := vkCodeExchanger
	originalVerifier := vkAccessTokenVerifier
	vkCodeExchanger = func(code string) (string, string, int64, error) {
		require.Equal(t, "vk-auth-code", code)
		return "vk-access-from-code", "vk-code@example.com", 54418465, nil
	}
	vkAccessTokenVerifier = func(token string) (*vkUserInfo, error) {
		require.Equal(t, "vk-access-from-code", token)
		return &vkUserInfo{
			UserID:     54418465,
			FirstName:  "VK",
			LastName:   "Code Flow",
			ScreenName: "vkcodeflow",
			Email:      "vk-code@example.com",
		}, nil
	}
	t.Cleanup(func() {
		vkCodeExchanger = originalExchanger
		vkAccessTokenVerifier = originalVerifier
	})

	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"code":     "vk-auth-code",
		"deviceId": "vk-ios-device-1",
	})
	req := httptest.NewRequest("POST", "/api/auth/vk/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body["accessToken"])
	require.NotEmpty(t, body["refreshToken"])
	require.NotEmpty(t, body["sessionId"])
	require.NotNil(t, body["user"])
}

func TestVKLogin_AndroidAuthorizationCode_Success(t *testing.T) {
	setupAuthVKIntegrationDB(t)
	t.Setenv("AUTH_VK_ENABLED", "true")
	t.Setenv("JWT_SECRET", "vk-test-secret")
	t.Setenv("AUTH_REFRESH_V1", "true")

	originalAndroidExchanger := vkAndroidCodeExchanger
	originalVerifier := vkAccessTokenVerifier
	vkAndroidCodeExchanger = func(input vkAndroidCodeExchangeInput) (string, string, int64, error) {
		require.Equal(t, "vk-auth-code", input.Code)
		require.Equal(t, "vk-code-verifier", input.CodeVerifier)
		require.Equal(t, "vk-callback-device", input.VKDeviceID)
		require.Equal(t, "vk-state-android", input.State)
		return "vk-android-access", "vk-android@example.com", 54474353, nil
	}
	vkAccessTokenVerifier = func(token string) (*vkUserInfo, error) {
		require.Equal(t, "vk-android-access", token)
		return &vkUserInfo{
			UserID:     54474353,
			FirstName:  "VK",
			LastName:   "Android",
			ScreenName: "vkandroid",
			Email:      "vk-android@example.com",
		}, nil
	}
	t.Cleanup(func() {
		vkAndroidCodeExchanger = originalAndroidExchanger
		vkAccessTokenVerifier = originalVerifier
	})

	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"code":         "vk-auth-code",
		"codeVerifier": "vk-code-verifier",
		"deviceId":     "app-device-android-1",
		"platform":     "android",
		"state":        "vk-state-android",
		"vkDeviceId":   "vk-callback-device",
	})
	req := httptest.NewRequest("POST", "/api/auth/vk/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body["accessToken"])
	require.NotEmpty(t, body["refreshToken"])
	require.NotEmpty(t, body["sessionId"])
	require.NotNil(t, body["user"])
}

func TestSocialAuthConfig_ReportsVKWebAvailability(t *testing.T) {
	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	t.Setenv("AUTH_VK_ENABLED", "true")
	t.Setenv("VK_WEB_CLIENT_ID", "54474355")
	t.Setenv("VK_WEB_CLIENT_SECRET", "vk-web-secret")
	t.Setenv("VK_WEB_REDIRECT_URI", "https://api.vedamatch.ru/auth/vk/web/callback")

	req := httptest.NewRequest("GET", "/api/auth/social/config", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		VK struct {
			Enabled bool `json:"enabled"`
		} `json:"vk"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.True(t, body.VK.Enabled)
}

func TestVKWebStart_RedirectsToVKIDAuthorize(t *testing.T) {
	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	t.Setenv("AUTH_VK_ENABLED", "true")
	t.Setenv("VK_WEB_CLIENT_ID", "54474355")
	t.Setenv("VK_WEB_CLIENT_SECRET", "vk-web-secret")
	t.Setenv("VK_WEB_REDIRECT_URI", "https://api.vedamatch.ru/auth/vk/web/callback")
	t.Setenv("VK_WEB_SCOPE", "email")

	req := httptest.NewRequest("GET", "/api/auth/vk/web/start?origin=https%3A%2F%2Flkm.vedamatch.ru&deviceId=lkm-web-device-1", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusFound, resp.StatusCode)

	location := resp.Header.Get("Location")
	parsed, err := url.Parse(location)
	require.NoError(t, err)
	require.Equal(t, "id.vk.com", parsed.Host)
	require.Equal(t, "/authorize", parsed.Path)
	query := parsed.Query()
	require.Equal(t, "54474355", query.Get("client_id"))
	require.Equal(t, "https://api.vedamatch.ru/auth/vk/web/callback", query.Get("redirect_uri"))
	require.Equal(t, "code", query.Get("response_type"))
	require.Equal(t, "email", query.Get("scope"))
	require.NotEmpty(t, query.Get("state"))
}

func TestVKWebCallback_Success_PostsAuthPayload(t *testing.T) {
	setupAuthVKIntegrationDB(t)
	t.Setenv("AUTH_VK_ENABLED", "true")
	t.Setenv("AUTH_REFRESH_V1", "true")
	t.Setenv("JWT_SECRET", "vk-web-secret")
	t.Setenv("VK_WEB_CLIENT_ID", "54474355")
	t.Setenv("VK_WEB_CLIENT_SECRET", "vk-web-protected")
	t.Setenv("VK_WEB_REDIRECT_URI", "https://api.vedamatch.ru/auth/vk/web/callback")

	handler := NewAuthHandler(nil, nil)
	state, err := handler.webSocialAuthBridge.CreateState("vk", "lkm-web-device-1", "https://lkm.vedamatch.ru")
	require.NoError(t, err)

	originalExchanger := vkWebCodeExchanger
	originalVerifier := vkAccessTokenVerifier
	vkWebCodeExchanger = func(code string) (string, string, int64, error) {
		require.Equal(t, "vk-web-auth-code", code)
		return "vk-web-access-token", "vk-web@example.com", 54474355, nil
	}
	vkAccessTokenVerifier = func(token string) (*vkUserInfo, error) {
		require.Equal(t, "vk-web-access-token", token)
		return &vkUserInfo{
			UserID:     54474355,
			FirstName:  "VK",
			LastName:   "Web",
			ScreenName: "vkweb",
			Email:      "vk-web@example.com",
		}, nil
	}
	t.Cleanup(func() {
		vkWebCodeExchanger = originalExchanger
		vkAccessTokenVerifier = originalVerifier
	})

	app := newAuthVKTestApp(handler)
	req := httptest.NewRequest("GET", "/auth/vk/web/callback?code=vk-web-auth-code&state="+url.QueryEscape(state.State), nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	bodyBytes := new(bytes.Buffer)
	_, err = bodyBytes.ReadFrom(resp.Body)
	require.NoError(t, err)
	body := bodyBytes.String()
	require.Contains(t, body, "\"source\":\"vedamatch:lkm-social-auth\"")
	require.Contains(t, body, "\"provider\":\"vk\"")
	require.Contains(t, body, "\"status\":\"success\"")
	require.Contains(t, body, "\"accessToken\"")
}

func TestVKCallback_Success_RedirectsToDeepLink(t *testing.T) {
	originalExchanger := vkCodeExchanger
	vkCodeExchanger = func(_ string) (string, string, int64, error) {
		return "vk-access-123", "vk@example.com", 54418465, nil
	}
	t.Cleanup(func() {
		vkCodeExchanger = originalExchanger
	})

	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("GET", "/api/auth/vk/callback?code=abc123&state=test-state", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusFound, resp.StatusCode)

	location := resp.Header.Get("Location")
	require.Contains(t, location, "vedamatch://auth/vk/callback?")
	require.Contains(t, location, "access_token=vk-access-123")
	require.Contains(t, location, "email=vk%40example.com")
	require.Contains(t, location, "state=test-state")
}

func TestVKCallback_Error_RedirectsToDeepLinkWithError(t *testing.T) {
	app := newAuthVKTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("GET", "/api/auth/vk/callback?error=access_denied&state=test-state", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusFound, resp.StatusCode)

	location := resp.Header.Get("Location")
	require.Contains(t, location, "vedamatch://auth/vk/callback?")
	require.Contains(t, location, "error=access_denied")
	require.Contains(t, location, "state=test-state")
}
