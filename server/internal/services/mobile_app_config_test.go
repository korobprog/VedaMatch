package services

import "testing"

func TestFormatVersionLabel(t *testing.T) {
	tests := []struct {
		name    string
		version string
		build   string
		want    string
	}{
		{name: "full", version: "1.1.43", build: "45", want: "1.1.43 (45)"},
		{name: "version only", version: "1.1.43", build: "", want: "1.1.43"},
		{name: "build only", version: "", build: "45", want: "45"},
		{name: "empty", version: "", build: "", want: ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := formatVersionLabel(tc.version, tc.build); got != tc.want {
				t.Fatalf("formatVersionLabel(%q, %q) = %q, want %q", tc.version, tc.build, got, tc.want)
			}
		})
	}
}

func TestReadCurrentMobileAppVersions(t *testing.T) {
	androidVersion := readAndroidAppVersion()
	if androidVersion == "" {
		t.Fatalf("expected non-empty Android version")
	}

	iosVersion := readIOSAppVersion()
	if iosVersion == "" {
		t.Fatalf("expected non-empty iOS version")
	}
}

func TestParseAndroidAppVersion(t *testing.T) {
	content := `
android {
    defaultConfig {
        versionName "1.1.43"
        versionCode 45
    }
}
`

	if got := parseAndroidAppVersion(content); got != "1.1.43 (45)" {
		t.Fatalf("parseAndroidAppVersion() = %q, want %q", got, "1.1.43 (45)")
	}
}

func TestParseAndroidAppVersion_WithSingleQuotesAndWhitespace(t *testing.T) {
	content := `
defaultConfig {
    versionName   '2.0.1'
    versionCode   77
}
`

	if got := parseAndroidAppVersion(content); got != "2.0.1 (77)" {
		t.Fatalf("parseAndroidAppVersion() = %q, want %q", got, "2.0.1 (77)")
	}
}

func TestParseIOSAppVersion(t *testing.T) {
	content := `
				CURRENT_PROJECT_VERSION = 11;
				MARKETING_VERSION = 1.1.19;
				CURRENT_PROJECT_VERSION = 11;
				MARKETING_VERSION = 1.1.19;
`

	if got := parseIOSAppVersion(content); got != "1.1.19 (11)" {
		t.Fatalf("parseIOSAppVersion() = %q, want %q", got, "1.1.19 (11)")
	}
}

func TestParseIOSAppVersion_UsesLastNonEmptyMatch(t *testing.T) {
	content := `
				CURRENT_PROJECT_VERSION = 10;
				MARKETING_VERSION = 1.0.0;
				CURRENT_PROJECT_VERSION = 12;
				MARKETING_VERSION = 1.2.0;
`

	if got := parseIOSAppVersion(content); got != "1.2.0 (12)" {
		t.Fatalf("parseIOSAppVersion() = %q, want %q", got, "1.2.0 (12)")
	}
}
