package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strconv"
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

func setupLKMTopupHandlerIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	dbHost := getEnvOrDefault("DB_HOST", "localhost")
	dbPort := getEnvOrDefault("DB_PORT", "5435")
	dbUser := getEnvOrDefault("DB_USER", "raguser")
	dbPassword := getEnvOrDefault("DB_PASSWORD", "ragpassword")
	dbName := getEnvOrDefault("DB_NAME", "ragdb")
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("skip lkm topup handler integration tests: DB not reachable (%v)", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Skipf("skip lkm topup handler integration tests: SQL DB unavailable (%v)", err)
	}
	if pingErr := sqlDB.Ping(); pingErr != nil {
		t.Skipf("skip lkm topup handler integration tests: DB ping failed (%v)", pingErr)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Wallet{},
		&models.WalletTransaction{},
		&models.LKMTopupGlobalConfig{},
		&models.LKMPaymentGateway{},
		&models.LKMRegionConfig{},
		&models.LKMPackageConfig{},
		&models.LKMPaymentProcessingCost{},
		&models.LKMManualFXRate{},
		&models.LKMTopupRiskTier{},
		&models.LKMQuote{},
		&models.LKMTopup{},
		&models.LKMTopupWebhookEvent{},
	); err != nil {
		t.Fatalf("failed to migrate lkm topup schema: %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("failed to begin test transaction: %v", tx.Error)
	}
	database.DB = tx
	if err := database.SeedLKMTopupWithDB(tx); err != nil {
		t.Fatalf("failed to seed lkm topup defaults: %v", err)
	}
	t.Cleanup(func() {
		_ = tx.Rollback().Error
	})

	return tx
}

func setupLKMTopupHandlerApp(t *testing.T) (*fiber.App, *gorm.DB, models.User) {
	t.Helper()
	db := setupLKMTopupHandlerIntegrationDB(t)
	user := createLKMTopupHandlerUser(t, db, "handler")

	svc := services.NewLKMTopupServiceWithDB(db, services.NewWalletService())
	handler := NewLKMTopupHandler(svc)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if uid := strings.TrimSpace(c.Get("X-Test-User")); uid != "" {
			c.Locals("userID", uid)
			c.Locals("userRole", models.RoleUser)
		}
		return c.Next()
	})
	app.Get("/api/lkm/topups", handler.GetMyTopups)
	app.Post("/api/lkm/topups", handler.CreateTopup)
	return app, db, user
}

func createLKMTopupHandlerUser(t *testing.T, db *gorm.DB, suffix string) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("lkm-handler-%s-%d@vedicai.local", suffix, time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "handler",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		InviteCode:        strings.ToUpper(fmt.Sprintf("H%07d", time.Now().UnixNano()%10000000)),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create handler test user: %v", err)
	}
	return user
}

func TestLKMTopupHandler_CreateTopupRequiresQuoteID(t *testing.T) {
	app, _, user := setupLKMTopupHandlerApp(t)

	body := `{"lkmAmount":999,"channel":"web"}`
	req := httptest.NewRequest("POST", "/api/lkm/topups", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", strconv.FormatUint(uint64(user.ID), 10))

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if res.StatusCode != fiber.StatusNotFound {
		t.Fatalf("status=%d want=%d", res.StatusCode, fiber.StatusNotFound)
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if payload["errorCode"] != "QUOTE_NOT_FOUND" {
		t.Fatalf("errorCode=%v want=QUOTE_NOT_FOUND", payload["errorCode"])
	}
}

func TestLKMTopupHandler_MobileTopupBlocked(t *testing.T) {
	app, _, user := setupLKMTopupHandlerApp(t)

	body := `{"quoteId":"fake-quote-id"}`
	req := httptest.NewRequest("POST", "/api/lkm/topups", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", strconv.FormatUint(uint64(user.ID), 10))
	req.Header.Set("X-Client-Platform", "ios")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status=%d want=%d", res.StatusCode, fiber.StatusForbidden)
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if payload["errorCode"] != "TOPUP_NOT_ALLOWED_ON_MOBILE" {
		t.Fatalf("errorCode=%v want=TOPUP_NOT_ALLOWED_ON_MOBILE", payload["errorCode"])
	}
}

func TestLKMTopupHandler_GetMyTopupsFiltersOwnAndStatus(t *testing.T) {
	app, db, user := setupLKMTopupHandlerApp(t)
	other := createLKMTopupHandlerUser(t, db, "other")
	now := time.Now().UTC()

	records := []models.LKMTopup{
		{
			TopupID:              fmt.Sprintf("topup-%d-a", now.UnixNano()),
			UserID:               user.ID,
			QuoteRefID:           1,
			QuoteID:              "quote-a",
			GatewayCode:          "yookassa",
			PaymentMethod:        "default",
			Region:               models.LKMRegionCIS,
			PayCurrency:          "RUB",
			ReceiveLKM:           500,
			NominalRub:           500,
			ProcessingCostRub:    0,
			TotalRub:             500,
			TotalPayAmount:       500,
			FXRateRubPerCurrency: 1,
			Channel:              "web",
			Status:               models.LKMTopupStatusCredited,
			RiskAction:           models.LKMRiskActionAuto,
		},
		{
			TopupID:              fmt.Sprintf("topup-%d-b", now.UnixNano()),
			UserID:               user.ID,
			QuoteRefID:           2,
			QuoteID:              "quote-b",
			GatewayCode:          "yookassa",
			PaymentMethod:        "default",
			Region:               models.LKMRegionCIS,
			PayCurrency:          "RUB",
			ReceiveLKM:           999,
			NominalRub:           999,
			ProcessingCostRub:    0,
			TotalRub:             999,
			TotalPayAmount:       999,
			FXRateRubPerCurrency: 1,
			Channel:              "web",
			Status:               models.LKMTopupStatusPendingPayment,
			RiskAction:           models.LKMRiskActionAuto,
		},
		{
			TopupID:              fmt.Sprintf("topup-%d-c", now.UnixNano()),
			UserID:               other.ID,
			QuoteRefID:           3,
			QuoteID:              "quote-c",
			GatewayCode:          "stripe",
			PaymentMethod:        "default",
			Region:               models.LKMRegionNonCIS,
			PayCurrency:          "USD",
			ReceiveLKM:           500,
			NominalRub:           500,
			ProcessingCostRub:    0,
			TotalRub:             500,
			TotalPayAmount:       5,
			FXRateRubPerCurrency: 100,
			Channel:              "web",
			Status:               models.LKMTopupStatusCredited,
			RiskAction:           models.LKMRiskActionAuto,
		},
	}
	for _, record := range records {
		if err := db.Create(&record).Error; err != nil {
			t.Fatalf("failed to seed topup %s: %v", record.TopupID, err)
		}
	}

	req := httptest.NewRequest("GET", "/api/lkm/topups?status=credited&page=1&limit=10", nil)
	req.Header.Set("X-Test-User", strconv.FormatUint(uint64(user.ID), 10))

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d want=%d", res.StatusCode, fiber.StatusOK)
	}

	var payload struct {
		Items []models.LKMTopup `json:"items"`
		Total int64             `json:"total"`
		Page  int               `json:"page"`
		Limit int               `json:"limit"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}

	if payload.Total != 1 {
		t.Fatalf("total=%d want=1", payload.Total)
	}
	if len(payload.Items) != 1 {
		t.Fatalf("items=%d want=1", len(payload.Items))
	}
	if payload.Items[0].UserID != user.ID {
		t.Fatalf("userID=%d want=%d", payload.Items[0].UserID, user.ID)
	}
	if payload.Items[0].Status != models.LKMTopupStatusCredited {
		t.Fatalf("status=%s want=%s", payload.Items[0].Status, models.LKMTopupStatusCredited)
	}
}
