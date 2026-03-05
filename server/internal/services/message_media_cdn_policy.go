package services

import (
	"errors"
	"os"
	"strings"
)

const chatVideoCircleS3Prefix = "messages/video_circle/"

var (
	ErrMessageMediaCDNNotConfigured = errors.New("message media cdn is not configured")
	ErrMessageMediaURLNotAllowed    = errors.New("message media url is not allowed")
)

func MessageMediaCDNConfig() (cdnBaseURL string, s3PublicURL string) {
	cdnBaseURL = normalizeURLBase(os.Getenv("CDN_BASE_URL"))
	s3PublicURL = normalizeURLBase(os.Getenv("S3_PUBLIC_URL"))
	return cdnBaseURL, s3PublicURL
}

func IsMessageMediaCDNReady() bool {
	cdnBaseURL, s3PublicURL := MessageMediaCDNConfig()
	return cdnBaseURL != "" && s3PublicURL != ""
}

// NormalizeChatVideoCircleMediaURL ensures message video-circle URL is in allowed CDN/S3 domain and path.
// Accepted forms:
// - absolute CDN URL
// - absolute S3 public URL (will be converted to CDN URL)
// - object key (messages/video_circle/...)
func NormalizeChatVideoCircleMediaURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", ErrMessageMediaURLNotAllowed
	}

	cdnBaseURL, s3PublicURL := MessageMediaCDNConfig()
	if cdnBaseURL == "" || s3PublicURL == "" {
		return "", ErrMessageMediaCDNNotConfigured
	}

	if strings.HasPrefix(value, chatVideoCircleS3Prefix) {
		return cdnBaseURL + "/" + value, nil
	}

	if hasURLPrefix(value, cdnBaseURL) {
		key := strings.TrimPrefix(strings.TrimPrefix(value, cdnBaseURL), "/")
		if strings.HasPrefix(key, chatVideoCircleS3Prefix) {
			return value, nil
		}
		return "", ErrMessageMediaURLNotAllowed
	}

	if hasURLPrefix(value, s3PublicURL) {
		key := strings.TrimPrefix(strings.TrimPrefix(value, s3PublicURL), "/")
		if strings.HasPrefix(key, chatVideoCircleS3Prefix) {
			return cdnBaseURL + "/" + key, nil
		}
		return "", ErrMessageMediaURLNotAllowed
	}

	return "", ErrMessageMediaURLNotAllowed
}

