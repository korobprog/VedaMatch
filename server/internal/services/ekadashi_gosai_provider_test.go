package services

import (
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/models"
)

func TestParseGosaiHTMLMonth(t *testing.T) {
	html := `
	<html><body>
	<p>March 10 — Sri Govinda Mahadvadashi / Ekadasi fast</p>
	<p>March 11 — Paran between 6:50 am and 8:28 am</p>
	<p>March 25 — Papa Vimochani Ekadasi fast</p>
	<p>March 26 — Paran between 7:01 am and 9:10 am</p>
	</body></html>`

	days, err := parseGosaiHTMLMonth(html, time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC), locationSnapshot{
		TimeZone: "Asia/Kolkata",
		City:     "Mayapur",
		Country:  "India",
	}, models.EkadashiOrganization{ID: "sri_chaitanya_math", Name: "Sri Chaitanya Math"}, "https://www.gosai.com/calendar/")
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	if len(days) != 2 {
		t.Fatalf("expected 2 ekadashi days, got %d", len(days))
	}
	if !days[0].IsMahadvadashi {
		t.Fatalf("expected first day to be mahadvadashi")
	}
	if days[0].ParanaStartAt == nil || !strings.Contains(*days[0].ParanaStartAt, "06:50") {
		t.Fatalf("expected parsed parana window on first entry")
	}
	if days[1].DisplayTitle != "Papa Vimochani Ekadasi" {
		t.Fatalf("unexpected title: %s", days[1].DisplayTitle)
	}
}

func TestParseGosaiHTMLMonthShortAnnualFormat(t *testing.T) {
	html := `
	<html><body>
	<h2>MARCH 2026</h2>
	<p>Mar 10 — Sri Govinda Mahadvadashi / Ekadasi fast</p>
	<p>Mar 11 — Paran between 6:50 am and 8:28 am</p>
	<p>Mar 25 — Papa Vimochani Ekadasi fast</p>
	<p>Mar 26 — Paran between 7:01 am and 9:10 am</p>
	</body></html>`

	days, err := parseGosaiHTMLMonth(html, time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC), locationSnapshot{
		TimeZone: "Asia/Kolkata",
		City:     "Mayapur",
		Country:  "India",
	}, models.EkadashiOrganization{ID: "pure_bhakti", Name: "Pure Bhakti"}, "https://gosai.com/calendar")
	if err != nil {
		t.Fatalf("parse short annual html: %v", err)
	}
	if len(days) != 2 {
		t.Fatalf("expected 2 ekadashi days, got %d", len(days))
	}
	if !days[0].IsMahadvadashi {
		t.Fatalf("expected first day to be mahadvadashi")
	}
	if days[0].ParanaStartAt == nil || !strings.Contains(*days[0].ParanaStartAt, "06:50") {
		t.Fatalf("expected parsed parana window on first entry")
	}
	if days[1].ParanaStartAt == nil || !strings.Contains(*days[1].ParanaStartAt, "07:01") {
		t.Fatalf("expected parsed parana window on second entry")
	}
}

func TestParseGosaiHTMLMonthSCMathFormat(t *testing.T) {
	html := `
	<html><body>
	<h2>March 2026</h2>
	<p>15. (Sun) Krishna Ekadashi. Papa Vimochani Ekadashi. Fast (in Nabadwip).</p>
	<p>16. (Mon) Krishna Dvadashi. Paran between 05:51 and 07:59.</p>
	<p>29. (Sun) Gaura Ekadashi. Kamada Ekadashi. Fast (in Nabadwip).</p>
	<p>30. (Mon) Gaura Dvadashi. Paran between 05:31 and 09:49.</p>
	</body></html>`

	days, err := parseGosaiHTMLMonth(html, time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC), locationSnapshot{
		TimeZone: "Asia/Kolkata",
		City:     "Nabadwip",
		Country:  "India",
	}, models.EkadashiOrganization{ID: "sri_chaitanya_math", Name: "Sri Chaitanya Math"}, "https://www.scsmath.com/events/calendar/index.html")
	if err != nil {
		t.Fatalf("parse scsmath html: %v", err)
	}
	if len(days) != 2 {
		t.Fatalf("expected 2 ekadashi days, got %d", len(days))
	}
	if days[0].ParanaStartAt == nil || !strings.Contains(*days[0].ParanaStartAt, "05:51") {
		t.Fatalf("expected parsed parana window on first entry")
	}
	if days[1].DisplayTitle != "Kamada Ekadashi" {
		t.Fatalf("unexpected second title: %s", days[1].DisplayTitle)
	}
}
