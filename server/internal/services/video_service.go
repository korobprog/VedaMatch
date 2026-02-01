package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// VideoService handles video upload and management
type VideoService struct {
	db           *gorm.DB
	s3Service    *S3Service
	redis        *RedisService
	transcoding  *TranscodingService
	thumbnail    *ThumbnailService
	maxFileSize  int64
	allowedTypes []string
}

// NewVideoService creates a new video service
func NewVideoService(db *gorm.DB) *VideoService {
	maxSize := int64(2 * 1024 * 1024 * 1024) // 2GB default
	if sizeStr := os.Getenv("VIDEO_UPLOAD_MAX_SIZE"); sizeStr != "" {
		if parsed, err := strconv.ParseInt(sizeStr, 10, 64); err == nil {
			maxSize = parsed
		}
	}

	return &VideoService{
		db:           db,
		s3Service:    NewS3Service(),
		redis:        NewRedisService(),
		transcoding:  NewTranscodingService(),
		thumbnail:    NewThumbnailService(),
		maxFileSize:  maxSize,
		allowedTypes: []string{".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"},
	}
}

// UploadVideoRequest contains video upload parameters
type UploadVideoRequest struct {
	Title       string
	Description string
	CategoryID  *uint
	Artist      string
	Madh        string
	Language    string
	Year        int
	IsFeatured  bool
	Qualities   []string // e.g., ["360p", "720p", "1080p"]
}

// UploadVideoResponse contains upload result
type UploadVideoResponse struct {
	VideoID      uint   `json:"videoId"`
	JobID        string `json:"jobId"`
	ThumbnailURL string `json:"thumbnailUrl"`
	Status       string `json:"status"`
}

// UploadVideo handles video file upload and starts transcoding
func (v *VideoService) UploadVideo(ctx context.Context, file *multipart.FileHeader, req UploadVideoRequest, userID uint) (*UploadVideoResponse, error) {
	// Validate file size
	if file.Size > v.maxFileSize {
		return nil, fmt.Errorf("file too large: max %d bytes allowed", v.maxFileSize)
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !v.isAllowedType(ext) {
		return nil, fmt.Errorf("file type %s not allowed", ext)
	}

	// Create media track record
	track := &models.MediaTrack{
		Title:             req.Title,
		Description:       req.Description,
		CategoryID:        req.CategoryID,
		Artist:            req.Artist,
		Madh:              req.Madh,
		Language:          req.Language,
		Year:              req.Year,
		IsFeatured:        req.IsFeatured,
		MediaType:         models.MediaTypeVideo,
		TranscodingStatus: "pending",
		FileSize:          file.Size,
		CreatedByID:       userID,
		IsActive:          false, // Inactive until transcoding complete
	}

	if track.Language == "" {
		track.Language = "ru"
	}

	if err := v.db.Create(track).Error; err != nil {
		return nil, fmt.Errorf("failed to create video record: %w", err)
	}

	// Generate S3 paths
	s3Original := fmt.Sprintf("videos/%d/original%s", track.ID, ext)
	s3Output := fmt.Sprintf("videos/%d/hls", track.ID)

	// Open file for upload
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Upload original to S3
	log.Printf("[VideoService] Uploading original video for track %d", track.ID)
	if err := v.s3Service.UploadFileFromReader(ctx, src, s3Original, file.Header.Get("Content-Type")); err != nil {
		// Cleanup on failure
		v.db.Delete(track)
		return nil, fmt.Errorf("failed to upload video: %w", err)
	}

	// Update track with S3 URL
	originalURL := v.s3Service.GetPublicURL(s3Original)
	v.db.Model(track).Updates(map[string]interface{}{
		"original_url": originalURL,
		"url":          originalURL, // Temporary URL until HLS is ready
	})

	// Determine qualities
	qualities := req.Qualities
	if len(qualities) == 0 {
		qualities = []string{"360p", "480p", "720p", "1080p"}
	}

	// Start transcoding job
	jobID, err := v.transcoding.StartTranscodingJob(track.ID, s3Original, s3Output, qualities)
	if err != nil {
		log.Printf("[VideoService] Warning: failed to queue transcoding job: %v", err)
		// Don't fail - video is still uploaded, can retry transcoding later
	}

	// Update track with job ID
	v.db.Model(track).Updates(map[string]interface{}{
		"transcoding_job_id": jobID,
		"transcoding_status": "pending",
	})

	return &UploadVideoResponse{
		VideoID: track.ID,
		JobID:   jobID,
		Status:  "pending",
	}, nil
}

// GetTranscodingProgress returns the current transcoding progress
func (v *VideoService) GetTranscodingProgress(jobID string) (*models.TranscodingProgressResponse, error) {
	progress, status, err := v.redis.GetTranscodingProgress(jobID)
	if err != nil {
		return nil, err
	}

	return &models.TranscodingProgressResponse{
		JobID:    jobID,
		Status:   models.TranscodingStatus(status),
		Progress: progress,
	}, nil
}

// GetVideoPlaybackInfo returns complete playback info for a video
func (v *VideoService) GetVideoPlaybackInfo(videoID uint, userID *uint) (*models.VideoPlaybackInfo, error) {
	var track models.MediaTrack
	if err := v.db.First(&track, videoID).Error; err != nil {
		return nil, err
	}

	// Get quality variants
	var qualities []models.VideoQuality
	v.db.Where("media_track_id = ?", videoID).Find(&qualities)

	// Get subtitles
	var subtitles []models.VideoSubtitle
	v.db.Where("media_track_id = ?", videoID).Find(&subtitles)

	info := &models.VideoPlaybackInfo{
		ID:           track.ID,
		Title:        track.Title,
		Description:  track.Description,
		HLSURL:       v.getVideoURL(track.HLSURL),
		ThumbnailURL: track.ThumbnailURL,
		Duration:     track.Duration,
		Qualities:    qualities,
		Subtitles:    subtitles,
	}

	// Get user progress if logged in
	if userID != nil {
		var progress models.UserVideoProgress
		if err := v.db.Where("user_id = ? AND media_track_id = ?", *userID, videoID).First(&progress).Error; err == nil {
			info.Progress = &progress
		}
	}

	return info, nil
}

// SaveUserProgress saves user's watch position
func (v *VideoService) SaveUserProgress(userID, videoID uint, position, duration int) error {
	// Save to Redis for fast access
	v.redis.SaveUserProgress(userID, videoID, position)

	// Save to DB for persistence
	progress := models.UserVideoProgress{
		UserID:       userID,
		MediaTrackID: videoID,
		Position:     position,
		Duration:     duration,
		Completed:    position >= duration-10, // Consider complete if within 10 sec of end
	}
	now := time.Now()
	progress.LastWatched = &now

	return v.db.Clauses(
		// Upsert
		clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "media_track_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"position", "duration", "completed", "last_watched", "updated_at"}),
		},
	).Create(&progress).Error
}

// GetUserProgress gets user's watch position
func (v *VideoService) GetUserProgress(userID, videoID uint) (int, error) {
	// Try Redis first
	if pos, err := v.redis.GetUserProgress(userID, videoID); err == nil {
		return pos, nil
	}

	// Fallback to DB
	var progress models.UserVideoProgress
	if err := v.db.Where("user_id = ? AND media_track_id = ?", userID, videoID).First(&progress).Error; err != nil {
		return 0, err
	}

	return progress.Position, nil
}

// UpdateTranscodingStatus updates video after transcoding completes
func (v *VideoService) UpdateTranscodingStatus(videoID uint, status string, hlsURL string, thumbnailURL string, duration int) error {
	updates := map[string]interface{}{
		"transcoding_status":   status,
		"transcoding_progress": 100,
	}

	if hlsURL != "" {
		updates["hls_url"] = hlsURL
		updates["url"] = hlsURL + "/master.m3u8"
	}

	if thumbnailURL != "" {
		updates["thumbnail_url"] = thumbnailURL
	}

	if duration > 0 {
		updates["duration"] = duration
	}

	if status == "completed" {
		updates["is_active"] = true
		now := time.Now()
		updates["published_at"] = &now
	}

	return v.db.Model(&models.MediaTrack{}).Where("id = ?", videoID).Updates(updates).Error
}

// AddSubtitle adds a subtitle file to a video
func (v *VideoService) AddSubtitle(ctx context.Context, videoID uint, file *multipart.FileHeader, language, label string, isDefault bool) error {
	// Upload to S3
	s3Path := fmt.Sprintf("videos/%d/subtitles/%s.vtt", videoID, language)

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	if err := v.s3Service.UploadFileFromReader(ctx, src, s3Path, "text/vtt"); err != nil {
		return err
	}

	// If this is default, unset other defaults
	if isDefault {
		v.db.Model(&models.VideoSubtitle{}).Where("media_track_id = ?", videoID).Update("is_default", false)
	}

	// Create subtitle record
	subtitle := &models.VideoSubtitle{
		MediaTrackID: videoID,
		Language:     language,
		Label:        label,
		URL:          v.s3Service.GetPublicURL(s3Path),
		IsDefault:    isDefault,
	}

	if err := v.db.Create(subtitle).Error; err != nil {
		return err
	}

	// Update track
	v.db.Model(&models.MediaTrack{}).Where("id = ?", videoID).Updates(map[string]interface{}{
		"has_subtitles":  true,
		"subtitle_count": gorm.Expr("subtitle_count + 1"),
	})

	return nil
}

// DeleteSubtitle removes a subtitle
func (v *VideoService) DeleteSubtitle(subtitleID uint) error {
	var subtitle models.VideoSubtitle
	if err := v.db.First(&subtitle, subtitleID).Error; err != nil {
		return err
	}

	// Delete from S3
	// v.s3Service.DeleteFile(ctx, subtitle.URL) // TODO: implement

	// Delete from DB
	if err := v.db.Delete(&subtitle).Error; err != nil {
		return err
	}

	// Update track
	v.db.Model(&models.MediaTrack{}).Where("id = ?", subtitle.MediaTrackID).Update("subtitle_count", gorm.Expr("subtitle_count - 1"))

	// Check if any subtitles left
	var count int64
	v.db.Model(&models.VideoSubtitle{}).Where("media_track_id = ?", subtitle.MediaTrackID).Count(&count)
	if count == 0 {
		v.db.Model(&models.MediaTrack{}).Where("id = ?", subtitle.MediaTrackID).Update("has_subtitles", false)
	}

	return nil
}

// RetryTranscoding retries a failed transcoding job
func (v *VideoService) RetryTranscoding(videoID uint) (string, error) {
	var track models.MediaTrack
	if err := v.db.First(&track, videoID).Error; err != nil {
		return "", err
	}

	if track.OriginalURL == "" {
		return "", errors.New("no original video file found")
	}

	// Extract S3 path from URL
	s3Original := v.s3Service.ExtractS3Path(track.OriginalURL)
	s3Output := fmt.Sprintf("videos/%d/hls", track.ID)

	// Start new transcoding job
	jobID, err := v.transcoding.StartTranscodingJob(track.ID, s3Original, s3Output, nil)
	if err != nil {
		return "", err
	}

	// Update track
	v.db.Model(&track).Updates(map[string]interface{}{
		"transcoding_job_id":   jobID,
		"transcoding_status":   "pending",
		"transcoding_progress": 0,
	})

	return jobID, nil
}

// DeleteVideo deletes a video and all associated files
func (v *VideoService) DeleteVideo(ctx context.Context, videoID uint) error {
	var track models.MediaTrack
	if err := v.db.First(&track, videoID).Error; err != nil {
		return err
	}

	// Delete from S3 (all files in videos/{id}/ folder)
	// TODO: v.s3Service.DeleteFolder(ctx, fmt.Sprintf("videos/%d/", videoID))

	// Delete related records
	v.db.Where("media_track_id = ?", videoID).Delete(&models.VideoQuality{})
	v.db.Where("media_track_id = ?", videoID).Delete(&models.VideoSubtitle{})
	v.db.Where("media_track_id = ?", videoID).Delete(&models.UserVideoProgress{})
	v.db.Where("media_track_id = ?", videoID).Delete(&models.VideoTranscodingJob{})

	// Delete track
	return v.db.Delete(&track).Error
}

// Helper functions

func (v *VideoService) isAllowedType(ext string) bool {
	for _, allowed := range v.allowedTypes {
		if ext == allowed {
			return true
		}
	}
	return false
}

func (v *VideoService) getVideoURL(url string) string {
	// Check if CDN is enabled
	cdnEnabled := os.Getenv("CDN_ENABLED") == "true"
	cdnBaseURL := os.Getenv("CDN_BASE_URL")

	if cdnEnabled && cdnBaseURL != "" {
		// Replace S3 URL with CDN URL
		s3URL := os.Getenv("S3_PUBLIC_URL")
		if s3URL != "" {
			return strings.Replace(url, s3URL, cdnBaseURL, 1)
		}
	}

	return url
}
