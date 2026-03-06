package services

import (
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/models"
)

func TestIsEkadashiHourBlocked(t *testing.T) {
	if !isEkadashiHourBlocked(23, 22, 8) {
		t.Fatalf("expected overnight quiet hours to block 23:00")
	}
	if !isEkadashiHourBlocked(6, 22, 8) {
		t.Fatalf("expected overnight quiet hours to block 06:00")
	}
	if isEkadashiHourBlocked(14, 22, 8) {
		t.Fatalf("did not expect 14:00 to be blocked")
	}
}

func TestIsEkadashiReminderDue(t *testing.T) {
	now := time.Date(2026, time.March, 14, 4, 35, 0, 0, time.UTC)
	scheduled := now.Add(-4 * time.Minute)
	if !isEkadashiReminderDue(scheduled, now, 15*time.Minute) {
		t.Fatalf("expected recent reminder to be due")
	}
	if isEkadashiReminderDue(now.Add(2*time.Minute), now, 15*time.Minute) {
		t.Fatalf("future reminder should not be due")
	}
	if isEkadashiReminderDue(now.Add(-20*time.Minute), now, 15*time.Minute) {
		t.Fatalf("expired reminder should not be due")
	}
}

func TestBuildEkadashiReminderMessageLocalization(t *testing.T) {
	scheduledAt := time.Date(2026, time.March, 15, 6, 26, 0, 0, time.UTC)
	message := buildEkadashiReminderMessage("hi", models.EkadashiDay{
		Date:             "2026-03-14",
		OrganizationID:   "iskcon",
		OrganizationName: "ISKCON",
		DisplayTitle:     "Ekadashi",
	}, ekadashiReminderParana, scheduledAt)

	if message.Data["screen"] != "EkadashiCalendar" {
		t.Fatalf("expected EkadashiCalendar deep link")
	}
	if !strings.Contains(message.Title, "पारण") {
		t.Fatalf("expected Hindi title, got %q", message.Title)
	}
	if !strings.Contains(message.Body, "ISKCON") {
		t.Fatalf("expected organization in body, got %q", message.Body)
	}
}
