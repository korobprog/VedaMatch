package services

import (
	"strings"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

type autonomousObservanceSeed struct {
	Slug           string
	Title          string
	EventType      string
	ObservanceType string
	PersonSlug     string
	Description    string
	Source         string
	SourceURL      string
}

type autonomousProfileRuleSeed struct {
	OrganizationID   string
	ObservanceSlug   string
	EventType        string
	ObservanceType   string
	Month            int
	Day              int
	Priority         int
	TitleOverride    string
	SubtitleOverride string
	NotesOverride    string
	MarkerStyleKey   string
	Source           string
	SourceURL        string
	SourceConfidence int
}

var autonomousCalendarSources = []models.CalendarSourceCatalog{
	{SourceKey: "vaishnavacalendar.org", DisplayName: "Vaishnava Calendar", BaseURL: "https://vaishnavacalendar.org", SourceKind: "imported", TrustPriority: 10, Enabled: true, Notes: "Primary ingest source for ISKCON ekadashi and parana windows."},
	{SourceKey: "scsmath.com", DisplayName: "Sri Chaitanya Saraswat Math", BaseURL: "https://www.scsmath.com/events/calendar/index.html", SourceKind: "imported", TrustPriority: 20, Enabled: true, Notes: "Primary ingest source for Sri Chaitanya Math observance profile."},
	{SourceKey: "gosai.com", DisplayName: "Pure Bhakti Calendar", BaseURL: "https://gosai.com/calendar", SourceKind: "imported", TrustPriority: 30, Enabled: true, Notes: "Primary ingest source for Pure Bhakti observance profile."},
	{SourceKey: "curated_reference", DisplayName: "Curated Reference", BaseURL: "", SourceKind: "curated", TrustPriority: 5, Enabled: true, Notes: "Manual canonical observance layer used for appearance and disappearance events."},
	{SourceKey: "generated_archive", DisplayName: "Generated Archive", BaseURL: "", SourceKind: "generated", TrustPriority: 90, Enabled: true, Notes: "Fallback generated sequence kept for ingest resilience only."},
}

var autonomousCalendarObservances = []autonomousObservanceSeed{
	{Slug: "bhaktisiddhanta-sarasvati-appearance", Title: "Appearance of Srila Bhaktisiddhanta Sarasvati Thakura", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "bhaktisiddhanta-sarasvati", Description: "Canonical observance for Srila Bhaktisiddhanta Sarasvati Thakura appearance.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "bhaktivinoda-thakura-appearance", Title: "Appearance of Srila Bhaktivinoda Thakura", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "bhaktivinoda-thakura", Description: "Canonical observance for Srila Bhaktivinoda Thakura appearance.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "rupa-goswami-disappearance", Title: "Disappearance of Srila Rupa Goswami", EventType: "disappearance", ObservanceType: "disappearance", PersonSlug: "rupa-goswami", Description: "Canonical observance for Srila Rupa Goswami disappearance.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "srila-prabhupada-appearance", Title: "Appearance of Srila Prabhupada", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "srila-prabhupada", Description: "Canonical observance for Srila Prabhupada appearance.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "gaura-kishora-dasa-babaji-disappearance", Title: "Disappearance of Srila Gaura Kishora Dasa Babaji", EventType: "disappearance", ObservanceType: "disappearance", PersonSlug: "gaura-kishora-dasa-babaji", Description: "Canonical observance for Srila Gaura Kishora Dasa Babaji disappearance.", Source: "curated_reference", SourceURL: "https://www.scsmath.com/events/calendar/index.html"},
	{Slug: "narayana-goswami-appearance", Title: "Appearance of Srila Gurudeva", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "narayana-goswami", Description: "Canonical observance for Srila Narayana Goswami appearance.", Source: "curated_reference", SourceURL: "https://gosai.com/calendar"},
	{Slug: "jiva-goswami-disappearance", Title: "Disappearance of Srila Jiva Goswami", EventType: "disappearance", ObservanceType: "disappearance", PersonSlug: "jiva-goswami", Description: "Canonical observance for Srila Jiva Goswami disappearance.", Source: "curated_reference", SourceURL: "https://gosai.com/calendar"},
	{Slug: "gadadhara-pandita-appearance", Title: "Appearance of Srila Gadadhara Pandita", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "gadadhara-pandita", Description: "Canonical observance for Srila Gadadhara Pandita appearance.", Source: "curated_reference", SourceURL: "https://gcal.app"},
	{Slug: "nityananda-trayodashi", Title: "Appearance of Lord Nityananda", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "lord-nityananda", Description: "Canonical observance for Lord Nityananda appearance.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "gaura-purnima", Title: "Appearance of Sri Caitanya Mahaprabhu", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "sri-caitanya-mahaprabhu", Description: "Canonical observance for Gaura Purnima.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "radhastami", Title: "Appearance of Srimati Radharani", EventType: "appearance", ObservanceType: "appearance", PersonSlug: "srimati-radharani", Description: "Canonical observance for Radhastami.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
	{Slug: "govardhana-puja", Title: "Govardhana Puja", EventType: "appearance", ObservanceType: "festival", PersonSlug: "govardhana", Description: "Canonical observance for Govardhana Puja.", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org"},
}

var autonomousCalendarProfileRules = []autonomousProfileRuleSeed{
	{OrganizationID: "iskcon", ObservanceSlug: "bhaktisiddhanta-sarasvati-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 2, Day: 25, Priority: 3, TitleOverride: "Appearance of Srila Bhaktisiddhanta Sarasvati Thakura", SubtitleOverride: "ISKCON commemoration", NotesOverride: "Appearance observance remembered in the ISKCON calendar.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 95},
	{OrganizationID: "iskcon", ObservanceSlug: "bhaktivinoda-thakura-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 6, Priority: 3, TitleOverride: "Appearance of Srila Bhaktivinoda Thakura", SubtitleOverride: "ISKCON commemoration", NotesOverride: "Appearance observance remembered in the ISKCON calendar.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 95},
	{OrganizationID: "iskcon", ObservanceSlug: "gaura-purnima", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 14, Priority: 2, TitleOverride: "Appearance of Sri Caitanya Mahaprabhu", SubtitleOverride: "ISKCON festival", NotesOverride: "Gaura Purnima appears in the ISKCON festival profile.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 92},
	{OrganizationID: "iskcon", ObservanceSlug: "rupa-goswami-disappearance", EventType: "disappearance", ObservanceType: "disappearance", Month: 8, Day: 10, Priority: 4, TitleOverride: "Disappearance of Srila Rupa Goswami", SubtitleOverride: "ISKCON commemoration", NotesOverride: "Disappearance observance remembered in the ISKCON calendar.", MarkerStyleKey: "disappearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 95},
	{OrganizationID: "iskcon", ObservanceSlug: "srila-prabhupada-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 9, Day: 14, Priority: 2, TitleOverride: "Appearance of Srila Prabhupada", SubtitleOverride: "ISKCON commemoration", NotesOverride: "Appearance observance remembered in the ISKCON calendar.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 97},
	{OrganizationID: "iskcon", ObservanceSlug: "radhastami", EventType: "appearance", ObservanceType: "appearance", Month: 9, Day: 1, Priority: 2, TitleOverride: "Appearance of Srimati Radharani", SubtitleOverride: "ISKCON festival", NotesOverride: "Radhastami is included in the ISKCON festival profile.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 92},
	{OrganizationID: "iskcon", ObservanceSlug: "govardhana-puja", EventType: "appearance", ObservanceType: "festival", Month: 10, Day: 23, Priority: 2, TitleOverride: "Govardhana Puja", SubtitleOverride: "ISKCON festival", NotesOverride: "Govardhana Puja appears in the ISKCON festival profile.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://vaishnavacalendar.org", SourceConfidence: 90},
	{OrganizationID: "sri_chaitanya_math", ObservanceSlug: "bhaktisiddhanta-sarasvati-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 2, Day: 25, Priority: 3, TitleOverride: "Appearance of Srila Bhaktisiddhanta Sarasvati Goswami Prabhupada", SubtitleOverride: "Sri Chaitanya Math commemoration", NotesOverride: "Appearance observance in the Sri Chaitanya Math tradition.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://www.scsmath.com/events/calendar/index.html", SourceConfidence: 95},
	{OrganizationID: "sri_chaitanya_math", ObservanceSlug: "bhaktivinoda-thakura-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 6, Priority: 3, TitleOverride: "Appearance of Srila Bhaktivinoda Thakura", SubtitleOverride: "Sri Chaitanya Math commemoration", NotesOverride: "Appearance observance in the Sri Chaitanya Math tradition.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://www.scsmath.com/events/calendar/index.html", SourceConfidence: 95},
	{OrganizationID: "sri_chaitanya_math", ObservanceSlug: "gaura-purnima", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 14, Priority: 2, TitleOverride: "Appearance of Sri Caitanya Mahaprabhu", SubtitleOverride: "Sri Chaitanya Math festival", NotesOverride: "Gaura Purnima appears in the Sri Chaitanya Math festival profile.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://www.scsmath.com/events/calendar/index.html", SourceConfidence: 92},
	{OrganizationID: "sri_chaitanya_math", ObservanceSlug: "gaura-kishora-dasa-babaji-disappearance", EventType: "disappearance", ObservanceType: "disappearance", Month: 10, Day: 5, Priority: 4, TitleOverride: "Disappearance of Srila Gaura Kishora Dasa Babaji", SubtitleOverride: "Sri Chaitanya Math commemoration", NotesOverride: "Disappearance observance in the Sri Chaitanya Math tradition.", MarkerStyleKey: "disappearance", Source: "curated_reference", SourceURL: "https://www.scsmath.com/events/calendar/index.html", SourceConfidence: 95},
	{OrganizationID: "pure_bhakti", ObservanceSlug: "narayana-goswami-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 1, Day: 7, Priority: 3, TitleOverride: "Appearance of Srila Gurudeva", SubtitleOverride: "Pure Bhakti commemoration", NotesOverride: "Appearance observance in the Pure Bhakti tradition.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://gosai.com/calendar", SourceConfidence: 95},
	{OrganizationID: "pure_bhakti", ObservanceSlug: "bhaktisiddhanta-sarasvati-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 2, Day: 25, Priority: 3, TitleOverride: "Appearance of Srila Bhaktisiddhanta Sarasvati Goswami Thakura", SubtitleOverride: "Pure Bhakti commemoration", NotesOverride: "Appearance observance in the Pure Bhakti tradition.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://gosai.com/calendar", SourceConfidence: 95},
	{OrganizationID: "pure_bhakti", ObservanceSlug: "gaura-purnima", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 14, Priority: 2, TitleOverride: "Appearance of Sri Caitanya Mahaprabhu", SubtitleOverride: "Pure Bhakti festival", NotesOverride: "Gaura Purnima appears in the Pure Bhakti festival profile.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://gosai.com/calendar", SourceConfidence: 92},
	{OrganizationID: "pure_bhakti", ObservanceSlug: "jiva-goswami-disappearance", EventType: "disappearance", ObservanceType: "disappearance", Month: 12, Day: 29, Priority: 4, TitleOverride: "Disappearance of Srila Jiva Goswami", SubtitleOverride: "Pure Bhakti commemoration", NotesOverride: "Disappearance observance in the Pure Bhakti tradition.", MarkerStyleKey: "disappearance", Source: "curated_reference", SourceURL: "https://gosai.com/calendar", SourceConfidence: 95},
	{OrganizationID: "default_vaishnava", ObservanceSlug: "bhaktivinoda-thakura-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 6, Priority: 3, TitleOverride: "Appearance of Srila Bhaktivinoda Thakura", SubtitleOverride: "Vaishnava commemoration", NotesOverride: "Appearance observance in the broader Vaishnava calendar.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://gcal.app", SourceConfidence: 90},
	{OrganizationID: "default_vaishnava", ObservanceSlug: "gaura-purnima", EventType: "appearance", ObservanceType: "appearance", Month: 3, Day: 14, Priority: 2, TitleOverride: "Appearance of Sri Caitanya Mahaprabhu", SubtitleOverride: "Vaishnava festival", NotesOverride: "Gaura Purnima appears in the broader Vaishnava festival profile.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://gcal.app", SourceConfidence: 88},
	{OrganizationID: "default_vaishnava", ObservanceSlug: "rupa-goswami-disappearance", EventType: "disappearance", ObservanceType: "disappearance", Month: 8, Day: 10, Priority: 4, TitleOverride: "Disappearance of Srila Rupa Goswami", SubtitleOverride: "Vaishnava commemoration", NotesOverride: "Disappearance observance in the broader Vaishnava calendar.", MarkerStyleKey: "disappearance", Source: "curated_reference", SourceURL: "https://gcal.app", SourceConfidence: 90},
	{OrganizationID: "default_vaishnava", ObservanceSlug: "gadadhara-pandita-appearance", EventType: "appearance", ObservanceType: "appearance", Month: 11, Day: 4, Priority: 3, TitleOverride: "Appearance of Srila Gadadhara Pandita", SubtitleOverride: "Vaishnava commemoration", NotesOverride: "Appearance observance in the broader Vaishnava calendar.", MarkerStyleKey: "appearance", Source: "curated_reference", SourceURL: "https://gcal.app", SourceConfidence: 90},
}

func ensureAutonomousCalendarReferenceData(db *gorm.DB) error {
	if db == nil {
		return nil
	}

	for _, source := range autonomousCalendarSources {
		if err := db.Where("source_key = ?", source.SourceKey).Assign(source).FirstOrCreate(&models.CalendarSourceCatalog{}).Error; err != nil {
			return err
		}
	}

	for _, seed := range autonomousCalendarObservances {
		record := models.CalendarObservance{
			Slug:                  seed.Slug,
			Title:                 seed.Title,
			DefaultEventType:      seed.EventType,
			DefaultObservanceType: seed.ObservanceType,
			PersonSlug:            seed.PersonSlug,
			Description:           seed.Description,
			Source:                seed.Source,
			SourceURL:             seed.SourceURL,
			IsCanonical:           true,
		}
		if err := db.Where("slug = ?", seed.Slug).Assign(record).FirstOrCreate(&models.CalendarObservance{}).Error; err != nil {
			return err
		}
	}

	for _, seed := range autonomousCalendarProfileRules {
		record := models.CalendarProfileRule{
			OrganizationID:   seed.OrganizationID,
			ObservanceSlug:   seed.ObservanceSlug,
			EventType:        seed.EventType,
			ObservanceType:   seed.ObservanceType,
			Month:            seed.Month,
			Day:              seed.Day,
			Priority:         seed.Priority,
			TitleOverride:    seed.TitleOverride,
			SubtitleOverride: seed.SubtitleOverride,
			NotesOverride:    seed.NotesOverride,
			MarkerStyleKey:   seed.MarkerStyleKey,
			Source:           seed.Source,
			SourceURL:        seed.SourceURL,
			SourceConfidence: seed.SourceConfidence,
			IsActive:         true,
		}
		if err := db.Where("organization_id = ? AND observance_slug = ? AND month = ? AND day = ?",
			seed.OrganizationID, seed.ObservanceSlug, seed.Month, seed.Day).
			Assign(record).
			FirstOrCreate(&models.CalendarProfileRule{}).Error; err != nil {
			return err
		}
	}

	return nil
}

func loadAutonomousObservanceRules(db *gorm.DB, organizationID string, month int) ([]models.CalendarProfileRule, map[string]models.CalendarObservance, error) {
	if db == nil {
		return nil, nil, nil
	}
	if err := ensureAutonomousCalendarReferenceData(db); err != nil {
		return nil, nil, err
	}

	var rules []models.CalendarProfileRule
	if err := db.Where("organization_id = ? AND month = ? AND is_active = ?", strings.TrimSpace(organizationID), month, true).
		Order("day ASC, priority ASC, observance_slug ASC").
		Find(&rules).Error; err != nil {
		return nil, nil, err
	}
	if len(rules) == 0 {
		return rules, map[string]models.CalendarObservance{}, nil
	}

	slugs := make([]string, 0, len(rules))
	for _, rule := range rules {
		slugs = append(slugs, rule.ObservanceSlug)
	}

	var observances []models.CalendarObservance
	if err := db.Where("slug IN ?", slugs).Find(&observances).Error; err != nil {
		return nil, nil, err
	}
	observanceMap := make(map[string]models.CalendarObservance, len(observances))
	for _, observance := range observances {
		observanceMap[observance.Slug] = observance
	}

	return rules, observanceMap, nil
}
