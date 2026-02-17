package services

import (
	"context"
	"errors"
	"fmt"
	"hash/fnv"
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
	"unicode"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	defaultHybridTopK      = 5
	defaultHybridRRFK      = 60.0
	defaultHybridSyncMins  = 5
	canonicalEmbeddingDims = 256
)

var (
	tokenPattern = regexp.MustCompile(`[\p{L}\p{N}]+`)
	// ErrUnknownAssistantDomain indicates an unsupported domain sync target.
	ErrUnknownAssistantDomain = errors.New("unknown assistant domain")

	defaultMVPDomains = []string{
		"market",
		"services",
		"news",
		"ads",
		"map",
		"library",
		"education",
		"multimedia",
		"yatra",
		"shelter",
		"cafe",
		"charity",
	}

	wave2Domains = []string{
		"dating",
		"private",
	}

	domainKeywords = map[string][]string{
		"market": {
			"маркет", "market", "магазин", "shop", "shops", "товар", "товары", "product", "products", "цена", "price", "купить", "buy",
		},
		"services": {
			"услуг", "услуга", "service", "services", "консультац", "tariff", "тариф", "book", "booking", "бронь", "запись", "slot", "слот", "schedule", "распис",
		},
		"news": {
			"новости", "news", "latest", "последние", "обновления",
		},
		"ads": {
			"объявлен", "ads", "ad", "listing", "продам", "ищу", "предлагаю",
		},
		"map": {
			"карта", "map", "markers", "маркер", "маршрут", "route", "nearby", "рядом",
		},
		"library": {
			"библиотек", "library", "verse", "стих", "шлока", "gita", "bhagavatam", "scripture", "вед",
		},
		"education": {
			"курс", "courses", "education", "обучени", "экзамен", "exam", "module", "модуль",
		},
		"multimedia": {
			"мультимедиа", "multimedia", "track", "трек", "audio", "video", "radio", "tv", "series", "bhajan", "kirtan",
		},
		"yatra": {
			"ятра", "yatra", "tour", "паломнич", "путешеств", "organizer", "тур",
		},
		"shelter": {
			"жилье", "shelter", "ашрам", "ashram", "гостев", "accommodation", "stay", "ночлег",
		},
		"cafe": {
			"кафе", "cafe", "menu", "меню", "dish", "блюдо", "еда", "food", "restaurant", "рестора",
		},
		"charity": {
			"charity", "благотвор", "donation", "пожертв", "project", "проек", "organization", "организац", "karma",
		},
		"dating": {
			"dating", "знаком", "кандидат", "совместим", "compatibility", "лайк", "like", "profile",
		},
	}

	routingDomainOrder = []string{
		"market",
		"services",
		"news",
		"ads",
		"map",
		"library",
		"education",
		"multimedia",
		"yatra",
		"shelter",
		"cafe",
		"charity",
		"dating",
	}
)

// DomainDescriptor describes a domain availability for clients.
type DomainDescriptor struct {
	Name            string `json:"name"`
	Wave            string `json:"wave"`
	VisibilityScope string `json:"visibilityScope"`
	Enabled         bool   `json:"enabled"`
	Status          string `json:"status"`
}

// HybridQueryRequest is the public API payload for /rag/query-hybrid.
type HybridQueryRequest struct {
	Query          string            `json:"query"`
	Domains        []string          `json:"domains"`
	TopK           int               `json:"topK"`
	IncludePrivate bool              `json:"includePrivate"`
	Filters        map[string]string `json:"filters"`
}

// AssistantSource describes a retrieved source/chunk.
type AssistantSource struct {
	ID         string                 `json:"id"`
	Domain     string                 `json:"domain"`
	SourceType string                 `json:"sourceType"`
	SourceID   string                 `json:"sourceId"`
	Title      string                 `json:"title"`
	Snippet    string                 `json:"snippet"`
	SourceURL  string                 `json:"sourceUrl"`
	Score      float64                `json:"score"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// AssistantContext is attached to chat/query pipeline.
type AssistantContext struct {
	Domains         []string          `json:"domains"`
	Sources         []AssistantSource `json:"sources"`
	Confidence      float64           `json:"confidence"`
	Language        string            `json:"language"`
	VisibilityScope string            `json:"visibility_scope"`
}

// HybridQueryResponse is returned by /rag/query-hybrid.
type HybridQueryResponse struct {
	Query            string            `json:"query"`
	Results          []AssistantSource `json:"results"`
	AssistantContext AssistantContext  `json:"assistant_context"`
	RetrieverPath    string            `json:"retriever_path"`
}

// DomainContextRequest is an internal request for chat integrations.
type DomainContextRequest struct {
	Query          string
	Domains        []string
	TopK           int
	UserID         uint
	IncludePrivate bool
	StrictRouting  bool
}

// DomainContextResponse is an internal retrieval response for assistant prompts.
type DomainContextResponse struct {
	AssistantContext
	RetrieverPath   string
	NeedsDomainData bool
}

type rankedDocument struct {
	Doc         models.AssistantDocument
	FTSScore    float64
	VectorScore float64
	Score       float64
	RankFTS     int
	RankVector  int
}

// DomainAssistantService combines domain routing, hybrid retrieval, and sync.
type DomainAssistantService struct {
	db               *gorm.DB
	embeddingService *EmbeddingService
	syncInterval     time.Duration
	rrfK             float64
	mutex            sync.Mutex
}

var (
	domainAssistantOnce     sync.Once
	domainAssistantInstance *DomainAssistantService
)

// GetDomainAssistantService returns singleton instance.
func GetDomainAssistantService() *DomainAssistantService {
	domainAssistantOnce.Do(func() {
		domainAssistantInstance = NewDomainAssistantService(database.DB)
	})
	return domainAssistantInstance
}

// NewDomainAssistantService creates a service instance.
func NewDomainAssistantService(db *gorm.DB) *DomainAssistantService {
	intervalMinutes := parseIntWithDefaultDA(strings.TrimSpace(os.Getenv("RAG_SYNC_INTERVAL_MINUTES")), defaultHybridSyncMins)
	if intervalMinutes <= 0 {
		intervalMinutes = defaultHybridSyncMins
	}

	svc := &DomainAssistantService{
		db:               db,
		embeddingService: NewEmbeddingService(),
		syncInterval:     time.Duration(intervalMinutes) * time.Minute,
		rrfK:             defaultHybridRRFK,
	}

	svc.ensureSchema()
	return svc
}

// IsDomainAssistantEnabled checks global feature flag.
func (s *DomainAssistantService) IsDomainAssistantEnabled() bool {
	return s.getBoolConfig("RAG_DOMAIN_ASSISTANT_ENABLED", true)
}

// IsHybridEnabled checks hybrid retrieval feature flag.
func (s *DomainAssistantService) IsHybridEnabled() bool {
	return s.getBoolConfig("RAG_HYBRID_ENABLED", true)
}

// IsChatCompletionsEnabled checks /v1/chat/completions integration flag.
func (s *DomainAssistantService) IsChatCompletionsEnabled() bool {
	return s.getBoolConfig("RAG_CHAT_COMPLETIONS_ENABLED", true)
}

// IsMessagesEnabled checks room-chat integration flag.
func (s *DomainAssistantService) IsMessagesEnabled() bool {
	return s.getBoolConfig("RAG_MESSAGES_ENABLED", true)
}

// ListDomains returns enabled/planned domain catalog.
func (s *DomainAssistantService) ListDomains() []DomainDescriptor {
	allowed := s.allowedDomainSet()
	descriptors := make([]DomainDescriptor, 0, len(defaultMVPDomains)+len(wave2Domains))

	for _, d := range defaultMVPDomains {
		enabled := allowed[d]
		status := "disabled"
		if enabled {
			status = "enabled"
		}
		descriptors = append(descriptors, DomainDescriptor{
			Name:            d,
			Wave:            "mvp",
			VisibilityScope: models.VisibilityScopePublic,
			Enabled:         enabled,
			Status:          status,
		})
	}

	for _, d := range wave2Domains {
		enabled := allowed[d]
		status := "planned"
		if enabled {
			status = "enabled"
		}
		descriptors = append(descriptors, DomainDescriptor{
			Name:            d,
			Wave:            "wave2",
			VisibilityScope: models.VisibilityScopeUser,
			Enabled:         enabled,
			Status:          status,
		})
	}

	return descriptors
}

// QueryHybrid executes Domain Assistant hybrid retrieval for API callers.
func (s *DomainAssistantService) QueryHybrid(ctx context.Context, req HybridQueryRequest, userID uint) (*HybridQueryResponse, error) {
	if !s.IsDomainAssistantEnabled() {
		return &HybridQueryResponse{
			Query: req.Query,
			AssistantContext: AssistantContext{
				Confidence:      0,
				Language:        detectLanguageDA(req.Query),
				VisibilityScope: models.VisibilityScopePublic,
			},
			RetrieverPath: "disabled",
		}, nil
	}

	internalReq := DomainContextRequest{
		Query:          req.Query,
		Domains:        req.Domains,
		TopK:           req.TopK,
		UserID:         userID,
		IncludePrivate: req.IncludePrivate,
		StrictRouting:  false,
	}
	resp, err := s.BuildAssistantContext(ctx, internalReq)
	if err != nil {
		return nil, err
	}

	return &HybridQueryResponse{
		Query:            req.Query,
		Results:          resp.Sources,
		AssistantContext: resp.AssistantContext,
		RetrieverPath:    resp.RetrieverPath,
	}, nil
}

// BuildAssistantContext executes strict or broad retrieval for chat integrations.
func (s *DomainAssistantService) BuildAssistantContext(ctx context.Context, req DomainContextRequest) (*DomainContextResponse, error) {
	query := strings.TrimSpace(req.Query)
	if query == "" {
		return &DomainContextResponse{
			AssistantContext: AssistantContext{
				Confidence:      0,
				Language:        "ru",
				VisibilityScope: models.VisibilityScopePublic,
			},
			RetrieverPath: "none",
		}, nil
	}

	topK := req.TopK
	if topK <= 0 {
		topK = defaultHybridTopK
	}
	explicitRequested := len(req.Domains) > 0

	routedDomains, hasDomainIntent := s.routeDomains(query, req.Domains)
	allowedSet := s.allowedDomainSet()
	selected := make([]string, 0, len(routedDomains))
	for _, d := range routedDomains {
		if allowedSet[d] {
			selected = append(selected, d)
		}
	}

	if len(selected) == 0 {
		if req.StrictRouting || explicitRequested {
			return &DomainContextResponse{
				AssistantContext: AssistantContext{
					Domains:         []string{},
					Sources:         []AssistantSource{},
					Confidence:      0,
					Language:        detectLanguageDA(query),
					VisibilityScope: models.VisibilityScopePublic,
				},
				RetrieverPath:   "router",
				NeedsDomainData: hasDomainIntent,
			}, nil
		}

		for _, d := range defaultMVPDomains {
			if allowedSet[d] {
				selected = append(selected, d)
			}
		}
	}

	includePrivate := req.IncludePrivate && req.UserID != 0
	if !includePrivate {
		selected = filterOutWave2Domains(selected)
	}

	if len(selected) == 0 {
		return &DomainContextResponse{
			AssistantContext: AssistantContext{
				Domains:         []string{},
				Sources:         []AssistantSource{},
				Confidence:      0,
				Language:        detectLanguageDA(query),
				VisibilityScope: models.VisibilityScopePublic,
			},
			RetrieverPath:   "none",
			NeedsDomainData: hasDomainIntent,
		}, nil
	}

	for _, domain := range selected {
		if domain == "dating" && includePrivate {
			if err := s.syncDatingForUser(ctx, req.UserID); err != nil {
				log.Printf("[DomainAssistant] dating sync warning: %v", err)
			}
			continue
		}
		if err := s.ensureDomainSynced(ctx, domain); err != nil {
			log.Printf("[DomainAssistant] sync warning domain=%s err=%v", domain, err)
		}
	}

	fts, err := s.retrieveFTS(query, selected, topK*4, req.UserID, includePrivate)
	if err != nil {
		log.Printf("[DomainAssistant] FTS fallback due to error: %v", err)
	}

	vector, err := s.retrieveVector(ctx, query, selected, topK*4, req.UserID, includePrivate)
	if err != nil {
		log.Printf("[DomainAssistant] vector retrieval warning: %v", err)
	}

	fused := fuseRRF(fts, vector, s.rrfK)
	if len(fused) > topK {
		fused = fused[:topK]
	}

	sources := make([]AssistantSource, 0, len(fused))
	for _, item := range fused {
		sources = append(sources, AssistantSource{
			ID:         item.Doc.ID.String(),
			Domain:     item.Doc.Domain,
			SourceType: item.Doc.SourceType,
			SourceID:   item.Doc.SourceID,
			Title:      item.Doc.Title,
			Snippet:    makeSnippet(item.Doc.Content, 280),
			SourceURL:  item.Doc.SourceURL,
			Score:      round(item.Score, 6),
			Metadata:   item.Doc.Metadata,
		})
	}

	confidence := 0.0
	if len(fused) > 0 {
		maxPossible := (1.0 / (s.rrfK + 1.0)) + (1.0 / (s.rrfK + 1.0))
		if maxPossible > 0 {
			confidence = fused[0].Score / maxPossible
		}
		if confidence > 1 {
			confidence = 1
		}
	}

	visibility := models.VisibilityScopePublic
	if includePrivate {
		visibility = "public+user"
	}

	retrieverPath := "fts+vector+rrf"
	if len(fts) == 0 && len(vector) > 0 {
		retrieverPath = "vector"
	} else if len(vector) == 0 && len(fts) > 0 {
		retrieverPath = "fts"
	} else if len(vector) == 0 && len(fts) == 0 {
		retrieverPath = "none"
	}

	log.Printf("[DomainAssistant] domains=%v retriever=%s sources=%d confidence=%.2f",
		selected, retrieverPath, len(sources), confidence)

	return &DomainContextResponse{
		AssistantContext: AssistantContext{
			Domains:         selected,
			Sources:         sources,
			Confidence:      round(confidence, 4),
			Language:        detectLanguageDA(query),
			VisibilityScope: visibility,
		},
		RetrieverPath:   retrieverPath,
		NeedsDomainData: hasDomainIntent,
	}, nil
}

// GetSourceByID returns a source document for citation details.
func (s *DomainAssistantService) GetSourceByID(id string, userID uint, includePrivate bool) (*models.AssistantDocument, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database is not initialized")
	}

	sourceUUID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return nil, fmt.Errorf("invalid source id")
	}

	var doc models.AssistantDocument
	query := s.db.Where("id = ?", sourceUUID)
	if includePrivate && userID != 0 {
		query = query.Where("(visibility_scope = ? AND user_id = 0) OR (visibility_scope = ? AND user_id = ?)",
			models.VisibilityScopePublic, models.VisibilityScopeUser, userID)
	} else {
		query = query.Where("visibility_scope = ? AND user_id = 0", models.VisibilityScopePublic)
	}

	if err := query.First(&doc).Error; err != nil {
		if isRecordNotFound(err) {
			return nil, fmt.Errorf("source not found")
		}
		return nil, err
	}

	return &doc, nil
}

// BuildPromptSnippet builds a deterministic assistant prompt from retrieved facts.
func (s *DomainAssistantService) BuildPromptSnippet(ctxResp *DomainContextResponse) string {
	if ctxResp == nil || len(ctxResp.Sources) == 0 {
		return ""
	}

	var b strings.Builder
	b.WriteString("Assistant context (facts from VedicAI services):\n")
	for i, src := range ctxResp.Sources {
		b.WriteString(fmt.Sprintf("[%d] (%s) %s\n", i+1, src.Domain, strings.TrimSpace(src.Snippet)))
		if src.SourceURL != "" {
			b.WriteString(fmt.Sprintf("source: %s\n", src.SourceURL))
		}
	}
	b.WriteString("\nAnswer policy:\n")
	b.WriteString("- Use only facts from the assistant context when the question is about app services.\n")
	b.WriteString("- If facts are insufficient, answer exactly: \"не найдено достаточно данных\".\n")
	b.WriteString("- Always provide 1-2 sources from the context at the end of the answer.\n")

	return b.String()
}

// AppendSources appends sources to a generated answer if missing.
func (s *DomainAssistantService) AppendSources(content string, ctxResp *DomainContextResponse) string {
	if ctxResp == nil || len(ctxResp.Sources) == 0 {
		return content
	}

	lower := strings.ToLower(content)
	if strings.Contains(lower, "источники:") || strings.Contains(lower, "sources:") {
		return content
	}

	limit := 2
	if len(ctxResp.Sources) < limit {
		limit = len(ctxResp.Sources)
	}

	var b strings.Builder
	b.WriteString(strings.TrimSpace(content))
	b.WriteString("\n\nИсточники:\n")
	for i := 0; i < limit; i++ {
		src := ctxResp.Sources[i]
		label := src.Title
		if label == "" {
			label = src.SourceType + "#" + src.SourceID
		}
		if src.SourceURL != "" {
			b.WriteString(fmt.Sprintf("- %s (%s)\n", label, src.SourceURL))
		} else {
			b.WriteString(fmt.Sprintf("- %s\n", label))
		}
	}

	return strings.TrimSpace(b.String())
}

func (s *DomainAssistantService) ensureSchema() {
	if s.db == nil {
		return
	}

	if err := s.db.AutoMigrate(&models.AssistantDocument{}, &models.DomainSyncState{}); err != nil {
		log.Printf("[DomainAssistant] auto-migrate warning: %v", err)
	}

	if err := s.db.Exec(`ALTER TABLE assistant_documents
		ADD COLUMN IF NOT EXISTS search_vector tsvector
		GENERATED ALWAYS AS (
			to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
		) STORED`).Error; err != nil {
		log.Printf("[DomainAssistant] search_vector setup warning: %v", err)
	}

	if err := s.db.Exec(`CREATE INDEX IF NOT EXISTS idx_assistant_documents_search_vector
		ON assistant_documents USING GIN (search_vector)`).Error; err != nil {
		log.Printf("[DomainAssistant] search_vector index warning: %v", err)
	}

	if err := s.db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_documents_unique
		ON assistant_documents (domain, source_type, source_id, language, visibility_scope, user_id)`).Error; err != nil {
		log.Printf("[DomainAssistant] unique index warning: %v", err)
	}
}

func (s *DomainAssistantService) ensureDomainSynced(ctx context.Context, domain string) error {
	if s.db == nil {
		return fmt.Errorf("database is not initialized")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	var state models.DomainSyncState
	err := s.db.Where("domain = ?", domain).First(&state).Error
	if err != nil && !isRecordNotFound(err) {
		return err
	}

	now := time.Now().UTC()
	if err == nil && !state.LastSyncedAt.IsZero() {
		if now.Sub(state.LastSyncedAt) < s.syncInterval {
			return nil
		}
	}

	since := time.Unix(0, 0).UTC()
	if err == nil && !state.LastSyncedAt.IsZero() {
		since = state.LastSyncedAt.Add(-30 * time.Second)
	}

	if syncErr := s.syncDomain(ctx, domain, since); syncErr != nil {
		return syncErr
	}

	state.Domain = domain
	state.LastSyncedAt = now
	state.UpdatedAt = now
	return s.db.Save(&state).Error
}

func (s *DomainAssistantService) syncDomain(ctx context.Context, domain string, since time.Time) error {
	switch domain {
	case "market":
		return s.syncMarket(ctx, since)
	case "services":
		return s.syncServices(ctx, since)
	case "news":
		return s.syncNews(ctx, since)
	case "ads":
		return s.syncAds(ctx, since)
	case "map":
		return s.syncMap(ctx, since)
	case "library":
		return s.syncLibrary(ctx, since)
	case "education":
		return s.syncEducation(ctx, since)
	case "multimedia":
		return s.syncMultimedia(ctx, since)
	case "yatra":
		return s.syncYatra(ctx, since)
	case "shelter":
		return s.syncShelter(ctx, since)
	case "cafe":
		return s.syncCafe(ctx, since)
	case "charity":
		return s.syncCharity(ctx, since)
	case "private":
		// Reserved wave2 namespace: no sync pipeline yet.
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownAssistantDomain, domain)
	}
}

func (s *DomainAssistantService) upsertDocumentLogged(ctx context.Context, doc models.AssistantDocument) {
	if err := s.upsertDocument(ctx, doc); err != nil {
		log.Printf("[DomainAssistant] upsert failed domain=%s sourceType=%s sourceID=%s: %v", doc.Domain, doc.SourceType, doc.SourceID, err)
	}
}

func (s *DomainAssistantService) deleteDocumentLogged(domain, sourceType, sourceID, lang, visibility string, userID uint) {
	if err := s.deleteDocument(domain, sourceType, sourceID, lang, visibility, userID); err != nil {
		log.Printf("[DomainAssistant] delete failed domain=%s sourceType=%s sourceID=%s: %v", domain, sourceType, sourceID, err)
	}
}

func (s *DomainAssistantService) syncMarket(ctx context.Context, since time.Time) error {
	var shops []models.Shop
	if err := s.db.Where("updated_at >= ?", since).Find(&shops).Error; err != nil {
		return err
	}
	for _, shop := range shops {
		sourceID := strconv.FormatUint(uint64(shop.ID), 10)
		if shop.Status != models.ShopStatusActive {
			s.deleteDocumentLogged("market", "shop", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Магазин: %s. Категория: %s. Город: %s. Описание: %s. Рейтинг: %.1f.",
			shop.Name, shop.Category, shop.City, normalizeWhitespace(shop.Description), shop.Rating)
		meta := map[string]interface{}{
			"category": string(shop.Category),
			"city":     shop.City,
			"rating":   shop.Rating,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "market",
			SourceType:      "shop",
			SourceID:        sourceID,
			Title:           shop.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/shops/%d", shop.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var products []models.Product
	if err := s.db.Preload("Shop").Where("updated_at >= ?", since).Find(&products).Error; err != nil {
		return err
	}
	for _, p := range products {
		sourceID := strconv.FormatUint(uint64(p.ID), 10)
		if p.Status != models.ProductStatusActive {
			s.deleteDocumentLogged("market", "product", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}

		price := p.BasePrice
		if p.SalePrice != nil && *p.SalePrice > 0 {
			price = *p.SalePrice
		}
		shopName := ""
		shopCity := ""
		if p.Shop != nil {
			shopName = p.Shop.Name
			shopCity = p.Shop.City
		}
		content := fmt.Sprintf("Товар: %s. Категория: %s. Цена: %.2f %s. Магазин: %s. Город: %s. Описание: %s. В наличии: %d.",
			p.Name, p.Category, price, p.Currency, shopName, shopCity, normalizeWhitespace(p.ShortDescription+" "+p.FullDescription), p.Stock)
		meta := map[string]interface{}{
			"category": string(p.Category),
			"shop":     shopName,
			"city":     shopCity,
			"price":    price,
			"currency": p.Currency,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "market",
			SourceType:      "product",
			SourceID:        sourceID,
			Title:           p.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/products/%d", p.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncServices(ctx context.Context, since time.Time) error {
	var servicesData []models.Service
	if err := s.db.Where("updated_at >= ?", since).Find(&servicesData).Error; err != nil {
		return err
	}
	for _, svc := range servicesData {
		sourceID := strconv.FormatUint(uint64(svc.ID), 10)
		if svc.Status != models.ServiceStatusActive {
			s.deleteDocumentLogged("services", "service", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Услуга: %s. Категория: %s. Тип расписания: %s. Канал: %s. Доступ: %s. Язык: %s. Описание: %s.",
			svc.Title, svc.Category, svc.ScheduleType, svc.Channel, svc.AccessType, svc.Language, normalizeWhitespace(svc.Description))
		meta := map[string]interface{}{
			"category":     string(svc.Category),
			"scheduleType": string(svc.ScheduleType),
			"channel":      string(svc.Channel),
			"accessType":   string(svc.AccessType),
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "services",
			SourceType:      "service",
			SourceID:        sourceID,
			Title:           svc.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/services/%d", svc.ID),
			Language:        languageOrDefault(svc.Language, "ru"),
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var tariffs []models.ServiceTariff
	if err := s.db.Preload("Service").Where("updated_at >= ?", since).Find(&tariffs).Error; err != nil {
		return err
	}
	for _, t := range tariffs {
		sourceID := strconv.FormatUint(uint64(t.ID), 10)
		if !t.IsActive || t.Service == nil || t.Service.Status != models.ServiceStatusActive {
			s.deleteDocumentLogged("services", "tariff", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Тариф: %s. Услуга: %s. Цена: %d %s. Длительность: %d минут. Сессий: %d. Валидность: %d дней. Включено: %s.",
			t.Name, t.Service.Title, t.Price, t.Currency, t.DurationMinutes, t.SessionsCount, t.ValidityDays, normalizeWhitespace(t.Includes))
		meta := map[string]interface{}{
			"serviceId":       t.ServiceID,
			"price":           t.Price,
			"currency":        t.Currency,
			"durationMinutes": t.DurationMinutes,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "services",
			SourceType:      "tariff",
			SourceID:        sourceID,
			Title:           t.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/services/%d/tariffs", t.ServiceID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var schedules []models.ServiceSchedule
	if err := s.db.Preload("Service").Where("updated_at >= ?", since).Find(&schedules).Error; err != nil {
		return err
	}
	for _, sch := range schedules {
		sourceID := strconv.FormatUint(uint64(sch.ID), 10)
		if !sch.IsActive || sch.Service == nil || sch.Service.Status != models.ServiceStatusActive {
			s.deleteDocumentLogged("services", "schedule", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}

		slotLabel := fmt.Sprintf("%s-%s", sch.TimeStart, sch.TimeEnd)
		if sch.DayOfWeek != nil {
			slotLabel = fmt.Sprintf("%s %s", weekdayLabel(*sch.DayOfWeek), slotLabel)
		}
		if sch.SpecificDate != nil {
			slotLabel = fmt.Sprintf("%s %s", sch.SpecificDate.Format("2006-01-02"), slotLabel)
		}

		content := fmt.Sprintf("Расписание услуги %s: %s. Длительность слота: %d мин. Буфер: %d мин. Макс участников: %d. Таймзона: %s.",
			sch.Service.Title, slotLabel, sch.SlotDuration, sch.BufferMinutes, sch.MaxParticipants, sch.Timezone)
		meta := map[string]interface{}{
			"serviceId":       sch.ServiceID,
			"dayOfWeek":       sch.DayOfWeek,
			"timeStart":       sch.TimeStart,
			"timeEnd":         sch.TimeEnd,
			"maxParticipants": sch.MaxParticipants,
			"slotDuration":    sch.SlotDuration,
			"timezone":        sch.Timezone,
			"specificDate":    sch.SpecificDate,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "services",
			SourceType:      "schedule",
			SourceID:        sourceID,
			Title:           fmt.Sprintf("%s расписание", sch.Service.Title),
			Content:         content,
			SourceURL:       fmt.Sprintf("/services/%d/schedule", sch.ServiceID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncNews(ctx context.Context, since time.Time) error {
	var items []models.NewsItem
	if err := s.db.Preload("Source").Where("updated_at >= ?", since).Find(&items).Error; err != nil {
		return err
	}

	for _, n := range items {
		sourceID := strconv.FormatUint(uint64(n.ID), 10)
		if n.Status != models.NewsItemStatusPublished {
			s.deleteDocumentLogged("news", "news_item", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}

		title := firstNonEmpty(n.TitleRu, n.TitleEn, n.OriginalTitle)
		content := strings.TrimSpace(strings.Join([]string{
			firstNonEmpty(n.SummaryRu, n.SummaryEn),
			firstNonEmpty(n.ContentRu, n.ContentEn, n.OriginalContent),
		}, " "))
		meta := map[string]interface{}{
			"category":    n.Category,
			"isImportant": n.IsImportant,
			"sourceId":    n.SourceID,
		}
		if n.Source != nil {
			meta["sourceName"] = n.Source.Name
		}

		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "news",
			SourceType:      "news_item",
			SourceID:        sourceID,
			Title:           title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/news/%d", n.ID),
			Language:        detectLanguageDA(title + " " + content),
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncAds(ctx context.Context, since time.Time) error {
	var ads []models.Ad
	if err := s.db.Where("updated_at >= ?", since).Find(&ads).Error; err != nil {
		return err
	}

	for _, ad := range ads {
		sourceID := strconv.FormatUint(uint64(ad.ID), 10)
		if ad.Status != models.AdStatusActive {
			s.deleteDocumentLogged("ads", "ad", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}

		priceLabel := "не указана"
		if ad.IsFree {
			priceLabel = "бесплатно"
		} else if ad.Price != nil {
			priceLabel = fmt.Sprintf("%.2f %s", *ad.Price, ad.Currency)
		}

		content := fmt.Sprintf("Объявление: %s. Тип: %s. Категория: %s. Город: %s. Цена: %s. Описание: %s.",
			ad.Title, ad.AdType, ad.Category, ad.City, priceLabel, normalizeWhitespace(ad.Description))
		meta := map[string]interface{}{
			"category": string(ad.Category),
			"adType":   string(ad.AdType),
			"city":     ad.City,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "ads",
			SourceType:      "ad",
			SourceID:        sourceID,
			Title:           ad.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/ads/%d", ad.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncMap(ctx context.Context, since time.Time) error {
	var shops []models.Shop
	if err := s.db.Where("updated_at >= ?", since).Find(&shops).Error; err != nil {
		return err
	}
	for _, shop := range shops {
		sourceID := "shop-" + strconv.FormatUint(uint64(shop.ID), 10)
		if shop.Status != models.ShopStatusActive || shop.Latitude == nil || shop.Longitude == nil {
			s.deleteDocumentLogged("map", "marker_shop", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Маркер карты (магазин): %s. Город: %s. Координаты: %.6f, %.6f. Категория: %s.",
			shop.Name, shop.City, *shop.Latitude, *shop.Longitude, shop.Category)
		meta := map[string]interface{}{
			"lat":        *shop.Latitude,
			"lng":        *shop.Longitude,
			"markerType": "shop",
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "map",
			SourceType:      "marker_shop",
			SourceID:        sourceID,
			Title:           shop.Name,
			Content:         content,
			SourceURL:       "/map/markers?categories=shop",
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var ads []models.Ad
	if err := s.db.Where("updated_at >= ?", since).Find(&ads).Error; err != nil {
		return err
	}
	for _, ad := range ads {
		sourceID := "ad-" + strconv.FormatUint(uint64(ad.ID), 10)
		if ad.Status != models.AdStatusActive || ad.Latitude == nil || ad.Longitude == nil {
			s.deleteDocumentLogged("map", "marker_ad", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Маркер карты (объявление): %s. Город: %s. Координаты: %.6f, %.6f. Категория: %s.",
			ad.Title, ad.City, *ad.Latitude, *ad.Longitude, ad.Category)
		meta := map[string]interface{}{
			"lat":        *ad.Latitude,
			"lng":        *ad.Longitude,
			"markerType": "ad",
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "map",
			SourceType:      "marker_ad",
			SourceID:        sourceID,
			Title:           ad.Title,
			Content:         content,
			SourceURL:       "/map/markers?categories=ad",
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var cafes []models.Cafe
	if err := s.db.Where("updated_at >= ?", since).Find(&cafes).Error; err != nil {
		return err
	}
	for _, cafe := range cafes {
		sourceID := "cafe-" + strconv.FormatUint(uint64(cafe.ID), 10)
		if cafe.Status != models.CafeStatusActive || cafe.Latitude == nil || cafe.Longitude == nil {
			s.deleteDocumentLogged("map", "marker_cafe", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Маркер карты (кафе): %s. Город: %s. Координаты: %.6f, %.6f. Описание: %s.",
			cafe.Name, cafe.City, *cafe.Latitude, *cafe.Longitude, normalizeWhitespace(cafe.Description))
		meta := map[string]interface{}{
			"lat":        *cafe.Latitude,
			"lng":        *cafe.Longitude,
			"markerType": "cafe",
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "map",
			SourceType:      "marker_cafe",
			SourceID:        sourceID,
			Title:           cafe.Name,
			Content:         content,
			SourceURL:       "/map/markers?categories=cafe",
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncLibrary(ctx context.Context, since time.Time) error {
	var books []models.ScriptureBook
	if err := s.db.Where("updated_at >= ?", since).Find(&books).Error; err != nil {
		return err
	}

	for _, b := range books {
		sourceID := b.Code
		content := fmt.Sprintf("Книга: %s / %s. Описание: %s %s.", b.NameRu, b.NameEn, normalizeWhitespace(b.DescriptionRu), normalizeWhitespace(b.DescriptionEn))
		meta := map[string]interface{}{
			"bookCode": b.Code,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "library",
			SourceType:      "book",
			SourceID:        sourceID,
			Title:           firstNonEmpty(b.NameRu, b.NameEn, b.Code),
			Content:         content,
			SourceURL:       fmt.Sprintf("/library/books/%s", b.Code),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	verseLimit := parseIntWithDefaultDA(s.getConfigValue("RAG_LIBRARY_SYNC_LIMIT"), 1500)
	if verseLimit <= 0 {
		verseLimit = 1500
	}

	var verses []models.ScriptureVerse
	if err := s.db.Where("updated_at >= ?", since).Order("updated_at DESC").Limit(verseLimit).Find(&verses).Error; err != nil {
		return err
	}

	for _, v := range verses {
		sourceID := strconv.FormatUint(uint64(v.ID), 10)
		title := firstNonEmpty(v.VerseReference, fmt.Sprintf("%s %d:%s", strings.ToUpper(v.BookCode), v.Chapter, v.Verse))
		content := fmt.Sprintf("%s. Перевод: %s. Комментарий: %s.",
			title, normalizeWhitespace(v.Translation), normalizeWhitespace(v.Purport))
		meta := map[string]interface{}{
			"bookCode":  v.BookCode,
			"chapter":   v.Chapter,
			"verse":     v.Verse,
			"reference": v.VerseReference,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "library",
			SourceType:      "verse",
			SourceID:        sourceID,
			Title:           title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/library/verses?bookCode=%s&chapter=%d", v.BookCode, v.Chapter),
			Language:        languageOrDefault(v.Language, "ru"),
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncEducation(ctx context.Context, since time.Time) error {
	var courses []models.EducationCourse
	if err := s.db.Preload("ScriptureBook").Where("updated_at >= ?", since).Find(&courses).Error; err != nil {
		return err
	}

	for _, course := range courses {
		sourceID := strconv.FormatUint(uint64(course.ID), 10)
		if !course.IsPublished {
			s.deleteDocumentLogged("education", "course", sourceID, "ru", models.VisibilityScopePublic, 0)
			var moduleIDs []uint
			if err := s.db.Model(&models.EducationModule{}).Where("course_id = ?", course.ID).Pluck("id", &moduleIDs).Error; err == nil {
				for _, moduleID := range moduleIDs {
					s.deleteDocumentLogged("education", "module", strconv.FormatUint(uint64(moduleID), 10), "ru", models.VisibilityScopePublic, 0)
				}
			}
			continue
		}

		scriptureName := ""
		if course.ScriptureBook != nil {
			scriptureName = firstNonEmpty(course.ScriptureBook.NameRu, course.ScriptureBook.NameEn)
		}
		content := fmt.Sprintf("Курс: %s. Организация: %s. Описание: %s. Писание: %s.",
			course.Title, course.Organization, normalizeWhitespace(course.Description), scriptureName)
		meta := map[string]interface{}{
			"organization": course.Organization,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "education",
			SourceType:      "course",
			SourceID:        sourceID,
			Title:           course.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/education/courses/%d", course.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var modules []models.EducationModule
	if err := s.db.Where("updated_at >= ?", since).Find(&modules).Error; err != nil {
		return err
	}
	for _, module := range modules {
		sourceID := strconv.FormatUint(uint64(module.ID), 10)
		var course models.EducationCourse
		if err := s.db.Select("id", "title", "organization", "is_published").Where("id = ?", module.CourseID).First(&course).Error; err != nil {
			s.deleteDocumentLogged("education", "module", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		if !course.IsPublished {
			s.deleteDocumentLogged("education", "module", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}

		content := fmt.Sprintf("Модуль: %s. Курс: %s. Порядок: %d. Организация: %s. Описание: %s.",
			module.Title, course.Title, module.Order, course.Organization, normalizeWhitespace(module.Description))
		meta := map[string]interface{}{
			"courseId":     module.CourseID,
			"courseTitle":  course.Title,
			"organization": course.Organization,
			"moduleOrder":  module.Order,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "education",
			SourceType:      "module",
			SourceID:        sourceID,
			Title:           module.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/education/courses/%d#module-%d", module.CourseID, module.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncMultimedia(ctx context.Context, since time.Time) error {
	var tracks []models.MediaTrack
	if err := s.db.Where("updated_at >= ?", since).Find(&tracks).Error; err != nil {
		return err
	}
	for _, t := range tracks {
		sourceID := strconv.FormatUint(uint64(t.ID), 10)
		if !t.IsActive {
			s.deleteDocumentLogged("multimedia", "track", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Медиа: %s. Исполнитель: %s. Тип: %s. Язык: %s. Традиция: %s. Описание: %s.",
			t.Title, t.Artist, t.MediaType, languageOrDefault(t.Language, "ru"), t.Madh, normalizeWhitespace(t.Description))
		meta := map[string]interface{}{
			"mediaType": string(t.MediaType),
			"madh":      t.Madh,
			"language":  t.Language,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "multimedia",
			SourceType:      "track",
			SourceID:        sourceID,
			Title:           t.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/multimedia/tracks/%d", t.ID),
			Language:        languageOrDefault(t.Language, "ru"),
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var radios []models.RadioStation
	if err := s.db.Where("updated_at >= ?", since).Find(&radios).Error; err != nil {
		return err
	}
	for _, r := range radios {
		sourceID := strconv.FormatUint(uint64(r.ID), 10)
		if !r.IsActive {
			s.deleteDocumentLogged("multimedia", "radio", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Радио: %s. Язык: %s. Традиция: %s. Описание: %s.",
			r.Name, languageOrDefault(r.Language, "ru"), r.Madh, normalizeWhitespace(r.Description))
		meta := map[string]interface{}{"madh": r.Madh, "language": r.Language}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "multimedia",
			SourceType:      "radio",
			SourceID:        sourceID,
			Title:           r.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/multimedia/radio/%d", r.ID),
			Language:        languageOrDefault(r.Language, "ru"),
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var tv []models.TVChannel
	if err := s.db.Where("updated_at >= ?", since).Find(&tv).Error; err != nil {
		return err
	}
	for _, ch := range tv {
		sourceID := strconv.FormatUint(uint64(ch.ID), 10)
		if !ch.IsActive {
			s.deleteDocumentLogged("multimedia", "tv", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("TV канал: %s. Традиция: %s. Описание: %s. Расписание: %s.",
			ch.Name, ch.Madh, normalizeWhitespace(ch.Description), normalizeWhitespace(ch.Schedule))
		meta := map[string]interface{}{"madh": ch.Madh}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "multimedia",
			SourceType:      "tv",
			SourceID:        sourceID,
			Title:           ch.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/multimedia/tv/%d", ch.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncYatra(ctx context.Context, since time.Time) error {
	var yatras []models.Yatra
	if err := s.db.Where("updated_at >= ?", since).Find(&yatras).Error; err != nil {
		return err
	}
	for _, y := range yatras {
		sourceID := strconv.FormatUint(uint64(y.ID), 10)
		if y.Status != models.YatraStatusOpen && y.Status != models.YatraStatusFull && y.Status != models.YatraStatusActive && y.Status != models.YatraStatusCompleted {
			s.deleteDocumentLogged("yatra", "yatra", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Ятра: %s. Тема: %s. Маршрут: %s - %s. Даты: %s по %s. Участников: %d/%d. Описание: %s.",
			y.Title, y.Theme, y.StartCity, y.EndCity,
			y.StartDate.Format("2006-01-02"), y.EndDate.Format("2006-01-02"), y.ParticipantCount, y.MaxParticipants,
			normalizeWhitespace(y.Description))
		meta := map[string]interface{}{
			"theme":  y.Theme,
			"status": y.Status,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "yatra",
			SourceType:      "yatra",
			SourceID:        sourceID,
			Title:           y.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/yatra/%d", y.ID),
			Language:        languageOrDefault(y.Language, "ru"),
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}
	return nil
}

func (s *DomainAssistantService) syncShelter(ctx context.Context, since time.Time) error {
	var shelters []models.Shelter
	if err := s.db.Where("updated_at >= ?", since).Find(&shelters).Error; err != nil {
		return err
	}
	for _, sh := range shelters {
		sourceID := strconv.FormatUint(uint64(sh.ID), 10)
		if sh.Status != models.ShelterStatusActive {
			s.deleteDocumentLogged("shelter", "shelter", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Жилье: %s. Тип: %s. Город: %s. Рядом с: %s. Цена: %s. Вместимость: %d. Описание: %s.",
			sh.Title, sh.Type, sh.City, sh.NearTemple, sh.PricePerNight, sh.Capacity, normalizeWhitespace(sh.Description))
		meta := map[string]interface{}{
			"type": sh.Type,
			"city": sh.City,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "shelter",
			SourceType:      "shelter",
			SourceID:        sourceID,
			Title:           sh.Title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/shelter/%d", sh.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}
	return nil
}

func (s *DomainAssistantService) syncCafe(ctx context.Context, since time.Time) error {
	var cafes []models.Cafe
	if err := s.db.Where("updated_at >= ?", since).Find(&cafes).Error; err != nil {
		return err
	}
	for _, c := range cafes {
		sourceID := strconv.FormatUint(uint64(c.ID), 10)
		if c.Status != models.CafeStatusActive {
			s.deleteDocumentLogged("cafe", "cafe", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Кафе: %s. Город: %s. Адрес: %s. Описание: %s. Доставка: %t. Самовывоз: %t.",
			c.Name, c.City, c.Address, normalizeWhitespace(c.Description), c.HasDelivery, c.HasTakeaway)
		meta := map[string]interface{}{
			"city": c.City,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "cafe",
			SourceType:      "cafe",
			SourceID:        sourceID,
			Title:           c.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/cafes/%d", c.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var dishes []models.Dish
	if err := s.db.Preload("Category").Where("updated_at >= ?", since).Find(&dishes).Error; err != nil {
		return err
	}
	for _, d := range dishes {
		sourceID := strconv.FormatUint(uint64(d.ID), 10)
		if !d.IsActive || !d.IsAvailable {
			s.deleteDocumentLogged("cafe", "dish", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		categoryName := ""
		if d.Category != nil {
			categoryName = d.Category.Name
		}
		content := fmt.Sprintf("Блюдо: %s. Категория: %s. Цена: %.2f. Тип: %s. Вегетарианское: %t. Веган: %t. Описание: %s.",
			d.Name, categoryName, d.Price, d.Type, d.IsVegetarian, d.IsVegan, normalizeWhitespace(d.Description))
		meta := map[string]interface{}{
			"cafeId":     d.CafeID,
			"category":   categoryName,
			"price":      d.Price,
			"vegetarian": d.IsVegetarian,
			"vegan":      d.IsVegan,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "cafe",
			SourceType:      "dish",
			SourceID:        sourceID,
			Title:           d.Name,
			Content:         content,
			SourceURL:       fmt.Sprintf("/cafes/%d/dishes/%d", d.CafeID, d.ID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncCharity(ctx context.Context, since time.Time) error {
	var orgs []models.CharityOrganization
	if err := s.db.Where("updated_at >= ?", since).Find(&orgs).Error; err != nil {
		return err
	}
	for _, org := range orgs {
		sourceID := strconv.FormatUint(uint64(org.ID), 10)
		if org.Status == models.OrgStatusDraft || org.Status == models.OrgStatusBlocked {
			s.deleteDocumentLogged("charity", "organization", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Организация: %s. Город: %s, %s. Описание: %s. Trust score: %d.",
			org.Name, org.City, org.Country, normalizeWhitespace(org.Description), org.TrustScore)
		meta := map[string]interface{}{
			"status":  org.Status,
			"city":    org.City,
			"country": org.Country,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "charity",
			SourceType:      "organization",
			SourceID:        sourceID,
			Title:           org.Name,
			Content:         content,
			SourceURL:       "/charity/organizations",
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var projects []models.CharityProject
	if err := s.db.Preload("Organization").Where("updated_at >= ?", since).Find(&projects).Error; err != nil {
		return err
	}
	for _, p := range projects {
		sourceID := strconv.FormatUint(uint64(p.ID), 10)
		if p.Status != models.ProjectStatusActive {
			s.deleteDocumentLogged("charity", "project", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		orgName := ""
		if p.Organization != nil {
			orgName = p.Organization.Name
		}
		content := fmt.Sprintf("Благотворительный проект: %s. Организация: %s. Категория: %s. Собрано: %d из %d. Кратко: %s.",
			p.Title, orgName, p.Category, p.RaisedAmount, p.GoalAmount, normalizeWhitespace(firstNonEmpty(p.ShortDesc, p.Description)))
		meta := map[string]interface{}{
			"category":   p.Category,
			"goalAmount": p.GoalAmount,
			"raised":     p.RaisedAmount,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "charity",
			SourceType:      "project",
			SourceID:        sourceID,
			Title:           p.Title,
			Content:         content,
			SourceURL:       "/charity/projects",
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	var evidence []models.CharityEvidence
	if err := s.db.Where("created_at >= ?", since).Find(&evidence).Error; err != nil {
		return err
	}
	for _, e := range evidence {
		sourceID := strconv.FormatUint(uint64(e.ID), 10)
		if !e.IsApproved {
			s.deleteDocumentLogged("charity", "evidence", sourceID, "ru", models.VisibilityScopePublic, 0)
			continue
		}
		content := fmt.Sprintf("Отчет проекта %d: %s. Тип: %s. Описание: %s.", e.ProjectID, e.Title, e.Type, normalizeWhitespace(e.Description))
		meta := map[string]interface{}{"projectId": e.ProjectID, "type": e.Type}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "charity",
			SourceType:      "evidence",
			SourceID:        sourceID,
			Title:           firstNonEmpty(e.Title, fmt.Sprintf("Evidence %d", e.ID)),
			Content:         content,
			SourceURL:       fmt.Sprintf("/charity/evidence/%d", e.ProjectID),
			Language:        "ru",
			VisibilityScope: models.VisibilityScopePublic,
			UserID:          0,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) syncDatingForUser(ctx context.Context, userID uint) error {
	if userID == 0 || s.db == nil {
		return nil
	}

	var users []models.User
	if err := s.db.Where("dating_enabled = ? AND is_blocked = ? AND id <> ?", true, false, userID).Limit(500).Find(&users).Error; err != nil {
		return err
	}

	for _, u := range users {
		sourceID := strconv.FormatUint(uint64(u.ID), 10)
		title := firstNonEmpty(u.SpiritualName, u.KarmicName, fmt.Sprintf("User %d", u.ID))
		content := fmt.Sprintf("Кандидат знакомств: %s. Город: %s. Интересы: %s. Цели: %s. Стиль йоги: %s. Традиция: %s.",
			title, u.City, normalizeWhitespace(u.Interests), normalizeWhitespace(u.Intentions), u.YogaStyle, u.Madh)
		meta := map[string]interface{}{
			"candidateId": u.ID,
			"city":        u.City,
		}
		s.upsertDocumentLogged(ctx, models.AssistantDocument{
			Domain:          "dating",
			SourceType:      "candidate",
			SourceID:        sourceID,
			Title:           title,
			Content:         content,
			SourceURL:       fmt.Sprintf("/dating/profile/%d", u.ID),
			Language:        languageOrDefault(u.Language, "ru"),
			VisibilityScope: models.VisibilityScopeUser,
			UserID:          userID,
			Metadata:        meta,
		})
	}

	return nil
}

func (s *DomainAssistantService) upsertDocument(ctx context.Context, doc models.AssistantDocument) error {
	if s.db == nil {
		return nil
	}

	doc.Title = trimTo(normalizeWhitespace(doc.Title), 500)
	doc.Content = trimTo(normalizeWhitespace(doc.Content), 6000)
	doc.SourceURL = strings.TrimSpace(doc.SourceURL)
	if doc.Content == "" {
		return nil
	}
	if doc.Language == "" {
		doc.Language = detectLanguageDA(doc.Title + " " + doc.Content)
	}
	if doc.VisibilityScope == "" {
		doc.VisibilityScope = models.VisibilityScopePublic
	}

	emb := s.makeCanonicalEmbedding(ctx, doc.Title+"\n"+doc.Content)
	doc.Embedding = emb

	updates := map[string]interface{}{
		"title":      doc.Title,
		"content":    doc.Content,
		"source_url": doc.SourceURL,
		"metadata":   doc.Metadata,
		"updated_at": time.Now().UTC(),
	}
	if len(doc.Embedding) > 0 {
		updates["embedding"] = doc.Embedding
	}

	return s.db.Clauses(clause.OnConflict{
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

func (s *DomainAssistantService) deleteDocument(domain, sourceType, sourceID, lang, visibility string, userID uint) error {
	if s.db == nil {
		return nil
	}
	return s.db.Where("domain = ? AND source_type = ? AND source_id = ? AND language = ? AND visibility_scope = ? AND user_id = ?",
		domain, sourceType, sourceID, lang, visibility, userID,
	).Delete(&models.AssistantDocument{}).Error
}

func (s *DomainAssistantService) retrieveFTS(query string, domains []string, limit int, userID uint, includePrivate bool) ([]rankedDocument, error) {
	if s.db == nil {
		return nil, nil
	}
	if limit <= 0 {
		limit = defaultHybridTopK * 4
	}

	type scoredDoc struct {
		models.AssistantDocument
		Score float64 `gorm:"column:score"`
	}

	var rows []scoredDoc
	dbQuery := s.db.Model(&models.AssistantDocument{}).
		Select("assistant_documents.*, ts_rank(search_vector, plainto_tsquery('simple', ?)) as score", query).
		Where("domain IN ?", domains)
	dbQuery = applyVisibilityFilter(dbQuery, userID, includePrivate)
	dbQuery = dbQuery.Where("search_vector @@ plainto_tsquery('simple', ?)", query).
		Order("score DESC").
		Limit(limit)

	if err := dbQuery.Find(&rows).Error; err != nil {
		if !shouldFallbackToLikeSearch(err) {
			return nil, err
		}

		// Fallback to case-insensitive LIKE when full-text primitives are unavailable in current DB engine/schema.
		rows = nil
		like := "%" + escapeLikePatternDA(strings.ToLower(normalizeWhitespace(query))) + "%"
		fallbackQuery := s.db.Model(&models.AssistantDocument{}).
			Where("domain IN ?", domains)
		fallbackQuery = applyVisibilityFilter(fallbackQuery, userID, includePrivate)
		fallbackQuery = fallbackQuery.Where("(LOWER(title) LIKE ? ESCAPE '\\') OR (LOWER(content) LIKE ? ESCAPE '\\')", like, like).
			Order("updated_at DESC").
			Limit(limit)
		var fallbackDocs []models.AssistantDocument
		if fallbackErr := fallbackQuery.Find(&fallbackDocs).Error; fallbackErr != nil {
			return nil, fallbackErr
		}
		for i, doc := range fallbackDocs {
			rows = append(rows, scoredDoc{AssistantDocument: doc, Score: 1.0 / float64(i+1)})
		}
	}

	results := make([]rankedDocument, 0, len(rows))
	for i, r := range rows {
		results = append(results, rankedDocument{
			Doc:      r.AssistantDocument,
			FTSScore: r.Score,
			RankFTS:  i + 1,
		})
	}
	return results, nil
}

func (s *DomainAssistantService) retrieveVector(ctx context.Context, query string, domains []string, limit int, userID uint, includePrivate bool) ([]rankedDocument, error) {
	if s.db == nil {
		return nil, nil
	}
	if limit <= 0 {
		limit = defaultHybridTopK * 4
	}

	queryEmbedding := s.makeCanonicalEmbedding(ctx, query)
	if len(queryEmbedding) == 0 {
		return nil, nil
	}

	candidateLimit := limit * 20
	if candidateLimit < 200 {
		candidateLimit = 200
	}
	if candidateLimit > 5000 {
		candidateLimit = 5000
	}

	var docs []models.AssistantDocument
	dbQuery := s.db.Model(&models.AssistantDocument{}).
		Where("domain IN ?", domains).
		Where("embedding IS NOT NULL")
	dbQuery = applyVisibilityFilter(dbQuery, userID, includePrivate)
	if err := dbQuery.Order("updated_at DESC").Limit(candidateLimit).Find(&docs).Error; err != nil {
		return nil, err
	}

	results := make([]rankedDocument, 0, len(docs))
	for _, doc := range docs {
		if len(doc.Embedding) == 0 {
			continue
		}
		sim := cosineSimilarity(queryEmbedding, doc.Embedding)
		if sim <= 0 {
			continue
		}
		results = append(results, rankedDocument{
			Doc:         doc,
			VectorScore: sim,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].VectorScore > results[j].VectorScore
	})
	if len(results) > limit {
		results = results[:limit]
	}
	for i := range results {
		results[i].RankVector = i + 1
	}

	return results, nil
}

func fuseRRF(fts, vector []rankedDocument, k float64) []rankedDocument {
	if k <= 0 {
		k = defaultHybridRRFK
	}

	fused := make(map[string]rankedDocument)

	for i, item := range fts {
		rank := i + 1
		key := item.Doc.ID.String()
		entry, exists := fused[key]
		if !exists {
			entry = item
		}
		entry.RankFTS = rank
		entry.FTSScore = item.FTSScore
		entry.Score += 1.0 / (k + float64(rank))
		fused[key] = entry
	}

	for i, item := range vector {
		rank := i + 1
		key := item.Doc.ID.String()
		entry, exists := fused[key]
		if !exists {
			entry = item
		}
		entry.RankVector = rank
		entry.VectorScore = item.VectorScore
		entry.Score += 1.0 / (k + float64(rank))
		fused[key] = entry
	}

	out := make([]rankedDocument, 0, len(fused))
	for _, item := range fused {
		out = append(out, item)
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Score == out[j].Score {
			if out[i].VectorScore == out[j].VectorScore {
				return out[i].FTSScore > out[j].FTSScore
			}
			return out[i].VectorScore > out[j].VectorScore
		}
		return out[i].Score > out[j].Score
	})

	return out
}

func (s *DomainAssistantService) makeCanonicalEmbedding(ctx context.Context, text string) []float64 {
	normalized := normalizeWhitespace(text)
	if normalized == "" {
		return nil
	}

	useRemote := s.getBoolConfig("RAG_USE_REMOTE_EMBEDDINGS", false)
	if useRemote && s.embeddingService != nil {
		if emb, err := s.embeddingService.CreateEmbedding(ctx, normalized); err == nil && len(emb) > 0 {
			return projectEmbedding(emb, canonicalEmbeddingDims)
		}
	}

	return buildLocalEmbedding(normalized, canonicalEmbeddingDims)
}

func buildLocalEmbedding(text string, dims int) []float64 {
	if dims <= 0 {
		dims = canonicalEmbeddingDims
	}
	vec := make([]float64, dims)
	tokens := tokenPattern.FindAllString(strings.ToLower(text), -1)
	if len(tokens) == 0 {
		return vec
	}

	for _, token := range tokens {
		h := fnv.New32a()
		_, _ = h.Write([]byte(token))
		idx := int(h.Sum32() % uint32(dims))
		vec[idx] += 1.0
	}
	return normalizeVector(vec)
}

func projectEmbedding(input []float64, dims int) []float64 {
	if dims <= 0 {
		dims = canonicalEmbeddingDims
	}
	out := make([]float64, dims)
	if len(input) == 0 {
		return out
	}
	for i, v := range input {
		out[i%dims] += v
	}
	return normalizeVector(out)
}

func normalizeVector(vec []float64) []float64 {
	if len(vec) == 0 {
		return vec
	}
	norm := 0.0
	for _, v := range vec {
		norm += v * v
	}
	if norm == 0 {
		return vec
	}
	norm = math.Sqrt(norm)
	for i := range vec {
		vec[i] /= norm
	}
	return vec
}

func cosineSimilarity(a, b []float64) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	if len(a) != len(b) {
		return 0
	}
	dot := 0.0
	for i := range a {
		dot += a[i] * b[i]
	}
	return dot
}

func (s *DomainAssistantService) routeDomains(query string, explicit []string) ([]string, bool) {
	if len(explicit) > 0 {
		domains := make([]string, 0, len(explicit))
		for _, d := range explicit {
			n := normalizeDomainName(d)
			if n != "" {
				domains = append(domains, n)
			}
		}
		domains = uniqueStrings(domains)
		return domains, len(domains) > 0
	}

	q := strings.ToLower(normalizeWhitespace(query))
	if q == "" {
		return nil, false
	}

	var domains []string
	for _, domain := range routingDomainOrder {
		keywords := domainKeywords[domain]
		for _, kw := range keywords {
			if strings.Contains(q, kw) {
				domains = append(domains, domain)
				break
			}
		}
	}

	// Booking keywords map to services domain.
	if strings.Contains(q, "booking") || strings.Contains(q, "брон") || strings.Contains(q, "слот") {
		domains = append(domains, "services")
	}

	return uniqueStrings(domains), len(domains) > 0
}

func (s *DomainAssistantService) allowedDomainSet() map[string]bool {
	value := strings.TrimSpace(s.getConfigValue("RAG_ALLOWED_DOMAINS"))
	allowed := make(map[string]bool)

	if value == "" {
		for _, d := range defaultMVPDomains {
			allowed[d] = true
		}
		return allowed
	}

	parts := strings.Split(value, ",")
	for _, p := range parts {
		n := normalizeDomainName(p)
		if n != "" {
			allowed[n] = true
		}
	}

	// Keep the assistant operational when config contains only unknown/invalid values.
	if len(allowed) == 0 {
		for _, d := range defaultMVPDomains {
			allowed[d] = true
		}
	}

	return allowed
}

func (s *DomainAssistantService) getBoolConfig(key string, fallback bool) bool {
	value := strings.TrimSpace(s.getConfigValue(key))
	if value == "" {
		return fallback
	}
	return parseBoolWithDefault(value, fallback)
}

func (s *DomainAssistantService) getConfigValue(key string) string {
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

func applyVisibilityFilter(query *gorm.DB, userID uint, includePrivate bool) *gorm.DB {
	if includePrivate && userID != 0 {
		return query.Where("(visibility_scope = ? AND user_id = 0) OR (visibility_scope = ? AND user_id = ?)",
			models.VisibilityScopePublic, models.VisibilityScopeUser, userID)
	}
	return query.Where("visibility_scope = ? AND user_id = 0", models.VisibilityScopePublic)
}

func normalizeDomainName(raw string) string {
	v := strings.ToLower(strings.TrimSpace(raw))
	switch v {
	case "products", "product", "shops", "shop", "marketplace":
		return "market"
	case "service", "booking", "bookings", "slots", "tariffs":
		return "services"
	case "maps", "geo":
		return "map"
	case "media", "audio", "video", "radio", "tv":
		return "multimedia"
	case "yatras", "travel":
		return "yatra"
	case "cafes", "restaurant":
		return "cafe"
	case "charities", "donations":
		return "charity"
	default:
		return v
	}
}

func filterOutWave2Domains(domains []string) []string {
	wave2 := map[string]struct{}{}
	for _, d := range wave2Domains {
		wave2[d] = struct{}{}
	}
	filtered := make([]string, 0, len(domains))
	for _, d := range domains {
		if _, blocked := wave2[d]; blocked {
			continue
		}
		filtered = append(filtered, d)
	}
	return filtered
}

func detectLanguageDA(text string) string {
	for _, r := range text {
		if unicode.In(r, unicode.Cyrillic) {
			return "ru"
		}
	}
	return "en"
}

func normalizeWhitespace(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	return strings.Join(strings.Fields(s), " ")
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, v := range values {
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		result = append(result, v)
	}
	return result
}

func trimTo(s string, max int) string {
	if max <= 0 {
		return s
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max])
}

func makeSnippet(s string, max int) string {
	s = normalizeWhitespace(s)
	if max <= 0 {
		return s
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "..."
}

func isRecordNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

func shouldFallbackToLikeSearch(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "search_vector") ||
		strings.Contains(lower, "plainto_tsquery") ||
		strings.Contains(lower, "ts_rank")
}

func escapeLikePatternDA(value string) string {
	if value == "" {
		return ""
	}
	replacer := strings.NewReplacer(
		`\`, `\\`,
		`%`, `\%`,
		`_`, `\_`,
	)
	return replacer.Replace(value)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func parseIntWithDefaultDA(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}

func languageOrDefault(lang, fallback string) string {
	lang = strings.TrimSpace(strings.ToLower(lang))
	if lang == "" {
		return fallback
	}
	return lang
}

func weekdayLabel(day int) string {
	switch day {
	case 0:
		return "Sunday"
	case 1:
		return "Monday"
	case 2:
		return "Tuesday"
	case 3:
		return "Wednesday"
	case 4:
		return "Thursday"
	case 5:
		return "Friday"
	case 6:
		return "Saturday"
	default:
		return "Day"
	}
}

func round(v float64, places int) float64 {
	if places < 0 {
		return v
	}
	pow := math.Pow(10, float64(places))
	return math.Round(v*pow) / pow
}
