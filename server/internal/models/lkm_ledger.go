package models

import (
	"time"

	"gorm.io/gorm"
)

type LKMLedgerEntryType string

const (
	LKMLedgerEntryTypeDebit  LKMLedgerEntryType = "debit"
	LKMLedgerEntryTypeCredit LKMLedgerEntryType = "credit"
)

type LKMExpenseStatus string

const (
	LKMExpenseStatusPending  LKMExpenseStatus = "pending"
	LKMExpenseStatusApproved LKMExpenseStatus = "approved"
	LKMExpenseStatusRejected LKMExpenseStatus = "rejected"
)

type LKMAccount struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Code     string `gorm:"uniqueIndex;size:64;not null" json:"code"`
	Name     string `gorm:"size:128;not null" json:"name"`
	IsActive bool   `gorm:"default:true" json:"isActive"`
}

type LKMLedgerEntry struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	TxGroupID string             `gorm:"index;size:80" json:"txGroupId"`
	EntryType LKMLedgerEntryType `gorm:"type:varchar(20);index;not null" json:"entryType"`
	Amount    int                `gorm:"not null" json:"amount"`

	AccountCode string `gorm:"index;size:64;not null" json:"accountCode"`
	Status      string `gorm:"type:varchar(20);index;default:'posted'" json:"status"`

	SourceService     string `gorm:"index;size:40;default:'unknown'" json:"sourceService"`
	SourceTrigger     string `gorm:"index;size:60;default:'unknown'" json:"sourceTrigger"`
	SourceContextJSON string `gorm:"type:text" json:"sourceContextJson"`

	ProjectID  *uint `gorm:"index" json:"projectId,omitempty"`
	DonationID *uint `gorm:"index" json:"donationId,omitempty"`
	UserID     *uint `gorm:"index" json:"userId,omitempty"`
	RoomID     *uint `gorm:"index" json:"roomId,omitempty"`

	ActorAdminID *uint  `gorm:"index" json:"actorAdminId,omitempty"`
	Note         string `gorm:"type:text" json:"note"`
}

type LKMExpenseRequest struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	AccountCode string           `gorm:"index;size:64;not null" json:"accountCode"`
	Amount      int              `gorm:"not null" json:"amount"`
	Category    string           `gorm:"size:64" json:"category"`
	ReasonCode  string           `gorm:"size:64" json:"reasonCode"`
	Note        string           `gorm:"type:text" json:"note"`
	Status      LKMExpenseStatus `gorm:"type:varchar(20);index;default:'pending'" json:"status"`

	RequiredApprovals int `gorm:"default:1" json:"requiredApprovals"`
	CurrentApprovals  int `gorm:"default:0" json:"currentApprovals"`

	RequestedBy uint  `gorm:"index;not null" json:"requestedBy"`
	ApprovedBy  *uint `gorm:"index" json:"approvedBy,omitempty"`

	RejectedReason string `gorm:"type:text" json:"rejectedReason"`
}

type LKMApprovalEvent struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	ExpenseRequestID uint   `gorm:"index;not null" json:"expenseRequestId"`
	ActorAdminID     uint   `gorm:"index;not null" json:"actorAdminId"`
	Action           string `gorm:"type:varchar(20);not null" json:"action"`
	Note             string `gorm:"type:text" json:"note"`
}
