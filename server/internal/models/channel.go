package models

import (
	"time"

	"gorm.io/gorm"
)

type ChannelMemberRole string

type ChannelPostType string

type ChannelPostStatus string

type ChannelPostCTAType string

const (
	ChannelMemberRoleOwner  ChannelMemberRole = "owner"
	ChannelMemberRoleAdmin  ChannelMemberRole = "admin"
	ChannelMemberRoleEditor ChannelMemberRole = "editor"
)

const (
	ChannelPostTypeText     ChannelPostType = "text"
	ChannelPostTypeMedia    ChannelPostType = "media"
	ChannelPostTypeShowcase ChannelPostType = "showcase"
)

const (
	ChannelPostStatusDraft     ChannelPostStatus = "draft"
	ChannelPostStatusScheduled ChannelPostStatus = "scheduled"
	ChannelPostStatusPublished ChannelPostStatus = "published"
	ChannelPostStatusArchived  ChannelPostStatus = "archived"
)

const (
	ChannelPostCTATypeNone          ChannelPostCTAType = "none"
	ChannelPostCTATypeOrderProducts ChannelPostCTAType = "order_products"
	ChannelPostCTATypeBookService   ChannelPostCTAType = "book_service"
)

// Channel is a creator-owned content stream with branding.
type Channel struct {
	gorm.Model
	OwnerID uint  `json:"ownerId" gorm:"not null;index"`
	Owner   *User `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	Title       string `json:"title" gorm:"type:varchar(200);not null"`
	Slug        string `json:"slug" gorm:"type:varchar(220);uniqueIndex;not null"`
	Description string `json:"description" gorm:"type:text"`
	AvatarURL   string `json:"avatarUrl" gorm:"type:varchar(500)"`
	CoverURL    string `json:"coverUrl" gorm:"type:varchar(500)"`
	Timezone    string `json:"timezone" gorm:"type:varchar(64);default:'UTC'"`
	IsPublic    bool   `json:"isPublic" gorm:"default:true;index"`

	Members   []ChannelMember   `json:"members,omitempty" gorm:"foreignKey:ChannelID"`
	Posts     []ChannelPost     `json:"posts,omitempty" gorm:"foreignKey:ChannelID"`
	Showcases []ChannelShowcase `json:"showcases,omitempty" gorm:"foreignKey:ChannelID"`
}

// ChannelMember controls channel-level permissions.
type ChannelMember struct {
	gorm.Model
	ChannelID uint              `json:"channelId" gorm:"not null;index:idx_channel_user,unique"`
	Channel   *Channel          `json:"channel,omitempty" gorm:"foreignKey:ChannelID"`
	UserID    uint              `json:"userId" gorm:"not null;index:idx_channel_user,unique"`
	User      *User             `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Role      ChannelMemberRole `json:"role" gorm:"type:varchar(20);default:'editor';index"`
}

// ChannelPost is a publication inside a channel feed.
type ChannelPost struct {
	gorm.Model
	ChannelID uint            `json:"channelId" gorm:"not null;index"`
	Channel   *Channel        `json:"channel,omitempty" gorm:"foreignKey:ChannelID"`
	AuthorID  uint            `json:"authorId" gorm:"not null;index"`
	Author    *User           `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
	Type      ChannelPostType `json:"type" gorm:"type:varchar(20);not null;default:'text';index"`

	Content        string             `json:"content" gorm:"type:text"`
	MediaJSON      string             `json:"mediaJson" gorm:"type:text"`
	CTAType        ChannelPostCTAType `json:"ctaType" gorm:"type:varchar(30);default:'none';index"`
	CTAPayloadJSON string             `json:"ctaPayloadJson" gorm:"type:text"`

	Status      ChannelPostStatus `json:"status" gorm:"type:varchar(20);default:'draft';index"`
	ScheduledAt *time.Time        `json:"scheduledAt" gorm:"index"`
	PublishedAt *time.Time        `json:"publishedAt" gorm:"index"`

	IsPinned bool       `json:"isPinned" gorm:"default:false;index"`
	PinnedAt *time.Time `json:"pinnedAt" gorm:"index"`
}

// ChannelShowcase stores configured product/service windows on channel home.
type ChannelShowcase struct {
	gorm.Model
	ChannelID uint     `json:"channelId" gorm:"not null;index"`
	Channel   *Channel `json:"channel,omitempty" gorm:"foreignKey:ChannelID"`

	Title      string `json:"title" gorm:"type:varchar(200);not null"`
	Kind       string `json:"kind" gorm:"type:varchar(50);not null;index"`
	FilterJSON string `json:"filterJson" gorm:"type:text"`
	Position   int    `json:"position" gorm:"default:0;index"`
	IsActive   bool   `json:"isActive" gorm:"default:true;index"`
}

// ===== DTOs =====

type ChannelCreateRequest struct {
	Title       string `json:"title" binding:"required,min=2,max=200"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatarUrl"`
	CoverURL    string `json:"coverUrl"`
	Timezone    string `json:"timezone"`
	IsPublic    *bool  `json:"isPublic"`
}

type ChannelUpdateRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	IsPublic    *bool   `json:"isPublic"`
	Timezone    *string `json:"timezone"`
}

type ChannelBrandingUpdateRequest struct {
	Description *string `json:"description"`
	AvatarURL   *string `json:"avatarUrl"`
	CoverURL    *string `json:"coverUrl"`
}

type ChannelMemberAddRequest struct {
	UserID uint              `json:"userId" binding:"required"`
	Role   ChannelMemberRole `json:"role"`
}

type ChannelMemberUserInfo struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName"`
	KarmicName    string `json:"karmicName"`
	AvatarURL     string `json:"avatarUrl"`
}

type ChannelMemberResponse struct {
	ID        uint                   `json:"id"`
	ChannelID uint                   `json:"channelId"`
	UserID    uint                   `json:"userId"`
	Role      ChannelMemberRole      `json:"role"`
	CreatedAt time.Time              `json:"createdAt"`
	UpdatedAt time.Time              `json:"updatedAt"`
	UserInfo  *ChannelMemberUserInfo `json:"userInfo,omitempty"`
}

type ChannelMemberRoleUpdateRequest struct {
	Role ChannelMemberRole `json:"role" binding:"required"`
}

type ChannelPostCreateRequest struct {
	Type           ChannelPostType    `json:"type"`
	Content        string             `json:"content"`
	MediaJSON      string             `json:"mediaJson"`
	CTAType        ChannelPostCTAType `json:"ctaType"`
	CTAPayloadJSON string             `json:"ctaPayloadJson"`
}

type ChannelPostUpdateRequest struct {
	Type           *ChannelPostType    `json:"type"`
	Content        *string             `json:"content"`
	MediaJSON      *string             `json:"mediaJson"`
	CTAType        *ChannelPostCTAType `json:"ctaType"`
	CTAPayloadJSON *string             `json:"ctaPayloadJson"`
}

type ChannelPostScheduleRequest struct {
	ScheduledAt time.Time `json:"scheduledAt" binding:"required"`
}

type ChannelPostListResponse struct {
	Posts      []ChannelPost `json:"posts"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TotalPages int           `json:"totalPages"`
}

type ChannelFeedResponse struct {
	Posts               []ChannelPost       `json:"posts"`
	PromotedAds         []ChannelPromotedAd `json:"promotedAds,omitempty"`
	PromotedInsertEvery int                 `json:"promotedInsertEvery,omitempty"`
	Total               int64               `json:"total"`
	Page                int                 `json:"page"`
	Limit               int                 `json:"limit"`
	TotalPages          int                 `json:"totalPages"`
}

type ChannelListResponse struct {
	Channels   []Channel `json:"channels"`
	Total      int64     `json:"total"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
	TotalPages int       `json:"totalPages"`
}

type ChannelPromotedAd struct {
	ID          uint      `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	City        string    `json:"city"`
	Price       *float64  `json:"price,omitempty"`
	Currency    string    `json:"currency"`
	IsFree      bool      `json:"isFree"`
	UserID      uint      `json:"userId"`
	PhotoURL    string    `json:"photoUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

type ChannelShowcaseCreateRequest struct {
	Title      string `json:"title" binding:"required,min=1,max=200"`
	Kind       string `json:"kind" binding:"required"`
	FilterJSON string `json:"filterJson"`
	Position   *int   `json:"position"`
	IsActive   *bool  `json:"isActive"`
}

type ChannelShowcaseUpdateRequest struct {
	Title      *string `json:"title"`
	Kind       *string `json:"kind"`
	FilterJSON *string `json:"filterJson"`
	Position   *int    `json:"position"`
	IsActive   *bool   `json:"isActive"`
}

func IsValidChannelRole(role ChannelMemberRole) bool {
	switch role {
	case ChannelMemberRoleOwner, ChannelMemberRoleAdmin, ChannelMemberRoleEditor:
		return true
	default:
		return false
	}
}

func IsValidChannelPostType(postType ChannelPostType) bool {
	switch postType {
	case ChannelPostTypeText, ChannelPostTypeMedia, ChannelPostTypeShowcase:
		return true
	default:
		return false
	}
}

func IsValidChannelPostStatus(status ChannelPostStatus) bool {
	switch status {
	case ChannelPostStatusDraft, ChannelPostStatusScheduled, ChannelPostStatusPublished, ChannelPostStatusArchived:
		return true
	default:
		return false
	}
}

func IsValidChannelCTAType(ctaType ChannelPostCTAType) bool {
	switch ctaType {
	case ChannelPostCTATypeNone, ChannelPostCTATypeOrderProducts, ChannelPostCTATypeBookService:
		return true
	default:
		return false
	}
}
