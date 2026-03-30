package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"rag-agent-server/internal/services"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

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
	if !isSensitiveSystemSettingKey("telegram_auth_bot_token") {
		t.Fatalf("expected TELEGRAM_AUTH_BOT_TOKEN to be treated as sensitive")
	}
	if isSensitiveSystemSettingKey("PUBLIC_SITE_NAME") {
		t.Fatalf("expected PUBLIC_SITE_NAME to be non-sensitive")
	}
}

func TestIsMaskedSensitiveSystemSettingValue(t *testing.T) {
	if !isMaskedSensitiveSystemSettingValue("TELEGRAM_AUTH_BOT_TOKEN", "************") {
		t.Fatalf("expected masked Telegram auth token to be detected")
	}
	if isMaskedSensitiveSystemSettingValue("PUBLIC_SITE_NAME", "************") {
		t.Fatalf("expected public setting mask-like value to be treated as normal value")
	}
	if isMaskedSensitiveSystemSettingValue("TELEGRAM_AUTH_BOT_TOKEN", "123456:real-token-value") {
		t.Fatalf("expected real Telegram auth token to pass through")
	}
}

func TestIsPolzaSystemSettingKey(t *testing.T) {
	for _, key := range []string{"POLZA_API_KEY", "polza_fast_model", " Polza_Reasoning_Model "} {
		if !isPolzaSystemSettingKey(key) {
			t.Fatalf("expected %q to be treated as polza setting", key)
		}
	}
	if isPolzaSystemSettingKey("API_OPEN_AI") {
		t.Fatalf("expected API_OPEN_AI to stay outside dedicated polza runtime refresh list")
	}
}

func TestParsePositiveAdminParamInt(t *testing.T) {
	app := fiber.New()
	app.Get("/:userId", func(c *fiber.Ctx) error {
		value, err := parsePositiveAdminParamInt(c, "userId", "Invalid user ID")
		if err != nil {
			return err
		}
		return c.JSON(fiber.Map{"userId": value})
	})

	reqValid := httptest.NewRequest("GET", "/5", nil)
	respValid, err := app.Test(reqValid)
	if err != nil {
		t.Fatalf("valid request failed: %v", err)
	}
	defer respValid.Body.Close()
	var payload map[string]int
	if err := json.NewDecoder(respValid.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["userId"] != 5 {
		t.Fatalf("expected userId=5, got %d", payload["userId"])
	}

	reqZero := httptest.NewRequest("GET", "/0", nil)
	respZero, err := app.Test(reqZero)
	if err != nil {
		t.Fatalf("zero request failed: %v", err)
	}
	if respZero.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400 for zero userId, got %d", respZero.StatusCode)
	}
}

func TestBuildPushHealthAlerts_DefaultThresholds(t *testing.T) {
	summary := services.PushHealthSummary{
		TotalEvents:         100,
		DeliverySuccessRate: 89.5,
		RetryRate:           14.0,
		InvalidTokenRate:    16.0,
		FailedEvents:        12,
	}
	alerts := buildPushHealthAlerts(summary, false)
	if len(alerts) != 4 {
		t.Fatalf("expected 4 alerts, got %d", len(alerts))
	}
	if status := getPushHealthStatus(alerts); status != "critical" {
		t.Fatalf("expected status critical, got %q", status)
	}
}

func TestBuildPushHealthAlerts_StrictThresholds(t *testing.T) {
	summary := services.PushHealthSummary{
		TotalEvents:         20,
		DeliverySuccessRate: 96.5,
		RetryRate:           6.0,
		InvalidTokenRate:    11.0,
		FailedEvents:        3,
	}
	alerts := buildPushHealthAlerts(summary, true)
	if len(alerts) != 4 {
		t.Fatalf("expected 4 strict alerts, got %d", len(alerts))
	}
	if status := getPushHealthStatus(alerts); status != "critical" {
		t.Fatalf("expected status critical for strict alerts, got %q", status)
	}
}

func TestGetPushHealthStatus(t *testing.T) {
	if got := getPushHealthStatus(nil); got != "healthy" {
		t.Fatalf("expected healthy with no alerts, got %q", got)
	}
	mediumOnly := []fiber.Map{{"severity": "medium"}}
	if got := getPushHealthStatus(mediumOnly); got != "degraded" {
		t.Fatalf("expected degraded with medium alerts, got %q", got)
	}
	highPresent := []fiber.Map{{"severity": "medium"}, {"severity": "high"}}
	if got := getPushHealthStatus(highPresent); got != "critical" {
		t.Fatalf("expected critical when high alert is present, got %q", got)
	}
}

func TestGetPushHealthStatusEkadashiSummaryShape(t *testing.T) {
	summary := services.PushHealthSummary{
		WindowHours:         24,
		TotalEvents:         8,
		SuccessEvents:       7,
		FailedEvents:        1,
		DeliverySuccessRate: 87.5,
		RetryRate:           0,
		InvalidTokenRate:    0,
	}
	alerts := buildPushHealthAlerts(summary, false)
	status := getPushHealthStatus(alerts)
	if status == "" {
		t.Fatalf("expected non-empty health status")
	}
}

func TestGetPublicAndroidTestersConfig(t *testing.T) {
	t.Setenv("SUPPORT_DOWNLOAD_ANDROID_URL", "https://api.vedamatch.ru/uploads/apk/app.apk")
	t.Setenv("ANDROID_TESTERS_PAGE_TITLE", "Android QA")
	t.Setenv("ANDROID_TESTERS_PAGE_SUBTITLE", "Install and report issues")
	t.Setenv("ANDROID_TESTERS_APP_VERSION", "1.1.27 (29)")
	t.Setenv("ANDROID_TESTERS_VERSION_CODE", "29")
	t.Setenv("ANDROID_TESTERS_RELEASE_NOTES", "Fix Telegram auth")
	t.Setenv("ANDROID_TESTERS_INSTALL_INSTRUCTIONS", "1. Download\n2. Install")
	t.Setenv("ANDROID_TESTERS_MIN_SUPPORTED_VERSION_CODE", "27")
	t.Setenv("ANDROID_TESTERS_PUBLISHED_AT", "2026-03-30T10:00:00Z")
	t.Setenv("ANDROID_TESTERS_SUPPORT_TEXT", "Attach a screenshot if possible")
	defer os.Unsetenv("SUPPORT_DOWNLOAD_ANDROID_URL")
	defer os.Unsetenv("ANDROID_TESTERS_PAGE_TITLE")
	defer os.Unsetenv("ANDROID_TESTERS_PAGE_SUBTITLE")
	defer os.Unsetenv("ANDROID_TESTERS_APP_VERSION")
	defer os.Unsetenv("ANDROID_TESTERS_VERSION_CODE")
	defer os.Unsetenv("ANDROID_TESTERS_RELEASE_NOTES")
	defer os.Unsetenv("ANDROID_TESTERS_INSTALL_INSTRUCTIONS")
	defer os.Unsetenv("ANDROID_TESTERS_MIN_SUPPORTED_VERSION_CODE")
	defer os.Unsetenv("ANDROID_TESTERS_PUBLISHED_AT")
	defer os.Unsetenv("ANDROID_TESTERS_SUPPORT_TEXT")

	app := fiber.New()
	handler := &AdminHandler{}
	app.Get("/android-testers/config", handler.GetPublicAndroidTestersConfig)

	req := httptest.NewRequest("GET", "/android-testers/config", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	defer resp.Body.Close()

	var payload struct {
		Title                       string `json:"title"`
		Subtitle                    string `json:"subtitle"`
		ApkURL                      string `json:"apkUrl"`
		AppVersion                  string `json:"appVersion"`
		VersionCode                 int    `json:"versionCode"`
		ReleaseNotes                string `json:"releaseNotes"`
		InstallInstructions         string `json:"installInstructions"`
		MinimumSupportedVersionCode int    `json:"minimumSupportedVersionCode"`
		PublishedAt                 string `json:"publishedAt"`
		SupportText                 string `json:"supportText"`
		FeedbackEntryPoint          string `json:"feedbackEntryPoint"`
		Attachment                  struct {
			MaxBytes int64    `json:"maxBytes"`
			Types    []string `json:"types"`
		} `json:"attachment"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	if payload.Title != "Android QA" {
		t.Fatalf("unexpected title: %q", payload.Title)
	}
	if payload.ApkURL != "https://api.vedamatch.ru/uploads/apk/app.apk" {
		t.Fatalf("unexpected apk url: %q", payload.ApkURL)
	}
	if payload.VersionCode != 29 {
		t.Fatalf("unexpected version code: %d", payload.VersionCode)
	}
	if payload.MinimumSupportedVersionCode != 27 {
		t.Fatalf("unexpected minimum supported version code: %d", payload.MinimumSupportedVersionCode)
	}
	if payload.PublishedAt != "2026-03-30T10:00:00Z" {
		t.Fatalf("unexpected published at: %q", payload.PublishedAt)
	}
	if payload.FeedbackEntryPoint != "android_tester_feedback" {
		t.Fatalf("unexpected entry point: %q", payload.FeedbackEntryPoint)
	}
	if payload.Attachment.MaxBytes != supportUploadMaxBytes {
		t.Fatalf("unexpected max bytes: %d", payload.Attachment.MaxBytes)
	}
	if len(payload.Attachment.Types) == 0 {
		t.Fatalf("expected allowed attachment types")
	}
}

func TestGetPublicMobileAppConfig(t *testing.T) {
	t.Setenv("SUPPORT_DOWNLOAD_IOS_URL", "https://apps.apple.com/app/id123")
	t.Setenv("SUPPORT_DOWNLOAD_ANDROID_URL", "https://api.vedamatch.ru/downloads/android/app.apk")
	t.Setenv("ANDROID_TESTERS_APP_VERSION", "1.1.44 (46)")
	t.Setenv("ANDROID_TESTERS_VERSION_CODE", "46")
	t.Setenv("ANDROID_TESTERS_RELEASE_NOTES", "Fix Telegram auth\nImprove install flow")
	t.Setenv("ANDROID_TESTERS_INSTALL_INSTRUCTIONS", "1. Download APK\n2. Allow install")
	t.Setenv("ANDROID_TESTERS_MIN_SUPPORTED_VERSION_CODE", "44")
	t.Setenv("ANDROID_TESTERS_PUBLISHED_AT", "2026-03-30T10:00:00Z")
	defer os.Unsetenv("SUPPORT_DOWNLOAD_IOS_URL")
	defer os.Unsetenv("SUPPORT_DOWNLOAD_ANDROID_URL")
	defer os.Unsetenv("ANDROID_TESTERS_APP_VERSION")
	defer os.Unsetenv("ANDROID_TESTERS_VERSION_CODE")
	defer os.Unsetenv("ANDROID_TESTERS_RELEASE_NOTES")
	defer os.Unsetenv("ANDROID_TESTERS_INSTALL_INSTRUCTIONS")
	defer os.Unsetenv("ANDROID_TESTERS_MIN_SUPPORTED_VERSION_CODE")
	defer os.Unsetenv("ANDROID_TESTERS_PUBLISHED_AT")

	app := fiber.New()
	handler := &AdminHandler{}
	app.Get("/mobile-app/config", handler.GetPublicMobileAppConfig)

	req := httptest.NewRequest("GET", "/mobile-app/config", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	defer resp.Body.Close()

	var payload struct {
		IOSURL         string `json:"iosUrl"`
		AndroidURL     string `json:"androidUrl"`
		IOSVersion     string `json:"iosVersion"`
		AndroidVersion string `json:"androidVersion"`
		AndroidRelease struct {
			DownloadURL                 string `json:"downloadUrl"`
			AppVersion                  string `json:"appVersion"`
			VersionCode                 int    `json:"versionCode"`
			ReleaseNotes                string `json:"releaseNotes"`
			InstallInstructions         string `json:"installInstructions"`
			MinimumSupportedVersionCode int    `json:"minimumSupportedVersionCode"`
			PublishedAt                 string `json:"publishedAt"`
		} `json:"androidRelease"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	if payload.IOSURL != "https://apps.apple.com/app/id123" {
		t.Fatalf("unexpected ios url: %q", payload.IOSURL)
	}
	if payload.AndroidURL != "https://api.vedamatch.ru/downloads/android/app.apk" {
		t.Fatalf("unexpected android url: %q", payload.AndroidURL)
	}
	if payload.IOSVersion == "" {
		t.Fatalf("expected non-empty ios version")
	}
	if payload.AndroidVersion == "" {
		t.Fatalf("expected non-empty android version")
	}
	if payload.AndroidRelease.DownloadURL != payload.AndroidURL {
		t.Fatalf("unexpected android release url: %q", payload.AndroidRelease.DownloadURL)
	}
	if payload.AndroidRelease.AppVersion != "1.1.44 (46)" {
		t.Fatalf("unexpected android release version: %q", payload.AndroidRelease.AppVersion)
	}
	if payload.AndroidRelease.VersionCode != 46 {
		t.Fatalf("unexpected android release version code: %d", payload.AndroidRelease.VersionCode)
	}
	if payload.AndroidRelease.MinimumSupportedVersionCode != 44 {
		t.Fatalf("unexpected min supported version code: %d", payload.AndroidRelease.MinimumSupportedVersionCode)
	}
	if payload.AndroidRelease.PublishedAt != "2026-03-30T10:00:00Z" {
		t.Fatalf("unexpected published at: %q", payload.AndroidRelease.PublishedAt)
	}
}

func TestTrackAndroidReleaseEventRejectsUnknownEvent(t *testing.T) {
	app := fiber.New()
	handler := &AdminHandler{}
	app.Post("/mobile-app/android-release/events", handler.TrackAndroidReleaseEvent)

	req := httptest.NewRequest("POST", "/mobile-app/android-release/events", strings.NewReader(`{"event":"unknown","entrySource":"site"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}
