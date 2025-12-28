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

	"strings"

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

	// Determine list of models to try
	var modelsToTry []models.AiModel

	intentLogPrefix := "[Manual]"

	if model, ok := body["model"].(string); ok && model == "auto" {
		intentLogPrefix = "[AutoMagic]"
		// 1. Detect Intent from Messages
		targetCategory := "text" // Default to text

		if messages, ok := body["messages"].([]interface{}); ok && len(messages) > 0 {
			// Get last message
			if lastMsg, ok := messages[len(messages)-1].(map[string]interface{}); ok {
				if content, ok := lastMsg["content"].(string); ok {
					lowerContent := strings.ToLower(content)

					// Image Keywords
					if strings.Contains(lowerContent, "draw") ||
						strings.Contains(lowerContent, "image") ||
						strings.Contains(lowerContent, "picture") ||
						strings.Contains(lowerContent, "paint") ||
						strings.Contains(lowerContent, "нарисуй") ||
						strings.Contains(lowerContent, "изобрази") ||
						strings.Contains(lowerContent, "картинк") ||
						strings.Contains(lowerContent, "изображен") ||
						strings.Contains(lowerContent, "фото") ||
						strings.Contains(lowerContent, "рисунок") ||
						strings.Contains(lowerContent, "арт") {
						targetCategory = "image"
					}

					// Audio detection left out for strictness as per previous logic
				}
			}
		}

		// Find ALL enabled models with AutoRouting enabled AND matching Category, sorted by response time
		err := database.DB.Where("is_enabled = ? AND is_auto_routing_enabled = ? AND category = ?", true, true, targetCategory).
			Order("last_response_time asc").
			Find(&modelsToTry).Error

		// Fallback for Image: If no image models or they all fail, we will append a "Safe" fallback later
		if (err != nil || len(modelsToTry) == 0) && targetCategory != "text" {
			log.Printf("%s No models found for category '%s', falling back to 'text'", intentLogPrefix, targetCategory)
			targetCategory = "text"
			database.DB.Where("is_enabled = ? AND is_auto_routing_enabled = ? AND category = ?", true, true, "text").
				Order("last_response_time asc").
				Find(&modelsToTry)
		}

		// Inject/Prioritize Stability for Images
		if targetCategory == "image" {
			// We want PollinationsAI to be the FIRST choice if available because it's the most stable
			var stableModels []models.AiModel
			var otherModels []models.AiModel

			for _, m := range modelsToTry {
				if m.Provider == "PollinationsAI" {
					stableModels = append(stableModels, m)
				} else {
					otherModels = append(otherModels, m)
				}
			}

			// If PollinationsAI wasn't in the list at all, add it manually as a candidate
			if len(stableModels) == 0 {
				stableModels = append(stableModels, models.AiModel{
					ModelID:  "flux",
					Provider: "PollinationsAI",
				})
			}

			// New priority: Stable ones first, then others
			modelsToTry = append(stableModels, otherModels...)
		}

		if len(modelsToTry) == 0 {
			log.Printf("%s No auto-routing models found at all. Defaulting to gpt-3.5-turbo", intentLogPrefix)
			modelsToTry = append(modelsToTry, models.AiModel{ModelID: "gpt-3.5-turbo", Provider: ""})
		}

		log.Printf("%s Strategy: Intent='%s', Candidates=%d", intentLogPrefix, targetCategory, len(modelsToTry))
	} else {
		// Manual mode: Try only the requested model
		mID, _ := body["model"].(string)
		prov, _ := body["provider"].(string)
		modelsToTry = append(modelsToTry, models.AiModel{ModelID: mID, Provider: prov})
	}

	// Get API Key from env
	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		log.Println("Error: API_OPEN_AI is not set in environment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	// Loop through candidates
	var lastErr error
	var lastRespBody []byte
	var lastStatusCode int

	for i, modelConf := range modelsToTry {
		// Update body for this attempt
		body["model"] = modelConf.ModelID
		if modelConf.Provider != "" {
			body["provider"] = modelConf.Provider
		} else {
			delete(body, "provider") // Clear provider if empty to let backend decide or usage of default
		}

		log.Printf("%s [Attempt %d/%d] Trying model: %s (Provider: %s)", intentLogPrefix, i+1, len(modelsToTry), modelConf.ModelID, modelConf.Provider)

		// Prepare request
		externalURL := "https://rvlautoai.ru/webhook/v1/chat/completions"
		jsonBody, err := json.Marshal(body)
		if err != nil {
			log.Printf("Failed to marshal request: %v", err)
			continue
		}

		req, err := http.NewRequest("POST", externalURL, bytes.NewBuffer(jsonBody))
		if err != nil {
			log.Printf("Failed to create request: %v", err)
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Error forwarding request: %v", err)
			lastErr = err
			continue
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Error reading response: %v", err)
			lastErr = err
			continue
		}

		lastStatusCode = resp.StatusCode
		lastRespBody = respBody

		// Validation Phase
		isValid := false
		if resp.StatusCode == 200 {
			// Check for valid JSON and non-empty content
			// Valid AI response shouldn't be just empty object {} (len=2) or small error json
			if len(respBody) > 10 { // Increased threshold to catch {} and small error objects
				isValid = true
			} else {
				log.Printf("[Warning] Model %s returned 200 OK but suspicious body length (%d bytes): %s", modelConf.ModelID, len(respBody), string(respBody))

				// Optional: Explicitly check for "{}"
				trimBody := strings.TrimSpace(string(respBody))
				if trimBody == "{}" || trimBody == "" {
					isValid = false
				}
			}
		} else {
			log.Printf("[Warning] Model %s returned status %d. Body: %s", modelConf.ModelID, resp.StatusCode, string(respBody))
		}

		if isValid {
			log.Printf("%s Success with %s", intentLogPrefix, modelConf.ModelID)

			// Optional: Update last_response_time or success rate here if we had that logic

			c.Status(resp.StatusCode)
			c.Set("Content-Type", "application/json")
			return c.Send(respBody)
		}

		// If we are here, attempt failed. Loop continues to next model.
	}

	// If all attempts failed
	log.Printf("%s All attempts failed.", intentLogPrefix)

	// If the last status was NOT 200 (e.g. 400, 500), we can forward it.
	// But if it WAS 200, it means we rejected it internally (e.g. empty body), so we must NOT return 200 to client.
	if lastStatusCode != 0 && lastStatusCode != 200 {
		c.Status(lastStatusCode)
		return c.Send(lastRespBody)
	}

	return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
		"error":       "All AI models failed to respond or returned invalid data",
		"last_status": lastStatusCode,
		"details":     lastErr,
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (h *ChatHandler) HandleModels(c *fiber.Ctx) error {
	// Get API Key from env
	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		log.Println("Error: API_OPEN_AI is not set in environment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	// Get provider query parameter if present
	provider := c.Query("provider")
	externalURL := "https://rvlautoai.ru/webhook/v1/models"
	if provider != "" {
		externalURL += "?provider=" + provider
	}

	// Create GET request
	req, err := http.NewRequest("GET", externalURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create request",
		})
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Send request with timeout
	client := &http.Client{
		Timeout: 60 * time.Second, // 60s timeout per model
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error forwarding request to AI API: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "Failed to contact AI service",
		})
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read response",
		})
	}

	// Forward status code and body
	c.Status(resp.StatusCode)
	c.Set("Content-Type", "application/json")
	return c.Send(respBody)
}
