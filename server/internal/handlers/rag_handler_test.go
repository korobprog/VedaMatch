package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	ragIntegrationOnce sync.Once
	ragIntegrationApp  *fiber.App
	ragIntegrationDB   *gorm.DB
	ragIntegrationErr  error
)

func setupRAGHandlerIntegration(t *testing.T) (*fiber.App, *gorm.DB) {
	t.Helper()

	ragIntegrationOnce.Do(func() {
		dbHost := getEnvOrDefault("DB_HOST", "localhost")
		dbPort := getEnvOrDefault("DB_PORT", "5435")
		dbUser := getEnvOrDefault("DB_USER", "raguser")
		dbPassword := getEnvOrDefault("DB_PASSWORD", "ragpassword")
		dbName := getEnvOrDefault("DB_NAME", "ragdb")
		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)

		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			ragIntegrationErr = err
			return
		}

		sqlDB, err := db.DB()
		if err != nil {
			ragIntegrationErr = err
			return
		}
		if err := sqlDB.Ping(); err != nil {
			ragIntegrationErr = err
			return
		}

		database.DB = db
		ragService := services.NewRAGPipelineService(db)
		handler := NewRAGHandler(ragService)

		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			if uid := strings.TrimSpace(c.Get("X-Test-User")); uid != "" {
				c.Locals("userID", uid)
			}
			return c.Next()
		})
		app.Get("/api/rag/domains", handler.GetDomains)
		app.Post("/api/rag/query-hybrid", handler.QueryHybrid)
		app.Get("/api/rag/sources/:id", handler.GetSource)

		ragIntegrationDB = db
		ragIntegrationApp = app
	})

	if ragIntegrationErr != nil {
		t.Skipf("skip RAG integration tests: DB is not reachable (%v)", ragIntegrationErr)
	}

	cleanupRAGTestRecords(t, ragIntegrationDB)
	return ragIntegrationApp, ragIntegrationDB
}

func cleanupRAGTestRecords(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.Where("source_id LIKE ?", "rag_test_%").Delete(&models.AssistantDocument{}).Error; err != nil {
		t.Fatalf("failed to cleanup assistant_documents: %v", err)
	}
	if err := db.Where("domain = ?", "rag_test").Delete(&models.DomainSyncState{}).Error; err != nil {
		t.Fatalf("failed to cleanup domain_sync_states: %v", err)
	}
}

func setTemporarySetting(t *testing.T, db *gorm.DB, key, value string) {
	t.Helper()

	var existing models.SystemSetting
	err := db.Where("key = ?", key).First(&existing).Error
	switch {
	case err == nil:
		oldValue := existing.Value
		if err := db.Model(&existing).Update("value", value).Error; err != nil {
			t.Fatalf("failed to update setting %s: %v", key, err)
		}
		t.Cleanup(func() {
			_ = db.Model(&existing).Update("value", oldValue).Error
		})
	case errors.Is(err, gorm.ErrRecordNotFound):
		setting := models.SystemSetting{Key: key, Value: value}
		if err := db.Create(&setting).Error; err != nil {
			t.Fatalf("failed to create setting %s: %v", key, err)
		}
		t.Cleanup(func() {
			_ = db.Unscoped().Delete(&models.SystemSetting{}, setting.ID).Error
		})
	default:
		t.Fatalf("failed to read setting %s: %v", key, err)
	}
}

func ensureDomainAllowedForTest(t *testing.T, db *gorm.DB, domain string) {
	t.Helper()

	var existing models.SystemSetting
	err := db.Where("key = ?", "RAG_ALLOWED_DOMAINS").First(&existing).Error
	switch {
	case err == nil:
		current := strings.TrimSpace(existing.Value)
		parts := map[string]struct{}{}
		for _, p := range strings.Split(current, ",") {
			n := strings.TrimSpace(p)
			if n != "" {
				parts[n] = struct{}{}
			}
		}
		parts[domain] = struct{}{}
		newValues := make([]string, 0, len(parts))
		for p := range parts {
			newValues = append(newValues, p)
		}
		setTemporarySetting(t, db, "RAG_ALLOWED_DOMAINS", strings.Join(newValues, ","))
	case errors.Is(err, gorm.ErrRecordNotFound):
		setTemporarySetting(t, db, "RAG_ALLOWED_DOMAINS", domain)
	default:
		t.Fatalf("failed to read RAG_ALLOWED_DOMAINS: %v", err)
	}
}

func testUniformEmbedding() models.Float64Array {
	out := make(models.Float64Array, 256)
	for i := range out {
		out[i] = 1.0
	}
	return out
}

func getEnvOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func TestRAGHandler_GetDomains(t *testing.T) {
	app, _ := setupRAGHandlerIntegration(t)

	req := httptest.NewRequest("GET", "/api/rag/domains", nil)
	req.Header.Set("X-Test-User", "1")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}

	var payload struct {
		Domains []services.DomainDescriptor `json:"domains"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Domains) == 0 {
		t.Fatalf("expected non-empty domains catalog")
	}

	hasMarket := false
	for _, d := range payload.Domains {
		if d.Name == "market" {
			hasMarket = true
			break
		}
	}
	if !hasMarket {
		t.Fatalf("expected market domain in catalog")
	}
}

func TestRAGHandler_QueryHybrid_ReturnsResults(t *testing.T) {
	app, db := setupRAGHandlerIntegration(t)
	ensureDomainAllowedForTest(t, db, "rag_test")

	doc := models.AssistantDocument{
		ID:              uuid.New(),
		Domain:          "rag_test",
		SourceType:      "test_item",
		SourceID:        "rag_test_1001",
		Title:           "Тестовый источник RAG",
		Content:         "тестовый контент про поиск и источники",
		SourceURL:       "/test/rag_test_1001",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopePublic,
		UserID:          0,
		Embedding:       testUniformEmbedding(),
	}
	if err := db.Create(&doc).Error; err != nil {
		t.Fatalf("failed to seed assistant document: %v", err)
	}
	t.Cleanup(func() { cleanupRAGTestRecords(t, db) })

	body := `{"query":"тестовый поиск","domains":["rag_test"],"topK":3}`
	req := httptest.NewRequest("POST", "/api/rag/query-hybrid", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "1")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}

	var payload services.HybridQueryResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Results) == 0 {
		t.Fatalf("expected at least one hybrid result")
	}
	if len(payload.AssistantContext.Sources) == 0 {
		t.Fatalf("expected non-empty assistant_context.sources")
	}
	if payload.AssistantContext.Sources[0].ID != doc.ID.String() {
		t.Fatalf("unexpected first source id: got=%s want=%s", payload.AssistantContext.Sources[0].ID, doc.ID.String())
	}
	if payload.RetrieverPath == "" {
		t.Fatalf("expected retriever_path to be set")
	}
}

func TestRAGHandler_GetSourceByID(t *testing.T) {
	app, db := setupRAGHandlerIntegration(t)

	doc := models.AssistantDocument{
		ID:              uuid.New(),
		Domain:          "rag_test",
		SourceType:      "test_item",
		SourceID:        "rag_test_2002",
		Title:           "Подробный источник",
		Content:         "Полный контент источника для цитирования.",
		SourceURL:       "/test/rag_test_2002",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopePublic,
		UserID:          0,
		Embedding:       testUniformEmbedding(),
	}
	if err := db.Create(&doc).Error; err != nil {
		t.Fatalf("failed to seed source: %v", err)
	}
	t.Cleanup(func() { cleanupRAGTestRecords(t, db) })

	req := httptest.NewRequest("GET", "/api/rag/sources/"+doc.ID.String(), nil)
	req.Header.Set("X-Test-User", "1")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusOK)
	}

	var payload models.AssistantDocument
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.ID != doc.ID {
		t.Fatalf("id mismatch: got=%s want=%s", payload.ID.String(), doc.ID.String())
	}
	if payload.Content != doc.Content {
		t.Fatalf("content mismatch: got=%q want=%q", payload.Content, doc.Content)
	}
}

func TestRAGHandler_QueryHybrid_PrivateScopeIsolation(t *testing.T) {
	app, db := setupRAGHandlerIntegration(t)
	ensureDomainAllowedForTest(t, db, "rag_test")

	privateDoc := models.AssistantDocument{
		ID:              uuid.New(),
		Domain:          "rag_test",
		SourceType:      "test_item",
		SourceID:        "rag_test_3003",
		Title:           "Private source",
		Content:         "private scope only data",
		SourceURL:       "/test/rag_test_3003",
		Language:        "ru",
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          42,
		Embedding:       testUniformEmbedding(),
	}
	if err := db.Create(&privateDoc).Error; err != nil {
		t.Fatalf("failed to seed private source: %v", err)
	}
	t.Cleanup(func() { cleanupRAGTestRecords(t, db) })

	body := `{"query":"private scope data","domains":["rag_test"],"topK":5,"includePrivate":true}`

	otherReq := httptest.NewRequest("POST", "/api/rag/query-hybrid", bytes.NewBufferString(body))
	otherReq.Header.Set("Content-Type", "application/json")
	otherReq.Header.Set("X-Test-User", "7")
	otherRes, err := app.Test(otherReq)
	if err != nil {
		t.Fatalf("app.Test error (other user): %v", err)
	}
	if otherRes.StatusCode != fiber.StatusOK {
		t.Fatalf("status (other user)=%d, want=%d", otherRes.StatusCode, fiber.StatusOK)
	}

	var otherPayload services.HybridQueryResponse
	if err := json.NewDecoder(otherRes.Body).Decode(&otherPayload); err != nil {
		t.Fatalf("decode other user response: %v", err)
	}
	for _, src := range otherPayload.AssistantContext.Sources {
		if src.ID == privateDoc.ID.String() {
			t.Fatalf("private source leaked to unauthorized user scope")
		}
	}

	ownerReq := httptest.NewRequest("POST", "/api/rag/query-hybrid", bytes.NewBufferString(body))
	ownerReq.Header.Set("Content-Type", "application/json")
	ownerReq.Header.Set("X-Test-User", "42")
	ownerRes, err := app.Test(ownerReq)
	if err != nil {
		t.Fatalf("app.Test error (owner): %v", err)
	}
	if ownerRes.StatusCode != fiber.StatusOK {
		t.Fatalf("status (owner)=%d, want=%d", ownerRes.StatusCode, fiber.StatusOK)
	}

	var ownerPayload services.HybridQueryResponse
	if err := json.NewDecoder(ownerRes.Body).Decode(&ownerPayload); err != nil {
		t.Fatalf("decode owner response: %v", err)
	}

	found := false
	for _, src := range ownerPayload.AssistantContext.Sources {
		if src.ID == privateDoc.ID.String() {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected owner to retrieve private source")
	}
}

func TestRAGHandler_QueryHybrid_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := &RAGHandler{}
	app.Post("/api/rag/query-hybrid", handler.QueryHybrid)

	req := httptest.NewRequest("POST", "/api/rag/query-hybrid", bytes.NewBufferString(`{"query":"news"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("status=%d, want=%d", res.StatusCode, fiber.StatusUnauthorized)
	}
}
