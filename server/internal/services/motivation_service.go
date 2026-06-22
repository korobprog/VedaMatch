package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"rag-agent-server/internal/models"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Default target languages: top-10 most spoken languages on Earth.
const defaultMotivationLanguages = "en,zh,hi,es,ar,fr,bn,pt,ru,id"

const defaultMotivationCharLimit = 280

// motivationLanguageNames maps language codes to human-readable names used in
// translation prompts so the model knows the target language unambiguously.
var motivationLanguageNames = map[string]string{
	"en": "English",
	"zh": "Chinese (Simplified)",
	"hi": "Hindi",
	"es": "Spanish",
	"ar": "Arabic",
	"fr": "French",
	"bn": "Bengali",
	"pt": "Portuguese",
	"ru": "Russian",
	"id": "Indonesian",
	"de": "German",
	"ja": "Japanese",
	"uk": "Ukrainian",
}

var motivationHTMLTagPattern = regexp.MustCompile(`(?s)<(script|style)[^>]*>.*?</(script|style)>`)
var motivationAnyTagPattern = regexp.MustCompile(`(?s)<[^>]+>`)
var motivationWhitespacePattern = regexp.MustCompile(`\s+`)

// MotivationService orchestrates AI generation of motivational posts and their
// translations, persisting everything to PostgreSQL.
type MotivationService struct {
	db           *gorm.DB
	ai           *NeuroGateClient
	mediaStorage SupportMediaStorage
	settings     func(key string) string
	httpClient   *http.Client
	now          func() time.Time
}

func NewMotivationService(db *gorm.DB) *MotivationService {
	settings := func(key string) string {
		return strings.TrimSpace(getSupportSetting(db, key))
	}
	ai := NewNeuroGateClient(NeuroGateConfig{
		APIKey:     func() string { return settings("NEUROGATE_API_KEY") },
		BaseURL:    func() string { return settings("NEUROGATE_BASE_URL") },
		TextModel:  func() string { return settings("NEUROGATE_MODEL") },
		ImageModel: func() string { return settings("NEUROGATE_IMAGE_MODEL") },
	})
	return &MotivationService{
		db:           db,
		ai:           ai,
		mediaStorage: NewDefaultSupportMediaStorage(),
		settings:     settings,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
		now:          time.Now,
	}
}

// TargetLanguages returns the configured list of post content languages.
func (s *MotivationService) TargetLanguages() []string {
	raw := s.settings("MOTIVATION_LANGUAGES")
	if raw == "" {
		raw = defaultMotivationLanguages
	}
	return splitAndCleanLanguages(raw)
}

func (s *MotivationService) defaultCharLimit() int {
	if v := s.settings("MOTIVATION_DEFAULT_CHAR_LIMIT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return defaultMotivationCharLimit
}

// CreatePostParams describes a new generation task.
type CreatePostParams struct {
	Theme            string
	SourceLinks      string // newline-separated URLs
	CharLimit        int
	OriginalLanguage string
	Source           models.MotivationPostSource
	CreatedByUserID  *uint
	TelegramChatID   int64
}

// CreateDraft persists a new post row with status "generating" but does not run
// the AI pipeline. Use RunGeneration (typically in a goroutine) to fill it in.
func (s *MotivationService) CreateDraft(params CreatePostParams) (*models.MotivationPost, error) {
	theme := strings.TrimSpace(params.Theme)
	if theme == "" {
		return nil, fmt.Errorf("theme is required")
	}
	origLang := normalizeMotivationLanguage(params.OriginalLanguage)
	if origLang == "" {
		origLang = "ru"
	}
	charLimit := params.CharLimit
	if charLimit <= 0 {
		charLimit = s.defaultCharLimit()
	}
	source := params.Source
	if source == "" {
		source = models.MotivationPostSourceOperator
	}

	post := &models.MotivationPost{
		Theme:            theme,
		SourceLinks:      strings.TrimSpace(params.SourceLinks),
		CharLimit:        charLimit,
		OriginalLanguage: origLang,
		Status:           models.MotivationPostStatusGenerating,
		Source:           source,
		CreatedByUserID:  params.CreatedByUserID,
		TelegramChatID:   params.TelegramChatID,
	}
	if err := s.db.Create(post).Error; err != nil {
		return nil, err
	}
	return post, nil
}

// RunGeneration loads a post by ID and runs the full AI pipeline, marking it
// failed on error. Safe to call from a background goroutine.
func (s *MotivationService) RunGeneration(ctx context.Context, postID uint) error {
	var post models.MotivationPost
	if err := s.db.First(&post, postID).Error; err != nil {
		return err
	}
	if err := s.generate(ctx, &post); err != nil {
		s.markFailed(&post, err)
		return err
	}
	return nil
}

// CreatePost persists a draft post then runs generation synchronously. Callers
// that must not block (e.g. HTTP handlers) should prefer CreateDraft +
// RunGeneration in a goroutine.
func (s *MotivationService) CreatePost(ctx context.Context, params CreatePostParams) (*models.MotivationPost, error) {
	post, err := s.CreateDraft(params)
	if err != nil {
		return nil, err
	}
	if err := s.generate(ctx, post); err != nil {
		s.markFailed(post, err)
		return post, err
	}
	return post, nil
}

// Regenerate re-runs generation for an existing post (e.g. after edits).
func (s *MotivationService) Regenerate(ctx context.Context, postID uint) (*models.MotivationPost, error) {
	var post models.MotivationPost
	if err := s.db.First(&post, postID).Error; err != nil {
		return nil, err
	}
	post.Status = models.MotivationPostStatusGenerating
	post.Error = ""
	s.db.Model(&post).Updates(map[string]interface{}{"status": post.Status, "error": ""})

	// Drop existing translations so they are regenerated cleanly.
	s.db.Where("post_id = ?", post.ID).Delete(&models.MotivationPostTranslation{})

	if err := s.generate(ctx, &post); err != nil {
		s.markFailed(&post, err)
		return &post, err
	}
	return &post, nil
}

func (s *MotivationService) markFailed(post *models.MotivationPost, cause error) {
	log.Printf("[Motivation] generation failed for post %d: %v", post.ID, cause)
	post.Status = models.MotivationPostStatusFailed
	post.Error = cause.Error()
	s.db.Model(post).Updates(map[string]interface{}{"status": post.Status, "error": post.Error})
}

// generate performs the full pipeline: summary → text → image → translations.
func (s *MotivationService) generate(ctx context.Context, post *models.MotivationPost) error {
	if !s.ai.HasAPIKey() {
		return fmt.Errorf("neurogate api key is not configured")
	}

	sourceContext := s.summarizeSources(ctx, post.SourceLinks)

	title, text, err := s.generateOriginalText(ctx, post, sourceContext)
	if err != nil {
		return fmt.Errorf("text generation: %w", err)
	}

	// Persist the original-language translation immediately.
	if err := s.upsertTranslation(post.ID, post.OriginalLanguage, title, text); err != nil {
		return err
	}

	// Image (best-effort: a failed image must not lose the generated text).
	if imageURL, imagePrompt, err := s.generateAndStoreImage(ctx, post, text); err != nil {
		log.Printf("[Motivation] image generation failed for post %d: %v", post.ID, err)
	} else {
		post.ImageURL = imageURL
		post.ImagePrompt = imagePrompt
		s.db.Model(post).Updates(map[string]interface{}{"image_url": imageURL, "image_prompt": imagePrompt})
	}

	// Translations into every other target language.
	for _, lang := range s.TargetLanguages() {
		if lang == post.OriginalLanguage {
			continue
		}
		tTitle, tText, err := s.translate(ctx, post, title, text, lang)
		if err != nil {
			log.Printf("[Motivation] translation to %s failed for post %d: %v", lang, post.ID, err)
			continue
		}
		if err := s.upsertTranslation(post.ID, lang, tTitle, tText); err != nil {
			log.Printf("[Motivation] saving %s translation failed for post %d: %v", lang, post.ID, err)
		}
	}

	post.Status = models.MotivationPostStatusReady
	post.Error = ""
	return s.db.Model(post).Updates(map[string]interface{}{"status": post.Status, "error": ""}).Error
}

func (s *MotivationService) generateOriginalText(ctx context.Context, post *models.MotivationPost, sourceContext string) (title, text string, err error) {
	langName := motivationLanguageDisplayName(post.OriginalLanguage)
	system := fmt.Sprintf(
		"You are a writer of short, uplifting motivational posts. Write exclusively in %s. "+
			"Return STRICT JSON with keys \"title\" and \"text\". The title is a short headline (max 60 characters). "+
			"The text must be inspiring, self-contained, and MUST NOT exceed %d characters. No hashtags, no markdown, no quotes around the whole text.",
		langName, post.CharLimit,
	)
	var sb strings.Builder
	fmt.Fprintf(&sb, "Theme: %s\n", post.Theme)
	if strings.TrimSpace(sourceContext) != "" {
		fmt.Fprintf(&sb, "\nUse the essence of these reference notes (do not copy verbatim):\n%s\n", sourceContext)
	}
	fmt.Fprintf(&sb, "\nWrite the motivational post now as JSON.")

	raw, err := s.ai.Chat(ctx, system, sb.String(), ChatOptions{Temperature: 0.8, MaxTokens: 1024, JSONObject: true})
	if err != nil {
		return "", "", err
	}
	title, text = parseTitleTextJSON(raw)
	if strings.TrimSpace(text) == "" {
		return "", "", fmt.Errorf("empty generated text")
	}
	text = enforceCharLimit(text, post.CharLimit)
	return title, text, nil
}

func (s *MotivationService) translate(ctx context.Context, post *models.MotivationPost, title, text, lang string) (string, string, error) {
	langName := motivationLanguageDisplayName(lang)
	system := fmt.Sprintf(
		"You are a professional translator. Translate the given motivational post into %s, preserving tone and meaning. "+
			"Return STRICT JSON with keys \"title\" and \"text\". Keep the text within %d characters.",
		langName, post.CharLimit,
	)
	payload, _ := json.Marshal(map[string]string{"title": title, "text": text})
	raw, err := s.ai.Chat(ctx, system, "Translate this JSON post:\n"+string(payload), ChatOptions{Temperature: 0.3, MaxTokens: 1024, JSONObject: true})
	if err != nil {
		return "", "", err
	}
	tTitle, tText := parseTitleTextJSON(raw)
	if strings.TrimSpace(tText) == "" {
		return "", "", fmt.Errorf("empty translation")
	}
	return tTitle, enforceCharLimit(tText, post.CharLimit), nil
}

func (s *MotivationService) generateAndStoreImage(ctx context.Context, post *models.MotivationPost, text string) (string, string, error) {
	// Ask the text model for a concise visual prompt.
	imagePrompt, err := s.ai.Chat(ctx,
		"You write concise prompts for an AI image generator. Output ONLY the prompt, in English, max 60 words, no quotes.",
		fmt.Sprintf("Create a beautiful, serene, inspiring background image prompt for a motivational post about: %s\nThe post text: %s", post.Theme, text),
		ChatOptions{Temperature: 0.7, MaxTokens: 200},
	)
	if err != nil || strings.TrimSpace(imagePrompt) == "" {
		// Fall back to a deterministic prompt built from the theme.
		imagePrompt = fmt.Sprintf("A serene, inspiring, high-quality background illustration about %s, soft light, calm atmosphere, no text", post.Theme)
	}
	imagePrompt = strings.TrimSpace(imagePrompt)

	img, err := s.ai.GenerateImage(ctx, imagePrompt, ImageOptions{})
	if err != nil {
		return "", imagePrompt, err
	}
	key := buildMotivationImageKey(post.ID, img.ContentType)
	url, _, err := s.mediaStorage.Save(ctx, key, img.ContentType, img.Bytes)
	if err != nil {
		return "", imagePrompt, err
	}
	return url, imagePrompt, nil
}

// summarizeSources fetches the operator-supplied links and asks the model for a
// short distilled summary to ground the post. Best-effort: failures yield "".
func (s *MotivationService) summarizeSources(ctx context.Context, sourceLinks string) string {
	urls := extractURLs(sourceLinks)
	if len(urls) == 0 {
		return ""
	}
	var combined strings.Builder
	for _, u := range urls {
		body := s.fetchURLText(ctx, u)
		if body == "" {
			continue
		}
		if len(body) > 6000 {
			body = body[:6000]
		}
		fmt.Fprintf(&combined, "Source %s:\n%s\n\n", u, body)
	}
	if combined.Len() == 0 {
		return ""
	}
	summary, err := s.ai.Chat(ctx,
		"You distill reference material into concise bullet notes capturing the key ideas. Output plain text, max 200 words.",
		"Summarize the essence of the following material:\n\n"+combined.String(),
		ChatOptions{Temperature: 0.3, MaxTokens: 600},
	)
	if err != nil {
		log.Printf("[Motivation] source summarization failed: %v", err)
		return ""
	}
	return strings.TrimSpace(summary)
}

func (s *MotivationService) fetchURLText(ctx context.Context, url string) string {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "VedaMatch-Motivation/1.0")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1 MiB cap
	if err != nil {
		return ""
	}
	return stripHTML(string(data))
}

func (s *MotivationService) upsertTranslation(postID uint, lang, title, text string) error {
	translation := models.MotivationPostTranslation{
		PostID:   postID,
		Language: lang,
		Title:    title,
		Text:     text,
	}
	return s.db.Where("post_id = ? AND language = ?", postID, lang).
		Assign(map[string]interface{}{"title": title, "text": text}).
		FirstOrCreate(&translation).Error
}

// ----- helpers -----

func splitAndCleanLanguages(raw string) []string {
	parts := strings.Split(raw, ",")
	seen := make(map[string]bool)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		lang := normalizeMotivationLanguage(p)
		if lang == "" || seen[lang] {
			continue
		}
		seen[lang] = true
		out = append(out, lang)
	}
	return out
}

func normalizeMotivationLanguage(input string) string {
	lang := strings.ToLower(strings.TrimSpace(input))
	if lang == "" {
		return ""
	}
	if idx := strings.IndexAny(lang, "-_"); idx > 0 {
		lang = lang[:idx]
	}
	return lang
}

func motivationLanguageDisplayName(lang string) string {
	if name, ok := motivationLanguageNames[normalizeMotivationLanguage(lang)]; ok {
		return name
	}
	return lang
}

func parseTitleTextJSON(raw string) (title, text string) {
	cleaned := stripCodeFences(raw)
	var obj struct {
		Title string `json:"title"`
		Text  string `json:"text"`
	}
	if err := json.Unmarshal([]byte(cleaned), &obj); err == nil {
		return strings.TrimSpace(obj.Title), strings.TrimSpace(obj.Text)
	}
	// Fallback: treat the whole response as the text body.
	return "", strings.TrimSpace(cleaned)
}

func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
		if i := strings.IndexByte(s, '\n'); i >= 0 {
			s = s[i+1:]
		}
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}

func enforceCharLimit(text string, limit int) string {
	if limit <= 0 {
		return text
	}
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return strings.TrimSpace(string(runes[:limit]))
}

func extractURLs(raw string) []string {
	fields := strings.FieldsFunc(raw, func(r rune) bool {
		return r == '\n' || r == '\r' || r == ' ' || r == ',' || r == '\t'
	})
	out := make([]string, 0, len(fields))
	for _, f := range fields {
		f = strings.TrimSpace(f)
		if strings.HasPrefix(f, "http://") || strings.HasPrefix(f, "https://") {
			out = append(out, f)
		}
	}
	return out
}

func stripHTML(html string) string {
	cleaned := motivationHTMLTagPattern.ReplaceAllString(html, " ")
	cleaned = motivationAnyTagPattern.ReplaceAllString(cleaned, " ")
	cleaned = motivationWhitespacePattern.ReplaceAllString(cleaned, " ")
	return strings.TrimSpace(cleaned)
}

func buildMotivationImageKey(postID uint, contentType string) string {
	ext := ".png"
	switch {
	case strings.Contains(contentType, "jpeg"), strings.Contains(contentType, "jpg"):
		ext = ".jpg"
	case strings.Contains(contentType, "webp"):
		ext = ".webp"
	}
	return fmt.Sprintf("motivation/images/%d/%d%s", postID, time.Now().UnixNano(), ext)
}
