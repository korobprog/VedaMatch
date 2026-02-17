package services

import (
	"encoding/json"
	"testing"
)

func TestValidateTimeRangeHHMM(t *testing.T) {
	t.Parallel()

	start, end, err := validateTimeRangeHHMM(" 09:00 ", "10:30")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if start != "09:00" || end != "10:30" {
		t.Fatalf("unexpected normalized values: start=%q end=%q", start, end)
	}

	if _, _, err := validateTimeRangeHHMM("bad", "10:30"); err == nil {
		t.Fatalf("expected format error for start")
	}
	if _, _, err := validateTimeRangeHHMM("09:00", "09:00"); err == nil {
		t.Fatalf("expected ordering error")
	}
}

func TestValidateDayOfWeek(t *testing.T) {
	t.Parallel()

	if err := validateDayOfWeek(0); err != nil {
		t.Fatalf("day 0 should be valid: %v", err)
	}
	if err := validateDayOfWeek(6); err != nil {
		t.Fatalf("day 6 should be valid: %v", err)
	}
	if err := validateDayOfWeek(-1); err == nil {
		t.Fatalf("expected error for day -1")
	}
	if err := validateDayOfWeek(7); err == nil {
		t.Fatalf("expected error for day 7")
	}
}

func TestNormalizeTimezone(t *testing.T) {
	t.Parallel()

	got, err := normalizeTimezone("")
	if err != nil {
		t.Fatalf("unexpected error for empty timezone: %v", err)
	}
	if got != "Europe/Moscow" {
		t.Fatalf("default timezone = %q, want Europe/Moscow", got)
	}

	got, err = normalizeTimezone("UTC")
	if err != nil {
		t.Fatalf("unexpected error for UTC: %v", err)
	}
	if got != "UTC" {
		t.Fatalf("timezone = %q, want UTC", got)
	}

	if _, err := normalizeTimezone("Not/AZone"); err == nil {
		t.Fatalf("expected invalid timezone error")
	}
}

func TestParseServiceDayKey(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input   string
		want    int
		wantErr bool
	}{
		{input: "monday", want: 1},
		{input: "Sunday", want: 0},
		{input: "6", want: 6},
		{input: " 2 ", want: 2},
		{input: "bad", wantErr: true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			t.Parallel()
			got, err := parseServiceDayKey(tc.input)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %d, want %d", got, tc.want)
			}
		})
	}
}

func TestSettingInt(t *testing.T) {
	t.Parallel()

	settings := map[string]interface{}{
		"float":  float64(5),
		"int":    int(7),
		"int64":  int64(9),
		"number": json.Number("11"),
		"bad":    "oops",
	}

	if got := settingInt(settings, "float", 1); got != 5 {
		t.Fatalf("float -> %d, want 5", got)
	}
	if got := settingInt(settings, "int", 1); got != 7 {
		t.Fatalf("int -> %d, want 7", got)
	}
	if got := settingInt(settings, "int64", 1); got != 9 {
		t.Fatalf("int64 -> %d, want 9", got)
	}
	if got := settingInt(settings, "number", 1); got != 11 {
		t.Fatalf("number -> %d, want 11", got)
	}
	if got := settingInt(settings, "bad", 3); got != 3 {
		t.Fatalf("bad -> %d, want fallback 3", got)
	}
	if got := settingInt(settings, "missing", 4); got != 4 {
		t.Fatalf("missing -> %d, want fallback 4", got)
	}
}
