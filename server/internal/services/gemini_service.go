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
	// 1. First check environment variables
	if key := os.Getenv("LM_GEMINI"); key != "" {
		keys = append(keys, key)
	}
	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		keys = append(keys, key)
	}

	// 2. Then check database if connected
	if database.DB != nil {
		var settings []models.SystemSetting
		database.DB.Where("key IN ?", []string{"LM_GEMINI", "GEMINI_API_KEY"}).Find(&settings)
		for _, s := range settings {
			if s.Value != "" {
				// Avoid duplicates
				exists := false
				for _, k := range keys {
					if k == s.Value {
						exists = true
						break
					}
				}
				if !exists {
					// Prioritize LM_GEMINI by putting it first
					if s.Key == "LM_GEMINI" {
						keys = append([]string{s.Value}, keys...)
					} else {
						keys = append(keys, s.Value)
					}
				}
			}
		}
	}

	// 3. Backup keys
	backupEnvKeys := []string{
		os.Getenv("GEMINI_API_KEY_BACKUP_1"),
		os.Getenv("GEMINI_API_KEY_BACKUP_2"),
		os.Getenv("GEMINI_API_KEY_BACKUP_3"),
		os.Getenv("GEMINI_API_KEY_BACKUP_4"),
		os.Getenv("GEMINI_API_KEY_BACKUP_5"),
	}
	for _, k := range backupEnvKeys {
		if k != "" {
			keys = append(keys, k)
		}
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

// SendMessage sends a message to Gemini API with automatic key rotation and model fallback
// It tries models for the current key, and if unsuccessful due to key issues, rotates to the next key.
func (s *GeminiService) SendMessage(modelID string, messages []map[string]string) (string, error) {
	// Models to try in order (fallback between models)
	modelsToTry := []string{modelID}
	switch modelID {
	case "gemini-2.5-flash":
		modelsToTry = append(modelsToTry, "gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-pro")
	case "gemini-2.0-flash":
		modelsToTry = append(modelsToTry, "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest")
	case "gemini-flash-latest":
		modelsToTry = append(modelsToTry, "gemini-2.5-flash", "gemini-2.0-flash")
	}

	// Prepare request body
	geminiMessages := []GeminiMessage{}
	for _, msg := range messages {
		role := msg["role"]
		if role == "assistant" {
			role = "model"
		}
		if role == "system" {
			role = "user"
		}
		geminiMessages = append(geminiMessages, GeminiMessage{
			Role:  role,
			Parts: []Part{{Text: msg["content"]}},
		})
	}
	reqBody := GeminiRequest{
		Contents: geminiMessages,
		GenerationConfig: &GenerationConfig{
			Temperature:     0.7,
			MaxOutputTokens: 2048,
		},
	}

	// If no keys locally, just try one model with empty key (proxy might handle it)
	if len(s.keys) == 0 {
		for _, m := range modelsToTry {
			content, err := s.makeRequest(m, "", reqBody)
			if err == nil {
				return content, nil
			}
		}
		return "", fmt.Errorf("no keys and all models failed on proxy")
	}

	// Try each Key
	totalKeys := len(s.keys)
	startIndex := s.currentIndex

	for kIdx := 0; kIdx < totalKeys; kIdx++ {
		currentKey := s.getCurrentKey()

		// For this key, try all models
		var keyIssue bool

		for _, m := range modelsToTry {
			content, err := s.makeRequest(m, currentKey, reqBody)
			if err == nil {
				log.Printf("[GeminiService] Success with model %s, key index %d", m, s.currentIndex)
				return content, nil
			}

			// Parse error to see if we should change key or stay on this key
			if strings.Contains(err.Error(), "status 404") {
				// Model not found for this key/proxy, try next model on same key
				log.Printf("[GeminiService] Model %s not found (404) for key %d, checking next model", m, s.currentIndex)
				continue
			}

			if strings.Contains(err.Error(), "status 401") ||
				strings.Contains(err.Error(), "status 403") ||
				strings.Contains(err.Error(), "status 429") ||
				strings.Contains(err.Error(), "status 502") ||
				strings.Contains(err.Error(), "API Key not found") ||
				strings.Contains(err.Error(), "quota exceeded") ||
				strings.Contains(err.Error(), "checkpoint") { // 502 from proxy often contains these
				log.Printf("[GeminiService] Key issue detected (status %v) for key %d on model %s", err, s.currentIndex, m)
				keyIssue = true
				break // Stop trying models for this key
			}

			// For other errors, try next model anyway
			log.Printf("[GeminiService] Model %s failed for key %d: %v. Trying next model.", m, s.currentIndex, err)
		}

		if keyIssue || kIdx < totalKeys-1 {
			if !s.rotateKey() {
				// We reached the end of keys but didn't exhaust kIdx? Should not happen if totalKeys matches.
				break
			}
		} else {
			// We tried all models and it wasn't a specific key issue but all models failed
			break
		}
	}

	s.mutex.Lock()
	s.currentIndex = startIndex // Optional: don't reset to keep rotation state?
	// Actually better to NOT reset so we don't keep hitting 429 keys
	s.mutex.Unlock()

	return "", fmt.Errorf("all Gemini models and %d keys exhausted", totalKeys)
}

// makeRequest performs the actual HTTP request to Gemini API
func (s *GeminiService) makeRequest(modelID, apiKey string, reqBody GeminiRequest) (string, error) {
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	// Build URL: {baseURL}/v1beta/models/{model}:generateContent
	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent", s.baseURL, modelID)
	if apiKey != "" {
		if strings.Contains(url, "?") {
			url += "&key=" + apiKey
		} else {
			url += "?key=" + apiKey
		}
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	// Keep header for compatibility, but query param is usually more reliable for proxies
	if apiKey != "" {
		req.Header.Set("X-goog-api-key", apiKey)
	}

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
