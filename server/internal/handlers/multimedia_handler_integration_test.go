package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
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

func createMultimediaHandlerTestUser(t *testing.T, db *gorm.DB) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("multimedia-handler-%d@VedaMatch.local", time.Now().UnixNano()),
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

func createMultimediaHandlerUserWithScope(t *testing.T, db *gorm.DB, madh string, currentPlan string, role string) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("multimedia-handler-scope-%d@VedaMatch.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "MMHandlerScope",
		Madh:              madh,
		CurrentPlan:       currentPlan,
		IsProfileComplete: true,
		Role:              role,
		InviteCode:        strings.ToUpper(fmt.Sprintf("S%07d", time.Now().UnixNano()%10000000)),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create scope user failed: %v", err)
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

func TestMultimediaHandler_PublicOrgScope_Integration(t *testing.T) {
	db := setupMultimediaHandlerIntegrationDB(t)
	creator := createMultimediaHandlerTestUser(t, db)
	nonPro := createMultimediaHandlerUserWithScope(t, db, "gaudiya", "trial", models.RoleUser)
	proUser := createMultimediaHandlerUserWithScope(t, db, "gaudiya", "pro", models.RoleUser)

	globalTrack := models.MediaTrack{Title: "Global Track", MediaType: models.MediaTypeAudio, URL: "https://cdn.example.com/global.mp3", CreatedByID: creator.ID, IsActive: true}
	gaudiyaTrack := models.MediaTrack{Title: "Gaudiya Track", MediaType: models.MediaTypeAudio, URL: "https://cdn.example.com/gaudiya.mp3", CreatedByID: creator.ID, IsActive: true, Madh: "gaudiya"}
	iskconTrack := models.MediaTrack{Title: "ISKCON Track", MediaType: models.MediaTypeAudio, URL: "https://cdn.example.com/iskcon.mp3", CreatedByID: creator.ID, IsActive: true, Madh: "iskcon"}
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

	globalTV := models.TVChannel{Name: "Global TV", StreamURL: "https://example.com/global-tv", StreamType: "youtube", IsActive: true, Status: "online", CreatedByID: creator.ID}
	gaudiyaTV := models.TVChannel{Name: "Gaudiya TV", StreamURL: "https://example.com/gaudiya-tv", StreamType: "youtube", Madh: "gaudiya", IsActive: true, Status: "online", CreatedByID: creator.ID}
	iskconTV := models.TVChannel{Name: "ISKCON TV", StreamURL: "https://example.com/iskcon-tv", StreamType: "youtube", Madh: "iskcon", IsActive: true, Status: "online", CreatedByID: creator.ID}
	for _, channel := range []*models.TVChannel{&globalTV, &gaudiyaTV, &iskconTV} {
		if err := db.Create(channel).Error; err != nil {
			t.Fatalf("create tv failed: %v", err)
		}
	}

	h := NewMultimediaHandler()
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		raw := strings.TrimSpace(c.Get("X-User-ID"))
		if raw != "" {
			id, err := strconv.Atoi(raw)
			if err == nil && id > 0 {
				c.Locals("userID", uint(id))
			}
		}
		return c.Next()
	})
	app.Get("/multimedia/tracks", h.GetTracks)
	app.Get("/multimedia/tracks/:id", h.GetTrack)
	app.Get("/multimedia/radio", h.GetRadioStations)
	app.Get("/multimedia/radio/:id", h.GetRadioStation)
	app.Get("/multimedia/tv", h.GetTVChannels)
	app.Get("/multimedia/tv/:id", h.GetTVChannel)

	assertJSONListCount := func(resp *http.Response, want int) {
		var payload []map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			t.Fatalf("decode list failed: %v", err)
		}
		if len(payload) != want {
			t.Fatalf("list count=%d want=%d", len(payload), want)
		}
	}

	reqAnonTracks := httptest.NewRequest("GET", "/multimedia/tracks?type=audio&limit=50", nil)
	respAnonTracks, err := app.Test(reqAnonTracks)
	if err != nil {
		t.Fatalf("anon tracks request failed: %v", err)
	}
	if respAnonTracks.StatusCode != fiber.StatusOK {
		t.Fatalf("anon tracks status=%d", respAnonTracks.StatusCode)
	}
	var anonTracks map[string]any
	if err := json.NewDecoder(respAnonTracks.Body).Decode(&anonTracks); err != nil {
		t.Fatalf("decode anon tracks failed: %v", err)
	}
	anonTrackList, ok := anonTracks["tracks"].([]any)
	if !ok || len(anonTrackList) != 1 {
		t.Fatalf("anonymous should see only global track, got=%v", anonTracks["tracks"])
	}

	reqNonProTracks := httptest.NewRequest("GET", "/multimedia/tracks?type=audio&limit=50", nil)
	reqNonProTracks.Header.Set("X-User-ID", strconv.Itoa(int(nonPro.ID)))
	respNonProTracks, err := app.Test(reqNonProTracks)
	if err != nil {
		t.Fatalf("non-pro tracks request failed: %v", err)
	}
	if respNonProTracks.StatusCode != fiber.StatusOK {
		t.Fatalf("non-pro tracks status=%d", respNonProTracks.StatusCode)
	}
	var nonProTracks map[string]any
	if err := json.NewDecoder(respNonProTracks.Body).Decode(&nonProTracks); err != nil {
		t.Fatalf("decode non-pro tracks failed: %v", err)
	}
	nonProTrackList, ok := nonProTracks["tracks"].([]any)
	if !ok || len(nonProTrackList) != 2 {
		t.Fatalf("non-pro should see global+own, got=%v", nonProTracks["tracks"])
	}

	reqNonProForeign := httptest.NewRequest("GET", "/multimedia/tracks?type=audio&madh=iskcon&limit=50", nil)
	reqNonProForeign.Header.Set("X-User-ID", strconv.Itoa(int(nonPro.ID)))
	respNonProForeign, err := app.Test(reqNonProForeign)
	if err != nil {
		t.Fatalf("non-pro foreign tracks request failed: %v", err)
	}
	if respNonProForeign.StatusCode != fiber.StatusOK {
		t.Fatalf("non-pro foreign tracks status=%d", respNonProForeign.StatusCode)
	}
	var nonProForeign map[string]any
	if err := json.NewDecoder(respNonProForeign.Body).Decode(&nonProForeign); err != nil {
		t.Fatalf("decode non-pro foreign tracks failed: %v", err)
	}
	nonProForeignTrackList, ok := nonProForeign["tracks"].([]any)
	if !ok || len(nonProForeignTrackList) != 0 {
		t.Fatalf("non-pro should not see foreign org via query, got=%v", nonProForeign["tracks"])
	}

	reqProTracks := httptest.NewRequest("GET", "/multimedia/tracks?type=audio&limit=50", nil)
	reqProTracks.Header.Set("X-User-ID", strconv.Itoa(int(proUser.ID)))
	respProTracks, err := app.Test(reqProTracks)
	if err != nil {
		t.Fatalf("pro tracks request failed: %v", err)
	}
	if respProTracks.StatusCode != fiber.StatusOK {
		t.Fatalf("pro tracks status=%d", respProTracks.StatusCode)
	}
	var proTracks map[string]any
	if err := json.NewDecoder(respProTracks.Body).Decode(&proTracks); err != nil {
		t.Fatalf("decode pro tracks failed: %v", err)
	}
	proTrackList, ok := proTracks["tracks"].([]any)
	if !ok || len(proTrackList) != 3 {
		t.Fatalf("pro should see all tracks, got=%v", proTracks["tracks"])
	}

	reqTrackForbidden := httptest.NewRequest("GET", fmt.Sprintf("/multimedia/tracks/%d", iskconTrack.ID), nil)
	reqTrackForbidden.Header.Set("X-User-ID", strconv.Itoa(int(nonPro.ID)))
	respTrackForbidden, err := app.Test(reqTrackForbidden)
	if err != nil {
		t.Fatalf("track detail request failed: %v", err)
	}
	if respTrackForbidden.StatusCode != fiber.StatusNotFound {
		t.Fatalf("non-pro foreign track detail status=%d want=404", respTrackForbidden.StatusCode)
	}

	reqRadioAnon := httptest.NewRequest("GET", "/multimedia/radio", nil)
	respRadioAnon, err := app.Test(reqRadioAnon)
	if err != nil {
		t.Fatalf("anon radio request failed: %v", err)
	}
	if respRadioAnon.StatusCode != fiber.StatusOK {
		t.Fatalf("anon radio status=%d", respRadioAnon.StatusCode)
	}
	assertJSONListCount(respRadioAnon, 1)

	reqRadioNonPro := httptest.NewRequest("GET", "/multimedia/radio", nil)
	reqRadioNonPro.Header.Set("X-User-ID", strconv.Itoa(int(nonPro.ID)))
	respRadioNonPro, err := app.Test(reqRadioNonPro)
	if err != nil {
		t.Fatalf("non-pro radio request failed: %v", err)
	}
	if respRadioNonPro.StatusCode != fiber.StatusOK {
		t.Fatalf("non-pro radio status=%d", respRadioNonPro.StatusCode)
	}
	assertJSONListCount(respRadioNonPro, 2)

	reqTVAnon := httptest.NewRequest("GET", "/multimedia/tv", nil)
	respTVAnon, err := app.Test(reqTVAnon)
	if err != nil {
		t.Fatalf("anon tv request failed: %v", err)
	}
	if respTVAnon.StatusCode != fiber.StatusOK {
		t.Fatalf("anon tv status=%d", respTVAnon.StatusCode)
	}
	assertJSONListCount(respTVAnon, 1)

	reqTVNonPro := httptest.NewRequest("GET", "/multimedia/tv", nil)
	reqTVNonPro.Header.Set("X-User-ID", strconv.Itoa(int(nonPro.ID)))
	respTVNonPro, err := app.Test(reqTVNonPro)
	if err != nil {
		t.Fatalf("non-pro tv request failed: %v", err)
	}
	if respTVNonPro.StatusCode != fiber.StatusOK {
		t.Fatalf("non-pro tv status=%d", respTVNonPro.StatusCode)
	}
	assertJSONListCount(respTVNonPro, 2)

	reqTVForbidden := httptest.NewRequest("GET", fmt.Sprintf("/multimedia/tv/%d", iskconTV.ID), nil)
	reqTVForbidden.Header.Set("X-User-ID", strconv.Itoa(int(nonPro.ID)))
	respTVForbidden, err := app.Test(reqTVForbidden)
	if err != nil {
		t.Fatalf("tv detail request failed: %v", err)
	}
	if respTVForbidden.StatusCode != fiber.StatusNotFound {
		t.Fatalf("non-pro foreign tv detail status=%d want=404", respTVForbidden.StatusCode)
	}
}
