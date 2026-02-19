package services

import (
	"bytes"
	"context"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// ThumbnailService handles video thumbnail generation
type ThumbnailService struct {
	ffmpegPath string
	s3Service  *S3Service
}

// NewThumbnailService creates a new thumbnail service
func NewThumbnailService() *ThumbnailService {
	ffmpegPath := os.Getenv("FFMPEG_PATH")
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}

	return &ThumbnailService{
		ffmpegPath: ffmpegPath,
		s3Service:  NewS3Service(),
	}
}

// ThumbnailConfig holds thumbnail generation options
type ThumbnailConfig struct {
	Width      int    // Target width (height auto-calculated)
	TimeOffset string // Time offset in video (e.g., "00:00:10")
	Quality    int    // JPEG quality (1-31, lower is better)
}

// DefaultThumbnailConfig returns sensible defaults
func DefaultThumbnailConfig() ThumbnailConfig {
	return ThumbnailConfig{
		Width:      640,
		TimeOffset: "00:00:10",
		Quality:    2,
	}
}

// GenerateThumbnail creates a thumbnail from a video file
func (t *ThumbnailService) GenerateThumbnail(inputPath, outputPath string, config ThumbnailConfig) error {
	defaults := DefaultThumbnailConfig()
	if config.Width == 0 {
		config.Width = defaults.Width
	}
	if strings.TrimSpace(config.TimeOffset) == "" {
		config.TimeOffset = defaults.TimeOffset
	}
	if config.Quality == 0 {
		config.Quality = defaults.Quality
	}

	offsetCandidates := []string{config.TimeOffset}
	if durationSec, err := t.getVideoDuration(inputPath); err == nil && durationSec > 0 {
		safeOffset := chooseSafeThumbnailOffset(durationSec, config.TimeOffset)
		if safeOffset != "" && safeOffset != config.TimeOffset {
			offsetCandidates = append(offsetCandidates, safeOffset)
		}
	}
	if config.TimeOffset != "00:00:00" {
		offsetCandidates = append(offsetCandidates, "00:00:00")
	}

	seenOffsets := make(map[string]struct{}, len(offsetCandidates))
	var lastErr error
	for _, offset := range offsetCandidates {
		offset = strings.TrimSpace(offset)
		if offset == "" {
			continue
		}
		if _, exists := seenOffsets[offset]; exists {
			continue
		}
		seenOffsets[offset] = struct{}{}

		_ = os.Remove(outputPath)
		args := []string{
			"-i", inputPath,
			"-ss", offset,
			"-vframes", "1",
			"-vf", fmt.Sprintf("scale=%d:-1", config.Width),
			"-q:v", fmt.Sprintf("%d", config.Quality),
			"-y", // Overwrite output
			outputPath,
		}

		cmd := exec.Command(t.ffmpegPath, args...)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			lastErr = fmt.Errorf("thumbnail generation failed at %s: %s - %w", offset, stderr.String(), err)
			continue
		}

		stat, statErr := os.Stat(outputPath)
		if statErr != nil || stat.Size() == 0 {
			lastErr = fmt.Errorf("thumbnail generation produced empty file at %s", offset)
			continue
		}

		return nil
	}

	if lastErr != nil {
		return lastErr
	}
	return fmt.Errorf("thumbnail generation failed: no valid offset")
}

// GenerateMultipleThumbnails creates thumbnails at various points in the video
func (t *ThumbnailService) GenerateMultipleThumbnails(inputPath, outputDir string, count int) ([]string, error) {
	// Get video duration first
	duration, err := t.getVideoDuration(inputPath)
	if err != nil {
		duration = 60 // Default to 60 seconds if we can't get duration
	}

	var thumbnails []string
	interval := duration / (count + 1) // Evenly space thumbnails

	for i := 1; i <= count; i++ {
		offset := interval * i
		offsetStr := fmt.Sprintf("00:%02d:%02d", offset/60, offset%60)

		outputPath := filepath.Join(outputDir, fmt.Sprintf("thumb_%02d.jpg", i))

		config := ThumbnailConfig{
			Width:      640,
			TimeOffset: offsetStr,
			Quality:    2,
		}

		if err := t.GenerateThumbnail(inputPath, outputPath, config); err != nil {
			continue // Skip failed thumbnails
		}

		thumbnails = append(thumbnails, outputPath)
	}

	return thumbnails, nil
}

// GenerateAndUploadThumbnail generates thumbnail and uploads to S3
func (t *ThumbnailService) GenerateAndUploadThumbnail(ctx context.Context, inputPath, s3Path string) (string, error) {
	// Create temp file
	tempFile, err := os.CreateTemp("", "thumb_*.jpg")
	if err != nil {
		return "", err
	}
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	// Generate thumbnail
	if err := t.GenerateThumbnail(inputPath, tempPath, DefaultThumbnailConfig()); err != nil {
		return "", err
	}

	// Upload to S3
	if err := t.s3Service.UploadLocalFile(ctx, tempPath, s3Path, "image/jpeg"); err != nil {
		return "", err
	}

	// Return public URL
	return t.s3Service.GetPublicURL(s3Path), nil
}

// GenerateAnimatedPreview creates a short animated GIF/WebP preview
func (t *ThumbnailService) GenerateAnimatedPreview(inputPath, outputPath string, durationSec int) error {
	if durationSec == 0 {
		durationSec = 3
	}

	args := []string{
		"-i", inputPath,
		"-ss", "00:00:10", // Start at 10 seconds
		"-t", fmt.Sprintf("%d", durationSec),
		"-vf", "scale=320:-1:flags=lanczos,fps=10",
		"-loop", "0",
		"-y",
		outputPath,
	}

	cmd := exec.Command(t.ffmpegPath, args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("animated preview generation failed: %s - %w", stderr.String(), err)
	}

	return nil
}

// getVideoDuration extracts video duration in seconds
func (t *ThumbnailService) getVideoDuration(inputPath string) (int, error) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		inputPath)

	output, err := cmd.Output()
	if err != nil {
		return 0, err
	}

	var duration float64
	fmt.Sscanf(string(output), "%f", &duration)
	return int(duration), nil
}

func chooseSafeThumbnailOffset(durationSec int, requestedOffset string) string {
	if durationSec <= 0 {
		return "00:00:00"
	}

	requestedSec := parseTimeOffsetToSeconds(requestedOffset)
	maxValidSec := int(math.Max(float64(durationSec-1), 0))
	if requestedSec <= maxValidSec {
		return requestedOffset
	}

	// For short clips, take an early representative frame.
	safeSec := durationSec / 3
	if safeSec > maxValidSec {
		safeSec = maxValidSec
	}
	if safeSec < 0 {
		safeSec = 0
	}
	return formatSecondsAsTimestamp(safeSec)
}

func parseTimeOffsetToSeconds(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}

	parts := strings.Split(raw, ":")
	if len(parts) == 1 {
		value, err := strconv.Atoi(parts[0])
		if err != nil {
			return 0
		}
		return value
	}

	total := 0
	multiplier := 1
	for i := len(parts) - 1; i >= 0; i-- {
		value, err := strconv.Atoi(parts[i])
		if err != nil {
			return 0
		}
		total += value * multiplier
		multiplier *= 60
	}
	return total
}

func formatSecondsAsTimestamp(totalSec int) string {
	if totalSec < 0 {
		totalSec = 0
	}
	hours := totalSec / 3600
	minutes := (totalSec % 3600) / 60
	seconds := totalSec % 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
}
