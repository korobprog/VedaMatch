package services

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveSupportConfig_EnvFallback(t *testing.T) {
	t.Setenv("ROOMS_SUPPORT_ENABLED", "true")
	t.Setenv("ROOMS_SUPPORT_PROJECT_ID", "44")
	t.Setenv("ROOMS_SUPPORT_DEFAULT_AMOUNT", "25")
	t.Setenv("ROOMS_SUPPORT_PROMPT_COOLDOWN_HOURS", "12")
	t.Setenv("ROOMS_SUPPORT_PLATFORM_CONTRIBUTION_ENABLED", "true")
	t.Setenv("ROOMS_SUPPORT_PLATFORM_CONTRIBUTION_DEFAULT", "7")

	cfg := ResolveSupportConfig("rooms")
	require.True(t, cfg.Enabled)
	require.Equal(t, 44, cfg.ProjectID)
	require.Equal(t, 25, cfg.DefaultAmount)
	require.Equal(t, 12, cfg.CooldownHours)
	require.Equal(t, 7, cfg.PlatformContributionDefault)
}

func TestResolveSupportConfig_DisablesWithoutProject(t *testing.T) {
	t.Setenv("SEVA_SUPPORT_ENABLED", "true")
	t.Setenv("SEVA_SUPPORT_PROJECT_ID", "")

	cfg := ResolveSupportConfig("seva")
	require.False(t, cfg.Enabled)
	require.Equal(t, 0, cfg.ProjectID)
}

func TestSupportFundAccountCode_Multimedia(t *testing.T) {
	require.Equal(t, "multimedia_fund", SupportFundAccountCode("multimedia"))
}
