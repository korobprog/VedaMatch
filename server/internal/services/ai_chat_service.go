package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
)

type AiChatService struct {
	apiURL          string
	ragService      *RAGPipelineService
	geoService      *GeoIntentService
	domainAssistant *DomainAssistantService
}

func NewAiChatService() *AiChatService {
	apiURL := os.Getenv("AI_API_URL")
	if apiURL == "" {
		apiURL = "https://rvlautoai.ru/webhook/v1/chat/completions"
	}

	mapService := NewMapService(database.DB)

	return &AiChatService{
		apiURL:          apiURL,
		ragService:      NewRAGPipelineService(database.DB),
		geoService:      NewGeoIntentService(mapService),
		domainAssistant: GetDomainAssistantService(),
	}
}

func (s *AiChatService) getApiKey(provider string) string {
	// OpenRouter uses worker proxy, no direct API key needed here
	if provider == "OpenRouter" {
		return "via-worker-proxy"
	}

	// If provider is Routeway, use Routeway API key
	if provider == "Routeway" {
		var setting models.SystemSetting
		if err := database.DB.Where("key = ?", "ROUTEWAY_API_KEY").First(&setting).Error; err == nil && setting.Value != "" {
			return setting.Value
		}
	}

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
	// OpenRouter models use format: provider/model (e.g. deepseek/deepseek-chat)
	if strings.Contains(modelID, "/") {
		return "OpenRouter"
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
	// Check if model ends with :free (Routeway free models)
	if strings.HasSuffix(modelID, ":free") {
		return "Routeway"
	}
	return "OpenAI"
}

// getFallbackModelIDs returns deterministic low-cost fallback chain + enabled DB models.
func (s *AiChatService) getFallbackModelIDs(failedModelID string) []string {
	candidates := []string{
		"deepseek/deepseek-r1",
		"gemini-2.5-flash-lite",
		"gpt-4o-mini",
	}

	var dbModels []models.AiModel
	if err := database.DB.Where("is_enabled = ? AND model_id != ? AND category = ?", true, failedModelID, "text").Limit(5).Find(&dbModels).Error; err == nil {
		for _, m := range dbModels {
			if strings.TrimSpace(m.ModelID) != "" {
				candidates = append(candidates, m.ModelID)
			}
		}
	}

	unique := make([]string, 0, len(candidates))
	seen := map[string]struct{}{failedModelID: {}}
	for _, m := range candidates {
		m = strings.TrimSpace(m)
		if m == "" {
			continue
		}
		if _, exists := seen[m]; exists {
			continue
		}
		seen[m] = struct{}{}
		unique = append(unique, m)
	}
	return unique
}

// makeRequest handles the actual API call logic - uses Polza.ai only
func (s *AiChatService) makeRequest(modelID string, messages []map[string]string) (string, error) {
	// Use Polza.ai as the only LM provider
	polzaService := GetPolzaService()
	if polzaService.HasApiKey() {
		log.Printf("[AiChatService] Using Polza.ai for model: %s", modelID)
		content, err := polzaService.SendMessage(modelID, messages)
		if err == nil {
			return content, nil
		}
		log.Printf("[AiChatService] Polza.ai failed for %s: %v", modelID, err)
		return "", fmt.Errorf("Polza.ai error: %v", err)
	}

	return "", fmt.Errorf("Polza API key not configured. Please set it in admin panel.")
}

func (s *AiChatService) GenerateReply(roomName string, lastMessages []models.Message) (string, map[string]interface{}, error) {
	// Construct message history for AI
	var messages []map[string]string

	systemPrompt := "You are a helpful AI assistant in a Vedic community app. Your name is Krishna Assistant. You help users with knowledge about Vedas, Yoga, and community features."
	systemPrompt += "\nUse simple, friendly language. If asked about spiritual topics, provide wisdom from Vedic scriptures."

	// Extract last user message to augment system prompt with RAG
	lastUserMsg := ""
	for i := len(lastMessages) - 1; i >= 0; i-- {
		if lastMessages[i].SenderID != 0 { // Assuming 0 is system/AI
			lastUserMsg = lastMessages[i].Content
			break
		}
	}

	// 0. Check for Geo/Map Intent
	if lastUserMsg != "" {
		geoIntent, err := s.geoService.DetectGeoIntent(context.Background(), lastUserMsg)
		if err == nil && geoIntent != nil {
			response, mapData := s.geoService.FormatMapResponse(geoIntent)
			if response != "" {
				log.Printf("[AiChatService] Geo intent detected: %s", lastUserMsg)
				return response, mapData, nil
			}
		}
	}

	// 0.5 Domain Assistant hybrid retrieval (MVP: public scope in room chat).
	var assistantContext *DomainContextResponse
	if s.domainAssistant != nil &&
		s.domainAssistant.IsDomainAssistantEnabled() &&
		s.domainAssistant.IsHybridEnabled() &&
		s.domainAssistant.IsMessagesEnabled() &&
		strings.TrimSpace(lastUserMsg) != "" {
		ctxResp, err := s.domainAssistant.BuildAssistantContext(context.Background(), DomainContextRequest{
			Query:          lastUserMsg,
			TopK:           5,
			UserID:         0,     // MVP default scope for room AI
			IncludePrivate: false, // public-only
			StrictRouting:  true,
		})
		if err != nil {
			log.Printf("[AiChatService] Domain assistant retrieval warning: %v", err)
		} else if ctxResp != nil {
			assistantContext = ctxResp
			if len(ctxResp.Sources) > 0 && (!ctxResp.NeedsDomainData || ctxResp.Confidence >= 0.20) {
				systemPrompt += "\n\n" + s.domainAssistant.BuildPromptSnippet(ctxResp)
				log.Printf("[AiChatService] Domain context injected: domains=%v, sources=%d, confidence=%.2f",
					ctxResp.Domains, len(ctxResp.Sources), ctxResp.Confidence)
			} else if ctxResp.NeedsDomainData {
				return "не найдено достаточно данных", nil, nil
			}
		}
	}

	// Legacy shopping-only RAG fallback when Domain Assistant is disabled.
	if assistantContext == nil {
		shoppingKeywords := []string{"купить", "цена", "товар", "магазин", "есть ли", "заказать", "прайс", "buy", "price", "product", "shop", "stock"}
		isShoppingQuery := false
		for _, kw := range shoppingKeywords {
			if strings.Contains(strings.ToLower(lastUserMsg), kw) {
				isShoppingQuery = true
				break
			}
		}
		if isShoppingQuery {
			products, err := s.ragService.SearchProducts(context.Background(), lastUserMsg, 3)
			if err == nil && len(products) > 0 {
				marketContext := "Найденные товары в Sattva Market:\n"
				for _, p := range products {
					marketContext += fmt.Sprintf("- %s\n", p.Chunk.Content)
				}
				systemPrompt += "\n\n" + marketContext + "\nИспользуй эту информацию, чтобы помочь пользователю с покупкой. Если нужного товара нет, предложи посмотреть категории в Sattva Market."
			}
		}
	}

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
	// Runtime defaults: fast=deepseek-chat, reasoning=deepseek-r1, fallback=gemini-lite->gpt-4o-mini.
	defaultModelID := s.getModel("deepseek/deepseek-chat")
	log.Printf("[AiChatService] Attempting to generate reply with primary model: %s", defaultModelID)

	content, err := s.makeRequest(defaultModelID, messages)
	if err == nil {
		if s.domainAssistant != nil && assistantContext != nil && len(assistantContext.Sources) > 0 {
			content = s.domainAssistant.AppendSources(content, assistantContext)
		}
		return content, nil, nil
	}

	log.Printf("[AiChatService] Primary model %s failed: %v. Initiating fallback...", defaultModelID, err)

	// 2. Fallback Loop
	fallbacks := s.getFallbackModelIDs(defaultModelID)
	for _, fallbackModelID := range fallbacks {
		log.Printf("[AiChatService] Retrying with fallback model: %s", fallbackModelID)
		content, err := s.makeRequest(fallbackModelID, messages)
		if err == nil {
			log.Printf("[AiChatService] Fallback successful with model: %s", fallbackModelID)
			if s.domainAssistant != nil && assistantContext != nil && len(assistantContext.Sources) > 0 {
				content = s.domainAssistant.AppendSources(content, assistantContext)
			}
			return content, nil, nil
		}
		log.Printf("[AiChatService] Fallback model %s failed: %v", fallbackModelID, err)
	}

	return "", nil, fmt.Errorf("all AI models failed to generate a response")
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
	var assistantContext *DomainContextResponse
	if s.domainAssistant != nil &&
		s.domainAssistant.IsDomainAssistantEnabled() &&
		s.domainAssistant.IsHybridEnabled() &&
		strings.TrimSpace(prompt) != "" {
		ctxResp, err := s.domainAssistant.BuildAssistantContext(context.Background(), DomainContextRequest{
			Query:          prompt,
			TopK:           5,
			UserID:         0,
			IncludePrivate: false,
			StrictRouting:  true,
		})
		if err != nil {
			log.Printf("[AiChatService] Domain assistant simple warning: %v", err)
		} else if ctxResp != nil {
			assistantContext = ctxResp
			if ctxResp.NeedsDomainData && (len(ctxResp.Sources) == 0 || ctxResp.Confidence < 0.20) {
				return "не найдено достаточно данных", nil
			}
		}
	}

	// Add search context if related to products
	shoppingKeywords := []string{"купить", "цена", "товар", "магазин", "есть ли", "заказать", "прайс", "buy", "price", "product", "shop", "stock"}
	isShoppingQuery := false
	for _, kw := range shoppingKeywords {
		if strings.Contains(strings.ToLower(prompt), kw) {
			isShoppingQuery = true
			break
		}
	}

	finalPrompt := prompt
	if assistantContext != nil && len(assistantContext.Sources) > 0 && s.domainAssistant != nil {
		finalPrompt = s.domainAssistant.BuildPromptSnippet(assistantContext) + "\n\nВопрос пользователя: " + prompt
	}
	if isShoppingQuery {
		products, err := s.ragService.SearchProducts(context.Background(), prompt, 3)
		if err == nil && len(products) > 0 {
			marketContext := "\n\nИнформацию о товарах в Sattva Market для справки:\n"
			for _, p := range products {
				marketContext += fmt.Sprintf("- %s\n", p.Chunk.Content)
			}
			finalPrompt = "Учитывая информацию о товарах маркетплейса:\n" + marketContext + "\nОтветь на вопрос пользователя: " + prompt
		}
	}

	messages := []map[string]string{
		{"role": "user", "content": finalPrompt},
	}

	defaultModelID := s.getModel("deepseek/deepseek-chat")
	log.Printf("[AiChatService] Attempting simple response with primary model: %s", defaultModelID)

	content, err := s.makeRequest(defaultModelID, messages)
	if err == nil {
		if s.domainAssistant != nil && assistantContext != nil && len(assistantContext.Sources) > 0 {
			content = s.domainAssistant.AppendSources(content, assistantContext)
		}
		return content, nil
	}

	log.Printf("[AiChatService] Primary model %s failed: %v. Initiating fallback...", defaultModelID, err)

	// 2. Fallback Loop
	fallbacks := s.getFallbackModelIDs(defaultModelID)
	for _, fallbackModelID := range fallbacks {
		log.Printf("[AiChatService] Retrying with fallback model: %s", fallbackModelID)
		content, err := s.makeRequest(fallbackModelID, messages)
		if err == nil {
			if s.domainAssistant != nil && assistantContext != nil && len(assistantContext.Sources) > 0 {
				content = s.domainAssistant.AppendSources(content, assistantContext)
			}
			return content, nil
		}
	}

	return "", fmt.Errorf("all AI models failed")
}

func (s *AiChatService) GenerateResponse(ctx context.Context, messages []models.ChatMessage, modelID string, apiKey string) (string, error) {
	var chatParams []map[string]string
	for _, msg := range messages {
		chatParams = append(chatParams, map[string]string{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}
	return s.makeRequest(modelID, chatParams)
}

// IsDomainAssistantMessagesEnabled returns true when room-chat flow should use Domain Assistant.
func (s *AiChatService) IsDomainAssistantMessagesEnabled() bool {
	return s.domainAssistant != nil &&
		s.domainAssistant.IsDomainAssistantEnabled() &&
		s.domainAssistant.IsHybridEnabled() &&
		s.domainAssistant.IsMessagesEnabled()
}
