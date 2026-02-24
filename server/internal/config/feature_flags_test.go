package config

import "testing"

func TestContactsLegacyModeEnabled_DefaultFalse(t *testing.T) {
	t.Setenv("FF_CONTACTS_LEGACY_MODE", "")
	if ContactsLegacyModeEnabled() {
		t.Fatalf("expected FF_CONTACTS_LEGACY_MODE default to false")
	}
}

func TestContactsLegacyModeEnabled_OverrideTrue(t *testing.T) {
	t.Setenv("FF_CONTACTS_LEGACY_MODE", "true")
	if !ContactsLegacyModeEnabled() {
		t.Fatalf("expected FF_CONTACTS_LEGACY_MODE=true to enable legacy mode")
	}
}
