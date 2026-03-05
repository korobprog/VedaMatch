package services

import (
	"context"
	"fmt"
	"io"
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
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY is not configured")
	}

	tmpPath, cleanup, err := downloadAudioToTempFile(ctx, mediaURL)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	client := openai.NewClient(apiKey)
	modelsToTry := []string{"gpt-4o-mini-transcribe", "gpt-4o-transcribe"}
	var lastErr error

	for _, model := range modelsToTry {
		resp, transcribeErr := client.CreateTranscription(ctx, openai.AudioRequest{
			Model:    model,
			FilePath: tmpPath,
			Language: strings.TrimSpace(language),
		})
		if transcribeErr != nil {
			lastErr = transcribeErr
			continue
		}
		text := strings.TrimSpace(resp.Text)
		if text == "" {
			lastErr = fmt.Errorf("empty transcription response for model %s", model)
			continue
		}
		return &ChatTranscriptionResult{
			Text:     text,
			Model:    model,
			Language: strings.TrimSpace(resp.Language),
		}, nil
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("transcription failed")
	}
	return nil, lastErr
}

func downloadAudioToTempFile(ctx context.Context, mediaURL string) (string, func(), error) {
	raw := strings.TrimSpace(mediaURL)
	if raw == "" {
		return "", func() {}, fmt.Errorf("empty media URL")
	}

	parsedURL, err := url.Parse(raw)
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
