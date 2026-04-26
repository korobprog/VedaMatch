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
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupAuthFriendshipIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping auth friendship integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Friend{}, &models.FriendRequest{}))

	tx := db.Begin()
	require.NoError(t, tx.Error)
	database.DB = tx
	services.ResetPushServiceForTests()

	t.Cleanup(func() {
		_ = tx.Rollback().Error
		services.ResetPushServiceForTests()
	})

	return tx
}

func newAuthFriendshipTestApp(handler *AuthHandler) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if userID := strings.TrimSpace(c.Get("X-Test-User-ID")); userID != "" {
			c.Locals("userID", userID)
		}
		return c.Next()
	})
	app.Post("/api/friends/add", handler.AddFriend)
	app.Post("/api/friends/request/accept", handler.AcceptFriendRequest)
	return app
}

func createAuthFriendshipUser(t *testing.T, suffix string) models.User {
	t.Helper()

	user := models.User{
		Email:             fmt.Sprintf("friendship-%s-%d@vedamatch.local", suffix, time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Friendship Test",
		SpiritualName:     "Bhakta Friendship",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		InviteCode:        fmt.Sprintf("FR%06d", time.Now().UnixNano()%1000000),
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

func TestAddFriend_CreatesPendingFriendRequestForLegacyClient(t *testing.T) {
	setupAuthFriendshipIntegrationDB(t)
	sender := createAuthFriendshipUser(t, "legacy-sender")
	receiver := createAuthFriendshipUser(t, "legacy-receiver")

	app := newAuthFriendshipTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("POST", "/api/friends/add", bytes.NewBufferString(fmt.Sprintf(`{"friendId":%d}`, receiver.ID)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", sender.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var request models.FriendRequest
	require.NoError(t, database.DB.Where("sender_id = ? AND receiver_id = ?", sender.ID, receiver.ID).First(&request).Error)
	require.Equal(t, models.FriendRequestStatusPending, request.Status)

	var friendCount int64
	require.NoError(t, database.DB.Model(&models.Friend{}).Count(&friendCount).Error)
	require.EqualValues(t, 0, friendCount)
}

func TestAddFriend_AcceptsIncomingPendingRequestForLegacyClient(t *testing.T) {
	setupAuthFriendshipIntegrationDB(t)
	sender := createAuthFriendshipUser(t, "request-sender")
	receiver := createAuthFriendshipUser(t, "request-receiver")

	request := models.FriendRequest{
		SenderID:   sender.ID,
		ReceiverID: receiver.ID,
		Status:     models.FriendRequestStatusPending,
	}
	require.NoError(t, database.DB.Create(&request).Error)

	app := newAuthFriendshipTestApp(NewAuthHandler(nil, nil))
	req := httptest.NewRequest("POST", "/api/friends/add", bytes.NewBufferString(fmt.Sprintf(`{"friendId":%d}`, sender.ID)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", receiver.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.FriendRequest
	require.NoError(t, database.DB.First(&refreshed, request.ID).Error)
	require.Equal(t, models.FriendRequestStatusAccepted, refreshed.Status)

	var edges []models.Friend
	require.NoError(t, database.DB.Order("user_id ASC, friend_id ASC").Find(&edges).Error)
	require.Len(t, edges, 2)
	require.Equal(t, sender.ID, edges[0].UserID)
	require.Equal(t, receiver.ID, edges[0].FriendID)
	require.Equal(t, receiver.ID, edges[1].UserID)
	require.Equal(t, sender.ID, edges[1].FriendID)
}

func TestAcceptFriendRequest_BackfillsMissingReverseFriendship(t *testing.T) {
	setupAuthFriendshipIntegrationDB(t)
	sender := createAuthFriendshipUser(t, "accept-sender")
	receiver := createAuthFriendshipUser(t, "accept-receiver")

	request := models.FriendRequest{
		SenderID:   sender.ID,
		ReceiverID: receiver.ID,
		Status:     models.FriendRequestStatusPending,
	}
	require.NoError(t, database.DB.Create(&request).Error)
	require.NoError(t, database.DB.Create(&models.Friend{UserID: sender.ID, FriendID: receiver.ID}).Error)

	app := newAuthFriendshipTestApp(NewAuthHandler(nil, nil))
	payload, _ := json.Marshal(map[string]uint{"requestId": request.ID})
	req := httptest.NewRequest("POST", "/api/friends/request/accept", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", receiver.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.FriendRequest
	require.NoError(t, database.DB.First(&refreshed, request.ID).Error)
	require.Equal(t, models.FriendRequestStatusAccepted, refreshed.Status)

	var edges []models.Friend
	require.NoError(t, database.DB.Order("user_id ASC, friend_id ASC").Find(&edges).Error)
	require.Len(t, edges, 2)
	require.Equal(t, sender.ID, edges[0].UserID)
	require.Equal(t, receiver.ID, edges[0].FriendID)
	require.Equal(t, receiver.ID, edges[1].UserID)
	require.Equal(t, sender.ID, edges[1].FriendID)
}
