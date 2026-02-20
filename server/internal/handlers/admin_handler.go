package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/mail"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

func requireAdminUserID(c *fiber.Ctx) (uint, error) {
	adminID := middleware.GetUserID(c)
	if adminID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !models.IsAdminRole(middleware.GetUserRole(c)) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	return adminID, nil
}

func getSystemSettingOrEnv(key string) string {
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err == nil && setting.Value != "" {
		return setting.Value
	}
	return os.Getenv(key)
}

func isSensitiveSystemSettingKey(key string) bool {
	normalized := strings.ToUpper(strings.TrimSpace(key))
	if normalized == "API_OPEN_AI" || normalized == "POLZA_API_KEY" || normalized == "OPENROUTER_API_KEY" {
		return true
	}
	if strings.HasPrefix(normalized, "GEMINI_API_KEY") {
		return true
	}
	if normalized == "TELEGRAM_BOT_TOKEN" || normalized == "VK_API_TOKEN" {
		return true
	}
	if normalized == "SUPPORT_TELEGRAM_BOT_TOKEN" || normalized == "SUPPORT_TELEGRAM_WEBHOOK_SECRET" {
		return true
	}
	if normalized == "TELEGRAM_AUTH_BOT_TOKEN" {
		return true
	}
	return false
}

func validateAdminCredentials(email, password string) error {
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return errors.New("email and password are required")
	}
	if _, err := mail.ParseAddress(strings.TrimSpace(email)); err != nil {
		return errors.New("invalid email format")
	}
	if utf8.RuneCountInString(strings.TrimSpace(password)) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

func parseAdminQueryInt(raw string, fallback int, min int, max int) int {
	value := fallback
	trimmed := strings.TrimSpace(raw)
	if trimmed != "" {
		if parsed, err := strconv.Atoi(trimmed); err == nil {
			value = parsed
		}
	}
	if value < min {
		value = min
	}
	if max > 0 && value > max {
		value = max
	}
	return value
}

func parsePositiveAdminParamInt(c *fiber.Ctx, key string, invalidMessage string) (int, error) {
	value, err := c.ParamsInt(key)
	if err != nil || value <= 0 {
		return 0, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": invalidMessage})
	}
	return value, nil
}

func buildPushHealthAlerts(summary services.PushHealthSummary, strict bool) []fiber.Map {
	minEvents := int64(30)
	successRateThreshold := 95.0
	retryRateThreshold := 10.0
	invalidRateThreshold := 15.0
	failedEventsThreshold := int64(10)

	if strict {
		minEvents = 15
		successRateThreshold = 97.0
		retryRateThreshold = 5.0
		invalidRateThreshold = 10.0
		failedEventsThreshold = 3
	}

	alerts := make([]fiber.Map, 0)
	if summary.TotalEvents >= minEvents && summary.DeliverySuccessRate < successRateThreshold {
		alerts = append(alerts, fiber.Map{
			"key":       "push_success_rate_low",
			"severity":  "high",
			"threshold": successRateThreshold,
			"value":     summary.DeliverySuccessRate,
			"message":   "Push delivery success rate is below the target threshold.",
		})
	}
	if summary.TotalEvents >= minEvents && summary.RetryRate > retryRateThreshold {
		alerts = append(alerts, fiber.Map{
			"key":       "push_retry_rate_high",
			"severity":  "medium",
			"threshold": retryRateThreshold,
			"value":     summary.RetryRate,
			"message":   "Push retry rate exceeded baseline threshold.",
		})
	}
	if summary.TotalEvents >= minEvents && summary.InvalidTokenRate > invalidRateThreshold {
		alerts = append(alerts, fiber.Map{
			"key":       "push_invalid_token_rate_high",
			"severity":  "medium",
			"threshold": invalidRateThreshold,
			"value":     summary.InvalidTokenRate,
			"message":   "Invalid token rate exceeded baseline threshold.",
		})
	}
	if summary.FailedEvents >= failedEventsThreshold {
		alerts = append(alerts, fiber.Map{
			"key":       "push_failed_events_high",
			"severity":  "high",
			"threshold": failedEventsThreshold,
			"value":     summary.FailedEvents,
			"message":   "Push failed events exceeded threshold in selected window.",
		})
	}
	return alerts
}

func getPushHealthStatus(alerts []fiber.Map) string {
	status := "healthy"
	for _, alert := range alerts {
		severity := strings.TrimSpace(fmt.Sprintf("%v", alert["severity"]))
		switch severity {
		case "high":
			return "critical"
		case "medium":
			status = "degraded"
		}
	}
	return status
}

func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var users []models.User
	query := database.DB.Model(&models.User{})

	// Search
	search := c.Query("search")
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(karmic_name) LIKE ? OR LOWER(spiritual_name) LIKE ? OR LOWER(email) LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	// Filter by Role
	role := c.Query("role")
	if role != "" {
		query = query.Where("role = ?", role)
	}

	// Filter by Status
	status := c.Query("status")
	switch status {
	case "blocked":
		query = query.Where("is_blocked = ?", true)
	case "active":
		query = query.Where("is_blocked = ?", false)
	}

	if err := query.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch users"})
	}

	// Clear passwords
	for i := range users {
		users[i].Password = ""
	}

	return c.JSON(users)
}

func (h *AdminHandler) ToggleBlockUser(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	userID := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch user"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	if user.ID == adminID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot block yourself"})
	}
	if middleware.GetUserRole(c) != models.RoleSuperadmin && models.IsAdminRole(user.Role) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only superadmin can block admin users"})
	}

	user.IsBlocked = !user.IsBlocked
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update user status"})
	}

	return c.JSON(fiber.Map{
		"message":   "User status updated",
		"isBlocked": user.IsBlocked,
	})
}

func (h *AdminHandler) AddAdmin(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	actorRole := middleware.GetUserRole(c)

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"` // admin or superadmin
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	body.Password = strings.TrimSpace(body.Password)
	body.Role = strings.ToLower(strings.TrimSpace(body.Role))
	if err := validateAdminCredentials(body.Email, body.Password); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if !models.IsAdminRole(body.Role) {
		body.Role = models.RoleAdmin
	}
	if body.Role == models.RoleSuperadmin && actorRole != models.RoleSuperadmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only superadmin can create superadmin"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not hash password"})
	}

	newAdmin := models.User{
		Email:             body.Email,
		Password:          string(hashedPassword),
		Role:              body.Role,
		IsProfileComplete: true,
	}

	if err := database.DB.Create(&newAdmin).Error; err != nil {
		if isDuplicateKeyError(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "admin with this email already exists"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create admin user"})
	}

	newAdmin.Password = ""
	return c.Status(fiber.StatusCreated).JSON(newAdmin)
}

func (h *AdminHandler) UpdateUserRole(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	actorRole := middleware.GetUserRole(c)

	userID := c.Params("id")
	var body struct {
		Role string `json:"role"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	body.Role = strings.ToLower(strings.TrimSpace(body.Role))

	if !models.IsValidUserRole(body.Role) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}
	var target models.User
	if err := database.DB.Select("id", "role").First(&target, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch user"})
	}
	if actorRole != models.RoleSuperadmin && (target.Role == models.RoleSuperadmin || body.Role == models.RoleSuperadmin) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only superadmin can manage superadmin role"})
	}

	updateResult := database.DB.Model(&models.User{}).Where("id = ?", target.ID).Update("role", body.Role)
	if updateResult.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update role"})
	}

	return c.JSON(fiber.Map{"message": "Role updated successfully"})
}

func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var totalUsers int64
	var blockedUsers int64
	var admins int64

	if err := database.DB.Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch user stats"})
	}
	if err := database.DB.Model(&models.User{}).Where("is_blocked = ?", true).Count(&blockedUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch user stats"})
	}
	if err := database.DB.Model(&models.User{}).Where("role IN ?", []string{models.RoleAdmin, models.RoleSuperadmin}).Count(&admins).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch user stats"})
	}

	return c.JSON(fiber.Map{
		"totalUsers":   totalUsers,
		"blockedUsers": blockedUsers,
		"admins":       admins,
		"activeUsers":  totalUsers - blockedUsers,
	})
}

// Dating Management

func (h *AdminHandler) GetDatingProfiles(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var users []models.User
	query := database.DB.Where("dating_enabled = ?", true)

	// Search
	search := c.Query("search")
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(karmic_name) LIKE ? OR LOWER(spiritual_name) LIKE ? OR LOWER(email) LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	if err := query.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch dating profiles"})
	}

	for i := range users {
		users[i].Password = ""
	}

	return c.JSON(users)
}

func (h *AdminHandler) FlagDatingProfile(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	userID := c.Params("id")
	var body struct {
		IsFlagged  bool   `json:"isFlagged"`
		FlagReason string `json:"flagReason"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"is_flagged":  body.IsFlagged,
		"flag_reason": body.FlagReason,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update flag status"})
	}

	return c.JSON(fiber.Map{"message": "Profile flag updated"})
}

// System Settings

func (h *AdminHandler) GetSystemSettings(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var settings []models.SystemSetting
	if err := database.DB.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch settings"})
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		if isSensitiveSystemSettingKey(s.Key) && s.Value != "" {
			settingsMap[s.Key] = strings.Repeat("*", len(s.Value))
			continue
		}
		settingsMap[s.Key] = s.Value
	}

	// Always ensure API_OPEN_AI is present for the UI even if only in env
	if _, ok := settingsMap["API_OPEN_AI"]; !ok {
		settingsMap["API_OPEN_AI"] = strings.Repeat("*", len(os.Getenv("API_OPEN_AI")))
	}

	// Scan all environment variables for GEMINI_ keys to capture backups not yet in DB
	for _, env := range os.Environ() {
		pair := strings.SplitN(env, "=", 2)
		if len(pair) != 2 {
			continue
		}
		key := pair[0]
		val := pair[1]

		if strings.HasPrefix(key, "GEMINI_API_KEY") {
			// Only add if not already in settingsMap (DB takes precedence or we just want to ensure it's shown)
			if _, ok := settingsMap[key]; !ok {
				if val != "" {
					settingsMap[key] = strings.Repeat("*", len(val))
				}
			}
		}
	}

	// Ensure GEMINI_CORPUS_ID is present
	if _, ok := settingsMap["GEMINI_CORPUS_ID"]; !ok {
		settingsMap["GEMINI_CORPUS_ID"] = os.Getenv("GEMINI_CORPUS_ID")
	}

	return c.JSON(settingsMap)
}

func (h *AdminHandler) UpdateSystemSettings(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var updates map[string]string
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	for k, v := range updates {
		var setting models.SystemSetting
		if err := database.DB.Where("key = ?", k).FirstOrCreate(&setting, models.SystemSetting{Key: k}).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upsert setting: " + k})
		}
		setting.Value = v
		if err := database.DB.Save(&setting).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save setting: " + k})
		}

		// Special case: update env for current session if it's API_OPEN_AI
		if k == "API_OPEN_AI" && v != "" {
			os.Setenv("API_OPEN_AI", v)
		}
		// Also update Gemini keys in env
		if strings.HasPrefix(k, "GEMINI_API_KEY") && v != "" {
			os.Setenv(k, v)
		}
		if k == "GEMINI_CORPUS_ID" {
			os.Setenv(k, v)
		}
		if strings.HasPrefix(k, "SUPPORT_TELEGRAM_") ||
			strings.HasPrefix(k, "SUPPORT_AI_") ||
			strings.HasPrefix(k, "SUPPORT_APP_") ||
			strings.HasPrefix(k, "SUPPORT_SLA_") ||
			strings.HasPrefix(k, "TELEGRAM_AUTH_") ||
			k == "SUPPORT_LANG_MODE" ||
			k == "SUPPORT_DOWNLOAD_IOS_URL" ||
			k == "SUPPORT_DOWNLOAD_ANDROID_URL" ||
			k == "SUPPORT_CHANNEL_URL" {
			os.Setenv(k, v)
		}
	}

	return c.JSON(fiber.Map{"message": "Settings updated"})
}

func (h *AdminHandler) SendTestPush(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var body struct {
		Token    string            `json:"token"`
		UserID   *uint             `json:"userId"`
		Title    string            `json:"title"`
		Message  string            `json:"message"`
		Body     string            `json:"body"`
		Data     map[string]string `json:"data"`
		Priority string            `json:"priority"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	pushService := services.GetPushService()
	runtimeStatus := pushService.GetFCMRuntimeStatus()

	title := strings.TrimSpace(body.Title)
	if title == "" {
		title = "Test push"
	}
	messageBody := strings.TrimSpace(body.Body)
	if messageBody == "" {
		messageBody = strings.TrimSpace(body.Message)
	}
	if messageBody == "" {
		messageBody = "Manual test notification from admin panel"
	}
	priority := strings.TrimSpace(body.Priority)
	if priority == "" {
		priority = "high"
	}
	data := body.Data
	if data == nil {
		data = map[string]string{}
	}
	if _, ok := data["type"]; !ok {
		data["type"] = "admin_test_push"
	}
	data["ts"] = time.Now().Format(time.RFC3339)

	pushMessage := services.PushMessage{
		Title:    title,
		Body:     messageBody,
		Data:     data,
		Priority: priority,
	}

	target := "user"
	targetUserID := adminID
	if body.UserID != nil && *body.UserID != 0 {
		targetUserID = *body.UserID
	}

	if token := strings.TrimSpace(body.Token); token != "" {
		target = "token"
		if err := pushService.SendToTokens([]string{token}, pushMessage); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"ok":                      false,
				"error":                   err.Error(),
				"target":                  target,
				"fcmConfigured":           runtimeStatus.HasAvailableFCMSender,
				"fcmKeySource":            runtimeStatus.LegacyKeySource,
				"fcmSenderMode":           runtimeStatus.SenderMode,
				"fcmSenderModeSource":     runtimeStatus.SenderModeSource,
				"fcmActiveSender":         runtimeStatus.ActiveSender,
				"fcmLegacyConfigured":     runtimeStatus.LegacyConfigured,
				"fcmV1Configured":         runtimeStatus.V1Configured,
				"fcmV1CredentialSource":   runtimeStatus.V1CredentialSource,
				"fcmV1CredentialFormat":   runtimeStatus.V1CredentialFormat,
				"fcmV1ProjectIdSource":    runtimeStatus.V1ProjectIDSource,
				"fcmV1ProjectId":          runtimeStatus.V1ProjectID,
				"fcmV1ConfigurationIssue": runtimeStatus.V1ConfigurationIssue,
			})
		}
		return c.JSON(fiber.Map{
			"ok":                      true,
			"target":                  target,
			"fcmConfigured":           runtimeStatus.HasAvailableFCMSender,
			"fcmKeySource":            runtimeStatus.LegacyKeySource,
			"fcmSenderMode":           runtimeStatus.SenderMode,
			"fcmSenderModeSource":     runtimeStatus.SenderModeSource,
			"fcmActiveSender":         runtimeStatus.ActiveSender,
			"fcmLegacyConfigured":     runtimeStatus.LegacyConfigured,
			"fcmV1Configured":         runtimeStatus.V1Configured,
			"fcmV1CredentialSource":   runtimeStatus.V1CredentialSource,
			"fcmV1CredentialFormat":   runtimeStatus.V1CredentialFormat,
			"fcmV1ProjectIdSource":    runtimeStatus.V1ProjectIDSource,
			"fcmV1ProjectId":          runtimeStatus.V1ProjectID,
			"fcmV1ConfigurationIssue": runtimeStatus.V1ConfigurationIssue,
		})
	}

	if err := pushService.SendToUser(targetUserID, pushMessage); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"ok":                      false,
			"error":                   err.Error(),
			"target":                  target,
			"userId":                  targetUserID,
			"fcmConfigured":           runtimeStatus.HasAvailableFCMSender,
			"fcmKeySource":            runtimeStatus.LegacyKeySource,
			"fcmSenderMode":           runtimeStatus.SenderMode,
			"fcmSenderModeSource":     runtimeStatus.SenderModeSource,
			"fcmActiveSender":         runtimeStatus.ActiveSender,
			"fcmLegacyConfigured":     runtimeStatus.LegacyConfigured,
			"fcmV1Configured":         runtimeStatus.V1Configured,
			"fcmV1CredentialSource":   runtimeStatus.V1CredentialSource,
			"fcmV1CredentialFormat":   runtimeStatus.V1CredentialFormat,
			"fcmV1ProjectIdSource":    runtimeStatus.V1ProjectIDSource,
			"fcmV1ProjectId":          runtimeStatus.V1ProjectID,
			"fcmV1ConfigurationIssue": runtimeStatus.V1ConfigurationIssue,
		})
	}

	return c.JSON(fiber.Map{
		"ok":                      true,
		"target":                  target,
		"userId":                  targetUserID,
		"fcmConfigured":           runtimeStatus.HasAvailableFCMSender,
		"fcmKeySource":            runtimeStatus.LegacyKeySource,
		"fcmSenderMode":           runtimeStatus.SenderMode,
		"fcmSenderModeSource":     runtimeStatus.SenderModeSource,
		"fcmActiveSender":         runtimeStatus.ActiveSender,
		"fcmLegacyConfigured":     runtimeStatus.LegacyConfigured,
		"fcmV1Configured":         runtimeStatus.V1Configured,
		"fcmV1CredentialSource":   runtimeStatus.V1CredentialSource,
		"fcmV1CredentialFormat":   runtimeStatus.V1CredentialFormat,
		"fcmV1ProjectIdSource":    runtimeStatus.V1ProjectIDSource,
		"fcmV1ProjectId":          runtimeStatus.V1ProjectID,
		"fcmV1ConfigurationIssue": runtimeStatus.V1ConfigurationIssue,
	})
}

func (h *AdminHandler) GetPushHealth(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	windowHours := parseAdminQueryInt(c.Query("window_hours"), 24, 1, 24*30)
	eventPrefix := strings.TrimSpace(c.Query("event_prefix"))
	scope := strings.TrimSpace(strings.ToLower(c.Query("scope")))
	if eventPrefix == "" && scope == "yatra" {
		eventPrefix = "yatra_"
	}
	strict := scope == "yatra" || strings.HasPrefix(eventPrefix, "yatra_")

	pushService := services.GetPushService()
	summary, err := pushService.GetHealthSummaryByEventPrefix(time.Duration(windowHours)*time.Hour, eventPrefix)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to calculate push health"})
	}
	alerts := buildPushHealthAlerts(summary, strict)
	status := getPushHealthStatus(alerts)

	runtimeStatus := pushService.GetFCMRuntimeStatus()
	return c.JSON(fiber.Map{
		"scope":                   scope,
		"event_prefix":            eventPrefix,
		"status":                  status,
		"alerts":                  alerts,
		"windowHours":             summary.WindowHours,
		"delivery_success_rate":   summary.DeliverySuccessRate,
		"invalid_token_rate":      summary.InvalidTokenRate,
		"retry_rate":              summary.RetryRate,
		"latency_p95":             summary.LatencyP95,
		"total_events":            summary.TotalEvents,
		"success_events":          summary.SuccessEvents,
		"invalid_events":          summary.InvalidEvents,
		"retry_events":            summary.RetryEvents,
		"failed_events":           summary.FailedEvents,
		"fcmConfigured":           runtimeStatus.HasAvailableFCMSender,
		"fcmKeySource":            runtimeStatus.LegacyKeySource,
		"fcmSenderMode":           runtimeStatus.SenderMode,
		"fcmSenderModeSource":     runtimeStatus.SenderModeSource,
		"fcmActiveSender":         runtimeStatus.ActiveSender,
		"fcmLegacyConfigured":     runtimeStatus.LegacyConfigured,
		"fcmLegacyKeySource":      runtimeStatus.LegacyKeySource,
		"fcmV1Configured":         runtimeStatus.V1Configured,
		"fcmV1CredentialSource":   runtimeStatus.V1CredentialSource,
		"fcmV1CredentialFormat":   runtimeStatus.V1CredentialFormat,
		"fcmV1ProjectIdSource":    runtimeStatus.V1ProjectIDSource,
		"fcmV1ProjectId":          runtimeStatus.V1ProjectID,
		"fcmV1TokenUri":           runtimeStatus.V1TokenURI,
		"fcmV1ConfigurationIssue": runtimeStatus.V1ConfigurationIssue,
	})
}

func (h *AdminHandler) GetYatraPushHealth(c *fiber.Ctx) error {
	c.Request().URI().SetQueryString("scope=yatra&event_prefix=yatra_&" + string(c.Request().URI().QueryString()))
	return h.GetPushHealth(c)
}

func (h *AdminHandler) GetPlatformHealth(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	keys := []string{
		services.MetricAuthRefreshSuccess,
		services.MetricAuthRefreshFail,
		services.MetricHTTP4xxTotal,
		services.MetricHTTP5xxTotal,
		services.MetricRateLimitedTotal,
		services.MetricPushSendFail,
	}

	snapshot, err := services.GetMetricsService().Snapshot(keys)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to load platform metrics",
		})
	}

	authRefreshSuccess := snapshot[services.MetricAuthRefreshSuccess]
	authRefreshFail := snapshot[services.MetricAuthRefreshFail]
	authRefreshTotal := authRefreshSuccess + authRefreshFail

	authRefreshFailRate := 0.0
	if authRefreshTotal > 0 {
		authRefreshFailRate = float64(authRefreshFail) / float64(authRefreshTotal)
	}

	alerts := make([]fiber.Map, 0)
	if authRefreshTotal >= 20 && authRefreshFailRate > 0.20 {
		alerts = append(alerts, fiber.Map{
			"key":       "auth_refresh_fail_rate_high",
			"severity":  "high",
			"threshold": 0.20,
			"value":     authRefreshFailRate,
			"message":   "Auth refresh failures are above 20%.",
		})
	}
	if snapshot[services.MetricHTTP5xxTotal] >= 25 {
		alerts = append(alerts, fiber.Map{
			"key":       "http_5xx_total_high",
			"severity":  "high",
			"threshold": 25,
			"value":     snapshot[services.MetricHTTP5xxTotal],
			"message":   "Server-side 5xx errors exceeded baseline threshold.",
		})
	}
	if snapshot[services.MetricRateLimitedTotal] >= 150 {
		alerts = append(alerts, fiber.Map{
			"key":       "rate_limited_spike",
			"severity":  "medium",
			"threshold": 150,
			"value":     snapshot[services.MetricRateLimitedTotal],
			"message":   "Rate-limited requests exceeded baseline threshold.",
		})
	}
	if snapshot[services.MetricPushSendFail] >= 20 {
		alerts = append(alerts, fiber.Map{
			"key":       "push_send_failures_high",
			"severity":  "medium",
			"threshold": 20,
			"value":     snapshot[services.MetricPushSendFail],
			"message":   "Push delivery failures exceeded baseline threshold.",
		})
	}

	status := "ok"
	if len(alerts) > 0 {
		status = "degraded"
	}

	return c.JSON(fiber.Map{
		"status": status,
		"metrics": fiber.Map{
			"auth_refresh_success":   authRefreshSuccess,
			"auth_refresh_fail":      authRefreshFail,
			"auth_refresh_fail_rate": authRefreshFailRate,
			"http_4xx_total":         snapshot[services.MetricHTTP4xxTotal],
			"http_5xx_total":         snapshot[services.MetricHTTP5xxTotal],
			"http_429_total":         snapshot[services.MetricRateLimitedTotal],
			"push_send_fail":         snapshot[services.MetricPushSendFail],
		},
		"alerts": alerts,
	})
}

func (h *AdminHandler) GetEducationTutorMetrics(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	windowHours := parseAdminQueryInt(c.Query("window_hours"), 24, 1, 24*30)
	summary, err := services.GetEducationTutorService().GetLatencySummary(time.Duration(windowHours) * time.Hour)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to calculate tutor metrics"})
	}

	return c.JSON(summary)
}

// RAG Management Methods

func (h *AdminHandler) ListGeminiCorpora(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	keyName := c.Query("key_name")
	if keyName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "key_name is required"})
	}

	// 1. Get API Key
	apiKey := getSystemSettingOrEnv(keyName)

	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("API Key '%s' not found", keyName)})
	}

	// 2. Call Google API (via Proxy if set)
	baseURL := os.Getenv("GEMINI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}

	client := &http.Client{Timeout: 30 * time.Second}
	url := fmt.Sprintf("%s/v1beta/corpora?key=%s", baseURL, apiKey)

	resp, err := client.Get(url)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to connect to Gemini API: " + err.Error()})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error":   "Gemini API Error",
			"status":  resp.StatusCode,
			"details": string(body),
		})
	}

	// 3. Return Raw JSON
	var data interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse JSON response"})
	}

	return c.JSON(data)
}

func (h *AdminHandler) CreateGeminiCorpus(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var body struct {
		KeyName     string `json:"keyName"`
		DisplayName string `json:"displayName"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if body.KeyName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "keyName is required"})
	}

	// 1. Get API Key
	apiKey := getSystemSettingOrEnv(body.KeyName)
	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "API Key not found"})
	}

	// 2. Create Corpus
	baseURL := os.Getenv("GEMINI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}

	client := &http.Client{Timeout: 30 * time.Second}
	url := fmt.Sprintf("%s/v1beta/corpora?key=%s", baseURL, apiKey)

	payload := map[string]string{
		"displayName": body.DisplayName,
	}
	if payload["displayName"] == "" {
		payload["displayName"] = "New Corpus " + time.Now().Format("2006-01-02 15:04")
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to serialize request payload"})
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build Gemini request"})
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to connect to Gemini API"})
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error":   "Failed to create corpus",
			"details": string(respBody),
		})
	}

	var data interface{}
	if err := json.Unmarshal(respBody, &data); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse Gemini response"})
	}

	return c.JSON(data)
}

// GeocodeAllUsers geocodes all users who have a city but no coordinates
// POST /api/admin/geocode-users
func (h *AdminHandler) GeocodeAllUsers(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	mapService := services.NewMapService(database.DB)

	// Find all users with city but without coordinates
	var users []models.User
	if err := database.DB.Where("city IS NOT NULL AND city != '' AND (latitude IS NULL OR longitude IS NULL)").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch users"})
	}

	if len(users) == 0 {
		return c.JSON(fiber.Map{
			"message":  "No users need geocoding",
			"geocoded": 0,
			"failed":   0,
		})
	}

	geocoded := 0
	failed := 0
	results := make([]fiber.Map, 0)

	for _, user := range users {
		result, err := mapService.GeocodeCity(user.City)
		if err != nil {
			failed++
			results = append(results, fiber.Map{
				"userId": user.ID,
				"email":  user.Email,
				"city":   user.City,
				"status": "failed",
				"error":  err.Error(),
			})
			continue
		}

		// Update user with coordinates
		user.City = result.City
		if user.Country == "" {
			user.Country = result.Country
		}
		user.Latitude = &result.Latitude
		user.Longitude = &result.Longitude

		if err := database.DB.Save(&user).Error; err != nil {
			failed++
			results = append(results, fiber.Map{
				"userId": user.ID,
				"email":  user.Email,
				"city":   user.City,
				"status": "db_error",
				"error":  err.Error(),
			})
			continue
		}

		geocoded++
		results = append(results, fiber.Map{
			"userId":    user.ID,
			"email":     user.Email,
			"city":      result.City,
			"country":   result.Country,
			"latitude":  result.Latitude,
			"longitude": result.Longitude,
			"status":    "success",
		})

		// Small delay to avoid rate limiting
		time.Sleep(200 * time.Millisecond)
	}

	return c.JSON(fiber.Map{
		"message":  "Geocoding complete",
		"total":    len(users),
		"geocoded": geocoded,
		"failed":   failed,
		"results":  results,
	})
}

// ==================== WALLET ADMIN (God Mode) ====================

// AdminChargeWallet adds LKM to user's wallet
// POST /api/admin/wallet/charge
func (h *AdminHandler) AdminChargeWallet(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var body struct {
		UserID uint   `json:"userId"`
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if body.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Amount must be positive"})
	}
	if body.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Reason is required"})
	}

	walletService := services.NewWalletService()
	if err := walletService.AdminCharge(adminID, body.UserID, body.Amount, body.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Return updated balance
	wallet, _ := walletService.GetBalance(body.UserID)
	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Successfully credited %d LKM to user %d", body.Amount, body.UserID),
		"wallet":  wallet,
	})
}

// AdminSeizeWallet removes LKM from user's wallet
// POST /api/admin/wallet/seize
func (h *AdminHandler) AdminSeizeWallet(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var body struct {
		UserID uint   `json:"userId"`
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if body.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Amount must be positive"})
	}
	if body.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Reason is required"})
	}

	walletService := services.NewWalletService()
	if err := walletService.AdminSeize(adminID, body.UserID, body.Amount, body.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Return updated balance
	wallet, _ := walletService.GetBalance(body.UserID)
	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Successfully seized %d LKM from user %d", body.Amount, body.UserID),
		"wallet":  wallet,
	})
}

// GetUserWallet returns wallet info for a specific user
// GET /api/admin/wallet/:userId
func (h *AdminHandler) GetUserWallet(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	userID, err := parsePositiveAdminParamInt(c, "userId", "Invalid user ID")
	if err != nil {
		return err
	}

	walletService := services.NewWalletService()
	wallet, err := walletService.GetBalance(uint(userID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch wallet"})
	}

	return c.JSON(wallet)
}

// GetUserTransactions returns transaction history for a specific user
// GET /api/admin/wallet/:userId/transactions
func (h *AdminHandler) GetUserTransactions(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	userID, err := parsePositiveAdminParamInt(c, "userId", "Invalid user ID")
	if err != nil {
		return err
	}

	filters := models.TransactionFilters{
		Type:     models.TransactionType(c.Query("type")),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
		Page:     parseAdminQueryInt(c.Query("page", "1"), 1, 1, 100000),
		Limit:    parseAdminQueryInt(c.Query("limit", "50"), 50, 1, 500),
	}

	walletService := services.NewWalletService()
	result, err := walletService.GetTransactions(uint(userID), filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

// ActivateUserPendingBalance activates pending balance for a user
// POST /api/admin/wallet/:userId/activate
func (h *AdminHandler) ActivateUserPendingBalance(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	userIDParam, err := parsePositiveAdminParamInt(c, "userId", "Invalid user ID")
	if err != nil {
		return err
	}
	userID := uint(userIDParam)

	walletService := services.NewWalletService()
	if err := walletService.ActivatePendingBalance(userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Return updated balance
	wallet, _ := walletService.GetBalance(userID)
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Pending balance activated",
		"wallet":  wallet,
	})
}

// GetReferralGlobalStats returns global referral statistics
// GET /api/admin/referrals/stats
func (h *AdminHandler) GetReferralGlobalStats(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	// Panic recovery for this specific handler to prevent server crash and generic 500s
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[AdminStats] PANIC in GetReferralGlobalStats: %v", r)
		}
	}()

	var totalReferrals int64
	var activeReferrals int64
	var pendingReferrals int64

	// Count total referrals with detailed error logging
	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL").Count(&totalReferrals).Error; err != nil {
		log.Printf("[AdminStats] SQL ERROR (Total): %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Database error counting referrals",
			"details": err.Error(),
		})
	}

	// Count active referrals
	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL AND referral_status = ?", models.ReferralStatusActivated).Count(&activeReferrals).Error; err != nil {
		log.Printf("[AdminStats] SQL Warning (Active): %v", err)
	}

	// Count pending referrals
	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL AND referral_status = ?", models.ReferralStatusPending).Count(&pendingReferrals).Error; err != nil {
		log.Printf("[AdminStats] SQL Warning (Pending): %v", err)
	}

	// Calculate total earned by referrers
	var totalEarnedByReferrers int64
	if err := database.DB.Debug().Model(&models.WalletTransaction{}).
		Where("description LIKE ?", "%Реферальный бонус%").
		Select("COALESCE(SUM(amount), 0)").Scan(&totalEarnedByReferrers).Error; err != nil {
		log.Printf("[AdminStats] SQL Warning (Earnings): %v", err)
	}

	// Calculate activation rate safely
	var activationRate float64 = 0
	if totalReferrals > 0 {
		activationRate = float64(activeReferrals) / float64(totalReferrals) * 100
	}

	log.Printf("[AdminStats] Successfully calculated: Total=%d, Active=%d, Rate=%.2f%%", totalReferrals, activeReferrals, activationRate)

	return c.JSON(fiber.Map{
		"totalReferrals":         totalReferrals,
		"activeReferrals":        activeReferrals,
		"pendingReferrals":       pendingReferrals,
		"totalEarnedByReferrers": totalEarnedByReferrers,
		"activationRate":         activationRate,
	})
}

// GetReferralLeaderboard returns top referrers
// GET /api/admin/referrals/leaderboard
func (h *AdminHandler) GetReferralLeaderboard(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	type LeaderboardEntry struct {
		ID            uint   `json:"id"`
		SpiritualName string `json:"spiritualName"`
		KarmicName    string `json:"karmicName"`
		Email         string `json:"email"`
		AvatarURL     string `json:"avatarUrl"`
		TotalInvited  int    `json:"totalInvited"`
		ActiveInvited int    `json:"activeInvited"`
		TotalEarned   int    `json:"totalEarned"`
	}

	// Initialize as empty slice to ensure JSON array [] is returned instead of null
	leaderboard := make([]LeaderboardEntry, 0)
	err := database.DB.Table("users").
		Select("users.id, users.spiritual_name, users.karmic_name, users.email, users.avatar_url, "+
			"COUNT(referrals.id) as total_invited, "+
			"SUM(CASE WHEN referrals.referral_status = ? THEN 1 ELSE 0 END) as active_invited, "+
			"SUM(CASE WHEN referrals.referral_status = ? THEN 100 ELSE 0 END) as total_earned", models.ReferralStatusActivated, models.ReferralStatusActivated).
		Joins("JOIN users as referrals ON referrals.referrer_id = users.id").
		Group("users.id").
		Order("total_earned DESC").
		Limit(10).
		Scan(&leaderboard).Error

	if err != nil {
		log.Printf("[Admin] Error fetching leaderboard: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(leaderboard)
}

// GetGlobalWalletStats returns overall wallet system statistics
// GET /api/admin/wallet/global-stats
func (h *AdminHandler) GetGlobalWalletStats(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var totalBalance int64
	var totalBonus int64
	var totalPending int64
	var totalFrozen int64
	var totalFrozenBonus int64

	if err := database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(balance), 0)").Scan(&totalBalance).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}
	if err := database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(bonus_balance), 0)").Scan(&totalBonus).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}
	if err := database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(pending_balance), 0)").Scan(&totalPending).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}
	if err := database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(frozen_balance), 0)").Scan(&totalFrozen).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}
	if err := database.DB.Model(&models.Wallet{}).Select("COALESCE(SUM(frozen_bonus_balance), 0)").Scan(&totalFrozenBonus).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}

	var totalIssued int64
	if err := database.DB.Model(&models.WalletTransaction{}).
		Where("type IN ?", []models.TransactionType{models.TransactionTypeCredit, models.TransactionTypeBonus}).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalIssued).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}

	var totalSpent int64
	if err := database.DB.Model(&models.WalletTransaction{}).
		Where("type = ?", models.TransactionTypeDebit).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalSpent).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch wallet stats"})
	}

	return c.JSON(fiber.Map{
		"totalActiveLKM":      totalBalance + totalBonus,
		"totalBonusLKM":       totalBonus,
		"totalPendingLKM":     totalPending,
		"totalFrozenLKM":      totalFrozen + totalFrozenBonus,
		"totalFrozenBonusLKM": totalFrozenBonus,
		"totalIssuedLKM":      totalIssued,
		"totalSpentLKM":       totalSpent,
		"circulationLKM":      totalBalance + totalBonus + totalFrozen + totalFrozenBonus,
	})
}
