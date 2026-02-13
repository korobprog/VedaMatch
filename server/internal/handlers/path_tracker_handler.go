package handlers

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type PathTrackerHandler struct {
	service pathTrackerService
}

type pathTrackerService interface {
	IsEnabled() bool
	IsEnabledForUser(userID uint) bool
	MaybeEmitMonitoringAlerts()
	GetToday(userID uint) (*services.TodayView, error)
	GetWeeklySummary(userID uint) (*services.WeeklySummaryView, error)
	GetMetricsSummary() (*services.PathTrackerMetricsSummary, error)
	GetAnalytics(days int) (*services.PathTrackerAnalytics, error)
	GetOpsSnapshot() (*services.PathTrackerOpsSnapshot, error)
	GetAlertEvents(page int, pageSize int, deliveryStatus string, alertType string, sortBy string, sortDir string) ([]services.PathTrackerAlertEventView, int64, error)
	RetryAlertEvent(alertID uint) (*services.PathTrackerAlertEventView, error)
	RetryFailedAlerts(minutes int, limit int) (*services.PathTrackerAlertRetrySummary, error)
	GetUnlockStatus(userID uint, role string) (*services.PathTrackerUnlockStatus, error)
	MarkUnlockOpened(userID uint, serviceID string) error
	SaveCheckin(userID uint, input services.CheckinInput) (*models.DailyCheckin, error)
	GenerateStep(userID uint) (*services.DailyStepView, error)
	CompleteStep(userID uint, stepID uint) (*services.DailyStepView, error)
	ReflectStep(userID, stepID uint, resultMood, reflectionText string) (string, error)
	AssistantHelp(userID, stepID uint, requestType, message string) (*services.AssistantResult, error)
}

func NewPathTrackerHandler() *PathTrackerHandler {
	return NewPathTrackerHandlerWithService(services.NewPathTrackerService(database.DB))
}

func NewPathTrackerHandlerWithService(service pathTrackerService) *PathTrackerHandler {
	return &PathTrackerHandler{
		service: service,
	}
}

func (h *PathTrackerHandler) ensureEnabled(c *fiber.Ctx) error {
	if !h.service.IsEnabled() {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Path tracker is disabled",
			"code":  "PATH_TRACKER_DISABLED",
		})
	}
	return nil
}

func (h *PathTrackerHandler) requireEnabledUser(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !h.service.IsEnabledForUser(userID) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Path tracker is disabled for this user cohort",
			"code":  "PATH_TRACKER_NOT_IN_ROLLOUT",
		})
	}
	return userID, nil
}

func (h *PathTrackerHandler) GetToday(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	data, err := h.service.GetToday(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) GetWeeklySummary(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	data, err := h.service.GetWeeklySummary(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) GetMetricsSummary(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	data, err := h.service.GetMetricsSummary()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) GetAnalytics(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	days := 14
	if raw := strings.TrimSpace(c.Query("days")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			days = v
		}
	}
	data, err := h.service.GetAnalytics(days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) GetOpsSnapshot(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	data, err := h.service.GetOpsSnapshot()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) GetAlertEvents(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	page := 1
	if raw := strings.TrimSpace(c.Query("page")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			page = v
		}
	}
	pageSize := 20
	if raw := strings.TrimSpace(c.Query("pageSize")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			pageSize = v
		}
	}
	status := strings.TrimSpace(c.Query("status"))
	alertType := strings.TrimSpace(c.Query("type"))
	sortBy := strings.TrimSpace(c.Query("sortBy"))
	sortDir := strings.TrimSpace(c.Query("sortDir"))
	data, total, err := h.service.GetAlertEvents(page, pageSize, status, alertType, sortBy, sortDir)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"events":   data,
		"page":     page,
		"pageSize": pageSize,
		"total":    total,
		"status":   status,
		"type":     alertType,
		"sortBy":   sortBy,
		"sortDir":  sortDir,
	})
}

func (h *PathTrackerHandler) ExportAlertEventsCSV(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	page := 1
	if raw := strings.TrimSpace(c.Query("page")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			page = v
		}
	}
	pageSize := 20
	if raw := strings.TrimSpace(c.Query("pageSize")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			pageSize = v
		}
	}
	status := strings.TrimSpace(c.Query("status"))
	alertType := strings.TrimSpace(c.Query("type"))
	sortBy := strings.TrimSpace(c.Query("sortBy"))
	sortDir := strings.TrimSpace(c.Query("sortDir"))

	events, total, err := h.service.GetAlertEvents(page, pageSize, status, alertType, sortBy, sortDir)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	_ = writer.Write([]string{
		"id", "created_at", "alert_type", "severity", "current_value", "threshold",
		"window_minutes", "delivery_status", "delivery_code", "error_text",
		"page", "page_size", "total",
	})
	for _, e := range events {
		_ = writer.Write([]string{
			strconv.FormatUint(uint64(e.ID), 10),
			e.CreatedAt,
			e.AlertType,
			e.Severity,
			e.CurrentValue,
			e.Threshold,
			strconv.Itoa(e.WindowMinutes),
			e.DeliveryStatus,
			strconv.Itoa(e.DeliveryCode),
			e.ErrorText,
			strconv.Itoa(page),
			strconv.Itoa(pageSize),
			strconv.FormatInt(total, 10),
		})
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	fileName := fmt.Sprintf("path_tracker_alerts_%s_p%d.csv", time.Now().UTC().Format("20060102_150405"), page)
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	return c.Send(buf.Bytes())
}

func (h *PathTrackerHandler) RetryAlertEvent(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	id, err := strconv.Atoi(strings.TrimSpace(c.Params("id")))
	if err != nil || id <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid alert id"})
	}
	data, err := h.service.RetryAlertEvent(uint(id))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"event": data})
}

func (h *PathTrackerHandler) RetryFailedAlerts(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	minutes := 60
	if raw := strings.TrimSpace(c.Query("minutes")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			minutes = v
		}
	}
	limit := 50
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			limit = v
		}
	}
	summary, err := h.service.RetryFailedAlerts(minutes, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"summary": summary})
}

func (h *PathTrackerHandler) GetUnlockStatus(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	role := strings.TrimSpace(c.Query("role"))
	data, err := h.service.GetUnlockStatus(userID, role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) MarkUnlockOpened(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	var body struct {
		ServiceID string `json:"serviceId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if strings.TrimSpace(body.ServiceID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "serviceId is required"})
	}
	if err := h.service.MarkUnlockOpened(userID, body.ServiceID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *PathTrackerHandler) SaveCheckin(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}

	var body struct {
		MoodCode         string `json:"moodCode"`
		EnergyCode       string `json:"energyCode"`
		AvailableMinutes int    `json:"availableMinutes"`
		FreeText         string `json:"freeText"`
		Timezone         string `json:"timezone"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.AvailableMinutes != 3 && body.AvailableMinutes != 5 && body.AvailableMinutes != 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "availableMinutes must be 3, 5, or 10",
		})
	}
	if strings.TrimSpace(body.MoodCode) == "" || strings.TrimSpace(body.EnergyCode) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "moodCode and energyCode are required",
		})
	}

	checkin, err := h.service.SaveCheckin(userID, services.CheckinInput{
		MoodCode:         body.MoodCode,
		EnergyCode:       body.EnergyCode,
		AvailableMinutes: body.AvailableMinutes,
		FreeText:         body.FreeText,
		Timezone:         body.Timezone,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"checkin": checkin})
}

func (h *PathTrackerHandler) GenerateStep(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}

	step, err := h.service.GenerateStep(userID)
	if err != nil {
		if errors.Is(err, services.ErrCheckinRequired) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error(), "code": "CHECKIN_REQUIRED"})
		}
		services.RecordPathTrackerGenerateResult(false)
		go h.service.MaybeEmitMonitoringAlerts()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	services.RecordPathTrackerGenerateResult(true)
	go h.service.MaybeEmitMonitoringAlerts()
	return c.JSON(fiber.Map{"step": step})
}

func (h *PathTrackerHandler) CompleteStep(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}

	var body struct {
		StepID uint `json:"stepId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.StepID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "stepId is required"})
	}

	step, err := h.service.CompleteStep(userID, body.StepID)
	if err != nil {
		if errors.Is(err, services.ErrStepNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error(), "code": "STEP_NOT_FOUND"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"step": step})
}

func (h *PathTrackerHandler) ReflectStep(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}

	var body struct {
		StepID         uint   `json:"stepId"`
		ResultMood     string `json:"resultMood"`
		ReflectionText string `json:"reflectionText"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.StepID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "stepId is required"})
	}

	reply, err := h.service.ReflectStep(userID, body.StepID, body.ResultMood, body.ReflectionText)
	if err != nil {
		if errors.Is(err, services.ErrStepNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error(), "code": "STEP_NOT_FOUND"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"reply": reply})
}

func (h *PathTrackerHandler) AssistantHelp(c *fiber.Ctx) error {
	userID, errResp := h.requireEnabledUser(c)
	if errResp != nil {
		return errResp
	}
	if err := h.ensureEnabled(c); err != nil {
		return err
	}

	var body struct {
		StepID      uint   `json:"stepId"`
		RequestType string `json:"requestType"`
		Message     string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.StepID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "stepId is required"})
	}

	reply, err := h.service.AssistantHelp(userID, body.StepID, body.RequestType, body.Message)
	if err != nil {
		if errors.Is(err, services.ErrStepNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error(), "code": "STEP_NOT_FOUND"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(reply)
}
