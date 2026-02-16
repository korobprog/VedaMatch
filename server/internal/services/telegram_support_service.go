package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

type TelegramUpdate struct {
	UpdateID int64            `json:"update_id"`
	Message  *TelegramMessage `json:"message,omitempty"`
}

type TelegramMessage struct {
	MessageID      int64               `json:"message_id"`
	Date           int64               `json:"date"`
	Text           string              `json:"text,omitempty"`
	Caption        string              `json:"caption,omitempty"`
	From           *TelegramUser       `json:"from,omitempty"`
	Chat           *TelegramChat       `json:"chat,omitempty"`
	Photo          []TelegramPhotoSize `json:"photo,omitempty"`
	ReplyToMessage *TelegramMessage    `json:"reply_to_message,omitempty"`
}

type TelegramUser struct {
	ID           int64  `json:"id"`
	IsBot        bool   `json:"is_bot"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name,omitempty"`
	Username     string `json:"username,omitempty"`
	LanguageCode string `json:"language_code,omitempty"`
}

type TelegramChat struct {
	ID       int64  `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title,omitempty"`
	Username string `json:"username,omitempty"`
}

type TelegramPhotoSize struct {
	FileID   string `json:"file_id"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FileSize int64  `json:"file_size,omitempty"`
}

type TelegramSupportService struct {
	store            SupportStore
	client           TelegramSupportClient
	mediaStorage     SupportMediaStorage
	aiResponder      SupportAIResponder
	settingsProvider func(key string) string
	now              func() time.Time
}

func NewTelegramSupportService(db *gorm.DB) *TelegramSupportService {
	svc := &TelegramSupportService{
		store:        NewGormSupportStore(db),
		mediaStorage: NewDefaultSupportMediaStorage(),
		aiResponder:  NewSupportAIService(db),
		now:          time.Now,
	}
	svc.settingsProvider = func(key string) string {
		return strings.TrimSpace(getSupportSetting(db, key))
	}
	svc.client = NewTelegramSupportHTTPClient(func() string {
		if svc.settingsProvider == nil {
			return ""
		}
		return svc.settingsProvider("SUPPORT_TELEGRAM_BOT_TOKEN")
	})
	return svc
}

func NewTelegramSupportServiceWithDeps(
	store SupportStore,
	client TelegramSupportClient,
	mediaStorage SupportMediaStorage,
	aiResponder SupportAIResponder,
	settingsProvider func(string) string,
) *TelegramSupportService {
	return &TelegramSupportService{
		store:            store,
		client:           client,
		mediaStorage:     mediaStorage,
		aiResponder:      aiResponder,
		settingsProvider: settingsProvider,
		now:              time.Now,
	}
}

func getSupportSetting(db *gorm.DB, key string) string {
	if db != nil {
		var setting models.SystemSetting
		if err := db.Where("key = ?", key).First(&setting).Error; err == nil && setting.Value != "" {
			return setting.Value
		}
	}
	return os.Getenv(key)
}

func (s *TelegramSupportService) ProcessUpdate(ctx context.Context, update *TelegramUpdate) error {
	if update == nil {
		return nil
	}
	if s.store == nil {
		return errors.New("support store is not configured")
	}

	now := s.nowUTC()
	processed, err := s.store.MarkUpdateProcessed(update.UpdateID, now)
	if err != nil {
		return err
	}
	if processed {
		return nil
	}

	if update.Message == nil || update.Message.Chat == nil {
		return nil
	}

	operatorChatID := s.operatorChatID()
	if operatorChatID != 0 && update.Message.Chat.ID == operatorChatID {
		return s.handleOperatorMessage(ctx, update.Message, operatorChatID)
	}

	if update.Message.From != nil && update.Message.From.IsBot {
		return nil
	}

	return s.handleUserMessage(ctx, update.Message, operatorChatID)
}

func (s *TelegramSupportService) handleUserMessage(ctx context.Context, msg *TelegramMessage, operatorChatID int64) error {
	if msg == nil || msg.Chat == nil || msg.From == nil {
		return nil
	}

	now := s.nowUTC()
	contact, err := s.store.UpsertContactFromTelegram(msg.From, msg.Chat, now)
	if err != nil {
		return err
	}
	conversation, err := s.store.EnsureOpenConversation(contact, msg.Chat.ID, now)
	if err != nil {
		return err
	}

	text := strings.TrimSpace(msg.Text)
	if strings.HasPrefix(strings.ToLower(text), "/start") {
		return s.sendStartMessage(ctx, conversation.ID, msg.Chat.ID)
	}

	if len(msg.Photo) > 0 {
		return s.handleUserPhoto(ctx, contact, conversation, msg, operatorChatID)
	}

	userText := text
	if userText == "" {
		userText = strings.TrimSpace(msg.Caption)
	}
	if userText == "" {
		return nil
	}

	if err := s.store.TouchContactUserMessage(contact.ID, now); err != nil {
		log.Printf("[Support] touch contact failed: %v", err)
	}

	inbound := &models.SupportMessage{
		ConversationID:    conversation.ID,
		Direction:         models.SupportMessageDirectionInbound,
		Source:            models.SupportMessageSourceUser,
		Type:              models.SupportMessageTypeText,
		Text:              userText,
		TelegramChatID:    msg.Chat.ID,
		TelegramMessageID: msg.MessageID,
		SentAt:            now,
	}
	if err := s.store.AddMessage(inbound); err != nil {
		return err
	}
	if err := s.store.UpdateConversationActivity(conversation.ID, s.preview(userText), now); err != nil {
		log.Printf("[Support] update conversation activity failed: %v", err)
	}

	if s.shouldEscalateByKeyword(userText) {
		return s.escalateToOperator(ctx, conversation.ID, msg.Chat.ID, msg.MessageID, contact.TelegramUserID, inbound.ID, operatorChatID,
			"Передаю вопрос оператору. Мы ответим в этом чате.")
	}

	if !s.aiEnabled() || s.aiResponder == nil {
		return s.escalateToOperator(ctx, conversation.ID, msg.Chat.ID, msg.MessageID, contact.TelegramUserID, inbound.ID, operatorChatID,
			"Передаю вопрос оператору. Мы ответим в этом чате.")
	}

	reply, confidence, err := s.aiResponder.GenerateReply(ctx, userText, s.detectLanguage(contact, userText))
	if err != nil {
		log.Printf("[Support] ai responder failed: %v", err)
		return s.escalateToOperator(ctx, conversation.ID, msg.Chat.ID, msg.MessageID, contact.TelegramUserID, inbound.ID, operatorChatID,
			"Не удалось дать точный авто-ответ. Передаю вопрос оператору.")
	}
	if confidence < s.aiThreshold() {
		return s.escalateToOperator(ctx, conversation.ID, msg.Chat.ID, msg.MessageID, contact.TelegramUserID, inbound.ID, operatorChatID,
			"Для точного ответа подключаю оператора.")
	}

	return s.sendAndPersistText(ctx, conversation.ID, msg.Chat.ID, models.SupportMessageSourceBot, reply)
}

func (s *TelegramSupportService) handleUserPhoto(
	ctx context.Context,
	contact *models.SupportContact,
	conversation *models.SupportConversation,
	msg *TelegramMessage,
	operatorChatID int64,
) error {
	if contact == nil || conversation == nil || msg == nil || msg.Chat == nil {
		return nil
	}

	now := s.nowUTC()
	if err := s.store.TouchContactUserMessage(contact.ID, now); err != nil {
		log.Printf("[Support] touch contact failed: %v", err)
	}

	caption := strings.TrimSpace(msg.Caption)
	inbound := &models.SupportMessage{
		ConversationID:    conversation.ID,
		Direction:         models.SupportMessageDirectionInbound,
		Source:            models.SupportMessageSourceUser,
		Type:              models.SupportMessageTypeImage,
		Caption:           caption,
		TelegramChatID:    msg.Chat.ID,
		TelegramMessageID: msg.MessageID,
		SentAt:            now,
	}
	if err := s.store.AddMessage(inbound); err != nil {
		return err
	}
	if err := s.store.UpdateConversationActivity(conversation.ID, s.preview("[image] "+caption), now); err != nil {
		log.Printf("[Support] update conversation activity failed: %v", err)
	}

	savedMediaURL := ""
	// Screenshot flow intentionally has no AI processing.
	if photo := selectBestPhoto(msg.Photo); photo != nil && s.client != nil && s.mediaStorage != nil {
		if fileInfo, err := s.client.GetFile(ctx, photo.FileID); err == nil && fileInfo != nil && fileInfo.FilePath != "" {
			if downloaded, err := s.client.DownloadFile(ctx, fileInfo.FilePath); err == nil && downloaded != nil {
				key := BuildSupportScreenshotKey(msg.Chat.ID, msg.MessageID, downloaded.FileName)
				mediaURL, fileSize, saveErr := s.mediaStorage.Save(ctx, key, downloaded.ContentType, downloaded.Bytes)
				if saveErr == nil {
					savedMediaURL = mediaURL
					if err := s.store.UpdateMessageMedia(inbound.ID, mediaURL, downloaded.ContentType, fileSize); err != nil {
						log.Printf("[Support] update image message media failed: %v", err)
					}
				}
			}
		}
	}

	if operatorChatID == 0 || s.client == nil {
		return s.sendAndPersistText(ctx, conversation.ID, msg.Chat.ID, models.SupportMessageSourceBot,
			"Скриншот получен. Оператор свяжется с вами при первой возможности.")
	}

	copiedMessageID, err := s.client.CopyMessage(ctx, operatorChatID, msg.Chat.ID, msg.MessageID)
	if err != nil {
		log.Printf("[Support] failed to copy screenshot to operator chat: %v", err)
		return s.sendAndPersistText(ctx, conversation.ID, msg.Chat.ID, models.SupportMessageSourceBot,
			"Скриншот получен. Передаю оператору.")
	}

	supportMessageID := inbound.ID
	if err := s.store.CreateRelay(&models.SupportOperatorRelay{
		ConversationID:    conversation.ID,
		SupportMessageID:  &supportMessageID,
		OperatorChatID:    operatorChatID,
		OperatorMessageID: copiedMessageID,
		UserChatID:        msg.Chat.ID,
		UserTelegramID:    contact.TelegramUserID,
		RelayKind:         "user_image",
	}); err != nil {
		log.Printf("[Support] create relay for screenshot failed: %v", err)
	}

	techText := s.buildOperatorTechText(conversation.ID, msg.Chat.ID, now, caption, savedMediaURL)
	metaMessageID, sendErr := s.client.SendMessage(ctx, operatorChatID, techText, TelegramSendMessageOptions{})
	if sendErr == nil {
		if err := s.store.CreateRelay(&models.SupportOperatorRelay{
			ConversationID:    conversation.ID,
			OperatorChatID:    operatorChatID,
			OperatorMessageID: metaMessageID,
			UserChatID:        msg.Chat.ID,
			UserTelegramID:    contact.TelegramUserID,
			RelayKind:         "operator_meta",
		}); err != nil {
			log.Printf("[Support] create relay for meta message failed: %v", err)
		}
	}

	if err := s.store.MarkConversationEscalated(conversation.ID, now); err != nil {
		log.Printf("[Support] mark escalated failed: %v", err)
	}

	return s.sendAndPersistText(ctx, conversation.ID, msg.Chat.ID, models.SupportMessageSourceBot,
		"Скриншот передан оператору. Ответ придет в этом чате.")
}

func (s *TelegramSupportService) handleOperatorMessage(ctx context.Context, msg *TelegramMessage, operatorChatID int64) error {
	if msg == nil || msg.Chat == nil {
		return nil
	}

	text := strings.TrimSpace(msg.Text)
	if strings.HasPrefix(strings.ToLower(text), "/chatid") {
		_, _ = s.client.SendMessage(ctx, operatorChatID, fmt.Sprintf("chat_id: %d", operatorChatID), TelegramSendMessageOptions{})
		return nil
	}

	if strings.HasPrefix(strings.ToLower(text), "/send ") {
		return s.handleOperatorDirectSend(ctx, text, operatorChatID)
	}

	if strings.HasPrefix(strings.ToLower(text), "/resolve") {
		return s.handleOperatorResolve(ctx, msg, operatorChatID)
	}

	if msg.ReplyToMessage == nil {
		return nil
	}

	relay, err := s.store.FindRelay(operatorChatID, msg.ReplyToMessage.MessageID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return nil
	}

	now := s.nowUTC()

	if len(msg.Photo) > 0 {
		copiedID, err := s.client.CopyMessage(ctx, relay.UserChatID, operatorChatID, msg.MessageID)
		if err != nil {
			return err
		}
		outbound := &models.SupportMessage{
			ConversationID:    relay.ConversationID,
			Direction:         models.SupportMessageDirectionOutbound,
			Source:            models.SupportMessageSourceOperator,
			Type:              models.SupportMessageTypeImage,
			Caption:           strings.TrimSpace(msg.Caption),
			TelegramChatID:    relay.UserChatID,
			TelegramMessageID: copiedID,
			SentAt:            now,
		}
		if err := s.store.AddMessage(outbound); err != nil {
			return err
		}
		_ = s.store.UpdateConversationActivity(relay.ConversationID, s.preview("[operator image] "+outbound.Caption), now)
		return nil
	}

	operatorText := strings.TrimSpace(msg.Text)
	if operatorText == "" {
		operatorText = strings.TrimSpace(msg.Caption)
	}
	if operatorText == "" {
		return nil
	}

	return s.sendTextToUserFromOperator(ctx, relay.ConversationID, relay.UserChatID, operatorText, now)
}

func (s *TelegramSupportService) handleOperatorDirectSend(ctx context.Context, text string, operatorChatID int64) error {
	if s.client == nil {
		return errors.New("telegram support client is not configured")
	}

	parts := strings.SplitN(strings.TrimSpace(text), " ", 3)
	if len(parts) < 3 {
		_, _ = s.client.SendMessage(ctx, operatorChatID, "Usage: /send <chat_id> <text>", TelegramSendMessageOptions{})
		return nil
	}

	chatID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		_, _ = s.client.SendMessage(ctx, operatorChatID, "Invalid chat_id", TelegramSendMessageOptions{})
		return nil
	}

	_, err = s.client.SendMessage(ctx, chatID, strings.TrimSpace(parts[2]), TelegramSendMessageOptions{})
	if err != nil {
		_, _ = s.client.SendMessage(ctx, operatorChatID, "Direct send failed: "+err.Error(), TelegramSendMessageOptions{})
		return nil
	}

	_, _ = s.client.SendMessage(ctx, operatorChatID, "Direct send: ok", TelegramSendMessageOptions{})
	return nil
}

func (s *TelegramSupportService) handleOperatorResolve(ctx context.Context, msg *TelegramMessage, operatorChatID int64) error {
	if msg == nil {
		return nil
	}
	if msg.ReplyToMessage == nil {
		_, _ = s.client.SendMessage(ctx, operatorChatID, "Use /resolve as reply to a support message", TelegramSendMessageOptions{})
		return nil
	}

	relay, err := s.store.FindRelay(operatorChatID, msg.ReplyToMessage.MessageID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		_, _ = s.client.SendMessage(ctx, operatorChatID, "No support relay found for this message", TelegramSendMessageOptions{})
		return nil
	}

	if err := s.store.ResolveConversation(relay.ConversationID, s.nowUTC()); err != nil {
		return err
	}

	_, _ = s.client.SendMessage(ctx, operatorChatID, "Conversation resolved", TelegramSendMessageOptions{})
	_, _ = s.client.SendMessage(ctx, relay.UserChatID, "Диалог поддержки завершен. При необходимости напишите снова.", TelegramSendMessageOptions{})
	return nil
}

func (s *TelegramSupportService) sendTextToUserFromOperator(ctx context.Context, conversationID uint, chatID int64, text string, now time.Time) error {
	messageID, err := s.client.SendMessage(ctx, chatID, text, TelegramSendMessageOptions{})
	if err != nil {
		return err
	}
	outbound := &models.SupportMessage{
		ConversationID:    conversationID,
		Direction:         models.SupportMessageDirectionOutbound,
		Source:            models.SupportMessageSourceOperator,
		Type:              models.SupportMessageTypeText,
		Text:              text,
		TelegramChatID:    chatID,
		TelegramMessageID: messageID,
		SentAt:            now,
	}
	if err := s.store.AddMessage(outbound); err != nil {
		return err
	}
	return s.store.UpdateConversationActivity(conversationID, s.preview(text), now)
}

func (s *TelegramSupportService) sendStartMessage(ctx context.Context, conversationID uint, chatID int64) error {
	if s.client == nil {
		return errors.New("telegram support client is not configured")
	}

	message := "Welcome to VedaMatch support.\nChoose an option below or send your question."
	replyMarkup := s.buildStartButtons()

	messageID, err := s.client.SendMessage(ctx, chatID, message, TelegramSendMessageOptions{
		ReplyMarkup: replyMarkup,
	})
	if err != nil {
		return err
	}

	now := s.nowUTC()
	outbound := &models.SupportMessage{
		ConversationID:    conversationID,
		Direction:         models.SupportMessageDirectionOutbound,
		Source:            models.SupportMessageSourceBot,
		Type:              models.SupportMessageTypeText,
		Text:              message,
		TelegramChatID:    chatID,
		TelegramMessageID: messageID,
		SentAt:            now,
	}
	if err := s.store.AddMessage(outbound); err != nil {
		return err
	}
	return s.store.UpdateConversationActivity(conversationID, s.preview(message), now)
}

func (s *TelegramSupportService) sendAndPersistText(ctx context.Context, conversationID uint, chatID int64, source models.SupportMessageSource, text string) error {
	if s.client == nil {
		return errors.New("telegram support client is not configured")
	}
	now := s.nowUTC()
	messageID, err := s.client.SendMessage(ctx, chatID, strings.TrimSpace(text), TelegramSendMessageOptions{})
	if err != nil {
		return err
	}

	outbound := &models.SupportMessage{
		ConversationID:    conversationID,
		Direction:         models.SupportMessageDirectionOutbound,
		Source:            source,
		Type:              models.SupportMessageTypeText,
		Text:              strings.TrimSpace(text),
		TelegramChatID:    chatID,
		TelegramMessageID: messageID,
		SentAt:            now,
	}
	if err := s.store.AddMessage(outbound); err != nil {
		return err
	}

	return s.store.UpdateConversationActivity(conversationID, s.preview(outbound.Text), now)
}

func (s *TelegramSupportService) escalateToOperator(
	ctx context.Context,
	conversationID uint,
	userChatID int64,
	userMessageID int64,
	userTelegramID int64,
	supportMessageID uint,
	operatorChatID int64,
	userAck string,
) error {
	if operatorChatID == 0 || s.client == nil {
		return s.sendAndPersistText(ctx, conversationID, userChatID, models.SupportMessageSourceBot,
			"Операторы сейчас недоступны. Пожалуйста, попробуйте позже.")
	}

	now := s.nowUTC()
	copiedID, err := s.client.CopyMessage(ctx, operatorChatID, userChatID, userMessageID)
	if err == nil {
		if err := s.store.CreateRelay(&models.SupportOperatorRelay{
			ConversationID:    conversationID,
			SupportMessageID:  &supportMessageID,
			OperatorChatID:    operatorChatID,
			OperatorMessageID: copiedID,
			UserChatID:        userChatID,
			UserTelegramID:    userTelegramID,
			RelayKind:         "user_message",
		}); err != nil {
			log.Printf("[Support] create relay failed: %v", err)
		}
	}

	techText := s.buildOperatorTechText(conversationID, userChatID, now, "", "")
	if metaID, sendErr := s.client.SendMessage(ctx, operatorChatID, techText, TelegramSendMessageOptions{}); sendErr == nil {
		if err := s.store.CreateRelay(&models.SupportOperatorRelay{
			ConversationID:    conversationID,
			OperatorChatID:    operatorChatID,
			OperatorMessageID: metaID,
			UserChatID:        userChatID,
			UserTelegramID:    userTelegramID,
			RelayKind:         "operator_meta",
		}); err != nil {
			log.Printf("[Support] create meta relay failed: %v", err)
		}
	}

	if err := s.store.MarkConversationEscalated(conversationID, now); err != nil {
		log.Printf("[Support] mark escalated failed: %v", err)
	}

	return s.sendAndPersistText(ctx, conversationID, userChatID, models.SupportMessageSourceBot, userAck)
}

func (s *TelegramSupportService) buildStartButtons() map[string]interface{} {
	rows := make([][]map[string]string, 0, 3)
	addButton := func(text, url string) {
		url = strings.TrimSpace(url)
		if url == "" {
			return
		}
		rows = append(rows, []map[string]string{
			{
				"text": text,
				"url":  url,
			},
		})
	}

	addButton("Download iOS", s.getSetting("SUPPORT_DOWNLOAD_IOS_URL"))
	addButton("Download Android", s.getSetting("SUPPORT_DOWNLOAD_ANDROID_URL"))
	addButton("Our Channel", s.getSetting("SUPPORT_CHANNEL_URL"))

	if len(rows) == 0 {
		return nil
	}
	return map[string]interface{}{
		"inline_keyboard": rows,
	}
}

func (s *TelegramSupportService) buildOperatorTechText(conversationID uint, telegramChatID int64, now time.Time, caption string, mediaURL string) string {
	lines := []string{
		"[support]",
		fmt.Sprintf("conversation_id: %d", conversationID),
		fmt.Sprintf("telegram_chat_id: %d", telegramChatID),
		fmt.Sprintf("time: %s", now.Format(time.RFC3339)),
	}
	if caption != "" {
		lines = append(lines, "caption: "+caption)
	}
	if mediaURL != "" {
		lines = append(lines, "media_url: "+mediaURL)
	}
	lines = append(lines, "Reply to this message to answer the user.")
	return strings.Join(lines, "\n")
}

func (s *TelegramSupportService) detectLanguage(contact *models.SupportContact, userText string) string {
	mode := strings.ToLower(strings.TrimSpace(s.getSetting("SUPPORT_LANG_MODE")))
	if mode == "ru" {
		return "ru"
	}

	if contact != nil && strings.HasPrefix(strings.ToLower(strings.TrimSpace(contact.LanguageCode)), "ru") {
		return "ru"
	}
	if containsCyrillic(userText) {
		return "ru"
	}
	return "en"
}

func (s *TelegramSupportService) operatorChatID() int64 {
	raw := strings.TrimSpace(s.getSetting("SUPPORT_TELEGRAM_OPERATOR_CHAT_ID"))
	if raw == "" {
		return 0
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0
	}
	return id
}

func (s *TelegramSupportService) aiEnabled() bool {
	raw := strings.ToLower(strings.TrimSpace(s.getSetting("SUPPORT_AI_ENABLED")))
	if raw == "" {
		return true
	}
	return raw == "1" || raw == "true" || raw == "yes" || raw == "on"
}

func (s *TelegramSupportService) aiThreshold() float64 {
	raw := strings.TrimSpace(s.getSetting("SUPPORT_AI_CONFIDENCE_THRESHOLD"))
	if raw == "" {
		return 0.55
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0.55
	}
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}

func (s *TelegramSupportService) shouldEscalateByKeyword(text string) bool {
	lowerText := strings.ToLower(strings.TrimSpace(text))
	if lowerText == "" {
		return false
	}

	keywords := s.getSetting("SUPPORT_AI_ESCALATION_KEYWORDS")
	if keywords == "" {
		keywords = "оператор,не помогло,жалоба,support,human"
	}

	for _, item := range strings.Split(keywords, ",") {
		keyword := strings.ToLower(strings.TrimSpace(item))
		if keyword == "" {
			continue
		}
		if strings.Contains(lowerText, keyword) {
			return true
		}
	}
	return false
}

func (s *TelegramSupportService) getSetting(key string) string {
	if s.settingsProvider == nil {
		return ""
	}
	return strings.TrimSpace(s.settingsProvider(key))
}

func (s *TelegramSupportService) nowUTC() time.Time {
	if s.now == nil {
		return time.Now().UTC()
	}
	return s.now().UTC()
}

func (s *TelegramSupportService) preview(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	if len(text) > 300 {
		return text[:300]
	}
	return text
}

func selectBestPhoto(items []TelegramPhotoSize) *TelegramPhotoSize {
	if len(items) == 0 {
		return nil
	}
	best := items[0]
	for _, item := range items[1:] {
		if item.FileSize > best.FileSize {
			best = item
		}
	}
	if best.FileID == "" {
		return &items[len(items)-1]
	}
	return &best
}

func containsCyrillic(text string) bool {
	for _, r := range text {
		if (r >= 'А' && r <= 'я') || r == 'ё' || r == 'Ё' {
			return true
		}
	}
	return false
}

func (s *TelegramSupportService) SendDirectMessage(ctx context.Context, chatID int64, text string) error {
	if s.client == nil {
		return errors.New("telegram support client is not configured")
	}
	if chatID == 0 {
		return errors.New("chat id is required")
	}
	if strings.TrimSpace(text) == "" {
		return errors.New("text is required")
	}
	_, err := s.client.SendMessage(ctx, chatID, strings.TrimSpace(text), TelegramSendMessageOptions{})
	return err
}
