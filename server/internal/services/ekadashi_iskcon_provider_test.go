package services

import (
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/models"
)

func TestParseISKCONHTMLMonth(t *testing.T) {
	html := `
	<html><body>
	<h2>March 2025</h2>
	<p>10. (Mon) Gaura Ekadashi. Papa Nashini Mahadvadashi. Fast.</p>
	<p>11. (Tue) Gaura Dvadashi. Paran between 07:13 and 11:08</p>
	<p>25. (Tue) Krishna Ekadashi. Papa Vimochani Ekadashi. Fast.</p>
	<p>26. (Wed) Krishna Dvadashi. Paran between 06:49 and 10:57</p>
	</body></html>`

	days, err := parseISKCONHTMLMonth(html, time.Date(2025, time.March, 1, 0, 0, 0, 0, time.UTC), locationSnapshot{
		TimeZone: "Asia/Kolkata",
		City:     "New York",
		Country:  "USA",
	}, models.EkadashiOrganization{ID: "iskcon", Name: "ISKCON"}, "https://vaishnavacalendar.org/new_york/539/en/")
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	if len(days) != 2 {
		t.Fatalf("expected 2 ekadashi days, got %d", len(days))
	}
	if !days[0].IsMahadvadashi {
		t.Fatalf("expected first day to be mahadvadashi")
	}
	if days[0].ParanaStartAt == nil || !strings.Contains(*days[0].ParanaStartAt, "07:13") {
		t.Fatalf("expected parsed parana start on first entry")
	}
	if days[1].DisplayTitle != "Papa Vimochani Ekadashi" {
		t.Fatalf("unexpected title: %s", days[1].DisplayTitle)
	}
	if days[1].FastStartAt != nil {
		t.Fatalf("expected no exact fast start from live provider")
	}
}

func TestBuildVaishnavaCalendarCitySlug(t *testing.T) {
	if got := buildVaishnavaCalendarCitySlug("Novgorod The Great"); got != "novgorod_the_great" {
		t.Fatalf("unexpected slug: %s", got)
	}
}
