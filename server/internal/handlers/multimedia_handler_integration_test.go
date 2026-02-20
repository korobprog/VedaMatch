package handlers

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func multimediaHandlerIntegrationDSN() string {
	host := multimediaHandlerEnvOrDefault("DB_HOST", "localhost")
	port := multimediaHandlerEnvOrDefault("DB_PORT", "5435")
	user := multimediaHandlerEnvOrDefault("DB_USER", "raguser")
	password := multimediaHandlerEnvOrDefault("DB_PASSWORD", "ragpassword")
	name := multimediaHandlerEnvOrDefault("DB_NAME", "ragdb")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, name)
}

func multimediaHandlerEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func setupMultimediaHandlerIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.Open(multimediaHandlerIntegrationDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.MediaCategory{},
		&models.MediaTrack{},
		&models.TVChannel{},
		&models.UserPlaylist{},
		&models.UserPlaylistItem{},
	)
	if err != nil {
		t.Fatalf("auto-migrate failed: %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("begin tx failed: %v", tx.Error)
	}
	database.DB = tx
	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})
	return tx
}

func createMultimediaHandlerTestUser(t *testing.T, db *gorm.DB) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("multimedia-handler-%d@vedicai.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "MMHandler",
		IsProfileComplete: true,
		Role:              models.RoleUser,
		InviteCode:        strings.ToUpper(fmt.Sprintf("H%07d", time.Now().UnixNano()%10000000)),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}
	return user
}

func TestMultimediaHandler_TVAndPlaylists_Integration(t *testing.T) {
	db := setupMultimediaHandlerIntegrationDB(t)
	user := createMultimediaHandlerTestUser(t, db)

	channel := models.TVChannel{
		Name:        "Handler TV",
		StreamURL:   "https://example.com/live",
		StreamType:  "youtube",
		IsActive:    true,
		Status:      "online",
		CreatedByID: user.ID,
	}
	if err := db.Create(&channel).Error; err != nil {
		t.Fatalf("create tv channel failed: %v", err)
	}

	track := models.MediaTrack{
		Title:       "Handler Track",
		MediaType:   models.MediaTypeAudio,
		URL:         "https://cdn.example.com/track.mp3",
		CreatedByID: user.ID,
		IsActive:    true,
	}
	if err := db.Create(&track).Error; err != nil {
		t.Fatalf("create track failed: %v", err)
	}

	h := NewMultimediaHandler()
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", user.ID)
		return c.Next()
	})

	app.Get("/multimedia/tv", h.GetTVChannels)
	app.Post("/multimedia/playlists", h.CreatePlaylist)
	app.Get("/multimedia/playlists", h.GetPlaylists)

	reqTV := httptest.NewRequest("GET", "/multimedia/tv", nil)
	respTV, err := app.Test(reqTV)
	if err != nil {
		t.Fatalf("tv request failed: %v", err)
	}
	if respTV.StatusCode != fiber.StatusOK {
		t.Fatalf("tv status code=%d", respTV.StatusCode)
	}
	var channels []map[string]any
	if err := json.NewDecoder(respTV.Body).Decode(&channels); err != nil {
		t.Fatalf("decode tv response failed: %v", err)
	}
	if len(channels) == 0 || channels[0]["status"] == nil {
		t.Fatalf("expected tv status field in response")
	}

	reqCreate := httptest.NewRequest("POST", "/multimedia/playlists", strings.NewReader(`{"name":"My Playlist"}`))
	reqCreate.Header.Set("Content-Type", "application/json")
	respCreate, err := app.Test(reqCreate)
	if err != nil {
		t.Fatalf("create playlist request failed: %v", err)
	}
	if respCreate.StatusCode != fiber.StatusCreated {
		t.Fatalf("create playlist status=%d", respCreate.StatusCode)
	}

	reqList := httptest.NewRequest("GET", "/multimedia/playlists", nil)
	respList, err := app.Test(reqList)
	if err != nil {
		t.Fatalf("list playlist request failed: %v", err)
	}
	if respList.StatusCode != fiber.StatusOK {
		t.Fatalf("list playlists status=%d", respList.StatusCode)
	}
	var listPayload map[string]any
	if err := json.NewDecoder(respList.Body).Decode(&listPayload); err != nil {
		t.Fatalf("decode list response failed: %v", err)
	}
	rawPlaylists, ok := listPayload["playlists"].([]any)
	if !ok || len(rawPlaylists) == 0 {
		t.Fatalf("expected non-empty playlists in response")
	}
}
