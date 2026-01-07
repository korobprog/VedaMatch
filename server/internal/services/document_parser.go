package services

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/russross/blackfriday/v2"
	"github.com/unidoc/unipdf/v3/extractor"
	"github.com/unidoc/unipdf/v3/model"
)

// DocumentParser handles parsing different document formats
type DocumentParser struct {
	maxChunkSize   int
	chunkOverlap   int
	chunkSeparator string
}

// NewDocumentParser creates a new document parser
func NewDocumentParser() *DocumentParser {
	return &DocumentParser{
		maxChunkSize:   1000,
		chunkOverlap:   200,
		chunkSeparator: "\n\n",
	}
}

// DocumentContent represents parsed document content
type DocumentContent struct {
	Text      string
	Metadata  map[string]interface{}
	PageCount int
}

// ParseDocument parses a document from bytes based on mimeType
func (p *DocumentParser) ParseDocument(content []byte, mimeType, fileName string) (*DocumentContent, error) {
	switch {
	case strings.Contains(mimeType, "pdf"):
		return p.parsePDF(content)
	case strings.Contains(mimeType, "text/plain"):
		return p.parseText(content)
	case strings.Contains(mimeType, "text/markdown"), strings.HasSuffix(fileName, ".md"):
		return p.parseMarkdown(content)
	default:
		return nil, fmt.Errorf("unsupported mime type: %s", mimeType)
	}
}

// parsePDF extracts text from PDF files
func (p *DocumentParser) parsePDF(content []byte) (*DocumentContent, error) {
	pdfReader, err := model.NewPdfReader(bytes.NewReader(content))
	if err != nil {
		return nil, fmt.Errorf("failed to create PDF reader: %w", err)
	}

	numPages, err := pdfReader.GetNumPages()
	if err != nil {
		return nil, fmt.Errorf("failed to get number of pages: %w", err)
	}

	var textBuilder strings.Builder
	pageCount := 0

	for i := 1; i <= numPages; i++ {
		page, err := pdfReader.GetPage(i)
		if err != nil {
			continue
		}

		ex, err := extractor.New(page)
		if err != nil {
			continue
		}

		pageText, err := ex.ExtractText()
		if err != nil {
			continue
		}

		if pageText != "" {
			if pageCount > 0 {
				textBuilder.WriteString("\n\n")
			}
			textBuilder.WriteString(pageText)
			pageCount++
		}
	}

	return &DocumentContent{
		Text:      textBuilder.String(),
		Metadata:  map[string]interface{}{"page_count": pageCount},
		PageCount: pageCount,
	}, nil
}

// parseText reads plain text files
func (p *DocumentParser) parseText(content []byte) (*DocumentContent, error) {
	text := string(content)

	// Count lines and estimate pages
	lines := strings.Split(text, "\n")
	estimatedPages := len(lines) / 50
	if estimatedPages < 1 {
		estimatedPages = 1
	}

	return &DocumentContent{
		Text:      text,
		Metadata:  map[string]interface{}{"line_count": len(lines)},
		PageCount: estimatedPages,
	}, nil
}

// parseMarkdown converts markdown to plain text
func (p *DocumentParser) parseMarkdown(content []byte) (*DocumentContent, error) {
	// Convert markdown to HTML
	html := blackfriday.Run(content)

	// Basic HTML to text conversion
	text := p.htmlToText(string(html))

	lines := strings.Split(text, "\n")
	estimatedPages := len(lines) / 50
	if estimatedPages < 1 {
		estimatedPages = 1
	}

	return &DocumentContent{
		Text:      text,
		Metadata:  map[string]interface{}{"format": "markdown"},
		PageCount: estimatedPages,
	}, nil
}

// htmlToText is a simple HTML to text converter
func (p *DocumentParser) htmlToText(html string) string {
	// Remove HTML tags
	re := regexp.MustCompile(`<[^>]*>`)
	text := re.ReplaceAllString(html, "\n")

	// Decode common HTML entities
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&nbsp;", " ")

	// Clean up whitespace
	lines := strings.Split(text, "\n")
	var cleanLines []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			cleanLines = append(cleanLines, line)
		}
	}

	return strings.Join(cleanLines, "\n")
}

// Chunk splits text into smaller chunks with overlap
func (p *DocumentParser) Chunk(text string) []string {
	if text == "" {
		return []string{}
	}

	// Preprocess: normalize whitespace
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	if utf8.RuneCountInString(text) <= p.maxChunkSize {
		return []string{text}
	}

	var chunks []string
	position := 0
	textLength := len(text)

	for position < textLength {
		// Calculate end position
		end := position + p.maxChunkSize
		if end > textLength {
			end = textLength
		}

		// Try to find a natural break point
		if end < textLength {
			// Look for separator
			separatorPos := strings.LastIndex(text[position:end], p.chunkSeparator)
			if separatorPos != -1 {
				end = position + separatorPos + len(p.chunkSeparator)
			} else {
				// Look for sentence end
				sentencePos := strings.LastIndex(text[position:end], ". ")
				if sentencePos != -1 {
					end = position + sentencePos + 2
				} else {
					// Look for word boundary
					spacePos := strings.LastIndex(text[position:end], " ")
					if spacePos != -1 {
						end = position + spacePos
					}
				}
			}
		}

		chunk := strings.TrimSpace(text[position:end])
		if chunk != "" {
			chunks = append(chunks, chunk)
		}

		// Move position with overlap
		position = end - p.chunkOverlap
		if position < 0 {
			position = 0
		}

		// Skip forward if we're stuck
		if position <= end {
			position = end
		}
	}

	return chunks
}

// ChunkWithMetadata splits text and adds metadata to each chunk
func (p *DocumentParser) ChunkWithMetadata(text string, metadata map[string]interface{}) []map[string]interface{} {
	chunks := p.Chunk(text)
	result := make([]map[string]interface{}, len(chunks))

	for i, chunk := range chunks {
		chunkMetadata := make(map[string]interface{})
		for k, v := range metadata {
			chunkMetadata[k] = v
		}
		chunkMetadata["chunk_index"] = i
		chunkMetadata["total_chunks"] = len(chunks)

		result[i] = map[string]interface{}{
			"text":     chunk,
			"metadata": chunkMetadata,
		}
	}

	return result
}
