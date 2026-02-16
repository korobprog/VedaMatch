package models

import (
	"time"

	"gorm.io/gorm"
)

type SupportConversationStatus string

const (
	SupportConversationStatusOpen     SupportConversationStatus = "open"
	SupportConversationStatusResolved SupportConversationStatus = "resolved"
)

type SupportConversationChannel string

const (
	SupportConversationChannelTelegram SupportConversationChannel = "telegram"
	SupportConversationChannelInApp    SupportConversationChannel = "in_app"
)

type SupportMessageType string

const (
	SupportMessageTypeText  SupportMessageType = "text"
	SupportMessageTypeImage SupportMessageType = "image"
)

type SupportMessageDirection string

const (
	SupportMessageDirectionInbound  SupportMessageDirection = "inbound"
	SupportMessageDirectionOutbound SupportMessageDirection = "outbound"
)

type SupportMessageSource string

const (
	SupportMessageSourceUser     SupportMessageSource = "user"
	SupportMessageSourceBot      SupportMessageSource = "bot"
	SupportMessageSourceOperator SupportMessageSource = "operator"
)

// SupportContact maps a Telegram user/chat to the support system.
type SupportContact struct {
	gorm.Model
	TelegramUserID  int64      `json:"telegramUserId" gorm:"uniqueIndex;not null"`
	TelegramChatID  int64      `json:"telegramChatId" gorm:"index;not null"`
	Username        string     `json:"username" gorm:"size:255"`
	FirstName       string     `json:"firstName" gorm:"size:255"`
	LastName        string     `json:"lastName" gorm:"size:255"`
	LanguageCode    string     `json:"languageCode" gorm:"size:16"`
	IsBlocked       bool       `json:"isBlocked" gorm:"default:false"`
	LastSeenAt      *time.Time `json:"lastSeenAt"`
	LastUserMessage *time.Time `json:"lastUserMessageAt"`
}

// SupportConversation is an active or resolved support thread for a contact.
type SupportConversation struct {
	gorm.Model
	ContactID           *uint                     `json:"contactId,omitempty" gorm:"index"`
	Contact             SupportContact            `json:"contact,omitempty"`
	AppUserID           *uint                     `json:"appUserId,omitempty" gorm:"index;uniqueIndex:idx_support_client_request"`
	AppUser             User                      `json:"appUser,omitempty"`
	Channel             SupportConversationChannel `json:"channel" gorm:"type:varchar(20);index;default:'telegram'"`
	TicketNumber        *string                   `json:"ticketNumber,omitempty" gorm:"size:64;uniqueIndex"`
	Subject             string                    `json:"subject" gorm:"size:255"`
	RequesterName       string                    `json:"requesterName" gorm:"size:255"`
	RequesterContact    string                    `json:"requesterContact" gorm:"size:255;index;uniqueIndex:idx_support_client_request"`
	ClientRequestID     *string                   `json:"clientRequestId,omitempty" gorm:"size:128;index;uniqueIndex:idx_support_client_request"`
	EntryPoint          string                    `json:"entryPoint" gorm:"size:100;index"`
	Status              SupportConversationStatus `json:"status" gorm:"type:varchar(20);index;default:'open'"`
	TelegramChatID      int64                     `json:"telegramChatId" gorm:"index;not null"`
	LastMessageAt       *time.Time                `json:"lastMessageAt"`
	LastMessagePreview  string                    `json:"lastMessagePreview" gorm:"type:text"`
	EscalatedToOperator bool                      `json:"escalatedToOperator" gorm:"default:false"`
	EscalatedAt         *time.Time                `json:"escalatedAt"`
	LastUserReadAt      *time.Time                `json:"lastUserReadAt"`
	FirstResponseAt     *time.Time                `json:"firstResponseAt"`
	ResolvedAt          *time.Time                `json:"resolvedAt"`
	ResolvedBy          *uint                     `json:"resolvedBy"`
}

// SupportMessage stores user/bot/operator messages in a support conversation.
type SupportMessage struct {
	gorm.Model
	ConversationID    uint                    `json:"conversationId" gorm:"index;not null"`
	Conversation      SupportConversation     `json:"conversation,omitempty"`
	Direction         SupportMessageDirection `json:"direction" gorm:"type:varchar(20);index;not null"`
	Source            SupportMessageSource    `json:"source" gorm:"type:varchar(20);index;not null"`
	Type              SupportMessageType      `json:"type" gorm:"type:varchar(20);index;default:'text'"`
	Text              string                  `json:"text" gorm:"type:text"`
	Caption           string                  `json:"caption" gorm:"type:text"`
	MediaURL          string                  `json:"mediaUrl" gorm:"type:varchar(1024)"`
	MimeType          string                  `json:"mimeType" gorm:"type:varchar(255)"`
	FileSize          int64                   `json:"fileSize"`
	IsReadByUser      bool                    `json:"isReadByUser" gorm:"default:false;index"`
	TelegramChatID    int64                   `json:"telegramChatId" gorm:"index"`
	TelegramMessageID int64                   `json:"telegramMessageId" gorm:"index"`
	SentAt            time.Time               `json:"sentAt" gorm:"index"`
}

// SupportOperatorRelay maps messages posted in operator chat back to user conversations.
type SupportOperatorRelay struct {
	gorm.Model
	ConversationID    uint   `json:"conversationId" gorm:"index;not null"`
	SupportMessageID  *uint  `json:"supportMessageId" gorm:"index"`
	OperatorChatID    int64  `json:"operatorChatId" gorm:"index;not null"`
	OperatorMessageID int64  `json:"operatorMessageId" gorm:"uniqueIndex;not null"`
	UserChatID        int64  `json:"userChatId" gorm:"index;not null"`
	UserTelegramID    int64  `json:"userTelegramId" gorm:"index;not null"`
	RelayKind         string `json:"relayKind" gorm:"type:varchar(50);not null"`
}

// SupportFAQItem is a simple FAQ KB used before LLM for support answers.
type SupportFAQItem struct {
	gorm.Model
	Question string `json:"question" gorm:"type:text;not null"`
	Answer   string `json:"answer" gorm:"type:text;not null"`
	Keywords string `json:"keywords" gorm:"type:text"` // comma-separated
	Priority int    `json:"priority" gorm:"default:0;index"`
	IsActive bool   `json:"isActive" gorm:"default:true;index"`
}

// SupportTelegramUpdate tracks processed webhook updates for idempotency.
type SupportTelegramUpdate struct {
	gorm.Model
	UpdateID    int64     `json:"updateId" gorm:"uniqueIndex;not null"`
	ProcessedAt time.Time `json:"processedAt" gorm:"index;not null"`
}

func (SupportContact) TableName() string {
	return "support_contacts"
}

func (SupportConversation) TableName() string {
	return "support_conversations"
}

func (SupportMessage) TableName() string {
	return "support_messages"
}

func (SupportOperatorRelay) TableName() string {
	return "support_operator_relays"
}

func (SupportFAQItem) TableName() string {
	return "support_faq_items"
}

func (SupportTelegramUpdate) TableName() string {
	return "support_telegram_updates"
}
