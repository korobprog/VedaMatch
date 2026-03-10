package services

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"rag-agent-server/internal/models"
)

var (
	gosaiDatedLineRE    = regexp.MustCompile(`^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*\d{4})?\s+[—-]\s+(.+)$`)
	gosaiShortLineRE    = regexp.MustCompile(`^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+[—-]\s+(.+)$`)
	gosaiMonthHeaderRE  = regexp.MustCompile(`(?i)^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$`)
	gosaiSCMEventLineRE = regexp.MustCompile(`^(\d{1,2})\.\s+\([A-Za-z]{3}\)\s+(.+)$`)
	gosaiParanaTimeRE   = regexp.MustCompile(`paran(?: between| from)?\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)\s+(?:and|to|-)\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)`)
)

func fetchGosaiMonthCalendar(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, error) {
	days, _, _, err := fetchGosaiMonthCalendarSnapshot(monthStart, locData, org)
	return days, err
}

func fetchGosaiMonthCalendarSnapshot(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, string, string, error) {
	pageURL := gosaiCalendarURLForOrganization(org)
	client := &http.Client{Timeout: 12 * time.Second}
	req, err := http.NewRequest(http.MethodGet, pageURL, nil)
	if err != nil {
		recordEkadashiProviderStatus(org.ID, pageURL, false, err.Error())
		return nil, "", pageURL, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; VedaMatchCalendarBot/1.0; +https://vedamatch.ru)")
	resp, err := client.Do(req)
	if err != nil {
		recordEkadashiProviderStatus(org.ID, pageURL, false, err.Error())
		return nil, "", pageURL, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		recordEkadashiProviderStatus(org.ID, pageURL, false, fmt.Sprintf("unexpected status: %d", resp.StatusCode))
		return nil, "", pageURL, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		recordEkadashiProviderStatus(org.ID, pageURL, false, err.Error())
		return nil, "", pageURL, err
	}

	days, err := parseGosaiHTMLMonth(string(body), monthStart, locData, org, pageURL)
	if err != nil {
		recordEkadashiProviderStatus(org.ID, pageURL, false, err.Error())
		return nil, string(body), pageURL, err
	}
	if len(days) == 0 {
		recordEkadashiProviderStatus(org.ID, pageURL, false, "no ekadashi days parsed")
		return nil, string(body), pageURL, fmt.Errorf("no ekadashi days parsed")
	}

	recordEkadashiProviderStatus(org.ID, pageURL, true, "")
	return days, string(body), pageURL, nil
}

func parseGosaiHTMLMonth(rawHTML string, monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization, pageURL string) ([]models.EkadashiDay, error) {
	lines, err := extractHTMLTextLines(rawHTML)
	if err != nil {
		return nil, err
	}

	loc, err := time.LoadLocation(locData.TimeZone)
	if err != nil {
		loc = time.UTC
	}
	sourceName := gosaiSourceNameForOrganization(org)

	targetMonth := monthStart.Month()
	targetYear := monthStart.Year()
	currentMonth := time.Month(0)
	currentYear := 0
	result := make([]models.EkadashiDay, 0, 4)
	lastEkadashiIndex := -1

	for _, line := range lines {
		if gosaiMonthHeaderRE.MatchString(line) {
			parsedMonth, parsedYear, parseErr := parseMonthHeader(line)
			if parseErr == nil {
				currentMonth = parsedMonth
				currentYear = parsedYear
			}
			continue
		}

		dayTime, dayText, matched := gosaiParseDayLine(line, targetYear, currentMonth, currentYear, loc)
		if !matched {
			continue
		}

		if paranaMatch := gosaiParanaTimeRE.FindStringSubmatch(strings.ToLower(dayText)); len(paranaMatch) == 3 {
			if lastEkadashiIndex >= 0 {
				paranaStart, paranaEnd, parseErr := buildGosaiParanaWindow(dayTime, paranaMatch[1], paranaMatch[2], loc)
				if parseErr == nil {
					paranaStartStr := paranaStart.Format(time.RFC3339)
					paranaEndStr := paranaEnd.Format(time.RFC3339)
					result[lastEkadashiIndex].ParanaStartAt = &paranaStartStr
					result[lastEkadashiIndex].ParanaEndAt = &paranaEndStr
					result[lastEkadashiIndex].FastEndAt = &paranaEndStr
				}
			}
			continue
		}

		if dayTime.Month() != targetMonth || dayTime.Year() != targetYear {
			continue
		}
		lowerDayText := strings.ToLower(dayText)
		if !strings.Contains(lowerDayText, "ekadasi") && !strings.Contains(lowerDayText, "ekadashi") && !strings.Contains(lowerDayText, "mahadvadashi") {
			continue
		}
		if strings.Contains(lowerDayText, "no fast today") && !strings.Contains(lowerDayText, "mahadvadashi") {
			continue
		}

		title, subtitle, isMahadvadashi := parseGosaiEventTitles(dayText, org.Name)
		result = append(result, models.EkadashiDay{
			Date:             dayTime.Format("2006-01-02"),
			OrganizationID:   org.ID,
			OrganizationName: org.Name,
			Timezone:         locData.TimeZone,
			City:             locData.City,
			Country:          locData.Country,
			EventType:        map[bool]string{true: "mahadvadashi", false: "ekadashi"}[isMahadvadashi],
			IsEkadashi:       true,
			IsMahadvadashi:   isMahadvadashi,
			FastStartAt:      nil,
			FastEndAt:        nil,
			ParanaStartAt:    nil,
			ParanaEndAt:      nil,
			DisplayTitle:     title,
			DisplaySubtitle:  subtitle,
			ObservanceNotes:  fmt.Sprintf("Loaded from %s for %s.", sourceName, chooseLocationLabel(locData.City, locData.TimeZone)),
			Source:           sourceName,
			SourceURL:        pageURL,
		})
		lastEkadashiIndex = len(result) - 1
	}

	sort.Slice(result, func(i, j int) bool { return result[i].Date < result[j].Date })
	return result, nil
}

func gosaiCalendarURLForOrganization(org models.EkadashiOrganization) string {
	switch strings.TrimSpace(org.ID) {
	case "sri_chaitanya_math":
		return "https://www.scsmath.com/events/calendar/index.html"
	case "pure_bhakti":
		return "https://gosai.com/calendar"
	default:
		return "https://gosai.com/calendar"
	}
}

func gosaiSourceNameForOrganization(org models.EkadashiOrganization) string {
	switch strings.TrimSpace(org.ID) {
	case "sri_chaitanya_math":
		return "scsmath.com"
	default:
		return "gosai.com"
	}
}

func gosaiParseDayLine(line string, fallbackYear int, currentMonth time.Month, currentYear int, loc *time.Location) (time.Time, string, bool) {
	if match := gosaiSCMEventLineRE.FindStringSubmatch(line); len(match) == 3 && currentMonth != 0 && currentYear != 0 {
		dayTime, err := time.ParseInLocation("2006-1-2", fmt.Sprintf("%d-%d-%s", currentYear, int(currentMonth), strings.TrimSpace(match[1])), loc)
		if err != nil {
			return time.Time{}, "", false
		}
		return dayTime, strings.TrimSpace(match[2]), true
	}

	if match := gosaiDatedLineRE.FindStringSubmatch(line); len(match) == 4 {
		parsedMonth, _, parseErr := parseMonthHeader(match[1] + " " + fmt.Sprintf("%d", fallbackYear))
		if parseErr != nil {
			return time.Time{}, "", false
		}
		dayTime, err := time.ParseInLocation("2006-1-2", fmt.Sprintf("%d-%d-%s", fallbackYear, int(parsedMonth), strings.TrimSpace(match[2])), loc)
		if err != nil {
			return time.Time{}, "", false
		}
		return dayTime, strings.TrimSpace(match[3]), true
	}

	if match := gosaiShortLineRE.FindStringSubmatch(line); len(match) == 4 {
		parsedMonth, err := parseShortMonth(match[1])
		if err != nil {
			return time.Time{}, "", false
		}
		dayTime, err := time.ParseInLocation("2006-1-2", fmt.Sprintf("%d-%d-%s", fallbackYear, int(parsedMonth), strings.TrimSpace(match[2])), loc)
		if err != nil {
			return time.Time{}, "", false
		}
		return dayTime, strings.TrimSpace(match[3]), true
	}

	return time.Time{}, "", false
}

func parseShortMonth(value string) (time.Month, error) {
	parsedTime, err := time.Parse("Jan", strings.TrimSpace(value))
	if err != nil {
		return 0, err
	}
	return parsedTime.Month(), nil
}

func parseGosaiEventTitles(dayText, organizationName string) (string, string, bool) {
	segments := strings.FieldsFunc(dayText, func(r rune) bool {
		return r == '.' || r == ';' || r == '/'
	})
	isMahadvadashi := strings.Contains(strings.ToLower(dayText), "mahadvadashi")
	title := "Ekadashi"
	for _, segment := range segments {
		segment = strings.TrimSpace(segment)
		lower := strings.ToLower(segment)
		if strings.Contains(lower, "paran") {
			continue
		}
		if strings.Contains(lower, "mahadvadashi") {
			title = strings.TrimSpace(strings.TrimSuffix(strings.TrimSuffix(segment, " fast"), " Fast"))
			isMahadvadashi = true
			continue
		}
		if strings.Contains(lower, "ekadasi") || strings.Contains(lower, "ekadashi") {
			title = strings.TrimSpace(strings.TrimSuffix(strings.TrimSuffix(segment, " fast"), " Fast"))
		}
	}
	return title, fmt.Sprintf("%s observance", organizationName), isMahadvadashi
}

func buildGosaiParanaWindow(dayTime time.Time, startText, endText string, loc *time.Location) (time.Time, time.Time, error) {
	startClock, err := parseGosaiClock(startText, loc)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	endClock, err := parseGosaiClock(endText, loc)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	start := time.Date(dayTime.Year(), dayTime.Month(), dayTime.Day(), startClock.Hour(), startClock.Minute(), 0, 0, loc)
	end := time.Date(dayTime.Year(), dayTime.Month(), dayTime.Day(), endClock.Hour(), endClock.Minute(), 0, 0, loc)
	return start, end, nil
}

func parseGosaiClock(value string, loc *time.Location) (time.Time, error) {
	value = strings.TrimSpace(strings.ToLower(value))
	for _, layout := range []string{"3:04 pm", "3:04pm", "15:04"} {
		if parsed, err := time.ParseInLocation(layout, value, loc); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported gosai time: %s", value)
}
