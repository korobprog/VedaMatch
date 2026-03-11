package handlers

import (
	"testing"

	"rag-agent-server/internal/models"
)

func TestBuildPortalServiceVisibilityRuntimeMapForRegularUser(t *testing.T) {
	message := "Service is temporarily unavailable"
	rows := []models.PortalServiceVisibility{
		{
			ServiceID:          "chat",
			Mode:               models.PortalServiceModeHidden,
			MaintenanceMessage: &message,
		},
		{
			ServiceID:       "rooms",
			Mode:            models.PortalServiceModeBeta,
			TesterAllowlist: `[42]`,
		},
	}

	runtimeMap, err := buildPortalServiceVisibilityRuntimeMap(7, models.RoleUser, rows)
	if err != nil {
		t.Fatalf("buildPortalServiceVisibilityRuntimeMap returned error: %v", err)
	}

	if runtimeMap["chat"].Visible {
		t.Fatalf("expected hidden service to stay hidden for regular user")
	}
	if runtimeMap["chat"].MaintenanceMessage != message {
		t.Fatalf("expected maintenance message to be preserved, got %q", runtimeMap["chat"].MaintenanceMessage)
	}
	if runtimeMap["rooms"].Visible {
		t.Fatalf("expected beta service to stay hidden outside allowlist")
	}
}

func TestBuildPortalServiceVisibilityRuntimeMapForAllowlistedTester(t *testing.T) {
	rows := []models.PortalServiceVisibility{
		{
			ServiceID:       "rooms",
			Mode:            models.PortalServiceModeBeta,
			TesterAllowlist: `[42]`,
		},
	}

	runtimeMap, err := buildPortalServiceVisibilityRuntimeMap(42, models.RoleUser, rows)
	if err != nil {
		t.Fatalf("buildPortalServiceVisibilityRuntimeMap returned error: %v", err)
	}

	if !runtimeMap["rooms"].Visible {
		t.Fatalf("expected beta service to be visible for allowlisted tester")
	}
}

func TestBuildPortalServiceVisibilityRuntimeMapForAdminsBypassesVisibilityRules(t *testing.T) {
	roles := []string{models.RoleAdmin, models.RoleSuperadmin}
	rows := []models.PortalServiceVisibility{
		{
			ServiceID:       "chat",
			Mode:            models.PortalServiceModeHidden,
			TesterAllowlist: `[]`,
		},
		{
			ServiceID:       "rooms",
			Mode:            models.PortalServiceModeBeta,
			TesterAllowlist: `[999]`,
		},
	}

	for _, role := range roles {
		runtimeMap, err := buildPortalServiceVisibilityRuntimeMap(1, role, rows)
		if err != nil {
			t.Fatalf("buildPortalServiceVisibilityRuntimeMap returned error for role %s: %v", role, err)
		}
		if !runtimeMap["chat"].Visible {
			t.Fatalf("expected hidden service to stay visible for %s", role)
		}
		if !runtimeMap["rooms"].Visible {
			t.Fatalf("expected beta service to stay visible for %s", role)
		}
	}
}
