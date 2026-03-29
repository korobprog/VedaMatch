package services

import (
	"rag-agent-server/internal/models"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNormalizeAdminPushCampaignCreateRequestImmediate(t *testing.T) {
	now := time.Date(2026, 3, 29, 16, 0, 0, 0, time.UTC)
	req, err := normalizeAdminPushCampaignCreateRequest(models.AdminPushCampaignCreateRequest{
		SendMode:   "now",
		TargetMode: "segment",
		Title:      "  Hello ",
		Body:       " world ",
		Priority:   "normal",
		SegmentFilters: models.AdminPushSegmentFilters{
			Role:   " User ",
			Status: " ACTIVE ",
		},
	}, now)
	require.NoError(t, err)
	require.Equal(t, "now", req.SendMode)
	require.Equal(t, "segment", req.TargetMode)
	require.Equal(t, "Hello", req.Title)
	require.Equal(t, "world", req.Body)
	require.Equal(t, "default", req.Priority)
	require.True(t, req.SegmentFilters.HasPushToken)
	require.Equal(t, "user", req.SegmentFilters.Role)
	require.Equal(t, "active", req.SegmentFilters.Status)
	require.Nil(t, req.ScheduledFor)
}

func TestNormalizeAdminPushCampaignCreateRequestScheduledRequiresFutureTime(t *testing.T) {
	now := time.Date(2026, 3, 29, 16, 0, 0, 0, time.UTC)
	past := now.Add(-time.Minute)
	_, err := normalizeAdminPushCampaignCreateRequest(models.AdminPushCampaignCreateRequest{
		SendMode:     "scheduled",
		TargetMode:   "user",
		TargetUserID: uintPtr(42),
		Title:        "Test",
		Body:         "Body",
		ScheduledFor: &past,
	}, now)
	require.Error(t, err)
	require.Contains(t, err.Error(), "future")

	future := time.Date(2026, 3, 29, 20, 0, 0, 0, time.FixedZone("MSK", 3*3600))
	req, err := normalizeAdminPushCampaignCreateRequest(models.AdminPushCampaignCreateRequest{
		SendMode:     "scheduled",
		TargetMode:   "user",
		TargetUserID: uintPtr(42),
		Title:        "Test",
		Body:         "Body",
		ScheduledFor: &future,
	}, now)
	require.NoError(t, err)
	require.NotNil(t, req.ScheduledFor)
	require.Equal(t, time.Date(2026, 3, 29, 17, 0, 0, 0, time.UTC), req.ScheduledFor.UTC())
}

func TestDeriveAdminPushCampaignFinalStatus(t *testing.T) {
	require.Equal(t, string(models.AdminPushCampaignStatusSent), deriveAdminPushCampaignFinalStatus(0, 0))
	require.Equal(t, string(models.AdminPushCampaignStatusFailed), deriveAdminPushCampaignFinalStatus(0, 2))
	require.Equal(t, string(models.AdminPushCampaignStatusPartialFailed), deriveAdminPushCampaignFinalStatus(3, 1))
}

func TestFormatAdminPushRecipientName(t *testing.T) {
	require.Equal(t, "Bhakta (Ivan)", formatAdminPushRecipientName("Bhakta", "Ivan"))
	require.Equal(t, "Bhakta", formatAdminPushRecipientName("Bhakta", ""))
	require.Equal(t, "Ivan", formatAdminPushRecipientName("", "Ivan"))
}

func uintPtr(value uint) *uint {
	return &value
}
