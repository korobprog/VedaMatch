package lila

import (
	"time"

	"rag-agent-server/internal/models"
)

type Locale string

const (
	LocaleRU Locale = "ru"
	LocaleEN Locale = "en"
	LocaleHI Locale = "hi"
)

type LocalizedText struct {
	Ru string `json:"ru"`
	En string `json:"en"`
	Hi string `json:"hi"`
}

type QuestionView struct {
	ID           uint                    `json:"id"`
	Slug         string                  `json:"slug"`
	Type         models.LilaQuestionType `json:"type"`
	Category     string                  `json:"category"`
	Difficulty   models.LilaDifficulty   `json:"difficulty"`
	Prompt       string                  `json:"prompt"`
	Options      []string                `json:"options"`
	Explanation  string                  `json:"explanation"`
	AssetURL     string                  `json:"assetUrl"`
	AssetKind    string                  `json:"assetKind"`
	AllowedModes []models.LilaGameMode   `json:"allowedModes"`
}

type MatchView struct {
	Match             models.LilaMatch        `json:"match"`
	Rounds            []models.LilaRound      `json:"rounds"`
	Players           []uint                  `json:"players"`
	QueueEntries      []models.LilaQueueEntry `json:"queueEntries"`
	Locale            Locale                  `json:"locale"`
	CurrentRound      *models.LilaRound       `json:"currentRound,omitempty"`
	CurrentQuestion   *QuestionView           `json:"currentQuestion,omitempty"`
	ReadyUserIDs      []uint                  `json:"readyUserIds"`
	Scoreboard        []MatchScoreEntry       `json:"scoreboard"`
	EliminatedUserIDs []uint                  `json:"eliminatedUserIds,omitempty"`
	AnsweredUserIDs   []uint                  `json:"answeredUserIds,omitempty"`
}

type MatchScoreEntry struct {
	UserID       uint `json:"userId"`
	Score        int  `json:"score"`
	IsReady      bool `json:"isReady"`
	IsEliminated bool `json:"isEliminated"`
}

type BootstrapResponse struct {
	Profile            *models.LilaProfile           `json:"profile,omitempty"`
	QueueDepth         map[string]int64              `json:"queueDepth"`
	ActiveSeason       *models.LilaPassSeason        `json:"activeSeason,omitempty"`
	StoreItems         []models.LilaStoreItem        `json:"storeItems"`
	Quests             []models.LilaQuest            `json:"quests"`
	Leaderboard        []models.LilaLeaderboardEntry `json:"leaderboard"`
	Subscription       *models.LilaSubscription      `json:"subscription,omitempty"`
	BonusBalance       int                           `json:"bonusBalance"`
	RealBalance        int                           `json:"realBalance"`
	OpenMatches        []models.LilaMatch            `json:"openMatches"`
	OpenQueue          []models.LilaQueueEntry       `json:"openQueue"`
	AvailableQuestions []QuestionView                `json:"availableQuestions"`
	Metrics            MetricsSnapshot               `json:"metrics"`
}

type JoinQueueRequest struct {
	Mode     models.LilaGameMode    `json:"mode"`
	TeamKey  string                 `json:"teamKey"`
	Location string                 `json:"location"`
	Metadata map[string]interface{} `json:"metadata"`
}

type AnswerSubmissionRequest struct {
	MatchCode         string     `json:"matchCode"`
	RoundNumber       int        `json:"roundNumber"`
	UserID            uint       `json:"userId"`
	SelectedOption    string     `json:"selectedOption"`
	Ordering          []string   `json:"ordering"`
	AnswerText        string     `json:"answerText"`
	ClientSubmittedAt *time.Time `json:"clientSubmittedAt"`
}

type SiddhiUsageRequest struct {
	MatchCode   string                 `json:"matchCode"`
	RoundNumber int                    `json:"roundNumber"`
	UserID      uint                   `json:"userId"`
	Type        models.LilaSiddhiType  `json:"type"`
	Payload     map[string]interface{} `json:"payload"`
}

type PurchaseRequest struct {
	ItemCode string                  `json:"itemCode"`
	Currency models.LilaCurrencyType `json:"currency"`
	Quantity int                     `json:"quantity"`
	DedupKey string                  `json:"dedupKey"`
}

type GiftRequest struct {
	ToUserID uint                    `json:"toUserId"`
	ItemCode string                  `json:"itemCode"`
	Message  string                  `json:"message"`
	Currency models.LilaCurrencyType `json:"currency"`
	Quantity int                     `json:"quantity"`
}

type PassClaimRequest struct {
	SeasonCode string `json:"seasonCode"`
	Points     int    `json:"points"`
	Premium    bool   `json:"premium"`
}

type SubscriptionRequest struct {
	PackageCode string `json:"packageCode"`
	AutoRenew   bool   `json:"autoRenew"`
	DedupKey    string `json:"dedupKey"`
}

type GuruLinkRequest struct {
	MentorUserID  uint `json:"mentorUserId"`
	StudentUserID uint `json:"studentUserId"`
	SharePercent  int  `json:"sharePercent"`
}

type QuestProgressRequest struct {
	Code  string `json:"code"`
	Delta int    `json:"delta"`
	Claim bool   `json:"claim"`
}

type BalanceSummary struct {
	Bonus int `json:"bonus"`
	Real  int `json:"real"`
}

type LeaderboardSnapshot struct {
	Entries []models.LilaLeaderboardEntry `json:"entries"`
	Scope   string                        `json:"scope"`
	At      time.Time                     `json:"at"`
}
