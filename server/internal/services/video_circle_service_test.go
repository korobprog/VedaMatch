package services

import (
	"testing"

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
