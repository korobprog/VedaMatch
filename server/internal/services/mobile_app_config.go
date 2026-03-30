package services

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

type PublicMobileAppConfig struct {
	IOSURL         string                     `json:"iosUrl"`
	AndroidURL     string                     `json:"androidUrl"`
	IOSVersion     string                     `json:"iosVersion"`
	AndroidVersion string                     `json:"androidVersion"`
	AndroidRelease PublicAndroidReleaseConfig `json:"androidRelease"`
}

type PublicAndroidReleaseConfig struct {
	DownloadURL                 string `json:"downloadUrl"`
	AppVersion                  string `json:"appVersion"`
	VersionCode                 int    `json:"versionCode"`
	ReleaseNotes                string `json:"releaseNotes"`
	InstallInstructions         string `json:"installInstructions"`
	MinimumSupportedVersionCode int    `json:"minimumSupportedVersionCode"`
	PublishedAt                 string `json:"publishedAt"`
}

var (
	androidVersionNamePattern  = regexp.MustCompile(`versionName\s+["']?([^"'\r\n]+)["']?`)
	androidVersionCodePattern  = regexp.MustCompile(`versionCode\s+(\d+)`)
	iosMarketingVersionPattern = regexp.MustCompile(`MARKETING_VERSION = ([^;]+);`)
	iosProjectVersionPattern   = regexp.MustCompile(`CURRENT_PROJECT_VERSION = ([^;]+);`)
)

func GetPublicMobileAppConfig() PublicMobileAppConfig {
	androidURL := strings.TrimSpace(getSystemSettingOrEnvOrDB("SUPPORT_DOWNLOAD_ANDROID_URL"))
	appVersion := strings.TrimSpace(getSystemSettingOrEnvOrDB("ANDROID_TESTERS_APP_VERSION"))
	if appVersion == "" {
		appVersion = readAndroidAppVersion()
	}

	return PublicMobileAppConfig{
		IOSURL:         strings.TrimSpace(getSystemSettingOrEnvOrDB("SUPPORT_DOWNLOAD_IOS_URL")),
		AndroidURL:     androidURL,
		IOSVersion:     readIOSAppVersion(),
		AndroidVersion: readAndroidAppVersion(),
		AndroidRelease: PublicAndroidReleaseConfig{
			DownloadURL:                 androidURL,
			AppVersion:                  appVersion,
			VersionCode:                 parsePositiveInt(getSystemSettingOrEnvOrDB("ANDROID_TESTERS_VERSION_CODE")),
			ReleaseNotes:                strings.TrimSpace(getSystemSettingOrEnvOrDB("ANDROID_TESTERS_RELEASE_NOTES")),
			InstallInstructions:         strings.TrimSpace(getSystemSettingOrEnvOrDB("ANDROID_TESTERS_INSTALL_INSTRUCTIONS")),
			MinimumSupportedVersionCode: parsePositiveInt(getSystemSettingOrEnvOrDB("ANDROID_TESTERS_MIN_SUPPORTED_VERSION_CODE")),
			PublishedAt:                 strings.TrimSpace(getSystemSettingOrEnvOrDB("ANDROID_TESTERS_PUBLISHED_AT")),
		},
	}
}

func readAndroidAppVersion() string {
	content, err := readRepoFile("frontend/android/app/build.gradle")
	if err != nil {
		return ""
	}
	return parseAndroidAppVersion(content)
}

func readIOSAppVersion() string {
	content, err := readRepoFile("frontend/ios/vedamatch.xcodeproj/project.pbxproj")
	if err != nil {
		return ""
	}
	return parseIOSAppVersion(content)
}

func parseAndroidAppVersion(content string) string {
	versionName := extractLastSubmatch(androidVersionNamePattern, content)
	versionCode := extractLastSubmatch(androidVersionCodePattern, content)
	return formatVersionLabel(versionName, versionCode)
}

func parseIOSAppVersion(content string) string {
	marketingVersion := extractLastSubmatch(iosMarketingVersionPattern, content)
	projectVersion := extractLastSubmatch(iosProjectVersionPattern, content)
	return formatVersionLabel(marketingVersion, projectVersion)
}

func extractLastSubmatch(pattern *regexp.Regexp, content string) string {
	matches := pattern.FindAllStringSubmatch(content, -1)
	for idx := len(matches) - 1; idx >= 0; idx-- {
		if len(matches[idx]) < 2 {
			continue
		}
		value := strings.TrimSpace(matches[idx][1])
		value = strings.Trim(value, `"'`)
		if value != "" {
			return value
		}
	}
	return ""
}

func formatVersionLabel(version string, build string) string {
	version = strings.TrimSpace(version)
	build = strings.TrimSpace(build)

	switch {
	case version != "" && build != "":
		return version + " (" + build + ")"
	case version != "":
		return version
	case build != "":
		return build
	default:
		return ""
	}
}

func parsePositiveInt(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	value := 0
	for _, ch := range raw {
		if ch < '0' || ch > '9' {
			return 0
		}
		value = value*10 + int(ch-'0')
	}
	if value < 0 {
		return 0
	}
	return value
}

func readRepoFile(relativePath string) (string, error) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", os.ErrNotExist
	}

	repoRoot := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", "..", ".."))
	content, err := os.ReadFile(filepath.Join(repoRoot, relativePath))
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func getSystemSettingOrEnvOrDB(key string) string {
	var setting models.SystemSetting
	if database.DB != nil {
		if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil {
			if value := strings.TrimSpace(setting.Value); value != "" {
				return value
			}
		}
	}
	return os.Getenv(key)
}
