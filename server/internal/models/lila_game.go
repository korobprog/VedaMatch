package models

import (
	"time"

	"gorm.io/gorm"
)

type LilaGameMode string

const (
	LilaGameModeDharmaDuel      LilaGameMode = "dharma_duel"
	LilaGameModeSabha           LilaGameMode = "sabha"
	LilaGameModeSurvivalSamsara LilaGameMode = "survival_in_samsara"
)

type LilaQuestionType string

const (
	LilaQuestionTypeSingleChoice LilaQuestionType = "single_choice"
	LilaQuestionTypeImageChoice  LilaQuestionType = "image_choice"
	LilaQuestionTypeOrdering     LilaQuestionType = "ordering"
)

type LilaQuestionStatus string

const (
	LilaQuestionStatusDraft    LilaQuestionStatus = "draft"
	LilaQuestionStatusReview   LilaQuestionStatus = "review"
	LilaQuestionStatusActive   LilaQuestionStatus = "active"
	LilaQuestionStatusArchived LilaQuestionStatus = "archived"
)

type LilaDifficulty string

const (
	LilaDifficultyTamas  LilaDifficulty = "tamas"
	LilaDifficultyRajas  LilaDifficulty = "rajas"
	LilaDifficultySattva LilaDifficulty = "sattva"
)

type LilaQueueStatus string

const (
	LilaQueueStatusWaiting   LilaQueueStatus = "waiting"
	LilaQueueStatusReady     LilaQueueStatus = "ready"
	LilaQueueStatusMatched   LilaQueueStatus = "matched"
	LilaQueueStatusLeft      LilaQueueStatus = "left"
	LilaQueueStatusExpired   LilaQueueStatus = "expired"
	LilaQueueStatusCancelled LilaQueueStatus = "cancelled"
)

type LilaMatchStatus string

const (
	LilaMatchStatusLobby     LilaMatchStatus = "lobby"
	LilaMatchStatusActive    LilaMatchStatus = "active"
	LilaMatchStatusFinished  LilaMatchStatus = "finished"
	LilaMatchStatusAbandoned LilaMatchStatus = "abandoned"
)

type LilaRoundStatus string

const (
	LilaRoundStatusPending  LilaRoundStatus = "pending"
	LilaRoundStatusRunning  LilaRoundStatus = "running"
	LilaRoundStatusResolved LilaRoundStatus = "resolved"
	LilaRoundStatusSkipped  LilaRoundStatus = "skipped"
)

type LilaSiddhiType string

const (
	LilaSiddhiTypeDrishti      LilaSiddhiType = "drishti"
	LilaSiddhiTypeMantraShield LilaSiddhiType = "mantra_shield"
	LilaSiddhiTypeVimana       LilaSiddhiType = "vimana"
	LilaSiddhiTypeMaya         LilaSiddhiType = "maya"
)

type LilaCurrencyType string

const (
	LilaCurrencyTypeBonus LilaCurrencyType = "bonus"
	LilaCurrencyTypeReal  LilaCurrencyType = "real"
)

type LilaPurchaseStatus string

const (
	LilaPurchaseStatusPending   LilaPurchaseStatus = "pending"
	LilaPurchaseStatusPaid      LilaPurchaseStatus = "paid"
	LilaPurchaseStatusFulfilled LilaPurchaseStatus = "fulfilled"
	LilaPurchaseStatusFailed    LilaPurchaseStatus = "failed"
	LilaPurchaseStatusRefunded  LilaPurchaseStatus = "refunded"
)

type LilaSubscriptionStatus string

const (
	LilaSubscriptionStatusActive    LilaSubscriptionStatus = "active"
	LilaSubscriptionStatusPaused    LilaSubscriptionStatus = "paused"
	LilaSubscriptionStatusExpired   LilaSubscriptionStatus = "expired"
	LilaSubscriptionStatusCancelled LilaSubscriptionStatus = "cancelled"
)

type LilaPassStatus string

const (
	LilaPassStatusLocked  LilaPassStatus = "locked"
	LilaPassStatusActive  LilaPassStatus = "active"
	LilaPassStatusExpired LilaPassStatus = "expired"
)

type LilaDharmaFundStatus string

const (
	LilaDharmaFundStatusPending  LilaDharmaFundStatus = "pending"
	LilaDharmaFundStatusReserved LilaDharmaFundStatus = "reserved"
	LilaDharmaFundStatusSettled  LilaDharmaFundStatus = "settled"
	LilaDharmaFundStatusVoided   LilaDharmaFundStatus = "voided"
)

type LilaRank string

const (
	LilaRankSeeker    LilaRank = "seeker"
	LilaRankStudent   LilaRank = "student"
	LilaRankPandit    LilaRank = "pandit"
	LilaRankRishi     LilaRank = "rishi"
	LilaRankMaharishi LilaRank = "maharishi"
)

type LilaQuestion struct {
	gorm.Model

	Slug             string             `json:"slug" gorm:"type:varchar(120);uniqueIndex;not null"`
	Type             LilaQuestionType   `json:"type" gorm:"type:varchar(32);not null;index"`
	Category         string             `json:"category" gorm:"type:varchar(64);not null;index"`
	Difficulty       LilaDifficulty     `json:"difficulty" gorm:"type:varchar(32);not null;index"`
	Status           LilaQuestionStatus `json:"status" gorm:"type:varchar(32);not null;default:'draft';index"`
	AllowedModesJSON string             `json:"allowedModesJson" gorm:"type:text;not null;default:'[]'"`

	PromptRu         string `json:"promptRu" gorm:"type:text;not null"`
	PromptEn         string `json:"promptEn" gorm:"type:text;not null"`
	PromptHi         string `json:"promptHi" gorm:"type:text;not null"`
	OptionsRuJSON    string `json:"optionsRuJson" gorm:"type:text;not null;default:'[]'"`
	OptionsEnJSON    string `json:"optionsEnJson" gorm:"type:text;not null;default:'[]'"`
	OptionsHiJSON    string `json:"optionsHiJson" gorm:"type:text;not null;default:'[]'"`
	ExplanationRu    string `json:"explanationRu" gorm:"type:text"`
	ExplanationEn    string `json:"explanationEn" gorm:"type:text"`
	ExplanationHi    string `json:"explanationHi" gorm:"type:text"`
	AssetURL         string `json:"assetUrl" gorm:"type:varchar(500)"`
	AssetKind        string `json:"assetKind" gorm:"type:varchar(32);default:'none'"`
	CorrectOption    string `json:"correctOption" gorm:"type:varchar(64)"`
	CorrectOrderJSON string `json:"correctOrderJson" gorm:"type:text"`
	SourceRef        string `json:"sourceRef" gorm:"type:varchar(255)"`
	MetaJSON         string `json:"metaJson" gorm:"type:text"`

	PublishedAt *time.Time `json:"publishedAt" gorm:"index"`
	ArchivedAt  *time.Time `json:"archivedAt" gorm:"index"`
}

type LilaQueueEntry struct {
	gorm.Model

	UserID       uint            `json:"userId" gorm:"not null;index:idx_lila_queue_user_mode,priority:1"`
	Mode         LilaGameMode    `json:"mode" gorm:"type:varchar(32);not null;index:idx_lila_queue_user_mode,priority:2;index"`
	Status       LilaQueueStatus `json:"status" gorm:"type:varchar(32);not null;default:'waiting';index"`
	MatchID      *uint           `json:"matchId" gorm:"index"`
	TeamKey      string          `json:"teamKey" gorm:"type:varchar(64);index"`
	Location     string          `json:"location" gorm:"type:varchar(120);index"`
	Rank         LilaRank        `json:"rank" gorm:"type:varchar(32);default:'seeker'"`
	RatingAtJoin int             `json:"ratingAtJoin" gorm:"default:0"`
	JoinedAt     time.Time       `json:"joinedAt" gorm:"index"`
	ReadyAt      *time.Time      `json:"readyAt" gorm:"index"`
	LeftAt       *time.Time      `json:"leftAt" gorm:"index"`
	MetadataJSON string          `json:"metadataJson" gorm:"type:text"`
}

type LilaMatch struct {
	gorm.Model

	Code            string          `json:"code" gorm:"type:varchar(40);uniqueIndex;not null"`
	Mode            LilaGameMode    `json:"mode" gorm:"type:varchar(32);not null;index"`
	Status          LilaMatchStatus `json:"status" gorm:"type:varchar(32);not null;default:'lobby';index"`
	LobbyStartedAt  *time.Time      `json:"lobbyStartedAt" gorm:"index"`
	StartedAt       *time.Time      `json:"startedAt" gorm:"index"`
	FinishedAt      *time.Time      `json:"finishedAt" gorm:"index"`
	WinnerUserID    *uint           `json:"winnerUserId" gorm:"index"`
	WinningTeamKey  string          `json:"winningTeamKey" gorm:"type:varchar(64);index"`
	MatchConfigJSON string          `json:"matchConfigJson" gorm:"type:text"`
	ScoreboardJSON  string          `json:"scoreboardJson" gorm:"type:text"`
	RewardsJSON     string          `json:"rewardsJson" gorm:"type:text"`
	PlayerIDsJSON   string          `json:"playerIdsJson" gorm:"type:text"`
	ReconnectCount  int             `json:"reconnectCount" gorm:"default:0"`
	RoundCount      int             `json:"roundCount" gorm:"default:0"`
	CurrentRound    int             `json:"currentRound" gorm:"default:0"`
	LastEventSeq    int             `json:"lastEventSeq" gorm:"default:0"`
	AbandonedReason string          `json:"abandonedReason" gorm:"type:varchar(255)"`
}

type LilaRound struct {
	gorm.Model

	MatchID             uint            `json:"matchId" gorm:"not null;index"`
	Number              int             `json:"number" gorm:"not null;index"`
	Status              LilaRoundStatus `json:"status" gorm:"type:varchar(32);not null;default:'pending';index"`
	QuestionID          *uint           `json:"questionId" gorm:"index"`
	PromptSnapshotJSON  string          `json:"promptSnapshotJson" gorm:"type:text"`
	OptionsSnapshotJSON string          `json:"optionsSnapshotJson" gorm:"type:text"`
	CorrectAnswerJSON   string          `json:"correctAnswerJson" gorm:"type:text"`
	StateJSON           string          `json:"stateJson" gorm:"type:text"`
	StartedAt           *time.Time      `json:"startedAt" gorm:"index"`
	EndsAt              *time.Time      `json:"endsAt" gorm:"index"`
	ResolvedAt          *time.Time      `json:"resolvedAt" gorm:"index"`
	DurationMs          int             `json:"durationMs" gorm:"default:0"`
	BonusWindowMs       int             `json:"bonusWindowMs" gorm:"default:0"`
}

type LilaAnswer struct {
	gorm.Model

	MatchID           uint       `json:"matchId" gorm:"not null;index"`
	RoundID           uint       `json:"roundId" gorm:"not null;index"`
	UserID            uint       `json:"userId" gorm:"not null;index"`
	SelectedOption    string     `json:"selectedOption" gorm:"type:varchar(128)"`
	OrderingJSON      string     `json:"orderingJson" gorm:"type:text"`
	AnswerText        string     `json:"answerText" gorm:"type:text"`
	IsCorrect         bool       `json:"isCorrect" gorm:"default:false;index"`
	ResponseMS        int        `json:"responseMs" gorm:"default:0"`
	ScoreDelta        int        `json:"scoreDelta" gorm:"default:0"`
	KarmaTransfer     int        `json:"karmaTransfer" gorm:"default:0"`
	ClientSubmittedAt *time.Time `json:"clientSubmittedAt" gorm:"index"`
	SubmittedAt       time.Time  `json:"submittedAt" gorm:"index"`
	MetaJSON          string     `json:"metaJson" gorm:"type:text"`
}

type LilaSiddhiUsage struct {
	gorm.Model

	MatchID    uint           `json:"matchId" gorm:"not null;index"`
	RoundID    uint           `json:"roundId" gorm:"index"`
	UserID     uint           `json:"userId" gorm:"not null;index"`
	Type       LilaSiddhiType `json:"type" gorm:"type:varchar(32);not null;index"`
	EffectJSON string         `json:"effectJson" gorm:"type:text"`
	UsedAt     time.Time      `json:"usedAt" gorm:"index"`
}

type LilaProfile struct {
	gorm.Model

	UserID           uint      `json:"userId" gorm:"not null;uniqueIndex"`
	Rank             LilaRank  `json:"rank" gorm:"type:varchar(32);not null;default:'seeker';index"`
	Experience       int       `json:"experience" gorm:"default:0"`
	Level            int       `json:"level" gorm:"default:1"`
	Title            string    `json:"title" gorm:"type:varchar(120)"`
	AvatarStyle      string    `json:"avatarStyle" gorm:"type:varchar(120)"`
	LocationSlug     string    `json:"locationSlug" gorm:"type:varchar(120);index"`
	StreakDays       int       `json:"streakDays" gorm:"default:0"`
	WinCount         int       `json:"winCount" gorm:"default:0"`
	LoseCount        int       `json:"loseCount" gorm:"default:0"`
	TotalRewardsJSON string    `json:"totalRewardsJson" gorm:"type:text"`
	SettingsJSON     string    `json:"settingsJson" gorm:"type:text"`
	LastActiveAt     time.Time `json:"lastActiveAt" gorm:"index"`
}

type LilaQuest struct {
	gorm.Model

	Code            string             `json:"code" gorm:"type:varchar(80);uniqueIndex;not null"`
	TitleRu         string             `json:"titleRu" gorm:"type:varchar(200);not null"`
	TitleEn         string             `json:"titleEn" gorm:"type:varchar(200);not null"`
	TitleHi         string             `json:"titleHi" gorm:"type:varchar(200);not null"`
	DescriptionRu   string             `json:"descriptionRu" gorm:"type:text"`
	DescriptionEn   string             `json:"descriptionEn" gorm:"type:text"`
	DescriptionHi   string             `json:"descriptionHi" gorm:"type:text"`
	Mode            LilaGameMode       `json:"mode" gorm:"type:varchar(32);index"`
	RequirementJSON string             `json:"requirementJson" gorm:"type:text"`
	RewardBonus     int                `json:"rewardBonus" gorm:"default:0"`
	RewardReal      int                `json:"rewardReal" gorm:"default:0"`
	IsDaily         bool               `json:"isDaily" gorm:"default:false"`
	Status          LilaQuestionStatus `json:"status" gorm:"type:varchar(32);default:'draft';index"`
	StartsAt        *time.Time         `json:"startsAt" gorm:"index"`
	EndsAt          *time.Time         `json:"endsAt" gorm:"index"`
}

type LilaQuestProgress struct {
	gorm.Model

	UserID      uint       `json:"userId" gorm:"not null;index:idx_lila_quest_progress,priority:1"`
	QuestID     uint       `json:"questId" gorm:"not null;index:idx_lila_quest_progress,priority:2"`
	Progress    int        `json:"progress" gorm:"default:0"`
	Target      int        `json:"target" gorm:"default:0"`
	ClaimedAt   *time.Time `json:"claimedAt" gorm:"index"`
	CompletedAt *time.Time `json:"completedAt" gorm:"index"`
	MetaJSON    string     `json:"metaJson" gorm:"type:text"`
}

type LilaGuruLink struct {
	gorm.Model

	MentorUserID  uint       `json:"mentorUserId" gorm:"not null;index:idx_lila_guru_link,priority:1"`
	StudentUserID uint       `json:"studentUserId" gorm:"not null;uniqueIndex:idx_lila_guru_link,priority:2"`
	SharePercent  int        `json:"sharePercent" gorm:"default:5"`
	Status        string     `json:"status" gorm:"type:varchar(32);default:'active';index"`
	StartedAt     time.Time  `json:"startedAt" gorm:"index"`
	EndedAt       *time.Time `json:"endedAt" gorm:"index"`
	MetaJSON      string     `json:"metaJson" gorm:"type:text"`
}

type LilaStoreItem struct {
	gorm.Model

	Code          string             `json:"code" gorm:"type:varchar(80);uniqueIndex;not null"`
	Type          string             `json:"type" gorm:"type:varchar(32);index"`
	NameRu        string             `json:"nameRu" gorm:"type:varchar(200);not null"`
	NameEn        string             `json:"nameEn" gorm:"type:varchar(200);not null"`
	NameHi        string             `json:"nameHi" gorm:"type:varchar(200);not null"`
	DescriptionRu string             `json:"descriptionRu" gorm:"type:text"`
	DescriptionEn string             `json:"descriptionEn" gorm:"type:text"`
	DescriptionHi string             `json:"descriptionHi" gorm:"type:text"`
	PriceBonus    int                `json:"priceBonus" gorm:"default:0"`
	PriceReal     int                `json:"priceReal" gorm:"default:0"`
	CanUseBonus   bool               `json:"canUseBonus" gorm:"default:true"`
	CanUseReal    bool               `json:"canUseReal" gorm:"default:true"`
	IsFeatured    bool               `json:"isFeatured" gorm:"default:false"`
	SortOrder     int                `json:"sortOrder" gorm:"default:0;index"`
	Status        LilaQuestionStatus `json:"status" gorm:"type:varchar(32);default:'draft';index"`
	MetaJSON      string             `json:"metaJson" gorm:"type:text"`
}

type LilaPurchase struct {
	gorm.Model

	UserID        uint               `json:"userId" gorm:"not null;index"`
	ItemID        uint               `json:"itemId" gorm:"not null;index"`
	Quantity      int                `json:"quantity" gorm:"default:1"`
	Currency      LilaCurrencyType   `json:"currency" gorm:"type:varchar(16);not null;index"`
	PriceBonus    int                `json:"priceBonus" gorm:"default:0"`
	PriceReal     int                `json:"priceReal" gorm:"default:0"`
	DharmaPercent int                `json:"dharmaPercent" gorm:"default:0"`
	DharmaAmount  int                `json:"dharmaAmount" gorm:"default:0"`
	Status        LilaPurchaseStatus `json:"status" gorm:"type:varchar(32);default:'pending';index"`
	PaymentRef    string             `json:"paymentRef" gorm:"type:varchar(120);index"`
	ReceiptJSON   string             `json:"receiptJson" gorm:"type:text"`
	FulfilledAt   *time.Time         `json:"fulfilledAt" gorm:"index"`
	CancelledAt   *time.Time         `json:"cancelledAt" gorm:"index"`
	MetaJSON      string             `json:"metaJson" gorm:"type:text"`
}

type LilaPassSeason struct {
	gorm.Model

	Code              string         `json:"code" gorm:"type:varchar(80);uniqueIndex;not null"`
	NameRu            string         `json:"nameRu" gorm:"type:varchar(200);not null"`
	NameEn            string         `json:"nameEn" gorm:"type:varchar(200);not null"`
	NameHi            string         `json:"nameHi" gorm:"type:varchar(200);not null"`
	DescriptionRu     string         `json:"descriptionRu" gorm:"type:text"`
	DescriptionEn     string         `json:"descriptionEn" gorm:"type:text"`
	DescriptionHi     string         `json:"descriptionHi" gorm:"type:text"`
	Status            LilaPassStatus `json:"status" gorm:"type:varchar(32);default:'locked';index"`
	StartsAt          time.Time      `json:"startsAt" gorm:"index"`
	EndsAt            time.Time      `json:"endsAt" gorm:"index"`
	PremiumPriceReal  int            `json:"premiumPriceReal" gorm:"default:0"`
	DailyBonusJSON    string         `json:"dailyBonusJson" gorm:"type:text"`
	PremiumRewardJSON string         `json:"premiumRewardJson" gorm:"type:text"`
	MetaJSON          string         `json:"metaJson" gorm:"type:text"`
}

type LilaPassProgress struct {
	gorm.Model

	SeasonID          uint           `json:"seasonId" gorm:"not null;index:idx_lila_pass_progress,priority:1"`
	UserID            uint           `json:"userId" gorm:"not null;index:idx_lila_pass_progress,priority:2"`
	CurrentPoints     int            `json:"currentPoints" gorm:"default:0"`
	CurrentLevel      int            `json:"currentLevel" gorm:"default:1"`
	ClaimedLevelsJSON string         `json:"claimedLevelsJson" gorm:"type:text"`
	PremiumUnlockedAt *time.Time     `json:"premiumUnlockedAt" gorm:"index"`
	LastClaimedAt     *time.Time     `json:"lastClaimedAt" gorm:"index"`
	Status            LilaPassStatus `json:"status" gorm:"type:varchar(32);default:'locked';index"`
	MetaJSON          string         `json:"metaJson" gorm:"type:text"`
}

type LilaSubscription struct {
	gorm.Model

	UserID       uint                   `json:"userId" gorm:"not null;index"`
	PackageCode  string                 `json:"packageCode" gorm:"type:varchar(80);not null;index"`
	Status       LilaSubscriptionStatus `json:"status" gorm:"type:varchar(32);not null;default:'active';index"`
	StartsAt     time.Time              `json:"startsAt" gorm:"index"`
	EndsAt       time.Time              `json:"endsAt" gorm:"index"`
	AutoRenew    bool                   `json:"autoRenew" gorm:"default:false"`
	PriceReal    int                    `json:"priceReal" gorm:"default:0"`
	BenefitsJSON string                 `json:"benefitsJson" gorm:"type:text"`
	CancelledAt  *time.Time             `json:"cancelledAt" gorm:"index"`
	MetaJSON     string                 `json:"metaJson" gorm:"type:text"`
}

type LilaGift struct {
	gorm.Model

	FromUserID  uint             `json:"fromUserId" gorm:"not null;index"`
	ToUserID    uint             `json:"toUserId" gorm:"not null;index"`
	ItemID      *uint            `json:"itemId" gorm:"index"`
	Title       string           `json:"title" gorm:"type:varchar(200)"`
	Message     string           `json:"message" gorm:"type:text"`
	Currency    LilaCurrencyType `json:"currency" gorm:"type:varchar(16);default:'bonus';index"`
	BonusAmount int              `json:"bonusAmount" gorm:"default:0"`
	RealAmount  int              `json:"realAmount" gorm:"default:0"`
	Status      string           `json:"status" gorm:"type:varchar(32);default:'sent';index"`
	SentAt      time.Time        `json:"sentAt" gorm:"index"`
	DeliveredAt *time.Time       `json:"deliveredAt" gorm:"index"`
	MetaJSON    string           `json:"metaJson" gorm:"type:text"`
}

type LilaDharmaFundRecord struct {
	gorm.Model

	PurchaseID      *uint                `json:"purchaseId" gorm:"index"`
	UserID          uint                 `json:"userId" gorm:"not null;index"`
	SourceType      string               `json:"sourceType" gorm:"type:varchar(64);index"`
	GrossRealAmount int                  `json:"grossRealAmount" gorm:"default:0"`
	DharmaPercent   int                  `json:"dharmaPercent" gorm:"default:0"`
	DharmaAmount    int                  `json:"dharmaAmount" gorm:"default:0"`
	Beneficiary     string               `json:"beneficiary" gorm:"type:varchar(200)"`
	Status          LilaDharmaFundStatus `json:"status" gorm:"type:varchar(32);default:'pending';index"`
	SettledAt       *time.Time           `json:"settledAt" gorm:"index"`
	Notes           string               `json:"notes" gorm:"type:text"`
	MetaJSON        string               `json:"metaJson" gorm:"type:text"`
}

type LilaLeaderboardEntry struct {
	UserID    uint      `json:"userId"`
	Score     int       `json:"score"`
	Rank      LilaRank  `json:"rank"`
	Wins      int       `json:"wins"`
	Losses    int       `json:"losses"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type LilaBonusLedgerEntry struct {
	gorm.Model

	UserID        uint             `json:"userId" gorm:"not null;index"`
	Amount        int              `json:"amount" gorm:"not null"`
	BalanceAfter  int              `json:"balanceAfter" gorm:"default:0"`
	Currency      LilaCurrencyType `json:"currency" gorm:"type:varchar(16);default:'bonus';index"`
	Reason        string           `json:"reason" gorm:"type:varchar(200)"`
	ReferenceType string           `json:"referenceType" gorm:"type:varchar(80);index"`
	ReferenceID   string           `json:"referenceId" gorm:"type:varchar(120);index"`
	MetaJSON      string           `json:"metaJson" gorm:"type:text"`
	OccurredAt    time.Time        `json:"occurredAt" gorm:"index"`
}
