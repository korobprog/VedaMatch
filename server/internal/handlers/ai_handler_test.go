package handlers

import "testing"

func TestNormalizeSchedulerInterval(t *testing.T) {
	t.Parallel()

	if got := normalizeSchedulerInterval(0); got != defaultSchedulerIntervalMinutes {
		t.Fatalf("interval=0 -> %d, want %d", got, defaultSchedulerIntervalMinutes)
	}
	if got := normalizeSchedulerInterval(-10); got != defaultSchedulerIntervalMinutes {
		t.Fatalf("interval=-10 -> %d, want %d", got, defaultSchedulerIntervalMinutes)
	}
	if got := normalizeSchedulerInterval(15); got != 15 {
		t.Fatalf("interval=15 -> %d, want 15", got)
	}
	if got := normalizeSchedulerInterval(99999); got != maxSchedulerIntervalMinutes {
		t.Fatalf("interval=99999 -> %d, want %d", got, maxSchedulerIntervalMinutes)
	}
}

func TestMaskKey(t *testing.T) {
	t.Parallel()

	if got := maskKey("12345678"); got != "12345678" {
		t.Fatalf("short key should stay unchanged, got %q", got)
	}
	if got := maskKey("1234567890"); got != "123456...90" {
		t.Fatalf("masked key mismatch: %q", got)
	}
}
