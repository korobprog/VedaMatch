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

func TestValidateRegistrationCredentials(t *testing.T) {
	require.NoError(t, validateRegistrationCredentials("user@example.com", "password1"))
	require.Error(t, validateRegistrationCredentials("", "password1"))
	require.Error(t, validateRegistrationCredentials("user@example.com", ""))
	require.Error(t, validateRegistrationCredentials("not-an-email", "password1"))
	require.Error(t, validateRegistrationCredentials("user@example.com", "пароль"))
	require.NoError(t, validateRegistrationCredentials("user@example.com", "пароль12"))
}

func TestSanitizeAvatarExtension(t *testing.T) {
	require.Equal(t, ".jpg", sanitizeAvatarExtension("avatar.JPG"))
	require.Equal(t, ".png", sanitizeAvatarExtension(" avatar.png "))
	require.Equal(t, "", sanitizeAvatarExtension("avatar"))
	require.Equal(t, "", sanitizeAvatarExtension("avatar.bad-ext!"))
}

func TestAvatarFileValidators(t *testing.T) {
	require.True(t, isAllowedAvatarExtension(".jpg"))
	require.True(t, isAllowedAvatarExtension(".HEIC"))
	require.False(t, isAllowedAvatarExtension(".exe"))

	require.True(t, isAllowedAvatarContentType("image/png"))
	require.True(t, isAllowedAvatarContentType(" IMAGE/WEBP "))
	require.False(t, isAllowedAvatarContentType("application/json"))
}
