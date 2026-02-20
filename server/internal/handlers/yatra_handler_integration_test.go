package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupYatraHandlerIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.Yatra{},
		&models.YatraParticipant{},
		&models.Room{},
		&models.RoomMember{},
		&models.UserDeviceToken{},
		&models.PushDeliveryEvent{},
		&models.SystemSetting{},
	)
	if err != nil {
		t.Fatalf("auto-migrate failed: %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("failed to begin transaction: %v", tx.Error)
	}

	database.DB = tx
	services.ResetPushServiceForTests()
	t.Cleanup(func() {
		_ = tx.Rollback().Error
		services.ResetPushServiceForTests()
	})

	return tx
}

func createYatraHandlerUser(t *testing.T, db *gorm.DB, suffix string, role string) models.User {
	t.Helper()
	invite := strings.ToUpper(fmt.Sprintf("H%07d", time.Now().UnixNano()%10000000))
	user := models.User{
		Email:             fmt.Sprintf("yatra-handler-it-%s-%d@vedicai.local", suffix, time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Handler",
		IsProfileComplete: true,
		Role:              role,
		InviteCode:        invite,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user %s: %v", suffix, err)
	}
	return user
}

func createYatraHandlerFixture(t *testing.T, db *gorm.DB, organizerID, approvedID, pendingID uint) models.Yatra {
	t.Helper()
	yatra := models.Yatra{
		OrganizerID:     organizerID,
		Title:           fmt.Sprintf("Handler Yatra %d", time.Now().UnixNano()),
		Theme:           models.YatraThemeVrindavan,
		StartDate:       time.Now().UTC().Add(24 * time.Hour),
		EndDate:         time.Now().UTC().Add(48 * time.Hour),
		Status:          models.YatraStatusOpen,
		MaxParticipants: 20,
		MinParticipants: 1,
		Language:        "en",
	}
	if err := db.Create(&yatra).Error; err != nil {
		t.Fatalf("failed to create yatra: %v", err)
	}

	room := models.Room{
		Name:     fmt.Sprintf("Yatra room %d", time.Now().UnixNano()),
		OwnerID:  organizerID,
		IsPublic: false,
		YatraID:  &yatra.ID,
	}
	if err := db.Create(&room).Error; err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	if err := db.Model(&yatra).Update("chat_room_id", room.ID).Error; err != nil {
		t.Fatalf("failed to set chat_room_id: %v", err)
	}
	if err := db.First(&yatra, yatra.ID).Error; err != nil {
		t.Fatalf("failed to reload yatra with room: %v", err)
	}

	members := []models.RoomMember{
		{RoomID: room.ID, UserID: organizerID, Role: models.RoomRoleOwner},
		{RoomID: room.ID, UserID: approvedID, Role: models.RoomRoleMember},
	}
	if err := db.Create(&members).Error; err != nil {
		t.Fatalf("failed to create room members: %v", err)
	}

	participants := []models.YatraParticipant{
		{YatraID: yatra.ID, UserID: approvedID, Status: models.YatraParticipantApproved, Role: models.YatraRoleMember},
		{YatraID: yatra.ID, UserID: pendingID, Status: models.YatraParticipantPending, Role: models.YatraRoleMember},
	}
	if err := db.Create(&participants).Error; err != nil {
		t.Fatalf("failed to create participants: %v", err)
	}

	return yatra
}

func newYatraHandlerIntegrationApp(handler *YatraHandler) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", nil)
		c.Locals("userRole", nil)
		userID := strings.TrimSpace(c.Get("X-User-ID"))
		if userID != "" {
			c.Locals("userID", userID)
		}
		role := strings.TrimSpace(c.Get("X-User-Role"))
		if role != "" {
			c.Locals("userRole", role)
		}
		return c.Next()
	})
	app.Get("/yatra/:id/chat", handler.GetYatraChatAccess)
	app.Post("/yatra/:id/broadcast", handler.BroadcastYatra)
	return app
}

func TestYatraHandlers_ChatAndBroadcastPermissionMatrix_Integration(t *testing.T) {
	db := setupYatraHandlerIntegrationDB(t)
	handler := &YatraHandler{yatraService: services.NewYatraService(db, nil)}
	app := newYatraHandlerIntegrationApp(handler)

	organizer := createYatraHandlerUser(t, db, "organizer", models.RoleUser)
	admin := createYatraHandlerUser(t, db, "admin", models.RoleAdmin)
	approved := createYatraHandlerUser(t, db, "approved", models.RoleUser)
	pending := createYatraHandlerUser(t, db, "pending", models.RoleUser)
	other := createYatraHandlerUser(t, db, "other", models.RoleUser)

	yatra := createYatraHandlerFixture(t, db, organizer.ID, approved.ID, pending.ID)

	chatCases := []struct {
		name      string
		userID    uint
		role      string
		status    int
		canAccess bool
		reason    string
	}{
		{name: "organizer can access", userID: organizer.ID, role: models.RoleUser, status: fiber.StatusOK, canAccess: true},
		{name: "admin can access", userID: admin.ID, role: models.RoleAdmin, status: fiber.StatusOK, canAccess: true},
		{name: "approved participant can access", userID: approved.ID, role: models.RoleUser, status: fiber.StatusOK, canAccess: true},
		{name: "pending participant denied", userID: pending.ID, role: models.RoleUser, status: fiber.StatusOK, canAccess: false, reason: "membership_required"},
		{name: "other user denied", userID: other.ID, role: models.RoleUser, status: fiber.StatusOK, canAccess: false, reason: "membership_required"},
	}

	for _, tc := range chatCases {
		t.Run("chat: "+tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/yatra/%d/chat", yatra.ID), nil)
			req.Header.Set("X-User-ID", fmt.Sprintf("%d", tc.userID))
			req.Header.Set("X-User-Role", tc.role)

			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			if resp.StatusCode != tc.status {
				t.Fatalf("status=%d want=%d", resp.StatusCode, tc.status)
			}

			var payload struct {
				CanAccess bool   `json:"canAccess"`
				Reason    string `json:"reason"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
				t.Fatalf("decode response failed: %v", err)
			}
			if payload.CanAccess != tc.canAccess {
				t.Fatalf("canAccess=%v want=%v", payload.CanAccess, tc.canAccess)
			}
			if payload.Reason != tc.reason {
				t.Fatalf("reason=%q want=%q", payload.Reason, tc.reason)
			}
		})
	}

	reqUnauthorizedChat := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/yatra/%d/chat", yatra.ID), nil)
	respUnauthorizedChat, err := app.Test(reqUnauthorizedChat)
	if err != nil {
		t.Fatalf("unauthorized chat request failed: %v", err)
	}
	if respUnauthorizedChat.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("unauthorized chat status=%d want=%d", respUnauthorizedChat.StatusCode, fiber.StatusUnauthorized)
	}

	broadcastBody := []byte(`{"title":"Update","body":"Meet at gate","target":"approved"}`)
	broadcastCases := []struct {
		name   string
		userID uint
		role   string
		status int
	}{
		{name: "organizer can broadcast", userID: organizer.ID, role: models.RoleUser, status: fiber.StatusOK},
		{name: "admin can broadcast", userID: admin.ID, role: models.RoleAdmin, status: fiber.StatusOK},
		{name: "other user forbidden", userID: other.ID, role: models.RoleUser, status: fiber.StatusForbidden},
	}

	for _, tc := range broadcastCases {
		t.Run("broadcast: "+tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/yatra/%d/broadcast", yatra.ID), bytes.NewReader(broadcastBody))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", fmt.Sprintf("%d", tc.userID))
			req.Header.Set("X-User-Role", tc.role)

			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			if resp.StatusCode != tc.status {
				t.Fatalf("status=%d want=%d", resp.StatusCode, tc.status)
			}
		})
	}

	reqUnauthorizedBroadcast := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/yatra/%d/broadcast", yatra.ID), bytes.NewReader(broadcastBody))
	reqUnauthorizedBroadcast.Header.Set("Content-Type", "application/json")
	respUnauthorizedBroadcast, err := app.Test(reqUnauthorizedBroadcast)
	if err != nil {
		t.Fatalf("unauthorized broadcast request failed: %v", err)
	}
	if respUnauthorizedBroadcast.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("unauthorized broadcast status=%d want=%d", respUnauthorizedBroadcast.StatusCode, fiber.StatusUnauthorized)
	}
}

func TestYatraHandlers_BillingPausedBlocksChatAndBroadcast_Integration(t *testing.T) {
	db := setupYatraHandlerIntegrationDB(t)
	handler := &YatraHandler{yatraService: services.NewYatraService(db, nil)}
	app := newYatraHandlerIntegrationApp(handler)

	organizer := createYatraHandlerUser(t, db, "paused-organizer", models.RoleUser)
	admin := createYatraHandlerUser(t, db, "paused-admin", models.RoleAdmin)
	approved := createYatraHandlerUser(t, db, "paused-approved", models.RoleUser)
	pending := createYatraHandlerUser(t, db, "paused-pending", models.RoleUser)

	yatra := createYatraHandlerFixture(t, db, organizer.ID, approved.ID, pending.ID)
	if err := db.Model(&models.Yatra{}).Where("id = ?", yatra.ID).Updates(map[string]interface{}{
		"billing_state":        models.YatraBillingStatePausedInsufficient,
		"billing_paused":       true,
		"billing_pause_reason": models.YatraBillingPauseReasonInsufficientLKM,
	}).Error; err != nil {
		t.Fatalf("failed to set yatra paused billing state: %v", err)
	}

	chatCases := []struct {
		name      string
		userID    uint
		role      string
		canAccess bool
		reason    string
	}{
		{name: "organizer blocked", userID: organizer.ID, role: models.RoleUser, canAccess: false, reason: "billing_paused"},
		{name: "approved blocked", userID: approved.ID, role: models.RoleUser, canAccess: false, reason: "billing_paused"},
		{name: "admin still allowed", userID: admin.ID, role: models.RoleAdmin, canAccess: true, reason: ""},
	}
	for _, tc := range chatCases {
		t.Run("chat paused: "+tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/yatra/%d/chat", yatra.ID), nil)
			req.Header.Set("X-User-ID", fmt.Sprintf("%d", tc.userID))
			req.Header.Set("X-User-Role", tc.role)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("chat request failed: %v", err)
			}
			if resp.StatusCode != fiber.StatusOK {
				t.Fatalf("chat status=%d want=%d", resp.StatusCode, fiber.StatusOK)
			}
			var payload struct {
				CanAccess bool   `json:"canAccess"`
				Reason    string `json:"reason"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
				t.Fatalf("decode chat response failed: %v", err)
			}
			if payload.CanAccess != tc.canAccess {
				t.Fatalf("canAccess=%v want=%v", payload.CanAccess, tc.canAccess)
			}
			if payload.Reason != tc.reason {
				t.Fatalf("reason=%q want=%q", payload.Reason, tc.reason)
			}
		})
	}

	broadcastBody := []byte(`{"title":"Update","body":"Meet at gate","target":"approved"}`)
	broadcastCases := []struct {
		name   string
		userID uint
		role   string
		status int
	}{
		{name: "organizer blocked", userID: organizer.ID, role: models.RoleUser, status: fiber.StatusLocked},
		{name: "approved blocked", userID: approved.ID, role: models.RoleUser, status: fiber.StatusForbidden},
		{name: "admin allowed", userID: admin.ID, role: models.RoleAdmin, status: fiber.StatusOK},
	}
	for _, tc := range broadcastCases {
		t.Run("broadcast paused: "+tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/yatra/%d/broadcast", yatra.ID), bytes.NewReader(broadcastBody))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", fmt.Sprintf("%d", tc.userID))
			req.Header.Set("X-User-Role", tc.role)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("broadcast request failed: %v", err)
			}
			if resp.StatusCode != tc.status {
				t.Fatalf("broadcast status=%d want=%d", resp.StatusCode, tc.status)
			}
		})
	}
}
