package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AiHandler struct{}

func NewAiHandler() *AiHandler {
	return &AiHandler{}
}

type ExternalModel struct {
	ID       string `json:"id"`
	Provider string `json:"provider"`
	Category string `json:"category"`
	Created  int64  `json:"created"`
}

type ExternalModelsResponse struct {
	Data []ExternalModel `json:"data"`
}

// SyncModels syncs models from external API to local database
func (h *AiHandler) SyncModels(c *fiber.Ctx) error {
	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "API_OPEN_AI key not set"})
	}

	url := "https://rvlautoai.ru/webhook/v1/models"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create request"})
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to fetch models from API"})
	}
	defer resp.Body.Close()

	var apiResp ExternalModelsResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode API response"})
	}

	now := time.Now()
	newCount := 0
	updatedCount := 0

	// Track valid model IDs from API
	validModelIDs := make(map[string]bool)

	for _, m := range apiResp.Data {
		validModelIDs[m.ID] = true
		var existing models.AiModel
		result := database.DB.Where("model_id = ?", m.ID).First(&existing)

		if result.Error != nil {
			// New model
			newModel := models.AiModel{
				ModelID:      m.ID,
				Name:         m.ID, // Or derive name if possible
				Provider:     m.Provider,
				Category:     m.Category,
				IsEnabled:    false, // Default to disabled, admin will enable manually
				IsNew:        true,
				IsRagEnabled: false,
				LastSyncDate: now,
			}
			database.DB.Create(&newModel)
			newCount++
		} else {
			// Update existing
			existing.Provider = m.Provider
			existing.Category = m.Category
			existing.LastSyncDate = now
			database.DB.Save(&existing)
			updatedCount++
		}
	}

	// Disable models that are no longer in the API list
	var allModels []models.AiModel
	database.DB.Find(&allModels)

	disabledCount := 0
	for _, m := range allModels {
		if !validModelIDs[m.ModelID] && m.IsEnabled {
			m.IsEnabled = false
			m.LastTestStatus = "offline" // Mark as offline/missing
			database.DB.Save(&m)
			disabledCount++
			log.Printf("[Sync] Disabled outdated model: %s", m.ModelID)
		}
	}

	return c.JSON(fiber.Map{
		"message":        "Synchronization complete",
		"newModels":      newCount,
		"updatedModels":  updatedCount,
		"disabledModels": disabledCount,
		"syncDate":       now,
	})
}

// GetAdminModels returns all models for admin panel
func (h *AiHandler) GetAdminModels(c *fiber.Ctx) error {
	var aiModels []models.AiModel
	query := database.DB.Order("category asc, model_id asc")

	category := c.Query("category")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	search := c.Query("search")
	if search != "" {
		query = query.Where("model_id LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&aiModels).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch models"})
	}

	return c.JSON(aiModels)
}

// GetClientModels returns only enabled models for mobile client
func (h *AiHandler) GetClientModels(c *fiber.Ctx) error {
	var aiModels []models.AiModel
	if err := database.DB.Where("is_enabled = ?", true).Find(&aiModels).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch models"})
	}

	log.Printf("[AI] GetClientModels returning %d enabled models", len(aiModels))

	// Format to match OpenAI models list format for compatibility if needed
	// or just return the array
	return c.JSON(fiber.Map{
		"object": "list",
		"data":   aiModels,
	})
}

// UpdateModel updates model settings (isEnabled, name, etc.)
func (h *AiHandler) UpdateModel(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		IsEnabled            *bool  `json:"isEnabled"`
		Name                 string `json:"name"`
		IsNew                *bool  `json:"isNew"`
		IsRecommended        *bool  `json:"isRecommended"`
		IsRagEnabled         *bool  `json:"isRagEnabled"`
		LatencyTier          string `json:"latencyTier"`
		IntelligenceTier     string `json:"intelligenceTier"`
		IsAutoRoutingEnabled *bool  `json:"isAutoRoutingEnabled"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var aiModel models.AiModel
	if err := database.DB.First(&aiModel, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Model not found"})
	}

	if body.IsEnabled != nil {
		aiModel.IsEnabled = *body.IsEnabled
	}
	if body.Name != "" {
		aiModel.Name = body.Name
	}
	if body.IsNew != nil {
		aiModel.IsNew = *body.IsNew
	}
	if body.IsRecommended != nil {
		aiModel.IsRecommended = *body.IsRecommended
	}
	if body.IsRagEnabled != nil {
		aiModel.IsRagEnabled = *body.IsRagEnabled
	}
	if body.LatencyTier != "" {
		aiModel.LatencyTier = body.LatencyTier
	}
	if body.IntelligenceTier != "" {
		aiModel.IntelligenceTier = body.IntelligenceTier
	}
	if body.IsAutoRoutingEnabled != nil {
		aiModel.IsAutoRoutingEnabled = *body.IsAutoRoutingEnabled
	}

	if err := database.DB.Save(&aiModel).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update model"})
	}

	return c.JSON(aiModel)
}

// DeleteModel removes a model from database
func (h *AiHandler) DeleteModel(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := database.DB.Delete(&models.AiModel{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete model"})
	}
	return c.JSON(fiber.Map{"message": "Model deleted successfully"})
}

// TestModel tests model response speed and status via Service
func (h *AiHandler) TestModel(c *fiber.Ctx) error {
	id := c.Params("id")
	testService := services.GetModelTestingService()

	aiModel, status, duration, err := testService.TestSingleModel(id)

	if err != nil && status == "offline" && strings.Contains(err.Error(), "not found") {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Model not found"})
	}

	// We return the model even if test failed, but with updated status
	return c.JSON(fiber.Map{
		"status":       status,
		"responseTime": duration,
		"model":        aiModel,
	})
}

// BulkTestModels tests all enabled models in parallel via Service
func (h *AiHandler) BulkTestModels(c *fiber.Ctx) error {
	testService := services.GetModelTestingService()
	results, err := testService.RunBulkTest()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"tested":  len(results),
		"results": results,
	})
}

// AutoOptimizeModels runs tests and updates Auto Routing status based on performance
func (h *AiHandler) AutoOptimizeModels(c *fiber.Ctx) error {
	testService := services.GetModelTestingService()
	results, err := testService.RunOptimization()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	autoEnabledCount := 0
	for _, res := range results {
		var model models.AiModel
		if err := database.DB.Where("model_id = ?", res.ModelID).First(&model).Error; err == nil {
			if model.IsAutoRoutingEnabled {
				autoEnabledCount++
			}
		}
	}

	return c.JSON(fiber.Map{
		"message":            "Optimization complete",
		"tested":             len(results),
		"auto_magic_enabled": autoEnabledCount,
	})
}

// HandleSchedule configures the background check service and persists settings
func (h *AiHandler) HandleSchedule(c *fiber.Ctx) error {
	type ScheduleRequest struct {
		IntervalMinutes int  `json:"intervalMinutes"`
		Enabled         bool `json:"enabled"`
	}

	var req ScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	// Persist settings
	database.DB.Assign(models.SystemSetting{Value: fmt.Sprintf("%d", req.IntervalMinutes)}).FirstOrCreate(&models.SystemSetting{}, models.SystemSetting{Key: "scheduler_interval"})
	database.DB.Where(models.SystemSetting{Key: "scheduler_interval"}).Updates(models.SystemSetting{Value: fmt.Sprintf("%d", req.IntervalMinutes)})

	enabledStr := "false"
	if req.Enabled {
		enabledStr = "true"
	}
	database.DB.Assign(models.SystemSetting{Value: enabledStr}).FirstOrCreate(&models.SystemSetting{}, models.SystemSetting{Key: "scheduler_enabled"})
	database.DB.Where(models.SystemSetting{Key: "scheduler_enabled"}).Updates(models.SystemSetting{Value: enabledStr})

	if req.Enabled {
		task := func() {
			log.Println("[Scheduler] Running auto-optimization task")
			services.GetModelTestingService().RunOptimization()
		}
		services.GlobalScheduler.Start(req.IntervalMinutes, task)
	} else {
		services.GlobalScheduler.Stop()
	}

	return c.JSON(fiber.Map{"status": "updated", "running": services.GlobalScheduler.IsRunning()})
}

// GetRecommendedModels returns recommended models for the client
func (h *AiHandler) GetRecommendedModels(c *fiber.Ctx) error {
	var aiModels []models.AiModel
	if err := database.DB.Where("is_recommended = ? AND is_enabled = ?", true, true).Order("last_response_time asc").Find(&aiModels).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch models"})
	}

	return c.JSON(fiber.Map{
		"object": "list",
		"data":   aiModels,
	})
}

// DisableOfflineModels disables all models that are offline or have errors or have no status
func (h *AiHandler) DisableOfflineModels(c *fiber.Ctx) error {
	log.Println("[DisableOffline] Request received to disable offline models")

	// Debug: Count how many models match criteria (NOT online)
	var count int64
	if err := database.DB.Model(&models.AiModel{}).
		Where("last_test_status != ? OR last_test_status IS NULL", "online").
		Count(&count).Error; err != nil {
		log.Printf("[DisableOffline] Error counting models: %v", err)
	}
	log.Printf("[DisableOffline] Found %d models that are NOT online", count)

	result := database.DB.Model(&models.AiModel{}).
		Where("last_test_status != ? OR last_test_status IS NULL", "online").
		Update("is_enabled", false)

	if result.Error != nil {
		log.Printf("[DisableOffline] Error updating models: %v", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to disable offline models"})
	}

	log.Printf("[DisableOffline] Successfully disabled %d models", result.RowsAffected)

	return c.JSON(fiber.Map{
		"message":  "Offline models disabled",
		"disabled": result.RowsAffected,
	})
}

// RestoreScheduler checks the database for saved scheduler settings and restores the state
func (h *AiHandler) RestoreScheduler() {
	var enabledSetting models.SystemSetting
	if err := database.DB.Where("key = ?", "scheduler_enabled").First(&enabledSetting).Error; err != nil {
		log.Println("[Scheduler] No saved state found (or error), scheduler remains disabled")
		return
	}

	if enabledSetting.Value != "true" {
		log.Println("[Scheduler] Saved state is disabled")
		return
	}

	var intervalSetting models.SystemSetting
	intervalMinutes := 60 // Default
	if err := database.DB.Where("key = ?", "scheduler_interval").First(&intervalSetting).Error; err == nil {
		if val, err := strconv.Atoi(intervalSetting.Value); err == nil {
			intervalMinutes = val
		}
	}

	log.Printf("[Scheduler] Restoring state: Enabled, Interval=%d minutes", intervalMinutes)
	task := func() {
		log.Println("[Scheduler] Running auto-optimization task")
		services.GetModelTestingService().RunOptimization()
	}
	services.GlobalScheduler.Start(intervalMinutes, task)
}

// ToggleAutoRouting manually toggles the Auto-Magic status for a model
func (h *AiHandler) ToggleAutoRouting(c *fiber.Ctx) error {
	id := c.Params("id")
	var model models.AiModel

	if err := database.DB.Where("id = ?", id).First(&model).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Model not found"})
	}

	// Toggle status
	newStatus := !model.IsAutoRoutingEnabled
	model.IsAutoRoutingEnabled = newStatus

	if err := database.DB.Save(&model).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update model"})
	}

	return c.JSON(fiber.Map{
		"message":                 "Auto-Routing status updated",
		"id":                      model.ID,
		"is_auto_routing_enabled": newStatus,
	})
}
