package services

import (
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

const (
	calendarImportStatusRunning   = "running"
	calendarImportStatusFailed    = "failed"
	calendarImportStatusPublished = "published"

	calendarProviderModeDBImported = "db_imported"
	calendarProviderModeDBCurated  = "db_curated"
	calendarProviderModeDBMissing  = "db_missing"

	calendarScopeModeGlobal   = "global"
	calendarScopeModeTimezone = "timezone"
	calendarScopeModeLocation = "location"

	defaultCalendarImportHorizonMonths = 24
)

type calendarImportTarget struct {
	Organization models.EkadashiOrganization
	Location     locationSnapshot
	ScopeMode    string
	ScopeKey     string
}

type calendarImportFetchResult struct {
	Events    []models.EkadashiDay
	Source    string
	SourceURL string
	Payload   string
}

type CalendarImportService struct {
	db      *gorm.DB
	nowFunc func() time.Time
}

func NewCalendarImportService() *CalendarImportService {
	return &CalendarImportService{
		db:      database.DB,
		nowFunc: time.Now,
	}
}

func isLocationScopedOrganization(orgID string) bool {
	return strings.TrimSpace(orgID) == "iskcon"
}

func buildCalendarScope(org models.EkadashiOrganization, locData locationSnapshot) (string, string, locationSnapshot) {
	location := locationSnapshot{
		TimeZone: strings.TrimSpace(locData.TimeZone),
		City:     strings.TrimSpace(locData.City),
		Country:  strings.TrimSpace(locData.Country),
	}
	if location.TimeZone == "" {
		location.TimeZone = "Asia/Kolkata"
	}

	if isLocationScopedOrganization(org.ID) {
		citySlug := buildVaishnavaCalendarCitySlug(location.City)
		if citySlug == "" {
			return calendarScopeModeLocation, "city_missing|tz:" + strings.ToLower(location.TimeZone), location
		}
		return calendarScopeModeLocation, fmt.Sprintf("city:%s|tz:%s", citySlug, strings.ToLower(location.TimeZone)), location
	}
	return calendarScopeModeTimezone, "tz:" + strings.ToLower(location.TimeZone), location
}

func calendarRangeWindow(now time.Time, horizonMonths int) (time.Time, time.Time) {
	if horizonMonths < 12 {
		horizonMonths = 12
	}
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, horizonMonths-1, 0)
	return start, end
}

func iterateCalendarMonths(start, end time.Time) []time.Time {
	months := make([]time.Time, 0, 24)
	current := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.UTC)
	last := time.Date(end.Year(), end.Month(), 1, 0, 0, 0, 0, time.UTC)
	for !current.After(last) {
		months = append(months, current)
		current = current.AddDate(0, 1, 0)
	}
	return months
}

func nullableCalendarTimeString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func calendarEventModelFromDTO(event models.EkadashiDay, importRunID uint, importVersion, publicationVersion, scopeKey, sourceKind string) models.CalendarEvent {
	return models.CalendarEvent{
		ImportRunID:        importRunID,
		ImportVersion:      importVersion,
		PublicationVersion: publicationVersion,
		OrganizationID:     event.OrganizationID,
		OrganizationName:   event.OrganizationName,
		ScopeKey:           scopeKey,
		Date:               event.Date,
		OrganizationScope:  event.OrganizationScope,
		PersonSlug:         event.PersonSlug,
		ObservanceType:     event.ObservanceType,
		Timezone:           event.Timezone,
		City:               event.City,
		Country:            event.Country,
		EventType:          event.EventType,
		Priority:           event.Priority,
		MarkerStyleKey:     event.MarkerStyleKey,
		IsEkadashi:         event.IsEkadashi,
		IsMahadvadashi:     event.IsMahadvadashi,
		FastStartAt:        nullableCalendarTimeString(event.FastStartAt),
		FastEndAt:          nullableCalendarTimeString(event.FastEndAt),
		ParanaStartAt:      nullableCalendarTimeString(event.ParanaStartAt),
		ParanaEndAt:        nullableCalendarTimeString(event.ParanaEndAt),
		Title:              event.Title,
		Subtitle:           event.Subtitle,
		Notes:              event.Notes,
		DisplayTitle:       event.DisplayTitle,
		DisplaySubtitle:    event.DisplaySubtitle,
		ObservanceNotes:    event.ObservanceNotes,
		Source:             event.Source,
		SourceURL:          event.SourceURL,
		SourceKind:         sourceKind,
	}
}

func calendarEventDTOFromModel(model models.CalendarEvent) models.EkadashiDay {
	dto := models.EkadashiDay{
		Date:              model.Date,
		OrganizationID:    model.OrganizationID,
		OrganizationName:  model.OrganizationName,
		OrganizationScope: model.OrganizationScope,
		PersonSlug:        model.PersonSlug,
		ObservanceType:    model.ObservanceType,
		Timezone:          model.Timezone,
		City:              model.City,
		Country:           model.Country,
		EventType:         model.EventType,
		Priority:          model.Priority,
		MarkerStyleKey:    model.MarkerStyleKey,
		IsEkadashi:        model.IsEkadashi,
		IsMahadvadashi:    model.IsMahadvadashi,
		Title:             model.Title,
		Subtitle:          model.Subtitle,
		Notes:             model.Notes,
		DisplayTitle:      model.DisplayTitle,
		DisplaySubtitle:   model.DisplaySubtitle,
		ObservanceNotes:   model.ObservanceNotes,
		Source:            model.Source,
		SourceURL:         model.SourceURL,
	}
	if trimmed := strings.TrimSpace(model.FastStartAt); trimmed != "" {
		dto.FastStartAt = &trimmed
	}
	if trimmed := strings.TrimSpace(model.FastEndAt); trimmed != "" {
		dto.FastEndAt = &trimmed
	}
	if trimmed := strings.TrimSpace(model.ParanaStartAt); trimmed != "" {
		dto.ParanaStartAt = &trimmed
	}
	if trimmed := strings.TrimSpace(model.ParanaEndAt); trimmed != "" {
		dto.ParanaEndAt = &trimmed
	}
	return dto
}

func validateImportedCalendarEvents(events []models.EkadashiDay, months []time.Time) error {
	if len(events) == 0 {
		return errors.New("no calendar events imported")
	}
	importedEkadashiCount := 0
	for _, event := range events {
		if strings.TrimSpace(event.Date) == "" || strings.TrimSpace(event.EventType) == "" || strings.TrimSpace(event.Title) == "" {
			return fmt.Errorf("calendar event missing required fields for date=%s", event.Date)
		}
		if event.IsEkadashi || event.IsMahadvadashi {
			importedEkadashiCount++
		}
	}
	if importedEkadashiCount < len(months) {
		return fmt.Errorf("insufficient ekadashi coverage: have %d for %d months", importedEkadashiCount, len(months))
	}
	return nil
}

func dedupeCalendarEvents(events []models.EkadashiDay) []models.EkadashiDay {
	if len(events) == 0 {
		return events
	}
	seen := make(map[string]struct{}, len(events))
	result := make([]models.EkadashiDay, 0, len(events))
	for _, event := range events {
		key := strings.Join([]string{
			event.OrganizationID,
			event.Date,
			event.EventType,
			event.PersonSlug,
			event.Title,
		}, "|")
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, event)
	}
	return result
}

func (s *CalendarImportService) fetchMonthForTarget(monthStart time.Time, target calendarImportTarget) (*calendarImportFetchResult, error) {
	switch target.Organization.ID {
	case "iskcon":
		events, payload, pageURL, err := fetchISKCONMonthCalendarSnapshot(monthStart, target.Location, target.Organization)
		if err != nil {
			return nil, err
		}
		return &calendarImportFetchResult{
			Events:    events,
			Source:    "vaishnavacalendar.org",
			SourceURL: pageURL,
			Payload:   payload,
		}, nil
	case "sri_chaitanya_math", "pure_bhakti":
		events, payload, pageURL, err := fetchGosaiMonthCalendarSnapshot(monthStart, target.Location, target.Organization)
		if err != nil {
			return nil, err
		}
		sourceName := gosaiSourceNameForOrganization(target.Organization)
		return &calendarImportFetchResult{
			Events:    events,
			Source:    sourceName,
			SourceURL: pageURL,
			Payload:   payload,
		}, nil
	case "default_vaishnava":
		service := &EkadashiService{db: s.db, nowFunc: s.nowFunc}
		return &calendarImportFetchResult{
			Events:    service.buildMonthDays(monthStart, target.Location, target.Organization),
			Source:    "generated_archive",
			SourceURL: target.Organization.SourceURL,
			Payload:   "",
		}, nil
	default:
		return nil, fmt.Errorf("unsupported organization: %s", target.Organization.ID)
	}
}

func (s *CalendarImportService) buildCuratedEvents(months []time.Time, target calendarImportTarget) []models.EkadashiDay {
	service := &EkadashiService{db: s.db, nowFunc: s.nowFunc}
	result := make([]models.EkadashiDay, 0, len(months)*4)
	for _, monthStart := range months {
		result = append(result, service.buildCommemorativeEvents(monthStart, target.Location, target.Organization)...)
	}
	return result
}

func (s *CalendarImportService) ImportAndPublish(organizationID, city, timezone, country string, horizonMonths int) (*models.CalendarImportRun, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}

	org := resolveEkadashiOrganization(organizationID)
	scopeMode, scopeKey, location := buildCalendarScope(org, locationSnapshot{
		TimeZone: timezone,
		City:     city,
		Country:  country,
	})
	if isLocationScopedOrganization(org.ID) && buildVaishnavaCalendarCitySlug(location.City) == "" {
		return nil, errors.New("city is required for iskcon import")
	}

	now := s.nowFunc().UTC()
	startMonth, endMonth := calendarRangeWindow(now, horizonMonths)
	months := iterateCalendarMonths(startMonth, endMonth)
	importVersion := fmt.Sprintf("%s:%s:%d", org.ID, scopeKey, now.Unix())

	run := models.CalendarImportRun{
		OrganizationID: org.ID,
		ScopeKey:       scopeKey,
		ScopeMode:      scopeMode,
		City:           location.City,
		Country:        location.Country,
		Timezone:       location.TimeZone,
		Source:         strings.TrimSpace(org.Source),
		ImportVersion:  importVersion,
		Status:         calendarImportStatusRunning,
		RangeStart:     startMonth.Format("2006-01"),
		RangeEnd:       endMonth.Format("2006-01"),
	}
	if err := s.db.Create(&run).Error; err != nil {
		return nil, err
	}

	importedEvents := make([]models.EkadashiDay, 0, len(months)*2)
	snapshots := make([]models.CalendarSourceSnapshot, 0, len(months))
	for _, monthStart := range months {
		fetched, err := s.fetchMonthForTarget(monthStart, calendarImportTarget{
			Organization: org,
			Location:     location,
			ScopeMode:    scopeMode,
			ScopeKey:     scopeKey,
		})
		if err != nil {
			finishedAt := now.Format(time.RFC3339)
			_ = s.db.Model(&run).Updates(map[string]any{
				"status":        calendarImportStatusFailed,
				"error_message": err.Error(),
				"finished_at":   finishedAt,
			}).Error
			return nil, err
		}
		importedEvents = append(importedEvents, fetched.Events...)
		if strings.TrimSpace(fetched.Payload) != "" {
			snapshots = append(snapshots, models.CalendarSourceSnapshot{
				ImportRunID:    run.ID,
				OrganizationID: org.ID,
				ScopeKey:       scopeKey,
				ImportVersion:  importVersion,
				Source:         fetched.Source,
				SourceURL:      fetched.SourceURL,
				SnapshotMonth:  monthStart.Format("2006-01"),
				ContentType:    "text/html",
				Payload:        fetched.Payload,
			})
		}
	}

	curatedEvents := s.buildCuratedEvents(months, calendarImportTarget{
		Organization: org,
		Location:     location,
		ScopeMode:    scopeMode,
		ScopeKey:     scopeKey,
	})

	allEvents := dedupeCalendarEvents(importedEvents)
	if err := validateImportedCalendarEvents(allEvents, months); err != nil {
		finishedAt := now.Format(time.RFC3339)
		_ = s.db.Model(&run).Updates(map[string]any{
			"status":        calendarImportStatusFailed,
			"error_message": err.Error(),
			"finished_at":   finishedAt,
		}).Error
		return nil, err
	}
	allEvents = append(allEvents, dedupeCalendarEvents(curatedEvents)...)

	publicationVersion := importVersion
	finishedAt := now.Format(time.RFC3339)
	publishedAt := now.Format(time.RFC3339)

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(snapshots) > 0 {
			if err := tx.Create(&snapshots).Error; err != nil {
				return err
			}
		}

		modelsToCreate := make([]models.CalendarEvent, 0, len(allEvents))
		for _, event := range allEvents {
			normalized := (&EkadashiService{db: s.db, nowFunc: s.nowFunc}).normalizeCalendarEvent(event, org, nil)
			sourceKind := "imported"
			if normalized.EventType == "appearance" || normalized.EventType == "disappearance" {
				sourceKind = "curated"
			}
			modelsToCreate = append(modelsToCreate, calendarEventModelFromDTO(normalized, run.ID, importVersion, publicationVersion, scopeKey, sourceKind))
		}
		if len(modelsToCreate) > 0 {
			if err := tx.CreateInBatches(&modelsToCreate, 100).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&models.CalendarPublication{}).
			Where("organization_id = ? AND scope_key = ? AND is_active = ?", org.ID, scopeKey, true).
			Updates(map[string]any{"is_active": false, "last_error": ""}).Error; err != nil {
			return err
		}

		publication := models.CalendarPublication{
			OrganizationID:     org.ID,
			ScopeKey:           scopeKey,
			ScopeMode:          scopeMode,
			City:               location.City,
			Country:            location.Country,
			Timezone:           location.TimeZone,
			Source:             strings.TrimSpace(org.Source),
			PublicationVersion: publicationVersion,
			ImportRunID:        run.ID,
			IsActive:           true,
			RangeStart:         startMonth.Format("2006-01"),
			RangeEnd:           endMonth.Format("2006-01"),
			EventsCount:        len(modelsToCreate),
			LastSuccessAt:      publishedAt,
		}
		if err := tx.Create(&publication).Error; err != nil {
			return err
		}

		return tx.Model(&run).Updates(map[string]any{
			"status":         calendarImportStatusPublished,
			"imported_count": len(importedEvents),
			"curated_count":  len(curatedEvents),
			"snapshot_count": len(snapshots),
			"finished_at":    finishedAt,
			"published_at":   publishedAt,
			"error_message":  "",
		}).Error
	}); err != nil {
		_ = s.db.Model(&run).Updates(map[string]any{
			"status":        calendarImportStatusFailed,
			"error_message": err.Error(),
			"finished_at":   finishedAt,
		}).Error
		return nil, err
	}

	if err := s.db.First(&run, run.ID).Error; err != nil {
		return nil, err
	}
	return &run, nil
}

func (s *CalendarImportService) LoadPublishedMonth(monthStart time.Time, org models.EkadashiOrganization, locData locationSnapshot) ([]models.EkadashiDay, []models.EkadashiDay, string, models.EkadashiProviderDecision) {
	if s.db == nil {
		return nil, nil, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", "db_unavailable")
	}

	scopeMode, scopeKey, resolvedLocation := buildCalendarScope(org, locData)
	var publication models.CalendarPublication
	if err := s.db.Where("organization_id = ? AND scope_key = ? AND is_active = ?", org.ID, scopeKey, true).
		Order("created_at DESC").
		First(&publication).Error; err != nil {
		reason := "no_published_data"
		if scopeMode == calendarScopeModeLocation && buildVaishnavaCalendarCitySlug(resolvedLocation.City) == "" {
			reason = "location_required"
		}
		return []models.EkadashiDay{}, []models.EkadashiDay{}, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", reason)
	}

	start := monthStart.Format("2006-01-02")
	end := monthStart.AddDate(0, 1, 0).Add(-24 * time.Hour).Format("2006-01-02")
	var rows []models.CalendarEvent
	if err := s.db.Where("publication_version = ? AND organization_id = ? AND scope_key = ? AND date >= ? AND date <= ?",
		publication.PublicationVersion, org.ID, scopeKey, start, end).
		Order("date ASC, priority ASC, title ASC").
		Find(&rows).Error; err != nil {
		return []models.EkadashiDay{}, []models.EkadashiDay{}, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", "db_query_failed")
	}

	events := make([]models.EkadashiDay, 0, len(rows))
	hasImported := false
	hasCurated := false
	for _, row := range rows {
		event := (&EkadashiService{db: s.db, nowFunc: s.nowFunc}).normalizeCalendarEvent(calendarEventDTOFromModel(row), org, nil)
		switch row.SourceKind {
		case "curated":
			hasCurated = true
		default:
			hasImported = hasImported || event.IsEkadashi || event.IsMahadvadashi
		}
		events = append(events, event)
	}

	days := make([]models.EkadashiDay, 0, len(events))
	for _, event := range events {
		if event.IsEkadashi || event.IsMahadvadashi {
			copyDecision := newEkadashiProviderDecision(calendarProviderModeDBImported, "calendar_db", "")
			if !hasImported {
				copyDecision = newEkadashiProviderDecision(calendarProviderModeDBCurated, "calendar_db", "")
			}
			event.ProviderDecision = &copyDecision
			days = append(days, event)
		}
	}

	mode := calendarProviderModeDBImported
	if !hasImported {
		if hasCurated {
			mode = calendarProviderModeDBCurated
		} else {
			mode = calendarProviderModeDBMissing
		}
	}
	decision := newEkadashiProviderDecision(mode, "calendar_db", "")
	if mode == calendarProviderModeDBMissing {
		decision.Reason = "publication_empty"
	}

	generatedFrom := "calendar_db"
	if hasImported && hasCurated {
		generatedFrom = "calendar_db_imported + calendar_db_curated"
	} else if hasCurated && !hasImported {
		generatedFrom = "calendar_db_curated"
	}
	return events, days, generatedFrom, decision
}

func (s *CalendarImportService) ListPublicationStatuses(limit int) ([]models.CalendarPublication, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	if limit <= 0 {
		limit = 50
	}
	var rows []models.CalendarPublication
	err := s.db.Order("organization_id ASC, scope_key ASC, created_at DESC").Limit(limit).Find(&rows).Error
	return rows, err
}

func (s *CalendarImportService) ListRecentImportRuns(limit int) ([]models.CalendarImportRun, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	if limit <= 0 {
		limit = 20
	}
	var rows []models.CalendarImportRun
	err := s.db.Order("created_at DESC").Limit(limit).Find(&rows).Error
	return rows, err
}

func (s *CalendarImportService) discoverTargets() ([]calendarImportTarget, error) {
	targets := make([]calendarImportTarget, 0, 32)
	targetMap := make(map[string]calendarImportTarget)

	addTarget := func(org models.EkadashiOrganization, loc locationSnapshot) {
		scopeMode, scopeKey, normalizedLoc := buildCalendarScope(org, loc)
		if isLocationScopedOrganization(org.ID) && buildVaishnavaCalendarCitySlug(normalizedLoc.City) == "" {
			return
		}
		key := org.ID + "|" + scopeKey
		if _, exists := targetMap[key]; exists {
			return
		}
		targetMap[key] = calendarImportTarget{
			Organization: org,
			Location:     normalizedLoc,
			ScopeMode:    scopeMode,
			ScopeKey:     scopeKey,
		}
	}

	type prefLoc struct {
		OrganizationID string
		City           string
		Country        string
		Timezone       string
	}
	var prefLocations []prefLoc
	if err := s.db.Model(&models.EkadashiPushPreference{}).
		Select("organization_id, city, country, timezone").
		Where("enabled = ?", true).
		Find(&prefLocations).Error; err != nil {
		return nil, err
	}
	for _, row := range prefLocations {
		addTarget(resolveEkadashiOrganization(row.OrganizationID), locationSnapshot{
			TimeZone: row.Timezone,
			City:     row.City,
			Country:  row.Country,
		})
	}

	var userLocations []locationSnapshot
	if err := s.db.Model(&models.User{}).
		Select("distinct city, country, timezone").
		Where("timezone <> ''").
		Find(&userLocations).Error; err != nil {
		return nil, err
	}
	for _, org := range ekadashiOrganizations {
		for _, row := range userLocations {
			addTarget(org, row)
		}
	}

	var publications []models.CalendarPublication
	if err := s.db.Where("is_active = ?", true).Find(&publications).Error; err != nil {
		return nil, err
	}
	for _, row := range publications {
		addTarget(resolveEkadashiOrganization(row.OrganizationID), locationSnapshot{
			TimeZone: row.Timezone,
			City:     row.City,
			Country:  row.Country,
		})
	}

	for _, org := range ekadashiOrganizations {
		addTarget(org, locationSnapshot{TimeZone: "Asia/Kolkata"})
	}

	for _, target := range targetMap {
		targets = append(targets, target)
	}
	sort.Slice(targets, func(i, j int) bool {
		if targets[i].Organization.ID != targets[j].Organization.ID {
			return targets[i].Organization.ID < targets[j].Organization.ID
		}
		return targets[i].ScopeKey < targets[j].ScopeKey
	})
	return targets, nil
}

type EkadashiImportSchedulerService struct {
	importer *CalendarImportService
	ticker   *time.Ticker
	stopChan chan struct{}
	running  bool
	mu       sync.Mutex
}

func NewEkadashiImportSchedulerService() *EkadashiImportSchedulerService {
	return &EkadashiImportSchedulerService{
		importer: NewCalendarImportService(),
		stopChan: make(chan struct{}),
	}
}

func (s *EkadashiImportSchedulerService) Start(interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running {
		log.Println("[EkadashiImportScheduler] Already running")
		return
	}
	s.ticker = time.NewTicker(interval)
	s.running = true
	log.Printf("[EkadashiImportScheduler] Started with interval %v", interval)
	go func() {
		s.RunNightlyIfDue()
		for {
			select {
			case <-s.ticker.C:
				s.RunNightlyIfDue()
			case <-s.stopChan:
				log.Println("[EkadashiImportScheduler] Stopped")
				return
			}
		}
	}()
}

func (s *EkadashiImportSchedulerService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.running {
		return
	}
	s.ticker.Stop()
	close(s.stopChan)
	s.running = false
}

func (s *EkadashiImportSchedulerService) RunNightlyIfDue() {
	if s.importer == nil || s.importer.db == nil {
		return
	}
	now := s.importer.nowFunc().UTC()
	if now.Hour() < 2 {
		return
	}
	today := now.Format("2006-01-02")
	var count int64
	if err := s.importer.db.Model(&models.CalendarImportRun{}).
		Where("status = ? AND DATE(created_at) = ?", calendarImportStatusPublished, today).
		Count(&count).Error; err == nil && count > 0 {
		return
	}

	targets, err := s.importer.discoverTargets()
	if err != nil {
		log.Printf("[EkadashiImportScheduler] discover targets failed: %v", err)
		return
	}
	for _, target := range targets {
		if _, err := s.importer.ImportAndPublish(target.Organization.ID, target.Location.City, target.Location.TimeZone, target.Location.Country, defaultCalendarImportHorizonMonths); err != nil {
			log.Printf("[EkadashiImportScheduler] import failed org=%s scope=%s: %v", target.Organization.ID, target.ScopeKey, err)
		}
	}
}

var ekadashiImportScheduler *EkadashiImportSchedulerService

func GetEkadashiImportScheduler() *EkadashiImportSchedulerService {
	if ekadashiImportScheduler == nil {
		ekadashiImportScheduler = NewEkadashiImportSchedulerService()
	}
	return ekadashiImportScheduler
}

func StartEkadashiImportScheduler() {
	GetEkadashiImportScheduler().Start(time.Hour)
}

func StopEkadashiImportScheduler() {
	GetEkadashiImportScheduler().Stop()
}
