package services

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// YatraService handles yatra (pilgrimage) and shelter operations
type YatraService struct {
	db         *gorm.DB
	mapService *MapService
}

const (
	defaultYatraMaxParticipants = 20
	defaultYatraMinParticipants = 1
)

var validYatraThemes = map[models.YatraTheme]struct{}{
	models.YatraThemeVrindavan:     {},
	models.YatraThemeMayapur:       {},
	models.YatraThemeJagannathPuri: {},
	models.YatraThemeTirupati:      {},
	models.YatraThemeVaranasi:      {},
	models.YatraThemeHaridwar:      {},
	models.YatraThemeRishikesh:     {},
	models.YatraThemeNavadhama:     {},
	models.YatraThemeCharDham:      {},
	models.YatraThemeOther:         {},
}

// NewYatraService creates a new yatra service instance
func NewYatraService(db *gorm.DB, mapService *MapService) *YatraService {
	return &YatraService{
		db:         db,
		mapService: mapService,
	}
}

func defaultYatraStatusForCreate() models.YatraStatus {
	return models.YatraStatusDraft
}

func normalizeYatraTheme(value string) models.YatraTheme {
	return models.YatraTheme(strings.ToLower(strings.TrimSpace(value)))
}

func isValidYatraTheme(theme models.YatraTheme) bool {
	if theme == "" {
		return true
	}
	_, ok := validYatraThemes[theme]
	return ok
}

func validateYatraParticipantLimits(minParticipants, maxParticipants int) error {
	if minParticipants <= 0 || maxParticipants <= 0 {
		return errors.New("participant limits must be positive")
	}
	if minParticipants > maxParticipants {
		return errors.New("min participants cannot exceed max participants")
	}
	return nil
}

func resolveYatraParticipantLimits(maxParticipants, minParticipants int) (int, int, error) {
	resolvedMax := maxParticipants
	if resolvedMax == 0 {
		resolvedMax = defaultYatraMaxParticipants
	}

	resolvedMin := minParticipants
	if resolvedMin == 0 {
		resolvedMin = defaultYatraMinParticipants
	}

	if err := validateYatraParticipantLimits(resolvedMin, resolvedMax); err != nil {
		return 0, 0, err
	}
	return resolvedMax, resolvedMin, nil
}

func parseYatraDateRange(startDate, endDate string) (time.Time, time.Time, error) {
	startParsed, err := time.Parse("2006-01-02", strings.TrimSpace(startDate))
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid start date format")
	}

	endParsed, err := time.Parse("2006-01-02", strings.TrimSpace(endDate))
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid end date format")
	}

	startParsed = startParsed.UTC()
	endParsed = endParsed.UTC()
	if endParsed.Before(startParsed) {
		return time.Time{}, time.Time{}, errors.New("end date must be after start date")
	}
	return startParsed, endParsed, nil
}

func isFiniteFloat64(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func isValidLatitude(value float64) bool {
	return isFiniteFloat64(value) && value >= -90 && value <= 90
}

func isValidLongitude(value float64) bool {
	return isFiniteFloat64(value) && value >= -180 && value <= 180
}

func validateOptionalCoordinates(startLat, startLng, endLat, endLng *float64) error {
	if startLat != nil && !isValidLatitude(*startLat) {
		return errors.New("invalid start latitude")
	}
	if startLng != nil && !isValidLongitude(*startLng) {
		return errors.New("invalid start longitude")
	}
	if endLat != nil && !isValidLatitude(*endLat) {
		return errors.New("invalid end latitude")
	}
	if endLng != nil && !isValidLongitude(*endLng) {
		return errors.New("invalid end longitude")
	}
	return nil
}

// ==================== YATRA CRUD ====================

// CreateYatra creates a new yatra/tour
func (s *YatraService) CreateYatra(organizerID uint, req models.YatraCreateRequest) (*models.Yatra, error) {
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.StartDate = strings.TrimSpace(req.StartDate)
	req.EndDate = strings.TrimSpace(req.EndDate)
	req.StartCity = strings.TrimSpace(req.StartCity)
	req.StartAddress = strings.TrimSpace(req.StartAddress)
	req.EndCity = strings.TrimSpace(req.EndCity)
	req.Requirements = strings.TrimSpace(req.Requirements)
	req.Accommodation = strings.TrimSpace(req.Accommodation)
	req.Transportation = strings.TrimSpace(req.Transportation)
	req.Language = strings.TrimSpace(req.Language)
	req.CoverImageURL = strings.TrimSpace(req.CoverImageURL)
	req.RoutePoints = strings.TrimSpace(req.RoutePoints)
	req.CostEstimate = strings.TrimSpace(req.CostEstimate)

	theme := normalizeYatraTheme(string(req.Theme))
	if req.Title == "" {
		return nil, errors.New("title is required")
	}
	if !isValidYatraTheme(theme) {
		return nil, errors.New("invalid theme")
	}

	startDate, endDate, err := parseYatraDateRange(req.StartDate, req.EndDate)
	if err != nil {
		return nil, err
	}
	if req.MaxParticipants < 0 || req.MinParticipants < 0 {
		return nil, errors.New("participant limits must be non-negative")
	}
	maxParticipants, minParticipants, err := resolveYatraParticipantLimits(req.MaxParticipants, req.MinParticipants)
	if err != nil {
		return nil, err
	}

	// Geocode start location if needed
	startLat := req.StartLatitude
	startLng := req.StartLongitude
	if s.mapService != nil && (startLat == nil || startLng == nil) && req.StartCity != "" {
		if geocoded, err := s.mapService.GeocodeCity(req.StartCity); err == nil {
			startLat = &geocoded.Latitude
			startLng = &geocoded.Longitude
		}
	}

	// Geocode end location if needed
	endLat := req.EndLatitude
	endLng := req.EndLongitude
	if s.mapService != nil && (endLat == nil || endLng == nil) && req.EndCity != "" {
		if geocoded, err := s.mapService.GeocodeCity(req.EndCity); err == nil {
			endLat = &geocoded.Latitude
			endLng = &geocoded.Longitude
		}
	}
	if err := validateOptionalCoordinates(startLat, startLng, endLat, endLng); err != nil {
		return nil, err
	}

	yatra := &models.Yatra{
		OrganizerID:     organizerID,
		Title:           req.Title,
		Description:     req.Description,
		Theme:           theme,
		StartDate:       startDate,
		EndDate:         endDate,
		StartCity:       req.StartCity,
		StartAddress:    req.StartAddress,
		StartLatitude:   startLat,
		StartLongitude:  startLng,
		EndCity:         req.EndCity,
		EndLatitude:     endLat,
		EndLongitude:    endLng,
		RoutePoints:     req.RoutePoints,
		MaxParticipants: maxParticipants,
		MinParticipants: minParticipants,
		Requirements:    req.Requirements,
		CostEstimate:    req.CostEstimate,
		Accommodation:   req.Accommodation,
		Transportation:  req.Transportation,
		Language:        req.Language,
		CoverImageURL:   req.CoverImageURL,
		Status:          defaultYatraStatusForCreate(),
	}

	if yatra.Language == "" {
		yatra.Language = "en"
	}

	if err := s.db.Create(yatra).Error; err != nil {
		return nil, err
	}

	return yatra, nil
}

// GetYatra retrieves a yatra by ID with organizer info
func (s *YatraService) GetYatra(yatraID uint) (*models.Yatra, error) {
	var yatra models.Yatra
	err := s.db.Preload("Organizer").
		Preload("Participants", "status = ?", models.YatraParticipantApproved).
		Preload("Participants.User").
		First(&yatra, yatraID).Error
	if err != nil {
		return nil, err
	}

	// Increment views
	if err := s.db.Model(&yatra).UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error; err != nil {
		log.Printf("[YatraService] Failed to increment yatra views yatra_id=%d: %v", yatraID, err)
	}

	return &yatra, nil
}

// ListYatras returns a paginated list of yatras
func (s *YatraService) ListYatras(filters models.YatraFilters) ([]models.Yatra, int64, error) {
	filters.City = strings.TrimSpace(filters.City)
	filters.Language = strings.TrimSpace(filters.Language)
	filters.Search = strings.TrimSpace(filters.Search)
	filters.StartAfter = strings.TrimSpace(filters.StartAfter)
	filters.StartBefore = strings.TrimSpace(filters.StartBefore)

	query := s.db.Model(&models.Yatra{})

	// Apply filters
	if filters.Theme != "" {
		query = query.Where("theme = ?", filters.Theme)
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	} else {
		// By default show only open yatras
		query = query.Where("status IN ?", []models.YatraStatus{
			models.YatraStatusOpen,
			models.YatraStatusFull,
		})
	}
	if filters.OrganizerID != nil {
		query = query.Where("organizer_id = ?", *filters.OrganizerID)
	}
	if filters.City != "" {
		query = query.Where("start_city ILIKE ? OR end_city ILIKE ?",
			"%"+filters.City+"%", "%"+filters.City+"%")
	}
	if filters.Language != "" {
		query = query.Where("language = ?", filters.Language)
	}
	if filters.Search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%")
	}
	if filters.StartAfter != "" {
		if date, err := time.Parse("2006-01-02", filters.StartAfter); err == nil {
			query = query.Where("start_date >= ?", date)
		}
	}
	if filters.StartBefore != "" {
		if date, err := time.Parse("2006-01-02", filters.StartBefore); err == nil {
			query = query.Where("start_date <= ?", date)
		}
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var yatras []models.Yatra
	err := query.Preload("Organizer").
		Order("start_date ASC").
		Offset(offset).Limit(limit).
		Find(&yatras).Error

	return yatras, total, err
}

// UpdateYatra updates a yatra
func (s *YatraService) UpdateYatra(yatraID uint, organizerID uint, updates map[string]interface{}) (*models.Yatra, error) {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return nil, err
	}

	// Check ownership
	if yatra.OrganizerID != organizerID {
		return nil, errors.New("not authorized to update this yatra")
	}

	sanitizedUpdates, err := sanitizeYatraUpdates(updates, yatra)
	if err != nil {
		return nil, err
	}
	if len(sanitizedUpdates) == 0 {
		return &yatra, nil
	}

	if err := s.db.Model(&yatra).Updates(sanitizedUpdates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return nil, err
	}

	return &yatra, nil
}

func sanitizeYatraUpdates(raw map[string]interface{}, current models.Yatra) (map[string]interface{}, error) {
	if len(raw) == 0 {
		return map[string]interface{}{}, nil
	}

	aliases := map[string]string{
		"title":            "title",
		"description":      "description",
		"theme":            "theme",
		"startdate":        "start_date",
		"start_date":       "start_date",
		"enddate":          "end_date",
		"end_date":         "end_date",
		"startcity":        "start_city",
		"start_city":       "start_city",
		"startaddress":     "start_address",
		"start_address":    "start_address",
		"startlatitude":    "start_latitude",
		"start_latitude":   "start_latitude",
		"startlongitude":   "start_longitude",
		"start_longitude":  "start_longitude",
		"endcity":          "end_city",
		"end_city":         "end_city",
		"endlatitude":      "end_latitude",
		"end_latitude":     "end_latitude",
		"endlongitude":     "end_longitude",
		"end_longitude":    "end_longitude",
		"routepoints":      "route_points",
		"route_points":     "route_points",
		"maxparticipants":  "max_participants",
		"max_participants": "max_participants",
		"minparticipants":  "min_participants",
		"min_participants": "min_participants",
		"requirements":     "requirements",
		"costestimate":     "cost_estimate",
		"cost_estimate":    "cost_estimate",
		"accommodation":    "accommodation",
		"transportation":   "transportation",
		"language":         "language",
		"coverimageurl":    "cover_image_url",
		"cover_image_url":  "cover_image_url",
		"photos":           "photos",
	}

	sanitized := make(map[string]interface{}, len(raw))

	for key, value := range raw {
		normalizedKey := strings.ToLower(strings.TrimSpace(key))
		column, ok := aliases[normalizedKey]
		if !ok {
			continue
		}

		switch column {
		case "title", "description", "start_city", "start_address", "end_city", "route_points", "requirements", "cost_estimate", "accommodation", "transportation", "language", "cover_image_url", "photos":
			strValue, ok := value.(string)
			if !ok {
				return nil, errors.New("invalid payload")
			}
			strValue = strings.TrimSpace(strValue)
			if column == "title" && strValue == "" {
				return nil, errors.New("title cannot be empty")
			}
			if column == "language" && strValue == "" {
				strValue = "en"
			}
			sanitized[column] = strValue
		case "theme":
			strValue, ok := value.(string)
			if !ok {
				return nil, errors.New("invalid payload")
			}
			theme := normalizeYatraTheme(strValue)
			if !isValidYatraTheme(theme) {
				return nil, errors.New("invalid theme")
			}
			sanitized[column] = theme
		case "start_latitude", "start_longitude", "end_latitude", "end_longitude":
			floatValue, ok := parseFloatFromAny(value)
			if !ok {
				return nil, errors.New("invalid coordinates")
			}
			sanitized[column] = floatValue
		case "max_participants", "min_participants":
			intValue, ok := parseIntFromAny(value)
			if !ok || intValue <= 0 {
				return nil, errors.New("participant limits must be positive")
			}
			sanitized[column] = intValue
		case "start_date", "end_date":
			parsedDate, ok := parseYatraDateFromAny(value)
			if !ok {
				return nil, errors.New("invalid date format")
			}
			sanitized[column] = parsedDate
		default:
			sanitized[column] = value
		}
	}

	startDate := current.StartDate
	if rawStartDate, ok := sanitized["start_date"]; ok {
		startDate = rawStartDate.(time.Time)
	}
	endDate := current.EndDate
	if rawEndDate, ok := sanitized["end_date"]; ok {
		endDate = rawEndDate.(time.Time)
	}
	if endDate.Before(startDate) {
		return nil, errors.New("end date must be after start date")
	}

	maxParticipants := current.MaxParticipants
	if rawMax, ok := sanitized["max_participants"]; ok {
		maxParticipants = rawMax.(int)
	}
	minParticipants := current.MinParticipants
	if rawMin, ok := sanitized["min_participants"]; ok {
		minParticipants = rawMin.(int)
	}
	if err := validateYatraParticipantLimits(minParticipants, maxParticipants); err != nil {
		return nil, err
	}

	startLat := current.StartLatitude
	if rawStartLat, ok := sanitized["start_latitude"]; ok {
		value := rawStartLat.(float64)
		startLat = &value
	}
	startLng := current.StartLongitude
	if rawStartLng, ok := sanitized["start_longitude"]; ok {
		value := rawStartLng.(float64)
		startLng = &value
	}
	endLat := current.EndLatitude
	if rawEndLat, ok := sanitized["end_latitude"]; ok {
		value := rawEndLat.(float64)
		endLat = &value
	}
	endLng := current.EndLongitude
	if rawEndLng, ok := sanitized["end_longitude"]; ok {
		value := rawEndLng.(float64)
		endLng = &value
	}
	if err := validateOptionalCoordinates(startLat, startLng, endLat, endLng); err != nil {
		return nil, err
	}

	return sanitized, nil
}

func parseIntFromAny(value interface{}) (int, bool) {
	switch typed := value.(type) {
	case float64:
		if typed != math.Trunc(typed) {
			return 0, false
		}
		if typed < float64(math.MinInt) || typed > float64(math.MaxInt) {
			return 0, false
		}
		return int(typed), true
	case float32:
		return parseIntFromAny(float64(typed))
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0, false
		}
		parsed, err := strconv.Atoi(trimmed)
		return parsed, err == nil
	case json.Number:
		if parsedInt, err := typed.Int64(); err == nil {
			if parsedInt < int64(math.MinInt) || parsedInt > int64(math.MaxInt) {
				return 0, false
			}
			return int(parsedInt), true
		}
		if parsedFloat, err := typed.Float64(); err == nil {
			return parseIntFromAny(parsedFloat)
		}
		return 0, false
	case int:
		return typed, true
	case int32:
		return int(typed), true
	case int64:
		if typed < int64(math.MinInt) || typed > int64(math.MaxInt) {
			return 0, false
		}
		return int(typed), true
	case uint:
		if typed > uint(math.MaxInt) {
			return 0, false
		}
		return int(typed), true
	case uint32:
		return int(typed), true
	case uint64:
		if typed > uint64(math.MaxInt) {
			return 0, false
		}
		return int(typed), true
	default:
		return 0, false
	}
}

func parseFloatFromAny(value interface{}) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		if !isFiniteFloat64(typed) {
			return 0, false
		}
		return typed, true
	case float32:
		return parseFloatFromAny(float64(typed))
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0, false
		}
		parsed, err := strconv.ParseFloat(trimmed, 64)
		if err != nil || !isFiniteFloat64(parsed) {
			return 0, false
		}
		return parsed, true
	case json.Number:
		parsed, err := typed.Float64()
		if err != nil || !isFiniteFloat64(parsed) {
			return 0, false
		}
		return parsed, true
	case int:
		return float64(typed), true
	case int32:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case uint:
		return float64(typed), true
	case uint32:
		return float64(typed), true
	case uint64:
		return float64(typed), true
	default:
		return 0, false
	}
}

func parseYatraDateFromAny(value interface{}) (time.Time, bool) {
	switch typed := value.(type) {
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return time.Time{}, false
		}
		if parsed, err := time.Parse("2006-01-02", trimmed); err == nil {
			return parsed.UTC(), true
		}
		parsed, err := time.Parse(time.RFC3339, trimmed)
		if err != nil {
			return time.Time{}, false
		}
		return parsed.UTC(), true
	case time.Time:
		return typed.UTC(), true
	default:
		return time.Time{}, false
	}
}

func isRatingInRange(value, min, max int) bool {
	return value >= min && value <= max
}

func validateYatraReviewRequest(req models.YatraReviewCreateRequest) error {
	if !isRatingInRange(req.OverallRating, 1, 5) {
		return errors.New("invalid overall rating")
	}

	optionalRatings := []int{
		req.OrganizerRating,
		req.RouteRating,
		req.AccommodationRating,
		req.ValueRating,
	}
	for _, rating := range optionalRatings {
		if rating != 0 && !isRatingInRange(rating, 1, 5) {
			return errors.New("invalid rating value")
		}
	}
	return nil
}

// PublishYatra changes status from draft to open
func (s *YatraService) PublishYatra(yatraID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized")
	}

	if yatra.Status != models.YatraStatusDraft {
		return errors.New("yatra is not in draft status")
	}

	return s.db.Model(&yatra).Update("status", models.YatraStatusOpen).Error
}

// DeleteYatra soft deletes a yatra
func (s *YatraService) DeleteYatra(yatraID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized to delete this yatra")
	}

	return s.db.Delete(&yatra).Error
}

// ==================== PARTICIPANTS ====================

// JoinYatra creates a join request for a yatra
func (s *YatraService) JoinYatra(yatraID uint, userID uint, req models.YatraJoinRequest) (*models.YatraParticipant, error) {
	var participant models.YatraParticipant
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		// Check if yatra is open
		if yatra.Status != models.YatraStatusOpen {
			return errors.New("yatra is not accepting participants")
		}

		// Check if already a participant
		var existing models.YatraParticipant
		if err := tx.Where("yatra_id = ? AND user_id = ?", yatraID, userID).First(&existing).Error; err == nil {
			return errors.New("already applied to this yatra")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		// Check if user is the organizer
		if yatra.OrganizerID == userID {
			return errors.New("organizer cannot join their own yatra")
		}

		var approvedCount int64
		if err := tx.Model(&models.YatraParticipant{}).
			Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
			Count(&approvedCount).Error; err != nil {
			return err
		}
		if int(approvedCount) >= yatra.MaxParticipants {
			if err := tx.Model(&models.Yatra{}).Where("id = ? AND status = ?", yatraID, models.YatraStatusOpen).
				Update("status", models.YatraStatusFull).Error; err != nil {
				return err
			}
			return errors.New("yatra is full")
		}

		participant = models.YatraParticipant{
			YatraID:          yatraID,
			UserID:           userID,
			Status:           models.YatraParticipantPending,
			Role:             models.YatraRoleMember,
			Message:          strings.TrimSpace(req.Message),
			EmergencyContact: strings.TrimSpace(req.EmergencyContact),
		}

		return tx.Create(&participant).Error
	})
	if err != nil {
		return nil, err
	}

	return &participant, nil
}

// ApproveParticipant approves a participant request
func (s *YatraService) ApproveParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var approvedUserID uint
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		if yatra.OrganizerID != organizerID {
			return errors.New("not authorized")
		}

		var participant models.YatraParticipant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&participant, participantID).Error; err != nil {
			return err
		}

		if participant.YatraID != yatraID {
			return errors.New("participant does not belong to this yatra")
		}
		if participant.Status == models.YatraParticipantApproved {
			approvedUserID = participant.UserID
			return nil
		}

		var approvedCount int64
		if err := tx.Model(&models.YatraParticipant{}).
			Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
			Count(&approvedCount).Error; err != nil {
			return err
		}
		if int(approvedCount) >= yatra.MaxParticipants {
			if err := tx.Model(&models.Yatra{}).Where("id = ? AND status = ?", yatraID, models.YatraStatusOpen).
				Update("status", models.YatraStatusFull).Error; err != nil {
				return err
			}
			return errors.New("yatra is full")
		}

		now := time.Now().UTC()
		if err := tx.Model(&participant).Updates(map[string]interface{}{
			"status":      models.YatraParticipantApproved,
			"reviewed_at": now,
			"reviewed_by": organizerID,
		}).Error; err != nil {
			return err
		}
		approvedUserID = participant.UserID
		return nil
	})
	if err != nil {
		return err
	}

	// Update participant count
	s.updateParticipantCount(yatraID)

	// Create or add to chat room
	if approvedUserID != 0 {
		s.addParticipantToChat(yatraID, approvedUserID)
	}

	return nil
}

// RejectParticipant rejects a participant request
func (s *YatraService) RejectParticipant(yatraID uint, participantID uint, organizerID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		if yatra.OrganizerID != organizerID {
			return errors.New("not authorized")
		}

		var participant models.YatraParticipant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&participant, participantID).Error; err != nil {
			return err
		}
		if participant.YatraID != yatraID {
			return errors.New("participant does not belong to this yatra")
		}
		if participant.Status == models.YatraParticipantRejected {
			return nil
		}
		if participant.Status != models.YatraParticipantPending {
			return errors.New("only pending participants can be rejected")
		}

		now := time.Now().UTC()
		return tx.Model(&participant).Updates(map[string]interface{}{
			"status":      models.YatraParticipantRejected,
			"reviewed_at": now,
			"reviewed_by": organizerID,
		}).Error
	})
}

// RemoveParticipant removes a participant from the yatra
func (s *YatraService) RemoveParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized")
	}

	var participant models.YatraParticipant
	if err := s.db.First(&participant, participantID).Error; err != nil {
		return err
	}
	if participant.YatraID != yatraID {
		return errors.New("participant does not belong to this yatra")
	}

	// Delete from yatra participants
	if err := s.db.Delete(&participant).Error; err != nil {
		return err
	}

	// Remove from chat room
	if yatra.ChatRoomID != nil {
		if err := s.db.Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, participant.UserID).
			Delete(&models.RoomMember{}).Error; err != nil {
			log.Printf("[YatraService] Failed to remove participant from chat yatra_id=%d room_id=%d user_id=%d: %v", yatraID, *yatra.ChatRoomID, participant.UserID, err)
		}
	}

	s.updateParticipantCount(yatraID)
	return nil
}

// GetPendingParticipants returns pending join requests
func (s *YatraService) GetPendingParticipants(yatraID uint) ([]models.YatraParticipant, error) {
	var participants []models.YatraParticipant
	err := s.db.Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantPending).
		Preload("User").
		Order("created_at ASC").
		Find(&participants).Error
	return participants, err
}

// GetMyYatras returns yatras where user is organizer or participant
func (s *YatraService) GetMyYatras(userID uint) (organized []models.Yatra, participating []models.Yatra, err error) {
	// Organized yatras
	err = s.db.Where("organizer_id = ?", userID).
		Order("start_date DESC").
		Find(&organized).Error
	if err != nil {
		return
	}

	// Participating yatras
	var participantRecords []models.YatraParticipant
	err = s.db.Where("user_id = ? AND status = ?", userID, models.YatraParticipantApproved).
		Find(&participantRecords).Error
	if err != nil {
		return
	}

	if len(participantRecords) > 0 {
		var yatraIDs []uint
		for _, p := range participantRecords {
			yatraIDs = append(yatraIDs, p.YatraID)
		}
		err = s.db.Where("id IN ?", yatraIDs).
			Order("start_date DESC").
			Find(&participating).Error
	}

	return
}

// ==================== HELPERS ====================

func (s *YatraService) updateParticipantCount(yatraID uint) {
	var count int64
	if err := s.db.Model(&models.YatraParticipant{}).
		Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
		Count(&count).Error; err != nil {
		log.Printf("[YatraService] Failed to count participants yatra_id=%d: %v", yatraID, err)
		return
	}

	if err := s.db.Model(&models.Yatra{}).Where("id = ?", yatraID).
		Update("participant_count", count).Error; err != nil {
		log.Printf("[YatraService] Failed to update participant count yatra_id=%d: %v", yatraID, err)
		return
	}

	// Keep status in sync with capacity.
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err == nil {
		if int(count) >= yatra.MaxParticipants && yatra.Status == models.YatraStatusOpen {
			if err := s.db.Model(&yatra).Update("status", models.YatraStatusFull).Error; err != nil {
				log.Printf("[YatraService] Failed to mark yatra full yatra_id=%d: %v", yatraID, err)
			}
		} else if int(count) < yatra.MaxParticipants && yatra.Status == models.YatraStatusFull {
			if err := s.db.Model(&yatra).Update("status", models.YatraStatusOpen).Error; err != nil {
				log.Printf("[YatraService] Failed to reopen yatra yatra_id=%d: %v", yatraID, err)
			}
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("[YatraService] Failed to load yatra for status sync yatra_id=%d: %v", yatraID, err)
	}
}

func (s *YatraService) addParticipantToChat(yatraID uint, userID uint) {
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		// Create chat room once under lock.
		if yatra.ChatRoomID == nil {
			room := &models.Room{
				Name:        yatra.Title + " - Group Chat",
				Description: "Group chat for " + yatra.Title,
				OwnerID:     yatra.OrganizerID,
				IsPublic:    false,
				YatraID:     &yatraID, // Link room to yatra for proper UI handling
			}
			if err := tx.Create(room).Error; err != nil {
				return err
			}

			if err := tx.Model(&yatra).Update("chat_room_id", room.ID).Error; err != nil {
				return err
			}
			yatra.ChatRoomID = &room.ID

			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.RoomMember{
				RoomID: room.ID,
				UserID: yatra.OrganizerID,
				Role:   "admin",
			}).Error; err != nil {
				return err
			}
		}

		if yatra.ChatRoomID == nil {
			return errors.New("chat room id is missing")
		}

		return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.RoomMember{
			RoomID: *yatra.ChatRoomID,
			UserID: userID,
			Role:   "member",
		}).Error
	}); err != nil {
		log.Printf("[YatraService] Failed to add participant to chat yatra_id=%d user_id=%d: %v", yatraID, userID, err)
	}
}

// GetYatraMarkers returns yatra markers for map display
func (s *YatraService) GetYatraMarkers(bbox models.MapBoundingBox, limit int) ([]models.MapMarker, int) {
	var yatras []models.Yatra
	query := s.db.Model(&models.Yatra{}).
		Where("status IN ?", []models.YatraStatus{models.YatraStatusOpen, models.YatraStatusFull}).
		Where("start_latitude IS NOT NULL AND start_longitude IS NOT NULL").
		Where("start_latitude >= ? AND start_latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("start_longitude >= ? AND start_longitude <= ?", bbox.LngMin, bbox.LngMax)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Printf("[YatraService] Error counting yatra markers: %v", err)
		return nil, 0
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&yatras).Error; err != nil {
		log.Printf("[YatraService] Error getting yatra markers: %v", err)
		return nil, 0
	}

	markers := make([]models.MapMarker, len(yatras))
	for i, yatra := range yatras {
		markers[i] = models.MapMarker{
			ID:        yatra.ID,
			Type:      "yatra",
			Title:     yatra.Title,
			Subtitle:  yatra.StartCity + " → " + yatra.EndCity,
			Latitude:  *yatra.StartLatitude,
			Longitude: *yatra.StartLongitude,
			AvatarURL: yatra.CoverImageURL,
			Category:  string(yatra.Theme),
			Status:    string(yatra.Status),
		}
	}

	truncated := 0
	if int(total) > len(markers) {
		truncated = int(total) - len(markers)
	}

	return markers, truncated
}

// ==================== YATRA REVIEWS ====================

// GetYatraReviews returns reviews for a yatra with pagination
func (s *YatraService) GetYatraReviews(yatraID uint, page, limit int) ([]models.YatraReview, int64, float64, error) {
	var reviews []models.YatraReview
	var total int64

	query := s.db.Model(&models.YatraReview{}).Where("yatra_id = ?", yatraID)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, 0, err
	}

	// Calculate average rating
	var avgResult struct {
		Avg float64
	}
	if err := s.db.Model(&models.YatraReview{}).
		Where("yatra_id = ?", yatraID).
		Select("COALESCE(AVG(overall_rating), 0) as avg").
		Scan(&avgResult).Error; err != nil {
		return nil, 0, 0, err
	}

	// Pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Fetch reviews with author
	err := s.db.Where("yatra_id = ?", yatraID).
		Preload("Author").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&reviews).Error

	return reviews, total, avgResult.Avg, err
}

// CreateYatraReview creates a review for a completed yatra
func (s *YatraService) CreateYatraReview(yatraID uint, authorID uint, req models.YatraReviewCreateRequest) (*models.YatraReview, error) {
	if err := validateYatraReviewRequest(req); err != nil {
		return nil, err
	}

	// Check if yatra exists and is completed
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, errors.New("yatra not found")
	}

	if yatra.Status != models.YatraStatusCompleted {
		return nil, errors.New("can only review completed yatras")
	}

	// Check if user was a participant
	var participant models.YatraParticipant
	err := s.db.Where("yatra_id = ? AND user_id = ? AND status = ?",
		yatraID, authorID, models.YatraParticipantApproved).First(&participant).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, errors.New("only participants can review this yatra")
	}

	// Check if already reviewed
	var existing models.YatraReview
	if err := s.db.Where("yatra_id = ? AND author_id = ?", yatraID, authorID).First(&existing).Error; err == nil {
		return nil, errors.New("you have already reviewed this yatra")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Set default recommendation
	recommendation := true
	if req.Recommendation != nil {
		recommendation = *req.Recommendation
	}

	review := &models.YatraReview{
		YatraID:             yatraID,
		AuthorID:            authorID,
		OverallRating:       req.OverallRating,
		OrganizerRating:     req.OrganizerRating,
		RouteRating:         req.RouteRating,
		AccommodationRating: req.AccommodationRating,
		ValueRating:         req.ValueRating,
		Comment:             strings.TrimSpace(req.Comment),
		Photos:              req.Photos,
		Recommendation:      recommendation,
	}

	if err := s.db.Create(review).Error; err != nil {
		return nil, err
	}

	// Load author for response
	if err := s.db.Preload("Author").First(review, review.ID).Error; err != nil {
		return nil, err
	}

	return review, nil
}

// GetOrganizerStats returns statistics for an organizer
func (s *YatraService) GetOrganizerStats(userID uint) (*models.OrganizerStats, error) {
	stats := &models.OrganizerStats{}

	// Count organized yatras (completed)
	var organizedCompleted int64
	if err := s.db.Model(&models.Yatra{}).
		Where("organizer_id = ? AND status = ?", userID, models.YatraStatusCompleted).
		Count(&organizedCompleted).Error; err != nil {
		return nil, err
	}
	stats.OrganizedCount = int(organizedCompleted)

	// If no organized yatras, also count open/full ones
	if stats.OrganizedCount == 0 {
		var totalCount int64
		if err := s.db.Model(&models.Yatra{}).
			Where("organizer_id = ?", userID).
			Count(&totalCount).Error; err != nil {
			return nil, err
		}
		stats.OrganizedCount = int(totalCount)
	}

	// Get average rating from reviews of user's yatras
	var avgResult struct {
		Avg float64
	}
	if err := s.db.Model(&models.YatraReview{}).
		Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
		Where("yatras.organizer_id = ?", userID).
		Select("COALESCE(AVG(yatra_reviews.organizer_rating), 0) as avg").
		Scan(&avgResult).Error; err != nil {
		return nil, err
	}
	stats.AverageRating = avgResult.Avg

	// If no organizer ratings, use overall ratings
	if stats.AverageRating == 0 {
		if err := s.db.Model(&models.YatraReview{}).
			Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
			Where("yatras.organizer_id = ?", userID).
			Select("COALESCE(AVG(yatra_reviews.overall_rating), 0) as avg").
			Scan(&avgResult).Error; err != nil {
			return nil, err
		}
		stats.AverageRating = avgResult.Avg
	}

	// Count total participants across all organized yatras
	var participantCount int64
	if err := s.db.Model(&models.YatraParticipant{}).
		Joins("JOIN yatras ON yatras.id = yatra_participants.yatra_id").
		Where("yatras.organizer_id = ? AND yatra_participants.status = ?",
			userID, models.YatraParticipantApproved).
		Count(&participantCount).Error; err != nil {
		return nil, err
	}
	stats.TotalParticipants = int(participantCount)

	// Count recommendations
	var recommendCount int64
	if err := s.db.Model(&models.YatraReview{}).
		Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
		Where("yatras.organizer_id = ? AND yatra_reviews.recommendation = ?", userID, true).
		Count(&recommendCount).Error; err != nil {
		return nil, err
	}
	stats.Recommendations = int(recommendCount)

	return stats, nil
}

// GetUserParticipation returns user's participation record for a yatra
func (s *YatraService) GetUserParticipation(yatraID uint, userID uint) (*models.YatraParticipant, error) {
	var participant models.YatraParticipant
	// Use silent logger to avoid "record not found" spam
	err := s.db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).
		Where("yatra_id = ? AND user_id = ?", yatraID, userID).
		Preload("User").
		First(&participant).Error
	if err != nil {
		return nil, err
	}
	return &participant, nil
}
