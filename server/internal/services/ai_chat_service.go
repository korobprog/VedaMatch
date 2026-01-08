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
	"time"
)

type AiChatService struct {
	apiURL string
}

func NewAiChatService() *AiChatService {
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://rvlautoai.ru/webhook/v1/chat/completions"
	}

	return &AiChatService{
		apiURL: apiURL,
	}
}

func (s *AiChatService) getApiKey(provider string) string {
	// If provider is Google/Gemini, try to use specific key first
	if provider == "Google" || provider == "Gemini" {
		var setting models.SystemSetting
		if err := database.DB.Where("key = ?", "LM_GEMINI").First(&setting).Error; err == nil && setting.Value != "" {
			return setting.Value
		}
		if err := database.DB.Where("key = ?", "GEMINI_API_KEY").First(&setting).Error; err == nil && setting.Value != "" {
			return setting.Value
		}
	}

	// Fallback to standard OpenAI key
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "API_OPEN_AI").First(&setting).Error; err == nil && setting.Value != "" {
		return setting.Value
	}
	key := os.Getenv("API_OPEN_AI")
	if key == "" {
		key = os.Getenv("GEMINI_API_KEY")
	}
	return key
}

func (s *AiChatService) getModel(defaultModel string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "DEFAULT_ASTRO_MODEL").First(&setting).Error; err == nil && setting.Value != "" {
		return setting.Value
	}
	return defaultModel
}

func (s *AiChatService) getProvider(modelID string) string {
	var model models.AiModel
	if err := database.DB.Where("model_id = ?", modelID).First(&model).Error; err == nil && model.Provider != "" {
		return model.Provider
	}
	// Default providers based on model patterns
	if len(modelID) >= 3 && modelID[:3] == "gpt" {
		return "OpenAI"
	}
	if len(modelID) >= 6 && modelID[:6] == "claude" {
		return "Anthropic"
	}
	if strings.Contains(strings.ToLower(modelID), "gemini") {
		return "Google"
	}
	if len(modelID) >= 5 && modelID[:5] == "sonar" {
		return "Perplexity"
	}
	return "OpenAI"
}

// getFallbackModels returns a list of enabled TEXT models excluding the failed one
func (s *AiChatService) getFallbackModels(failedModelID string) []models.AiModel {
	var models []models.AiModel
	// Fetch all enabled TEXT models except the one that just failed
	if err := database.DB.Where("is_enabled = ? AND model_id != ? AND category = ?", true, failedModelID, "text").Limit(3).Find(&models).Error; err != nil {
		log.Printf("[AiChatService] Failed to fetch fallback models: %v", err)
		return nil
	}
	return models
}

// makeRequest handles the actual API call logic
func (s *AiChatService) makeRequest(modelID string, messages []map[string]string) (string, error) {
	provider := s.getProvider(modelID)

	// Check if this is a Gemini model - use direct Gemini API to avoid content_type issues
	if strings.HasPrefix(modelID, "gemini") || provider == "Google" {
		geminiService := GetGeminiService()
		if geminiService.HasKeys() {
			log.Printf("[AiChatService] Using direct Gemini API for model: %s", modelID)
			content, err := geminiService.SendMessage(modelID, messages)
			if err == nil {
				return content, nil
			}
			log.Printf("[AiChatService] Direct Gemini API failed for %s: %v. Falling back to proxy.", modelID, err)
			// Continue to proxy fallback
		}
	}

	// Fix for provider specific model names if needed
	apiModelID := modelID
	if apiModelID == "gpt5" {
		apiModelID = "gpt4o"
	}

	// Ensure provider is not empty
	if provider == "" {
		provider = "OpenAI" // Default fallback
		log.Printf("[AiChatService] Warning: Provider was empty for model %s, using default: %s", modelID, provider)
	}

	apiKey := s.getApiKey(provider)
	if apiKey == "" {
		return "", fmt.Errorf("API Key not found for provider: %s", provider)
	}

	requestBody := map[string]interface{}{
		"model":        apiModelID,
		"messages":     messages,
		"provider":     provider,
		"content_type": "text", // Explicitly specify content type to avoid auto-detection as 'audio'
	}

	log.Printf("[AiChatService] Making request: model=%s, provider=%s, content_type=text", apiModelID, provider)

	jsonBody, _ := json.Marshal(requestBody)
	req, err := http.NewRequest("POST", s.apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{
		Timeout: 45 * time.Second, // Increased timeout for safety
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[AiChatService] Request failed for model %s: %v", modelID, err)
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		log.Printf("[AiChatService] Error from API (Model: %s): %s", modelID, string(bodyBytes))
		// Check for specific error codes like "credits_exhausted" if possible, but
		// for now any non-200 is a failure warranting fallback.
		return "", fmt.Errorf("status %d", resp.StatusCode)
	}

	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error interface{} `json:"error"`
	}

	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		return "", err
	}

	if len(response.Choices) > 0 {
		return response.Choices[0].Message.Content, nil
	}

	if response.Error != nil {
		errJSON, _ := json.Marshal(response.Error)
		return "", fmt.Errorf("API error: %s", string(errJSON))
	}

	return "", fmt.Errorf("empty response")
}

func (s *AiChatService) GenerateReply(room models.Room, lastMessages []models.Message) (string, error) {
	var messages []map[string]string

	// Add system prompt
	systemPrompt := fmt.Sprintf("You are an AI assistant in the chat room '%s'. %s. Be helpful and concise.", room.Name, room.Description)
	messages = append(messages, map[string]string{"role": "system", "content": systemPrompt})

	// Add context from last messages
	for _, m := range lastMessages {
		role := "user"
		messages = append(messages, map[string]string{
			"role":    role,
			"content": fmt.Sprintf("User %d: %s", m.SenderID, m.Content),
		})
	}

	// 1. Try Default Model
	// User requested Gemini-first for compatibility/astro logic
	defaultModelID := s.getModel("gemini-2.5-flash")
	log.Printf("[AiChatService] Attempting to generate reply with primary model: %s", defaultModelID)

	content, err := s.makeRequest(defaultModelID, messages)
	if err == nil {
		return content, nil
	}

	log.Printf("[AiChatService] Primary model %s failed: %v. Initiating fallback...", defaultModelID, err)

	// 2. Fallback Loop
	fallbacks := s.getFallbackModels(defaultModelID)
	for _, fbModel := range fallbacks {
		log.Printf("[AiChatService] Retrying with fallback model: %s (%s)", fbModel.ModelID, fbModel.Provider)
		content, err := s.makeRequest(fbModel.ModelID, messages)
		if err == nil {
			log.Printf("[AiChatService] Fallback successful with model: %s", fbModel.ModelID)
			return content, nil
		}
		log.Printf("[AiChatService] Fallback model %s failed: %v", fbModel.ModelID, err)
	}

	return "", fmt.Errorf("all AI models failed to generate a response")
}

func (s *AiChatService) GetSummary(roomName string, lastMessages []models.Message) (string, error) {
	// For summary we just try the default model once for now, or could use same logic.
	// Let's copy the logic to be safe.

	var conversation string
	for _, m := range lastMessages {
		conversation += fmt.Sprintf("User %d: %s\n", m.SenderID, m.Content)
	}

	prompt := fmt.Sprintf("Summarize the following conversation in the chat room '%s' in 2-3 sentences:\n\n%s", roomName, conversation)

	// Reuse GenerateSimpleResponse logic effectively by calling makeRequest loop
	return s.GenerateSimpleResponse(prompt)
}

func (s *AiChatService) GenerateSimpleResponse(prompt string) (string, error) {
	messages := []map[string]string{
		{"role": "user", "content": prompt},
	}

	// User requested Gemini-first (LM gemini)
	defaultModelID := s.getModel("gemini-2.5-flash")
	log.Printf("[AiChatService] Attempting simple response with primary model: %s", defaultModelID)

	content, err := s.makeRequest(defaultModelID, messages)
	if err == nil {
		return content, nil
	}

	log.Printf("[AiChatService] Primary model %s failed: %v. Initiating fallback...", defaultModelID, err)

	// 2. Fallback Loop
	fallbacks := s.getFallbackModels(defaultModelID)
	for _, fbModel := range fallbacks {
		log.Printf("[AiChatService] Retrying with fallback model: %s", fbModel.ModelID)
		content, err := s.makeRequest(fbModel.ModelID, messages)
		if err == nil {
			return content, nil
		}
	}

	return "", fmt.Errorf("all AI models failed")
}
