package workers

import (
	"context"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"time"

	"gorm.io/gorm/clause"
)

type MediaPipelineWorker struct {
	intervalSec int
	maxRetries  int
	transcoder  *services.TranscodingService
	redis       *services.RedisService
	s3          *services.S3Service
}

func NewMediaPipelineWorker() *MediaPipelineWorker {
	return &MediaPipelineWorker{
		intervalSec: getEnvInt("MEDIA_WORKER_INTERVAL_SEC", 60),
		maxRetries:  getEnvInt("MEDIA_WORKER_MAX_RETRIES", 2),
		transcoder:  services.NewTranscodingService(),
		redis:       services.NewRedisService(),
		s3:          services.NewS3Service(),
	}
}

func (w *MediaPipelineWorker) Run() {
	if !isEnvEnabled("MEDIA_WORKER_ENABLED", true) {
		log.Printf("[MediaWorker] disabled by MEDIA_WORKER_ENABLED")
		return
	}

	if w.intervalSec < 15 {
		w.intervalSec = 15
	}
	if w.maxRetries < 0 {
		w.maxRetries = 0
	}

	log.Printf("[MediaWorker] started interval_sec=%d max_retries=%d", w.intervalSec, w.maxRetries)
	w.runOnce()

	ticker := time.NewTicker(time.Duration(w.intervalSec) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		w.runOnce()
	}
}

func (w *MediaPipelineWorker) runOnce() {
	if w.redis == nil || !w.redis.IsConnected() {
		log.Printf("[MediaWorker] redis not connected, heartbeat storage=%s", strings.TrimSpace(os.Getenv("S3_ENDPOINT")))
		w.setWorkerStatus("error:redis_not_connected")
		return
	}

	job, err := w.redis.GetNextTranscodingJob()
	if err != nil {
		log.Printf("[MediaWorker] queue poll error: %v", err)
		w.setWorkerStatus("error:queue_poll")
		return
	}
	if job == nil {
		log.Printf("[MediaWorker] queue idle")
		w.setWorkerStatus("ok:idle")
		return
	}

	started := time.Now().UTC()
	log.Printf("[MediaWorker] processing job_id=%s video_id=%d", job.ID, job.VideoID)
	_ = w.markJobState(job, "processing", 0, "", &started, nil)
	_ = database.DB.Model(&models.MediaTrack{}).Where("id = ?", job.VideoID).Updates(map[string]interface{}{
		"transcoding_status":   "processing",
		"transcoding_progress": 0,
		"transcoding_job_id":   job.ID,
	}).Error

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
	defer cancel()

	if err := w.transcoder.TranscodeVideo(ctx, job); err != nil {
		log.Printf("[MediaWorker] transcode failed job_id=%s error=%v", job.ID, err)
		requeued := false
		if job.Attempt < w.maxRetries {
			retryJob := *job
			retryJob.Attempt++
			retryJob.Status = "pending"
			retryJob.Progress = 0
			retryJob.Error = ""
			if requeueErr := w.redis.AddTranscodingJob(&retryJob); requeueErr != nil {
				log.Printf("[MediaWorker] requeue failed job_id=%s attempt=%d error=%v", job.ID, retryJob.Attempt, requeueErr)
			} else {
				log.Printf("[MediaWorker] requeued job_id=%s attempt=%d/%d", job.ID, retryJob.Attempt, w.maxRetries)
				w.setWorkerStatus("retrying")
				requeued = true
			}
		}
		if requeued {
			_ = w.markJobState(job, "pending", 0, "", &started, nil)
			_ = database.DB.Model(&models.MediaTrack{}).Where("id = ?", job.VideoID).Updates(map[string]interface{}{
				"transcoding_status":   "pending",
				"transcoding_progress": 0,
			}).Error
		} else {
			_ = w.markJobState(job, "failed", 0, err.Error(), &started, nil)
			_ = database.DB.Model(&models.MediaTrack{}).Where("id = ?", job.VideoID).Updates(map[string]interface{}{
				"transcoding_status":   "failed",
				"transcoding_progress": 0,
			}).Error
		}
		w.setWorkerStatus("error:transcode_failed")
		return
	}

	completed := time.Now().UTC()
	hlsURL := ""
	thumbnailURL := ""
	if w.s3 != nil {
		hlsURL = w.s3.GetPublicURL(job.OutputPath + "/master.m3u8")
		thumbnailURL = w.s3.GetPublicURL(job.OutputPath + "/thumbnail.jpg")
	}
	_ = database.DB.Model(&models.MediaTrack{}).Where("id = ?", job.VideoID).Updates(map[string]interface{}{
		"transcoding_status":   "completed",
		"transcoding_progress": 100,
		"hls_url":              hlsURL,
		"url":                  hlsURL,
		"thumbnail_url":        thumbnailURL,
		"is_active":            true,
		"published_at":         &completed,
	}).Error
	_ = w.markJobState(job, "completed", 100, "", &started, &completed)
	w.setWorkerStatus("ok:completed")
	log.Printf("[MediaWorker] completed job_id=%s duration_ms=%d", job.ID, time.Since(started).Milliseconds())
}

func (w *MediaPipelineWorker) markJobState(
	job *services.TranscodingJob,
	status string,
	progress int,
	errText string,
	startedAt *time.Time,
	completedAt *time.Time,
) error {
	if job == nil {
		return nil
	}
	record := models.VideoTranscodingJob{
		MediaTrackID: job.VideoID,
		JobID:        job.ID,
		Status:       models.TranscodingStatus(status),
		Progress:     progress,
		Error:        errText,
		InputPath:    job.InputPath,
		OutputPath:   job.OutputPath,
		StartedAt:    startedAt,
		CompletedAt:  completedAt,
	}
	return database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "job_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"media_track_id", "status", "progress", "error", "input_path", "output_path", "started_at", "completed_at", "updated_at"}),
	}).Create(&record).Error
}

func (w *MediaPipelineWorker) setWorkerStatus(status string) {
	w.setSetting("MEDIA_WORKER_LAST_HEARTBEAT", time.Now().UTC().Format(time.RFC3339))
	w.setSetting("MEDIA_WORKER_LAST_STATUS", status)
}

func (w *MediaPipelineWorker) setSetting(key, value string) {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).FirstOrCreate(&setting, models.SystemSetting{Key: key}).Error; err != nil {
		return
	}
	setting.Value = value
	_ = database.DB.Save(&setting).Error
}
