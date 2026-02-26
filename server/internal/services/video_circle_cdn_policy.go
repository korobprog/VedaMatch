package services

import (
	"errors"
	"os"
	"strings"
)

var (
	ErrVideoCircleCDNNotConfigured   = errors.New("video circle cdn is not configured")
	ErrVideoCircleMediaURLNotAllowed = errors.New("media url is not allowed")
)

func VideoCirclesCDNConfig() (cdnBaseURL string, s3PublicURL string) {
	cdnBaseURL = normalizeURLBase(os.Getenv("CDN_BASE_URL"))
	s3PublicURL = normalizeURLBase(os.Getenv("S3_PUBLIC_URL"))
	return cdnBaseURL, s3PublicURL
}

func IsVideoCirclesCDNReady() bool {
	cdnBaseURL, s3PublicURL := VideoCirclesCDNConfig()
	return cdnBaseURL != "" && s3PublicURL != ""
}

func NormalizeVideoCircleMediaURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", ErrVideoCircleMediaURLNotAllowed
	}

	cdnBaseURL, s3PublicURL := VideoCirclesCDNConfig()
	if cdnBaseURL == "" || s3PublicURL == "" {
		return "", ErrVideoCircleCDNNotConfigured
	}

	if hasURLPrefix(value, cdnBaseURL) {
		return value, nil
	}
	if hasURLPrefix(value, s3PublicURL) {
		return cdnBaseURL + strings.TrimPrefix(value, s3PublicURL), nil
	}

	return "", ErrVideoCircleMediaURLNotAllowed
}

func IsVideoCircleMediaURLAllowed(raw string) bool {
	value := strings.TrimSpace(raw)
	if value == "" {
		return false
	}
	cdnBaseURL, s3PublicURL := VideoCirclesCDNConfig()
	if cdnBaseURL == "" || s3PublicURL == "" {
		return false
	}
	return hasURLPrefix(value, cdnBaseURL) || hasURLPrefix(value, s3PublicURL)
}

func normalizeURLBase(raw string) string {
	trimmed := strings.TrimSpace(raw)
	return strings.TrimRight(trimmed, "/")
}

func hasURLPrefix(value string, base string) bool {
	if base == "" {
		return false
	}
	return value == base || strings.HasPrefix(value, base+"/")
}
