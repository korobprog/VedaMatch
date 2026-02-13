package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

// ============================================================================
// VK Parser
// ============================================================================

type VKParser struct {
	client *http.Client
}

func NewVKParser(client *http.Client) *VKParser {
	return &VKParser{client: client}
}

func (p *VKParser) SourceType() string {
	return "vk"
}

func (p *VKParser) CanHandle(u string) bool {
	return strings.Contains(u, "vk.com") || strings.HasPrefix(u, "-")
}

// VK API response structures
type vkWallResponse struct {
	Response struct {
		Count int      `json:"count"`
		Items []vkPost `json:"items"`
	} `json:"response"`
	Error *vkError `json:"error,omitempty"`
}

type vkPost struct {
	ID          int64          `json:"id"`
	FromID      int64          `json:"from_id"`
	OwnerID     int64          `json:"owner_id"`
	Date        int64          `json:"date"`
	Text        string         `json:"text"`
	Attachments []vkAttachment `json:"attachments,omitempty"`
	SignerID    int64          `json:"signer_id,omitempty"`
	IsPinned    int            `json:"is_pinned,omitempty"`
}

type vkAttachment struct {
	Type  string   `json:"type"`
	Photo *vkPhoto `json:"photo,omitempty"`
	Link  *vkLink  `json:"link,omitempty"`
}

type vkPhoto struct {
	Sizes []struct {
		Type   string `json:"type"`
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"sizes"`
}

type vkLink struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type vkError struct {
	Code    int    `json:"error_code"`
	Message string `json:"error_msg"`
}

func (p *VKParser) Parse(ctx context.Context, groupID string) ([]ParsedContent, error) {
	// Get VK token from settings
	var tokenSetting models.SystemSetting
	if err := database.DB.Where("key = ?", "VK_API_TOKEN").First(&tokenSetting).Error; err != nil {
		return nil, fmt.Errorf("VK_API_TOKEN not configured in settings")
	}
	if tokenSetting.Value == "" {
		return nil, fmt.Errorf("VK_API_TOKEN is empty")
	}

	// Get API version
	var versionSetting models.SystemSetting
	apiVersion := "5.199"
	if err := database.DB.Where("key = ?", "VK_API_VERSION").First(&versionSetting).Error; err == nil && versionSetting.Value != "" {
		apiVersion = versionSetting.Value
	}

	// Clean group ID
	cleanGroupID := strings.TrimPrefix(groupID, "-")
	cleanGroupID = strings.TrimPrefix(cleanGroupID, "public")
	cleanGroupID = strings.TrimPrefix(cleanGroupID, "club")
	// Remove URL parts if full URL provided
	if strings.Contains(cleanGroupID, "vk.com/") {
		parts := strings.Split(cleanGroupID, "vk.com/")
		if len(parts) > 1 {
			cleanGroupID = parts[1]
		}
	}

	// Build API URL
	// Determine if we should use owner_id (numeric) or domain (string)
	param := ""
	if _, err := strconv.ParseInt(cleanGroupID, 10, 64); err == nil {
		// It's numeric ID
		param = fmt.Sprintf("owner_id=-%s", cleanGroupID)
	} else {
		// It's a short name/domain
		param = fmt.Sprintf("domain=%s", cleanGroupID)
	}

	apiURL := fmt.Sprintf("https://api.vk.com/method/wall.get?%s&count=20&filter=owner&access_token=%s&v=%s",
		param, tokenSetting.Value, apiVersion)

	// Debug log (masking token)
	log.Printf("[VKParser] Fetching URL: https://api.vk.com/method/wall.get?%s&count=20&filter=owner&v=%s", param, apiVersion)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create VK request: %w", err)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("VK API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read VK response: %w", err)
	}

	var vkResp vkWallResponse
	if err := json.Unmarshal(body, &vkResp); err != nil {
		return nil, fmt.Errorf("failed to parse VK response: %w", err)
	}

	if vkResp.Error != nil {
		return nil, fmt.Errorf("VK API error %d: %s", vkResp.Error.Code, vkResp.Error.Message)
	}

	log.Printf("[VKParser] Fetched %d posts from group %s", len(vkResp.Response.Items), cleanGroupID)

	var results []ParsedContent
	for _, post := range vkResp.Response.Items {
		// Skip pinned posts (they're usually old)
		if post.IsPinned == 1 {
			continue
		}

		// Skip empty posts
		if post.Text == "" {
			continue
		}

		content := ParsedContent{
			Content:     post.Text,
			Title:       truncate(post.Text, 100),
			Summary:     truncate(post.Text, 300),
			PublishedAt: time.Unix(post.Date, 0),
			ExternalID:  fmt.Sprintf("vk_%d_%d", post.OwnerID, post.ID),
			SourceURL:   fmt.Sprintf("https://vk.com/wall%d_%d", post.OwnerID, post.ID),
			Language:    detectLanguage(post.Text),
		}

		// Extract image from attachments
		for _, att := range post.Attachments {
			if att.Type == "photo" && att.Photo != nil && len(att.Photo.Sizes) > 0 {
				// Get largest image
				var bestURL string
				var maxSize int
				for _, size := range att.Photo.Sizes {
					if size.Width*size.Height > maxSize {
						maxSize = size.Width * size.Height
						bestURL = size.URL
					}
				}
				if bestURL != "" {
					content.ImageURL = bestURL
					break
				}
			}
		}

		results = append(results, content)
	}

	return results, nil
}

// ============================================================================
// Telegram Parser
// ============================================================================

type TelegramParser struct {
	client *http.Client
}

func NewTelegramParser(client *http.Client) *TelegramParser {
	return &TelegramParser{client: client}
}

func (p *TelegramParser) SourceType() string {
	return "telegram"
}

func (p *TelegramParser) CanHandle(u string) bool {
	return strings.Contains(u, "t.me") || strings.HasPrefix(u, "@")
}

// Telegram API response structures
type tgUpdatesResponse struct {
	OK          bool       `json:"ok"`
	Result      []tgUpdate `json:"result"`
	ErrorCode   int        `json:"error_code,omitempty"`
	Description string     `json:"description,omitempty"`
}

type tgUpdate struct {
	UpdateID    int64      `json:"update_id"`
	ChannelPost *tgMessage `json:"channel_post,omitempty"`
	Message     *tgMessage `json:"message,omitempty"`
}

type tgMessage struct {
	MessageID int64         `json:"message_id"`
	Date      int64         `json:"date"`
	Text      string        `json:"text,omitempty"`
	Caption   string        `json:"caption,omitempty"`
	Chat      *tgChat       `json:"chat,omitempty"`
	Photo     []tgPhotoSize `json:"photo,omitempty"`
}

type tgChat struct {
	ID       int64  `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title,omitempty"`
	Username string `json:"username,omitempty"`
}

type tgPhotoSize struct {
	FileID   string `json:"file_id"`
	FileSize int    `json:"file_size,omitempty"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
}

func (p *TelegramParser) Parse(ctx context.Context, channelID string) ([]ParsedContent, error) {
	// 1. По умолчанию пытаемся понять, какой метод использовать.
	// Если ID начинается с "WEB:", используем скрапер
	if strings.HasPrefix(channelID, "WEB:") {
		return p.ParsePublic(ctx, strings.TrimPrefix(channelID, "WEB:"))
	}

	// 2. Старый метод через Bot API
	return p.ParseViaBot(ctx, channelID)
}

func (p *TelegramParser) ParseViaBot(ctx context.Context, channelID string) ([]ParsedContent, error) {
	// Get Telegram bot token from settings
	var tokenSetting models.SystemSetting
	if err := database.DB.Where("key = ?", "TELEGRAM_BOT_TOKEN").First(&tokenSetting).Error; err != nil {
		return nil, fmt.Errorf("TELEGRAM_BOT_TOKEN not configured in settings")
	}
	if tokenSetting.Value == "" {
		return nil, fmt.Errorf("TELEGRAM_BOT_TOKEN is empty")
	}

	// Clean channel ID
	cleanChannelID := strings.TrimPrefix(channelID, "@")
	cleanChannelID = strings.TrimPrefix(cleanChannelID, "https://t.me/")
	cleanChannelID = strings.TrimPrefix(cleanChannelID, "t.me/")

	// Use getUpdates to get channel posts (only works if bot is admin)
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?allowed_updates=[\"channel_post\"]&limit=50",
		url.PathEscape(tokenSetting.Value))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("telegram bot api returned status %d", resp.StatusCode)
	}

	var tgResp tgUpdatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&tgResp); err != nil {
		return nil, err
	}

	if !tgResp.OK {
		return nil, fmt.Errorf("TG API: %s", tgResp.Description)
	}

	var results []ParsedContent
	for _, update := range tgResp.Result {
		msg := update.ChannelPost
		if msg == nil {
			continue
		}

		if cleanChannelID != "" && msg.Chat != nil {
			if _, err := strconv.ParseInt(cleanChannelID, 10, 64); err != nil {
				if msg.Chat.Username != cleanChannelID {
					continue
				}
			}
		}
		if msg.Chat == nil {
			continue
		}

		text := msg.Text
		if text == "" {
			text = msg.Caption
		}
		if text == "" {
			continue
		}

		content := ParsedContent{
			Content:     text,
			Title:       truncate(text, 100),
			Summary:     truncate(text, 300),
			PublishedAt: time.Unix(msg.Date, 0),
			ExternalID:  fmt.Sprintf("tg_bot_%d_%d", msg.Chat.ID, msg.MessageID),
			SourceURL:   fmt.Sprintf("https://t.me/%s/%d", msg.Chat.Username, msg.MessageID),
		}

		results = append(results, content)
	}

	return results, nil
}

// ParsePublic парсит публичную веб-страницу канала t.me/s/username
func (p *TelegramParser) ParsePublic(ctx context.Context, channelID string) ([]ParsedContent, error) {
	cleanID := strings.TrimPrefix(channelID, "@")
	webURL := fmt.Sprintf("https://t.me/s/%s", cleanID)

	req, err := http.NewRequestWithContext(ctx, "GET", webURL, nil)
	if err != nil {
		return nil, err
	}
	// Важно имитировать браузер
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("telegram web returned status %d", resp.StatusCode)
	}

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read telegram web page: %w", readErr)
	}
	html := string(body)

	var results []ParsedContent
	// Простейший парсинг HTML (в идеале использовать goquery, но сделаем через поиск строк для скорости)
	// Ищем блоки <div class="tgme_widget_message_wrap...
	posts := strings.Split(html, "tgme_widget_message_wrap js-widget_message_wrap")
	if len(posts) <= 1 {
		return nil, nil // Постов не найдено
	}

	for _, post := range posts[1:] {
		// Извлекаем текст
		textStart := strings.Index(post, "tgme_widget_message_text js-message_text")
		if textStart == -1 {
			continue
		}

		// Находим содержимое внутри тега
		textPart := post[textStart:]
		tagEnd := strings.Index(textPart, ">")
		if tagEnd == -1 {
			continue
		}

		textEnd := strings.Index(textPart, "</div>")
		if textEnd == -1 {
			continue
		}

		content := textPart[tagEnd+1 : textEnd]
		// Очистка от HTML тегов (простая замена <br/>)
		content = strings.ReplaceAll(content, "<br/>", "\n")
		content = strings.ReplaceAll(content, "<b>", "")
		content = strings.ReplaceAll(content, "</b>", "")
		// ... можно добавить более мощную очистку

		// Извлекаем ID поста и дату (для ExternalID)
		// <a class="tgme_widget_message_date" href="https://t.me/username/123">
		linkIdx := strings.Index(post, "tgme_widget_message_date")
		if linkIdx == -1 {
			continue
		}
		hrefStart := strings.Index(post[linkIdx:], "href=\"")
		if hrefStart == -1 {
			continue
		}
		hrefEnd := strings.Index(post[linkIdx+hrefStart+6:], "\"")
		sourceURL := post[linkIdx+hrefStart+6 : linkIdx+hrefStart+6+hrefEnd]

		results = append(results, ParsedContent{
			Content:     content,
			Title:       truncate(content, 100),
			Summary:     truncate(content, 300),
			PublishedAt: time.Now(), // Дата в HTML ТГ сложная, для MVP ставим текущую
			ExternalID:  "tg_web_" + sourceURL,
			SourceURL:   sourceURL,
		})
	}

	// Возвращаем в обратном порядке (от новых к старым)
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

func (p *TelegramParser) getFileURL(ctx context.Context, token, fileID string) (string, error) {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s",
		url.PathEscape(token), url.QueryEscape(fileID))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("telegram getFile returned status %d", resp.StatusCode)
	}

	var result struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if !result.OK || result.Result.FilePath == "" {
		return "", fmt.Errorf("could not get file path")
	}

	return fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", token, result.Result.FilePath), nil
}

// RegisterSocialParsers registers VK and Telegram parsers to the service
func (s *ParserService) RegisterSocialParsers() {
	s.RegisterParser(NewVKParser(s.httpClient))
	s.RegisterParser(NewTelegramParser(s.httpClient))
}
