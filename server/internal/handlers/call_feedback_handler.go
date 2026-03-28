package handlers

import (
	"errors"
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/observability"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	callsFeedbackEnabledSettingKey        = "calls.feedback.enabled"
	callsSupportTransferEnabledSettingKey = "calls.support_transfer.enabled"
	callsSupportWalletUserIDSettingKey    = "calls.support.wallet_user_id"
)

type CallFeedbackHandler struct {
	walletService *services.WalletService
}

func NewCallFeedbackHandler(walletService *services.WalletService) *CallFeedbackHandler {
	return &CallFeedbackHandler{
		walletService: walletService,
	}
}

type createCallFeedbackRequest struct {
	CallSessionID string   `json:"callSessionId"`
	PeerUserID    uint     `json:"peerUserId"`
	Direction     string   `json:"direction"`
	StartedAt     string   `json:"startedAt"`
	EndedAt       string   `json:"endedAt"`
	DurationSec   int      `json:"durationSec"`
	Rating        int      `json:"rating"`
	Reasons       []string `json:"reasons"`
	Comment       string   `json:"comment"`
	Platform      string   `json:"platform"`
	NetworkType   string   `json:"networkType"`
	AppVersion    string   `json:"appVersion"`
	DeviceModel   string   `json:"deviceModel"`
}

type callSupportTransferRequest struct {
	CallSessionID string `json:"callSessionId"`
	Amount        int    `json:"amount"`
}

func (h *CallFeedbackHandler) CreateFeedback(c *fiber.Ctx) error {
	if !isSystemToggleEnabled(callsFeedbackEnabledSettingKey, true) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "calls feedback is disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req createCallFeedbackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	callSessionID := strings.TrimSpace(req.CallSessionID)
	if callSessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "callSessionId is required"})
	}
	if req.PeerUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "peerUserId is required"})
	}
	if req.Rating < 1 || req.Rating > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "rating must be between 1 and 5"})
	}

	comment := strings.TrimSpace(req.Comment)
	if len([]rune(comment)) > 500 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "comment must be <= 500 chars"})
	}

	direction := strings.ToLower(strings.TrimSpace(req.Direction))
	if direction != string(models.CallDirectionIncoming) && direction != string(models.CallDirectionOutgoing) {
		direction = string(models.CallDirectionOutgoing)
	}

	var startedAt *time.Time
	if v := strings.TrimSpace(req.StartedAt); v != "" {
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "startedAt must be RFC3339"})
		}
		startedAt = &parsed
	}

	var endedAt *time.Time
	if v := strings.TrimSpace(req.EndedAt); v != "" {
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "endedAt must be RFC3339"})
		}
		endedAt = &parsed
	}

	reasons := normalizeFeedbackReasons(req.Reasons)

	row := models.CallQualityFeedback{
		CallSessionID: callSessionID,
		RaterUserID:   userID,
		PeerUserID:    req.PeerUserID,
		Direction:     models.CallDirection(direction),
		StartedAt:     startedAt,
		EndedAt:       endedAt,
		DurationSec:   maxInt(req.DurationSec, 0),
		Rating:        req.Rating,
		Reasons:       reasons,
		Comment:       comment,
		Platform:      strings.TrimSpace(req.Platform),
		NetworkType:   strings.TrimSpace(req.NetworkType),
		AppVersion:    strings.TrimSpace(req.AppVersion),
		DeviceModel:   strings.TrimSpace(req.DeviceModel),
	}

	if err := database.DB.Create(&row).Error; err != nil {
		if isDuplicateConstraintError(err) {
			var existing models.CallQualityFeedback
			if findErr := database.DB.
				Where("rater_user_id = ? AND call_session_id = ?", userID, callSessionID).
				First(&existing).Error; findErr != nil {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "feedback already exists"})
			}
			return c.JSON(fiber.Map{
				"ok":        true,
				"duplicate": true,
				"item":      existing,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save feedback"})
	}

	observability.ObserveCallFeedback(observability.CallFeedbackSample{
		Mode:        "p2p",
		Platform:    row.Platform,
		NetworkType: row.NetworkType,
		Rating:      row.Rating,
		DurationSec: row.DurationSec,
		Reasons:     row.Reasons,
	})

	feedbackResult := "submitted"
	feedbackSeverity := "info"
	if row.Rating <= 2 || hasCallQualityProblem(row.Reasons) {
		feedbackResult = "poor_quality"
		feedbackSeverity = "warning"
		log.Printf(
			"[CallQuality] degraded_feedback user_id=%d peer_user_id=%d call_session_id=%s rating=%d duration_sec=%d platform=%s network_type=%s reasons=%v app_version=%s device_model=%q",
			userID,
			row.PeerUserID,
			row.CallSessionID,
			row.Rating,
			row.DurationSec,
			row.Platform,
			row.NetworkType,
			row.Reasons,
			row.AppVersion,
			row.DeviceModel,
		)
	}
	observability.ObserveRealtimeCallEvent("call", "feedback", feedbackResult, feedbackSeverity, "p2p", row.Platform, row.NetworkType)

	return c.JSON(fiber.Map{
		"ok":   true,
		"item": row,
	})
}

func (h *CallFeedbackHandler) SupportTransfer(c *fiber.Ctx) error {
	if !isSystemToggleEnabled(callsSupportTransferEnabledSettingKey, true) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "calls support transfer is disabled"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req callSupportTransferRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	callSessionID := strings.TrimSpace(req.CallSessionID)
	if callSessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "callSessionId is required"})
	}
	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "amount must be positive"})
	}

	targetWalletUserID, err := resolveCallsSupportWalletUserID()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if targetWalletUserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot transfer to yourself"})
	}

	var feedback models.CallQualityFeedback
	if err := database.DB.
		Where("rater_user_id = ? AND call_session_id = ?", userID, callSessionID).
		First(&feedback).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "feedback not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to resolve feedback"})
	}

	dedupKey := fmt.Sprintf("calls-support:%d:%s:%d", userID, callSessionID, req.Amount)
	processed, transferErr := h.walletService.TransferRegularOnlyWithDedup(
		userID,
		targetWalletUserID,
		req.Amount,
		dedupKey,
		fmt.Sprintf("Call quality support (%s)", callSessionID),
	)
	if transferErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": transferErr.Error()})
	}

	if processed {
		now := time.Now().UTC()
		_ = database.DB.Model(&models.CallQualityFeedback{}).
			Where("id = ?", feedback.ID).
			Updates(map[string]interface{}{
				"support_transfer_amount": gorm.Expr("support_transfer_amount + ?", req.Amount),
				"support_transfer_at":     &now,
			}).Error
	}

	return c.JSON(fiber.Map{
		"ok":        true,
		"processed": processed,
	})
}

func (h *CallFeedbackHandler) AdminListFeedback(c *fiber.Ctx) error {
	query := database.DB.Model(&models.CallQualityFeedback{})

	if v := strings.TrimSpace(c.Query("dateFrom")); v != "" {
		if parsed, err := time.Parse(time.RFC3339, v); err == nil {
			query = query.Where("created_at >= ?", parsed)
		}
	}
	if v := strings.TrimSpace(c.Query("dateTo")); v != "" {
		if parsed, err := time.Parse(time.RFC3339, v); err == nil {
			query = query.Where("created_at <= ?", parsed)
		}
	}
	if v := strings.TrimSpace(c.Query("platform")); v != "" {
		query = query.Where("platform = ?", v)
	}
	if v := strings.TrimSpace(c.Query("rating")); v != "" {
		if rating, err := strconv.Atoi(v); err == nil && rating >= 1 && rating <= 5 {
			query = query.Where("rating = ?", rating)
		}
	}

	page := parsePositiveInt(c.Query("page"), 1)
	limit := parsePositiveInt(c.Query("limit"), 50)
	if limit > 200 {
		limit = 200
	}
	offset := (page - 1) * limit

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count feedback"})
	}

	items := make([]models.CallQualityFeedback, 0, limit)
	if err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch feedback"})
	}

	return c.JSON(fiber.Map{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *CallFeedbackHandler) AdminGetFeedback(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	var item models.CallQualityFeedback
	if err := database.DB.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch feedback"})
	}

	return c.JSON(item)
}

func normalizeFeedbackReasons(reasons []string) []string {
	allowed := map[string]bool{
		"audio_quality":        true,
		"video_quality":        true,
		"connection_stability": true,
		"latency":              true,
		"echo":                 true,
		"other":                true,
	}

	seen := make(map[string]bool, len(reasons))
	result := make([]string, 0, len(reasons))
	for _, raw := range reasons {
		item := strings.ToLower(strings.TrimSpace(raw))
		if item == "" || !allowed[item] || seen[item] {
			continue
		}
		seen[item] = true
		result = append(result, item)
	}
	return result
}

func hasCallQualityProblem(reasons []string) bool {
	for _, reason := range reasons {
		switch strings.ToLower(strings.TrimSpace(reason)) {
		case "connection_stability", "latency", "audio_quality", "video_quality", "echo":
			return true
		}
	}
	return false
}

func isSystemToggleEnabled(key string, fallback bool) bool {
	value := strings.TrimSpace(getSystemSettingValue(key))
	if value == "" {
		return fallback
	}
	switch strings.ToLower(value) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func getSystemSettingValue(key string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil {
		return strings.TrimSpace(setting.Value)
	}
	return strings.TrimSpace(os.Getenv(strings.ToUpper(strings.ReplaceAll(key, ".", "_"))))
}

func resolveCallsSupportWalletUserID() (uint, error) {
	raw := strings.TrimSpace(getSystemSettingValue(callsSupportWalletUserIDSettingKey))
	if raw == "" {
		raw = strings.TrimSpace(os.Getenv("CALLS_SUPPORT_WALLET_USER_ID"))
	}
	if raw == "" {
		return 0, errors.New("calls.support.wallet_user_id is not configured")
	}
	parsed, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || parsed == 0 {
		return 0, errors.New("invalid calls.support.wallet_user_id")
	}
	return uint(parsed), nil
}

func parsePositiveInt(raw string, fallback int) int {
	val, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || val <= 0 {
		return fallback
	}
	return val
}

func isDuplicateConstraintError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "unique violation") ||
		strings.Contains(msg, "duplicate entry")
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
