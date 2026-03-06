package services

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func connectIntegrationPostgresDSN() string {
	host := connectEnvOrDefault("DB_HOST", "localhost")
	port := connectEnvOrDefault("DB_PORT", "5435")
	user := connectEnvOrDefault("DB_USER", "raguser")
	password := connectEnvOrDefault("DB_PASSWORD", "ragpassword")
	name := connectEnvOrDefault("DB_NAME", "ragdb")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, name)
}

func connectEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func setupConnectServiceIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.Open(connectIntegrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.ConnectCommunity{},
		&models.ConnectOpportunity{},
		&models.ConnectMatchProfile{},
		&models.ConnectApplication{},
		&models.Yatra{},
		&models.CharityOrganization{},
		&models.CharityProject{},
		&models.Service{},
	)
	if err != nil {
		t.Fatalf("auto-migrate failed: %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("begin tx: %v", tx.Error)
	}
	database.DB = tx
	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})
	return tx
}

func createConnectUser(t *testing.T, db *gorm.DB, city string) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("connect-%d@local.test", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Connect User",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		InviteCode:        fmt.Sprintf("C%07d", time.Now().UnixNano()%10000000),
		City:              city,
		Interests:         "prasadam,kirtan",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func TestConnectServiceFeedReturnsOnlyActiveAndPrioritizesNewcomerFriendly(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	user := createConnectUser(t, db, "Moscow")
	profile := models.ConnectMatchProfile{
		UserID:               user.ID,
		City:                 "Moscow",
		Interests:            []string{"prasadam"},
		OnboardingMode:       models.ConnectOnboardingTrySimple,
		NeedsMentor:          true,
		PreferredEntryLevels: []string{string(models.ConnectEntryLevelIntro)},
	}
	if err := db.Create(&profile).Error; err != nil {
		t.Fatalf("create profile: %v", err)
	}

	active := models.ConnectOpportunity{
		CreatedByUserID:     user.ID,
		Title:               "Prasadam welcome team",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		ParticipationModes:  []string{string(models.ConnectParticipationModeSocial)},
		NewcomerFriendly:    true,
		MentorAvailable:     true,
		Status:              models.ConnectOpportunityStatusActive,
	}
	hidden := models.ConnectOpportunity{
		CreatedByUserID:     user.ID,
		Title:               "Hidden moderation opportunity",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		Status:              models.ConnectOpportunityStatusModeration,
	}
	if err := db.Create(&active).Error; err != nil {
		t.Fatalf("create active: %v", err)
	}
	if err := db.Create(&hidden).Error; err != nil {
		t.Fatalf("create hidden: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	feed, err := svc.GetFeed(user.ID, models.ConnectFeedRequest{City: "Moscow", Limit: 10})
	if err != nil {
		t.Fatalf("GetFeed error: %v", err)
	}
	if len(feed.Opportunities) == 0 {
		t.Fatalf("expected at least one opportunity")
	}
	if feed.Opportunities[0].Title != "Prasadam welcome team" {
		t.Fatalf("first title=%q", feed.Opportunities[0].Title)
	}
	for _, item := range feed.Opportunities {
		if item.Title == "Hidden moderation opportunity" {
			t.Fatalf("moderation opportunity leaked to feed")
		}
	}
	if !feed.Opportunities[0].NewcomerFriendly {
		t.Fatalf("expected newcomer-friendly opportunity to be prioritized")
	}
}

func TestConnectServiceFeedBuildsSourceLinks(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	user := createConnectUser(t, db, "Moscow")

	yatra := models.Yatra{
		OrganizerID:     user.ID,
		Title:           "Weekend kirtan bus",
		Description:     "Travel together and serve",
		Theme:           models.YatraThemeVrindavan,
		StartDate:       time.Now().Add(24 * time.Hour).UTC(),
		EndDate:         time.Now().Add(48 * time.Hour).UTC(),
		StartCity:       "Moscow",
		MaxParticipants: 10,
		MinParticipants: 1,
		Status:          models.YatraStatusOpen,
		Language:        "en",
	}
	if err := db.Create(&yatra).Error; err != nil {
		t.Fatalf("create yatra: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	feed, err := svc.GetFeed(user.ID, models.ConnectFeedRequest{City: "Moscow", Limit: 20})
	if err != nil {
		t.Fatalf("GetFeed error: %v", err)
	}
	found := false
	for _, item := range feed.Opportunities {
		if item.SourceLink != nil && item.SourceLink.Type == models.ConnectSourceYatra && item.SourceLink.ID == yatra.ID {
			found = true
			if item.SourceLink.Screen != "YatraDetail" {
				t.Fatalf("screen=%q", item.SourceLink.Screen)
			}
		}
	}
	if !found {
		t.Fatalf("expected yatra source link in feed")
	}
}
