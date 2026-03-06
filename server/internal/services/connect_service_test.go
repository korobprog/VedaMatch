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

type connectPushCall struct {
	userID  uint
	message PushMessage
}

type mockConnectPushSender struct {
	calls     []connectPushCall
	errByUser map[uint]error
}

func (m *mockConnectPushSender) SendToUser(userID uint, message PushMessage) error {
	m.calls = append(m.calls, connectPushCall{userID: userID, message: message})
	if m.errByUser != nil {
		if err, ok := m.errByUser[userID]; ok {
			return err
		}
	}
	return nil
}

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
		&models.ConnectFeedback{},
		&models.MetricCounter{},
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
		GoogleSub:         fmt.Sprintf("connect-google-%d", time.Now().UnixNano()),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func snapshotConnectMetric(t *testing.T, key string) int64 {
	t.Helper()
	snapshot, err := GetMetricsService().Snapshot([]string{key})
	if err != nil {
		t.Fatalf("snapshot metric %s: %v", key, err)
	}
	return snapshot[key]
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

func TestConnectServiceModerateOpportunity(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	admin := createConnectUser(t, db, "Moscow")
	admin.Role = models.RoleAdmin
	if err := db.Save(&admin).Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Kitchen prep",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		Status:              models.ConnectOpportunityStatusModeration,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	updated, err := svc.ModerateOpportunity(opportunity.ID, admin.ID, true, "approved for listing")
	if err != nil {
		t.Fatalf("ModerateOpportunity error: %v", err)
	}
	if updated.Status != models.ConnectOpportunityStatusActive {
		t.Fatalf("status=%q want=%q", updated.Status, models.ConnectOpportunityStatusActive)
	}
	if updated.ModeratedAt == nil {
		t.Fatalf("expected moderatedAt to be set")
	}
	if updated.ModeratedByUserID == nil || *updated.ModeratedByUserID != admin.ID {
		t.Fatalf("unexpected moderatedByUserID: %+v", updated.ModeratedByUserID)
	}
	if updated.ModerationNote != "approved for listing" {
		t.Fatalf("moderationNote=%q", updated.ModerationNote)
	}
}

func TestConnectServiceGetOpportunityAllowsAdminToOpenModerationItem(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	admin := createConnectUser(t, db, "Moscow")
	admin.Role = models.RoleAdmin
	if err := db.Save(&admin).Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Quiet kitchen prep",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		Status:              models.ConnectOpportunityStatusModeration,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	detail, err := svc.GetOpportunity(admin.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.Opportunity.ID != opportunity.ID {
		t.Fatalf("detail id=%d want=%d", detail.Opportunity.ID, opportunity.ID)
	}
	if detail.Opportunity.Status != models.ConnectOpportunityStatusModeration {
		t.Fatalf("status=%q want=%q", detail.Opportunity.Status, models.ConnectOpportunityStatusModeration)
	}
}

func TestConnectServiceSubmitFeedbackBuildsTrustSummary(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	reviewer := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Guest welcome team",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	if err := db.Create(&models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        reviewer.ID,
		Status:        models.ConnectApplicationApproved,
	}).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	_, err := svc.SubmitFeedback(reviewer.ID, opportunity.ID, models.ConnectFeedbackCreateRequest{
		Rating:           5,
		Comment:          "Warm group and clear coordination",
		Tags:             []string{"friendly", "clear"},
		FeltSafe:         true,
		NewcomerFriendly: true,
		WouldReturn:      true,
	})
	if err != nil {
		t.Fatalf("SubmitFeedback error: %v", err)
	}

	detail, err := svc.GetOpportunity(reviewer.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.TrustSummary == nil {
		t.Fatalf("expected trust summary")
	}
	if detail.TrustSummary.ReviewsCount != 1 {
		t.Fatalf("reviews=%d want=1", detail.TrustSummary.ReviewsCount)
	}
	if len(detail.Feedback) != 1 {
		t.Fatalf("feedback len=%d want=1", len(detail.Feedback))
	}
	if detail.Feedback[0].AuthorLabel == "" {
		t.Fatalf("expected author label")
	}
	if !detail.CanSubmitFeedback {
		t.Fatalf("expected canSubmitFeedback=true for applicant")
	}
	if detail.ViewerApplication == nil || detail.ViewerApplication.Status != models.ConnectApplicationApproved {
		t.Fatalf("expected viewer application status to be approved")
	}
	if got := snapshotConnectMetric(t, MetricConnectFeedbackSubmittedTotal); got != 1 {
		t.Fatalf("feedback metric=%d want=1", got)
	}
}

func TestConnectServiceSubmitFeedbackRequiresApplication(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	reviewer := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Temple setup team",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	_, err := svc.SubmitFeedback(reviewer.ID, opportunity.ID, models.ConnectFeedbackCreateRequest{
		Rating:  4,
		Comment: "Should be blocked without application",
	})
	if err == nil {
		t.Fatalf("expected error")
	}
	if err != ErrConnectFeedbackNotAllowed {
		t.Fatalf("err=%v want=%v", err, ErrConnectFeedbackNotAllowed)
	}

	detail, err := svc.GetOpportunity(reviewer.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.CanSubmitFeedback {
		t.Fatalf("expected canSubmitFeedback=false without application")
	}
}

func TestConnectServicePendingApplicationCannotSubmitFeedback(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	reviewer := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Coordinator approval team",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	if err := db.Create(&models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        reviewer.ID,
		Status:        models.ConnectApplicationPending,
	}).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	_, err := svc.SubmitFeedback(reviewer.ID, opportunity.ID, models.ConnectFeedbackCreateRequest{
		Rating:  4,
		Comment: "Should stay blocked while pending",
	})
	if err != ErrConnectFeedbackNotAllowed {
		t.Fatalf("err=%v want=%v", err, ErrConnectFeedbackNotAllowed)
	}

	detail, err := svc.GetOpportunity(reviewer.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.CanSubmitFeedback {
		t.Fatalf("expected canSubmitFeedback=false for pending application")
	}
	if detail.ViewerApplication == nil || detail.ViewerApplication.Status != models.ConnectApplicationPending {
		t.Fatalf("expected pending viewer application")
	}
}

func TestConnectServiceApplyAutoApprovesOpenOpportunity(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	applicant := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Open guest welcome",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    false,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	application, err := svc.Apply(applicant.ID, opportunity.ID, models.ConnectApplyRequest{
		Message: "I can join tonight",
	})
	if err != nil {
		t.Fatalf("Apply error: %v", err)
	}
	if application.Status != models.ConnectApplicationApproved {
		t.Fatalf("status=%q want=%q", application.Status, models.ConnectApplicationApproved)
	}

	detail, err := svc.GetOpportunity(applicant.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.ViewerApplication == nil || detail.ViewerApplication.Status != models.ConnectApplicationApproved {
		t.Fatalf("expected approved viewer application")
	}
	if !detail.CanSubmitFeedback {
		t.Fatalf("expected approved application to unlock feedback")
	}
	if got := snapshotConnectMetric(t, MetricConnectApplicationCreatedTotal); got != 1 {
		t.Fatalf("application metric=%d want=1", got)
	}
}

func TestConnectServiceApplySendsPushToManagers(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	coordinator := createConnectUser(t, db, "Moscow")
	applicant := createConnectUser(t, db, "Moscow")
	creator.Language = "en"
	if err := db.Save(&creator).Error; err != nil {
		t.Fatalf("save creator language: %v", err)
	}
	coordinator.Language = "hi"
	if err := db.Save(&coordinator).Error; err != nil {
		t.Fatalf("save coordinator language: %v", err)
	}

	community := models.ConnectCommunity{
		Name:               "Kitchen team",
		City:               "Moscow",
		CommunityType:      models.ConnectCommunityTypeTeam,
		VerificationStatus: models.ConnectVerificationVerified,
		CoordinatorUserID:  &coordinator.ID,
	}
	if err := db.Create(&community).Error; err != nil {
		t.Fatalf("create community: %v", err)
	}
	opportunity := models.ConnectOpportunity{
		CommunityID:         &community.ID,
		CreatedByUserID:     creator.ID,
		Title:               "Prasadam prep",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}

	push := &mockConnectPushSender{}
	svc := NewConnectServiceWithDeps(db, push)
	application, err := svc.Apply(applicant.ID, opportunity.ID, models.ConnectApplyRequest{Message: "Ready to help"})
	if err != nil {
		t.Fatalf("Apply error: %v", err)
	}
	if application.Status != models.ConnectApplicationPending {
		t.Fatalf("status=%q want=%q", application.Status, models.ConnectApplicationPending)
	}
	if len(push.calls) != 2 {
		t.Fatalf("push calls=%d want=2", len(push.calls))
	}
	targets := map[uint]bool{}
	for _, call := range push.calls {
		targets[call.userID] = true
		if call.message.Data["screen"] != "ConnectModeration" {
			t.Fatalf("screen=%q", call.message.Data["screen"])
		}
		if call.userID == creator.ID && call.message.Title != "New Connect application" {
			t.Fatalf("creator title=%q", call.message.Title)
		}
		if call.userID == coordinator.ID && call.message.Title != "Connect में नया आवेदन" {
			t.Fatalf("coordinator title=%q", call.message.Title)
		}
	}
	if !targets[creator.ID] || !targets[coordinator.ID] {
		t.Fatalf("expected push to creator and coordinator, got=%v", targets)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationCreatedSentTotal); got != 2 {
		t.Fatalf("push sent metric=%d want=2", got)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationCreatedFailedTotal); got != 0 {
		t.Fatalf("push failed metric=%d want=0", got)
	}
}

func TestConnectServiceApplyTracksPushFailureMetric(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	coordinator := createConnectUser(t, db, "Moscow")
	applicant := createConnectUser(t, db, "Moscow")

	community := models.ConnectCommunity{
		Name:               "Kitchen team",
		City:               "Moscow",
		CommunityType:      models.ConnectCommunityTypeTeam,
		VerificationStatus: models.ConnectVerificationVerified,
		CoordinatorUserID:  &coordinator.ID,
	}
	if err := db.Create(&community).Error; err != nil {
		t.Fatalf("create community: %v", err)
	}
	opportunity := models.ConnectOpportunity{
		CommunityID:         &community.ID,
		CreatedByUserID:     creator.ID,
		Title:               "Prasadam prep",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}

	push := &mockConnectPushSender{
		errByUser: map[uint]error{
			coordinator.ID: fmt.Errorf("push unavailable"),
		},
	}
	svc := NewConnectServiceWithDeps(db, push)
	if _, err := svc.Apply(applicant.ID, opportunity.ID, models.ConnectApplyRequest{Message: "Ready to help"}); err != nil {
		t.Fatalf("Apply error: %v", err)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationCreatedSentTotal); got != 1 {
		t.Fatalf("push sent metric=%d want=1", got)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationCreatedFailedTotal); got != 1 {
		t.Fatalf("push failed metric=%d want=1", got)
	}
}

func TestConnectServiceUpdateApplicationStatusUnlocksFeedback(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	admin := createConnectUser(t, db, "Moscow")
	admin.Role = models.RoleAdmin
	if err := db.Save(&admin).Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}
	applicant := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Requires approval",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	application := models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        applicant.ID,
		Status:        models.ConnectApplicationPending,
	}
	if err := db.Create(&application).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	updated, err := svc.UpdateApplicationStatus(admin.ID, application.ID, models.ConnectApplicationStatusUpdateRequest{
		Status: models.ConnectApplicationAttended,
		Note:   "Checked in and joined the team",
	})
	if err != nil {
		t.Fatalf("UpdateApplicationStatus error: %v", err)
	}
	if updated.Status != models.ConnectApplicationAttended {
		t.Fatalf("status=%q want=%q", updated.Status, models.ConnectApplicationAttended)
	}
	if updated.ReviewedAt == nil {
		t.Fatalf("expected reviewedAt to be set")
	}
	if updated.ReviewedByUserID == nil || *updated.ReviewedByUserID != admin.ID {
		t.Fatalf("unexpected reviewedByUserID: %+v", updated.ReviewedByUserID)
	}

	detail, err := svc.GetOpportunity(applicant.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.ViewerApplication == nil || detail.ViewerApplication.Status != models.ConnectApplicationAttended {
		t.Fatalf("expected attended viewer application")
	}
	if !detail.CanSubmitFeedback {
		t.Fatalf("expected attended application to unlock feedback")
	}
	if got := snapshotConnectMetric(t, MetricConnectApplicationStatusUpdatedTotal); got != 1 {
		t.Fatalf("status metric=%d want=1", got)
	}
}

func TestConnectServiceUpdateApplicationStatusSendsPushToApplicant(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	admin := createConnectUser(t, db, "Moscow")
	admin.Role = models.RoleAdmin
	if err := db.Save(&admin).Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}
	applicant := createConnectUser(t, db, "Moscow")
	applicant.Language = "hi"
	if err := db.Save(&applicant).Error; err != nil {
		t.Fatalf("save applicant language: %v", err)
	}

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Temple welcome",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	application := models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        applicant.ID,
		Status:        models.ConnectApplicationPending,
	}
	if err := db.Create(&application).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	push := &mockConnectPushSender{}
	svc := NewConnectServiceWithDeps(db, push)
	updated, err := svc.UpdateApplicationStatus(admin.ID, application.ID, models.ConnectApplicationStatusUpdateRequest{
		Status: models.ConnectApplicationApproved,
		Note:   "Welcome onboard",
	})
	if err != nil {
		t.Fatalf("UpdateApplicationStatus error: %v", err)
	}
	if updated.Status != models.ConnectApplicationApproved {
		t.Fatalf("status=%q want=%q", updated.Status, models.ConnectApplicationApproved)
	}
	if len(push.calls) != 1 {
		t.Fatalf("push calls=%d want=1", len(push.calls))
	}
	if push.calls[0].userID != applicant.ID {
		t.Fatalf("target=%d want=%d", push.calls[0].userID, applicant.ID)
	}
	if push.calls[0].message.Data["screen"] != "ConnectOpportunityDetails" {
		t.Fatalf("screen=%q", push.calls[0].message.Data["screen"])
	}
	if push.calls[0].message.Data["status"] != string(models.ConnectApplicationApproved) {
		t.Fatalf("status=%q", push.calls[0].message.Data["status"])
	}
	if push.calls[0].message.Title != "आवेदन स्वीकृत हुआ" {
		t.Fatalf("title=%q", push.calls[0].message.Title)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationStatusSentTotal); got != 1 {
		t.Fatalf("status push sent metric=%d want=1", got)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationStatusFailedTotal); got != 0 {
		t.Fatalf("status push failed metric=%d want=0", got)
	}
}

func TestConnectServiceUpdateApplicationStatusTracksPushFailureMetric(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	admin := createConnectUser(t, db, "Moscow")
	admin.Role = models.RoleAdmin
	if err := db.Save(&admin).Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}
	applicant := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Temple welcome",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	application := models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        applicant.ID,
		Status:        models.ConnectApplicationPending,
	}
	if err := db.Create(&application).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	push := &mockConnectPushSender{
		errByUser: map[uint]error{
			applicant.ID: fmt.Errorf("push unavailable"),
		},
	}
	svc := NewConnectServiceWithDeps(db, push)
	if _, err := svc.UpdateApplicationStatus(admin.ID, application.ID, models.ConnectApplicationStatusUpdateRequest{
		Status: models.ConnectApplicationApproved,
		Note:   "Welcome onboard",
	}); err != nil {
		t.Fatalf("UpdateApplicationStatus error: %v", err)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationStatusSentTotal); got != 0 {
		t.Fatalf("status push sent metric=%d want=0", got)
	}
	if got := snapshotConnectMetric(t, MetricConnectPushApplicationStatusFailedTotal); got != 1 {
		t.Fatalf("status push failed metric=%d want=1", got)
	}
}

func TestConnectServiceModerateOpportunityTracksMetrics(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	admin := createConnectUser(t, db, "Moscow")
	admin.Role = models.RoleAdmin
	if err := db.Save(&admin).Error; err != nil {
		t.Fatalf("promote admin: %v", err)
	}

	approvedOpportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Kitchen prep",
		Category:            "prasadam",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		Status:              models.ConnectOpportunityStatusModeration,
		SourceType:          models.ConnectSourceNative,
	}
	rejectedOpportunity := approvedOpportunity
	rejectedOpportunity.Title = "Rejected item"
	if err := db.Create(&approvedOpportunity).Error; err != nil {
		t.Fatalf("create approved opportunity: %v", err)
	}
	if err := db.Create(&rejectedOpportunity).Error; err != nil {
		t.Fatalf("create rejected opportunity: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	if _, err := svc.ModerateOpportunity(approvedOpportunity.ID, admin.ID, true, "approved"); err != nil {
		t.Fatalf("approve opportunity: %v", err)
	}
	if _, err := svc.ModerateOpportunity(rejectedOpportunity.ID, admin.ID, false, "reject"); err != nil {
		t.Fatalf("reject opportunity: %v", err)
	}
	if got := snapshotConnectMetric(t, MetricConnectOpportunityApprovedTotal); got != 1 {
		t.Fatalf("approved metric=%d want=1", got)
	}
	if got := snapshotConnectMetric(t, MetricConnectOpportunityRejectedTotal); got != 1 {
		t.Fatalf("rejected metric=%d want=1", got)
	}
}

func TestConnectServiceCreatorCanManageApplicationsWithoutAdminRole(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	applicant := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Creator managed team",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	application := models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        applicant.ID,
		Status:        models.ConnectApplicationPending,
	}
	if err := db.Create(&application).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	items, err := svc.ListApplications(creator.ID, opportunity.ID, "")
	if err != nil {
		t.Fatalf("ListApplications error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("applications=%d want=1", len(items))
	}

	updated, err := svc.UpdateApplicationStatus(creator.ID, application.ID, models.ConnectApplicationStatusUpdateRequest{
		Status: models.ConnectApplicationApproved,
		Note:   "Creator approved this request",
	})
	if err != nil {
		t.Fatalf("UpdateApplicationStatus error: %v", err)
	}
	if updated.Status != models.ConnectApplicationApproved {
		t.Fatalf("status=%q want=%q", updated.Status, models.ConnectApplicationApproved)
	}
	detail, err := svc.GetOpportunity(creator.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if !detail.CanManageApplications {
		t.Fatalf("expected creator to have canManageApplications=true")
	}
}

func TestConnectServiceCoordinatorCanManageApplications(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	coordinator := createConnectUser(t, db, "Moscow")
	creator := createConnectUser(t, db, "Moscow")
	applicant := createConnectUser(t, db, "Moscow")

	community := models.ConnectCommunity{
		Name:               "Friendly team",
		City:               "Moscow",
		CommunityType:      models.ConnectCommunityTypeTeam,
		VerificationStatus: models.ConnectVerificationVerified,
		CoordinatorUserID:  &coordinator.ID,
	}
	if err := db.Create(&community).Error; err != nil {
		t.Fatalf("create community: %v", err)
	}
	opportunity := models.ConnectOpportunity{
		CommunityID:         &community.ID,
		CreatedByUserID:     creator.ID,
		Title:               "Community managed team",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	application := models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        applicant.ID,
		Status:        models.ConnectApplicationPending,
	}
	if err := db.Create(&application).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	_, err := svc.ListApplications(coordinator.ID, opportunity.ID, "")
	if err != nil {
		t.Fatalf("ListApplications error: %v", err)
	}
	updated, err := svc.UpdateApplicationStatus(coordinator.ID, application.ID, models.ConnectApplicationStatusUpdateRequest{
		Status: models.ConnectApplicationAttended,
		Note:   "Coordinator checked attendance",
	})
	if err != nil {
		t.Fatalf("UpdateApplicationStatus error: %v", err)
	}
	if updated.Status != models.ConnectApplicationAttended {
		t.Fatalf("status=%q want=%q", updated.Status, models.ConnectApplicationAttended)
	}
	detail, err := svc.GetOpportunity(coordinator.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if !detail.CanManageApplications {
		t.Fatalf("expected coordinator to have canManageApplications=true")
	}
}

func TestConnectServiceRegularUserCannotManageApplications(t *testing.T) {
	db := setupConnectServiceIntegrationDB(t)
	creator := createConnectUser(t, db, "Moscow")
	outsider := createConnectUser(t, db, "Moscow")
	applicant := createConnectUser(t, db, "Moscow")

	opportunity := models.ConnectOpportunity{
		CreatedByUserID:     creator.ID,
		Title:               "Restricted management",
		Category:            "community",
		City:                "Moscow",
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		SourceType:          models.ConnectSourceNative,
	}
	if err := db.Create(&opportunity).Error; err != nil {
		t.Fatalf("create opportunity: %v", err)
	}
	application := models.ConnectApplication{
		OpportunityID: opportunity.ID,
		UserID:        applicant.ID,
		Status:        models.ConnectApplicationPending,
	}
	if err := db.Create(&application).Error; err != nil {
		t.Fatalf("create application: %v", err)
	}

	svc := NewConnectServiceWithDB(db)
	if _, err := svc.ListApplications(outsider.ID, opportunity.ID, ""); err != ErrConnectForbidden {
		t.Fatalf("err=%v want=%v", err, ErrConnectForbidden)
	}
	if _, err := svc.UpdateApplicationStatus(outsider.ID, application.ID, models.ConnectApplicationStatusUpdateRequest{
		Status: models.ConnectApplicationApproved,
	}); err != ErrConnectForbidden {
		t.Fatalf("err=%v want=%v", err, ErrConnectForbidden)
	}
	detail, err := svc.GetOpportunity(outsider.ID, opportunity.ID)
	if err != nil {
		t.Fatalf("GetOpportunity error: %v", err)
	}
	if detail.CanManageApplications {
		t.Fatalf("expected outsider canManageApplications=false")
	}
}
