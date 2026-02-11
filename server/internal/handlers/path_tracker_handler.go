package handlers

import (
	"errors"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type PathTrackerHandler struct {
	service pathTrackerService
}

type pathTrackerService interface {
	IsEnabled() bool
	MaybeEmitMonitoringAlerts()
	GetToday(userID uint) (*services.TodayView, error)
	GetWeeklySummary(userID uint) (*services.WeeklySummaryView, error)
	GetMetricsSummary() (*services.PathTrackerMetricsSummary, error)
	GetAnalytics(days int) (*services.PathTrackerAnalytics, error)
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

func (h *PathTrackerHandler) GetToday(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	data, err := h.service.GetToday(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(data)
}

func (h *PathTrackerHandler) GetWeeklySummary(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
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

func (h *PathTrackerHandler) SaveCheckin(c *fiber.Ctx) error {
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
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
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
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
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		StepID uint `json:"stepId"`
	}
	_ = c.BodyParser(&body)

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
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
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
	if err := h.ensureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
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
