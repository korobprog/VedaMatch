package lila

import (
	"testing"
	"time"
)

func TestEventWithTargetsDeduplicatesRecipients(t *testing.T) {
	event := NewEvent(EventRoundStarted, "match-1", 42, 2, map[string]interface{}{"ok": true}, time.Now(), 4).WithTargets(7, 7, 0, 9)

	targets := event.GetTargetUserIDs()
	if len(targets) != 2 {
		t.Fatalf("expected 2 targets, got %d", len(targets))
	}
	if targets[0] != 7 || targets[1] != 9 {
		t.Fatalf("unexpected targets: %#v", targets)
	}
	if got := event.GetType(); got != string(EventRoundStarted) {
		t.Fatalf("unexpected event type: %s", got)
	}
	if got := event.GetSenderID(); got != 42 {
		t.Fatalf("unexpected sender id: %d", got)
	}
	if event.StateVersion != 4 {
		t.Fatalf("unexpected state version: %d", event.StateVersion)
	}
}
