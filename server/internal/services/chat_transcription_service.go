package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"github.com/sashabaranov/go-openai"
)

type ChatTranscriptionResult struct {
	Text     string `json:"text"`
	Model    string `json:"model"`
	Language string `json:"language,omitempty"`
}

type chatTranscriptionProvider struct {
	Name    string
	APIKey  string
	BaseURL string
}

// ResolveChatAudioDurationSec resolves duration with priority:
// message metadata -> ffprobe on downloaded file -> safe fallback 60s (1 minute).
// Free quota accounting uses UTC ISO week boundaries.
func ResolveChatAudioDurationSec(ctx context.Context, msg *models.Message) int {
	if msg != nil && msg.Duration > 0 {
		return msg.Duration
	}
	if msg == nil {
		return 60
	}

	audioURL := strings.TrimSpace(msg.Content)
	if audioURL == "" {
		return 60
	}

	tmpPath, cleanup, err := downloadAudioToTempFile(ctx, audioURL)
	if err != nil {
		return 60
	}
	defer cleanup()

	durationSec, err := probeAudioDurationSeconds(ctx, tmpPath)
	if err != nil || durationSec <= 0 {
		return 60
	}
	return durationSec
}

func TranscribeChatAudio(ctx context.Context, mediaURL string, language string) (*ChatTranscriptionResult, error) {
	tmpPath, cleanup, err := downloadAudioToTempFile(ctx, mediaURL)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	providers := resolveChatTranscriptionProviders()
	if len(providers) == 0 {
		return nil, fmt.Errorf("chat transcription provider is not configured")
	}

	modelsToTry := resolveChatTranscriptionModels()
	var lastErr error

	for _, provider := range providers {
		client := newChatTranscriptionClient(provider)
		for _, model := range modelsToTry {
			resp, transcribeErr := client.CreateTranscription(ctx, openai.AudioRequest{
				Model:    model,
				FilePath: tmpPath,
				Language: strings.TrimSpace(language),
			})
			if transcribeErr != nil {
				lastErr = fmt.Errorf("%s/%s: %w", provider.Name, model, transcribeErr)
				log.Printf("[ChatTranscription] provider=%s model=%s failed: %v", provider.Name, model, transcribeErr)
				continue
			}
			text := strings.TrimSpace(resp.Text)
			if text == "" {
				lastErr = fmt.Errorf("%s/%s: empty transcription response", provider.Name, model)
				continue
			}
			log.Printf("[ChatTranscription] provider=%s model=%s succeeded language=%s", provider.Name, model, strings.TrimSpace(resp.Language))
			return &ChatTranscriptionResult{
				Text:     text,
				Model:    model,
				Language: strings.TrimSpace(resp.Language),
			}, nil
		}
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("transcription failed")
	}
	return nil, lastErr
}

func downloadAudioToTempFile(ctx context.Context, mediaURL string) (string, func(), error) {
	normalizedURL, err := NormalizeChatTranscriptionMediaURL(mediaURL)
	if err != nil {
		return "", func() {}, err
	}

	parsedURL, err := url.Parse(normalizedURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return "", func() {}, fmt.Errorf("invalid media URL")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return "", func() {}, fmt.Errorf("failed to build media download request: %w", err)
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", func() {}, fmt.Errorf("failed to download media: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", func() {}, fmt.Errorf("media download failed with status %d", resp.StatusCode)
	}

	ext := filepath.Ext(parsedURL.Path)
	if ext == "" {
		ext = ".m4a"
	}
	tempFile, err := os.CreateTemp("", "chat-audio-*"+ext)
	if err != nil {
		return "", func() {}, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, resp.Body); err != nil {
		_ = os.Remove(tempFile.Name())
		return "", func() {}, fmt.Errorf("failed to write temp media file: %w", err)
	}

	cleanup := func() {
		_ = os.Remove(tempFile.Name())
	}
	return tempFile.Name(), cleanup, nil
}

func NormalizeChatTranscriptionMediaURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", fmt.Errorf("empty media URL")
	}
	if strings.HasPrefix(value, "https://") || strings.HasPrefix(value, "http://") {
		return value, nil
	}
	if strings.HasPrefix(value, "/uploads/") {
		return resolveChatTranscriptionPublicBaseURL() + value, nil
	}
	if strings.HasPrefix(value, "./uploads/") {
		return resolveChatTranscriptionPublicBaseURL() + "/" + strings.TrimPrefix(value, "./"), nil
	}
	if strings.HasPrefix(value, "uploads/") {
		return resolveChatTranscriptionPublicBaseURL() + "/" + value, nil
	}
	return "", fmt.Errorf("invalid media URL")
}

func resolveChatTranscriptionPublicBaseURL() string {
	baseURL := strings.TrimSpace(os.Getenv("NEXT_PUBLIC_API_URL"))
	baseURL = strings.TrimSuffix(baseURL, "/")
	baseURL = strings.TrimSuffix(baseURL, "/api")
	if baseURL != "" {
		return baseURL
	}
	return "https://api.vedamatch.ru"
}

func resolveChatTranscriptionModels() []string {
	raw := strings.TrimSpace(os.Getenv("CHAT_TRANSCRIPTION_MODELS"))
	if raw == "" {
		return []string{"gpt-4o-mini-transcribe", "gpt-4o-transcribe"}
	}

	parts := strings.Split(raw, ",")
	models := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		model := strings.TrimSpace(part)
		if model == "" {
			continue
		}
		if _, exists := seen[model]; exists {
			continue
		}
		seen[model] = struct{}{}
		models = append(models, model)
	}
	if len(models) == 0 {
		return []string{"gpt-4o-mini-transcribe", "gpt-4o-transcribe"}
	}
	return models
}

func resolveChatTranscriptionProviders() []chatTranscriptionProvider {
	providers := make([]chatTranscriptionProvider, 0, 2)

	openAIKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if openAIKey != "" {
		providers = append(providers, chatTranscriptionProvider{
			Name:   "openai",
			APIKey: openAIKey,
		})
	}

	polzaKey := strings.TrimSpace(resolvePolzaAPIKey())
	if polzaKey != "" {
		baseURL := strings.TrimSpace(os.Getenv("POLZA_BASE_URL"))
		if baseURL == "" {
			baseURL = GetPolzaService().GetBaseURL()
		}
		providers = append(providers, chatTranscriptionProvider{
			Name:    "polza",
			APIKey:  polzaKey,
			BaseURL: normalizeOpenAICompatibleBaseURL(baseURL),
		})
	}

	return providers
}

func newChatTranscriptionClient(provider chatTranscriptionProvider) *openai.Client {
	if provider.BaseURL == "" {
		return openai.NewClient(provider.APIKey)
	}

	cfg := openai.DefaultConfig(provider.APIKey)
	cfg.BaseURL = provider.BaseURL
	return openai.NewClientWithConfig(cfg)
}

func normalizeOpenAICompatibleBaseURL(raw string) string {
	baseURL := strings.TrimSpace(raw)
	baseURL = strings.TrimSuffix(baseURL, "/")
	if baseURL == "" {
		return ""
	}
	if strings.HasSuffix(baseURL, "/v1") {
		return baseURL
	}
	return baseURL + "/v1"
}

func probeAudioDurationSeconds(ctx context.Context, mediaPath string) (int, error) {
	if strings.TrimSpace(mediaPath) == "" {
		return 0, fmt.Errorf("empty media path")
	}

	probeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(
		probeCtx,
		"ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		mediaPath,
	)
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe failed: %w", err)
	}

	raw := strings.TrimSpace(string(output))
	if raw == "" {
		return 0, fmt.Errorf("ffprobe returned empty duration")
	}

	durationFloat, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, fmt.Errorf("ffprobe parse error: %w", err)
	}
	durationSec := int(math.Ceil(durationFloat))
	if durationSec < 1 {
		durationSec = 1
	}
	return durationSec, nil
}
