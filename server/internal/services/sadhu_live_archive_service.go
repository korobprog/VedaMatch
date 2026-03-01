package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	defaultSadhuLiveRetentionDays   = 7
	defaultSadhuYouTubeUploadLimit  = 5
	defaultSadhuYouTubeMaxAttempts  = 10
	defaultSadhuYouTubeCategoryID   = "22"
	defaultSadhuYouTubePrivacy      = "public"
	defaultSadhuRetentionBatchLimit = 100
)

var errSadhuYouTubeDisabled = errors.New("sadhu youtube autopublish disabled")

type SadhuLiveArchiveService struct {
	db         *gorm.DB
	s3         *S3Service
	httpClient *http.Client
}

type sadhuYouTubeConfig struct {
	ClientID       string
	ClientSecret   string
	RefreshToken   string
	DefaultPrivacy string
	CategoryID     string
	DefaultTags    []string
	TitleTemplate  string
	DescTemplate   string
}

type sadhuYouTubeTokenResponse struct {
	AccessToken string `json:"access_token"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type sadhuYouTubeUploadResponse struct {
	ID string `json:"id"`
}

func NewSadhuLiveArchiveService() *SadhuLiveArchiveService {
	return &SadhuLiveArchiveService{
		db: database.DB,
		s3: GetS3Service(),
		httpClient: &http.Client{
			Timeout: 3 * time.Hour,
		},
	}
}

func StartSadhuLiveArchiveScheduler() {
	if GlobalScheduler == nil {
		return
	}
	service := NewSadhuLiveArchiveService()
	GlobalScheduler.RegisterTask("sadhu_live_archive_cleanup", 30, func() {
		expired, err := service.ExpireSadhuLiveArchiveBatch(defaultSadhuRetentionBatchLimit)
		if err != nil {
			log.Printf("[SadhuLiveArchive] cleanup_error=%v", err)
			return
		}
		if expired > 0 {
			log.Printf("[SadhuLiveArchive] cleanup_expired=%d", expired)
		}
	})
	GlobalScheduler.RegisterTask("sadhu_live_youtube_upload", 5, func() {
		if _, err := service.ProcessYouTubeUploadQueueBatch(defaultSadhuYouTubeUploadLimit); err != nil && !errors.Is(err, errSadhuYouTubeDisabled) {
			log.Printf("[SadhuLiveArchive] youtube_queue_error=%v", err)
		}
	})
}

func (s *SadhuLiveArchiveService) MarkSessionArchiveTracks(session *models.ChannelLiveSession, channel *models.Channel, actorID uint) (int, error) {
	if session == nil || session.ID == 0 || channel == nil || channel.ID == 0 {
		return 0, nil
	}
	if !s.isRetentionEnabled() {
		return 0, nil
	}

	ownerIDs := uniqueUintValues([]uint{actorID, channel.OwnerID})
	if len(ownerIDs) == 0 {
		return 0, nil
	}

	now := time.Now().UTC()
	windowStart := now.Add(-8 * time.Hour)
	windowEnd := now.Add(20 * time.Minute)
	if session.StartedAt != nil {
		windowStart = session.StartedAt.Add(-90 * time.Minute)
	}
	if session.EndedAt != nil {
		windowEnd = session.EndedAt.Add(20 * time.Minute)
	}
	if session.ScheduledAt != nil {
		candidate := session.ScheduledAt.Add(-120 * time.Minute)
		if candidate.Before(windowStart) {
			windowStart = candidate
		}
	}

	var candidates []models.MediaTrack
	if err := s.db.
		Where("media_type = ?", models.MediaTypeVideo).
		Where("created_by_id IN ?", ownerIDs).
		Where("created_at BETWEEN ? AND ?", windowStart, windowEnd).
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Limit(80).
		Find(&candidates).Error; err != nil {
		return 0, err
	}

	autopublishEnabled := s.isYouTubeAutopublishEnabled()
	delayMinutes := s.youtubePublishDelayMinutes()
	retentionDays := s.retentionDays()
	expiresAt := now.Add(time.Duration(retentionDays) * 24 * time.Hour)
	nextRetryAt := now
	if delayMinutes > 0 {
		nextRetryAt = now.Add(time.Duration(delayMinutes) * time.Minute)
	}

	updated := 0
	for _, track := range candidates {
		if !matchesSadhuLiveRecordingCandidate(track, session) {
			continue
		}

		updates := map[string]interface{}{
			"source_context":       models.MediaTrackSourceContextSadhuLiveArchive,
			"live_session_id":      session.ID,
			"room_id":              session.RoomID,
			"retention_expires_at": expiresAt,
			"updated_at":           now,
		}
		if track.Language == "" && session.BroadcastLanguage != "" {
			updates["language"] = session.BroadcastLanguage
		}

		if autopublishEnabled && track.YouTubeStatus != models.MediaTrackYouTubeStatusUploaded {
			updates["youtube_status"] = models.MediaTrackYouTubeStatusQueued
			updates["youtube_next_retry_at"] = nextRetryAt
			updates["youtube_last_error"] = ""
			updates["youtube_attempts"] = 0
		}

		if err := s.db.Model(&models.MediaTrack{}).
			Where("id = ?", track.ID).
			Updates(updates).Error; err != nil {
			log.Printf("[SadhuLiveArchive] mark_track_failed live_id=%d track_id=%d err=%v", session.ID, track.ID, err)
			continue
		}
		updated++
	}

	if updated > 0 {
		log.Printf("[SadhuLiveArchive] marked_tracks live_id=%d channel_id=%d count=%d expires_at=%s", session.ID, channel.ID, updated, expiresAt.Format(time.RFC3339))
	}
	return updated, nil
}

func (s *SadhuLiveArchiveService) ExpireSadhuLiveArchiveBatch(limit int) (int, error) {
	if !s.isRetentionEnabled() {
		return 0, nil
	}
	if limit <= 0 {
		limit = defaultSadhuRetentionBatchLimit
	}

	now := time.Now().UTC()
	var tracks []models.MediaTrack
	if err := s.db.
		Where("source_context = ?", models.MediaTrackSourceContextSadhuLiveArchive).
		Where("retention_expires_at IS NOT NULL AND retention_expires_at <= ?", now).
		Where("deleted_at IS NULL").
		Order("retention_expires_at ASC").
		Limit(limit).
		Find(&tracks).Error; err != nil {
		return 0, err
	}

	if len(tracks) == 0 {
		return 0, nil
	}

	expired := 0
	for _, track := range tracks {
		if err := s.cleanupTrackAssets(&track); err != nil {
			log.Printf("[SadhuLiveArchive] cleanup_assets_failed track_id=%d err=%v", track.ID, err)
			continue
		}
		if err := s.db.Delete(&models.MediaTrack{}, track.ID).Error; err != nil {
			log.Printf("[SadhuLiveArchive] delete_track_failed track_id=%d err=%v", track.ID, err)
			continue
		}
		expired++
	}

	if expired > 0 {
		_ = GetMetricsService().Increment(MetricSadhuLiveArchiveExpiredTotal, int64(expired))
	}
	return expired, nil
}

func (s *SadhuLiveArchiveService) ProcessYouTubeUploadQueueBatch(limit int) (int, error) {
	cfg, err := s.loadYouTubeConfig()
	if err != nil {
		return 0, err
	}
	if limit <= 0 {
		limit = defaultSadhuYouTubeUploadLimit
	}

	now := time.Now().UTC()
	var tracks []models.MediaTrack
	if err := s.db.
		Where("source_context = ?", models.MediaTrackSourceContextSadhuLiveArchive).
		Where("youtube_status = ?", models.MediaTrackYouTubeStatusQueued).
		Where("(youtube_next_retry_at IS NULL OR youtube_next_retry_at <= ?)", now).
		Where("deleted_at IS NULL").
		Order("updated_at ASC").
		Limit(limit).
		Find(&tracks).Error; err != nil {
		return 0, err
	}
	if len(tracks) == 0 {
		return 0, nil
	}

	processed := 0
	for _, track := range tracks {
		if !s.claimTrackForUpload(track.ID) {
			continue
		}

		var current models.MediaTrack
		if err := s.db.First(&current, track.ID).Error; err != nil {
			continue
		}

		videoID, youtubeURL, uploadErr := s.uploadTrackToYouTube(&current, cfg)
		if uploadErr != nil {
			attempt := current.YouTubeAttempts
			if attempt < 1 {
				attempt = 1
			}
			if attempt >= defaultSadhuYouTubeMaxAttempts {
				_ = s.db.Model(&models.MediaTrack{}).Where("id = ?", current.ID).Updates(map[string]interface{}{
					"youtube_status":        models.MediaTrackYouTubeStatusFailed,
					"youtube_last_error":    truncateError(uploadErr.Error(), 1500),
					"youtube_next_retry_at": nil,
				}).Error
				_ = GetMetricsService().Increment(MetricSadhuYouTubeUploadFailedTotal, 1)
				log.Printf("[SadhuLiveArchive] youtube_failed_final track_id=%d attempts=%d err=%v", current.ID, attempt, uploadErr)
				continue
			}

			retryAfter := now.Add(backoffDuration(attempt))
			_ = s.db.Model(&models.MediaTrack{}).Where("id = ?", current.ID).Updates(map[string]interface{}{
				"youtube_status":        models.MediaTrackYouTubeStatusQueued,
				"youtube_last_error":    truncateError(uploadErr.Error(), 1500),
				"youtube_next_retry_at": retryAfter,
			}).Error
			_ = GetMetricsService().Increment(MetricSadhuYouTubeUploadRetryTotal, 1)
			log.Printf("[SadhuLiveArchive] youtube_retry track_id=%d attempt=%d next_retry=%s err=%v", current.ID, attempt, retryAfter.Format(time.RFC3339), uploadErr)
			continue
		}

		uploadedAt := time.Now().UTC()
		_ = s.db.Model(&models.MediaTrack{}).Where("id = ?", current.ID).Updates(map[string]interface{}{
			"youtube_status":        models.MediaTrackYouTubeStatusUploaded,
			"youtube_video_id":      videoID,
			"youtube_url":           youtubeURL,
			"youtube_uploaded_at":   uploadedAt,
			"youtube_last_error":    "",
			"youtube_next_retry_at": nil,
		}).Error
		_ = GetMetricsService().Increment(MetricSadhuYouTubeUploadSuccessTotal, 1)
		log.Printf("[SadhuLiveArchive] youtube_uploaded track_id=%d video_id=%s", current.ID, videoID)
		processed++
	}

	return processed, nil
}

func (s *SadhuLiveArchiveService) claimTrackForUpload(trackID uint) bool {
	if trackID == 0 {
		return false
	}
	result := s.db.Model(&models.MediaTrack{}).
		Where("id = ? AND source_context = ? AND youtube_status = ?", trackID, models.MediaTrackSourceContextSadhuLiveArchive, models.MediaTrackYouTubeStatusQueued).
		Updates(map[string]interface{}{
			"youtube_status":   models.MediaTrackYouTubeStatusUploading,
			"youtube_attempts": gorm.Expr("youtube_attempts + 1"),
			"updated_at":       time.Now().UTC(),
		})
	return result.Error == nil && result.RowsAffected > 0
}

func (s *SadhuLiveArchiveService) uploadTrackToYouTube(track *models.MediaTrack, cfg sadhuYouTubeConfig) (string, string, error) {
	if track == nil || track.ID == 0 {
		return "", "", errors.New("track not found")
	}
	sourceURL := s.resolveUploadSourceURL(track)
	if sourceURL == "" {
		return "", "", errors.New("missing uploadable video source url")
	}

	accessToken, err := s.exchangeRefreshToken(cfg)
	if err != nil {
		return "", "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Hour)
	defer cancel()

	videoReq, err := newHTTPGetRequest(ctx, sourceURL)
	if err != nil {
		return "", "", fmt.Errorf("invalid source url: %w", err)
	}
	videoResp, err := s.httpClient.Do(videoReq)
	if err != nil {
		return "", "", fmt.Errorf("source fetch failed: %w", err)
	}
	defer videoResp.Body.Close()
	if videoResp.StatusCode < 200 || videoResp.StatusCode >= 300 {
		return "", "", fmt.Errorf("source fetch status=%d", videoResp.StatusCode)
	}

	contentType := strings.TrimSpace(videoResp.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "video/mp4"
	}

	metadata := map[string]interface{}{
		"snippet": map[string]interface{}{
			"title":       s.renderTemplate(cfg.TitleTemplate, track),
			"description": s.renderTemplate(cfg.DescTemplate, track),
			"categoryId":  cfg.CategoryID,
			"tags":        cfg.DefaultTags,
		},
		"status": map[string]interface{}{
			"privacyStatus": cfg.DefaultPrivacy,
		},
	}
	metaBytes, _ := json.Marshal(metadata)

	uploadURL := "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart"
	reader, contentHeader := buildYouTubeMultipartPayload(metaBytes, filepath.Base(sourceURL), contentType, videoResp.Body)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, reader)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", contentHeader)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("youtube upload request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", "", fmt.Errorf("youtube upload status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(bodyBytes)))
	}

	var uploaded sadhuYouTubeUploadResponse
	if err := json.Unmarshal(bodyBytes, &uploaded); err != nil {
		return "", "", fmt.Errorf("youtube upload parse failed: %w", err)
	}
	if strings.TrimSpace(uploaded.ID) == "" {
		return "", "", errors.New("youtube upload completed without video id")
	}
	return uploaded.ID, "https://www.youtube.com/watch?v=" + uploaded.ID, nil
}

func (s *SadhuLiveArchiveService) exchangeRefreshToken(cfg sadhuYouTubeConfig) (string, error) {
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("refresh_token", cfg.RefreshToken)
	form.Set("grant_type", "refresh_token")

	req, err := http.NewRequest(http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var parsed sadhuYouTubeTokenResponse
	_ = json.Unmarshal(bodyBytes, &parsed)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		errMsg := parsed.Error
		if parsed.ErrorDesc != "" {
			errMsg = parsed.Error + ": " + parsed.ErrorDesc
		}
		if strings.TrimSpace(errMsg) == "" {
			errMsg = strings.TrimSpace(string(bodyBytes))
		}
		return "", fmt.Errorf("token status=%d %s", resp.StatusCode, errMsg)
	}
	if strings.TrimSpace(parsed.AccessToken) == "" {
		return "", errors.New("empty access token")
	}
	return parsed.AccessToken, nil
}

func (s *SadhuLiveArchiveService) resolveUploadSourceURL(track *models.MediaTrack) string {
	if track == nil {
		return ""
	}
	original := strings.TrimSpace(track.OriginalURL)
	if original != "" && !strings.HasSuffix(strings.ToLower(original), ".m3u8") {
		return original
	}
	url := strings.TrimSpace(track.URL)
	if url != "" && !strings.HasSuffix(strings.ToLower(url), ".m3u8") {
		return url
	}
	return ""
}

func (s *SadhuLiveArchiveService) renderTemplate(template string, track *models.MediaTrack) string {
	baseTitle := strings.TrimSpace(track.Title)
	if baseTitle == "" {
		baseTitle = fmt.Sprintf("Sadhu Sanga Live #%d", track.ID)
	}
	if strings.TrimSpace(template) == "" {
		template = "{{title}} | Садху Санга"
	}

	result := strings.TrimSpace(template)
	replacements := map[string]string{
		"{{title}}":    baseTitle,
		"{{artist}}":   strings.TrimSpace(track.Artist),
		"{{language}}": strings.TrimSpace(track.Language),
		"{{date}}":     track.CreatedAt.In(time.UTC).Format("2006-01-02"),
		"{{trackId}}":  strconv.FormatUint(uint64(track.ID), 10),
	}
	for key, value := range replacements {
		result = strings.ReplaceAll(result, key, value)
	}
	if strings.TrimSpace(result) == "" {
		return baseTitle
	}
	return result
}

func (s *SadhuLiveArchiveService) cleanupTrackAssets(track *models.MediaTrack) error {
	if track == nil || s.s3 == nil {
		return nil
	}

	keys := make(map[string]struct{})
	for _, raw := range []string{track.URL, track.OriginalURL, track.ThumbnailURL} {
		key := normalizeS3Key(s.s3, raw)
		if key == "" {
			continue
		}
		keys[key] = struct{}{}
	}

	hlsKey := normalizeS3Key(s.s3, track.HLSURL)
	if hlsKey != "" {
		keys[hlsKey] = struct{}{}
		hlsDir := strings.TrimSuffix(hlsKey, filepath.Base(hlsKey))
		if hlsDir != "" && hlsDir != "." && hlsDir != "/" {
			if files, err := s.s3.ListFiles(context.Background(), hlsDir); err == nil {
				for _, file := range files {
					keys[file.Key] = struct{}{}
				}
			}
		}
	}

	var deleteErrors []string
	for key := range keys {
		if strings.TrimSpace(key) == "" {
			continue
		}
		if err := s.s3.DeleteFile(context.Background(), key); err != nil {
			deleteErrors = append(deleteErrors, fmt.Sprintf("%s: %v", key, err))
		}
	}
	if len(deleteErrors) > 0 {
		return errors.New(strings.Join(deleteErrors, "; "))
	}
	return nil
}

func (s *SadhuLiveArchiveService) isRetentionEnabled() bool {
	return s.boolSetting("SADHU_SANGA_LIVE_RETENTION_ENABLED", true)
}

func (s *SadhuLiveArchiveService) isYouTubeAutopublishEnabled() bool {
	if !s.boolSetting("SADHU_SANGA_YOUTUBE_AUTOPUBLISH_ENABLED", false) {
		return false
	}
	if !s.boolSetting("YOUTUBE_ENABLED", false) {
		return false
	}
	return s.boolSetting("YOUTUBE_AUTO_PUBLISH_ENABLED", false)
}

func (s *SadhuLiveArchiveService) retentionDays() int {
	value := s.intSetting("SADHU_SANGA_LIVE_RETENTION_DAYS", defaultSadhuLiveRetentionDays)
	if value <= 0 {
		return defaultSadhuLiveRetentionDays
	}
	return value
}

func (s *SadhuLiveArchiveService) youtubePublishDelayMinutes() int {
	value := s.intSetting("YOUTUBE_PUBLISH_DELAY_MINUTES", 0)
	if value < 0 {
		return 0
	}
	return value
}

func (s *SadhuLiveArchiveService) loadYouTubeConfig() (sadhuYouTubeConfig, error) {
	if !s.isYouTubeAutopublishEnabled() {
		return sadhuYouTubeConfig{}, errSadhuYouTubeDisabled
	}
	cfg := sadhuYouTubeConfig{
		ClientID:       strings.TrimSpace(s.settingValue("YOUTUBE_OAUTH_CLIENT_ID", "")),
		ClientSecret:   strings.TrimSpace(s.settingValue("YOUTUBE_OAUTH_CLIENT_SECRET", "")),
		RefreshToken:   strings.TrimSpace(s.settingValue("YOUTUBE_OAUTH_REFRESH_TOKEN", "")),
		DefaultPrivacy: normalizeYouTubePrivacy(s.settingValue("YOUTUBE_DEFAULT_PRIVACY", defaultSadhuYouTubePrivacy)),
		CategoryID:     strings.TrimSpace(s.settingValue("YOUTUBE_DEFAULT_CATEGORY_ID", defaultSadhuYouTubeCategoryID)),
		DefaultTags:    parseYouTubeTags(s.settingValue("YOUTUBE_DEFAULT_TAGS", "")),
		TitleTemplate:  s.settingValue("YOUTUBE_TITLE_TEMPLATE", "{{title}} | Садху Санга"),
		DescTemplate:   s.settingValue("YOUTUBE_DESCRIPTION_TEMPLATE", "{{title}}\n\nЯзык трансляции: {{language}}\n#sadhu #sanga"),
	}
	if cfg.ClientID == "" || cfg.ClientSecret == "" || cfg.RefreshToken == "" {
		return sadhuYouTubeConfig{}, errors.New("youtube oauth settings are incomplete")
	}
	if cfg.CategoryID == "" {
		cfg.CategoryID = defaultSadhuYouTubeCategoryID
	}
	return cfg, nil
}

func (s *SadhuLiveArchiveService) settingValue(key, fallback string) string {
	trimmedKey := strings.TrimSpace(key)
	if trimmedKey == "" {
		return fallback
	}
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", trimmedKey).First(&setting).Error; err == nil {
		value := strings.TrimSpace(setting.Value)
		if value != "" {
			return value
		}
	}
	value := strings.TrimSpace(os.Getenv(trimmedKey))
	if value != "" {
		return value
	}
	return fallback
}

func (s *SadhuLiveArchiveService) boolSetting(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(s.settingValue(key, "")))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "on", "enabled":
		return true
	case "0", "false", "no", "off", "disabled":
		return false
	default:
		return fallback
	}
}

func (s *SadhuLiveArchiveService) intSetting(key string, fallback int) int {
	value := strings.TrimSpace(s.settingValue(key, ""))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func matchesSadhuLiveRecordingCandidate(track models.MediaTrack, session *models.ChannelLiveSession) bool {
	if session == nil || session.ID == 0 {
		return false
	}
	if track.LiveSessionID != nil && *track.LiveSessionID == session.ID {
		return true
	}
	if track.RoomID != nil && session.RoomID != 0 && *track.RoomID == session.RoomID {
		return true
	}

	needle := normalizeMatchString(session.Title)
	if needle != "" {
		if strings.Contains(normalizeMatchString(track.Title), needle) || strings.Contains(normalizeMatchString(track.Description), needle) {
			return true
		}
	}
	if session.RoomID > 0 {
		roomMarker := fmt.Sprintf("/rooms/%d/", session.RoomID)
		if strings.Contains(track.URL, roomMarker) || strings.Contains(track.OriginalURL, roomMarker) {
			return true
		}
	}
	return false
}

func normalizeMatchString(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	return strings.Join(strings.Fields(value), " ")
}

func uniqueUintValues(values []uint) []uint {
	if len(values) == 0 {
		return []uint{}
	}
	out := make([]uint, 0, len(values))
	seen := make(map[uint]struct{}, len(values))
	for _, v := range values {
		if v == 0 {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

func parseYouTubeTags(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		tag := strings.TrimSpace(part)
		if tag == "" {
			continue
		}
		normalized := strings.ToLower(tag)
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, tag)
	}
	return result
}

func normalizeYouTubePrivacy(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "private", "unlisted", "public":
		return value
	default:
		return defaultSadhuYouTubePrivacy
	}
}

func backoffDuration(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	minutes := 1 << uint(attempt-1)
	if minutes > 180 {
		minutes = 180
	}
	return time.Duration(minutes) * time.Minute
}

func truncateError(raw string, max int) string {
	text := strings.TrimSpace(raw)
	if max <= 0 || len(text) <= max {
		return text
	}
	return text[:max]
}

func newHTTPGetRequest(ctx context.Context, rawURL string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	return req, nil
}

func buildYouTubeMultipartPayload(metadataJSON []byte, fileName string, contentType string, videoBody io.Reader) (io.Reader, string) {
	pr, pw := io.Pipe()
	writer := multipart.NewWriter(pw)

	go func() {
		defer pw.Close()
		defer writer.Close()

		metaHeader := textproto.MIMEHeader{}
		metaHeader.Set("Content-Type", "application/json; charset=UTF-8")
		metaPart, err := writer.CreatePart(metaHeader)
		if err != nil {
			_ = pw.CloseWithError(err)
			return
		}
		if _, err := io.Copy(metaPart, bytes.NewReader(metadataJSON)); err != nil {
			_ = pw.CloseWithError(err)
			return
		}

		if strings.TrimSpace(fileName) == "" {
			fileName = "sadhu-sanga-live.mp4"
		}
		if strings.TrimSpace(contentType) == "" {
			contentType = "video/mp4"
		}
		if _, _, err := mime.ParseMediaType(contentType); err != nil {
			contentType = "video/mp4"
		}

		videoHeader := textproto.MIMEHeader{}
		videoHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="video"; filename="%s"`, fileName))
		videoHeader.Set("Content-Type", contentType)
		videoPart, err := writer.CreatePart(videoHeader)
		if err != nil {
			_ = pw.CloseWithError(err)
			return
		}
		if _, err := io.Copy(videoPart, videoBody); err != nil {
			_ = pw.CloseWithError(err)
			return
		}
	}()

	return pr, writer.FormDataContentType()
}
