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

func yatraIntegrationPostgresDSN() string {
	host := yatraEnvOrDefault("DB_HOST", "localhost")
	port := yatraEnvOrDefault("DB_PORT", "5435")
	user := yatraEnvOrDefault("DB_USER", "raguser")
	password := yatraEnvOrDefault("DB_PASSWORD", "ragpassword")
	name := yatraEnvOrDefault("DB_NAME", "ragdb")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, name)
}

func yatraEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func setupYatraServiceIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(yatraIntegrationPostgresDSN()), &gorm.Config{})
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
		&models.Wallet{},
		&models.WalletTransaction{},
		&models.YatraBillingEvent{},
	)
	if err != nil {
		t.Fatalf("auto-migrate failed: %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("failed to begin transaction: %v", tx.Error)
	}

	database.DB = tx
	ResetPushServiceForTests()

	t.Cleanup(func() {
		_ = tx.Rollback().Error
		ResetPushServiceForTests()
	})

	return tx
}

func createYatraIntegrationUser(t *testing.T, db *gorm.DB, suffix string) models.User {
	t.Helper()

	invite := strings.ToUpper(fmt.Sprintf("Y%07d", time.Now().UnixNano()%10000000))
	user := models.User{
		Email:             fmt.Sprintf("yatra-it-%s-%d@vedicai.local", suffix, time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Yatra",
		IsProfileComplete: true,
		Role:              models.RoleUser,
		InviteCode:        invite,
		PushToken:         fmt.Sprintf("ExponentPushToken[%s-%d]", suffix, time.Now().UnixNano()),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user %s: %v", suffix, err)
	}
	return user
}

func createYatraIntegrationEntity(t *testing.T, db *gorm.DB, organizerID uint, status models.YatraStatus) models.Yatra {
	t.Helper()

	yatra := models.Yatra{
		OrganizerID:     organizerID,
		Title:           fmt.Sprintf("Yatra IT %d", time.Now().UnixNano()),
		Description:     "integration scenario",
		Theme:           models.YatraThemeVrindavan,
		StartDate:       time.Now().UTC().Add(24 * time.Hour),
		EndDate:         time.Now().UTC().Add(48 * time.Hour),
		StartCity:       "Vrindavan",
		EndCity:         "Mayapur",
		MaxParticipants: 10,
		MinParticipants: 1,
		Status:          status,
		Language:        "en",
	}
	if err := db.Create(&yatra).Error; err != nil {
		t.Fatalf("failed to create yatra: %v", err)
	}
	return yatra
}

func setupExpoSuccessServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"status":"ok","id":"ticket-1"}]}`))
	}))
}

func assertPushEventCount(t *testing.T, db *gorm.DB, eventType string, expected int64) {
	t.Helper()
	var count int64
	if err := db.Model(&models.PushDeliveryEvent{}).Where("event_type = ?", eventType).Count(&count).Error; err != nil {
		t.Fatalf("failed to count push events for %s: %v", eventType, err)
	}
	if count != expected {
		t.Fatalf("event_type=%s count=%d want=%d", eventType, count, expected)
	}
}

func TestYatraE2EPublishJoinModerateChatPushAndRemove_Integration(t *testing.T) {
	db := setupYatraServiceIntegrationDB(t)
	service := NewYatraService(db, nil)

	expo := setupExpoSuccessServer(t)
	defer expo.Close()
	service.push.expoPushURL = expo.URL
	service.push.httpClient = expo.Client()
	service.push.retryMaxAttempts = 1

	organizer := createYatraIntegrationUser(t, db, "organizer")
	approvedUser := createYatraIntegrationUser(t, db, "approved")
	rejectedUser := createYatraIntegrationUser(t, db, "rejected")

	yatra := createYatraIntegrationEntity(t, db, organizer.ID, models.YatraStatusDraft)

	if err := service.PublishYatra(yatra.ID, organizer.ID, models.YatraPublishRequest{}); err != nil {
		t.Fatalf("publish failed: %v", err)
	}
	if err := db.First(&yatra, yatra.ID).Error; err != nil {
		t.Fatalf("failed to reload yatra after publish: %v", err)
	}
	if yatra.Status != models.YatraStatusOpen {
		t.Fatalf("yatra status=%s want=%s", yatra.Status, models.YatraStatusOpen)
	}

	approvedParticipant, err := service.JoinYatra(yatra.ID, approvedUser.ID, models.YatraJoinRequest{Message: "please accept"})
	if err != nil {
		t.Fatalf("join approved-user failed: %v", err)
	}
	rejectedParticipant, err := service.JoinYatra(yatra.ID, rejectedUser.ID, models.YatraJoinRequest{Message: "please review"})
	if err != nil {
		t.Fatalf("join rejected-user failed: %v", err)
	}

	if err := service.ApproveParticipant(yatra.ID, approvedParticipant.ID, organizer.ID); err != nil {
		t.Fatalf("approve failed: %v", err)
	}
	if err := service.RejectParticipant(yatra.ID, rejectedParticipant.ID, organizer.ID); err != nil {
		t.Fatalf("reject failed: %v", err)
	}

	if err := db.First(&yatra, yatra.ID).Error; err != nil {
		t.Fatalf("failed to reload yatra after moderation: %v", err)
	}
	if yatra.ChatRoomID == nil {
		t.Fatalf("chat room must be created after first approve")
	}

	var approvedState models.YatraParticipant
	if err := db.First(&approvedState, approvedParticipant.ID).Error; err != nil {
		t.Fatalf("failed to reload approved participant: %v", err)
	}
	if approvedState.Status != models.YatraParticipantApproved {
		t.Fatalf("approved participant status=%s", approvedState.Status)
	}

	var rejectedState models.YatraParticipant
	if err := db.First(&rejectedState, rejectedParticipant.ID).Error; err != nil {
		t.Fatalf("failed to reload rejected participant: %v", err)
	}
	if rejectedState.Status != models.YatraParticipantRejected {
		t.Fatalf("rejected participant status=%s", rejectedState.Status)
	}

	var organizerMembershipCount int64
	if err := db.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, organizer.ID).
		Count(&organizerMembershipCount).Error; err != nil {
		t.Fatalf("failed to count organizer room membership: %v", err)
	}
	if organizerMembershipCount != 1 {
		t.Fatalf("organizer membership count=%d want=1", organizerMembershipCount)
	}

	var approvedMembershipCount int64
	if err := db.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, approvedUser.ID).
		Count(&approvedMembershipCount).Error; err != nil {
		t.Fatalf("failed to count approved room membership: %v", err)
	}
	if approvedMembershipCount != 1 {
		t.Fatalf("approved membership count=%d want=1", approvedMembershipCount)
	}

	delivered, err := service.BroadcastYatra(yatra.ID, organizer.ID, models.RoleUser, YatraBroadcastRequest{
		Title:  "Route update",
		Body:   "Bring warm clothes",
		Target: YatraBroadcastTargetApproved,
	})
	if err != nil {
		t.Fatalf("broadcast failed: %v", err)
	}
	if delivered != 1 {
		t.Fatalf("broadcast delivered=%d want=1", delivered)
	}

	assertPushEventCount(t, db, "yatra_join_requested", 2)
	assertPushEventCount(t, db, "yatra_join_approved", 1)
	assertPushEventCount(t, db, "yatra_join_rejected", 1)
	assertPushEventCount(t, db, "yatra_broadcast", 1)

	if err := service.RemoveParticipant(yatra.ID, approvedParticipant.ID, organizer.ID); err != nil {
		t.Fatalf("remove participant failed: %v", err)
	}

	var participantCount int64
	if err := db.Model(&models.YatraParticipant{}).Where("id = ?", approvedParticipant.ID).Count(&participantCount).Error; err != nil {
		t.Fatalf("failed to check participant deletion: %v", err)
	}
	if participantCount != 0 {
		t.Fatalf("participant still exists after remove, count=%d", participantCount)
	}

	var roomMembershipCount int64
	if err := db.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, approvedUser.ID).
		Count(&roomMembershipCount).Error; err != nil {
		t.Fatalf("failed to verify room membership deletion: %v", err)
	}
	if roomMembershipCount != 0 {
		t.Fatalf("room membership still exists after participant removal, count=%d", roomMembershipCount)
	}
}
