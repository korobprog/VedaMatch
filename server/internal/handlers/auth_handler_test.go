package handlers

import (
	"rag-agent-server/internal/models"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestApplyPortalRoleAndGodMode_StoresGodModeEnabled(t *testing.T) {
	user := &models.User{
		Role:           models.RoleUser,
		GodModeEnabled: false,
	}

	applyPortalRoleAndGodMode(user, models.RoleDevotee, true)
	require.Equal(t, models.RoleDevotee, user.Role)
	require.True(t, user.GodModeEnabled)
}

func TestApplyPortalRoleAndGodMode_RejectsAdminRoleOnPublicFlow(t *testing.T) {
	user := &models.User{}

	applyPortalRoleAndGodMode(user, models.RoleAdmin, true)
	require.Equal(t, models.RoleUser, user.Role)
	require.True(t, user.GodModeEnabled)
}

func TestIsAdminRoleRequested(t *testing.T) {
	require.True(t, isAdminRoleRequested(models.RoleAdmin))
	require.True(t, isAdminRoleRequested("  SUPERADMIN "))
	require.False(t, isAdminRoleRequested(models.RoleUser))
}
