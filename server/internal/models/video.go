package models

import (
	"time"

	"gorm.io/gorm"
)

// TranscodingStatus represents the status of video transcoding
type TranscodingStatus string

const (
	TranscodingPending    TranscodingStatus = "pending"
	TranscodingProcessing TranscodingStatus = "processing"
	TranscodingCompleted  TranscodingStatus = "completed"
	TranscodingFailed     TranscodingStatus = "failed"
)

// VideoQuality represents a specific quality variant of a video
type VideoQuality struct {
	gorm.Model
	MediaTrackID uint   `json:"mediaTrackId" gorm:"index;not null"`
	Quality      string `json:"quality" gorm:"not null"` // 360p, 480p, 720p, 1080p
	URL          string `json:"url" gorm:"not null"`     // S3 URL to .m3u8 or segment folder
	Bitrate      int    `json:"bitrate"`                 // kbps
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	FileSize     int64  `json:"fileSize"` // bytes
}

// VideoSubtitle represents subtitles for a video
type VideoSubtitle struct {
	gorm.Model
	MediaTrackID uint   `json:"mediaTrackId" gorm:"index;not null"`
	Language     string `json:"language" gorm:"not null"` // ru, en, hi, etc.
	Label        string `json:"label"`                    // "Русский", "English", "हिंदी"
	URL          string `json:"url" gorm:"not null"`      // S3 URL to .vtt file
	IsDefault    bool   `json:"isDefault" gorm:"default:false"`
}

// UserVideoProgress tracks user's watch progress for a video
type UserVideoProgress struct {
	gorm.Model
	UserID       uint       `json:"userId" gorm:"uniqueIndex:idx_user_video;not null"`
	MediaTrackID uint       `json:"mediaTrackId" gorm:"uniqueIndex:idx_user_video;not null"`
	Position     int        `json:"position"`                       // Current position in seconds
	Duration     int        `json:"duration"`                       // Total duration in seconds
	Completed    bool       `json:"completed" gorm:"default:false"` // Watched to the end
	LastWatched  *time.Time `json:"lastWatched"`
}

// VideoTranscodingJob represents a background transcoding job
type VideoTranscodingJob struct {
	gorm.Model
	MediaTrackID uint              `json:"mediaTrackId" gorm:"index;not null"`
	JobID        string            `json:"jobId" gorm:"uniqueIndex"` // Redis job ID
	Status       TranscodingStatus `json:"status" gorm:"default:'pending'"`
	Progress     int               `json:"progress" gorm:"default:0"` // 0-100%
	Error        string            `json:"error"`
	InputPath    string            `json:"inputPath"`  // Original file S3 path
	OutputPath   string            `json:"outputPath"` // HLS output folder
	StartedAt    *time.Time        `json:"startedAt"`
	CompletedAt  *time.Time        `json:"completedAt"`
}

// MediaTrackExtended extends MediaTrack with video-specific fields
// These fields should be added to the existing MediaTrack model via migration
type MediaTrackVideoFields struct {
	OriginalURL         string            `json:"originalUrl"` // Original uploaded file
	HLSURL              string            `json:"hlsUrl"`      // Master playlist .m3u8
	TranscodingStatus   TranscodingStatus `json:"transcodingStatus" gorm:"default:'pending'"`
	TranscodingProgress int               `json:"transcodingProgress" gorm:"default:0"`
	TranscodingJobID    string            `json:"transcodingJobId"`
	FileSize            int64             `json:"fileSize"`   // Original file size in bytes
	Resolution          string            `json:"resolution"` // Original resolution (e.g., "1920x1080")
	Bitrate             int               `json:"bitrate"`    // Original bitrate kbps
	Framerate           float64           `json:"framerate"`  // Original framerate
	HasSubtitles        bool              `json:"hasSubtitles" gorm:"default:false"`
	SubtitleCount       int               `json:"subtitleCount" gorm:"default:0"`
}

// CDNSettings represents CDN configuration stored in settings table
type CDNSettings struct {
	Enabled  bool   `json:"enabled"`
	BaseURL  string `json:"baseUrl"`
	Provider string `json:"provider"` // cloudflare, bunnycdn, custom
}

// TableName overrides for proper table naming
func (VideoQuality) TableName() string        { return "video_qualities" }
func (VideoSubtitle) TableName() string       { return "video_subtitles" }
func (UserVideoProgress) TableName() string   { return "user_video_progress" }
func (VideoTranscodingJob) TableName() string { return "video_transcoding_jobs" }

// VideoQualityPreset defines standard quality presets
type VideoQualityPreset struct {
	Name    string // 360p, 480p, 720p, 1080p
	Width   int
	Height  int
	Bitrate int // kbps
}

// StandardQualityPresets returns the standard quality presets
func StandardQualityPresets() []VideoQualityPreset {
	return []VideoQualityPreset{
		{Name: "360p", Width: 640, Height: 360, Bitrate: 800},
		{Name: "480p", Width: 854, Height: 480, Bitrate: 1400},
		{Name: "720p", Width: 1280, Height: 720, Bitrate: 2800},
		{Name: "1080p", Width: 1920, Height: 1080, Bitrate: 5000},
	}
}

// VideoUploadRequest represents a video upload request from admin
type VideoUploadRequest struct {
	Title       string   `json:"title" validate:"required"`
	Description string   `json:"description"`
	CategoryID  *uint    `json:"categoryId"`
	Artist      string   `json:"artist"`
	Madh        string   `json:"madh"`
	Language    string   `json:"language"`
	Year        int      `json:"year"`
	Qualities   []string `json:"qualities"` // Which qualities to generate
	IsFeatured  bool     `json:"isFeatured"`
}

// VideoUploadResponse is returned after initiating upload
type VideoUploadResponse struct {
	MediaTrackID uint   `json:"mediaTrackId"`
	UploadURL    string `json:"uploadUrl"` // Presigned S3 URL for direct upload
	JobID        string `json:"jobId"`     // Transcoding job ID for progress tracking
}

// TranscodingProgressResponse for real-time progress updates
type TranscodingProgressResponse struct {
	JobID       string            `json:"jobId"`
	VideoID     uint              `json:"videoId"`
	Status      TranscodingStatus `json:"status"`
	Progress    int               `json:"progress"`
	CurrentStep string            `json:"currentStep"` // "uploading", "transcoding_360p", etc.
	Error       string            `json:"error,omitempty"`
}

// VideoPlaybackInfo contains all info needed for video playback
type VideoPlaybackInfo struct {
	ID           uint               `json:"id"`
	Title        string             `json:"title"`
	Description  string             `json:"description"`
	HLSURL       string             `json:"hlsUrl"` // Master playlist
	ThumbnailURL string             `json:"thumbnailUrl"`
	Duration     int                `json:"duration"`
	Qualities    []VideoQuality     `json:"qualities"`
	Subtitles    []VideoSubtitle    `json:"subtitles"`
	Progress     *UserVideoProgress `json:"progress,omitempty"` // User's watch progress
}
