package workers

import (
	"context"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"time"
)

type DatingModerationWorker struct {
	intervalSec int
	batchSize   int
	lifecycle   *services.DatingLifecycleService
}

func NewDatingModerationWorker() *DatingModerationWorker {
	return &DatingModerationWorker{
		intervalSec: getEnvInt("DATING_MODERATION_WORKER_INTERVAL_SEC", 30),
		batchSize:   getEnvInt("DATING_MODERATION_WORKER_BATCH_SIZE", 10),
		lifecycle:   services.NewDatingLifecycleService(database.DB, services.NewAiChatService()),
	}
}

func (w *DatingModerationWorker) Run() {
	if !isEnvEnabled("DATING_MODERATION_WORKER_ENABLED", true) {
		log.Printf("[DatingModerationWorker] disabled by DATING_MODERATION_WORKER_ENABLED")
		return
	}
	if w.intervalSec < 10 {
		w.intervalSec = 10
	}
	if w.batchSize < 1 {
		w.batchSize = 1
	}

	log.Printf("[DatingModerationWorker] started interval_sec=%d batch_size=%d", w.intervalSec, w.batchSize)
	w.runOnce()

	ticker := time.NewTicker(time.Duration(w.intervalSec) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		w.runOnce()
	}
}

func (w *DatingModerationWorker) runOnce() {
	if w.lifecycle == nil {
		return
	}
	count, err := w.lifecycle.ProcessDueModerationJobs(context.Background(), w.batchSize)
	if err != nil {
		w.setStatus("error:" + err.Error())
		log.Printf("[DatingModerationWorker] processing failed: %v", err)
		return
	}
	if count == 0 {
		w.setStatus("ok:idle")
		return
	}
	w.setStatus("ok:processed")
	log.Printf("[DatingModerationWorker] processed jobs=%d", count)
}

func (w *DatingModerationWorker) setStatus(status string) {
	w.setSetting("DATING_MODERATION_WORKER_LAST_HEARTBEAT", time.Now().UTC().Format(time.RFC3339))
	w.setSetting("DATING_MODERATION_WORKER_LAST_STATUS", status)
}

func (w *DatingModerationWorker) setSetting(key, value string) {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).FirstOrCreate(&setting, models.SystemSetting{Key: key}).Error; err != nil {
		return
	}
	setting.Value = value
	_ = database.DB.Save(&setting).Error
}
