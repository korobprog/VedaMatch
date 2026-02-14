package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ChatHandler struct {
	domainAssistant *services.DomainAssistantService
}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{
		domainAssistant: services.GetDomainAssistantService(),
	}
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

	// 0. Load personalized prompts based on user profile
	// 0. Load personalized prompts based on user profile
	userID := middleware.GetUserID(c)
	// SECURITY FIX: Do NOT trust body["userId"].
	// If unauthenticated (userID == 0), the user is anonymous and gets ONLY global prompts.
	// Allowing body overrides creates an IDOR vulnerability where an attacker
	// can steal another user's system prompts.

	if userID == 0 {
		log.Println("[Chat] Unauthenticated request - using GLOBAL prompts only")
	} else {
		log.Printf("[Chat] Authenticated request for User %d", userID)
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

	lastUserMessage := extractLastUserMessage(messagesInterface)
	var assistantContext *services.DomainContextResponse

	// 0.5 Domain Assistant hybrid retrieval (MVP public scope).
	if h.domainAssistant != nil &&
		h.domainAssistant.IsDomainAssistantEnabled() &&
		h.domainAssistant.IsHybridEnabled() &&
		h.domainAssistant.IsChatCompletionsEnabled() &&
		lastUserMessage != "" {
		ctxResp, err := h.domainAssistant.BuildAssistantContext(c.Context(), services.DomainContextRequest{
			Query:          lastUserMessage,
			TopK:           5,
			UserID:         userID,
			IncludePrivate: false, // MVP: public-only
			StrictRouting:  true,
		})
		if err != nil {
			log.Printf("[Chat] Domain assistant retrieval warning: %v", err)
		} else if ctxResp != nil {
			assistantContext = ctxResp
			if len(ctxResp.Sources) > 0 && (!ctxResp.NeedsDomainData || ctxResp.Confidence >= 0.20) {
				ragPrompt := h.domainAssistant.BuildPromptSnippet(ctxResp)
				if ragPrompt != "" {
					messagesInterface = prependSystemMessage(messagesInterface, ragPrompt)
					body["messages"] = messagesInterface
					log.Printf("[Chat] Domain context injected: domains=%v, sources=%d, confidence=%.2f",
						ctxResp.Domains, len(ctxResp.Sources), ctxResp.Confidence)
				}
			} else if ctxResp.NeedsDomainData {
				log.Printf("[Chat] Domain intent detected but no reliable sources found")
				return c.JSON(createOpenAIResponse("domain-assistant", "не найдено достаточно данных"))
			}
		}
	}

	intentResult := intentService.DetectIntent(messagesInterface)
	targetCategory := intentResult.TargetCategory
	content := intentResult.Content
	isComplexTask := intentResult.IsComplexTask
	log.Printf("[Handler] Intent detected: Category=%s, Complex=%v", targetCategory, isComplexTask)

	// 2. Translation (if needed)
	// 3. Determine Model using Polza configuration
	polzaService := services.GetPolzaService()
	var targetModelID string

	// Reload settings to ensure we have latest config
	polzaService.ReloadFromDB()

	if model, ok := body["model"].(string); ok && model != "auto" && model != "" {
		// Manual override
		targetModelID = model
	} else {
		// Auto/Smart Routing based on complexity
		if isComplexTask {
			targetModelID = polzaService.GetReasoningModel()
			log.Printf("[Polza] Formatting complex task for Reasoning Model: %s", targetModelID)
		} else {
			targetModelID = polzaService.GetFastModel()
			log.Printf("[Polza] Routing simple task to Fast Model: %s", targetModelID)
		}
	}

	// 4. Send to Polza AI
	// Convert messages to expected format
	chatMessages := normalizeMessages(messagesInterface)

	// Validate API Key exists
	if !polzaService.HasApiKey() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Polza AI API key not configured. Please contact administrator.",
		})
	}

	// Image generation fallback (PollinationsAI) integrity check
	// If intent is image, we might want to prioritize Pollinations if Polza doesn't handle images explicitly yet OR let Polza define it.
	// For now, keeping legacy Pollinations logic for 'image' category separate if Polza is text-focused in this context.
	// However, if category is text, proceed with Polza.

	if targetCategory == "image" {
		// Legacy Pollinations Logic (Keep existing specialized logic for images if preferred)
		// ... (Checking if we should replace this. User asked for Polza integration. Polza supports GPT-4o which handles images, but maybe specific image gen models are different)
		// Let's defer image handling to separate block or keep existing if it works.
		// For this edit, I will assume we use Polza for TEXT.
		// If category is image, we can try Polza if it supports image models or stick to Pollinations.
		// Given the user prompt "Polza.ai API должна работать в чате", I'll make sure TEXT goes to Polza.
	}

	// Execute Polza Request
	if targetCategory == "text" || targetCategory == "code" || targetCategory == "general" || targetCategory == "" {
		log.Printf("[Polza] Sending request to %s (Model: %s)", polzaService.GetBaseURL(), targetModelID)

		content, err := polzaService.SendMessage(targetModelID, chatMessages)
		if err != nil {
			log.Printf("[Polza] Request failed: %v", err)
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"error": fmt.Sprintf("AI Service Error: %v", err),
			})
		}

		if h.domainAssistant != nil && assistantContext != nil && len(assistantContext.Sources) > 0 {
			content = h.domainAssistant.AppendSources(content, assistantContext)
		}

		// Success!
		log.Printf("[Polza] Success! Response length: %d", len(content))
		response := services.ConvertToOpenAIFormat(content, targetModelID)
		return c.JSON(response)
	}

	// If we are here, it might be an image request handled by legacy logic below (which I need to preserve or adapt)
	// The original code had complex fallback loops. I will SIMPLIFY significantly.

	// ... Legacy Pollinations Image Logic Placeholder ...
	// If targetCategory == "image", we use the existing Pollinations block.
	if targetCategory == "image" {
		prompt := content
		pollinationsInfoURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?nologo=true", url.QueryEscape(prompt))
		markdownImage := fmt.Sprintf("![%s](%s)", prompt, pollinationsInfoURL)

		log.Printf("[Pollinations] Generated URL: %s", pollinationsInfoURL)
		responseJSON := createOpenAIResponse("pollinations-v1", markdownImage)
		return c.JSON(responseJSON)
	}

	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unsupported category"})
}

// Helper to convert []interface{} to []map[string]string
func normalizeMessages(msgs []interface{}) []map[string]string {
	var normalized []map[string]string
	for _, m := range msgs {
		if msgMap, ok := m.(map[string]interface{}); ok {
			role, _ := msgMap["role"].(string)
			content, _ := msgMap["content"].(string)
			normalized = append(normalized, map[string]string{
				"role":    role,
				"content": content,
			})
		}
	}
	return normalized
}

func extractLastUserMessage(messages []interface{}) string {
	for i := len(messages) - 1; i >= 0; i-- {
		msg, ok := messages[i].(map[string]interface{})
		if !ok {
			continue
		}
		role, _ := msg["role"].(string)
		if role != "user" {
			continue
		}
		content, _ := msg["content"].(string)
		content = strings.TrimSpace(content)
		if content != "" {
			return content
		}
	}
	return ""
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
