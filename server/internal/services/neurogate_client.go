package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// NeuroGate is an OpenAI-compatible AI gateway (https://api.neurogate.space/v1)
// used by the motivation module for text generation/translation and image
// generation. Auth is a Bearer token.
//
// Endpoints used:
//   - POST {base}/chat/completions   (text)
//   - POST {base}/images/generations (image)
//
// The base URL, models and API key are resolved lazily through providers so
// they can come from system_settings or env vars without restarts.

const (
	neurogateDefaultBaseURL    = "https://api.neurogate.space/v1"
	neurogateDefaultTextModel  = "deepseek-v4-flash"
	neurogateDefaultImageModel = "flux-1-schnell"
)

type NeuroGateClient struct {
	httpClient   *http.Client
	apiKey       func() string
	baseURL      func() string
	textModel    func() string
	imageModel   func() string
}

// NeuroGateConfig wires the lazy providers for the client.
type NeuroGateConfig struct {
	APIKey     func() string
	BaseURL    func() string
	TextModel  func() string
	ImageModel func() string
}

func NewNeuroGateClient(cfg NeuroGateConfig) *NeuroGateClient {
	return &NeuroGateClient{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		apiKey:     cfg.APIKey,
		baseURL:    cfg.BaseURL,
		textModel:  cfg.TextModel,
		imageModel: cfg.ImageModel,
	}
}

func (c *NeuroGateClient) resolveBaseURL() string {
	if c.baseURL != nil {
		if v := strings.TrimRight(strings.TrimSpace(c.baseURL()), "/"); v != "" {
			return v
		}
	}
	return neurogateDefaultBaseURL
}

func (c *NeuroGateClient) resolveAPIKey() string {
	if c.apiKey == nil {
		return ""
	}
	return strings.TrimSpace(c.apiKey())
}

func (c *NeuroGateClient) resolveTextModel(override string) string {
	if v := strings.TrimSpace(override); v != "" {
		return v
	}
	if c.textModel != nil {
		if v := strings.TrimSpace(c.textModel()); v != "" {
			return v
		}
	}
	return neurogateDefaultTextModel
}

func (c *NeuroGateClient) resolveImageModel(override string) string {
	if v := strings.TrimSpace(override); v != "" {
		return v
	}
	if c.imageModel != nil {
		if v := strings.TrimSpace(c.imageModel()); v != "" {
			return v
		}
	}
	return neurogateDefaultImageModel
}

// HasAPIKey reports whether the client is configured to make requests.
func (c *NeuroGateClient) HasAPIKey() bool {
	return c.resolveAPIKey() != ""
}

type neurogateChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type neurogateChatRequest struct {
	Model          string                 `json:"model"`
	Messages       []neurogateChatMessage `json:"messages"`
	Temperature    float64                `json:"temperature"`
	MaxTokens      int                    `json:"max_tokens,omitempty"`
	ResponseFormat map[string]string      `json:"response_format,omitempty"`
}

type neurogateChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// ChatOptions configures a single text-generation request.
type ChatOptions struct {
	Model       string
	Temperature float64
	MaxTokens   int
	JSONObject  bool // request response_format json_object
}

// Chat sends a chat/completions request and returns the assistant text.
func (c *NeuroGateClient) Chat(ctx context.Context, system, user string, opts ChatOptions) (string, error) {
	apiKey := c.resolveAPIKey()
	if apiKey == "" {
		return "", fmt.Errorf("neurogate api key is not configured")
	}

	messages := make([]neurogateChatMessage, 0, 2)
	if strings.TrimSpace(system) != "" {
		messages = append(messages, neurogateChatMessage{Role: "system", Content: system})
	}
	messages = append(messages, neurogateChatMessage{Role: "user", Content: user})

	reqBody := neurogateChatRequest{
		Model:       c.resolveTextModel(opts.Model),
		Messages:    messages,
		Temperature: opts.Temperature,
		MaxTokens:   opts.MaxTokens,
	}
	if opts.JSONObject {
		reqBody.ResponseFormat = map[string]string{"type": "json_object"}
	}

	respBody, err := c.do(ctx, "/chat/completions", reqBody)
	if err != nil {
		return "", err
	}

	var parsed neurogateChatResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("neurogate chat decode failed: %w", err)
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return "", fmt.Errorf("neurogate chat error: %s", parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("neurogate chat returned no choices")
	}
	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

type neurogateImageRequest struct {
	Model          string `json:"model"`
	Prompt         string `json:"prompt"`
	N              int    `json:"n"`
	Size           string `json:"size,omitempty"`
	ResponseFormat string `json:"response_format,omitempty"`
}

type neurogateImageResponse struct {
	Data []struct {
		URL     string `json:"url"`
		B64JSON string `json:"b64_json"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// GeneratedImage holds the raw bytes and content type of a generated image.
type GeneratedImage struct {
	Bytes       []byte
	ContentType string
}

// ImageOptions configures a single image-generation request.
type ImageOptions struct {
	Model string
	Size  string
}

// GenerateImage requests an image and returns its bytes. It handles both
// b64_json and url response formats (downloading the URL when needed).
func (c *NeuroGateClient) GenerateImage(ctx context.Context, prompt string, opts ImageOptions) (*GeneratedImage, error) {
	apiKey := c.resolveAPIKey()
	if apiKey == "" {
		return nil, fmt.Errorf("neurogate api key is not configured")
	}
	size := strings.TrimSpace(opts.Size)
	if size == "" {
		size = "1024x1024"
	}

	reqBody := neurogateImageRequest{
		Model:          c.resolveImageModel(opts.Model),
		Prompt:         prompt,
		N:              1,
		Size:           size,
		ResponseFormat: "b64_json",
	}

	respBody, err := c.do(ctx, "/images/generations", reqBody)
	if err != nil {
		return nil, err
	}

	var parsed neurogateImageResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("neurogate image decode failed: %w", err)
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return nil, fmt.Errorf("neurogate image error: %s", parsed.Error.Message)
	}
	if len(parsed.Data) == 0 {
		return nil, fmt.Errorf("neurogate image returned no data")
	}

	first := parsed.Data[0]
	if strings.TrimSpace(first.B64JSON) != "" {
		data, err := base64.StdEncoding.DecodeString(first.B64JSON)
		if err != nil {
			return nil, fmt.Errorf("neurogate image base64 decode failed: %w", err)
		}
		return &GeneratedImage{Bytes: data, ContentType: "image/png"}, nil
	}
	if strings.TrimSpace(first.URL) != "" {
		return c.downloadImage(ctx, first.URL)
	}
	return nil, fmt.Errorf("neurogate image response had neither b64_json nor url")
}

func (c *NeuroGateClient) downloadImage(ctx context.Context, url string) (*GeneratedImage, error) {
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
		return nil, fmt.Errorf("neurogate image download failed: status=%d", resp.StatusCode)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "image/png"
	}
	return &GeneratedImage{Bytes: data, ContentType: contentType}, nil
}

func (c *NeuroGateClient) do(ctx context.Context, path string, payload interface{}) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := c.resolveBaseURL() + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.resolveAPIKey())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("neurogate request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("neurogate http %d: %s", resp.StatusCode, truncateForError(string(respBody)))
	}
	return respBody, nil
}

func truncateForError(s string) string {
	const max = 500
	s = strings.TrimSpace(s)
	if len(s) > max {
		return s[:max] + "…"
	}
	return s
}
