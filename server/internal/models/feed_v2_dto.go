package models

import "time"

type FeedV2ItemAuthor struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName,omitempty"`
	KarmicName    string `json:"karmicName,omitempty"`
	AvatarURL     string `json:"avatarUrl,omitempty"`
}

type FeedV2OrgTypeInfo struct {
	ID   uint   `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

type FeedV2ItemPreview struct {
	Text      string `json:"text,omitempty"`
	Image     string `json:"image,omitempty"`
	Video     string `json:"video,omitempty"`
	Audio     string `json:"audio,omitempty"`
	Thumbnail string `json:"thumbnail,omitempty"`
}

type FeedV2ItemCounts struct {
	Likes    int64 `json:"likes"`
	Comments int64 `json:"comments"`
	Shares   int64 `json:"shares"`
}

type FeedV2Item struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	ItemID    uint              `json:"itemId"`
	OrgType   FeedV2OrgTypeInfo `json:"orgType"`
	Author    FeedV2ItemAuthor  `json:"author"`
	CreatedAt time.Time         `json:"createdAt"`
	Preview   FeedV2ItemPreview `json:"preview"`
	Counts    FeedV2ItemCounts  `json:"counts"`
	Score     float64           `json:"score"`
	Reason    string            `json:"reason"`
}

type FeedV2Meta struct {
	Mode             string   `json:"mode"`
	Pro              bool     `json:"pro"`
	OrgFilterApplied []string `json:"orgFilterApplied,omitempty"`
}

type FeedV2Response struct {
	Items      []FeedV2Item `json:"items"`
	NextCursor string       `json:"nextCursor,omitempty"`
	HasMore    bool         `json:"hasMore"`
	Meta       FeedV2Meta   `json:"meta"`
}

type FeedV2ReactionRequest struct {
	ReactionType string `json:"reactionType"`
	Action       string `json:"action"`
}

type FeedV2CommentCreateRequest struct {
	Body     string `json:"body"`
	ParentID *uint  `json:"parentId"`
}
