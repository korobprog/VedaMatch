package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"hash/crc32"
	"log"
	"math"
	"rag-agent-server/internal/database"
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
	push       *PushNotificationService
	wallet     *WalletService
}

const (
	defaultYatraMaxParticipants = 20
	defaultYatraMinParticipants = 1
	defaultYatraDailyFeeLkm     = 10

	yatraBillingEnabledSettingKey = "YATRA_BILLING_ENABLED"
	yatraDailyFeeSettingKey       = "YATRA_DAILY_FEE_LKM"
)

var (
	ErrYatraBillingConsentRequired = errors.New("billing consent required")
	ErrYatraInsufficientLKM        = errors.New("insufficient lkm")
	ErrYatraBillingPaused          = errors.New("yatra billing paused")
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
		push:       GetPushService(),
		wallet:     NewWalletService(),
	}
}

type YatraBroadcastTarget string

const (
	YatraBroadcastTargetApproved YatraBroadcastTarget = "approved"
	YatraBroadcastTargetPending  YatraBroadcastTarget = "pending"
	YatraBroadcastTargetAll      YatraBroadcastTarget = "all"
)

type YatraBroadcastRequest struct {
	Title  string
	Body   string
	Target YatraBroadcastTarget
}

type YatraChatAccess struct {
	ChatRoomID *uint  `json:"chatRoomId"`
	CanAccess  bool   `json:"canAccess"`
	Reason     string `json:"reason,omitempty"`
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
	if (startLat == nil) != (startLng == nil) {
		return errors.New("start coordinates must include both latitude and longitude")
	}
	if (endLat == nil) != (endLng == nil) {
		return errors.New("end coordinates must include both latitude and longitude")
	}

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

type yatraBillingConfig struct {
	Enabled     bool
	DailyFeeLkm int
}

func parseSystemSettingBool(value string, fallback bool) bool {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return fallback
	}
	switch trimmed {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func parseSystemSettingPositiveInt(value string, fallback int) int {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(trimmed)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func (s *YatraService) getSystemSettingValueTx(tx *gorm.DB, key string) string {
	if tx == nil {
		return ""
	}
	var setting models.SystemSetting
	if err := tx.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).
		Select("value").
		Where("key = ?", key).
		First(&setting).Error; err != nil {
		return ""
	}
	return strings.TrimSpace(setting.Value)
}

func (s *YatraService) loadYatraBillingConfigTx(tx *gorm.DB) yatraBillingConfig {
	cfg := yatraBillingConfig{
		Enabled:     false,
		DailyFeeLkm: defaultYatraDailyFeeLkm,
	}
	if tx == nil {
		return cfg
	}
	cfg.Enabled = parseSystemSettingBool(s.getSystemSettingValueTx(tx, yatraBillingEnabledSettingKey), false)
	cfg.DailyFeeLkm = parseSystemSettingPositiveInt(s.getSystemSettingValueTx(tx, yatraDailyFeeSettingKey), defaultYatraDailyFeeLkm)
	return cfg
}

func (s *YatraService) loadYatraBillingConfig() yatraBillingConfig {
	return s.loadYatraBillingConfigTx(s.db)
}

func normalizeYatraBillingState(state models.YatraBillingState) models.YatraBillingState {
	switch state {
	case models.YatraBillingStateActive, models.YatraBillingStatePausedInsufficient, models.YatraBillingStateStopped:
		return state
	default:
		return models.YatraBillingStateActive
	}
}

func normalizeYatraBillingPauseReason(reason models.YatraBillingPauseReason) models.YatraBillingPauseReason {
	switch reason {
	case models.YatraBillingPauseReasonNone, models.YatraBillingPauseReasonInsufficientLKM, models.YatraBillingPauseReasonOrganizerStopped:
		return reason
	default:
		return models.YatraBillingPauseReasonNone
	}
}

func applyYatraBillingPresentation(yatra *models.Yatra, dailyFee int) {
	if yatra == nil {
		return
	}
	yatra.BillingState = normalizeYatraBillingState(yatra.BillingState)
	yatra.BillingPauseReason = normalizeYatraBillingPauseReason(yatra.BillingPauseReason)
	if yatra.BillingPaused && yatra.BillingPauseReason == models.YatraBillingPauseReasonNone {
		yatra.BillingPauseReason = models.YatraBillingPauseReasonInsufficientLKM
	}
	yatra.DailyFeeLkm = dailyFee
}

func applyYatraBillingPresentationSlice(yatras []models.Yatra, dailyFee int) {
	for idx := range yatras {
		applyYatraBillingPresentation(&yatras[idx], dailyFee)
	}
}

func yatraNextUTCMidnight(now time.Time) time.Time {
	utcNow := now.UTC()
	startOfDay := time.Date(utcNow.Year(), utcNow.Month(), utcNow.Day(), 0, 0, 0, 0, time.UTC)
	return startOfDay.Add(24 * time.Hour)
}

func yatraChargeDateUTC(value time.Time) time.Time {
	utc := value.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
}

func yatraWalletDedupKey(yatraID uint, chargeDate time.Time) string {
	return fmt.Sprintf("yatra_daily_fee:yatra:%d:date:%s", yatraID, chargeDate.UTC().Format("2006-01-02"))
}

func yatraBillingEventDedupKey(status models.YatraBillingEventStatus, yatraID uint, chargeDate time.Time) string {
	return fmt.Sprintf("yatra_billing:%s:yatra:%d:date:%s", status, yatraID, chargeDate.UTC().Format("2006-01-02"))
}

func isInsufficientBalanceError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(strings.ToLower(err.Error()), "insufficient")
}

func isYatraBillingUsagePaused(yatra models.Yatra) bool {
	return yatra.BillingPaused &&
		normalizeYatraBillingPauseReason(yatra.BillingPauseReason) == models.YatraBillingPauseReasonInsufficientLKM &&
		normalizeYatraBillingState(yatra.BillingState) == models.YatraBillingStatePausedInsufficient
}

func ensureYatraBillingUsageAllowed(yatra models.Yatra) error {
	if isYatraBillingUsagePaused(yatra) {
		return ErrYatraBillingPaused
	}
	return nil
}

func (s *YatraService) appendYatraBillingEventTx(
	tx *gorm.DB,
	yatra models.Yatra,
	chargeDate time.Time,
	amount int,
	status models.YatraBillingEventStatus,
	reason string,
) error {
	if tx == nil {
		return nil
	}
	event := models.YatraBillingEvent{
		YatraID:       yatra.ID,
		OrganizerID:   yatra.OrganizerID,
		ChargeDateUTC: yatraChargeDateUTC(chargeDate),
		AmountLkm:     amount,
		Status:        status,
		DedupKey:      yatraBillingEventDedupKey(status, yatra.ID, chargeDate),
		Reason:        strings.TrimSpace(reason),
	}
	return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&event).Error
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
	applyYatraBillingPresentation(yatra, s.loadYatraBillingConfig().DailyFeeLkm)

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
	applyYatraBillingPresentation(&yatra, s.loadYatraBillingConfig().DailyFeeLkm)

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
	offset := calculateYatraPaginationOffset(page, limit)

	var yatras []models.Yatra
	err := query.Preload("Organizer").
		Order("start_date ASC").
		Offset(offset).Limit(limit).
		Find(&yatras).Error
	if err == nil {
		applyYatraBillingPresentationSlice(yatras, s.loadYatraBillingConfig().DailyFeeLkm)
	}

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
	applyYatraBillingPresentation(&yatra, s.loadYatraBillingConfig().DailyFeeLkm)

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
		if typed.IsZero() {
			return time.Time{}, false
		}
		return typed.UTC(), true
	default:
		return time.Time{}, false
	}
}

func calculateYatraMarkerTruncated(total int64, returned int) int {
	if total <= int64(returned) {
		return 0
	}

	diff := total - int64(returned)
	maxInt := int64(^uint(0) >> 1)
	if diff > maxInt {
		return int(maxInt)
	}
	return int(diff)
}

func clampYatraInt64ToInt(value int64) int {
	maxInt := int64(^uint(0) >> 1)
	if value > maxInt {
		return int(maxInt)
	}
	if value < -maxInt-1 {
		return -int(maxInt) - 1
	}
	return int(value)
}

func calculateYatraPaginationOffset(page, limit int) int {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		return 0
	}

	pageIndex := int64(page - 1)
	limit64 := int64(limit)
	maxInt := int64(^uint(0) >> 1)
	if pageIndex > 0 && pageIndex > maxInt/limit64 {
		return int(maxInt)
	}
	return int(pageIndex * limit64)
}

func isYatraAtCapacity(approvedCount int64, maxParticipants int) bool {
	if maxParticipants <= 0 {
		return true
	}
	return approvedCount >= int64(maxParticipants)
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

// PublishYatra changes status from draft to open and starts daily billing when enabled.
func (s *YatraService) PublishYatra(yatraID uint, organizerID uint, req models.YatraPublishRequest) error {
	if s.wallet == nil {
		s.wallet = NewWalletService()
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		if yatra.OrganizerID != organizerID {
			return errors.New("not authorized")
		}
		if yatra.Status != models.YatraStatusDraft {
			return errors.New("yatra is not in draft status")
		}

		now := time.Now().UTC()
		cfg := s.loadYatraBillingConfigTx(tx)
		updates := map[string]interface{}{
			"status":               models.YatraStatusOpen,
			"billing_state":        models.YatraBillingStateActive,
			"billing_paused":       false,
			"billing_pause_reason": models.YatraBillingPauseReasonNone,
			"billing_stopped_at":   nil,
		}

		if cfg.Enabled {
			if !req.BillingConsent {
				return ErrYatraBillingConsentRequired
			}
			chargeDate := yatraChargeDateUTC(now)
			dedupKey := yatraWalletDedupKey(yatra.ID, chargeDate)
			description := fmt.Sprintf("Yatra daily fee #%d (%s)", yatra.ID, chargeDate.Format("2006-01-02"))
			if _, _, err := s.wallet.spendTxWithOptions(tx, organizerID, cfg.DailyFeeLkm, dedupKey, description, SpendOptions{
				AllowBonus: false,
			}); err != nil {
				if isInsufficientBalanceError(err) {
					return ErrYatraInsufficientLKM
				}
				return err
			}

			updates["billing_consent_at"] = now
			updates["billing_last_charged_at"] = now
			updates["billing_next_charge_at"] = yatraNextUTCMidnight(now)
			if err := s.appendYatraBillingEventTx(tx, yatra, chargeDate, cfg.DailyFeeLkm, models.YatraBillingEventCharged, "publish"); err != nil {
				return err
			}
		} else {
			updates["billing_next_charge_at"] = gorm.Expr("NULL")
			updates["billing_last_charged_at"] = gorm.Expr("NULL")
			if req.BillingConsent {
				updates["billing_consent_at"] = now
			}
		}

		return tx.Model(&yatra).Updates(updates).Error
	})
}

// StopYatra cancels a yatra and permanently stops daily billing for it.
func (s *YatraService) StopYatra(yatraID uint, actorID uint, actorRole string) error {
	var yatra models.Yatra
	approvedUserIDs := make([]uint, 0)
	isAdmin := models.IsAdminRole(strings.TrimSpace(strings.ToLower(actorRole)))

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}
		if yatra.OrganizerID != actorID && !isAdmin {
			return errors.New("not authorized")
		}
		if yatra.Status == models.YatraStatusCompleted {
			return errors.New("completed yatra cannot be stopped")
		}
		if yatra.Status == models.YatraStatusCancelled && normalizeYatraBillingState(yatra.BillingState) == models.YatraBillingStateStopped {
			return nil
		}

		now := time.Now().UTC()
		if err := tx.Model(&yatra).Updates(map[string]interface{}{
			"status":               models.YatraStatusCancelled,
			"billing_state":        models.YatraBillingStateStopped,
			"billing_paused":       true,
			"billing_pause_reason": models.YatraBillingPauseReasonOrganizerStopped,
			"billing_stopped_at":   now,
		}).Error; err != nil {
			return err
		}
		if err := tx.Exec("UPDATE yatras SET billing_next_charge_at = NULL WHERE id = ?", yatra.ID).Error; err != nil {
			return err
		}

		if err := s.appendYatraBillingEventTx(tx, yatra, now, 0, models.YatraBillingEventSkippedStopped, "organizer_stopped"); err != nil {
			return err
		}

		return tx.Model(&models.YatraParticipant{}).
			Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
			Distinct("user_id").
			Pluck("user_id", &approvedUserIDs).Error
	})
	if err != nil {
		return err
	}

	s.notifyYatraCancelled(yatra, actorID, approvedUserIDs)
	return nil
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
	var organizerID uint
	var yatraTitle string
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}
		organizerID = yatra.OrganizerID
		yatraTitle = strings.TrimSpace(yatra.Title)
		if err := ensureYatraBillingUsageAllowed(yatra); err != nil {
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
		if isYatraAtCapacity(approvedCount, yatra.MaxParticipants) {
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
	s.notifyYatraJoinRequested(yatraID, organizerID, userID, participant.ID, yatraTitle)

	return &participant, nil
}

// ApproveParticipant approves a participant request
func (s *YatraService) ApproveParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var approvedUserID uint
	var yatraTitle string
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}
		yatraTitle = strings.TrimSpace(yatra.Title)

		if yatra.OrganizerID != organizerID {
			return errors.New("not authorized")
		}
		if err := ensureYatraBillingUsageAllowed(yatra); err != nil {
			return err
		}
		if yatra.Status != models.YatraStatusOpen && yatra.Status != models.YatraStatusFull {
			return errors.New("yatra is not accepting participant moderation")
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
		if isYatraAtCapacity(approvedCount, yatra.MaxParticipants) {
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
		var yatra models.Yatra
		if err := s.db.First(&yatra, yatraID).Error; err == nil {
			s.notifyYatraJoinApproved(yatra, organizerID, approvedUserID, participantID, yatraTitle)
		} else {
			log.Printf("[YatraService] Failed to load yatra for approval push yatra_id=%d participant_id=%d: %v", yatraID, participantID, err)
		}
	}

	return nil
}

// RejectParticipant rejects a participant request
func (s *YatraService) RejectParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var rejectedUserID uint
	var yatraTitle string
	var updated bool
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}
		yatraTitle = strings.TrimSpace(yatra.Title)

		if yatra.OrganizerID != organizerID {
			return errors.New("not authorized")
		}
		if err := ensureYatraBillingUsageAllowed(yatra); err != nil {
			return err
		}
		if yatra.Status != models.YatraStatusOpen && yatra.Status != models.YatraStatusFull {
			return errors.New("yatra is not accepting participant moderation")
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
		rejectedUserID = participant.UserID

		now := time.Now().UTC()
		if err := tx.Model(&participant).Updates(map[string]interface{}{
			"status":      models.YatraParticipantRejected,
			"reviewed_at": now,
			"reviewed_by": organizerID,
		}).Error; err != nil {
			return err
		}
		updated = true
		return nil
	})
	if err != nil {
		return err
	}
	if updated && rejectedUserID != 0 {
		s.notifyYatraJoinRejected(yatraID, organizerID, rejectedUserID, participantID, yatraTitle)
	}
	return nil
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
		if err := s.db.Unscoped().
			Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, participant.UserID).
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
	fee := s.loadYatraBillingConfig().DailyFeeLkm
	applyYatraBillingPresentationSlice(organized, fee)
	applyYatraBillingPresentationSlice(participating, fee)

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
		if isYatraAtCapacity(count, yatra.MaxParticipants) && yatra.Status == models.YatraStatusOpen {
			if err := s.db.Model(&yatra).Update("status", models.YatraStatusFull).Error; err != nil {
				log.Printf("[YatraService] Failed to mark yatra full yatra_id=%d: %v", yatraID, err)
			}
		} else if !isYatraAtCapacity(count, yatra.MaxParticipants) && yatra.Status == models.YatraStatusFull {
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
				Role:   models.RoomRoleOwner,
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
			Role:   models.RoomRoleMember,
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
	truncated = calculateYatraMarkerTruncated(total, len(markers))

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
	offset := calculateYatraPaginationOffset(page, limit)

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
	stats.OrganizedCount = clampYatraInt64ToInt(organizedCompleted)

	// If no organized yatras, also count open/full ones
	if stats.OrganizedCount == 0 {
		var totalCount int64
		if err := s.db.Model(&models.Yatra{}).
			Where("organizer_id = ?", userID).
			Count(&totalCount).Error; err != nil {
			return nil, err
		}
		stats.OrganizedCount = clampYatraInt64ToInt(totalCount)
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
	stats.TotalParticipants = clampYatraInt64ToInt(participantCount)

	// Count recommendations
	var recommendCount int64
	if err := s.db.Model(&models.YatraReview{}).
		Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
		Where("yatras.organizer_id = ? AND yatra_reviews.recommendation = ?", userID, true).
		Count(&recommendCount).Error; err != nil {
		return nil, err
	}
	stats.Recommendations = clampYatraInt64ToInt(recommendCount)

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

func normalizeYatraBroadcastTarget(target YatraBroadcastTarget) YatraBroadcastTarget {
	switch strings.ToLower(strings.TrimSpace(string(target))) {
	case string(YatraBroadcastTargetPending):
		return YatraBroadcastTargetPending
	case string(YatraBroadcastTargetAll):
		return YatraBroadcastTargetAll
	default:
		return YatraBroadcastTargetApproved
	}
}

func (s *YatraService) GetYatraChatAccess(yatraID uint, userID uint, userRole string) (*YatraChatAccess, error) {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return nil, err
	}
	applyYatraBillingPresentation(&yatra, s.loadYatraBillingConfig().DailyFeeLkm)

	access := &YatraChatAccess{
		ChatRoomID: yatra.ChatRoomID,
		CanAccess:  false,
	}
	if yatra.ChatRoomID == nil {
		access.Reason = "chat_not_ready"
		return access, nil
	}

	isAdmin := models.IsAdminRole(strings.TrimSpace(strings.ToLower(userRole)))
	if isYatraBillingUsagePaused(yatra) && !isAdmin {
		access.Reason = "billing_paused"
		return access, nil
	}
	if yatra.OrganizerID == userID || isAdmin {
		access.CanAccess = true
		return access, nil
	}

	var participant models.YatraParticipant
	err := s.db.Where("yatra_id = ? AND user_id = ? AND status = ?", yatraID, userID, models.YatraParticipantApproved).
		First(&participant).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			access.Reason = "membership_required"
			return access, nil
		}
		return nil, err
	}

	if err := s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.RoomMember{
		RoomID: *yatra.ChatRoomID,
		UserID: userID,
		Role:   models.RoomRoleMember,
	}).Error; err != nil {
		log.Printf("[YatraService] Failed to upsert room membership for chat access yatra_id=%d room_id=%d user_id=%d: %v", yatraID, *yatra.ChatRoomID, userID, err)
	}

	access.CanAccess = true
	return access, nil
}

func (s *YatraService) BroadcastYatra(yatraID uint, actorID uint, actorRole string, req YatraBroadcastRequest) (int, error) {
	req.Title = strings.TrimSpace(req.Title)
	req.Body = strings.TrimSpace(req.Body)
	if req.Title == "" {
		return 0, errors.New("title is required")
	}
	if req.Body == "" {
		return 0, errors.New("body is required")
	}
	target := normalizeYatraBroadcastTarget(req.Target)

	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return 0, err
	}
	applyYatraBillingPresentation(&yatra, s.loadYatraBillingConfig().DailyFeeLkm)

	isAdmin := models.IsAdminRole(strings.TrimSpace(strings.ToLower(actorRole)))
	if yatra.OrganizerID != actorID && !isAdmin {
		return 0, errors.New("not authorized")
	}
	if isYatraBillingUsagePaused(yatra) && !isAdmin {
		return 0, ErrYatraBillingPaused
	}

	query := s.db.Model(&models.YatraParticipant{}).
		Where("yatra_id = ?", yatraID)
	switch target {
	case YatraBroadcastTargetApproved:
		query = query.Where("status = ?", models.YatraParticipantApproved)
	case YatraBroadcastTargetPending:
		query = query.Where("status = ?", models.YatraParticipantPending)
	case YatraBroadcastTargetAll:
		query = query.Where("status IN ?", []models.YatraParticipantStatus{
			models.YatraParticipantApproved,
			models.YatraParticipantPending,
		})
	}

	var userIDs []uint
	if err := query.Distinct("user_id").Pluck("user_id", &userIDs).Error; err != nil {
		return 0, err
	}
	if len(userIDs) == 0 {
		return 0, nil
	}

	entityID := fmt.Sprintf("broadcast-%08x", crc32.ChecksumIEEE([]byte(req.Title+"|"+req.Body+"|"+string(target))))
	params := map[string]interface{}{"yatraId": yatraID}
	screen := "YatraDetail"
	if yatra.ChatRoomID != nil {
		screen = "RoomChat"
		params = map[string]interface{}{
			"roomId":      *yatra.ChatRoomID,
			"roomName":    yatra.Title + " - Чат",
			"isYatraChat": true,
		}
	}
	paramsJSON, _ := json.Marshal(params)

	delivered := 0
	var sendErr error
	for _, userID := range userIDs {
		msg := PushMessage{
			Title:    req.Title,
			Body:     req.Body,
			Priority: "high",
			EventKey: buildYatraEventKey("yatra_broadcast", yatraID, actorID, userID, entityID),
			Data: map[string]string{
				"type":         "yatra_broadcast",
				"yatraId":      fmt.Sprintf("%d", yatraID),
				"target":       string(target),
				"actorId":      fmt.Sprintf("%d", actorID),
				"targetUserId": fmt.Sprintf("%d", userID),
				"entityId":     entityID,
				"screen":       screen,
				"params":       string(paramsJSON),
			},
		}
		if yatra.ChatRoomID != nil {
			msg.Data["roomId"] = fmt.Sprintf("%d", *yatra.ChatRoomID)
		}
		if err := s.push.SendToUser(userID, msg); err != nil {
			sendErr = err
			log.Printf("[YatraService] Broadcast push failed yatra_id=%d actor_id=%d recipient_id=%d target=%s: %v", yatraID, actorID, userID, target, err)
			continue
		}
		delivered++
	}
	if delivered == 0 && sendErr != nil {
		return 0, sendErr
	}
	return delivered, nil
}

func canChargeYatraDailyFee(yatra models.Yatra, now time.Time) bool {
	if yatra.Status != models.YatraStatusOpen &&
		yatra.Status != models.YatraStatusFull &&
		yatra.Status != models.YatraStatusActive {
		return false
	}
	if normalizeYatraBillingState(yatra.BillingState) == models.YatraBillingStateStopped {
		return false
	}
	if yatra.BillingNextChargeAt == nil {
		return false
	}
	return !yatra.BillingNextChargeAt.UTC().After(now.UTC())
}

// ProcessDueBillingCharges handles overdue yatra daily charges.
func (s *YatraService) ProcessDueBillingCharges(now time.Time) error {
	if s == nil || s.db == nil {
		return nil
	}
	cfg := s.loadYatraBillingConfig()
	if !cfg.Enabled {
		return nil
	}
	if s.wallet == nil {
		s.wallet = NewWalletService()
	}

	utcNow := now.UTC()
	var dueIDs []uint
	if err := s.db.Model(&models.Yatra{}).
		Where("status IN ?", []models.YatraStatus{
			models.YatraStatusOpen,
			models.YatraStatusFull,
			models.YatraStatusActive,
		}).
		Where("billing_next_charge_at IS NOT NULL AND billing_next_charge_at <= ?", utcNow).
		Where("billing_state <> ?", models.YatraBillingStateStopped).
		Order("billing_next_charge_at ASC").
		Limit(500).
		Pluck("id", &dueIDs).Error; err != nil {
		return err
	}

	for _, yatraID := range dueIDs {
		if err := s.processSingleYatraBillingCharge(yatraID, utcNow, cfg.DailyFeeLkm); err != nil {
			log.Printf("[YatraBilling] process failed yatra_id=%d: %v", yatraID, err)
		}
	}
	return nil
}

func (s *YatraService) processSingleYatraBillingCharge(yatraID uint, now time.Time, dailyFee int) error {
	var yatra models.Yatra
	sendPaused := false
	sendResumed := false
	sendCharged := false
	chargedAmount := dailyFee
	chargeDate := yatraChargeDateUTC(now)
	nextChargeAt := yatraNextUTCMidnight(now)

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}
		if !canChargeYatraDailyFee(yatra, now) {
			return nil
		}

		cfg := s.loadYatraBillingConfigTx(tx)
		if !cfg.Enabled {
			return nil
		}
		fee := dailyFee
		if fee <= 0 {
			fee = cfg.DailyFeeLkm
		}
		if fee <= 0 {
			fee = defaultYatraDailyFeeLkm
		}
		chargedAmount = fee
		if yatra.BillingNextChargeAt != nil {
			chargeDate = yatraChargeDateUTC(*yatra.BillingNextChargeAt)
		}
		wasPaused := isYatraBillingUsagePaused(yatra)

		dedupKey := yatraWalletDedupKey(yatra.ID, chargeDate)
		description := fmt.Sprintf("Yatra daily fee #%d (%s)", yatra.ID, chargeDate.Format("2006-01-02"))
		if _, _, spendErr := s.wallet.spendTxWithOptions(tx, yatra.OrganizerID, fee, dedupKey, description, SpendOptions{
			AllowBonus: false,
		}); spendErr != nil {
			if isInsufficientBalanceError(spendErr) {
				if err := tx.Model(&yatra).Updates(map[string]interface{}{
					"billing_paused":       true,
					"billing_state":        models.YatraBillingStatePausedInsufficient,
					"billing_pause_reason": models.YatraBillingPauseReasonInsufficientLKM,
				}).Error; err != nil {
					return err
				}
				if err := s.appendYatraBillingEventTx(tx, yatra, chargeDate, fee, models.YatraBillingEventFailedInsufficient, "insufficient_lkm"); err != nil {
					return err
				}
				sendPaused = !wasPaused
				return nil
			}
			return spendErr
		}

		if err := tx.Model(&yatra).Updates(map[string]interface{}{
			"billing_paused":          false,
			"billing_state":           models.YatraBillingStateActive,
			"billing_pause_reason":    models.YatraBillingPauseReasonNone,
			"billing_last_charged_at": now,
			"billing_next_charge_at":  nextChargeAt,
		}).Error; err != nil {
			return err
		}
		if err := s.appendYatraBillingEventTx(tx, yatra, chargeDate, fee, models.YatraBillingEventCharged, "daily_charge"); err != nil {
			return err
		}
		if wasPaused {
			if err := s.appendYatraBillingEventTx(tx, yatra, chargeDate, fee, models.YatraBillingEventResumed, "auto_resumed"); err != nil {
				return err
			}
			sendResumed = true
		}
		sendCharged = true
		return nil
	})
	if err != nil {
		return err
	}

	if sendPaused {
		s.notifyYatraBillingPaused(yatra)
	}
	if sendResumed {
		s.notifyYatraBillingResumed(yatra)
	}
	if sendCharged {
		s.notifyYatraBillingCharged(yatra, chargedAmount, nextChargeAt)
	}
	return nil
}

func RunYatraBillingWorkerCycle() {
	if database.DB == nil {
		return
	}
	service := NewYatraService(database.DB, nil)
	if err := service.ProcessDueBillingCharges(time.Now().UTC()); err != nil {
		log.Printf("[YatraBilling] worker cycle failed: %v", err)
	}
}

func buildYatraEventKey(eventType string, yatraID, actorID, targetUserID uint, entityID interface{}) string {
	return fmt.Sprintf("%s:yatra:%d:actor:%d:target:%d:entity:%v", eventType, yatraID, actorID, targetUserID, entityID)
}

func (s *YatraService) notifyYatraJoinRequested(yatraID, organizerID, actorUserID, participantID uint, yatraTitle string) {
	if s == nil || s.push == nil || organizerID == 0 {
		return
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"yatraId": yatraID})
	msg := PushMessage{
		Title:    "Новая заявка в Ятру",
		Body:     fmt.Sprintf("Пользователь подал заявку на \"%s\"", strings.TrimSpace(yatraTitle)),
		Priority: "high",
		EventKey: buildYatraEventKey("yatra_join_requested", yatraID, actorUserID, organizerID, participantID),
		Data: map[string]string{
			"type":          "yatra_join_requested",
			"yatraId":       fmt.Sprintf("%d", yatraID),
			"participantId": fmt.Sprintf("%d", participantID),
			"actorId":       fmt.Sprintf("%d", actorUserID),
			"targetUserId":  fmt.Sprintf("%d", organizerID),
			"entityId":      fmt.Sprintf("%d", participantID),
			"screen":        "YatraDetail",
			"params":        string(paramsJSON),
		},
	}
	if err := s.push.SendToUser(organizerID, msg); err != nil {
		log.Printf("[YatraService] join-requested push failed yatra_id=%d organizer_id=%d participant_id=%d: %v", yatraID, organizerID, participantID, err)
	}
}

func (s *YatraService) notifyYatraJoinApproved(yatra models.Yatra, actorUserID, approvedUserID, participantID uint, yatraTitle string) {
	if s == nil || s.push == nil || approvedUserID == 0 {
		return
	}
	params := map[string]interface{}{"yatraId": yatra.ID}
	screen := "YatraDetail"
	if yatra.ChatRoomID != nil {
		screen = "RoomChat"
		params = map[string]interface{}{
			"roomId":      *yatra.ChatRoomID,
			"roomName":    yatra.Title + " - Чат",
			"isYatraChat": true,
		}
	}
	paramsJSON, _ := json.Marshal(params)
	msg := PushMessage{
		Title:    "Заявка одобрена",
		Body:     fmt.Sprintf("Вас одобрили в \"%s\"", strings.TrimSpace(yatraTitle)),
		Priority: "high",
		EventKey: buildYatraEventKey("yatra_join_approved", yatra.ID, actorUserID, approvedUserID, participantID),
		Data: map[string]string{
			"type":          "yatra_join_approved",
			"yatraId":       fmt.Sprintf("%d", yatra.ID),
			"participantId": fmt.Sprintf("%d", participantID),
			"actorId":       fmt.Sprintf("%d", actorUserID),
			"targetUserId":  fmt.Sprintf("%d", approvedUserID),
			"entityId":      fmt.Sprintf("%d", participantID),
			"screen":        screen,
			"params":        string(paramsJSON),
		},
	}
	if yatra.ChatRoomID != nil {
		msg.Data["roomId"] = fmt.Sprintf("%d", *yatra.ChatRoomID)
	}
	if err := s.push.SendToUser(approvedUserID, msg); err != nil {
		log.Printf("[YatraService] join-approved push failed yatra_id=%d approved_user_id=%d participant_id=%d: %v", yatra.ID, approvedUserID, participantID, err)
	}
}

func (s *YatraService) notifyYatraJoinRejected(yatraID, actorUserID, rejectedUserID, participantID uint, yatraTitle string) {
	if s == nil || s.push == nil || rejectedUserID == 0 {
		return
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"yatraId": yatraID})
	msg := PushMessage{
		Title:    "Заявка отклонена",
		Body:     fmt.Sprintf("Ваша заявка в \"%s\" отклонена", strings.TrimSpace(yatraTitle)),
		Priority: "high",
		EventKey: buildYatraEventKey("yatra_join_rejected", yatraID, actorUserID, rejectedUserID, participantID),
		Data: map[string]string{
			"type":          "yatra_join_rejected",
			"yatraId":       fmt.Sprintf("%d", yatraID),
			"participantId": fmt.Sprintf("%d", participantID),
			"actorId":       fmt.Sprintf("%d", actorUserID),
			"targetUserId":  fmt.Sprintf("%d", rejectedUserID),
			"entityId":      fmt.Sprintf("%d", participantID),
			"screen":        "YatraDetail",
			"params":        string(paramsJSON),
		},
	}
	if err := s.push.SendToUser(rejectedUserID, msg); err != nil {
		log.Printf("[YatraService] join-rejected push failed yatra_id=%d rejected_user_id=%d participant_id=%d: %v", yatraID, rejectedUserID, participantID, err)
	}
}

func (s *YatraService) notifyYatraCancelled(yatra models.Yatra, actorUserID uint, targetUserIDs []uint) {
	if s == nil || s.push == nil || yatra.ID == 0 {
		return
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"yatraId": yatra.ID})
	seen := make(map[uint]struct{}, len(targetUserIDs))
	for _, targetUserID := range targetUserIDs {
		if targetUserID == 0 || targetUserID == yatra.OrganizerID {
			continue
		}
		if _, exists := seen[targetUserID]; exists {
			continue
		}
		seen[targetUserID] = struct{}{}
		msg := PushMessage{
			Title:    "Ятра отменена",
			Body:     fmt.Sprintf("Организатор остановил \"%s\"", strings.TrimSpace(yatra.Title)),
			Priority: "high",
			EventKey: buildYatraEventKey("yatra_cancelled", yatra.ID, actorUserID, targetUserID, "participant"),
			Data: map[string]string{
				"type":         "yatra_cancelled",
				"yatraId":      fmt.Sprintf("%d", yatra.ID),
				"actorId":      fmt.Sprintf("%d", actorUserID),
				"targetUserId": fmt.Sprintf("%d", targetUserID),
				"entityId":     "participant",
				"screen":       "YatraDetail",
				"params":       string(paramsJSON),
			},
		}
		if err := s.push.SendToUser(targetUserID, msg); err != nil {
			log.Printf("[YatraService] yatra-cancelled push failed yatra_id=%d target_user_id=%d: %v", yatra.ID, targetUserID, err)
		}
	}
}

func (s *YatraService) notifyYatraBillingCharged(yatra models.Yatra, amount int, nextChargeAt time.Time) {
	if s == nil || s.push == nil || yatra.OrganizerID == 0 || amount <= 0 {
		return
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"yatraId": yatra.ID})
	msg := PushMessage{
		Title:    "Списание за Ятру",
		Body:     fmt.Sprintf("Списано %d LKM за \"%s\"", amount, strings.TrimSpace(yatra.Title)),
		Priority: "normal",
		EventKey: buildYatraEventKey("yatra_billing_charged", yatra.ID, yatra.OrganizerID, yatra.OrganizerID, nextChargeAt.Format(time.RFC3339)),
		Data: map[string]string{
			"type":         "yatra_billing_charged",
			"yatraId":      fmt.Sprintf("%d", yatra.ID),
			"targetUserId": fmt.Sprintf("%d", yatra.OrganizerID),
			"amountLkm":    fmt.Sprintf("%d", amount),
			"screen":       "YatraDetail",
			"params":       string(paramsJSON),
		},
	}
	if err := s.push.SendToUser(yatra.OrganizerID, msg); err != nil {
		log.Printf("[YatraService] billing-charged push failed yatra_id=%d organizer_id=%d: %v", yatra.ID, yatra.OrganizerID, err)
	}
}

func (s *YatraService) notifyYatraBillingPaused(yatra models.Yatra) {
	if s == nil || s.push == nil || yatra.OrganizerID == 0 {
		return
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"yatraId": yatra.ID})
	msg := PushMessage{
		Title:    "Ятра на паузе",
		Body:     fmt.Sprintf("Недостаточно LKM для \"%s\". Пополните баланс.", strings.TrimSpace(yatra.Title)),
		Priority: "high",
		EventKey: buildYatraEventKey("yatra_billing_paused", yatra.ID, yatra.OrganizerID, yatra.OrganizerID, "insufficient_lkm"),
		Data: map[string]string{
			"type":         "yatra_billing_paused",
			"yatraId":      fmt.Sprintf("%d", yatra.ID),
			"targetUserId": fmt.Sprintf("%d", yatra.OrganizerID),
			"reason":       "insufficient_lkm",
			"screen":       "YatraDetail",
			"params":       string(paramsJSON),
		},
	}
	if err := s.push.SendToUser(yatra.OrganizerID, msg); err != nil {
		log.Printf("[YatraService] billing-paused push failed yatra_id=%d organizer_id=%d: %v", yatra.ID, yatra.OrganizerID, err)
	}
}

func (s *YatraService) notifyYatraBillingResumed(yatra models.Yatra) {
	if s == nil || s.push == nil || yatra.OrganizerID == 0 {
		return
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"yatraId": yatra.ID})
	msg := PushMessage{
		Title:    "Ятра возобновлена",
		Body:     fmt.Sprintf("Доступ к \"%s\" снова активен", strings.TrimSpace(yatra.Title)),
		Priority: "high",
		EventKey: buildYatraEventKey("yatra_billing_resumed", yatra.ID, yatra.OrganizerID, yatra.OrganizerID, "resumed"),
		Data: map[string]string{
			"type":         "yatra_billing_resumed",
			"yatraId":      fmt.Sprintf("%d", yatra.ID),
			"targetUserId": fmt.Sprintf("%d", yatra.OrganizerID),
			"screen":       "YatraDetail",
			"params":       string(paramsJSON),
		},
	}
	if err := s.push.SendToUser(yatra.OrganizerID, msg); err != nil {
		log.Printf("[YatraService] billing-resumed push failed yatra_id=%d organizer_id=%d: %v", yatra.ID, yatra.OrganizerID, err)
	}
}
