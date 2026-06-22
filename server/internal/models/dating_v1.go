package models

import (
	"time"

	"gorm.io/gorm"
)

type DatingPublicationStatus string

const (
	DatingPublicationDraft                 DatingPublicationStatus = "draft"
	DatingPublicationPendingFriendApproval DatingPublicationStatus = "pending_friend_approval"
	DatingPublicationPendingAdminReview    DatingPublicationStatus = "pending_admin_review"
	DatingPublicationPendingAIReview       DatingPublicationStatus = "pending_ai_review"
	DatingPublicationPublished             DatingPublicationStatus = "published"
	DatingPublicationRejected              DatingPublicationStatus = "rejected"
	DatingPublicationFlaggedAfterPublish   DatingPublicationStatus = "flagged_after_publish"
)

type DatingApprovalStatus string

const (
	DatingApprovalPending  DatingApprovalStatus = "pending"
	DatingApprovalApproved DatingApprovalStatus = "approved"
	DatingApprovalRejected DatingApprovalStatus = "rejected"
)

type DatingModerationActorType string

const (
	DatingModerationActorAI    DatingModerationActorType = "ai"
	DatingModerationActorAdmin DatingModerationActorType = "admin"
)

type DatingModerationOutcome string

const (
	DatingModerationPass             DatingModerationOutcome = "pass"
	DatingModerationNeedsAdminReview DatingModerationOutcome = "needs_admin_review"
	DatingModerationReject           DatingModerationOutcome = "reject"
	DatingModerationFlag             DatingModerationOutcome = "flag"
	DatingModerationPublish          DatingModerationOutcome = "publish"
)

type DatingPostStatus string

const (
	DatingPostActive        DatingPostStatus = "active"
	DatingPostPendingReview DatingPostStatus = "pending_review"
	DatingPostRejected      DatingPostStatus = "rejected"
)

type DatingMeetingInviteStatus string

const (
	DatingMeetingInvitePending  DatingMeetingInviteStatus = "pending"
	DatingMeetingInviteAccepted DatingMeetingInviteStatus = "accepted"
	DatingMeetingInviteRejected DatingMeetingInviteStatus = "rejected"
)

type DatingChatRequestStatus string

const (
	DatingChatRequestPending  DatingChatRequestStatus = "pending"
	DatingChatRequestAccepted DatingChatRequestStatus = "accepted"
	DatingChatRequestRejected DatingChatRequestStatus = "rejected"
	DatingChatRequestCanceled DatingChatRequestStatus = "canceled"
)

type DatingModerationJobTrigger string

const (
	DatingModerationTriggerApprovalsCompleted DatingModerationJobTrigger = "approvals_completed"
	DatingModerationTriggerPostCreated        DatingModerationJobTrigger = "post_created"
	DatingModerationTriggerPostUpdated        DatingModerationJobTrigger = "post_updated"
)

type DatingModerationJobStatus string

const (
	DatingModerationJobPending    DatingModerationJobStatus = "pending"
	DatingModerationJobProcessing DatingModerationJobStatus = "processing"
	DatingModerationJobRetrying   DatingModerationJobStatus = "retrying"
	DatingModerationJobCompleted  DatingModerationJobStatus = "completed"
	DatingModerationJobFailed     DatingModerationJobStatus = "failed"
)

type DatingSocialLink struct {
	gorm.Model
	UserID   uint   `json:"userId" gorm:"index"`
	Platform string `json:"platform" gorm:"size:50;index"`
	URL      string `json:"url" gorm:"size:500"`
	Visible  bool   `json:"visible" gorm:"default:true"`
}

type DatingPost struct {
	gorm.Model
	UserID           uint             `json:"userId" gorm:"index"`
	Body             string           `json:"body" gorm:"type:text"`
	MediaURL         string           `json:"mediaUrl,omitempty" gorm:"size:500"`
	Status           DatingPostStatus `json:"status" gorm:"type:varchar(32);default:'active';index"`
	ModeratedAt      *time.Time       `json:"moderatedAt,omitempty"`
	ModerationReason string           `json:"moderationReason,omitempty" gorm:"type:text"`
}

type DatingProfileApproval struct {
	gorm.Model
	UserID      uint                 `json:"userId" gorm:"index;uniqueIndex:idx_dating_profile_approval"`
	ApproverID  uint                 `json:"approverId" gorm:"index;uniqueIndex:idx_dating_profile_approval"`
	Status      DatingApprovalStatus `json:"status" gorm:"type:varchar(24);default:'pending';index"`
	Note        string               `json:"note,omitempty" gorm:"type:text"`
	RespondedAt *time.Time           `json:"respondedAt,omitempty"`
	User        User                 `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Approver    User                 `json:"approver,omitempty" gorm:"foreignKey:ApproverID"`
}

type DatingModerationEvent struct {
	gorm.Model
	UserID      uint                      `json:"userId" gorm:"index"`
	PostID      *uint                     `json:"postId,omitempty" gorm:"index"`
	ActorType   DatingModerationActorType `json:"actorType" gorm:"type:varchar(24);index"`
	Outcome     DatingModerationOutcome   `json:"outcome" gorm:"type:varchar(32);index"`
	Severity    string                    `json:"severity,omitempty" gorm:"size:32"`
	Reason      string                    `json:"reason,omitempty" gorm:"type:text"`
	DetailsJSON string                    `json:"detailsJson,omitempty" gorm:"type:text"`
}

type DatingMeetingInvite struct {
	gorm.Model
	InviterID   uint                      `json:"inviterId" gorm:"index"`
	InviteeID   uint                      `json:"inviteeId" gorm:"index"`
	PlaceType   string                    `json:"placeType" gorm:"size:64;index"`
	Message     string                    `json:"message" gorm:"type:text"`
	Status      DatingMeetingInviteStatus `json:"status" gorm:"type:varchar(24);default:'pending';index"`
	RespondedAt *time.Time                `json:"respondedAt,omitempty"`
}

type DatingChatRequest struct {
	gorm.Model
	RequesterID uint                    `json:"requesterId" gorm:"index"`
	RecipientID uint                    `json:"recipientId" gorm:"index"`
	Message     string                  `json:"message" gorm:"type:text"`
	Status      DatingChatRequestStatus `json:"status" gorm:"type:varchar(24);default:'pending';index"`
	RespondedAt *time.Time              `json:"respondedAt,omitempty"`
	Requester   User                    `json:"requester,omitempty" gorm:"foreignKey:RequesterID"`
	Recipient   User                    `json:"recipient,omitempty" gorm:"foreignKey:RecipientID"`
}

type DatingModerationJob struct {
	gorm.Model
	UserID      uint                       `json:"userId" gorm:"index"`
	PostID      *uint                      `json:"postId,omitempty" gorm:"index"`
	Trigger     DatingModerationJobTrigger `json:"trigger" gorm:"type:varchar(32);index"`
	Status      DatingModerationJobStatus  `json:"status" gorm:"type:varchar(24);default:'pending';index"`
	Attempt     int                        `json:"attempt" gorm:"default:0"`
	MaxAttempts int                        `json:"maxAttempts" gorm:"default:3"`
	NextRunAt   *time.Time                 `json:"nextRunAt,omitempty" gorm:"index"`
	LastError   string                     `json:"lastError,omitempty" gorm:"type:text"`
}
