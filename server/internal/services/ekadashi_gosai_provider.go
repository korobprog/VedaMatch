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
	gosaiDatedLineRE  = regexp.MustCompile(`^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*\d{4})?\s+[—-]\s+(.+)$`)
	gosaiParanaTimeRE = regexp.MustCompile(`paran(?: between| from)?\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)\s+(?:and|to|-)\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)`)
)

func fetchGosaiMonthCalendar(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, error) {
	days, _, _, err := fetchGosaiMonthCalendarSnapshot(monthStart, locData, org)
	return days, err
}

func fetchGosaiMonthCalendarSnapshot(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, string, string, error) {
	pageURL := "https://www.gosai.com/calendar/"
	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Get(pageURL)
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

	targetMonth := monthStart.Month()
	targetYear := monthStart.Year()
	result := make([]models.EkadashiDay, 0, 4)
	lastEkadashiIndex := -1

	for _, line := range lines {
		match := gosaiDatedLineRE.FindStringSubmatch(line)
		if len(match) != 4 {
			continue
		}

		parsedMonth, _, parseErr := parseMonthHeader(match[1] + " " + fmt.Sprintf("%d", targetYear))
		if parseErr != nil {
			continue
		}
		dayNumber := strings.TrimSpace(match[2])
		dayText := strings.TrimSpace(match[3])
		dayTime, dayErr := time.ParseInLocation("2006-1-2", fmt.Sprintf("%d-%d-%s", targetYear, int(parsedMonth), dayNumber), loc)
		if dayErr != nil {
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

		if parsedMonth != targetMonth {
			continue
		}
		if !strings.Contains(strings.ToLower(dayText), "ekadasi") && !strings.Contains(strings.ToLower(dayText), "ekadashi") && !strings.Contains(strings.ToLower(dayText), "mahadvadashi") {
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
			ObservanceNotes:  fmt.Sprintf("Loaded from gosai.com for %s.", chooseLocationLabel(locData.City, locData.TimeZone)),
			Source:           "gosai.com",
			SourceURL:        pageURL,
		})
		lastEkadashiIndex = len(result) - 1
	}

	sort.Slice(result, func(i, j int) bool { return result[i].Date < result[j].Date })
	return result, nil
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
