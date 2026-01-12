package models

import (
	"time"

	"gorm.io/gorm"
)

// NewsSourceType represents the type of news source
type NewsSourceType string

const (
	NewsSourceTypeVK       NewsSourceType = "vk"
	NewsSourceTypeTelegram NewsSourceType = "telegram"
	NewsSourceTypeRSS      NewsSourceType = "rss"
	NewsSourceTypeURL      NewsSourceType = "url"
)

// NewsSourceMode represents how news from this source are processed
type NewsSourceMode string

const (
	NewsSourceModeAutoPublish NewsSourceMode = "auto_publish"
	NewsSourceModeDraft       NewsSourceMode = "draft"
)

// NewsItemStatus represents the publication status of a news item
type NewsItemStatus string

const (
	NewsItemStatusDraft     NewsItemStatus = "draft"
	NewsItemStatusPublished NewsItemStatus = "published"
	NewsItemStatusArchived  NewsItemStatus = "archived"
	NewsItemStatusDeleted   NewsItemStatus = "deleted"
)

// NewsSource represents a news source (VK group, Telegram channel, RSS feed, etc.)
type NewsSource struct {
	gorm.Model

	// Basic info
	Name        string         `json:"name" gorm:"type:varchar(200);not null"`
	Description string         `json:"description" gorm:"type:text"`
	SourceType  NewsSourceType `json:"sourceType" gorm:"type:varchar(20);not null;index"`

	// Source-specific data
	URL          string `json:"url" gorm:"type:varchar(500)"`                                             // For RSS/URL
	VKGroupID    string `json:"vkGroupId" gorm:"column:vk_group_id;type:varchar(100)"`                    // For VK
	TelegramID   string `json:"telegramId" gorm:"column:telegram_id;type:varchar(100)"`                   // For Telegram
	TGParserType string `json:"tgParserType" gorm:"column:tg_parser_type;type:varchar(20);default:'bot'"` // 'bot' or 'web'
	AccessToken  string `json:"-" gorm:"type:varchar(500)"`                                               // For API access (hidden from JSON)

	// Parsing settings
	IsActive      bool           `json:"isActive" gorm:"default:true;index"`
	FetchInterval int            `json:"fetchInterval" gorm:"default:3600"` // In seconds, default 1 hour
	Mode          NewsSourceMode `json:"mode" gorm:"type:varchar(20);default:'draft'"`
	LastFetchedAt *time.Time     `json:"lastFetchedAt"`
	LastError     string         `json:"lastError" gorm:"type:text"`

	// Content processing
	AutoTranslate bool   `json:"autoTranslate" gorm:"default:true"`
	StyleTransfer bool   `json:"styleTransfer" gorm:"default:true"`
	DefaultTags   string `json:"defaultTags" gorm:"type:varchar(500)"` // Comma-separated

	// Target audience
	TargetMadh     string `json:"targetMadh" gorm:"type:varchar(500)"`     // e.g. "iskcon,gaudiya"
	TargetYoga     string `json:"targetYoga" gorm:"type:varchar(500)"`     // e.g. "hatha,kundalini"
	TargetIdentity string `json:"targetIdentity" gorm:"type:varchar(500)"` // e.g. "brahmana,vaishya"

	// Relations
	NewsItems []NewsItem `json:"newsItems,omitempty" gorm:"foreignKey:SourceID"`
}

// UserNewsSubscription tracks user subscriptions to news sources for push notifications
type UserNewsSubscription struct {
	UserID    uint        `json:"userId" gorm:"primaryKey;autoIncrement:false"`
	SourceID  uint        `json:"sourceId" gorm:"primaryKey;autoIncrement:false"`
	User      *User       `json:"-" gorm:"foreignKey:UserID"`
	Source    *NewsSource `json:"source" gorm:"foreignKey:SourceID"`
	CreatedAt time.Time   `json:"createdAt"`
}

// UserNewsFavorite tracks user favorite news sources
type UserNewsFavorite struct {
	UserID    uint        `json:"userId" gorm:"primaryKey;autoIncrement:false"`
	SourceID  uint        `json:"sourceId" gorm:"primaryKey;autoIncrement:false"`
	User      *User       `json:"-" gorm:"foreignKey:UserID"`
	Source    *NewsSource `json:"source" gorm:"foreignKey:SourceID"`
	CreatedAt time.Time   `json:"createdAt"`
}

// NewsItem represents a single news article
type NewsItem struct {
	gorm.Model

	// Source relation
	SourceID uint        `json:"sourceId" gorm:"not null;index"`
	Source   *NewsSource `json:"source,omitempty" gorm:"foreignKey:SourceID"`

	// Original content (raw from source)
	OriginalTitle    string `json:"originalTitle" gorm:"type:varchar(500)"`
	OriginalContent  string `json:"originalContent" gorm:"type:text"`
	OriginalLang     string `json:"originalLang" gorm:"type:varchar(10);default:'ru'"` // ru, en
	OriginalURL      string `json:"originalUrl" gorm:"type:varchar(500)"`
	OriginalImageURL string `json:"originalImageUrl" gorm:"type:varchar(500)"`

	// Processed content (Russian)
	TitleRu   string `json:"titleRu" gorm:"type:varchar(500)"`
	SummaryRu string `json:"summaryRu" gorm:"type:text"` // Short lead/description
	ContentRu string `json:"contentRu" gorm:"type:text"` // Full processed content

	// Processed content (English)
	TitleEn   string `json:"titleEn" gorm:"type:varchar(500)"`
	SummaryEn string `json:"summaryEn" gorm:"type:text"`
	ContentEn string `json:"contentEn" gorm:"type:text"`

	// Media
	ImageURL    string `json:"imageUrl" gorm:"type:varchar(500)"` // Main image (processed/selected)
	ImagePrompt string `json:"imagePrompt" gorm:"type:text"`      // For AI image generation if needed

	// Tags and categories
	Tags     string `json:"tags" gorm:"type:varchar(500)"` // Comma-separated tags
	Category string `json:"category" gorm:"type:varchar(100);index"`

	// Target audience (inherited from source or detected by AI)
	TargetMadh     string `json:"targetMadh" gorm:"type:varchar(500);index"`
	TargetYoga     string `json:"targetYoga" gorm:"type:varchar(500);index"`
	TargetIdentity string `json:"targetIdentity" gorm:"type:varchar(500);index"`

	// Status and moderation
	Status            NewsItemStatus `json:"status" gorm:"type:varchar(20);default:'draft';index"`
	IsImportant       bool           `json:"isImportant" gorm:"default:false;index"` // For push notifications
	ModeratedBy       *uint          `json:"moderatedBy"`
	ModeratedAt       *time.Time     `json:"moderatedAt"`
	ModerationComment string         `json:"moderationComment" gorm:"type:text"`

	// AI Processing flags
	AIProcessed       bool       `json:"aiProcessed" gorm:"default:false"`
	AIProcessedAt     *time.Time `json:"aiProcessedAt"`
	AIProcessingError string     `json:"aiProcessingError" gorm:"type:text"`

	// Publishing
	PublishedAt *time.Time `json:"publishedAt" gorm:"index"`
	ScheduledAt *time.Time `json:"scheduledAt"` // For scheduled publishing

	// Stats
	ViewsCount int `json:"viewsCount" gorm:"default:0"`

	// External reference
	ExternalID string `json:"externalId" gorm:"type:varchar(200);index"` // ID from original source to prevent duplicates
}

// NewsFilters for querying news items
type NewsFilters struct {
	Status      NewsItemStatus `json:"status"`
	Category    string         `json:"category"`
	SourceID    *uint          `json:"sourceId"`
	Tags        string         `json:"tags"`
	IsImportant *bool          `json:"isImportant"`
	Lang        string         `json:"lang"` // ru, en - which language to return
	Search      string         `json:"search"`
	Sort        string         `json:"sort"` // newest, oldest, popular, important
	Page        int            `json:"page"`
	Limit       int            `json:"limit"`
}

// NewsSourceFilters for querying news sources
type NewsSourceFilters struct {
	SourceType NewsSourceType `json:"sourceType"`
	IsActive   *bool          `json:"isActive"`
	Mode       NewsSourceMode `json:"mode"`
	Search     string         `json:"search"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
}

// NewsItemCreateRequest for creating/editing news
type NewsItemCreateRequest struct {
	SourceID    *uint          `json:"sourceId"`
	TitleRu     string         `json:"titleRu" binding:"required,min=5,max=500"`
	TitleEn     string         `json:"titleEn"`
	SummaryRu   string         `json:"summaryRu"`
	SummaryEn   string         `json:"summaryEn"`
	ContentRu   string         `json:"contentRu" binding:"required,min=20"`
	ContentEn   string         `json:"contentEn"`
	ImageURL    string         `json:"imageUrl"`
	Tags        string         `json:"tags"`
	Category    string         `json:"category"`
	Status      NewsItemStatus `json:"status"`
	IsImportant bool           `json:"isImportant"`
	ScheduledAt *time.Time     `json:"scheduledAt"`
}

// NewsSourceCreateRequest for creating/editing news sources
type NewsSourceCreateRequest struct {
	Name           string         `json:"name" binding:"required,min=2,max=200"`
	Description    string         `json:"description"`
	SourceType     NewsSourceType `json:"sourceType" binding:"required"`
	URL            string         `json:"url"`
	VKGroupID      string         `json:"vkGroupId"`
	TelegramID     string         `json:"telegramId"`
	TGParserType   string         `json:"tgParserType"`
	AccessToken    string         `json:"accessToken"`
	IsActive       bool           `json:"isActive"`
	FetchInterval  int            `json:"fetchInterval"`
	Mode           NewsSourceMode `json:"mode"`
	AutoTranslate  bool           `json:"autoTranslate"`
	StyleTransfer  bool           `json:"styleTransfer"`
	DefaultTags    string         `json:"defaultTags"`
	TargetMadh     string         `json:"targetMadh"`
	TargetYoga     string         `json:"targetYoga"`
	TargetIdentity string         `json:"targetIdentity"`
}

// NewsItemResponse for API responses (language-aware)
type NewsItemResponse struct {
	ID          uint           `json:"id"`
	SourceID    uint           `json:"sourceId"`
	SourceName  string         `json:"sourceName,omitempty"`
	Title       string         `json:"title"`   // Based on requested language
	Summary     string         `json:"summary"` // Based on requested language
	Content     string         `json:"content"` // Based on requested language
	ImageURL    string         `json:"imageUrl"`
	Tags        string         `json:"tags"`
	Category    string         `json:"category"`
	Status      NewsItemStatus `json:"status"`
	IsImportant bool           `json:"isImportant"`
	PublishedAt *time.Time     `json:"publishedAt"`
	ViewsCount  int            `json:"viewsCount"`
	OriginalURL string         `json:"originalUrl,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

// NewsListResponse for paginated list
type NewsListResponse struct {
	News       []NewsItemResponse `json:"news"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	TotalPages int                `json:"totalPages"`
}

// NewsSourceListResponse for paginated list
type NewsSourceListResponse struct {
	Sources    []NewsSource `json:"sources"`
	Total      int64        `json:"total"`
	Page       int          `json:"page"`
	TotalPages int          `json:"totalPages"`
}

// NewsStatsResponse for dashboard stats
type NewsStatsResponse struct {
	TotalNews      int64            `json:"totalNews"`
	PublishedNews  int64            `json:"publishedNews"`
	DraftNews      int64            `json:"draftNews"`
	TotalSources   int64            `json:"totalSources"`
	ActiveSources  int64            `json:"activeSources"`
	ByCategory     map[string]int64 `json:"byCategory"`
	BySource       map[string]int64 `json:"bySource"`
	RecentActivity []NewsItem       `json:"recentActivity,omitempty"`
}

// ToResponse converts NewsItem to NewsItemResponse based on language
func (n *NewsItem) ToResponse(lang string) NewsItemResponse {
	resp := NewsItemResponse{
		ID:          n.ID,
		SourceID:    n.SourceID,
		ImageURL:    n.ImageURL,
		Tags:        n.Tags,
		Category:    n.Category,
		Status:      n.Status,
		IsImportant: n.IsImportant,
		PublishedAt: n.PublishedAt,
		ViewsCount:  n.ViewsCount,
		OriginalURL: n.OriginalURL,
		CreatedAt:   n.CreatedAt,
		UpdatedAt:   n.UpdatedAt,
	}

	// Set language-specific fields
	if lang == "en" && n.TitleEn != "" {
		resp.Title = n.TitleEn
		resp.Summary = n.SummaryEn
		resp.Content = n.ContentEn
	} else {
		resp.Title = n.TitleRu
		resp.Summary = n.SummaryRu
		resp.Content = n.ContentRu
	}

	// Fallback to Russian if English is empty
	if resp.Title == "" {
		resp.Title = n.TitleRu
	}
	if resp.Summary == "" {
		resp.Summary = n.SummaryRu
	}
	if resp.Content == "" {
		resp.Content = n.ContentRu
	}

	if n.Source != nil {
		resp.SourceName = n.Source.Name
	}

	return resp
}
