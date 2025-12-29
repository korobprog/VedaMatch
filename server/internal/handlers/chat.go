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
	"regexp"
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
	targetCategory := "text" // Default to text
	isComplexTask := false
	var content string // Declare content here to be accessible later

	// 1. Detect Intent from Messages (Always do this for translation and logging)
	if messages, ok := body["messages"].([]interface{}); ok && len(messages) > 0 {
		log.Printf("[Intent] Found %d messages", len(messages))
		// Get last message
		if lastMsg, ok := messages[len(messages)-1].(map[string]interface{}); ok {
			log.Printf("[Intent] Last message is map: %v", lastMsg)
			if msgContent, ok := lastMsg["content"].(string); ok {
				content = msgContent // Assign to the outer 'content' variable
				log.Printf("[Intent] Content: %s", content)
				lowerContent := strings.ToLower(content)

				// Image Keywords (Extended)
				imageKeywords := []string{
					"draw", "image", "picture", "paint", "generate", "sketch", "illustration", "artwork", "photo", "portrait",
					"нарисуй", "изобрази", "картинк", "изображен", "фото", "рисунок", "арт", "создай картинку", "сгенерируй", "портрет", "пейзаж", "эскиз",
				}

				for _, kw := range imageKeywords {
					if strings.Contains(lowerContent, kw) {
						targetCategory = "image"
						break
					}
				}

				// Complex Reasoning Keywords
				complexKeywords := []string{
					"think", "analyze", "reason", "explain step", "complex", "code", "debug", "math", "solve",
					"подумай", "проанализируй", "разбери", "объясни пошагово", "сложный", "напиши код", "отладка", "математика", "реши задачу",
				}

				for _, kw := range complexKeywords {
					if strings.Contains(lowerContent, kw) {
						isComplexTask = true
						break
					}
				}

				// Get API Key from env for optional translation
				apiKey := os.Getenv("API_OPEN_AI")

				// 2. Translation for Images if content contains Russian (models like flux/dall-e ONLY understand English)
				log.Printf("[Translator] Checking: targetCategory=%s, containsCyrillic=%v, hasApiKey=%v", targetCategory, containsCyrillic(content), apiKey != "")
				if targetCategory == "image" && containsCyrillic(content) && apiKey != "" {
					log.Printf("[Translator] Russian image prompt detected: %s", content)
					translated, err := h.translatePromptToEnglish(content, apiKey)
					if err == nil {
						log.Printf("[Translator] Translated to English: %s", translated)
						lastMsg["content"] = translated
						// Update content for subsequent logs in this function
						content = translated
					} else {
						log.Printf("[Translator] Translation failed: %v. Proceeding with original.", err)
					}
				}
			}
		}
	}

	if model, ok := body["model"].(string); ok && model == "auto" {
		intentLogPrefix = "[AutoMagic]"

		// Build Query based on Intent
		query := database.DB.Where("is_enabled = ? AND is_auto_routing_enabled = ? AND category = ?", true, true, targetCategory)

		if targetCategory == "text" {
			if isComplexTask {
				log.Printf("%s Complex intent detected. Prioritizing Gemini and 'smart' models.", intentLogPrefix)
				// Prefer Google/Gemini first, then smart, then standard, then fast
				query = query.Order("CASE WHEN provider = 'Google' THEN 0 ELSE 1 END, CASE WHEN intelligence_tier = 'smart' THEN 0 WHEN intelligence_tier = 'standard' THEN 1 ELSE 2 END, last_response_time asc")
			} else {
				log.Printf("%s Simple text intent detected. Prioritizing Gemini and 'fast' models.", intentLogPrefix)
				// Prefer Google/Gemini first, then fast, then standard, then smart
				query = query.Order("CASE WHEN provider = 'Google' THEN 0 ELSE 1 END, CASE WHEN latency_tier = 'fast' THEN 0 WHEN latency_tier = 'medium' THEN 1 ELSE 2 END, last_response_time asc")
			}
		} else {
			// For images, prioritize stable providers like PollinationsAI
			query = query.Order("CASE WHEN provider = 'PollinationsAI' THEN 0 ELSE 1 END, last_response_time asc")
		}

		// Find models to try
		err := query.Find(&modelsToTry).Error

		// Fallback for Category: If no models found for targetCategory, fallback to text
		if (err != nil || len(modelsToTry) == 0) && targetCategory != "text" {
			log.Printf("%s No models found for category '%s', falling back to 'text'", intentLogPrefix, targetCategory)
			database.DB.Where("is_enabled = ? AND is_auto_routing_enabled = ? AND category = ?", true, true, "text").
				Order("last_response_time asc").
				Find(&modelsToTry)
		}

		if len(modelsToTry) == 0 {
			log.Printf("%s No auto-routing models found at all. Defaulting to gpt-3.5-turbo", intentLogPrefix)
			modelsToTry = append(modelsToTry, models.AiModel{ModelID: "gpt-3.5-turbo", Provider: ""})
		}

		log.Printf("%s Strategy: Intent='%s', Complex=%v, Candidates=%d", intentLogPrefix, targetCategory, isComplexTask, len(modelsToTry))
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

	// =========================================================================
	// TRY GEMINI FIRST (for text requests) - as per ARCHITECTURE.md
	// Gemini has highest priority and should be tried before any other model.
	// Only if ALL Gemini keys are exhausted, we fall back to RVFreeLLM models.
	// =========================================================================
	if targetCategory == "text" {
		geminiService := services.GetGeminiService()
		if geminiService != nil && geminiService.HasKeys() {
			log.Printf("[Gemini] Attempting Gemini FIRST for text request (as per architecture)")

			// Convert messages to the format expected by Gemini service
			var geminiMessages []map[string]string
			if msgs, ok := body["messages"].([]interface{}); ok {
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
			}

			// Try gemini-2.5-flash first, then gemini-2.5-flash-lite (handled inside GeminiService)
			geminiContent, err := geminiService.SendMessage("gemini-2.5-flash", geminiMessages)
			if err == nil && geminiContent != "" {
				log.Printf("[Gemini] SUCCESS with gemini-2.5-flash")
				// Convert to OpenAI format and return
				response := services.ConvertToOpenAIFormat(geminiContent, "gemini-2.5-flash")
				return c.JSON(response)
			}
			log.Printf("[Gemini] All Gemini attempts failed: %v. Falling back to RVFreeLLM models.", err)
		}
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

		// Check if this is a Gemini model - try Gemini service first
		if strings.HasPrefix(modelConf.ModelID, "gemini") || modelConf.Provider == "Google" {
			geminiService := services.GetGeminiService()
			if geminiService.HasKeys() {
				log.Printf("[Gemini] Attempting direct Gemini API for model: %s", modelConf.ModelID)

				// Convert messages to the format expected by Gemini service
				var geminiMessages []map[string]string
				if msgs, ok := body["messages"].([]interface{}); ok {
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
				}

				geminiContent, err := geminiService.SendMessage(modelConf.ModelID, geminiMessages)
				if err == nil {
					log.Printf("[Gemini] Success with model: %s", modelConf.ModelID)
					// Convert to OpenAI format and return
					response := services.ConvertToOpenAIFormat(geminiContent, modelConf.ModelID)
					return c.JSON(response)
				}
				log.Printf("[Gemini] All Gemini keys failed for %s: %v. Falling back to OpenAI proxy.", modelConf.ModelID, err)
			}
		}

		// Check if this is Pollinations AI (Direct Image Generation)
		if modelConf.Provider == "PollinationsAI" {
			log.Printf("[Pollinations] Attempting direct API for model: %s", modelConf.ModelID)

			// Extract prompt
			var prompt string
			if msgs, ok := body["messages"].([]interface{}); ok && len(msgs) > 0 {
				if lastMsg, ok := msgs[len(msgs)-1].(map[string]interface{}); ok {
					prompt, _ = lastMsg["content"].(string)
				}
			}

			if prompt == "" {
				log.Printf("[Pollinations] No prompt found")
				continue
			}

			// Generate Pollinations URL
			// We can generate a random seed/ID to ensure uniqueness if needed, but timestamp is done by download logic
			// Just use the prompt directly
			pollinationsInfoURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?nologo=true", url.QueryEscape(prompt))

			// Check if it's reachable (HEAD request) or just trust it.
			// Pollinations generates on the fly. Let's just trust it and let the image downloader handle it.
			// Construct an artificial OpenAI response
			// We will create a Markdown image link

			markdownImage := fmt.Sprintf("![%s](%s)", prompt, pollinationsInfoURL)

			// Create dummy response body
			// We skip HTTP request here because Pollinations IS the URL essentially.
			// But we should verify 200 OK.

			checkResp, err := http.Get(pollinationsInfoURL)
			if err == nil && checkResp.StatusCode == 200 {
				checkResp.Body.Close()

				// Success!
				log.Printf("[Pollinations] Success! Generated URL: %s", pollinationsInfoURL)

				responseID := fmt.Sprintf("pollinations-%d", time.Now().Unix())
				responseJSON := map[string]interface{}{
					"id":      responseID,
					"object":  "chat.completion",
					"created": time.Now().Unix(),
					"model":   modelConf.ModelID,
					"choices": []map[string]interface{}{
						{
							"index": 0,
							"message": map[string]string{
								"role":    "assistant",
								"content": markdownImage,
							},
							"finish_reason": "stop",
						},
					},
				}

				respBytes, _ := json.Marshal(responseJSON)

				// Set variables to mimic a successful HTTP proxy response, so it falls into the validation block below
				lastStatusCode = 200
				lastRespBody = respBytes

				// Break connection loop to process this response
				break // Start validation and processing
			}

			log.Printf("[Pollinations] Failed to reach API or generate image: %v", err)
			continue
		}

		// Prepare request to OpenAI proxy (RVFreeLLM)
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
			log.Printf("%s Success with %s. Checking for images to proxy...", intentLogPrefix, modelConf.ModelID)

			// PROXY IMAGE URLS - Check all successful responses
			var respData struct {
				Choices []struct {
					Message struct {
						Content string `json:"content"`
					} `json:"message"`
				} `json:"choices"`
			}

			if err := json.Unmarshal(respBody, &respData); err == nil && len(respData.Choices) > 0 {
				content := respData.Choices[0].Message.Content
				newContent := content // Initialize newContent with the original content

				// Process images: download to local server and replace URLs
				// This handles Markdown images (![alt](url)) and makes them local
				newContent = h.processAndCacheImages(newContent)

				if newContent != content {
					log.Printf("[Proxy] Content updated. Orig len: %d, New len: %d", len(content), len(newContent))
					log.Printf("[Proxy] First 100 chars of new content: %.100s", newContent)
					var fullResp map[string]interface{}
					if err := json.Unmarshal(respBody, &fullResp); err == nil {
						if choices, ok := fullResp["choices"].([]interface{}); ok && len(choices) > 0 {
							if choice, ok := choices[0].(map[string]interface{}); ok {
								if message, ok := choice["message"].(map[string]interface{}); ok {
									message["content"] = newContent
									if patchedBody, err := json.Marshal(fullResp); err == nil {
										respBody = patchedBody
										log.Printf("[Proxy] Response body successfully patched")
									}
								}
							}
						}
					}
				}
			}

			c.Status(resp.StatusCode)
			c.Set("Content-Type", "application/json")
			return c.Send(respBody)
		}

		// If we are here, attempt failed. Loop continues to next model.
	}

	// If all attempts failed
	log.Printf("%s All attempts failed.", intentLogPrefix)

	// FAILSAFE: If image generation failed completely, use PollinationsAI as a last resort
	if targetCategory == "image" {
		log.Printf("[HandleChat] Failsafe: Attempting PollinationsAI as last resort...")

		// Use 'content' which might be translated
		prompt := content
		pollinationsURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?nologo=true", url.QueryEscape(prompt))

		// We can't trust Pollinations directly -> 403 sometimes if hotlinking?
		// Actually Pollinations explicitly allows hotlinking. But let's run it through our processor to be safe (and cache it).

		// We construct a markdown string
		rawMarkdown := fmt.Sprintf("![%s](%s)", prompt, pollinationsURL)

		// Process it (download to local or proxy)
		processedBody := h.processAndCacheImages(rawMarkdown)

		log.Printf("[HandleChat] Failsafe: success. Result: %s", processedBody)

		// Construct fake OpenAI response
		responseID := fmt.Sprintf("pollinations-fallback-%d", time.Now().Unix())
		responseJSON := map[string]interface{}{
			"id":      responseID,
			"object":  "chat.completion",
			"created": time.Now().Unix(),
			"model":   "pollinations-fallback",
			"choices": []map[string]interface{}{
				{
					"index": 0,
					"message": map[string]string{
						"role":    "assistant",
						"content": processedBody,
					},
					"finish_reason": "stop",
				},
			},
		}

		return c.JSON(responseJSON)
	}

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

func containsCyrillic(s string) bool {
	for _, r := range s {
		if (r >= 'а' && r <= 'я') || (r >= 'А' && r <= 'Я') || r == 'ё' || r == 'Ё' {
			return true
		}
	}
	return false
}

func (h *ChatHandler) translatePromptToEnglish(original, apiKey string) (string, error) {
	// Try Gemini first (faster and more reliable)
	geminiService := services.GetGeminiService()
	if geminiService != nil && geminiService.HasKeys() {
		messages := []map[string]string{
			{
				"role": "user",
				"content": fmt.Sprintf(`You are a professional prompt engineer for image generation AI models (Flux, DALL-E, Midjourney).

TASK: Convert this user request into an English image generation prompt.

RULES:
1. Remove any instruction words like "draw", "нарисуй", "создай", "сгенерируй", "make", "generate"
2. Focus ONLY on describing WHAT should be in the image
3. Add quality descriptors: "high quality, detailed, 4k, professional"
4. Keep the artistic intent and subject matter
5. Output ONLY the English prompt, nothing else

User request: %s`, original),
			},
		}

		translated, err := geminiService.SendMessage("gemini-2.5-flash", messages)
		if err == nil && translated != "" {
			log.Printf("[Translator] Gemini translated: %s", translated)
			return strings.TrimSpace(translated), nil
		}
		log.Printf("[Translator] Gemini translation failed: %v, trying OpenAI fallback", err)
	}

	// Fallback to OpenAI/RVFreeLLM
	externalURL := "https://rvlautoai.ru/webhook/v1/chat/completions"

	translateReq := map[string]interface{}{
		"model":    "turbo",
		"provider": "Perplexity",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a prompt engineer for image AI. Convert the user's request to an English image prompt. Remove words like 'draw', 'нарисуй', 'создай'. Output ONLY the descriptive English prompt with quality tags like 'high quality, detailed'. No explanations.",
			},
			{
				"role":    "user",
				"content": original,
			},
		},
	}

	jsonBody, err := json.Marshal(translateReq)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", externalURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 20 * time.Second} // Increased timeout
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("translation service returned status: %d. Body: %s", resp.StatusCode, string(respBody))
	}

	var respData struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &respData); err != nil {
		return "", err
	}

	if len(respData.Choices) > 0 {
		return strings.TrimSpace(respData.Choices[0].Message.Content), nil
	}

	return "", fmt.Errorf("no translation provided by AI")
}

// processAndCacheImages finds image URLs in the response, downloads them locally,
// or falls back to proxy if download fails/times out.
func (h *ChatHandler) processAndCacheImages(content string) string {
	// 1. First, strip link wrappers around images like [![alt](img_url)](link_url)
	reLinkWrap := regexp.MustCompile(`\[(!\[.*?\]\(.*?\))\]\(https?://.*?\)`)
	newContent := reLinkWrap.ReplaceAllString(content, "$1")

	// 2. Wrap "naked" HF Gradio URLs in Markdown
	// We use a regex that ensures it's not already preceded by '(' or '['
	reRaw := regexp.MustCompile(`(?m)(^|\s)(https?://[^\s)\]"]+?hf\.space/gradio_api/file=[^\s)\]"]+)`)
	newContent = reRaw.ReplaceAllString(newContent, `$1![Generated Image]($2)`)

	// 3. Process all Markdown images: ![alt](url)
	re := regexp.MustCompile(`!\[(.*?)\]\((https?://.*?)\)`)

	newContent = re.ReplaceAllStringFunc(newContent, func(match string) string {
		submatches := re.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		altText := submatches[1]
		originalURL := submatches[2]

		// If nested markdown was somehow created, clean it up manually here
		if strings.HasPrefix(originalURL, "![") {
			// Extract deeper URL
			innerRe := regexp.MustCompile(`\((https?://.*?)\)`)
			innerMatch := innerRe.FindStringSubmatch(originalURL)
			if len(innerMatch) > 1 {
				originalURL = innerMatch[1]
			}
		}

		// Skip if already local
		if strings.Contains(originalURL, "/uploads/") {
			return match
		}

		// Generate local filename
		ext := ".jpg"
		if strings.Contains(strings.ToLower(originalURL), ".png") {
			ext = ".png"
		} else if strings.Contains(strings.ToLower(originalURL), ".webp") {
			ext = ".webp"
		}

		filename := fmt.Sprintf("gen_%d%s", time.Now().UnixNano(), ext)
		localRelPath := "uploads/generated/" + filename
		localFullPath := "./" + localRelPath
		publicLocalURL := fmt.Sprintf("http://10.0.2.2:8081/%s", localRelPath)

		log.Printf("[ImageCache] Processing %s ...", originalURL)

		// Try to download with longer timeout (30s) for HF
		err := downloadFile(originalURL, localFullPath)
		if err == nil {
			log.Printf("[ImageCache] Download success: %s", publicLocalURL)
			return fmt.Sprintf("![%s](%s)", altText, publicLocalURL)
		}

		log.Printf("[ImageCache] Download failed or timed out: %v. Using Proxy.", err)

		// Fallback to Cloudflare Proxy
		proxyURL := fmt.Sprintf("https://mute-waterfall-ef1e.makstreid.workers.dev/?url=%s", url.QueryEscape(originalURL))
		return fmt.Sprintf("![%s](%s)", altText, proxyURL)
	})

	return newContent
}

func downloadFile(urlStr, filepath string) error {
	// Ensure directory exists
	if err := os.MkdirAll("./uploads/generated", 0755); err != nil {
		return err
	}

	// Try download with 60s timeout (HuggingFace can be slow)
	client := &http.Client{Timeout: 60 * time.Second}

	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return err
	}
	// Mimic a real browser to avoid 403
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
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
