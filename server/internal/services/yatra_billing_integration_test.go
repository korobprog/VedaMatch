package services

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

func ensureYatraBillingIntegrationSchema(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.AutoMigrate(
		&models.SystemSetting{},
		&models.Wallet{},
		&models.WalletTransaction{},
		&models.YatraBillingEvent{},
	); err != nil {
		t.Fatalf("billing integration automigrate failed: %v", err)
	}
}

func upsertSystemSetting(t *testing.T, db *gorm.DB, key, value string) {
	t.Helper()
	var setting models.SystemSetting
	if err := db.Where("key = ?", key).
		Assign(models.SystemSetting{Key: key, Value: value}).
		FirstOrCreate(&setting).Error; err != nil {
		t.Fatalf("failed to upsert setting %s: %v", key, err)
	}
}

func setWalletBalance(t *testing.T, db *gorm.DB, userID uint, balance int) {
	t.Helper()
	uid := userID
	var wallet models.Wallet
	if err := db.Where("user_id = ? AND type = ?", userID, models.WalletTypePersonal).
		First(&wallet).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			t.Fatalf("failed to find wallet: %v", err)
		}
		wallet = models.Wallet{
			UserID:       &uid,
			Type:         models.WalletTypePersonal,
			Balance:      balance,
			BonusBalance: 0,
		}
		if createErr := db.Create(&wallet).Error; createErr != nil {
			t.Fatalf("failed to create wallet: %v", createErr)
		}
		return
	}
	if err := db.Model(&wallet).Updates(map[string]interface{}{
		"balance":       balance,
		"bonus_balance": 0,
	}).Error; err != nil {
		t.Fatalf("failed to set wallet balance: %v", err)
	}
}

func createBillableYatraFixture(t *testing.T, db *gorm.DB, organizerID uint, title string, nextChargeAt time.Time) models.Yatra {
	t.Helper()
	yatra := models.Yatra{
		OrganizerID:         organizerID,
		Title:               title,
		Description:         "billing integration",
		Theme:               models.YatraThemeVrindavan,
		StartDate:           time.Now().UTC().Add(24 * time.Hour),
		EndDate:             time.Now().UTC().Add(72 * time.Hour),
		Status:              models.YatraStatusOpen,
		MaxParticipants:     10,
		MinParticipants:     1,
		Language:            "en",
		BillingState:        models.YatraBillingStateActive,
		BillingPaused:       false,
		BillingPauseReason:  models.YatraBillingPauseReasonNone,
		BillingConsentAt:    ptrTime(time.Now().UTC()),
		BillingNextChargeAt: &nextChargeAt,
	}
	if err := db.Create(&yatra).Error; err != nil {
		t.Fatalf("failed to create billable yatra: %v", err)
	}
	return yatra
}

func ptrTime(value time.Time) *time.Time {
	v := value.UTC()
	return &v
}

func TestYatraBillingFlow_PublishCyclePauseResumeStop_Integration(t *testing.T) {
	db := setupYatraServiceIntegrationDB(t)
	ensureYatraBillingIntegrationSchema(t, db)

	upsertSystemSetting(t, db, yatraBillingEnabledSettingKey, "true")
	upsertSystemSetting(t, db, yatraDailyFeeSettingKey, "10")

	service := NewYatraService(db, nil)
	expo := setupExpoSuccessServer(t)
	defer expo.Close()
	service.push.expoPushURL = expo.URL
	service.push.httpClient = expo.Client()
	service.push.retryMaxAttempts = 1

	organizer := createYatraIntegrationUser(t, db, "billing-organizer")
	pilgrim := createYatraIntegrationUser(t, db, "billing-pilgrim")

	// publish: consent required
	draftNoConsent := createYatraIntegrationEntity(t, db, organizer.ID, models.YatraStatusDraft)
	setWalletBalance(t, db, organizer.ID, 100)
	err := service.PublishYatra(draftNoConsent.ID, organizer.ID, models.YatraPublishRequest{})
	if !errors.Is(err, ErrYatraBillingConsentRequired) {
		t.Fatalf("expected ErrYatraBillingConsentRequired, got %v", err)
	}

	// publish: success with immediate charge
	draftOk := createYatraIntegrationEntity(t, db, organizer.ID, models.YatraStatusDraft)
	if err := service.PublishYatra(draftOk.ID, organizer.ID, models.YatraPublishRequest{BillingConsent: true}); err != nil {
		t.Fatalf("publish with consent failed: %v", err)
	}
	if err := db.First(&draftOk, draftOk.ID).Error; err != nil {
		t.Fatalf("failed to reload published yatra: %v", err)
	}
	if draftOk.Status != models.YatraStatusOpen {
		t.Fatalf("published yatra status=%s want=%s", draftOk.Status, models.YatraStatusOpen)
	}
	if draftOk.BillingNextChargeAt == nil || !draftOk.BillingNextChargeAt.After(time.Now().UTC()) {
		t.Fatalf("expected billing_next_charge_at to be set in future")
	}
	var wallet models.Wallet
	if err := db.Where("user_id = ? AND type = ?", organizer.ID, models.WalletTypePersonal).First(&wallet).Error; err != nil {
		t.Fatalf("failed to load organizer wallet: %v", err)
	}
	if wallet.Balance != 90 {
		t.Fatalf("wallet balance=%d want=90 after publish charge", wallet.Balance)
	}

	// publish: insufficient LKM
	draftLow := createYatraIntegrationEntity(t, db, organizer.ID, models.YatraStatusDraft)
	setWalletBalance(t, db, organizer.ID, 0)
	err = service.PublishYatra(draftLow.ID, organizer.ID, models.YatraPublishRequest{BillingConsent: true})
	if !errors.Is(err, ErrYatraInsufficientLKM) {
		t.Fatalf("expected ErrYatraInsufficientLKM, got %v", err)
	}

	// worker cycle: one yatra charged, second paused insufficient.
	setWalletBalance(t, db, organizer.ID, 10)
	now := time.Now().UTC()
	yatraCharged := createBillableYatraFixture(t, db, organizer.ID, fmt.Sprintf("Charge-%d", now.UnixNano()), now.Add(-2*time.Hour))
	yatraPaused := createBillableYatraFixture(t, db, organizer.ID, fmt.Sprintf("Pause-%d", now.UnixNano()), now.Add(-1*time.Hour))

	if err := service.ProcessDueBillingCharges(now); err != nil {
		t.Fatalf("billing cycle failed: %v", err)
	}
	if err := db.First(&yatraCharged, yatraCharged.ID).Error; err != nil {
		t.Fatalf("reload charged yatra failed: %v", err)
	}
	if err := db.First(&yatraPaused, yatraPaused.ID).Error; err != nil {
		t.Fatalf("reload paused yatra failed: %v", err)
	}
	if yatraCharged.BillingState != models.YatraBillingStateActive || yatraCharged.BillingPaused {
		t.Fatalf("expected first yatra active after charge, state=%s paused=%v", yatraCharged.BillingState, yatraCharged.BillingPaused)
	}
	if yatraPaused.BillingState != models.YatraBillingStatePausedInsufficient || !yatraPaused.BillingPaused {
		t.Fatalf("expected second yatra paused_insufficient, state=%s paused=%v", yatraPaused.BillingState, yatraPaused.BillingPaused)
	}
	if _, joinErr := service.JoinYatra(yatraPaused.ID, pilgrim.ID, models.YatraJoinRequest{Message: "let me in"}); !errors.Is(joinErr, ErrYatraBillingPaused) {
		t.Fatalf("expected join to be blocked by billing pause, got %v", joinErr)
	}

	// auto-resume after top-up and next cycle
	setWalletBalance(t, db, organizer.ID, 20)
	if err := service.ProcessDueBillingCharges(now.Add(20 * time.Minute)); err != nil {
		t.Fatalf("billing cycle after top-up failed: %v", err)
	}
	if err := db.First(&yatraPaused, yatraPaused.ID).Error; err != nil {
		t.Fatalf("reload resumed yatra failed: %v", err)
	}
	if yatraPaused.BillingState != models.YatraBillingStateActive || yatraPaused.BillingPaused {
		t.Fatalf("expected yatra to auto-resume, state=%s paused=%v", yatraPaused.BillingState, yatraPaused.BillingPaused)
	}

	// stop should cancel and disable future charges.
	if err := service.StopYatra(yatraCharged.ID, organizer.ID, models.RoleUser); err != nil {
		t.Fatalf("stop yatra failed: %v", err)
	}
	var stoppedYatra models.Yatra
	if err := db.First(&stoppedYatra, yatraCharged.ID).Error; err != nil {
		t.Fatalf("reload stopped yatra failed: %v", err)
	}
	if stoppedYatra.Status != models.YatraStatusCancelled || stoppedYatra.BillingState != models.YatraBillingStateStopped {
		t.Fatalf("stopped yatra has wrong state status=%s billing=%s", stoppedYatra.Status, stoppedYatra.BillingState)
	}
	if stoppedYatra.BillingNextChargeAt != nil {
		t.Fatalf("expected stopped yatra next charge to be nil")
	}
}
