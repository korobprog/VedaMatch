package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
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

	calendarTargetStatusMissing   = "missing"
	calendarTargetStatusQueued    = "queued"
	calendarTargetStatusRunning   = "running"
	calendarTargetStatusPublished = "published"
	calendarTargetStatusFailed    = "failed"

	defaultCalendarImportHorizonMonths = 12
	calendarSourceKindImported         = "imported"
	calendarSourceKindCurated          = "curated"
	calendarSourceKindGenerated        = "generated"
	calendarReviewSnapshotSource       = "calendar_review"
	calendarCuratedObservanceSource    = "curated_observances"
	calendarGeneratedArchiveSource     = "generated_archive"
)

var calendarImportQueue sync.Map

type calendarImportTarget struct {
	Organization models.EkadashiOrganization
	Location     locationSnapshot
	ScopeMode    string
	ScopeKey     string
}

type calendarImportFetchResult struct {
	Events     []models.EkadashiDay
	Source     string
	SourceURL  string
	Payload    string
	SourceKind string
	TrustScore int
}

type calendarNormalizationCandidate struct {
	Event        models.EkadashiDay
	SourceName   string
	SourceURL    string
	SourceKind   string
	TrustScore   int
	ConflictKey  string
	Fingerprint  string
	SourceReason string
}

type calendarNormalizationConflict struct {
	ConflictKey    string   `json:"conflictKey"`
	Date           string   `json:"date"`
	OrganizationID string   `json:"organizationId"`
	EventType      string   `json:"eventType"`
	WinnerSource   string   `json:"winnerSource"`
	WinnerKind     string   `json:"winnerKind"`
	WinnerTrust    int      `json:"winnerTrust"`
	LoserSources   []string `json:"loserSources"`
	Reason         string   `json:"reason"`
}

type calendarPublishReviewMetadata struct {
	OrganizationID string                          `json:"organizationId"`
	ScopeKey       string                          `json:"scopeKey"`
	ScopeMode      string                          `json:"scopeMode"`
	RangeStart     string                          `json:"rangeStart"`
	RangeEnd       string                          `json:"rangeEnd"`
	ImportedCount  int                             `json:"importedCount"`
	CuratedCount   int                             `json:"curatedCount"`
	SnapshotCount  int                             `json:"snapshotCount"`
	PublishedCount int                             `json:"publishedCount"`
	ReviewRequired bool                            `json:"reviewRequired"`
	ReviewNotes    []string                        `json:"reviewNotes,omitempty"`
	MissingMonths  []string                        `json:"missingMonths,omitempty"`
	SourceSummary  map[string]int                  `json:"sourceSummary"`
	SourceTrust    map[string]int                  `json:"sourceTrust"`
	Conflicts      []calendarNormalizationConflict `json:"conflicts,omitempty"`
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
		CanonicalSlug:      event.CanonicalSlug,
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
		SourceConfidence:   event.SourceConfidence,
	}
}

func calendarEventDTOFromModel(model models.CalendarEvent) models.EkadashiDay {
	dto := models.EkadashiDay{
		Date:              model.Date,
		OrganizationID:    model.OrganizationID,
		OrganizationName:  model.OrganizationName,
		OrganizationScope: model.OrganizationScope,
		PersonSlug:        model.PersonSlug,
		CanonicalSlug:     model.CanonicalSlug,
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
		SourceConfidence:  model.SourceConfidence,
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

func calendarSourceKindForFetch(orgID string, source string) string {
	normalizedSource := strings.ToLower(strings.TrimSpace(source))
	switch normalizedSource {
	case calendarCuratedObservanceSource:
		return calendarSourceKindCurated
	case calendarGeneratedArchiveSource:
		return calendarSourceKindGenerated
	}
	if strings.TrimSpace(orgID) == "default_vaishnava" {
		return calendarSourceKindGenerated
	}
	return calendarSourceKindImported
}

func calendarSourceTrustScore(sourceKind, sourceName, eventType string) int {
	kind := strings.ToLower(strings.TrimSpace(sourceKind))
	name := strings.ToLower(strings.TrimSpace(sourceName))
	event := strings.ToLower(strings.TrimSpace(eventType))

	switch kind {
	case calendarSourceKindCurated:
		if event == "appearance" || event == "disappearance" {
			return 100
		}
		return 74
	case calendarSourceKindGenerated:
		if event == "ekadashi" || event == "mahadvadashi" {
			return 84
		}
		return 68
	default:
		switch name {
		case "vaishnavacalendar.org":
			return 95
		case "scsmath.com":
			return 93
		case "gosai.com":
			return 92
		case "curated_observances":
			if event == "appearance" || event == "disappearance" {
				return 100
			}
			return 72
		default:
			if event == "appearance" || event == "disappearance" {
				return 78
			}
			return 80
		}
	}
}

func calendarSourceKindRank(sourceKind string) int {
	switch strings.ToLower(strings.TrimSpace(sourceKind)) {
	case calendarSourceKindCurated:
		return 3
	case calendarSourceKindImported:
		return 2
	case calendarSourceKindGenerated:
		return 1
	default:
		return 0
	}
}

func calendarEventConflictKey(event models.EkadashiDay) string {
	orgID := strings.TrimSpace(event.OrganizationID)
	date := strings.TrimSpace(event.Date)
	eventType := strings.ToLower(strings.TrimSpace(event.EventType))
	personSlug := strings.TrimSpace(event.PersonSlug)
	if eventType == "ekadashi" || eventType == "mahadvadashi" {
		return strings.Join([]string{orgID, date, eventType}, "|")
	}
	if personSlug != "" {
		return strings.Join([]string{orgID, date, eventType, personSlug}, "|")
	}
	title := normalizeCalendarConflictValue(event.DisplayTitle)
	if title == "" {
		title = normalizeCalendarConflictValue(event.Title)
	}
	return strings.Join([]string{orgID, date, eventType, title}, "|")
}

func normalizeCalendarConflictValue(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.Join(strings.Fields(value), " ")
	return value
}

func calendarEventFingerprint(event models.EkadashiDay) string {
	values := []string{
		strings.TrimSpace(event.Date),
		strings.TrimSpace(event.OrganizationID),
		strings.TrimSpace(event.EventType),
		strings.TrimSpace(event.PersonSlug),
		strings.TrimSpace(event.ObservanceType),
		strings.TrimSpace(event.Title),
		strings.TrimSpace(event.Subtitle),
		strings.TrimSpace(event.Notes),
		strings.TrimSpace(event.DisplayTitle),
		strings.TrimSpace(event.DisplaySubtitle),
		strings.TrimSpace(event.ObservanceNotes),
		strings.TrimSpace(event.Source),
		strings.TrimSpace(event.SourceURL),
	}
	if event.FastStartAt != nil {
		values = append(values, strings.TrimSpace(*event.FastStartAt))
	}
	if event.FastEndAt != nil {
		values = append(values, strings.TrimSpace(*event.FastEndAt))
	}
	if event.ParanaStartAt != nil {
		values = append(values, strings.TrimSpace(*event.ParanaStartAt))
	}
	if event.ParanaEndAt != nil {
		values = append(values, strings.TrimSpace(*event.ParanaEndAt))
	}
	hash := fnv.New64a()
	_, _ = hash.Write([]byte(strings.Join(values, "\x1f")))
	return fmt.Sprintf("%x", hash.Sum64())
}

func (s *CalendarImportService) normalizeFetchedEvent(raw models.EkadashiDay, org models.EkadashiOrganization, source calendarImportFetchResult) models.EkadashiDay {
	event := (&EkadashiService{db: s.db, nowFunc: s.nowFunc}).normalizeCalendarEvent(raw, org, nil)
	if strings.TrimSpace(event.Source) == "" {
		event.Source = strings.TrimSpace(source.Source)
	}
	if strings.TrimSpace(event.SourceURL) == "" {
		event.SourceURL = strings.TrimSpace(source.SourceURL)
	}
	if event.SourceConfidence <= 0 {
		event.SourceConfidence = calendarSourceTrustScore(strings.TrimSpace(source.SourceKind), strings.TrimSpace(source.Source), strings.TrimSpace(event.EventType))
	}
	return event
}

func (s *CalendarImportService) buildCuratedObservanceEvents(months []time.Time, org models.EkadashiOrganization, locData locationSnapshot) []models.EkadashiDay {
	service := &EkadashiService{db: s.db, nowFunc: s.nowFunc}
	result := make([]models.EkadashiDay, 0, len(months)*4)
	for _, monthStart := range months {
		result = append(result, service.buildCommemorativeEvents(monthStart, locData, org)...)
	}
	return result
}

func (s *CalendarImportService) normalizeCalendarImportResults(results []calendarImportFetchResult, months []time.Time, org models.EkadashiOrganization, target calendarImportTarget) ([]models.EkadashiDay, calendarPublishReviewMetadata, []calendarNormalizationConflict) {
	candidates := make([]calendarNormalizationCandidate, 0, 256)
	sourceSummary := make(map[string]int)
	sourceTrust := make(map[string]int)
	importedCount := 0
	curatedCount := 0

	for _, result := range results {
		if len(result.Events) == 0 {
			continue
		}
		sourceKind := strings.TrimSpace(result.SourceKind)
		if sourceKind == "" {
			sourceKind = calendarSourceKindForFetch(org.ID, result.Source)
		}
		trustScore := result.TrustScore
		if trustScore <= 0 {
			trustScore = calendarSourceTrustScore(sourceKind, result.Source, "")
		}
		sourceSummary[sourceKind] += len(result.Events)
		sourceTrust[result.Source] = trustScore
		for _, rawEvent := range result.Events {
			normalized := s.normalizeFetchedEvent(rawEvent, org, result)
			normalized.Source = strings.TrimSpace(firstNonEmptyCalendarString(normalized.Source, result.Source))
			normalized.SourceURL = strings.TrimSpace(firstNonEmptyCalendarString(normalized.SourceURL, result.SourceURL))
			normalized.Priority = normalizedCalendarPriority(normalized)
			if normalized.Source == "" {
				normalized.Source = calendarCuratedObservanceSource
			}
			candidate := calendarNormalizationCandidate{
				Event:       normalized,
				SourceName:  result.Source,
				SourceURL:   result.SourceURL,
				SourceKind:  sourceKind,
				TrustScore:  calendarSourceTrustScore(sourceKind, result.Source, normalized.EventType),
				ConflictKey: calendarEventConflictKey(normalized),
				Fingerprint: calendarEventFingerprint(normalized),
			}
			if candidate.SourceKind == calendarSourceKindCurated {
				curatedCount++
			} else {
				importedCount++
			}
			candidates = append(candidates, candidate)
		}
	}

	resolved, conflicts := resolveCalendarNormalizationCandidates(candidates)
	reviewNotes := make([]string, 0, 4)
	if len(conflicts) > 0 {
		reviewNotes = append(reviewNotes, fmt.Sprintf("%d conflict groups resolved by source ranking", len(conflicts)))
	}
	if curatedCount > 0 {
		reviewNotes = append(reviewNotes, fmt.Sprintf("%d curated observance records applied", curatedCount))
	}
	if importedCount > 0 {
		reviewNotes = append(reviewNotes, fmt.Sprintf("%d imported source records applied", importedCount))
	}

	metadata := calendarPublishReviewMetadata{
		OrganizationID: org.ID,
		ScopeKey:       target.ScopeKey,
		ScopeMode:      target.ScopeMode,
		RangeStart:     monthsRangeStart(months),
		RangeEnd:       monthsRangeEnd(months),
		ImportedCount:  importedCount,
		CuratedCount:   curatedCount,
		SnapshotCount:  0,
		PublishedCount: len(resolved),
		ReviewRequired: len(conflicts) > 0,
		ReviewNotes:    reviewNotes,
		MissingMonths:  monthsMissingEkadashi(resolved, months),
		SourceSummary:  sourceSummary,
		SourceTrust:    sourceTrust,
		Conflicts:      conflicts,
	}
	return resolved, metadata, conflicts
}

func resolveCalendarNormalizationCandidates(candidates []calendarNormalizationCandidate) ([]models.EkadashiDay, []calendarNormalizationConflict) {
	if len(candidates) == 0 {
		return nil, nil
	}

	grouped := make(map[string][]calendarNormalizationCandidate, len(candidates))
	for _, candidate := range candidates {
		grouped[candidate.ConflictKey] = append(grouped[candidate.ConflictKey], candidate)
	}

	keys := make([]string, 0, len(grouped))
	for key := range grouped {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	resolved := make([]models.EkadashiDay, 0, len(candidates))
	conflicts := make([]calendarNormalizationConflict, 0, len(candidates)/2)
	for _, key := range keys {
		group := grouped[key]
		sort.SliceStable(group, func(i, j int) bool {
			if group[i].TrustScore != group[j].TrustScore {
				return group[i].TrustScore > group[j].TrustScore
			}
			if group[i].Event.Priority != group[j].Event.Priority {
				return group[i].Event.Priority < group[j].Event.Priority
			}
			if calendarSourceKindRank(group[i].SourceKind) != calendarSourceKindRank(group[j].SourceKind) {
				return calendarSourceKindRank(group[i].SourceKind) > calendarSourceKindRank(group[j].SourceKind)
			}
			if group[i].Event.Title != group[j].Event.Title {
				return group[i].Event.Title < group[j].Event.Title
			}
			return group[i].SourceName < group[j].SourceName
		})

		winner := group[0]
		resolved = append(resolved, winner.Event)
		if len(group) == 1 {
			continue
		}

		losers := make([]string, 0, len(group)-1)
		hasDivergence := false
		for _, candidate := range group[1:] {
			losers = append(losers, candidate.SourceName)
			if candidate.Fingerprint != winner.Fingerprint {
				hasDivergence = true
			}
		}
		if hasDivergence {
			conflicts = append(conflicts, calendarNormalizationConflict{
				ConflictKey:    key,
				Date:           winner.Event.Date,
				OrganizationID: winner.Event.OrganizationID,
				EventType:      winner.Event.EventType,
				WinnerSource:   winner.SourceName,
				WinnerKind:     winner.SourceKind,
				WinnerTrust:    winner.TrustScore,
				LoserSources:   losers,
				Reason:         "source_payloads_diverged",
			})
		}
	}

	sort.SliceStable(resolved, func(i, j int) bool {
		if resolved[i].Date != resolved[j].Date {
			return resolved[i].Date < resolved[j].Date
		}
		if resolved[i].Priority != resolved[j].Priority {
			return resolved[i].Priority < resolved[j].Priority
		}
		if resolved[i].EventType != resolved[j].EventType {
			return resolved[i].EventType < resolved[j].EventType
		}
		if resolved[i].Title != resolved[j].Title {
			return resolved[i].Title < resolved[j].Title
		}
		return resolved[i].OrganizationID < resolved[j].OrganizationID
	})

	return resolved, conflicts
}

func monthsRangeStart(months []time.Time) string {
	if len(months) == 0 {
		return ""
	}
	return months[0].Format("2006-01")
}

func monthsRangeEnd(months []time.Time) string {
	if len(months) == 0 {
		return ""
	}
	return months[len(months)-1].Format("2006-01")
}

func monthsMissingEkadashi(events []models.EkadashiDay, months []time.Time) []string {
	if len(months) == 0 {
		return nil
	}
	coverage := make(map[string]bool, len(months))
	for _, event := range events {
		if event.IsEkadashi || event.IsMahadvadashi {
			if len(event.Date) >= 7 {
				coverage[event.Date[:7]] = true
			}
		}
	}
	missing := make([]string, 0)
	for _, month := range months {
		key := month.Format("2006-01")
		if !coverage[key] {
			missing = append(missing, key)
		}
	}
	return missing
}

func reviewMetadataSnapshotPayload(metadata calendarPublishReviewMetadata) (string, error) {
	payload, err := json.MarshalIndent(metadata, "", "  ")
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func appendReviewMetadataSnapshot(snapshots []models.CalendarSourceSnapshot, runID uint, org models.EkadashiOrganization, scopeKey string, importVersion string, monthLabel string, metadata calendarPublishReviewMetadata) ([]models.CalendarSourceSnapshot, error) {
	payload, err := reviewMetadataSnapshotPayload(metadata)
	if err != nil {
		return snapshots, err
	}
	snapshots = append(snapshots, models.CalendarSourceSnapshot{
		ImportRunID:    runID,
		OrganizationID: org.ID,
		ScopeKey:       scopeKey,
		ImportVersion:  importVersion,
		Source:         calendarReviewSnapshotSource,
		SourceURL:      "internal://calendar-review",
		SnapshotMonth:  monthLabel,
		ContentType:    "application/json",
		Payload:        payload,
	})
	return snapshots, nil
}

func validateResolvedCalendarEvents(events []models.EkadashiDay, months []time.Time) error {
	if len(events) == 0 {
		return errors.New("no calendar events imported")
	}
	coverage := make(map[string]bool, len(months))
	for _, event := range events {
		if strings.TrimSpace(event.Date) == "" || strings.TrimSpace(event.EventType) == "" || strings.TrimSpace(event.Title) == "" {
			return fmt.Errorf("calendar event missing required fields for date=%s", event.Date)
		}
		if event.IsEkadashi || event.IsMahadvadashi {
			monthKey := event.Date
			if len(monthKey) >= 7 {
				coverage[monthKey[:7]] = true
			}
		}
	}
	missing := make([]string, 0)
	for _, month := range months {
		key := month.Format("2006-01")
		if !coverage[key] {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("insufficient ekadashi coverage: missing %s", strings.Join(missing, ", "))
	}
	return nil
}

func (s *CalendarImportService) fetchMonthForTarget(monthStart time.Time, target calendarImportTarget) (*calendarImportFetchResult, error) {
	switch target.Organization.ID {
	case "iskcon":
		events, payload, pageURL, err := fetchISKCONMonthCalendarSnapshot(monthStart, target.Location, target.Organization)
		if err != nil {
			return nil, err
		}
		return &calendarImportFetchResult{
			Events:     events,
			Source:     "vaishnavacalendar.org",
			SourceURL:  pageURL,
			Payload:    payload,
			SourceKind: calendarSourceKindImported,
			TrustScore: calendarSourceTrustScore(calendarSourceKindImported, "vaishnavacalendar.org", "ekadashi"),
		}, nil
	case "sri_chaitanya_math", "pure_bhakti":
		events, payload, pageURL, err := fetchGosaiMonthCalendarSnapshot(monthStart, target.Location, target.Organization)
		if err != nil {
			return nil, err
		}
		sourceName := gosaiSourceNameForOrganization(target.Organization)
		return &calendarImportFetchResult{
			Events:     events,
			Source:     sourceName,
			SourceURL:  pageURL,
			Payload:    payload,
			SourceKind: calendarSourceKindImported,
			TrustScore: calendarSourceTrustScore(calendarSourceKindImported, sourceName, "ekadashi"),
		}, nil
	case "default_vaishnava":
		service := &EkadashiService{db: s.db, nowFunc: s.nowFunc}
		return &calendarImportFetchResult{
			Events:     service.buildMonthDays(monthStart, target.Location, target.Organization),
			Source:     calendarGeneratedArchiveSource,
			SourceURL:  target.Organization.SourceURL,
			Payload:    "",
			SourceKind: calendarSourceKindGenerated,
			TrustScore: calendarSourceTrustScore(calendarSourceKindGenerated, calendarGeneratedArchiveSource, "ekadashi"),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported organization: %s", target.Organization.ID)
	}
}

func (s *CalendarImportService) upsertImportTarget(target calendarImportTarget, source string, status string, dueAt *time.Time, lastError string) (*models.CalendarImportTarget, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	now := s.nowFunc().UTC()
	record := models.CalendarImportTarget{
		OrganizationID:  target.Organization.ID,
		ScopeKey:        target.ScopeKey,
		ScopeMode:       target.ScopeMode,
		City:            target.Location.City,
		Country:         target.Location.Country,
		Timezone:        target.Location.TimeZone,
		Source:          strings.TrimSpace(source),
		IsActive:        true,
		ImportStatus:    strings.TrimSpace(status),
		LastSeenAt:      &now,
		NextImportDueAt: dueAt,
		LastError:       strings.TrimSpace(lastError),
	}

	var existing models.CalendarImportTarget
	err := s.db.Where("organization_id = ? AND scope_key = ?", target.Organization.ID, target.ScopeKey).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if record.ImportStatus == "" {
			record.ImportStatus = calendarTargetStatusMissing
		}
		if err := s.db.Create(&record).Error; err != nil {
			return nil, err
		}
		return &record, nil
	}
	if err != nil {
		return nil, err
	}

	updates := map[string]any{
		"scope_mode":   target.ScopeMode,
		"city":         target.Location.City,
		"country":      target.Location.Country,
		"timezone":     target.Location.TimeZone,
		"source":       firstNonEmptyCalendarString(strings.TrimSpace(source), existing.Source),
		"is_active":    true,
		"last_seen_at": now,
	}
	if strings.TrimSpace(status) != "" {
		updates["import_status"] = strings.TrimSpace(status)
	}
	if dueAt != nil {
		updates["next_import_due_at"] = *dueAt
	}
	if strings.TrimSpace(lastError) != "" || status == calendarTargetStatusPublished {
		updates["last_error"] = strings.TrimSpace(lastError)
	}
	if err := s.db.Model(&existing).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&existing, existing.ID).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (s *CalendarImportService) markTargetImportResult(target calendarImportTarget, run *models.CalendarImportRun, status string, lastError string) {
	if s.db == nil {
		return
	}
	now := s.nowFunc().UTC()
	updates := map[string]any{
		"import_status":      status,
		"last_error":         strings.TrimSpace(lastError),
		"last_import_run_id": 0,
	}
	if status == calendarTargetStatusPublished {
		updates["last_imported_at"] = now
		updates["next_import_due_at"] = now.Add(24 * time.Hour)
	}
	if run != nil {
		updates["last_import_run_id"] = run.ID
	}
	_ = s.db.Model(&models.CalendarImportTarget{}).
		Where("organization_id = ? AND scope_key = ?", target.Organization.ID, target.ScopeKey).
		Updates(updates).Error
}

func (s *CalendarImportService) enqueueImportTarget(target calendarImportTarget, source string) string {
	if s.db == nil {
		return calendarTargetStatusMissing
	}
	now := s.nowFunc().UTC()
	_, err := s.upsertImportTarget(target, source, calendarTargetStatusQueued, &now, "")
	if err != nil {
		return calendarTargetStatusMissing
	}

	queueKey := target.Organization.ID + "|" + target.ScopeKey
	if _, alreadyRunning := calendarImportQueue.LoadOrStore(queueKey, struct{}{}); alreadyRunning {
		_ = s.db.Model(&models.CalendarImportTarget{}).
			Where("organization_id = ? AND scope_key = ?", target.Organization.ID, target.ScopeKey).
			Updates(map[string]any{"import_status": calendarTargetStatusRunning}).Error
		return calendarTargetStatusRunning
	}

	go func() {
		defer calendarImportQueue.Delete(queueKey)
		_ = s.db.Model(&models.CalendarImportTarget{}).
			Where("organization_id = ? AND scope_key = ?", target.Organization.ID, target.ScopeKey).
			Updates(map[string]any{"import_status": calendarTargetStatusRunning}).Error
		run, runErr := s.ImportAndPublish(target.Organization.ID, target.Location.City, target.Location.TimeZone, target.Location.Country, defaultCalendarImportHorizonMonths)
		if runErr != nil {
			s.markTargetImportResult(target, run, calendarTargetStatusFailed, runErr.Error())
			return
		}
		s.markTargetImportResult(target, run, calendarTargetStatusPublished, "")
	}()

	return calendarTargetStatusQueued
}

func (s *CalendarImportService) targetFromLocation(org models.EkadashiOrganization, locData locationSnapshot) (calendarImportTarget, bool) {
	scopeMode, scopeKey, resolvedLocation := buildCalendarScope(org, locData)
	target := calendarImportTarget{
		Organization: org,
		Location:     resolvedLocation,
		ScopeMode:    scopeMode,
		ScopeKey:     scopeKey,
	}
	if isLocationScopedOrganization(org.ID) && buildVaishnavaCalendarCitySlug(resolvedLocation.City) == "" {
		return target, false
	}
	return target, true
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
	target := calendarImportTarget{
		Organization: org,
		Location:     location,
		ScopeMode:    scopeMode,
		ScopeKey:     scopeKey,
	}
	now := s.nowFunc().UTC()
	if _, err := s.upsertImportTarget(target, "manual", calendarTargetStatusRunning, &now, ""); err != nil {
		return nil, err
	}

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

	rawSources := make([]calendarImportFetchResult, 0, len(months)+1)
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
			s.markTargetImportResult(target, &run, calendarTargetStatusFailed, err.Error())
			return nil, err
		}
		rawSources = append(rawSources, *fetched)
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

	curatedEvents := s.buildCuratedObservanceEvents(months, org, location)
	if len(curatedEvents) > 0 {
		rawSources = append(rawSources, calendarImportFetchResult{
			Events:     curatedEvents,
			Source:     calendarCuratedObservanceSource,
			SourceURL:  "internal://calendar-curated-observances",
			SourceKind: calendarSourceKindCurated,
			TrustScore: calendarSourceTrustScore(calendarSourceKindCurated, calendarCuratedObservanceSource, "appearance"),
		})
	}

	allEvents, reviewMetadata, _ := s.normalizeCalendarImportResults(rawSources, months, org, target)
	if err := validateResolvedCalendarEvents(allEvents, months); err != nil {
		finishedAt := now.Format(time.RFC3339)
		_ = s.db.Model(&run).Updates(map[string]any{
			"status":        calendarImportStatusFailed,
			"error_message": err.Error(),
			"finished_at":   finishedAt,
		}).Error
		s.markTargetImportResult(target, &run, calendarTargetStatusFailed, err.Error())
		return nil, err
	}

	publicationVersion := importVersion
	finishedAt := now.Format(time.RFC3339)
	publishedAt := now.Format(time.RFC3339)
	reviewMetadata.SnapshotCount = len(snapshots) + 1

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(snapshots) > 0 {
			if err := tx.Create(&snapshots).Error; err != nil {
				return err
			}
		}

		metadataSnapshots := make([]models.CalendarSourceSnapshot, 0, 1)
		var err error
		metadataSnapshots, err = appendReviewMetadataSnapshot(metadataSnapshots, run.ID, org, scopeKey, importVersion, monthsRangeStart(months), reviewMetadata)
		if err != nil {
			return err
		}
		if len(metadataSnapshots) > 0 {
			if err := tx.Create(&metadataSnapshots).Error; err != nil {
				return err
			}
		}

		modelsToCreate := make([]models.CalendarEvent, 0, len(allEvents))
		for _, event := range allEvents {
			normalized := (&EkadashiService{db: s.db, nowFunc: s.nowFunc}).normalizeCalendarEvent(event, org, nil)
			sourceKind := calendarSourceKindForFetch(org.ID, normalized.Source)
			if strings.TrimSpace(normalized.Source) == calendarCuratedObservanceSource || normalized.EventType == "appearance" || normalized.EventType == "disappearance" {
				sourceKind = calendarSourceKindCurated
			}
			if strings.TrimSpace(normalized.Source) == calendarGeneratedArchiveSource {
				sourceKind = calendarSourceKindGenerated
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
			ConflictCount:      len(reviewMetadata.Conflicts),
			WarningCount:       len(reviewMetadata.ReviewNotes),
			ReviewStatus:       map[bool]string{true: "review_pending", false: "published"}[reviewMetadata.ReviewRequired],
			ReviewSummary:      strings.Join(reviewMetadata.ReviewNotes, "; "),
			LastSuccessAt:      publishedAt,
		}
		if err := tx.Create(&publication).Error; err != nil {
			return err
		}

		return tx.Model(&run).Updates(map[string]any{
			"status":          calendarImportStatusPublished,
			"imported_count":  reviewMetadata.ImportedCount,
			"curated_count":   reviewMetadata.CuratedCount,
			"snapshot_count":  reviewMetadata.SnapshotCount,
			"candidate_count": reviewMetadata.ImportedCount + reviewMetadata.CuratedCount,
			"conflict_count":  len(reviewMetadata.Conflicts),
			"warning_count":   len(reviewMetadata.ReviewNotes),
			"missing_months":  len(reviewMetadata.MissingMonths),
			"review_status":   map[bool]string{true: "review_pending", false: "published"}[reviewMetadata.ReviewRequired],
			"review_summary":  strings.Join(reviewMetadata.ReviewNotes, "; "),
			"finished_at":     finishedAt,
			"published_at":    publishedAt,
			"error_message":   "",
		}).Error
	}); err != nil {
		_ = s.db.Model(&run).Updates(map[string]any{
			"status":        calendarImportStatusFailed,
			"error_message": err.Error(),
			"finished_at":   finishedAt,
		}).Error
		s.markTargetImportResult(target, &run, calendarTargetStatusFailed, err.Error())
		return nil, err
	}

	s.markTargetImportResult(target, &run, calendarTargetStatusPublished, "")

	if err := s.db.First(&run, run.ID).Error; err != nil {
		return nil, err
	}
	return &run, nil
}

func (s *CalendarImportService) LoadPublishedMonth(monthStart time.Time, org models.EkadashiOrganization, locData locationSnapshot) ([]models.EkadashiDay, []models.EkadashiDay, string, models.EkadashiProviderDecision) {
	if s.db == nil {
		return nil, nil, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", "db_unavailable")
	}

	target, hasUsableLocation := s.targetFromLocation(org, locData)
	scopeMode := target.ScopeMode
	publication, publicationMatchesScope, publicationFound, err := s.resolvePublishedPublicationForTarget(org, target)
	if err != nil {
		return []models.EkadashiDay{}, []models.EkadashiDay{}, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", "db_query_failed")
	}
	if !publicationFound {
		if !hasUsableLocation && scopeMode == calendarScopeModeLocation {
			return []models.EkadashiDay{}, []models.EkadashiDay{}, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", "location_required")
		}
		status := s.enqueueImportTarget(target, "manual")
		reason := "no_published_data"
		if status == calendarTargetStatusRunning {
			reason = "import_running"
		} else if status == calendarTargetStatusQueued {
			reason = "import_queued"
		}
		return []models.EkadashiDay{}, []models.EkadashiDay{}, "", newEkadashiProviderDecision(calendarProviderModeDBMissing, "calendar_db", reason)
	}

	start := monthStart.Format("2006-01-02")
	end := monthStart.AddDate(0, 1, 0).Add(-24 * time.Hour).Format("2006-01-02")
	var rows []models.CalendarEvent
	if err := s.db.Where("publication_version = ? AND organization_id = ? AND scope_key = ? AND date >= ? AND date <= ?",
		publication.PublicationVersion, org.ID, publication.ScopeKey, start, end).
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
			if !publicationMatchesScope {
				copyDecision.Reason = "scope_fallback"
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
	} else if !publicationMatchesScope {
		decision.Reason = "scope_fallback"
	}

	generatedFrom := "calendar_db"
	if hasImported && hasCurated {
		generatedFrom = "calendar_db_imported + calendar_db_curated"
	} else if hasCurated && !hasImported {
		generatedFrom = "calendar_db_curated"
	}
	return events, days, generatedFrom, decision
}

func (s *CalendarImportService) resolvePublishedPublicationForTarget(org models.EkadashiOrganization, target calendarImportTarget) (models.CalendarPublication, bool, bool, error) {
	var publication models.CalendarPublication
	if err := s.db.Where("organization_id = ? AND scope_key = ? AND is_active = ?", org.ID, target.ScopeKey, true).
		Order("created_at DESC").
		First(&publication).Error; err == nil {
		return publication, true, true, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CalendarPublication{}, false, false, err
	}

	var candidates []models.CalendarPublication
	if err := s.db.Where("organization_id = ? AND is_active = ?", org.ID, true).
		Order("created_at DESC").
		Find(&candidates).Error; err != nil {
		return models.CalendarPublication{}, false, false, err
	}

	publication, found := pickCalendarPublicationForTarget(target, candidates)
	return publication, false, found, nil
}

func pickCalendarPublicationForTarget(target calendarImportTarget, candidates []models.CalendarPublication) (models.CalendarPublication, bool) {
	bestScore := -1
	bestIndex := -1
	for index, candidate := range candidates {
		score := rankCalendarPublicationFallback(target, candidate)
		if score > bestScore {
			bestScore = score
			bestIndex = index
		}
	}
	if bestIndex < 0 {
		return models.CalendarPublication{}, false
	}
	return candidates[bestIndex], true
}

func rankCalendarPublicationFallback(target calendarImportTarget, publication models.CalendarPublication) int {
	if !publication.IsActive {
		return -1
	}

	score := 0
	targetTimezone := strings.ToLower(strings.TrimSpace(target.Location.TimeZone))
	publicationTimezone := strings.ToLower(strings.TrimSpace(publication.Timezone))
	targetCity := strings.ToLower(strings.TrimSpace(target.Location.City))
	publicationCity := strings.ToLower(strings.TrimSpace(publication.City))
	targetCountry := strings.ToLower(strings.TrimSpace(target.Location.Country))
	publicationCountry := strings.ToLower(strings.TrimSpace(publication.Country))

	if publication.ScopeMode == target.ScopeMode {
		score += 40
	}
	if targetTimezone != "" && publicationTimezone == targetTimezone {
		score += 30
	}
	if targetCity != "" && publicationCity == targetCity {
		score += 20
	}
	if targetCountry != "" && publicationCountry == targetCountry {
		score += 5
	}
	if publicationTimezone == "asia/kolkata" {
		score += 10
	}
	if publication.ScopeMode == calendarScopeModeTimezone {
		score += 3
	}

	return score
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

func (s *CalendarImportService) ApprovePublicationReview(organizationID, city, timezone, country string) (*models.CalendarPublication, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	org := resolveEkadashiOrganization(organizationID)
	target, hasUsableLocation := s.targetFromLocation(org, locationSnapshot{
		TimeZone: strings.TrimSpace(timezone),
		City:     strings.TrimSpace(city),
		Country:  strings.TrimSpace(country),
	})
	if !hasUsableLocation && target.ScopeMode == calendarScopeModeLocation {
		return nil, errors.New("city is required for iskcon review approval")
	}

	var publication models.CalendarPublication
	if err := s.db.Where("organization_id = ? AND scope_key = ? AND is_active = ?", org.ID, target.ScopeKey, true).
		Order("created_at DESC").
		First(&publication).Error; err != nil {
		return nil, err
	}

	now := s.nowFunc().UTC().Format(time.RFC3339)
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&publication).Updates(map[string]any{
			"review_status": "published",
			"review_summary": strings.TrimSpace(firstNonEmptyCalendarString(
				appendReviewApprovalNote(publication.ReviewSummary, now),
				publication.ReviewSummary,
			)),
			"last_success_at": firstNonEmptyCalendarString(publication.LastSuccessAt, now),
		}).Error; err != nil {
			return err
		}

		return tx.Model(&models.CalendarImportRun{}).
			Where("id = ?", publication.ImportRunID).
			Updates(map[string]any{
				"review_status": "published",
				"review_summary": strings.TrimSpace(firstNonEmptyCalendarString(
					appendReviewApprovalNote(publication.ReviewSummary, now),
					publication.ReviewSummary,
				)),
			}).Error
	}); err != nil {
		return nil, err
	}

	if err := s.db.First(&publication, publication.ID).Error; err != nil {
		return nil, err
	}
	return &publication, nil
}

func (s *CalendarImportService) RejectPublicationReview(organizationID, city, timezone, country string) (*models.CalendarPublication, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	org := resolveEkadashiOrganization(organizationID)
	target, hasUsableLocation := s.targetFromLocation(org, locationSnapshot{
		TimeZone: strings.TrimSpace(timezone),
		City:     strings.TrimSpace(city),
		Country:  strings.TrimSpace(country),
	})
	if !hasUsableLocation && target.ScopeMode == calendarScopeModeLocation {
		return nil, errors.New("city is required for iskcon review rejection")
	}

	var publication models.CalendarPublication
	if err := s.db.Where("organization_id = ? AND scope_key = ? AND is_active = ?", org.ID, target.ScopeKey, true).
		Order("created_at DESC").
		First(&publication).Error; err != nil {
		return nil, err
	}

	now := s.nowFunc().UTC().Format(time.RFC3339)
	rejectionSummary := strings.TrimSpace(firstNonEmptyCalendarString(
		appendReviewRejectionNote(publication.ReviewSummary, now),
		publication.ReviewSummary,
		"review rejected",
	))
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&publication).Updates(map[string]any{
			"review_status":  "conflict",
			"review_summary": rejectionSummary,
		}).Error; err != nil {
			return err
		}

		return tx.Model(&models.CalendarImportRun{}).
			Where("id = ?", publication.ImportRunID).
			Updates(map[string]any{
				"review_status":  "conflict",
				"review_summary": rejectionSummary,
			}).Error
	}); err != nil {
		return nil, err
	}

	if err := s.db.First(&publication, publication.ID).Error; err != nil {
		return nil, err
	}
	return &publication, nil
}

func appendReviewApprovalNote(existing, approvedAt string) string {
	note := fmt.Sprintf("review approved at %s", strings.TrimSpace(approvedAt))
	existing = strings.TrimSpace(existing)
	if existing == "" {
		return note
	}
	if strings.Contains(existing, note) {
		return existing
	}
	return existing + "; " + note
}

func appendReviewRejectionNote(existing, rejectedAt string) string {
	note := fmt.Sprintf("review rejected at %s", strings.TrimSpace(rejectedAt))
	existing = strings.TrimSpace(existing)
	if existing == "" {
		return note
	}
	if strings.Contains(existing, note) {
		return existing
	}
	return existing + "; " + note
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

func (s *CalendarImportService) ListImportTargets(limit int) ([]models.CalendarImportTarget, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	if limit <= 0 {
		limit = 100
	}
	var rows []models.CalendarImportTarget
	err := s.db.Order("organization_id ASC, scope_key ASC").Limit(limit).Find(&rows).Error
	return rows, err
}

func (s *CalendarImportService) GetImportStatus(org models.EkadashiOrganization, locData locationSnapshot) (*models.EkadashiImportStatusResponse, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	target, hasUsableLocation := s.targetFromLocation(org, locData)
	if !hasUsableLocation && target.ScopeMode == calendarScopeModeLocation {
		return &models.EkadashiImportStatusResponse{
			OrganizationID: org.ID,
			ScopeKey:       target.ScopeKey,
			ScopeMode:      target.ScopeMode,
			City:           target.Location.City,
			Country:        target.Location.Country,
			Timezone:       target.Location.TimeZone,
			TargetExists:   false,
			Status:         "missing",
			LastError:      "location_required",
		}, nil
	}

	var importTarget models.CalendarImportTarget
	err := s.db.Where("organization_id = ? AND scope_key = ?", org.ID, target.ScopeKey).First(&importTarget).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &models.EkadashiImportStatusResponse{
			OrganizationID: org.ID,
			ScopeKey:       target.ScopeKey,
			ScopeMode:      target.ScopeMode,
			City:           target.Location.City,
			Country:        target.Location.Country,
			Timezone:       target.Location.TimeZone,
			TargetExists:   false,
			Status:         "missing",
		}, nil
	}
	if err != nil {
		return nil, err
	}

	response := &models.EkadashiImportStatusResponse{
		OrganizationID: org.ID,
		ScopeKey:       target.ScopeKey,
		ScopeMode:      importTarget.ScopeMode,
		City:           importTarget.City,
		Country:        importTarget.Country,
		Timezone:       importTarget.Timezone,
		TargetExists:   true,
		Status:         importTarget.ImportStatus,
		LastError:      strings.TrimSpace(importTarget.LastError),
	}
	if importTarget.LastImportedAt != nil {
		response.LastImportAt = importTarget.LastImportedAt.UTC().Format(time.RFC3339)
	}
	var latestRun models.CalendarImportRun
	if err := s.db.Where("organization_id = ? AND scope_key = ?", org.ID, target.ScopeKey).
		Order("created_at DESC").
		First(&latestRun).Error; err == nil {
		response.ReviewStatus = strings.TrimSpace(latestRun.ReviewStatus)
		response.CoverageMonths = maxCalendarCoverageMonths(latestRun)
		response.UnpublishedChanges = latestRun.CandidateCount - latestRun.ImportedCount - latestRun.CuratedCount
		if response.UnpublishedChanges < 0 {
			response.UnpublishedChanges = 0
		}
		response.Conflicts = latestRun.ConflictCount
	}
	return response, nil
}

func maxCalendarCoverageMonths(run models.CalendarImportRun) int {
	start, startErr := time.Parse("2006-01", strings.TrimSpace(run.RangeStart))
	end, endErr := time.Parse("2006-01", strings.TrimSpace(run.RangeEnd))
	if startErr != nil || endErr != nil || end.Before(start) {
		return 0
	}
	months := 0
	current := start
	for !current.After(end) {
		months++
		current = current.AddDate(0, 1, 0)
	}
	return months
}

func (s *CalendarImportService) SyncTargetsFromKnownLocations() ([]calendarImportTarget, error) {
	targets := make([]calendarImportTarget, 0, 32)
	targetMap := make(map[string]calendarImportTarget)

	addTarget := func(org models.EkadashiOrganization, loc locationSnapshot, source string) {
		target, ok := s.targetFromLocation(org, loc)
		if !ok {
			return
		}
		key := org.ID + "|" + target.ScopeKey
		if _, exists := targetMap[key]; exists {
			return
		}
		targetMap[key] = target
		_, _ = s.upsertImportTarget(target, source, "", nil, "")
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
		}, "push_preference")
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
			addTarget(org, row, "user_profile")
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
		}, "publication")
	}

	for _, org := range ekadashiOrganizations {
		addTarget(org, locationSnapshot{TimeZone: "Asia/Kolkata"}, "manual")
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

func (s *CalendarImportService) listDueTargets() ([]calendarImportTarget, error) {
	if s.db == nil {
		return nil, errors.New("calendar import db is not initialized")
	}
	now := s.nowFunc().UTC()
	var rows []models.CalendarImportTarget
	if err := s.db.Where("is_active = ? AND (next_import_due_at IS NULL OR next_import_due_at <= ?)", true, now).
		Order("organization_id ASC, scope_key ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	targets := make([]calendarImportTarget, 0, len(rows))
	for _, row := range rows {
		targets = append(targets, calendarImportTarget{
			Organization: resolveEkadashiOrganization(row.OrganizationID),
			Location: locationSnapshot{
				TimeZone: row.Timezone,
				City:     row.City,
				Country:  row.Country,
			},
			ScopeMode: row.ScopeMode,
			ScopeKey:  row.ScopeKey,
		})
	}
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
	var setting models.SystemSetting
	if err := s.importer.db.Where("key = ?", "EKADASHI_IMPORT_NIGHTLY_LAST_RUN_DATE").First(&setting).Error; err == nil && strings.TrimSpace(setting.Value) == today {
		return
	}

	_, err := s.importer.SyncTargetsFromKnownLocations()
	if err != nil {
		log.Printf("[EkadashiImportScheduler] sync targets failed: %v", err)
		return
	}
	targets, err := s.importer.listDueTargets()
	if err != nil {
		log.Printf("[EkadashiImportScheduler] list due targets failed: %v", err)
		return
	}
	for _, target := range targets {
		if _, err := s.importer.ImportAndPublish(target.Organization.ID, target.Location.City, target.Location.TimeZone, target.Location.Country, defaultCalendarImportHorizonMonths); err != nil {
			log.Printf("[EkadashiImportScheduler] import failed org=%s scope=%s: %v", target.Organization.ID, target.ScopeKey, err)
		}
	}
	_ = s.importer.db.Where("key = ?", "EKADASHI_IMPORT_NIGHTLY_LAST_RUN_DATE").
		Assign(models.SystemSetting{Value: today}).
		FirstOrCreate(&setting, models.SystemSetting{Key: "EKADASHI_IMPORT_NIGHTLY_LAST_RUN_DATE"}).Error
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
