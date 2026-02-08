package models

import (
	"time"

	"gorm.io/gorm"
)

// ==================== CHARITY ORGANIZATION (БЛАГОТВОРИТЕЛЬНАЯ ОРГАНИЗАЦИЯ) ====================

// OrganizationStatus represents vefirication status of a charity
type OrganizationStatus string

const (
	OrgStatusDraft    OrganizationStatus = "draft"
	OrgStatusPending  OrganizationStatus = "pending"
	OrgStatusVerified OrganizationStatus = "verified"
	OrgStatusBlocked  OrganizationStatus = "blocked"
)

// CharityOrganization represents a verified charity/foundation
type CharityOrganization struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Organization info
	Name        string `json:"name" gorm:"not null;size:255"`
	Slug        string `json:"slug" gorm:"uniqueIndex;size:100"`
	Description string `json:"description" gorm:"type:text"`
	LogoURL     string `json:"logoUrl" gorm:"size:500"`
	CoverURL    string `json:"coverUrl" gorm:"size:500"`
	Website     string `json:"website" gorm:"size:255"`
	Email       string `json:"email" gorm:"size:255"`
	Phone       string `json:"phone" gorm:"size:50"`

	// Location
	Country string `json:"country" gorm:"size:100"`
	City    string `json:"city" gorm:"size:100"`
	Address string `json:"address" gorm:"size:500"`

	// Verification
	Status           OrganizationStatus `json:"status" gorm:"type:varchar(20);default:'draft'"`
	VerifiedAt       *time.Time         `json:"verifiedAt"`
	VerifiedByUserID *uint              `json:"verifiedByUserId"`
	RejectionReason  string             `json:"rejectionReason" gorm:"type:text"`

	// Documents (S3 paths in /charity/documents/)
	DocumentURLs []string `json:"documentUrls" gorm:"type:jsonb;serializer:json"`

	// Owner (User who manages this org)
	OwnerUserID uint  `json:"ownerUserId" gorm:"not null;index"`
	OwnerUser   *User `json:"ownerUser,omitempty" gorm:"foreignKey:OwnerUserID"`

	// Charity Wallet (wallet_type = CHARITY)
	WalletID *uint   `json:"walletId" gorm:"index"`
	Wallet   *Wallet `json:"wallet,omitempty" gorm:"foreignKey:WalletID"`

	// B2B Subscription
	IsPremium       bool       `json:"isPremium" gorm:"default:false"`
	PremiumUntil    *time.Time `json:"premiumUntil"`
	PriorityListing bool       `json:"priorityListing" gorm:"default:false"`

	// Stats (cached)
	TotalRaised   int `json:"totalRaised" gorm:"default:0"`
	TotalProjects int `json:"totalProjects" gorm:"default:0"`
	TotalDonors   int `json:"totalDonors" gorm:"default:0"`
	TrustScore    int `json:"trustScore" gorm:"default:0"` // 0-100

	// Relations
	Projects []CharityProject `json:"projects,omitempty" gorm:"foreignKey:OrganizationID"`
}

// ==================== CHARITY PROJECT (СБОР / КАМПАНИЯ) ====================

// ProjectStatus represents status of a charity campaign
type ProjectStatus string

const (
	ProjectStatusDraft      ProjectStatus = "draft"
	ProjectStatusModeration ProjectStatus = "moderation"
	ProjectStatusActive     ProjectStatus = "active"
	ProjectStatusPaused     ProjectStatus = "paused"
	ProjectStatusCompleted  ProjectStatus = "completed"
	ProjectStatusBlocked    ProjectStatus = "blocked"
)

// CharityProject represents a fundraising campaign
type CharityProject struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Parent organization
	OrganizationID uint                 `json:"organizationId" gorm:"not null;index"`
	Organization   *CharityOrganization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`

	// Project info
	Title       string `json:"title" gorm:"not null;size:255"`
	Slug        string `json:"slug" gorm:"uniqueIndex;size:100"`
	Description string `json:"description" gorm:"type:text"`
	ShortDesc   string `json:"shortDesc" gorm:"size:500"`
	CoverURL    string `json:"coverUrl" gorm:"size:500"`
	VideoURL    string `json:"videoUrl" gorm:"size:500"`

	// Category
	Category string `json:"category" gorm:"size:50"` // food, shelter, health, education, temple, animals

	// Funding
	GoalAmount       int   `json:"goalAmount" gorm:"not null"`                         // Target in LKM
	RaisedAmount     int   `json:"raisedAmount" gorm:"default:0"`                      // Current raised
	DonationsCount   int   `json:"donationsCount" gorm:"default:0"`                    // Number of donations
	UniqueDonors     int   `json:"uniqueDonors" gorm:"default:0"`                      // Unique donor count
	MinDonation      int   `json:"minDonation" gorm:"default:10"`                      // Minimum donation amount
	SuggestedAmounts []int `json:"suggestedAmounts" gorm:"type:jsonb;serializer:json"` // e.g. [100, 500, 1000]

	// Status
	Status          ProjectStatus `json:"status" gorm:"type:varchar(20);default:'draft'"`
	ApprovedAt      *time.Time    `json:"approvedAt"`
	ApprovedBy      *uint         `json:"approvedBy"`
	RejectionReason string        `json:"rejectionReason" gorm:"type:text"`

	// Deadlines
	StartDate *time.Time `json:"startDate"`
	EndDate   *time.Time `json:"endDate"` // null = no deadline

	// Impact Metrics Configuration
	// Example: {"metric": "meals", "label_ru": "Накормлено", "label_en": "Meals served", "unit_cost": 100}
	ImpactMetrics []ImpactMetricConfig `json:"impactMetrics" gorm:"type:jsonb;serializer:json"`

	// Reporting requirements
	ReportingPeriodDays int        `json:"reportingPeriodDays" gorm:"default:30"` // Days between required reports
	LastReportAt        *time.Time `json:"lastReportAt"`
	NextReportDue       *time.Time `json:"nextReportDue"`
	ReportWarningsSent  int        `json:"reportWarningsSent" gorm:"default:0"`

	// Visibility
	IsFeatured bool `json:"isFeatured" gorm:"default:false"`
	IsUrgent   bool `json:"isUrgent" gorm:"default:false"`

	// Relations
	Donations []CharityDonation  `json:"donations,omitempty" gorm:"foreignKey:ProjectID"`
	Evidence  []CharityEvidence  `json:"evidence,omitempty" gorm:"foreignKey:ProjectID"`
	KarmaFeed []CharityKarmaNote `json:"karmaFeed,omitempty" gorm:"foreignKey:ProjectID"`
}

// ImpactMetricConfig defines how donations translate to impact
type ImpactMetricConfig struct {
	Metric   string `json:"metric"`   // e.g. "meals", "cows_fed", "books"
	LabelRu  string `json:"labelRu"`  // "Накормлено"
	LabelEn  string `json:"labelEn"`  // "Meals served"
	UnitCost int    `json:"unitCost"` // LKM per unit (e.g. 100 LKM = 1 meal)
	Icon     string `json:"icon"`     // emoji or icon name
}

// ==================== CHARITY DONATION (ПОЖЕРТВОВАНИЕ) ====================

// DonationStatus represents the status of a donation
type DonationStatus string

const (
	DonationStatusPending   DonationStatus = "pending"   // 0-24 hours - can be refunded
	DonationStatusConfirmed DonationStatus = "confirmed" // After 24 hours - transferred to organization
	DonationStatusRefunded  DonationStatus = "refunded"  // User requested refund
)

// CharityDonation represents a single donation
type CharityDonation struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	// Donor
	DonorUserID uint  `json:"donorUserId" gorm:"not null;index"`
	DonorUser   *User `json:"donorUser,omitempty" gorm:"foreignKey:DonorUserID"`
	IsAnonymous bool  `json:"isAnonymous" gorm:"default:false"`

	// Project
	ProjectID uint            `json:"projectId" gorm:"not null;index"`
	Project   *CharityProject `json:"project,omitempty" gorm:"foreignKey:ProjectID"`

	// Amount
	Amount     int `json:"amount" gorm:"not null"`    // Donation to project
	TipsAmount int `json:"tipsAmount"`                // Platform tips (5% default)
	TotalPaid  int `json:"totalPaid" gorm:"not null"` // Amount + TipsAmount

	// Tips settings at time of donation
	TipsPercent float32 `json:"tipsPercent" gorm:"default:5"` // % of donation

	// Karma message (optional)
	KarmaMessage string `json:"karmaMessage" gorm:"size:500"`

	// Status and refund period
	Status         DonationStatus `json:"status" gorm:"type:varchar(20);default:'pending'"`
	CanRefundUntil *time.Time     `json:"canRefundUntil"` // 24 hours from creation
	RefundedAt     *time.Time     `json:"refundedAt"`
	ConfirmedAt    *time.Time     `json:"confirmedAt"` // When status changed to confirmed

	// Certificate
	WantsCertificate  bool   `json:"wantsCertificate" gorm:"default:false"`
	CertificateURL    string `json:"certificateUrl" gorm:"size:500"`
	CertificateStatus string `json:"certificateStatus" gorm:"size:20"` // pending, generated

	// Transaction reference
	TransactionID *uint              `json:"transactionId" gorm:"index"`
	Transaction   *WalletTransaction `json:"transaction,omitempty" gorm:"foreignKey:TransactionID"`

	// Impact at time of donation (snapshot)
	ImpactSnapshot []ImpactValue `json:"impactSnapshot" gorm:"type:jsonb;serializer:json"`
}

// ImpactValue represents calculated impact for a donation
type ImpactValue struct {
	Metric  string  `json:"metric"`  // e.g. "meals"
	Value   float64 `json:"value"`   // e.g. 10.5 meals
	LabelRu string  `json:"labelRu"` // "10 обедов"
	LabelEn string  `json:"labelEn"` // "10 meals"
}

// ==================== CHARITY EVIDENCE (ОТЧЁТЫ / ДОКАЗАТЕЛЬСТВА) ====================

// EvidenceType represents type of evidence
type EvidenceType string

const (
	EvidenceTypePhoto   EvidenceType = "photo"
	EvidenceTypeVideo   EvidenceType = "video"
	EvidenceTypeReceipt EvidenceType = "receipt"
	EvidenceTypeReport  EvidenceType = "report"
)

// CharityEvidence represents a proof of fund usage
type CharityEvidence struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	// Project
	ProjectID uint            `json:"projectId" gorm:"not null;index"`
	Project   *CharityProject `json:"project,omitempty" gorm:"foreignKey:ProjectID"`

	// Created by
	CreatedByUserID uint  `json:"createdByUserId" gorm:"not null"`
	CreatedByUser   *User `json:"createdByUser,omitempty" gorm:"foreignKey:CreatedByUserID"`

	// Evidence content
	Type        EvidenceType `json:"type" gorm:"type:varchar(20);not null"`
	Title       string       `json:"title" gorm:"size:255"`
	Description string       `json:"description" gorm:"type:text"`
	MediaURL    string       `json:"mediaUrl" gorm:"size:500;not null"` // S3 path in /charity/evidence/

	// Thumbnails (for video/large images)
	ThumbnailURL string `json:"thumbnailUrl" gorm:"size:500"`

	// Moderation
	IsApproved bool       `json:"isApproved" gorm:"default:true"` // Auto-approved, can be flagged
	ApprovedAt *time.Time `json:"approvedAt"`
	ApprovedBy *uint      `json:"approvedBy"`

	// Stats
	ViewsCount  int `json:"viewsCount" gorm:"default:0"`
	LikesCount  int `json:"likesCount" gorm:"default:0"`
	SharesCount int `json:"sharesCount" gorm:"default:0"`
}

// ==================== CHARITY KARMA NOTES (ЛЕНТА БЛАГОДАРНОСТЕЙ) ====================

// CharityKarmaNote represents a gratitude message (from donor or org)
type CharityKarmaNote struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	// Project
	ProjectID uint            `json:"projectId" gorm:"not null;index"`
	Project   *CharityProject `json:"project,omitempty" gorm:"foreignKey:ProjectID"`

	// Author
	AuthorUserID uint  `json:"authorUserId" gorm:"not null;index"`
	AuthorUser   *User `json:"authorUser,omitempty" gorm:"foreignKey:AuthorUserID"`

	// Type: donor_message, org_thanks, milestone
	NoteType string `json:"noteType" gorm:"size:30;not null"`

	// Content
	Message   string `json:"message" gorm:"size:500;not null"`
	IsVisible bool   `json:"isVisible" gorm:"default:true"`

	// Related donation (if from donor)
	DonationID *uint            `json:"donationId" gorm:"index"`
	Donation   *CharityDonation `json:"donation,omitempty" gorm:"foreignKey:DonationID"`
}

// ==================== PLATFORM SETTINGS ====================

// CharitySettings stores platform-wide charity settings
type CharitySettings struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Tips configuration
	DefaultTipsPercent  float32 `json:"defaultTipsPercent" gorm:"default:5"`
	TipsEnabled         bool    `json:"tipsEnabled" gorm:"default:true"`
	TipsCheckboxDefault bool    `json:"tipsCheckboxDefault" gorm:"default:true"` // Checked by default

	// Reporting
	DefaultReportingDays   int `json:"defaultReportingDays" gorm:"default:30"`
	WarningBeforeBlockDays int `json:"warningBeforeBlockDays" gorm:"default:7"`

	// Platform wallet for tips
	PlatformWalletID *uint   `json:"platformWalletId"`
	PlatformWallet   *Wallet `json:"platformWallet,omitempty" gorm:"foreignKey:PlatformWalletID"`
}

// ==================== DTOs ====================

// CreateOrganizationRequest for API
type CreateOrganizationRequest struct {
	Name         string   `json:"name" binding:"required"`
	Description  string   `json:"description"`
	Country      string   `json:"country"`
	City         string   `json:"city"`
	Website      string   `json:"website"`
	Email        string   `json:"email"`
	Phone        string   `json:"phone"`
	DocumentURLs []string `json:"documentUrls"`
}

// CreateProjectRequest for API
type CreateProjectRequest struct {
	OrganizationID   uint                 `json:"organizationId" binding:"required"`
	Title            string               `json:"title" binding:"required"`
	Description      string               `json:"description"`
	ShortDesc        string               `json:"shortDesc"`
	Category         string               `json:"category"`
	GoalAmount       int                  `json:"goalAmount" binding:"required,min=100"`
	MinDonation      int                  `json:"minDonation"`
	SuggestedAmounts []int                `json:"suggestedAmounts"`
	ImpactMetrics    []ImpactMetricConfig `json:"impactMetrics"`
	StartDate        *time.Time           `json:"startDate"`
	EndDate          *time.Time           `json:"endDate"`
}

// DonateRequest for making a donation
type DonateRequest struct {
	ProjectID        uint    `json:"projectId" binding:"required"`
	Amount           int     `json:"amount" binding:"required,min=10"`
	IncludeTips      bool    `json:"includeTips"`
	TipsPercent      float32 `json:"tipsPercent"` // Custom tips %
	KarmaMessage     string  `json:"karmaMessage"`
	IsAnonymous      bool    `json:"isAnonymous"`
	WantsCertificate bool    `json:"wantsCertificate"`
}

// DonateResponse after successful donation
type DonateResponse struct {
	DonationID     uint          `json:"donationId"`
	TransactionID  uint          `json:"transactionId"`
	AmountDonated  int           `json:"amountDonated"`
	TipsAmount     int           `json:"tipsAmount"`
	TotalPaid      int           `json:"totalPaid"`
	NewBalance     int           `json:"newBalance"`
	ImpactAchieved []ImpactValue `json:"impactAchieved"`
	CertificateURL string        `json:"certificateUrl,omitempty"`
}

// ProjectListResponse for listing projects
type ProjectListResponse struct {
	Projects   []CharityProject `json:"projects"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"totalPages"`
}
