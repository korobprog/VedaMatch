package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	educationTutorHandlerOnce sync.Once
	educationTutorHandlerApp  *fiber.App
	educationTutorHandlerDB   *gorm.DB
	educationTutorHandlerErr  error
)

func setupEducationTutorHandlerIntegration(t *testing.T) (*fiber.App, *gorm.DB) {
	t.Helper()

	educationTutorHandlerOnce.Do(func() {
		dbHost := getEnvOrDefault("DB_HOST", "localhost")
		dbPort := getEnvOrDefault("DB_PORT", "5435")
		dbUser := getEnvOrDefault("DB_USER", "raguser")
		dbPassword := getEnvOrDefault("DB_PASSWORD", "ragpassword")
		dbName := getEnvOrDefault("DB_NAME", "ragdb")
		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)

		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			educationTutorHandlerErr = err
			return
		}
		sqlDB, err := db.DB()
		if err != nil {
			educationTutorHandlerErr = err
			return
		}
		if err := sqlDB.Ping(); err != nil {
			educationTutorHandlerErr = err
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
			educationTutorHandlerErr = err
			return
		}
		handler := NewEducationTutorHandler(services.NewEducationTutorService(db))

		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			if uid := strings.TrimSpace(c.Get("X-Test-User")); uid != "" {
				c.Locals("userID", uid)
			}
			return c.Next()
		})
		app.Get("/api/education/tutor/status", handler.GetStatus)
		app.Post("/api/education/tutor/turn", handler.TutorTurn)
		app.Get("/api/education/tutor/weak-topics", handler.GetWeakTopics)
		app.Delete("/api/education/tutor/memory", handler.ClearMemory)

		educationTutorHandlerDB = db
		educationTutorHandlerApp = app
	})

	if educationTutorHandlerErr != nil {
		t.Skipf("skip education tutor handler integration tests: DB is not reachable (%v)", educationTutorHandlerErr)
	}
	cleanupEducationTutorHandlerRecords(t, educationTutorHandlerDB)
	return educationTutorHandlerApp, educationTutorHandlerDB
}

func cleanupEducationTutorHandlerRecords(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.Where("source_id LIKE ?", "test_tutor_handler_%").Delete(&models.AssistantDocument{}).Error; err != nil {
		t.Fatalf("failed to cleanup assistant docs: %v", err)
	}
	if err := db.Where("topic_key LIKE ?", "test_tutor_handler_%").Delete(&models.EducationWeakTopic{}).Error; err != nil {
		t.Fatalf("failed to cleanup weak topics: %v", err)
	}
}

func setTutorEnabledFlagForHandlerTest(t *testing.T, db *gorm.DB, enabled bool) {
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

func TestEducationTutorHandler_Status(t *testing.T) {
	app, _ := setupEducationTutorHandlerIntegration(t)

	req := httptest.NewRequest("GET", "/api/education/tutor/status", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("status request failed: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status code=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}

	var payload struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode status payload failed: %v", err)
	}
}

func TestEducationTutorHandler_DisabledFlag(t *testing.T) {
	app, db := setupEducationTutorHandlerIntegration(t)
	setTutorEnabledFlagForHandlerTest(t, db, false)

	statusReq := httptest.NewRequest("GET", "/api/education/tutor/status", nil)
	statusRes, err := app.Test(statusReq)
	if err != nil {
		t.Fatalf("status request failed: %v", err)
	}
	if statusRes.StatusCode != fiber.StatusOK {
		t.Fatalf("status status=%d, want=%d", statusRes.StatusCode, fiber.StatusOK)
	}
	var statusPayload struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(statusRes.Body).Decode(&statusPayload); err != nil {
		t.Fatalf("decode status payload failed: %v", err)
	}
	if statusPayload.Enabled {
		t.Fatalf("expected enabled=false when flag is off")
	}

	body := `{"message":"test tutor disabled","topK":5}`
	req := httptest.NewRequest("POST", "/api/education/tutor/turn", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "12050")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("turn request failed: %v", err)
	}
	if res.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusServiceUnavailable)
	}
}

func TestEducationTutorHandler_TurnAndWeakTopics(t *testing.T) {
	app, db := setupEducationTutorHandlerIntegration(t)
	setTutorEnabledFlagForHandlerTest(t, db, true)

	doc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "module",
		SourceID:        "test_tutor_handler_public_1",
		Title:           "TEST_TUTOR_HANDLER_PUBLIC",
		Content:         "test tutor handler public recursion",
		SourceURL:       "/education/courses/1#module-1",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopePublic,
		UserID:          0,
	}
	if err := db.Create(&doc).Error; err != nil {
		t.Fatalf("failed to seed public source: %v", err)
	}
	t.Cleanup(func() { cleanupEducationTutorHandlerRecords(t, db) })

	body := `{"message":"test tutor handler public recursion","topK":5}`
	req := httptest.NewRequest("POST", "/api/education/tutor/turn", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "12001")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}

	var payload struct {
		Reply            string                    `json:"reply"`
		AssistantContext services.AssistantContext `json:"assistant_context"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if strings.TrimSpace(payload.Reply) == "" {
		t.Fatalf("expected non-empty reply")
	}
	if len(payload.AssistantContext.Sources) == 0 {
		t.Fatalf("expected assistant context sources")
	}

	weakReq := httptest.NewRequest("GET", "/api/education/tutor/weak-topics", nil)
	weakReq.Header.Set("X-Test-User", "12001")
	weakRes, err := app.Test(weakReq)
	if err != nil {
		t.Fatalf("app.Test weak-topics error: %v", err)
	}
	if weakRes.StatusCode != fiber.StatusOK {
		t.Fatalf("weak-topics status=%d, want=%d", weakRes.StatusCode, fiber.StatusOK)
	}
}

func TestEducationTutorHandler_PrivateIsolationAndClear(t *testing.T) {
	app, db := setupEducationTutorHandlerIntegration(t)
	setTutorEnabledFlagForHandlerTest(t, db, true)
	t.Cleanup(func() { cleanupEducationTutorHandlerRecords(t, db) })

	privateDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_memory",
		SourceID:        "test_tutor_handler_private_memory",
		Title:           "TEST_TUTOR_HANDLER_PRIVATE",
		Content:         "test tutor handler private hint",
		SourceURL:       "/education/tutor/memory/test_tutor_handler_private_memory",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          12002,
	}
	if err := db.Create(&privateDoc).Error; err != nil {
		t.Fatalf("failed to seed private memory doc: %v", err)
	}

	otherBody := `{"message":"test tutor handler private hint","topK":5}`
	otherReq := httptest.NewRequest("POST", "/api/education/tutor/turn", bytes.NewBufferString(otherBody))
	otherReq.Header.Set("Content-Type", "application/json")
	otherReq.Header.Set("X-Test-User", "12003")
	otherRes, err := app.Test(otherReq)
	if err != nil {
		t.Fatalf("other user turn error: %v", err)
	}
	if otherRes.StatusCode != fiber.StatusOK {
		t.Fatalf("other user status=%d, want=%d", otherRes.StatusCode, fiber.StatusOK)
	}
	var otherPayload struct {
		AssistantContext services.AssistantContext `json:"assistant_context"`
	}
	if err := json.NewDecoder(otherRes.Body).Decode(&otherPayload); err != nil {
		t.Fatalf("decode other payload: %v", err)
	}
	for _, src := range otherPayload.AssistantContext.Sources {
		if src.SourceID == privateDoc.SourceID {
			t.Fatalf("private source leaked to unauthorized user")
		}
	}

	weakTopic := models.EducationWeakTopic{
		UserID:       12002,
		TopicKey:     "test_tutor_handler_weak_1",
		TopicLabel:   "TEST_TUTOR_HANDLER_WEAK",
		Mastery:      0.22,
		Source:       models.WeakTopicSourceLLM,
		LastSeenAt:   time.Now().UTC(),
		SignalsCount: 1,
	}
	if err := db.Create(&weakTopic).Error; err != nil {
		t.Fatalf("failed to seed weak topic: %v", err)
	}
	weakDoc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_weak_topic",
		SourceID:        "test_tutor_handler_weak_1",
		Title:           "TEST_TUTOR_HANDLER_WEAK",
		Content:         "weak topic doc",
		SourceURL:       "/education/tutor/weak-topics/test_tutor_handler_weak_1",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          12002,
	}
	if err := db.Create(&weakDoc).Error; err != nil {
		t.Fatalf("failed to seed weak topic doc: %v", err)
	}

	clearReq := httptest.NewRequest("DELETE", "/api/education/tutor/memory?scope=all", nil)
	clearReq.Header.Set("X-Test-User", "12002")
	clearRes, err := app.Test(clearReq)
	if err != nil {
		t.Fatalf("clear memory request failed: %v", err)
	}
	if clearRes.StatusCode != fiber.StatusOK {
		t.Fatalf("clear memory status=%d, want=%d", clearRes.StatusCode, fiber.StatusOK)
	}

	var clearPayload struct {
		Deleted struct {
			MemoryDocs    int64 `json:"memoryDocs"`
			WeakTopicDocs int64 `json:"weakTopicDocs"`
			WeakTopics    int64 `json:"weakTopics"`
		} `json:"deleted"`
	}
	if err := json.NewDecoder(clearRes.Body).Decode(&clearPayload); err != nil {
		t.Fatalf("decode clear payload failed: %v", err)
	}
	if clearPayload.Deleted.MemoryDocs == 0 {
		t.Fatalf("expected memoryDocs > 0")
	}
	if clearPayload.Deleted.WeakTopics == 0 {
		t.Fatalf("expected weakTopics > 0")
	}
}
