package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/url"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrCircleExpired   = errors.New("circle expired")
	ErrInsufficientLKM = errors.New("insufficient lkm")
)

const (
	defaultCircleDurationSec       = 60
	maxCircleDurationSec           = 60
	defaultRepublishDurationMinute = 60
	maxRepublishDurationMinute     = 24 * 60
)

type VideoCircleService struct {
	db     *gorm.DB
	wallet *WalletService
	s3     *S3Service
}

func NewVideoCircleService() *VideoCircleService {
	return &VideoCircleService{
		db:     database.DB,
		wallet: NewWalletService(),
		s3:     NewS3Service(),
	}
}

func isDuplicateKeyErrorVideoCircle(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "unique violation") ||
		strings.Contains(msg, "duplicate entry")
}

func (s *VideoCircleService) EnsureDefaultTariffs() error {
	defaults := []models.VideoTariff{
		{Code: models.VideoTariffCodeLKMBoost, PriceLkm: 10, DurationMinutes: 60, IsActive: true},
		{Code: models.VideoTariffCodeCityBoost, PriceLkm: 20, DurationMinutes: 120, IsActive: true},
		{Code: models.VideoTariffCodePremiumBoost, PriceLkm: 30, DurationMinutes: 180, IsActive: true},
	}

	for _, item := range defaults {
		var existing models.VideoTariff
		err := s.db.Where("code = ?", item.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if createErr := s.db.Create(&item).Error; createErr != nil {
				if isDuplicateKeyErrorVideoCircle(createErr) {
					continue
				}
				return createErr
			}
			continue
		}
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *VideoCircleService) ListTariffs() ([]models.VideoTariff, error) {
	var tariffs []models.VideoTariff
	err := s.db.Order("code ASC").Find(&tariffs).Error
	return tariffs, err
}

func (s *VideoCircleService) CreateTariff(req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
	code := normalizeVideoTariffCode(req.Code)
	if code == "" {
		return nil, errors.New("code is required")
	}
	if !isSupportedTariffCode(code) {
		return nil, errors.New("unsupported tariff code")
	}
	if req.DurationMinutes <= 0 {
		return nil, errors.New("durationMinutes must be > 0")
	}
	if req.PriceLkm < 0 {
		return nil, errors.New("priceLkm must be >= 0")
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	item := &models.VideoTariff{
		Code:            code,
		PriceLkm:        req.PriceLkm,
		DurationMinutes: req.DurationMinutes,
		IsActive:        isActive,
		UpdatedBy:       &updatedBy,
	}
	if err := s.db.Create(item).Error; err != nil {
		if isDuplicateKeyErrorVideoCircle(err) {
			return nil, errors.New("tariff with this code already exists")
		}
		return nil, err
	}
	return item, nil
}

func (s *VideoCircleService) UpdateTariff(id uint, req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error) {
	var item models.VideoTariff
	if err := s.db.First(&item, id).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"updated_by": updatedBy,
	}
	if req.Code != "" {
		code := normalizeVideoTariffCode(req.Code)
		if !isSupportedTariffCode(code) {
			return nil, errors.New("unsupported tariff code")
		}
		updates["code"] = code
	}
	if req.PriceLkm >= 0 {
		updates["price_lkm"] = req.PriceLkm
	}
	if req.DurationMinutes > 0 {
		updates["duration_minutes"] = req.DurationMinutes
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if err := s.db.Model(&item).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&item, id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *VideoCircleService) ListCircles(userID uint, role string, params models.VideoCircleListParams) (*models.VideoCircleListResponse, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	// Keep active/expired states consistent for feed reads.
	if err := s.db.Model(&models.VideoCircle{}).
		Where("status = ? AND expires_at <= ?", models.VideoCircleStatusActive, time.Now()).
		Update("status", models.VideoCircleStatusExpired).Error; err != nil {
		log.Printf("circle_list expire_sync_error=%v", err)
	}

	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	now := time.Now()
	query := s.db.Model(&models.VideoCircle{}).Joins("JOIN users ON users.id = video_circles.author_id")
	if params.ChannelID != nil {
		channelService := NewChannelService()
		if _, err := channelService.GetChannelByID(*params.ChannelID, userID); err != nil {
			return nil, err
		}
		query = query.Where("video_circles.channel_id = ?", *params.ChannelID)
	}

	status := strings.TrimSpace(strings.ToLower(params.Status))
	if status == "" {
		query = query.Where("status = ? AND expires_at > ?", models.VideoCircleStatusActive, now)
	} else {
		query = query.Where("status = ?", status)
		if status == string(models.VideoCircleStatusActive) {
			query = query.Where("expires_at > ?", now)
		}
	}

	city := strings.TrimSpace(params.City)
	if city != "" {
		query = query.Where("city = ?", city)
	}
	category := strings.TrimSpace(params.Category)
	if category != "" {
		query = query.Where("category = ?", category)
	}

	allowAllMatha := user.GodModeEnabled || strings.EqualFold(role, models.RoleSuperadmin)
	if params.ChannelID == nil {
		normalizedRoleScope := normalizePortalRoleScope(params.RoleScope)
		if allowAllMatha {
			if len(normalizedRoleScope) > 0 {
				query = query.Where("LOWER(users.role) IN ?", normalizedRoleScope)
			}
		} else {
			if len(normalizedRoleScope) == 0 {
				if normalizedUserRole := strings.ToLower(strings.TrimSpace(user.Role)); normalizedUserRole != "" {
					normalizedRoleScope = []string{normalizedUserRole}
				}
			}
			if len(normalizedRoleScope) > 0 {
				query = query.Where("LOWER(users.role) IN ?", normalizedRoleScope)
			}
		}

		if allowAllMatha {
			matha := strings.TrimSpace(params.Matha)
			if matha != "" {
				query = query.Where("matha = ?", matha)
			}
		} else {
			if user.Madh != "" {
				query = query.Where("matha = ?", user.Madh)
			} else {
				// Profile without matha cannot access multi-matha feed by query override.
				query = query.Where("1 = 0")
			}
		}

		scope := strings.ToLower(strings.TrimSpace(params.Scope))
		if scope == "friends" {
			query = query.Where(
				"video_circles.author_id IN (?)",
				s.db.Model(&models.Friend{}).Select("friend_id").Where("user_id = ?", userID),
			)
		}
	}

	sort := strings.TrimSpace(strings.ToLower(params.Sort))
	switch sort {
	case "expires_soon":
		query = query.Order("expires_at ASC")
	case "oldest":
		query = query.Order("created_at ASC")
	default:
		query = query.Order("created_at DESC")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var circles []models.VideoCircle
	offset := (params.Page - 1) * params.Limit
	if err := query.Offset(offset).Limit(params.Limit).Find(&circles).Error; err != nil {
		return nil, err
	}

	items := make([]models.VideoCircleResponse, 0, len(circles))
	for _, c := range circles {
		remaining := int(c.ExpiresAt.Sub(now).Seconds())
		if remaining < 0 {
			remaining = 0
		}
		items = append(items, models.VideoCircleResponse{
			ID:                 c.ID,
			AuthorID:           c.AuthorID,
			ChannelID:          c.ChannelID,
			MediaURL:           c.MediaURL,
			ThumbnailURL:       c.ThumbnailURL,
			City:               c.City,
			Matha:              c.Matha,
			Category:           c.Category,
			Status:             c.Status,
			DurationSec:        c.DurationSec,
			ExpiresAt:          c.ExpiresAt,
			RemainingSec:       remaining,
			PremiumBoostActive: c.PremiumBoostActive,
			LikeCount:          c.LikeCount,
			CommentCount:       c.CommentCount,
			ChatCount:          c.ChatCount,
			CreatedAt:          c.CreatedAt,
		})
	}

	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	log.Printf("circle_list user_id=%d role=%s total=%d page=%d", userID, role, total, params.Page)
	return &models.VideoCircleListResponse{
		Circles:    items,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

func normalizePortalRoleScope(values []string) []string {
	allowed := map[string]struct{}{
		models.RoleUser:       {},
		models.RoleInGoodness: {},
		models.RoleYogi:       {},
		models.RoleDevotee:    {},
	}

	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		role := strings.ToLower(strings.TrimSpace(value))
		if role == "" {
			continue
		}
		if _, ok := allowed[role]; !ok {
			continue
		}
		if _, exists := seen[role]; exists {
			continue
		}
		seen[role] = struct{}{}
		result = append(result, role)
	}
	return result
}

func (s *VideoCircleService) CreateCircle(userID uint, role string, req models.VideoCircleCreateRequest) (*models.VideoCircleResponse, error) {
	mediaURL := strings.TrimSpace(req.MediaURL)
	if mediaURL == "" {
		return nil, errors.New("mediaUrl is required")
	}
	thumbnailURL := strings.TrimSpace(req.ThumbnailURL)
	city := strings.TrimSpace(req.City)
	category := strings.TrimSpace(req.Category)
	if category == "" {
		return nil, errors.New("category is required")
	}

	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	duration := req.DurationSec
	if duration <= 0 {
		duration = defaultCircleDurationSec
	}
	if duration > maxCircleDurationSec {
		duration = maxCircleDurationSec
	}

	expiresAt := time.Now().Add(60 * time.Minute)
	if req.ExpiresAt != nil {
		expiresAt = *req.ExpiresAt
	}
	if !expiresAt.After(time.Now()) {
		return nil, errors.New("expiresAt must be in the future")
	}

	matha := strings.TrimSpace(req.Matha)
	if !(user.GodModeEnabled || strings.EqualFold(role, models.RoleSuperadmin)) {
		matha = strings.TrimSpace(user.Madh)
	}
	if matha == "" {
		return nil, errors.New("matha is required")
	}
	var channelID *uint
	if req.ChannelID != nil {
		channelService := NewChannelService()
		if !channelService.IsFeatureEnabledForUser(userID) {
			return nil, ErrChannelsDisabled
		}
		channel, role, err := channelService.requireRole(*req.ChannelID, userID, models.ChannelMemberRoleEditor)
		if err != nil {
			return nil, err
		}
		if rankRole(role) < rankRole(models.ChannelMemberRoleEditor) {
			return nil, ErrChannelForbidden
		}
		channelID = &channel.ID
	}

	circle := models.VideoCircle{
		AuthorID:           userID,
		ChannelID:          channelID,
		MediaURL:           mediaURL,
		ThumbnailURL:       thumbnailURL,
		City:               city,
		Matha:              matha,
		Category:           category,
		Status:             models.VideoCircleStatusActive,
		DurationSec:        duration,
		ExpiresAt:          expiresAt,
		PremiumBoostActive: false,
	}

	if err := s.db.Create(&circle).Error; err != nil {
		return nil, err
	}

	remaining := int(circle.ExpiresAt.Sub(time.Now()).Seconds())
	if remaining < 0 {
		remaining = 0
	}

	return &models.VideoCircleResponse{
		ID:                 circle.ID,
		AuthorID:           circle.AuthorID,
		ChannelID:          circle.ChannelID,
		MediaURL:           circle.MediaURL,
		ThumbnailURL:       circle.ThumbnailURL,
		City:               circle.City,
		Matha:              circle.Matha,
		Category:           circle.Category,
		Status:             circle.Status,
		DurationSec:        circle.DurationSec,
		ExpiresAt:          circle.ExpiresAt,
		RemainingSec:       remaining,
		PremiumBoostActive: circle.PremiumBoostActive,
		LikeCount:          circle.LikeCount,
		CommentCount:       circle.CommentCount,
		ChatCount:          circle.ChatCount,
		CreatedAt:          circle.CreatedAt,
	}, nil
}

func (s *VideoCircleService) ListMyCircles(userID uint, page, limit int) (*models.VideoCircleListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var total int64
	query := s.db.Model(&models.VideoCircle{}).Where("author_id = ?", userID).Order("created_at DESC")
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var circles []models.VideoCircle
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&circles).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	items := make([]models.VideoCircleResponse, 0, len(circles))
	for _, c := range circles {
		remaining := int(c.ExpiresAt.Sub(now).Seconds())
		if remaining < 0 {
			remaining = 0
		}
		items = append(items, models.VideoCircleResponse{
			ID:                 c.ID,
			AuthorID:           c.AuthorID,
			ChannelID:          c.ChannelID,
			MediaURL:           c.MediaURL,
			ThumbnailURL:       c.ThumbnailURL,
			City:               c.City,
			Matha:              c.Matha,
			Category:           c.Category,
			Status:             c.Status,
			DurationSec:        c.DurationSec,
			ExpiresAt:          c.ExpiresAt,
			RemainingSec:       remaining,
			PremiumBoostActive: c.PremiumBoostActive,
			LikeCount:          c.LikeCount,
			CommentCount:       c.CommentCount,
			ChatCount:          c.ChatCount,
			CreatedAt:          c.CreatedAt,
		})
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &models.VideoCircleListResponse{
		Circles:    items,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (s *VideoCircleService) DeleteCircle(circleID, userID uint, role string) error {
	var circle models.VideoCircle
	if err := s.db.First(&circle, circleID).Error; err != nil {
		return err
	}

	isOwner := circle.AuthorID == userID
	isAdmin := strings.EqualFold(role, models.RoleAdmin) || strings.EqualFold(role, models.RoleSuperadmin)
	if !isOwner && !isAdmin {
		return errors.New("forbidden")
	}

	if err := s.db.Model(&circle).Update("status", models.VideoCircleStatusDeleted).Error; err != nil {
		return err
	}

	go s.CleanupExpiredS3(circleID)
	return nil
}

func (s *VideoCircleService) UpdateCircle(circleID, userID uint, role string, req models.VideoCircleUpdateRequest) (*models.VideoCircleResponse, error) {
	var circle models.VideoCircle
	if err := s.db.First(&circle, circleID).Error; err != nil {
		return nil, err
	}

	isOwner := circle.AuthorID == userID
	isAdmin := strings.EqualFold(role, models.RoleAdmin) || strings.EqualFold(role, models.RoleSuperadmin)
	if !isOwner && !isAdmin {
		return nil, errors.New("forbidden")
	}

	var actor models.User
	if err := s.db.First(&actor, userID).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.City != nil {
		updates["city"] = strings.TrimSpace(*req.City)
	}
	if req.Category != nil {
		category := strings.TrimSpace(*req.Category)
		if category == "" {
			return nil, errors.New("category is required")
		}
		updates["category"] = category
	}
	if req.ThumbnailURL != nil {
		updates["thumbnail_url"] = strings.TrimSpace(*req.ThumbnailURL)
	}
	if req.Matha != nil {
		matha := strings.TrimSpace(*req.Matha)
		if !(actor.GodModeEnabled || strings.EqualFold(role, models.RoleSuperadmin)) {
			matha = strings.TrimSpace(actor.Madh)
		}
		if matha == "" {
			return nil, errors.New("matha is required")
		}
		updates["matha"] = matha
	}

	if len(updates) > 0 {
		if err := s.db.Model(&circle).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := s.db.First(&circle, circleID).Error; err != nil {
		return nil, err
	}
	log.Printf("circle_update circle_id=%d actor_id=%d role=%s", circleID, userID, role)

	now := time.Now()
	remaining := int(circle.ExpiresAt.Sub(now).Seconds())
	if remaining < 0 {
		remaining = 0
	}

	return &models.VideoCircleResponse{
		ID:                 circle.ID,
		AuthorID:           circle.AuthorID,
		ChannelID:          circle.ChannelID,
		MediaURL:           circle.MediaURL,
		ThumbnailURL:       circle.ThumbnailURL,
		City:               circle.City,
		Matha:              circle.Matha,
		Category:           circle.Category,
		Status:             circle.Status,
		DurationSec:        circle.DurationSec,
		ExpiresAt:          circle.ExpiresAt,
		RemainingSec:       remaining,
		PremiumBoostActive: circle.PremiumBoostActive,
		LikeCount:          circle.LikeCount,
		CommentCount:       circle.CommentCount,
		ChatCount:          circle.ChatCount,
		CreatedAt:          circle.CreatedAt,
	}, nil
}

func (s *VideoCircleService) RepublishCircle(circleID, userID uint, role string, req models.VideoCircleRepublishRequest) (*models.VideoCircleResponse, error) {
	var circle models.VideoCircle
	if err := s.db.First(&circle, circleID).Error; err != nil {
		return nil, err
	}

	if circle.Status == models.VideoCircleStatusDeleted {
		return nil, errors.New("deleted circle cannot be republished")
	}

	isOwner := circle.AuthorID == userID
	isAdmin := strings.EqualFold(role, models.RoleAdmin) || strings.EqualFold(role, models.RoleSuperadmin)
	if !isOwner && !isAdmin {
		return nil, errors.New("forbidden")
	}

	durationMinutes := req.DurationMinutes
	if durationMinutes <= 0 {
		durationMinutes = defaultRepublishDurationMinute
	}
	if durationMinutes > maxRepublishDurationMinute {
		durationMinutes = maxRepublishDurationMinute
	}

	start := time.Now()
	if circle.ExpiresAt.After(start) {
		start = circle.ExpiresAt
	}
	newExpires := start.Add(time.Duration(durationMinutes) * time.Minute)
	if err := s.db.Model(&circle).Updates(map[string]interface{}{
		"status":     models.VideoCircleStatusActive,
		"expires_at": newExpires,
	}).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&circle, circleID).Error; err != nil {
		return nil, err
	}

	remaining := int(newExpires.Sub(time.Now()).Seconds())
	if remaining < 0 {
		remaining = 0
	}
	log.Printf("circle_republish circle_id=%d actor_id=%d role=%s duration_min=%d", circleID, userID, role, durationMinutes)
	return &models.VideoCircleResponse{
		ID:                 circle.ID,
		AuthorID:           circle.AuthorID,
		ChannelID:          circle.ChannelID,
		MediaURL:           circle.MediaURL,
		ThumbnailURL:       circle.ThumbnailURL,
		City:               circle.City,
		Matha:              circle.Matha,
		Category:           circle.Category,
		Status:             circle.Status,
		DurationSec:        circle.DurationSec,
		ExpiresAt:          circle.ExpiresAt,
		RemainingSec:       remaining,
		PremiumBoostActive: circle.PremiumBoostActive,
		LikeCount:          circle.LikeCount,
		CommentCount:       circle.CommentCount,
		ChatCount:          circle.ChatCount,
		CreatedAt:          circle.CreatedAt,
	}, nil
}

func (s *VideoCircleService) AddInteraction(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error) {
	interactionType := normalizeVideoInteractionType(req.Type)
	if interactionType == "" {
		return nil, errors.New("unknown interaction type")
	}
	action := strings.TrimSpace(strings.ToLower(req.Action))
	if action == "" {
		action = "add"
	}

	likedByUser := false
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var circle models.VideoCircle
		now := time.Now()
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&circle, circleID).Error; err != nil {
			return err
		}
		if circle.Status != models.VideoCircleStatusActive || !circle.ExpiresAt.After(now) {
			return ErrCircleExpired
		}

		switch interactionType {
		case models.VideoCircleInteractionLike:
			if action != "toggle" {
				action = "toggle"
			}
			var existing models.VideoCircleInteraction
			err := tx.Where("circle_id = ? AND user_id = ? AND type = ?", circleID, userID, models.VideoCircleInteractionLike).First(&existing).Error
			if err == nil {
				if err := tx.Delete(&existing).Error; err != nil {
					return err
				}
				if err := tx.Model(&circle).Update("like_count", gorm.Expr("GREATEST(like_count - 1, 0)")).Error; err != nil {
					return err
				}
				likedByUser = false
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				newRecord := models.VideoCircleInteraction{
					CircleID: circleID,
					UserID:   userID,
					Type:     models.VideoCircleInteractionLike,
					Value:    1,
				}
				if err := tx.Create(&newRecord).Error; err != nil {
					if isDuplicateKeyErrorVideoCircle(err) {
						likedByUser = true
						return nil
					}
					return err
				}
				if err := tx.Model(&circle).Update("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
					return err
				}
				likedByUser = true
			} else {
				return err
			}
		case models.VideoCircleInteractionComment:
			if action != "add" {
				return errors.New("comment action must be add")
			}
			record := models.VideoCircleInteraction{CircleID: circleID, UserID: userID, Type: models.VideoCircleInteractionComment, Value: 1}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
			if err := tx.Model(&circle).Update("comment_count", gorm.Expr("comment_count + 1")).Error; err != nil {
				return err
			}
		case models.VideoCircleInteractionChat:
			if action != "add" {
				return errors.New("chat action must be add")
			}
			record := models.VideoCircleInteraction{CircleID: circleID, UserID: userID, Type: models.VideoCircleInteractionChat, Value: 1}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
			if err := tx.Model(&circle).Update("chat_count", gorm.Expr("chat_count + 1")).Error; err != nil {
				return err
			}
		default:
			return errors.New("unknown interaction type")
		}
		return nil
	}); err != nil {
		return nil, err
	}

	var circle models.VideoCircle

	if err := s.db.First(&circle, circleID).Error; err != nil {
		return nil, err
	}

	log.Printf("circle_interaction circle_id=%d user_id=%d type=%s action=%s", circleID, userID, interactionType, action)
	return &models.VideoCircleInteractionResponse{
		CircleID:     circleID,
		LikeCount:    circle.LikeCount,
		CommentCount: circle.CommentCount,
		ChatCount:    circle.ChatCount,
		LikedByUser:  likedByUser,
	}, nil
}

func (s *VideoCircleService) ApplyBoost(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	var circle models.VideoCircle
	now := time.Now()
	if err := s.db.First(&circle, circleID).Error; err != nil {
		return nil, err
	}
	if circle.Status != models.VideoCircleStatusActive || !circle.ExpiresAt.After(now) {
		return nil, ErrCircleExpired
	}
	isAdmin := strings.EqualFold(role, models.RoleAdmin) || strings.EqualFold(role, models.RoleSuperadmin)
	if circle.AuthorID != userID && !isAdmin {
		return nil, errors.New("forbidden")
	}

	boostType := normalizeVideoBoostType(req.BoostType)
	code := mapBoostTypeToTariffCode(boostType)
	if code == "" {
		return nil, errors.New("invalid boostType")
	}

	var tariff models.VideoTariff
	if err := s.db.Where("code = ? AND is_active = ?", code, true).First(&tariff).Error; err != nil {
		return nil, err
	}

	walletBefore, err := s.wallet.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}
	balanceBefore := walletBefore.Balance
	charged := 0
	bypassReason := ""
	isBypass := user.GodModeEnabled || strings.EqualFold(role, models.RoleSuperadmin)
	if isBypass {
		bypassReason = "god_mode_or_superadmin"
	} else {
		charged = tariff.PriceLkm
		if charged > 0 {
			dedupKey := fmt.Sprintf("video-circle-boost:%d:%d:%s:%d", circleID, userID, boostType, time.Now().UnixNano())
			if spendErr := s.wallet.Spend(userID, charged, dedupKey, fmt.Sprintf("Video circle %s boost", boostType)); spendErr != nil {
				if strings.Contains(strings.ToLower(spendErr.Error()), "insufficient") {
					return nil, ErrInsufficientLKM
				}
				return nil, spendErr
			}
		}
	}

	success := false
	boostApplied := false
	prevExpiresAt := circle.ExpiresAt
	prevPremiumBoost := circle.PremiumBoostActive
	defer func() {
		if !success && charged > 0 {
			_ = s.wallet.Refund(userID, charged, "Video circle boost rollback", nil)
		}
		if !success && boostApplied {
			rollbackUpdates := map[string]interface{}{
				"expires_at":           prevExpiresAt,
				"premium_boost_active": prevPremiumBoost,
			}
			if err := s.db.Model(&models.VideoCircle{}).Where("id = ?", circleID).Updates(rollbackUpdates).Error; err != nil {
				log.Printf("circle_boost rollback_failed circle_id=%d error=%v", circleID, err)
			}
		}
	}()

	startAt := now
	if circle.ExpiresAt.After(now) {
		startAt = circle.ExpiresAt
	}
	newExpires := startAt.Add(time.Duration(tariff.DurationMinutes) * time.Minute)
	updates := map[string]interface{}{
		"expires_at": newExpires,
	}
	if boostType == models.VideoBoostTypePremium {
		updates["premium_boost_active"] = true
	}
	if err := s.db.Model(&circle).Updates(updates).Error; err != nil {
		return nil, err
	}
	boostApplied = true

	walletAfter, err := s.wallet.GetOrCreateWallet(userID)
	if err != nil {
		return nil, err
	}
	balanceAfter := walletAfter.Balance

	billingLog := models.VideoCircleBillingLog{
		CircleID:      circleID,
		UserID:        userID,
		BoostType:     boostType,
		TariffID:      tariff.ID,
		ChargedLkm:    charged,
		BypassReason:  bypassReason,
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
	}
	if err := s.db.Create(&billingLog).Error; err != nil {
		return nil, err
	}

	success = true
	remaining := int(newExpires.Sub(now).Seconds())
	if remaining < 0 {
		remaining = 0
	}

	log.Printf("circle_boost circle_id=%d user_id=%d boost_type=%s charged=%d bypass=%t", circleID, userID, boostType, charged, isBypass)
	return &models.VideoBoostResponse{
		CircleID:           circleID,
		BoostType:          string(boostType),
		ChargedLkm:         charged,
		BypassReason:       bypassReason,
		ExpiresAt:          newExpires,
		RemainingSec:       remaining,
		PremiumBoostActive: boostType == models.VideoBoostTypePremium || circle.PremiumBoostActive,
		BalanceBefore:      balanceBefore,
		BalanceAfter:       balanceAfter,
	}, nil
}

func (s *VideoCircleService) ExpireCirclesBatch(limit int) (int, error) {
	if limit <= 0 {
		limit = 100
	}

	now := time.Now()
	var circles []models.VideoCircle
	if err := s.db.Where("status = ? AND expires_at <= ?", models.VideoCircleStatusActive, now).
		Order("expires_at ASC").
		Limit(limit).
		Find(&circles).Error; err != nil {
		return 0, err
	}

	for _, circle := range circles {
		if err := s.db.Model(&models.VideoCircle{}).
			Where("id = ? AND status = ?", circle.ID, models.VideoCircleStatusActive).
			Update("status", models.VideoCircleStatusExpired).Error; err != nil {
			log.Printf("circle_expire circle_id=%d error=%v", circle.ID, err)
			continue
		}
		go s.CleanupExpiredS3(circle.ID)
	}

	if len(circles) > 0 {
		log.Printf("circle_expire expired_count=%d", len(circles))
	}
	return len(circles), nil
}

func (s *VideoCircleService) CleanupExpiredS3(circleID uint) {
	if s.s3 == nil {
		return
	}
	var circle models.VideoCircle
	if err := s.db.First(&circle, circleID).Error; err != nil {
		log.Printf("circle_s3_cleanup circle_id=%d error=%v", circleID, err)
		return
	}

	keys := make(map[string]struct{})
	for _, raw := range []string{circle.MediaURL, circle.ThumbnailURL} {
		key := normalizeS3Key(s.s3, raw)
		if key != "" {
			keys[key] = struct{}{}
		}
	}

	for key := range keys {
		if err := s.s3.DeleteFile(context.Background(), key); err != nil {
			log.Printf("circle_s3_cleanup circle_id=%d key=%s error=%v", circleID, key, err)
			continue
		}
	}

	log.Printf("circle_s3_cleanup circle_id=%d keys=%d", circleID, len(keys))
}

func StartVideoCircleExpiryScheduler() {
	if GlobalScheduler == nil {
		return
	}
	service := NewVideoCircleService()
	GlobalScheduler.RegisterTask("video_circle_expiry", 1, func() {
		if _, err := service.ExpireCirclesBatch(200); err != nil {
			log.Printf("circle_expire scheduler_error=%v", err)
		}
	})
}

func mapBoostTypeToTariffCode(boostType models.VideoBoostType) models.VideoTariffCode {
	switch boostType {
	case models.VideoBoostTypeLKM:
		return models.VideoTariffCodeLKMBoost
	case models.VideoBoostTypeCity:
		return models.VideoTariffCodeCityBoost
	case models.VideoBoostTypePremium:
		return models.VideoTariffCodePremiumBoost
	default:
		return ""
	}
}

func normalizeVideoTariffCode(code models.VideoTariffCode) models.VideoTariffCode {
	return models.VideoTariffCode(strings.ToLower(strings.TrimSpace(string(code))))
}

func normalizeVideoInteractionType(value models.VideoCircleInteractionType) models.VideoCircleInteractionType {
	switch strings.ToLower(strings.TrimSpace(string(value))) {
	case string(models.VideoCircleInteractionLike):
		return models.VideoCircleInteractionLike
	case string(models.VideoCircleInteractionComment):
		return models.VideoCircleInteractionComment
	case string(models.VideoCircleInteractionChat):
		return models.VideoCircleInteractionChat
	default:
		return ""
	}
}

func normalizeVideoBoostType(value models.VideoBoostType) models.VideoBoostType {
	switch strings.ToLower(strings.TrimSpace(string(value))) {
	case string(models.VideoBoostTypeLKM):
		return models.VideoBoostTypeLKM
	case string(models.VideoBoostTypeCity):
		return models.VideoBoostTypeCity
	case string(models.VideoBoostTypePremium):
		return models.VideoBoostTypePremium
	default:
		return ""
	}
}

func isSupportedTariffCode(code models.VideoTariffCode) bool {
	switch code {
	case models.VideoTariffCodeLKMBoost, models.VideoTariffCodeCityBoost, models.VideoTariffCodePremiumBoost:
		return true
	default:
		return false
	}
}

func normalizeS3Key(s3Service *S3Service, raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		parsed, err := url.Parse(raw)
		if err == nil {
			path := strings.TrimPrefix(parsed.Path, "/")
			if path != "" {
				if extracted := s3Service.ExtractS3Path(raw); extracted != "" && extracted != raw {
					return extracted
				}
				return path
			}
		}
	}

	if extracted := s3Service.ExtractS3Path(raw); extracted != "" && extracted != raw {
		return extracted
	}

	return raw
}
