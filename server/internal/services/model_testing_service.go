package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"sync"
	"time"
)

type TestResult struct {
	ModelID      string `json:"modelId"`
	Status       string `json:"status"`
	ResponseTime int64  `json:"responseTime"`
}

type ModelTestingService struct{}

var testServiceInstance *ModelTestingService

func GetModelTestingService() *ModelTestingService {
	if testServiceInstance == nil {
		testServiceInstance = &ModelTestingService{}
	}
	return testServiceInstance
}

// TestSingleModel runs a connectivity and latency test for a single model
func (s *ModelTestingService) TestSingleModel(modelID string) (models.AiModel, string, int64, error) {
	var aiModel models.AiModel
	var duration int64
	status := "offline"

	if err := database.DB.Where("model_id = ? OR id = ?", modelID, modelID).First(&aiModel).Error; err != nil {
		return aiModel, status, duration, err
	}

	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		return aiModel, status, duration, fmt.Errorf("API_OPEN_AI key not set")
	}

	// 1. Gemini / Google Handling
	if strings.HasPrefix(aiModel.ModelID, "gemini") || aiModel.Provider == "Google" {
		geminiService := GetGeminiService()
		if geminiService != nil && geminiService.HasKeys() {
			start := time.Now()
			messages := []map[string]string{
				{"role": "user", "content": "hi"},
			}
			_, err := geminiService.SendMessage(aiModel.ModelID, messages)
			duration = time.Since(start).Milliseconds()

			if err == nil {
				status = "online"
			} else {
				status = "error"
				log.Printf("[Test] Gemini error for %s: %v", aiModel.ModelID, err)
			}
			s.updateModelStatus(&aiModel, status, duration)
			return aiModel, status, duration, nil
		}
	}

	// 2. HTTP Request Test
	req, err := s.prepareTestRequest(aiModel, apiKey)
	if err != nil {
		s.updateModelStatus(&aiModel, "error", 0)
		return aiModel, "error", 0, err
	}

	start := time.Now()
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	duration = time.Since(start).Milliseconds()

	if err != nil {
		status = "offline"
		log.Printf("[Test] Connection error for %s: %v", aiModel.ModelID, err)
	} else if resp.StatusCode != http.StatusOK {
		status = "error"
		resp.Body.Close()
		log.Printf("[Test] HTTP error %d for %s", resp.StatusCode, aiModel.ModelID)
	} else {
		status = "online"
		resp.Body.Close()
	}

	s.updateModelStatus(&aiModel, status, duration)
	return aiModel, status, duration, nil
}

// RunBulkTest tests all enabled models concurrently
func (s *ModelTestingService) RunBulkTest() ([]TestResult, error) {
	var aiModels []models.AiModel
	if err := database.DB.Where("is_enabled = ?", true).Find(&aiModels).Error; err != nil {
		return nil, err
	}

	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		return nil, fmt.Errorf("API Key not set")
	}

	resultsChan := make(chan TestResult, len(aiModels))
	var wg sync.WaitGroup

	for _, m := range aiModels {
		wg.Add(1)
		go func(model models.AiModel) {
			defer wg.Done()
			_, status, duration, _ := s.TestSingleModel(model.ModelID)

			resultsChan <- TestResult{
				ModelID:      model.ModelID,
				Status:       status,
				ResponseTime: duration,
			}
		}(m)
	}

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	results := make([]TestResult, 0, len(aiModels))
	for res := range resultsChan {
		results = append(results, res)
	}
	return results, nil
}

// RunOptimization runs tests and auto-configures "Auto-Routing" based on performance
func (s *ModelTestingService) RunOptimization() ([]TestResult, error) {
	results, err := s.RunBulkTest()
	if err != nil {
		return nil, err
	}

	for _, res := range results {
		var model models.AiModel
		if err := database.DB.Where("model_id = ?", res.ModelID).First(&model).Error; err != nil {
			continue
		}

		shouldEnableAuto := false
		if res.Status == "online" {
			// Thresholds
			if (model.Category == "text" || model.Category == "llm" || model.Category == "chat") && res.ResponseTime < 30000 {
				shouldEnableAuto = true
			} else if (model.Category == "image" || model.Category == "diffusion") && res.ResponseTime < 60000 {
				shouldEnableAuto = true
			} else if (model.Category == "audio" || model.Category == "voice") && res.ResponseTime < 30000 {
				shouldEnableAuto = true
			}
		}

		if shouldEnableAuto != model.IsAutoRoutingEnabled {
			log.Printf("[Optimization] Updating %s: AutoRouting %v -> %v", model.ModelID, model.IsAutoRoutingEnabled, shouldEnableAuto)
			database.DB.Model(&model).Update("is_auto_routing_enabled", shouldEnableAuto)
		}
	}
	return results, nil
}

func (s *ModelTestingService) updateModelStatus(model *models.AiModel, status string, duration int64) {
	model.LastTestStatus = status
	model.LastResponseTime = duration
	database.DB.Save(model)
}

func (s *ModelTestingService) prepareTestRequest(aiModel models.AiModel, apiKey string) (*http.Request, error) {
	if aiModel.Provider == "PollinationsAI" {
		testURL := "https://image.pollinations.ai/prompt/test?width=16&height=16"
		req, err := http.NewRequest("GET", testURL, nil)
		if err == nil {
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
		}
		return req, err
	}

	// Standard aggregator
	testURL := "https://rvlautoai.ru/webhook/v1/chat/completions"
	var testBody map[string]interface{}

	if aiModel.Category == "image" {
		testBody = map[string]interface{}{
			"model":    aiModel.ModelID,
			"provider": aiModel.Provider,
			"messages": []map[string]string{{"role": "user", "content": "a small cat"}},
		}
	} else {
		testBody = map[string]interface{}{
			"model":      aiModel.ModelID,
			"provider":   aiModel.Provider,
			"messages":   []map[string]string{{"role": "user", "content": "hi"}},
			"max_tokens": 5,
		}
	}

	jsonBody, err := json.Marshal(testBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", testURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	return req, nil
}
