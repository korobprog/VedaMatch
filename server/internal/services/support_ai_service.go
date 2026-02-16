package services

import (
	"context"
	"fmt"
	"rag-agent-server/internal/models"
	"sort"
	"strings"

	"gorm.io/gorm"
)

type SupportAIResponder interface {
	GenerateReply(ctx context.Context, userText string, language string) (reply string, confidence float64, err error)
}

type SupportAIService struct {
	db    *gorm.DB
	polza *PolzaService
}

func NewSupportAIService(db *gorm.DB) *SupportAIService {
	return &SupportAIService{
		db:    db,
		polza: GetPolzaService(),
	}
}

func (s *SupportAIService) GenerateReply(ctx context.Context, userText string, language string) (string, float64, error) {
	text := strings.TrimSpace(userText)
	if text == "" {
		return "", 0, fmt.Errorf("empty user text")
	}

	if faqAnswer, ok := s.matchFAQ(text); ok {
		return faqAnswer, 0.95, nil
	}

	if s.polza == nil || !s.polza.HasApiKey() {
		return "", 0, fmt.Errorf("support ai key is not configured")
	}

	prompt := "You are VedaMatch support assistant. Answer clearly and briefly."
	if language == "ru" {
		prompt = "Ты помощник поддержки VedaMatch. Отвечай кратко и по делу, дружелюбно."
	}

	messages := []map[string]string{
		{
			"role":    "system",
			"content": prompt,
		},
		{
			"role":    "user",
			"content": text,
		},
	}

	reply, err := s.polza.SendMessage("auto", messages)
	if err != nil {
		return "", 0, err
	}

	confidence := estimateSupportConfidence(reply)
	return strings.TrimSpace(reply), confidence, nil
}

func (s *SupportAIService) matchFAQ(userText string) (string, bool) {
	if s.db == nil {
		return "", false
	}

	var items []models.SupportFAQItem
	if err := s.db.Where("is_active = ?", true).Find(&items).Error; err != nil || len(items) == 0 {
		return "", false
	}

	lowerText := strings.ToLower(userText)
	type candidate struct {
		answer string
		score  int
	}
	candidates := make([]candidate, 0, len(items))

	for _, item := range items {
		score := item.Priority

		question := strings.ToLower(strings.TrimSpace(item.Question))
		if question != "" && strings.Contains(lowerText, question) {
			score += 20
		}

		for _, kw := range strings.Split(item.Keywords, ",") {
			keyword := strings.ToLower(strings.TrimSpace(kw))
			if keyword == "" {
				continue
			}
			if strings.Contains(lowerText, keyword) {
				score += 10
			}
		}

		if score > 0 {
			candidates = append(candidates, candidate{
				answer: item.Answer,
				score:  score,
			})
		}
	}

	if len(candidates) == 0 {
		return "", false
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].score > candidates[j].score
	})

	if candidates[0].score < 10 {
		return "", false
	}

	return strings.TrimSpace(candidates[0].answer), true
}

func estimateSupportConfidence(reply string) float64 {
	lower := strings.ToLower(strings.TrimSpace(reply))
	if lower == "" {
		return 0
	}

	lowSignals := []string{
		"не знаю",
		"не уверен",
		"cannot",
		"can't",
		"not sure",
		"не могу помочь",
	}
	for _, signal := range lowSignals {
		if strings.Contains(lower, signal) {
			return 0.3
		}
	}

	if len(lower) < 25 {
		return 0.45
	}

	return 0.7
}
