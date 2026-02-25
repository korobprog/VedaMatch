package workers

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"
)

type FeedRebuildWorker struct {
	service     *services.FeedV2Service
	intervalSec int
	limit       int
	batchSize   int
}

func NewFeedRebuildWorker() *FeedRebuildWorker {
	return &FeedRebuildWorker{
		service:     services.NewFeedV2Service(),
		intervalSec: getEnvInt("FEED_REBUILD_INTERVAL_SEC", 300),
		limit:       getEnvInt("FEED_REBUILD_LIMIT", 120),
		batchSize:   getEnvInt("FEED_REBUILD_BATCH_SIZE", 200),
	}
}

func (w *FeedRebuildWorker) Run() {
	if !isEnvEnabled("FEED_WORKER_ENABLED", true) {
		log.Printf("[FeedWorker] disabled by FEED_WORKER_ENABLED")
		return
	}

	if w.intervalSec < 30 {
		w.intervalSec = 30
	}
	if w.limit < 20 {
		w.limit = 20
	}
	if w.batchSize < 1 {
		w.batchSize = 1
	}

	log.Printf("[FeedWorker] started interval_sec=%d limit=%d batch_size=%d", w.intervalSec, w.limit, w.batchSize)
	w.runOnce()

	ticker := time.NewTicker(time.Duration(w.intervalSec) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		w.runOnce()
	}
}

func (w *FeedRebuildWorker) runOnce() {
	started := time.Now()
	startCursor := w.getCursor()
	count, users, lastUserID, wrapped, err := w.service.RebuildBatchByUserID(startCursor, w.batchSize, w.limit)
	if err != nil {
		w.setSetting("FEED_WORKER_LAST_STATUS", "error:"+err.Error())
		w.setSetting("FEED_WORKER_LAST_HEARTBEAT", time.Now().UTC().Format(time.RFC3339))
		log.Printf("[FeedWorker] rebuild failed: %v", err)
		return
	}
	nextCursor := lastUserID
	if wrapped {
		nextCursor = 0
	}
	w.setCursor(nextCursor)
	w.setSetting("FEED_WORKER_LAST_STATUS", "ok")
	w.setSetting("FEED_WORKER_LAST_HEARTBEAT", time.Now().UTC().Format(time.RFC3339))
	w.setSetting("FEED_WORKER_LAST_STATS", fmt.Sprintf("items=%d users=%d start_cursor=%d end_cursor=%d wrapped=%t duration_ms=%d", count, users, startCursor, nextCursor, wrapped, time.Since(started).Milliseconds()))
	log.Printf("[FeedWorker] rebuild batch completed items=%d users=%d start_cursor=%d end_cursor=%d wrapped=%t duration_ms=%d", count, users, startCursor, nextCursor, wrapped, time.Since(started).Milliseconds())
}

func (w *FeedRebuildWorker) getCursor() uint {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "FEED_WORKER_LAST_USER_ID").First(&setting).Error; err != nil {
		return 0
	}
	value, err := strconv.ParseUint(strings.TrimSpace(setting.Value), 10, 64)
	if err != nil {
		return 0
	}
	return uint(value)
}

func (w *FeedRebuildWorker) setCursor(value uint) {
	w.setSetting("FEED_WORKER_LAST_USER_ID", strconv.FormatUint(uint64(value), 10))
}

func (w *FeedRebuildWorker) setSetting(key, value string) {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).FirstOrCreate(&setting, models.SystemSetting{Key: key}).Error; err != nil {
		return
	}
	setting.Value = value
	_ = database.DB.Save(&setting).Error
}

func isEnvEnabled(key string, fallback bool) bool {
	raw := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if raw == "" {
		return fallback
	}
	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
