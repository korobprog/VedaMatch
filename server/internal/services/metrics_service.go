package services

import (
	"strings"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	MetricChannelPostsPublishedTotal          = "channel_posts_published_total"
	MetricChannelPostsScheduledTotal          = "channel_posts_scheduled_total"
	MetricChannelCTAClickTotal                = "channel_cta_click_total"
	MetricOrdersFromChannelTotal              = "orders_from_channel_total"
	MetricBookingsFromChannelTotal            = "bookings_from_channel_total"
	MetricChannelPersonalDeliveriesTotal      = "channel_personal_deliveries_total"
	MetricChannelPersonalPushSentTotal        = "channel_personal_push_sent_total"
	MetricChannelPersonalDMCreatedTotal       = "channel_personal_dm_created_total"
	MetricChannelPersonalDeliveryFailedTotal  = "channel_personal_delivery_failed_total"
	MetricPromotedAdsServedTotal              = "promoted_ads_served_total"
	MetricPromotedAdsClickedTotal             = "promoted_ads_clicked_total"
	MetricServicesPlatformFeeChargedTotal     = "services_platform_fee_charged_total"
	MetricServicesPlatformFeeBookingsTotal    = "services_platform_fee_bookings_total"
	MetricServicesPlatformFeeFailedTotal      = "services_platform_fee_failed_total"
	MetricServicesProviderNetPaidTotal        = "services_provider_net_paid_total"
	MetricCafePlatformFeeChargedTotal         = "cafe_platform_fee_charged_total"
	MetricCafePlatformFeeOrdersTotal          = "cafe_platform_fee_orders_total"
	MetricCafePlatformFeeFailedTotal          = "cafe_platform_fee_failed_total"
	MetricCafeMerchantNetPaidTotal            = "cafe_merchant_net_paid_total"
	MetricCafeSettlementRefundTotal           = "cafe_settlement_refund_total"
	MetricMarketPlatformFeeChargedTotal       = "market_platform_fee_charged_total"
	MetricMarketPlatformFeeOrdersTotal        = "market_platform_fee_orders_total"
	MetricMarketSettlementRefundTotal         = "market_settlement_refund_total"
	MetricShopSubscriptionsPurchasedTotal     = "shop_subscriptions_purchased_total"
	MetricShopProductPromotionsPurchasedTotal = "shop_product_promotions_purchased_total"
	MetricShopGeoBoostsPurchasedTotal         = "shop_geo_boosts_purchased_total"
	MetricShopPlanLimitBlockTotal             = "shop_plan_limit_block_total"

	MetricAuthRefreshSuccess                       = "auth_refresh_success"
	MetricAuthRefreshFail                          = "auth_refresh_fail"
	MetricAuthGoogleAttemptTotal                   = "auth_google_attempt_total"
	MetricAuthGoogleSuccessTotal                   = "auth_google_success_total"
	MetricAuthGoogleFailTotal                      = "auth_google_fail_total"
	MetricHTTP4xxTotal                             = "http_4xx_total"
	MetricHTTP5xxTotal                             = "http_5xx_total"
	MetricRateLimitedTotal                         = "http_429_total"
	MetricChatHistoryLatency                       = "chat_history_latency"
	MetricRAGLiteTimeout                           = "rag_lite_timeout"
	MetricPushSendFail                             = "push_send_fail"
	MetricRoomAuthForbiddenTotal                   = "room_auth_forbidden_total"
	MetricRoomJoinSuccessTotal                     = "room_join_success_total"
	MetricRoomJoinFailTotal                        = "room_join_fail_total"
	MetricRoomPushFailTotal                        = "room_push_fail_total"
	MetricRoomWSDeliveryTotal                      = "room_ws_delivery_total"
	MetricRoomSFUTokenIssuedTotal                  = "room_sfu_token_issued_total"
	MetricRoomSFUTokenDeniedTotal                  = "room_sfu_token_denied_total"
	MetricRoomSFUTokenErrorTotal                   = "room_sfu_token_error_total"
	MetricEduTutorTurnTotal                        = "edu_tutor_turn_total"
	MetricEduTutorNoDataTotal                      = "edu_tutor_no_data_total"
	MetricEduTutorExtractorFailTotal               = "edu_tutor_extractor_fail_total"
	MetricEduTutorMemoryUpsertTotal                = "edu_tutor_memory_upsert_total"
	MetricEduTutorRetentionCleanupTotal            = "edu_tutor_retention_cleanup_total"
	MetricEduTutorRetentionCleanupErrorTotal       = "edu_tutor_retention_cleanup_error_total"
	MetricEduTutorRetentionDocsDeletedTotal        = "edu_tutor_retention_docs_deleted_total"
	MetricEduTutorRetentionWeakDeletedTotal        = "edu_tutor_retention_weak_deleted_total"
	MetricEduTutorTurnLatencyMsTotal               = "edu_tutor_turn_latency_ms_total"
	MetricEduTutorRetrievalLatencyMsTotal          = "edu_tutor_retrieval_latency_ms_total"
	MetricEduTutorRetrievalErrorTotal              = "edu_tutor_retrieval_error_total"
	MetricVideoCirclesCreatedTotal                 = "video_circles_created_total"
	MetricVideoCirclesCreateRejectedNonCDN         = "video_circles_create_rejected_non_cdn_total"
	MetricVideoCirclesUploadS3FailTotal            = "video_circles_upload_s3_fail_total"
	MetricVideoCirclesNonCDNDetectedTotal          = "video_circles_non_cdn_detected_total"
	MetricChatVideoCircleUploadTotal               = "chat_video_circle_upload_total"
	MetricChatVideoCircleUploadFailTotal           = "chat_video_circle_upload_fail_total"
	MetricChatVideoCircleCleanupDeletedTotal       = "chat_video_circle_cleanup_deleted_total"
	MetricChatTranscribeTotal                      = "chat_transcribe_total"
	MetricChatTranscribeFailTotal                  = "chat_transcribe_fail_total"
	MetricChatTranscribeLatencyMsTotal             = "chat_transcribe_latency_ms_total"
	MetricChatTranscribeBillingChargedTotal        = "chat_transcribe_billing_charged_total"
	MetricChatTranscribeBillingRefundTotal         = "chat_transcribe_billing_refund_total"
	MetricChatTranscribeBillingFreeMinTotal        = "chat_transcribe_billing_free_minutes_total"
	MetricChatTranscribeBillingPaidMinTotal        = "chat_transcribe_billing_paid_minutes_total"
	MetricChatTranscribeBillingFailedTotal         = "chat_transcribe_billing_failed_total"
	MetricChannelPostEditWindowRejectedTotal       = "channel_post_edit_window_rejected_total"
	MetricChannelPostReactionSetTotal              = "channel_post_reaction_set_total"
	MetricChannelPostCommentCreateTotal            = "channel_post_comment_create_total"
	MetricChannelPostShareTotal                    = "channel_post_share_total"
	MetricChannelPostViewTotal                     = "channel_post_view_total"
	MetricSadhuLiveCreatedTotal                    = "sadhu_live_created_total"
	MetricSadhuLiveStartedTotal                    = "sadhu_live_started_total"
	MetricSadhuLiveJoinDeniedTotal                 = "sadhu_live_join_denied_total"
	MetricSadhuLiveJoinSuccessTotal                = "sadhu_live_join_success_total"
	MetricSadhuLiveEndedTotal                      = "sadhu_live_ended_total"
	MetricSadhuLiveLanguageSetTotal                = "sadhu_live_language_set_total"
	MetricSadhuLiveArchiveExpiredTotal             = "sadhu_live_archive_expired_total"
	MetricSadhuYouTubeUploadSuccessTotal           = "sadhu_youtube_upload_success_total"
	MetricSadhuYouTubeUploadFailedTotal            = "sadhu_youtube_upload_failed_total"
	MetricSadhuYouTubeUploadRetryTotal             = "sadhu_youtube_upload_retry_total"
	MetricSadhuPreacherProfileReadTotal            = "sadhu_preacher_profile_read_total"
	MetricSadhuPreacherProfileUpsertTotal          = "sadhu_preacher_profile_upsert_total"
	MetricSadhuMathFilterAppliedTotal              = "sadhu_math_filter_applied_total"
	MetricSadhuMathFilterBypassTotal               = "sadhu_math_filter_bypass_total"
	MetricSadhuMathFilterEmptyProfileTotal         = "sadhu_math_filter_empty_profile_total"
	MetricProPurchaseAttemptTotal                  = "pro_purchase_attempt_total"
	MetricProPurchaseSuccessTotal                  = "pro_purchase_success_total"
	MetricProPurchaseInsufficientLKMTotal          = "pro_purchase_insufficient_lkm_total"
	MetricProEntitlementSyncTotal                  = "pro_entitlement_sync_total"
	MetricProExpiredTotal                          = "pro_expired_total"
	MetricConnectApplicationCreatedTotal           = "connect_application_created_total"
	MetricConnectApplicationStatusUpdatedTotal     = "connect_application_status_updated_total"
	MetricConnectFeedbackSubmittedTotal            = "connect_feedback_submitted_total"
	MetricConnectOpportunityApprovedTotal          = "connect_opportunity_approved_total"
	MetricConnectOpportunityRejectedTotal          = "connect_opportunity_rejected_total"
	MetricConnectPushApplicationCreatedSentTotal   = "connect_push_application_created_sent_total"
	MetricConnectPushApplicationCreatedFailedTotal = "connect_push_application_created_failed_total"
	MetricConnectPushApplicationStatusSentTotal    = "connect_push_application_status_sent_total"
	MetricConnectPushApplicationStatusFailedTotal  = "connect_push_application_status_failed_total"
	MetricAndroidReleasePromptShownTotal           = "android_release_prompt_shown_total"
	MetricAndroidReleasePromptOpenTotal            = "android_release_prompt_open_total"
	MetricAndroidReleaseDownloadClickTotal         = "android_release_download_click_total"
	MetricAndroidReleasePageViewTotal              = "android_release_page_view_total"
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
