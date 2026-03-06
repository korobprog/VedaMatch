package models

import (
	"time"

	"gorm.io/gorm"
)

type ConnectCommunityType string

const (
	ConnectCommunityTypeOrganization ConnectCommunityType = "organization"
	ConnectCommunityTypeYatra        ConnectCommunityType = "yatra"
	ConnectCommunityTypeTeam         ConnectCommunityType = "team"
	ConnectCommunityTypeCircle       ConnectCommunityType = "circle"
)

type ConnectVerificationStatus string

const (
	ConnectVerificationPending    ConnectVerificationStatus = "pending"
	ConnectVerificationVerified   ConnectVerificationStatus = "verified"
	ConnectVerificationUnverified ConnectVerificationStatus = "unverified"
)

type ConnectOpportunityStatus string

const (
	ConnectOpportunityStatusModeration ConnectOpportunityStatus = "moderation"
	ConnectOpportunityStatusActive     ConnectOpportunityStatus = "active"
	ConnectOpportunityStatusFilled     ConnectOpportunityStatus = "filled"
	ConnectOpportunityStatusCompleted  ConnectOpportunityStatus = "completed"
	ConnectOpportunityStatusPaused     ConnectOpportunityStatus = "paused"
)

type ConnectEntryLevel string

const (
	ConnectEntryLevelIntro     ConnectEntryLevel = "intro"
	ConnectEntryLevelOneTime   ConnectEntryLevel = "one_time"
	ConnectEntryLevelRegular   ConnectEntryLevel = "regular"
	ConnectEntryLevelTeamBased ConnectEntryLevel = "team_based"
)

type ConnectParticipationFormat string

const (
	ConnectParticipationOffline ConnectParticipationFormat = "offline"
	ConnectParticipationOnline  ConnectParticipationFormat = "online"
	ConnectParticipationHybrid  ConnectParticipationFormat = "hybrid"
)

type ConnectParticipationMode string

const (
	ConnectParticipationModeQuiet     ConnectParticipationMode = "quiet"
	ConnectParticipationModeSocial    ConnectParticipationMode = "social"
	ConnectParticipationModePhysical  ConnectParticipationMode = "physical"
	ConnectParticipationModeIntellect ConnectParticipationMode = "intellectual"
	ConnectParticipationModeOrganize  ConnectParticipationMode = "organizational"
)

type ConnectSourceType string

const (
	ConnectSourceNative  ConnectSourceType = "native"
	ConnectSourceYatra   ConnectSourceType = "yatra"
	ConnectSourceSeva    ConnectSourceType = "seva"
	ConnectSourceService ConnectSourceType = "service"
)

type ConnectApplicationStatus string

const (
	ConnectApplicationPending   ConnectApplicationStatus = "pending"
	ConnectApplicationApproved  ConnectApplicationStatus = "approved"
	ConnectApplicationAttended  ConnectApplicationStatus = "attended"
	ConnectApplicationCompleted ConnectApplicationStatus = "completed"
	ConnectApplicationRejected  ConnectApplicationStatus = "rejected"
)

type ConnectOnboardingMode string

const (
	ConnectOnboardingMeetPeople   ConnectOnboardingMode = "meet_people"
	ConnectOnboardingTrySimple    ConnectOnboardingMode = "try_simple_service"
	ConnectOnboardingFriendlyTeam ConnectOnboardingMode = "friendly_group"
	ConnectOnboardingNeedHelp     ConnectOnboardingMode = "need_simple_explanation"
)

type ConnectCommunity struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name               string                    `json:"name" gorm:"type:varchar(200);not null"`
	Slug               string                    `json:"slug" gorm:"type:varchar(120);uniqueIndex"`
	Description        string                    `json:"description" gorm:"type:text"`
	City               string                    `json:"city" gorm:"type:varchar(120);index"`
	District           string                    `json:"district" gorm:"type:varchar(120);index"`
	Address            string                    `json:"address" gorm:"type:varchar(500)"`
	CommunityType      ConnectCommunityType      `json:"communityType" gorm:"type:varchar(40);index;not null"`
	VerificationStatus ConnectVerificationStatus `json:"verificationStatus" gorm:"type:varchar(32);default:'unverified';index"`
	NewcomerFriendly   bool                      `json:"newcomerFriendly" gorm:"default:false;index"`
	MentorAvailable    bool                      `json:"mentorAvailable" gorm:"default:false"`
	CoordinatorUserID  *uint                     `json:"coordinatorUserId" gorm:"index"`
	CoordinatorUser    *User                     `json:"coordinatorUser,omitempty" gorm:"foreignKey:CoordinatorUserID"`
	CoverImageURL      string                    `json:"coverImageUrl" gorm:"type:varchar(500)"`
	Tags               []string                  `json:"tags" gorm:"type:jsonb;serializer:json"`
	SourceType         ConnectSourceType         `json:"sourceType" gorm:"type:varchar(32);index;default:'native'"`
	SourceEntityID     *uint                     `json:"sourceEntityId" gorm:"index"`
	Opportunities      []ConnectOpportunity      `json:"opportunities,omitempty" gorm:"foreignKey:CommunityID"`
}

type ConnectOpportunity struct {
	ID                  uint                       `gorm:"primarykey" json:"id"`
	CreatedAt           time.Time                  `json:"createdAt"`
	UpdatedAt           time.Time                  `json:"updatedAt"`
	DeletedAt           gorm.DeletedAt             `gorm:"index" json:"-"`
	CommunityID         *uint                      `json:"communityId" gorm:"index"`
	Community           *ConnectCommunity          `json:"community,omitempty" gorm:"foreignKey:CommunityID"`
	CreatedByUserID     uint                       `json:"createdByUserId" gorm:"index;not null"`
	CreatedByUser       *User                      `json:"createdByUser,omitempty" gorm:"foreignKey:CreatedByUserID"`
	Title               string                     `json:"title" gorm:"type:varchar(200);not null"`
	Description         string                     `json:"description" gorm:"type:text"`
	City                string                     `json:"city" gorm:"type:varchar(120);index"`
	District            string                     `json:"district" gorm:"type:varchar(120);index"`
	LocationLabel       string                     `json:"locationLabel" gorm:"type:varchar(255)"`
	Category            string                     `json:"category" gorm:"type:varchar(80);index"`
	Interests           []string                   `json:"interests" gorm:"type:jsonb;serializer:json"`
	EntryLevel          ConnectEntryLevel          `json:"entryLevel" gorm:"type:varchar(32);index;not null"`
	ParticipationFormat ConnectParticipationFormat `json:"participationFormat" gorm:"type:varchar(32);index;not null"`
	ParticipationModes  []string                   `json:"participationModes" gorm:"type:jsonb;serializer:json"`
	RequiresApproval    bool                       `json:"requiresApproval" gorm:"default:false"`
	NewcomerFriendly    bool                       `json:"newcomerFriendly" gorm:"default:false;index"`
	MentorAvailable     bool                       `json:"mentorAvailable" gorm:"default:false"`
	NeedsTransport      bool                       `json:"needsTransport" gorm:"default:false"`
	IsRecurring         bool                       `json:"isRecurring" gorm:"default:false"`
	StartsAt            *time.Time                 `json:"startsAt" gorm:"index"`
	EndsAt              *time.Time                 `json:"endsAt"`
	Status              ConnectOpportunityStatus   `json:"status" gorm:"type:varchar(32);default:'moderation';index"`
	ModeratedAt         *time.Time                 `json:"moderatedAt"`
	ModeratedByUserID   *uint                      `json:"moderatedByUserId" gorm:"index"`
	ModeratedByUser     *User                      `json:"moderatedByUser,omitempty" gorm:"foreignKey:ModeratedByUserID"`
	ModerationNote      string                     `json:"moderationNote" gorm:"type:text"`
	SourceType          ConnectSourceType          `json:"sourceType" gorm:"type:varchar(32);index;default:'native'"`
	SourceEntityID      *uint                      `json:"sourceEntityId" gorm:"index"`
	Applications        []ConnectApplication       `json:"applications,omitempty" gorm:"foreignKey:OpportunityID"`
}

type ConnectMatchProfile struct {
	ID                    uint                  `gorm:"primarykey" json:"id"`
	CreatedAt             time.Time             `json:"createdAt"`
	UpdatedAt             time.Time             `json:"updatedAt"`
	DeletedAt             gorm.DeletedAt        `gorm:"index" json:"-"`
	UserID                uint                  `json:"userId" gorm:"uniqueIndex;not null"`
	User                  *User                 `json:"user,omitempty" gorm:"foreignKey:UserID"`
	City                  string                `json:"city" gorm:"type:varchar(120);index"`
	District              string                `json:"district" gorm:"type:varchar(120);index"`
	RadiusKm              int                   `json:"radiusKm" gorm:"default:15"`
	Interests             []string              `json:"interests" gorm:"type:jsonb;serializer:json"`
	PreferredEntryLevels  []string              `json:"preferredEntryLevels" gorm:"type:jsonb;serializer:json"`
	ParticipationFormats  []string              `json:"participationFormats" gorm:"type:jsonb;serializer:json"`
	ParticipationModes    []string              `json:"participationModes" gorm:"type:jsonb;serializer:json"`
	AvailableTimeLabels   []string              `json:"availableTimeLabels" gorm:"type:jsonb;serializer:json"`
	HasTransport          bool                  `json:"hasTransport" gorm:"default:false"`
	QuietServicePreferred bool                  `json:"quietServicePreferred" gorm:"default:false"`
	NeedsMentor           bool                  `json:"needsMentor" gorm:"default:false"`
	WantsCompany          bool                  `json:"wantsCompany" gorm:"default:false"`
	OnboardingMode        ConnectOnboardingMode `json:"onboardingMode" gorm:"type:varchar(48);default:'meet_people'"`
}

type ConnectApplication struct {
	ID               uint                     `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time                `json:"createdAt"`
	UpdatedAt        time.Time                `json:"updatedAt"`
	DeletedAt        gorm.DeletedAt           `gorm:"index" json:"-"`
	OpportunityID    uint                     `json:"opportunityId" gorm:"index;not null"`
	Opportunity      *ConnectOpportunity      `json:"opportunity,omitempty" gorm:"foreignKey:OpportunityID"`
	UserID           uint                     `json:"userId" gorm:"index;not null"`
	User             *User                    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Status           ConnectApplicationStatus `json:"status" gorm:"type:varchar(24);default:'pending';index"`
	Message          string                   `json:"message" gorm:"type:text"`
	ReviewedAt       *time.Time               `json:"reviewedAt,omitempty"`
	ReviewedByUserID *uint                    `json:"reviewedByUserId,omitempty" gorm:"index"`
	ReviewedByUser   *User                    `json:"reviewedByUser,omitempty" gorm:"foreignKey:ReviewedByUserID"`
	ReviewNote       string                   `json:"reviewNote" gorm:"type:text"`
}

type ConnectFeedback struct {
	ID               uint                `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time           `json:"createdAt"`
	UpdatedAt        time.Time           `json:"updatedAt"`
	DeletedAt        gorm.DeletedAt      `gorm:"index" json:"-"`
	OpportunityID    uint                `json:"opportunityId" gorm:"index;not null"`
	Opportunity      *ConnectOpportunity `json:"opportunity,omitempty" gorm:"foreignKey:OpportunityID"`
	UserID           uint                `json:"userId" gorm:"index;not null"`
	User             *User               `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Rating           int                 `json:"rating" gorm:"not null"`
	Comment          string              `json:"comment" gorm:"type:text"`
	Tags             []string            `json:"tags" gorm:"type:jsonb;serializer:json"`
	FeltSafe         bool                `json:"feltSafe" gorm:"default:false"`
	NewcomerFriendly bool                `json:"newcomerFriendly" gorm:"default:false"`
	WouldReturn      bool                `json:"wouldReturn" gorm:"default:false"`
}

type ConnectSourceLink struct {
	Type   ConnectSourceType `json:"type"`
	ID     uint              `json:"id"`
	Screen string            `json:"screen"`
	Label  string            `json:"label"`
}

type ConnectCommunityCard struct {
	ID                 uint                      `json:"id"`
	Name               string                    `json:"name"`
	Description        string                    `json:"description"`
	City               string                    `json:"city"`
	District           string                    `json:"district"`
	CommunityType      ConnectCommunityType      `json:"communityType"`
	VerificationStatus ConnectVerificationStatus `json:"verificationStatus"`
	NewcomerFriendly   bool                      `json:"newcomerFriendly"`
	MentorAvailable    bool                      `json:"mentorAvailable"`
	CoverImageURL      string                    `json:"coverImageUrl"`
	Tags               []string                  `json:"tags"`
	SourceLink         *ConnectSourceLink        `json:"sourceLink,omitempty"`
}

type ConnectOpportunityCard struct {
	ID                  uint                       `json:"id"`
	Title               string                     `json:"title"`
	Description         string                     `json:"description"`
	City                string                     `json:"city"`
	District            string                     `json:"district"`
	LocationLabel       string                     `json:"locationLabel"`
	Category            string                     `json:"category"`
	EntryLevel          ConnectEntryLevel          `json:"entryLevel"`
	ParticipationFormat ConnectParticipationFormat `json:"participationFormat"`
	ParticipationModes  []string                   `json:"participationModes"`
	NewcomerFriendly    bool                       `json:"newcomerFriendly"`
	MentorAvailable     bool                       `json:"mentorAvailable"`
	RequiresApproval    bool                       `json:"requiresApproval"`
	NeedsTransport      bool                       `json:"needsTransport"`
	IsRecurring         bool                       `json:"isRecurring"`
	Status              ConnectOpportunityStatus   `json:"status"`
	StartsAt            *time.Time                 `json:"startsAt,omitempty"`
	EndsAt              *time.Time                 `json:"endsAt,omitempty"`
	Score               int                        `json:"score"`
	Why                 []string                   `json:"why"`
	TrustSummary        *ConnectTrustSummary       `json:"trustSummary,omitempty"`
	Community           *ConnectCommunityCard      `json:"community,omitempty"`
	SourceLink          *ConnectSourceLink         `json:"sourceLink,omitempty"`
}

type ConnectTrustSummary struct {
	ReviewsCount            int     `json:"reviewsCount"`
	AverageRating           float64 `json:"averageRating"`
	FeltSafePercent         int     `json:"feltSafePercent"`
	NewcomerFriendlyPercent int     `json:"newcomerFriendlyPercent"`
	WouldReturnPercent      int     `json:"wouldReturnPercent"`
}

type ConnectFeedbackItem struct {
	ID               uint      `json:"id"`
	CreatedAt        time.Time `json:"createdAt"`
	Rating           int       `json:"rating"`
	Comment          string    `json:"comment"`
	Tags             []string  `json:"tags"`
	FeltSafe         bool      `json:"feltSafe"`
	NewcomerFriendly bool      `json:"newcomerFriendly"`
	WouldReturn      bool      `json:"wouldReturn"`
	AuthorLabel      string    `json:"authorLabel"`
}

type ConnectFeedResponse struct {
	Opportunities []ConnectOpportunityCard `json:"opportunities"`
	Communities   []ConnectCommunityCard   `json:"communities"`
	Profile       *ConnectMatchProfile     `json:"profile,omitempty"`
}

type ConnectViewerApplication struct {
	ID         uint                     `json:"id"`
	Status     ConnectApplicationStatus `json:"status"`
	Message    string                   `json:"message"`
	ReviewNote string                   `json:"reviewNote"`
	UpdatedAt  time.Time                `json:"updatedAt"`
}

type ConnectOpportunityDetailResponse struct {
	Opportunity           ConnectOpportunityCard    `json:"opportunity"`
	TrustSummary          *ConnectTrustSummary      `json:"trustSummary,omitempty"`
	Feedback              []ConnectFeedbackItem     `json:"feedback,omitempty"`
	CanSubmitFeedback     bool                      `json:"canSubmitFeedback"`
	CanManageApplications bool                      `json:"canManageApplications"`
	ViewerApplication     *ConnectViewerApplication `json:"viewerApplication,omitempty"`
}

type ConnectCommunityDetailResponse struct {
	Community     ConnectCommunityCard     `json:"community"`
	Opportunities []ConnectOpportunityCard `json:"opportunities"`
}

type ConnectFeedRequest struct {
	City                string `json:"city"`
	District            string `json:"district"`
	Category            string `json:"category"`
	EntryLevel          string `json:"entryLevel"`
	ParticipationFormat string `json:"participationFormat"`
	Mode                string `json:"mode"`
	NewcomerOnly        bool   `json:"newcomerOnly"`
	NearbyOnly          bool   `json:"nearbyOnly"`
	Limit               int    `json:"limit"`
}

type ConnectMatchProfileUpsertRequest struct {
	City                  string                `json:"city"`
	District              string                `json:"district"`
	RadiusKm              int                   `json:"radiusKm"`
	Interests             []string              `json:"interests"`
	PreferredEntryLevels  []string              `json:"preferredEntryLevels"`
	ParticipationFormats  []string              `json:"participationFormats"`
	ParticipationModes    []string              `json:"participationModes"`
	AvailableTimeLabels   []string              `json:"availableTimeLabels"`
	HasTransport          bool                  `json:"hasTransport"`
	QuietServicePreferred bool                  `json:"quietServicePreferred"`
	NeedsMentor           bool                  `json:"needsMentor"`
	WantsCompany          bool                  `json:"wantsCompany"`
	OnboardingMode        ConnectOnboardingMode `json:"onboardingMode"`
}

type ConnectOpportunityCreateRequest struct {
	CommunityID         *uint                      `json:"communityId"`
	Title               string                     `json:"title"`
	Description         string                     `json:"description"`
	City                string                     `json:"city"`
	District            string                     `json:"district"`
	LocationLabel       string                     `json:"locationLabel"`
	Category            string                     `json:"category"`
	Interests           []string                   `json:"interests"`
	EntryLevel          ConnectEntryLevel          `json:"entryLevel"`
	ParticipationFormat ConnectParticipationFormat `json:"participationFormat"`
	ParticipationModes  []string                   `json:"participationModes"`
	RequiresApproval    bool                       `json:"requiresApproval"`
	NewcomerFriendly    bool                       `json:"newcomerFriendly"`
	MentorAvailable     bool                       `json:"mentorAvailable"`
	NeedsTransport      bool                       `json:"needsTransport"`
	IsRecurring         bool                       `json:"isRecurring"`
	StartsAt            *time.Time                 `json:"startsAt"`
	EndsAt              *time.Time                 `json:"endsAt"`
}

type ConnectApplyRequest struct {
	Message string `json:"message"`
}

type ConnectModerationRequest struct {
	Reason string `json:"reason"`
}

type ConnectApplicationStatusUpdateRequest struct {
	Status ConnectApplicationStatus `json:"status"`
	Note   string                   `json:"note"`
}

type ConnectFeedbackCreateRequest struct {
	Rating           int      `json:"rating"`
	Comment          string   `json:"comment"`
	Tags             []string `json:"tags"`
	FeltSafe         bool     `json:"feltSafe"`
	NewcomerFriendly bool     `json:"newcomerFriendly"`
	WouldReturn      bool     `json:"wouldReturn"`
}
