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
	<h3 class='text-start text-uppercase'>Vishnu</h3>
	<h2 class='text-center'><u>March 2026</u></h2>
	<p class='m3 text-start fs-5'><b>15</b>. (Sun) Krishna Ekadashi. Papa Vimochani <b>Ekadashi</b>. <b>Fast</b> .</p>
	<p class='m3 text-start fs-5'><b>16</b>. (Mon) Krishna Dvadashi. Paran between 07:13 and 11:08 .</p>
	<p class='m3 text-start fs-5'><b>29</b>. (Sun) Gaura Ekadashi. Kamada <b>Ekadashi</b>. <b>Fast</b> .</p>
	<p class='m3 text-start fs-5'><b>30</b>. (Mon) Gaura Dvadashi. Paran between 06:49 and 10:57 .</p>
	</body></html>`

	days, err := parseISKCONHTMLMonth(html, time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC), locationSnapshot{
		TimeZone: "Asia/Kolkata",
		City:     "New York",
		Country:  "USA",
	}, models.EkadashiOrganization{ID: "iskcon", Name: "ISKCON"}, "https://vaishnavacalendar.org/new_york/540/en/")
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	if len(days) != 2 {
		t.Fatalf("expected 2 ekadashi days, got %d", len(days))
	}
	if days[0].IsMahadvadashi {
		t.Fatalf("expected first day to remain ekadashi")
	}
	if days[0].ParanaStartAt == nil || !strings.Contains(*days[0].ParanaStartAt, "07:13") {
		t.Fatalf("expected parsed parana start on first entry")
	}
	if days[0].DisplayTitle != "Papa Vimochani Ekadashi" {
		t.Fatalf("unexpected title on first entry: %s", days[0].DisplayTitle)
	}
	if days[1].DisplayTitle != "Kamada Ekadashi" {
		t.Fatalf("unexpected title on second entry: %s", days[1].DisplayTitle)
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
