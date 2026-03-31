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
	ModePlayerCounts   map[string]int64              `json:"modePlayerCounts"`
	ActiveSeason       *models.LilaPassSeason        `json:"activeSeason,omitempty"`
	PassProgress       *PassProgressView             `json:"passProgress,omitempty"`
	StoreItems         []models.LilaStoreItem        `json:"storeItems"`
	OwnedItems         []InventoryItemView           `json:"ownedItems"`
	PurchaseHistory    []PurchaseHistoryView         `json:"purchaseHistory"`
	GiftHistory        []GiftHistoryView             `json:"giftHistory"`
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

type PassProgressView struct {
	SeasonID          uint                  `json:"seasonId"`
	UserID            uint                  `json:"userId"`
	CurrentPoints     int                   `json:"currentPoints"`
	CurrentLevel      int                   `json:"currentLevel"`
	ClaimedLevels     []int                 `json:"claimedLevels"`
	PremiumUnlockedAt *time.Time            `json:"premiumUnlockedAt,omitempty"`
	LastClaimedAt     *time.Time            `json:"lastClaimedAt,omitempty"`
	Status            models.LilaPassStatus `json:"status"`
	ExpiresAt         *time.Time            `json:"expiresAt,omitempty"`
}

type InventoryItemView struct {
	Code        string     `json:"code"`
	Type        string     `json:"type"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	State       string     `json:"state"`
	Source      string     `json:"source"`
	OwnedAt     *time.Time `json:"ownedAt,omitempty"`
	ExpiresAt   *time.Time `json:"expiresAt,omitempty"`
	IsEquipped  bool       `json:"isEquipped"`
}

type PurchaseHistoryView struct {
	PurchaseID  uint                    `json:"purchaseId"`
	ItemCode    string                  `json:"itemCode"`
	ItemType    string                  `json:"itemType"`
	ItemName    string                  `json:"itemName"`
	Currency    models.LilaCurrencyType `json:"currency"`
	PriceBonus  int                     `json:"priceBonus"`
	PriceReal   int                     `json:"priceReal"`
	Status      string                  `json:"status"`
	State       string                  `json:"state"`
	PurchasedAt time.Time               `json:"purchasedAt"`
	FulfilledAt *time.Time              `json:"fulfilledAt,omitempty"`
	ExpiresAt   *time.Time              `json:"expiresAt,omitempty"`
}

type GiftHistoryView struct {
	GiftID             uint                    `json:"giftId"`
	ItemCode           string                  `json:"itemCode"`
	ItemName           string                  `json:"itemName"`
	Direction          string                  `json:"direction"`
	Status             string                  `json:"status"`
	Message            string                  `json:"message"`
	Currency           models.LilaCurrencyType `json:"currency"`
	BonusAmount        int                     `json:"bonusAmount"`
	RealAmount         int                     `json:"realAmount"`
	CounterpartyUserID uint                    `json:"counterpartyUserId"`
	SentAt             time.Time               `json:"sentAt"`
	DeliveredAt        *time.Time              `json:"deliveredAt,omitempty"`
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
