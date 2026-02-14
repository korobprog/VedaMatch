package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"
	"unicode"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ChannelService struct {
	db *gorm.DB
}

type ChannelFeedFilters struct {
	ChannelID *uint
	Search    string
	Page      int
	Limit     int
	ViewerID  uint
}

type ChannelListFilters struct {
	Search string
	Page   int
	Limit  int
}

var (
	ErrChannelsDisabled    = errors.New("channels feature is disabled")
	ErrChannelNotFound     = errors.New("channel not found")
	ErrChannelForbidden    = errors.New("forbidden")
	ErrChannelPostNotFound = errors.New("channel post not found")
	ErrInvalidPostStatus   = errors.New("invalid post status")
	ErrInvalidPayload      = errors.New("invalid payload")
)

const (
	promotedAdPlacementChannelsFeed = "channels_feed"
	defaultPromotedAdDailyCap       = 3
	defaultPromotedAdCooldownHours  = 6
	defaultPromotedInsertEvery      = 4
)

func NewChannelService() *ChannelService {
	return &ChannelService{db: database.DB}
}

func (s *ChannelService) IsFeatureEnabled() bool {
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", "CHANNELS_V1_ENABLED").First(&setting).Error; err == nil {
		return parseBoolWithDefault(setting.Value, true)
	}

	envValue := strings.TrimSpace(os.Getenv("CHANNELS_V1_ENABLED"))
	if envValue == "" {
		return true
	}
	return parseBoolWithDefault(envValue, true)
}

func (s *ChannelService) IsFeatureEnabledForUser(userID uint) bool {
	if !s.IsFeatureEnabled() {
		return false
	}

	denylist := parseUintAllowlist(s.getSystemSettingValue("CHANNELS_V1_ROLLOUT_DENYLIST", ""))
	allowlist := parseUintAllowlist(s.getSystemSettingValue("CHANNELS_V1_ROLLOUT_ALLOWLIST", ""))
	rolloutPercent := parseChannelIntWithDefault(s.getSystemSettingValue("CHANNELS_V1_ROLLOUT_PERCENT", "100"), 100)
	return isUserEnabledByRollout(userID, denylist, allowlist, rolloutPercent)
}

func (s *ChannelService) CreateChannel(ownerID uint, req models.ChannelCreateRequest) (*models.Channel, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.New("title is required")
	}

	slug, err := s.makeUniqueSlug(req.Slug, title, nil)
	if err != nil {
		return nil, err
	}

	description := strings.TrimSpace(req.Description)
	avatar := strings.TrimSpace(req.AvatarURL)
	cover := strings.TrimSpace(req.CoverURL)
	tz := strings.TrimSpace(req.Timezone)
	if tz == "" {
		tz = "UTC"
	}

	channel := models.Channel{
		OwnerID:     ownerID,
		Title:       title,
		Slug:        slug,
		Description: description,
		AvatarURL:   avatar,
		CoverURL:    cover,
		Timezone:    tz,
		IsPublic:    true,
	}
	if req.IsPublic != nil {
		channel.IsPublic = *req.IsPublic
	}

	tx := s.db.Begin()
	if err := tx.Create(&channel).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	member := models.ChannelMember{
		ChannelID: channel.ID,
		UserID:    ownerID,
		Role:      models.ChannelMemberRoleOwner,
	}
	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return s.GetChannelByID(channel.ID, ownerID)
}

func (s *ChannelService) GetChannelByID(channelID uint, viewerID uint) (*models.Channel, error) {
	var channel models.Channel
	if err := s.db.Preload("Owner").First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelNotFound
		}
		return nil, err
	}

	if channel.IsPublic {
		return &channel, nil
	}

	role, err := s.getActorRole(&channel, viewerID)
	if err != nil {
		return nil, err
	}
	if role == "" {
		return nil, ErrChannelForbidden
	}

	return &channel, nil
}

func (s *ChannelService) ListPublicChannels(filters ChannelListFilters) (*models.ChannelListResponse, error) {
	return s.listChannels(s.db.Where("is_public = ?", true), filters)
}

func (s *ChannelService) ListMyChannels(ownerID uint, filters ChannelListFilters) (*models.ChannelListResponse, error) {
	memberChannelIDs := s.db.Model(&models.ChannelMember{}).
		Select("channel_id").
		Where("user_id = ?", ownerID)

	baseQuery := s.db.Where("owner_id = ?", ownerID).
		Or("id IN (?)", memberChannelIDs)

	return s.listChannels(baseQuery, filters)
}

func (s *ChannelService) GetViewerRole(channelID uint, viewerID uint) (models.ChannelMemberRole, error) {
	if viewerID == 0 {
		return "", nil
	}

	var channel models.Channel
	if err := s.db.Select("id", "owner_id").First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrChannelNotFound
		}
		return "", err
	}

	return s.getActorRole(&channel, viewerID)
}

func (s *ChannelService) UpdateChannel(channelID, actorID uint, req models.ChannelUpdateRequest) (*models.Channel, error) {
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleOwner)
	if err != nil {
		return nil, err
	}
	if role != models.ChannelMemberRoleOwner {
		return nil, ErrChannelForbidden
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, errors.New("title cannot be empty")
		}
		updates["title"] = title
		if reqTitleSlug, slugErr := s.makeUniqueSlug("", title, &channel.ID); slugErr == nil {
			updates["slug"] = reqTitleSlug
		}
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.IsPublic != nil {
		updates["is_public"] = *req.IsPublic
	}
	if req.Timezone != nil {
		tz := strings.TrimSpace(*req.Timezone)
		if tz == "" {
			tz = "UTC"
		}
		updates["timezone"] = tz
	}

	if len(updates) > 0 {
		if err := s.db.Model(channel).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return s.GetChannelByID(channelID, actorID)
}

func (s *ChannelService) UpdateChannelBranding(channelID, actorID uint, req models.ChannelBrandingUpdateRequest) (*models.Channel, error) {
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleOwner)
	if err != nil {
		return nil, err
	}
	if role != models.ChannelMemberRoleOwner {
		return nil, ErrChannelForbidden
	}

	updates := map[string]interface{}{}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = strings.TrimSpace(*req.AvatarURL)
	}
	if req.CoverURL != nil {
		updates["cover_url"] = strings.TrimSpace(*req.CoverURL)
	}

	if len(updates) > 0 {
		if err := s.db.Model(channel).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return s.GetChannelByID(channelID, actorID)
}

func (s *ChannelService) AddMember(channelID, actorID uint, req models.ChannelMemberAddRequest) (*models.ChannelMember, error) {
	_, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleOwner)
	if err != nil {
		return nil, err
	}
	if role != models.ChannelMemberRoleOwner {
		return nil, ErrChannelForbidden
	}
	if req.UserID == 0 {
		return nil, errors.New("userId is required")
	}

	targetRole := req.Role
	if targetRole == "" {
		targetRole = models.ChannelMemberRoleEditor
	}
	if !models.IsValidChannelRole(targetRole) || targetRole == models.ChannelMemberRoleOwner {
		return nil, errors.New("invalid role")
	}

	var existing models.ChannelMember
	if err := s.db.Where("channel_id = ? AND user_id = ?", channelID, req.UserID).First(&existing).Error; err == nil {
		return &existing, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	member := models.ChannelMember{
		ChannelID: channelID,
		UserID:    req.UserID,
		Role:      targetRole,
	}
	if err := s.db.Create(&member).Error; err != nil {
		if isDuplicateKeyError(err) {
			if getErr := s.db.Where("channel_id = ? AND user_id = ?", channelID, req.UserID).First(&existing).Error; getErr != nil {
				return nil, getErr
			}
			return &existing, nil
		}
		return nil, err
	}
	return &member, nil
}

func (s *ChannelService) ListMembers(channelID, actorID uint) ([]models.ChannelMember, error) {
	_, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}

	var members []models.ChannelMember
	if err := s.db.Where("channel_id = ?", channelID).
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "spiritual_name", "karmic_name", "avatar_url")
		}).
		Order("created_at ASC").
		Find(&members).Error; err != nil {
		return nil, err
	}

	return members, nil
}

func (s *ChannelService) UpdateMemberRole(channelID, actorID, memberUserID uint, role models.ChannelMemberRole) (*models.ChannelMember, error) {
	channel, actorRole, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleOwner)
	if err != nil {
		return nil, err
	}
	if actorRole != models.ChannelMemberRoleOwner {
		return nil, ErrChannelForbidden
	}
	if !models.IsValidChannelRole(role) || role == models.ChannelMemberRoleOwner {
		return nil, errors.New("invalid role")
	}
	if memberUserID == channel.OwnerID {
		return nil, errors.New("owner role cannot be changed")
	}

	var member models.ChannelMember
	if err := s.db.Where("channel_id = ? AND user_id = ?", channelID, memberUserID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("member not found")
		}
		return nil, err
	}

	if err := s.db.Model(&member).Update("role", role).Error; err != nil {
		return nil, err
	}

	member.Role = role
	return &member, nil
}

func (s *ChannelService) RemoveMember(channelID, actorID, memberUserID uint) error {
	channel, actorRole, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleOwner)
	if err != nil {
		return err
	}
	if actorRole != models.ChannelMemberRoleOwner {
		return ErrChannelForbidden
	}
	if memberUserID == channel.OwnerID {
		return errors.New("owner cannot be removed")
	}

	result := s.db.Where("channel_id = ? AND user_id = ?", channelID, memberUserID).Delete(&models.ChannelMember{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("member not found")
	}
	return nil
}

func (s *ChannelService) CreatePost(channelID, actorID uint, req models.ChannelPostCreateRequest) (*models.ChannelPost, error) {
	channel, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	postType := req.Type
	if postType == "" {
		postType = models.ChannelPostTypeText
	}
	if !models.IsValidChannelPostType(postType) {
		return nil, errors.New("invalid post type")
	}

	ctaType := req.CTAType
	if ctaType == "" {
		ctaType = models.ChannelPostCTATypeNone
	}
	if !models.IsValidChannelCTAType(ctaType) {
		return nil, errors.New("invalid ctaType")
	}

	mediaJSON := strings.TrimSpace(req.MediaJSON)
	if mediaJSON != "" && !json.Valid([]byte(mediaJSON)) {
		return nil, ErrInvalidPayload
	}

	ctaPayload := strings.TrimSpace(req.CTAPayloadJSON)
	if ctaPayload != "" && !json.Valid([]byte(ctaPayload)) {
		return nil, ErrInvalidPayload
	}
	if err := validateChannelCTAPayload(ctaType, ctaPayload); err != nil {
		return nil, err
	}

	post := models.ChannelPost{
		ChannelID:      channel.ID,
		AuthorID:       actorID,
		Type:           postType,
		Content:        strings.TrimSpace(req.Content),
		MediaJSON:      mediaJSON,
		CTAType:        ctaType,
		CTAPayloadJSON: ctaPayload,
		Status:         models.ChannelPostStatusDraft,
	}

	if err := s.db.Create(&post).Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("Author").Preload("Channel").First(&post, post.ID).Error; err != nil {
		return nil, err
	}
	return &post, nil
}

func (s *ChannelService) ListPosts(channelID, viewerID uint, page, limit int, includeDraft bool) (*models.ChannelPostListResponse, models.ChannelMemberRole, error) {
	channel, err := s.GetChannelByID(channelID, viewerID)
	if err != nil {
		return nil, "", err
	}

	viewerRole, err := s.getActorRole(channel, viewerID)
	if err != nil {
		return nil, "", err
	}
	if rankRole(viewerRole) < rankRole(models.ChannelMemberRoleEditor) {
		includeDraft = false
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := s.db.Model(&models.ChannelPost{}).Where("channel_id = ?", channel.ID)
	if !includeDraft {
		query = query.Where("status = ?", models.ChannelPostStatusPublished)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, "", err
	}

	var posts []models.ChannelPost
	if err := query.
		Preload("Author").
		Preload("Channel").
		Order("is_pinned DESC").
		Order("pinned_at DESC NULLS LAST").
		Order("published_at DESC NULLS LAST").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error; err != nil {
		return nil, "", err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	return &models.ChannelPostListResponse{
		Posts:      posts,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, viewerRole, nil
}

func (s *ChannelService) UpdatePost(channelID, postID, actorID uint, req models.ChannelPostUpdateRequest) (*models.ChannelPost, error) {
	post, channel, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}

	role, err := s.getActorRole(channel, actorID)
	if err != nil {
		return nil, err
	}
	if rankRole(role) < rankRole(models.ChannelMemberRoleEditor) {
		return nil, ErrChannelForbidden
	}
	if err := validatePostUpdatePermission(role, actorID, post); err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	effectiveCTAType := post.CTAType
	effectiveCTAPayload := post.CTAPayloadJSON
	if req.Type != nil {
		if !models.IsValidChannelPostType(*req.Type) {
			return nil, errors.New("invalid post type")
		}
		updates["type"] = *req.Type
	}
	if req.Content != nil {
		updates["content"] = strings.TrimSpace(*req.Content)
	}
	if req.MediaJSON != nil {
		trimmed := strings.TrimSpace(*req.MediaJSON)
		if trimmed != "" && !json.Valid([]byte(trimmed)) {
			return nil, ErrInvalidPayload
		}
		updates["media_json"] = trimmed
	}
	if req.CTAType != nil {
		if !models.IsValidChannelCTAType(*req.CTAType) {
			return nil, errors.New("invalid ctaType")
		}
		updates["cta_type"] = *req.CTAType
		effectiveCTAType = *req.CTAType
		if *req.CTAType == models.ChannelPostCTATypeNone {
			updates["cta_payload_json"] = ""
			effectiveCTAPayload = ""
		}
	}
	if req.CTAPayloadJSON != nil {
		trimmed := strings.TrimSpace(*req.CTAPayloadJSON)
		if trimmed != "" && !json.Valid([]byte(trimmed)) {
			return nil, ErrInvalidPayload
		}
		updates["cta_payload_json"] = trimmed
		effectiveCTAPayload = trimmed
	}

	if err := validateChannelCTAPayload(effectiveCTAType, effectiveCTAPayload); err != nil {
		return nil, err
	}

	if len(updates) > 0 {
		if err := s.db.Model(post).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	if err := s.db.Preload("Author").Preload("Channel").First(post, post.ID).Error; err != nil {
		return nil, err
	}
	return post, nil
}

func (s *ChannelService) PublishPost(channelID, postID, actorID uint) (*models.ChannelPost, error) {
	post, channel, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}

	_, err = s.requireMinRole(channel, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}
	if post.Status == models.ChannelPostStatusPublished {
		return post, nil
	}
	if err := validateChannelCTAPayload(post.CTAType, post.CTAPayloadJSON); err != nil {
		return nil, err
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":       models.ChannelPostStatusPublished,
		"published_at": now,
		"scheduled_at": nil,
	}

	if err := s.db.Model(post).Updates(updates).Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("Author").Preload("Channel").First(post, post.ID).Error; err != nil {
		return nil, err
	}
	if err := GetMetricsService().Increment(MetricChannelPostsPublishedTotal, 1); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", MetricChannelPostsPublishedTotal, err)
	}
	return post, nil
}

func (s *ChannelService) SchedulePost(channelID, postID, actorID uint, scheduledAt time.Time) (*models.ChannelPost, error) {
	post, channel, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}

	_, err = s.requireMinRole(channel, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}
	if err := validateSchedulePostRequest(post.Status, scheduledAt); err != nil {
		return nil, err
	}
	if err := validateChannelCTAPayload(post.CTAType, post.CTAPayloadJSON); err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"status":       models.ChannelPostStatusScheduled,
		"scheduled_at": scheduledAt,
		"published_at": nil,
	}
	if err := s.db.Model(post).Updates(updates).Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("Author").Preload("Channel").First(post, post.ID).Error; err != nil {
		return nil, err
	}
	if err := GetMetricsService().Increment(MetricChannelPostsScheduledTotal, 1); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", MetricChannelPostsScheduledTotal, err)
	}
	return post, nil
}

func (s *ChannelService) PinPost(channelID, postID, actorID uint) (*models.ChannelPost, error) {
	post, channel, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}

	_, err = s.requireMinRole(channel, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}
	if err := validatePinPostStatus(post.Status); err != nil {
		return nil, err
	}

	now := time.Now()
	tx := s.db.Begin()
	if err := tx.Model(&models.ChannelPost{}).
		Where("channel_id = ? AND is_pinned = ?", channelID, true).
		Updates(map[string]interface{}{"is_pinned": false, "pinned_at": nil}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Model(&models.ChannelPost{}).
		Where("id = ? AND channel_id = ?", postID, channelID).
		Updates(map[string]interface{}{"is_pinned": true, "pinned_at": now}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("Author").Preload("Channel").First(post, post.ID).Error; err != nil {
		return nil, err
	}
	return post, nil
}

func (s *ChannelService) UnpinPost(channelID, postID, actorID uint) (*models.ChannelPost, error) {
	post, channel, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}

	_, err = s.requireMinRole(channel, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}

	if err := s.db.Model(post).
		Updates(map[string]interface{}{"is_pinned": false, "pinned_at": nil}).Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("Author").Preload("Channel").First(post, post.ID).Error; err != nil {
		return nil, err
	}
	return post, nil
}

func (s *ChannelService) PublishDuePosts(limit int) (int, error) {
	if limit < 1 {
		limit = 100
	}

	var posts []models.ChannelPost
	if err := s.db.Where("status = ? AND scheduled_at IS NOT NULL AND scheduled_at <= ?", models.ChannelPostStatusScheduled, time.Now()).
		Order("scheduled_at ASC").
		Limit(limit).
		Find(&posts).Error; err != nil {
		return 0, err
	}
	if len(posts) == 0 {
		return 0, nil
	}

	ids := make([]uint, 0, len(posts))
	for _, post := range posts {
		ids = append(ids, post.ID)
	}

	now := time.Now()
	if err := s.db.Model(&models.ChannelPost{}).
		Where("id IN ?", ids).
		Updates(map[string]interface{}{
			"status":       models.ChannelPostStatusPublished,
			"published_at": now,
			"scheduled_at": nil,
		}).Error; err != nil {
		return 0, err
	}

	if err := GetMetricsService().Increment(MetricChannelPostsPublishedTotal, int64(len(ids))); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", MetricChannelPostsPublishedTotal, err)
	}

	return len(ids), nil
}

func (s *ChannelService) TrackCTAClick(channelID, postID, viewerID uint) error {
	post, _, err := s.loadPost(channelID, postID)
	if err != nil {
		return err
	}
	if post.Status != models.ChannelPostStatusPublished {
		return ErrInvalidPostStatus
	}

	if _, err := s.GetChannelByID(channelID, viewerID); err != nil {
		return err
	}

	if err := GetMetricsService().Increment(MetricChannelCTAClickTotal, 1); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", MetricChannelCTAClickTotal, err)
	}
	return nil
}

func (s *ChannelService) GetMetricsSnapshot() (map[string]int64, error) {
	return GetMetricsService().Snapshot([]string{
		MetricChannelPostsPublishedTotal,
		MetricChannelPostsScheduledTotal,
		MetricChannelCTAClickTotal,
		MetricOrdersFromChannelTotal,
		MetricBookingsFromChannelTotal,
		MetricPromotedAdsServedTotal,
		MetricPromotedAdsClickedTotal,
	})
}

func (s *ChannelService) TrackPromotedAdClick(adID uint, viewerID uint) error {
	if adID == 0 {
		return errors.New("invalid ad id")
	}

	query := s.db.Model(&models.Ad{}).
		Where("id = ? AND status = ? AND category = ? AND ad_type = ?",
			adID,
			models.AdStatusActive,
			models.AdCategoryServices,
			models.AdTypeOffering,
		)
	if viewerID > 0 {
		query = query.Where("user_id <> ?", viewerID)
	}

	var ad models.Ad
	if err := query.First(&ad).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("promoted ad not found")
		}
		return err
	}

	if err := GetMetricsService().Increment(MetricPromotedAdsClickedTotal, 1); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", MetricPromotedAdsClickedTotal, err)
	}

	return nil
}

func (s *ChannelService) DismissPrompt(userID uint, promptKey string, postID *uint) error {
	if userID == 0 {
		return errors.New("user is required")
	}

	normalizedKey := normalizePromptKey(promptKey)
	if normalizedKey == "" {
		return errors.New("promptKey is required")
	}

	entry := models.UserDismissedPrompt{
		UserID:      userID,
		PromptKey:   normalizedKey,
		PostID:      postID,
		DismissedAt: time.Now(),
	}

	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "user_id"},
			{Name: "prompt_key"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"post_id":      postID,
			"dismissed_at": entry.DismissedAt,
			"updated_at":   entry.DismissedAt,
		}),
	}).Create(&entry).Error
}

func (s *ChannelService) GetPromptDismissStatus(userID uint, promptKeys []string) (map[string]bool, error) {
	status := make(map[string]bool)
	if userID == 0 {
		return status, errors.New("user is required")
	}

	normalized := make([]string, 0, len(promptKeys))
	seen := make(map[string]struct{}, len(promptKeys))
	for _, key := range promptKeys {
		normalizedKey := normalizePromptKey(key)
		if normalizedKey == "" {
			continue
		}
		if _, exists := seen[normalizedKey]; exists {
			continue
		}
		seen[normalizedKey] = struct{}{}
		normalized = append(normalized, normalizedKey)
		status[normalizedKey] = false
	}

	if len(normalized) == 0 {
		return status, nil
	}

	var dismissed []models.UserDismissedPrompt
	if err := s.db.Select("prompt_key").
		Where("user_id = ? AND prompt_key IN ?", userID, normalized).
		Find(&dismissed).Error; err != nil {
		return nil, err
	}

	for _, item := range dismissed {
		status[item.PromptKey] = true
	}

	return status, nil
}

func (s *ChannelService) GetFeed(filters ChannelFeedFilters) (*models.ChannelFeedResponse, error) {
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 20
	}
	offset := (filters.Page - 1) * filters.Limit

	query := s.db.Model(&models.ChannelPost{}).
		Joins("JOIN channels ON channels.id = channel_posts.channel_id AND channels.deleted_at IS NULL").
		Where("channel_posts.status = ?", models.ChannelPostStatusPublished)

	if filters.ViewerID > 0 {
		memberChannelIDs := s.db.Model(&models.ChannelMember{}).
			Select("channel_id").
			Where("user_id = ?", filters.ViewerID)
		query = query.Where(
			"channels.is_public = ? OR channels.owner_id = ? OR channel_posts.channel_id IN (?)",
			true,
			filters.ViewerID,
			memberChannelIDs,
		)
	} else {
		query = query.Where("channels.is_public = ?", true)
	}

	if filters.ChannelID != nil {
		query = query.Where("channel_posts.channel_id = ?", *filters.ChannelID)
	}
	if search := strings.TrimSpace(filters.Search); search != "" {
		query = query.Where("channel_posts.content ILIKE ?", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var posts []models.ChannelPost
	if err := query.
		Preload("Author").
		Preload("Channel").
		Order("channel_posts.is_pinned DESC").
		Order("channel_posts.pinned_at DESC NULLS LAST").
		Order("channel_posts.published_at DESC NULLS LAST").
		Order("channel_posts.created_at DESC").
		Offset(offset).
		Limit(filters.Limit).
		Find(&posts).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(filters.Limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	promotedInsertEvery := s.getPromotedInsertEvery()
	promotedFetchLimit := computePromotedFetchLimit(filters.Limit, promotedInsertEvery)
	promotedAds, err := s.loadPromotedAds(filters.ViewerID, promotedFetchLimit)
	if err != nil {
		log.Printf("[Channels] failed to load promoted ads: %v", err)
		promotedAds = nil
	}
	if len(promotedAds) > 0 {
		if err := GetMetricsService().Increment(MetricPromotedAdsServedTotal, int64(len(promotedAds))); err != nil {
			log.Printf("[Channels] metric increment failed (%s): %v", MetricPromotedAdsServedTotal, err)
		}
	}

	return &models.ChannelFeedResponse{
		Posts:               posts,
		PromotedAds:         promotedAds,
		PromotedInsertEvery: promotedInsertEvery,
		Total:               total,
		Page:                filters.Page,
		Limit:               filters.Limit,
		TotalPages:          totalPages,
	}, nil
}

func (s *ChannelService) loadPromotedAds(viewerID uint, limit int) ([]models.ChannelPromotedAd, error) {
	if limit <= 0 {
		return []models.ChannelPromotedAd{}, nil
	}

	dailyCap := s.getPromotedAdDailyCap()
	cooldownDuration := s.getPromotedAdCooldownDuration()
	if dailyCap == 0 {
		return []models.ChannelPromotedAd{}, nil
	}
	viewerCity := ""
	if viewerID > 0 {
		var viewer models.User
		if err := s.db.Select("id", "city").First(&viewer, viewerID).Error; err == nil {
			viewerCity = strings.TrimSpace(viewer.City)
		}

		dailyCount, err := s.countPromotedAdImpressions(viewerID, promotedAdPlacementChannelsFeed, time.Now().Add(-24*time.Hour))
		if err != nil {
			return nil, err
		}
		remaining := dailyCap - dailyCount
		if remaining <= 0 {
			return []models.ChannelPromotedAd{}, nil
		}
		if limit > remaining {
			limit = remaining
		}
	}

	query := s.db.Model(&models.Ad{}).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Order("position ASC").Limit(1)
		}).
		Where("status = ? AND category = ? AND ad_type = ?", models.AdStatusActive, models.AdCategoryServices, models.AdTypeOffering).
		Order("views_count DESC").
		Order("created_at DESC").
		Limit(limit)

	if viewerID > 0 {
		query = query.Where("user_id <> ?", viewerID)

		recentAdIDs, err := s.listRecentlySeenPromotedAdIDs(viewerID, promotedAdPlacementChannelsFeed, time.Now().Add(-cooldownDuration))
		if err != nil {
			return nil, err
		}
		if len(recentAdIDs) > 0 {
			query = query.Where("id NOT IN ?", recentAdIDs)
		}
	}

	if viewerCity != "" {
		query = query.Order(clause.Expr{
			SQL:  "CASE WHEN LOWER(city) = LOWER(?) THEN 0 ELSE 1 END",
			Vars: []interface{}{viewerCity},
		})
	}

	var ads []models.Ad
	if err := query.Find(&ads).Error; err != nil {
		return nil, err
	}

	result := make([]models.ChannelPromotedAd, 0, len(ads))
	for _, ad := range ads {
		photoURL := ""
		if len(ad.Photos) > 0 {
			photoURL = ad.Photos[0].PhotoURL
		}

		result = append(result, models.ChannelPromotedAd{
			ID:          ad.ID,
			Title:       ad.Title,
			Description: ad.Description,
			City:        ad.City,
			Price:       ad.Price,
			Currency:    ad.Currency,
			IsFree:      ad.IsFree,
			UserID:      ad.UserID,
			PhotoURL:    photoURL,
			CreatedAt:   ad.CreatedAt,
		})
	}

	if viewerID > 0 && len(result) > 0 {
		if err := s.savePromotedAdImpressions(viewerID, promotedAdPlacementChannelsFeed, result); err != nil {
			log.Printf("[Channels] failed to save promoted ad impressions: %v", err)
		}
	}

	return result, nil
}

func (s *ChannelService) countPromotedAdImpressions(userID uint, placement string, since time.Time) (int, error) {
	var count int64
	err := s.db.Model(&models.ChannelPromotedAdImpression{}).
		Where("user_id = ? AND placement = ? AND created_at >= ?", userID, placement, since).
		Count(&count).Error
	return int(count), err
}

func (s *ChannelService) listRecentlySeenPromotedAdIDs(userID uint, placement string, since time.Time) ([]uint, error) {
	var ids []uint
	if err := s.db.Model(&models.ChannelPromotedAdImpression{}).
		Where("user_id = ? AND placement = ? AND created_at >= ?", userID, placement, since).
		Distinct("ad_id").
		Pluck("ad_id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

func (s *ChannelService) savePromotedAdImpressions(userID uint, placement string, ads []models.ChannelPromotedAd) error {
	if userID == 0 || len(ads) == 0 {
		return nil
	}

	now := time.Now()
	rows := make([]models.ChannelPromotedAdImpression, 0, len(ads))
	for _, ad := range ads {
		rows = append(rows, models.ChannelPromotedAdImpression{
			UserID:    userID,
			AdID:      ad.ID,
			Placement: placement,
			CreatedAt: now,
		})
	}

	return s.db.Create(&rows).Error
}

func (s *ChannelService) CreateShowcase(channelID, actorID uint, req models.ChannelShowcaseCreateRequest) (*models.ChannelShowcase, error) {
	_, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(req.Title)
	kind := strings.TrimSpace(req.Kind)
	if title == "" || kind == "" {
		return nil, errors.New("title and kind are required")
	}
	filterJSON := strings.TrimSpace(req.FilterJSON)
	if filterJSON != "" && !json.Valid([]byte(filterJSON)) {
		return nil, ErrInvalidPayload
	}

	item := models.ChannelShowcase{
		ChannelID:  channelID,
		Title:      title,
		Kind:       kind,
		FilterJSON: filterJSON,
		Position:   0,
		IsActive:   true,
	}
	if req.Position != nil {
		item.Position = *req.Position
	}
	if req.IsActive != nil {
		item.IsActive = *req.IsActive
	}

	if err := s.db.Create(&item).Error; err != nil {
		return nil, err
	}

	return &item, nil
}

func (s *ChannelService) ListShowcases(channelID, viewerID uint) ([]models.ChannelShowcase, error) {
	channel, err := s.GetChannelByID(channelID, viewerID)
	if err != nil {
		return nil, err
	}

	viewerRole, err := s.getActorRole(channel, viewerID)
	if err != nil {
		return nil, err
	}

	query := s.db.Where("channel_id = ?", channelID)
	if rankRole(viewerRole) < rankRole(models.ChannelMemberRoleEditor) {
		query = query.Where("is_active = ?", true)
	}

	var items []models.ChannelShowcase
	if err := query.Order("position ASC").Order("created_at ASC").Find(&items).Error; err != nil {
		return nil, err
	}

	return items, nil
}

func (s *ChannelService) UpdateShowcase(channelID, showcaseID, actorID uint, req models.ChannelShowcaseUpdateRequest) (*models.ChannelShowcase, error) {
	_, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}

	var item models.ChannelShowcase
	if err := s.db.Where("id = ? AND channel_id = ?", showcaseID, channelID).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("showcase not found")
		}
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, errors.New("title cannot be empty")
		}
		updates["title"] = title
	}
	if req.Kind != nil {
		kind := strings.TrimSpace(*req.Kind)
		if kind == "" {
			return nil, errors.New("kind cannot be empty")
		}
		updates["kind"] = kind
	}
	if req.FilterJSON != nil {
		trimmed := strings.TrimSpace(*req.FilterJSON)
		if trimmed != "" && !json.Valid([]byte(trimmed)) {
			return nil, ErrInvalidPayload
		}
		updates["filter_json"] = trimmed
	}
	if req.Position != nil {
		updates["position"] = *req.Position
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := s.db.Model(&item).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	if err := s.db.First(&item, item.ID).Error; err != nil {
		return nil, err
	}

	return &item, nil
}

func (s *ChannelService) DeleteShowcase(channelID, showcaseID, actorID uint) error {
	_, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return err
	}
	result := s.db.Where("id = ? AND channel_id = ?", showcaseID, channelID).Delete(&models.ChannelShowcase{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("showcase not found")
	}
	return nil
}

func (s *ChannelService) loadPost(channelID, postID uint) (*models.ChannelPost, *models.Channel, error) {
	var post models.ChannelPost
	if err := s.db.Preload("Channel").Preload("Author").Where("id = ? AND channel_id = ?", postID, channelID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrChannelPostNotFound
		}
		return nil, nil, err
	}
	if post.Channel == nil {
		return nil, nil, ErrChannelNotFound
	}
	return &post, post.Channel, nil
}

func (s *ChannelService) requireRole(channelID, actorID uint, minRole models.ChannelMemberRole) (*models.Channel, models.ChannelMemberRole, error) {
	var channel models.Channel
	if err := s.db.First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", ErrChannelNotFound
		}
		return nil, "", err
	}

	role, err := s.requireMinRole(&channel, actorID, minRole)
	if err != nil {
		return nil, "", err
	}
	return &channel, role, nil
}

func (s *ChannelService) requireMinRole(channel *models.Channel, actorID uint, minRole models.ChannelMemberRole) (models.ChannelMemberRole, error) {
	role, err := s.getActorRole(channel, actorID)
	if err != nil {
		return "", err
	}
	if rankRole(role) < rankRole(minRole) {
		return "", ErrChannelForbidden
	}
	return role, nil
}

func (s *ChannelService) getActorRole(channel *models.Channel, actorID uint) (models.ChannelMemberRole, error) {
	if actorID == 0 {
		return "", nil
	}
	if channel.OwnerID == actorID {
		return models.ChannelMemberRoleOwner, nil
	}

	var member models.ChannelMember
	if err := s.db.Where("channel_id = ? AND user_id = ?", channel.ID, actorID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}

	if !models.IsValidChannelRole(member.Role) {
		return "", nil
	}

	return member.Role, nil
}

func (s *ChannelService) makeUniqueSlug(inputSlug, title string, excludeChannelID *uint) (string, error) {
	base := slugify(strings.TrimSpace(inputSlug))
	if base == "" {
		base = slugify(strings.TrimSpace(title))
	}
	if base == "" {
		base = "channel"
	}

	for i := 0; i < 1000; i++ {
		candidate := base
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", base, i+1)
		}

		query := s.db.Model(&models.Channel{}).Where("slug = ?", candidate)
		if excludeChannelID != nil {
			query = query.Where("id <> ?", *excludeChannelID)
		}

		var count int64
		if err := query.Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
	}

	return "", errors.New("failed to generate unique slug")
}

func (s *ChannelService) getSystemSettingValue(key, fallback string) string {
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", key).First(&setting).Error; err == nil {
		return strings.TrimSpace(setting.Value)
	}
	return fallback
}

func (s *ChannelService) getPromotedAdDailyCap() int {
	value := parseChannelIntWithDefault(
		s.getSystemSettingValue("CHANNELS_PROMOTED_DAILY_CAP", strconv.Itoa(defaultPromotedAdDailyCap)),
		defaultPromotedAdDailyCap,
	)
	return clampChannelInt(value, 0, 50)
}

func (s *ChannelService) getPromotedAdCooldownDuration() time.Duration {
	hours := parseChannelIntWithDefault(
		s.getSystemSettingValue("CHANNELS_PROMOTED_AD_COOLDOWN_HOURS", strconv.Itoa(defaultPromotedAdCooldownHours)),
		defaultPromotedAdCooldownHours,
	)
	hours = clampChannelInt(hours, 1, 168)
	return time.Duration(hours) * time.Hour
}

func (s *ChannelService) getPromotedInsertEvery() int {
	value := parseChannelIntWithDefault(
		s.getSystemSettingValue("CHANNELS_PROMOTED_INSERT_EVERY", strconv.Itoa(defaultPromotedInsertEvery)),
		defaultPromotedInsertEvery,
	)
	return clampChannelInt(value, 2, 20)
}

func computePromotedFetchLimit(feedLimit int, insertEvery int) int {
	if feedLimit <= 0 {
		feedLimit = 20
	}
	insertEvery = clampChannelInt(insertEvery, 2, 20)

	limit := int(math.Ceil(float64(feedLimit) / float64(insertEvery)))
	if limit < 1 {
		limit = 1
	}
	if limit > 10 {
		limit = 10
	}
	return limit
}

func (s *ChannelService) listChannels(baseQuery *gorm.DB, filters ChannelListFilters) (*models.ChannelListResponse, error) {
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := baseQuery.Model(&models.Channel{})
	if search := strings.TrimSpace(filters.Search); search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var channels []models.Channel
	if err := query.
		Preload("Owner").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&channels).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	return &models.ChannelListResponse{
		Channels:   channels,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}

	var b strings.Builder
	prevDash := false
	for _, r := range value {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteRune('-')
			prevDash = true
		}
	}

	slug := strings.Trim(b.String(), "-")
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	return slug
}

func parseBoolWithDefault(raw string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on", "enabled":
		return true
	case "0", "false", "no", "off", "disabled":
		return false
	default:
		return fallback
	}
}

func parseChannelIntWithDefault(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func clampChannelInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func parseUintAllowlist(raw string) map[uint]struct{} {
	result := make(map[uint]struct{})
	for _, token := range strings.Split(raw, ",") {
		token = strings.TrimSpace(token)
		if token == "" {
			continue
		}
		value, err := strconv.ParseUint(token, 10, 32)
		if err != nil || value == 0 {
			continue
		}
		result[uint(value)] = struct{}{}
	}
	return result
}

func isUserEnabledByRollout(userID uint, denylist map[uint]struct{}, allowlist map[uint]struct{}, rolloutPercent int) bool {
	if len(denylist) > 0 {
		if _, blocked := denylist[userID]; blocked {
			return false
		}
	}
	if len(allowlist) > 0 {
		_, ok := allowlist[userID]
		return ok
	}
	if rolloutPercent >= 100 {
		return true
	}
	if rolloutPercent <= 0 {
		return false
	}
	if userID == 0 {
		return false
	}
	return int(userID%100) < rolloutPercent
}

func normalizePromptKey(raw string) string {
	key := strings.TrimSpace(strings.ToLower(raw))
	if key == "" {
		return ""
	}
	if len(key) > 120 {
		return key[:120]
	}
	return key
}

func rankRole(role models.ChannelMemberRole) int {
	switch role {
	case models.ChannelMemberRoleOwner:
		return 3
	case models.ChannelMemberRoleAdmin:
		return 2
	case models.ChannelMemberRoleEditor:
		return 1
	default:
		return 0
	}
}

func validateChannelCTAPayload(ctaType models.ChannelPostCTAType, payload string) error {
	payload = strings.TrimSpace(payload)

	switch ctaType {
	case models.ChannelPostCTATypeNone:
		if payload != "" {
			return errors.New("ctaPayloadJson must be empty for none ctaType")
		}
		return nil
	case models.ChannelPostCTATypeBookService:
		if payload == "" {
			return errors.New("ctaPayloadJson is required for book_service ctaType")
		}
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(payload), &data); err != nil {
			return ErrInvalidPayload
		}
		serviceID, ok := extractPositiveUint(data["serviceId"])
		if !ok || serviceID == 0 {
			return errors.New("ctaPayloadJson.serviceId is required and must be > 0")
		}
		return nil
	case models.ChannelPostCTATypeOrderProducts:
		if payload == "" {
			return errors.New("ctaPayloadJson is required for order_products ctaType")
		}
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(payload), &data); err != nil {
			return ErrInvalidPayload
		}
		shopID, ok := extractPositiveUint(data["shopId"])
		if !ok || shopID == 0 {
			return errors.New("ctaPayloadJson.shopId is required and must be > 0")
		}
		rawItems, ok := data["items"].([]interface{})
		if !ok || len(rawItems) == 0 {
			return errors.New("ctaPayloadJson.items must be a non-empty array")
		}
		for _, rawItem := range rawItems {
			itemMap, ok := rawItem.(map[string]interface{})
			if !ok {
				return errors.New("ctaPayloadJson.items[] must be objects")
			}
			productID, ok := extractPositiveUint(itemMap["productId"])
			if !ok || productID == 0 {
				return errors.New("ctaPayloadJson.items[].productId is required and must be > 0")
			}
			qty, ok := extractPositiveUint(itemMap["quantity"])
			if !ok || qty == 0 {
				return errors.New("ctaPayloadJson.items[].quantity is required and must be > 0")
			}
		}
		return nil
	default:
		return errors.New("invalid ctaType")
	}
}

func validatePostUpdatePermission(role models.ChannelMemberRole, actorID uint, post *models.ChannelPost) error {
	if role != models.ChannelMemberRoleEditor {
		return nil
	}
	if post.AuthorID != actorID {
		return ErrChannelForbidden
	}
	if post.Status != models.ChannelPostStatusDraft {
		return errors.New("editor can only edit draft posts")
	}
	return nil
}

func validateSchedulePostRequest(status models.ChannelPostStatus, scheduledAt time.Time) error {
	if scheduledAt.IsZero() {
		return errors.New("scheduledAt is required")
	}
	if status == models.ChannelPostStatusPublished {
		return errors.New("published post cannot be scheduled")
	}
	return nil
}

func validatePinPostStatus(status models.ChannelPostStatus) error {
	if status != models.ChannelPostStatusPublished {
		return errors.New("only published posts can be pinned")
	}
	return nil
}

func extractPositiveUint(value interface{}) (uint, bool) {
	switch typed := value.(type) {
	case float64:
		if typed <= 0 {
			return 0, false
		}
		if math.Trunc(typed) != typed {
			return 0, false
		}
		return uint(typed), true
	case int:
		if typed <= 0 {
			return 0, false
		}
		return uint(typed), true
	case int64:
		if typed <= 0 {
			return 0, false
		}
		return uint(typed), true
	case uint:
		if typed == 0 {
			return 0, false
		}
		return typed, true
	case uint64:
		if typed == 0 {
			return 0, false
		}
		return uint(typed), true
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(typed), 10, 32)
		if err != nil || parsed == 0 {
			return 0, false
		}
		return uint(parsed), true
	default:
		return 0, false
	}
}
