package models

import (
	"time"

	"gorm.io/gorm"
)

// MediaType defines the type of multimedia content
type MediaType string

const (
	MediaTypeAudio MediaType = "audio"
	MediaTypeVideo MediaType = "video"
)

// MediaCategory represents categories for organizing media content
type MediaCategory struct {
	gorm.Model
	Name        string `json:"name" gorm:"not null"`
	Slug        string `json:"slug" gorm:"uniqueIndex;not null"`
	Description string `json:"description"`
	Type        string `json:"type" gorm:"index"` // bhajan, lecture, kirtan, film, documentary
	ParentID    *uint  `json:"parentId"`
	IconURL     string `json:"iconUrl"`
	SortOrder   int    `json:"sortOrder" gorm:"default:0"`
	IsActive    bool   `json:"isActive" gorm:"default:true"`
}

// MediaTrack represents an audio or video file in the multimedia hub
type MediaTrack struct {
	gorm.Model
	Title        string         `json:"title" gorm:"not null"`
	Artist       string         `json:"artist"`
	Album        string         `json:"album"`
	Description  string         `json:"description"`
	Duration     int            `json:"duration"`                                         // Duration in seconds
	MediaType    MediaType      `json:"mediaType" gorm:"type:varchar(10);index;not null"` // audio or video
	URL          string         `json:"url" gorm:"not null"`                              // S3 URL or external URL
	ThumbnailURL string         `json:"thumbnailUrl"`
	CategoryID   *uint          `json:"categoryId" gorm:"index"`
	Category     *MediaCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Madh         string         `json:"madh" gorm:"index"` // Filter by spiritual tradition
	YogaStyle    string         `json:"yogaStyle"`
	Language     string         `json:"language" gorm:"default:'ru'"`
	Year         int            `json:"year"`
	ViewCount    int            `json:"viewCount" gorm:"default:0"`
	LikeCount    int            `json:"likeCount" gorm:"default:0"`
	IsExternal   bool           `json:"isExternal" gorm:"default:false"` // External URL vs S3
	IsFeatured   bool           `json:"isFeatured" gorm:"default:false"`
	IsActive     bool           `json:"isActive" gorm:"default:true"`
	PublishedAt  *time.Time     `json:"publishedAt"`
	CreatedByID  uint           `json:"createdById"`
	CreatedBy    *User          `json:"createdBy,omitempty" gorm:"foreignKey:CreatedByID"`

	// Video-specific fields (for HLS streaming)
	OriginalURL         string  `json:"originalUrl"`                             // Original uploaded file in S3
	HLSURL              string  `json:"hlsUrl"`                                  // Master playlist .m3u8
	TranscodingStatus   string  `json:"transcodingStatus" gorm:"default:'none'"` // none, pending, processing, completed, failed
	TranscodingProgress int     `json:"transcodingProgress" gorm:"default:0"`    // 0-100%
	TranscodingJobID    string  `json:"transcodingJobId"`                        // Redis job ID
	FileSize            int64   `json:"fileSize"`                                // Original file size in bytes
	Resolution          string  `json:"resolution"`                              // Original resolution (e.g., "1920x1080")
	Bitrate             int     `json:"bitrate"`                                 // Original bitrate kbps
	Framerate           float64 `json:"framerate"`                               // Original framerate
	HasSubtitles        bool    `json:"hasSubtitles" gorm:"default:false"`
	SubtitleCount       int     `json:"subtitleCount" gorm:"default:0"`
}

// RadioStation represents an online radio stream
type RadioStation struct {
	gorm.Model
	Name          string     `json:"name" gorm:"not null"`
	Description   string     `json:"description"`
	StreamURL     string     `json:"streamUrl" gorm:"not null"` // HLS/Icecast stream URL
	LogoURL       string     `json:"logoUrl"`
	Madh          string     `json:"madh" gorm:"index"`
	Language      string     `json:"language" gorm:"default:'ru'"`
	StreamType    string     `json:"streamType" gorm:"default:'external'"` // external, rtmp (for future)
	IsLive        bool       `json:"isLive" gorm:"default:true"`
	ViewerCount   int        `json:"viewerCount" gorm:"default:0"`
	SortOrder     int        `json:"sortOrder" gorm:"default:0"`
	IsActive      bool       `json:"isActive" gorm:"default:true"`
	CreatedByID   uint       `json:"createdById"`
	Status        string     `json:"status" gorm:"default:'unknown'"` // online, offline, unknown
	LastCheckedAt *time.Time `json:"lastCheckedAt"`
}

// TVChannel represents a TV streaming channel
type TVChannel struct {
	gorm.Model
	Name        string `json:"name" gorm:"not null"`
	Description string `json:"description"`
	StreamURL   string `json:"streamUrl" gorm:"not null"` // YouTube/Vimeo embed URL or RTMP
	LogoURL     string `json:"logoUrl"`
	StreamType  string `json:"streamType" gorm:"default:'youtube'"` // youtube, vimeo, rtmp
	Madh        string `json:"madh" gorm:"index"`
	Schedule    string `json:"schedule"` // JSON schedule or description
	IsLive      bool   `json:"isLive" gorm:"default:false"`
	ViewerCount int    `json:"viewerCount" gorm:"default:0"`
	Status      string `json:"status" gorm:"default:'unknown'"` // online, offline, unknown
	// TV check may be unavailable for some stream types, keep nullable timestamp.
	LastCheckedAt *time.Time `json:"lastCheckedAt"`
	SortOrder     int        `json:"sortOrder" gorm:"default:0"`
	IsActive      bool       `json:"isActive" gorm:"default:true"`
	CreatedByID   uint       `json:"createdById"`
}

// UserPlaylist represents a user's saved multimedia playlist.
type UserPlaylist struct {
	gorm.Model
	UserID      uint   `json:"userId" gorm:"index;not null"`
	Name        string `json:"name" gorm:"not null"`
	Description string `json:"description"`
	IsPublic    bool   `json:"isPublic" gorm:"default:false"`
}

// UserPlaylistItem maps tracks into user playlists.
type UserPlaylistItem struct {
	gorm.Model
	PlaylistID   uint        `json:"playlistId" gorm:"index;not null"`
	MediaTrackID uint        `json:"mediaTrackId" gorm:"index;not null"`
	SortOrder    int         `json:"sortOrder" gorm:"default:0"`
	Track        *MediaTrack `json:"track,omitempty" gorm:"foreignKey:MediaTrackID"`
}

// UserMediaSuggestion represents user-submitted content for moderation
type UserMediaSuggestion struct {
	gorm.Model
	UserID       uint       `json:"userId" gorm:"index;not null"`
	User         *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Title        string     `json:"title" gorm:"not null"`
	Description  string     `json:"description"`
	URL          string     `json:"url"`
	MediaType    MediaType  `json:"mediaType"`
	Status       string     `json:"status" gorm:"default:'pending'"` // pending, approved, rejected
	AdminNote    string     `json:"adminNote"`
	ReviewedByID *uint      `json:"reviewedById"`
	ReviewedAt   *time.Time `json:"reviewedAt"`
}

// UserMediaFavorite represents user's favorite tracks
type UserMediaFavorite struct {
	gorm.Model
	UserID       uint `json:"userId" gorm:"uniqueIndex:idx_user_track;not null"`
	MediaTrackID uint `json:"mediaTrackId" gorm:"uniqueIndex:idx_user_track;not null"`
}

// UserMediaHistory represents user's playback history
type UserMediaHistory struct {
	gorm.Model
	UserID       uint       `json:"userId" gorm:"index;not null"`
	MediaTrackID uint       `json:"mediaTrackId" gorm:"index;not null"`
	Progress     int        `json:"progress"` // Playback position in seconds
	CompletedAt  *time.Time `json:"completedAt"`
}

// TableName overrides for proper table naming
func (MediaCategory) TableName() string       { return "media_categories" }
func (MediaTrack) TableName() string          { return "media_tracks" }
func (RadioStation) TableName() string        { return "radio_stations" }
func (TVChannel) TableName() string           { return "tv_channels" }
func (UserPlaylist) TableName() string        { return "user_playlists" }
func (UserPlaylistItem) TableName() string    { return "user_playlist_items" }
func (UserMediaSuggestion) TableName() string { return "user_media_suggestions" }
func (UserMediaFavorite) TableName() string   { return "user_media_favorites" }
func (UserMediaHistory) TableName() string    { return "user_media_history" }
