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

// OpenRouterService handles requests to OpenRouter via Cloudflare Worker proxy
// with smart routing between fast and reasoning models
type OpenRouterService struct {
	workerURL      string
	fastModel      string
	reasoningModel string
	mutex          sync.RWMutex
}

var openRouterServiceInstance *OpenRouterService
var openRouterOnce sync.Once

// Default models
const (
	DefaultFastModel      = "deepseek/deepseek-chat" // DeepSeek-V3
	DefaultReasoningModel = "deepseek/deepseek-r1"   // DeepSeek-R1
)

// Reasoning keywords (Russian + English)
var reasoningKeywordsRu = []string{
	"почему", "докажи", "выведи", "реши", "уравнение",
	"доказательство", "логика", "напиши код", "напиши функцию",
	"алгоритм", "пошагово", "разбери", "проанализируй",
	"step-by-step", "объясни подробно",
}

var reasoningKeywordsEn = []string{
	"why", "prove", "derive", "solve", "equation", "proof",
	"logic", "implement", "algorithm", "step by step",
	"explain in detail", "write code", "write function",
}

// Uncertainty keywords for safety-net
var uncertaintyKeywordsRu = []string{
	"я не уверен", "не могу точно", "сложно сказать",
	"требуется анализ", "нужно подумать",
}

var uncertaintyKeywordsEn = []string{
	"i'm not sure", "i cannot", "it's difficult to",
	"need to think", "let me think",
}

// GetOpenRouterService returns singleton instance
func GetOpenRouterService() *OpenRouterService {
	openRouterOnce.Do(func() {
		openRouterServiceInstance = NewOpenRouterService()
	})
	return openRouterServiceInstance
}

// NewOpenRouterService creates a new service instance
func NewOpenRouterService() *OpenRouterService {
	workerURL := os.Getenv("OPENROUTER_WORKER_URL")
	fastModel := os.Getenv("OPENROUTER_FAST_MODEL")
	reasoningModel := os.Getenv("OPENROUTER_REASONING_MODEL")

	// Try to get from database settings
	if database.DB != nil {
		var settings []models.SystemSetting
		database.DB.Where("key IN ?", []string{
			"OPENROUTER_WORKER_URL",
			"OPENROUTER_FAST_MODEL",
			"OPENROUTER_REASONING_MODEL",
		}).Find(&settings)

		for _, s := range settings {
			switch s.Key {
			case "OPENROUTER_WORKER_URL":
				if s.Value != "" {
					workerURL = s.Value
				}
			case "OPENROUTER_FAST_MODEL":
				if s.Value != "" {
					fastModel = s.Value
				}
			case "OPENROUTER_REASONING_MODEL":
				if s.Value != "" {
					reasoningModel = s.Value
				}
			}
		}
	}

	// Defaults
	if fastModel == "" {
		fastModel = DefaultFastModel
	}
	if reasoningModel == "" {
		reasoningModel = DefaultReasoningModel
	}

	log.Printf("[OpenRouterService] Initialized: workerURL=%s, fast=%s, reasoning=%s",
		workerURL, fastModel, reasoningModel)

	return &OpenRouterService{
		workerURL:      workerURL,
		fastModel:      fastModel,
		reasoningModel: reasoningModel,
	}
}

// OpenRouterResponse represents the API response
type OpenRouterResponse struct {
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
	} `json:"error,omitempty"`
}

// HasWorkerURL returns true if worker URL is configured
func (s *OpenRouterService) HasWorkerURL() bool {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.workerURL != ""
}

// GetWorkerURL returns the worker URL
func (s *OpenRouterService) GetWorkerURL() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.workerURL
}

// SetWorkerURL updates the worker URL
func (s *OpenRouterService) SetWorkerURL(url string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.workerURL = url
}

// GetModels returns current fast and reasoning models
func (s *OpenRouterService) GetModels() (fast, reasoning string) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.fastModel, s.reasoningModel
}

// SetModels updates the models
func (s *OpenRouterService) SetModels(fast, reasoning string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	if fast != "" {
		s.fastModel = fast
	}
	if reasoning != "" {
		s.reasoningModel = reasoning
	}
}

// containsAnyKeyword checks if text contains any of the keywords (case insensitive)
func containsAnyKeyword(text string, keywords []string) bool {
	lowerText := strings.ToLower(text)
	for _, kw := range keywords {
		if strings.Contains(lowerText, strings.ToLower(kw)) {
			return true
		}
	}
	return false
}

// ClassifyQuery determines if a query needs reasoning model
// Returns "fast" or "reasoning"
func (s *OpenRouterService) ClassifyQuery(messages []map[string]string) string {
	if len(messages) == 0 {
		return "fast"
	}

	// Get last user message
	var lastUserContent string
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i]["role"] == "user" {
			lastUserContent = messages[i]["content"]
			break
		}
	}

	if lastUserContent == "" {
		return "fast"
	}

	// Rule 1: Long query (> 300 chars)
	if len(lastUserContent) > 300 {
		log.Printf("[SmartRouter] Reasoning: long query (%d chars)", len(lastUserContent))
		return "reasoning"
	}

	// Rule 2: Multiple questions (2+ ?)
	if strings.Count(lastUserContent, "?") >= 2 {
		log.Printf("[SmartRouter] Reasoning: multiple questions")
		return "reasoning"
	}

	// Rule 3: Code blocks
	if strings.Contains(lastUserContent, "```") {
		log.Printf("[SmartRouter] Reasoning: code block detected")
		return "reasoning"
	}

	// Rule 4: Reasoning keywords (Russian)
	if containsAnyKeyword(lastUserContent, reasoningKeywordsRu) {
		log.Printf("[SmartRouter] Reasoning: keyword match (ru)")
		return "reasoning"
	}

	// Rule 5: Reasoning keywords (English)
	if containsAnyKeyword(lastUserContent, reasoningKeywordsEn) {
		log.Printf("[SmartRouter] Reasoning: keyword match (en)")
		return "reasoning"
	}

	return "fast"
}

// checkUncertainty checks if response indicates model uncertainty
func (s *OpenRouterService) checkUncertainty(response string) bool {
	if containsAnyKeyword(response, uncertaintyKeywordsRu) {
		return true
	}
	if containsAnyKeyword(response, uncertaintyKeywordsEn) {
		return true
	}
	return false
}

// SendMessage sends a message with smart routing
// If modelID is empty or "auto", it will use smart routing
func (s *OpenRouterService) SendMessage(modelID string, messages []map[string]string) (string, error) {
	s.mutex.RLock()
	workerURL := s.workerURL
	fastModel := s.fastModel
	reasoningModel := s.reasoningModel
	s.mutex.RUnlock()

	if workerURL == "" {
		return "", fmt.Errorf("OpenRouter worker URL not configured")
	}

	// Smart routing
	var selectedModel string
	var queryType string

	if modelID == "" || modelID == "auto" {
		queryType = s.ClassifyQuery(messages)
		if queryType == "reasoning" {
			selectedModel = reasoningModel
		} else {
			selectedModel = fastModel
		}
		log.Printf("[OpenRouter] Smart routing: type=%s, model=%s", queryType, selectedModel)
	} else {
		selectedModel = modelID
		queryType = "explicit"
	}

	// Make request
	content, err := s.makeRequest(workerURL, selectedModel, messages)
	if err != nil {
		return "", err
	}

	// Safety-net: if fast model returned uncertainty, retry with reasoning
	if queryType == "fast" && s.checkUncertainty(content) {
		log.Printf("[OpenRouter] Safety-net triggered, retrying with reasoning model")
		retryContent, retryErr := s.makeRequest(workerURL, reasoningModel, messages)
		if retryErr == nil {
			return retryContent, nil
		}
		log.Printf("[OpenRouter] Safety-net retry failed: %v", retryErr)
	}

	return content, nil
}

// makeRequest performs the actual HTTP request to worker proxy
func (s *OpenRouterService) makeRequest(workerURL, modelID string, messages []map[string]string) (string, error) {
	reqBody := map[string]interface{}{
		"model":    modelID,
		"messages": messages,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1/chat/completions", workerURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 120 * time.Second,
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	duration := time.Since(startTime)

	if resp.StatusCode != 200 {
		log.Printf("[OpenRouter] Error (status %d, %v): %s", resp.StatusCode, duration, string(bodyBytes))
		return "", fmt.Errorf("API error: status %d", resp.StatusCode)
	}

	var response OpenRouterResponse
	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API error: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("empty response from API")
	}

	content := response.Choices[0].Message.Content
	log.Printf("[OpenRouter] Success: model=%s, tokens=%d, duration=%v",
		modelID, response.Usage.TotalTokens, duration)

	return content, nil
}

// ListModels fetches available models from OpenRouter
func (s *OpenRouterService) ListModels() ([]map[string]interface{}, error) {
	s.mutex.RLock()
	workerURL := s.workerURL
	s.mutex.RUnlock()

	if workerURL == "" {
		return nil, fmt.Errorf("worker URL not configured")
	}

	url := fmt.Sprintf("%s/models", workerURL)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Data []map[string]interface{} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Data, nil
}

// GetWorkerStatus checks the health of the worker
func (s *OpenRouterService) GetWorkerStatus() (map[string]interface{}, error) {
	s.mutex.RLock()
	workerURL := s.workerURL
	s.mutex.RUnlock()

	if workerURL == "" {
		return nil, fmt.Errorf("worker URL not configured")
	}

	url := fmt.Sprintf("%s/health", workerURL)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result, nil
}
