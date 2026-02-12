package services

import (
	"strings"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	MetricChannelPostsPublishedTotal = "channel_posts_published_total"
	MetricChannelPostsScheduledTotal = "channel_posts_scheduled_total"
	MetricChannelCTAClickTotal       = "channel_cta_click_total"
	MetricOrdersFromChannelTotal     = "orders_from_channel_total"
	MetricBookingsFromChannelTotal   = "bookings_from_channel_total"
	MetricPromotedAdsServedTotal     = "promoted_ads_served_total"
	MetricPromotedAdsClickedTotal    = "promoted_ads_clicked_total"
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
