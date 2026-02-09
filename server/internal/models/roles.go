package models

import "strings"

const (
	RoleUser       = "user"
	RoleInGoodness = "in_goodness"
	RoleYogi       = "yogi"
	RoleDevotee    = "devotee"
	RoleAdmin      = "admin"
	RoleSuperadmin = "superadmin"
)

func normalizeRole(role string) string {
	return strings.ToLower(strings.TrimSpace(role))
}

func IsAdminRole(role string) bool {
	switch normalizeRole(role) {
	case RoleAdmin, RoleSuperadmin:
		return true
	default:
		return false
	}
}

// IsPortalRole returns true for regular user segmentation roles.
func IsPortalRole(role string) bool {
	switch normalizeRole(role) {
	case RoleUser, RoleInGoodness, RoleYogi, RoleDevotee:
		return true
	default:
		return false
	}
}

func IsValidUserRole(role string) bool {
	return IsPortalRole(role) || IsAdminRole(role)
}
