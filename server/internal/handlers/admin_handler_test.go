package handlers

import "testing"

func TestValidateAdminCredentials(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		password string
		wantErr  bool
	}{
		{
			name:     "valid credentials",
			email:    "admin@example.com",
			password: "securepass",
			wantErr:  false,
		},
		{
			name:     "invalid email",
			email:    "not-an-email",
			password: "securepass",
			wantErr:  true,
		},
		{
			name:     "unicode short by runes",
			email:    "admin@example.com",
			password: "пароль",
			wantErr:  true,
		},
		{
			name:     "unicode valid by runes",
			email:    "admin@example.com",
			password: "пароль12",
			wantErr:  false,
		},
		{
			name:     "empty fields",
			email:    " ",
			password: " ",
			wantErr:  true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateAdminCredentials(tc.email, tc.password)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestParseAdminQueryInt(t *testing.T) {
	if got := parseAdminQueryInt(" 42 ", 10, 1, 100); got != 42 {
		t.Fatalf("expected 42, got %d", got)
	}
	if got := parseAdminQueryInt("bad", 10, 1, 100); got != 10 {
		t.Fatalf("expected fallback 10, got %d", got)
	}
	if got := parseAdminQueryInt("-5", 10, 1, 100); got != 1 {
		t.Fatalf("expected clamped min 1, got %d", got)
	}
	if got := parseAdminQueryInt("500", 10, 1, 100); got != 100 {
		t.Fatalf("expected clamped max 100, got %d", got)
	}
}

func TestIsSensitiveSystemSettingKey(t *testing.T) {
	if !isSensitiveSystemSettingKey("api_open_ai") {
		t.Fatalf("expected lowercase API_OPEN_AI to be treated as sensitive")
	}
	if !isSensitiveSystemSettingKey(" gemini_api_key_2 ") {
		t.Fatalf("expected GEMINI key with spaces to be treated as sensitive")
	}
	if isSensitiveSystemSettingKey("PUBLIC_SITE_NAME") {
		t.Fatalf("expected PUBLIC_SITE_NAME to be non-sensitive")
	}
}
