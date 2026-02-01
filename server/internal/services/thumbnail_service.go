package services

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
	if config.Width == 0 {
		config = DefaultThumbnailConfig()
	}

	args := []string{
		"-i", inputPath,
		"-ss", config.TimeOffset,
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
		return fmt.Errorf("thumbnail generation failed: %s - %w", stderr.String(), err)
	}

	return nil
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
