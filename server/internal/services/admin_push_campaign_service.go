package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type adminPushCampaignSender interface {
	SendToUser(userID uint, message PushMessage) error
}

type AdminPushCampaignListFilters struct {
	Status string
	Page   int
	Limit  int
}

type AdminPushCampaignRecipientView struct {
	ID          uint       `json:"id"`
	UserID      uint       `json:"userId"`
	Status      string     `json:"status"`
	Attempts    int        `json:"attempts"`
	Error       string     `json:"error,omitempty"`
	SentAt      *time.Time `json:"sentAt,omitempty"`
	DisplayName string     `json:"displayName,omitempty"`
	Email       string     `json:"email,omitempty"`
}

type AdminPushCampaignService struct {
	db   *gorm.DB
	push adminPushCampaignSender
	now  func() time.Time
}

func NewAdminPushCampaignService(db *gorm.DB, push adminPushCampaignSender) *AdminPushCampaignService {
	if db == nil {
		db = database.DB
	}
	if push == nil {
		push = GetPushService()
	}
	return &AdminPushCampaignService{
		db:   db,
		push: push,
		now:  func() time.Time { return time.Now().UTC() },
	}
}

func (s *AdminPushCampaignService) CreateCampaign(actorID uint, req models.AdminPushCampaignCreateRequest) (*models.AdminPushCampaign, error) {
	if s.db == nil {
		return nil, errors.New("database not initialized")
	}

	normalized, err := normalizeAdminPushCampaignCreateRequest(req, s.now())
	if err != nil {
		return nil, err
	}

	dataJSON, err := marshalJSONString(normalized.Data)
	if err != nil {
		return nil, fmt.Errorf("marshal campaign data: %w", err)
	}
	filterJSON, err := marshalJSONString(normalized.SegmentFilters)
	if err != nil {
		return nil, fmt.Errorf("marshal segment filters: %w", err)
	}

	campaign := &models.AdminPushCampaign{
		CreatedBy:          actorID,
		Title:              strings.TrimSpace(normalized.Title),
		Body:               strings.TrimSpace(normalized.Body),
		Priority:           normalizePushPriority(normalized.Priority),
		DataJSON:           dataJSON,
		TargetMode:         normalized.TargetMode,
		TargetUserID:       normalized.TargetUserID,
		SegmentFiltersJSON: filterJSON,
		SendMode:           normalized.SendMode,
		Status:             initialCampaignStatus(normalized.SendMode),
		ScheduledFor:       normalized.ScheduledFor,
	}

	var recipientCount int
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(campaign).Error; err != nil {
			return err
		}

		userIDs, err := s.resolveAudienceUserIDs(tx, normalized)
		if err != nil {
			return err
		}
		recipientCount = len(userIDs)
		campaign.TotalRecipients = recipientCount
		if err := tx.Model(&models.AdminPushCampaign{}).
			Where("id = ?", campaign.ID).
			Update("total_recipients", recipientCount).Error; err != nil {
			return err
		}

		if len(userIDs) == 0 {
			return tx.Model(&models.AdminPushCampaign{}).
				Where("id = ?", campaign.ID).
				Updates(map[string]interface{}{
					"status":      string(models.AdminPushCampaignStatusSent),
					"finished_at": s.now(),
				}).Error
		}

		recipients := make([]models.AdminPushCampaignRecipient, 0, len(userIDs))
		for _, userID := range userIDs {
			recipients = append(recipients, models.AdminPushCampaignRecipient{
				CampaignID: campaign.ID,
				UserID:     userID,
				Status:     string(models.AdminPushCampaignRecipientPending),
			})
		}
		return tx.Create(&recipients).Error
	}); err != nil {
		return nil, err
	}

	if recipientCount == 0 {
		if err := s.db.First(campaign, campaign.ID).Error; err != nil {
			return nil, err
		}
		campaign.SyncDerivedFields()
		return campaign, nil
	}

	if normalized.SendMode == string(models.AdminPushCampaignSendNow) {
		if err := s.ProcessCampaign(campaign.ID); err != nil {
			return nil, err
		}
		if err := s.db.First(campaign, campaign.ID).Error; err != nil {
			return nil, err
		}
	}
	campaign.SyncDerivedFields()

	return campaign, nil
}

func (s *AdminPushCampaignService) ListCampaigns(filters AdminPushCampaignListFilters) ([]models.AdminPushCampaign, int64, error) {
	if s.db == nil {
		return nil, 0, errors.New("database not initialized")
	}
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := s.db.Model(&models.AdminPushCampaign{})
	if status := models.NormalizeAdminPushCampaignStatus(filters.Status); status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var campaigns []models.AdminPushCampaign
	err := query.Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&campaigns).Error
	models.SyncAdminPushCampaignDerivedFields(campaigns)
	return campaigns, total, err
}

func (s *AdminPushCampaignService) GetCampaign(id uint) (*models.AdminPushCampaign, error) {
	if s.db == nil {
		return nil, errors.New("database not initialized")
	}
	var campaign models.AdminPushCampaign
	if err := s.db.First(&campaign, id).Error; err != nil {
		return nil, err
	}
	campaign.SyncDerivedFields()
	return &campaign, nil
}

func (s *AdminPushCampaignService) GetCampaignRecipients(campaignID uint, page, limit int) ([]AdminPushCampaignRecipientView, int64, error) {
	if s.db == nil {
		return nil, 0, errors.New("database not initialized")
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}

	query := s.db.Model(&models.AdminPushCampaignRecipient{}).Where("campaign_id = ?", campaignID)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var recipients []models.AdminPushCampaignRecipient
	if err := query.Order("id ASC").Offset((page - 1) * limit).Limit(limit).Find(&recipients).Error; err != nil {
		return nil, 0, err
	}

	userIDs := make([]uint, 0, len(recipients))
	for _, recipient := range recipients {
		userIDs = append(userIDs, recipient.UserID)
	}
	type userPreview struct {
		ID            uint
		Email         string
		SpiritualName string
		KarmicName    string
	}
	previews := make(map[uint]userPreview, len(userIDs))
	if len(userIDs) > 0 {
		var users []userPreview
		if err := s.db.Model(&models.User{}).
			Select("id, email, spiritual_name, karmic_name").
			Where("id IN ?", userIDs).
			Find(&users).Error; err != nil {
			return nil, 0, err
		}
		for _, user := range users {
			previews[user.ID] = user
		}
	}

	result := make([]AdminPushCampaignRecipientView, 0, len(recipients))
	for _, recipient := range recipients {
		preview := previews[recipient.UserID]
		result = append(result, AdminPushCampaignRecipientView{
			ID:          recipient.ID,
			UserID:      recipient.UserID,
			Status:      recipient.Status,
			Attempts:    recipient.Attempts,
			Error:       strings.TrimSpace(recipient.Error),
			SentAt:      recipient.SentAt,
			DisplayName: formatAdminPushRecipientName(preview.SpiritualName, preview.KarmicName),
			Email:       preview.Email,
		})
	}
	return result, total, nil
}

func (s *AdminPushCampaignService) CancelCampaign(id uint) error {
	if s.db == nil {
		return errors.New("database not initialized")
	}

	result := s.db.Model(&models.AdminPushCampaign{}).
		Where("id = ? AND status = ?", id, string(models.AdminPushCampaignStatusScheduled)).
		Updates(map[string]interface{}{
			"status":       string(models.AdminPushCampaignStatusCancelled),
			"cancelled_at": s.now(),
			"finished_at":  s.now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("campaign is not scheduled")
	}

	return s.db.Model(&models.AdminPushCampaignRecipient{}).
		Where("campaign_id = ? AND status = ?", id, string(models.AdminPushCampaignRecipientPending)).
		Update("status", string(models.AdminPushCampaignRecipientCancelled)).Error
}

func (s *AdminPushCampaignService) ProcessCampaign(campaignID uint) error {
	if s.db == nil {
		return errors.New("database not initialized")
	}

	var campaign models.AdminPushCampaign
	now := s.now()
	result := s.db.Model(&models.AdminPushCampaign{}).
		Where("id = ? AND status IN ?", campaignID, []string{
			string(models.AdminPushCampaignStatusDraft),
			string(models.AdminPushCampaignStatusScheduled),
		}).
		Updates(map[string]interface{}{
			"status":     string(models.AdminPushCampaignStatusProcessing),
			"started_at": now,
			"last_error": "",
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		if err := s.db.First(&campaign, campaignID).Error; err != nil {
			return err
		}
		if campaign.Status == string(models.AdminPushCampaignStatusProcessing) ||
			campaign.Status == string(models.AdminPushCampaignStatusSent) ||
			campaign.Status == string(models.AdminPushCampaignStatusPartialFailed) ||
			campaign.Status == string(models.AdminPushCampaignStatusFailed) ||
			campaign.Status == string(models.AdminPushCampaignStatusCancelled) {
			return nil
		}
		return errors.New("campaign cannot be processed")
	}

	if err := s.db.First(&campaign, campaignID).Error; err != nil {
		return err
	}
	return s.dispatchCampaign(&campaign)
}

func (s *AdminPushCampaignService) ProcessDueCampaigns(limit int) (int, error) {
	if s.db == nil {
		return 0, errors.New("database not initialized")
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	processed := 0
	for processed < limit {
		campaign, err := s.claimNextDueCampaign()
		if err != nil {
			return processed, err
		}
		if campaign == nil {
			return processed, nil
		}
		if err := s.dispatchCampaign(campaign); err != nil {
			return processed, err
		}
		processed++
	}
	return processed, nil
}

func (s *AdminPushCampaignService) claimNextDueCampaign() (*models.AdminPushCampaign, error) {
	var campaign models.AdminPushCampaign
	err := s.db.Transaction(func(tx *gorm.DB) error {
		err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("status = ? AND scheduled_for IS NOT NULL AND scheduled_for <= ?", string(models.AdminPushCampaignStatusScheduled), s.now()).
			Order("scheduled_for ASC").
			Order("id ASC").
			First(&campaign).Error
		if err != nil {
			return err
		}

		return tx.Model(&models.AdminPushCampaign{}).
			Where("id = ? AND status = ?", campaign.ID, string(models.AdminPushCampaignStatusScheduled)).
			Updates(map[string]interface{}{
				"status":     string(models.AdminPushCampaignStatusProcessing),
				"started_at": s.now(),
				"last_error": "",
			}).Error
	})
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &campaign, nil
}

func (s *AdminPushCampaignService) dispatchCampaign(campaign *models.AdminPushCampaign) error {
	recipients, err := s.loadPendingRecipients(campaign.ID)
	if err != nil {
		return err
	}

	message := PushMessage{
		Title:    strings.TrimSpace(campaign.Title),
		Body:     strings.TrimSpace(campaign.Body),
		Priority: normalizePushPriority(campaign.Priority),
		Data:     campaign.DataMap(),
	}

	sentCount := 0
	failedCount := 0
	skippedCount := 0
	lastError := ""

	for _, recipient := range recipients {
		hasToken, err := s.userHasActivePushToken(recipient.UserID)
		if err != nil {
			failedCount++
			lastError = err.Error()
			if updateErr := s.markRecipientResult(recipient.ID, models.AdminPushCampaignRecipientFailed, 1, err.Error(), nil); updateErr != nil {
				return updateErr
			}
			continue
		}
		if !hasToken {
			skippedCount++
			if err := s.markRecipientResult(recipient.ID, models.AdminPushCampaignRecipientSkipped, 0, "no active push token", nil); err != nil {
				return err
			}
			continue
		}

		sentAt := s.now()
		if err := s.push.SendToUser(recipient.UserID, message); err != nil {
			failedCount++
			lastError = err.Error()
			if updateErr := s.markRecipientResult(recipient.ID, models.AdminPushCampaignRecipientFailed, 1, err.Error(), nil); updateErr != nil {
				return updateErr
			}
			continue
		}

		sentCount++
		if err := s.markRecipientResult(recipient.ID, models.AdminPushCampaignRecipientSent, 1, "", &sentAt); err != nil {
			return err
		}
	}

	finalStatus := deriveAdminPushCampaignFinalStatus(sentCount, failedCount)
	now := s.now()
	if err := s.db.Model(&models.AdminPushCampaign{}).
		Where("id = ?", campaign.ID).
		Updates(map[string]interface{}{
			"status":        finalStatus,
			"finished_at":   now,
			"sent_count":    sentCount,
			"failed_count":  failedCount,
			"skipped_count": skippedCount,
			"last_error":    lastError,
		}).Error; err != nil {
		return err
	}

	return nil
}

func (s *AdminPushCampaignService) loadPendingRecipients(campaignID uint) ([]models.AdminPushCampaignRecipient, error) {
	var recipients []models.AdminPushCampaignRecipient
	err := s.db.Where("campaign_id = ? AND status = ?", campaignID, string(models.AdminPushCampaignRecipientPending)).
		Order("id ASC").
		Find(&recipients).Error
	return recipients, err
}

func (s *AdminPushCampaignService) markRecipientResult(id uint, status models.AdminPushCampaignRecipientStatus, attempts int, errText string, sentAt *time.Time) error {
	updates := map[string]interface{}{
		"status":   string(status),
		"attempts": attempts,
		"error":    strings.TrimSpace(errText),
		"sent_at":  sentAt,
	}
	return s.db.Model(&models.AdminPushCampaignRecipient{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (s *AdminPushCampaignService) resolveAudienceUserIDs(tx *gorm.DB, req models.AdminPushCampaignCreateRequest) ([]uint, error) {
	if req.TargetMode == string(models.AdminPushCampaignTargetUser) {
		if req.TargetUserID == nil || *req.TargetUserID == 0 {
			return nil, errors.New("targetUserId is required")
		}
		var count int64
		if err := tx.Model(&models.User{}).Where("id = ?", *req.TargetUserID).Count(&count).Error; err != nil {
			return nil, err
		}
		if count == 0 {
			return nil, errors.New("target user not found")
		}
		return []uint{*req.TargetUserID}, nil
	}

	query := tx.Model(&models.User{}).Distinct("users.id")
	filters := req.SegmentFilters
	if role := strings.TrimSpace(filters.Role); role != "" {
		query = query.Where("LOWER(role) = ?", strings.ToLower(role))
	}
	switch strings.ToLower(strings.TrimSpace(filters.Status)) {
	case "active":
		query = query.Where("is_blocked = ?", false)
	case "blocked":
		query = query.Where("is_blocked = ?", true)
	}
	if filters.HasPushToken {
		query = query.Where(`
			EXISTS (
				SELECT 1
				FROM user_device_tokens udt
				WHERE udt.user_id = users.id
				  AND udt.invalidated_at IS NULL
				  AND udt.token <> ''
			) OR users.push_token <> ''
		`)
	}

	var userIDs []uint
	if err := query.Order("users.id ASC").Pluck("users.id", &userIDs).Error; err != nil {
		return nil, err
	}
	return userIDs, nil
}

func (s *AdminPushCampaignService) userHasActivePushToken(userID uint) (bool, error) {
	var count int64
	if err := s.db.Model(&models.UserDeviceToken{}).
		Where("user_id = ? AND invalidated_at IS NULL AND token <> ''", userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}

	var user models.User
	if err := s.db.Select("id", "push_token").First(&user, userID).Error; err != nil {
		return false, err
	}
	return strings.TrimSpace(user.PushToken) != "", nil
}

func normalizeAdminPushCampaignCreateRequest(req models.AdminPushCampaignCreateRequest, now time.Time) (models.AdminPushCampaignCreateRequest, error) {
	req.SendMode = models.NormalizeAdminPushCampaignSendMode(req.SendMode)
	if req.SendMode == "" {
		return req, errors.New("sendMode must be now or scheduled")
	}

	req.TargetMode = models.NormalizeAdminPushCampaignTargetMode(req.TargetMode)
	if req.TargetMode == "" {
		return req, errors.New("targetMode must be user or segment")
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Body = strings.TrimSpace(req.Body)
	if req.Title == "" {
		return req, errors.New("title is required")
	}
	if req.Body == "" {
		return req, errors.New("body is required")
	}
	req.Priority = normalizePushPriority(req.Priority)

	req.SegmentFilters.Role = strings.ToLower(strings.TrimSpace(req.SegmentFilters.Role))
	req.SegmentFilters.Status = strings.ToLower(strings.TrimSpace(req.SegmentFilters.Status))
	if req.TargetMode == string(models.AdminPushCampaignTargetSegment) {
		req.SegmentFilters.HasPushToken = true
	}
	if req.TargetMode == string(models.AdminPushCampaignTargetUser) {
		req.SegmentFilters = models.AdminPushSegmentFilters{}
	}

	if req.SendMode == string(models.AdminPushCampaignSendScheduled) {
		if req.ScheduledFor == nil || req.ScheduledFor.IsZero() {
			return req, errors.New("scheduledFor is required for scheduled send")
		}
		scheduledUTC := req.ScheduledFor.UTC()
		if !scheduledUTC.After(now.Add(-1 * time.Second)) {
			return req, errors.New("scheduledFor must be in the future")
		}
		req.ScheduledFor = &scheduledUTC
	} else {
		req.ScheduledFor = nil
	}

	return req, nil
}

func initialCampaignStatus(sendMode string) string {
	if sendMode == string(models.AdminPushCampaignSendScheduled) {
		return string(models.AdminPushCampaignStatusScheduled)
	}
	return string(models.AdminPushCampaignStatusDraft)
}

func deriveAdminPushCampaignFinalStatus(sentCount, failedCount int) string {
	switch {
	case failedCount > 0 && sentCount > 0:
		return string(models.AdminPushCampaignStatusPartialFailed)
	case failedCount > 0:
		return string(models.AdminPushCampaignStatusFailed)
	default:
		return string(models.AdminPushCampaignStatusSent)
	}
}

func normalizePushPriority(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "max":
		return "max"
	case "default", "normal":
		return "default"
	default:
		return "high"
	}
}

func marshalJSONString(value interface{}) (string, error) {
	if value == nil {
		return "", nil
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	if string(payload) == "null" || string(payload) == "{}" {
		return "", nil
	}
	return string(payload), nil
}

func formatAdminPushRecipientName(spiritualName, karmicName string) string {
	spiritualName = strings.TrimSpace(spiritualName)
	karmicName = strings.TrimSpace(karmicName)
	switch {
	case spiritualName != "" && karmicName != "":
		return spiritualName + " (" + karmicName + ")"
	case spiritualName != "":
		return spiritualName
	default:
		return karmicName
	}
}

func StartAdminPushCampaignScheduler() {
	if GlobalScheduler == nil {
		return
	}
	service := NewAdminPushCampaignService(nil, nil)
	GlobalScheduler.RegisterTask("admin_push_campaign_dispatch", 1, func() {
		count, err := service.ProcessDueCampaigns(20)
		if err != nil {
			log.Printf("[AdminPushCampaigns] dispatch failed: %v", err)
			return
		}
		if count > 0 {
			log.Printf("[AdminPushCampaigns] processed due campaigns: %d", count)
		}
	})
}
