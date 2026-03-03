package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	stdDraw "image/draw"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"math"
	"mime/multipart"
	"net/url"
	"os"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	sfuService "rag-agent-server/internal/services/sfu"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	xDraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ChannelService struct {
	db *gorm.DB

	settingsMu       sync.RWMutex
	settingsCache    map[string]channelSettingCacheEntry
	settingsCacheTTL time.Duration
}

type SadhuOwnerScope struct {
	OwnerIDs []uint
	MathKey  string
	Bypass   bool
	ShowNone bool
}

type channelSettingCacheEntry struct {
	value     string
	expiresAt time.Time
}

type ChannelFeedFilters struct {
	ChannelID *uint
	Search    string
	Page      int
	Limit     int
	ViewerID  uint
}

type ChannelListFilters struct {
	Search     string
	City       string
	Language   string
	Topic      string
	Page       int
	Limit      int
	ViewerID   uint
	SadhuSanga bool
}

type channelFacetRow struct {
	Value string
	Count int64
}

func normalizeMathKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func formatDateYYYYMMDD(value *time.Time) *string {
	if value == nil {
		return nil
	}
	normalized := value.UTC().Format("2006-01-02")
	return &normalized
}

func parseDateYYYYMMDD(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	raw := strings.TrimSpace(*value)
	if raw == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, ErrInvalidPayload
	}
	utc := parsed.UTC()
	return &utc, nil
}

var (
	ErrChannelsDisabled    = errors.New("channels feature is disabled")
	ErrChannelNotFound     = errors.New("channel not found")
	ErrChannelForbidden    = errors.New("forbidden")
	ErrChannelPostNotFound = errors.New("channel post not found")
	ErrChannelRoadmapPoint = errors.New("channel roadmap point not found")
	ErrInvalidPostStatus   = errors.New("invalid post status")
	ErrInvalidPayload      = errors.New("invalid payload")
	ErrPostEditWindow      = errors.New("post edit window expired")
	ErrChannelLiveNotFound = errors.New("channel live session not found")
)

const (
	promotedAdPlacementChannelsFeed = "channels_feed"
	defaultPromotedAdDailyCap       = 3
	defaultPromotedAdCooldownHours  = 6
	defaultPromotedInsertEvery      = 4
	postAuthorEditWindow            = 24 * time.Hour
	channelCoverMaxBytes            = 8 << 20
	channelCoverWidth               = 1600
	channelCoverHeight              = 900
	channelPostMediaMaxBytes        = 8 << 20
	channelPostImageWidth           = 1080
	channelPostImageHeight          = 1350
	channelPostImageMimeType        = "image/jpeg"
	channelPostImagesLimit          = 5
	channelPostCirclesLimit         = 10
)

func NewChannelService() *ChannelService {
	return &ChannelService{
		db:               database.DB,
		settingsCache:    make(map[string]channelSettingCacheEntry),
		settingsCacheTTL: 60 * time.Second,
	}
}

func (s *ChannelService) IsFeatureEnabled() bool {
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", "CHANNELS_V1_ENABLED").First(&setting).Error; err == nil {
		return parseBoolWithDefault(setting.Value, true)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("[Channels] load setting CHANNELS_V1_ENABLED failed: %v", err)
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
		if err := s.enrichChannelsFollowMeta([]*models.Channel{&channel}, viewerID); err != nil {
			return nil, err
		}
		if err := s.enrichChannelsLiveMeta([]*models.Channel{&channel}); err != nil {
			return nil, err
		}
		return &channel, nil
	}

	role, err := s.getActorRole(&channel, viewerID)
	if err != nil {
		return nil, err
	}
	if role == "" {
		return nil, ErrChannelForbidden
	}

	if err := s.enrichChannelsFollowMeta([]*models.Channel{&channel}, viewerID); err != nil {
		return nil, err
	}
	if err := s.enrichChannelsLiveMeta([]*models.Channel{&channel}); err != nil {
		return nil, err
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

func (s *ChannelService) resolveEffectiveSadhuMathFilter(viewer models.User, role string) (mathKey string, bypass bool, showNone bool) {
	effectiveRole := strings.TrimSpace(role)
	if effectiveRole == "" {
		effectiveRole = viewer.Role
	}
	if models.IsAdminRole(effectiveRole) || viewer.GodModeEnabled || isProPlanBypass(viewer.CurrentPlan) {
		return "", true, false
	}
	normalized := normalizeMathKey(viewer.Madh)
	if normalized == "" {
		return "", false, true
	}
	return normalized, false, false
}

func (s *ChannelService) ResolveSadhuOwnerScope(viewerID uint) (SadhuOwnerScope, error) {
	scope := SadhuOwnerScope{
		OwnerIDs: []uint{},
	}
	if !s.IsSadhuSangaMathFilterEnabledForUser(viewerID) {
		scope.Bypass = true
		return scope, nil
	}

	viewer, err := s.loadSadhuViewer(viewerID)
	if err != nil {
		return scope, err
	}

	mathKey, bypass, showNone := s.resolveEffectiveSadhuMathFilter(viewer, viewer.Role)
	scope.MathKey = mathKey
	scope.Bypass = bypass
	scope.ShowNone = showNone

	if bypass || showNone {
		return scope, nil
	}

	ownerIDs := make([]uint, 0)
	if err := s.db.
		Table("channels").
		Select("DISTINCT channels.owner_id").
		Joins("JOIN preacher_profiles ON preacher_profiles.user_id = channels.owner_id AND preacher_profiles.deleted_at IS NULL").
		Where("channels.deleted_at IS NULL").
		Where("LOWER(TRIM(preacher_profiles.math_key)) = ?", mathKey).
		Pluck("channels.owner_id", &ownerIDs).Error; err != nil {
		return scope, err
	}

	scope.OwnerIDs = ownerIDs
	return scope, nil
}

func (s *ChannelService) loadSadhuViewer(userID uint) (models.User, error) {
	var viewer models.User
	if userID == 0 {
		return viewer, ErrChannelForbidden
	}
	if err := s.db.
		Select("id", "madh", "role", "god_mode_enabled", "current_plan").
		First(&viewer, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return viewer, ErrChannelForbidden
		}
		return viewer, err
	}
	return viewer, nil
}

func isProPlanBypass(plan string) bool {
	normalized := strings.TrimSpace(strings.ToLower(plan))
	if normalized == "" {
		return false
	}
	return normalized == "admin" || strings.Contains(normalized, "pro")
}

func (s *ChannelService) applySadhuMathFilterToChannelQuery(query *gorm.DB, viewerID uint) (*gorm.DB, bool, error) {
	if !s.IsSadhuSangaMathFilterEnabledForUser(viewerID) {
		return query, false, nil
	}
	viewer, err := s.loadSadhuViewer(viewerID)
	if err != nil {
		return query, false, err
	}
	mathKey, bypass, showNone := s.resolveEffectiveSadhuMathFilter(viewer, viewer.Role)
	if bypass {
		s.incrementMetricSafe(MetricSadhuMathFilterBypassTotal, 1)
		return query, false, nil
	}
	if showNone {
		s.incrementMetricSafe(MetricSadhuMathFilterEmptyProfileTotal, 1)
		return query, true, nil
	}
	s.incrementMetricSafe(MetricSadhuMathFilterAppliedTotal, 1)
	filtered := query.
		Joins("JOIN preacher_profiles ON preacher_profiles.user_id = channels.owner_id AND preacher_profiles.deleted_at IS NULL").
		Where("LOWER(TRIM(preacher_profiles.math_key)) = ?", mathKey)
	return filtered, false, nil
}

func (s *ChannelService) GetSadhuSangaRecommendations(viewerID uint, filters ChannelListFilters, limit int) (*models.ChannelRecommendationsResponse, error) {
	if viewerID == 0 {
		return nil, ErrChannelForbidden
	}
	if limit <= 0 {
		limit = 3
	}
	if limit > 20 {
		limit = 20
	}

	fetchLimit := limit * 10
	if fetchLimit < 24 {
		fetchLimit = 24
	}
	if fetchLimit > 120 {
		fetchLimit = 120
	}

	query := s.db.Model(&models.Channel{}).
		Where("channels.is_public = ?", true).
		Where("channels.owner_id <> ?", viewerID)

	query, showNone, err := s.applySadhuMathFilterToChannelQuery(query, viewerID)
	if err != nil {
		return nil, err
	}
	if showNone {
		return &models.ChannelRecommendationsResponse{
			Items: []models.ChannelRecommendationItem{},
			Total: 0,
		}, nil
	}

	joinedOwner := false
	if search := strings.TrimSpace(filters.Search); search != "" {
		pattern := "%" + search + "%"
		query = query.Where("channels.title ILIKE ? OR channels.description ILIKE ? OR channels.slug ILIKE ?", pattern, pattern, pattern)
	}
	if city := strings.TrimSpace(filters.City); city != "" {
		if !joinedOwner {
			query = query.Joins("JOIN users ON users.id = channels.owner_id")
			joinedOwner = true
		}
		query = query.Where("LOWER(users.city) = LOWER(?)", city)
	}
	if language := strings.TrimSpace(filters.Language); language != "" {
		if !joinedOwner {
			query = query.Joins("JOIN users ON users.id = channels.owner_id")
			joinedOwner = true
		}
		query = query.Where("LOWER(users.language) = LOWER(?)", language)
	}
	if topic := strings.TrimSpace(filters.Topic); topic != "" {
		ownerByTopic := s.db.
			Table("user_tags").
			Select("DISTINCT user_tags.user_id").
			Joins("JOIN tags ON tags.id = user_tags.tag_id").
			Where("LOWER(tags.name) LIKE ?", "%"+strings.ToLower(topic)+"%")
		query = query.Where("channels.owner_id IN (?)", ownerByTopic)
	}

	var channels []models.Channel
	if err := query.
		Preload("Owner").
		Distinct("channels.*").
		Order("channels.created_at DESC").
		Limit(fetchLimit).
		Find(&channels).Error; err != nil {
		return nil, err
	}
	if len(channels) == 0 {
		return &models.ChannelRecommendationsResponse{
			Items: []models.ChannelRecommendationItem{},
			Total: 0,
		}, nil
	}

	channelPointers := make([]*models.Channel, 0, len(channels))
	for i := range channels {
		channelPointers = append(channelPointers, &channels[i])
	}
	if err := s.enrichChannelsFollowMeta(channelPointers, viewerID); err != nil {
		return nil, err
	}
	if err := s.enrichChannelsLiveMeta(channelPointers); err != nil {
		return nil, err
	}

	cityFilter := strings.ToLower(strings.TrimSpace(filters.City))
	languageFilter := strings.ToLower(strings.TrimSpace(filters.Language))
	topicFilter := strings.ToLower(strings.TrimSpace(filters.Topic))

	type scoredRecommendation struct {
		channel *models.Channel
		score   int
		reason  string
	}
	scored := make([]scoredRecommendation, 0, len(channels))

	for i := range channels {
		channel := &channels[i]
		ownerCity := ""
		ownerLanguage := ""
		if channel.Owner != nil {
			ownerCity = channel.Owner.City
			ownerLanguage = channel.Owner.Language
		}
		searchableText := strings.ToLower(strings.TrimSpace(strings.Join([]string{
			channel.Title,
			channel.Description,
			channel.Slug,
			ownerCity,
			ownerLanguage,
		}, " ")))

		score := 0
		reasons := make([]string, 0, 4)

		if channel.LiveStatus == string(models.ChannelLiveStatusLive) {
			score += 60
			reasons = append(reasons, "Сейчас в эфире")
		} else if channel.LiveStatus == string(models.ChannelLiveStatusScheduled) {
			score += 35
			reasons = append(reasons, "Есть запланированный эфир")
		}

		if !channel.IsFollowing {
			score += 24
			reasons = append(reasons, "Новый для вас")
		} else {
			score += 8
		}

		if channel.FollowersCount > 0 {
			score += int(math.Min(24, float64(channel.FollowersCount/100)))
		}

		if topicFilter != "" && strings.Contains(searchableText, topicFilter) {
			score += 28
			reasons = append(reasons, "Соответствует теме")
		}
		if cityFilter != "" && strings.Contains(searchableText, cityFilter) {
			score += 20
			reasons = append(reasons, "Подходит по городу")
		}
		if languageFilter != "" && strings.Contains(searchableText, languageFilter) {
			score += 16
			reasons = append(reasons, "Подходит по языку")
		}

		reason := "Рекомендуем к просмотру"
		if len(reasons) > 0 {
			reason = reasons[0]
		} else if channel.FollowersCount > 0 {
			reason = "Популярно у последователей"
		}

		scored = append(scored, scoredRecommendation{
			channel: channel,
			score:   score,
			reason:  reason,
		})
	}

	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score != scored[j].score {
			return scored[i].score > scored[j].score
		}
		if scored[i].channel.FollowersCount != scored[j].channel.FollowersCount {
			return scored[i].channel.FollowersCount > scored[j].channel.FollowersCount
		}
		return scored[i].channel.ID > scored[j].channel.ID
	})

	if len(scored) > limit {
		scored = scored[:limit]
	}

	items := make([]models.ChannelRecommendationItem, 0, len(scored))
	for _, item := range scored {
		if item.channel == nil {
			continue
		}
		items = append(items, models.ChannelRecommendationItem{
			Channel: *item.channel,
			Score:   item.score,
			Reason:  item.reason,
		})
	}

	return &models.ChannelRecommendationsResponse{
		Items: items,
		Total: len(items),
	}, nil
}

func (s *ChannelService) GetSadhuSangaFacets(viewerID uint) (*models.ChannelFacetsResponse, error) {
	viewer, err := s.loadSadhuViewer(viewerID)
	if err != nil {
		return nil, err
	}
	mathKey, bypass, showNone := s.resolveEffectiveSadhuMathFilter(viewer, viewer.Role)
	if !s.IsSadhuSangaMathFilterEnabledForUser(viewerID) {
		mathKey = ""
		bypass = true
		showNone = false
	}
	if showNone {
		s.incrementMetricSafe(MetricSadhuMathFilterEmptyProfileTotal, 1)
		return &models.ChannelFacetsResponse{
			Cities:    []models.ChannelFacetOption{},
			Languages: []models.ChannelFacetOption{},
			Topics:    []models.ChannelFacetOption{},
			Mathas:    []models.ChannelFacetOption{},
		}, nil
	}
	if bypass {
		s.incrementMetricSafe(MetricSadhuMathFilterBypassTotal, 1)
	} else {
		s.incrementMetricSafe(MetricSadhuMathFilterAppliedTotal, 1)
	}

	cityRows := make([]channelFacetRow, 0)
	cityQuery := s.db.
		Table("channels").
		Select("LOWER(TRIM(users.city)) AS value, COUNT(DISTINCT channels.id) AS count").
		Joins("JOIN users ON users.id = channels.owner_id").
		Where("channels.deleted_at IS NULL").
		Where("users.deleted_at IS NULL").
		Where("TRIM(users.city) <> ''")
	if !bypass {
		cityQuery = cityQuery.
			Joins("JOIN preacher_profiles ON preacher_profiles.user_id = channels.owner_id AND preacher_profiles.deleted_at IS NULL").
			Where("LOWER(TRIM(preacher_profiles.math_key)) = ?", mathKey)
	}
	if err := cityQuery.
		Group("LOWER(TRIM(users.city))").
		Order("count DESC, value ASC").
		Limit(50).
		Scan(&cityRows).Error; err != nil {
		return nil, err
	}

	languageRows := make([]channelFacetRow, 0)
	languageQuery := s.db.
		Table("channels").
		Select("LOWER(TRIM(users.language)) AS value, COUNT(DISTINCT channels.id) AS count").
		Joins("JOIN users ON users.id = channels.owner_id").
		Where("channels.deleted_at IS NULL").
		Where("users.deleted_at IS NULL").
		Where("TRIM(users.language) <> ''")
	if !bypass {
		languageQuery = languageQuery.
			Joins("JOIN preacher_profiles ON preacher_profiles.user_id = channels.owner_id AND preacher_profiles.deleted_at IS NULL").
			Where("LOWER(TRIM(preacher_profiles.math_key)) = ?", mathKey)
	}
	if err := languageQuery.
		Group("LOWER(TRIM(users.language))").
		Order("count DESC, value ASC").
		Limit(20).
		Scan(&languageRows).Error; err != nil {
		return nil, err
	}

	topicRows := make([]channelFacetRow, 0)
	topicQuery := s.db.
		Table("channels").
		Select("LOWER(TRIM(tags.name)) AS value, COUNT(DISTINCT channels.id) AS count").
		Joins("JOIN user_tags ON user_tags.user_id = channels.owner_id").
		Joins("JOIN tags ON tags.id = user_tags.tag_id").
		Where("channels.deleted_at IS NULL").
		Where("tags.deleted_at IS NULL").
		Where("TRIM(tags.name) <> ''")
	if !bypass {
		topicQuery = topicQuery.
			Joins("JOIN preacher_profiles ON preacher_profiles.user_id = channels.owner_id AND preacher_profiles.deleted_at IS NULL").
			Where("LOWER(TRIM(preacher_profiles.math_key)) = ?", mathKey)
	}
	if err := topicQuery.
		Group("LOWER(TRIM(tags.name))").
		Order("count DESC, value ASC").
		Limit(60).
		Scan(&topicRows).Error; err != nil {
		return nil, err
	}

	mathaRows := make([]channelFacetRow, 0)
	mathaQuery := s.db.
		Table("channels").
		Select("LOWER(TRIM(preacher_profiles.math_key)) AS value, COUNT(DISTINCT channels.id) AS count").
		Joins("JOIN preacher_profiles ON preacher_profiles.user_id = channels.owner_id").
		Where("channels.deleted_at IS NULL").
		Where("preacher_profiles.deleted_at IS NULL").
		Where("TRIM(preacher_profiles.math_key) <> ''")
	if !bypass {
		mathaQuery = mathaQuery.Where("LOWER(TRIM(preacher_profiles.math_key)) = ?", mathKey)
	}
	if err := mathaQuery.
		Group("LOWER(TRIM(preacher_profiles.math_key))").
		Order("count DESC, value ASC").
		Limit(50).
		Scan(&mathaRows).Error; err != nil {
		return nil, err
	}

	return &models.ChannelFacetsResponse{
		Cities:    toChannelFacetOptions(cityRows),
		Languages: toChannelFacetOptions(languageRows),
		Topics:    toChannelFacetOptions(topicRows),
		Mathas:    toChannelFacetOptions(mathaRows),
	}, nil
}

func toChannelFacetOptions(rows []channelFacetRow) []models.ChannelFacetOption {
	if len(rows) == 0 {
		return []models.ChannelFacetOption{}
	}
	options := make([]models.ChannelFacetOption, 0, len(rows))
	for _, row := range rows {
		value := strings.TrimSpace(strings.ToLower(row.Value))
		if value == "" {
			continue
		}
		options = append(options, models.ChannelFacetOption{
			Value: value,
			Count: row.Count,
		})
	}
	return options
}

func (s *ChannelService) GetPreacherProfile(channelID, viewerID uint) (*models.PreacherProfileDTO, error) {
	if !s.IsSadhuSangaPreacherBioEnabledForUser(viewerID) {
		return nil, ErrChannelsDisabled
	}

	channel, err := s.GetChannelByID(channelID, viewerID)
	if err != nil {
		return nil, err
	}

	var profile models.PreacherProfile
	if err := s.db.
		Where("user_id = ? AND deleted_at IS NULL", channel.OwnerID).
		Preload("Events", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("position ASC, event_date ASC NULLS LAST, id ASC")
		}).
		First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.incrementMetricSafe(MetricSadhuPreacherProfileReadTotal, 1)
			return &models.PreacherProfileDTO{
				UserID: channel.OwnerID,
				Events: []models.PreacherProfileEventDTO{},
			}, nil
		}
		return nil, err
	}

	dto := mapPreacherProfileDTO(&profile)
	s.incrementMetricSafe(MetricSadhuPreacherProfileReadTotal, 1)
	return &dto, nil
}

func (s *ChannelService) UpsertPreacherProfile(channelID, actorID uint, req models.PreacherProfileUpsertRequest) (*models.PreacherProfileDTO, error) {
	if !s.IsSadhuSangaPreacherBioEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}

	channel, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	birthDate, err := parseDateYYYYMMDD(req.BirthDate)
	if err != nil {
		return nil, err
	}
	departureDate, err := parseDateYYYYMMDD(req.DepartureDate)
	if err != nil {
		return nil, err
	}

	if len(req.Events) > 200 {
		return nil, ErrInvalidPayload
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var profile models.PreacherProfile
		if err := tx.
			Where("user_id = ? AND deleted_at IS NULL", channel.OwnerID).
			First(&profile).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			profile = models.PreacherProfile{UserID: channel.OwnerID}
		}

		if req.Bio != nil {
			profile.Bio = strings.TrimSpace(*req.Bio)
		}
		if req.BirthPlace != nil {
			profile.BirthPlace = strings.TrimSpace(*req.BirthPlace)
		}
		if req.OrganizationName != nil {
			profile.OrganizationName = strings.TrimSpace(*req.OrganizationName)
		}
		if req.MathKey != nil {
			profile.MathKey = normalizeMathKey(*req.MathKey)
		}
		profile.BirthDate = birthDate
		profile.DepartureDate = departureDate

		if len(profile.Bio) > 5000 || len(profile.BirthPlace) > 220 || len(profile.OrganizationName) > 180 || len(profile.MathKey) > 120 {
			return ErrInvalidPayload
		}

		if profile.ID == 0 {
			if err := tx.Create(&profile).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Save(&profile).Error; err != nil {
				return err
			}
		}

		if req.Events != nil {
			if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.PreacherProfileEvent{}).Error; err != nil {
				return err
			}
			for index, eventReq := range req.Events {
				title := strings.TrimSpace(eventReq.Title)
				if len(title) < 2 || len(title) > 180 {
					return ErrInvalidPayload
				}
				eventDate, parseErr := parseDateYYYYMMDD(eventReq.EventDate)
				if parseErr != nil {
					return parseErr
				}
				position := index
				if eventReq.Position != nil {
					if *eventReq.Position < 0 {
						return ErrInvalidPayload
					}
					position = *eventReq.Position
				}
				description := ""
				if eventReq.Description != nil {
					description = strings.TrimSpace(*eventReq.Description)
				}
				if len(description) > 5000 {
					return ErrInvalidPayload
				}
				event := models.PreacherProfileEvent{
					ProfileID:   profile.ID,
					Title:       title,
					EventDate:   eventDate,
					Description: description,
					Position:    position,
				}
				if err := tx.Create(&event).Error; err != nil {
					return err
				}
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}
	s.incrementMetricSafe(MetricSadhuPreacherProfileUpsertTotal, 1)

	return s.GetPreacherProfile(channelID, actorID)
}

func mapPreacherProfileDTO(profile *models.PreacherProfile) models.PreacherProfileDTO {
	dto := models.PreacherProfileDTO{
		UserID:           profile.UserID,
		Bio:              strings.TrimSpace(profile.Bio),
		BirthDate:        formatDateYYYYMMDD(profile.BirthDate),
		BirthPlace:       strings.TrimSpace(profile.BirthPlace),
		DepartureDate:    formatDateYYYYMMDD(profile.DepartureDate),
		OrganizationName: strings.TrimSpace(profile.OrganizationName),
		MathKey:          normalizeMathKey(profile.MathKey),
		Events:           make([]models.PreacherProfileEventDTO, 0, len(profile.Events)),
	}

	if len(profile.Events) > 0 {
		sort.SliceStable(profile.Events, func(i, j int) bool {
			if profile.Events[i].Position != profile.Events[j].Position {
				return profile.Events[i].Position < profile.Events[j].Position
			}
			leftDate := profile.Events[i].EventDate
			rightDate := profile.Events[j].EventDate
			switch {
			case leftDate == nil && rightDate == nil:
				return profile.Events[i].ID < profile.Events[j].ID
			case leftDate == nil:
				return false
			case rightDate == nil:
				return true
			default:
				if !leftDate.Equal(*rightDate) {
					return leftDate.Before(*rightDate)
				}
				return profile.Events[i].ID < profile.Events[j].ID
			}
		})
	}

	for _, event := range profile.Events {
		dto.Events = append(dto.Events, models.PreacherProfileEventDTO{
			ID:          event.ID,
			Title:       strings.TrimSpace(event.Title),
			EventDate:   formatDateYYYYMMDD(event.EventDate),
			Description: strings.TrimSpace(event.Description),
			Position:    event.Position,
		})
	}

	return dto
}

func (s *ChannelService) GetRoadmap(channelID, viewerID uint) (*models.ChannelRoadmapResponse, error) {
	channel, err := s.GetChannelByID(channelID, viewerID)
	if err != nil {
		return nil, err
	}

	var current models.ChannelRoadmapPoint
	var currentPtr *models.ChannelRoadmapPoint
	if err := s.db.
		Where("channel_id = ? AND status = ? AND deleted_at IS NULL", channel.ID, models.ChannelRoadmapStatusCurrent).
		Order("position ASC, event_at ASC NULLS LAST, id DESC").
		First(&current).Error; err == nil {
		current.MapURL = buildChannelRoadmapMapURL(&current)
		currentPtr = &current
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	future := make([]models.ChannelRoadmapPoint, 0)
	if err := s.db.
		Where("channel_id = ? AND status = ? AND deleted_at IS NULL", channel.ID, models.ChannelRoadmapStatusFuture).
		Order("position ASC, event_at ASC NULLS LAST, id ASC").
		Find(&future).Error; err != nil {
		return nil, err
	}
	for i := range future {
		future[i].MapURL = buildChannelRoadmapMapURL(&future[i])
	}

	past := make([]models.ChannelRoadmapPoint, 0)
	if err := s.db.
		Where("channel_id = ? AND status = ? AND deleted_at IS NULL", channel.ID, models.ChannelRoadmapStatusPast).
		Order("event_at DESC NULLS LAST, position ASC, id DESC").
		Find(&past).Error; err != nil {
		return nil, err
	}
	for i := range past {
		past[i].MapURL = buildChannelRoadmapMapURL(&past[i])
	}

	total := len(future) + len(past)
	if currentPtr != nil {
		total++
	}

	return &models.ChannelRoadmapResponse{
		ChannelID: channel.ID,
		Current:   currentPtr,
		Past:      past,
		Future:    future,
		Total:     total,
	}, nil
}

func (s *ChannelService) CreateRoadmapPoint(channelID, actorID uint, req models.ChannelRoadmapCreateRequest) (*models.ChannelRoadmapPoint, error) {
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(req.Title)
	if len(title) < 2 || len(title) > 180 {
		return nil, errors.New("title must be 2..180 characters")
	}

	status := req.Status
	if status == "" {
		status = models.ChannelRoadmapStatusFuture
	}
	if !models.IsValidChannelRoadmapStatus(status) {
		return nil, errors.New("invalid roadmap status")
	}

	city := strings.TrimSpace(req.City)
	address := strings.TrimSpace(req.Address)
	note := strings.TrimSpace(req.Note)
	if len(city) > 120 {
		return nil, errors.New("city is too long")
	}
	if len(address) > 500 {
		return nil, errors.New("address is too long")
	}

	lat, lng, err := normalizeRoadmapCoordinates(req.Latitude, req.Longitude)
	if err != nil {
		return nil, err
	}

	position := 0
	if req.Position != nil {
		if *req.Position < 0 {
			return nil, errors.New("position must be >= 0")
		}
		position = *req.Position
	} else {
		next, nextErr := s.nextRoadmapPosition(channel.ID, status)
		if nextErr != nil {
			return nil, nextErr
		}
		position = next
	}

	point := models.ChannelRoadmapPoint{
		ChannelID: channel.ID,
		CreatedBy: actorID,
		UpdatedBy: actorID,
		Title:     title,
		City:      city,
		Address:   address,
		Latitude:  lat,
		Longitude: lng,
		Status:    status,
		EventAt:   req.EventAt,
		Position:  position,
		Note:      note,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if status == models.ChannelRoadmapStatusCurrent {
			if updateErr := tx.Model(&models.ChannelRoadmapPoint{}).
				Where("channel_id = ? AND status = ? AND deleted_at IS NULL", channel.ID, models.ChannelRoadmapStatusCurrent).
				Updates(map[string]interface{}{
					"status":     models.ChannelRoadmapStatusPast,
					"updated_by": actorID,
				}).Error; updateErr != nil {
				return updateErr
			}
		}
		return tx.Create(&point).Error
	}); err != nil {
		return nil, err
	}

	point.MapURL = buildChannelRoadmapMapURL(&point)
	s.incrementMetricSafe("sadhu_roadmap_point_created_total", 1)
	log.Printf("[SadhuRoadmap] point_created channel_id=%d point_id=%d actor_id=%d role=%s status=%s", channel.ID, point.ID, actorID, role, point.Status)
	return &point, nil
}

func (s *ChannelService) UpdateRoadmapPoint(channelID, pointID, actorID uint, req models.ChannelRoadmapUpdateRequest) (*models.ChannelRoadmapPoint, error) {
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	var point models.ChannelRoadmapPoint
	if err := s.db.
		Where("id = ? AND channel_id = ? AND deleted_at IS NULL", pointID, channel.ID).
		First(&point).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelRoadmapPoint
		}
		return nil, err
	}

	nextTitle := point.Title
	if req.Title != nil {
		nextTitle = strings.TrimSpace(*req.Title)
		if len(nextTitle) < 2 || len(nextTitle) > 180 {
			return nil, errors.New("title must be 2..180 characters")
		}
	}

	nextCity := point.City
	if req.City != nil {
		nextCity = strings.TrimSpace(*req.City)
		if len(nextCity) > 120 {
			return nil, errors.New("city is too long")
		}
	}

	nextAddress := point.Address
	if req.Address != nil {
		nextAddress = strings.TrimSpace(*req.Address)
		if len(nextAddress) > 500 {
			return nil, errors.New("address is too long")
		}
	}

	nextStatus := point.Status
	if req.Status != nil {
		if !models.IsValidChannelRoadmapStatus(*req.Status) {
			return nil, errors.New("invalid roadmap status")
		}
		nextStatus = *req.Status
	}

	nextPosition := point.Position
	if req.Position != nil {
		if *req.Position < 0 {
			return nil, errors.New("position must be >= 0")
		}
		nextPosition = *req.Position
	}

	nextNote := point.Note
	if req.Note != nil {
		nextNote = strings.TrimSpace(*req.Note)
	}

	nextEventAt := point.EventAt
	if req.EventAt != nil {
		nextEventAt = req.EventAt
	}

	nextLat := point.Latitude
	nextLng := point.Longitude
	if req.Latitude != nil {
		latValue := *req.Latitude
		nextLat = &latValue
	}
	if req.Longitude != nil {
		lngValue := *req.Longitude
		nextLng = &lngValue
	}
	normalizedLat, normalizedLng, err := normalizeRoadmapCoordinates(nextLat, nextLng)
	if err != nil {
		return nil, err
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if nextStatus == models.ChannelRoadmapStatusCurrent && point.Status != models.ChannelRoadmapStatusCurrent {
			if updateErr := tx.Model(&models.ChannelRoadmapPoint{}).
				Where("channel_id = ? AND status = ? AND id <> ? AND deleted_at IS NULL", channel.ID, models.ChannelRoadmapStatusCurrent, point.ID).
				Updates(map[string]interface{}{
					"status":     models.ChannelRoadmapStatusPast,
					"updated_by": actorID,
				}).Error; updateErr != nil {
				return updateErr
			}
		}

		updates := map[string]interface{}{
			"title":      nextTitle,
			"city":       nextCity,
			"address":    nextAddress,
			"latitude":   normalizedLat,
			"longitude":  normalizedLng,
			"status":     nextStatus,
			"event_at":   nextEventAt,
			"position":   nextPosition,
			"note":       nextNote,
			"updated_by": actorID,
		}
		return tx.Model(&models.ChannelRoadmapPoint{}).
			Where("id = ? AND channel_id = ? AND deleted_at IS NULL", point.ID, channel.ID).
			Updates(updates).Error
	}); err != nil {
		return nil, err
	}

	point.Title = nextTitle
	point.City = nextCity
	point.Address = nextAddress
	point.Latitude = normalizedLat
	point.Longitude = normalizedLng
	point.Status = nextStatus
	point.EventAt = nextEventAt
	point.Position = nextPosition
	point.Note = nextNote
	point.UpdatedBy = actorID
	point.MapURL = buildChannelRoadmapMapURL(&point)

	s.incrementMetricSafe("sadhu_roadmap_point_updated_total", 1)
	log.Printf("[SadhuRoadmap] point_updated channel_id=%d point_id=%d actor_id=%d role=%s status=%s", channel.ID, point.ID, actorID, role, point.Status)
	return &point, nil
}

func (s *ChannelService) DeleteRoadmapPoint(channelID, pointID, actorID uint) error {
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return err
	}

	var point models.ChannelRoadmapPoint
	if err := s.db.
		Where("id = ? AND channel_id = ? AND deleted_at IS NULL", pointID, channel.ID).
		First(&point).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrChannelRoadmapPoint
		}
		return err
	}

	if err := s.db.Delete(&point).Error; err != nil {
		return err
	}

	s.incrementMetricSafe("sadhu_roadmap_point_deleted_total", 1)
	log.Printf("[SadhuRoadmap] point_deleted channel_id=%d point_id=%d actor_id=%d role=%s", channel.ID, point.ID, actorID, role)
	return nil
}

func (s *ChannelService) SetCurrentRoadmapPoint(channelID, pointID, actorID uint) (*models.ChannelRoadmapPoint, error) {
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	var point models.ChannelRoadmapPoint
	if err := s.db.
		Where("id = ? AND channel_id = ? AND deleted_at IS NULL", pointID, channel.ID).
		First(&point).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelRoadmapPoint
		}
		return nil, err
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if updateErr := tx.Model(&models.ChannelRoadmapPoint{}).
			Where("channel_id = ? AND status = ? AND id <> ? AND deleted_at IS NULL", channel.ID, models.ChannelRoadmapStatusCurrent, point.ID).
			Updates(map[string]interface{}{
				"status":     models.ChannelRoadmapStatusPast,
				"updated_by": actorID,
			}).Error; updateErr != nil {
			return updateErr
		}

		return tx.Model(&models.ChannelRoadmapPoint{}).
			Where("id = ? AND channel_id = ? AND deleted_at IS NULL", point.ID, channel.ID).
			Updates(map[string]interface{}{
				"status":     models.ChannelRoadmapStatusCurrent,
				"updated_by": actorID,
			}).Error
	}); err != nil {
		return nil, err
	}

	point.Status = models.ChannelRoadmapStatusCurrent
	point.UpdatedBy = actorID
	point.MapURL = buildChannelRoadmapMapURL(&point)

	s.incrementMetricSafe("sadhu_roadmap_set_current_total", 1)
	log.Printf("[SadhuRoadmap] set_current channel_id=%d point_id=%d actor_id=%d role=%s", channel.ID, point.ID, actorID, role)
	return &point, nil
}

func (s *ChannelService) ReorderRoadmapPoints(channelID, actorID uint, orderedIDs []uint) error {
	channel, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return err
	}

	if len(orderedIDs) == 0 {
		return errors.New("orderedIds is required")
	}

	seen := make(map[uint]struct{}, len(orderedIDs))
	uniqueIDs := make([]uint, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		if id == 0 {
			return errors.New("orderedIds contains invalid id")
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniqueIDs = append(uniqueIDs, id)
	}

	var count int64
	if err := s.db.Model(&models.ChannelRoadmapPoint{}).
		Where("channel_id = ? AND id IN ? AND deleted_at IS NULL", channel.ID, uniqueIDs).
		Count(&count).Error; err != nil {
		return err
	}
	if int(count) != len(uniqueIDs) {
		return ErrChannelRoadmapPoint
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		for index, pointID := range uniqueIDs {
			if err := tx.Model(&models.ChannelRoadmapPoint{}).
				Where("id = ? AND channel_id = ? AND deleted_at IS NULL", pointID, channel.ID).
				Updates(map[string]interface{}{
					"position":   index,
					"updated_by": actorID,
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *ChannelService) nextRoadmapPosition(channelID uint, status models.ChannelRoadmapStatus) (int, error) {
	type maxRow struct {
		MaxPosition *int `gorm:"column:max_position"`
	}
	row := maxRow{}
	if err := s.db.Model(&models.ChannelRoadmapPoint{}).
		Select("MAX(position) AS max_position").
		Where("channel_id = ? AND status = ? AND deleted_at IS NULL", channelID, status).
		Scan(&row).Error; err != nil {
		return 0, err
	}
	if row.MaxPosition == nil {
		return 0, nil
	}
	return *row.MaxPosition + 1, nil
}

func normalizeRoadmapCoordinates(lat *float64, lng *float64) (*float64, *float64, error) {
	if lat == nil && lng == nil {
		return nil, nil, nil
	}
	if lat == nil || lng == nil {
		return nil, nil, errors.New("latitude and longitude must be provided together")
	}
	if *lat < -90 || *lat > 90 {
		return nil, nil, errors.New("invalid latitude")
	}
	if *lng < -180 || *lng > 180 {
		return nil, nil, errors.New("invalid longitude")
	}
	latValue := *lat
	lngValue := *lng
	return &latValue, &lngValue, nil
}

func buildChannelRoadmapMapURL(point *models.ChannelRoadmapPoint) string {
	if point == nil {
		return ""
	}
	if point.Latitude != nil && point.Longitude != nil {
		return fmt.Sprintf("https://www.google.com/maps/search/?api=1&query=%f,%f", *point.Latitude, *point.Longitude)
	}
	address := strings.TrimSpace(strings.Join([]string{strings.TrimSpace(point.City), strings.TrimSpace(point.Address)}, " "))
	if address == "" {
		return ""
	}
	return "https://www.google.com/maps/search/?api=1&query=" + url.QueryEscape(address)
}

func (s *ChannelService) FollowChannel(channelID, followerID uint) (*models.ChannelMember, error) {
	if followerID == 0 {
		return nil, ErrChannelForbidden
	}

	var channel models.Channel
	if err := s.db.Select("id", "owner_id", "is_public").First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelNotFound
		}
		return nil, err
	}

	if channel.OwnerID == followerID {
		return nil, errors.New("owner cannot follow own channel")
	}

	var existing models.ChannelMember
	if err := s.db.Where("channel_id = ? AND user_id = ?", channelID, followerID).First(&existing).Error; err == nil {
		if existing.Role == models.ChannelMemberRoleSubscriber {
			return &existing, nil
		}
		return nil, errors.New("channel membership already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if !channel.IsPublic {
		return nil, ErrChannelForbidden
	}

	member := models.ChannelMember{
		ChannelID: channelID,
		UserID:    followerID,
		Role:      models.ChannelMemberRoleSubscriber,
	}
	if err := s.db.Create(&member).Error; err != nil {
		if isDuplicateKeyError(err) {
			if getErr := s.db.Where("channel_id = ? AND user_id = ?", channelID, followerID).First(&existing).Error; getErr != nil {
				return nil, getErr
			}
			return &existing, nil
		}
		return nil, err
	}

	return &member, nil
}

func (s *ChannelService) UnfollowChannel(channelID, followerID uint) error {
	if followerID == 0 {
		return ErrChannelForbidden
	}

	var channel models.Channel
	if err := s.db.Select("id", "owner_id").First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrChannelNotFound
		}
		return err
	}
	if channel.OwnerID == followerID {
		return errors.New("owner cannot unfollow own channel")
	}

	var existing models.ChannelMember
	if err := s.db.Where("channel_id = ? AND user_id = ?", channelID, followerID).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	if existing.Role != models.ChannelMemberRoleSubscriber {
		return errors.New("cannot unfollow channel with elevated role")
	}

	return s.db.Where("id = ?", existing.ID).Delete(&models.ChannelMember{}).Error
}

func (s *ChannelService) GetFollowStatus(channelID, viewerID uint) (bool, int64, error) {
	if viewerID == 0 {
		return false, 0, ErrChannelForbidden
	}

	var channel models.Channel
	if err := s.db.Select("id", "owner_id", "is_public").First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, 0, ErrChannelNotFound
		}
		return false, 0, err
	}

	if !channel.IsPublic {
		role, err := s.getActorRole(&channel, viewerID)
		if err != nil {
			return false, 0, err
		}
		if role == "" {
			return false, 0, ErrChannelForbidden
		}
	}

	counts, err := s.fetchFollowersCountMap([]uint{channelID})
	if err != nil {
		return false, 0, err
	}

	isFollowing := channel.OwnerID == viewerID
	if !isFollowing {
		rolesByChannel, roleErr := s.fetchViewerChannelRoleMap(viewerID, []uint{channelID})
		if roleErr != nil {
			return false, 0, roleErr
		}
		_, isFollowing = rolesByChannel[channelID]
	}

	return isFollowing, counts[channelID], nil
}

func (s *ChannelService) GetSadhuSangaPushPreference(userID uint) (*models.ChannelSmartPushPreferenceResponse, error) {
	if userID == 0 {
		return nil, ErrInvalidPayload
	}

	var preference models.ChannelSmartPushPreference
	if err := s.db.Where("user_id = ?", userID).First(&preference).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return &models.ChannelSmartPushPreferenceResponse{
			UserID:        userID,
			Enabled:       true,
			Reminder1h:    true,
			Reminder10m:   true,
			City:          "",
			Language:      "",
			Topics:        []string{},
			UseTimeWindow: false,
			StartHour:     8,
			EndHour:       22,
			Timezone:      s.loadUserTimezone(userID),
		}, nil
	}

	return &models.ChannelSmartPushPreferenceResponse{
		UserID:        userID,
		Enabled:       preference.Enabled,
		Reminder1h:    preference.Reminder1h,
		Reminder10m:   preference.Reminder10m,
		City:          strings.TrimSpace(preference.City),
		Language:      strings.TrimSpace(preference.Language),
		Topics:        decodeSmartPushTopics(preference.TopicsJSON),
		UseTimeWindow: preference.UseTimeWindow,
		StartHour:     clampSmartPushHour(preference.StartHour),
		EndHour:       clampSmartPushHour(preference.EndHour),
		Timezone:      resolveSmartPushTimezone(preference.Timezone, s.loadUserTimezone(userID)),
	}, nil
}

func (s *ChannelService) UpsertSadhuSangaPushPreference(userID uint, req models.ChannelSmartPushPreferenceUpsertRequest) (*models.ChannelSmartPushPreferenceResponse, error) {
	if userID == 0 {
		return nil, ErrInvalidPayload
	}

	if req.UseTimeWindow {
		if req.StartHour < 0 || req.StartHour > 23 {
			return nil, ErrInvalidPayload
		}
		if req.EndHour < 0 || req.EndHour > 23 {
			return nil, ErrInvalidPayload
		}
	}

	topics := normalizeSmartPushTopics(req.Topics)
	topicsRaw, err := json.Marshal(topics)
	if err != nil {
		return nil, ErrInvalidPayload
	}

	preference := models.ChannelSmartPushPreference{
		UserID:        userID,
		Enabled:       req.Enabled,
		Reminder1h:    req.Reminder1h,
		Reminder10m:   req.Reminder10m,
		City:          strings.TrimSpace(req.City),
		Language:      normalizeLanguageCode(req.Language),
		TopicsJSON:    string(topicsRaw),
		UseTimeWindow: req.UseTimeWindow,
		StartHour:     clampSmartPushHour(req.StartHour),
		EndHour:       clampSmartPushHour(req.EndHour),
		Timezone:      resolveSmartPushTimezone(req.Timezone, s.loadUserTimezone(userID)),
	}

	if err := s.db.Where("user_id = ?", userID).Assign(preference).FirstOrCreate(&preference).Error; err != nil {
		return nil, err
	}

	return &models.ChannelSmartPushPreferenceResponse{
		UserID:        userID,
		Enabled:       preference.Enabled,
		Reminder1h:    preference.Reminder1h,
		Reminder10m:   preference.Reminder10m,
		City:          strings.TrimSpace(preference.City),
		Language:      strings.TrimSpace(preference.Language),
		Topics:        topics,
		UseTimeWindow: preference.UseTimeWindow,
		StartHour:     preference.StartHour,
		EndHour:       preference.EndHour,
		Timezone:      preference.Timezone,
	}, nil
}

func (s *ChannelService) IsSadhuSangaLiveEnabled() bool {
	if !s.IsFeatureEnabled() {
		return false
	}
	if parseBoolWithDefault(s.getSystemSettingValue("SADHU_SANGA_LIVE_ENABLED", "true"), true) {
		return true
	}
	envValue := strings.TrimSpace(os.Getenv("SADHU_SANGA_LIVE_ENABLED"))
	if envValue == "" {
		return false
	}
	return parseBoolWithDefault(envValue, false)
}

func (s *ChannelService) IsSadhuSangaLiveEnabledForUser(userID uint) bool {
	if userID == 0 {
		return false
	}
	if !s.IsSadhuSangaLiveEnabled() {
		return false
	}

	denylist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_LIVE_ROLLOUT_DENYLIST", ""))
	allowlist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_LIVE_ROLLOUT_ALLOWLIST", ""))
	rolloutPercent := parseChannelIntWithDefault(s.getSystemSettingValue("SADHU_SANGA_LIVE_ROLLOUT_PERCENT", "100"), 100)

	return isUserEnabledByRollout(userID, denylist, allowlist, rolloutPercent)
}

func (s *ChannelService) IsSadhuSangaPreacherBioEnabled() bool {
	if !s.IsFeatureEnabled() {
		return false
	}
	if parseBoolWithDefault(s.getSystemSettingValue("SADHU_SANGA_PREACHER_BIO_ENABLED", "true"), true) {
		return true
	}
	envValue := strings.TrimSpace(os.Getenv("SADHU_SANGA_PREACHER_BIO_ENABLED"))
	if envValue == "" {
		return false
	}
	return parseBoolWithDefault(envValue, false)
}

func (s *ChannelService) IsSadhuSangaPreacherBioEnabledForUser(userID uint) bool {
	if userID == 0 {
		return false
	}
	if !s.IsSadhuSangaPreacherBioEnabled() {
		return false
	}
	denylist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_PREACHER_BIO_ROLLOUT_DENYLIST", ""))
	allowlist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_PREACHER_BIO_ROLLOUT_ALLOWLIST", ""))
	rolloutPercent := parseChannelIntWithDefault(s.getSystemSettingValue("SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT", "100"), 100)
	return isUserEnabledByRollout(userID, denylist, allowlist, rolloutPercent)
}

func (s *ChannelService) IsSadhuSangaMathFilterEnabled() bool {
	if !s.IsFeatureEnabled() {
		return false
	}
	if parseBoolWithDefault(s.getSystemSettingValue("SADHU_SANGA_MATH_FILTER_ENABLED", "true"), true) {
		return true
	}
	envValue := strings.TrimSpace(os.Getenv("SADHU_SANGA_MATH_FILTER_ENABLED"))
	if envValue == "" {
		return false
	}
	return parseBoolWithDefault(envValue, false)
}

func (s *ChannelService) IsSadhuSangaMathFilterEnabledForUser(userID uint) bool {
	if userID == 0 {
		return false
	}
	if !s.IsSadhuSangaMathFilterEnabled() {
		return false
	}
	denylist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_MATH_FILTER_ROLLOUT_DENYLIST", ""))
	allowlist := parseUintAllowlist(s.getSystemSettingValue("SADHU_SANGA_MATH_FILTER_ROLLOUT_ALLOWLIST", ""))
	rolloutPercent := parseChannelIntWithDefault(s.getSystemSettingValue("SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT", "100"), 100)
	return isUserEnabledByRollout(userID, denylist, allowlist, rolloutPercent)
}

func normalizeLiveAccessPolicy(raw models.ChannelLiveAccessPolicy) models.ChannelLiveAccessPolicy {
	value := strings.TrimSpace(strings.ToLower(string(raw)))
	switch value {
	case "", string(models.ChannelLiveAccessFollowers):
		return models.ChannelLiveAccessFollowers
	default:
		return models.ChannelLiveAccessFollowers
	}
}

func normalizeLiveBroadcastLanguage(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	if value == "" {
		return "ru"
	}
	if len(value) > 16 {
		return "ru"
	}
	for _, ch := range value {
		switch {
		case ch >= 'a' && ch <= 'z':
		case ch >= '0' && ch <= '9':
		case ch == '-':
		default:
			return "ru"
		}
	}
	return value
}

func toLiveSessionSummary(session *models.ChannelLiveSession) *models.ChannelLiveSessionSummary {
	if session == nil || session.ID == 0 {
		return nil
	}
	return &models.ChannelLiveSessionSummary{
		ID:                session.ID,
		ChannelID:         session.ChannelID,
		RoomID:            session.RoomID,
		Title:             session.Title,
		Description:       session.Description,
		BroadcastLanguage: normalizeLiveBroadcastLanguage(session.BroadcastLanguage),
		Status:            session.Status,
		AccessPolicy:      string(session.AccessPolicy),
		ScheduledAt:       session.ScheduledAt,
		StartedAt:         session.StartedAt,
		EndedAt:           session.EndedAt,
		MaxParticipants:   session.MaxParticipants,
	}
}

func (s *ChannelService) GetLiveSession(channelID, viewerID uint) (*models.ChannelLiveSessionSummary, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(viewerID) {
		return nil, ErrChannelsDisabled
	}
	if viewerID == 0 {
		return nil, ErrChannelForbidden
	}
	if _, err := s.GetChannelByID(channelID, viewerID); err != nil {
		return nil, err
	}

	var session models.ChannelLiveSession
	if err := s.db.
		Where("channel_id = ? AND status IN ?", channelID, []models.ChannelLiveStatus{
			models.ChannelLiveStatusLive,
			models.ChannelLiveStatusScheduled,
		}).
		Order("CASE WHEN status = 'live' THEN 0 ELSE 1 END").
		Order("COALESCE(started_at, scheduled_at, created_at) DESC").
		First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return toLiveSessionSummary(&session), nil
}

func (s *ChannelService) ensureRoomMember(roomID, userID uint, role string) error {
	if roomID == 0 || userID == 0 {
		return ErrInvalidPayload
	}
	normalizedRole := models.NormalizeRoomRole(role)
	if !models.IsValidRoomRole(normalizedRole) {
		normalizedRole = models.RoomRoleMember
	}

	var existing models.RoomMember
	if err := s.db.Unscoped().
		Where("room_id = ? AND user_id = ?", roomID, userID).
		First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			member := models.RoomMember{
				RoomID: roomID,
				UserID: userID,
				Role:   normalizedRole,
			}
			return s.db.Create(&member).Error
		}
		return err
	}

	updates := map[string]interface{}{
		"role":       normalizedRole,
		"deleted_at": nil,
	}
	return s.db.Unscoped().
		Model(&models.RoomMember{}).
		Where("id = ?", existing.ID).
		Updates(updates).Error
}

func toRoomRoleFromChannelRole(role models.ChannelMemberRole) string {
	switch role {
	case models.ChannelMemberRoleOwner:
		return models.RoomRoleOwner
	case models.ChannelMemberRoleAdmin, models.ChannelMemberRoleEditor:
		return models.RoomRoleAdmin
	default:
		return models.RoomRoleMember
	}
}

func (s *ChannelService) ensureLiveJoinAccess(channel *models.Channel, viewerID uint) (models.ChannelMemberRole, error) {
	if channel == nil || channel.ID == 0 || viewerID == 0 {
		return "", ErrChannelForbidden
	}
	role, err := s.getActorRole(channel, viewerID)
	if err != nil {
		return "", err
	}
	if role == "" {
		return "", ErrChannelForbidden
	}
	if !models.IsValidChannelRole(role) {
		return "", ErrChannelForbidden
	}
	return role, nil
}

func (s *ChannelService) CreateLiveSession(channelID, actorID uint, req models.ChannelLiveSessionUpsertRequest) (*models.ChannelLiveSessionSummary, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	channel, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, ErrInvalidPayload
	}
	accessPolicy := normalizeLiveAccessPolicy(req.AccessPolicy)
	broadcastLanguage := normalizeLiveBroadcastLanguage(req.BroadcastLanguage)
	if req.MaxParticipants != nil && *req.MaxParticipants <= 0 {
		return nil, ErrInvalidPayload
	}
	description := strings.TrimSpace(req.Description)

	var existing models.ChannelLiveSession
	if err := s.db.
		Where("channel_id = ? AND status IN ?", channelID, []models.ChannelLiveStatus{
			models.ChannelLiveStatusScheduled,
			models.ChannelLiveStatusLive,
		}).
		Order("created_at DESC").
		First(&existing).Error; err == nil {
		return nil, errors.New("live session already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	room := models.Room{
		Name:        fmt.Sprintf("Live: %s", channel.Title),
		Description: fmt.Sprintf("Live session for channel %s", channel.Title),
		OwnerID:     channel.OwnerID,
		IsPublic:    false,
		AiEnabled:   false,
		Language:    broadcastLanguage,
	}
	if err := s.db.Create(&room).Error; err != nil {
		return nil, err
	}
	if err := s.ensureRoomMember(room.ID, channel.OwnerID, models.RoomRoleOwner); err != nil {
		return nil, err
	}

	session := models.ChannelLiveSession{
		ChannelID:         channelID,
		RoomID:            room.ID,
		CreatedBy:         actorID,
		Title:             title,
		Description:       description,
		BroadcastLanguage: broadcastLanguage,
		ScheduledAt:       req.ScheduledAt,
		Status:            models.ChannelLiveStatusScheduled,
		AccessPolicy:      accessPolicy,
		MaxParticipants:   req.MaxParticipants,
	}
	if err := s.db.Create(&session).Error; err != nil {
		return nil, err
	}
	s.incrementMetricSafe(MetricSadhuLiveCreatedTotal, 1)
	s.incrementMetricSafe(MetricSadhuLiveLanguageSetTotal, 1)
	log.Printf("[SadhuLive] created channel_id=%d live_id=%d actor_id=%d", channel.ID, session.ID, actorID)
	if pushErr := s.sendLivePushToSubscribers(channel, &session, false); pushErr != nil {
		log.Printf("[Channels] live create push failed channel=%d live=%d: %v", channel.ID, session.ID, pushErr)
	}

	return toLiveSessionSummary(&session), nil
}

func (s *ChannelService) UpdateLiveSession(channelID, liveID, actorID uint, req models.ChannelLiveSessionUpsertRequest) (*models.ChannelLiveSessionSummary, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	if _, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor); err != nil {
		return nil, err
	}

	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channelID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelLiveNotFound
		}
		return nil, err
	}
	if session.Status == models.ChannelLiveStatusEnded || session.Status == models.ChannelLiveStatusCancelled {
		return nil, errors.New("cannot update completed live session")
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		title := strings.TrimSpace(req.Title)
		if title == "" {
			return nil, ErrInvalidPayload
		}
		updates["title"] = title
	}
	if req.Description != "" {
		updates["description"] = strings.TrimSpace(req.Description)
	}
	if req.ScheduledAt != nil {
		updates["scheduled_at"] = req.ScheduledAt
	}
	if req.AccessPolicy != "" {
		updates["access_policy"] = normalizeLiveAccessPolicy(req.AccessPolicy)
	}
	if req.BroadcastLanguage != "" {
		normalizedLanguage := normalizeLiveBroadcastLanguage(req.BroadcastLanguage)
		updates["broadcast_language"] = normalizedLanguage
		updates["updated_at"] = time.Now().UTC()
		if normalizedLanguage != normalizeLiveBroadcastLanguage(session.BroadcastLanguage) {
			s.incrementMetricSafe(MetricSadhuLiveLanguageSetTotal, 1)
		}
		_ = s.db.Model(&models.Room{}).Where("id = ?", session.RoomID).Update("language", normalizedLanguage).Error
	}
	if req.MaxParticipants != nil {
		if *req.MaxParticipants <= 0 {
			return nil, ErrInvalidPayload
		}
		updates["max_participants"] = req.MaxParticipants
	}
	if len(updates) == 0 {
		return toLiveSessionSummary(&session), nil
	}
	if err := s.db.Model(&models.ChannelLiveSession{}).Where("id = ?", session.ID).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&session, session.ID).Error; err != nil {
		return nil, err
	}
	log.Printf("[SadhuLive] updated channel_id=%d live_id=%d actor_id=%d", channelID, session.ID, actorID)
	return toLiveSessionSummary(&session), nil
}

func (s *ChannelService) StartLiveSession(channelID, liveID, actorID uint) (*models.ChannelLiveSessionSummary, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	if _, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor); err != nil {
		return nil, err
	}

	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channelID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelLiveNotFound
		}
		return nil, err
	}
	if session.Status == models.ChannelLiveStatusLive {
		return toLiveSessionSummary(&session), nil
	}
	if session.Status != models.ChannelLiveStatusScheduled {
		return nil, errors.New("invalid live session status transition")
	}

	now := time.Now().UTC()
	if err := s.db.Model(&models.ChannelLiveSession{}).
		Where("id = ? AND status = ?", session.ID, models.ChannelLiveStatusScheduled).
		Updates(map[string]interface{}{
			"status":       models.ChannelLiveStatusLive,
			"started_at":   now,
			"updated_at":   now,
			"scheduled_at": session.ScheduledAt,
		}).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&session, session.ID).Error; err != nil {
		return nil, err
	}
	s.incrementMetricSafe(MetricSadhuLiveStartedTotal, 1)
	log.Printf("[SadhuLive] started channel_id=%d live_id=%d actor_id=%d", channelID, session.ID, actorID)
	var channel models.Channel
	if err := s.db.Select("id", "owner_id", "title", "is_public").First(&channel, channelID).Error; err == nil {
		if pushErr := s.sendLivePushToSubscribers(&channel, &session, true); pushErr != nil {
			log.Printf("[Channels] live start push failed channel=%d live=%d: %v", channel.ID, session.ID, pushErr)
		}
	}
	return toLiveSessionSummary(&session), nil
}

func (s *ChannelService) sendLivePushToSubscribers(channel *models.Channel, session *models.ChannelLiveSession, isStart bool) error {
	if channel == nil || session == nil || channel.ID == 0 || session.ID == 0 {
		return nil
	}

	var subscribers []models.ChannelMember
	if err := s.db.Select("user_id").
		Where("channel_id = ? AND role NOT IN ?", channel.ID, []models.ChannelMemberRole{
			models.ChannelMemberRoleOwner,
			models.ChannelMemberRoleAdmin,
			models.ChannelMemberRoleEditor,
		}).
		Find(&subscribers).Error; err != nil {
		return err
	}
	if len(subscribers) == 0 {
		return nil
	}
	userIDs := uniqueChannelMemberUserIDs(subscribers)
	if len(userIDs) == 0 {
		return nil
	}

	var owner models.User
	if err := s.db.Select("id", "city", "language", "interests", "bio", "skills", "timezone").First(&owner, channel.OwnerID).Error; err != nil {
		return err
	}

	pseudoPost := &models.ChannelPost{
		ChannelID: channel.ID,
		Content:   strings.TrimSpace(session.Title + " " + session.Description),
	}

	title := fmt.Sprintf("Эфир канала %s", strings.TrimSpace(channel.Title))
	body := "Новый эфир запланирован"
	if isStart {
		body = "Эфир уже начался. Подключайтесь сейчас."
	}
	for _, userID := range userIDs {
		shouldSend, filterErr := s.shouldSendSubscriberPushBySmartPreference(pseudoPost, channel, &owner, userID)
		if filterErr != nil {
			log.Printf("[Channels] live push filter failed channel=%d live=%d user=%d: %v", channel.ID, session.ID, userID, filterErr)
			continue
		}
		if !shouldSend {
			continue
		}
		pushMessage := PushMessage{
			Title:    title,
			Body:     body,
			Priority: "high",
			Data: map[string]string{
				"type":      "channel_live",
				"channelId": strconv.FormatUint(uint64(channel.ID), 10),
				"liveId":    strconv.FormatUint(uint64(session.ID), 10),
				"roomId":    strconv.FormatUint(uint64(session.RoomID), 10),
				"status":    string(session.Status),
			},
		}
		if err := GetPushService().SendToUser(userID, pushMessage); err != nil {
			log.Printf("[Channels] live push send failed channel=%d live=%d user=%d: %v", channel.ID, session.ID, userID, err)
		}
	}
	return nil
}

func uniqueChannelMemberUserIDs(members []models.ChannelMember) []uint {
	if len(members) == 0 {
		return []uint{}
	}
	result := make([]uint, 0, len(members))
	seen := make(map[uint]struct{}, len(members))
	for _, member := range members {
		if member.UserID == 0 {
			continue
		}
		if _, ok := seen[member.UserID]; ok {
			continue
		}
		seen[member.UserID] = struct{}{}
		result = append(result, member.UserID)
	}
	return result
}

func (s *ChannelService) EndLiveSession(channelID, liveID, actorID uint) (*models.ChannelLiveSessionSummary, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	if _, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor); err != nil {
		return nil, err
	}

	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channelID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelLiveNotFound
		}
		return nil, err
	}
	if session.Status != models.ChannelLiveStatusLive {
		return nil, errors.New("only active live session can be ended")
	}

	now := time.Now().UTC()
	var activeViewers []models.ChannelLiveViewer
	if err := s.db.Where("session_id = ? AND is_active = ?", session.ID, true).Find(&activeViewers).Error; err != nil {
		return nil, err
	}

	var additionalWatchSeconds int64
	for _, viewer := range activeViewers {
		if viewer.JoinedAt == nil {
			continue
		}
		delta := int64(now.Sub(*viewer.JoinedAt).Seconds())
		if delta < 0 {
			delta = 0
		}
		additionalWatchSeconds += delta
		if err := s.db.Model(&models.ChannelLiveViewer{}).Where("id = ?", viewer.ID).Updates(map[string]interface{}{
			"is_active":              false,
			"joined_at":              nil,
			"accumulated_watch_secs": gorm.Expr("accumulated_watch_secs + ?", delta),
		}).Error; err != nil {
			return nil, err
		}
	}

	if err := s.db.Model(&models.ChannelLiveSession{}).
		Where("id = ? AND status = ?", session.ID, models.ChannelLiveStatusLive).
		Updates(map[string]interface{}{
			"status":              models.ChannelLiveStatusEnded,
			"ended_at":            now,
			"watch_seconds_total": gorm.Expr("watch_seconds_total + ?", additionalWatchSeconds),
		}).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&session, session.ID).Error; err != nil {
		return nil, err
	}
	var channel models.Channel
	if err := s.db.Select("id", "owner_id", "title").First(&channel, channelID).Error; err == nil {
		archiveService := NewSadhuLiveArchiveService()
		if marked, markErr := archiveService.MarkSessionArchiveTracks(&session, &channel, actorID); markErr != nil {
			log.Printf("[SadhuLiveArchive] mark_after_end_failed channel_id=%d live_id=%d err=%v", channelID, session.ID, markErr)
		} else if marked > 0 {
			log.Printf("[SadhuLiveArchive] marked_after_end channel_id=%d live_id=%d tracks=%d", channelID, session.ID, marked)
		}
	}
	s.incrementMetricSafe(MetricSadhuLiveEndedTotal, 1)
	return toLiveSessionSummary(&session), nil
}

func (s *ChannelService) CancelLiveSession(channelID, liveID, actorID uint) (*models.ChannelLiveSessionSummary, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channel.ID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelLiveNotFound
		}
		return nil, err
	}
	if session.Status == models.ChannelLiveStatusLive {
		return nil, errors.New("cannot cancel active live session")
	}
	if role == models.ChannelMemberRoleEditor && session.Status != models.ChannelLiveStatusScheduled {
		return nil, ErrChannelForbidden
	}
	if session.Status == models.ChannelLiveStatusEnded || session.Status == models.ChannelLiveStatusCancelled {
		return toLiveSessionSummary(&session), nil
	}

	now := time.Now().UTC()
	if err := s.db.Model(&models.ChannelLiveSession{}).Where("id = ?", session.ID).Updates(map[string]interface{}{
		"status":   models.ChannelLiveStatusCancelled,
		"ended_at": now,
	}).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&session, session.ID).Error; err != nil {
		return nil, err
	}
	return toLiveSessionSummary(&session), nil
}

func (s *ChannelService) JoinLiveSession(channelID, liveID, actorID uint, req models.ChannelLiveJoinRequest) (*models.ChannelLiveJoinResponse, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	if actorID == 0 {
		s.incrementMetricSafe(MetricSadhuLiveJoinDeniedTotal, 1)
		log.Printf("[SadhuLive] join_denied channel_id=%d live_id=%d actor_id=0 reason=unauthorized", channelID, liveID)
		return nil, ErrChannelForbidden
	}

	var channel models.Channel
	if err := s.db.Select("id", "owner_id", "is_public", "title").First(&channel, channelID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelNotFound
		}
		return nil, err
	}
	role, err := s.ensureLiveJoinAccess(&channel, actorID)
	if err != nil {
		s.incrementMetricSafe(MetricSadhuLiveJoinDeniedTotal, 1)
		log.Printf("[SadhuLive] join_denied channel_id=%d live_id=%d actor_id=%d reason=role_access err=%v", channelID, liveID, actorID, err)
		return nil, err
	}

	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channelID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelLiveNotFound
		}
		return nil, err
	}
	if session.Status != models.ChannelLiveStatusLive {
		s.incrementMetricSafe(MetricSadhuLiveJoinDeniedTotal, 1)
		log.Printf("[SadhuLive] join_denied channel_id=%d live_id=%d actor_id=%d reason=status_not_live status=%s", channelID, liveID, actorID, session.Status)
		return nil, errors.New("live session is not active")
	}
	var moderation models.ChannelLiveModeration
	if err := s.db.Where("session_id = ? AND user_id = ?", session.ID, actorID).First(&moderation).Error; err == nil {
		if moderation.IsBlocked {
			s.incrementMetricSafe(MetricSadhuLiveJoinDeniedTotal, 1)
			log.Printf("[SadhuLive] join_denied channel_id=%d live_id=%d actor_id=%d reason=blocked", channelID, liveID, actorID)
			return nil, ErrChannelForbidden
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if err := s.ensureRoomMember(session.RoomID, actorID, toRoomRoleFromChannelRole(role)); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	var viewer models.ChannelLiveViewer
	viewerErr := s.db.Where("session_id = ? AND user_id = ?", session.ID, actorID).First(&viewer).Error
	switch {
	case errors.Is(viewerErr, gorm.ErrRecordNotFound):
		viewer = models.ChannelLiveViewer{
			SessionID: session.ID,
			UserID:    actorID,
			IsActive:  true,
			JoinedAt:  &now,
			JoinCount: 1,
		}
		if err := s.db.Create(&viewer).Error; err != nil {
			return nil, err
		}
		if err := s.db.Model(&models.ChannelLiveSession{}).Where("id = ?", session.ID).Updates(map[string]interface{}{
			"join_count":          gorm.Expr("join_count + 1"),
			"unique_viewer_count": gorm.Expr("unique_viewer_count + 1"),
		}).Error; err != nil {
			return nil, err
		}
	case viewerErr != nil:
		return nil, viewerErr
	default:
		updates := map[string]interface{}{}
		if !viewer.IsActive {
			updates["is_active"] = true
			updates["joined_at"] = now
			if err := s.db.Model(&models.ChannelLiveSession{}).Where("id = ?", session.ID).Update("join_count", gorm.Expr("join_count + 1")).Error; err != nil {
				return nil, err
			}
		}
		updates["join_count"] = gorm.Expr("join_count + 1")
		if err := s.db.Model(&models.ChannelLiveViewer{}).Where("id = ?", viewer.ID).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	sfuCfg := config.LoadSFUConfig()
	if err := sfuCfg.ValidateForTokenIssue(); err != nil {
		return nil, err
	}
	liveKit := sfuService.NewLiveKitService(sfuCfg)
	tokenResult, err := liveKit.IssueRoomToken(sfuService.IssueTokenInput{
		UserID:          actorID,
		RoomID:          session.RoomID,
		Role:            string(role),
		ParticipantName: strings.TrimSpace(req.ParticipantName),
		Metadata:        req.Metadata,
	})
	if err != nil {
		return nil, err
	}
	s.incrementMetricSafe(MetricSadhuLiveJoinSuccessTotal, 1)
	log.Printf("[SadhuLive] join_success channel_id=%d live_id=%d actor_id=%d room_id=%d role=%s", channelID, session.ID, actorID, session.RoomID, role)

	return &models.ChannelLiveJoinResponse{
		LiveID:       session.ID,
		RoomID:       session.RoomID,
		RoomName:     tokenResult.RoomName,
		Participant:  tokenResult.ParticipantIdentity,
		Token:        tokenResult.Token,
		WsURL:        tokenResult.WSURL,
		SessionState: *toLiveSessionSummary(&session),
	}, nil
}

func (s *ChannelService) LeaveLiveSession(channelID, liveID, actorID uint) error {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return ErrChannelsDisabled
	}
	if actorID == 0 {
		return ErrChannelForbidden
	}

	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channelID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrChannelLiveNotFound
		}
		return err
	}

	var viewer models.ChannelLiveViewer
	if err := s.db.Where("session_id = ? AND user_id = ?", session.ID, actorID).First(&viewer).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	if !viewer.IsActive || viewer.JoinedAt == nil {
		return nil
	}
	now := time.Now().UTC()
	delta := int64(now.Sub(*viewer.JoinedAt).Seconds())
	if delta < 0 {
		delta = 0
	}
	if err := s.db.Model(&models.ChannelLiveViewer{}).Where("id = ?", viewer.ID).Updates(map[string]interface{}{
		"is_active":              false,
		"joined_at":              nil,
		"accumulated_watch_secs": gorm.Expr("accumulated_watch_secs + ?", delta),
	}).Error; err != nil {
		return err
	}
	return s.db.Model(&models.ChannelLiveSession{}).Where("id = ?", session.ID).
		Update("watch_seconds_total", gorm.Expr("watch_seconds_total + ?", delta)).Error
}

func isValidLiveModerationAction(action models.ChannelLiveModerationAction) bool {
	switch action {
	case models.ChannelLiveModerationActionMute,
		models.ChannelLiveModerationActionUnmute,
		models.ChannelLiveModerationActionBlock,
		models.ChannelLiveModerationActionUnblock,
		models.ChannelLiveModerationActionKick:
		return true
	default:
		return false
	}
}

func (s *ChannelService) loadLiveSession(channelID, liveID uint) (*models.ChannelLiveSession, error) {
	var session models.ChannelLiveSession
	if err := s.db.Where("id = ? AND channel_id = ?", liveID, channelID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChannelLiveNotFound
		}
		return nil, err
	}
	return &session, nil
}

func (s *ChannelService) ListLiveParticipants(channelID, liveID, actorID uint) (*models.ChannelLiveParticipantsResponse, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	if _, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor); err != nil {
		return nil, err
	}
	session, err := s.loadLiveSession(channelID, liveID)
	if err != nil {
		return nil, err
	}

	var viewers []models.ChannelLiveViewer
	if err := s.db.Where("session_id = ?", session.ID).Find(&viewers).Error; err != nil {
		return nil, err
	}
	if len(viewers) == 0 {
		return &models.ChannelLiveParticipantsResponse{
			LiveID:       session.ID,
			SessionState: *toLiveSessionSummary(session),
			Participants: []models.ChannelLiveParticipant{},
		}, nil
	}

	userIDs := make([]uint, 0, len(viewers))
	viewerByUser := make(map[uint]models.ChannelLiveViewer, len(viewers))
	for _, viewer := range viewers {
		if viewer.UserID == 0 {
			continue
		}
		userIDs = append(userIDs, viewer.UserID)
		viewerByUser[viewer.UserID] = viewer
	}

	var users []models.User
	if err := s.db.Select("id", "spiritual_name", "karmic_name", "avatar_url").Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	var moderations []models.ChannelLiveModeration
	if err := s.db.Where("session_id = ? AND user_id IN ?", session.ID, userIDs).Find(&moderations).Error; err != nil {
		return nil, err
	}
	moderationByUser := make(map[uint]models.ChannelLiveModeration, len(moderations))
	for _, m := range moderations {
		moderationByUser[m.UserID] = m
	}

	participants := make([]models.ChannelLiveParticipant, 0, len(users))
	for _, usr := range users {
		v := viewerByUser[usr.ID]
		m := moderationByUser[usr.ID]
		participants = append(participants, models.ChannelLiveParticipant{
			UserID:               usr.ID,
			SpiritualName:        usr.SpiritualName,
			KarmicName:           usr.KarmicName,
			AvatarURL:            usr.AvatarURL,
			IsActive:             v.IsActive,
			IsMuted:              m.IsMuted,
			IsBlocked:            m.IsBlocked,
			JoinCount:            v.JoinCount,
			AccumulatedWatchSecs: v.AccumulatedWatchSecs,
			JoinedAt:             v.JoinedAt,
		})
	}

	return &models.ChannelLiveParticipantsResponse{
		LiveID:       session.ID,
		SessionState: *toLiveSessionSummary(session),
		Participants: participants,
	}, nil
}

func (s *ChannelService) ModerateLiveParticipant(channelID, liveID, actorID uint, req models.ChannelLiveModerationRequest) (*models.ChannelLiveParticipantsResponse, error) {
	if !s.IsSadhuSangaLiveEnabledForUser(actorID) {
		return nil, ErrChannelsDisabled
	}
	channel, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}
	if req.TargetUserID == 0 || !isValidLiveModerationAction(req.Action) {
		return nil, ErrInvalidPayload
	}
	if req.TargetUserID == channel.OwnerID {
		return nil, ErrChannelForbidden
	}
	targetRole, err := s.getActorRole(channel, req.TargetUserID)
	if err != nil {
		return nil, err
	}
	if targetRole != "" && rankRole(targetRole) >= rankRole(role) {
		return nil, ErrChannelForbidden
	}

	session, err := s.loadLiveSession(channelID, liveID)
	if err != nil {
		return nil, err
	}

	var moderation models.ChannelLiveModeration
	findErr := s.db.Where("session_id = ? AND user_id = ?", session.ID, req.TargetUserID).First(&moderation).Error
	if findErr != nil && !errors.Is(findErr, gorm.ErrRecordNotFound) {
		return nil, findErr
	}
	if errors.Is(findErr, gorm.ErrRecordNotFound) {
		moderation = models.ChannelLiveModeration{
			SessionID: session.ID,
			UserID:    req.TargetUserID,
		}
	}

	reason := strings.TrimSpace(req.Reason)
	switch req.Action {
	case models.ChannelLiveModerationActionMute:
		moderation.IsMuted = true
		moderation.Reason = reason
	case models.ChannelLiveModerationActionUnmute:
		moderation.IsMuted = false
	case models.ChannelLiveModerationActionBlock:
		moderation.IsBlocked = true
		moderation.Reason = reason
	case models.ChannelLiveModerationActionUnblock:
		moderation.IsBlocked = false
	case models.ChannelLiveModerationActionKick:
		now := time.Now().UTC()
		var viewer models.ChannelLiveViewer
		if err := s.db.Where("session_id = ? AND user_id = ?", session.ID, req.TargetUserID).First(&viewer).Error; err == nil {
			if viewer.IsActive && viewer.JoinedAt != nil {
				delta := int64(now.Sub(*viewer.JoinedAt).Seconds())
				if delta < 0 {
					delta = 0
				}
				if err := s.db.Model(&models.ChannelLiveViewer{}).Where("id = ?", viewer.ID).Updates(map[string]interface{}{
					"is_active":              false,
					"joined_at":              nil,
					"accumulated_watch_secs": gorm.Expr("accumulated_watch_secs + ?", delta),
				}).Error; err != nil {
					return nil, err
				}
				if err := s.db.Model(&models.ChannelLiveSession{}).Where("id = ?", session.ID).
					Update("watch_seconds_total", gorm.Expr("watch_seconds_total + ?", delta)).Error; err != nil {
					return nil, err
				}
			}
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if err := s.db.Where("room_id = ? AND user_id = ?", session.RoomID, req.TargetUserID).
			Delete(&models.RoomMember{}).Error; err != nil {
			return nil, err
		}
	}
	moderation.UpdatedBy = actorID
	if findErr == nil {
		if err := s.db.Model(&models.ChannelLiveModeration{}).Where("id = ?", moderation.ID).Updates(map[string]interface{}{
			"is_muted":   moderation.IsMuted,
			"is_blocked": moderation.IsBlocked,
			"reason":     moderation.Reason,
			"updated_by": moderation.UpdatedBy,
		}).Error; err != nil {
			return nil, err
		}
	} else {
		if err := s.db.Create(&moderation).Error; err != nil {
			return nil, err
		}
	}
	log.Printf(
		"[SadhuLive] moderation channel_id=%d live_id=%d actor_id=%d actor_role=%s target_user_id=%d action=%s muted=%t blocked=%t",
		channelID,
		session.ID,
		actorID,
		role,
		req.TargetUserID,
		req.Action,
		moderation.IsMuted,
		moderation.IsBlocked,
	)

	return s.ListLiveParticipants(channelID, liveID, actorID)
}

func (s *ChannelService) GetPreacherAnalytics(channelID, actorID uint) (*models.ChannelPreacherAnalyticsResponse, error) {
	channel, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}

	var totalLectureViews int64
	if err := s.db.Model(&models.ChannelPost{}).
		Where("channel_id = ? AND status = ?", channelID, models.ChannelPostStatusPublished).
		Select("COALESCE(SUM(view_count), 0)").
		Scan(&totalLectureViews).Error; err != nil {
		return nil, err
	}

	allowedStatuses := []models.BookingStatus{
		models.BookingStatusPending,
		models.BookingStatusConfirmed,
		models.BookingStatusCompleted,
		models.BookingStatusNoShow,
	}

	var seminarRegistrations int64
	if err := s.db.Table("service_bookings").
		Joins("JOIN services ON services.id = service_bookings.service_id AND services.deleted_at IS NULL").
		Where("services.owner_id = ?", channel.OwnerID).
		Where("service_bookings.deleted_at IS NULL").
		Where("service_bookings.status IN ?", allowedStatuses).
		Count(&seminarRegistrations).Error; err != nil {
		return nil, err
	}

	type activeCityRow struct {
		City          string
		Registrations int64
	}
	var cityRows []activeCityRow
	if err := s.db.Table("service_bookings").
		Select("MIN(TRIM(users.city)) AS city, COUNT(service_bookings.id) AS registrations").
		Joins("JOIN services ON services.id = service_bookings.service_id AND services.deleted_at IS NULL").
		Joins("JOIN users ON users.id = service_bookings.client_id AND users.deleted_at IS NULL").
		Where("services.owner_id = ?", channel.OwnerID).
		Where("service_bookings.deleted_at IS NULL").
		Where("service_bookings.status IN ?", allowedStatuses).
		Where("TRIM(users.city) <> ''").
		Group("LOWER(TRIM(users.city))").
		Order("registrations DESC, city ASC").
		Limit(5).
		Scan(&cityRows).Error; err != nil {
		return nil, err
	}

	cities := make([]models.ChannelPreacherAnalyticsCity, 0, len(cityRows))
	for _, row := range cityRows {
		city := strings.TrimSpace(row.City)
		if city == "" {
			continue
		}
		cities = append(cities, models.ChannelPreacherAnalyticsCity{
			City:          city,
			Registrations: row.Registrations,
		})
	}

	type liveTotalsRow struct {
		LiveSessionsTotal     int64
		LiveUniqueViewers     int64
		LiveWatchSecondsTotal int64
	}
	var liveTotals liveTotalsRow
	if err := s.db.Table("channel_live_sessions").
		Select(
			"COUNT(channel_live_sessions.id) AS live_sessions_total, "+
				"COALESCE(SUM(channel_live_sessions.unique_viewer_count), 0) AS live_unique_viewers, "+
				"COALESCE(SUM(channel_live_sessions.watch_seconds_total), 0) AS live_watch_seconds_total",
		).
		Joins("JOIN channels ON channels.id = channel_live_sessions.channel_id AND channels.deleted_at IS NULL").
		Where("channels.owner_id = ?", channel.OwnerID).
		Where("channel_live_sessions.deleted_at IS NULL").
		Scan(&liveTotals).Error; err != nil {
		return nil, err
	}

	return &models.ChannelPreacherAnalyticsResponse{
		ChannelID:              channelID,
		TotalLectureViews:      totalLectureViews,
		SeminarRegistrations:   seminarRegistrations,
		ActiveCities:           cities,
		LiveSessionsTotal:      liveTotals.LiveSessionsTotal,
		LiveUniqueViewersTotal: liveTotals.LiveUniqueViewers,
		LiveWatchMinutesTotal:  liveTotals.LiveWatchSecondsTotal / 60,
	}, nil
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
		reqTitleSlug, slugErr := s.makeUniqueSlug("", title, &channel.ID)
		if slugErr != nil {
			return nil, slugErr
		}
		updates["slug"] = reqTitleSlug
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

func (s *ChannelService) UploadChannelCover(channelID, actorID uint, fileHeader *multipart.FileHeader) (*models.Channel, error) {
	if fileHeader == nil {
		return nil, errors.New("cover file is required")
	}

	_, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleAdmin)
	if err != nil {
		return nil, err
	}
	if rankRole(role) < rankRole(models.ChannelMemberRoleAdmin) {
		return nil, ErrChannelForbidden
	}

	if fileHeader.Size <= 0 {
		return nil, errors.New("empty cover file")
	}
	if fileHeader.Size > channelCoverMaxBytes {
		return nil, errors.New("cover file is too large")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	processedImage, err := buildChannelCoverImage(file)
	if err != nil {
		return nil, err
	}

	s3Service := NewS3Service()
	if s3Service == nil {
		return nil, errors.New("media service unavailable")
	}

	key := fmt.Sprintf("channels/covers/%d/%d.jpg", channelID, time.Now().UTC().UnixNano())
	url, err := s3Service.UploadFile(
		context.Background(),
		bytes.NewReader(processedImage),
		key,
		"image/jpeg",
		int64(len(processedImage)),
	)
	if err != nil {
		return nil, err
	}

	if err := s.db.Model(&models.Channel{}).
		Where("id = ?", channelID).
		Update("cover_url", strings.TrimSpace(url)).Error; err != nil {
		return nil, err
	}

	return s.GetChannelByID(channelID, actorID)
}

func (s *ChannelService) UploadPostMedia(channelID, actorID uint, fileHeader *multipart.FileHeader) (*models.ChannelPostMediaUploadResponse, error) {
	if fileHeader == nil {
		return nil, errors.New("media file is required")
	}
	if fileHeader.Size <= 0 {
		return nil, errors.New("empty media file")
	}
	if fileHeader.Size > channelPostMediaMaxBytes {
		return nil, errors.New("media file is too large")
	}

	_, _, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleEditor)
	if err != nil {
		return nil, err
	}

	contentType := normalizeImageContentType(fileHeader.Header.Get("Content-Type"))
	if !isAllowedChannelPostUploadMime(contentType) {
		return nil, errors.New("unsupported media type")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	processedImage, err := buildChannelPostImage(file)
	if err != nil {
		return nil, err
	}

	s3Service := NewS3Service()
	if s3Service == nil {
		return nil, errors.New("media service unavailable")
	}

	key := fmt.Sprintf("channels/posts/%d/%d/%d.jpg", channelID, actorID, time.Now().UTC().UnixNano())
	url, err := s3Service.UploadFile(
		context.Background(),
		bytes.NewReader(processedImage),
		key,
		channelPostImageMimeType,
		int64(len(processedImage)),
	)
	if err != nil {
		return nil, err
	}

	return &models.ChannelPostMediaUploadResponse{
		URL:      strings.TrimSpace(url),
		Width:    channelPostImageWidth,
		Height:   channelPostImageHeight,
		MimeType: channelPostImageMimeType,
	}, nil
}

func (s *ChannelService) AddMember(channelID, actorID uint, req models.ChannelMemberAddRequest) (*models.ChannelMember, error) {
	_, role, err := s.requireRole(channelID, actorID, models.ChannelMemberRoleOwner)
	if err != nil {
		return nil, err
	}
	if role != models.ChannelMemberRoleOwner {
		return nil, ErrChannelForbidden
	}

	memberUserID := req.UserID
	if memberUserID == 0 {
		nickname := strings.TrimSpace(req.Nickname)
		if nickname == "" {
			return nil, errors.New("userId or nickname is required")
		}
		nicknameService := NewNicknameService(s.db)
		targetUser, findErr := nicknameService.FindUserByNickname(nickname)
		if findErr != nil {
			if errors.Is(findErr, ErrNicknameInvalid) {
				return nil, errors.New("invalid nickname")
			}
			if errors.Is(findErr, gorm.ErrRecordNotFound) {
				return nil, errors.New("user not found")
			}
			return nil, findErr
		}
		memberUserID = targetUser.ID
	}

	targetRole := req.Role
	if targetRole == "" {
		targetRole = models.ChannelMemberRoleEditor
	}
	if !models.IsValidChannelRole(targetRole) || targetRole == models.ChannelMemberRoleOwner {
		return nil, errors.New("invalid role")
	}

	var existing models.ChannelMember
	if err := s.db.Where("channel_id = ? AND user_id = ?", channelID, memberUserID).First(&existing).Error; err == nil {
		return &existing, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var user models.User
	if err := s.db.Select("id").Where("id = ?", memberUserID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	member := models.ChannelMember{
		ChannelID: channelID,
		UserID:    memberUserID,
		Role:      targetRole,
	}
	if err := s.db.Create(&member).Error; err != nil {
		if isDuplicateKeyError(err) {
			if getErr := s.db.Where("channel_id = ? AND user_id = ?", channelID, memberUserID).First(&existing).Error; getErr != nil {
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
			return db.Select("id", "spiritual_name", "karmic_name", "avatar_url", "nickname")
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

	mediaJSON, err := s.normalizePostMediaJSON(channel.ID, strings.TrimSpace(req.MediaJSON))
	if err != nil {
		return nil, err
	}

	ctaPayload := strings.TrimSpace(req.CTAPayloadJSON)
	if ctaPayload != "" && !json.Valid([]byte(ctaPayload)) {
		return nil, ErrInvalidPayload
	}
	if err := validateChannelCTAPayload(ctaType, ctaPayload); err != nil {
		return nil, err
	}
	deliverPersonally := resolveDeliverPersonally(channel.IsPublic, req.DeliverPersonally)

	post := models.ChannelPost{
		ChannelID:         channel.ID,
		AuthorID:          actorID,
		Type:              postType,
		Content:           strings.TrimSpace(req.Content),
		MediaJSON:         mediaJSON,
		CTAType:           ctaType,
		CTAPayloadJSON:    ctaPayload,
		DeliverPersonally: deliverPersonally,
		Status:            models.ChannelPostStatusDraft,
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
		Order("channel_posts.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error; err != nil {
		return nil, "", err
	}
	hydrateChannelPostStats(posts)
	if err := s.hydrateMyReactions(posts, viewerID); err != nil {
		return nil, "", err
	}

	totalPages := calculateChannelTotalPages(total, limit)

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
		if errors.Is(err, ErrPostEditWindow) {
			s.incrementMetricSafe(MetricChannelPostEditWindowRejectedTotal, 1)
		}
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
		trimmed, err := s.normalizePostMediaJSON(channel.ID, strings.TrimSpace(*req.MediaJSON))
		if err != nil {
			return nil, err
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
	if channel.IsPublic {
		updates["deliver_personally"] = false
	} else if req.DeliverPersonally != nil {
		updates["deliver_personally"] = *req.DeliverPersonally
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
	post.Stats = &models.ChannelPostStats{
		Views:     post.ViewCount,
		Reactions: post.ReactionCount,
		Comments:  post.CommentCount,
		Shares:    post.ShareCount,
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
		if err := s.deliverPostPersonally(post); err != nil {
			log.Printf("[Channels] personal delivery failed for already published post=%d: %v", post.ID, err)
		}
		return post, nil
	}
	if err := validateChannelCTAPayload(post.CTAType, post.CTAPayloadJSON); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
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
	if err := s.deliverPostPersonally(post); err != nil {
		log.Printf("[Channels] personal delivery failed post=%d: %v", post.ID, err)
	}
	if err := s.deliverPostToSubscribers(post); err != nil {
		log.Printf("[Channels] subscriber delivery failed post=%d: %v", post.ID, err)
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

	now := time.Now().UTC()
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
	now := time.Now().UTC()
	if err := s.db.Where("status = ? AND scheduled_at IS NOT NULL AND scheduled_at <= ?", models.ChannelPostStatusScheduled, now).
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

	result := s.db.Model(&models.ChannelPost{}).
		Where("id IN ? AND status = ? AND scheduled_at IS NOT NULL AND scheduled_at <= ?", ids, models.ChannelPostStatusScheduled, now).
		Updates(map[string]interface{}{
			"status":       models.ChannelPostStatusPublished,
			"published_at": now,
			"scheduled_at": nil,
		})
	if result.Error != nil {
		return 0, result.Error
	}

	publishedCount := int(result.RowsAffected)
	if publishedCount == 0 {
		return 0, nil
	}

	if err := GetMetricsService().Increment(MetricChannelPostsPublishedTotal, int64(publishedCount)); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", MetricChannelPostsPublishedTotal, err)
	}

	var firstDeliveryErr error
	for _, postID := range ids {
		if err := s.deliverPostPersonallyByID(postID); err != nil {
			if firstDeliveryErr == nil {
				firstDeliveryErr = err
			}
			log.Printf("[Channels] personal delivery failed for scheduled post=%d: %v", postID, err)
		}
		if err := s.deliverPostToSubscribersByID(postID); err != nil {
			if firstDeliveryErr == nil {
				firstDeliveryErr = err
			}
			log.Printf("[Channels] subscriber delivery failed for scheduled post=%d: %v", postID, err)
		}
	}

	return publishedCount, firstDeliveryErr
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

func (s *ChannelService) TrackPostView(channelID, postID, viewerID uint) error {
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

	if err := s.db.Model(&models.ChannelPost{}).
		Where("id = ?", post.ID).
		Update("view_count", gorm.Expr("view_count + 1")).Error; err != nil {
		return err
	}
	s.incrementMetricSafe(MetricChannelPostViewTotal, 1)
	return nil
}

func (s *ChannelService) SetPostReaction(channelID, postID, userID uint, emoji string) (*models.ChannelPost, error) {
	if userID == 0 {
		return nil, ErrChannelForbidden
	}
	emoji = strings.TrimSpace(emoji)
	if !isAllowedChannelReaction(emoji) {
		return nil, errors.New("invalid emoji")
	}

	post, _, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != models.ChannelPostStatusPublished {
		return nil, ErrInvalidPostStatus
	}
	if _, err := s.GetChannelByID(channelID, userID); err != nil {
		return nil, err
	}

	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	var existing models.ChannelPostReaction
	err = tx.Where("post_id = ? AND user_id = ?", post.ID, userID).First(&existing).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		reaction := models.ChannelPostReaction{
			PostID: post.ID,
			UserID: userID,
			Emoji:  emoji,
		}
		if err := tx.Create(&reaction).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
		if err := tx.Model(&models.ChannelPost{}).
			Where("id = ?", post.ID).
			Update("reaction_count", gorm.Expr("reaction_count + 1")).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	case err != nil:
		tx.Rollback()
		return nil, err
	default:
		if existing.Emoji != emoji {
			if err := tx.Model(&models.ChannelPostReaction{}).
				Where("id = ?", existing.ID).
				Update("emoji", emoji).Error; err != nil {
				tx.Rollback()
				return nil, err
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	s.incrementMetricSafe(MetricChannelPostReactionSetTotal, 1)

	var updated models.ChannelPost
	if err := s.db.Preload("Author").Preload("Channel").First(&updated, post.ID).Error; err != nil {
		return nil, err
	}
	emojiCopy := emoji
	updated.MyReaction = &emojiCopy
	updated.Stats = &models.ChannelPostStats{
		Views:     updated.ViewCount,
		Reactions: updated.ReactionCount,
		Comments:  updated.CommentCount,
		Shares:    updated.ShareCount,
	}
	return &updated, nil
}

func (s *ChannelService) RemovePostReaction(channelID, postID, userID uint) (*models.ChannelPost, error) {
	if userID == 0 {
		return nil, ErrChannelForbidden
	}

	post, _, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != models.ChannelPostStatusPublished {
		return nil, ErrInvalidPostStatus
	}
	if _, err := s.GetChannelByID(channelID, userID); err != nil {
		return nil, err
	}

	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	result := tx.Where("post_id = ? AND user_id = ?", post.ID, userID).Delete(&models.ChannelPostReaction{})
	if result.Error != nil {
		tx.Rollback()
		return nil, result.Error
	}
	if result.RowsAffected > 0 {
		if err := tx.Model(&models.ChannelPost{}).
			Where("id = ?", post.ID).
			Update("reaction_count", gorm.Expr("GREATEST(reaction_count - 1, 0)")).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	var updated models.ChannelPost
	if err := s.db.Preload("Author").Preload("Channel").First(&updated, post.ID).Error; err != nil {
		return nil, err
	}
	updated.Stats = &models.ChannelPostStats{
		Views:     updated.ViewCount,
		Reactions: updated.ReactionCount,
		Comments:  updated.CommentCount,
		Shares:    updated.ShareCount,
	}
	return &updated, nil
}

func (s *ChannelService) ListPostComments(channelID, postID, viewerID uint, limit int, cursorID uint) ([]models.ChannelPostComment, error) {
	post, _, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != models.ChannelPostStatusPublished {
		return nil, ErrInvalidPostStatus
	}
	if _, err := s.GetChannelByID(channelID, viewerID); err != nil {
		return nil, err
	}

	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := s.db.Model(&models.ChannelPostComment{}).
		Where("post_id = ? AND is_deleted = ?", post.ID, false)
	if cursorID > 0 {
		query = query.Where("id < ?", cursorID)
	}

	var comments []models.ChannelPostComment
	if err := query.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "spiritual_name", "karmic_name", "avatar_url")
		}).
		Order("created_at DESC").
		Order("id DESC").
		Limit(limit).
		Find(&comments).Error; err != nil {
		return nil, err
	}
	return comments, nil
}

func (s *ChannelService) AddPostComment(channelID, postID, userID uint, body string) (*models.ChannelPostComment, error) {
	if userID == 0 {
		return nil, ErrChannelForbidden
	}
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, errors.New("comment body is required")
	}

	post, _, err := s.loadPost(channelID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != models.ChannelPostStatusPublished {
		return nil, ErrInvalidPostStatus
	}
	if _, err := s.GetChannelByID(channelID, userID); err != nil {
		return nil, err
	}

	comment := models.ChannelPostComment{
		PostID: post.ID,
		UserID: userID,
		Body:   body,
	}

	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	if err := tx.Create(&comment).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := tx.Model(&models.ChannelPost{}).
		Where("id = ?", post.ID).
		Update("comment_count", gorm.Expr("comment_count + 1")).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	if err := s.db.Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "spiritual_name", "karmic_name", "avatar_url")
	}).First(&comment, comment.ID).Error; err != nil {
		return nil, err
	}

	s.incrementMetricSafe(MetricChannelPostCommentCreateTotal, 1)
	return &comment, nil
}

func (s *ChannelService) TrackPostShare(channelID, postID, viewerID uint) error {
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

	if err := s.db.Model(&models.ChannelPost{}).
		Where("id = ?", post.ID).
		Update("share_count", gorm.Expr("share_count + 1")).Error; err != nil {
		return err
	}
	s.incrementMetricSafe(MetricChannelPostShareTotal, 1)
	return nil
}

func (s *ChannelService) GetMetricsSnapshot() (map[string]int64, error) {
	return GetMetricsService().Snapshot([]string{
		MetricChannelPostsPublishedTotal,
		MetricChannelPostsScheduledTotal,
		MetricChannelCTAClickTotal,
		MetricOrdersFromChannelTotal,
		MetricBookingsFromChannelTotal,
		MetricChannelPersonalDeliveriesTotal,
		MetricChannelPersonalPushSentTotal,
		MetricChannelPersonalDMCreatedTotal,
		MetricChannelPersonalDeliveryFailedTotal,
		MetricPromotedAdsServedTotal,
		MetricPromotedAdsClickedTotal,
		MetricChannelPostEditWindowRejectedTotal,
		MetricChannelPostReactionSetTotal,
		MetricChannelPostCommentCreateTotal,
		MetricChannelPostShareTotal,
		MetricChannelPostViewTotal,
		MetricSadhuLiveCreatedTotal,
		MetricSadhuLiveStartedTotal,
		MetricSadhuLiveJoinDeniedTotal,
		MetricSadhuLiveJoinSuccessTotal,
		MetricSadhuLiveEndedTotal,
		MetricSadhuPreacherProfileReadTotal,
		MetricSadhuPreacherProfileUpsertTotal,
		MetricSadhuMathFilterAppliedTotal,
		MetricSadhuMathFilterBypassTotal,
		MetricSadhuMathFilterEmptyProfileTotal,
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
		DismissedAt: time.Now().UTC(),
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
	hydrateChannelPostStats(posts)
	if err := s.hydrateMyReactions(posts, filters.ViewerID); err != nil {
		return nil, err
	}

	totalPages := calculateChannelTotalPages(total, filters.Limit)

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
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[Channels] load viewer city failed for user %d: %v", viewerID, err)
		}

		now := time.Now().UTC()
		dailyCount, err := s.countPromotedAdImpressions(viewerID, promotedAdPlacementChannelsFeed, now.Add(-24*time.Hour))
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

		now := time.Now().UTC()
		recentAdIDs, err := s.listRecentlySeenPromotedAdIDs(viewerID, promotedAdPlacementChannelsFeed, now.Add(-cooldownDuration))
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

	now := time.Now().UTC()
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

func (s *ChannelService) deliverPostPersonallyByID(postID uint) error {
	if postID == 0 {
		return nil
	}

	var post models.ChannelPost
	if err := s.db.Preload("Channel").Preload("Author").First(&post, postID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	return s.deliverPostPersonally(&post)
}

func (s *ChannelService) deliverPostToSubscribersByID(postID uint) error {
	if postID == 0 {
		return nil
	}

	var post models.ChannelPost
	if err := s.db.Preload("Channel").Preload("Author").First(&post, postID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	return s.deliverPostToSubscribers(&post)
}

func (s *ChannelService) deliverPostToSubscribers(post *models.ChannelPost) error {
	if post == nil || post.Status != models.ChannelPostStatusPublished {
		return nil
	}

	channel := post.Channel
	if channel == nil {
		var loaded models.Channel
		if err := s.db.Select("id", "owner_id", "title", "is_public").First(&loaded, post.ChannelID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		channel = &loaded
		post.Channel = channel
	}

	var members []models.ChannelMember
	if err := s.db.Select("user_id").
		Where("channel_id = ? AND role NOT IN ? AND user_id <> ?", post.ChannelID, []models.ChannelMemberRole{
			models.ChannelMemberRoleOwner,
			models.ChannelMemberRoleAdmin,
			models.ChannelMemberRoleEditor,
		}, post.AuthorID).
		Find(&members).Error; err != nil {
		return err
	}
	if len(members) == 0 {
		return nil
	}

	var owner models.User
	if err := s.db.Select("id", "city", "language", "interests", "bio", "skills", "timezone").First(&owner, channel.OwnerID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
	}

	var firstErr error
	for _, member := range members {
		shouldSend, filterErr := s.shouldSendSubscriberPushBySmartPreference(post, channel, &owner, member.UserID)
		if filterErr != nil {
			log.Printf("[Channels] smart push filter check failed post=%d user=%d: %v", post.ID, member.UserID, filterErr)
		}
		if !shouldSend {
			continue
		}

		if err := s.sendSubscriberPostPush(post, channel, member.UserID); err != nil {
			if firstErr == nil {
				firstErr = err
			}
			log.Printf("[Channels] subscriber push failed post=%d user=%d: %v", post.ID, member.UserID, err)
		}
	}
	return firstErr
}

func (s *ChannelService) deliverPostPersonally(post *models.ChannelPost) error {
	if post == nil {
		return nil
	}
	if post.Status != models.ChannelPostStatusPublished || !post.DeliverPersonally {
		return nil
	}

	channel := post.Channel
	if channel == nil {
		var loaded models.Channel
		if err := s.db.Select("id", "owner_id", "title", "is_public").First(&loaded, post.ChannelID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		channel = &loaded
		post.Channel = channel
	}

	// Personal delivery is strictly for private channels.
	if channel.IsPublic {
		return nil
	}

	var members []models.ChannelMember
	if err := s.db.Select("user_id").Where("channel_id = ? AND user_id <> ?", post.ChannelID, post.AuthorID).Find(&members).Error; err != nil {
		return err
	}
	if len(members) == 0 {
		return nil
	}

	var firstErr error
	for _, member := range members {
		if err := s.deliverPostPersonallyToUser(post, channel, member.UserID); err != nil {
			if firstErr == nil {
				firstErr = err
			}
			log.Printf("[Channels] personal delivery failed post=%d user=%d: %v", post.ID, member.UserID, err)
		}
	}

	return firstErr
}

func (s *ChannelService) deliverPostPersonallyToUser(post *models.ChannelPost, channel *models.Channel, userID uint) error {
	if post == nil || channel == nil || userID == 0 {
		return nil
	}

	var firstErr error
	if err := s.createPersonalDeliveryDM(post, channel, userID); err != nil {
		firstErr = err
	}
	if err := s.sendPersonalDeliveryPush(post, channel, userID); err != nil && firstErr == nil {
		firstErr = err
	}
	return firstErr
}

func (s *ChannelService) createPersonalDeliveryDM(post *models.ChannelPost, channel *models.Channel, userID uint) error {
	deliveryID, shouldSend, err := s.reservePostDelivery(post.ID, userID, models.ChannelPostDeliveryTypeDM)
	if err != nil {
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}
	if !shouldSend {
		return nil
	}

	message := models.Message{
		SenderID:    channel.OwnerID,
		RecipientID: userID,
		RoomID:      0,
		Type:        "text",
		Content:     buildPersonalDeliveryContent(post, channel),
		MapData: map[string]interface{}{
			"type":      "channel_news_personal",
			"channelId": post.ChannelID,
			"postId":    post.ID,
		},
	}
	if err := s.db.Create(&message).Error; err != nil {
		_ = s.markPostDelivery(deliveryID, models.ChannelPostDeliveryStatusFailed)
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}

	if err := s.markPostDelivery(deliveryID, models.ChannelPostDeliveryStatusSuccess); err != nil {
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}

	s.incrementMetricSafe(MetricChannelPersonalDMCreatedTotal, 1)
	s.incrementMetricSafe(MetricChannelPersonalDeliveriesTotal, 1)
	return nil
}

func (s *ChannelService) sendPersonalDeliveryPush(post *models.ChannelPost, channel *models.Channel, userID uint) error {
	deliveryID, shouldSend, err := s.reservePostDelivery(post.ID, userID, models.ChannelPostDeliveryTypePush)
	if err != nil {
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}
	if !shouldSend {
		return nil
	}

	pushMessage := PushMessage{
		Title:    buildPersonalPushTitle(channel),
		Body:     buildPersonalPushBody(post),
		Priority: "high",
		Data: map[string]string{
			"type":      "channel_news_personal",
			"channelId": strconv.FormatUint(uint64(post.ChannelID), 10),
			"postId":    strconv.FormatUint(uint64(post.ID), 10),
		},
	}

	if err := GetPushService().SendToUser(userID, pushMessage); err != nil {
		_ = s.markPostDelivery(deliveryID, models.ChannelPostDeliveryStatusFailed)
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}

	if err := s.markPostDelivery(deliveryID, models.ChannelPostDeliveryStatusSuccess); err != nil {
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}

	s.incrementMetricSafe(MetricChannelPersonalPushSentTotal, 1)
	s.incrementMetricSafe(MetricChannelPersonalDeliveriesTotal, 1)
	return nil
}

func (s *ChannelService) sendSubscriberPostPush(post *models.ChannelPost, channel *models.Channel, userID uint) error {
	deliveryID, shouldSend, err := s.reservePostDelivery(post.ID, userID, models.ChannelPostDeliveryTypePush)
	if err != nil {
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}
	if !shouldSend {
		return nil
	}

	pushMessage := PushMessage{
		Title:    buildPersonalPushTitle(channel),
		Body:     buildPersonalPushBody(post),
		Priority: "high",
		Data: map[string]string{
			"type":      "channel_news_personal",
			"channelId": strconv.FormatUint(uint64(post.ChannelID), 10),
			"postId":    strconv.FormatUint(uint64(post.ID), 10),
		},
	}

	if err := GetPushService().SendToUser(userID, pushMessage); err != nil {
		_ = s.markPostDelivery(deliveryID, models.ChannelPostDeliveryStatusFailed)
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}

	if err := s.markPostDelivery(deliveryID, models.ChannelPostDeliveryStatusSuccess); err != nil {
		s.incrementMetricSafe(MetricChannelPersonalDeliveryFailedTotal, 1)
		return err
	}

	s.incrementMetricSafe(MetricChannelPersonalPushSentTotal, 1)
	s.incrementMetricSafe(MetricChannelPersonalDeliveriesTotal, 1)
	return nil
}

func (s *ChannelService) shouldSendSubscriberPushBySmartPreference(
	post *models.ChannelPost,
	channel *models.Channel,
	owner *models.User,
	userID uint,
) (bool, error) {
	if post == nil || channel == nil || userID == 0 {
		return false, nil
	}

	var preference models.ChannelSmartPushPreference
	if err := s.db.Where("user_id = ?", userID).First(&preference).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}
		return true, err
	}

	if !preference.Enabled {
		return false, nil
	}

	ownerCity := ""
	ownerLanguage := ""
	ownerInterests := ""
	ownerBio := ""
	ownerSkills := ""
	if owner != nil {
		ownerCity = strings.TrimSpace(owner.City)
		ownerLanguage = strings.TrimSpace(owner.Language)
		ownerInterests = strings.TrimSpace(owner.Interests)
		ownerBio = strings.TrimSpace(owner.Bio)
		ownerSkills = strings.TrimSpace(owner.Skills)
	}

	if !matchesSmartPushCity(strings.TrimSpace(preference.City), ownerCity) {
		return false, nil
	}
	if !matchesSmartPushLanguage(strings.TrimSpace(preference.Language), ownerLanguage) {
		return false, nil
	}

	topics := decodeSmartPushTopics(preference.TopicsJSON)
	if len(topics) > 0 {
		searchCorpus := strings.ToLower(strings.Join([]string{
			strings.TrimSpace(post.Content),
			strings.TrimSpace(channel.Title),
			strings.TrimSpace(channel.Description),
			ownerInterests,
			ownerBio,
			ownerSkills,
		}, " "))
		matched := false
		for _, topic := range topics {
			topic = strings.ToLower(strings.TrimSpace(topic))
			if topic == "" {
				continue
			}
			if strings.Contains(searchCorpus, topic) {
				matched = true
				break
			}
		}
		if !matched {
			return false, nil
		}
	}

	if preference.UseTimeWindow {
		startHour := clampSmartPushHour(preference.StartHour)
		endHour := clampSmartPushHour(preference.EndHour)
		if startHour != endHour {
			now := time.Now().UTC()
			tz := resolveSmartPushTimezone(preference.Timezone, s.loadUserTimezone(userID))
			if loc, err := time.LoadLocation(tz); err == nil {
				now = now.In(loc)
			}
			if !isHourInsideWindow(now.Hour(), startHour, endHour) {
				return false, nil
			}
		}
	}

	return true, nil
}

func matchesSmartPushCity(filterCity string, ownerCity string) bool {
	filterCity = strings.ToLower(strings.TrimSpace(filterCity))
	if filterCity == "" {
		return true
	}
	ownerCity = strings.ToLower(strings.TrimSpace(ownerCity))
	if ownerCity == "" {
		return false
	}
	return ownerCity == filterCity
}

func matchesSmartPushLanguage(filterLanguage string, ownerLanguage string) bool {
	filterLanguage = normalizeLanguageCode(filterLanguage)
	if filterLanguage == "" {
		return true
	}
	ownerLanguage = normalizeLanguageCode(ownerLanguage)
	if ownerLanguage == "" {
		return false
	}
	return ownerLanguage == filterLanguage
}

func decodeSmartPushTopics(raw string) []string {
	clean := strings.TrimSpace(raw)
	if clean == "" {
		return []string{}
	}
	var topics []string
	if err := json.Unmarshal([]byte(clean), &topics); err != nil {
		return []string{}
	}
	return normalizeSmartPushTopics(topics)
}

func normalizeSmartPushTopics(topics []string) []string {
	if len(topics) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(topics))
	result := make([]string, 0, len(topics))
	for _, topic := range topics {
		clean := strings.ToLower(strings.TrimSpace(topic))
		if clean == "" {
			continue
		}
		if _, ok := seen[clean]; ok {
			continue
		}
		seen[clean] = struct{}{}
		result = append(result, clean)
	}
	return result
}

func clampSmartPushHour(value int) int {
	if value < 0 {
		return 0
	}
	if value > 23 {
		return 23
	}
	return value
}

func isHourInsideWindow(hour, startHour, endHour int) bool {
	if startHour == endHour {
		return true
	}
	if startHour < endHour {
		return hour >= startHour && hour < endHour
	}
	return hour >= startHour || hour < endHour
}

func normalizeLanguageCode(raw string) string {
	clean := strings.ToLower(strings.TrimSpace(raw))
	if clean == "" {
		return ""
	}
	clean = strings.ReplaceAll(clean, "_", "-")
	if idx := strings.Index(clean, "-"); idx > 0 {
		clean = clean[:idx]
	}
	return clean
}

func resolveSmartPushTimezone(preferenceTimezone string, fallback string) string {
	tz := strings.TrimSpace(preferenceTimezone)
	if tz == "" {
		tz = strings.TrimSpace(fallback)
	}
	if tz == "" {
		return "UTC"
	}
	if _, err := time.LoadLocation(tz); err != nil {
		return "UTC"
	}
	return tz
}

func (s *ChannelService) loadUserTimezone(userID uint) string {
	if userID == 0 {
		return "UTC"
	}
	var user models.User
	if err := s.db.Select("timezone").First(&user, userID).Error; err != nil {
		return "UTC"
	}
	return resolveSmartPushTimezone(user.Timezone, "UTC")
}

func (s *ChannelService) reservePostDelivery(
	postID uint,
	userID uint,
	deliveryType models.ChannelPostDeliveryType,
) (uint, bool, error) {
	delivery := models.ChannelPostDelivery{
		PostID:       postID,
		UserID:       userID,
		DeliveryType: deliveryType,
		Status:       models.ChannelPostDeliveryStatusPending,
		DeliveredAt:  nil,
	}

	result := s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "post_id"},
			{Name: "user_id"},
			{Name: "delivery_type"},
		},
		DoNothing: true,
	}).Create(&delivery)
	if result.Error != nil {
		return 0, false, result.Error
	}
	if result.RowsAffected == 0 {
		return 0, false, nil
	}

	return delivery.ID, true, nil
}

func (s *ChannelService) markPostDelivery(deliveryID uint, status models.ChannelPostDeliveryStatus) error {
	if deliveryID == 0 {
		return nil
	}
	now := time.Now().UTC()
	return s.db.Model(&models.ChannelPostDelivery{}).
		Where("id = ?", deliveryID).
		Updates(map[string]interface{}{
			"status":       status,
			"delivered_at": now,
		}).Error
}

func (s *ChannelService) incrementMetricSafe(key string, delta int64) {
	if err := GetMetricsService().Increment(key, delta); err != nil {
		log.Printf("[Channels] metric increment failed (%s): %v", key, err)
	}
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
	if cached, ok := s.getCachedSystemSettingValue(key); ok {
		return cached
	}

	var setting models.SystemSetting
	if err := s.db.Where("key = ?", key).First(&setting).Error; err == nil {
		value := strings.TrimSpace(setting.Value)
		s.setCachedSystemSettingValue(key, value)
		return value
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("[Channels] load setting %s failed: %v", key, err)
	}

	s.setCachedSystemSettingValue(key, fallback)
	return fallback
}

func (s *ChannelService) getCachedSystemSettingValue(key string) (string, bool) {
	s.settingsMu.RLock()
	entry, ok := s.settingsCache[key]
	s.settingsMu.RUnlock()
	if !ok {
		return "", false
	}

	if time.Now().UTC().After(entry.expiresAt) {
		s.settingsMu.Lock()
		delete(s.settingsCache, key)
		s.settingsMu.Unlock()
		return "", false
	}

	return entry.value, true
}

func (s *ChannelService) setCachedSystemSettingValue(key, value string) {
	ttl := s.settingsCacheTTL
	if ttl <= 0 {
		ttl = 60 * time.Second
	}

	s.settingsMu.Lock()
	s.settingsCache[key] = channelSettingCacheEntry{
		value:     value,
		expiresAt: time.Now().UTC().Add(ttl),
	}
	s.settingsMu.Unlock()
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

func calculateChannelTotalPages(total int64, limit int) int {
	if total <= 0 || limit <= 0 {
		return 1
	}

	quotient := total / int64(limit)
	if total%int64(limit) != 0 {
		quotient++
	}

	maxInt := int64(^uint(0) >> 1)
	if quotient > maxInt {
		return int(maxInt)
	}
	return int(quotient)
}

func ceilDivChannel(value int, divisor int) int {
	if value <= 0 || divisor <= 0 {
		return 0
	}
	quotient := value / divisor
	if value%divisor != 0 {
		quotient++
	}
	return quotient
}

func computePromotedFetchLimit(feedLimit int, insertEvery int) int {
	if feedLimit <= 0 {
		feedLimit = 20
	}
	insertEvery = clampChannelInt(insertEvery, 2, 20)

	limit := ceilDivChannel(feedLimit, insertEvery)
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
	if filters.SadhuSanga {
		filteredQuery, showNone, err := s.applySadhuMathFilterToChannelQuery(query, filters.ViewerID)
		if err != nil {
			return nil, err
		}
		if showNone {
			return &models.ChannelListResponse{
				Channels:   []models.Channel{},
				Total:      0,
				Page:       page,
				Limit:      limit,
				TotalPages: calculateChannelTotalPages(0, limit),
			}, nil
		}
		query = filteredQuery
	}
	joinedOwner := false
	if search := strings.TrimSpace(filters.Search); search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if city := strings.TrimSpace(filters.City); city != "" {
		if !joinedOwner {
			query = query.Joins("JOIN users ON users.id = channels.owner_id")
			joinedOwner = true
		}
		query = query.Where("LOWER(users.city) = LOWER(?)", city)
	}
	if language := strings.TrimSpace(filters.Language); language != "" {
		if !joinedOwner {
			query = query.Joins("JOIN users ON users.id = channels.owner_id")
			joinedOwner = true
		}
		query = query.Where("LOWER(users.language) = LOWER(?)", language)
	}
	if topic := strings.TrimSpace(filters.Topic); topic != "" {
		ownerByTopic := s.db.
			Table("user_tags").
			Select("DISTINCT user_tags.user_id").
			Joins("JOIN tags ON tags.id = user_tags.tag_id").
			Where("LOWER(tags.name) LIKE ?", "%"+strings.ToLower(topic)+"%")
		query = query.Where("channels.owner_id IN (?)", ownerByTopic)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var channels []models.Channel
	if err := query.
		Preload("Owner").
		Distinct("channels.*").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&channels).Error; err != nil {
		return nil, err
	}

	channelPointers := make([]*models.Channel, 0, len(channels))
	for i := range channels {
		channelPointers = append(channelPointers, &channels[i])
	}
	if err := s.enrichChannelsFollowMeta(channelPointers, filters.ViewerID); err != nil {
		return nil, err
	}
	if err := s.enrichChannelsLiveMeta(channelPointers); err != nil {
		return nil, err
	}

	totalPages := calculateChannelTotalPages(total, limit)

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
	runes := []rune(key)
	if len(runes) > 120 {
		return string(runes[:120])
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
	case models.ChannelMemberRoleSubscriber:
		return 0
	default:
		return 0
	}
}

func (s *ChannelService) enrichChannelsFollowMeta(channels []*models.Channel, viewerID uint) error {
	if len(channels) == 0 {
		return nil
	}

	channelIDs := make([]uint, 0, len(channels))
	for _, channel := range channels {
		if channel == nil || channel.ID == 0 {
			continue
		}
		channelIDs = append(channelIDs, channel.ID)
	}
	if len(channelIDs) == 0 {
		return nil
	}

	countsByChannel, err := s.fetchFollowersCountMap(channelIDs)
	if err != nil {
		return err
	}

	rolesByChannel := map[uint]models.ChannelMemberRole{}
	if viewerID > 0 {
		rolesByChannel, err = s.fetchViewerChannelRoleMap(viewerID, channelIDs)
		if err != nil {
			return err
		}
	}

	for _, channel := range channels {
		if channel == nil {
			continue
		}
		channel.FollowersCount = countsByChannel[channel.ID]
		channel.IsFollowing = false
		if viewerID > 0 {
			if channel.OwnerID == viewerID {
				channel.IsFollowing = true
				continue
			}
			_, channel.IsFollowing = rolesByChannel[channel.ID]
		}
	}

	return nil
}

func (s *ChannelService) enrichChannelsLiveMeta(channels []*models.Channel) error {
	if len(channels) == 0 {
		return nil
	}
	channelIDs := make([]uint, 0, len(channels))
	for _, channel := range channels {
		if channel == nil || channel.ID == 0 {
			continue
		}
		channel.LiveStatus = "none"
		channel.CurrentLive = nil
		channelIDs = append(channelIDs, channel.ID)
	}
	if len(channelIDs) == 0 {
		return nil
	}

	var sessions []models.ChannelLiveSession
	if err := s.db.
		Where("channel_id IN ? AND status IN ?", channelIDs, []models.ChannelLiveStatus{
			models.ChannelLiveStatusLive,
			models.ChannelLiveStatusScheduled,
		}).
		Order("CASE WHEN status = 'live' THEN 0 ELSE 1 END").
		Order("COALESCE(started_at, scheduled_at, created_at) DESC").
		Find(&sessions).Error; err != nil {
		return err
	}

	sessionByChannel := make(map[uint]*models.ChannelLiveSession, len(sessions))
	for i := range sessions {
		session := &sessions[i]
		if _, exists := sessionByChannel[session.ChannelID]; exists {
			continue
		}
		sessionByChannel[session.ChannelID] = session
	}

	for _, channel := range channels {
		if channel == nil {
			continue
		}
		if session, ok := sessionByChannel[channel.ID]; ok {
			channel.LiveStatus = string(session.Status)
			channel.CurrentLive = toLiveSessionSummary(session)
		}
	}
	return nil
}

func (s *ChannelService) fetchFollowersCountMap(channelIDs []uint) (map[uint]int64, error) {
	type followersCountRow struct {
		ChannelID uint
		Count     int64
	}

	countsByChannel := make(map[uint]int64, len(channelIDs))
	if len(channelIDs) == 0 {
		return countsByChannel, nil
	}

	var rows []followersCountRow
	if err := s.db.Model(&models.ChannelMember{}).
		Select("channel_id, COUNT(*) AS count").
		Where("channel_id IN ? AND role NOT IN ?", channelIDs, []models.ChannelMemberRole{
			models.ChannelMemberRoleOwner,
			models.ChannelMemberRoleAdmin,
			models.ChannelMemberRoleEditor,
		}).
		Group("channel_id").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	for _, row := range rows {
		countsByChannel[row.ChannelID] = row.Count
	}
	return countsByChannel, nil
}

func (s *ChannelService) fetchViewerChannelRoleMap(viewerID uint, channelIDs []uint) (map[uint]models.ChannelMemberRole, error) {
	roleByChannel := make(map[uint]models.ChannelMemberRole, len(channelIDs))
	if viewerID == 0 || len(channelIDs) == 0 {
		return roleByChannel, nil
	}

	var memberships []models.ChannelMember
	if err := s.db.Select("channel_id", "role").
		Where("user_id = ? AND channel_id IN ?", viewerID, channelIDs).
		Find(&memberships).Error; err != nil {
		return nil, err
	}
	for _, membership := range memberships {
		roleByChannel[membership.ChannelID] = membership.Role
	}
	return roleByChannel, nil
}

func resolveDeliverPersonally(isPublic bool, requested *bool) bool {
	if isPublic {
		return false
	}
	if requested == nil {
		return true
	}
	return *requested
}

func buildPersonalDeliveryContent(post *models.ChannelPost, channel *models.Channel) string {
	content := strings.TrimSpace(post.Content)
	if content != "" {
		return content
	}
	channelTitle := ""
	if channel != nil {
		channelTitle = strings.TrimSpace(channel.Title)
	}
	if channelTitle != "" {
		return fmt.Sprintf("Новая новость в канале %s", channelTitle)
	}
	return "Новая новость в приватном канале"
}

func buildPersonalPushTitle(channel *models.Channel) string {
	if channel != nil {
		title := strings.TrimSpace(channel.Title)
		if title != "" {
			return fmt.Sprintf("Новая новость: %s", title)
		}
	}
	return "Новая новость от мастера"
}

func buildPersonalPushBody(post *models.ChannelPost) string {
	body := strings.TrimSpace(post.Content)
	if body == "" {
		return "Откройте канал, чтобы прочитать новость"
	}
	const maxRunes = 140
	runes := []rune(body)
	if len(runes) > maxRunes {
		return string(runes[:maxRunes]) + "..."
	}
	return body
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
		serviceID, ok := extractPositiveUintFromMap(data, "serviceId", "service_id")
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
		shopID, ok := extractPositiveUintFromMap(data, "shopId", "shop_id")
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
			productID, ok := extractPositiveUintFromMap(itemMap, "productId", "product_id")
			if !ok || productID == 0 {
				return errors.New("ctaPayloadJson.items[].productId is required and must be > 0")
			}
			qty, ok := extractPositiveUintFromMap(itemMap, "quantity")
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
	if post.Status == models.ChannelPostStatusDraft {
		return nil
	}
	if post.Status == models.ChannelPostStatusPublished {
		if post.PublishedAt == nil {
			return ErrPostEditWindow
		}
		if time.Since(post.PublishedAt.UTC()) <= postAuthorEditWindow {
			return nil
		}
		return ErrPostEditWindow
	}
	return errors.New("editor can only edit draft posts")
}

func isAllowedChannelReaction(emoji string) bool {
	switch emoji {
	case "👍", "❤️", "🔥", "🙏", "😂", "😮":
		return true
	default:
		return false
	}
}

func (s *ChannelService) hydrateMyReactions(posts []models.ChannelPost, viewerID uint) error {
	if viewerID == 0 || len(posts) == 0 {
		return nil
	}

	postIDs := make([]uint, 0, len(posts))
	for _, post := range posts {
		postIDs = append(postIDs, post.ID)
	}

	var reactions []models.ChannelPostReaction
	if err := s.db.Where("post_id IN ? AND user_id = ?", postIDs, viewerID).
		Find(&reactions).Error; err != nil {
		return err
	}
	if len(reactions) == 0 {
		return nil
	}

	myReactionByPostID := make(map[uint]string, len(reactions))
	for _, item := range reactions {
		myReactionByPostID[item.PostID] = item.Emoji
	}

	for i := range posts {
		if emoji, ok := myReactionByPostID[posts[i].ID]; ok {
			emojiCopy := emoji
			posts[i].MyReaction = &emojiCopy
		}
	}

	return nil
}

func hydrateChannelPostStats(posts []models.ChannelPost) {
	for i := range posts {
		stats := models.ChannelPostStats{
			Views:     posts[i].ViewCount,
			Reactions: posts[i].ReactionCount,
			Comments:  posts[i].CommentCount,
			Shares:    posts[i].ShareCount,
		}
		posts[i].Stats = &stats
	}
}

func validateSchedulePostRequest(status models.ChannelPostStatus, scheduledAt time.Time) error {
	if scheduledAt.IsZero() {
		return errors.New("scheduledAt is required")
	}
	if status == models.ChannelPostStatusPublished {
		return errors.New("published post cannot be scheduled")
	}
	if scheduledAt.UTC().Before(time.Now().UTC().Add(-1 * time.Second)) {
		return errors.New("invalid scheduledAt: must be in the future")
	}
	return nil
}

func validatePinPostStatus(status models.ChannelPostStatus) error {
	if status != models.ChannelPostStatusPublished {
		return errors.New("only published posts can be pinned")
	}
	return nil
}

func (s *ChannelService) normalizePostMediaJSON(channelID uint, raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}

	var payload models.ChannelPostMediaPayload
	decoder := json.NewDecoder(strings.NewReader(trimmed))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		return "", ErrInvalidPayload
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return "", ErrInvalidPayload
	}

	if err := validateChannelPostMediaPayload(&payload); err != nil {
		return "", err
	}
	if err := s.validateChannelPostMediaCircles(channelID, payload.Circles); err != nil {
		return "", err
	}

	normalized, err := json.Marshal(payload)
	if err != nil {
		return "", ErrInvalidPayload
	}
	return string(normalized), nil
}

func validateChannelPostMediaPayload(payload *models.ChannelPostMediaPayload) error {
	if payload == nil {
		return nil
	}
	if len(payload.Images) > channelPostImagesLimit {
		return ErrInvalidPayload
	}
	if len(payload.Circles) > channelPostCirclesLimit {
		return ErrInvalidPayload
	}

	for i := range payload.Images {
		payload.Images[i].URL = strings.TrimSpace(payload.Images[i].URL)
		payload.Images[i].MimeType = normalizeImageContentType(payload.Images[i].MimeType)
		if payload.Images[i].URL == "" {
			return ErrInvalidPayload
		}
		if payload.Images[i].Width <= 0 || payload.Images[i].Height <= 0 {
			return ErrInvalidPayload
		}
		if !isAllowedChannelPostUploadMime(payload.Images[i].MimeType) {
			return ErrInvalidPayload
		}
	}

	seenCircleIDs := make(map[uint]struct{}, len(payload.Circles))
	for i := range payload.Circles {
		payload.Circles[i].MediaURL = strings.TrimSpace(payload.Circles[i].MediaURL)
		payload.Circles[i].ThumbnailURL = strings.TrimSpace(payload.Circles[i].ThumbnailURL)
		if payload.Circles[i].ID == 0 {
			return ErrInvalidPayload
		}
		if payload.Circles[i].MediaURL == "" {
			return ErrInvalidPayload
		}
		if _, exists := seenCircleIDs[payload.Circles[i].ID]; exists {
			return ErrInvalidPayload
		}
		seenCircleIDs[payload.Circles[i].ID] = struct{}{}
	}

	return nil
}

func (s *ChannelService) validateChannelPostMediaCircles(channelID uint, circles []models.ChannelPostMediaCircle) error {
	if len(circles) == 0 {
		return nil
	}

	circleIDs := make([]uint, 0, len(circles))
	for _, item := range circles {
		circleIDs = append(circleIDs, item.ID)
	}

	var count int64
	if err := s.db.Model(&models.VideoCircle{}).
		Where("id IN ? AND channel_id = ? AND status <> ?", circleIDs, channelID, models.VideoCircleStatusDeleted).
		Count(&count).Error; err != nil {
		return err
	}
	if int(count) != len(circleIDs) {
		return ErrInvalidPayload
	}

	return nil
}

func normalizeImageContentType(raw string) string {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	if idx := strings.Index(normalized, ";"); idx >= 0 {
		normalized = strings.TrimSpace(normalized[:idx])
	}
	if normalized == "image/jpg" {
		return "image/jpeg"
	}
	return normalized
}

func isAllowedChannelPostUploadMime(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

func extractPositiveUint(value interface{}) (uint, bool) {
	const maxAllowedID = uint64(^uint32(0))

	switch typed := value.(type) {
	case float64:
		if typed <= 0 {
			return 0, false
		}
		if math.Trunc(typed) != typed {
			return 0, false
		}
		if typed > float64(maxAllowedID) {
			return 0, false
		}
		return uint(typed), true
	case int:
		if typed <= 0 {
			return 0, false
		}
		if uint64(typed) > maxAllowedID {
			return 0, false
		}
		return uint(typed), true
	case int64:
		if typed <= 0 {
			return 0, false
		}
		if uint64(typed) > maxAllowedID {
			return 0, false
		}
		return uint(typed), true
	case uint:
		if typed == 0 {
			return 0, false
		}
		if uint64(typed) > maxAllowedID {
			return 0, false
		}
		return typed, true
	case uint64:
		if typed == 0 {
			return 0, false
		}
		if typed > maxAllowedID {
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

func buildChannelCoverImage(file multipart.File) ([]byte, error) {
	raw, err := io.ReadAll(io.LimitReader(file, channelCoverMaxBytes+1))
	if err != nil {
		return nil, errors.New("failed to read cover file")
	}
	if len(raw) == 0 {
		return nil, errors.New("empty cover file")
	}
	if len(raw) > channelCoverMaxBytes {
		return nil, errors.New("cover file is too large")
	}

	sourceImage, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, errors.New("invalid image format")
	}

	sourceBounds := sourceImage.Bounds()
	sourceWidth := sourceBounds.Dx()
	sourceHeight := sourceBounds.Dy()
	if sourceWidth <= 0 || sourceHeight <= 0 {
		return nil, errors.New("invalid image dimensions")
	}

	targetRatio := float64(channelCoverWidth) / float64(channelCoverHeight)
	sourceRatio := float64(sourceWidth) / float64(sourceHeight)

	cropWidth := sourceWidth
	cropHeight := sourceHeight
	cropX := 0
	cropY := 0

	if sourceRatio > targetRatio {
		cropWidth = int(float64(sourceHeight) * targetRatio)
		cropX = (sourceWidth - cropWidth) / 2
	} else if sourceRatio < targetRatio {
		cropHeight = int(float64(sourceWidth) / targetRatio)
		cropY = (sourceHeight - cropHeight) / 2
	}

	cropped := image.NewRGBA(image.Rect(0, 0, cropWidth, cropHeight))
	stdDraw.Draw(
		cropped,
		cropped.Bounds(),
		sourceImage,
		image.Point{X: sourceBounds.Min.X + cropX, Y: sourceBounds.Min.Y + cropY},
		stdDraw.Src,
	)

	resized := image.NewRGBA(image.Rect(0, 0, channelCoverWidth, channelCoverHeight))
	xDraw.CatmullRom.Scale(resized, resized.Bounds(), cropped, cropped.Bounds(), stdDraw.Over, nil)

	var out bytes.Buffer
	if err := jpeg.Encode(&out, resized, &jpeg.Options{Quality: 85}); err != nil {
		return nil, errors.New("failed to encode cover image")
	}

	return out.Bytes(), nil
}

func buildChannelPostImage(file multipart.File) ([]byte, error) {
	raw, err := io.ReadAll(io.LimitReader(file, channelPostMediaMaxBytes+1))
	if err != nil {
		return nil, errors.New("failed to read media file")
	}
	if len(raw) == 0 {
		return nil, errors.New("empty media file")
	}
	if len(raw) > channelPostMediaMaxBytes {
		return nil, errors.New("media file is too large")
	}

	sourceImage, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, errors.New("invalid image format")
	}

	sourceBounds := sourceImage.Bounds()
	sourceWidth := sourceBounds.Dx()
	sourceHeight := sourceBounds.Dy()
	if sourceWidth <= 0 || sourceHeight <= 0 {
		return nil, errors.New("invalid image dimensions")
	}

	targetRatio := float64(channelPostImageWidth) / float64(channelPostImageHeight)
	sourceRatio := float64(sourceWidth) / float64(sourceHeight)

	cropWidth := sourceWidth
	cropHeight := sourceHeight
	cropX := 0
	cropY := 0

	if sourceRatio > targetRatio {
		cropWidth = int(float64(sourceHeight) * targetRatio)
		cropX = (sourceWidth - cropWidth) / 2
	} else if sourceRatio < targetRatio {
		cropHeight = int(float64(sourceWidth) / targetRatio)
		cropY = (sourceHeight - cropHeight) / 2
	}

	cropped := image.NewRGBA(image.Rect(0, 0, cropWidth, cropHeight))
	stdDraw.Draw(
		cropped,
		cropped.Bounds(),
		sourceImage,
		image.Point{X: sourceBounds.Min.X + cropX, Y: sourceBounds.Min.Y + cropY},
		stdDraw.Src,
	)

	resized := image.NewRGBA(image.Rect(0, 0, channelPostImageWidth, channelPostImageHeight))
	xDraw.CatmullRom.Scale(resized, resized.Bounds(), cropped, cropped.Bounds(), stdDraw.Over, nil)

	var out bytes.Buffer
	if err := jpeg.Encode(&out, resized, &jpeg.Options{Quality: 85}); err != nil {
		return nil, errors.New("failed to encode post image")
	}

	return out.Bytes(), nil
}

func extractPositiveUintFromMap(data map[string]interface{}, keys ...string) (uint, bool) {
	for _, key := range keys {
		if key == "" {
			continue
		}
		value, exists := data[key]
		if !exists {
			continue
		}
		if parsed, ok := extractPositiveUint(value); ok {
			return parsed, true
		}
	}
	return 0, false
}
