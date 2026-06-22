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
	neurogateDefaultBaseURL = "https://api.neurogate.space/v1"
	neurogateDefaultTextModel = "deepseek-v4-flash"
	// Image generation goes through the Responses API image_generation tool,
	// which requires a TEXT-capable model (not a gpt-image-* model).
	neurogateDefaultImageModel = "gpt-5.5"
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
		httpClient: &http.Client{Timeout: 240 * time.Second},
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

// Responses API image generation payload (hosted image_generation tool).
type neurogateImageTool struct {
	Type         string `json:"type"`
	Action       string `json:"action"`
	OutputFormat string `json:"output_format"`
	Size         string `json:"size,omitempty"`
	Quality      string `json:"quality,omitempty"`
}

type neurogateResponsesContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type neurogateResponsesInput struct {
	Role    string                      `json:"role"`
	Content []neurogateResponsesContent `json:"content"`
}

type neurogateResponsesRequest struct {
	Model        string                    `json:"model"`
	Instructions string                    `json:"instructions"`
	Input        []neurogateResponsesInput `json:"input"`
	Tools        []neurogateImageTool      `json:"tools"`
	ToolChoice   map[string]string         `json:"tool_choice"`
	Store        bool                      `json:"store"`
	Stream       bool                      `json:"stream"`
}

// GeneratedImage holds the raw bytes and content type of a generated image.
type GeneratedImage struct {
	Bytes       []byte
	ContentType string
}

// ImageOptions configures a single image-generation request.
type ImageOptions struct {
	Model   string
	Size    string
	Quality string
}

// GenerateImage requests an image through the NeuroGate Responses API hosted
// image_generation tool (the OpenAI-style /v1/images endpoint is not supported
// by this gateway). The response is an SSE stream; the final
// image_generation_call item carries the base64 PNG in its "result" field.
func (c *NeuroGateClient) GenerateImage(ctx context.Context, prompt string, opts ImageOptions) (*GeneratedImage, error) {
	apiKey := c.resolveAPIKey()
	if apiKey == "" {
		return nil, fmt.Errorf("neurogate api key is not configured")
	}
	size := strings.TrimSpace(opts.Size)
	if size == "" {
		size = "1024x1024"
	}

	tool := neurogateImageTool{
		Type:         "image_generation",
		Action:       "generate",
		OutputFormat: "png",
		Size:         size,
	}
	if q := strings.TrimSpace(opts.Quality); q != "" {
		tool.Quality = q
	}

	reqBody := neurogateResponsesRequest{
		Model:        c.resolveImageModel(opts.Model),
		Instructions: "You are an image generation assistant. Use the image_generation tool to create exactly one image that matches the user request. Do not render any text in the image.",
		Input: []neurogateResponsesInput{
			{Role: "user", Content: []neurogateResponsesContent{{Type: "input_text", Text: prompt}}},
		},
		Tools:      []neurogateImageTool{tool},
		ToolChoice: map[string]string{"type": "image_generation"},
		Store:      false,
		Stream:     true,
	}

	respBody, err := c.do(ctx, "/responses", reqBody)
	if err != nil {
		return nil, err
	}

	b64 := extractResponsesImageB64(respBody)
	if b64 == "" {
		return nil, fmt.Errorf("neurogate responses returned no image_generation_call result")
	}
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, fmt.Errorf("neurogate image base64 decode failed: %w", err)
	}
	return &GeneratedImage{Bytes: data, ContentType: "image/png"}, nil
}

// extractResponsesImageB64 walks the SSE body and returns the last base64 image
// result found in an image_generation_call event.
func extractResponsesImageB64(body []byte) string {
	var last string
	for _, line := range strings.Split(string(body), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" || payload == "[DONE]" {
			continue
		}
		var event map[string]interface{}
		if err := json.Unmarshal([]byte(payload), &event); err != nil {
			continue
		}
		if result := findImageResult(event); result != "" {
			last = result
		}
	}
	return last
}

// findImageResult recursively searches a decoded SSE event for the base64
// result of a completed image_generation_call.
func findImageResult(value interface{}) string {
	switch v := value.(type) {
	case map[string]interface{}:
		if t, _ := v["type"].(string); t == "image_generation_call" {
			if r, ok := v["result"].(string); ok && r != "" {
				return r
			}
		}
		for _, nested := range v {
			if r := findImageResult(nested); r != "" {
				return r
			}
		}
	case []interface{}:
		for _, nested := range v {
			if r := findImageResult(nested); r != "" {
				return r
			}
		}
	}
	return ""
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
