package handlers

import (
	"fmt"
	"net/http/httptest"
	"os"
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

func charityIntegrationPostgresDSN() string {
	host := charityEnvOrDefault("DB_HOST", "localhost")
	port := charityEnvOrDefault("DB_PORT", "5435")
	user := charityEnvOrDefault("DB_USER", "raguser")
	password := charityEnvOrDefault("DB_PASSWORD", "ragpassword")
	name := charityEnvOrDefault("DB_NAME", "ragdb")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, name)
}

func charityEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func setupCharityHandlerIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.Open(charityIntegrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.CharityOrganization{}, &models.CharityProject{}); err != nil {
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

func TestCharityHandlerGetProjectByID(t *testing.T) {
	db := setupCharityHandlerIntegrationDB(t)
	user := models.User{
		Email:             fmt.Sprintf("charity-%d@test.local", time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "Charity Test",
		InviteCode:        fmt.Sprintf("H%07d", time.Now().UnixNano()%10000000),
		IsProfileComplete: true,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	org := models.CharityOrganization{
		Name:        "Charity Org",
		Slug:        fmt.Sprintf("charity-org-%d", time.Now().UnixNano()),
		OwnerUserID: user.ID,
		Status:      models.OrgStatusVerified,
	}
	if err := db.Create(&org).Error; err != nil {
		t.Fatalf("create org: %v", err)
	}
	project := models.CharityProject{
		OrganizationID: org.ID,
		Title:          "Food seva",
		Slug:           fmt.Sprintf("food-seva-%d", time.Now().UnixNano()),
		GoalAmount:     1000,
		Status:         models.ProjectStatusActive,
	}
	if err := db.Create(&project).Error; err != nil {
		t.Fatalf("create project: %v", err)
	}

	app := fiber.New()
	handler := NewCharityHandler(services.NewCharityService(nil))
	app.Get("/charity/projects/:id", handler.GetProjectByID)

	req := httptest.NewRequest("GET", fmt.Sprintf("/charity/projects/%d", project.ID), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d want=%d", resp.StatusCode, fiber.StatusOK)
	}
}
