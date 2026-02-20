package services

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func multimediaIntegrationDSN() string {
	host := multimediaEnvOrDefault("DB_HOST", "localhost")
	port := multimediaEnvOrDefault("DB_PORT", "5435")
	user := multimediaEnvOrDefault("DB_USER", "raguser")
	password := multimediaEnvOrDefault("DB_PASSWORD", "ragpassword")
	name := multimediaEnvOrDefault("DB_NAME", "ragdb")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, name)
}

func multimediaEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func setupMultimediaServiceIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.Open(multimediaIntegrationDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.MediaCategory{},
		&models.MediaTrack{},
		&models.RadioStation{},
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

func createMultimediaTestUser(t *testing.T, db *gorm.DB) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("multimedia-it-%d@vedicai.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "MMUser",
		IsProfileComplete: true,
		Role:              models.RoleUser,
		InviteCode:        strings.ToUpper(fmt.Sprintf("M%07d", time.Now().UnixNano()%10000000)),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}
	return user
}

func TestMultimediaService_PlaylistsAndTVHealth_Integration(t *testing.T) {
	db := setupMultimediaServiceIntegrationDB(t)
	service := &MultimediaService{db: db}

	user := createMultimediaTestUser(t, db)

	track := models.MediaTrack{
		Title:       "Integration Track",
		MediaType:   models.MediaTypeAudio,
		URL:         "https://cdn.example.com/audio.mp3",
		CreatedByID: user.ID,
		IsActive:    true,
	}
	if err := db.Create(&track).Error; err != nil {
		t.Fatalf("create track failed: %v", err)
	}

	playlist := models.UserPlaylist{
		UserID: user.ID,
		Name:   "Morning Bhajans",
	}
	if err := service.CreatePlaylist(&playlist); err != nil {
		t.Fatalf("create playlist failed: %v", err)
	}

	if err := service.AddTrackToPlaylist(user.ID, playlist.ID, track.ID); err != nil {
		t.Fatalf("add track to playlist failed: %v", err)
	}

	details, err := service.GetPlaylistDetails(user.ID, playlist.ID)
	if err != nil {
		t.Fatalf("get playlist details failed: %v", err)
	}
	if len(details.Items) != 1 {
		t.Fatalf("playlist items = %d, want 1", len(details.Items))
	}

	if err := service.RemoveTrackFromPlaylist(user.ID, playlist.ID, track.ID); err != nil {
		t.Fatalf("remove track from playlist failed: %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	defer server.Close()

	channel := models.TVChannel{
		Name:        "Integration TV",
		StreamURL:   server.URL,
		StreamType:  "youtube",
		IsActive:    true,
		CreatedByID: user.ID,
	}
	if err := db.Create(&channel).Error; err != nil {
		t.Fatalf("create tv channel failed: %v", err)
	}

	service.CheckTVStatus()

	var refreshed models.TVChannel
	if err := db.First(&refreshed, channel.ID).Error; err != nil {
		t.Fatalf("reload tv channel failed: %v", err)
	}
	if refreshed.Status != "online" {
		t.Fatalf("tv status = %q, want online", refreshed.Status)
	}
	if refreshed.LastCheckedAt == nil {
		t.Fatalf("lastCheckedAt should be set")
	}
}
