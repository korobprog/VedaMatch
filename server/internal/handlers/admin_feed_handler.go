package handlers

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AdminFeedHandler struct{}

func NewAdminFeedHandler() *AdminFeedHandler {
	return &AdminFeedHandler{}
}

var feedConfigKeys = []string{
	"FEED_V2_ENABLED",
	"FEED_V2_ROLLOUT_PERCENT",
	"FEED_RANK_WEIGHTS_JSON",
	"FEED_CACHE_TTL_SEC",
	"FEED_CIRCLE_MIX_RATIO",
}

func (h *AdminFeedHandler) GetConfig(c *fiber.Ctx) error {
	out := make(map[string]string, len(feedConfigKeys))
	for _, key := range feedConfigKeys {
		var setting models.SystemSetting
		if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil {
			out[key] = strings.TrimSpace(setting.Value)
			continue
		}
		out[key] = strings.TrimSpace(os.Getenv(key))
	}
	return c.JSON(out)
}

func (h *AdminFeedHandler) UpdateConfig(c *fiber.Ctx) error {
	var payload map[string]string
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	for _, key := range feedConfigKeys {
		value, ok := payload[key]
		if !ok {
			continue
		}
		var setting models.SystemSetting
		if err := database.DB.Where("key = ?", key).FirstOrCreate(&setting, models.SystemSetting{Key: key}).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		setting.Value = strings.TrimSpace(value)
		if err := database.DB.Save(&setting).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	}
	return c.JSON(fiber.Map{"success": true})
}

func (h *AdminFeedHandler) GetMetrics(c *fiber.Ctx) error {
	metrics, err := services.GetMetricsService().Snapshot([]string{
		"feed_v2_impressions_total",
		"feed_v2_circle_impressions_total",
		"feed_v2_requests_total",
		"feed_v2_errors_total",
		services.MetricVideoCirclesCreatedTotal,
		services.MetricVideoCirclesCreateRejectedNonCDN,
		services.MetricVideoCirclesUploadS3FailTotal,
		services.MetricVideoCirclesNonCDNDetectedTotal,
		services.MetricConnectApplicationCreatedTotal,
		services.MetricConnectApplicationStatusUpdatedTotal,
		services.MetricConnectFeedbackSubmittedTotal,
		services.MetricConnectOpportunityApprovedTotal,
		services.MetricConnectOpportunityRejectedTotal,
		services.MetricConnectPushApplicationCreatedSentTotal,
		services.MetricConnectPushApplicationCreatedFailedTotal,
		services.MetricConnectPushApplicationStatusSentTotal,
		services.MetricConnectPushApplicationStatusFailedTotal,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(metrics)
}

func (h *AdminFeedHandler) Rebuild(c *fiber.Ctx) error {
	scope := strings.TrimSpace(c.Query("scope", "page1"))
	userIDRaw := strings.TrimSpace(c.Query("userId", ""))
	orgIDRaw := strings.TrimSpace(c.Query("orgId", ""))
	limit := c.QueryInt("limit", 120)
	feedService := services.NewFeedV2Service()
	built := 0

	if userIDRaw != "" {
		userID, err := strconv.ParseUint(userIDRaw, 10, 64)
		if err != nil || userID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid userId"})
		}
		count, err := feedService.RebuildForUser(uint(userID), limit)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		built = count
	} else if orgIDRaw != "" {
		orgID, err := strconv.ParseUint(orgIDRaw, 10, 64)
		if err != nil || orgID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid orgId"})
		}
		count, err := feedService.RebuildForOrg(uint(orgID), limit)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		built = count
	} else {
		count, err := feedService.RebuildAll(limit)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		built = count
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"scope":      scope,
		"userId":     userIDRaw,
		"orgId":      orgIDRaw,
		"queuedAt":   time.Now().UTC(),
		"message":    "rebuild completed",
		"builtItems": built,
	})
}

func (h *AdminFeedHandler) CDNHealth(c *fiber.Ctx) error {
	cdnEnabled := strings.EqualFold(strings.TrimSpace(os.Getenv("CDN_ENABLED")), "true")
	cdnBaseURL := strings.TrimSpace(os.Getenv("CDN_BASE_URL"))
	s3PublicURL := strings.TrimSpace(os.Getenv("S3_PUBLIC_URL"))
	s3Endpoint := strings.TrimSpace(os.Getenv("S3_ENDPOINT"))
	videoCirclesCDNReady := services.IsVideoCirclesCDNReady()

	return c.JSON(fiber.Map{
		"cdnEnabled":           cdnEnabled,
		"cdnBaseUrl":           cdnBaseURL,
		"s3PublicUrl":          s3PublicURL,
		"s3Endpoint":           s3Endpoint,
		"originHealthy":        s3Endpoint != "",
		"videoCirclesCdnReady": videoCirclesCDNReady,
		"videoCirclesUrlPolicy": func() string {
			if videoCirclesCDNReady {
				return "cdn_only"
			}
			return "misconfigured"
		}(),
		"configuredAt": time.Now().UTC(),
	})
}

func (h *AdminFeedHandler) GetWorkersHealth(c *fiber.Ctx) error {
	feedHeartbeat := h.getSettingOrEnv("FEED_WORKER_LAST_HEARTBEAT", "")
	feedStatus := h.getSettingOrEnv("FEED_WORKER_LAST_STATUS", "unknown")
	feedStats := h.getSettingOrEnv("FEED_WORKER_LAST_STATS", "")
	feedCursor := h.getSettingOrEnv("FEED_WORKER_LAST_USER_ID", "0")

	mediaHeartbeat := h.getSettingOrEnv("MEDIA_WORKER_LAST_HEARTBEAT", "")
	mediaStatus := h.getSettingOrEnv("MEDIA_WORKER_LAST_STATUS", "unknown")

	datingHeartbeat := h.getSettingOrEnv("DATING_MODERATION_WORKER_LAST_HEARTBEAT", "")
	datingStatus := h.getSettingOrEnv("DATING_MODERATION_WORKER_LAST_STATUS", "unknown")

	var pendingJobs int64
	var retryingJobs int64
	var processingJobs int64
	var failedJobs int64
	_ = database.DB.Model(&models.DatingModerationJob{}).Where("status = ?", models.DatingModerationJobPending).Count(&pendingJobs).Error
	_ = database.DB.Model(&models.DatingModerationJob{}).Where("status = ?", models.DatingModerationJobRetrying).Count(&retryingJobs).Error
	_ = database.DB.Model(&models.DatingModerationJob{}).Where("status = ?", models.DatingModerationJobProcessing).Count(&processingJobs).Error
	_ = database.DB.Model(&models.DatingModerationJob{}).Where("status = ?", models.DatingModerationJobFailed).Count(&failedJobs).Error

	return c.JSON(fiber.Map{
		"feedWorker": fiber.Map{
			"enabled":       strings.EqualFold(strings.TrimSpace(os.Getenv("FEED_WORKER_ENABLED")), "true"),
			"lastHeartbeat": feedHeartbeat,
			"lastStatus":    feedStatus,
			"lastStats":     feedStats,
			"cursorUserId":  feedCursor,
		},
		"mediaWorker": fiber.Map{
			"enabled":       strings.EqualFold(strings.TrimSpace(os.Getenv("MEDIA_WORKER_ENABLED")), "true"),
			"lastHeartbeat": mediaHeartbeat,
			"lastStatus":    mediaStatus,
		},
		"datingModerationWorker": fiber.Map{
			"enabled":       strings.EqualFold(strings.TrimSpace(os.Getenv("DATING_MODERATION_WORKER_ENABLED")), "true"),
			"lastHeartbeat": datingHeartbeat,
			"lastStatus":    datingStatus,
			"queue": fiber.Map{
				"pending":    pendingJobs,
				"retrying":   retryingJobs,
				"processing": processingJobs,
				"failed":     failedJobs,
			},
		},
	})
}

func (h *AdminFeedHandler) getSettingOrEnv(key string, fallback string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil {
		value := strings.TrimSpace(setting.Value)
		if value != "" {
			return value
		}
	}
	value := strings.TrimSpace(os.Getenv(key))
	if value != "" {
		return value
	}
	return fallback
}
