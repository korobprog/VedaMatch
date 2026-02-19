package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/base32"
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
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupRoomSFUIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Room{}, &models.RoomMember{}))

	tx := db.Begin()
	require.NoError(t, tx.Error)

	database.DB = tx
	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})

	return tx
}

func setSFUTestEnv(t *testing.T) {
	t.Helper()
	t.Setenv("ROOM_SFU_ENABLED", "true")
	t.Setenv("ROOM_SFU_PROVIDER", "livekit")
	t.Setenv("ROOM_SFU_REQUIRE_MEMBERSHIP", "true")
	t.Setenv("ROOM_SFU_MAX_PARTICIPANTS", "50")
	t.Setenv("ROOM_SFU_MAX_SUBSCRIPTIONS", "9")
	t.Setenv("ROOM_SFU_VIDEO_PRESET", "balanced")
	t.Setenv("ROOM_SFU_DYNACAST_ENABLED", "true")
	t.Setenv("ROOM_SFU_ADAPTIVE_STREAM_ENABLED", "true")
	t.Setenv("ROOM_SFU_SIMULCAST_ENABLED", "true")
	t.Setenv("LIVEKIT_API_KEY", "test-livekit-key")
	t.Setenv("LIVEKIT_API_SECRET", "test-livekit-secret")
	t.Setenv("LIVEKIT_WS_URL", "wss://livekit.example.local")
}

func createRoomIntegrationUser(t *testing.T, suffix string) models.User {
	t.Helper()
	now := time.Now().UnixNano()
	inviteCode := makeTestInviteCode()
	user := models.User{
		Email:             fmt.Sprintf("room-sfu-%s-%d@vedicai.local", suffix, now),
		Password:          "hash",
		KarmicName:        "Room",
		IsProfileComplete: true,
		InviteCode:        inviteCode,
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

func makeTestInviteCode() string {
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("S%07d", time.Now().UnixNano()%10000000)
	}
	code := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf)
	code = strings.ToUpper(strings.TrimSpace(code))
	if len(code) > 8 {
		code = code[:8]
	}
	for len(code) < 8 {
		code += "X"
	}
	return code
}

func createRoomWithOwnerMembership(t *testing.T, ownerID uint, isPublic bool) models.Room {
	t.Helper()
	room := models.Room{
		Name:     fmt.Sprintf("SFU Room %d", time.Now().UnixNano()),
		OwnerID:  ownerID,
		IsPublic: isPublic,
	}
	require.NoError(t, database.DB.Create(&room).Error)
	require.NoError(t, database.DB.Create(&models.RoomMember{
		RoomID: room.ID,
		UserID: ownerID,
		Role:   models.RoomRoleOwner,
	}).Error)
	return room
}

func addRoomMember(t *testing.T, roomID, userID uint, role string) {
	t.Helper()
	require.NoError(t, database.DB.Create(&models.RoomMember{
		RoomID: roomID,
		UserID: userID,
		Role:   role,
	}).Error)
}

func newRoomSFUIntegrationApp(handler *RoomSFUHandler, userID uint) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", fmt.Sprintf("%d", userID))
		return c.Next()
	})
	app.Get("/rooms/:id/sfu/config", handler.GetRoomConfig)
	app.Post("/rooms/:id/sfu/token", handler.IssueRoomToken)
	return app
}

func TestRoomSFUToken_IntegrationMemberAllowed(t *testing.T) {
	setupRoomSFUIntegrationDB(t)
	setSFUTestEnv(t)

	owner := createRoomIntegrationUser(t, "owner")
	member := createRoomIntegrationUser(t, "member")
	room := createRoomWithOwnerMembership(t, owner.ID, false)
	addRoomMember(t, room.ID, member.ID, models.RoomRoleMember)

	handler := NewRoomSFUHandler()
	app := newRoomSFUIntegrationApp(handler, member.ID)

	body := map[string]any{
		"participantName": "Bhakta",
		"metadata": map[string]any{
			"platform": "ios",
			"device":   "iphone",
			"hacker":   "blocked",
		},
	}
	payload, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", fmt.Sprintf("/rooms/%d/sfu/token", room.ID), bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.NotEmpty(t, result["token"])
	require.Equal(t, "wss://livekit.example.local", result["wsUrl"])
	require.Equal(t, fmt.Sprintf("room-%d", room.ID), result["roomName"])
	require.Equal(t, fmt.Sprintf("user-%d", member.ID), result["participantIdentity"])
}

func TestRoomSFUToken_IntegrationNonMemberForbidden(t *testing.T) {
	setupRoomSFUIntegrationDB(t)
	setSFUTestEnv(t)

	owner := createRoomIntegrationUser(t, "owner-forbidden")
	stranger := createRoomIntegrationUser(t, "stranger")
	room := createRoomWithOwnerMembership(t, owner.ID, false)

	handler := NewRoomSFUHandler()
	app := newRoomSFUIntegrationApp(handler, stranger.ID)

	req := httptest.NewRequest("POST", fmt.Sprintf("/rooms/%d/sfu/token", room.ID), bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestRoomSFUToken_IntegrationRoomNotFound(t *testing.T) {
	setupRoomSFUIntegrationDB(t)
	setSFUTestEnv(t)

	user := createRoomIntegrationUser(t, "not-found")
	handler := NewRoomSFUHandler()
	app := newRoomSFUIntegrationApp(handler, user.ID)

	req := httptest.NewRequest("POST", "/rooms/999999/sfu/token", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestRoomSFUToken_IntegrationMissingCredentials(t *testing.T) {
	setupRoomSFUIntegrationDB(t)
	setSFUTestEnv(t)
	t.Setenv("LIVEKIT_API_KEY", "")
	t.Setenv("LIVEKIT_API_SECRET", "")
	t.Setenv("LIVEKIT_WS_URL", "")

	owner := createRoomIntegrationUser(t, "owner-missing-creds")
	room := createRoomWithOwnerMembership(t, owner.ID, false)

	handler := NewRoomSFUHandler()
	app := newRoomSFUIntegrationApp(handler, owner.ID)

	req := httptest.NewRequest("POST", fmt.Sprintf("/rooms/%d/sfu/token", room.ID), bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusServiceUnavailable, resp.StatusCode)
}

func TestRoomSFUConfig_IntegrationReturnsPolicy(t *testing.T) {
	setupRoomSFUIntegrationDB(t)
	setSFUTestEnv(t)

	owner := createRoomIntegrationUser(t, "owner-config")
	room := createRoomWithOwnerMembership(t, owner.ID, false)

	handler := NewRoomSFUHandler()
	app := newRoomSFUIntegrationApp(handler, owner.ID)

	req := httptest.NewRequest("GET", fmt.Sprintf("/rooms/%d/sfu/config", room.ID), nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	require.Equal(t, true, result["enabled"])
	require.Equal(t, "livekit", result["provider"])
	require.EqualValues(t, 50, int(result["maxParticipants"].(float64)))
	require.EqualValues(t, 9, int(result["maxSubscriptions"].(float64)))
}
