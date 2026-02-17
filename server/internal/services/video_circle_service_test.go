package services

import (
	"testing"
	"time"

	"rag-agent-server/internal/models"
)

func TestMapBoostTypeToTariffCode(t *testing.T) {
	cases := []struct {
		name  string
		input models.VideoBoostType
		want  models.VideoTariffCode
	}{
		{name: "lkm", input: models.VideoBoostTypeLKM, want: models.VideoTariffCodeLKMBoost},
		{name: "city", input: models.VideoBoostTypeCity, want: models.VideoTariffCodeCityBoost},
		{name: "premium", input: models.VideoBoostTypePremium, want: models.VideoTariffCodePremiumBoost},
		{name: "invalid", input: "bad", want: ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := mapBoostTypeToTariffCode(tc.input); got != tc.want {
				t.Fatalf("mapBoostTypeToTariffCode(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestNormalizeS3Key(t *testing.T) {
	s3Service := &S3Service{publicURL: "https://cdn.example.com"}

	if got := normalizeS3Key(s3Service, "https://cdn.example.com/videos/1/file.mp4"); got != "videos/1/file.mp4" {
		t.Fatalf("unexpected key for public url: %s", got)
	}

	if got := normalizeS3Key(s3Service, "videos/2/thumb.jpg"); got != "videos/2/thumb.jpg" {
		t.Fatalf("unexpected key for plain key: %s", got)
	}
}

func TestCalculateVideoCircleTotalPages(t *testing.T) {
	tests := []struct {
		name  string
		total int64
		limit int
		want  int
	}{
		{name: "zero total", total: 0, limit: 20, want: 1},
		{name: "exact division", total: 100, limit: 20, want: 5},
		{name: "with remainder", total: 101, limit: 20, want: 6},
		{name: "invalid limit", total: 10, limit: 0, want: 1},
		{name: "very large total", total: int64(^uint(0) >> 1), limit: 1, want: int(int64(^uint(0) >> 1))},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := calculateVideoCircleTotalPages(tc.total, tc.limit); got != tc.want {
				t.Fatalf("calculateVideoCircleTotalPages(%d, %d) = %d, want %d", tc.total, tc.limit, got, tc.want)
			}
		})
	}
}

func TestRemainingSecondsUntil(t *testing.T) {
	now := time.Now().UTC()
	if got := remainingSecondsUntil(now.Add(30*time.Second), now); got != 30 {
		t.Fatalf("expected 30 seconds, got %d", got)
	}
	if got := remainingSecondsUntil(now.Add(500*time.Millisecond), now); got != 1 {
		t.Fatalf("expected 1 second for positive sub-second duration, got %d", got)
	}
	if got := remainingSecondsUntil(now.Add(-1*time.Second), now); got != 0 {
		t.Fatalf("expected 0 seconds for past time, got %d", got)
	}
	if got := remainingSecondsUntil(now.Add(1500*time.Millisecond), now); got != 2 {
		t.Fatalf("expected ceil rounding to 2 seconds, got %d", got)
	}
}
