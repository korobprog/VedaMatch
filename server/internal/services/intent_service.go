package services

import (
	"log"
	"strings"
)

type IntentResult struct {
	TargetCategory string
	IsComplexTask  bool
	Content        string
	OriginalContent string
}

type IntentService struct{}

var instance *IntentService

func GetIntentService() *IntentService {
	if instance == nil {
		instance = &IntentService{}
	}
	return instance
}

func (s *IntentService) DetectIntent(messages []interface{}) IntentResult {
	result := IntentResult{
		TargetCategory: "text", // Default
		IsComplexTask:  false,
	}

	if len(messages) == 0 {
		return result
	}

	// Get last message
	lastMsg, ok := messages[len(messages)-1].(map[string]interface{})
	if !ok {
		return result
	}

	content, ok := lastMsg["content"].(string)
	if !ok {
		return result
	}

	result.Content = content
	result.OriginalContent = content
	lowerContent := strings.ToLower(content)

	log.Printf("[Intent] Analyzing content: %s", content)

	// Image Keywords (Extended)
	imageKeywords := []string{
		"draw", "image", "picture", "paint", "generate", "sketch", "illustration", "artwork", "photo", "portrait",
		"нарисуй", "изобрази", "картинк", "изображен", "фото", "рисунок", "арт", "создай картинку", "сгенерируй", "портрет", "пейзаж", "эскиз",
	}

	for _, kw := range imageKeywords {
		if strings.Contains(lowerContent, kw) {
			result.TargetCategory = "image"
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
			result.IsComplexTask = true
			break
		}
	}

	return result
}

func (s *IntentService) ContainsCyrillic(str string) bool {
	for _, r := range str {
		if (r >= 'а' && r <= 'я') || (r >= 'А' && r <= 'Я') || r == 'ё' || r == 'Ё' {
			return true
		}
	}
	return false
}
