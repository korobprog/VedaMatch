package services

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type SupportMediaStorage interface {
	Save(ctx context.Context, key string, contentType string, data []byte) (url string, size int64, err error)
}

type DefaultSupportMediaStorage struct{}

func NewDefaultSupportMediaStorage() *DefaultSupportMediaStorage {
	return &DefaultSupportMediaStorage{}
}

func (s *DefaultSupportMediaStorage) Save(ctx context.Context, key string, contentType string, data []byte) (string, int64, error) {
	if len(data) == 0 {
		return "", 0, fmt.Errorf("empty media payload")
	}

	if s3 := GetS3Service(); s3 != nil {
		url, err := s3.UploadFile(ctx, bytes.NewReader(data), key, contentType, int64(len(data)))
		if err == nil {
			return url, int64(len(data)), nil
		}
	}

	// Fallback to local storage.
	cleanKey := strings.TrimPrefix(filepath.Clean(key), "/")
	localPath := filepath.Join("uploads", cleanKey)
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return "", 0, err
	}
	if err := os.WriteFile(localPath, data, 0644); err != nil {
		return "", 0, err
	}

	return "/" + strings.TrimPrefix(localPath, "./"), int64(len(data)), nil
}

func BuildSupportScreenshotKey(chatID int64, messageID int64, fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == "" {
		ext = ".jpg"
	}
	return fmt.Sprintf("support/screenshots/%d/%d_%d%s", chatID, time.Now().Unix(), messageID, ext)
}

func BuildSupportUploadKey(scope string, fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == "" {
		ext = ".jpg"
	}
	cleanScope := strings.TrimSpace(strings.Trim(filepath.Clean(scope), "/"))
	if cleanScope == "" || cleanScope == "." {
		cleanScope = "tickets"
	}
	return fmt.Sprintf("support/uploads/%s/%d%s", cleanScope, time.Now().UnixNano(), ext)
}
