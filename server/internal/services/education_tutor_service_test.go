package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	educationTutorTestOnce sync.Once
	educationTutorTestDB   *gorm.DB
	educationTutorTestErr  error
)

func setupEducationTutorDB(t *testing.T) *gorm.DB {
	t.Helper()

	educationTutorTestOnce.Do(func() {
		dbHost := testEnvOrDefault("DB_HOST", "localhost")
		dbPort := testEnvOrDefault("DB_PORT", "5435")
		dbUser := testEnvOrDefault("DB_USER", "raguser")
		dbPassword := testEnvOrDefault("DB_PASSWORD", "ragpassword")
		dbName := testEnvOrDefault("DB_NAME", "ragdb")
		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)

		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			educationTutorTestErr = err
			return
		}
		sqlDB, err := db.DB()
		if err != nil {
			educationTutorTestErr = err
			return
		}
		if err := sqlDB.Ping(); err != nil {
			educationTutorTestErr = err
			return
		}
		database.DB = db
		if err := db.AutoMigrate(
			&models.User{},
			&models.SystemSetting{},
			&models.EducationCourse{},
			&models.EducationModule{},
			&models.AnswerOption{},
			&models.ExamQuestion{},
			&models.UserExamAttempt{},
			&models.UserModuleProgress{},
			&models.AssistantDocument{},
			&models.DomainSyncState{},
			&models.EducationWeakTopic{},
			&models.EducationTutorLatencyEvent{},
		); err != nil {
			educationTutorTestErr = err
			return
		}
		educationTutorTestDB = db
	})

	if educationTutorTestErr != nil {
		t.Skipf("skip education tutor tests: DB is not reachable (%v)", educationTutorTestErr)
	}
	cleanupEducationTutorRecords(t, educationTutorTestDB)
	return educationTutorTestDB
}

func cleanupEducationTutorRecords(t *testing.T, db *gorm.DB) {
	t.Helper()

	_ = db.Where("source_id LIKE ?", "test_tutor_%").Delete(&models.AssistantDocument{}).Error
	_ = db.Where("topic_key LIKE ?", "test_tutor_%").Delete(&models.EducationWeakTopic{}).Error
	_ = db.Where("title LIKE ?", "TEST_TUTOR_%").Delete(&models.EducationModule{}).Error
	_ = db.Where("title LIKE ?", "TEST_TUTOR_%").Delete(&models.EducationCourse{}).Error
}

func testEnvOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func setTutorEnabledFlagForServiceTest(t *testing.T, db *gorm.DB, enabled bool) {
	t.Helper()

	key := "EDU_TUTOR_ENABLED"
	var previous models.SystemSetting
	hadPrevious := db.Unscoped().Where("key = ?", key).First(&previous).Error == nil

	t.Cleanup(func() {
		if hadPrevious {
			restore := map[string]interface{}{
				"value":      previous.Value,
				"deleted_at": nil,
			}
			if previous.DeletedAt.Valid {
				restore["deleted_at"] = previous.DeletedAt.Time
			}
			_ = db.Unscoped().Model(&models.SystemSetting{}).Where("id = ?", previous.ID).Updates(restore).Error
			return
		}
		_ = db.Unscoped().Where("key = ?", key).Delete(&models.SystemSetting{}).Error
	})

	value := "false"
	if enabled {
		value = "true"
	}

	updated := db.Unscoped().Model(&models.SystemSetting{}).Where("key = ?", key).Updates(map[string]interface{}{
		"value":      value,
		"deleted_at": nil,
	})
	if updated.Error != nil {
		t.Fatalf("failed to update tutor enabled flag: %v", updated.Error)
	}
	if updated.RowsAffected == 0 {
		if err := db.Create(&models.SystemSetting{Key: key, Value: value}).Error; err != nil {
			t.Fatalf("failed to create tutor enabled flag: %v", err)
		}
	}
}

func TestParseExtractorPayload_JSONAndFence(t *testing.T) {
	raw := "```json\n{\"memories\":[{\"kind\":\"preference\",\"content\":\"short answers\",\"importance\":0.9}],\"weak_topics\":[{\"topic_key\":\"test_tutor_recursion\",\"topic_label\":\"Recursion\",\"severity\":0.8}]}\n```"
	payload, err := parseExtractorPayload(raw)
	if err != nil {
		t.Fatalf("expected parse success, got error: %v", err)
	}
	if len(payload.Memories) != 1 {
		t.Fatalf("expected one memory, got %d", len(payload.Memories))
	}
	if len(payload.WeakTopics) != 1 {
		t.Fatalf("expected one weak topic, got %d", len(payload.WeakTopics))
	}
}

func TestParseExtractorPayload_Invalid(t *testing.T) {
	_, err := parseExtractorPayload("not a json at all")
	if err == nil {
		t.Fatalf("expected parse error")
	}
}

func TestExtractJSONObject_IgnoresBracesInsideStrings(t *testing.T) {
	input := `prefix {"message":"text with {curly} braces","nested":{"ok":true}} suffix`
	got := extractJSONObject(input)
	want := `{"message":"text with {curly} braces","nested":{"ok":true}}`
	if got != want {
		t.Fatalf("unexpected extracted object: got %q want %q", got, want)
	}
}

func TestExtractJSONObject_HandlesEscapedQuotes(t *testing.T) {
	input := `note {"value":"escaped quote: \"hello\" and } char","n":1} tail`
	got := extractJSONObject(input)
	want := `{"value":"escaped quote: \"hello\" and } char","n":1}`
	if got != want {
		t.Fatalf("unexpected extracted object: got %q want %q", got, want)
	}
}

func TestEducationTutor_TurnDisabledByFlag(t *testing.T) {
	db := setupEducationTutorDB(t)
	svc := NewEducationTutorService(db)
	setTutorEnabledFlagForServiceTest(t, db, false)

	_, err := svc.Turn(context.Background(), TutorTurnRequest{
		UserID:  91000,
		Message: "test tutor disabled",
	})
	if err == nil {
		t.Fatalf("expected disabled error")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "disabled") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestEducationTutor_ExamMasteryUpdate(t *testing.T) {
	db := setupEducationTutorDB(t)
	svc := NewEducationTutorService(db)

	course := models.EducationCourse{
		Title:        "TEST_TUTOR_COURSE",
		Description:  "course for tutor tests",
		Organization: "TEST_ORG",
		IsPublished:  true,
	}
	if err := db.Create(&course).Error; err != nil {
		t.Fatalf("failed to create course: %v", err)
	}
	module := models.EducationModule{
		CourseID:    course.ID,
		Title:       "TEST_TUTOR_RECURSION",
		Description: "module for mastery formula",
		Order:       1,
	}
	if err := db.Create(&module).Error; err != nil {
		t.Fatalf("failed to create module: %v", err)
	}
	t.Cleanup(func() { cleanupEducationTutorRecords(t, db) })

	userID := uint(91001)
	if err := svc.UpsertExamSignal(userID, module.ID, 1, 4, false); err != nil {
		t.Fatalf("first exam signal failed: %v", err)
	}

	var weak models.EducationWeakTopic
	if err := db.Where("user_id = ? AND topic_key = ?", userID, normalizeTopicKey(module.Title)).First(&weak).Error; err != nil {
		t.Fatalf("weak topic not found after first signal: %v", err)
	}
	if weak.Mastery < 0.37 || weak.Mastery > 0.38 {
		t.Fatalf("unexpected first mastery: %.4f", weak.Mastery)
	}

	if err := svc.UpsertExamSignal(userID, module.ID, 4, 4, true); err != nil {
		t.Fatalf("second exam signal failed: %v", err)
	}
	if err := db.Where("user_id = ? AND topic_key = ?", userID, normalizeTopicKey(module.Title)).First(&weak).Error; err != nil {
		t.Fatalf("weak topic not found after second signal: %v", err)
	}
	if weak.Mastery < 0.59 || weak.Mastery > 0.60 {
		t.Fatalf("unexpected second mastery: %.4f", weak.Mastery)
	}
}

func TestEducationTutor_MemoryDedupUpsert(t *testing.T) {
	db := setupEducationTutorDB(t)
	svc := NewEducationTutorService(db)
	userID := uint(91002)
	t.Cleanup(func() { cleanupEducationTutorRecords(t, db) })

	payload := extractorPayload{
		Memories: []extractorMemory{
			{Kind: "preference", Content: "test_tutor_short_explanations", Importance: 0.8},
			{Kind: "preference", Content: "test_tutor_short_explanations", Importance: 0.9},
		},
	}
	if _, err := svc.storeExtractionSignals(context.Background(), userID, "ru", payload); err != nil {
		t.Fatalf("store extraction failed: %v", err)
	}

	var docs []models.AssistantDocument
	if err := db.Where("user_id = ? AND source_type = ? AND domain = ?", userID, "tutor_memory", "education").Find(&docs).Error; err != nil {
		t.Fatalf("query tutor memory docs failed: %v", err)
	}
	if len(docs) != 1 {
		t.Fatalf("expected one deduplicated tutor memory doc, got %d", len(docs))
	}
}

func TestEducationTutor_CleanupExpiredData(t *testing.T) {
	db := setupEducationTutorDB(t)
	svc := NewEducationTutorService(db)
	t.Cleanup(func() { cleanupEducationTutorRecords(t, db) })

	oldDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_memory",
		SourceID:        "test_tutor_old_memory_cleanup",
		Title:           "old memory",
		Content:         "old memory content",
		SourceURL:       "/education/tutor/memory/test_tutor_old_memory_cleanup",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          91010,
	}
	if err := db.Create(&oldDoc).Error; err != nil {
		t.Fatalf("failed to create old doc: %v", err)
	}
	if err := db.Model(&oldDoc).Update("updated_at", time.Now().UTC().AddDate(0, 0, -400)).Error; err != nil {
		t.Fatalf("failed to age old doc: %v", err)
	}

	recentDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_memory",
		SourceID:        "test_tutor_recent_memory_cleanup",
		Title:           "recent memory",
		Content:         "recent memory content",
		SourceURL:       "/education/tutor/memory/test_tutor_recent_memory_cleanup",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          91010,
	}
	if err := db.Create(&recentDoc).Error; err != nil {
		t.Fatalf("failed to create recent doc: %v", err)
	}

	oldWeak := models.EducationWeakTopic{
		UserID:       91010,
		TopicKey:     "test_tutor_old_weak_cleanup",
		TopicLabel:   "old weak",
		Mastery:      0.2,
		Source:       models.WeakTopicSourceLLM,
		LastSeenAt:   time.Now().UTC().AddDate(0, 0, -400),
		SignalsCount: 1,
	}
	if err := db.Create(&oldWeak).Error; err != nil {
		t.Fatalf("failed to create old weak topic: %v", err)
	}

	recentWeak := models.EducationWeakTopic{
		UserID:       91010,
		TopicKey:     "test_tutor_recent_weak_cleanup",
		TopicLabel:   "recent weak",
		Mastery:      0.4,
		Source:       models.WeakTopicSourceExam,
		LastSeenAt:   time.Now().UTC(),
		SignalsCount: 1,
	}
	if err := db.Create(&recentWeak).Error; err != nil {
		t.Fatalf("failed to create recent weak topic: %v", err)
	}

	if err := svc.CleanupExpiredData(context.Background()); err != nil {
		t.Fatalf("cleanup expired data failed: %v", err)
	}

	var oldDocCount int64
	if err := db.Model(&models.AssistantDocument{}).
		Where("source_id = ?", "test_tutor_old_memory_cleanup").
		Count(&oldDocCount).Error; err != nil {
		t.Fatalf("failed to query old doc count: %v", err)
	}
	if oldDocCount != 0 {
		t.Fatalf("expected old doc to be deleted")
	}

	var recentDocCount int64
	if err := db.Model(&models.AssistantDocument{}).
		Where("source_id = ?", "test_tutor_recent_memory_cleanup").
		Count(&recentDocCount).Error; err != nil {
		t.Fatalf("failed to query recent doc count: %v", err)
	}
	if recentDocCount == 0 {
		t.Fatalf("expected recent doc to remain")
	}

	var oldWeakCount int64
	if err := db.Model(&models.EducationWeakTopic{}).
		Where("topic_key = ?", "test_tutor_old_weak_cleanup").
		Count(&oldWeakCount).Error; err != nil {
		t.Fatalf("failed to query old weak topic count: %v", err)
	}
	if oldWeakCount != 0 {
		t.Fatalf("expected old weak topic to be deleted")
	}

	var recentWeakCount int64
	if err := db.Model(&models.EducationWeakTopic{}).
		Where("topic_key = ?", "test_tutor_recent_weak_cleanup").
		Count(&recentWeakCount).Error; err != nil {
		t.Fatalf("failed to query recent weak topic count: %v", err)
	}
	if recentWeakCount == 0 {
		t.Fatalf("expected recent weak topic to remain")
	}
}

func TestEducationTutor_GetLatencySummary(t *testing.T) {
	db := setupEducationTutorDB(t)
	svc := NewEducationTutorService(db)
	if err := db.Where("1 = 1").Delete(&models.EducationTutorLatencyEvent{}).Error; err != nil {
		t.Fatalf("failed to cleanup latency events before test: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Where("1 = 1").Delete(&models.EducationTutorLatencyEvent{}).Error
	})

	base := time.Now().UTC().Add(-2 * time.Hour)
	events := []models.EducationTutorLatencyEvent{
		{UserID: 92001, Kind: models.EduTutorLatencyKindTurn, LatencyMs: 300, SourcesCount: 2, Confidence: 0.8, CreatedAt: base},
		{UserID: 92001, Kind: models.EduTutorLatencyKindTurn, LatencyMs: 900, SourcesCount: 0, Confidence: 0.2, CreatedAt: base.Add(5 * time.Minute)},
		{UserID: 92001, Kind: models.EduTutorLatencyKindTurn, LatencyMs: 600, SourcesCount: 1, Confidence: 0.6, CreatedAt: base.Add(10 * time.Minute)},
		{UserID: 92001, Kind: models.EduTutorLatencyKindRetrieval, LatencyMs: 120, SourcesCount: 3, Confidence: 0.7, CreatedAt: base.Add(2 * time.Minute)},
		{UserID: 92001, Kind: models.EduTutorLatencyKindRetrieval, LatencyMs: 420, SourcesCount: 0, Confidence: 0.1, CreatedAt: base.Add(8 * time.Minute)},
	}
	if err := db.Create(&events).Error; err != nil {
		t.Fatalf("failed to seed latency events: %v", err)
	}
	summary, err := svc.GetLatencySummary(24 * time.Hour)
	if err != nil {
		t.Fatalf("GetLatencySummary failed: %v", err)
	}
	if summary.TurnCount != 3 {
		t.Fatalf("expected 3 turn events, got %d", summary.TurnCount)
	}
	if summary.RetrievalCount != 2 {
		t.Fatalf("expected 2 retrieval events, got %d", summary.RetrievalCount)
	}
	if summary.TurnLatencyP95 < 600 {
		t.Fatalf("unexpected turn p95: %d", summary.TurnLatencyP95)
	}
	if summary.RetrievalLatencyP95 < 120 {
		t.Fatalf("unexpected retrieval p95: %d", summary.RetrievalLatencyP95)
	}
	if summary.NoDataTurns < 1 {
		t.Fatalf("expected at least one no-data turn")
	}
}

func TestEducationTutor_TurnAndIsolationAndClear(t *testing.T) {
	db := setupEducationTutorDB(t)
	svc := NewEducationTutorService(db)
	setTutorEnabledFlagForServiceTest(t, db, true)
	t.Cleanup(func() { cleanupEducationTutorRecords(t, db) })

	publicDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "module",
		SourceID:        "test_tutor_public_module",
		Title:           "TEST_TUTOR_PUBLIC_MODULE",
		Content:         "test tutor public topic recursion basics",
		SourceURL:       "/education/courses/1#module-1",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopePublic,
		UserID:          0,
	}
	if err := db.Create(&publicDoc).Error; err != nil {
		t.Fatalf("failed to create public doc: %v", err)
	}

	ownerID := uint(91003)
	otherID := uint(91004)
	privateDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_memory",
		SourceID:        "test_tutor_private_memory",
		Title:           "TEST_TUTOR_PRIVATE",
		Content:         "test tutor private preference concise answer",
		SourceURL:       "/education/tutor/memory/test_tutor_private_memory",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          ownerID,
	}
	if err := db.Create(&privateDoc).Error; err != nil {
		t.Fatalf("failed to create private doc: %v", err)
	}

	ownerResp, err := svc.Turn(context.Background(), TutorTurnRequest{
		UserID:  ownerID,
		Message: "test tutor public topic recursion",
		TopK:    6,
	})
	if err != nil {
		t.Fatalf("owner turn failed: %v", err)
	}
	if len(ownerResp.AssistantContext.Sources) == 0 {
		t.Fatalf("expected owner to receive sources")
	}

	otherResp, err := svc.Turn(context.Background(), TutorTurnRequest{
		UserID:  otherID,
		Message: "test tutor private preference",
		TopK:    6,
	})
	if err != nil {
		t.Fatalf("other user turn failed: %v", err)
	}
	for _, src := range otherResp.AssistantContext.Sources {
		if src.SourceID == privateDoc.SourceID {
			t.Fatalf("private source leaked to other user")
		}
	}

	// Seed weak topic to validate clear memory behavior.
	weak := models.EducationWeakTopic{
		UserID:       ownerID,
		TopicKey:     "test_tutor_topic_clear",
		TopicLabel:   "TEST_TUTOR_TOPIC_CLEAR",
		Mastery:      0.31,
		Source:       models.WeakTopicSourceLLM,
		LastSeenAt:   time.Now().UTC(),
		SignalsCount: 1,
	}
	if err := db.Create(&weak).Error; err != nil {
		t.Fatalf("failed to seed weak topic: %v", err)
	}
	weakDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_weak_topic",
		SourceID:        "test_tutor_topic_clear",
		Title:           "TEST_TUTOR_TOPIC_CLEAR",
		Content:         "weak topic seed",
		SourceURL:       "/education/tutor/weak-topics/test_tutor_topic_clear",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          ownerID,
	}
	if err := db.Create(&weakDoc).Error; err != nil {
		t.Fatalf("failed to seed weak topic doc: %v", err)
	}

	clearResult, err := svc.ClearMemory(ownerID, "all")
	if err != nil {
		t.Fatalf("clear memory failed: %v", err)
	}
	if clearResult.MemoryDocs == 0 {
		t.Fatalf("expected memory docs to be deleted")
	}
	if clearResult.WeakTopics == 0 {
		t.Fatalf("expected weak topics to be deleted")
	}
}
