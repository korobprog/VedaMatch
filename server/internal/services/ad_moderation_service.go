package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"rag-agent-server/internal/models"
	"strings"
	"time"
)

// AdModerationService handles AI-based moderation of ads
type AdModerationService struct {
	aiService *AiChatService
}

// ModerationResult contains the result of AI moderation
type ModerationResult struct {
	Score      float64  `json:"score"`      // 0-100, where 100 = fully safe
	Approved   bool     `json:"approved"`   // Auto-approved if score > 80
	Flags      []string `json:"flags"`      // Found issues
	Suggestion string   `json:"suggestion"` // Recommendation for admin
}

// NewAdModerationService creates a new moderation service
func NewAdModerationService() *AdModerationService {
	return &AdModerationService{
		aiService: NewAiChatService(),
	}
}

// CheckAd performs AI moderation on an ad
func (s *AdModerationService) CheckAd(ctx context.Context, ad *models.Ad) (*ModerationResult, error) {
	if s.aiService == nil {
		return nil, fmt.Errorf("AI service not initialized")
	}

	// Build moderation prompt
	prompt := fmt.Sprintf(`Ты модератор объявлений для духовного сообщества (ведическая культура, йога, аюрведа).
Проанализируй объявление:

Название: %s
Описание: %s
Категория: %s
Город: %s
Цена: %v

Проверь на:
1. Спам/мошенничество (подозрительные паттерны, просьбы перевести деньги)
2. Неуместный контент для духовного сообщества (оскорбления, насилие, наркотики, интим-услуги)
3. Соответствие выбранной категории
4. Качество текста (понятность, грамотность)

Ответь ТОЛЬКО в JSON формате без дополнительного текста:
{"score": 0-100, "flags": ["список проблем"], "suggestion": "рекомендация для модератора"}

Если объявление нормальное, score должен быть 80-100 и flags пустым.`,
		ad.Title,
		ad.Description,
		ad.Category,
		ad.City,
		formatPrice(ad),
	)

	// Create messages for AI
	messages := []models.ChatMessage{
		{
			Role:    "system",
			Content: "Ты - модератор объявлений. Отвечай только в JSON формате.",
		},
		{
			Role:    "user",
			Content: prompt,
		},
	}

	// Call AI service
	startTime := time.Now()
	response, err := s.aiService.GenerateResponse(ctx, messages, "gemini-2.5-flash", "")
	if err != nil {
		log.Printf("[AdModeration] AI error for ad %d: %v", ad.ID, err)
		// Return default safe result on error
		return &ModerationResult{
			Score:      70,
			Approved:   false,
			Flags:      []string{"AI moderation failed"},
			Suggestion: "Manual review required",
		}, nil
	}

	log.Printf("[AdModeration] AI response for ad %d in %v", ad.ID, time.Since(startTime))

	// Parse JSON response
	result := &ModerationResult{}

	// Clean response - extract JSON from potential markdown
	cleanedResponse := extractJSON(response)

	if err := json.Unmarshal([]byte(cleanedResponse), result); err != nil {
		log.Printf("[AdModeration] Failed to parse AI response: %v, raw: %s", err, response)
		return &ModerationResult{
			Score:      70,
			Approved:   false,
			Flags:      []string{"Failed to parse AI response"},
			Suggestion: "Manual review required",
		}, nil
	}

	// Set approved based on score
	result.Approved = result.Score >= 80

	return result, nil
}

// formatPrice formats the price for display
func formatPrice(ad *models.Ad) string {
	if ad.IsFree {
		return "Бесплатно"
	}
	if ad.Price == nil {
		return "Договорная"
	}
	return fmt.Sprintf("%.0f %s", *ad.Price, ad.Currency)
}

// extractJSON extracts JSON from potential markdown or text wrapping
func extractJSON(response string) string {
	// Try to find JSON in the response
	response = strings.TrimSpace(response)

	// Remove markdown code blocks
	if strings.HasPrefix(response, "```json") {
		response = strings.TrimPrefix(response, "```json")
		response = strings.TrimSuffix(response, "```")
	} else if strings.HasPrefix(response, "```") {
		response = strings.TrimPrefix(response, "```")
		response = strings.TrimSuffix(response, "```")
	}

	response = strings.TrimSpace(response)

	// Find JSON object
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	if start != -1 && end != -1 && end > start {
		return response[start : end+1]
	}

	return response
}
