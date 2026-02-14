package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"sync"
	"time"
)

// PolzaService handles requests to Polza.ai API (OpenAI-compatible)
// Unified API for 400+ models with smart routing
type PolzaService struct {
	baseURL        string
	apiKey         string
	fastModel      string
	reasoningModel string
	mutex          sync.RWMutex
}

var polzaServiceInstance *PolzaService
var polzaOnce sync.Once

// Default models for smart routing
const (
	DefaultPolzaFastModel      = "deepseek/deepseek-chat" // Fast, cheap
	DefaultPolzaReasoningModel = "deepseek/deepseek-r1"   // Reasoning
)

// Reasoning keywords (RU)
var polzaReasoningKeywordsRu = []string{
	"объясни", "почему", "докажи", "проанализируй", "сравни",
	"напиши код", "напиши функцию", "реализуй", "алгоритм",
	"философ", "этика", "логика", "математик",
	"как работает", "в чём разница", "подробно",
}

// Reasoning keywords (EN)
var polzaReasoningKeywordsEn = []string{
	"explain", "why", "prove", "analyze", "compare",
	"write code", "write function", "implement", "algorithm",
	"philosophy", "ethics", "logic", "math",
	"how does", "what is the difference", "detailed",
}

// GetPolzaService returns singleton instance
func GetPolzaService() *PolzaService {
	polzaOnce.Do(func() {
		polzaServiceInstance = NewPolzaService()
	})
	return polzaServiceInstance
}

// NewPolzaService creates a new Polza service instance
func NewPolzaService() *PolzaService {
	baseURL := os.Getenv("POLZA_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.polza.ai/api" // Correct URL per docs.polza.ai
	}
	if len(baseURL) > 0 && baseURL[len(baseURL)-1] == '/' {
		baseURL = baseURL[:len(baseURL)-1]
	}

	// Get API key from env or database
	apiKey := os.Getenv("POLZA_API_KEY")
	if apiKey == "" && database.DB != nil {
		var setting models.SystemSetting
		if err := database.DB.Where("key = ?", "POLZA_API_KEY").First(&setting).Error; err == nil {
			apiKey = setting.Value
		}
	}

	// Get models from database or use defaults
	fastModel := DefaultPolzaFastModel
	reasoningModel := DefaultPolzaReasoningModel

	if database.DB != nil {
		var fastSetting, reasoningSetting models.SystemSetting
		if err := database.DB.Where("key = ?", "POLZA_FAST_MODEL").First(&fastSetting).Error; err == nil && fastSetting.Value != "" {
			fastModel = fastSetting.Value
		}
		if err := database.DB.Where("key = ?", "POLZA_REASONING_MODEL").First(&reasoningSetting).Error; err == nil && reasoningSetting.Value != "" {
			reasoningModel = reasoningSetting.Value
		}
	}

	log.Printf("[PolzaService] Initialized: baseURL=%s, hasApiKey=%v, fast=%s, reasoning=%s",
		baseURL, apiKey != "", fastModel, reasoningModel)

	return &PolzaService{
		baseURL:        baseURL,
		apiKey:         apiKey,
		fastModel:      fastModel,
		reasoningModel: reasoningModel,
	}
}

// PolzaResponse represents the OpenAI-compatible API response
type PolzaResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

// PolzaModelsResponse for /v1/models endpoint
type PolzaModelsResponse struct {
	Object string `json:"object"`
	Data   []struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		OwnedBy string `json:"owned_by"`
	} `json:"data"`
}

// HasApiKey returns true if API key is configured
func (s *PolzaService) HasApiKey() bool {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.apiKey != ""
}

// GetApiKey returns the API key (for internal use)
func (s *PolzaService) GetApiKey() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.apiKey
}

// SetApiKey updates the API key
func (s *PolzaService) SetApiKey(key string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.apiKey = key
	log.Printf("[PolzaService] API key updated")
}

// GetFastModel returns the configured fast model
func (s *PolzaService) GetFastModel() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.fastModel
}

// GetReasoningModel returns the configured reasoning model
func (s *PolzaService) GetReasoningModel() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.reasoningModel
}

// GetBaseURL returns the configured base URL
func (s *PolzaService) GetBaseURL() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.baseURL
}

// GetModels returns current fast and reasoning models
func (s *PolzaService) GetModels() (fast, reasoning string) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.fastModel, s.reasoningModel
}

// SetModels updates the models
func (s *PolzaService) SetModels(fast, reasoning string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	if fast != "" {
		s.fastModel = fast
	}
	if reasoning != "" {
		s.reasoningModel = reasoning
	}
	log.Printf("[PolzaService] Models updated: fast=%s, reasoning=%s", s.fastModel, s.reasoningModel)
}

// ClassifyQuery determines if a query needs reasoning model
// Returns "fast" or "reasoning"
func (s *PolzaService) ClassifyQuery(messages []map[string]string) string {
	if len(messages) == 0 {
		return "fast"
	}

	// Get last user message
	var lastUserContent string
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i]["role"] == "user" {
			lastUserContent = strings.ToLower(messages[i]["content"])
			break
		}
	}

	if lastUserContent == "" {
		return "fast"
	}

	// Long messages likely need reasoning
	if len(lastUserContent) > 300 {
		return "reasoning"
	}

	// Check for reasoning keywords
	for _, kw := range polzaReasoningKeywordsRu {
		if strings.Contains(lastUserContent, kw) {
			return "reasoning"
		}
	}
	for _, kw := range polzaReasoningKeywordsEn {
		if strings.Contains(lastUserContent, kw) {
			return "reasoning"
		}
	}

	return "fast"
}

// SendMessage sends a message with smart routing
// If modelID is empty or "auto", it will use smart routing
func (s *PolzaService) SendMessage(modelID string, messages []map[string]string) (string, error) {
	s.mutex.RLock()
	apiKey := s.apiKey
	baseURL := s.baseURL
	fastModel := s.fastModel
	reasoningModel := s.reasoningModel
	s.mutex.RUnlock()

	if apiKey == "" {
		return "", fmt.Errorf("Polza API key not configured")
	}

	// Smart routing
	selectedModel := modelID
	if modelID == "" || modelID == "auto" {
		queryType := s.ClassifyQuery(messages)
		if queryType == "reasoning" {
			selectedModel = reasoningModel
		} else {
			selectedModel = fastModel
		}
		log.Printf("[Polza] Smart routing: type=%s, model=%s", queryType, selectedModel)
	}

	return s.makeRequest(baseURL, apiKey, selectedModel, messages)
}

// makeRequest performs the actual HTTP request to Polza API
func (s *PolzaService) makeRequest(baseURL, apiKey, modelID string, messages []map[string]string) (string, error) {
	startTime := time.Now()

	requestBody := map[string]interface{}{
		"model":    modelID,
		"messages": messages,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	url := fmt.Sprintf("%s/v1/chat/completions", baseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{
		Timeout: 120 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}

	duration := time.Since(startTime)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[Polza] Error (status %d, %v): %s", resp.StatusCode, duration, string(bodyBytes))
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var response PolzaResponse
	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API error: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 || response.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("empty response from Polza")
	}

	content := response.Choices[0].Message.Content
	log.Printf("[Polza] Success: model=%s, tokens=%d, duration=%v",
		response.Model, response.Usage.TotalTokens, duration)

	return content, nil
}

// ListModels fetches available models from Polza API
func (s *PolzaService) ListModels() ([]map[string]interface{}, error) {
	s.mutex.RLock()
	apiKey := s.apiKey
	baseURL := s.baseURL
	s.mutex.RUnlock()

	if apiKey == "" {
		return nil, fmt.Errorf("Polza API key not configured")
	}

	url := fmt.Sprintf("%s/v1/models", baseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read models response: %v", readErr)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to fetch models: status %d", resp.StatusCode)
	}

	var modelsResp PolzaModelsResponse
	if err := json.Unmarshal(bodyBytes, &modelsResp); err != nil {
		return nil, err
	}

	models := make([]map[string]interface{}, len(modelsResp.Data))
	for i, m := range modelsResp.Data {
		models[i] = map[string]interface{}{
			"id":       m.ID,
			"object":   m.Object,
			"created":  m.Created,
			"owned_by": m.OwnedBy,
		}
	}

	return models, nil
}

// TestConnection tests the connection to Polza API
func (s *PolzaService) TestConnection() (map[string]interface{}, error) {
	s.mutex.RLock()
	apiKey := s.apiKey
	baseURL := s.baseURL
	s.mutex.RUnlock()

	if apiKey == "" {
		return nil, fmt.Errorf("Polza API key not configured")
	}

	// Try to list models as a health check
	url := fmt.Sprintf("%s/v1/models", baseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connection failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("invalid API key")
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	return map[string]interface{}{
		"status":     "online",
		"hasApiKey":  true,
		"baseURL":    baseURL,
		"statusCode": resp.StatusCode,
	}, nil
}

// ReloadFromDB reloads settings from database
func (s *PolzaService) ReloadFromDB() {
	if database.DB == nil {
		return
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	var apiKeySetting models.SystemSetting
	if err := database.DB.Where("key = ?", "POLZA_API_KEY").First(&apiKeySetting).Error; err == nil {
		s.apiKey = apiKeySetting.Value
	}

	var fastSetting models.SystemSetting
	if err := database.DB.Where("key = ?", "POLZA_FAST_MODEL").First(&fastSetting).Error; err == nil && fastSetting.Value != "" {
		s.fastModel = fastSetting.Value
	}

	var reasoningSetting models.SystemSetting
	if err := database.DB.Where("key = ?", "POLZA_REASONING_MODEL").First(&reasoningSetting).Error; err == nil && reasoningSetting.Value != "" {
		s.reasoningModel = reasoningSetting.Value
	}

	log.Printf("[PolzaService] Reloaded from DB: hasApiKey=%v, fast=%s, reasoning=%s",
		s.apiKey != "", s.fastModel, s.reasoningModel)
}
