package services

import (
	"context"
	"errors"
	"fmt"
	"rag-agent-server/internal/models"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"gorm.io/gorm"
)

type memorySupportStore struct {
	updates                   map[int64]bool
	contactsByTelegram        map[int64]*models.SupportContact
	conversationsByID         map[uint]*models.SupportConversation
	openConversationByContact map[uint]uint
	messages                  map[uint]*models.SupportMessage
	messageOrder              []uint
	relaysByOperatorMsg       map[string]*models.SupportOperatorRelay
	nextContactID             uint
	nextConversationID        uint
	nextMessageID             uint
	nextRelayID               uint
}

func newMemorySupportStore() *memorySupportStore {
	return &memorySupportStore{
		updates:                   map[int64]bool{},
		contactsByTelegram:        map[int64]*models.SupportContact{},
		conversationsByID:         map[uint]*models.SupportConversation{},
		openConversationByContact: map[uint]uint{},
		messages:                  map[uint]*models.SupportMessage{},
		relaysByOperatorMsg:       map[string]*models.SupportOperatorRelay{},
	}
}

func (s *memorySupportStore) MarkUpdateProcessed(updateID int64, _ time.Time) (bool, error) {
	if s.updates[updateID] {
		return true, nil
	}
	s.updates[updateID] = true
	return false, nil
}

func (s *memorySupportStore) UpsertContactFromTelegram(user *TelegramUser, chat *TelegramChat, now time.Time) (*models.SupportContact, error) {
	if user == nil || chat == nil {
		return nil, errors.New("missing user/chat")
	}
	existing := s.contactsByTelegram[user.ID]
	if existing != nil {
		existing.TelegramChatID = chat.ID
		existing.Username = user.Username
		existing.FirstName = user.FirstName
		existing.LastName = user.LastName
		existing.LanguageCode = user.LanguageCode
		existing.LastSeenAt = &now
		return existing, nil
	}
	s.nextContactID++
	contact := &models.SupportContact{
		Model:          gorm.Model{ID: s.nextContactID},
		TelegramUserID: user.ID,
		TelegramChatID: chat.ID,
		Username:       user.Username,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		LanguageCode:   user.LanguageCode,
		LastSeenAt:     &now,
	}
	s.contactsByTelegram[user.ID] = contact
	return contact, nil
}

func (s *memorySupportStore) TouchContactUserMessage(contactID uint, now time.Time) error {
	for _, c := range s.contactsByTelegram {
		if c.ID == contactID {
			c.LastUserMessage = &now
			c.LastSeenAt = &now
			return nil
		}
	}
	return nil
}

func (s *memorySupportStore) EnsureOpenConversation(contact *models.SupportContact, chatID int64, now time.Time) (*models.SupportConversation, error) {
	if contact == nil {
		return nil, errors.New("contact is nil")
	}
	if existingID, ok := s.openConversationByContact[contact.ID]; ok {
		return s.conversationsByID[existingID], nil
	}
	s.nextConversationID++
	conversation := &models.SupportConversation{
		Model:          gorm.Model{ID: s.nextConversationID},
		ContactID:      &contact.ID,
		Channel:        models.SupportConversationChannelTelegram,
		Status:         models.SupportConversationStatusOpen,
		TelegramChatID: chatID,
		LastMessageAt:  &now,
	}
	s.conversationsByID[conversation.ID] = conversation
	s.openConversationByContact[contact.ID] = conversation.ID
	return conversation, nil
}

func (s *memorySupportStore) GetConversationByID(conversationID uint) (*models.SupportConversation, error) {
	conversation := s.conversationsByID[conversationID]
	if conversation == nil {
		return nil, gorm.ErrRecordNotFound
	}
	copyConversation := *conversation
	return &copyConversation, nil
}

func (s *memorySupportStore) AddMessage(message *models.SupportMessage) error {
	if message == nil {
		return errors.New("message is nil")
	}
	s.nextMessageID++
	message.ID = s.nextMessageID
	copyMessage := *message
	s.messages[message.ID] = &copyMessage
	s.messageOrder = append(s.messageOrder, message.ID)
	return nil
}

func (s *memorySupportStore) UpdateMessageMedia(messageID uint, mediaURL string, mimeType string, fileSize int64) error {
	msg := s.messages[messageID]
	if msg == nil {
		return gorm.ErrRecordNotFound
	}
	msg.MediaURL = mediaURL
	msg.MimeType = mimeType
	msg.FileSize = fileSize
	return nil
}

func (s *memorySupportStore) UpdateConversationActivity(conversationID uint, preview string, now time.Time) error {
	conv := s.conversationsByID[conversationID]
	if conv == nil {
		return gorm.ErrRecordNotFound
	}
	conv.LastMessagePreview = preview
	conv.LastMessageAt = &now
	return nil
}

func (s *memorySupportStore) MarkConversationEscalated(conversationID uint, now time.Time) error {
	conv := s.conversationsByID[conversationID]
	if conv == nil {
		return gorm.ErrRecordNotFound
	}
	conv.EscalatedToOperator = true
	conv.EscalatedAt = &now
	return nil
}

func (s *memorySupportStore) MarkConversationFirstResponse(conversationID uint, now time.Time) error {
	conv := s.conversationsByID[conversationID]
	if conv == nil {
		return gorm.ErrRecordNotFound
	}
	if conv.FirstResponseAt == nil {
		conv.FirstResponseAt = &now
	}
	return nil
}

func (s *memorySupportStore) CreateRelay(relay *models.SupportOperatorRelay) error {
	if relay == nil {
		return errors.New("relay is nil")
	}
	s.nextRelayID++
	relay.ID = s.nextRelayID
	key := fmt.Sprintf("%d:%d", relay.OperatorChatID, relay.OperatorMessageID)
	copyRelay := *relay
	s.relaysByOperatorMsg[key] = &copyRelay
	return nil
}

func (s *memorySupportStore) FindRelay(operatorChatID int64, operatorMessageID int64) (*models.SupportOperatorRelay, error) {
	key := fmt.Sprintf("%d:%d", operatorChatID, operatorMessageID)
	relay := s.relaysByOperatorMsg[key]
	if relay == nil {
		return nil, gorm.ErrRecordNotFound
	}
	copyRelay := *relay
	return &copyRelay, nil
}

func (s *memorySupportStore) ResolveConversation(conversationID uint, now time.Time) error {
	conv := s.conversationsByID[conversationID]
	if conv == nil {
		return gorm.ErrRecordNotFound
	}
	conv.Status = models.SupportConversationStatusResolved
	conv.ResolvedAt = &now
	return nil
}

type fakeTelegramClient struct {
	nextMessageID int64
	sentMessages  []fakeSentMessage
	menuButtons   []fakeMenuButtonCall
	copyCalls     []fakeCopyCall
	files         map[string]*TelegramFileInfo
	downloads     map[string]*DownloadedTelegramFile
}

type fakeSentMessage struct {
	ChatID  int64
	Text    string
	Options TelegramSendMessageOptions
}

type fakeCopyCall struct {
	ToChatID      int64
	FromChatID    int64
	FromMessageID int64
	NewMessageID  int64
}

type fakeMenuButtonCall struct {
	ChatID int64
	Text   string
	URL    string
}

func newFakeTelegramClient() *fakeTelegramClient {
	return &fakeTelegramClient{
		nextMessageID: 1000,
		files:         map[string]*TelegramFileInfo{},
		downloads:     map[string]*DownloadedTelegramFile{},
	}
}

func (c *fakeTelegramClient) nextID() int64 {
	c.nextMessageID++
	return c.nextMessageID
}

func (c *fakeTelegramClient) SendMessage(_ context.Context, chatID int64, text string, options TelegramSendMessageOptions) (int64, error) {
	c.sentMessages = append(c.sentMessages, fakeSentMessage{ChatID: chatID, Text: text, Options: options})
	return c.nextID(), nil
}

func (c *fakeTelegramClient) SetChatMenuButton(_ context.Context, chatID int64, text string, webAppURL string) error {
	c.menuButtons = append(c.menuButtons, fakeMenuButtonCall{
		ChatID: chatID,
		Text:   text,
		URL:    webAppURL,
	})
	return nil
}

func (c *fakeTelegramClient) CopyMessage(_ context.Context, toChatID, fromChatID, messageID int64) (int64, error) {
	newID := c.nextID()
	c.copyCalls = append(c.copyCalls, fakeCopyCall{
		ToChatID:      toChatID,
		FromChatID:    fromChatID,
		FromMessageID: messageID,
		NewMessageID:  newID,
	})
	return newID, nil
}

func (c *fakeTelegramClient) GetFile(_ context.Context, fileID string) (*TelegramFileInfo, error) {
	info := c.files[fileID]
	if info == nil {
		return nil, errors.New("file not found")
	}
	return info, nil
}

func (c *fakeTelegramClient) DownloadFile(_ context.Context, filePath string) (*DownloadedTelegramFile, error) {
	download := c.downloads[filePath]
	if download == nil {
		return nil, errors.New("download not found")
	}
	return download, nil
}

type fakeSupportAIResponder struct {
	calls      int
	reply      string
	confidence float64
	err        error
}

func (f *fakeSupportAIResponder) GenerateReply(_ context.Context, _ string, _ string) (string, float64, error) {
	f.calls++
	return f.reply, f.confidence, f.err
}

type fakeMediaStorage struct {
	calls int
}

func (s *fakeMediaStorage) Save(_ context.Context, key string, contentType string, data []byte) (string, int64, error) {
	s.calls++
	return "https://cdn.example/" + key, int64(len(data)), nil
}

func newSettingsProvider(values map[string]string) func(string) string {
	return func(key string) string {
		return values[key]
	}
}

func TestNormalizeTelegramOutgoingText(t *testing.T) {
	t.Parallel()

	if got := normalizeTelegramOutgoingText("  hello  "); got != "hello" {
		t.Fatalf("trimmed text = %q, want hello", got)
	}
	if got := normalizeTelegramOutgoingText("   "); got != "" {
		t.Fatalf("blank text should normalize to empty, got %q", got)
	}

	long := strings.Repeat("й", telegramMaxMessageRunes+25)
	gotLong := normalizeTelegramOutgoingText(long)
	if utf8.RuneCountInString(gotLong) != telegramMaxMessageRunes {
		t.Fatalf("normalized long text rune length = %d, want %d", utf8.RuneCountInString(gotLong), telegramMaxMessageRunes)
	}
}

func TestSupportPhotoFlow_DoesNotCallAI(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{reply: "unused", confidence: 0.9}
	storage := &fakeMediaStorage{}
	client.files["photo_file"] = &TelegramFileInfo{FilePath: "files/shot.jpg", FileSize: 1234}
	client.downloads["files/shot.jpg"] = &DownloadedTelegramFile{
		Bytes:       []byte("jpeg-bytes"),
		ContentType: "image/jpeg",
		FileName:    "shot.jpg",
		FileSize:    10,
	}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
			"SUPPORT_AI_ENABLED":                "true",
		}),
	)

	update := &TelegramUpdate{
		UpdateID: 1,
		Message: &TelegramMessage{
			MessageID: 100,
			Date:      time.Now().Unix(),
			Caption:   "app crashed",
			From: &TelegramUser{
				ID:           42,
				FirstName:    "User",
				LanguageCode: "ru",
			},
			Chat: &TelegramChat{
				ID:   42,
				Type: "private",
			},
			Photo: []TelegramPhotoSize{
				{FileID: "photo_file", FileSize: 100},
			},
		},
	}

	if err := service.ProcessUpdate(context.Background(), update); err != nil {
		t.Fatalf("process update failed: %v", err)
	}

	if ai.calls != 0 {
		t.Fatalf("expected AI not to be called for photo flow, got %d", ai.calls)
	}
	if storage.calls == 0 {
		t.Fatalf("expected media storage to be used")
	}
	if len(client.copyCalls) == 0 {
		t.Fatalf("expected screenshot to be copied to operator chat")
	}

	var foundTechText bool
	for _, sent := range client.sentMessages {
		if sent.ChatID != 777 {
			continue
		}
		if strings.Contains(sent.Text, "[support]") &&
			strings.Contains(sent.Text, "conversation_id: 1") &&
			strings.Contains(sent.Text, "telegram_chat_id: 42") &&
			strings.Contains(sent.Text, "caption: app crashed") &&
			strings.Contains(sent.Text, "media_url: https://cdn.example/") {
			foundTechText = true
			break
		}
	}
	if !foundTechText {
		t.Fatalf("expected operator tech text with conversation/chat/caption/media_url")
	}

	var foundImage bool
	for _, id := range store.messageOrder {
		msg := store.messages[id]
		if msg.Type == models.SupportMessageTypeImage && msg.Direction == models.SupportMessageDirectionInbound {
			foundImage = true
			if msg.MediaURL == "" {
				t.Fatalf("expected saved media URL for screenshot")
			}
			break
		}
	}
	if !foundImage {
		t.Fatalf("expected inbound image support message")
	}
}

func TestSupportStartMessage_IncludesUsageGuide(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{}
	storage := &fakeMediaStorage{}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_DOWNLOAD_IOS_URL":     "https://apps.apple.com/app/id123",
			"SUPPORT_DOWNLOAD_ANDROID_URL": "https://play.google.com/store/apps/details?id=app",
			"SUPPORT_CHANNEL_URL":          "https://t.me/vedamatch",
		}),
	)

	update := &TelegramUpdate{
		UpdateID: 21,
		Message: &TelegramMessage{
			MessageID: 501,
			Date:      time.Now().Unix(),
			Text:      "/start",
			From: &TelegramUser{
				ID:           77,
				FirstName:    "Starter",
				LanguageCode: "ru",
			},
			Chat: &TelegramChat{
				ID:   77,
				Type: "private",
			},
		},
	}

	if err := service.ProcessUpdate(context.Background(), update); err != nil {
		t.Fatalf("start update failed: %v", err)
	}

	var gotGuide bool
	for _, sent := range client.sentMessages {
		if sent.ChatID != 77 {
			continue
		}
		if strings.Contains(sent.Text, "Как пользоваться чатом:") &&
			strings.Contains(sent.Text, "1. Опишите вопрос одним сообщением.") &&
			strings.Contains(sent.Text, "2. При необходимости прикрепите скриншот.") {
			gotGuide = true
			break
		}
	}
	if !gotGuide {
		t.Fatalf("expected /start message to include usage guide")
	}

	var hasRuButtons bool
	for _, sent := range client.sentMessages {
		if sent.ChatID != 77 || sent.Options.ReplyMarkup == nil {
			continue
		}
		rawRows, ok := sent.Options.ReplyMarkup["inline_keyboard"]
		if !ok {
			continue
		}
		rows, ok := rawRows.([][]map[string]string)
		if !ok {
			continue
		}
		var buttonTexts []string
		for _, row := range rows {
			for _, button := range row {
				buttonTexts = append(buttonTexts, button["text"])
			}
		}
		hasRuButtons = strings.Contains(strings.Join(buttonTexts, "|"), "Скачать iOS") &&
			strings.Contains(strings.Join(buttonTexts, "|"), "Скачать Android") &&
			strings.Contains(strings.Join(buttonTexts, "|"), "Наш канал")
		if hasRuButtons {
			break
		}
	}
	if !hasRuButtons {
		t.Fatalf("expected /start buttons to be in russian")
	}

	if len(client.menuButtons) == 0 {
		t.Fatalf("expected setChatMenuButton to be called for /start")
	}
	lastMenuButton := client.menuButtons[len(client.menuButtons)-1]
	if lastMenuButton.ChatID != 77 {
		t.Fatalf("menu button chat id = %d, want 77", lastMenuButton.ChatID)
	}
	if lastMenuButton.Text != "LKM кабинет" {
		t.Fatalf("menu button text = %q, want %q", lastMenuButton.Text, "LKM кабинет")
	}
	if lastMenuButton.URL != "https://lkm.vedamatch.ru/?tg=1" {
		t.Fatalf("menu button URL = %q, want %q", lastMenuButton.URL, "https://lkm.vedamatch.ru/?tg=1")
	}

	if ai.calls != 0 {
		t.Fatalf("expected AI not to be called for /start, got %d", ai.calls)
	}
}

func TestSupportStartMessage_LocalizesMiniAppMenuButtonByLanguage(t *testing.T) {
	cases := []struct {
		name         string
		languageCode string
		wantText     string
		wantURL      string
	}{
		{
			name:         "english default",
			languageCode: "en",
			wantText:     "LKM Cabinet",
			wantURL:      "https://lkm.vedamatch.com/?tg=1",
		},
		{
			name:         "hindi label",
			languageCode: "hi",
			wantText:     "LKM कैबिनेट",
			wantURL:      "https://lkm.vedamatch.com/?tg=1",
		},
		{
			name:         "russian cis domain",
			languageCode: "ru",
			wantText:     "LKM кабинет",
			wantURL:      "https://lkm.vedamatch.ru/?tg=1",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			store := newMemorySupportStore()
			client := newFakeTelegramClient()
			ai := &fakeSupportAIResponder{}
			storage := &fakeMediaStorage{}

			service := NewTelegramSupportServiceWithDeps(
				store,
				client,
				storage,
				ai,
				newSettingsProvider(map[string]string{
					"SUPPORT_DOWNLOAD_IOS_URL":     "https://apps.apple.com/app/id123",
					"SUPPORT_DOWNLOAD_ANDROID_URL": "https://play.google.com/store/apps/details?id=app",
					"SUPPORT_CHANNEL_URL":          "https://t.me/vedamatch",
				}),
			)

			update := &TelegramUpdate{
				UpdateID: 100 + int64(len(tc.name)),
				Message: &TelegramMessage{
					MessageID: 700,
					Date:      time.Now().Unix(),
					Text:      "/start",
					From: &TelegramUser{
						ID:           707,
						FirstName:    "Starter",
						LanguageCode: tc.languageCode,
					},
					Chat: &TelegramChat{
						ID:   707,
						Type: "private",
					},
				},
			}

			if err := service.ProcessUpdate(context.Background(), update); err != nil {
				t.Fatalf("start update failed: %v", err)
			}

			if len(client.menuButtons) == 0 {
				t.Fatalf("expected setChatMenuButton call")
			}
			got := client.menuButtons[len(client.menuButtons)-1]
			if got.Text != tc.wantText {
				t.Fatalf("menu button text = %q, want %q", got.Text, tc.wantText)
			}
			if got.URL != tc.wantURL {
				t.Fatalf("menu button URL = %q, want %q", got.URL, tc.wantURL)
			}
		})
	}
}

func TestSupportOperatorReplyToScreenshot_DeliversToUser(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{}
	storage := &fakeMediaStorage{}
	client.files["photo_file"] = &TelegramFileInfo{FilePath: "files/shot.jpg", FileSize: 1234}
	client.downloads["files/shot.jpg"] = &DownloadedTelegramFile{
		Bytes:       []byte("jpeg-bytes"),
		ContentType: "image/jpeg",
		FileName:    "shot.jpg",
		FileSize:    10,
	}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
			"SUPPORT_AI_ENABLED":                "true",
		}),
	)

	photoUpdate := &TelegramUpdate{
		UpdateID: 11,
		Message: &TelegramMessage{
			MessageID: 200,
			Date:      time.Now().Unix(),
			Caption:   "screen attached",
			From: &TelegramUser{
				ID:           52,
				FirstName:    "Reporter",
				LanguageCode: "en",
			},
			Chat: &TelegramChat{
				ID:   52,
				Type: "private",
			},
			Photo: []TelegramPhotoSize{
				{FileID: "photo_file", FileSize: 100},
			},
		},
	}
	if err := service.ProcessUpdate(context.Background(), photoUpdate); err != nil {
		t.Fatalf("photo update failed: %v", err)
	}
	if len(client.copyCalls) == 0 {
		t.Fatalf("expected copy call to operator chat")
	}
	operatorCopiedMessageID := client.copyCalls[0].NewMessageID

	replyUpdate := &TelegramUpdate{
		UpdateID: 12,
		Message: &TelegramMessage{
			MessageID: 300,
			Date:      time.Now().Unix(),
			Text:      "Please restart the app and try again.",
			From: &TelegramUser{
				ID:        901,
				FirstName: "Operator",
			},
			Chat: &TelegramChat{
				ID:   777,
				Type: "supergroup",
			},
			ReplyToMessage: &TelegramMessage{
				MessageID: operatorCopiedMessageID,
			},
		},
	}
	if err := service.ProcessUpdate(context.Background(), replyUpdate); err != nil {
		t.Fatalf("operator reply update failed: %v", err)
	}

	var delivered bool
	for _, sent := range client.sentMessages {
		if sent.ChatID == 52 && strings.Contains(sent.Text, "restart") {
			delivered = true
			break
		}
	}
	if !delivered {
		t.Fatalf("expected operator reply to be delivered to user chat")
	}
}

func TestSupportSmoke_ManyScreenshotsThenText(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{reply: "Auto answer", confidence: 0.9}
	storage := &fakeMediaStorage{}

	client.files["photo_file"] = &TelegramFileInfo{FilePath: "files/shot.jpg", FileSize: 1234}
	client.downloads["files/shot.jpg"] = &DownloadedTelegramFile{
		Bytes:       []byte("jpeg-bytes"),
		ContentType: "image/jpeg",
		FileName:    "shot.jpg",
		FileSize:    10,
	}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
			"SUPPORT_AI_ENABLED":                "true",
			"SUPPORT_AI_CONFIDENCE_THRESHOLD":   "0.55",
		}),
	)

	for i := 0; i < 5; i++ {
		update := &TelegramUpdate{
			UpdateID: int64(100 + i),
			Message: &TelegramMessage{
				MessageID: int64(1000 + i),
				Date:      time.Now().Unix(),
				From: &TelegramUser{
					ID:        61,
					FirstName: "Load",
				},
				Chat: &TelegramChat{
					ID:   61,
					Type: "private",
				},
				Photo: []TelegramPhotoSize{
					{FileID: "photo_file", FileSize: 100},
				},
			},
		}
		if err := service.ProcessUpdate(context.Background(), update); err != nil {
			t.Fatalf("screenshot update %d failed: %v", i, err)
		}
	}
	if ai.calls != 0 {
		t.Fatalf("expected no AI calls during screenshots, got %d", ai.calls)
	}

	textUpdate := &TelegramUpdate{
		UpdateID: 200,
		Message: &TelegramMessage{
			MessageID: 2000,
			Date:      time.Now().Unix(),
			Text:      "How can I reset password?",
			From: &TelegramUser{
				ID:        61,
				FirstName: "Load",
			},
			Chat: &TelegramChat{
				ID:   61,
				Type: "private",
			},
		},
	}
	if err := service.ProcessUpdate(context.Background(), textUpdate); err != nil {
		t.Fatalf("text update failed: %v", err)
	}
	if ai.calls != 1 {
		t.Fatalf("expected one AI call for text message, got %d", ai.calls)
	}

	var gotAutoReply bool
	for _, sent := range client.sentMessages {
		if sent.ChatID == 61 && strings.Contains(sent.Text, "Auto answer") {
			gotAutoReply = true
			break
		}
	}
	if !gotAutoReply {
		t.Fatalf("expected auto reply to be sent after screenshot burst")
	}
}

func TestSupportInAppRelay_OperatorReplyCreatesInAppMessageAndRelay(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{}
	storage := &fakeMediaStorage{}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
		}),
	)

	appUserID := uint(901)
	conversationID := uint(1)
	store.conversationsByID[conversationID] = &models.SupportConversation{
		Model:     gorm.Model{ID: conversationID},
		AppUserID: &appUserID,
		Channel:   models.SupportConversationChannelInApp,
		Status:    models.SupportConversationStatusOpen,
		LastMessageAt: func() *time.Time {
			now := time.Now().UTC()
			return &now
		}(),
	}
	store.relaysByOperatorMsg["777:1001"] = &models.SupportOperatorRelay{
		Model:             gorm.Model{ID: 1},
		ConversationID:    conversationID,
		OperatorChatID:    777,
		OperatorMessageID: 1001,
		UserChatID:        0,
		UserTelegramID:    0,
		RelayKind:         "inapp_user_message",
	}

	update := &TelegramUpdate{
		UpdateID: 5001,
		Message: &TelegramMessage{
			MessageID: 2001,
			Date:      time.Now().Unix(),
			Text:      "Проверили, можете повторить вход.",
			Chat: &TelegramChat{
				ID:   777,
				Type: "supergroup",
			},
			ReplyToMessage: &TelegramMessage{
				MessageID: 1001,
			},
		},
	}

	if err := service.ProcessUpdate(context.Background(), update); err != nil {
		t.Fatalf("operator in-app reply failed: %v", err)
	}

	var outbound *models.SupportMessage
	for _, id := range store.messageOrder {
		msg := store.messages[id]
		if msg.ConversationID == conversationID &&
			msg.Direction == models.SupportMessageDirectionOutbound &&
			msg.Source == models.SupportMessageSourceOperator {
			outbound = msg
			break
		}
	}
	if outbound == nil {
		t.Fatalf("expected outbound in-app support message")
	}
	if !strings.Contains(outbound.Text, "повторить вход") {
		t.Fatalf("unexpected outbound text: %q", outbound.Text)
	}

	relayKey := "777:2001"
	createdRelay := store.relaysByOperatorMsg[relayKey]
	if createdRelay == nil {
		t.Fatalf("expected in-app operator relay %s to be created", relayKey)
	}
	if createdRelay.RelayKind != "inapp_operator_reply" {
		t.Fatalf("expected relay kind inapp_operator_reply, got %s", createdRelay.RelayKind)
	}

	conv := store.conversationsByID[conversationID]
	if conv == nil || conv.FirstResponseAt == nil {
		t.Fatalf("expected first response timestamp to be set")
	}
}

func TestSupportTextHighConfidence_DoesNotEscalate(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{reply: "Автоответ готов.", confidence: 0.95}
	storage := &fakeMediaStorage{}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
			"SUPPORT_AI_ENABLED":                "true",
			"SUPPORT_AI_CONFIDENCE_THRESHOLD":   "0.55",
		}),
	)

	update := &TelegramUpdate{
		UpdateID: 7001,
		Message: &TelegramMessage{
			MessageID: 9001,
			Date:      time.Now().Unix(),
			Text:      "Как обновить профиль?",
			From: &TelegramUser{
				ID:           123,
				FirstName:    "User",
				LanguageCode: "ru",
			},
			Chat: &TelegramChat{
				ID:   123,
				Type: "private",
			},
		},
	}

	if err := service.ProcessUpdate(context.Background(), update); err != nil {
		t.Fatalf("process update failed: %v", err)
	}
	if ai.calls != 1 {
		t.Fatalf("expected one AI call, got %d", ai.calls)
	}
	if len(client.copyCalls) != 0 {
		t.Fatalf("expected no escalation copy calls, got %d", len(client.copyCalls))
	}

	var conv *models.SupportConversation
	for _, c := range store.conversationsByID {
		conv = c
		break
	}
	if conv == nil {
		t.Fatalf("conversation not created")
	}
	if conv.EscalatedToOperator {
		t.Fatalf("expected conversation not escalated")
	}

	var foundAutoReply bool
	for _, sent := range client.sentMessages {
		if sent.ChatID == 123 && strings.Contains(sent.Text, "Автоответ") {
			foundAutoReply = true
			break
		}
	}
	if !foundAutoReply {
		t.Fatalf("expected AI auto reply in chat")
	}
}

func TestSupportTextLowConfidence_EscalatesToOperator(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{reply: "Не уверен", confidence: 0.2}
	storage := &fakeMediaStorage{}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
			"SUPPORT_AI_ENABLED":                "true",
			"SUPPORT_AI_CONFIDENCE_THRESHOLD":   "0.55",
		}),
	)

	update := &TelegramUpdate{
		UpdateID: 7002,
		Message: &TelegramMessage{
			MessageID: 9002,
			Date:      time.Now().Unix(),
			Text:      "Не могу войти в аккаунт",
			From: &TelegramUser{
				ID:           124,
				FirstName:    "User",
				LanguageCode: "ru",
			},
			Chat: &TelegramChat{
				ID:   124,
				Type: "private",
			},
		},
	}

	if err := service.ProcessUpdate(context.Background(), update); err != nil {
		t.Fatalf("process update failed: %v", err)
	}
	if ai.calls != 1 {
		t.Fatalf("expected one AI call, got %d", ai.calls)
	}
	if len(client.copyCalls) == 0 {
		t.Fatalf("expected escalation copy call to operator chat")
	}
	if client.copyCalls[0].ToChatID != 777 {
		t.Fatalf("expected escalation to operator chat 777, got %d", client.copyCalls[0].ToChatID)
	}

	var conv *models.SupportConversation
	for _, c := range store.conversationsByID {
		conv = c
		break
	}
	if conv == nil {
		t.Fatalf("conversation not created")
	}
	if !conv.EscalatedToOperator {
		t.Fatalf("expected conversation to be escalated")
	}
}

func TestSupportOperatorPhotoReply_SetsFirstResponse(t *testing.T) {
	store := newMemorySupportStore()
	client := newFakeTelegramClient()
	ai := &fakeSupportAIResponder{}
	storage := &fakeMediaStorage{}

	service := NewTelegramSupportServiceWithDeps(
		store,
		client,
		storage,
		ai,
		newSettingsProvider(map[string]string{
			"SUPPORT_TELEGRAM_OPERATOR_CHAT_ID": "777",
		}),
	)

	conversationID := uint(1)
	userChatID := int64(55)
	store.conversationsByID[conversationID] = &models.SupportConversation{
		Model:          gorm.Model{ID: conversationID},
		Channel:        models.SupportConversationChannelTelegram,
		Status:         models.SupportConversationStatusOpen,
		TelegramChatID: userChatID,
	}
	store.relaysByOperatorMsg["777:5000"] = &models.SupportOperatorRelay{
		Model:             gorm.Model{ID: 1},
		ConversationID:    conversationID,
		OperatorChatID:    777,
		OperatorMessageID: 5000,
		UserChatID:        userChatID,
		UserTelegramID:    userChatID,
		RelayKind:         "user_message",
	}

	update := &TelegramUpdate{
		UpdateID: 8001,
		Message: &TelegramMessage{
			MessageID: 6001,
			Date:      time.Now().Unix(),
			Caption:   "look at this screenshot",
			Photo: []TelegramPhotoSize{
				{FileID: "operator_photo"},
			},
			Chat: &TelegramChat{
				ID:   777,
				Type: "supergroup",
			},
			ReplyToMessage: &TelegramMessage{
				MessageID: 5000,
			},
		},
	}

	if err := service.ProcessUpdate(context.Background(), update); err != nil {
		t.Fatalf("operator photo reply failed: %v", err)
	}

	conv := store.conversationsByID[conversationID]
	if conv == nil || conv.FirstResponseAt == nil {
		t.Fatalf("expected first response timestamp to be set for operator photo reply")
	}

	var outboundImage *models.SupportMessage
	for _, id := range store.messageOrder {
		msg := store.messages[id]
		if msg.ConversationID == conversationID &&
			msg.Direction == models.SupportMessageDirectionOutbound &&
			msg.Source == models.SupportMessageSourceOperator &&
			msg.Type == models.SupportMessageTypeImage {
			outboundImage = msg
			break
		}
	}
	if outboundImage == nil {
		t.Fatalf("expected outbound operator image message")
	}
}

func TestPreviewRuneAware(t *testing.T) {
	service := &TelegramSupportService{}

	input := strings.Repeat("Пр", 200) // 400 runes
	output := service.preview(input)

	if !utf8.ValidString(output) {
		t.Fatalf("preview output must be valid UTF-8")
	}
	if utf8.RuneCountInString(output) != 300 {
		t.Fatalf("preview rune length = %d, want 300", utf8.RuneCountInString(output))
	}
}

func TestSelectBestPhoto(t *testing.T) {
	t.Run("prefers largest file size", func(t *testing.T) {
		photos := []TelegramPhotoSize{
			{FileID: "a", FileSize: 100, Width: 100, Height: 100},
			{FileID: "b", FileSize: 300, Width: 200, Height: 200},
			{FileID: "c", FileSize: 200, Width: 300, Height: 300},
		}
		best := selectBestPhoto(photos)
		if best == nil || best.FileID != "b" {
			t.Fatalf("expected best file ID b, got %+v", best)
		}
	})

	t.Run("falls back to dimensions when file size missing", func(t *testing.T) {
		photos := []TelegramPhotoSize{
			{FileID: "a", FileSize: 0, Width: 100, Height: 100},
			{FileID: "b", FileSize: 0, Width: 250, Height: 250},
			{FileID: "c", FileSize: 0, Width: 200, Height: 200},
		}
		best := selectBestPhoto(photos)
		if best == nil || best.FileID != "b" {
			t.Fatalf("expected best file ID b by dimensions, got %+v", best)
		}
	})

	t.Run("returns nil for empty input", func(t *testing.T) {
		if best := selectBestPhoto(nil); best != nil {
			t.Fatalf("expected nil for empty photo list")
		}
	})
}
