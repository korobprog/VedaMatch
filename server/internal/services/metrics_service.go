package services

import (
	"strings"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	MetricChannelPostsPublishedTotal         = "channel_posts_published_total"
	MetricChannelPostsScheduledTotal         = "channel_posts_scheduled_total"
	MetricChannelCTAClickTotal               = "channel_cta_click_total"
	MetricOrdersFromChannelTotal             = "orders_from_channel_total"
	MetricBookingsFromChannelTotal           = "bookings_from_channel_total"
	MetricChannelPersonalDeliveriesTotal     = "channel_personal_deliveries_total"
	MetricChannelPersonalPushSentTotal       = "channel_personal_push_sent_total"
	MetricChannelPersonalDMCreatedTotal      = "channel_personal_dm_created_total"
	MetricChannelPersonalDeliveryFailedTotal = "channel_personal_delivery_failed_total"
	MetricPromotedAdsServedTotal             = "promoted_ads_served_total"
	MetricPromotedAdsClickedTotal            = "promoted_ads_clicked_total"

	MetricAuthRefreshSuccess                 = "auth_refresh_success"
	MetricAuthRefreshFail                    = "auth_refresh_fail"
	MetricHTTP4xxTotal                       = "http_4xx_total"
	MetricHTTP5xxTotal                       = "http_5xx_total"
	MetricRateLimitedTotal                   = "http_429_total"
	MetricChatHistoryLatency                 = "chat_history_latency"
	MetricRAGLiteTimeout                     = "rag_lite_timeout"
	MetricPushSendFail                       = "push_send_fail"
	MetricRoomAuthForbiddenTotal             = "room_auth_forbidden_total"
	MetricRoomJoinSuccessTotal               = "room_join_success_total"
	MetricRoomJoinFailTotal                  = "room_join_fail_total"
	MetricRoomPushFailTotal                  = "room_push_fail_total"
	MetricRoomWSDeliveryTotal                = "room_ws_delivery_total"
	MetricEduTutorTurnTotal                  = "edu_tutor_turn_total"
	MetricEduTutorNoDataTotal                = "edu_tutor_no_data_total"
	MetricEduTutorExtractorFailTotal         = "edu_tutor_extractor_fail_total"
	MetricEduTutorMemoryUpsertTotal          = "edu_tutor_memory_upsert_total"
	MetricEduTutorRetentionCleanupTotal      = "edu_tutor_retention_cleanup_total"
	MetricEduTutorRetentionCleanupErrorTotal = "edu_tutor_retention_cleanup_error_total"
	MetricEduTutorRetentionDocsDeletedTotal  = "edu_tutor_retention_docs_deleted_total"
	MetricEduTutorRetentionWeakDeletedTotal  = "edu_tutor_retention_weak_deleted_total"
	MetricEduTutorTurnLatencyMsTotal         = "edu_tutor_turn_latency_ms_total"
	MetricEduTutorRetrievalLatencyMsTotal    = "edu_tutor_retrieval_latency_ms_total"
	MetricEduTutorRetrievalErrorTotal        = "edu_tutor_retrieval_error_total"
)

type MetricsService struct {
	db *gorm.DB
}

func NewMetricsService() *MetricsService {
	return &MetricsService{db: database.DB}
}

func GetMetricsService() *MetricsService {
	return NewMetricsService()
}

func (s *MetricsService) Increment(key string, delta int64) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil
	}
	if delta == 0 {
		delta = 1
	}

	counter := models.MetricCounter{
		Key:   key,
		Value: delta,
	}

	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "key"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"value":      gorm.Expr("metric_counters.value + EXCLUDED.value"),
			"updated_at": gorm.Expr("NOW()"),
		}),
	}).Create(&counter).Error
}

func (s *MetricsService) Snapshot(keys []string) (map[string]int64, error) {
	result := make(map[string]int64, len(keys))
	normalized := make([]string, 0, len(keys))
	for _, key := range keys {
		k := strings.TrimSpace(key)
		if k == "" {
			continue
		}
		normalized = append(normalized, k)
		result[k] = 0
	}
	if len(normalized) == 0 {
		return result, nil
	}

	var counters []models.MetricCounter
	if err := s.db.Where("key IN ?", normalized).Find(&counters).Error; err != nil {
		return nil, err
	}

	for _, counter := range counters {
		result[counter.Key] = counter.Value
	}

	return result, nil
}
