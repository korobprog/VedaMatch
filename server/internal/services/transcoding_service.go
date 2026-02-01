package services

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"rag-agent-server/internal/models"

	"github.com/google/uuid"
)

// TranscodingService handles video transcoding with FFmpeg
type TranscodingService struct {
	ffmpegPath   string
	s3Service    *S3Service
	redisService *RedisService
	tempDir      string
}

// NewTranscodingService creates a new transcoding service
func NewTranscodingService() *TranscodingService {
	ffmpegPath := os.Getenv("FFMPEG_PATH")
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg" // Default to PATH
	}

	tempDir := os.Getenv("VIDEO_TEMP_DIR")
	if tempDir == "" {
		tempDir = "/tmp/video-transcoding"
	}

	// Ensure temp directory exists
	os.MkdirAll(tempDir, 0755)

	return &TranscodingService{
		ffmpegPath:   ffmpegPath,
		s3Service:    NewS3Service(),
		redisService: NewRedisService(),
		tempDir:      tempDir,
	}
}

// TranscodeVideo transcodes a video to HLS with multiple qualities
func (t *TranscodingService) TranscodeVideo(ctx context.Context, job *TranscodingJob) error {
	// Update status to processing
	t.redisService.UpdateTranscodingProgress(job.ID, 0, "processing")

	// Create working directory
	workDir := filepath.Join(t.tempDir, job.ID)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return fmt.Errorf("failed to create work directory: %w", err)
	}
	defer os.RemoveAll(workDir) // Cleanup on exit

	// Download original video from S3
	inputPath := filepath.Join(workDir, "input.mp4")
	log.Printf("[Transcoding] Downloading video for job %s", job.ID)
	t.redisService.UpdateTranscodingProgress(job.ID, 5, "downloading")

	if err := t.s3Service.DownloadFile(ctx, job.InputPath, inputPath); err != nil {
		return fmt.Errorf("failed to download video: %w", err)
	}

	// Get video info
	t.redisService.UpdateTranscodingProgress(job.ID, 10, "analyzing")
	videoInfo, err := t.getVideoInfo(inputPath)
	if err != nil {
		log.Printf("[Transcoding] Warning: could not get video info: %v", err)
	}

	// Determine which qualities to generate based on source resolution
	qualities := t.determineQualities(videoInfo, job.Qualities)

	// Generate HLS for each quality
	totalQualities := len(qualities)
	for i, quality := range qualities {
		progress := 10 + (i * 80 / totalQualities)
		t.redisService.UpdateTranscodingProgress(job.ID, progress, fmt.Sprintf("transcoding_%s", quality.Name))

		log.Printf("[Transcoding] Generating %s for job %s", quality.Name, job.ID)
		outputDir := filepath.Join(workDir, quality.Name)
		if err := os.MkdirAll(outputDir, 0755); err != nil {
			return fmt.Errorf("failed to create output directory for %s: %w", quality.Name, err)
		}

		if err := t.transcodeToQuality(inputPath, outputDir, quality); err != nil {
			log.Printf("[Transcoding] Warning: failed to transcode %s: %v", quality.Name, err)
			continue
		}
	}

	// Generate master playlist
	t.redisService.UpdateTranscodingProgress(job.ID, 90, "generating_playlist")
	if err := t.generateMasterPlaylist(workDir, qualities); err != nil {
		return fmt.Errorf("failed to generate master playlist: %w", err)
	}

	// Generate thumbnail
	thumbnailPath := filepath.Join(workDir, "thumbnail.jpg")
	t.generateThumbnail(inputPath, thumbnailPath)

	// Upload all HLS files to S3
	t.redisService.UpdateTranscodingProgress(job.ID, 95, "uploading")
	if err := t.uploadHLSToS3(ctx, workDir, job.OutputPath); err != nil {
		return fmt.Errorf("failed to upload HLS files: %w", err)
	}

	// Upload thumbnail
	thumbnailS3Path := job.OutputPath + "/thumbnail.jpg"
	t.s3Service.UploadLocalFile(ctx, thumbnailPath, thumbnailS3Path, "image/jpeg")

	// Update status to completed
	t.redisService.UpdateTranscodingProgress(job.ID, 100, "completed")

	log.Printf("[Transcoding] Completed job %s", job.ID)
	return nil
}

// VideoInfo holds information about the source video
type VideoInfo struct {
	Width    int
	Height   int
	Duration int
	Bitrate  int
	Codec    string
}

// getVideoInfo extracts video metadata using ffprobe
func (t *TranscodingService) getVideoInfo(inputPath string) (*VideoInfo, error) {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		inputPath)

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	// Parse width and height from output
	info := &VideoInfo{}

	// Simple regex parsing (could use JSON parsing for robustness)
	widthRe := regexp.MustCompile(`"width":\s*(\d+)`)
	heightRe := regexp.MustCompile(`"height":\s*(\d+)`)
	durationRe := regexp.MustCompile(`"duration":\s*"?([\d.]+)"?`)
	bitrateRe := regexp.MustCompile(`"bit_rate":\s*"?(\d+)"?`)

	if matches := widthRe.FindSubmatch(output); len(matches) > 1 {
		info.Width, _ = strconv.Atoi(string(matches[1]))
	}
	if matches := heightRe.FindSubmatch(output); len(matches) > 1 {
		info.Height, _ = strconv.Atoi(string(matches[1]))
	}
	if matches := durationRe.FindSubmatch(output); len(matches) > 1 {
		duration, _ := strconv.ParseFloat(string(matches[1]), 64)
		info.Duration = int(duration)
	}
	if matches := bitrateRe.FindSubmatch(output); len(matches) > 1 {
		info.Bitrate, _ = strconv.Atoi(string(matches[1]))
	}

	return info, nil
}

// determineQualities decides which quality presets to use based on source
func (t *TranscodingService) determineQualities(info *VideoInfo, requested []string) []models.VideoQualityPreset {
	presets := models.StandardQualityPresets()
	var result []models.VideoQualityPreset

	// If specific qualities requested, filter to those
	if len(requested) > 0 {
		for _, preset := range presets {
			for _, req := range requested {
				if preset.Name == req {
					result = append(result, preset)
					break
				}
			}
		}
		return result
	}

	// Otherwise, generate all qualities up to source resolution
	sourceHeight := 1080 // Default if no info
	if info != nil && info.Height > 0 {
		sourceHeight = info.Height
	}

	for _, preset := range presets {
		if preset.Height <= sourceHeight {
			result = append(result, preset)
		}
	}

	return result
}

// transcodeToQuality transcodes video to a specific quality using FFmpeg
func (t *TranscodingService) transcodeToQuality(inputPath, outputDir string, quality models.VideoQualityPreset) error {
	playlistPath := filepath.Join(outputDir, "playlist.m3u8")

	args := []string{
		"-i", inputPath,
		"-vf", fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2",
			quality.Width, quality.Height, quality.Width, quality.Height),
		"-c:v", "libx264",
		"-preset", "medium",
		"-b:v", fmt.Sprintf("%dk", quality.Bitrate),
		"-maxrate", fmt.Sprintf("%dk", int(float64(quality.Bitrate)*1.5)),
		"-bufsize", fmt.Sprintf("%dk", quality.Bitrate*2),
		"-c:a", "aac",
		"-b:a", "128k",
		"-f", "hls",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", filepath.Join(outputDir, "segment_%03d.ts"),
		playlistPath,
	}

	cmd := exec.Command(t.ffmpegPath, args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg error: %s - %w", stderr.String(), err)
	}

	return nil
}

// generateMasterPlaylist creates the master .m3u8 playlist
func (t *TranscodingService) generateMasterPlaylist(workDir string, qualities []models.VideoQualityPreset) error {
	var sb strings.Builder
	sb.WriteString("#EXTM3U\n")
	sb.WriteString("#EXT-X-VERSION:3\n\n")

	for _, q := range qualities {
		bandwidth := q.Bitrate * 1000 // Convert kbps to bps
		sb.WriteString(fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d,NAME=\"%s\"\n",
			bandwidth, q.Width, q.Height, q.Name))
		sb.WriteString(fmt.Sprintf("%s/playlist.m3u8\n\n", q.Name))
	}

	masterPath := filepath.Join(workDir, "master.m3u8")
	return os.WriteFile(masterPath, []byte(sb.String()), 0644)
}

// generateThumbnail creates a thumbnail from the video
func (t *TranscodingService) generateThumbnail(inputPath, outputPath string) error {
	// Take frame at 10 seconds (or 10% if video is shorter)
	args := []string{
		"-i", inputPath,
		"-ss", "00:00:10",
		"-vframes", "1",
		"-vf", "scale=640:-1",
		"-q:v", "2",
		"-y",
		outputPath,
	}

	cmd := exec.Command(t.ffmpegPath, args...)
	return cmd.Run()
}

// uploadHLSToS3 uploads all HLS files to S3
func (t *TranscodingService) uploadHLSToS3(ctx context.Context, localDir, s3Prefix string) error {
	return filepath.Walk(localDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		// Get relative path
		relPath, _ := filepath.Rel(localDir, path)
		s3Path := s3Prefix + "/" + relPath

		// Determine content type
		contentType := "application/octet-stream"
		switch filepath.Ext(path) {
		case ".m3u8":
			contentType = "application/vnd.apple.mpegurl"
		case ".ts":
			contentType = "video/mp2t"
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		}

		return t.s3Service.UploadLocalFile(ctx, path, s3Path, contentType)
	})
}

// GenerateJobID creates a unique job ID
func GenerateJobID() string {
	return uuid.New().String()
}

// StartTranscodingJob starts a new transcoding job
func (t *TranscodingService) StartTranscodingJob(videoID uint, inputPath, outputPath string, qualities []string) (string, error) {
	jobID := GenerateJobID()

	job := &TranscodingJob{
		ID:         jobID,
		VideoID:    videoID,
		InputPath:  inputPath,
		OutputPath: outputPath,
		Qualities:  qualities,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	// Add to Redis queue
	if err := t.redisService.AddTranscodingJob(job); err != nil {
		return "", fmt.Errorf("failed to queue job: %w", err)
	}

	log.Printf("[Transcoding] Queued job %s for video %d", jobID, videoID)
	return jobID, nil
}
