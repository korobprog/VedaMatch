package services

import (
	"errors"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

type SupportStore interface {
	MarkUpdateProcessed(updateID int64, processedAt time.Time) (alreadyProcessed bool, err error)
	UpsertContactFromTelegram(user *TelegramUser, chat *TelegramChat, now time.Time) (*models.SupportContact, error)
	TouchContactUserMessage(contactID uint, now time.Time) error
	EnsureOpenConversation(contact *models.SupportContact, chatID int64, now time.Time) (*models.SupportConversation, error)
	GetConversationByID(conversationID uint) (*models.SupportConversation, error)
	AddMessage(message *models.SupportMessage) error
	UpdateMessageMedia(messageID uint, mediaURL string, mimeType string, fileSize int64) error
	UpdateConversationActivity(conversationID uint, preview string, now time.Time) error
	MarkConversationEscalated(conversationID uint, now time.Time) error
	MarkConversationFirstResponse(conversationID uint, now time.Time) error
	CreateRelay(relay *models.SupportOperatorRelay) error
	FindRelay(operatorChatID int64, operatorMessageID int64) (*models.SupportOperatorRelay, error)
	ResolveConversation(conversationID uint, now time.Time) error
}

type GormSupportStore struct {
	db *gorm.DB
}

func NewGormSupportStore(db *gorm.DB) *GormSupportStore {
	return &GormSupportStore{db: db}
}

func (s *GormSupportStore) MarkUpdateProcessed(updateID int64, processedAt time.Time) (bool, error) {
	var existing models.SupportTelegramUpdate
	err := s.db.Where("update_id = ?", updateID).First(&existing).Error
	if err == nil {
		return true, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	update := models.SupportTelegramUpdate{
		UpdateID:    updateID,
		ProcessedAt: processedAt,
	}
	if err := s.db.Create(&update).Error; err != nil {
		// If another worker inserted concurrently, treat as already processed.
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return true, nil
		}
		return false, err
	}
	return false, nil
}

func (s *GormSupportStore) UpsertContactFromTelegram(user *TelegramUser, chat *TelegramChat, now time.Time) (*models.SupportContact, error) {
	if user == nil || chat == nil {
		return nil, errors.New("telegram user/chat is nil")
	}

	var contact models.SupportContact
	err := s.db.Where("telegram_user_id = ?", user.ID).First(&contact).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		contact = models.SupportContact{
			TelegramUserID: user.ID,
			TelegramChatID: chat.ID,
			Username:       user.Username,
			FirstName:      user.FirstName,
			LastName:       user.LastName,
			LanguageCode:   user.LanguageCode,
			LastSeenAt:     &now,
		}
		if err := s.db.Create(&contact).Error; err != nil {
			return nil, err
		}
		return &contact, nil
	}
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"telegram_chat_id": chat.ID,
		"username":         user.Username,
		"first_name":       user.FirstName,
		"last_name":        user.LastName,
		"language_code":    user.LanguageCode,
		"last_seen_at":     &now,
	}
	if err := s.db.Model(&contact).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&contact, contact.ID).Error; err != nil {
		return nil, err
	}

	return &contact, nil
}

func (s *GormSupportStore) TouchContactUserMessage(contactID uint, now time.Time) error {
	return s.db.Model(&models.SupportContact{}).Where("id = ?", contactID).Updates(map[string]interface{}{
		"last_user_message": &now,
		"last_seen_at":      &now,
	}).Error
}

func (s *GormSupportStore) EnsureOpenConversation(contact *models.SupportContact, chatID int64, now time.Time) (*models.SupportConversation, error) {
	if contact == nil {
		return nil, errors.New("contact is nil")
	}

	var conversation models.SupportConversation
	err := s.db.Where("contact_id = ? AND status = ?", contact.ID, models.SupportConversationStatusOpen).
		Order("id DESC").
		First(&conversation).Error
	if err == nil {
		return &conversation, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	conversation = models.SupportConversation{
		ContactID:      &contact.ID,
		Channel:        models.SupportConversationChannelTelegram,
		Status:         models.SupportConversationStatusOpen,
		TelegramChatID: chatID,
		LastMessageAt:  &now,
	}
	if err := s.db.Create(&conversation).Error; err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (s *GormSupportStore) GetConversationByID(conversationID uint) (*models.SupportConversation, error) {
	var conversation models.SupportConversation
	if err := s.db.First(&conversation, conversationID).Error; err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (s *GormSupportStore) AddMessage(message *models.SupportMessage) error {
	if message == nil {
		return errors.New("message is nil")
	}
	return s.db.Create(message).Error
}

func (s *GormSupportStore) UpdateMessageMedia(messageID uint, mediaURL string, mimeType string, fileSize int64) error {
	return s.db.Model(&models.SupportMessage{}).Where("id = ?", messageID).Updates(map[string]interface{}{
		"media_url": mediaURL,
		"mime_type": mimeType,
		"file_size": fileSize,
	}).Error
}

func (s *GormSupportStore) UpdateConversationActivity(conversationID uint, preview string, now time.Time) error {
	return s.db.Model(&models.SupportConversation{}).Where("id = ?", conversationID).Updates(map[string]interface{}{
		"last_message_at":      &now,
		"last_message_preview": preview,
	}).Error
}

func (s *GormSupportStore) MarkConversationEscalated(conversationID uint, now time.Time) error {
	return s.db.Model(&models.SupportConversation{}).Where("id = ?", conversationID).Updates(map[string]interface{}{
		"escalated_to_operator": true,
		"escalated_at":          &now,
		"last_message_at":       &now,
	}).Error
}

func (s *GormSupportStore) MarkConversationFirstResponse(conversationID uint, now time.Time) error {
	return s.db.Model(&models.SupportConversation{}).
		Where("id = ? AND first_response_at IS NULL", conversationID).
		Update("first_response_at", &now).Error
}

func (s *GormSupportStore) CreateRelay(relay *models.SupportOperatorRelay) error {
	if relay == nil {
		return errors.New("relay is nil")
	}
	return s.db.Create(relay).Error
}

func (s *GormSupportStore) FindRelay(operatorChatID int64, operatorMessageID int64) (*models.SupportOperatorRelay, error) {
	var relay models.SupportOperatorRelay
	if err := s.db.Where("operator_chat_id = ? AND operator_message_id = ?", operatorChatID, operatorMessageID).
		First(&relay).Error; err != nil {
		return nil, err
	}
	return &relay, nil
}

func (s *GormSupportStore) ResolveConversation(conversationID uint, now time.Time) error {
	return s.db.Model(&models.SupportConversation{}).Where("id = ?", conversationID).Updates(map[string]interface{}{
		"status":      models.SupportConversationStatusResolved,
		"resolved_at": &now,
	}).Error
}
