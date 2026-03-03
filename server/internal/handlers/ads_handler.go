package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	defaultFestivalTimezone = "Europe/Moscow"
	maxFestivalLinkItems    = 20
)

type AdsHandler struct {
	mapService     *services.MapService
	serviceService *services.ServiceService
	channelService *services.ChannelService
}

func NewAdsHandler() *AdsHandler {
	return &AdsHandler{
		mapService:     services.NewMapService(database.DB),
		serviceService: services.NewServiceService(),
		channelService: services.NewChannelService(),
	}
}

func parsePagination(c *fiber.Ctx, maxLimit int) (page int, limit int, offset int) {
	defaultLimit := 20
	if maxLimit > 0 && defaultLimit > maxLimit {
		defaultLimit = maxLimit
	}
	page = parseAdIntWithDefault(c.Query("page"), 1)
	limit = parseAdIntWithDefault(c.Query("limit"), defaultLimit)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = defaultLimit
	}
	if maxLimit > 0 && limit > maxLimit {
		limit = maxLimit
	}
	offset = (page - 1) * limit
	return
}

func parseAdIntWithDefault(raw string, fallback int) int {
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

func parseAdBoolWithDefault(raw string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func normalizeAdSort(raw string) string {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	switch normalized {
	case "price_asc", "price_desc", "popular", "newest":
		return normalized
	default:
		return "newest"
	}
}

func hasMinRunes(value string, min int) bool {
	if min <= 0 {
		return true
	}
	return utf8.RuneCountInString(strings.TrimSpace(value)) >= min
}

func buildAdAuthor(user *models.User) *models.AdAuthor {
	if user == nil {
		return nil
	}
	return &models.AdAuthor{
		ID:            user.ID,
		SpiritualName: user.SpiritualName,
		KarmicName:    user.KarmicName,
		AvatarURL:     user.AvatarURL,
		City:          user.City,
		MemberSince:   user.CreatedAt.Format("2006-01-02"),
		IsVerified:    user.IsProfileComplete,
	}
}

func isAllowedAdImageContentType(contentType string) bool {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	return strings.HasPrefix(contentType, "image/")
}

func isValidAdType(adType models.AdType) bool {
	switch adType {
	case models.AdTypeLooking, models.AdTypeOffering:
		return true
	default:
		return false
	}
}

func isValidAdCategory(category models.AdCategory) bool {
	switch category {
	case models.AdCategoryWork,
		models.AdCategoryRealEstate,
		models.AdCategorySpiritual,
		models.AdCategoryEducation,
		models.AdCategoryGoods,
		models.AdCategoryFood,
		models.AdCategoryTransport,
		models.AdCategoryEvents,
		models.AdCategoryServices,
		models.AdCategoryCharity,
		models.AdCategoryYogaWellness,
		models.AdCategoryAyurveda,
		models.AdCategoryHousing,
		models.AdCategoryFurniture:
		return true
	default:
		return false
	}
}

func isValidAdStatus(status models.AdStatus) bool {
	switch status {
	case models.AdStatusPending, models.AdStatusActive, models.AdStatusRejected, models.AdStatusArchived:
		return true
	default:
		return false
	}
}

func normalizeAdPhotoURLs(urls []string) []string {
	if len(urls) == 0 {
		return urls
	}
	seen := make(map[string]struct{}, len(urls))
	normalized := make([]string, 0, len(urls))
	for _, raw := range urls {
		url := strings.TrimSpace(raw)
		if url == "" {
			continue
		}
		if _, exists := seen[url]; exists {
			continue
		}
		seen[url] = struct{}{}
		normalized = append(normalized, url)
		if len(normalized) >= 10 {
			break
		}
	}
	return normalized
}

func isDuplicateKeyError(err error) bool {
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

func calculateAdTotalPages(total int64, limit int) int {
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

type validatedFestivalFields struct {
	StartAt          *time.Time
	EndAt            *time.Time
	Timezone         string
	OrganizerName    string
	OrganizerContact string
	VenueName        string
	VenueAddress     string
	VenueLat         *float64
	VenueLng         *float64
	PreacherIDs      []uint
	LinkedServiceIDs []uint
}

func normalizeFestivalTimezone(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return defaultFestivalTimezone
	}
	if _, err := time.LoadLocation(trimmed); err != nil {
		return defaultFestivalTimezone
	}
	return trimmed
}

func parseOptionalRFC3339(raw string) (*time.Time, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	utc := parsed.UTC()
	return &utc, nil
}

func sanitizeFestivalIDs(ids []uint, limit int) ([]uint, error) {
	if len(ids) == 0 {
		return []uint{}, nil
	}
	seen := make(map[uint]struct{}, len(ids))
	out := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
		if len(out) > limit {
			return nil, fmt.Errorf("too many linked items, max %d", limit)
		}
	}
	return out, nil
}

func isFestivalCategory(category models.AdCategory) bool {
	return category == models.AdCategoryEvents
}

func validateFestivalFields(req models.AdCreateRequest, requireStart bool) (*validatedFestivalFields, error) {
	startAt, err := parseOptionalRFC3339(req.FestivalStartAt)
	if err != nil {
		return nil, fmt.Errorf("festivalStartAt must be RFC3339")
	}
	endAt, err := parseOptionalRFC3339(req.FestivalEndAt)
	if err != nil {
		return nil, fmt.Errorf("festivalEndAt must be RFC3339")
	}
	if requireStart && startAt == nil {
		return nil, fmt.Errorf("festivalStartAt is required for events")
	}
	if startAt != nil && endAt != nil && endAt.Before(*startAt) {
		return nil, fmt.Errorf("festivalEndAt must be greater or equal to festivalStartAt")
	}

	preacherIDs, err := sanitizeFestivalIDs(req.PreacherChannelIDs, maxFestivalLinkItems)
	if err != nil {
		return nil, fmt.Errorf("preacherChannelIds: %w", err)
	}
	linkedServiceIDs, err := sanitizeFestivalIDs(req.LinkedServiceIDs, maxFestivalLinkItems)
	if err != nil {
		return nil, fmt.Errorf("linkedServiceIds: %w", err)
	}

	return &validatedFestivalFields{
		StartAt:          startAt,
		EndAt:            endAt,
		Timezone:         normalizeFestivalTimezone(req.FestivalTimezone),
		OrganizerName:    strings.TrimSpace(req.OrganizerName),
		OrganizerContact: strings.TrimSpace(req.OrganizerContact),
		VenueName:        strings.TrimSpace(req.VenueName),
		VenueAddress:     strings.TrimSpace(req.VenueAddress),
		VenueLat:         req.VenueLat,
		VenueLng:         req.VenueLng,
		PreacherIDs:      preacherIDs,
		LinkedServiceIDs: linkedServiceIDs,
	}, nil
}

func hasFestivalPayload(req models.AdCreateRequest) bool {
	return strings.TrimSpace(req.FestivalStartAt) != "" ||
		strings.TrimSpace(req.FestivalEndAt) != "" ||
		strings.TrimSpace(req.FestivalTimezone) != "" ||
		strings.TrimSpace(req.OrganizerName) != "" ||
		strings.TrimSpace(req.OrganizerContact) != "" ||
		strings.TrimSpace(req.VenueName) != "" ||
		strings.TrimSpace(req.VenueAddress) != "" ||
		req.VenueLat != nil ||
		req.VenueLng != nil ||
		len(req.PreacherChannelIDs) > 0 ||
		len(req.LinkedServiceIDs) > 0
}

func applyFestivalFieldsToAd(ad *models.Ad, fields *validatedFestivalFields) {
	if ad == nil {
		return
	}
	if fields == nil {
		ad.FestivalStartAt = nil
		ad.FestivalEndAt = nil
		ad.FestivalTimezone = ""
		ad.OrganizerName = ""
		ad.OrganizerContact = ""
		ad.VenueName = ""
		ad.VenueAddress = ""
		ad.VenueLat = nil
		ad.VenueLng = nil
		ad.PreacherChannelIDs = []uint{}
		ad.LinkedServiceIDs = []uint{}
		return
	}
	ad.FestivalStartAt = fields.StartAt
	ad.FestivalEndAt = fields.EndAt
	ad.FestivalTimezone = fields.Timezone
	ad.OrganizerName = fields.OrganizerName
	ad.OrganizerContact = fields.OrganizerContact
	ad.VenueName = fields.VenueName
	ad.VenueAddress = fields.VenueAddress
	ad.VenueLat = fields.VenueLat
	ad.VenueLng = fields.VenueLng
	ad.PreacherChannelIDs = fields.PreacherIDs
	ad.LinkedServiceIDs = fields.LinkedServiceIDs
}

func applyFestivalFieldsToUpdateMap(updateMap map[string]interface{}, fields *validatedFestivalFields) {
	if updateMap == nil {
		return
	}
	if fields == nil {
		updateMap["festival_start_at"] = nil
		updateMap["festival_end_at"] = nil
		updateMap["festival_timezone"] = ""
		updateMap["organizer_name"] = ""
		updateMap["organizer_contact"] = ""
		updateMap["venue_name"] = ""
		updateMap["venue_address"] = ""
		updateMap["venue_lat"] = nil
		updateMap["venue_lng"] = nil
		updateMap["preacher_channel_ids"] = []uint{}
		updateMap["linked_service_ids"] = []uint{}
		return
	}
	updateMap["festival_start_at"] = fields.StartAt
	updateMap["festival_end_at"] = fields.EndAt
	updateMap["festival_timezone"] = fields.Timezone
	updateMap["organizer_name"] = fields.OrganizerName
	updateMap["organizer_contact"] = fields.OrganizerContact
	updateMap["venue_name"] = fields.VenueName
	updateMap["venue_address"] = fields.VenueAddress
	updateMap["venue_lat"] = fields.VenueLat
	updateMap["venue_lng"] = fields.VenueLng
	updateMap["preacher_channel_ids"] = fields.PreacherIDs
	updateMap["linked_service_ids"] = fields.LinkedServiceIDs
}

func preloadChannelsWithOwners(query *gorm.DB) ([]models.Channel, error) {
	var channels []models.Channel
	if err := query.Preload("Owner").Find(&channels).Error; err != nil {
		return nil, err
	}
	return channels, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func buildFestivalPreacherFromChannel(channel models.Channel) models.FestivalPreacher {
	name := strings.TrimSpace(channel.Title)
	ownerID := channel.OwnerID
	avatar := ""
	if channel.Owner != nil {
		ownerID = channel.Owner.ID
		name = firstNonEmpty(channel.Owner.SpiritualName, channel.Owner.KarmicName, channel.Title)
		avatar = strings.TrimSpace(channel.Owner.AvatarURL)
	}
	if name == "" {
		name = fmt.Sprintf("Channel %d", channel.ID)
	}
	return models.FestivalPreacher{
		ChannelID: channel.ID,
		OwnerID:   ownerID,
		Name:      name,
		AvatarURL: avatar,
	}
}

func (h *AdsHandler) loadChannelsByIDs(ids []uint) (map[uint]models.Channel, error) {
	result := make(map[uint]models.Channel)
	if len(ids) == 0 {
		return result, nil
	}
	channels, err := preloadChannelsWithOwners(database.DB.Model(&models.Channel{}).Where("id IN ?", ids))
	if err != nil {
		return nil, err
	}
	for _, channel := range channels {
		result[channel.ID] = channel
	}
	return result, nil
}

func (h *AdsHandler) loadPrimaryChannelsByOwnerIDs(ownerIDs []uint) (map[uint]models.Channel, error) {
	result := make(map[uint]models.Channel)
	if len(ownerIDs) == 0 {
		return result, nil
	}
	channels, err := preloadChannelsWithOwners(
		database.DB.Model(&models.Channel{}).
			Where("owner_id IN ?", ownerIDs).
			Order("created_at DESC"),
	)
	if err != nil {
		return nil, err
	}
	for _, channel := range channels {
		if _, exists := result[channel.OwnerID]; exists {
			continue
		}
		result[channel.OwnerID] = channel
	}
	return result, nil
}

func (h *AdsHandler) resolveFestivalPreachersForAd(ad *models.Ad) ([]models.FestivalPreacher, error) {
	if ad == nil {
		return []models.FestivalPreacher{}, nil
	}
	manualIDs, err := sanitizeFestivalIDs(ad.PreacherChannelIDs, maxFestivalLinkItems)
	if err != nil {
		return nil, err
	}
	linkedServiceIDs, err := sanitizeFestivalIDs(ad.LinkedServiceIDs, maxFestivalLinkItems)
	if err != nil {
		return nil, err
	}

	manualChannels, err := h.loadChannelsByIDs(manualIDs)
	if err != nil {
		return nil, err
	}

	ownerIDs := make([]uint, 0, len(linkedServiceIDs))
	if len(linkedServiceIDs) > 0 {
		var linkedServices []models.Service
		if err := database.DB.Model(&models.Service{}).
			Select("id", "owner_id").
			Where("id IN ?", linkedServiceIDs).
			Find(&linkedServices).Error; err != nil {
			return nil, err
		}
		ownerSeen := make(map[uint]struct{}, len(linkedServices))
		for _, service := range linkedServices {
			if service.OwnerID == 0 {
				continue
			}
			if _, exists := ownerSeen[service.OwnerID]; exists {
				continue
			}
			ownerSeen[service.OwnerID] = struct{}{}
			ownerIDs = append(ownerIDs, service.OwnerID)
		}
	}

	autoChannelsByOwner, err := h.loadPrimaryChannelsByOwnerIDs(ownerIDs)
	if err != nil {
		return nil, err
	}

	preachers := make([]models.FestivalPreacher, 0, len(manualChannels)+len(autoChannelsByOwner))
	seenChannelIDs := make(map[uint]struct{}, len(manualChannels)+len(autoChannelsByOwner))

	for _, manualID := range manualIDs {
		channel, exists := manualChannels[manualID]
		if !exists {
			continue
		}
		if _, seen := seenChannelIDs[channel.ID]; seen {
			continue
		}
		seenChannelIDs[channel.ID] = struct{}{}
		preachers = append(preachers, buildFestivalPreacherFromChannel(channel))
	}

	for _, channel := range autoChannelsByOwner {
		if _, seen := seenChannelIDs[channel.ID]; seen {
			continue
		}
		seenChannelIDs[channel.ID] = struct{}{}
		preachers = append(preachers, buildFestivalPreacherFromChannel(channel))
	}

	return preachers, nil
}

func parseHHMM(value string) (int, int, bool) {
	parts := strings.Split(strings.TrimSpace(value), ":")
	if len(parts) != 2 {
		return 0, 0, false
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil || hour < 0 || hour > 23 {
		return 0, 0, false
	}
	minute, err := strconv.Atoi(parts[1])
	if err != nil || minute < 0 || minute > 59 {
		return 0, 0, false
	}
	return hour, minute, true
}

func containsServiceFormatEvent(formats string) bool {
	trimmed := strings.TrimSpace(formats)
	if trimmed == "" {
		return false
	}
	var items []string
	if err := json.Unmarshal([]byte(trimmed), &items); err != nil {
		return strings.Contains(strings.ToLower(trimmed), "event")
	}
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(item), string(models.ServiceFormatEvent)) {
			return true
		}
	}
	return false
}

type linkedServiceInterval struct {
	Start time.Time
	End   time.Time
}

func parseFestivalMonthRange(raw string) (string, time.Time, time.Time, error) {
	month := strings.TrimSpace(raw)
	if month == "" {
		return "", time.Time{}, time.Time{}, fmt.Errorf("month is required (YYYY-MM)")
	}
	parsed, err := time.Parse("2006-01", month)
	if err != nil {
		return "", time.Time{}, time.Time{}, fmt.Errorf("month must be in YYYY-MM format")
	}
	start := time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0).Add(-time.Nanosecond)
	return month, start, end, nil
}

func parseFestivalDateRange(raw string) (string, time.Time, time.Time, error) {
	dateRaw := strings.TrimSpace(raw)
	if dateRaw == "" {
		return "", time.Time{}, time.Time{}, fmt.Errorf("date is required (YYYY-MM-DD)")
	}
	parsed, err := time.Parse("2006-01-02", dateRaw)
	if err != nil {
		return "", time.Time{}, time.Time{}, fmt.Errorf("date must be in YYYY-MM-DD format")
	}
	start := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24*time.Hour - time.Nanosecond)
	return dateRaw, start, end, nil
}

func parseOptionalUintQuery(raw string) (uint, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(parsed), nil
}

func festivalPreachersContainChannel(preachers []models.FestivalPreacher, channelID uint) bool {
	if channelID == 0 {
		return true
	}
	for _, preacher := range preachers {
		if preacher.ChannelID == channelID {
			return true
		}
	}
	return false
}

func addLinkedServiceIntervals(intervals map[uint][]linkedServiceInterval, ad models.Ad) {
	if ad.FestivalStartAt == nil || len(ad.LinkedServiceIDs) == 0 {
		return
	}
	start := ad.FestivalStartAt.UTC()
	end := start
	if ad.FestivalEndAt != nil {
		candidate := ad.FestivalEndAt.UTC()
		if !candidate.Before(start) {
			end = candidate
		}
	}
	serviceIDs, err := sanitizeFestivalIDs(ad.LinkedServiceIDs, maxFestivalLinkItems)
	if err != nil {
		return
	}
	for _, serviceID := range serviceIDs {
		if serviceID == 0 {
			continue
		}
		intervals[serviceID] = append(intervals[serviceID], linkedServiceInterval{
			Start: start,
			End:   end,
		})
	}
}

func isSadhuOccurrenceSuppressed(intervals map[uint][]linkedServiceInterval, serviceID uint, occurrenceStart time.Time) bool {
	items := intervals[serviceID]
	if len(items) == 0 {
		return false
	}
	ts := occurrenceStart.UTC()
	for _, interval := range items {
		if (ts.Equal(interval.Start) || ts.After(interval.Start)) && (ts.Equal(interval.End) || ts.Before(interval.End)) {
			return true
		}
	}
	return false
}

func buildFestivalDayKey(startAt time.Time, timezone string) string {
	loc, err := time.LoadLocation(strings.TrimSpace(timezone))
	if err != nil {
		loc = time.UTC
	}
	return startAt.In(loc).Format("2006-01-02")
}

func primaryPhotoURL(ad models.Ad) string {
	if len(ad.Photos) == 0 {
		return ""
	}
	for _, photo := range ad.Photos {
		trimmed := strings.TrimSpace(photo.PhotoURL)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func (h *AdsHandler) buildFestivalItemFromAd(ad models.Ad, preachers []models.FestivalPreacher) models.FestivalItem {
	timezone := normalizeFestivalTimezone(ad.FestivalTimezone)
	startAt := ""
	if ad.FestivalStartAt != nil {
		startAt = ad.FestivalStartAt.UTC().Format(time.RFC3339)
	}
	endAt := ""
	if ad.FestivalEndAt != nil {
		endAt = ad.FestivalEndAt.UTC().Format(time.RFC3339)
	}

	organizerName := strings.TrimSpace(ad.OrganizerName)
	if organizerName == "" && ad.User != nil {
		organizerName = firstNonEmpty(ad.User.SpiritualName, ad.User.KarmicName)
	}

	adID := ad.ID
	return models.FestivalItem{
		ID:            fmt.Sprintf("ad:%d", ad.ID),
		Source:        "ad",
		StartAt:       startAt,
		EndAt:         endAt,
		Timezone:      timezone,
		Title:         strings.TrimSpace(ad.Title),
		Description:   strings.TrimSpace(ad.Description),
		City:          strings.TrimSpace(ad.City),
		VenueName:     strings.TrimSpace(ad.VenueName),
		VenueAddress:  strings.TrimSpace(ad.VenueAddress),
		OrganizerName: organizerName,
		AdID:          &adID,
		Preachers:     preachers,
		PhotoURL:      primaryPhotoURL(ad),
	}
}

func buildOrganizerNameFromOwner(owner *models.User) string {
	if owner == nil {
		return ""
	}
	return firstNonEmpty(owner.SpiritualName, owner.KarmicName)
}

func (h *AdsHandler) buildFestivalItemFromServiceOccurrence(
	occ services.FestivalServiceOccurrence,
	channel *models.Channel,
) models.FestivalItem {
	serviceID := occ.Service.ID
	var channelID *uint
	preachers := make([]models.FestivalPreacher, 0, 1)
	if channel != nil && channel.ID != 0 {
		channelID = &channel.ID
		preachers = append(preachers, buildFestivalPreacherFromChannel(*channel))
	}

	venueAddress := strings.TrimSpace(occ.Service.OfflineAddress)
	venueName := ""
	if occ.Service.Channel == models.ServiceChannelOffline {
		venueName = venueAddress
	}

	return models.FestivalItem{
		ID:            fmt.Sprintf("sadhu:%d:%d", occ.Service.ID, occ.StartAt.Unix()),
		Source:        "sadhu_service",
		StartAt:       occ.StartAt.UTC().Format(time.RFC3339),
		EndAt:         func() string { if occ.EndAt != nil { return occ.EndAt.UTC().Format(time.RFC3339) }; return "" }(),
		Timezone:      normalizeFestivalTimezone(occ.Timezone),
		Title:         strings.TrimSpace(occ.Service.Title),
		Description:   strings.TrimSpace(occ.Service.Description),
		City:          strings.TrimSpace(func() string { if occ.Service.Owner != nil { return occ.Service.Owner.City }; return "" }()),
		VenueName:     venueName,
		VenueAddress:  venueAddress,
		OrganizerName: buildOrganizerNameFromOwner(occ.Service.Owner),
		ServiceID:     &serviceID,
		ChannelID:     channelID,
		Preachers:     preachers,
		PhotoURL:      strings.TrimSpace(occ.Service.CoverImageURL),
	}
}

func sortFestivalItems(items []models.FestivalItem) {
	sort.SliceStable(items, func(i, j int) bool {
		left, leftErr := time.Parse(time.RFC3339, items[i].StartAt)
		right, rightErr := time.Parse(time.RFC3339, items[j].StartAt)
		if leftErr == nil && rightErr == nil && !left.Equal(right) {
			return left.Before(right)
		}
		if items[i].Source != items[j].Source {
			return items[i].Source == "ad"
		}
		return strings.ToLower(items[i].Title) < strings.ToLower(items[j].Title)
	})
}

func (h *AdsHandler) buildFestivalItems(
	c *fiber.Ctx,
	rangeStart time.Time,
	rangeEnd time.Time,
	city string,
	search string,
	preacherChannelID uint,
	includeSadhu bool,
	myOnly bool,
) ([]models.FestivalItem, error) {
	viewerID := middleware.GetUserID(c)
	city = strings.TrimSpace(city)
	search = strings.TrimSpace(search)

	items := make([]models.FestivalItem, 0)
	suppressionByService := make(map[uint][]linkedServiceInterval)

	adQuery := database.DB.Model(&models.Ad{}).
		Preload("Photos").
		Preload("User").
		Where("category = ? AND status = ? AND festival_start_at IS NOT NULL", models.AdCategoryEvents, models.AdStatusActive).
		Where("festival_start_at <= ? AND (festival_end_at IS NULL OR festival_end_at >= ?)", rangeEnd, rangeStart)

	if city != "" {
		adQuery = adQuery.Where("LOWER(TRIM(city)) = LOWER(TRIM(?))", city)
	}
	if search != "" {
		pattern := "%" + search + "%"
		adQuery = adQuery.Where("title ILIKE ? OR description ILIKE ?", pattern, pattern)
	}
	if myOnly && viewerID != 0 {
		adQuery = adQuery.Where("user_id = ?", viewerID)
	}

	var ads []models.Ad
	if err := adQuery.Order("festival_start_at ASC").Find(&ads).Error; err != nil {
		return nil, err
	}

	for _, ad := range ads {
		preachers, err := h.resolveFestivalPreachersForAd(&ad)
		if err != nil {
			log.Printf("[ADS] failed to resolve festival preachers for ad %d: %v", ad.ID, err)
			preachers = []models.FestivalPreacher{}
		}
		if preacherChannelID != 0 && !festivalPreachersContainChannel(preachers, preacherChannelID) {
			continue
		}
		items = append(items, h.buildFestivalItemFromAd(ad, preachers))
		addLinkedServiceIntervals(suppressionByService, ad)
	}

	if includeSadhu && h.serviceService != nil && h.channelService != nil {
		scope := services.SadhuOwnerScope{OwnerIDs: []uint{}, Bypass: true}
		if !myOnly {
			if viewerID == 0 {
				includeSadhu = false
			} else {
				resolvedScope, err := h.channelService.ResolveSadhuOwnerScope(viewerID)
				if err != nil {
					return nil, err
				}
				scope = resolvedScope
			}
		}

		if includeSadhu {
			if scope.ShowNone && !myOnly {
				includeSadhu = false
			}
			if includeSadhu {
				filters := services.FestivalServiceOccurrenceFilters{
					RangeStart: rangeStart,
					RangeEnd:   rangeEnd,
					City:       city,
					Search:     search,
				}
				if myOnly && viewerID != 0 {
					filters.OwnerID = &viewerID
				} else if !scope.Bypass {
					if len(scope.OwnerIDs) == 0 {
						includeSadhu = false
					} else {
						filters.OwnerIDs = scope.OwnerIDs
					}
				}

				if includeSadhu {
					occurrences, err := h.serviceService.ListFestivalOccurrences(filters)
					if err != nil {
						return nil, err
					}

					ownerIDs := make([]uint, 0, len(occurrences))
					ownerSeen := make(map[uint]struct{}, len(occurrences))
					for _, occ := range occurrences {
						if occ.Service.OwnerID == 0 {
							continue
						}
						if _, exists := ownerSeen[occ.Service.OwnerID]; exists {
							continue
						}
						ownerSeen[occ.Service.OwnerID] = struct{}{}
						ownerIDs = append(ownerIDs, occ.Service.OwnerID)
					}

					channelsByOwner, err := h.loadPrimaryChannelsByOwnerIDs(ownerIDs)
					if err != nil {
						return nil, err
					}

					for _, occ := range occurrences {
						if isSadhuOccurrenceSuppressed(suppressionByService, occ.Service.ID, occ.StartAt) {
							continue
						}
						channel, hasChannel := channelsByOwner[occ.Service.OwnerID]
						if preacherChannelID != 0 {
							if !hasChannel || channel.ID != preacherChannelID {
								continue
							}
						}

						var channelPtr *models.Channel
						if hasChannel {
							channelCopy := channel
							channelPtr = &channelCopy
						}
						items = append(items, h.buildFestivalItemFromServiceOccurrence(occ, channelPtr))
					}
				}
			}
		}
	}

	sortFestivalItems(items)
	return items, nil
}

// GetFestivalCalendar returns hybrid calendar counts for a month.
func (h *AdsHandler) GetFestivalCalendar(c *fiber.Ctx) error {
	month, rangeStart, rangeEnd, err := parseFestivalMonthRange(c.Query("month"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	preacherChannelID, err := parseOptionalUintQuery(c.Query("preacherChannelId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "preacherChannelId must be a number"})
	}

	myOnly := parseAdBoolWithDefault(c.Query("myOnly"), false)
	if myOnly && middleware.GetUserID(c) == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	includeSadhu := parseAdBoolWithDefault(c.Query("includeSadhu"), true)

	items, err := h.buildFestivalItems(
		c,
		rangeStart,
		rangeEnd,
		c.Query("city"),
		c.Query("search"),
		preacherChannelID,
		includeSadhu,
		myOnly,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch festival calendar"})
	}

	countByDay := make(map[string]int, len(items))
	for _, item := range items {
		startAt, parseErr := time.Parse(time.RFC3339, item.StartAt)
		if parseErr != nil {
			continue
		}
		dayKey := buildFestivalDayKey(startAt, item.Timezone)
		countByDay[dayKey]++
	}

	days := make([]models.FestivalCalendarDay, 0, len(countByDay))
	for day, count := range countByDay {
		days = append(days, models.FestivalCalendarDay{
			Date:  day,
			Count: count,
		})
	}
	sort.Slice(days, func(i, j int) bool {
		return days[i].Date < days[j].Date
	})

	return c.JSON(models.FestivalCalendarResponse{
		Month: month,
		Days:  days,
	})
}

// GetFestivals returns hybrid agenda items for a selected date.
func (h *AdsHandler) GetFestivals(c *fiber.Ctx) error {
	_, rangeStart, rangeEnd, err := parseFestivalDateRange(c.Query("date"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	preacherChannelID, err := parseOptionalUintQuery(c.Query("preacherChannelId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "preacherChannelId must be a number"})
	}

	myOnly := parseAdBoolWithDefault(c.Query("myOnly"), false)
	if myOnly && middleware.GetUserID(c) == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	includeSadhu := parseAdBoolWithDefault(c.Query("includeSadhu"), true)

	items, err := h.buildFestivalItems(
		c,
		rangeStart,
		rangeEnd,
		c.Query("city"),
		c.Query("search"),
		preacherChannelID,
		includeSadhu,
		myOnly,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch festivals"})
	}

	page, limit, offset := parsePagination(c, 100)
	total := int64(len(items))
	if offset >= len(items) {
		return c.JSON(models.FestivalListResponse{
			Items:      []models.FestivalItem{},
			Total:      total,
			Page:       page,
			TotalPages: calculateAdTotalPages(total, limit),
		})
	}

	end := offset + limit
	if end > len(items) {
		end = len(items)
	}

	return c.JSON(models.FestivalListResponse{
		Items:      items[offset:end],
		Total:      total,
		Page:       page,
		TotalPages: calculateAdTotalPages(total, limit),
	})
}

// GetAds returns a paginated list of ads with filters
func (h *AdsHandler) GetAds(c *fiber.Ctx) error {
	page, limit, offset := parsePagination(c, 50)

	query := database.DB.Model(&models.Ad{}).Preload("Photos").Preload("User")

	isAdmin := middleware.GetUserID(c) != 0 && models.IsAdminRole(middleware.GetUserRole(c))

	// Public feed is active-only; admin can request specific statuses.
	status := strings.TrimSpace(strings.ToLower(c.Query("status", string(models.AdStatusActive))))
	if status == "" {
		status = string(models.AdStatusActive)
	}
	if !isAdmin {
		status = string(models.AdStatusActive)
	}
	if status != "all" {
		if !isValidAdStatus(models.AdStatus(status)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid status",
			})
		}
		query = query.Where("status = ?", status)
	}

	// Filter by ad type
	adType := strings.TrimSpace(c.Query("adType"))
	if adType != "" {
		if !isValidAdType(models.AdType(adType)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid ad type",
			})
		}
		query = query.Where("ad_type = ?", adType)
	}

	// Filter by category
	category := strings.TrimSpace(c.Query("category"))
	if category != "" {
		if !isValidAdCategory(models.AdCategory(category)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid category",
			})
		}
		query = query.Where("category = ?", category)
	}

	// Filter by city
	city := strings.TrimSpace(c.Query("city"))
	if city != "" {
		query = query.Where("city = ?", city)
	}

	// Filter by price range
	minPrice := strings.TrimSpace(c.Query("minPrice"))
	if minPrice != "" {
		if min, err := strconv.ParseFloat(minPrice, 64); err == nil {
			query = query.Where("price >= ? OR is_free = true", min)
		}
	}

	maxPrice := strings.TrimSpace(c.Query("maxPrice"))
	if maxPrice != "" {
		if max, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			query = query.Where("price <= ? OR is_free = true", max)
		}
	}

	// Filter free only
	if parseAdBoolWithDefault(c.Query("isFree"), false) {
		query = query.Where("is_free = true")
	}

	// Search
	search := c.Query("search")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not count ads",
		})
	}

	// Sorting
	switch normalizeAdSort(c.Query("sort", "newest")) {
	case "price_asc":
		query = query.Order("COALESCE(price, 0) ASC")
	case "price_desc":
		query = query.Order("COALESCE(price, 999999999) DESC")
	case "popular":
		query = query.Order("views_count DESC")
	default: // newest
		query = query.Order("created_at DESC")
	}

	var ads []models.Ad
	if err := query.Offset(offset).Limit(limit).Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	// Check favorites for current user from auth context only.
	userFavorites := make(map[uint]struct{})
	userID := middleware.GetUserID(c)
	if userID != 0 {
		var favorites []models.AdFavorite
		if err := database.DB.Where("user_id = ?", userID).Find(&favorites).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not fetch user favorites",
			})
		}
		for _, f := range favorites {
			userFavorites[f.AdID] = struct{}{}
		}
	}

	// Build response
	responses := make([]models.AdResponse, len(ads))
	for i, ad := range ads {
		_, isFavorite := userFavorites[ad.ID]

		responses[i] = models.AdResponse{
			Ad:         ad,
			IsFavorite: isFavorite,
			Author:     buildAdAuthor(ad.User),
		}
	}

	return c.JSON(models.AdListResponse{
		Ads:        responses,
		Total:      total,
		Page:       page,
		TotalPages: calculateAdTotalPages(total, limit),
	})
}

// GetAd returns a single ad by ID
func (h *AdsHandler) GetAd(c *fiber.Ctx) error {
	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}

	var ad models.Ad
	if err := database.DB.Preload("Photos").Preload("User").First(&ad, adID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not fetch ad",
			})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ad not found",
		})
	}

	// Increment view count
	if err := database.DB.Model(&ad).UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error; err != nil {
		log.Printf("[ADS] could not update views for ad %d: %v", ad.ID, err)
	}

	// Check if favorited by current user
	isFavorite := false
	userID := middleware.GetUserID(c)
	if userID != 0 {
		var count int64
		if err := database.DB.Model(&models.AdFavorite{}).Where("user_id = ? AND ad_id = ?", userID, ad.ID).Count(&count).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not fetch favorite status",
			})
		}
		isFavorite = count > 0
	}

	// Build author info
	author := buildAdAuthor(ad.User)
	if author != nil {
		// Count user's ads
		var adsCount int64
		if err := database.DB.Model(&models.Ad{}).Where("user_id = ? AND status = ?", ad.UserID, "active").Count(&adsCount).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not fetch author stats",
			})
		}
		author.AdsCount = int(adsCount)
	}

	if isFestivalCategory(ad.Category) {
		preachers, err := h.resolveFestivalPreachersForAd(&ad)
		if err != nil {
			log.Printf("[ADS] failed to resolve festival preachers for ad %d: %v", ad.ID, err)
		} else {
			ad.ResolvedPreachers = preachers
		}
	}

	return c.JSON(models.AdResponse{
		Ad:         ad,
		IsFavorite: isFavorite,
		Author:     author,
	})
}

// CreateAd creates a new ad
func (h *AdsHandler) CreateAd(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var req models.AdCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.City = strings.TrimSpace(req.City)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.TrimSpace(req.Email)
	req.Photos = normalizeAdPhotoURLs(req.Photos)

	if req.Title == "" || !hasMinRunes(req.Title, 5) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title must be at least 5 characters",
		})
	}
	if req.Description == "" || !hasMinRunes(req.Description, 20) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Description must be at least 20 characters",
		})
	}
	if !isValidAdType(req.AdType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad type",
		})
	}
	if !isValidAdCategory(req.Category) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid category",
		})
	}

	var festivalFields *validatedFestivalFields
	if isFestivalCategory(req.Category) || hasFestivalPayload(req) {
		fields, err := validateFestivalFields(req, isFestivalCategory(req.Category))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		festivalFields = fields
	}

	var festivalFields *validatedFestivalFields
	if isFestivalCategory(req.Category) || hasFestivalPayload(req) {
		fields, err := validateFestivalFields(req, isFestivalCategory(req.Category))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		festivalFields = fields
	}

	// Set defaults
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = "RUB"
	}

	expiresAt := time.Now().UTC().AddDate(0, 0, 30).Format(time.RFC3339)

	ad := models.Ad{
		UserID:       userID,
		AdType:       req.AdType,
		Category:     req.Category,
		Title:        req.Title,
		Description:  req.Description,
		Price:        req.Price,
		Currency:     currency,
		IsNegotiable: req.IsNegotiable,
		IsFree:       req.IsFree,
		City:         req.City,
		District:     req.District,
		ShowProfile:  req.ShowProfile,
		Phone:        req.Phone,
		Email:        req.Email,
		Status:       models.AdStatusActive, // Auto-approve for now, can add moderation later
		ExpiresAt:    expiresAt,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
	}

	if isFestivalCategory(req.Category) {
		applyFestivalFieldsToAd(&ad, festivalFields)
	}

	// Geocode city if coordinates are missing
	if (ad.Latitude == nil || ad.Longitude == nil) && ad.City != "" && h.mapService != nil {
		geocoded, err := h.mapService.GeocodeCity(ad.City)
		if err == nil {
			ad.Latitude = &geocoded.Latitude
			ad.Longitude = &geocoded.Longitude
			// Normalize city name
			ad.City = geocoded.City
		}
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&ad).Error; err != nil {
			return err
		}

		// Create photo records atomically with ad creation.
		for i, photoURL := range req.Photos {
			photo := models.AdPhoto{
				AdID:     ad.ID,
				PhotoURL: photoURL,
				Position: i,
			}
			if err := tx.Create(&photo).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create ad",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":      ad.ID,
		"status":  ad.Status,
		"message": "Ad created successfully",
	})
}

// UpdateAd updates an existing ad
func (h *AdsHandler) UpdateAd(c *fiber.Ctx) error {
	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not fetch ad",
			})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ad not found",
		})
	}

	// Check ownership
	if ad.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only edit your own ads",
		})
	}

	var req models.AdCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.City = strings.TrimSpace(req.City)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.TrimSpace(req.Email)
	req.Photos = normalizeAdPhotoURLs(req.Photos)
	if req.Title == "" || !hasMinRunes(req.Title, 5) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title must be at least 5 characters",
		})
	}
	if req.Description == "" || !hasMinRunes(req.Description, 20) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Description must be at least 20 characters",
		})
	}
	if !isValidAdType(req.AdType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad type",
		})
	}
	if !isValidAdCategory(req.Category) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid category",
		})
	}

	// Update fields
	updateMap := map[string]interface{}{
		"ad_type":       req.AdType,
		"category":      req.Category,
		"title":         req.Title,
		"description":   req.Description,
		"price":         req.Price,
		"is_negotiable": req.IsNegotiable,
		"is_free":       req.IsFree,
		"city":          req.City,
		"district":      req.District,
		"show_profile":  req.ShowProfile,
		"phone":         req.Phone,
		"email":         req.Email,
	}

	if isFestivalCategory(req.Category) {
		applyFestivalFieldsToUpdateMap(updateMap, festivalFields)
	} else {
		applyFestivalFieldsToUpdateMap(updateMap, nil)
	}

	if req.Currency != "" {
		normalizedCurrency := strings.ToUpper(strings.TrimSpace(req.Currency))
		if normalizedCurrency == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Currency cannot be empty",
			})
		}
		updateMap["currency"] = normalizedCurrency
	}

	if err := database.DB.Model(&ad).Updates(updateMap).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update ad",
		})
	}

	// Re-geocode if city changed and coordinates not provided
	coordinatesProvided := req.Latitude != nil && req.Longitude != nil
	cityChanged := req.City != "" && req.City != ad.City
	if cityChanged || (req.Latitude == nil && ad.Latitude == nil) || coordinatesProvided {
		targetCity := ad.City
		if req.City != "" {
			targetCity = req.City
		}

		if (req.Latitude == nil || req.Longitude == nil) && targetCity != "" && h.mapService != nil {
			geocoded, err := h.mapService.GeocodeCity(targetCity)
			if err == nil {
				if err := database.DB.Model(&ad).Updates(map[string]interface{}{
					"latitude":  geocoded.Latitude,
					"longitude": geocoded.Longitude,
					"city":      geocoded.City,
				}).Error; err != nil {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
						"error": "Could not update ad location",
					})
				}
			}
		} else if req.Latitude != nil && req.Longitude != nil {
			if err := database.DB.Model(&ad).Updates(map[string]interface{}{
				"latitude":  req.Latitude,
				"longitude": req.Longitude,
			}).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Could not update ad coordinates",
				})
			}
		}
	}

	// Update photos if provided
	if req.Photos != nil {
		if err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Where("ad_id = ?", ad.ID).Delete(&models.AdPhoto{}).Error; err != nil {
				return err
			}

			for i, photoURL := range req.Photos {
				photo := models.AdPhoto{
					AdID:     ad.ID,
					PhotoURL: photoURL,
					Position: i,
				}
				if err := tx.Create(&photo).Error; err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not replace ad photos",
			})
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad updated successfully",
	})
}

// DeleteAd deletes an ad
func (h *AdsHandler) DeleteAd(c *fiber.Ctx) error {
	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not fetch ad",
			})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ad not found",
		})
	}

	// Check ownership (or admin role later)
	if ad.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only delete your own ads",
		})
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("ad_id = ?", ad.ID).Delete(&models.AdPhoto{}).Error; err != nil {
			return err
		}
		if err := tx.Where("ad_id = ?", ad.ID).Delete(&models.AdFavorite{}).Error; err != nil {
			return err
		}
		return tx.Delete(&ad).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not delete ad",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad deleted successfully",
	})
}

// ToggleFavorite adds or removes an ad from favorites
func (h *AdsHandler) ToggleFavorite(c *fiber.Ctx) error {
	adID := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	adIDUint, err := strconv.ParseUint(adID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}
	var ad models.Ad
	if err := database.DB.Select("id").First(&ad, adIDUint).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Ad not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not verify ad",
		})
	}

	isFavorite := false
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Toggle off when favorite exists.
		res := tx.Where("user_id = ? AND ad_id = ?", userID, adIDUint).Delete(&models.AdFavorite{})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected > 0 {
			if err := tx.Model(&models.Ad{}).Where("id = ?", adIDUint).
				Update("favorites_count", gorm.Expr("GREATEST(favorites_count - 1, 0)")).Error; err != nil {
				return err
			}
			isFavorite = false
			return nil
		}

		// Toggle on when favorite is absent.
		favorite := models.AdFavorite{
			UserID: userID,
			AdID:   uint(adIDUint),
		}
		if err := tx.Create(&favorite).Error; err != nil {
			if isDuplicateKeyError(err) {
				isFavorite = true
				return nil
			}
			return err
		}

		if err := tx.Model(&models.Ad{}).Where("id = ?", adIDUint).
			Update("favorites_count", gorm.Expr("favorites_count + 1")).Error; err != nil {
			return err
		}
		isFavorite = true
		return nil
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update favorites",
		})
	}

	return c.JSON(fiber.Map{"isFavorite": isFavorite})
}

// GetFavorites returns user's favorite ads
func (h *AdsHandler) GetFavorites(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var favorites []models.AdFavorite
	if err := database.DB.Where("user_id = ?", userID).Find(&favorites).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch favorites",
		})
	}

	// Get ad IDs
	var adIDs []uint
	for _, f := range favorites {
		adIDs = append(adIDs, f.AdID)
	}

	if len(adIDs) == 0 {
		return c.JSON([]models.AdResponse{})
	}

	// Fetch ads
	var ads []models.Ad
	if err := database.DB.Preload("Photos").Preload("User").Where("id IN ?", adIDs).Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	// Build response
	responses := make([]models.AdResponse, len(ads))
	for i, ad := range ads {
		responses[i] = models.AdResponse{
			Ad:         ad,
			IsFavorite: true,
		}
		if ad.User != nil {
			responses[i].Author = &models.AdAuthor{
				ID:            ad.User.ID,
				SpiritualName: ad.User.SpiritualName,
				KarmicName:    ad.User.KarmicName,
				AvatarURL:     ad.User.AvatarURL,
				City:          ad.User.City,
			}
		}
	}

	return c.JSON(responses)
}

// GetMyAds returns user's own ads
func (h *AdsHandler) GetMyAds(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var ads []models.Ad
	if err := database.DB.Preload("Photos").Where("user_id = ?", userID).Order("created_at DESC").Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	return c.JSON(ads)
}

// GetAdCategories returns available categories
func (h *AdsHandler) GetAdCategories(c *fiber.Ctx) error {
	categories := []map[string]interface{}{
		{"id": "yoga_wellness", "emoji": "🧘", "label": map[string]string{"ru": "Йога и Веллнесс", "en": "Yoga & Wellness"}},
		{"id": "ayurveda", "emoji": "🌿", "label": map[string]string{"ru": "Аюрведа", "en": "Ayurveda"}},
		{"id": "goods", "emoji": "📦", "label": map[string]string{"ru": "Товары", "en": "Goods"}},
		{"id": "services", "emoji": "🛠️", "label": map[string]string{"ru": "Услуги", "en": "Services"}},
		{"id": "housing", "emoji": "🏠", "label": map[string]string{"ru": "Жильё", "en": "Housing"}},
		{"id": "furniture", "emoji": "🪑", "label": map[string]string{"ru": "Мебель", "en": "Furniture"}},
		{"id": "spiritual", "emoji": "🕉️", "label": map[string]string{"ru": "Духовные практики", "en": "Spiritual"}},
		{"id": "education", "emoji": "📚", "label": map[string]string{"ru": "Образование", "en": "Education"}},
		{"id": "events", "emoji": "🎭", "label": map[string]string{"ru": "Мероприятия", "en": "Events"}},
		{"id": "charity", "emoji": "💝", "label": map[string]string{"ru": "Благотворительность", "en": "Charity"}},
	}
	return c.JSON(categories)
}

// GetAdCities returns cities with ads
func (h *AdsHandler) GetAdCities(c *fiber.Ctx) error {
	var cities []string
	if err := database.DB.Model(&models.Ad{}).
		Where("status = ?", "active").
		Distinct().
		Pluck("city", &cities).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch cities",
		})
	}
	return c.JSON(cities)
}

// GetAdStats returns statistics about ads
func (h *AdsHandler) GetAdStats(c *fiber.Ctx) error {
	var totalAds int64
	var activeAds int64

	if err := database.DB.Model(&models.Ad{}).Count(&totalAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not load ad stats",
		})
	}
	if err := database.DB.Model(&models.Ad{}).Where("status = ?", "active").Count(&activeAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not load ad stats",
		})
	}

	// Count by category
	type CategoryCount struct {
		Category string
		Count    int64
	}
	var categoryCounts []CategoryCount
	if err := database.DB.Model(&models.Ad{}).
		Select("category, count(*) as count").
		Where("status = ?", "active").
		Group("category").
		Scan(&categoryCounts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not load category stats",
		})
	}

	byCategory := make(map[string]int64)
	for _, cc := range categoryCounts {
		byCategory[cc.Category] = cc.Count
	}

	// Count by type
	type TypeCount struct {
		AdType string
		Count  int64
	}
	var typeCounts []TypeCount
	if err := database.DB.Model(&models.Ad{}).
		Select("ad_type, count(*) as count").
		Where("status = ?", "active").
		Group("ad_type").
		Scan(&typeCounts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not load type stats",
		})
	}

	byType := make(map[string]int64)
	for _, tc := range typeCounts {
		byType[tc.AdType] = tc.Count
	}

	return c.JSON(models.AdStatsResponse{
		TotalAds:   totalAds,
		ActiveAds:  activeAds,
		ByCategory: byCategory,
		ByType:     byType,
	})
}

// ReportAd reports an ad for moderation
func (h *AdsHandler) ReportAd(c *fiber.Ctx) error {
	adID := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	adIDUint, err := strconv.ParseUint(adID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ad ID",
		})
	}

	var req struct {
		Reason  string `json:"reason"`
		Comment string `json:"comment"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	req.Reason = strings.TrimSpace(req.Reason)
	req.Comment = strings.TrimSpace(req.Comment)
	if req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Reason is required",
		})
	}

	var ad models.Ad
	if err := database.DB.Select("id, user_id").First(&ad, adIDUint).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Ad not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not verify ad",
		})
	}
	if ad.UserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You cannot report your own ad",
		})
	}

	report := models.AdReport{
		AdID:       uint(adIDUint),
		ReporterID: userID,
		Reason:     req.Reason,
		Comment:    req.Comment,
	}

	if err := database.DB.Create(&report).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create report",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Report submitted successfully",
	})
}

// UploadAdPhoto uploads a photo for an ad
func (h *AdsHandler) UploadAdPhoto(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No photo provided",
		})
	}
	contentType := file.Header.Get("Content-Type")
	if !isAllowedAdImageContentType(contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Only image uploads are allowed",
		})
	}
	opened, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Could not open upload",
		})
	}
	sniffBuf := make([]byte, 512)
	readN, readErr := opened.Read(sniffBuf)
	_ = opened.Close()
	if readErr != nil && !errors.Is(readErr, io.EOF) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Could not read upload",
		})
	}
	if readN > 0 {
		contentType = http.DetectContentType(sniffBuf[:readN])
	}
	if !isAllowedAdImageContentType(contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Only image uploads are allowed",
		})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("ads/u%d_%d%s", userID, time.Now().UnixNano(), ext)

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				return c.JSON(fiber.Map{
					"url": imageURL,
				})
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := "./uploads/ads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("ads_u%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/ads/" + filename
	return c.JSON(fiber.Map{
		"url": imageURL,
	})
}

// ContactSeller initiates a chat with the seller
func (h *AdsHandler) ContactSeller(c *fiber.Ctx) error {
	adID := c.Params("id")
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	adIDUint, err := strconv.ParseUint(adID, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var req struct {
		Method string `json:"method"` // "message"
	}
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}
	}
	req.Method = strings.TrimSpace(strings.ToLower(req.Method))
	if req.Method == "" {
		req.Method = "message"
	}

	var ad models.Ad
	if err := database.DB.Preload("User").First(&ad, adIDUint).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch ad"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	if ad.UserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "You cannot message yourself"})
	}

	// Logic for "message" - ensure a private room exists
	if req.Method == "message" {
		var roomID uint
		var roomName string

		// 1. Check for existing private room between these two users
		type Result struct {
			ID   uint
			Name string
		}
		var result Result

		// This query finds a room where both users are members.
		err := database.DB.Raw(`
			SELECT r.id, r.name
			FROM rooms r
			JOIN room_members rm1 ON r.id = rm1.room_id
			JOIN room_members rm2 ON r.id = rm2.room_id
			WHERE r.is_public = false 
			AND rm1.user_id = ? 
			AND rm2.user_id = ?
			AND (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) = 2
			LIMIT 1
		`, userID, ad.UserID).Scan(&result).Error

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not search existing chat room"})
		}
		if result.ID != 0 {
			roomID = result.ID
			roomName = result.Name
		} else {
			// 2. Create new private room atomically with members.
			err := database.DB.Transaction(func(tx *gorm.DB) error {
				currentUser := models.User{}
				if err := tx.First(&currentUser, userID).Error; err != nil {
					return err
				}

				sellerName := ad.User.SpiritualName
				if sellerName == "" {
					sellerName = ad.User.KarmicName
				}

				buyerName := currentUser.SpiritualName
				if buyerName == "" {
					buyerName = currentUser.KarmicName
				}

				roomName = fmt.Sprintf("%s & %s", buyerName, sellerName)
				newRoom := models.Room{
					Name:        roomName,
					Description: fmt.Sprintf("Chat regarding ad: %s", ad.Title),
					OwnerID:     userID,
					IsPublic:    false,
					AiEnabled:   false,
				}

				if err := tx.Create(&newRoom).Error; err != nil {
					return err
				}
				roomID = newRoom.ID

				members := []models.RoomMember{
					{RoomID: roomID, UserID: userID, Role: models.RoomRoleOwner},
					{RoomID: roomID, UserID: ad.UserID, Role: models.RoomRoleMember},
				}
				return tx.Create(&members).Error
			})
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create chat room"})
			}
		}

		return c.JSON(fiber.Map{
			"success":  true,
			"roomId":   roomID,
			"roomName": roomName,
			"message":  "Chat room ready",
		})
	}

	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only message method is supported"})
}

// ================== ADMIN ENDPOINTS ==================

// GetAdminAds returns all ads with admin filters (including pending/rejected)
func (h *AdsHandler) GetAdminAds(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	page, limit, offset := parsePagination(c, 100)

	query := database.DB.Model(&models.Ad{}).Preload("Photos").Preload("User")

	// Filter by status (allow all statuses for admin)
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	if status != "" && status != "all" {
		if !isValidAdStatus(models.AdStatus(status)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
		}
		query = query.Where("status = ?", status)
	}

	// Filter by category
	category := strings.TrimSpace(c.Query("category"))
	if category != "" {
		if !isValidAdCategory(models.AdCategory(category)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category"})
		}
		query = query.Where("category = ?", category)
	}

	// Filter by ad type
	adType := strings.TrimSpace(c.Query("adType"))
	if adType != "" {
		if !isValidAdType(models.AdType(adType)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad type"})
		}
		query = query.Where("ad_type = ?", adType)
	}

	// Search
	search := strings.TrimSpace(c.Query("search"))
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Filter by user
	userID := c.Query("userId")
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not count ads",
		})
	}

	switch strings.ToLower(strings.TrimSpace(c.Query("sort"))) {
	case "festival_date_asc":
		query = query.Order("festival_start_at ASC NULLS LAST").Order("created_at DESC")
	case "festival_date_desc":
		query = query.Order("festival_start_at DESC NULLS LAST").Order("created_at DESC")
	default:
		query = query.Order("created_at DESC")
	}

	var ads []models.Ad
	if err := query.Offset(offset).Limit(limit).Find(&ads).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch ads",
		})
	}

	// Build response with author info
	responses := make([]models.AdResponse, len(ads))
	for i, ad := range ads {
		if isFestivalCategory(ad.Category) {
			preachers, err := h.resolveFestivalPreachersForAd(&ad)
			if err != nil {
				log.Printf("[ADS][ADMIN] failed to resolve festival preachers for ad %d: %v", ad.ID, err)
			} else {
				ad.ResolvedPreachers = preachers
			}
		}
		responses[i] = models.AdResponse{
			Ad:     ad,
			Author: buildAdAuthor(ad.User),
		}
	}

	return c.JSON(fiber.Map{
		"ads":        responses,
		"total":      total,
		"page":       page,
		"totalPages": calculateAdTotalPages(total, limit),
	})
}

// UpdateAdStatus updates the status of an ad (approve/reject/archive)
func (h *AdsHandler) UpdateAdStatus(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch ad"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	var req struct {
		Status  string `json:"status"`
		Comment string `json:"comment"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	req.Comment = strings.TrimSpace(req.Comment)

	// Validate status
	validStatuses := map[string]bool{"pending": true, "active": true, "rejected": true, "archived": true}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	// Update ad
	ad.Status = models.AdStatus(req.Status)
	ad.ModerationComment = req.Comment
	now := time.Now().UTC().Format(time.RFC3339)
	ad.ModeratedAt = &now

	if err := database.DB.Save(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad status updated",
		"status":  ad.Status,
	})
}

// AdminUpdateAd allows admin to edit any ad
func (h *AdsHandler) AdminUpdateAd(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch ad"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	var req struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Price       float64 `json:"price"`
		City        string  `json:"city"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.Category = strings.TrimSpace(req.Category)
	req.City = strings.TrimSpace(req.City)

	// Update fields if provided
	if req.Title != "" {
		ad.Title = req.Title
	}
	if req.Description != "" {
		ad.Description = req.Description
	}
	if req.Category != "" {
		if !isValidAdCategory(models.AdCategory(req.Category)) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category"})
		}
		ad.Category = models.AdCategory(req.Category)
	}
	if req.Price > 0 {
		ad.Price = &req.Price
	}
	if req.City != "" {
		ad.City = req.City
	}

	if err := database.DB.Save(&ad).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad updated successfully",
		"ad":      ad,
	})
}

// AdminDeleteAd permanently deletes an ad
func (h *AdsHandler) AdminDeleteAd(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	adID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	var ad models.Ad
	if err := database.DB.First(&ad, adID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch ad"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ad not found"})
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("ad_id = ?", adID).Delete(&models.AdPhoto{}).Error; err != nil {
			return err
		}
		if err := tx.Where("ad_id = ?", adID).Delete(&models.AdFavorite{}).Error; err != nil {
			return err
		}
		if err := tx.Where("ad_id = ?", adID).Delete(&models.AdReport{}).Error; err != nil {
			return err
		}
		return tx.Unscoped().Delete(&ad).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad deleted permanently",
	})
}

// GetAdminStats returns statistics for the admin dashboard
func (h *AdsHandler) GetAdminStats(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var totalAds, pendingAds, activeAds, rejectedAds, archivedAds int64

	if err := database.DB.Model(&models.Ad{}).Count(&totalAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load stats"})
	}
	if err := database.DB.Model(&models.Ad{}).Where("status = ?", "pending").Count(&pendingAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load stats"})
	}
	if err := database.DB.Model(&models.Ad{}).Where("status = ?", "active").Count(&activeAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load stats"})
	}
	if err := database.DB.Model(&models.Ad{}).Where("status = ?", "rejected").Count(&rejectedAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load stats"})
	}
	if err := database.DB.Model(&models.Ad{}).Where("status = ?", "archived").Count(&archivedAds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load stats"})
	}

	// Categories breakdown
	type CategoryCount struct {
		Category string
		Count    int64
	}
	var categoryBreakdown []CategoryCount
	if err := database.DB.Model(&models.Ad{}).
		Select("category, COUNT(*) as count").
		Group("category").
		Scan(&categoryBreakdown).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load category stats"})
	}

	categoriesMap := make(map[string]int64)
	for _, cb := range categoryBreakdown {
		categoriesMap[cb.Category] = cb.Count
	}

	return c.JSON(fiber.Map{
		"total":      totalAds,
		"pending":    pendingAds,
		"active":     activeAds,
		"rejected":   rejectedAds,
		"archived":   archivedAds,
		"categories": categoriesMap,
	})
}
