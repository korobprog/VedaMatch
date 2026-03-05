package services

import (
	"context"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"time"
)

const (
	chatVideoCircleRetentionDays = 30
	chatVideoCircleCleanupLimit  = 200
)

func StartChatVideoCircleCleanupScheduler() {
	if GlobalScheduler == nil {
		log.Println("[ChatVideoCircleCleanup] scheduler is not initialized")
		return
	}

	GlobalScheduler.RegisterTask("chat_video_circle_cleanup", 60, func() {
		count, err := CleanupExpiredChatVideoCirclesBatch(chatVideoCircleCleanupLimit)
		if err != nil {
			log.Printf("[ChatVideoCircleCleanup] cleanup_error=%v", err)
			return
		}
		if count > 0 {
			log.Printf("[ChatVideoCircleCleanup] cleaned=%d", count)
		}
	})
}

func CleanupExpiredChatVideoCirclesBatch(limit int) (int, error) {
	if limit <= 0 {
		limit = chatVideoCircleCleanupLimit
	}
	cutoff := time.Now().UTC().Add(-time.Duration(chatVideoCircleRetentionDays) * 24 * time.Hour)

	var messages []models.Message
	if err := database.DB.
		Where("type = ? AND created_at <= ? AND content <> ''", "video_circle", cutoff).
		Order("id ASC").
		Limit(limit).
		Find(&messages).Error; err != nil {
		return 0, err
	}

	if len(messages) == 0 {
		return 0, nil
	}

	s3 := GetS3Service()
	cdnBaseURL, s3PublicURL := MessageMediaCDNConfig()
	processed := 0

	for _, msg := range messages {
		keys := collectChatVideoCircleKeys(msg.Content, msg.Thumbnail, cdnBaseURL, s3PublicURL)
		for _, key := range keys {
			if s3 == nil || key == "" {
				continue
			}
			if err := s3.DeleteFile(context.Background(), key); err != nil {
				log.Printf("[ChatVideoCircleCleanup] s3_delete_failed message_id=%d key=%s error=%v", msg.ID, key, err)
			}
		}

		if msg.MapData == nil {
			msg.MapData = map[string]interface{}{}
		}
		msg.MapData["expired"] = true
		msg.MapData["expiredAt"] = time.Now().UTC().Format(time.RFC3339)
		msg.MapData["expiredBy"] = "chat_video_circle_cleanup"
		msg.Content = ""
		msg.Thumbnail = ""

		if err := database.DB.Save(&msg).Error; err != nil {
			log.Printf("[ChatVideoCircleCleanup] db_update_failed message_id=%d error=%v", msg.ID, err)
			continue
		}
		processed++
	}

	if processed > 0 {
		_ = GetMetricsService().Increment(MetricChatVideoCircleCleanupDeletedTotal, int64(processed))
	}
	return processed, nil
}

func collectChatVideoCircleKeys(content string, thumbnail string, cdnBaseURL string, s3PublicURL string) []string {
	keys := make([]string, 0, 2)
	for _, raw := range []string{content, thumbnail} {
		key := extractChatVideoCircleKey(raw, cdnBaseURL, s3PublicURL)
		if key != "" {
			keys = append(keys, key)
		}
	}
	return keys
}

func extractChatVideoCircleKey(raw string, cdnBaseURL string, s3PublicURL string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "messages/video_circle/") {
		return value
	}
	if hasURLPrefix(value, cdnBaseURL) {
		key := strings.TrimPrefix(strings.TrimPrefix(value, cdnBaseURL), "/")
		if strings.HasPrefix(key, "messages/video_circle/") {
			return key
		}
		return ""
	}
	if hasURLPrefix(value, s3PublicURL) {
		key := strings.TrimPrefix(strings.TrimPrefix(value, s3PublicURL), "/")
		if strings.HasPrefix(key, "messages/video_circle/") {
			return key
		}
		return ""
	}
	return ""
}

