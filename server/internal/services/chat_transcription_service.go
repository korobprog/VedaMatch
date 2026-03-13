package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"mime"
	"mime/multipart"
	"net/http"
	"net/textproto"
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

	var lastErr error

	for _, provider := range providers {
		modelsToTry := resolveChatTranscriptionModelsForProvider(provider)
		for _, model := range modelsToTry {
			result, transcribeErr := transcribeChatAudioWithProvider(ctx, provider, tmpPath, model, language)
			if transcribeErr != nil {
				lastErr = fmt.Errorf("%s/%s: %w", provider.Name, model, transcribeErr)
				log.Printf("[ChatTranscription] provider=%s model=%s failed: %v", provider.Name, model, transcribeErr)
				continue
			}
			text := strings.TrimSpace(result.Text)
			if text == "" {
				lastErr = fmt.Errorf("%s/%s: empty transcription response", provider.Name, model)
				continue
			}
			log.Printf("[ChatTranscription] provider=%s model=%s succeeded language=%s", provider.Name, model, strings.TrimSpace(result.Language))
			return &ChatTranscriptionResult{
				Text:     text,
				Model:    model,
				Language: strings.TrimSpace(result.Language),
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

	candidateURLs := buildChatTranscriptionDownloadCandidates(normalizedURL)
	var lastErr error
	for _, candidateURL := range candidateURLs {
		tempPath, cleanup, downloadErr := downloadAudioToTempFileFromURL(ctx, candidateURL)
		if downloadErr == nil {
			return tempPath, cleanup, nil
		}
		lastErr = downloadErr
		log.Printf("[ChatTranscription] media download failed url=%s: %v", candidateURL, downloadErr)
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("failed to download media")
	}
	return "", func() {}, lastErr
}

func downloadAudioToTempFileFromURL(ctx context.Context, mediaURL string) (string, func(), error) {
	parsedURL, err := url.Parse(mediaURL)
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

func buildChatTranscriptionDownloadCandidates(normalizedURL string) []string {
	candidates := make([]string, 0, 2)
	seen := make(map[string]struct{}, 2)
	appendCandidate := func(value string) {
		candidate := strings.TrimSpace(value)
		if candidate == "" {
			return
		}
		if _, exists := seen[candidate]; exists {
			return
		}
		seen[candidate] = struct{}{}
		candidates = append(candidates, candidate)
	}

	if key, ok := extractChatTranscriptionAudioObjectKey(normalizedURL); ok {
		appendCandidate(resolveChatTranscriptionDirectS3URL(key))
	}
	appendCandidate(normalizedURL)

	return candidates
}

func extractChatTranscriptionAudioObjectKey(raw string) (string, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false
	}
	if strings.HasPrefix(value, "messages/audio/") {
		return value, true
	}

	parsedURL, err := url.Parse(value)
	if err != nil {
		return "", false
	}

	key := strings.TrimPrefix(parsedURL.Path, "/")
	bucketName := strings.Trim(strings.TrimSpace(os.Getenv("S3_BUCKET_NAME")), "/")
	if bucketName != "" && strings.HasPrefix(key, bucketName+"/") {
		key = strings.TrimPrefix(key, bucketName+"/")
	}
	if strings.HasPrefix(key, "messages/audio/") {
		return key, true
	}

	return "", false
}

func resolveChatTranscriptionDirectS3URL(key string) string {
	endpoint := strings.TrimSuffix(strings.TrimSpace(os.Getenv("S3_ENDPOINT")), "/")
	bucketName := strings.Trim(strings.TrimSpace(os.Getenv("S3_BUCKET_NAME")), "/")
	objectKey := strings.TrimPrefix(strings.TrimSpace(key), "/")
	if endpoint == "" || bucketName == "" || objectKey == "" {
		return ""
	}
	return endpoint + "/" + bucketName + "/" + objectKey
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
		return []string{"gpt-4o-mini-transcribe", "gpt-4o-transcribe", "whisper-1"}
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
		return []string{"gpt-4o-mini-transcribe", "gpt-4o-transcribe", "whisper-1"}
	}
	return models
}

func resolveChatTranscriptionModelsForProvider(provider chatTranscriptionProvider) []string {
	baseModels := resolveChatTranscriptionModels()
	if !strings.EqualFold(strings.TrimSpace(provider.Name), "polza") {
		return baseModels
	}

	prioritizedBaseModels := prioritizeChatTranscriptionModelsForPolza(baseModels)
	models := make([]string, 0, len(baseModels)*2)
	seen := make(map[string]struct{}, len(baseModels)*2)
	appendModel := func(value string) {
		model := strings.TrimSpace(value)
		if model == "" {
			return
		}
		if _, exists := seen[model]; exists {
			return
		}
		seen[model] = struct{}{}
		models = append(models, model)
	}

	for _, model := range prioritizedBaseModels {
		trimmed := strings.TrimSpace(model)
		if trimmed == "" {
			continue
		}
		if strings.Contains(trimmed, "/") {
			appendModel(trimmed)
			appendModel(strings.TrimPrefix(trimmed, "openai/"))
			continue
		}
		appendModel("openai/" + trimmed)
		appendModel(trimmed)
	}

	return models
}

func prioritizeChatTranscriptionModelsForPolza(models []string) []string {
	prioritized := make([]string, 0, len(models))
	for _, model := range models {
		trimmed := strings.TrimSpace(model)
		if strings.Contains(strings.ToLower(trimmed), "whisper") {
			prioritized = append(prioritized, trimmed)
		}
	}
	for _, model := range models {
		trimmed := strings.TrimSpace(model)
		if trimmed == "" || strings.Contains(strings.ToLower(trimmed), "whisper") {
			continue
		}
		prioritized = append(prioritized, trimmed)
	}
	if len(prioritized) == 0 {
		return models
	}
	return prioritized
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

func transcribeChatAudioWithProvider(ctx context.Context, provider chatTranscriptionProvider, filePath string, model string, language string) (*ChatTranscriptionResult, error) {
	if strings.EqualFold(strings.TrimSpace(provider.Name), "polza") {
		return transcribeChatAudioWithPolza(ctx, provider, filePath, model, language)
	}

	client := newChatTranscriptionClient(provider)
	resp, err := client.CreateTranscription(ctx, openai.AudioRequest{
		Model:    model,
		FilePath: filePath,
		Language: strings.TrimSpace(language),
	})
	if err != nil {
		return nil, err
	}

	return &ChatTranscriptionResult{
		Text:     strings.TrimSpace(resp.Text),
		Model:    strings.TrimSpace(model),
		Language: strings.TrimSpace(resp.Language),
	}, nil
}

func transcribeChatAudioWithPolza(ctx context.Context, provider chatTranscriptionProvider, filePath string, model string, language string) (*ChatTranscriptionResult, error) {
	endpoint := strings.TrimSuffix(strings.TrimSpace(provider.BaseURL), "/") + "/audio/transcriptions"
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open audio file: %w", err)
	}
	defer file.Close()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("model", strings.TrimSpace(model)); err != nil {
		return nil, fmt.Errorf("failed to write model field: %w", err)
	}
	if trimmedLanguage := strings.TrimSpace(language); trimmedLanguage != "" {
		if err := writer.WriteField("language", trimmedLanguage); err != nil {
			return nil, fmt.Errorf("failed to write language field: %w", err)
		}
	}

	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filepath.Base(filePath)))
	partHeader.Set("Content-Type", detectChatTranscriptionMimeType(filePath))
	part, err := writer.CreatePart(partHeader)
	if err != nil {
		return nil, fmt.Errorf("failed to create file part: %w", err)
	}
	if _, err := io.Copy(part, file); err != nil {
		return nil, fmt.Errorf("failed to attach audio file: %w", err)
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to finalize multipart request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return nil, fmt.Errorf("failed to build transcription request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(provider.APIKey))
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("polza request failed: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read transcription response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("polza status %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var payload struct {
		Text     string `json:"text"`
		Language string `json:"language"`
		Model    string `json:"model"`
		Error    *struct {
			Message string `json:"message"`
		} `json:"error,omitempty"`
	}
	if err := json.Unmarshal(responseBody, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse transcription response: %w", err)
	}
	if payload.Error != nil && strings.TrimSpace(payload.Error.Message) != "" {
		return nil, fmt.Errorf("polza error: %s", strings.TrimSpace(payload.Error.Message))
	}

	resultModel := strings.TrimSpace(payload.Model)
	if resultModel == "" {
		resultModel = strings.TrimSpace(model)
	}

	return &ChatTranscriptionResult{
		Text:     strings.TrimSpace(payload.Text),
		Model:    resultModel,
		Language: strings.TrimSpace(payload.Language),
	}, nil
}

func detectChatTranscriptionMimeType(filePath string) string {
	switch strings.ToLower(filepath.Ext(strings.TrimSpace(filePath))) {
	case ".m4a", ".mp4":
		return "audio/mp4"
	case ".mp3", ".mpeg", ".mpga":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".webm":
		return "audio/webm"
	case ".ogg", ".oga":
		return "audio/ogg"
	case ".flac":
		return "audio/flac"
	}

	if detected := mime.TypeByExtension(filepath.Ext(strings.TrimSpace(filePath))); detected != "" {
		return detected
	}
	return "application/octet-stream"
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
