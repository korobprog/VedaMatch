package services

import (
	"fmt"
	stdhtml "html"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	xhtml "golang.org/x/net/html"
)

type cachedISKCONMonth struct {
	expiresAt time.Time
	days      []models.EkadashiDay
}

type ISKCONProviderCacheEntry struct {
	CacheKey  string `json:"cacheKey"`
	Month     string `json:"month"`
	SourceURL string `json:"sourceUrl"`
	ExpiresAt string `json:"expiresAt"`
	DaysCount int    `json:"daysCount"`
	Expired   bool   `json:"expired"`
}

var (
	iskconProviderCache sync.Map
	httpMonthHeaderRE   = regexp.MustCompile(`^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$`)
	httpEventLineRE     = regexp.MustCompile(`^(\d{1,2})\.\s+\([A-Za-z]{3}\)\s+(.+)$`)
	httpParanaRangeRE   = regexp.MustCompile(`Paran(?: after [^.]+ and)? between (\d{1,2}:\d{2}) and (\d{1,2}:\d{2})`)
)

func fetchISKCONMonthCalendar(monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization) ([]models.EkadashiDay, error) {
	citySlug := buildVaishnavaCalendarCitySlug(locData.City)
	if citySlug == "" {
		return nil, fmt.Errorf("empty city slug")
	}

	gaurabdaYear := monthStart.Year() - 1486
	pageURL := fmt.Sprintf("https://vaishnavacalendar.org/%s/%d/en/", citySlug, gaurabdaYear)
	cacheKey := fmt.Sprintf("%s:%s", monthStart.Format("2006-01"), pageURL)
	if cached, ok := loadCachedISKCONMonth(cacheKey); ok {
		return cached, nil
	}

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Get(pageURL)
	if err != nil {
		recordEkadashiProviderStatus("iskcon", pageURL, false, err.Error())
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		recordEkadashiProviderStatus("iskcon", pageURL, false, fmt.Sprintf("unexpected status: %d", resp.StatusCode))
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		recordEkadashiProviderStatus("iskcon", pageURL, false, err.Error())
		return nil, err
	}

	days, err := parseISKCONHTMLMonth(string(body), monthStart, locData, org, pageURL)
	if err != nil {
		recordEkadashiProviderStatus("iskcon", pageURL, false, err.Error())
		return nil, err
	}
	if len(days) == 0 {
		recordEkadashiProviderStatus("iskcon", pageURL, false, "no ekadashi days parsed")
		return nil, fmt.Errorf("no ekadashi days parsed")
	}

	iskconProviderCache.Store(cacheKey, cachedISKCONMonth{
		expiresAt: time.Now().Add(6 * time.Hour),
		days:      days,
	})
	recordEkadashiProviderStatus("iskcon", pageURL, true, "")
	return days, nil
}

func loadCachedISKCONMonth(cacheKey string) ([]models.EkadashiDay, bool) {
	value, ok := iskconProviderCache.Load(cacheKey)
	if !ok {
		return nil, false
	}
	cached, ok := value.(cachedISKCONMonth)
	if !ok || time.Now().After(cached.expiresAt) {
		iskconProviderCache.Delete(cacheKey)
		return nil, false
	}
	return cached.days, true
}

func GetISKCONProviderCacheSnapshot() []ISKCONProviderCacheEntry {
	snapshot := make([]ISKCONProviderCacheEntry, 0, 8)
	now := time.Now()
	iskconProviderCache.Range(func(key, value any) bool {
		cacheKey, ok := key.(string)
		if !ok {
			return true
		}
		cached, ok := value.(cachedISKCONMonth)
		if !ok {
			return true
		}
		parts := strings.SplitN(cacheKey, ":", 2)
		entry := ISKCONProviderCacheEntry{
			CacheKey:  cacheKey,
			ExpiresAt: cached.expiresAt.Format(time.RFC3339),
			DaysCount: len(cached.days),
			Expired:   now.After(cached.expiresAt),
		}
		if len(parts) > 0 {
			entry.Month = parts[0]
		}
		if len(parts) == 2 {
			entry.SourceURL = parts[1]
		}
		snapshot = append(snapshot, entry)
		return true
	})
	sort.Slice(snapshot, func(i, j int) bool {
		return snapshot[i].CacheKey < snapshot[j].CacheKey
	})
	return snapshot
}

func parseISKCONHTMLMonth(rawHTML string, monthStart time.Time, locData locationSnapshot, org models.EkadashiOrganization, pageURL string) ([]models.EkadashiDay, error) {
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
	currentMonth := time.Month(0)
	currentYear := 0
	result := make([]models.EkadashiDay, 0, 4)
	var lastEkadashiIndex = -1

	for _, line := range lines {
		if httpMonthHeaderRE.MatchString(line) {
			parsedMonth, parsedYear, parseErr := parseMonthHeader(line)
			if parseErr == nil {
				currentMonth = parsedMonth
				currentYear = parsedYear
			}
			continue
		}

		match := httpEventLineRE.FindStringSubmatch(line)
		if len(match) != 3 || currentMonth == 0 || currentYear == 0 {
			continue
		}

		dayNumber, dayText := match[1], match[2]
		dayTime, dayErr := time.ParseInLocation("2006-1-2", fmt.Sprintf("%d-%d-%s", currentYear, int(currentMonth), dayNumber), loc)
		if dayErr != nil {
			continue
		}

		if paranaMatch := httpParanaRangeRE.FindStringSubmatch(dayText); len(paranaMatch) == 3 {
			if lastEkadashiIndex >= 0 {
				paranaStart, paranaEnd, parseErr := buildParanaWindow(dayTime, paranaMatch[1], paranaMatch[2], loc)
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

		if currentMonth != targetMonth || currentYear != targetYear {
			continue
		}
		if !strings.Contains(dayText, "Ekadashi") && !strings.Contains(dayText, "Mahadvadashi") {
			continue
		}

		title, subtitle, isMahadvadashi := parseISKCONEventTitles(dayText, org.Name)
		notes := fmt.Sprintf("Loaded from vaishnavacalendar.org for %s.", chooseLocationLabel(locData.City, locData.TimeZone))
		dateString := dayTime.Format("2006-01-02")

		result = append(result, models.EkadashiDay{
			Date:             dateString,
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
			ObservanceNotes:  notes,
			Source:           "vaishnavacalendar.org",
			SourceURL:        pageURL,
		})
		lastEkadashiIndex = len(result) - 1
	}

	sort.Slice(result, func(i, j int) bool { return result[i].Date < result[j].Date })
	return result, nil
}

func extractHTMLTextLines(rawHTML string) ([]string, error) {
	tokenizer := xhtml.NewTokenizer(strings.NewReader(rawHTML))
	lines := make([]string, 0, 256)

	for {
		switch tokenizer.Next() {
		case xhtml.ErrorToken:
			if tokenizer.Err() == io.EOF {
				return lines, nil
			}
			return nil, tokenizer.Err()
		case xhtml.TextToken:
			text := strings.TrimSpace(stdhtml.UnescapeString(string(tokenizer.Text())))
			text = strings.Join(strings.Fields(text), " ")
			if text == "" {
				continue
			}
			if len(lines) > 0 && lines[len(lines)-1] == text {
				continue
			}
			lines = append(lines, text)
		}
	}
}

func parseMonthHeader(value string) (time.Month, int, error) {
	parts := strings.Fields(strings.TrimSpace(value))
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("invalid month header")
	}
	parsedTime, err := time.Parse("January 2006", strings.Join(parts, " "))
	if err != nil {
		return 0, 0, err
	}
	return parsedTime.Month(), parsedTime.Year(), nil
}

func parseISKCONEventTitles(dayText, organizationName string) (string, string, bool) {
	segments := strings.Split(dayText, ".")
	normalized := make([]string, 0, len(segments))
	for _, segment := range segments {
		segment = strings.TrimSpace(segment)
		if segment != "" {
			normalized = append(normalized, segment)
		}
	}

	isMahadvadashi := strings.Contains(dayText, "Mahadvadashi")
	title := "Ekadashi"
	subtitle := fmt.Sprintf("%s observance", organizationName)
	for _, segment := range normalized {
		if strings.Contains(segment, "Fast") || strings.Contains(segment, "Paran") {
			continue
		}
		if strings.Contains(segment, "Mahadvadashi") {
			title = segment
			subtitle = fmt.Sprintf("%s observance", organizationName)
			isMahadvadashi = true
			continue
		}
		if strings.Contains(segment, "Ekadashi") {
			title = segment
		}
	}
	return title, subtitle, isMahadvadashi
}

func buildParanaWindow(dayTime time.Time, startHHMM, endHHMM string, loc *time.Location) (time.Time, time.Time, error) {
	startClock, err := time.ParseInLocation("15:04", startHHMM, loc)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	endClock, err := time.ParseInLocation("15:04", endHHMM, loc)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	start := time.Date(dayTime.Year(), dayTime.Month(), dayTime.Day(), startClock.Hour(), startClock.Minute(), 0, 0, loc)
	end := time.Date(dayTime.Year(), dayTime.Month(), dayTime.Day(), endClock.Hour(), endClock.Minute(), 0, 0, loc)
	return start, end, nil
}

func buildVaishnavaCalendarCitySlug(city string) string {
	city = strings.ToLower(strings.TrimSpace(city))
	replacer := strings.NewReplacer(
		" ", "_",
		"-", "_",
		",", "",
		".", "",
		"'", "",
		"(", "",
		")", "",
	)
	city = replacer.Replace(city)
	city = strings.Trim(city, "_")
	for strings.Contains(city, "__") {
		city = strings.ReplaceAll(city, "__", "_")
	}
	return city
}

func recordEkadashiProviderStatus(providerID, sourceURL string, success bool, lastError string) {
	if database.DB == nil {
		return
	}
	key := "EKADASHI_PROVIDER_STATUS_" + strings.ToUpper(strings.TrimSpace(providerID))
	value := fmt.Sprintf(`{"providerId":"%s","success":%t,"sourceUrl":"%s","checkedAt":"%s","lastError":%q}`,
		providerID,
		success,
		sourceURL,
		time.Now().Format(time.RFC3339),
		strings.TrimSpace(lastError),
	)
	var setting models.SystemSetting
	_ = database.DB.Where("key = ?", key).Assign(models.SystemSetting{Value: value}).FirstOrCreate(&setting, models.SystemSetting{Key: key}).Error
}
