package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"rag-agent-server/internal/models"

	"golang.org/x/net/html"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// VedabaseScraper crawls vedabase.ru and stores scripture content into the shared
// Scripture* tables so the vedabase site can read books offline. It is polite
// (custom User-Agent, configurable delay) and idempotent (upserts on natural keys).
type VedabaseScraper struct {
	db        *gorm.DB
	client    *http.Client
	baseURL   string
	userAgent string
	delay     time.Duration
	language  string
}

// VedabaseBookConfig describes how to crawl a single book on vedabase.ru.
type VedabaseBookConfig struct {
	Code      string // internal ScriptureBook.Code, e.g. "bg"
	Slug      string // vedabase.ru URL slug, e.g. "bhagavad-gita"
	NameRu    string
	NameEn    string
	HasCantos bool // true for multi-canto works like Srimad Bhagavatam
}

// vedabaseBooks is the registry of supported books. Extend as coverage grows.
var vedabaseBooks = map[string]VedabaseBookConfig{
	"bg": {Code: "bg", Slug: "bhagavad-gita", NameRu: "Бхагавад-гита как она есть", NameEn: "Bhagavad-gita As It Is", HasCantos: false},
	"sb": {Code: "sb", Slug: "srimad-bhagavatam", NameRu: "Шримад-Бхагаватам", NameEn: "Srimad Bhagavatam", HasCantos: true},
}

// ScrapeStats summarises a crawl run.
type ScrapeStats struct {
	Chapters int `json:"chapters"`
	Verses   int `json:"verses"`
}

// NewVedabaseScraper builds a scraper with sane defaults.
func NewVedabaseScraper(db *gorm.DB) *VedabaseScraper {
	return &VedabaseScraper{
		db:        db,
		client:    &http.Client{Timeout: 30 * time.Second},
		baseURL:   "https://vedabase.ru",
		userAgent: "VedaMatch Vedabase Sync/1.0 (+https://vedabase.vedamatch.ru)",
		delay:     750 * time.Millisecond,
		language:  "ru",
	}
}

// SetDelay overrides the inter-request delay (politeness throttle).
func (s *VedabaseScraper) SetDelay(d time.Duration) {
	if d > 0 {
		s.delay = d
	}
}

// SupportedBooks returns the codes this scraper knows how to crawl.
func SupportedVedabaseBooks() []string {
	codes := make([]string, 0, len(vedabaseBooks))
	for code := range vedabaseBooks {
		codes = append(codes, code)
	}
	return codes
}

// ScrapeBook crawls one book end to end and upserts its content.
func (s *VedabaseScraper) ScrapeBook(ctx context.Context, code string) (ScrapeStats, error) {
	cfg, ok := vedabaseBooks[code]
	if !ok {
		return ScrapeStats{}, fmt.Errorf("unsupported book code %q (supported: %v)", code, SupportedVedabaseBooks())
	}

	if err := s.ensureBook(cfg); err != nil {
		return ScrapeStats{}, fmt.Errorf("ensure book: %w", err)
	}

	var stats ScrapeStats
	if cfg.HasCantos {
		for canto := 1; ; canto++ {
			cantoStats, found, err := s.scrapeCanto(ctx, cfg, canto)
			if err != nil {
				return stats, err
			}
			if !found {
				break // no more cantos
			}
			stats.Chapters += cantoStats.Chapters
			stats.Verses += cantoStats.Verses
		}
		return stats, nil
	}

	// Single-canto book (canto stored as 0).
	for chapter := 1; ; chapter++ {
		chStats, found, err := s.scrapeChapter(ctx, cfg, 0, chapter)
		if err != nil {
			return stats, err
		}
		if !found {
			break // no more chapters
		}
		stats.Chapters++
		stats.Verses += chStats.Verses
	}
	return stats, nil
}

func (s *VedabaseScraper) scrapeCanto(ctx context.Context, cfg VedabaseBookConfig, canto int) (ScrapeStats, bool, error) {
	var stats ScrapeStats
	firstFound := false
	for chapter := 1; ; chapter++ {
		chStats, found, err := s.scrapeChapter(ctx, cfg, canto, chapter)
		if err != nil {
			return stats, firstFound, err
		}
		if !found {
			break
		}
		firstFound = true
		stats.Chapters++
		stats.Verses += chStats.Verses
	}
	return stats, firstFound, nil
}

// scrapeChapter crawls all verses of one chapter. Returns found=false when the
// chapter does not exist (HTTP 404), which signals the caller to stop iterating.
func (s *VedabaseScraper) scrapeChapter(ctx context.Context, cfg VedabaseBookConfig, canto, chapter int) (ScrapeStats, bool, error) {
	var stats ScrapeStats

	// Load the first verse page to obtain the chapter's node id used by next.php.
	firstVersePath := s.chapterFirstVersePath(cfg, canto, chapter)
	doc, status, err := s.fetchHTML(ctx, firstVersePath)
	if err != nil {
		return stats, false, err
	}
	if status == http.StatusNotFound {
		return stats, false, nil
	}
	if status != http.StatusOK {
		return stats, false, fmt.Errorf("GET %s: status %d", firstVersePath, status)
	}

	chapterNode, ok := extractChapterNodeID(doc)
	if !ok {
		// Chapter exists but has no infinite-scroll container (unexpected) — skip gracefully.
		return stats, true, nil
	}

	const pageLimit = 50
	lastSortOrder := 0
	for {
		items, err := s.fetchNextItems(ctx, chapterNode, lastSortOrder, pageLimit)
		if err != nil {
			return stats, true, err
		}
		if len(items) == 0 {
			break
		}
		for _, it := range items {
			verse, ok := parseVerseBlock(it.HTML)
			if !ok {
				continue
			}
			verse.BookCode = cfg.Code
			verse.Canto = canto
			verse.Chapter = chapter
			verse.Language = s.language
			verse.SourceURL = s.baseURL + s.versePath(cfg, canto, chapter, verse.Verse)
			if err := s.upsertVerse(verse); err != nil {
				return stats, true, err
			}
			stats.Verses++
			lastSortOrder = it.SortOrder
		}
		if len(items) < pageLimit {
			break
		}
	}

	return stats, true, nil
}

// --- HTTP helpers ---

func (s *VedabaseScraper) chapterFirstVersePath(cfg VedabaseBookConfig, canto, chapter int) string {
	if cfg.HasCantos {
		return fmt.Sprintf("/%s/%d/%d/1/", cfg.Slug, canto, chapter)
	}
	return fmt.Sprintf("/%s/%d/1/", cfg.Slug, chapter)
}

func (s *VedabaseScraper) versePath(cfg VedabaseBookConfig, canto, chapter int, verse string) string {
	if verse == "" {
		verse = "1"
	}
	if cfg.HasCantos {
		return fmt.Sprintf("/%s/%d/%d/%s/", cfg.Slug, canto, chapter, verse)
	}
	return fmt.Sprintf("/%s/%d/%s/", cfg.Slug, chapter, verse)
}

func (s *VedabaseScraper) fetchHTML(ctx context.Context, path string) (*html.Node, int, error) {
	s.throttle()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+path, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("User-Agent", s.userAgent)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, nil
	}
	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return doc, resp.StatusCode, nil
}

type nextItem struct {
	HTML      string `json:"html"`
	SortOrder int    `json:"sort_order"`
}

type nextResponse struct {
	OK    bool       `json:"ok"`
	Items []nextItem `json:"items"`
}

func (s *VedabaseScraper) fetchNextItems(ctx context.Context, parentID, lastSortOrder, limit int) ([]nextItem, error) {
	s.throttle()
	url := fmt.Sprintf("%s/next.php?parent_id=%d&last_sort_order=%d&limit=%d", s.baseURL, parentID, lastSortOrder, limit)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", s.userAgent)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("next.php status %d", resp.StatusCode)
	}
	var parsed nextResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if !parsed.OK {
		return nil, nil
	}
	return parsed.Items, nil
}

func (s *VedabaseScraper) throttle() {
	if s.delay > 0 {
		time.Sleep(s.delay)
	}
}

// --- persistence ---

func (s *VedabaseScraper) ensureBook(cfg VedabaseBookConfig) error {
	book := models.ScriptureBook{
		Code:   cfg.Code,
		NameEn: cfg.NameEn,
		NameRu: cfg.NameRu,
	}
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "code"}},
		DoUpdates: clause.AssignmentColumns([]string{"name_en", "name_ru", "updated_at"}),
	}).Create(&book).Error
}

func (s *VedabaseScraper) upsertVerse(v models.ScriptureVerse) error {
	// Manual upsert on the natural key (book_code + canto + chapter + verse + language).
	// The shared scripture_verses table has no unique index on these columns, so we
	// look up an existing row rather than relying on Postgres ON CONFLICT.
	var existing models.ScriptureVerse
	err := s.db.Where(
		"book_code = ? AND canto = ? AND chapter = ? AND verse = ? AND language = ?",
		v.BookCode, v.Canto, v.Chapter, v.Verse, v.Language,
	).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		return s.db.Create(&v).Error
	}
	if err != nil {
		return err
	}

	return s.db.Model(&existing).Updates(map[string]interface{}{
		"devanagari":      v.Devanagari,
		"transliteration": v.Transliteration,
		"synonyms":        v.Synonyms,
		"translation":     v.Translation,
		"purport":         v.Purport,
		"source_url":      v.SourceURL,
		"verse_reference": v.VerseReference,
	}).Error
}

// --- HTML parsing ---

var verseRefNumberRe = regexp.MustCompile(`([0-9]+(?:[-–][0-9]+)?)\s*$`)

// extractChapterNodeID reads data-parent-id from #infinite-scroll-container.
func extractChapterNodeID(doc *html.Node) (int, bool) {
	var found int
	var ok bool
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if ok {
			return
		}
		if n.Type == html.ElementNode && getAttr(n, "id") == "infinite-scroll-container" {
			if v := getAttr(n, "data-parent-id"); v != "" {
				if id, err := strconv.Atoi(v); err == nil {
					found, ok = id, true
					return
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return found, ok
}

// parseVerseBlock extracts a verse from a single .verse-block HTML fragment.
func parseVerseBlock(fragment string) (models.ScriptureVerse, bool) {
	doc, err := html.Parse(strings.NewReader(fragment))
	if err != nil {
		return models.ScriptureVerse{}, false
	}

	block := findByClass(doc, "verse-block")
	if block == nil {
		block = doc // fall back to whole fragment
	}

	reference := strings.TrimSpace(textOfClass(block, "for_quoting"))
	verseNum := ""
	if m := verseRefNumberRe.FindStringSubmatch(reference); m != nil {
		verseNum = strings.ReplaceAll(m[1], "–", "-")
	}

	v := models.ScriptureVerse{
		Verse:           verseNum,
		VerseReference:  reference,
		Devanagari:      strings.TrimSpace(textOfClass(block, "verse-text")),
		Transliteration: strings.TrimSpace(textOfClass(block, "verse-transcription")),
		Synonyms:        strings.TrimSpace(textOfClass(block, "verse-synonyms")),
		Translation:     strings.TrimSpace(textOfClass(block, "verse-translation")),
		Purport:         strings.TrimSpace(joinTextOfClass(block, "verse-purport", "\n\n")),
	}

	// A valid verse must have at least a translation or original text.
	if v.Translation == "" && v.Devanagari == "" {
		return models.ScriptureVerse{}, false
	}
	if v.Verse == "" {
		return models.ScriptureVerse{}, false
	}
	return v, true
}

// --- small html.Node utilities ---

func getAttr(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if a.Key == key {
			return a.Val
		}
	}
	return ""
}

func hasClass(n *html.Node, class string) bool {
	for _, c := range strings.Fields(getAttr(n, "class")) {
		if c == class {
			return true
		}
	}
	return false
}

func findByClass(n *html.Node, class string) *html.Node {
	if n.Type == html.ElementNode && hasClass(n, class) {
		return n
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if r := findByClass(c, class); r != nil {
			return r
		}
	}
	return nil
}

// textOfClass returns the rendered text of the first descendant with the class,
// converting <br> into newlines.
func textOfClass(root *html.Node, class string) string {
	node := findByClass(root, class)
	if node == nil {
		return ""
	}
	return nodeText(node)
}

// joinTextOfClass concatenates the text of all descendants with the class.
func joinTextOfClass(root *html.Node, class, sep string) string {
	var parts []string
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && hasClass(n, class) {
			if t := strings.TrimSpace(nodeText(n)); t != "" {
				parts = append(parts, t)
			}
			return // don't descend into nested same-class nodes
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(root)
	return strings.Join(parts, sep)
}

func nodeText(n *html.Node) string {
	var sb strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.TextNode {
			sb.WriteString(n.Data)
			return
		}
		if n.Type == html.ElementNode && n.Data == "br" {
			sb.WriteString("\n")
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	// Collapse trailing spaces on each line; keep intentional line breaks.
	lines := strings.Split(sb.String(), "\n")
	for i, ln := range lines {
		lines[i] = strings.TrimRight(strings.TrimSpace(ln), " ")
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}
