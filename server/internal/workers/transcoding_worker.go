package workers

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
)

// TranscodingWorker processes video transcoding jobs from Redis queue
type TranscodingWorker struct {
	redis        *services.RedisService
	transcoding  *services.TranscodingService
	videoService *services.VideoService
	concurrency  int
	stopChan     chan struct{}
	wg           sync.WaitGroup
}

// NewTranscodingWorker creates a new transcoding worker
func NewTranscodingWorker(concurrency int) *TranscodingWorker {
	if concurrency < 1 {
		concurrency = 1
	}

	return &TranscodingWorker{
		redis:        services.NewRedisService(),
		transcoding:  services.NewTranscodingService(),
		videoService: services.NewVideoService(database.DB),
		concurrency:  concurrency,
		stopChan:     make(chan struct{}),
	}
}

// Start begins processing transcoding jobs
func (w *TranscodingWorker) Start() {
	log.Printf("[TranscodingWorker] Starting with %d workers", w.concurrency)

	for i := 0; i < w.concurrency; i++ {
		w.wg.Add(1)
		go w.worker(i)
	}

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("[TranscodingWorker] Shutting down...")
		w.Stop()
	}()
}

// Stop stops all workers gracefully
func (w *TranscodingWorker) Stop() {
	close(w.stopChan)
	w.wg.Wait()
	log.Println("[TranscodingWorker] All workers stopped")
}

// worker is a single worker goroutine
func (w *TranscodingWorker) worker(id int) {
	defer w.wg.Done()

	log.Printf("[TranscodingWorker] Worker %d started", id)

	for {
		select {
		case <-w.stopChan:
			log.Printf("[TranscodingWorker] Worker %d stopping", id)
			return
		default:
			// Try to get a job from the queue
			job, err := w.redis.GetNextTranscodingJob()
			if err != nil {
				log.Printf("[TranscodingWorker] Worker %d error getting job: %v", id, err)
				time.Sleep(5 * time.Second)
				continue
			}

			if job == nil {
				// No job available, wait and retry
				time.Sleep(1 * time.Second)
				continue
			}

			// Process the job
			log.Printf("[TranscodingWorker] Worker %d processing job %s for video %d", id, job.ID, job.VideoID)
			w.processJob(job)
		}
	}
}

// processJob handles a single transcoding job
func (w *TranscodingWorker) processJob(job *services.TranscodingJob) {
	ctx := context.Background()
	startTime := time.Now()

	// Update job status to processing
	w.updateVideoStatus(job.VideoID, "processing", "", "", 0)

	// Process the video
	err := w.transcoding.TranscodeVideo(ctx, job)

	duration := time.Since(startTime)

	if err != nil {
		log.Printf("[TranscodingWorker] Job %s failed after %v: %v", job.ID, duration, err)

		// Update status to failed
		w.updateVideoStatus(job.VideoID, "failed", "", "", 0)
		w.redis.UpdateTranscodingProgress(job.ID, 0, "failed")

		// Save error to DB
		w.saveJobError(job.VideoID, job.ID, err.Error())
		return
	}

	log.Printf("[TranscodingWorker] Job %s completed in %v", job.ID, duration)

	// Get video info for duration
	videoInfo := w.getVideoInfo(job.VideoID)

	// Construct URLs
	s3Service := services.NewS3Service()
	hlsURL := s3Service.GetPublicURL(job.OutputPath)
	thumbnailURL := s3Service.GetPublicURL(job.OutputPath + "/thumbnail.jpg")

	// Update video status
	w.updateVideoStatus(job.VideoID, "completed", hlsURL, thumbnailURL, videoInfo.Duration)

	// Save quality variants to DB
	w.saveQualityVariants(job.VideoID, job.OutputPath, job.Qualities)
}

// updateVideoStatus updates the video transcoding status
func (w *TranscodingWorker) updateVideoStatus(videoID uint, status, hlsURL, thumbnailURL string, duration int) {
	err := w.videoService.UpdateTranscodingStatus(videoID, status, hlsURL, thumbnailURL, duration)
	if err != nil {
		log.Printf("[TranscodingWorker] Failed to update video %d status: %v", videoID, err)
	}
}

// saveJobError saves job error to database
func (w *TranscodingWorker) saveJobError(videoID uint, jobID string, errorMsg string) {
	job := &models.VideoTranscodingJob{
		MediaTrackID: videoID,
		JobID:        jobID,
		Status:       models.TranscodingFailed,
		Error:        errorMsg,
	}

	now := time.Now()
	job.CompletedAt = &now

	database.DB.Create(job)
}

// getVideoInfo retrieves basic video info
func (w *TranscodingWorker) getVideoInfo(videoID uint) *models.MediaTrack {
	var track models.MediaTrack
	database.DB.First(&track, videoID)
	return &track
}

// saveQualityVariants saves the generated quality variants to DB
func (w *TranscodingWorker) saveQualityVariants(videoID uint, outputPath string, qualities []string) {
	s3Service := services.NewS3Service()
	presets := models.StandardQualityPresets()

	for _, preset := range presets {
		// Check if this quality was requested
		found := len(qualities) == 0 // If no specific qualities, all were generated
		for _, q := range qualities {
			if q == preset.Name {
				found = true
				break
			}
		}

		if !found {
			continue
		}

		quality := &models.VideoQuality{
			MediaTrackID: videoID,
			Quality:      preset.Name,
			URL:          s3Service.GetPublicURL(outputPath + "/" + preset.Name + "/playlist.m3u8"),
			Bitrate:      preset.Bitrate,
			Width:        preset.Width,
			Height:       preset.Height,
		}

		if err := database.DB.Create(quality).Error; err != nil {
			log.Printf("[TranscodingWorker] Failed to save quality %s for video %d: %v", preset.Name, videoID, err)
		}
	}
}

// StartWorkerInBackground starts the worker in a goroutine (for embedding in main app)
func StartWorkerInBackground(concurrency int) *TranscodingWorker {
	worker := NewTranscodingWorker(concurrency)
	go worker.Start()
	return worker
}

// GetQueueStats returns current queue statistics
func (w *TranscodingWorker) GetQueueStats() (int64, error) {
	return w.redis.GetQueueLength()
}
