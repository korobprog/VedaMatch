package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
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

	for _, m := range apiResp.Data {
		var existing models.AiModel
		result := database.DB.Where("model_id = ?", m.ID).First(&existing)

		if result.Error != nil {
			// New model
			newModel := models.AiModel{
				ModelID:      m.ID,
				Name:         m.ID, // Or derive name if possible
				Provider:     m.Provider,
				Category:     m.Category,
				IsEnabled:    false, // Disabled by default until admin reviews? Or enabled? User said "add/remove", maybe disabled by default if new.
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

	return c.JSON(fiber.Map{
		"message":       "Synchronization complete",
		"newModels":     newCount,
		"updatedModels": updatedCount,
		"syncDate":      now,
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
		IsEnabled     *bool  `json:"isEnabled"`
		Name          string `json:"name"`
		IsNew         *bool  `json:"isNew"`
		IsRecommended *bool  `json:"isRecommended"`
		IsRagEnabled  *bool  `json:"isRagEnabled"`
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

// TestModel tests model response speed and status
func (h *AiHandler) TestModel(c *fiber.Ctx) error {
	id := c.Params("id")
	var aiModel models.AiModel
	if err := database.DB.First(&aiModel, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Model not found"})
	}

	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "API_OPEN_AI key not set"})
	}

	// Prepare a simple chat completion request
	testURL := "https://rvlautoai.ru/webhook/v1/chat/completions"
	testBody := map[string]interface{}{
		"model":    aiModel.ModelID,
		"provider": aiModel.Provider,
		"messages": []map[string]string{
			{"role": "user", "content": "hi"},
		},
		"max_tokens": 5,
	}

	jsonBody, _ := json.Marshal(testBody)
	req, _ := http.NewRequest("POST", testURL, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	start := time.Now()
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	duration := time.Since(start).Milliseconds()

	status := "online"
	if err != nil {
		log.Printf("Test error for model %s: %v", aiModel.ModelID, err)
		status = "offline"
	} else if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("Test failed with status %d for model %s: %s", resp.StatusCode, aiModel.ModelID, string(respBody))
		status = "error"
		resp.Body.Close()
	} else {
		resp.Body.Close()
	}

	aiModel.LastTestStatus = status
	aiModel.LastResponseTime = duration
	database.DB.Save(&aiModel)

	return c.JSON(fiber.Map{
		"status":       status,
		"responseTime": duration,
		"model":        aiModel,
	})
}

// BulkTestModels tests all enabled models in parallel
func (h *AiHandler) BulkTestModels(c *fiber.Ctx) error {
	var aiModels []models.AiModel
	if err := database.DB.Where("is_enabled = ?", true).Find(&aiModels).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch models"})
	}

	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "API_OPEN_AI key not set"})
	}

	type TestResult struct {
		ModelID      string `json:"modelId"`
		Status       string `json:"status"`
		ResponseTime int64  `json:"responseTime"`
	}

	results := make([]TestResult, 0, len(aiModels))
	testURL := "https://rvlautoai.ru/webhook/v1/chat/completions"

	for _, model := range aiModels {
		testBody := map[string]interface{}{
			"model":      model.ModelID,
			"provider":   model.Provider,
			"messages":   []map[string]string{{"role": "user", "content": "hi"}},
			"max_tokens": 5,
		}

		jsonBody, _ := json.Marshal(testBody)
		req, _ := http.NewRequest("POST", testURL, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)

		start := time.Now()
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		duration := time.Since(start).Milliseconds()

		status := "online"
		if err != nil {
			status = "offline"
		} else if resp.StatusCode != http.StatusOK {
			status = "error"
			resp.Body.Close()
		} else {
			resp.Body.Close()
		}

		model.LastTestStatus = status
		model.LastResponseTime = duration
		database.DB.Save(&model)

		results = append(results, TestResult{
			ModelID:      model.ModelID,
			Status:       status,
			ResponseTime: duration,
		})
	}

	return c.JSON(fiber.Map{
		"tested":  len(results),
		"results": results,
	})
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

// DisableOfflineModels disables all models that are offline or have errors
func (h *AiHandler) DisableOfflineModels(c *fiber.Ctx) error {
	result := database.DB.Model(&models.AiModel{}).
		Where("last_test_status IN ?", []string{"offline", "error"}).
		Update("is_enabled", false)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to disable offline models"})
	}

	return c.JSON(fiber.Map{
		"message":  "Offline models disabled",
		"disabled": result.RowsAffected,
	})
}
