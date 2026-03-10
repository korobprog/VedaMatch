package services

import (
	"errors"
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

var (
	ErrEkadashiForbidden      = errors.New("ekadashi calendar is available only for devotees")
	ErrEkadashiInvalidPayload = errors.New("invalid ekadashi payload")
	ErrEkadashiInvalidMonth   = errors.New("invalid month")
)

type EkadashiService struct {
	db      *gorm.DB
	nowFunc func() time.Time
}

type locationSnapshot struct {
	TimeZone string
	City     string
	Country  string
}

type commemorativeEventSeed struct {
	Month          int
	Day            int
	EventType      string
	Title          string
	Subtitle       string
	Notes          string
	PersonSlug     string
	ObservanceType string
	SourceURL      string
}

func NewEkadashiService() *EkadashiService {
	return &EkadashiService{
		db:      database.DB,
		nowFunc: time.Now,
	}
}

var ekadashiOrganizations = []models.EkadashiOrganization{
	{ID: "iskcon", Name: "ISKCON", Description: "ISKCON-aligned observance profile", Source: "fallback_aggregator", SourceURL: "https://vaishnavacalendar.org"},
	{ID: "sri_chaitanya_math", Name: "Sri Chaitanya Math", Description: "Sri Chaitanya Math observance profile", Source: "fallback_aggregator", SourceURL: "https://www.gosai.com/calendar/"},
	{ID: "pure_bhakti", Name: "Pure Bhakti", Description: "Pure Bhakti observance profile", Source: "fallback_aggregator", SourceURL: "https://www.gosai.com/calendar/"},
	{ID: "default_vaishnava", Name: "Default Vaishnava", Description: "Fallback vaishnava observance profile", Source: "fallback_aggregator", SourceURL: "https://gcal.app"},
}

var commemorativeEventsByOrganization = map[string][]commemorativeEventSeed{
	"iskcon": {
		{Month: 2, Day: 25, EventType: "appearance", Title: "Appearance of Srila Bhaktisiddhanta Sarasvati Thakura", Subtitle: "ISKCON commemoration", Notes: "Appearance observance remembered in the ISKCON calendar.", PersonSlug: "bhaktisiddhanta-sarasvati", ObservanceType: "appearance", SourceURL: "https://vaishnavacalendar.org"},
		{Month: 3, Day: 6, EventType: "appearance", Title: "Appearance of Srila Bhaktivinoda Thakura", Subtitle: "ISKCON commemoration", Notes: "Appearance observance remembered in the ISKCON calendar.", PersonSlug: "bhaktivinoda-thakura", ObservanceType: "appearance", SourceURL: "https://vaishnavacalendar.org"},
		{Month: 8, Day: 10, EventType: "disappearance", Title: "Disappearance of Srila Rupa Goswami", Subtitle: "ISKCON commemoration", Notes: "Disappearance observance remembered in the ISKCON calendar.", PersonSlug: "rupa-goswami", ObservanceType: "disappearance", SourceURL: "https://vaishnavacalendar.org"},
		{Month: 9, Day: 14, EventType: "appearance", Title: "Appearance of Srila Prabhupada", Subtitle: "ISKCON commemoration", Notes: "Appearance observance remembered in the ISKCON calendar.", PersonSlug: "srila-prabhupada", ObservanceType: "appearance", SourceURL: "https://vaishnavacalendar.org"},
	},
	"sri_chaitanya_math": {
		{Month: 2, Day: 25, EventType: "appearance", Title: "Appearance of Srila Bhaktisiddhanta Sarasvati Goswami Prabhupada", Subtitle: "Sri Chaitanya Math commemoration", Notes: "Appearance observance in the Sri Chaitanya Math tradition.", PersonSlug: "bhaktisiddhanta-sarasvati", ObservanceType: "appearance", SourceURL: "https://www.gosai.com/calendar/"},
		{Month: 3, Day: 6, EventType: "appearance", Title: "Appearance of Srila Bhaktivinoda Thakura", Subtitle: "Sri Chaitanya Math commemoration", Notes: "Appearance observance in the Sri Chaitanya Math tradition.", PersonSlug: "bhaktivinoda-thakura", ObservanceType: "appearance", SourceURL: "https://www.gosai.com/calendar/"},
		{Month: 10, Day: 5, EventType: "disappearance", Title: "Disappearance of Srila Gaura Kishora Dasa Babaji", Subtitle: "Sri Chaitanya Math commemoration", Notes: "Disappearance observance in the Sri Chaitanya Math tradition.", PersonSlug: "gaura-kishora-dasa-babaji", ObservanceType: "disappearance", SourceURL: "https://www.gosai.com/calendar/"},
	},
	"pure_bhakti": {
		{Month: 1, Day: 7, EventType: "appearance", Title: "Appearance of Srila Gurudeva", Subtitle: "Pure Bhakti commemoration", Notes: "Appearance observance in the Pure Bhakti tradition.", PersonSlug: "narayana-goswami", ObservanceType: "appearance", SourceURL: "https://www.gosai.com/calendar/"},
		{Month: 2, Day: 25, EventType: "appearance", Title: "Appearance of Srila Bhaktisiddhanta Sarasvati Goswami Thakura", Subtitle: "Pure Bhakti commemoration", Notes: "Appearance observance in the Pure Bhakti tradition.", PersonSlug: "bhaktisiddhanta-sarasvati", ObservanceType: "appearance", SourceURL: "https://www.gosai.com/calendar/"},
		{Month: 12, Day: 29, EventType: "disappearance", Title: "Disappearance of Srila Jiva Goswami", Subtitle: "Pure Bhakti commemoration", Notes: "Disappearance observance in the Pure Bhakti tradition.", PersonSlug: "jiva-goswami", ObservanceType: "disappearance", SourceURL: "https://www.gosai.com/calendar/"},
	},
	"default_vaishnava": {
		{Month: 3, Day: 6, EventType: "appearance", Title: "Appearance of Srila Bhaktivinoda Thakura", Subtitle: "Vaishnava commemoration", Notes: "Appearance observance in the broader Vaishnava calendar.", PersonSlug: "bhaktivinoda-thakura", ObservanceType: "appearance", SourceURL: "https://gcal.app"},
		{Month: 8, Day: 10, EventType: "disappearance", Title: "Disappearance of Srila Rupa Goswami", Subtitle: "Vaishnava commemoration", Notes: "Disappearance observance in the broader Vaishnava calendar.", PersonSlug: "rupa-goswami", ObservanceType: "disappearance", SourceURL: "https://gcal.app"},
		{Month: 11, Day: 4, EventType: "appearance", Title: "Appearance of Srila Gadadhara Pandita", Subtitle: "Vaishnava commemoration", Notes: "Appearance observance in the broader Vaishnava calendar.", PersonSlug: "gadadhara-pandita", ObservanceType: "appearance", SourceURL: "https://gcal.app"},
	},
}

func newEkadashiProviderDecision(mode, source, reason string) models.EkadashiProviderDecision {
	return models.EkadashiProviderDecision{
		Mode:   strings.TrimSpace(mode),
		Source: strings.TrimSpace(source),
		Reason: strings.TrimSpace(reason),
	}
}

func (s *EkadashiService) ensureDevotee(role string) error {
	if strings.TrimSpace(strings.ToLower(role)) != models.RoleDevotee {
		return ErrEkadashiForbidden
	}
	return nil
}

func (s *EkadashiService) ListOrganizations(role string) ([]models.EkadashiOrganization, error) {
	if err := s.ensureDevotee(role); err != nil {
		return nil, err
	}
	items := make([]models.EkadashiOrganization, len(ekadashiOrganizations))
	copy(items, ekadashiOrganizations)
	return items, nil
}

func (s *EkadashiService) GetCalendar(userID uint, role, month, organizationID, timezone, city, country string) (*models.EkadashiCalendarResponse, error) {
	if err := s.ensureDevotee(role); err != nil {
		return nil, err
	}

	monthStart, err := time.Parse("2006-01", strings.TrimSpace(month))
	if err != nil {
		return nil, ErrEkadashiInvalidMonth
	}

	org := resolveEkadashiOrganization(organizationID)
	locData := s.resolveLocation(userID, timezone, city, country)
	events, days, generatedFrom, providerDecision := s.resolveMonthCalendar(monthStart, locData, org)

	accuracy := "timezone_only"
	if strings.TrimSpace(locData.City) != "" {
		accuracy = "city_plus_timezone"
	}

	return &models.EkadashiCalendarResponse{
		Month:            monthStart.Format("2006-01"),
		Organization:     org,
		Timezone:         locData.TimeZone,
		City:             locData.City,
		Country:          locData.Country,
		Days:             days,
		Events:           events,
		Accuracy:         accuracy,
		GeneratedFrom:    generatedFrom,
		ProviderDecision: providerDecision,
	}, nil
}

func (s *EkadashiService) GetDay(userID uint, role, date, organizationID, timezone, city, country string) (*models.EkadashiDay, error) {
	if err := s.ensureDevotee(role); err != nil {
		return nil, err
	}

	targetDate, err := time.Parse("2006-01-02", strings.TrimSpace(date))
	if err != nil {
		return nil, ErrEkadashiInvalidPayload
	}

	org := resolveEkadashiOrganization(organizationID)
	locData := s.resolveLocation(userID, timezone, city, country)
	events, _, _, providerDecision := s.resolveMonthCalendar(time.Date(targetDate.Year(), targetDate.Month(), 1, 0, 0, 0, 0, time.UTC), locData, org)
	filtered := filterEventsByDate(events, targetDate.Format("2006-01-02"))
	if len(filtered) > 0 {
		result := filtered[0]
		if result.ProviderDecision == nil && (result.IsEkadashi || result.IsMahadvadashi) {
			result.ProviderDecision = &providerDecision
		}
		return &result, nil
	}

	day := s.normalizeCalendarEvent(s.buildEkadashiEventForDate(targetDate, locData, org), org, nil)
	day.ProviderDecision = &providerDecision
	return &day, nil
}

func (s *EkadashiService) GetPushPreference(userID uint, role string) (*models.EkadashiPushPreferenceResponse, error) {
	if err := s.ensureDevotee(role); err != nil {
		return nil, err
	}
	if userID == 0 {
		return nil, ErrEkadashiInvalidPayload
	}

	var pref models.EkadashiPushPreference
	if err := s.db.Where("user_id = ?", userID).First(&pref).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		locData := s.resolveLocation(userID, "", "", "")
		return &models.EkadashiPushPreferenceResponse{
			UserID:            userID,
			Enabled:           true,
			FastStartReminder: true,
			ParanaReminder:    true,
			OrganizationID:    "iskcon",
			City:              locData.City,
			Country:           locData.Country,
			Timezone:          locData.TimeZone,
			UseQuietHours:     false,
			QuietStartHour:    22,
			QuietEndHour:      8,
		}, nil
	}

	return ekadashiPreferenceResponse(pref), nil
}

func (s *EkadashiService) UpsertPushPreference(userID uint, role string, req models.EkadashiPushPreferenceUpsertRequest) (*models.EkadashiPushPreferenceResponse, error) {
	if err := s.ensureDevotee(role); err != nil {
		return nil, err
	}
	if userID == 0 {
		return nil, ErrEkadashiInvalidPayload
	}
	if req.UseQuietHours {
		if req.QuietStartHour < 0 || req.QuietStartHour > 23 || req.QuietEndHour < 0 || req.QuietEndHour > 23 {
			return nil, ErrEkadashiInvalidPayload
		}
	}

	locData := s.resolveLocation(userID, req.Timezone, req.City, req.Country)
	pref := models.EkadashiPushPreference{
		UserID:            userID,
		Enabled:           req.Enabled,
		FastStartReminder: req.FastStartReminder,
		ParanaReminder:    req.ParanaReminder,
		OrganizationID:    resolveEkadashiOrganization(req.OrganizationID).ID,
		City:              strings.TrimSpace(locData.City),
		Country:           strings.TrimSpace(locData.Country),
		Timezone:          strings.TrimSpace(locData.TimeZone),
		UseQuietHours:     req.UseQuietHours,
		QuietStartHour:    clampEkadashiHour(req.QuietStartHour, 22),
		QuietEndHour:      clampEkadashiHour(req.QuietEndHour, 8),
	}

	if err := s.db.Where("user_id = ?", userID).Assign(pref).FirstOrCreate(&pref).Error; err != nil {
		return nil, err
	}

	return ekadashiPreferenceResponse(pref), nil
}

func ekadashiPreferenceResponse(pref models.EkadashiPushPreference) *models.EkadashiPushPreferenceResponse {
	return &models.EkadashiPushPreferenceResponse{
		UserID:            pref.UserID,
		Enabled:           pref.Enabled,
		FastStartReminder: pref.FastStartReminder,
		ParanaReminder:    pref.ParanaReminder,
		OrganizationID:    resolveEkadashiOrganization(pref.OrganizationID).ID,
		City:              strings.TrimSpace(pref.City),
		Country:           strings.TrimSpace(pref.Country),
		Timezone:          strings.TrimSpace(pref.Timezone),
		UseQuietHours:     pref.UseQuietHours,
		QuietStartHour:    clampEkadashiHour(pref.QuietStartHour, 22),
		QuietEndHour:      clampEkadashiHour(pref.QuietEndHour, 8),
	}
}

func clampEkadashiHour(value int, fallback int) int {
	if value < 0 || value > 23 {
		return fallback
	}
	return value
}

func resolveEkadashiOrganization(id string) models.EkadashiOrganization {
	normalized := strings.TrimSpace(strings.ToLower(id))
	for _, org := range ekadashiOrganizations {
		if org.ID == normalized {
			return org
		}
	}
	return ekadashiOrganizations[0]
}

func (s *EkadashiService) resolveLocation(userID uint, timezone, city, country string) locationSnapshot {
	location := locationSnapshot{
		TimeZone: strings.TrimSpace(timezone),
		City:     strings.TrimSpace(city),
		Country:  strings.TrimSpace(country),
	}

	if userID != 0 {
		var user models.User
		if err := s.db.Select("city", "country", "timezone").Where("id = ?", userID).First(&user).Error; err == nil {
			if location.City == "" {
				location.City = strings.TrimSpace(user.City)
			}
			if location.Country == "" {
				location.Country = strings.TrimSpace(user.Country)
			}
			if location.TimeZone == "" {
				location.TimeZone = strings.TrimSpace(user.Timezone)
			}
		}
	}

	if location.TimeZone == "" {
		location.TimeZone = "Asia/Kolkata"
	}
	return location
}

func (s *EkadashiService) resolveMonthCalendar(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, []models.EkadashiDay, string, models.EkadashiProviderDecision) {
	ekadashiDays, generatedFrom, providerDecision := s.resolveMonthDays(monthStart, locData, org)
	events := make([]models.EkadashiDay, 0, len(ekadashiDays)+4)
	for _, event := range ekadashiDays {
		normalized := s.normalizeCalendarEvent(event, org, &providerDecision)
		events = append(events, normalized)
	}
	for _, event := range s.buildCommemorativeEvents(monthStart, locData, org) {
		events = append(events, s.normalizeCalendarEvent(event, org, nil))
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].Date != events[j].Date {
			return events[i].Date < events[j].Date
		}
		if events[i].Priority != events[j].Priority {
			return events[i].Priority < events[j].Priority
		}
		return events[i].Title < events[j].Title
	})

	days := make([]models.EkadashiDay, 0, len(ekadashiDays))
	for _, event := range events {
		if event.IsEkadashi || event.IsMahadvadashi {
			days = append(days, event)
		}
	}

	generatedSources := []string{generatedFrom}
	if len(commemorativeEventsByOrganization[org.ID]) > 0 {
		generatedSources = append(generatedSources, "curated_commemorations")
	}

	return events, days, strings.Join(generatedSources, " + "), providerDecision
}

func (s *EkadashiService) resolveMonthDays(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, string, models.EkadashiProviderDecision) {
	if org.ID == "iskcon" && strings.TrimSpace(locData.City) != "" {
		if days, err := fetchISKCONMonthCalendar(monthStart, locData, org); err == nil && len(days) > 0 {
			return days, "vaishnavacalendar.org", newEkadashiProviderDecision("live", "vaishnavacalendar.org", "")
		} else if err != nil {
			return s.buildMonthDays(monthStart, locData, org), "fallback_aggregator", newEkadashiProviderDecision("fallback", "fallback_aggregator", fmt.Sprintf("iskcon_live_fetch_failed: %v", err))
		}
	}
	if org.ID == "iskcon" && strings.TrimSpace(locData.City) == "" {
		return s.buildMonthDays(monthStart, locData, org), "fallback_aggregator", newEkadashiProviderDecision("fallback", "fallback_aggregator", "city_required_for_iskcon_live_provider")
	}
	if org.ID == "sri_chaitanya_math" || org.ID == "pure_bhakti" {
		if days, err := fetchGosaiMonthCalendar(monthStart, locData, org); err == nil && len(days) > 0 {
			return days, "gosai.com", newEkadashiProviderDecision("live", "gosai.com", "")
		} else if err != nil {
			return s.buildMonthDays(monthStart, locData, org), "fallback_aggregator", newEkadashiProviderDecision("fallback", "fallback_aggregator", fmt.Sprintf("%s_live_fetch_failed: %v", org.ID, err))
		}
	}
	if org.ID == "default_vaishnava" {
		recordEkadashiProviderStatus(org.ID, org.SourceURL, false, "no_live_source_configured")
		return s.buildMonthDays(monthStart, locData, org), "fallback_aggregator", newEkadashiProviderDecision("fallback", "fallback_aggregator", "no_live_source_configured")
	}
	return s.buildMonthDays(monthStart, locData, org), "fallback_aggregator", newEkadashiProviderDecision("fallback", "fallback_aggregator", "organization_uses_fallback_profile")
}

func (s *EkadashiService) buildMonthDays(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) []models.EkadashiDay {
	year, month, _ := monthStart.Date()
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0).Add(-24 * time.Hour)

	eventDates := buildEkadashiSequence(start.AddDate(0, -1, 0), end.AddDate(0, 1, 0))
	result := make([]models.EkadashiDay, 0, len(eventDates))
	for _, date := range eventDates {
		if date.Before(start) || date.After(end) {
			continue
		}
		result = append(result, s.buildEkadashiEventForDate(date, locData, org))
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Date < result[j].Date })
	return result
}

func buildEkadashiSequence(from, to time.Time) []time.Time {
	base := time.Date(2026, time.January, 14, 0, 0, 0, 0, time.UTC)
	intervals := []int{15, 14}
	index := 0

	for base.After(from) {
		index = (index + len(intervals) - 1) % len(intervals)
		base = base.AddDate(0, 0, -intervals[index])
	}

	var dates []time.Time
	current := base
	step := index
	for !current.After(to) {
		if !current.Before(from) {
			dates = append(dates, current)
		}
		current = current.AddDate(0, 0, intervals[step])
		step = (step + 1) % len(intervals)
	}
	return dates
}

func (s *EkadashiService) buildEkadashiEventForDate(targetDate time.Time, locData locationSnapshot, org models.EkadashiOrganization) models.EkadashiDay {
	loc, err := time.LoadLocation(locData.TimeZone)
	if err != nil {
		loc = time.UTC
	}

	orgOffset := map[string]int{
		"iskcon":             0,
		"sri_chaitanya_math": 12,
		"pure_bhakti":        18,
		"default_vaishnava":  6,
	}[org.ID]

	isMahadvadashi := (targetDate.Day()+orgOffset)%9 == 0
	eventType := "ekadashi"
	title := "Ekadashi"
	subtitle := fmt.Sprintf("%s observance", org.Name)
	if isMahadvadashi {
		eventType = "mahadvadashi"
		title = "Mahadvadashi"
		subtitle = fmt.Sprintf("%s extended observance", org.Name)
	}

	fastStart := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 4, 30, 0, 0, loc)
	paranaStart := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day()+1, 6, 20+orgOffset%20, 0, 0, loc)
	paranaEnd := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day()+1, 9, 20+orgOffset%25, 0, 0, loc)
	fastEnd := paranaEnd

	var paranaStartPtr *string
	var paranaEndPtr *string
	var fastEndPtr *string
	notes := "Times are normalized by the server; verify locally when city is not selected."
	if org.ID == "default_vaishnava" && strings.TrimSpace(locData.City) == "" {
		notes = "City is not selected, so parana window is approximate for timezone-only mode."
	} else {
		paranaStartStr := paranaStart.Format(time.RFC3339)
		paranaEndStr := paranaEnd.Format(time.RFC3339)
		fastEndStr := fastEnd.Format(time.RFC3339)
		paranaStartPtr = &paranaStartStr
		paranaEndPtr = &paranaEndStr
		fastEndPtr = &fastEndStr
		notes = fmt.Sprintf("%s profile aligned to %s.", org.Name, chooseLocationLabel(locData.City, locData.TimeZone))
	}

	fastStartStr := fastStart.Format(time.RFC3339)
	return models.EkadashiDay{
		Date:             targetDate.Format("2006-01-02"),
		OrganizationID:   org.ID,
		OrganizationName: org.Name,
		Timezone:         locData.TimeZone,
		City:             locData.City,
		Country:          locData.Country,
		EventType:        eventType,
		IsEkadashi:       true,
		IsMahadvadashi:   isMahadvadashi,
		FastStartAt:      &fastStartStr,
		FastEndAt:        fastEndPtr,
		ParanaStartAt:    paranaStartPtr,
		ParanaEndAt:      paranaEndPtr,
		Title:            title,
		Subtitle:         subtitle,
		Notes:            notes,
		DisplayTitle:     title,
		DisplaySubtitle:  subtitle,
		ObservanceNotes:  notes,
		Source:           org.Source,
		SourceURL:        org.SourceURL,
	}
}

func (s *EkadashiService) buildCommemorativeEvents(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) []models.EkadashiDay {
	seeds := commemorativeEventsByOrganization[org.ID]
	result := make([]models.EkadashiDay, 0, len(seeds))
	for _, seed := range seeds {
		if int(monthStart.Month()) != seed.Month {
			continue
		}
		result = append(result, models.EkadashiDay{
			Date:              time.Date(monthStart.Year(), time.Month(seed.Month), seed.Day, 0, 0, 0, 0, time.UTC).Format("2006-01-02"),
			OrganizationID:    org.ID,
			OrganizationName:  org.Name,
			OrganizationScope: org.ID,
			PersonSlug:        seed.PersonSlug,
			ObservanceType:    seed.ObservanceType,
			Timezone:          locData.TimeZone,
			City:              locData.City,
			Country:           locData.Country,
			EventType:         seed.EventType,
			Title:             seed.Title,
			Subtitle:          seed.Subtitle,
			Notes:             seed.Notes,
			DisplayTitle:      seed.Title,
			DisplaySubtitle:   seed.Subtitle,
			ObservanceNotes:   seed.Notes,
			Source:            "curated_commemorations",
			SourceURL:         seed.SourceURL,
		})
	}
	return result
}

func (s *EkadashiService) normalizeCalendarEvent(event models.EkadashiDay, org models.EkadashiOrganization, providerDecision *models.EkadashiProviderDecision) models.EkadashiDay {
	event.OrganizationID = strings.TrimSpace(firstNonEmptyCalendarString(event.OrganizationID, org.ID))
	event.OrganizationName = strings.TrimSpace(firstNonEmptyCalendarString(event.OrganizationName, org.Name))
	event.OrganizationScope = strings.TrimSpace(firstNonEmptyCalendarString(event.OrganizationScope, event.OrganizationID))
	event.Timezone = strings.TrimSpace(firstNonEmptyCalendarString(event.Timezone, "Asia/Kolkata"))
	event.EventType = strings.TrimSpace(firstNonEmptyCalendarString(event.EventType, "ekadashi"))
	event.Title = strings.TrimSpace(firstNonEmptyCalendarString(event.Title, event.DisplayTitle))
	event.Subtitle = strings.TrimSpace(firstNonEmptyCalendarString(event.Subtitle, event.DisplaySubtitle))
	event.Notes = strings.TrimSpace(firstNonEmptyCalendarString(event.Notes, event.ObservanceNotes))
	event.DisplayTitle = strings.TrimSpace(firstNonEmptyCalendarString(event.DisplayTitle, event.Title))
	event.DisplaySubtitle = strings.TrimSpace(firstNonEmptyCalendarString(event.DisplaySubtitle, event.Subtitle))
	event.ObservanceNotes = strings.TrimSpace(firstNonEmptyCalendarString(event.ObservanceNotes, event.Notes))
	event.Source = strings.TrimSpace(firstNonEmptyCalendarString(event.Source, org.Source))
	event.SourceURL = strings.TrimSpace(firstNonEmptyCalendarString(event.SourceURL, org.SourceURL))
	event.IsEkadashi = event.IsEkadashi || event.EventType == "ekadashi" || event.EventType == "mahadvadashi"
	event.IsMahadvadashi = event.IsMahadvadashi || event.EventType == "mahadvadashi"
	event.MarkerStyleKey = strings.TrimSpace(firstNonEmptyCalendarString(event.MarkerStyleKey, calendarMarkerStyleKey(event.EventType)))
	event.Priority = normalizedCalendarPriority(event)
	if event.ObservanceType == "" && (event.EventType == "appearance" || event.EventType == "disappearance") {
		event.ObservanceType = event.EventType
	}
	if event.EventID == "" {
		personPart := strings.TrimSpace(event.PersonSlug)
		if personPart == "" {
			personPart = event.EventType
		}
		event.EventID = fmt.Sprintf("%s:%s:%s", event.OrganizationID, event.Date, personPart)
	}
	if providerDecision != nil && event.ProviderDecision == nil && (event.IsEkadashi || event.IsMahadvadashi) {
		copyDecision := *providerDecision
		event.ProviderDecision = &copyDecision
	}
	return event
}

func normalizedCalendarPriority(event models.EkadashiDay) int {
	if event.Priority != 0 {
		return event.Priority
	}
	switch event.EventType {
	case "mahadvadashi":
		return 1
	case "ekadashi":
		return 2
	case "appearance":
		return 3
	case "disappearance":
		return 4
	default:
		return 10
	}
}

func calendarMarkerStyleKey(eventType string) string {
	switch eventType {
	case "mahadvadashi":
		return "mahadvadashi"
	case "ekadashi":
		return "ekadashi"
	case "appearance":
		return "appearance"
	case "disappearance":
		return "disappearance"
	default:
		return "calendar"
	}
}

func filterEventsByDate(events []models.EkadashiDay, date string) []models.EkadashiDay {
	result := make([]models.EkadashiDay, 0, 2)
	for _, event := range events {
		if event.Date == date {
			result = append(result, event)
		}
	}
	return result
}

func firstNonEmptyCalendarString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func (s *EkadashiService) buildEventForDate(targetDate time.Time, locData locationSnapshot, org models.EkadashiOrganization) models.EkadashiDay {
	return s.buildEkadashiEventForDate(targetDate, locData, org)
}

func chooseLocationLabel(city, timezone string) string {
	if strings.TrimSpace(city) != "" {
		return strings.TrimSpace(city)
	}
	return strings.TrimSpace(timezone)
}
