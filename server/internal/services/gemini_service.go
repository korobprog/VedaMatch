package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// GeminiService handles requests to Gemini API with key rotation and fallback
type GeminiService struct {
	baseURL      string
	keys         []string
	currentIndex int
	mutex        sync.RWMutex
}

var geminiServiceInstance *GeminiService
var geminiOnce sync.Once

// GetGeminiService returns singleton instance of GeminiService
func GetGeminiService() *GeminiService {
	geminiOnce.Do(func() {
		geminiServiceInstance = NewGeminiService()
	})
	return geminiServiceInstance
}

// NewGeminiService creates a new GeminiService with keys from environment
func NewGeminiService() *GeminiService {
	baseURL := os.Getenv("GEMINI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}
	if len(baseURL) > 0 && baseURL[len(baseURL)-1] == '/' {
		baseURL = baseURL[:len(baseURL)-1]
	}

	keys := []string{}

	// Load all available keys
	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		keys = append(keys, key)
	}
	if key := os.Getenv("GEMINI_API_KEY_BACKUP_1"); key != "" {
		keys = append(keys, key)
	}
	if key := os.Getenv("GEMINI_API_KEY_BACKUP_2"); key != "" {
		keys = append(keys, key)
	}
	if key := os.Getenv("GEMINI_API_KEY_BACKUP_3"); key != "" {
		keys = append(keys, key)
	}
	if key := os.Getenv("GEMINI_API_KEY_BACKUP_4"); key != "" {
		keys = append(keys, key)
	}

	log.Printf("[GeminiService] Initialized with %d keys, base URL: %s", len(keys), baseURL)

	return &GeminiService{
		baseURL:      baseURL,
		keys:         keys,
		currentIndex: 0,
	}
}

// HasKeys returns true if there are any Gemini keys available OR if we are using a proxy (which might manage keys)
func (s *GeminiService) HasKeys() bool {
	// If we have a custom Base URL (proxy), assume it handles keys if we don't have any locally
	if len(s.keys) == 0 && s.baseURL != "https://generativelanguage.googleapis.com" {
		return true
	}
	return len(s.keys) > 0
}

// getCurrentKey returns current API key
func (s *GeminiService) getCurrentKey() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	if len(s.keys) == 0 {
		return "" // Return empty string, proxy might handle it
	}
	return s.keys[s.currentIndex]
}

// rotateKey moves to next available key
func (s *GeminiService) rotateKey() bool {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if len(s.keys) == 0 {
		return false // Cannot rotate if no keys
	}

	if s.currentIndex < len(s.keys)-1 {
		s.currentIndex++
		log.Printf("[GeminiService] Rotated to key index %d", s.currentIndex)
		return true
	}
	return false
}

// resetKeys resets key index back to start (call daily or on success with first key)
func (s *GeminiService) resetKeys() {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.currentIndex = 0
}

// GeminiMessage represents a message in Gemini format
type GeminiMessage struct {
	Role  string `json:"role"`
	Parts []Part `json:"parts"`
}

// Part represents content part
type Part struct {
	Text string `json:"text"`
}

// GeminiRequest is the request format for Gemini API
type GeminiRequest struct {
	Contents         []GeminiMessage   `json:"contents"`
	GenerationConfig *GenerationConfig `json:"generationConfig,omitempty"`
}

// GenerationConfig holds generation parameters
type GenerationConfig struct {
	Temperature     float64 `json:"temperature,omitempty"`
	MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
}

// GeminiResponse is the response format from Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

// SendMessage sends a message to Gemini API with automatic key rotation
// Returns response content, used model, and error
func (s *GeminiService) SendMessage(modelID string, messages []map[string]string) (string, error) {
	// If no keys locally, but we returned true in HasKeys (due to proxy), try once with empty key
	if len(s.keys) == 0 {
		return s.sendMessageInternal(modelID, messages)
	}

	// Normal rotation logic with local keys
	// Models to try in order (fallback between models)
	modelsToTry := []string{modelID}
	switch modelID {
	case "gemini-2.5-flash":
		modelsToTry = append(modelsToTry, "gemini-2.5-flash-lite")
	case "gemini-2.5-flash-lite":
		modelsToTry = append(modelsToTry, "gemini-2.5-flash")
	}

	// Try each model with each key
	for _, currentModel := range modelsToTry {
		content, err := s.sendMessageInternal(currentModel, messages) // Use rotation inside
		if err == nil {
			return content, nil
		}
	}

	return "", fmt.Errorf("all Gemini models and keys exhausted")
}

func (s *GeminiService) sendMessageInternal(modelID string, messages []map[string]string) (string, error) {
	// Convert OpenAI-style messages to Gemini format
	geminiMessages := []GeminiMessage{}
	for _, msg := range messages {
		role := msg["role"]
		// Gemini uses "user" and "model" roles, not "assistant"
		if role == "assistant" {
			role = "model"
		}
		if role == "system" {
			// Prepend system message to first user message or add as user
			role = "user"
		}

		geminiMessages = append(geminiMessages, GeminiMessage{
			Role: role,
			Parts: []Part{
				{Text: msg["content"]},
			},
		})
	}

	reqBody := GeminiRequest{
		Contents: geminiMessages,
		GenerationConfig: &GenerationConfig{
			Temperature:     0.7,
			MaxOutputTokens: 2048,
		},
	}

	// If using proxy with no local keys, just make one request
	if len(s.keys) == 0 {
		content, err := s.makeRequest(modelID, "", reqBody)
		if err == nil {
			return content, nil
		}
		return "", err
	}

	// Rotation logic
	startIndex := s.currentIndex
	attempts := 0
	maxAttempts := len(s.keys)

	for attempts < maxAttempts {
		key := s.getCurrentKey()
		if key == "" {
			break
		}

		content, err := s.makeRequest(modelID, key, reqBody)
		if err == nil {
			log.Printf("[GeminiService] Success with model %s, key index %d", modelID, s.currentIndex)
			return content, nil
		}

		log.Printf("[GeminiService] Model %s, key %d failed: %v", modelID, s.currentIndex, err)

		// Check if we should rotate key
		if !s.rotateKey() {
			// No more keys for this model - try next model
			s.mutex.Lock()
			s.currentIndex = startIndex // Reset for next model
			s.mutex.Unlock()
			break
		}
		attempts++
	}

	return "", fmt.Errorf("exhausted keys for model %s", modelID)
}

// makeRequest performs the actual HTTP request to Gemini API
func (s *GeminiService) makeRequest(modelID, apiKey string, reqBody GeminiRequest) (string, error) {
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	// Build URL: {baseURL}/v1beta/models/{model}:generateContent
	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent", s.baseURL, modelID)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-goog-api-key", apiKey)

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

	// Check for rate limiting or quota errors
	if resp.StatusCode == 429 || resp.StatusCode == 503 {
		return "", fmt.Errorf("rate limited or quota exceeded (status %d)", resp.StatusCode)
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("empty response from Gemini")
}

// ConvertToOpenAIFormat converts Gemini response to OpenAI-compatible format
func ConvertToOpenAIFormat(content, model string) map[string]interface{} {
	return map[string]interface{}{
		"id":      "gemini-" + fmt.Sprintf("%d", time.Now().UnixNano()),
		"object":  "chat.completion",
		"created": time.Now().Unix(),
		"model":   model,
		"choices": []map[string]interface{}{
			{
				"index": 0,
				"message": map[string]string{
					"role":    "assistant",
					"content": content,
				},
				"finish_reason": "stop",
			},
		},
	}
}
