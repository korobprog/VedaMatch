package services

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	defaultTutorTopK          = 6
	maxTutorTopK              = 12
	defaultTutorRetentionDays = 180
	defaultTutorSweepMinutes  = 360
)

type TutorHistoryMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type TutorTurnRequest struct {
	UserID         uint                  `json:"-"`
	Message        string                `json:"message"`
	History        []TutorHistoryMessage `json:"history"`
	TopK           int                   `json:"topK"`
	ForceReasoning bool                  `json:"forceReasoning"`
}

type TutorModelInfo struct {
	Selected     string `json:"selected"`
	Route        string `json:"route"`
	FallbackUsed bool   `json:"fallbackUsed"`
}

type WeakTopicSnapshot struct {
	TopicKey   string    `json:"topicKey"`
	TopicLabel string    `json:"topicLabel"`
	Mastery    float64   `json:"mastery"`
	LastSeenAt time.Time `json:"lastSeenAt"`
	Source     string    `json:"source"`
}

type TutorTurnResponse struct {
	Reply            string              `json:"reply"`
	AssistantContext AssistantContext    `json:"assistant_context"`
	WeakTopics       []WeakTopicSnapshot `json:"weak_topics"`
	Model            TutorModelInfo      `json:"model"`
}

type TutorMemoryClearResult struct {
	MemoryDocs    int64 `json:"memoryDocs"`
	WeakTopicDocs int64 `json:"weakTopicDocs"`
	WeakTopics    int64 `json:"weakTopics"`
}

type TutorLatencySummary struct {
	WindowHours         int     `json:"window_hours"`
	TurnCount           int64   `json:"turn_count"`
	RetrievalCount      int64   `json:"retrieval_count"`
	TurnLatencyP95      int64   `json:"turn_latency_p95"`
	RetrievalLatencyP95 int64   `json:"retrieval_latency_p95"`
	TurnLatencyAvg      int64   `json:"turn_latency_avg"`
	RetrievalLatencyAvg int64   `json:"retrieval_latency_avg"`
	NoDataTurns         int64   `json:"no_data_turns"`
	NoDataRate          float64 `json:"no_data_rate"`
}

type extractorPayload struct {
	Memories   []extractorMemory    `json:"memories"`
	WeakTopics []extractorWeakTopic `json:"weak_topics"`
}

type extractorMemory struct {
	Kind       string  `json:"kind"`
	Content    string  `json:"content"`
	Importance float64 `json:"importance"`
}

type extractorWeakTopic struct {
	TopicKey   string  `json:"topic_key"`
	TopicLabel string  `json:"topic_label"`
	Severity   float64 `json:"severity"`
}

type EducationTutorService struct {
	db              *gorm.DB
	polza           *PolzaService
	domainAssistant *DomainAssistantService
	metrics         *MetricsService
}

var (
	educationTutorOnce      sync.Once
	educationTutorInstance  *EducationTutorService
	educationTutorSweepOnce sync.Once
	jsonFencePattern        = regexp.MustCompile("(?s)```(?:json)?\\s*(\\{.*?\\})\\s*```")
)

func GetEducationTutorService() *EducationTutorService {
	educationTutorOnce.Do(func() {
		educationTutorInstance = NewEducationTutorService(database.DB)
	})
	return educationTutorInstance
}

func NewEducationTutorService(db *gorm.DB) *EducationTutorService {
	domainAssistant := GetDomainAssistantService()
	if db != nil {
		// Use DB-bound instance here to avoid stale singleton DB pointer in tests/runtime init races.
		domainAssistant = NewDomainAssistantService(db)
	}

	return &EducationTutorService{
		db:              db,
		polza:           GetPolzaService(),
		domainAssistant: domainAssistant,
		metrics:         GetMetricsService(),
	}
}

func (s *EducationTutorService) IsEnabled() bool {
	return s.getBoolConfig("EDU_TUTOR_ENABLED", true)
}

func (s *EducationTutorService) IsMemoryEnabled() bool {
	return s.getBoolConfig("EDU_TUTOR_MEMORY_ENABLED", true)
}

func (s *EducationTutorService) IsExtractorEnabled() bool {
	return s.getBoolConfig("EDU_TUTOR_EXTRACTOR_ENABLED", true)
}

func (s *EducationTutorService) retentionDays() int {
	value := strings.TrimSpace(s.getConfigValue("EDU_TUTOR_RETENTION_DAYS"))
	if value == "" {
		return defaultTutorRetentionDays
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return defaultTutorRetentionDays
	}
	return parsed
}

func (s *EducationTutorService) retentionSweepMinutes() int {
	value := strings.TrimSpace(s.getConfigValue("EDU_TUTOR_RETENTION_SWEEP_MINUTES"))
	if value == "" {
		return defaultTutorSweepMinutes
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return defaultTutorSweepMinutes
	}
	return parsed
}

func (s *EducationTutorService) isDomainAllowed(domain string) bool {
	allowed := strings.TrimSpace(s.getConfigValue("EDU_TUTOR_ALLOWED_DOMAINS"))
	if allowed == "" {
		return domain == "education"
	}
	for _, p := range strings.Split(allowed, ",") {
		if strings.EqualFold(strings.TrimSpace(p), domain) {
			return true
		}
	}
	return false
}

func (s *EducationTutorService) Turn(ctx context.Context, req TutorTurnRequest) (*TutorTurnResponse, error) {
	if !s.IsEnabled() {
		return nil, fmt.Errorf("education tutor is disabled")
	}
	if !s.isDomainAllowed("education") {
		return nil, fmt.Errorf("education domain is not allowed")
	}

	message := strings.TrimSpace(req.Message)
	if message == "" {
		return nil, fmt.Errorf("message is required")
	}
	if req.UserID == 0 {
		return nil, fmt.Errorf("user is required")
	}

	topK := req.TopK
	if topK <= 0 {
		topK = defaultTutorTopK
	}
	if topK > maxTutorTopK {
		topK = maxTutorTopK
	}

	turnStartedAt := time.Now()
	turnSourcesCount := 0
	turnConfidence := 0.0
	defer func() {
		latencyMs := time.Since(turnStartedAt).Milliseconds()
		if latencyMs <= 0 {
			latencyMs = 1
		}
		s.recordLatencyEvent(models.EduTutorLatencyKindTurn, req.UserID, latencyMs, turnSourcesCount, turnConfidence)
		s.incrementMetric(MetricEduTutorTurnLatencyMsTotal, latencyMs)
	}()

	userLanguage := s.detectUserLanguage(req.UserID, message)

	s.incrementMetric(MetricEduTutorTurnTotal, 1)

	extracted := extractorPayload{}
	if s.IsExtractorEnabled() && s.polza != nil && s.polza.HasApiKey() {
		payload, err := s.extractSignals(ctx, message, userLanguage)
		if err != nil {
			log.Printf("[EducationTutor] extractor warning user=%d err=%v", req.UserID, err)
			s.incrementMetric(MetricEduTutorExtractorFailTotal, 1)
		} else {
			extracted = payload
		}
	}

	if s.IsMemoryEnabled() {
		changes, err := s.storeExtractionSignals(ctx, req.UserID, userLanguage, extracted)
		if err != nil {
			log.Printf("[EducationTutor] store extraction warning user=%d err=%v", req.UserID, err)
		} else if changes > 0 {
			s.incrementMetric(MetricEduTutorMemoryUpsertTotal, changes)
		}
	}

	retrievalStartedAt := time.Now()
	ctxResp, err := s.domainAssistant.BuildAssistantContext(ctx, DomainContextRequest{
		Query:          message,
		Domains:        []string{"education"},
		TopK:           topK,
		UserID:         req.UserID,
		IncludePrivate: true,
		StrictRouting:  false,
	})
	retrievalLatencyMs := time.Since(retrievalStartedAt).Milliseconds()
	if retrievalLatencyMs <= 0 {
		retrievalLatencyMs = 1
	}
	if err != nil {
		s.incrementMetric(MetricEduTutorRetrievalErrorTotal, 1)
		return nil, err
	}
	retrievalSourcesCount := 0
	retrievalConfidence := 0.0
	if ctxResp != nil {
		retrievalSourcesCount = len(ctxResp.Sources)
		retrievalConfidence = ctxResp.Confidence
	}
	s.recordLatencyEvent(models.EduTutorLatencyKindRetrieval, req.UserID, retrievalLatencyMs, retrievalSourcesCount, retrievalConfidence)
	s.incrementMetric(MetricEduTutorRetrievalLatencyMsTotal, retrievalLatencyMs)

	turnSourcesCount = retrievalSourcesCount
	turnConfidence = retrievalConfidence

	weakTopics, err := s.GetWeakTopics(req.UserID)
	if err != nil {
		log.Printf("[EducationTutor] weak topics read warning user=%d err=%v", req.UserID, err)
	}

	if ctxResp == nil || len(ctxResp.Sources) == 0 {
		s.incrementMetric(MetricEduTutorNoDataTotal, 1)
		return &TutorTurnResponse{
			Reply: "не найдено достаточно данных",
			AssistantContext: AssistantContext{
				Domains:         []string{"education"},
				Sources:         []AssistantSource{},
				Confidence:      0,
				Language:        userLanguage,
				VisibilityScope: "public+user",
			},
			WeakTopics: weakTopics,
			Model: TutorModelInfo{
				Selected:     "",
				Route:        "none",
				FallbackUsed: false,
			},
		}, nil
	}

	if s.polza == nil || !s.polza.HasApiKey() {
		return &TutorTurnResponse{
			Reply:            s.domainAssistant.AppendSources("не найдено достаточно данных", ctxResp),
			AssistantContext: ctxResp.AssistantContext,
			WeakTopics:       weakTopics,
			Model: TutorModelInfo{
				Selected:     "",
				Route:        "none",
				FallbackUsed: false,
			},
		}, nil
	}

	modelRoute, primaryModel := s.selectModel(req, message)
	assistantReply, usedModel, fallbackUsed, genErr := s.generateTutorReply(ctxResp, weakTopics, req.History, message, userLanguage, modelRoute, primaryModel)
	if genErr != nil {
		return nil, genErr
	}

	if s.domainAssistant != nil {
		assistantReply = s.domainAssistant.AppendSources(assistantReply, ctxResp)
	}

	log.Printf("[EducationTutor] user_id=%d domains=%v retriever=%s sources=%d confidence=%.2f model=%s fallback=%v",
		req.UserID,
		ctxResp.Domains,
		ctxResp.RetrieverPath,
		len(ctxResp.Sources),
		ctxResp.Confidence,
		usedModel,
		fallbackUsed,
	)

	return &TutorTurnResponse{
		Reply:            strings.TrimSpace(assistantReply),
		AssistantContext: ctxResp.AssistantContext,
		WeakTopics:       weakTopics,
		Model: TutorModelInfo{
			Selected:     usedModel,
			Route:        modelRoute,
			FallbackUsed: fallbackUsed,
		},
	}, nil
}

func (s *EducationTutorService) GetWeakTopics(userID uint) ([]WeakTopicSnapshot, error) {
	if userID == 0 {
		return []WeakTopicSnapshot{}, nil
	}

	var topics []models.EducationWeakTopic
	if err := s.db.Where("user_id = ?", userID).
		Order("mastery ASC").
		Order("last_seen_at DESC").
		Limit(5).
		Find(&topics).Error; err != nil {
		return nil, err
	}

	out := make([]WeakTopicSnapshot, 0, len(topics))
	for _, topic := range topics {
		out = append(out, WeakTopicSnapshot{
			TopicKey:   topic.TopicKey,
			TopicLabel: topic.TopicLabel,
			Mastery:    roundTutor(clamp01(topic.Mastery), 4),
			LastSeenAt: topic.LastSeenAt,
			Source:     topic.Source,
		})
	}
	return out, nil
}

func (s *EducationTutorService) ClearMemory(userID uint, scope string) (*TutorMemoryClearResult, error) {
	if userID == 0 {
		return nil, fmt.Errorf("user is required")
	}

	scope = strings.ToLower(strings.TrimSpace(scope))
	if scope == "" {
		scope = "all"
	}
	if scope != "all" && scope != "memory" && scope != "weak_topics" {
		return nil, fmt.Errorf("invalid scope")
	}

	result := &TutorMemoryClearResult{}

	if scope == "all" || scope == "memory" {
		deleteQuery := s.db.Where("domain = ? AND visibility_scope = ? AND user_id = ? AND source_type = ?",
			"education", models.VisibilityScopeUser, userID, "tutor_memory")
		if tx := deleteQuery.Delete(&models.AssistantDocument{}); tx.Error != nil {
			return nil, tx.Error
		} else {
			result.MemoryDocs = tx.RowsAffected
		}
	}

	if scope == "all" || scope == "weak_topics" {
		deleteWeakDocs := s.db.Where("domain = ? AND visibility_scope = ? AND user_id = ? AND source_type = ?",
			"education", models.VisibilityScopeUser, userID, "tutor_weak_topic")
		if tx := deleteWeakDocs.Delete(&models.AssistantDocument{}); tx.Error != nil {
			return nil, tx.Error
		} else {
			result.WeakTopicDocs = tx.RowsAffected
		}

		deleteWeakTopics := s.db.Where("user_id = ?", userID).Delete(&models.EducationWeakTopic{})
		if deleteWeakTopics.Error != nil {
			return nil, deleteWeakTopics.Error
		}
		result.WeakTopics = deleteWeakTopics.RowsAffected
	}

	return result, nil
}

func (s *EducationTutorService) UpsertExamSignal(userID uint, moduleID uint, score int, totalPoints int, passed bool) error {
	if userID == 0 || moduleID == 0 {
		return nil
	}

	moduleTitle := fmt.Sprintf("Module %d", moduleID)
	var module models.EducationModule
	if err := s.db.Select("id", "title").Where("id = ?", moduleID).First(&module).Error; err == nil {
		if strings.TrimSpace(module.Title) != "" {
			moduleTitle = module.Title
		}
	}

	denominator := totalPoints
	if denominator <= 0 {
		denominator = 1
	}
	ratio := float64(score) / float64(denominator)

	topicKey := normalizeTopicKey(moduleTitle)
	if topicKey == "" {
		topicKey = fmt.Sprintf("module_%d", moduleID)
	}

	now := time.Now().UTC()
	updated, err := s.upsertWeakTopic(userID, topicKey, moduleTitle, models.WeakTopicSourceExam, now, map[string]interface{}{
		"moduleId": moduleID,
		"score":    score,
		"total":    totalPoints,
		"passed":   passed,
		"ratio":    roundTutor(ratio, 4),
	}, func(old float64) float64 {
		next := old*0.7 + ratio*0.3
		if !passed {
			next -= 0.05
		}
		if passed && ratio >= 0.9 {
			next += 0.03
		}
		return next
	})
	if err != nil {
		return err
	}

	if s.IsMemoryEnabled() {
		language := s.detectUserLanguage(userID, moduleTitle)
		if err := s.upsertWeakTopicDocument(language, updated); err != nil {
			log.Printf("[EducationTutor] weak topic doc upsert warning user=%d topic=%s err=%v", userID, topicKey, err)
		}
	}

	return nil
}

func (s *EducationTutorService) generateTutorReply(
	ctxResp *DomainContextResponse,
	weakTopics []WeakTopicSnapshot,
	history []TutorHistoryMessage,
	userMessage string,
	userLanguage string,
	modelRoute string,
	primaryModel string,
) (string, string, bool, error) {
	if s.polza == nil {
		return "", "", false, fmt.Errorf("polza is not initialized")
	}

	systemPrompt := s.buildTutorSystemPrompt(userLanguage, ctxResp, weakTopics)
	messages := make([]map[string]string, 0, 2+len(history)+1)
	messages = append(messages, map[string]string{
		"role":    "system",
		"content": systemPrompt,
	})

	filteredHistory := clampHistory(history, 12)
	for _, h := range filteredHistory {
		role := strings.ToLower(strings.TrimSpace(h.Role))
		if role != "assistant" && role != "user" {
			continue
		}
		content := strings.TrimSpace(h.Content)
		if content == "" {
			continue
		}
		messages = append(messages, map[string]string{
			"role":    role,
			"content": content,
		})
	}

	messages = append(messages, map[string]string{
		"role":    "user",
		"content": strings.TrimSpace(userMessage),
	})

	if primaryModel == "" {
		primaryModel = s.polza.GetFastModel()
	}

	reply, err := s.polza.SendMessage(primaryModel, messages)
	if err == nil {
		return reply, primaryModel, false, nil
	}

	fallbacks := []string{"gemini-2.5-flash-lite", "gpt-4o-mini"}
	for _, fallback := range fallbacks {
		if fallback == "" || fallback == primaryModel {
			continue
		}
		reply, fbErr := s.polza.SendMessage(fallback, messages)
		if fbErr == nil {
			return reply, fallback, true, nil
		}
		log.Printf("[EducationTutor] fallback model failed route=%s model=%s err=%v", modelRoute, fallback, fbErr)
	}

	return "", primaryModel, false, err
}

func (s *EducationTutorService) buildTutorSystemPrompt(language string, ctxResp *DomainContextResponse, weakTopics []WeakTopicSnapshot) string {
	var b strings.Builder
	if language == "ru" {
		b.WriteString("Ты AI Tutor для раздела Education в приложении VedicAI.\n")
		b.WriteString("Правила:\n")
		b.WriteString("- Используй только факты из Assistant context.\n")
		b.WriteString("- Если фактов недостаточно, ответь ровно: \"не найдено достаточно данных\".\n")
		b.WriteString("- Давай краткое, понятное и практичное объяснение.\n")
		b.WriteString("- В конце всегда добавляй 1-2 источника.\n")
	} else {
		b.WriteString("You are AI Tutor for Education in VedicAI.\n")
		b.WriteString("Rules:\n")
		b.WriteString("- Use only facts from Assistant context.\n")
		b.WriteString("- If facts are insufficient, answer exactly: \"не найдено достаточно данных\".\n")
		b.WriteString("- Keep explanations concise and practical.\n")
		b.WriteString("- Always include 1-2 sources at the end.\n")
	}

	if s.domainAssistant != nil && ctxResp != nil {
		snippet := strings.TrimSpace(s.domainAssistant.BuildPromptSnippet(ctxResp))
		if snippet != "" {
			b.WriteString("\n")
			b.WriteString(snippet)
			b.WriteString("\n")
		}
	}

	if len(weakTopics) > 0 {
		if language == "ru" {
			b.WriteString("\nСлабые темы пользователя (используй только как подсказку для объяснения):\n")
		} else {
			b.WriteString("\nUser weak topics (use only to shape explanation):\n")
		}
		for i, topic := range weakTopics {
			b.WriteString(fmt.Sprintf("- [%d] %s (mastery=%.2f)\n", i+1, topic.TopicLabel, topic.Mastery))
		}
	}

	return strings.TrimSpace(b.String())
}

func (s *EducationTutorService) selectModel(req TutorTurnRequest, message string) (string, string) {
	if req.ForceReasoning {
		return "reasoning", s.polza.GetReasoningModel()
	}

	classification := "fast"
	if s.polza != nil {
		classification = s.polza.ClassifyQuery([]map[string]string{
			{"role": "user", "content": message},
		})
	}
	if classification == "reasoning" {
		return "reasoning", s.polza.GetReasoningModel()
	}
	return "fast", s.polza.GetFastModel()
}

func (s *EducationTutorService) extractSignals(ctx context.Context, userMessage string, language string) (extractorPayload, error) {
	payload := extractorPayload{
		Memories:   []extractorMemory{},
		WeakTopics: []extractorWeakTopic{},
	}
	if s.polza == nil {
		return payload, fmt.Errorf("polza is not initialized")
	}

	systemPrompt := "Extract structured learning signals from a student message. Return JSON only."
	if language == "ru" {
		systemPrompt = "Извлеки структурированные сигналы обучения из сообщения пользователя. Верни только JSON."
	}

	template := `{
  "memories": [{"kind":"preference","content":"...","importance":0.7}],
  "weak_topics": [{"topic_key":"recursion","topic_label":"Рекурсия","severity":0.8}]
}`

	userPrompt := fmt.Sprintf("Message:\n%s\n\nOutput schema:\n%s\nRules:\n- If nothing found, return empty arrays.\n- importance/severity range is 0..1.\n- topic_key must be short snake_case.", strings.TrimSpace(userMessage), template)
	if language == "ru" {
		userPrompt = fmt.Sprintf("Сообщение:\n%s\n\nСхема ответа:\n%s\nПравила:\n- Если ничего не найдено, верни пустые массивы.\n- importance/severity в диапазоне 0..1.\n- topic_key в snake_case.", strings.TrimSpace(userMessage), template)
	}

	raw, err := s.polza.SendMessage(s.polza.GetFastModel(), []map[string]string{
		{"role": "system", "content": systemPrompt},
		{"role": "user", "content": userPrompt},
	})
	if err != nil {
		return payload, err
	}

	parsed, err := parseExtractorPayload(raw)
	if err != nil {
		return payload, err
	}

	return parsed, nil
}

func (s *EducationTutorService) storeExtractionSignals(ctx context.Context, userID uint, language string, extracted extractorPayload) (int64, error) {
	if userID == 0 {
		return 0, nil
	}

	changes := int64(0)
	now := time.Now().UTC()

	for _, mem := range extracted.Memories {
		content := normalizeTutorText(mem.Content)
		kind := normalizeTopicKey(mem.Kind)
		if content == "" || kind == "" {
			continue
		}
		fingerprint := hashMemoryFingerprint(kind + "|" + content)
		title := strings.TrimSpace(mem.Kind)
		if title == "" {
			title = "memory"
		}
		doc := models.AssistantDocument{
			Domain:          "education",
			SourceType:      "tutor_memory",
			SourceID:        fingerprint,
			Title:           title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/education/tutor/memory/%s", fingerprint),
			Language:        firstNonEmptyTutor(language, detectLanguageTutor(content)),
			VisibilityScope: models.VisibilityScopeUser,
			UserID:          userID,
			Metadata: map[string]interface{}{
				"kind":       mem.Kind,
				"importance": roundTutor(clamp01(mem.Importance), 4),
			},
		}
		if err := s.upsertAssistantDocument(ctx, doc); err != nil {
			return changes, err
		}
		changes++
	}

	for _, weak := range extracted.WeakTopics {
		topicKey := normalizeTopicKey(weak.TopicKey)
		if topicKey == "" {
			topicKey = normalizeTopicKey(weak.TopicLabel)
		}
		if topicKey == "" {
			continue
		}
		label := strings.TrimSpace(weak.TopicLabel)
		if label == "" {
			label = topicKey
		}
		updated, err := s.upsertWeakTopic(userID, topicKey, label, models.WeakTopicSourceLLM, now, map[string]interface{}{
			"severity": roundTutor(clamp01(weak.Severity), 4),
		}, func(old float64) float64 {
			return old - 0.10*clamp01(weak.Severity)
		})
		if err != nil {
			return changes, err
		}
		if err := s.upsertWeakTopicDocument(language, updated); err != nil {
			return changes, err
		}
		changes++
	}

	return changes, nil
}

func (s *EducationTutorService) CleanupExpiredData(ctx context.Context) error {
	if s.db == nil {
		return fmt.Errorf("database is not initialized")
	}

	cutoff := time.Now().UTC().AddDate(0, 0, -s.retentionDays())

	docsTx := s.db.WithContext(ctx).Where(
		"domain = ? AND visibility_scope = ? AND source_type IN ? AND updated_at < ?",
		"education",
		models.VisibilityScopeUser,
		[]string{"tutor_memory", "tutor_weak_topic"},
		cutoff,
	).Delete(&models.AssistantDocument{})
	if docsTx.Error != nil {
		s.incrementMetric(MetricEduTutorRetentionCleanupErrorTotal, 1)
		return docsTx.Error
	}

	weakTx := s.db.WithContext(ctx).Where("last_seen_at < ?", cutoff).Delete(&models.EducationWeakTopic{})
	if weakTx.Error != nil {
		s.incrementMetric(MetricEduTutorRetentionCleanupErrorTotal, 1)
		return weakTx.Error
	}

	latencyTx := s.db.WithContext(ctx).Where("created_at < ?", cutoff).Delete(&models.EducationTutorLatencyEvent{})
	if latencyTx.Error != nil {
		s.incrementMetric(MetricEduTutorRetentionCleanupErrorTotal, 1)
		return latencyTx.Error
	}

	s.incrementMetric(MetricEduTutorRetentionCleanupTotal, 1)
	if docsTx.RowsAffected > 0 {
		s.incrementMetric(MetricEduTutorRetentionDocsDeletedTotal, docsTx.RowsAffected)
	}
	if weakTx.RowsAffected > 0 {
		s.incrementMetric(MetricEduTutorRetentionWeakDeletedTotal, weakTx.RowsAffected)
	}

	log.Printf("[EducationTutor] retention_cleanup cutoff=%s docs=%d weak_topics=%d latency_events=%d",
		cutoff.Format(time.RFC3339),
		docsTx.RowsAffected,
		weakTx.RowsAffected,
		latencyTx.RowsAffected,
	)

	return nil
}

func (s *EducationTutorService) GetLatencySummary(window time.Duration) (*TutorLatencySummary, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database is not initialized")
	}
	if window <= 0 {
		window = 24 * time.Hour
	}

	cutoff := time.Now().UTC().Add(-window)
	var events []models.EducationTutorLatencyEvent
	if err := s.db.Where("created_at >= ?", cutoff).Find(&events).Error; err != nil {
		return nil, err
	}

	turnLatencies := make([]int64, 0, len(events))
	retrievalLatencies := make([]int64, 0, len(events))
	noDataTurns := int64(0)
	turnLatencySum := int64(0)
	retrievalLatencySum := int64(0)

	for _, event := range events {
		switch event.Kind {
		case models.EduTutorLatencyKindTurn:
			turnLatencies = append(turnLatencies, event.LatencyMs)
			turnLatencySum += event.LatencyMs
			if event.SourcesCount == 0 {
				noDataTurns++
			}
		case models.EduTutorLatencyKindRetrieval:
			retrievalLatencies = append(retrievalLatencies, event.LatencyMs)
			retrievalLatencySum += event.LatencyMs
		}
	}

	summary := &TutorLatencySummary{
		WindowHours:    durationHoursRoundedUp(window),
		TurnCount:      int64(len(turnLatencies)),
		RetrievalCount: int64(len(retrievalLatencies)),
		NoDataTurns:    noDataTurns,
	}

	summary.TurnLatencyP95 = latencyP95(turnLatencies)
	summary.RetrievalLatencyP95 = latencyP95(retrievalLatencies)

	if summary.TurnCount > 0 {
		summary.TurnLatencyAvg = int64(math.Round(float64(turnLatencySum) / float64(summary.TurnCount)))
		summary.NoDataRate = roundTutor((float64(noDataTurns)/float64(summary.TurnCount))*100, 2)
	}
	if summary.RetrievalCount > 0 {
		summary.RetrievalLatencyAvg = int64(math.Round(float64(retrievalLatencySum) / float64(summary.RetrievalCount)))
	}

	return summary, nil
}

func StartEducationTutorRetentionScheduler() {
	educationTutorSweepOnce.Do(func() {
		service := GetEducationTutorService()
		if service == nil {
			log.Printf("[EducationTutor] retention scheduler skipped: service is nil")
			return
		}

		interval := time.Duration(service.retentionSweepMinutes()) * time.Minute
		if interval <= 0 {
			interval = time.Duration(defaultTutorSweepMinutes) * time.Minute
		}

		run := func() {
			if err := service.CleanupExpiredData(context.Background()); err != nil {
				log.Printf("[EducationTutor] retention cleanup error: %v", err)
			}
		}

		run()

		ticker := time.NewTicker(interval)
		go func() {
			for range ticker.C {
				run()
			}
		}()

		log.Printf("[EducationTutor] retention scheduler started interval=%s", interval.String())
	})
}

func (s *EducationTutorService) upsertWeakTopic(
	userID uint,
	topicKey string,
	topicLabel string,
	source string,
	lastSeenAt time.Time,
	meta map[string]interface{},
	masteryUpdate func(old float64) float64,
) (*models.EducationWeakTopic, error) {
	if userID == 0 {
		return nil, fmt.Errorf("user is required")
	}
	if strings.TrimSpace(topicKey) == "" {
		return nil, fmt.Errorf("topic key is required")
	}

	normalizedKey := normalizeTopicKey(topicKey)
	if normalizedKey == "" {
		return nil, fmt.Errorf("invalid topic key")
	}
	topicKey = normalizedKey
	if strings.TrimSpace(topicLabel) == "" {
		topicLabel = topicKey
	}
	if source != models.WeakTopicSourceExam && source != models.WeakTopicSourceLLM {
		source = models.WeakTopicSourceLLM
	}

	var result models.EducationWeakTopic
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var existing models.EducationWeakTopic
		findErr := tx.Where("user_id = ? AND topic_key = ?", userID, topicKey).First(&existing).Error
		switch {
		case findErr == nil:
		case findErr != nil && !isRecordNotFound(findErr):
			return findErr
		default:
			existing = models.EducationWeakTopic{
				UserID:       userID,
				TopicKey:     topicKey,
				TopicLabel:   topicLabel,
				Mastery:      0.5,
				Source:       source,
				LastSeenAt:   lastSeenAt,
				SignalsCount: 0,
			}
		}

		oldMastery := clamp01(existing.Mastery)
		nextMastery := clamp01(oldMastery)
		if masteryUpdate != nil {
			nextMastery = clamp01(masteryUpdate(oldMastery))
		}

		existing.TopicLabel = topicLabel
		existing.Mastery = roundTutor(nextMastery, 4)
		existing.Source = source
		existing.LastSeenAt = lastSeenAt
		existing.SignalsCount = existing.SignalsCount + 1
		existing.Metadata = mergeJSONMaps(existing.Metadata, meta)

		if existing.ID == 0 {
			if createErr := tx.Create(&existing).Error; createErr != nil {
				return createErr
			}
		} else {
			if saveErr := tx.Save(&existing).Error; saveErr != nil {
				return saveErr
			}
		}

		result = existing
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &result, nil
}

func (s *EducationTutorService) upsertWeakTopicDocument(language string, weakTopic *models.EducationWeakTopic) error {
	if weakTopic == nil {
		return nil
	}
	content := fmt.Sprintf("Слабая тема: %s. Mastery: %.2f. Последний сигнал: %s.",
		weakTopic.TopicLabel,
		clamp01(weakTopic.Mastery),
		weakTopic.Source,
	)
	if detectLanguageTutor(language) == "en" {
		content = fmt.Sprintf("Weak topic: %s. Mastery: %.2f. Last signal source: %s.",
			weakTopic.TopicLabel,
			clamp01(weakTopic.Mastery),
			weakTopic.Source,
		)
	}

	doc := models.AssistantDocument{
		Domain:          "education",
		SourceType:      "tutor_weak_topic",
		SourceID:        weakTopic.TopicKey,
		Title:           weakTopic.TopicLabel,
		Content:         content,
		SourceURL:       fmt.Sprintf("/education/tutor/weak-topics/%s", weakTopic.TopicKey),
		Language:        firstNonEmptyTutor(language, "ru"),
		VisibilityScope: models.VisibilityScopeUser,
		UserID:          weakTopic.UserID,
		Metadata: map[string]interface{}{
			"mastery":    roundTutor(clamp01(weakTopic.Mastery), 4),
			"source":     weakTopic.Source,
			"signals":    weakTopic.SignalsCount,
			"lastSeenAt": weakTopic.LastSeenAt.UTC().Format(time.RFC3339),
		},
	}
	return s.upsertAssistantDocument(context.Background(), doc)
}

func (s *EducationTutorService) upsertAssistantDocument(ctx context.Context, doc models.AssistantDocument) error {
	if s.db == nil {
		return fmt.Errorf("database is not initialized")
	}
	if strings.TrimSpace(doc.Domain) == "" || strings.TrimSpace(doc.SourceType) == "" || strings.TrimSpace(doc.SourceID) == "" {
		return fmt.Errorf("assistant document key fields are required")
	}
	if strings.TrimSpace(doc.Content) == "" {
		return nil
	}

	doc.Domain = strings.TrimSpace(doc.Domain)
	doc.SourceType = strings.TrimSpace(doc.SourceType)
	doc.SourceID = strings.TrimSpace(doc.SourceID)
	doc.Title = strings.TrimSpace(doc.Title)
	doc.Content = strings.TrimSpace(doc.Content)
	doc.SourceURL = strings.TrimSpace(doc.SourceURL)
	doc.Language = firstNonEmptyTutor(strings.TrimSpace(doc.Language), detectLanguageTutor(doc.Title+" "+doc.Content))
	doc.VisibilityScope = firstNonEmptyTutor(strings.TrimSpace(doc.VisibilityScope), models.VisibilityScopeUser)
	doc.UserID = doc.UserID
	if doc.Metadata == nil {
		doc.Metadata = map[string]interface{}{}
	}

	updates := map[string]interface{}{
		"title":      doc.Title,
		"content":    doc.Content,
		"source_url": doc.SourceURL,
		"metadata":   doc.Metadata,
		"updated_at": time.Now().UTC(),
	}

	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "domain"},
			{Name: "source_type"},
			{Name: "source_id"},
			{Name: "language"},
			{Name: "visibility_scope"},
			{Name: "user_id"},
		},
		DoUpdates: clause.Assignments(updates),
	}).Create(&doc).Error
}

func (s *EducationTutorService) detectUserLanguage(userID uint, fallbackText string) string {
	if s.db != nil && userID != 0 {
		var user models.User
		if err := s.db.Select("id", "language").Where("id = ?", userID).First(&user).Error; err == nil {
			lang := detectLanguageTutor(user.Language)
			if lang != "" {
				return lang
			}
		}
	}
	return detectLanguageTutor(fallbackText)
}

func (s *EducationTutorService) getBoolConfig(key string, fallback bool) bool {
	value := strings.TrimSpace(s.getConfigValue(key))
	if value == "" {
		return fallback
	}
	switch strings.ToLower(value) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func (s *EducationTutorService) getConfigValue(key string) string {
	if s.db != nil {
		var setting models.SystemSetting
		if err := s.db.Where("key = ?", key).First(&setting).Error; err == nil {
			if strings.TrimSpace(setting.Value) != "" {
				return strings.TrimSpace(setting.Value)
			}
		}
	}
	return strings.TrimSpace(os.Getenv(key))
}

func (s *EducationTutorService) incrementMetric(key string, delta int64) {
	if s.metrics == nil {
		return
	}
	if err := s.metrics.Increment(key, delta); err != nil {
		log.Printf("[EducationTutor] metric warning key=%s err=%v", key, err)
	}
}

func (s *EducationTutorService) recordLatencyEvent(kind string, userID uint, latencyMs int64, sourcesCount int, confidence float64) {
	if s.db == nil {
		return
	}
	if latencyMs <= 0 {
		latencyMs = 1
	}
	if kind != models.EduTutorLatencyKindTurn && kind != models.EduTutorLatencyKindRetrieval {
		return
	}

	event := models.EducationTutorLatencyEvent{
		UserID:       userID,
		Kind:         kind,
		LatencyMs:    latencyMs,
		SourcesCount: sourcesCount,
		Confidence:   roundTutor(clamp01(confidence), 4),
	}
	if err := s.db.Create(&event).Error; err != nil {
		log.Printf("[EducationTutor] latency event write warning kind=%s err=%v", kind, err)
	}
}

func parseExtractorPayload(raw string) (extractorPayload, error) {
	payload := extractorPayload{
		Memories:   []extractorMemory{},
		WeakTopics: []extractorWeakTopic{},
	}
	text := strings.TrimSpace(raw)
	if text == "" {
		return payload, fmt.Errorf("empty extractor response")
	}

	candidates := []string{text}
	if matches := jsonFencePattern.FindStringSubmatch(text); len(matches) > 1 {
		candidates = append(candidates, strings.TrimSpace(matches[1]))
	}
	if extracted := extractJSONObject(text); extracted != "" {
		candidates = append(candidates, extracted)
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		var parsed extractorPayload
		if err := json.Unmarshal([]byte(candidate), &parsed); err == nil {
			for i := range parsed.Memories {
				parsed.Memories[i].Importance = clamp01(parsed.Memories[i].Importance)
			}
			for i := range parsed.WeakTopics {
				parsed.WeakTopics[i].Severity = clamp01(parsed.WeakTopics[i].Severity)
			}
			if parsed.Memories == nil {
				parsed.Memories = []extractorMemory{}
			}
			if parsed.WeakTopics == nil {
				parsed.WeakTopics = []extractorWeakTopic{}
			}
			return parsed, nil
		}
	}

	return payload, fmt.Errorf("extractor json parse failed")
}

func extractJSONObject(input string) string {
	start := -1
	depth := 0
	inString := false
	escaped := false

	for i := 0; i < len(input); i++ {
		ch := input[i]

		if escaped {
			escaped = false
			continue
		}
		if ch == '\\' && inString {
			escaped = true
			continue
		}
		if ch == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}

		switch ch {
		case '{':
			if depth == 0 {
				start = i
			}
			depth++
		case '}':
			if depth == 0 {
				continue
			}
			depth--
			if depth == 0 && start >= 0 {
				return strings.TrimSpace(input[start : i+1])
			}
		}
	}
	return ""
}

func clampHistory(history []TutorHistoryMessage, maxItems int) []TutorHistoryMessage {
	if maxItems <= 0 || len(history) <= maxItems {
		return history
	}
	return history[len(history)-maxItems:]
}

func normalizeTutorText(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return strings.Join(strings.Fields(value), " ")
}

func normalizeTopicKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	replaced := strings.Builder{}
	lastUnderscore := false
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			replaced.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			replaced.WriteRune('_')
			lastUnderscore = true
		}
	}
	out := strings.Trim(replaced.String(), "_")
	if len(out) > 120 {
		out = out[:120]
	}
	return out
}

func hashMemoryFingerprint(value string) string {
	sum := sha1.Sum([]byte(value))
	return fmt.Sprintf("%x", sum)
}

func detectLanguageTutor(text string) string {
	text = strings.TrimSpace(strings.ToLower(text))
	if text == "" {
		return "ru"
	}
	for _, r := range text {
		if (r >= 'а' && r <= 'я') || r == 'ё' {
			return "ru"
		}
	}
	return "en"
}

func mergeJSONMaps(current map[string]interface{}, update map[string]interface{}) map[string]interface{} {
	out := map[string]interface{}{}
	for k, v := range current {
		out[k] = v
	}
	for k, v := range update {
		out[k] = v
	}
	return out
}

func clamp01(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0
	}
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}

func roundTutor(value float64, precision int) float64 {
	if precision < 0 {
		return value
	}
	scale := math.Pow10(precision)
	return math.Round(value*scale) / scale
}

func durationHoursRoundedUp(window time.Duration) int {
	if window <= 0 {
		return 0
	}

	hours := int(window / time.Hour)
	if window%time.Hour != 0 {
		hours++
	}
	if hours < 1 {
		return 1
	}
	return hours
}

func latencyP95(values []int64) int64 {
	if len(values) == 0 {
		return 0
	}
	sort.Slice(values, func(i, j int) bool {
		return values[i] < values[j]
	})
	idx := (95*len(values) - 1) / 100
	if idx < 0 {
		idx = 0
	}
	if idx >= len(values) {
		idx = len(values) - 1
	}
	return values[idx]
}

func firstNonEmptyTutor(values ...string) string {
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v != "" {
			return v
		}
	}
	return ""
}

func sortWeakTopics(items []WeakTopicSnapshot) []WeakTopicSnapshot {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Mastery == items[j].Mastery {
			return items[i].LastSeenAt.After(items[j].LastSeenAt)
		}
		return items[i].Mastery < items[j].Mastery
	})
	return items
}
