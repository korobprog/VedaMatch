package services

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/html"
)

// ParsedContent represents the result of parsing a news source
type ParsedContent struct {
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	Summary     string    `json:"summary"`
	ImageURL    string    `json:"imageUrl"`
	SourceURL   string    `json:"sourceUrl"`
	PublishedAt time.Time `json:"publishedAt"`
	Author      string    `json:"author"`
	Tags        []string  `json:"tags"`
	Language    string    `json:"language"` // detected language: "ru" or "en"
	ExternalID  string    `json:"externalId"`
}

// NewsParser is the interface that all parsers must implement
type NewsParser interface {
	// Parse fetches and parses content from the source
	Parse(ctx context.Context, sourceURL string) ([]ParsedContent, error)

	// SourceType returns the type of source this parser handles
	SourceType() string

	// CanHandle checks if this parser can handle the given URL
	CanHandle(url string) bool
}

// ParserService manages all available parsers and executes them
type ParserService struct {
	parsers    []NewsParser
	httpClient *http.Client
}

// NewParserService creates a new parser service with all available parsers
func NewParserService() *ParserService {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	service := &ParserService{
		httpClient: client,
		parsers:    make([]NewsParser, 0),
	}

	// Register available parsers
	service.RegisterParser(NewRSSParser(client))
	service.RegisterParser(NewURLParser(client))

	// Register social media parsers (VK, Telegram)
	service.RegisterSocialParsers()

	return service
}

// RegisterParser adds a new parser to the service
func (s *ParserService) RegisterParser(parser NewsParser) {
	s.parsers = append(s.parsers, parser)
	log.Printf("[ParserService] Registered parser: %s", parser.SourceType())
}

// GetParser returns an appropriate parser for the given source type
func (s *ParserService) GetParser(sourceType string) NewsParser {
	for _, p := range s.parsers {
		if p.SourceType() == sourceType {
			return p
		}
	}
	return nil
}

// GetParserForURL finds a parser that can handle the given URL
func (s *ParserService) GetParserForURL(url string) NewsParser {
	for _, p := range s.parsers {
		if p.CanHandle(url) {
			return p
		}
	}
	return nil
}

// Parse uses the appropriate parser to fetch content from the URL
func (s *ParserService) Parse(ctx context.Context, sourceType, sourceURL string) ([]ParsedContent, error) {
	parser := s.GetParser(sourceType)
	if parser == nil {
		// Try to auto-detect parser
		parser = s.GetParserForURL(sourceURL)
	}

	if parser == nil {
		return nil, fmt.Errorf("no suitable parser found for source type: %s, url: %s", sourceType, sourceURL)
	}

	log.Printf("[ParserService] Parsing %s with %s parser", sourceURL, parser.SourceType())
	return parser.Parse(ctx, sourceURL)
}

// ============================================================================
// RSS Parser
// ============================================================================

type RSSParser struct {
	client *http.Client
}

func NewRSSParser(client *http.Client) *RSSParser {
	return &RSSParser{client: client}
}

func (p *RSSParser) SourceType() string {
	return "rss"
}

func (p *RSSParser) CanHandle(url string) bool {
	lowerURL := strings.ToLower(url)
	return strings.Contains(lowerURL, "rss") ||
		strings.Contains(lowerURL, "feed") ||
		strings.HasSuffix(lowerURL, ".xml") ||
		strings.Contains(lowerURL, "atom")
}

// RSS Feed structures
type rssFeed struct {
	XMLName xml.Name   `xml:"rss"`
	Channel rssChannel `xml:"channel"`
}

type rssChannel struct {
	Title       string    `xml:"title"`
	Description string    `xml:"description"`
	Items       []rssItem `xml:"item"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	Content     string `xml:"encoded"` // content:encoded
	PubDate     string `xml:"pubDate"`
	Author      string `xml:"author"`
	Creator     string `xml:"creator"` // dc:creator
	GUID        string `xml:"guid"`
	Enclosure   struct {
		URL  string `xml:"url,attr"`
		Type string `xml:"type,attr"`
	} `xml:"enclosure"`
	MediaContent struct {
		URL string `xml:"url,attr"`
	} `xml:"content"` // media:content
}

// Atom Feed structures
type atomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	Title   string      `xml:"title"`
	Entries []atomEntry `xml:"entry"`
}

type atomEntry struct {
	Title string `xml:"title"`
	Link  struct {
		Href string `xml:"href,attr"`
	} `xml:"link"`
	Summary   string `xml:"summary"`
	Content   string `xml:"content"`
	Published string `xml:"published"`
	Updated   string `xml:"updated"`
	Author    struct {
		Name string `xml:"name"`
	} `xml:"author"`
	ID string `xml:"id"`
}

func (p *RSSParser) Parse(ctx context.Context, sourceURL string) ([]ParsedContent, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", sourceURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "VedicAI News Bot/1.0")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Try RSS format first
	var rss rssFeed
	if err := xml.Unmarshal(body, &rss); err == nil && len(rss.Channel.Items) > 0 {
		return p.parseRSSItems(rss.Channel.Items), nil
	}

	// Try Atom format
	var atom atomFeed
	if err := xml.Unmarshal(body, &atom); err == nil && len(atom.Entries) > 0 {
		return p.parseAtomEntries(atom.Entries), nil
	}

	return nil, fmt.Errorf("failed to parse feed as RSS or Atom")
}

func (p *RSSParser) parseRSSItems(items []rssItem) []ParsedContent {
	var results []ParsedContent

	for _, item := range items {
		content := item.Content
		if content == "" {
			content = item.Description
		}

		author := item.Author
		if author == "" {
			author = item.Creator
		}

		imageURL := item.Enclosure.URL
		if imageURL == "" {
			imageURL = item.MediaContent.URL
		}
		if imageURL == "" {
			imageURL = extractFirstImage(content)
		}

		pubDate := parseDate(item.PubDate)

		results = append(results, ParsedContent{
			Title:       cleanText(item.Title),
			Content:     cleanHTML(content),
			Summary:     truncate(cleanHTML(item.Description), 300),
			ImageURL:    imageURL,
			SourceURL:   item.Link,
			PublishedAt: pubDate,
			Author:      author,
			ExternalID:  item.GUID,
			Language:    detectLanguage(item.Title + " " + content),
		})
	}

	return results
}

func (p *RSSParser) parseAtomEntries(entries []atomEntry) []ParsedContent {
	var results []ParsedContent

	for _, entry := range entries {
		content := entry.Content
		if content == "" {
			content = entry.Summary
		}

		pubDate := parseDate(entry.Published)
		if pubDate.IsZero() {
			pubDate = parseDate(entry.Updated)
		}

		results = append(results, ParsedContent{
			Title:       cleanText(entry.Title),
			Content:     cleanHTML(content),
			Summary:     truncate(cleanHTML(entry.Summary), 300),
			ImageURL:    extractFirstImage(content),
			SourceURL:   entry.Link.Href,
			PublishedAt: pubDate,
			Author:      entry.Author.Name,
			ExternalID:  entry.ID,
			Language:    detectLanguage(entry.Title + " " + content),
		})
	}

	return results
}

// ============================================================================
// URL Parser (for direct web pages)
// ============================================================================

type URLParser struct {
	client *http.Client
}

func NewURLParser(client *http.Client) *URLParser {
	return &URLParser{client: client}
}

func (p *URLParser) SourceType() string {
	return "url"
}

func (p *URLParser) CanHandle(url string) bool {
	return strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")
}

func (p *URLParser) Parse(ctx context.Context, sourceURL string) ([]ParsedContent, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", sourceURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "VedicAI News Bot/1.0")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	meta := p.extractMetadata(doc)
	meta.SourceURL = sourceURL
	meta.Language = detectLanguage(meta.Title + " " + meta.Content)

	if meta.Title == "" {
		return nil, fmt.Errorf("could not extract title from page")
	}

	return []ParsedContent{meta}, nil
}

func (p *URLParser) extractMetadata(doc *html.Node) ParsedContent {
	result := ParsedContent{
		PublishedAt: time.Now(),
	}

	var extractNode func(*html.Node)
	extractNode = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "title":
				if n.FirstChild != nil && result.Title == "" {
					result.Title = cleanText(n.FirstChild.Data)
				}
			case "meta":
				name, content := "", ""
				property := ""
				for _, attr := range n.Attr {
					switch attr.Key {
					case "name":
						name = attr.Val
					case "property":
						property = attr.Val
					case "content":
						content = attr.Val
					}
				}

				// OpenGraph tags
				switch property {
				case "og:title":
					if content != "" {
						result.Title = cleanText(content)
					}
				case "og:description":
					if content != "" {
						result.Summary = cleanText(content)
					}
				case "og:image":
					if content != "" {
						result.ImageURL = content
					}
				case "article:published_time":
					if t := parseDate(content); !t.IsZero() {
						result.PublishedAt = t
					}
				case "article:author":
					result.Author = content
				case "article:tag":
					result.Tags = append(result.Tags, content)
				}

				// Standard meta tags
				switch name {
				case "description":
					if result.Summary == "" && content != "" {
						result.Summary = cleanText(content)
					}
				case "author":
					if result.Author == "" {
						result.Author = content
					}
				case "keywords":
					if content != "" && len(result.Tags) == 0 {
						for _, tag := range strings.Split(content, ",") {
							result.Tags = append(result.Tags, strings.TrimSpace(tag))
						}
					}
				}

			case "article", "main":
				// Try to extract main content
				if result.Content == "" {
					result.Content = extractTextContent(n)
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractNode(c)
		}
	}

	extractNode(doc)

	// If no content found, use summary
	if result.Content == "" {
		result.Content = result.Summary
	}

	return result
}

// ============================================================================
// Helper Functions
// ============================================================================

func cleanText(s string) string {
	s = strings.TrimSpace(s)
	s = regexp.MustCompile(`\s+`).ReplaceAllString(s, " ")
	return s
}

func cleanHTML(s string) string {
	// Remove HTML tags
	re := regexp.MustCompile(`<[^>]*>`)
	s = re.ReplaceAllString(s, "")

	// Decode common HTML entities
	s = strings.ReplaceAll(s, "&nbsp;", " ")
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&lt;", "<")
	s = strings.ReplaceAll(s, "&gt;", ">")
	s = strings.ReplaceAll(s, "&quot;", "\"")
	s = strings.ReplaceAll(s, "&#39;", "'")

	return cleanText(s)
}

func extractFirstImage(htmlContent string) string {
	re := regexp.MustCompile(`<img[^>]+src=["']([^"']+)["']`)
	matches := re.FindStringSubmatch(htmlContent)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

func extractTextContent(n *html.Node) string {
	var sb strings.Builder
	var extract func(*html.Node)
	extract = func(n *html.Node) {
		if n.Type == html.TextNode {
			sb.WriteString(n.Data)
			sb.WriteString(" ")
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extract(c)
		}
	}
	extract(n)
	return cleanText(sb.String())
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	// Find last space before maxLen
	lastSpace := strings.LastIndex(s[:maxLen], " ")
	if lastSpace > 0 {
		return s[:lastSpace] + "..."
	}
	return s[:maxLen] + "..."
}

func parseDate(dateStr string) time.Time {
	if dateStr == "" {
		return time.Time{}
	}

	formats := []string{
		time.RFC1123,
		time.RFC1123Z,
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02 15:04:05",
		"2006-01-02",
		"Mon, 02 Jan 2006 15:04:05 MST",
		"Mon, 02 Jan 2006 15:04:05 -0700",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t
		}
	}

	return time.Time{}
}

func detectLanguage(text string) string {
	// Simple Russian detection based on Cyrillic characters
	cyrillicCount := 0
	latinCount := 0

	for _, r := range text {
		if r >= 0x0400 && r <= 0x04FF { // Cyrillic range
			cyrillicCount++
		} else if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			latinCount++
		}
	}

	if cyrillicCount > latinCount {
		return "ru"
	}
	return "en"
}
