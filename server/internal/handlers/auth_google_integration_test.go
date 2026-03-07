package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newAuthGoogleTestApp(handler *AuthHandler) *fiber.App {
	app := fiber.New()
	app.Get("/api/auth/social/config", handler.SocialAuthConfig)
	app.Post("/api/auth/google/login", handler.GoogleLogin)
	return app
}

func setupAuthGoogleIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.AuthSession{}, &models.MetricCounter{}))
	tx := db.Begin()
	require.NoError(t, tx.Error)
	database.DB = tx

	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})

	return tx
}

func TestGoogleLogin_Disabled_ReturnsNotFound(t *testing.T) {
	setupAuthGoogleIntegrationDB(t)
	t.Setenv("AUTH_GOOGLE_ENABLED", "false")
	app := newAuthGoogleTestApp(NewAuthHandler(nil, nil))

	payload, _ := json.Marshal(map[string]string{
		"idToken":  "any-token",
		"deviceId": "dev-1",
	})
	req := httptest.NewRequest("POST", "/api/auth/google/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestGoogleLogin_InvalidToken_ReturnsUnauthorized(t *testing.T) {
	setupAuthGoogleIntegrationDB(t)
	t.Setenv("AUTH_GOOGLE_ENABLED", "true")
	t.Setenv("GOOGLE_WEB_CLIENT_ID", "google-web-client-id")
	originalVerifier := googleIDTokenVerifier
	googleIDTokenVerifier = func(_ string) (*googleTokenInfo, error) {
		return nil, errors.New("invalid token")
	}
	t.Cleanup(func() {
		googleIDTokenVerifier = originalVerifier
	})

	app := newAuthGoogleTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"idToken": "bad-token",
	})
	req := httptest.NewRequest("POST", "/api/auth/google/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestGoogleLogin_ExistingUserBySub_Success(t *testing.T) {
	setupAuthGoogleIntegrationDB(t)
	t.Setenv("AUTH_GOOGLE_ENABLED", "true")
	t.Setenv("GOOGLE_WEB_CLIENT_ID", "google-web-client-id")
	t.Setenv("JWT_SECRET", "google-test-secret")
	t.Setenv("AUTH_REFRESH_V1", "true")

	googleSub := fmt.Sprintf("google-sub-%d", time.Now().UnixNano())
	user := models.User{
		Email:             fmt.Sprintf("google-%d@VedaMatch.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Google Existing",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		GoogleSub:         googleSub,
		GoogleEmail:       fmt.Sprintf("google-%d@VedaMatch.local", time.Now().UnixNano()),
	}
	require.NoError(t, database.DB.Create(&user).Error)

	originalVerifier := googleIDTokenVerifier
	googleIDTokenVerifier = func(_ string) (*googleTokenInfo, error) {
		return &googleTokenInfo{
			Sub:           googleSub,
			Email:         user.Email,
			EmailVerified: "true",
			Name:          "Google Existing",
			Locale:        "en",
			Audience:      "google-web-client-id",
		}, nil
	}
	t.Cleanup(func() {
		googleIDTokenVerifier = originalVerifier
	})

	app := newAuthGoogleTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"idToken":  "ok-token",
		"deviceId": "g-device-1",
	})
	req := httptest.NewRequest("POST", "/api/auth/google/login", bytes.NewBuffer(payload))
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

func TestGoogleLogin_InvalidAudience_ReturnsUnauthorized(t *testing.T) {
	setupAuthGoogleIntegrationDB(t)
	t.Setenv("AUTH_GOOGLE_ENABLED", "true")
	t.Setenv("GOOGLE_WEB_CLIENT_ID", "google-web-client-id")

	originalVerifier := googleIDTokenVerifier
	googleIDTokenVerifier = func(_ string) (*googleTokenInfo, error) {
		return &googleTokenInfo{
			Sub:           "google-sub-invalid-aud",
			Email:         "invalid-aud@example.com",
			EmailVerified: "true",
			Name:          "Wrong Audience",
			Locale:        "en",
			Audience:      "some-other-client-id",
		}, nil
	}
	t.Cleanup(func() {
		googleIDTokenVerifier = originalVerifier
	})

	app := newAuthGoogleTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"idToken": "wrong-audience-token",
	})
	req := httptest.NewRequest("POST", "/api/auth/google/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestGoogleLogin_MissingClientIDs_ReturnsServiceUnavailable(t *testing.T) {
	setupAuthGoogleIntegrationDB(t)
	t.Setenv("AUTH_GOOGLE_ENABLED", "true")

	originalVerifier := googleIDTokenVerifier
	googleIDTokenVerifier = func(_ string) (*googleTokenInfo, error) {
		return &googleTokenInfo{
			Sub:           "google-sub-missing-config",
			Email:         "missing-config@example.com",
			EmailVerified: "true",
			Name:          "Missing Config",
			Locale:        "en",
			Audience:      "google-web-client-id",
		}, nil
	}
	t.Cleanup(func() {
		googleIDTokenVerifier = originalVerifier
	})

	app := newAuthGoogleTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]string{
		"idToken": "missing-config-token",
	})
	req := httptest.NewRequest("POST", "/api/auth/google/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusServiceUnavailable, resp.StatusCode)
}

func TestSocialAuthConfig_UsesDedicatedLKMGoogleClientID(t *testing.T) {
	app := newAuthGoogleTestApp(NewAuthHandler(nil, nil))
	t.Setenv("AUTH_GOOGLE_ENABLED", "true")
	t.Setenv("GOOGLE_WEB_CLIENT_ID", "google-web-client-id")
	t.Setenv("GOOGLE_LKM_WEB_CLIENT_ID", "google-lkm-web-client-id")

	req := httptest.NewRequest("GET", "/api/auth/social/config", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		Google struct {
			Enabled  bool   `json:"enabled"`
			ClientID string `json:"clientId"`
		} `json:"google"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.True(t, body.Google.Enabled)
	require.Equal(t, "google-lkm-web-client-id", body.Google.ClientID)
}
