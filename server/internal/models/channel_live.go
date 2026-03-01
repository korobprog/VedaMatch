package models

import (
	"time"

	"gorm.io/gorm"
)

type ChannelLiveStatus string

type ChannelLiveAccessPolicy string
type ChannelLiveModerationAction string

const (
	ChannelLiveStatusScheduled ChannelLiveStatus = "scheduled"
	ChannelLiveStatusLive      ChannelLiveStatus = "live"
	ChannelLiveStatusEnded     ChannelLiveStatus = "ended"
	ChannelLiveStatusCancelled ChannelLiveStatus = "cancelled"
)

const (
	ChannelLiveAccessFollowers ChannelLiveAccessPolicy = "followers"
)

const (
	ChannelLiveModerationActionMute    ChannelLiveModerationAction = "mute"
	ChannelLiveModerationActionUnmute  ChannelLiveModerationAction = "unmute"
	ChannelLiveModerationActionBlock   ChannelLiveModerationAction = "block"
	ChannelLiveModerationActionUnblock ChannelLiveModerationAction = "unblock"
	ChannelLiveModerationActionKick    ChannelLiveModerationAction = "kick"
)

type ChannelLiveSession struct {
	gorm.Model
	ChannelID uint     `json:"channelId" gorm:"not null;index:idx_channel_live_channel_status"`
	Channel   *Channel `json:"channel,omitempty" gorm:"foreignKey:ChannelID"`
	RoomID    uint     `json:"roomId" gorm:"not null;index"`
	Room      *Room    `json:"room,omitempty" gorm:"foreignKey:RoomID"`
	CreatedBy uint     `json:"createdBy" gorm:"not null;index"`

	Title       string `json:"title" gorm:"type:varchar(200);not null"`
	Description string `json:"description" gorm:"type:text"`
	// BroadcastLanguage stores IETF BCP-47 language tag for the live session.
	BroadcastLanguage string `json:"broadcastLanguage" gorm:"type:varchar(16);not null;default:'ru'"`

	ScheduledAt *time.Time `json:"scheduledAt" gorm:"index"`
	StartedAt   *time.Time `json:"startedAt" gorm:"index"`
	EndedAt     *time.Time `json:"endedAt" gorm:"index"`

	Status       ChannelLiveStatus       `json:"status" gorm:"type:varchar(20);not null;default:'scheduled';index:idx_channel_live_channel_status"`
	AccessPolicy ChannelLiveAccessPolicy `json:"accessPolicy" gorm:"type:varchar(20);not null;default:'followers'"`

	MaxParticipants *int `json:"maxParticipants"`

	JoinCount         int64 `json:"joinCount" gorm:"default:0"`
	UniqueViewerCount int64 `json:"uniqueViewerCount" gorm:"default:0"`
	WatchSecondsTotal int64 `json:"watchSecondsTotal" gorm:"default:0"`
}

type ChannelLiveViewer struct {
	gorm.Model
	SessionID uint                `json:"sessionId" gorm:"not null;index:idx_channel_live_viewer_session_user,unique"`
	Session   *ChannelLiveSession `json:"session,omitempty" gorm:"foreignKey:SessionID"`
	UserID    uint                `json:"userId" gorm:"not null;index:idx_channel_live_viewer_session_user,unique"`
	User      *User               `json:"user,omitempty" gorm:"foreignKey:UserID"`

	IsActive bool       `json:"isActive" gorm:"default:false;index"`
	JoinedAt *time.Time `json:"joinedAt"`

	JoinCount            int64 `json:"joinCount" gorm:"default:0"`
	AccumulatedWatchSecs int64 `json:"accumulatedWatchSecs" gorm:"default:0"`
}

type ChannelLiveModeration struct {
	gorm.Model
	SessionID uint                `json:"sessionId" gorm:"not null;index:idx_channel_live_moderation_session_user,unique"`
	Session   *ChannelLiveSession `json:"session,omitempty" gorm:"foreignKey:SessionID"`
	UserID    uint                `json:"userId" gorm:"not null;index:idx_channel_live_moderation_session_user,unique"`
	User      *User               `json:"user,omitempty" gorm:"foreignKey:UserID"`

	IsMuted   bool   `json:"isMuted" gorm:"default:false;index"`
	IsBlocked bool   `json:"isBlocked" gorm:"default:false;index"`
	Reason    string `json:"reason" gorm:"type:text"`

	UpdatedBy uint `json:"updatedBy" gorm:"default:0;index"`
}

type ChannelLiveSessionSummary struct {
	ID                uint              `json:"id"`
	ChannelID         uint              `json:"channelId"`
	RoomID            uint              `json:"roomId"`
	Title             string            `json:"title"`
	Description       string            `json:"description"`
	BroadcastLanguage string            `json:"broadcastLanguage"`
	Status            ChannelLiveStatus `json:"status"`
	AccessPolicy      string            `json:"accessPolicy"`
	ScheduledAt       *time.Time        `json:"scheduledAt,omitempty"`
	StartedAt         *time.Time        `json:"startedAt,omitempty"`
	EndedAt           *time.Time        `json:"endedAt,omitempty"`
	MaxParticipants   *int              `json:"maxParticipants,omitempty"`
}

type ChannelLiveSessionUpsertRequest struct {
	Title             string                  `json:"title"`
	Description       string                  `json:"description"`
	BroadcastLanguage string                  `json:"broadcastLanguage,omitempty"`
	ScheduledAt       *time.Time              `json:"scheduledAt,omitempty"`
	AccessPolicy      ChannelLiveAccessPolicy `json:"accessPolicy,omitempty"`
	MaxParticipants   *int                    `json:"maxParticipants,omitempty"`
}

type ChannelLiveJoinRequest struct {
	ParticipantName string                 `json:"participantName"`
	Metadata        map[string]interface{} `json:"metadata"`
}

type ChannelLiveJoinResponse struct {
	LiveID       uint                      `json:"liveId"`
	RoomID       uint                      `json:"roomId"`
	RoomName     string                    `json:"roomName"`
	Participant  string                    `json:"participant"`
	Token        string                    `json:"token"`
	WsURL        string                    `json:"wsUrl"`
	SessionState ChannelLiveSessionSummary `json:"sessionState"`
}

type ChannelLiveParticipant struct {
	UserID               uint       `json:"userId"`
	SpiritualName        string     `json:"spiritualName"`
	KarmicName           string     `json:"karmicName"`
	AvatarURL            string     `json:"avatarUrl"`
	IsActive             bool       `json:"isActive"`
	IsMuted              bool       `json:"isMuted"`
	IsBlocked            bool       `json:"isBlocked"`
	JoinCount            int64      `json:"joinCount"`
	AccumulatedWatchSecs int64      `json:"accumulatedWatchSecs"`
	JoinedAt             *time.Time `json:"joinedAt,omitempty"`
}

type ChannelLiveParticipantsResponse struct {
	LiveID       uint                      `json:"liveId"`
	SessionState ChannelLiveSessionSummary `json:"sessionState"`
	Participants []ChannelLiveParticipant  `json:"participants"`
}

type ChannelLiveModerationRequest struct {
	TargetUserID uint                        `json:"targetUserId"`
	Action       ChannelLiveModerationAction `json:"action"`
	Reason       string                      `json:"reason"`
}
