package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

type TelegramSendMessageOptions struct {
	ReplyMarkup           map[string]interface{}
	ReplyToMessageID      int64
	DisableWebPagePreview bool
}

type TelegramFileInfo struct {
	FilePath string
	FileSize int64
}

type DownloadedTelegramFile struct {
	Bytes       []byte
	ContentType string
	FileName    string
	FileSize    int64
}

type TelegramSupportClient interface {
	SendMessage(ctx context.Context, chatID int64, text string, options TelegramSendMessageOptions) (int64, error)
	SetChatMenuButton(ctx context.Context, chatID int64, text string, webAppURL string) error
	CopyMessage(ctx context.Context, toChatID, fromChatID, messageID int64) (int64, error)
	GetFile(ctx context.Context, fileID string) (*TelegramFileInfo, error)
	DownloadFile(ctx context.Context, filePath string) (*DownloadedTelegramFile, error)
}

type TelegramSupportHTTPClient struct {
	httpClient    *http.Client
	tokenProvider func() string
}

func NewTelegramSupportHTTPClient(tokenProvider func() string) *TelegramSupportHTTPClient {
	return &TelegramSupportHTTPClient{
		httpClient: &http.Client{Timeout: 45 * time.Second},
		tokenProvider: func() string {
			if tokenProvider == nil {
				return ""
			}
			return strings.TrimSpace(tokenProvider())
		},
	}
}

func (c *TelegramSupportHTTPClient) botURL(method string) (string, error) {
	token := c.tokenProvider()
	if token == "" {
		return "", fmt.Errorf("support telegram bot token is empty")
	}
	return fmt.Sprintf("https://api.telegram.org/bot%s/%s", token, method), nil
}

func (c *TelegramSupportHTTPClient) fileURL(filePath string) (string, error) {
	token := c.tokenProvider()
	if token == "" {
		return "", fmt.Errorf("support telegram bot token is empty")
	}
	return fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", token, strings.TrimPrefix(filePath, "/")), nil
}

func (c *TelegramSupportHTTPClient) SendMessage(ctx context.Context, chatID int64, text string, options TelegramSendMessageOptions) (int64, error) {
	url, err := c.botURL("sendMessage")
	if err != nil {
		return 0, err
	}

	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    text,
	}
	if options.ReplyMarkup != nil {
		payload["reply_markup"] = options.ReplyMarkup
	}
	if options.ReplyToMessageID > 0 {
		payload["reply_to_message_id"] = options.ReplyToMessageID
	}
	if options.DisableWebPagePreview {
		payload["disable_web_page_preview"] = true
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var tgResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
		Result      struct {
			MessageID int64 `json:"message_id"`
		} `json:"result"`
	}
	if err := json.Unmarshal(respBody, &tgResp); err != nil {
		return 0, fmt.Errorf("telegram sendMessage decode failed: %w", err)
	}
	if !tgResp.OK {
		return 0, fmt.Errorf("telegram sendMessage failed: %s", tgResp.Description)
	}
	return tgResp.Result.MessageID, nil
}

func (c *TelegramSupportHTTPClient) SetChatMenuButton(ctx context.Context, chatID int64, text string, webAppURL string) error {
	url, err := c.botURL("setChatMenuButton")
	if err != nil {
		return err
	}

	payload := map[string]interface{}{
		"chat_id": chatID,
		"menu_button": map[string]interface{}{
			"type": "web_app",
			"text": strings.TrimSpace(text),
			"web_app": map[string]string{
				"url": strings.TrimSpace(webAppURL),
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	var tgResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal(respBody, &tgResp); err != nil {
		return fmt.Errorf("telegram setChatMenuButton decode failed: %w", err)
	}
	if !tgResp.OK {
		return fmt.Errorf("telegram setChatMenuButton failed: %s", tgResp.Description)
	}
	return nil
}

func (c *TelegramSupportHTTPClient) CopyMessage(ctx context.Context, toChatID, fromChatID, messageID int64) (int64, error) {
	url, err := c.botURL("copyMessage")
	if err != nil {
		return 0, err
	}

	payload := map[string]interface{}{
		"chat_id":      toChatID,
		"from_chat_id": fromChatID,
		"message_id":   messageID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var tgResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
		Result      struct {
			MessageID int64 `json:"message_id"`
		} `json:"result"`
	}
	if err := json.Unmarshal(respBody, &tgResp); err != nil {
		return 0, fmt.Errorf("telegram copyMessage decode failed: %w", err)
	}
	if !tgResp.OK {
		return 0, fmt.Errorf("telegram copyMessage failed: %s", tgResp.Description)
	}
	return tgResp.Result.MessageID, nil
}

func (c *TelegramSupportHTTPClient) GetFile(ctx context.Context, fileID string) (*TelegramFileInfo, error) {
	url, err := c.botURL("getFile")
	if err != nil {
		return nil, err
	}

	payload := map[string]interface{}{
		"file_id": fileID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tgResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
		Result      struct {
			FilePath string `json:"file_path"`
			FileSize int64  `json:"file_size"`
		} `json:"result"`
	}
	if err := json.Unmarshal(respBody, &tgResp); err != nil {
		return nil, fmt.Errorf("telegram getFile decode failed: %w", err)
	}
	if !tgResp.OK {
		return nil, fmt.Errorf("telegram getFile failed: %s", tgResp.Description)
	}

	return &TelegramFileInfo{
		FilePath: tgResp.Result.FilePath,
		FileSize: tgResp.Result.FileSize,
	}, nil
}

func (c *TelegramSupportHTTPClient) DownloadFile(ctx context.Context, filePath string) (*DownloadedTelegramFile, error) {
	url, err := c.fileURL(filePath)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("telegram file download failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" {
		ext := strings.ToLower(filepath.Ext(filePath))
		contentType = mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}

	return &DownloadedTelegramFile{
		Bytes:       data,
		ContentType: contentType,
		FileName:    filepath.Base(filePath),
		FileSize:    int64(len(data)),
	}, nil
}
