package services

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupLKMTopupIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(yatraIntegrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping integration test: postgres not available: %v", err)
	}

	err = db.AutoMigrate(
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
	)
	if err != nil {
		t.Fatalf("auto-migrate failed: %v", err)
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

func createLKMTopupTestUser(t *testing.T, db *gorm.DB, suffix string) models.User {
	t.Helper()
	user := models.User{
		Email:             fmt.Sprintf("lkm-topup-%s-%d@vedicai.local", suffix, time.Now().UnixNano()),
		Password:          "hash",
		KarmicName:        "LKM Test",
		Role:              models.RoleUser,
		IsProfileComplete: true,
		InviteCode:        strings.ToUpper(fmt.Sprintf("L%07d", time.Now().UnixNano()%10000000)),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}
	return user
}

func TestLKMTopupPackages_VisibilityByRegion_Integration(t *testing.T) {
	db := setupLKMTopupIntegrationDB(t)
	svc := NewLKMTopupServiceWithDB(db, NewWalletService())

	nonCIS, err := svc.GetPackages("non_cis", "RUB", "stripe", "default", "lkm.vedamatch.com")
	if err != nil {
		t.Fatalf("GetPackages non_cis failed: %v", err)
	}
	for _, pkg := range nonCIS.Packages {
		if pkg.LKMAmount == 199 {
			t.Fatalf("non_cis packages must not include 199 LKM")
		}
	}

	cis, err := svc.GetPackages("cis", "RUB", "yookassa", "default", "lkm.vedamatch.ru")
	if err != nil {
		t.Fatalf("GetPackages cis failed: %v", err)
	}
	found199 := false
	for _, pkg := range cis.Packages {
		if pkg.LKMAmount == 199 {
			found199 = true
		}
	}
	if !found199 {
		t.Fatalf("cis packages must include 199 LKM")
	}
}

func TestLKMTopupQuote_CustomValidation_Integration(t *testing.T) {
	db := setupLKMTopupIntegrationDB(t)
	svc := NewLKMTopupServiceWithDB(db, NewWalletService())
	user := createLKMTopupTestUser(t, db, "validation")

	invalidCases := []servicesLKMQuoteCase{
		{name: "below min cis", req: LKMQuoteRequest{LKMAmount: 198, Region: "cis", Currency: "RUB", GatewayCode: "yookassa"}},
		{name: "bad step cis", req: LKMQuoteRequest{LKMAmount: 201, Region: "cis", Currency: "RUB", GatewayCode: "yookassa"}},
		{name: "above max cis", req: LKMQuoteRequest{LKMAmount: 450001, Region: "cis", Currency: "RUB", GatewayCode: "yookassa"}},
		{name: "below min non-cis", req: LKMQuoteRequest{LKMAmount: 450, Region: "non_cis", Currency: "RUB", GatewayCode: "stripe"}},
	}
	for _, tc := range invalidCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.CreateQuote(user.ID, tc.req, "lkm.vedamatch.ru")
			if !errors.Is(err, ErrLKMInvalidAmount) {
				t.Fatalf("expected ErrLKMInvalidAmount, got %v", err)
			}
		})
	}

	validCases := []LKMQuoteRequest{
		{LKMAmount: 500, Region: "cis", Currency: "RUB", GatewayCode: "yookassa"},
		{LKMAmount: 500, Region: "non_cis", Currency: "RUB", GatewayCode: "stripe"},
	}
	for _, req := range validCases {
		if _, err := svc.CreateQuote(user.ID, req, "lkm.vedamatch.ru"); err != nil {
			t.Fatalf("expected valid quote, got error: %v", err)
		}
	}
}

type servicesLKMQuoteCase struct {
	name string
	req  LKMQuoteRequest
}

func TestLKMTopupQuote_TotalForRUBAndNonRUB_Integration(t *testing.T) {
	db := setupLKMTopupIntegrationDB(t)
	svc := NewLKMTopupServiceWithDB(db, NewWalletService())
	user := createLKMTopupTestUser(t, db, "quote-totals")

	err := svc.UpdateAdminConfig(LKMAdminConfig{
		ProcessingCosts: []models.LKMPaymentProcessingCost{
			{
				GatewayCode:   "yookassa",
				PaymentMethod: "default",
				Region:        models.LKMRegionCIS,
				Percent:       10,
				FixedRub:      5,
				IsEnabled:     true,
			},
			{
				GatewayCode:   "stripe",
				PaymentMethod: "default",
				Region:        models.LKMRegionNonCIS,
				Percent:       2.5,
				FixedRub:      0,
				IsEnabled:     true,
			},
		},
		FXRates: []models.LKMManualFXRate{
			{Currency: "USD", RubPerUnit: 100, IsActive: true},
		},
	}, 1)
	if err != nil {
		t.Fatalf("UpdateAdminConfig failed: %v", err)
	}

	cisQuote, err := svc.CreateQuote(user.ID, LKMQuoteRequest{
		LKMAmount:     199,
		Region:        "cis",
		Currency:      "RUB",
		GatewayCode:   "yookassa",
		PaymentMethod: "default",
	}, "lkm.vedamatch.ru")
	if err != nil {
		t.Fatalf("cis quote failed: %v", err)
	}
	if cisQuote.TotalPayAmount != 223.9 {
		t.Fatalf("cis total pay=%v want=223.9", cisQuote.TotalPayAmount)
	}

	nonCisQuote, err := svc.CreateQuote(user.ID, LKMQuoteRequest{
		LKMAmount:     1000,
		Region:        "non_cis",
		Currency:      "USD",
		GatewayCode:   "stripe",
		PaymentMethod: "default",
	}, "lkm.vedamatch.com")
	if err != nil {
		t.Fatalf("non-cis quote failed: %v", err)
	}
	if nonCisQuote.TotalRub != 1025 {
		t.Fatalf("non-cis total rub=%v want=1025", nonCisQuote.TotalRub)
	}
	if nonCisQuote.TotalPayAmount != 10.25 {
		t.Fatalf("non-cis total pay=%v want=10.25", nonCisQuote.TotalPayAmount)
	}
}

func TestLKMTopupQuote_GlobalNominalRate_Integration(t *testing.T) {
	db := setupLKMTopupIntegrationDB(t)
	svc := NewLKMTopupServiceWithDB(db, NewWalletService())
	user := createLKMTopupTestUser(t, db, "nominal-rate")

	err := svc.UpdateAdminConfig(LKMAdminConfig{
		GlobalConfig: models.LKMTopupGlobalConfig{
			NominalRubPerLKM: 1.05,
		},
		ProcessingCosts: []models.LKMPaymentProcessingCost{
			{
				GatewayCode:   "yookassa",
				PaymentMethod: "default",
				Region:        models.LKMRegionCIS,
				Percent:       0,
				FixedRub:      0,
				IsEnabled:     true,
			},
		},
	}, 1)
	if err != nil {
		t.Fatalf("UpdateAdminConfig failed: %v", err)
	}

	quote, err := svc.CreateQuote(user.ID, LKMQuoteRequest{
		LKMAmount:     1000,
		Region:        "cis",
		Currency:      "RUB",
		GatewayCode:   "yookassa",
		PaymentMethod: "default",
	}, "lkm.vedamatch.ru")
	if err != nil {
		t.Fatalf("CreateQuote failed: %v", err)
	}

	if quote.NominalRubPerLKM != 1.05 {
		t.Fatalf("quote nominal rate=%v want=1.05", quote.NominalRubPerLKM)
	}
	if quote.NominalRub != 1050 {
		t.Fatalf("quote nominal rub=%v want=1050", quote.NominalRub)
	}
	if quote.TotalRub != 1050 {
		t.Fatalf("quote total rub=%v want=1050", quote.TotalRub)
	}
	if quote.TotalPayAmount != 1050 {
		t.Fatalf("quote total pay=%v want=1050", quote.TotalPayAmount)
	}
}

func TestLKMTopup_RiskRoutingAndWalletCredit_Integration(t *testing.T) {
	db := setupLKMTopupIntegrationDB(t)
	walletSvc := NewWalletService()
	svc := NewLKMTopupServiceWithDB(db, walletSvc)
	user := createLKMTopupTestUser(t, db, "risk-credit")

	err := svc.UpdateAdminConfig(LKMAdminConfig{
		ProcessingCosts: []models.LKMPaymentProcessingCost{
			{
				GatewayCode:   "yookassa",
				PaymentMethod: "default",
				Region:        models.LKMRegionCIS,
				Percent:       5,
				FixedRub:      10,
				IsEnabled:     true,
			},
		},
	}, 1)
	if err != nil {
		t.Fatalf("UpdateAdminConfig failed: %v", err)
	}

	// Auto tier and wallet credit check.
	autoQuote, err := svc.CreateQuote(user.ID, LKMQuoteRequest{
		LKMAmount:     500,
		Region:        "cis",
		Currency:      "RUB",
		GatewayCode:   "yookassa",
		PaymentMethod: "default",
	}, "lkm.vedamatch.ru")
	if err != nil {
		t.Fatalf("auto quote failed: %v", err)
	}

	autoTopup, err := svc.CreateTopupFromQuote(user.ID, LKMCreateTopupRequest{
		QuoteID:           autoQuote.QuoteID,
		Channel:           "web",
		DeviceFingerprint: "device-auto",
	})
	if err != nil {
		t.Fatalf("auto topup failed: %v", err)
	}

	autoProcessed, err := svc.HandleWebhook("yookassa", LKMWebhookRequest{
		EventID: autoTopup.TopupID + "-paid",
		TopupID: autoTopup.TopupID,
		Status:  "paid",
	})
	if err != nil {
		t.Fatalf("auto webhook failed: %v", err)
	}
	if autoProcessed.Status != models.LKMTopupStatusCredited {
		t.Fatalf("auto tier expected credited, got %s", autoProcessed.Status)
	}

	wallet, err := walletSvc.GetBalance(user.ID)
	if err != nil {
		t.Fatalf("wallet balance failed: %v", err)
	}
	if wallet.Balance != 500 {
		t.Fatalf("wallet credited balance=%d want=500", wallet.Balance)
	}

	// Enhanced tier should auto-credit on clean risk.
	enhancedQuote, err := svc.CreateQuote(user.ID, LKMQuoteRequest{
		LKMAmount:     50000,
		Region:        "cis",
		Currency:      "RUB",
		GatewayCode:   "yookassa",
		PaymentMethod: "default",
	}, "lkm.vedamatch.ru")
	if err != nil {
		t.Fatalf("enhanced quote failed: %v", err)
	}

	enhancedTopup, err := svc.CreateTopupFromQuote(user.ID, LKMCreateTopupRequest{
		QuoteID:           enhancedQuote.QuoteID,
		Channel:           "web",
		DeviceFingerprint: "device-enhanced",
	})
	if err != nil {
		t.Fatalf("enhanced topup failed: %v", err)
	}

	enhancedProcessed, err := svc.HandleWebhook("yookassa", LKMWebhookRequest{
		EventID: enhancedTopup.TopupID + "-paid",
		TopupID: enhancedTopup.TopupID,
		Status:  "paid",
	})
	if err != nil {
		t.Fatalf("enhanced webhook failed: %v", err)
	}
	if enhancedProcessed.Status != models.LKMTopupStatusCredited {
		t.Fatalf("enhanced tier expected credited, got %s", enhancedProcessed.Status)
	}

	// Manual tier should remain in manual review queue after paid webhook.
	manualQuote, err := svc.CreateQuote(user.ID, LKMQuoteRequest{
		LKMAmount:     150000,
		Region:        "cis",
		Currency:      "RUB",
		GatewayCode:   "yookassa",
		PaymentMethod: "default",
	}, "lkm.vedamatch.ru")
	if err != nil {
		t.Fatalf("manual quote failed: %v", err)
	}

	manualTopup, err := svc.CreateTopupFromQuote(user.ID, LKMCreateTopupRequest{
		QuoteID:           manualQuote.QuoteID,
		Channel:           "web",
		DeviceFingerprint: "device-manual",
	})
	if err != nil {
		t.Fatalf("manual topup failed: %v", err)
	}

	manualProcessed, err := svc.HandleWebhook("yookassa", LKMWebhookRequest{
		EventID: manualTopup.TopupID + "-paid",
		TopupID: manualTopup.TopupID,
		Status:  "paid",
	})
	if err != nil {
		t.Fatalf("manual webhook failed: %v", err)
	}
	if manualProcessed.Status != models.LKMTopupStatusManualReview {
		t.Fatalf("manual tier expected manual_review, got %s", manualProcessed.Status)
	}
}
