package services

import (
	"context"
	"fmt"
	"rag-agent-server/internal/models"
	"regexp"
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

var supportEmailPattern = regexp.MustCompile(`(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b`)
var supportVersionPattern = regexp.MustCompile(`\b\d+\.\d+(\.\d+)?\b`)

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
		reply := sanitizeSupportReply(faqAnswer, language)
		reply = ensureSupportDiagnosticsPrompt(reply, text, language)
		return reply, 0.95, nil
	}

	if s.polza == nil || !s.polza.HasApiKey() {
		return "", 0, fmt.Errorf("support ai key is not configured")
	}

	prompt := supportSystemPrompt(language)

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

	reply = sanitizeSupportReply(reply, language)
	reply = ensureSupportDiagnosticsPrompt(reply, text, language)
	confidence := estimateSupportConfidence(reply)
	return strings.TrimSpace(reply), confidence, nil
}

func supportSystemPrompt(language string) string {
	if language == "ru" {
		return strings.Join([]string{
			"Ты помощник поддержки VedaMatch.",
			"Правила:",
			"- Поддержка ведется только в текущем чате.",
			"- Никогда не отправляй пользователя на email или в другие каналы.",
			"- Если нужен оператор, пиши, что оператор подключится в этом чате.",
			"- Для технических проблем сначала собери диагностику: платформа (Android/iOS/Web), модель устройства, версия ОС, версия приложения, шаги воспроизведения.",
			"- Если данных недостаточно, задай короткие уточняющие вопросы.",
			"- Отвечай кратко, по делу и без воды.",
		}, "\n")
	}

	return strings.Join([]string{
		"You are VedaMatch support assistant.",
		"Rules:",
		"- Support must stay in this chat only.",
		"- Never direct users to email or external channels.",
		"- If operator help is needed, say the operator will reply in this chat.",
		"- For technical issues, first collect diagnostics: platform (Android/iOS/Web), device model, OS version, app version, and reproduction steps.",
		"- Ask short clarifying questions when data is missing.",
		"- Keep responses concise and practical.",
	}, "\n")
}

func sanitizeSupportReply(reply string, language string) string {
	clean := strings.TrimSpace(reply)
	if clean == "" {
		return clean
	}

	lines := strings.Split(clean, "\n")
	filtered := make([]string, 0, len(lines))
	removedEmailGuidance := false
	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" {
			filtered = append(filtered, "")
			continue
		}
		lower := strings.ToLower(line)
		if supportEmailPattern.MatchString(line) ||
			strings.Contains(lower, "email") ||
			strings.Contains(lower, "e-mail") ||
			strings.Contains(lower, "почта") ||
			strings.Contains(lower, "почту") ||
			strings.Contains(lower, "по почте") {
			removedEmailGuidance = true
			continue
		}
		filtered = append(filtered, line)
	}

	clean = strings.TrimSpace(strings.Join(filtered, "\n"))
	if clean == "" {
		removedEmailGuidance = true
	}
	if removedEmailGuidance {
		if language == "ru" {
			if clean == "" {
				return "Поддержка работает прямо в этом чате. Опишите проблему, и мы поможем здесь."
			}
			return clean + "\n\nПоддержка ведется в этом чате. Если не помогло, напишите здесь, подключим оператора."
		}
		if clean == "" {
			return "Support works directly in this chat. Describe the issue and we will help here."
		}
		return clean + "\n\nSupport is handled in this chat. If needed, reply here and we will involve an operator."
	}
	return clean
}

func ensureSupportDiagnosticsPrompt(reply string, userText string, language string) string {
	cleanReply := strings.TrimSpace(reply)
	if cleanReply == "" {
		return cleanReply
	}
	if !isTechnicalSupportIssue(userText) {
		return cleanReply
	}
	if hasDiagnosticsDetails(userText) {
		return cleanReply
	}

	lowerReply := strings.ToLower(cleanReply)
	if strings.Contains(lowerReply, "версия ос") ||
		strings.Contains(lowerReply, "модель устройства") ||
		strings.Contains(lowerReply, "version") && strings.Contains(lowerReply, "device") {
		return cleanReply
	}

	if language == "ru" {
		return cleanReply + "\n\nЧтобы быстрее помочь, напишите: устройство (модель), версия ОС, версия приложения и что вы нажимаете перед ошибкой."
	}
	return cleanReply + "\n\nTo help faster, please share your device model, OS version, app version, and exact steps before the issue."
}

func isTechnicalSupportIssue(text string) bool {
	lower := strings.ToLower(strings.TrimSpace(text))
	if lower == "" {
		return false
	}
	keywords := []string{
		"не работает", "ошибка", "баг", "вылет", "crash", "doesn't work", "error",
		"android", "ios", "iphone", "ipad", "web", "кнопк", "экран", "portal", "портал",
		"обновлен", "update", "hang", "freeze", "завис",
	}
	for _, kw := range keywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func hasDiagnosticsDetails(text string) bool {
	lower := strings.ToLower(strings.TrimSpace(text))
	if lower == "" {
		return false
	}

	platformMention := strings.Contains(lower, "android") ||
		strings.Contains(lower, "ios") ||
		strings.Contains(lower, "iphone") ||
		strings.Contains(lower, "ipad") ||
		strings.Contains(lower, "web")
	versionMention := strings.Contains(lower, "версия") ||
		strings.Contains(lower, "version") ||
		supportVersionPattern.MatchString(lower)
	deviceMention := strings.Contains(lower, "устрой") ||
		strings.Contains(lower, "модель") ||
		strings.Contains(lower, "device") ||
		strings.Contains(lower, "model")

	return platformMention && (versionMention || deviceMention)
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
