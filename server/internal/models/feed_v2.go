package models

import "time"

// OrgType defines the category of organizations used for feed visibility filters.
type OrgType struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Key         string    `json:"key" gorm:"type:varchar(64);uniqueIndex;not null"`
	Name        string    `json:"name" gorm:"type:varchar(128);not null"`
	Description string    `json:"description" gorm:"type:text"`
	IsActive    bool      `json:"isActive" gorm:"default:true;index"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type OrgProfile struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	OwnerUserID uint      `json:"ownerUserId" gorm:"not null;index"`
	Owner       *User     `json:"owner,omitempty" gorm:"foreignKey:OwnerUserID"`
	OrgTypeID   uint      `json:"orgTypeId" gorm:"not null;index"`
	OrgType     *OrgType  `json:"orgType,omitempty" gorm:"foreignKey:OrgTypeID"`
	Title       string    `json:"title" gorm:"type:varchar(200);not null"`
	Slug        string    `json:"slug" gorm:"type:varchar(220);uniqueIndex;not null"`
	City        string    `json:"city" gorm:"type:varchar(120)"`
	Country     string    `json:"country" gorm:"type:varchar(120)"`
	IsVerified  bool      `json:"isVerified" gorm:"default:false"`
	Status      string    `json:"status" gorm:"type:varchar(20);default:'active';index"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type UserOrgMatch struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"userId" gorm:"not null;uniqueIndex:idx_user_org_match_unique;index:idx_user_org_match_lookup,priority:1"`
	User      *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	OrgTypeID uint       `json:"orgTypeId" gorm:"not null;uniqueIndex:idx_user_org_match_unique;index:idx_user_org_match_lookup,priority:3"`
	OrgType   *OrgType   `json:"orgType,omitempty" gorm:"foreignKey:OrgTypeID"`
	Source    string     `json:"source" gorm:"type:varchar(30);default:'manual'"`
	Status    string     `json:"status" gorm:"type:varchar(20);default:'active';index:idx_user_org_match_lookup,priority:2"`
	StartedAt time.Time  `json:"startedAt"`
	EndsAt    *time.Time `json:"endsAt"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

type UserProSubscription struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"userId" gorm:"not null;index:idx_user_pro_lookup,priority:1"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	PlanCode  string    `json:"planCode" gorm:"type:varchar(40);not null"`
	Status    string    `json:"status" gorm:"type:varchar(20);not null;index:idx_user_pro_lookup,priority:2"`
	StartsAt  time.Time `json:"startsAt" gorm:"not null"`
	EndsAt    time.Time `json:"endsAt" gorm:"not null;index:idx_user_pro_lookup,priority:3"`
	AutoRenew bool      `json:"autoRenew" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type FeedPost struct {
	ID           uint        `json:"id" gorm:"primaryKey"`
	AuthorUserID uint        `json:"authorUserId" gorm:"not null;index"`
	Author       *User       `json:"author,omitempty" gorm:"foreignKey:AuthorUserID"`
	OrgProfileID *uint       `json:"orgProfileId,omitempty" gorm:"index"`
	OrgProfile   *OrgProfile `json:"orgProfile,omitempty" gorm:"foreignKey:OrgProfileID"`
	OrgTypeID    uint        `json:"orgTypeId" gorm:"not null;index:idx_posts_org_time,priority:1"`
	OrgType      *OrgType    `json:"orgType,omitempty" gorm:"foreignKey:OrgTypeID"`
	ChannelID    *uint       `json:"channelId,omitempty" gorm:"index"`
	ContentType  string      `json:"contentType" gorm:"type:varchar(20);not null;index"`
	TextBody     string      `json:"textBody" gorm:"type:text"`
	Status       string      `json:"status" gorm:"type:varchar(20);default:'published';index:idx_posts_feed_core,priority:1"`
	Visibility   string      `json:"visibility" gorm:"type:varchar(20);default:'public';index"`
	Language     string      `json:"language" gorm:"type:varchar(8);default:'ru'"`
	PublishedAt  time.Time   `json:"publishedAt" gorm:"index:idx_posts_feed_core,priority:2;index:idx_posts_org_time,priority:2"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt    time.Time   `json:"updatedAt"`
	IsDeleted    bool        `json:"isDeleted" gorm:"default:false;index"`
}

type FeedMediaAsset struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	PostID       uint      `json:"postId" gorm:"not null;index:idx_feed_media_post_order,priority:1"`
	Post         *FeedPost `json:"post,omitempty" gorm:"foreignKey:PostID"`
	Kind         string    `json:"kind" gorm:"type:varchar(20);not null"`
	StorageKey   string    `json:"storageKey" gorm:"type:varchar(600);not null"`
	CDNURL       string    `json:"cdnUrl" gorm:"type:varchar(800);not null"`
	MimeType     string    `json:"mimeType" gorm:"type:varchar(100);not null"`
	DurationSec  int       `json:"durationSec"`
	Width        int       `json:"width"`
	Height       int       `json:"height"`
	Bytes        int64     `json:"bytes"`
	SortOrder    int       `json:"sortOrder" gorm:"default:0;index:idx_feed_media_post_order,priority:2"`
	VariantsJSON string    `json:"variantsJson" gorm:"type:jsonb;default:'{}'"`
	CreatedAt    time.Time `json:"createdAt"`
}

type FeedItem struct {
	UserID      uint      `json:"userId" gorm:"primaryKey;index:idx_feed_items_user_rank,priority:1"`
	ItemID      uint      `json:"itemId" gorm:"primaryKey"`
	ItemType    string    `json:"itemType" gorm:"type:varchar(20);primaryKey"`
	OrgTypeID   uint      `json:"orgTypeId" gorm:"not null;index"`
	SourceRank  float64   `json:"sourceRank" gorm:"not null;index:idx_feed_items_user_rank,priority:2"`
	ReasonCode  string    `json:"reasonCode" gorm:"type:varchar(40);not null"`
	PublishedAt time.Time `json:"publishedAt" gorm:"index:idx_feed_items_user_time,priority:2;index:idx_feed_items_user_rank,priority:3"`
	InsertedAt  time.Time `json:"insertedAt"`
}

type FeedCursorState struct {
	CursorID        string    `json:"cursorId" gorm:"primaryKey;type:varchar(80)"`
	UserID          uint      `json:"userId" gorm:"not null;index:idx_feed_cursor_user_exp,priority:1"`
	FilterHash      string    `json:"filterHash" gorm:"type:varchar(64);not null"`
	LastScore       float64   `json:"lastScore" gorm:"not null"`
	LastPublishedAt time.Time `json:"lastPublishedAt" gorm:"not null"`
	LastItemType    string    `json:"lastItemType" gorm:"type:varchar(20);not null"`
	LastItemID      uint      `json:"lastItemId" gorm:"not null"`
	ExpiresAt       time.Time `json:"expiresAt" gorm:"not null;index:idx_feed_cursor_user_exp,priority:2"`
}

type FeedPostReaction struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	PostID       uint      `json:"postId" gorm:"not null;uniqueIndex:idx_feed_post_reaction_unique"`
	Post         *FeedPost `json:"post,omitempty" gorm:"foreignKey:PostID"`
	UserID       uint      `json:"userId" gorm:"not null;uniqueIndex:idx_feed_post_reaction_unique"`
	User         *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	ReactionType string    `json:"reactionType" gorm:"type:varchar(20);not null;uniqueIndex:idx_feed_post_reaction_unique"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type FeedPostComment struct {
	ID        uint             `json:"id" gorm:"primaryKey"`
	PostID    uint             `json:"postId" gorm:"not null;index:idx_feed_post_comments_post_time,priority:1"`
	Post      *FeedPost        `json:"post,omitempty" gorm:"foreignKey:PostID"`
	UserID    uint             `json:"userId" gorm:"not null"`
	User      *User            `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Body      string           `json:"body" gorm:"type:text;not null"`
	ParentID  *uint            `json:"parentId,omitempty"`
	Parent    *FeedPostComment `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	CreatedAt time.Time        `json:"createdAt" gorm:"index:idx_feed_post_comments_post_time,priority:2"`
	UpdatedAt time.Time        `json:"updatedAt"`
	IsDeleted bool             `json:"isDeleted" gorm:"default:false"`
}

func (OrgType) TableName() string             { return "org_types" }
func (OrgProfile) TableName() string          { return "org_profiles" }
func (UserOrgMatch) TableName() string        { return "user_org_matches" }
func (UserProSubscription) TableName() string { return "user_pro_subscriptions" }
func (FeedPost) TableName() string            { return "posts" }
func (FeedMediaAsset) TableName() string      { return "media_assets" }
func (FeedItem) TableName() string            { return "feed_items" }
func (FeedCursorState) TableName() string     { return "feed_cursor_state" }
func (FeedPostReaction) TableName() string    { return "post_reactions" }
func (FeedPostComment) TableName() string     { return "post_comments" }
