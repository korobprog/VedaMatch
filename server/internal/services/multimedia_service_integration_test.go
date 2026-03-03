package services

import (
	"errors"
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
		Email:             fmt.Sprintf("multimedia-it-%d@VedaMatch.local", time.Now().UnixNano()),
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

func createMultimediaUserWithProfile(t *testing.T, db *gorm.DB, madh string, currentPlan string, role string) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("multimedia-scope-%d@VedaMatch.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "MMScope",
		Madh:              madh,
		CurrentPlan:       currentPlan,
		IsProfileComplete: true,
		Role:              role,
		InviteCode:        strings.ToUpper(fmt.Sprintf("S%07d", time.Now().UnixNano()%10000000)),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create scoped user failed: %v", err)
	}
	return user
}

func containsTrackByID(tracks []models.MediaTrack, id uint) bool {
	for i := range tracks {
		if tracks[i].ID == id {
			return true
		}
	}
	return false
}

func containsRadioByID(stations []models.RadioStation, id uint) bool {
	for i := range stations {
		if stations[i].ID == id {
			return true
		}
	}
	return false
}

func containsTVByID(channels []models.TVChannel, id uint) bool {
	for i := range channels {
		if channels[i].ID == id {
			return true
		}
	}
	return false
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

func TestMultimediaService_OrgScope_Integration(t *testing.T) {
	db := setupMultimediaServiceIntegrationDB(t)
	service := &MultimediaService{db: db}

	creator := createMultimediaTestUser(t, db)
	nonPro := createMultimediaUserWithProfile(t, db, "gaudiya", "trial", models.RoleUser)
	proUser := createMultimediaUserWithProfile(t, db, "gaudiya", "pro", models.RoleUser)
	noMadh := createMultimediaUserWithProfile(t, db, "", "trial", models.RoleUser)

	globalTrack := models.MediaTrack{
		Title:       "Global Track",
		MediaType:   models.MediaTypeAudio,
		URL:         "https://cdn.example.com/global.mp3",
		CreatedByID: creator.ID,
		IsActive:    true,
		Madh:        "",
	}
	gaudiyaTrack := models.MediaTrack{
		Title:       "Gaudiya Track",
		MediaType:   models.MediaTypeAudio,
		URL:         "https://cdn.example.com/gaudiya.mp3",
		CreatedByID: creator.ID,
		IsActive:    true,
		Madh:        "gaudiya",
	}
	iskconTrack := models.MediaTrack{
		Title:       "ISKCON Track",
		MediaType:   models.MediaTypeAudio,
		URL:         "https://cdn.example.com/iskcon.mp3",
		CreatedByID: creator.ID,
		IsActive:    true,
		Madh:        "iskcon",
	}
	for _, track := range []*models.MediaTrack{&globalTrack, &gaudiyaTrack, &iskconTrack} {
		if err := db.Create(track).Error; err != nil {
			t.Fatalf("create track failed: %v", err)
		}
	}

	globalRadio := models.RadioStation{Name: "Global Radio", StreamURL: "https://example.com/global-radio", IsActive: true, CreatedByID: creator.ID}
	gaudiyaRadio := models.RadioStation{Name: "Gaudiya Radio", StreamURL: "https://example.com/gaudiya-radio", Madh: "gaudiya", IsActive: true, CreatedByID: creator.ID}
	iskconRadio := models.RadioStation{Name: "ISKCON Radio", StreamURL: "https://example.com/iskcon-radio", Madh: "iskcon", IsActive: true, CreatedByID: creator.ID}
	for _, station := range []*models.RadioStation{&globalRadio, &gaudiyaRadio, &iskconRadio} {
		if err := db.Create(station).Error; err != nil {
			t.Fatalf("create radio failed: %v", err)
		}
	}

	globalTV := models.TVChannel{Name: "Global TV", StreamURL: "https://example.com/global-tv", StreamType: "youtube", IsActive: true, CreatedByID: creator.ID}
	gaudiyaTV := models.TVChannel{Name: "Gaudiya TV", StreamURL: "https://example.com/gaudiya-tv", StreamType: "youtube", Madh: "gaudiya", IsActive: true, CreatedByID: creator.ID}
	iskconTV := models.TVChannel{Name: "ISKCON TV", StreamURL: "https://example.com/iskcon-tv", StreamType: "youtube", Madh: "iskcon", IsActive: true, CreatedByID: creator.ID}
	for _, channel := range []*models.TVChannel{&globalTV, &gaudiyaTV, &iskconTV} {
		if err := db.Create(channel).Error; err != nil {
			t.Fatalf("create tv failed: %v", err)
		}
	}

	anonTracks, err := service.GetTracks(0, TrackFilter{MediaType: "audio", Limit: 50})
	if err != nil {
		t.Fatalf("anon get tracks failed: %v", err)
	}
	if !containsTrackByID(anonTracks.Tracks, globalTrack.ID) {
		t.Fatalf("anon tracks should contain global track")
	}
	if containsTrackByID(anonTracks.Tracks, gaudiyaTrack.ID) || containsTrackByID(anonTracks.Tracks, iskconTrack.ID) {
		t.Fatalf("anon tracks should not contain org-specific tracks")
	}

	nonProTracks, err := service.GetTracks(nonPro.ID, TrackFilter{MediaType: "audio", Limit: 50})
	if err != nil {
		t.Fatalf("non-pro get tracks failed: %v", err)
	}
	if !containsTrackByID(nonProTracks.Tracks, globalTrack.ID) || !containsTrackByID(nonProTracks.Tracks, gaudiyaTrack.ID) {
		t.Fatalf("non-pro tracks should contain global + own org")
	}
	if containsTrackByID(nonProTracks.Tracks, iskconTrack.ID) {
		t.Fatalf("non-pro tracks should not contain foreign org track")
	}

	nonProIskconFilter, err := service.GetTracks(nonPro.ID, TrackFilter{MediaType: "audio", Madh: "iskcon", Limit: 50})
	if err != nil {
		t.Fatalf("non-pro filtered tracks failed: %v", err)
	}
	if len(nonProIskconFilter.Tracks) != 0 {
		t.Fatalf("non-pro should not access iskcon via filter, got=%d", len(nonProIskconFilter.Tracks))
	}

	proTracks, err := service.GetTracks(proUser.ID, TrackFilter{MediaType: "audio", Limit: 50})
	if err != nil {
		t.Fatalf("pro get tracks failed: %v", err)
	}
	if !containsTrackByID(proTracks.Tracks, globalTrack.ID) ||
		!containsTrackByID(proTracks.Tracks, gaudiyaTrack.ID) ||
		!containsTrackByID(proTracks.Tracks, iskconTrack.ID) {
		t.Fatalf("pro tracks should contain all seeded org tracks")
	}

	noMadhTracks, err := service.GetTracks(noMadh.ID, TrackFilter{MediaType: "audio", Limit: 50})
	if err != nil {
		t.Fatalf("no-madh get tracks failed: %v", err)
	}
	if !containsTrackByID(noMadhTracks.Tracks, globalTrack.ID) {
		t.Fatalf("no-madh tracks should contain global track")
	}
	if containsTrackByID(noMadhTracks.Tracks, gaudiyaTrack.ID) || containsTrackByID(noMadhTracks.Tracks, iskconTrack.ID) {
		t.Fatalf("no-madh tracks should not contain org-specific tracks")
	}

	if _, err := service.GetTrackByID(nonPro.ID, iskconTrack.ID); !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected not found for foreign track, got=%v", err)
	}
	if _, err := service.GetTrackByID(proUser.ID, iskconTrack.ID); err != nil {
		t.Fatalf("pro should access any track, got err=%v", err)
	}

	anonRadio, err := service.GetRadioStations(0, "")
	if err != nil {
		t.Fatalf("anon radio failed: %v", err)
	}
	if !containsRadioByID(anonRadio, globalRadio.ID) {
		t.Fatalf("anon radio should contain global station")
	}
	if containsRadioByID(anonRadio, gaudiyaRadio.ID) || containsRadioByID(anonRadio, iskconRadio.ID) {
		t.Fatalf("anon radio should not contain org-specific stations")
	}

	nonProRadio, err := service.GetRadioStations(nonPro.ID, "")
	if err != nil {
		t.Fatalf("non-pro radio failed: %v", err)
	}
	if !containsRadioByID(nonProRadio, globalRadio.ID) || !containsRadioByID(nonProRadio, gaudiyaRadio.ID) {
		t.Fatalf("non-pro radio should contain global + own org")
	}
	if containsRadioByID(nonProRadio, iskconRadio.ID) {
		t.Fatalf("non-pro radio should not contain foreign org station")
	}

	nonProRadioIskcon, err := service.GetRadioStations(nonPro.ID, "iskcon")
	if err != nil {
		t.Fatalf("non-pro radio iskcon filter failed: %v", err)
	}
	if len(nonProRadioIskcon) != 0 {
		t.Fatalf("non-pro should not access iskcon radio, got=%d", len(nonProRadioIskcon))
	}

	proRadioIskcon, err := service.GetRadioStations(proUser.ID, "iskcon")
	if err != nil {
		t.Fatalf("pro radio iskcon filter failed: %v", err)
	}
	if !containsRadioByID(proRadioIskcon, iskconRadio.ID) {
		t.Fatalf("pro radio with iskcon filter should contain iskcon station")
	}

	if _, err := service.GetRadioStationByID(nonPro.ID, iskconRadio.ID); !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected not found for foreign radio, got=%v", err)
	}
	if _, err := service.GetRadioStationByID(proUser.ID, iskconRadio.ID); err != nil {
		t.Fatalf("pro should access any radio, err=%v", err)
	}

	anonTV, err := service.GetTVChannels(0, "")
	if err != nil {
		t.Fatalf("anon tv failed: %v", err)
	}
	if !containsTVByID(anonTV, globalTV.ID) {
		t.Fatalf("anon tv should contain global channel")
	}
	if containsTVByID(anonTV, gaudiyaTV.ID) || containsTVByID(anonTV, iskconTV.ID) {
		t.Fatalf("anon tv should not contain org-specific channels")
	}

	nonProTV, err := service.GetTVChannels(nonPro.ID, "")
	if err != nil {
		t.Fatalf("non-pro tv failed: %v", err)
	}
	if !containsTVByID(nonProTV, globalTV.ID) || !containsTVByID(nonProTV, gaudiyaTV.ID) {
		t.Fatalf("non-pro tv should contain global + own org")
	}
	if containsTVByID(nonProTV, iskconTV.ID) {
		t.Fatalf("non-pro tv should not contain foreign org channel")
	}

	nonProTVIskcon, err := service.GetTVChannels(nonPro.ID, "iskcon")
	if err != nil {
		t.Fatalf("non-pro tv iskcon filter failed: %v", err)
	}
	if len(nonProTVIskcon) != 0 {
		t.Fatalf("non-pro should not access iskcon tv, got=%d", len(nonProTVIskcon))
	}

	proTVIskcon, err := service.GetTVChannels(proUser.ID, "iskcon")
	if err != nil {
		t.Fatalf("pro tv iskcon filter failed: %v", err)
	}
	if !containsTVByID(proTVIskcon, iskconTV.ID) {
		t.Fatalf("pro tv with iskcon filter should contain iskcon channel")
	}

	if _, err := service.GetTVChannelByID(nonPro.ID, iskconTV.ID); !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected not found for foreign tv, got=%v", err)
	}
	if _, err := service.GetTVChannelByID(proUser.ID, iskconTV.ID); err != nil {
		t.Fatalf("pro should access any tv, err=%v", err)
	}
}
