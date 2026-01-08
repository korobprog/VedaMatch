package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ChatHandler struct{}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{}
}

func (h *ChatHandler) HandleChat(c *fiber.Ctx) error {
	// Parse request body
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Initialize Services
	intentService := services.GetIntentService()
	imageService := services.GetImageProcessingService()
	routerService := services.GetSmartRouterService()

	// 0. Load personalized prompts based on user profile
	userID := c.Locals("userID")
	if userIDStr, ok := body["userId"].(string); ok && userID == nil {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			userID = uint(id)
		}
	}
	if userIDFloat, ok := body["userId"].(float64); ok && userID == nil {
		userID = uint(userIDFloat)
	}

	systemPrompt := loadUserSystemPrompt(userID)

	// 1. Analyze Intent
	// We extract messages to a typed slice for the service
	var messagesInterface []interface{}
	if msgs, ok := body["messages"].([]interface{}); ok {
		messagesInterface = msgs
	}

	// Prepend system prompt if available
	if systemPrompt != "" {
		messagesInterface = prependSystemMessage(messagesInterface, systemPrompt)
		body["messages"] = messagesInterface
		log.Printf("[Chat] Applied system prompt (%d chars) for user %v", len(systemPrompt), userID)
	} else {
		log.Printf("[Chat] No system prompt found for user %v (check if prompts exist and are active)", userID)
	}

	intentResult := intentService.DetectIntent(messagesInterface)
	targetCategory := intentResult.TargetCategory
	content := intentResult.Content
	isComplexTask := intentResult.IsComplexTask
	log.Printf("[Handler] Intent detected: Category=%s, Complex=%v", targetCategory, isComplexTask)

	// 2. Translation (if needed)
	apiKey := os.Getenv("API_OPEN_AI")
	if targetCategory == "image" && intentService.ContainsCyrillic(content) && apiKey != "" {
		log.Printf("[Translator] Russian image prompt detected: %s", content)
		translated, err := imageService.TranslatePromptToEnglish(content, apiKey)
		if err == nil {
			log.Printf("[Translator] Translated: %s", translated)
			// Update the last message in body with translated content
			if len(messagesInterface) > 0 {
				if lastMsg, ok := messagesInterface[len(messagesInterface)-1].(map[string]interface{}); ok {
					lastMsg["content"] = translated
					content = translated // Update local variable
				}
			}
		} else {
			log.Printf("[Translator] Translation failed: %v", err)
		}
	}

	// 3. Select Models
	var modelsToTry []models.AiModel
	intentLogPrefix := "[Manual]"

	if model, ok := body["model"].(string); ok && model == "auto" {
		intentLogPrefix = "[AutoMagic]"
		modelsToTry = routerService.SelectModels(targetCategory, isComplexTask)
		log.Printf("%s Strategy: Intent='%s', Complex=%v, Candidates=%d", intentLogPrefix, targetCategory, isComplexTask, len(modelsToTry))
	} else {
		// Manual mode: Try only the requested model
		mID, _ := body["model"].(string)
		prov, _ := body["provider"].(string)
		modelsToTry = append(modelsToTry, models.AiModel{ModelID: mID, Provider: prov})
	}

	// Validate API Key
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error: API_OPEN_AI missing",
		})
	}

	// =========================================================================
	// TRY GEMINI FIRST (for text requests)
	// =========================================================================
	if targetCategory == "text" {
		geminiService := services.GetGeminiService()
		if geminiService != nil && geminiService.HasKeys() {
			log.Printf("[Gemini] Attempting Gemini FIRST for text request")
			geminiMessages := convertMessagesForGemini(messagesInterface)
			defaultGModel := "gemini-2.5-flash"
			geminiContent, err := geminiService.SendMessage(defaultGModel, geminiMessages)
			if err == nil && geminiContent != "" {
				log.Printf("[Gemini] SUCCESS with %s", defaultGModel)
				response := services.ConvertToOpenAIFormat(geminiContent, defaultGModel)
				return c.JSON(response)
			}
			log.Printf("[Gemini] All Gemini attempts failed: %v", err)
		}
	}

	// Loop through candidates
	var lastErr error
	var lastRespBody []byte
	var lastStatusCode int

	for i, modelConf := range modelsToTry {
		// Update body for this attempt
		body["model"] = modelConf.ModelID
		body["content_type"] = "text" // Failsafe to avoid 'audio' detection on proxy
		if modelConf.Provider != "" {
			body["provider"] = modelConf.Provider
		} else {
			delete(body, "provider")
		}

		log.Printf("%s [Attempt %d/%d] Trying model: %s (Provider: %s)", intentLogPrefix, i+1, len(modelsToTry), modelConf.ModelID, modelConf.Provider)

		// 4a. Gemini Direct
		if strings.HasPrefix(modelConf.ModelID, "gemini") || modelConf.Provider == "Google" {
			geminiService := services.GetGeminiService()
			if geminiService.HasKeys() {
				geminiMessages := convertMessagesForGemini(messagesInterface)
				geminiContent, err := geminiService.SendMessage(modelConf.ModelID, geminiMessages)
				if err == nil {
					response := services.ConvertToOpenAIFormat(geminiContent, modelConf.ModelID)
					return c.JSON(response)
				}
				// GeminiService failed, log and skip to next model
				// Don't send Gemini models to external proxy (causes 'audio' content type error)
				log.Printf("[Gemini] Direct call failed for %s, skipping to next model", modelConf.ModelID)
			}
			continue // Skip external proxy for Gemini models
		}

		// 4b. Pollinations AI (Direct Image)
		if modelConf.Provider == "PollinationsAI" {
			// Extract prompt (already translated if applicable)
			prompt := content
			if prompt == "" {
				continue
			}

			pollinationsInfoURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?nologo=true", url.QueryEscape(prompt))
			markdownImage := fmt.Sprintf("![%s](%s)", prompt, pollinationsInfoURL)

			// Validate URL availability
			checkResp, err := http.Get(pollinationsInfoURL)
			if err == nil && checkResp.StatusCode == 200 {
				checkResp.Body.Close()
				log.Printf("[Pollinations] Success! Generated URL: %s", pollinationsInfoURL)

				// Create success response
				responseJSON := createOpenAIResponse(modelConf.ModelID, markdownImage)
				respBytes, _ := json.Marshal(responseJSON)

				lastStatusCode = 200
				lastRespBody = respBytes
				break
			}
			continue
		}

		// 4c. OpenAI Proxy (RVFreeLLM)
		respStatusCode, respBody, err := callOpenAIProxy(body, apiKey)
		if err != nil {
			log.Printf("Proxy error: %v", err)
			lastErr = err
			continue
		}

		lastStatusCode = respStatusCode
		lastRespBody = respBody

		// Validation Phase
		isValid := false
		if respStatusCode == 200 && len(respBody) > 10 {
			trimBody := strings.TrimSpace(string(respBody))
			if trimBody != "{}" && trimBody != "" {
				isValid = true
			}
		}

		if isValid {
			log.Printf("%s Success with %s", intentLogPrefix, modelConf.ModelID)

			// Process Images (Download/Proxy)
			var respData struct {
				Choices []struct {
					Message struct {
						Content string `json:"content"`
					} `json:"message"`
				} `json:"choices"`
			}
			if err := json.Unmarshal(respBody, &respData); err == nil && len(respData.Choices) > 0 {
				originalContent := respData.Choices[0].Message.Content
				newContent := imageService.ProcessAndCacheImages(originalContent)

				if newContent != originalContent {
					// Patch response
					log.Printf("[Proxy] Images processed and cached")
					var fullResp map[string]interface{}
					if err := json.Unmarshal(respBody, &fullResp); err == nil {
						if choices, ok := fullResp["choices"].([]interface{}); ok && len(choices) > 0 {
							if choice, ok := choices[0].(map[string]interface{}); ok {
								if message, ok := choice["message"].(map[string]interface{}); ok {
									message["content"] = newContent
									if patchedBody, err := json.Marshal(fullResp); err == nil {
										respBody = patchedBody
									}
								}
							}
						}
					}
				}
			}

			c.Status(respStatusCode)
			c.Set("Content-Type", "application/json")
			return c.Send(respBody)
		}
	}

	// 5. All Failed
	// Suppress unused variable warnings
	_ = lastErr
	_ = lastRespBody
	_ = lastStatusCode
	log.Printf("%s All attempts failed.", intentLogPrefix)

	// Failsafe: Pollinations
	if targetCategory == "image" {
		log.Printf("[HandleChat] Failsafe: Attempting PollinationsAI...")
		prompt := content
		pollinationsURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?nologo=true", url.QueryEscape(prompt))
		rawMarkdown := fmt.Sprintf("![%s](%s)", prompt, pollinationsURL)

		processedBody := imageService.ProcessAndCacheImages(rawMarkdown)

		responseJSON := createOpenAIResponse("pollinations-fallback", processedBody)
		return c.JSON(responseJSON)
	}

	// Return user-friendly error instead of cryptic proxy errors
	return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
		"error": "Все AI модели временно недоступны. Пожалуйста, попробуйте позже.",
		"choices": []map[string]interface{}{
			{
				"index": 0,
				"message": map[string]string{
					"role":    "assistant",
					"content": "Извините, все AI сервисы временно недоступны. Пожалуйста, попробуйте позже. 🙏",
				},
				"finish_reason": "error",
			},
		},
	})
}

// Helper to call OpenAI Proxy
func callOpenAIProxy(body map[string]interface{}, apiKey string) (int, []byte, error) {
	externalURL := "https://rvlautoai.ru/webhook/v1/chat/completions"
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return 0, nil, err
	}

	req, err := http.NewRequest("POST", externalURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return 0, nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, err
	}

	return resp.StatusCode, respBody, nil
}

func convertMessagesForGemini(msgs []interface{}) []map[string]string {
	var geminiMessages []map[string]string
	for _, m := range msgs {
		if msgMap, ok := m.(map[string]interface{}); ok {
			role, _ := msgMap["role"].(string)
			content, _ := msgMap["content"].(string)
			geminiMessages = append(geminiMessages, map[string]string{
				"role":    role,
				"content": content,
			})
		}
	}
	return geminiMessages
}

func createOpenAIResponse(model string, content string) map[string]interface{} {
	return map[string]interface{}{
		"id":      fmt.Sprintf("gen-%d", time.Now().Unix()),
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

func (h *ChatHandler) HandleModels(c *fiber.Ctx) error {
	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	provider := c.Query("provider")
	externalURL := "https://rvlautoai.ru/webhook/v1/models"
	if provider != "" {
		externalURL += "?provider=" + provider
	}

	req, err := http.NewRequest("GET", externalURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create request"})
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Failed to contact AI service"})
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read response"})
	}

	c.Status(resp.StatusCode)
	c.Set("Content-Type", "application/json")
	return c.Send(respBody)
}

// loadUserSystemPrompt loads and combines applicable prompts for a user
func loadUserSystemPrompt(userIDInterface interface{}) string {
	if userIDInterface == nil {
		// No user ID, return only global prompts
		return loadGlobalPrompts()
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	case string:
		if id, err := strconv.ParseUint(v, 10, 32); err == nil {
			userID = uint(id)
		}
	}

	if userID == 0 {
		return loadGlobalPrompts()
	}

	// Use the BuildSystemPromptForUser function from prompt_handler
	return BuildSystemPromptForUser(userID)
}

// loadGlobalPrompts loads only global prompts (for anonymous users)
func loadGlobalPrompts() string {
	var prompts []models.AIPrompt
	if err := database.DB.Where("is_active = ? AND scope = ?", true, models.ScopeGlobal).
		Order("priority DESC").
		Find(&prompts).Error; err != nil {
		log.Printf("[Chat] Error loading global prompts: %v", err)
		return ""
	}

	log.Printf("[Chat] Found %d global prompts (scope=%s, is_active=true)", len(prompts), models.ScopeGlobal)

	var parts []string
	for _, p := range prompts {
		if p.Content != "" {
			parts = append(parts, p.Content)
		}
	}

	result := strings.Join(parts, "\n\n")
	if len(result) > 0 {
		log.Printf("[Chat] Built global prompt: %d chars from %d prompts", len(result), len(parts))
	}
	return result
}

// prependSystemMessage adds a system message at the beginning of the messages array
func prependSystemMessage(messages []interface{}, systemPrompt string) []interface{} {
	if systemPrompt == "" {
		return messages
	}

	systemMessage := map[string]interface{}{
		"role":    "system",
		"content": systemPrompt,
	}

	// Check if first message is already a system message
	if len(messages) > 0 {
		if firstMsg, ok := messages[0].(map[string]interface{}); ok {
			if role, ok := firstMsg["role"].(string); ok && role == "system" {
				// Combine with existing system message
				existingContent, _ := firstMsg["content"].(string)
				firstMsg["content"] = systemPrompt + "\n\n" + existingContent
				return messages
			}
		}
	}

	// Prepend new system message
	result := make([]interface{}, 0, len(messages)+1)
	result = append(result, systemMessage)
	result = append(result, messages...)
	return result
}
