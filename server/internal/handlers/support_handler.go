package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"hash/crc32"
	"io"
	"log"
	"net/http"
	"net/mail"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	supportUploadMaxBytes        int64 = 10 * 1024 * 1024 // 10MB
	supportTicketRateLimit             = 6
	supportTicketRateWindow            = 10 * time.Minute
	supportUploadRateLimit             = 20
	supportUploadRateWindow            = 10 * time.Minute
	defaultSupportTelegramBotURL       = "https://t.me/vedamatch_bot"
)

var telegramContactPattern = regexp.MustCompile(`^@[A-Za-z0-9_]{4,32}$`)
var androidVersionPattern = regexp.MustCompile(`(?i)android[\s/]+([0-9][0-9._]*)`)
var iosVersionPattern = regexp.MustCompile(`(?i)\bos ([0-9_]+)`)

type SupportHandler struct {
	service        *services.TelegramSupportService
	aiResponder    services.SupportAIResponder
	mediaStorage   services.SupportMediaStorage
	telegramClient services.TelegramSupportClient
	rateLimiter    *supportRateLimiter
}

type supportRateLimiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

type supportCreateTicketRequest struct {
	Subject             string `json:"subject"`
	Message             string `json:"message"`
	Contact             string `json:"contact"`
	Name                string `json:"name"`
	EntryPoint          string `json:"entryPoint"`
	ReportType          string `json:"reportType"`
	ReportedUserID      *uint  `json:"reportedUserId"`
	ReportedContentType string `json:"reportedContentType"`
	ReportedContentID   string `json:"reportedContentId"`
	ReportReasonCode    string `json:"reportReasonCode"`
	TargetPreacherID    *uint  `json:"targetPreacherId"`
	AttachmentURL       string `json:"attachmentUrl"`
	AttachmentMimeType  string `json:"attachmentMimeType"`
	ClientRequestID     string `json:"clientRequestId"`
	DevicePlatform      string `json:"devicePlatform"`
	DeviceOS            string `json:"deviceOs"`
	DeviceOSVersion     string `json:"deviceOsVersion"`
	DeviceModel         string `json:"deviceModel"`
	AppVersion          string `json:"appVersion"`
	AppBuild            string `json:"appBuild"`
	UserAgent           string `json:"userAgent"`
}

type supportAddMessageRequest struct {
	Message            string `json:"message"`
	AttachmentURL      string `json:"attachmentUrl"`
	AttachmentMimeType string `json:"attachmentMimeType"`
	DevicePlatform     string `json:"devicePlatform"`
	DeviceOS           string `json:"deviceOs"`
	DeviceOSVersion    string `json:"deviceOsVersion"`
	DeviceModel        string `json:"deviceModel"`
	AppVersion         string `json:"appVersion"`
	AppBuild           string `json:"appBuild"`
	UserAgent          string `json:"userAgent"`
}

type supportClientContext struct {
	Platform    string
	OS          string
	OSVersion   string
	DeviceModel string
	AppVersion  string
	AppBuild    string
	UserAgent   string
}

type supportConversationListItem struct {
	models.SupportConversation
	UnreadCount int64 `json:"unreadCount"`
}

type supportPreacherQuestionListItem struct {
	ID           uint      `json:"id"`
	TicketNumber string    `json:"ticketNumber,omitempty"`
	Subject      string    `json:"subject"`
	Excerpt      string    `json:"excerpt"`
	CreatedAt    time.Time `json:"createdAt"`
	VoteCount    int64     `json:"voteCount"`
	MyVote       bool      `json:"myVote"`
}

type supportToggleQuestionVoteRequest struct {
	Value *bool `json:"value"`
}

func NewSupportHandler() *SupportHandler {
	tokenProvider := func() string {
		return strings.TrimSpace(getSupportSetting("SUPPORT_TELEGRAM_BOT_TOKEN"))
	}
	return &SupportHandler{
		service:        services.NewTelegramSupportService(database.DB),
		aiResponder:    services.NewSupportAIService(database.DB),
		mediaStorage:   services.NewDefaultSupportMediaStorage(),
		telegramClient: services.NewTelegramSupportHTTPClient(tokenProvider),
		rateLimiter:    &supportRateLimiter{hits: make(map[string][]time.Time)},
	}
}

func requireSupportAdmin(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !models.IsAdminRole(middleware.GetUserRole(c)) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	return userID, nil
}

func getSupportSetting(key string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil {
		value := strings.TrimSpace(setting.Value)
		if value != "" {
			return value
		}
	}
	return strings.TrimSpace(os.Getenv(key))
}

func getSupportSecret() string {
	return getSupportSetting("SUPPORT_TELEGRAM_WEBHOOK_SECRET")
}

func (r *supportRateLimiter) allow(bucket string, limit int, window time.Duration) bool {
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()

	items := r.hits[bucket]
	valid := make([]time.Time, 0, len(items)+1)
	for _, ts := range items {
		if now.Sub(ts) <= window {
			valid = append(valid, ts)
		}
	}
	if len(valid) >= limit {
		r.hits[bucket] = valid
		return false
	}
	valid = append(valid, now)
	r.hits[bucket] = valid
	return true
}

func (h *SupportHandler) getOperatorChatID() int64 {
	raw := strings.TrimSpace(getSupportSetting("SUPPORT_TELEGRAM_OPERATOR_CHAT_ID"))
	if raw == "" {
		return 0
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0
	}
	return id
}

func (h *SupportHandler) supportInAppTicketAllowed(userID uint, ip string) bool {
	_ = userID
	_ = ip
	if parseSupportBool(getSupportSetting("SUPPORT_INAPP_TICKET_FORCE_DISABLE"), false) {
		return false
	}
	return true
}

func (h *SupportHandler) aiEnabled() bool {
	raw := strings.ToLower(strings.TrimSpace(getSupportSetting("SUPPORT_AI_ENABLED")))
	if raw == "" {
		return true
	}
	return raw == "1" || raw == "true" || raw == "yes" || raw == "on"
}

func (h *SupportHandler) aiThreshold() float64 {
	raw := strings.TrimSpace(getSupportSetting("SUPPORT_AI_CONFIDENCE_THRESHOLD"))
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

func (h *SupportHandler) shouldEscalateByKeyword(text string) bool {
	lowerText := strings.ToLower(strings.TrimSpace(text))
	if lowerText == "" {
		return false
	}

	keywords := strings.TrimSpace(getSupportSetting("SUPPORT_AI_ESCALATION_KEYWORDS"))
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

func (h *SupportHandler) detectInAppLanguage(conversation *models.SupportConversation, userText string) string {
	mode := strings.ToLower(strings.TrimSpace(getSupportSetting("SUPPORT_LANG_MODE")))
	if mode == "ru" {
		return "ru"
	}
	if mode == "hi" {
		return "hi"
	}
	if mode == "en" {
		return "en"
	}

	if containsCyrillic(userText) {
		return "ru"
	}
	if containsDevanagari(userText) {
		return "hi"
	}

	if conversation != nil && conversation.AppUserID != nil {
		var user models.User
		if err := database.DB.Select("language").First(&user, *conversation.AppUserID).Error; err == nil {
			language := strings.ToLower(strings.TrimSpace(user.Language))
			if strings.HasPrefix(language, "ru") {
				return "ru"
			}
			if strings.HasPrefix(language, "hi") {
				return "hi"
			}
		}
	}
	return "en"
}

func containsCyrillic(text string) bool {
	for _, r := range text {
		if (r >= 'А' && r <= 'я') || r == 'ё' || r == 'Ё' {
			return true
		}
	}
	return false
}

func containsDevanagari(text string) bool {
	for _, r := range text {
		if r >= '\u0900' && r <= '\u097F' {
			return true
		}
	}
	return false
}

func normalizeSupportTelegramBotURL(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return defaultSupportTelegramBotURL
	}

	if strings.HasPrefix(value, "@") {
		value = "https://t.me/" + strings.TrimPrefix(value, "@")
	} else if !strings.Contains(value, "://") {
		if strings.Contains(value, "t.me/") {
			value = "https://" + strings.TrimPrefix(value, "https://")
			value = "https://" + strings.TrimPrefix(value, "http://")
		} else {
			value = "https://t.me/" + strings.TrimPrefix(value, "@")
		}
	}

	if !strings.Contains(strings.ToLower(value), "vedamatch_bot") {
		return defaultSupportTelegramBotURL
	}
	return value
}

func trimSupportClientContext(ctx supportClientContext) supportClientContext {
	ctx.Platform = strings.TrimSpace(strings.ToLower(ctx.Platform))
	ctx.OS = strings.TrimSpace(strings.ToLower(ctx.OS))
	ctx.OSVersion = strings.TrimSpace(ctx.OSVersion)
	ctx.DeviceModel = strings.TrimSpace(ctx.DeviceModel)
	ctx.AppVersion = strings.TrimSpace(ctx.AppVersion)
	ctx.AppBuild = strings.TrimSpace(ctx.AppBuild)
	ctx.UserAgent = strings.TrimSpace(ctx.UserAgent)
	return ctx
}

func (h *SupportHandler) buildSupportClientContext(c *fiber.Ctx, seed supportClientContext) supportClientContext {
	ctx := trimSupportClientContext(seed)

	headerUA := strings.TrimSpace(c.Get("User-Agent"))
	if ctx.UserAgent == "" {
		ctx.UserAgent = headerUA
	}
	lowerUA := strings.ToLower(headerUA)

	if ctx.Platform == "" {
		switch {
		case strings.Contains(lowerUA, "android"):
			ctx.Platform = "android"
		case strings.Contains(lowerUA, "iphone"), strings.Contains(lowerUA, "ipad"), strings.Contains(lowerUA, "ios"):
			ctx.Platform = "ios"
		case strings.Contains(lowerUA, "mozilla"), strings.Contains(lowerUA, "safari"), strings.Contains(lowerUA, "chrome"):
			ctx.Platform = "web"
		}
	}

	if ctx.OS == "" {
		switch {
		case strings.Contains(lowerUA, "android"):
			ctx.OS = "android"
		case strings.Contains(lowerUA, "iphone"), strings.Contains(lowerUA, "ipad"), strings.Contains(lowerUA, "ios"):
			ctx.OS = "ios"
		case strings.Contains(lowerUA, "windows"):
			ctx.OS = "windows"
		case strings.Contains(lowerUA, "mac os"), strings.Contains(lowerUA, "macintosh"):
			ctx.OS = "macos"
		case strings.Contains(lowerUA, "linux"):
			ctx.OS = "linux"
		}
	}

	if ctx.OSVersion == "" && headerUA != "" {
		if match := androidVersionPattern.FindStringSubmatch(headerUA); len(match) > 1 {
			ctx.OSVersion = strings.TrimSpace(match[1])
		} else if match := iosVersionPattern.FindStringSubmatch(headerUA); len(match) > 1 {
			ctx.OSVersion = strings.ReplaceAll(strings.TrimSpace(match[1]), "_", ".")
		}
	}

	ctx.DeviceModel = truncateSupportField(ctx.DeviceModel, 120)
	ctx.AppVersion = truncateSupportField(ctx.AppVersion, 64)
	ctx.AppBuild = truncateSupportField(ctx.AppBuild, 64)
	ctx.UserAgent = truncateSupportField(ctx.UserAgent, 320)
	return ctx
}

func truncateSupportField(value string, maxLen int) string {
	value = strings.TrimSpace(value)
	if maxLen <= 0 || value == "" {
		return value
	}
	runes := []rune(value)
	if len(runes) <= maxLen {
		return value
	}
	return string(runes[:maxLen])
}

func (ctx supportClientContext) hasAny() bool {
	return ctx.Platform != "" ||
		ctx.OS != "" ||
		ctx.OSVersion != "" ||
		ctx.DeviceModel != "" ||
		ctx.AppVersion != "" ||
		ctx.AppBuild != "" ||
		ctx.UserAgent != ""
}

func (ctx supportClientContext) toOperatorLines() []string {
	if !ctx.hasAny() {
		return nil
	}
	lines := make([]string, 0, 7)
	if ctx.Platform != "" {
		lines = append(lines, "device_platform: "+ctx.Platform)
	}
	if ctx.OS != "" {
		lines = append(lines, "device_os: "+ctx.OS)
	}
	if ctx.OSVersion != "" {
		lines = append(lines, "device_os_version: "+ctx.OSVersion)
	}
	if ctx.DeviceModel != "" {
		lines = append(lines, "device_model: "+ctx.DeviceModel)
	}
	if ctx.AppVersion != "" {
		lines = append(lines, "app_version: "+ctx.AppVersion)
	}
	if ctx.AppBuild != "" {
		lines = append(lines, "app_build: "+ctx.AppBuild)
	}
	if ctx.UserAgent != "" {
		lines = append(lines, "user_agent: "+ctx.UserAgent)
	}
	return lines
}

func buildSupportAIInput(userText string, ctx supportClientContext) string {
	clean := strings.TrimSpace(userText)
	if !ctx.hasAny() {
		return clean
	}

	lines := []string{clean, "", "Client context:"}
	if ctx.Platform != "" {
		lines = append(lines, "platform="+ctx.Platform)
	}
	if ctx.OS != "" {
		lines = append(lines, "os="+ctx.OS)
	}
	if ctx.OSVersion != "" {
		lines = append(lines, "os_version="+ctx.OSVersion)
	}
	if ctx.DeviceModel != "" {
		lines = append(lines, "device_model="+ctx.DeviceModel)
	}
	if ctx.AppVersion != "" {
		lines = append(lines, "app_version="+ctx.AppVersion)
	}
	if ctx.AppBuild != "" {
		lines = append(lines, "app_build="+ctx.AppBuild)
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func (h *SupportHandler) buildTicketNumber() string {
	for i := 0; i < 6; i++ {
		now := time.Now().UTC()
		candidate := fmt.Sprintf("SUP-%s-%05d", now.Format("20060102"), now.UnixNano()%100000)
		var count int64
		if err := database.DB.Model(&models.SupportConversation{}).
			Where("ticket_number = ?", candidate).
			Count(&count).Error; err == nil && count == 0 {
			return candidate
		}
		time.Sleep(2 * time.Millisecond)
	}
	return fmt.Sprintf("SUP-%d", time.Now().UTC().UnixNano())
}

func parseSupportBool(raw string, def bool) bool {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	if normalized == "" {
		return def
	}
	switch normalized {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return def
	}
}

func (h *SupportHandler) isRolloutEligible(userID uint, ip string, percent int) bool {
	if percent <= 0 {
		return false
	}
	if percent >= 100 {
		return true
	}

	seed := ""
	if userID > 0 {
		seed = fmt.Sprintf("u:%d", userID)
	} else {
		seed = "ip:" + strings.TrimSpace(ip)
	}
	if seed == "" {
		return false
	}
	bucket := int(crc32.ChecksumIEEE([]byte(seed)) % 100)
	return bucket < percent
}

func isAllowedSupportImage(contentType string, filename string) bool {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	switch contentType {
	case "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif":
		return true
	}

	lowerName := strings.ToLower(strings.TrimSpace(filename))
	return strings.HasSuffix(lowerName, ".jpg") ||
		strings.HasSuffix(lowerName, ".jpeg") ||
		strings.HasSuffix(lowerName, ".png") ||
		strings.HasSuffix(lowerName, ".webp") ||
		strings.HasSuffix(lowerName, ".gif") ||
		strings.HasSuffix(lowerName, ".heic") ||
		strings.HasSuffix(lowerName, ".heif")
}

func isValidSupportContact(value string) bool {
	contact := strings.TrimSpace(value)
	if contact == "" {
		return false
	}

	if strings.HasPrefix(contact, "@") {
		return telegramContactPattern.MatchString(contact)
	}

	addr, err := mail.ParseAddress(contact)
	if err != nil {
		return false
	}
	return strings.TrimSpace(addr.Address) != ""
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "duplicate") ||
		strings.Contains(lower, "unique constraint") ||
		strings.Contains(lower, "unique violation")
}

func (h *SupportHandler) createOutboundInAppMessage(conversationID uint, source models.SupportMessageSource, text string, now time.Time) error {
	cleanText := strings.TrimSpace(text)
	if cleanText == "" {
		return nil
	}

	outbound := &models.SupportMessage{
		ConversationID: conversationID,
		Direction:      models.SupportMessageDirectionOutbound,
		Source:         source,
		Type:           models.SupportMessageTypeText,
		Text:           cleanText,
		IsReadByUser:   false,
		SentAt:         now,
	}
	if err := database.DB.Create(outbound).Error; err != nil {
		return err
	}
	if err := database.DB.Model(&models.SupportConversation{}).
		Where("id = ?", conversationID).
		Updates(map[string]interface{}{
			"last_message_at":      &now,
			"last_message_preview": h.preview(cleanText),
		}).Error; err != nil {
		return err
	}
	return database.DB.Model(&models.SupportConversation{}).
		Where("id = ? AND first_response_at IS NULL", conversationID).
		Update("first_response_at", &now).Error
}

func (h *SupportHandler) buildInAppOperatorText(conversation *models.SupportConversation, userText string, attachmentURL string, clientCtx supportClientContext) string {
	ticket := ""
	if conversation.TicketNumber != nil {
		ticket = *conversation.TicketNumber
	}

	lines := []string{
		"[support][in-app]",
		fmt.Sprintf("conversation_id: %d", conversation.ID),
		fmt.Sprintf("ticket: %s", ticket),
		fmt.Sprintf("time: %s", time.Now().UTC().Format(time.RFC3339)),
	}
	if conversation.AppUserID != nil {
		lines = append(lines, fmt.Sprintf("app_user_id: %d", *conversation.AppUserID))
	}
	if strings.TrimSpace(conversation.Subject) != "" {
		lines = append(lines, "subject: "+strings.TrimSpace(conversation.Subject))
	}
	if strings.TrimSpace(conversation.RequesterName) != "" {
		lines = append(lines, "requester_name: "+strings.TrimSpace(conversation.RequesterName))
	}
	if strings.TrimSpace(conversation.RequesterContact) != "" {
		lines = append(lines, "requester_contact: "+strings.TrimSpace(conversation.RequesterContact))
	}
	if strings.TrimSpace(conversation.EntryPoint) != "" {
		lines = append(lines, "entry_point: "+strings.TrimSpace(conversation.EntryPoint))
	}
	if strings.TrimSpace(userText) != "" {
		lines = append(lines, "message: "+strings.TrimSpace(userText))
	}
	if strings.TrimSpace(attachmentURL) != "" {
		lines = append(lines, "attachment_url: "+strings.TrimSpace(attachmentURL))
	}
	lines = append(lines, clientCtx.toOperatorLines()...)
	lines = append(lines, "Reply to this message to answer user in app.")
	return strings.Join(lines, "\n")
}

func (h *SupportHandler) escalateInAppConversation(
	ctx *fiber.Ctx,
	conversation *models.SupportConversation,
	inbound *models.SupportMessage,
	userText string,
	attachmentURL string,
	clientCtx supportClientContext,
	ackText string,
) error {
	if conversation == nil {
		return errors.New("conversation is required")
	}
	now := time.Now().UTC()
	operatorChatID := h.getOperatorChatID()
	if operatorChatID != 0 && h.telegramClient != nil {
		metaText := h.buildInAppOperatorText(conversation, userText, attachmentURL, clientCtx)
		metaMessageID, sendErr := h.telegramClient.SendMessage(ctx.UserContext(), operatorChatID, metaText, services.TelegramSendMessageOptions{})
		if sendErr == nil {
			var supportMessageID *uint
			if inbound != nil && inbound.ID != 0 {
				supportMessageID = &inbound.ID
			}
			if err := database.DB.Create(&models.SupportOperatorRelay{
				ConversationID:    conversation.ID,
				SupportMessageID:  supportMessageID,
				OperatorChatID:    operatorChatID,
				OperatorMessageID: metaMessageID,
				UserChatID:        0,
				UserTelegramID:    0,
				RelayKind:         "inapp_user_message",
			}).Error; err != nil {
				fmt.Printf("[Support] failed to create in-app relay: %v\n", err)
			}
		} else {
			fmt.Printf("[Support] failed to forward in-app ticket to operator chat: %v\n", sendErr)
		}
	}

	_ = database.DB.Model(&models.SupportConversation{}).
		Where("id = ?", conversation.ID).
		Updates(map[string]interface{}{
			"escalated_to_operator": true,
			"escalated_at":          &now,
			"last_message_at":       &now,
		}).Error

	return h.createOutboundInAppMessage(conversation.ID, models.SupportMessageSourceBot, ackText, now)
}

func (h *SupportHandler) routeInAppMessage(
	ctx *fiber.Ctx,
	conversation *models.SupportConversation,
	inbound *models.SupportMessage,
	userText string,
	attachmentURL string,
	clientCtx supportClientContext,
) error {
	text := strings.TrimSpace(userText)
	if text == "" {
		return h.escalateInAppConversation(
			ctx,
			conversation,
			inbound,
			text,
			attachmentURL,
			clientCtx,
			"Скриншот получен. Передаем обращение оператору, ответ придет в приложении.",
		)
	}

	if h.shouldEscalateByKeyword(text) {
		return h.escalateInAppConversation(
			ctx,
			conversation,
			inbound,
			text,
			attachmentURL,
			clientCtx,
			"Передаем вопрос оператору. Ответ придет в приложении.",
		)
	}

	if !h.aiEnabled() || h.aiResponder == nil {
		return h.escalateInAppConversation(
			ctx,
			conversation,
			inbound,
			text,
			attachmentURL,
			clientCtx,
			"Передаем вопрос оператору. Ответ придет в приложении.",
		)
	}

	aiInput := buildSupportAIInput(text, clientCtx)
	reply, confidence, err := h.aiResponder.GenerateReply(
		ctx.UserContext(),
		aiInput,
		h.detectInAppLanguage(conversation, text),
	)
	if err != nil {
		return h.escalateInAppConversation(
			ctx,
			conversation,
			inbound,
			text,
			attachmentURL,
			clientCtx,
			"Не удалось дать точный авто-ответ. Передаем вопрос оператору.",
		)
	}
	if confidence < h.aiThreshold() {
		return h.escalateInAppConversation(
			ctx,
			conversation,
			inbound,
			text,
			attachmentURL,
			clientCtx,
			"Для точного ответа подключаем оператора.",
		)
	}

	return h.createOutboundInAppMessage(
		conversation.ID,
		models.SupportMessageSourceBot,
		reply,
		time.Now().UTC(),
	)
}

func (h *SupportHandler) preview(text string) string {
	clean := strings.TrimSpace(text)
	if clean == "" {
		return ""
	}
	runes := []rune(clean)
	if len(runes) > 300 {
		return string(runes[:300])
	}
	return clean
}

func (h *SupportHandler) pushSupportStatusUpdate(conversationID uint, body string) {
	var conversation models.SupportConversation
	if err := database.DB.First(&conversation, conversationID).Error; err != nil {
		return
	}
	if conversation.AppUserID == nil || *conversation.AppUserID == 0 {
		return
	}
	push := services.GetPushService()
	if push == nil {
		return
	}
	params := fmt.Sprintf("{\"conversationId\":%d}", conversationID)
	_ = push.SendToUser(*conversation.AppUserID, services.PushMessage{
		Title: "Поддержка VedaMatch",
		Body:  strings.TrimSpace(body),
		Data: map[string]string{
			"type":           "support_update",
			"screen":         "SupportHome",
			"params":         params,
			"conversationId": strconv.FormatUint(uint64(conversationID), 10),
		},
		Priority: "high",
	})
}

func loadSupportUserEmail(userID uint) string {
	if userID == 0 {
		return ""
	}
	if database.DB == nil {
		return ""
	}
	var user models.User
	if err := database.DB.Select("email").First(&user, userID).Error; err != nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(user.Email))
}

func (h *SupportHandler) loadConversationForUser(userID uint, conversationID uint) (*models.SupportConversation, error) {
	var conversation models.SupportConversation
	userEmail := loadSupportUserEmail(userID)
	query := database.DB.
		Where("id = ? AND channel = ?", conversationID, models.SupportConversationChannelInApp)
	if userEmail != "" {
		query = query.Where("(app_user_id = ? OR (app_user_id IS NULL AND LOWER(requester_contact) = ?))", userID, userEmail)
	} else {
		query = query.Where("app_user_id = ?", userID)
	}
	if err := query.First(&conversation).Error; err != nil {
		return nil, err
	}

	// If user accessed an old guest ticket created with matching requester contact, bind ownership.
	if conversation.AppUserID == nil {
		if err := database.DB.Model(&models.SupportConversation{}).
			Where("id = ? AND app_user_id IS NULL", conversation.ID).
			Update("app_user_id", userID).Error; err != nil {
			log.Printf("[SUPPORT] failed to bind guest ticket to user conversation=%d user=%d: %v", conversation.ID, userID, err)
		}
		boundUserID := userID
		conversation.AppUserID = &boundUserID
	}
	return &conversation, nil
}

// TelegramWebhook processes incoming support-bot updates.
// POST /api/integrations/telegram/support/webhook
func (h *SupportHandler) TelegramWebhook(c *fiber.Ctx) error {
	expectedSecret := getSupportSecret()
	if expectedSecret != "" {
		receivedSecret := strings.TrimSpace(c.Get("X-Telegram-Bot-Api-Secret-Token"))
		if receivedSecret != expectedSecret {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid webhook secret"})
		}
	}

	var update services.TelegramUpdate
	if err := c.BodyParser(&update); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot parse update"})
	}

	if err := h.service.ProcessUpdate(c.UserContext(), &update); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// GetPublicConfig returns support channel configuration for mobile clients.
// GET /api/support/config
func (h *SupportHandler) GetPublicConfig(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	_ = userID
	appEntryEnabled := !parseSupportBool(getSupportSetting("SUPPORT_INAPP_TICKET_FORCE_DISABLE"), false)
	rolloutPercent := 100
	eligible := appEntryEnabled

	telegramBotURL := normalizeSupportTelegramBotURL(getSupportSetting("SUPPORT_TELEGRAM_BOT_URL"))
	channelURL := strings.TrimSpace(getSupportSetting("SUPPORT_CHANNEL_URL"))
	if channelURL == "" {
		channelURL = telegramBotURL
	}

	slaRu := strings.TrimSpace(getSupportSetting("SUPPORT_SLA_TEXT_RU"))
	if slaRu == "" {
		slaRu = "AI отвечает сразу, оператор в рабочее время — до 4 часов."
	}
	slaEn := strings.TrimSpace(getSupportSetting("SUPPORT_SLA_TEXT_EN"))
	if slaEn == "" {
		slaEn = "AI replies instantly, operator response during business hours is within 4 hours."
	}
	slaHi := strings.TrimSpace(getSupportSetting("SUPPORT_SLA_TEXT_HI"))
	if slaHi == "" {
		slaHi = "AI तुरंत जवाब देता है, और कार्य समय में ऑपरेटर 4 घंटे के भीतर जवाब देता है।"
	}
	autoReplyRu := strings.TrimSpace(getSupportSetting("SUPPORT_AUTO_REPLY_RU"))
	if autoReplyRu == "" {
		autoReplyRu = "Спасибо! Мы получили обращение и уже работаем над ответом."
	}
	autoReplyEn := strings.TrimSpace(getSupportSetting("SUPPORT_AUTO_REPLY_EN"))
	if autoReplyEn == "" {
		autoReplyEn = "Thanks! We received your request and are already working on a response."
	}
	autoReplyHi := strings.TrimSpace(getSupportSetting("SUPPORT_AUTO_REPLY_HI"))
	if autoReplyHi == "" {
		autoReplyHi = "धन्यवाद! हमने आपका अनुरोध प्राप्त कर लिया है और जवाब तैयार कर रहे हैं।"
	}

	return c.JSON(fiber.Map{
		"appEntryEnabled":        appEntryEnabled,
		"appEntryRolloutPercent": rolloutPercent,
		"appEntryEligible":       eligible,
		"telegramBotUrl":         telegramBotURL,
		"channelUrl":             channelURL,
		"slaTextRu":              slaRu,
		"slaTextEn":              slaEn,
		"slaTextHi":              slaHi,
		"autoReplyTemplateRu":    autoReplyRu,
		"autoReplyTemplateEn":    autoReplyEn,
		"autoReplyTemplateHi":    autoReplyHi,
		"languages":              []string{"ru", "en", "hi"},
		"channels": fiber.Map{
			"telegram":    true,
			"inAppTicket": appEntryEnabled,
		},
	})
}

// UploadAttachment uploads a screenshot for support ticket.
// POST /api/support/uploads
func (h *SupportHandler) UploadAttachment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if !h.supportInAppTicketAllowed(userID, c.IP()) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "in-app support is not available for this account yet"})
	}
	if userID == 0 && (strings.TrimSpace(c.Get("Authorization")) != "" || strings.TrimSpace(c.Query("token")) != "") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid auth token"})
	}

	if userID == 0 {
		bucket := "support_upload:" + strings.TrimSpace(c.IP())
		if !h.rateLimiter.allow(bucket, supportUploadRateLimit, supportUploadRateWindow) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "too many upload requests"})
		}
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is required"})
	}
	if fileHeader.Size <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "empty file"})
	}
	if fileHeader.Size > supportUploadMaxBytes {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is too large (max 10MB)"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot open upload"})
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, supportUploadMaxBytes+1))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot read upload"})
	}
	if int64(len(data)) > supportUploadMaxBytes {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is too large (max 10MB)"})
	}

	contentType := http.DetectContentType(data)
	if !isAllowedSupportImage(contentType, fileHeader.Filename) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported file type"})
	}

	scope := "guest"
	if userID > 0 {
		scope = fmt.Sprintf("u%d", userID)
	}
	key := services.BuildSupportUploadKey(scope, fileHeader.Filename)
	url, size, saveErr := h.mediaStorage.Save(c.UserContext(), key, contentType, data)
	if saveErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save upload"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"url":         url,
		"size":        size,
		"contentType": contentType,
	})
}

// CreateTicket creates in-app support ticket (optional auth).
// POST /api/support/tickets
func (h *SupportHandler) CreateTicket(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if !h.supportInAppTicketAllowed(userID, c.IP()) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "in-app support is not available for this account yet"})
	}
	if userID == 0 && (strings.TrimSpace(c.Get("Authorization")) != "" || strings.TrimSpace(c.Query("token")) != "") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid auth token"})
	}

	if userID == 0 {
		bucket := "support_ticket:" + strings.TrimSpace(c.IP())
		if !h.rateLimiter.allow(bucket, supportTicketRateLimit, supportTicketRateWindow) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "too many ticket requests"})
		}
	}

	var req supportCreateTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	req.Subject = strings.TrimSpace(req.Subject)
	req.Message = strings.TrimSpace(req.Message)
	req.Contact = strings.TrimSpace(req.Contact)
	req.Name = strings.TrimSpace(req.Name)
	req.EntryPoint = strings.TrimSpace(strings.ToLower(req.EntryPoint))
	req.ReportType = strings.TrimSpace(strings.ToLower(req.ReportType))
	req.ReportedContentType = strings.TrimSpace(strings.ToLower(req.ReportedContentType))
	req.ReportedContentID = strings.TrimSpace(req.ReportedContentID)
	req.ReportReasonCode = strings.TrimSpace(strings.ToLower(req.ReportReasonCode))
	req.AttachmentURL = strings.TrimSpace(req.AttachmentURL)
	req.AttachmentMimeType = strings.TrimSpace(req.AttachmentMimeType)
	req.ClientRequestID = strings.TrimSpace(req.ClientRequestID)
	req.DevicePlatform = strings.TrimSpace(req.DevicePlatform)
	req.DeviceOS = strings.TrimSpace(req.DeviceOS)
	req.DeviceOSVersion = strings.TrimSpace(req.DeviceOSVersion)
	req.DeviceModel = strings.TrimSpace(req.DeviceModel)
	req.AppVersion = strings.TrimSpace(req.AppVersion)
	req.AppBuild = strings.TrimSpace(req.AppBuild)
	req.UserAgent = strings.TrimSpace(req.UserAgent)

	if req.EntryPoint == "abuse_report" && req.Subject == "" {
		req.Subject = "UGC report"
	}
	if req.Subject == "" {
		req.Subject = "Support request"
	}
	if req.ReportedUserID != nil && *req.ReportedUserID == 0 {
		req.ReportedUserID = nil
	}
	if req.TargetPreacherID != nil && *req.TargetPreacherID == 0 {
		req.TargetPreacherID = nil
	}
	if req.TargetPreacherID != nil && req.EntryPoint == "" {
		req.EntryPoint = "sadhu_sanga_question"
	}
	if req.EntryPoint == "" {
		req.EntryPoint = "unknown"
	}
	if req.Message == "" && req.AttachmentURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message or attachment is required"})
	}
	if req.ClientRequestID != "" && len(req.ClientRequestID) > 128 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "clientRequestId is too long"})
	}
	if req.Contact == "" && userID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "contact is required for non-authorized users"})
	}
	if userID == 0 && req.Contact != "" && !isValidSupportContact(req.Contact) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "contact must be a valid email or @telegram"})
	}
	if req.EntryPoint == "abuse_report" {
		if req.ReportType != "user" && req.ReportType != "content" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reportType must be user or content"})
		}
		if req.ReportType == "user" {
			if req.ReportedUserID == nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reportedUserId is required for user reports"})
			}
			if userID > 0 && *req.ReportedUserID == userID {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "you cannot report yourself"})
			}
		}
		if req.ReportType == "content" {
			if req.ReportedContentType == "" || req.ReportedContentID == "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reportedContentType and reportedContentId are required for content reports"})
			}
			switch req.ReportedContentType {
			case "chat_message", "ad", "profile", "other":
			default:
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reportedContentType is invalid"})
			}
		}
	}

	if req.ClientRequestID != "" {
		query := database.DB.Where("channel = ? AND client_request_id = ?", models.SupportConversationChannelInApp, req.ClientRequestID)
		if userID > 0 {
			query = query.Where("app_user_id = ?", userID)
		} else {
			query = query.Where("requester_contact = ?", req.Contact)
		}
		var existing models.SupportConversation
		if err := query.First(&existing).Error; err == nil {
			return c.JSON(fiber.Map{
				"conversation": existing,
				"idempotent":   true,
			})
		}
	}

	if userID > 0 && (req.Contact == "" || req.Name == "") {
		var user models.User
		if err := database.DB.Select("karmic_name,email").First(&user, userID).Error; err == nil {
			if req.Name == "" {
				req.Name = strings.TrimSpace(user.KarmicName)
			}
			if req.Contact == "" {
				req.Contact = strings.TrimSpace(user.Email)
			}
		}
	}

	clientCtx := h.buildSupportClientContext(c, supportClientContext{
		Platform:    req.DevicePlatform,
		OS:          req.DeviceOS,
		OSVersion:   req.DeviceOSVersion,
		DeviceModel: req.DeviceModel,
		AppVersion:  req.AppVersion,
		AppBuild:    req.AppBuild,
		UserAgent:   req.UserAgent,
	})

	now := time.Now().UTC()
	ticketNumber := h.buildTicketNumber()
	var appUserID *uint
	if userID > 0 {
		appUserID = &userID
	}
	var clientRequestID *string
	if req.ClientRequestID != "" {
		clientRequestID = &req.ClientRequestID
	}
	ticketNumberPtr := &ticketNumber
	metaJSON := ""
	meta := make(map[string]interface{})
	if req.TargetPreacherID != nil {
		meta["targetPreacherId"] = *req.TargetPreacherID
		meta["scope"] = "sadhu_sanga"
		if req.EntryPoint == "unknown" {
			req.EntryPoint = "sadhu_sanga_question"
		}
	}
	if req.EntryPoint == "abuse_report" {
		meta["reportType"] = req.ReportType
		if req.ReportedUserID != nil {
			meta["reportedUserId"] = *req.ReportedUserID
		}
		if req.ReportedContentType != "" {
			meta["reportedContentType"] = req.ReportedContentType
		}
		if req.ReportedContentID != "" {
			meta["reportedContentId"] = req.ReportedContentID
		}
		if req.ReportReasonCode != "" {
			meta["reportReasonCode"] = req.ReportReasonCode
		}
	}
	if len(meta) > 0 {
		encodedMeta, err := json.Marshal(meta)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid support metadata"})
		}
		metaJSON = string(encodedMeta)
	}

	conversation := models.SupportConversation{
		AppUserID:        appUserID,
		Channel:          models.SupportConversationChannelInApp,
		TicketNumber:     ticketNumberPtr,
		Subject:          req.Subject,
		RequesterName:    req.Name,
		RequesterContact: req.Contact,
		ClientRequestID:  clientRequestID,
		EntryPoint:       req.EntryPoint,
		MetaJSON:         metaJSON,
		Status:           models.SupportConversationStatusOpen,
		TelegramChatID:   0,
		LastMessageAt:    &now,
		LastUserReadAt:   &now,
	}
	if err := database.DB.Create(&conversation).Error; err != nil {
		if isUniqueViolation(err) && req.ClientRequestID != "" {
			query := database.DB.Where("channel = ? AND client_request_id = ?", models.SupportConversationChannelInApp, req.ClientRequestID)
			if userID > 0 {
				query = query.Where("app_user_id = ?", userID)
			} else {
				query = query.Where("requester_contact = ?", req.Contact)
			}
			var existing models.SupportConversation
			if fetchErr := query.First(&existing).Error; fetchErr == nil {
				return c.JSON(fiber.Map{
					"conversation": existing,
					"idempotent":   true,
				})
			}
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create support conversation"})
	}

	inbound := &models.SupportMessage{
		ConversationID: conversation.ID,
		Direction:      models.SupportMessageDirectionInbound,
		Source:         models.SupportMessageSourceUser,
		Type:           models.SupportMessageTypeText,
		Text:           req.Message,
		IsReadByUser:   true,
		SentAt:         now,
	}
	preview := req.Message
	if req.AttachmentURL != "" {
		inbound.Type = models.SupportMessageTypeImage
		inbound.Caption = req.Message
		inbound.Text = ""
		inbound.MediaURL = req.AttachmentURL
		inbound.MimeType = req.AttachmentMimeType
		preview = "[image] " + req.Message
	}
	if err := database.DB.Create(inbound).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save support message"})
	}

	if err := database.DB.Model(&conversation).Updates(map[string]interface{}{
		"last_message_at":      &now,
		"last_message_preview": h.preview(preview),
		"last_user_read_at":    &now,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update support conversation"})
	}

	if err := h.routeInAppMessage(c, &conversation, inbound, req.Message, req.AttachmentURL, clientCtx); err != nil {
		log.Printf("[SUPPORT] failed to route ticket message conversation=%d: %v", conversation.ID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to route support message"})
	}

	if err := database.DB.First(&conversation, conversation.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to reload support conversation"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"conversation": conversation,
	})
}

// ListMyTickets returns current user's in-app support tickets.
// GET /api/support/tickets
func (h *SupportHandler) ListMyTickets(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	page := parseSupportInt(c.Query("page"), 1, 1, 100000)
	limit := parseSupportInt(c.Query("limit"), 20, 1, 100)
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	userEmail := loadSupportUserEmail(userID)

	query := database.DB.Model(&models.SupportConversation{}).
		Where("channel = ?", models.SupportConversationChannelInApp)
	if userEmail != "" {
		query = query.Where("(app_user_id = ? OR (app_user_id IS NULL AND LOWER(requester_contact) = ?))", userID, userEmail)
	} else {
		query = query.Where("app_user_id = ?", userID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count tickets"})
	}

	var conversations []models.SupportConversation
	if err := query.
		Order("last_message_at DESC NULLS LAST, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&conversations).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load tickets"})
	}

	conversationIDs := make([]uint, 0, len(conversations))
	for _, conv := range conversations {
		conversationIDs = append(conversationIDs, conv.ID)
	}
	unreadByConversation, unreadErr := loadSupportUnreadCounts(conversationIDs)
	if unreadErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count unread messages"})
	}

	items := make([]supportConversationListItem, 0, len(conversations))
	for _, conv := range conversations {
		items = append(items, supportConversationListItem{
			SupportConversation: conv,
			UnreadCount:         unreadByConversation[conv.ID],
		})
	}

	return c.JSON(fiber.Map{
		"tickets": items,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// GetMyTicketMessages returns one ticket messages for current user.
// GET /api/support/tickets/:id/messages
func (h *SupportHandler) GetMyTicketMessages(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	conversationID, err := parseSupportPositiveUintParam(c, "id", "ticket id")
	if err != nil {
		return err
	}

	conversation, err := h.loadConversationForUser(userID, conversationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ticket not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load ticket"})
	}

	var messages []models.SupportMessage
	if err := database.DB.
		Where("conversation_id = ?", conversation.ID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load messages"})
	}

	var unread int64
	if err := database.DB.Model(&models.SupportMessage{}).
		Where("conversation_id = ? AND direction = ? AND is_read_by_user = ?", conversation.ID, models.SupportMessageDirectionOutbound, false).
		Count(&unread).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count unread messages"})
	}

	return c.JSON(fiber.Map{
		"ticket":      conversation,
		"messages":    messages,
		"unreadCount": unread,
	})
}

// PostMyTicketMessage adds follow-up message to ticket.
// POST /api/support/tickets/:id/messages
func (h *SupportHandler) PostMyTicketMessage(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	conversationID, err := parseSupportPositiveUintParam(c, "id", "ticket id")
	if err != nil {
		return err
	}

	var req supportAddMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	req.Message = strings.TrimSpace(req.Message)
	req.AttachmentURL = strings.TrimSpace(req.AttachmentURL)
	req.AttachmentMimeType = strings.TrimSpace(req.AttachmentMimeType)
	req.DevicePlatform = strings.TrimSpace(req.DevicePlatform)
	req.DeviceOS = strings.TrimSpace(req.DeviceOS)
	req.DeviceOSVersion = strings.TrimSpace(req.DeviceOSVersion)
	req.DeviceModel = strings.TrimSpace(req.DeviceModel)
	req.AppVersion = strings.TrimSpace(req.AppVersion)
	req.AppBuild = strings.TrimSpace(req.AppBuild)
	req.UserAgent = strings.TrimSpace(req.UserAgent)
	if req.Message == "" && req.AttachmentURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message or attachment is required"})
	}

	conversation, err := h.loadConversationForUser(userID, conversationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ticket not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load ticket"})
	}

	now := time.Now().UTC()
	inbound := &models.SupportMessage{
		ConversationID: conversation.ID,
		Direction:      models.SupportMessageDirectionInbound,
		Source:         models.SupportMessageSourceUser,
		Type:           models.SupportMessageTypeText,
		Text:           req.Message,
		IsReadByUser:   true,
		SentAt:         now,
	}
	preview := req.Message
	if req.AttachmentURL != "" {
		inbound.Type = models.SupportMessageTypeImage
		inbound.Caption = req.Message
		inbound.Text = ""
		inbound.MediaURL = req.AttachmentURL
		inbound.MimeType = req.AttachmentMimeType
		preview = "[image] " + req.Message
	}
	if err := database.DB.Create(inbound).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save message"})
	}

	updates := map[string]interface{}{
		"last_message_at":      &now,
		"last_message_preview": h.preview(preview),
		"last_user_read_at":    &now,
	}
	if conversation.Status == models.SupportConversationStatusResolved {
		updates["status"] = models.SupportConversationStatusOpen
		updates["resolved_at"] = nil
		updates["resolved_by"] = nil
	}
	if err := database.DB.Model(&models.SupportConversation{}).
		Where("id = ?", conversation.ID).
		Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update ticket"})
	}

	clientCtx := h.buildSupportClientContext(c, supportClientContext{
		Platform:    req.DevicePlatform,
		OS:          req.DeviceOS,
		OSVersion:   req.DeviceOSVersion,
		DeviceModel: req.DeviceModel,
		AppVersion:  req.AppVersion,
		AppBuild:    req.AppBuild,
		UserAgent:   req.UserAgent,
	})

	if err := h.routeInAppMessage(c, conversation, inbound, req.Message, req.AttachmentURL, clientCtx); err != nil {
		log.Printf("[SUPPORT] failed to route follow-up message conversation=%d: %v", conversation.ID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to route support message"})
	}

	if err := database.DB.First(conversation, conversation.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to reload ticket"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"ticket": conversation,
	})
}

// MarkMyTicketRead marks outbound messages as read for current user.
// POST /api/support/tickets/:id/read
func (h *SupportHandler) MarkMyTicketRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	conversationID, err := parseSupportPositiveUintParam(c, "id", "ticket id")
	if err != nil {
		return err
	}

	conversation, err := h.loadConversationForUser(userID, conversationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ticket not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load ticket"})
	}

	now := time.Now().UTC()
	if err := database.DB.Model(&models.SupportMessage{}).
		Where("conversation_id = ? AND direction = ? AND is_read_by_user = ?", conversation.ID, models.SupportMessageDirectionOutbound, false).
		Update("is_read_by_user", true).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update messages"})
	}
	if err := database.DB.Model(&models.SupportConversation{}).
		Where("id = ?", conversation.ID).
		Update("last_user_read_at", &now).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update ticket"})
	}

	return c.JSON(fiber.Map{"message": "ok"})
}

// GetMyUnreadCount returns unread outbound support messages count.
// GET /api/support/unread-count
func (h *SupportHandler) GetMyUnreadCount(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userEmail := loadSupportUserEmail(userID)

	query := database.DB.Model(&models.SupportMessage{}).
		Joins("JOIN support_conversations ON support_conversations.id = support_messages.conversation_id").
		Where("support_conversations.channel = ?", models.SupportConversationChannelInApp)
	if userEmail != "" {
		query = query.Where("(support_conversations.app_user_id = ? OR (support_conversations.app_user_id IS NULL AND LOWER(support_conversations.requester_contact) = ?))", userID, userEmail)
	} else {
		query = query.Where("support_conversations.app_user_id = ?", userID)
	}

	var count int64
	if err := query.
		Where("support_messages.direction = ? AND support_messages.is_read_by_user = ?", models.SupportMessageDirectionOutbound, false).
		Count(&count).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count unread messages"})
	}

	return c.JSON(fiber.Map{
		"unreadCount": count,
	})
}

// ListPreacherQuestions returns Sadhu Sanga questions for one preacher.
// GET /api/support/preachers/:preacherId/questions
func (h *SupportHandler) ListPreacherQuestions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	preacherID, err := parseSupportPositiveUintParam(c, "preacherId", "preacher id")
	if err != nil {
		return err
	}

	page := parseSupportInt(c.Query("page"), 1, 1, 100000)
	limit := parseSupportInt(c.Query("limit"), 20, 1, 50)
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	metaLikeWithComma := fmt.Sprintf("%%\"targetPreacherId\":%d,%%", preacherID)
	metaLikeWithBrace := fmt.Sprintf("%%\"targetPreacherId\":%d}%%", preacherID)

	query := database.DB.Model(&models.SupportConversation{}).
		Where("channel = ? AND entry_point = ?", models.SupportConversationChannelInApp, "sadhu_sanga_question").
		Where("(meta_json LIKE ? OR meta_json LIKE ?)", metaLikeWithComma, metaLikeWithBrace)
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count questions"})
	}

	var conversations []models.SupportConversation
	if err := query.
		Order("created_at DESC, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&conversations).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load questions"})
	}

	conversationIDs := make([]uint, 0, len(conversations))
	for _, conversation := range conversations {
		conversationIDs = append(conversationIDs, conversation.ID)
	}

	voteCountByConversation, voteCountErr := loadSupportQuestionVoteCounts(conversationIDs)
	if voteCountErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count votes"})
	}
	myVoteByConversation, myVoteErr := loadSupportQuestionUserVotes(conversationIDs, userID)
	if myVoteErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load user votes"})
	}

	items := make([]supportPreacherQuestionListItem, 0, len(conversations))
	for _, conversation := range conversations {
		targetID := parseSupportTargetPreacherID(conversation.MetaJSON)
		if targetID > 0 && targetID != preacherID {
			continue
		}

		ticketNumber := ""
		if conversation.TicketNumber != nil {
			ticketNumber = strings.TrimSpace(*conversation.TicketNumber)
		}

		subject := strings.TrimSpace(conversation.Subject)
		if subject == "" {
			subject = "Вопрос к проповеднику"
		}
		excerpt := h.preview(conversation.LastMessagePreview)
		if excerpt == "" {
			excerpt = subject
		}

		items = append(items, supportPreacherQuestionListItem{
			ID:           conversation.ID,
			TicketNumber: ticketNumber,
			Subject:      subject,
			Excerpt:      excerpt,
			CreatedAt:    conversation.CreatedAt,
			VoteCount:    voteCountByConversation[conversation.ID],
			MyVote:       myVoteByConversation[conversation.ID],
		})
	}

	return c.JSON(fiber.Map{
		"questions": items,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

// VotePreacherQuestion toggles vote for a Sadhu Sanga question ticket.
// POST /api/support/tickets/:id/vote
func (h *SupportHandler) VotePreacherQuestion(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	conversationID, err := parseSupportPositiveUintParam(c, "id", "ticket id")
	if err != nil {
		return err
	}

	var conversation models.SupportConversation
	if err := database.DB.Select("id,channel,entry_point").First(&conversation, conversationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "question not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load question"})
	}
	if conversation.Channel != models.SupportConversationChannelInApp || strings.TrimSpace(strings.ToLower(conversation.EntryPoint)) != "sadhu_sanga_question" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ticket is not a Sadhu Sanga question"})
	}

	var req supportToggleQuestionVoteRequest
	body := strings.TrimSpace(string(c.Body()))
	if body != "" {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
		}
	}

	var existingCount int64
	if err := database.DB.Model(&models.SupportQuestionVote{}).
		Where("conversation_id = ? AND user_id = ?", conversation.ID, userID).
		Count(&existingCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load vote"})
	}

	shouldVote := existingCount == 0
	if req.Value != nil {
		shouldVote = *req.Value
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if shouldVote {
			if existingCount == 0 {
				vote := models.SupportQuestionVote{
					ConversationID: conversation.ID,
					UserID:         userID,
				}
				if err := tx.Create(&vote).Error; err != nil && !isUniqueViolation(err) {
					return err
				}
			}
			return nil
		}
		return tx.Where("conversation_id = ? AND user_id = ?", conversation.ID, userID).
			Delete(&models.SupportQuestionVote{}).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update vote"})
	}

	var voteCount int64
	if err := database.DB.Model(&models.SupportQuestionVote{}).
		Where("conversation_id = ?", conversation.ID).
		Count(&voteCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count votes"})
	}

	var currentUserVoteCount int64
	if err := database.DB.Model(&models.SupportQuestionVote{}).
		Where("conversation_id = ? AND user_id = ?", conversation.ID, userID).
		Count(&currentUserVoteCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load current vote state"})
	}

	return c.JSON(fiber.Map{
		"ticketId": conversation.ID,
		"voted":    currentUserVoteCount > 0,
		"votes":    voteCount,
	})
}

// GetSupportMetrics returns admin support metrics for in-app tickets.
// GET /api/admin/support/metrics
func (h *SupportHandler) GetSupportMetrics(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	days := parseSupportInt(c.Query("days"), 7, 1, 180)
	since := time.Now().UTC().Add(-time.Duration(days) * 24 * time.Hour)

	base := database.DB.Model(&models.SupportConversation{}).
		Where("channel = ? AND created_at >= ?", models.SupportConversationChannelInApp, since)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count conversations"})
	}

	var openCount int64
	if err := database.DB.Model(&models.SupportConversation{}).
		Where("channel = ? AND created_at >= ? AND status = ?", models.SupportConversationChannelInApp, since, models.SupportConversationStatusOpen).
		Count(&openCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count open conversations"})
	}

	var resolvedCount int64
	if err := database.DB.Model(&models.SupportConversation{}).
		Where("channel = ? AND created_at >= ? AND status = ?", models.SupportConversationChannelInApp, since, models.SupportConversationStatusResolved).
		Count(&resolvedCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count resolved conversations"})
	}

	type frtRow struct {
		CreatedAt       time.Time
		FirstResponseAt *time.Time
	}
	var rows []frtRow
	if err := database.DB.Model(&models.SupportConversation{}).
		Select("created_at, first_response_at").
		Where("channel = ? AND created_at >= ? AND first_response_at IS NOT NULL", models.SupportConversationChannelInApp, since).
		Scan(&rows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load first response metrics"})
	}

	var frtValues []float64
	var frtSum float64
	for _, row := range rows {
		if row.FirstResponseAt == nil {
			continue
		}
		seconds := row.FirstResponseAt.Sub(row.CreatedAt).Seconds()
		if seconds < 0 {
			seconds = 0
		}
		frtValues = append(frtValues, seconds)
		frtSum += seconds
	}

	avgFRT := 0.0
	if len(frtValues) > 0 {
		avgFRT = frtSum / float64(len(frtValues))
	}

	resolveRate := 0.0
	if total > 0 {
		resolveRate = float64(resolvedCount) * 100 / float64(total)
	}

	type entryPointRow struct {
		EntryPoint string
		Count      int64
	}
	var byEntryPointRows []entryPointRow
	if err := database.DB.Model(&models.SupportConversation{}).
		Select("COALESCE(entry_point, 'unknown') AS entry_point, COUNT(*) AS count").
		Where("channel = ? AND created_at >= ?", models.SupportConversationChannelInApp, since).
		Group("entry_point").
		Scan(&byEntryPointRows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load entry point metrics"})
	}

	entryPointCounts := make(map[string]int64, len(byEntryPointRows))
	for _, row := range byEntryPointRows {
		key := strings.TrimSpace(strings.ToLower(row.EntryPoint))
		if key == "" {
			key = "unknown"
		}
		entryPointCounts[key] = row.Count
	}

	return c.JSON(fiber.Map{
		"windowDays":               days,
		"total":                    total,
		"open":                     openCount,
		"resolved":                 resolvedCount,
		"backlog":                  openCount,
		"resolveRatePercent":       resolveRate,
		"avgFirstResponseSeconds":  avgFRT,
		"firstResponseSampleCount": len(frtValues),
		"entryPointCounts":         entryPointCounts,
	})
}

// ListConversations returns support conversations.
// GET /api/admin/support/conversations
func (h *SupportHandler) ListConversations(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	page := parseSupportInt(c.Query("page"), 1, 1, 100000)
	limit := parseSupportInt(c.Query("limit"), 30, 1, 200)
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	channel := strings.TrimSpace(strings.ToLower(c.Query("channel")))
	entryPoint := strings.TrimSpace(strings.ToLower(c.Query("entryPoint")))

	query := database.DB.Model(&models.SupportConversation{}).Preload("Contact").Preload("AppUser")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if channel != "" {
		query = query.Where("channel = ?", channel)
	}
	if entryPoint != "" {
		query = query.Where("entry_point = ?", entryPoint)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count conversations"})
	}

	var items []models.SupportConversation
	if err := query.Order("last_message_at DESC NULLS LAST, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list conversations"})
	}

	return c.JSON(fiber.Map{
		"conversations": items,
		"total":         total,
		"page":          page,
		"limit":         limit,
	})
}

// GetConversationMessages returns messages for one conversation.
// GET /api/admin/support/conversations/:id/messages
func (h *SupportHandler) GetConversationMessages(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	conversationID, err := parseSupportPositiveUintParam(c, "id", "conversation id")
	if err != nil {
		return err
	}

	var conversation models.SupportConversation
	if err := database.DB.Select("id").First(&conversation, conversationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load conversation"})
	}

	var messages []models.SupportMessage
	if err := database.DB.Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load messages"})
	}

	return c.JSON(fiber.Map{
		"messages": messages,
	})
}

// ResolveConversation resolves an open support conversation.
// POST /api/admin/support/conversations/:id/resolve
func (h *SupportHandler) ResolveConversation(c *fiber.Ctx) error {
	adminID, err := requireSupportAdmin(c)
	if err != nil {
		return err
	}

	conversationID, err := parseSupportPositiveUintParam(c, "id", "conversation id")
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	updates := map[string]interface{}{
		"status":      models.SupportConversationStatusResolved,
		"resolved_at": now,
		"resolved_by": adminID,
	}
	result := database.DB.Model(&models.SupportConversation{}).
		Where("id = ?", conversationID).
		Updates(updates)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to resolve conversation"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conversation not found"})
	}

	h.pushSupportStatusUpdate(conversationID, "Диалог поддержки завершен. При необходимости создайте новое обращение.")

	return c.JSON(fiber.Map{"message": "conversation resolved"})
}

// SendDirect sends a direct support message to a Telegram chat id.
// POST /api/admin/support/send-direct
func (h *SupportHandler) SendDirect(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	var req struct {
		ChatID int64  `json:"chatId"`
		Text   string `json:"text"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	cleanText, validateErr := validateSupportDirectPayload(req.ChatID, req.Text)
	if validateErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": validateErr.Error()})
	}

	if err := h.service.SendDirectMessage(c.UserContext(), req.ChatID, cleanText); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "sent"})
}

// ListFAQ returns FAQ entries for support AI.
// GET /api/admin/support/faq
func (h *SupportHandler) ListFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	var items []models.SupportFAQItem
	if err := database.DB.Order("priority DESC, id DESC").Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load faq"})
	}
	return c.JSON(fiber.Map{"items": items})
}

// CreateFAQ creates FAQ entry.
// POST /api/admin/support/faq
func (h *SupportHandler) CreateFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	var req models.SupportFAQItem
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	normalized, normalizeErr := normalizeSupportFAQPayload(req)
	if normalizeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": normalizeErr.Error()})
	}

	if err := database.DB.Create(&normalized).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create faq"})
	}
	return c.Status(fiber.StatusCreated).JSON(normalized)
}

// UpdateFAQ updates FAQ entry.
// PUT /api/admin/support/faq/:id
func (h *SupportHandler) UpdateFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	id, err := parseSupportPositiveUintParam(c, "id", "faq id")
	if err != nil {
		return err
	}

	var existing models.SupportFAQItem
	if err := database.DB.First(&existing, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "faq not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load faq"})
	}

	var req models.SupportFAQItem
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	normalized, normalizeErr := normalizeSupportFAQPayload(req)
	if normalizeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": normalizeErr.Error()})
	}

	updates := map[string]interface{}{
		"question":  normalized.Question,
		"answer":    normalized.Answer,
		"keywords":  normalized.Keywords,
		"priority":  normalized.Priority,
		"is_active": normalized.IsActive,
	}
	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update faq"})
	}

	if err := database.DB.First(&existing, existing.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to reload faq"})
	}
	return c.JSON(existing)
}

// DeleteFAQ removes FAQ entry.
// DELETE /api/admin/support/faq/:id
func (h *SupportHandler) DeleteFAQ(c *fiber.Ctx) error {
	if _, err := requireSupportAdmin(c); err != nil {
		return err
	}

	id, err := parseSupportPositiveUintParam(c, "id", "faq id")
	if err != nil {
		return err
	}

	result := database.DB.Delete(&models.SupportFAQItem{}, id)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete faq"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "faq not found"})
	}

	return c.JSON(fiber.Map{"message": "deleted"})
}

func parseSupportInt(raw string, def int, min int, max int) int {
	value := def
	trimmed := strings.TrimSpace(raw)
	if trimmed != "" {
		if parsed, err := strconv.Atoi(trimmed); err == nil {
			value = parsed
		}
	}
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

func parseSupportPositiveUintParam(c *fiber.Ctx, key string, fieldName string) (uint, error) {
	raw := strings.TrimSpace(c.Params(key))
	value, err := strconv.ParseUint(raw, 10, 32)
	if err != nil || value == 0 {
		return 0, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("invalid %s", strings.TrimSpace(fieldName)),
		})
	}
	return uint(value), nil
}

func normalizeSupportFAQPayload(req models.SupportFAQItem) (models.SupportFAQItem, error) {
	req.Question = strings.TrimSpace(req.Question)
	req.Answer = strings.TrimSpace(req.Answer)
	req.Keywords = strings.TrimSpace(req.Keywords)
	if req.Question == "" || req.Answer == "" {
		return req, errors.New("question and answer are required")
	}
	return req, nil
}

func validateSupportDirectPayload(chatID int64, text string) (string, error) {
	if chatID == 0 {
		return "", errors.New("chatId is required")
	}
	cleanText := strings.TrimSpace(text)
	if cleanText == "" {
		return "", errors.New("text is required")
	}
	return cleanText, nil
}

func loadSupportUnreadCounts(conversationIDs []uint) (map[uint]int64, error) {
	counts := make(map[uint]int64, len(conversationIDs))
	if len(conversationIDs) == 0 {
		return counts, nil
	}
	if database.DB == nil {
		return nil, errors.New("database is not initialized")
	}

	type unreadCountRow struct {
		ConversationID uint
		Count          int64
	}
	var rows []unreadCountRow
	if err := database.DB.Model(&models.SupportMessage{}).
		Select("conversation_id, COUNT(*) AS count").
		Where("conversation_id IN ? AND direction = ? AND is_read_by_user = ?", conversationIDs, models.SupportMessageDirectionOutbound, false).
		Group("conversation_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		counts[row.ConversationID] = row.Count
	}
	return counts, nil
}

func parseSupportTargetPreacherID(metaJSON string) uint {
	clean := strings.TrimSpace(metaJSON)
	if clean == "" {
		return 0
	}
	var payload struct {
		TargetPreacherID uint `json:"targetPreacherId"`
	}
	if err := json.Unmarshal([]byte(clean), &payload); err != nil {
		return 0
	}
	return payload.TargetPreacherID
}

func loadSupportQuestionVoteCounts(conversationIDs []uint) (map[uint]int64, error) {
	counts := make(map[uint]int64, len(conversationIDs))
	if len(conversationIDs) == 0 {
		return counts, nil
	}
	if database.DB == nil {
		return nil, errors.New("database is not initialized")
	}

	type voteCountRow struct {
		ConversationID uint
		Count          int64
	}
	var rows []voteCountRow
	if err := database.DB.Model(&models.SupportQuestionVote{}).
		Select("conversation_id, COUNT(*) AS count").
		Where("conversation_id IN ?", conversationIDs).
		Group("conversation_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		counts[row.ConversationID] = row.Count
	}
	return counts, nil
}

func loadSupportQuestionUserVotes(conversationIDs []uint, userID uint) (map[uint]bool, error) {
	votes := make(map[uint]bool, len(conversationIDs))
	if len(conversationIDs) == 0 {
		return votes, nil
	}
	if userID == 0 {
		return votes, nil
	}
	if database.DB == nil {
		return nil, errors.New("database is not initialized")
	}

	var rows []models.SupportQuestionVote
	if err := database.DB.Model(&models.SupportQuestionVote{}).
		Select("conversation_id").
		Where("conversation_id IN ? AND user_id = ?", conversationIDs, userID).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		votes[row.ConversationID] = true
	}
	return votes, nil
}
