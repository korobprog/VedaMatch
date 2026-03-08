package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"rag-agent-server/internal/models"
	"sort"
	"strings"

	"gorm.io/gorm"
)

type DhamaService struct {
	db *gorm.DB
}

func NewDhamaService(db *gorm.DB) *DhamaService {
	return &DhamaService{db: db}
}

func normalizeDhamaLocale(requested string) string {
	value := strings.ToLower(strings.TrimSpace(requested))
	switch {
	case strings.HasPrefix(value, "ru"):
		return "ru"
	case strings.HasPrefix(value, "hi"):
		return "hi"
	case strings.HasPrefix(value, "en"):
		return "en"
	default:
		return ""
	}
}

func normalizeHolyPlaceStatus(input string) models.HolyPlaceStatus {
	switch models.HolyPlaceStatus(strings.ToLower(strings.TrimSpace(input))) {
	case models.HolyPlaceStatusPublished:
		return models.HolyPlaceStatusPublished
	case models.HolyPlaceStatusArchived:
		return models.HolyPlaceStatusArchived
	default:
		return models.HolyPlaceStatusDraft
	}
}

func normalizeIndiaCountry(country string) (string, error) {
	trimmed := strings.TrimSpace(country)
	if trimmed == "" {
		return "India", nil
	}
	switch strings.ToLower(trimmed) {
	case "india", "bharat", "in":
		return "India", nil
	default:
		return "", fmt.Errorf("country must be India in dhama v1")
	}
}

func validateHolyPlaceCoordinates(lat, lng float64) error {
	if math.IsNaN(lat) || math.IsInf(lat, 0) || lat < -90 || lat > 90 {
		return fmt.Errorf("invalid latitude")
	}
	if math.IsNaN(lng) || math.IsInf(lng, 0) || lng < -180 || lng > 180 {
		return fmt.Errorf("invalid longitude")
	}
	return nil
}

func slugifyHolyPlace(input string) string {
	raw := strings.ToLower(strings.TrimSpace(input))
	if raw == "" {
		return ""
	}
	var builder strings.Builder
	lastDash := false
	for _, r := range raw {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
			lastDash = false
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				builder.WriteRune('-')
				lastDash = true
			}
		}
	}
	result := strings.Trim(builder.String(), "-")
	return strings.ReplaceAll(result, "--", "-")
}

func parseGalleryJSON(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{}
	}
	var items []string
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		return []string{}
	}
	out := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func marshalGallery(items []string) string {
	if len(items) == 0 {
		return "[]"
	}
	clean := make([]string, 0, len(items))
	for _, item := range items {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			clean = append(clean, trimmed)
		}
	}
	if len(clean) == 0 {
		return "[]"
	}
	payload, err := json.Marshal(clean)
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func availableHolyPlaceLocales(place models.HolyPlace) []string {
	locales := make([]string, 0, 3)
	if strings.TrimSpace(place.TitleRu) != "" {
		locales = append(locales, "ru")
	}
	if strings.TrimSpace(place.TitleEn) != "" {
		locales = append(locales, "en")
	}
	if strings.TrimSpace(place.TitleHi) != "" {
		locales = append(locales, "hi")
	}
	return locales
}

func localizedHolyPlaceField(place models.HolyPlace, locale string, selector func(models.HolyPlace, string) string) string {
	normalized := normalizeDhamaLocale(locale)
	if normalized == "" {
		normalized = "en"
	}
	value := strings.TrimSpace(selector(place, normalized))
	if value != "" {
		return value
	}
	if normalized != "en" {
		if fallback := strings.TrimSpace(selector(place, "en")); fallback != "" {
			return fallback
		}
	}
	return strings.TrimSpace(selector(place, "ru"))
}

func holyPlaceTextSelector(place models.HolyPlace, field string) string {
	switch field {
	case "title_ru":
		return place.TitleRu
	case "title_en":
		return place.TitleEn
	case "title_hi":
		return place.TitleHi
	case "short_ru":
		return place.ShortDescriptionRu
	case "short_en":
		return place.ShortDescriptionEn
	case "short_hi":
		return place.ShortDescriptionHi
	case "description_ru":
		return place.DescriptionRu
	case "description_en":
		return place.DescriptionEn
	case "description_hi":
		return place.DescriptionHi
	case "visit_ru":
		return place.VisitRulesRu
	case "visit_en":
		return place.VisitRulesEn
	case "visit_hi":
		return place.VisitRulesHi
	case "etiquette_ru":
		return place.EtiquetteRu
	case "etiquette_en":
		return place.EtiquetteEn
	case "etiquette_hi":
		return place.EtiquetteHi
	case "tips_ru":
		return place.PilgrimageTipsRu
	case "tips_en":
		return place.PilgrimageTipsEn
	case "tips_hi":
		return place.PilgrimageTipsHi
	case "practices_ru":
		return place.PracticesRu
	case "practices_en":
		return place.PracticesEn
	case "practices_hi":
		return place.PracticesHi
	case "faq_ru":
		return place.FAQRu
	case "faq_en":
		return place.FAQEn
	case "faq_hi":
		return place.FAQHi
	default:
		return ""
	}
}

func selectHolyPlaceLocale(place models.HolyPlace, locale string) models.HolyPlaceLocalizedResponse {
	return models.HolyPlaceLocalizedResponse{
		ID:               place.ID,
		Slug:             place.Slug,
		Status:           place.Status,
		SortOrder:        place.SortOrder,
		IsFeatured:       place.IsFeatured,
		Title:            localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "title_"+l) }),
		ShortDescription: localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "short_"+l) }),
		Description:      localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "description_"+l) }),
		VisitRules:       localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "visit_"+l) }),
		Etiquette:        localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "etiquette_"+l) }),
		PilgrimageTips:   localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "tips_"+l) }),
		Practices:        localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "practices_"+l) }),
		FAQ:              localizedHolyPlaceField(place, locale, func(p models.HolyPlace, l string) string { return holyPlaceTextSelector(p, "faq_"+l) }),
		PlaceType:        place.PlaceType,
		Tradition:        place.Tradition,
		City:             place.City,
		State:            place.State,
		Country:          place.Country,
		Latitude:         place.Latitude,
		Longitude:        place.Longitude,
		BestSeason:       place.BestSeason,
		BestTime:         place.BestTime,
		HeroImageURL:     place.HeroImageURL,
		Gallery:          parseGalleryJSON(place.GalleryJSON),
		Locale:           normalizeDhamaLocale(locale),
		AvailableLocales: availableHolyPlaceLocales(place),
	}
}

func toLinkedMedia(track models.MediaTrack) models.HolyPlaceLinkedMedia {
	return models.HolyPlaceLinkedMedia{
		ID:           track.ID,
		Title:        track.Title,
		Artist:       track.Artist,
		Description:  track.Description,
		Duration:     track.Duration,
		MediaType:    track.MediaType,
		URL:          track.URL,
		ThumbnailURL: track.ThumbnailURL,
	}
}

func toLinkedYatra(yatra models.Yatra) models.HolyPlaceLinkedYatra {
	return models.HolyPlaceLinkedYatra{
		ID:            yatra.ID,
		Title:         yatra.Title,
		Theme:         yatra.Theme,
		Status:        yatra.Status,
		StartDate:     yatra.StartDate,
		EndDate:       yatra.EndDate,
		StartCity:     yatra.StartCity,
		EndCity:       yatra.EndCity,
		CoverImageURL: yatra.CoverImageURL,
	}
}

func buildHolyPlaceAdminResponse(place models.HolyPlace) models.HolyPlaceAdminResponse {
	response := models.HolyPlaceAdminResponse{
		ID:                  place.ID,
		CreatedAt:           place.CreatedAt,
		UpdatedAt:           place.UpdatedAt,
		Slug:                place.Slug,
		Status:              place.Status,
		SortOrder:           place.SortOrder,
		IsFeatured:          place.IsFeatured,
		TitleRu:             place.TitleRu,
		TitleEn:             place.TitleEn,
		TitleHi:             place.TitleHi,
		ShortDescriptionRu:  place.ShortDescriptionRu,
		ShortDescriptionEn:  place.ShortDescriptionEn,
		ShortDescriptionHi:  place.ShortDescriptionHi,
		DescriptionRu:       place.DescriptionRu,
		DescriptionEn:       place.DescriptionEn,
		DescriptionHi:       place.DescriptionHi,
		VisitRulesRu:        place.VisitRulesRu,
		VisitRulesEn:        place.VisitRulesEn,
		VisitRulesHi:        place.VisitRulesHi,
		EtiquetteRu:         place.EtiquetteRu,
		EtiquetteEn:         place.EtiquetteEn,
		EtiquetteHi:         place.EtiquetteHi,
		PilgrimageTipsRu:    place.PilgrimageTipsRu,
		PilgrimageTipsEn:    place.PilgrimageTipsEn,
		PilgrimageTipsHi:    place.PilgrimageTipsHi,
		PracticesRu:         place.PracticesRu,
		PracticesEn:         place.PracticesEn,
		PracticesHi:         place.PracticesHi,
		FAQRu:               place.FAQRu,
		FAQEn:               place.FAQEn,
		FAQHi:               place.FAQHi,
		PlaceType:           place.PlaceType,
		Tradition:           place.Tradition,
		City:                place.City,
		State:               place.State,
		Country:             place.Country,
		Latitude:            place.Latitude,
		Longitude:           place.Longitude,
		BestSeason:          place.BestSeason,
		BestTime:            place.BestTime,
		HeroImageURL:        place.HeroImageURL,
		Gallery:             parseGalleryJSON(place.GalleryJSON),
		LinkedMediaTrackIDs: []uint{},
		LinkedYatraIDs:      []uint{},
		LinkedMedia:         []models.HolyPlaceLinkedMedia{},
		LinkedYatras:        []models.HolyPlaceLinkedYatra{},
	}
	for _, link := range place.MediaLinks {
		response.LinkedMediaTrackIDs = append(response.LinkedMediaTrackIDs, link.MediaTrackID)
		response.LinkedMedia = append(response.LinkedMedia, toLinkedMedia(link.Track))
	}
	for _, link := range place.YatraLinks {
		response.LinkedYatraIDs = append(response.LinkedYatraIDs, link.YatraID)
		response.LinkedYatras = append(response.LinkedYatras, toLinkedYatra(link.Yatra))
	}
	return response
}

func (s *DhamaService) resolveLocale(requested string, viewerID uint) string {
	if normalized := normalizeDhamaLocale(requested); normalized != "" {
		return normalized
	}
	if viewerID != 0 {
		var user struct {
			Language string
		}
		if err := s.db.Model(&models.User{}).Select("language").Where("id = ?", viewerID).Take(&user).Error; err == nil {
			if normalized := normalizeDhamaLocale(user.Language); normalized != "" {
				return normalized
			}
		}
	}
	return "en"
}

func (s *DhamaService) validateAndBuildHolyPlace(req models.HolyPlaceUpsertRequest, current *models.HolyPlace) (*models.HolyPlace, error) {
	titleRu := strings.TrimSpace(req.TitleRu)
	if titleRu == "" {
		return nil, fmt.Errorf("titleRu is required")
	}
	if err := validateHolyPlaceCoordinates(req.Latitude, req.Longitude); err != nil {
		return nil, err
	}
	country, err := normalizeIndiaCountry(req.Country)
	if err != nil {
		return nil, err
	}
	status := normalizeHolyPlaceStatus(req.Status)
	slug := slugifyHolyPlace(req.Slug)
	if slug == "" {
		slug = slugifyHolyPlace(req.TitleEn)
	}
	if slug == "" {
		slug = slugifyHolyPlace(titleRu)
	}
	if slug == "" {
		return nil, fmt.Errorf("slug is required")
	}

	place := &models.HolyPlace{}
	if current != nil {
		*place = *current
	}
	place.Slug = slug
	place.Status = status
	place.SortOrder = req.SortOrder
	place.IsFeatured = req.IsFeatured
	place.TitleRu = titleRu
	place.TitleEn = strings.TrimSpace(req.TitleEn)
	place.TitleHi = strings.TrimSpace(req.TitleHi)
	place.ShortDescriptionRu = strings.TrimSpace(req.ShortDescriptionRu)
	place.ShortDescriptionEn = strings.TrimSpace(req.ShortDescriptionEn)
	place.ShortDescriptionHi = strings.TrimSpace(req.ShortDescriptionHi)
	place.DescriptionRu = strings.TrimSpace(req.DescriptionRu)
	place.DescriptionEn = strings.TrimSpace(req.DescriptionEn)
	place.DescriptionHi = strings.TrimSpace(req.DescriptionHi)
	place.VisitRulesRu = strings.TrimSpace(req.VisitRulesRu)
	place.VisitRulesEn = strings.TrimSpace(req.VisitRulesEn)
	place.VisitRulesHi = strings.TrimSpace(req.VisitRulesHi)
	place.EtiquetteRu = strings.TrimSpace(req.EtiquetteRu)
	place.EtiquetteEn = strings.TrimSpace(req.EtiquetteEn)
	place.EtiquetteHi = strings.TrimSpace(req.EtiquetteHi)
	place.PilgrimageTipsRu = strings.TrimSpace(req.PilgrimageTipsRu)
	place.PilgrimageTipsEn = strings.TrimSpace(req.PilgrimageTipsEn)
	place.PilgrimageTipsHi = strings.TrimSpace(req.PilgrimageTipsHi)
	place.PracticesRu = strings.TrimSpace(req.PracticesRu)
	place.PracticesEn = strings.TrimSpace(req.PracticesEn)
	place.PracticesHi = strings.TrimSpace(req.PracticesHi)
	place.FAQRu = strings.TrimSpace(req.FAQRu)
	place.FAQEn = strings.TrimSpace(req.FAQEn)
	place.FAQHi = strings.TrimSpace(req.FAQHi)
	place.PlaceType = strings.TrimSpace(req.PlaceType)
	place.Tradition = strings.TrimSpace(req.Tradition)
	place.City = strings.TrimSpace(req.City)
	place.State = strings.TrimSpace(req.State)
	place.Country = country
	place.Latitude = req.Latitude
	place.Longitude = req.Longitude
	place.BestSeason = strings.TrimSpace(req.BestSeason)
	place.BestTime = strings.TrimSpace(req.BestTime)
	place.HeroImageURL = strings.TrimSpace(req.HeroImageURL)
	place.GalleryJSON = marshalGallery(req.Gallery)

	if place.City == "" || place.State == "" || place.PlaceType == "" {
		return nil, fmt.Errorf("placeType, city and state are required")
	}
	return place, nil
}

func (s *DhamaService) syncHolyPlaceRelations(placeID uint, mediaTrackIDs, yatraIDs []uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("holy_place_id = ?", placeID).Delete(&models.HolyPlaceMediaLink{}).Error; err != nil {
			return err
		}
		if err := tx.Where("holy_place_id = ?", placeID).Delete(&models.HolyPlaceYatraLink{}).Error; err != nil {
			return err
		}

		for idx, trackID := range mediaTrackIDs {
			if trackID == 0 {
				continue
			}
			link := models.HolyPlaceMediaLink{
				HolyPlaceID:  placeID,
				MediaTrackID: trackID,
				SortOrder:    idx,
			}
			if err := tx.Create(&link).Error; err != nil {
				return err
			}
		}
		for idx, yatraID := range yatraIDs {
			if yatraID == 0 {
				continue
			}
			link := models.HolyPlaceYatraLink{
				HolyPlaceID: placeID,
				YatraID:     yatraID,
				SortOrder:   idx,
			}
			if err := tx.Create(&link).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *DhamaService) preloadHolyPlaceRelations(query *gorm.DB) *gorm.DB {
	return query.
		Preload("MediaLinks", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC").Preload("Track")
		}).
		Preload("YatraLinks", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC").Preload("Yatra")
		})
}

func (s *DhamaService) ListPublicHolyPlaces(filters models.HolyPlaceFilters, requestedLocale string, viewerID uint) ([]models.HolyPlaceLocalizedResponse, int64, string, error) {
	locale := s.resolveLocale(requestedLocale, viewerID)
	var places []models.HolyPlace
	var total int64

	query := s.db.Model(&models.HolyPlace{}).Where("status = ?", models.HolyPlaceStatusPublished)
	query = applyHolyPlaceFilters(query, filters)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, locale, err
	}

	page := filters.Page
	if page <= 0 {
		page = 1
	}
	limit := filters.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	if err := s.preloadHolyPlaceRelations(query).
		Order("is_featured DESC, sort_order ASC, created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&places).Error; err != nil {
		return nil, 0, locale, err
	}

	items := make([]models.HolyPlaceLocalizedResponse, 0, len(places))
	for _, place := range places {
		item := selectHolyPlaceLocale(place, locale)
		items = append(items, item)
	}
	return items, total, locale, nil
}

func (s *DhamaService) GetPublicHolyPlaceBySlug(slug string, requestedLocale string, viewerID uint) (*models.HolyPlaceLocalizedResponse, error) {
	locale := s.resolveLocale(requestedLocale, viewerID)
	var place models.HolyPlace
	if err := s.preloadHolyPlaceRelations(s.db).
		Where("slug = ? AND status = ?", strings.TrimSpace(slug), models.HolyPlaceStatusPublished).
		First(&place).Error; err != nil {
		return nil, err
	}

	response := selectHolyPlaceLocale(place, locale)
	for _, link := range place.MediaLinks {
		response.LinkedMedia = append(response.LinkedMedia, toLinkedMedia(link.Track))
	}
	for _, link := range place.YatraLinks {
		response.LinkedYatras = append(response.LinkedYatras, toLinkedYatra(link.Yatra))
	}
	return &response, nil
}

func (s *DhamaService) GetPublicHolyPlaceMapMarkers(filters models.HolyPlaceFilters, requestedLocale string, viewerID uint) ([]models.HolyPlaceMapMarker, string, error) {
	locale := s.resolveLocale(requestedLocale, viewerID)
	var places []models.HolyPlace
	query := s.db.Model(&models.HolyPlace{}).Where("status = ?", models.HolyPlaceStatusPublished)
	query = applyHolyPlaceFilters(query, filters)
	if err := query.Order("is_featured DESC, sort_order ASC, created_at DESC").Find(&places).Error; err != nil {
		return nil, locale, err
	}
	markers := make([]models.HolyPlaceMapMarker, 0, len(places))
	for _, place := range places {
		localized := selectHolyPlaceLocale(place, locale)
		markers = append(markers, models.HolyPlaceMapMarker{
			ID:               place.ID,
			Slug:             place.Slug,
			Title:            localized.Title,
			ShortDescription: localized.ShortDescription,
			PlaceType:        place.PlaceType,
			City:             place.City,
			State:            place.State,
			Latitude:         place.Latitude,
			Longitude:        place.Longitude,
			HeroImageURL:     place.HeroImageURL,
			IsFeatured:       place.IsFeatured,
		})
	}
	return markers, locale, nil
}

func applyHolyPlaceFilters(query *gorm.DB, filters models.HolyPlaceFilters) *gorm.DB {
	if search := strings.TrimSpace(filters.Search); search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		query = query.Where(`LOWER(slug) LIKE ? OR LOWER(title_ru) LIKE ? OR LOWER(title_en) LIKE ? OR LOWER(title_hi) LIKE ? OR LOWER(city) LIKE ? OR LOWER(state) LIKE ?`,
			pattern, pattern, pattern, pattern, pattern, pattern)
	}
	if placeType := strings.TrimSpace(filters.PlaceType); placeType != "" {
		query = query.Where("LOWER(place_type) = ?", strings.ToLower(placeType))
	}
	if state := strings.TrimSpace(filters.State); state != "" {
		query = query.Where("LOWER(state) = ?", strings.ToLower(state))
	}
	if city := strings.TrimSpace(filters.City); city != "" {
		query = query.Where("LOWER(city) = ?", strings.ToLower(city))
	}
	if tradition := strings.TrimSpace(filters.Tradition); tradition != "" {
		query = query.Where("LOWER(tradition) = ?", strings.ToLower(tradition))
	}
	if filters.Featured != nil {
		query = query.Where("is_featured = ?", *filters.Featured)
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.LatMin != nil {
		query = query.Where("latitude >= ?", *filters.LatMin)
	}
	if filters.LatMax != nil {
		query = query.Where("latitude <= ?", *filters.LatMax)
	}
	if filters.LngMin != nil {
		query = query.Where("longitude >= ?", *filters.LngMin)
	}
	if filters.LngMax != nil {
		query = query.Where("longitude <= ?", *filters.LngMax)
	}
	return query
}

func (s *DhamaService) GetHolyPlaceFilters() (*models.HolyPlaceFiltersResponse, error) {
	var rows []models.HolyPlace
	if err := s.db.Model(&models.HolyPlace{}).
		Where("status = ?", models.HolyPlaceStatusPublished).
		Select("place_type, state, city, tradition").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	typesSet := map[string]struct{}{}
	statesSet := map[string]struct{}{}
	citiesSet := map[string]struct{}{}
	traditionsSet := map[string]struct{}{}
	for _, row := range rows {
		if value := strings.TrimSpace(row.PlaceType); value != "" {
			typesSet[value] = struct{}{}
		}
		if value := strings.TrimSpace(row.State); value != "" {
			statesSet[value] = struct{}{}
		}
		if value := strings.TrimSpace(row.City); value != "" {
			citiesSet[value] = struct{}{}
		}
		if value := strings.TrimSpace(row.Tradition); value != "" {
			traditionsSet[value] = struct{}{}
		}
	}

	response := &models.HolyPlaceFiltersResponse{
		Types:      setToSortedSlice(typesSet),
		States:     setToSortedSlice(statesSet),
		Cities:     setToSortedSlice(citiesSet),
		Traditions: setToSortedSlice(traditionsSet),
	}
	return response, nil
}

func setToSortedSlice(values map[string]struct{}) []string {
	out := make([]string, 0, len(values))
	for key := range values {
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func (s *DhamaService) CreateHolyPlace(req models.HolyPlaceUpsertRequest) (*models.HolyPlaceAdminResponse, error) {
	place, err := s.validateAndBuildHolyPlace(req, nil)
	if err != nil {
		return nil, err
	}
	if err := s.db.Create(place).Error; err != nil {
		return nil, err
	}
	if err := s.syncHolyPlaceRelations(place.ID, req.LinkedMediaTrackIDs, req.LinkedYatraIDs); err != nil {
		return nil, err
	}
	return s.GetAdminHolyPlace(place.ID)
}

func (s *DhamaService) UpdateHolyPlace(id uint, req models.HolyPlaceUpsertRequest) (*models.HolyPlaceAdminResponse, error) {
	var current models.HolyPlace
	if err := s.db.First(&current, id).Error; err != nil {
		return nil, err
	}
	place, err := s.validateAndBuildHolyPlace(req, &current)
	if err != nil {
		return nil, err
	}
	if err := s.db.Save(place).Error; err != nil {
		return nil, err
	}
	if err := s.syncHolyPlaceRelations(place.ID, req.LinkedMediaTrackIDs, req.LinkedYatraIDs); err != nil {
		return nil, err
	}
	return s.GetAdminHolyPlace(place.ID)
}

func (s *DhamaService) ListAdminHolyPlaces(filters models.HolyPlaceFilters) ([]models.HolyPlaceAdminResponse, int64, error) {
	var places []models.HolyPlace
	var total int64
	query := s.db.Model(&models.HolyPlace{})
	query = applyHolyPlaceFilters(query, filters)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	limit := filters.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if err := s.preloadHolyPlaceRelations(query).
		Order("is_featured DESC, sort_order ASC, created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&places).Error; err != nil {
		return nil, 0, err
	}
	items := make([]models.HolyPlaceAdminResponse, 0, len(places))
	for _, place := range places {
		items = append(items, buildHolyPlaceAdminResponse(place))
	}
	return items, total, nil
}

func (s *DhamaService) GetAdminHolyPlace(id uint) (*models.HolyPlaceAdminResponse, error) {
	var place models.HolyPlace
	if err := s.preloadHolyPlaceRelations(s.db).First(&place, id).Error; err != nil {
		return nil, err
	}
	response := buildHolyPlaceAdminResponse(place)
	return &response, nil
}

func (s *DhamaService) PublishHolyPlace(id uint) error {
	return s.db.Model(&models.HolyPlace{}).Where("id = ?", id).Update("status", models.HolyPlaceStatusPublished).Error
}

func (s *DhamaService) ArchiveHolyPlace(id uint) error {
	return s.db.Model(&models.HolyPlace{}).Where("id = ?", id).Update("status", models.HolyPlaceStatusArchived).Error
}

func (s *DhamaService) DeleteHolyPlace(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("holy_place_id = ?", id).Delete(&models.HolyPlaceMediaLink{}).Error; err != nil {
			return err
		}
		if err := tx.Where("holy_place_id = ?", id).Delete(&models.HolyPlaceYatraLink{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.HolyPlace{}, id).Error
	})
}

func (s *DhamaService) AttachMedia(placeID, mediaTrackID uint) error {
	if placeID == 0 || mediaTrackID == 0 {
		return errors.New("holyPlaceId and mediaTrackId are required")
	}
	var existing models.HolyPlaceMediaLink
	if err := s.db.Where("holy_place_id = ? AND media_track_id = ?", placeID, mediaTrackID).First(&existing).Error; err == nil {
		return nil
	}
	var maxSort int
	_ = s.db.Model(&models.HolyPlaceMediaLink{}).Where("holy_place_id = ?", placeID).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort).Error
	link := models.HolyPlaceMediaLink{HolyPlaceID: placeID, MediaTrackID: mediaTrackID, SortOrder: maxSort + 1}
	return s.db.Create(&link).Error
}

func (s *DhamaService) DetachMedia(placeID, mediaTrackID uint) error {
	return s.db.Where("holy_place_id = ? AND media_track_id = ?", placeID, mediaTrackID).Delete(&models.HolyPlaceMediaLink{}).Error
}

func (s *DhamaService) AttachYatra(placeID, yatraID uint) error {
	if placeID == 0 || yatraID == 0 {
		return errors.New("holyPlaceId and yatraId are required")
	}
	var existing models.HolyPlaceYatraLink
	if err := s.db.Where("holy_place_id = ? AND yatra_id = ?", placeID, yatraID).First(&existing).Error; err == nil {
		return nil
	}
	var maxSort int
	_ = s.db.Model(&models.HolyPlaceYatraLink{}).Where("holy_place_id = ?", placeID).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort).Error
	link := models.HolyPlaceYatraLink{HolyPlaceID: placeID, YatraID: yatraID, SortOrder: maxSort + 1}
	return s.db.Create(&link).Error
}

func (s *DhamaService) DetachYatra(placeID, yatraID uint) error {
	return s.db.Where("holy_place_id = ? AND yatra_id = ?", placeID, yatraID).Delete(&models.HolyPlaceYatraLink{}).Error
}
