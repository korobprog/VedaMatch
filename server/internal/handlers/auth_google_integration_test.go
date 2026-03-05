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
