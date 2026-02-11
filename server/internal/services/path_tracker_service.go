package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"log"
	"net/http"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

var (
	ErrCheckinRequired = errors.New("daily checkin is required before generating a step")
	ErrStepNotFound    = errors.New("daily step not found")
)

type PathTrackerService struct {
	db    *gorm.DB
	polza *PolzaService
}

type CheckinInput struct {
	MoodCode         string
	EnergyCode       string
	AvailableMinutes int
	FreeText         string
	Timezone         string
}

type PathStepAction struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type StepContent struct {
	Title                 string           `json:"title"`
	Motivation            string           `json:"motivation,omitempty"`
	Instructions          []string         `json:"instructions"`
	FallbackText          string           `json:"fallbackText"`
	Actions               []PathStepAction `json:"actions"`
	Tone                  string           `json:"tone"`
	SuggestedServiceID    string           `json:"suggestedServiceId,omitempty"`
	SuggestedServiceTitle string           `json:"suggestedServiceTitle,omitempty"`
}

type DailyStepView struct {
	StepID                uint             `json:"stepId"`
	Date                  string           `json:"date"`
	Role                  string           `json:"role"`
	TrajectoryPhase       string           `json:"trajectoryPhase"`
	ExperienceSegment     string           `json:"experienceSegment"`
	DurationMin           int              `json:"durationMin"`
	Format                string           `json:"format"`
	Title                 string           `json:"title"`
	Instructions          []string         `json:"instructions"`
	FallbackText          string           `json:"fallbackText"`
	Actions               []PathStepAction `json:"actions"`
	Tone                  string           `json:"tone"`
	Status                string           `json:"status"`
	GenerationSource      string           `json:"generationSource"`
	SuggestedServiceID    string           `json:"suggestedServiceId,omitempty"`
	SuggestedServiceTitle string           `json:"suggestedServiceTitle,omitempty"`
}

type TodayView struct {
	Date          string               `json:"date"`
	Role          string               `json:"role"`
	HasCheckin    bool                 `json:"hasCheckin"`
	HasReflection bool                 `json:"hasReflection"`
	Checkin       *models.DailyCheckin `json:"checkin,omitempty"`
	Step          *DailyStepView       `json:"step,omitempty"`
	State         map[string]any       `json:"state"`
}

type WeeklyDaySummary struct {
	Date          string `json:"date"`
	HasCheckin    bool   `json:"hasCheckin"`
	StepStatus    string `json:"stepStatus"`
	Completed     bool   `json:"completed"`
	HasReflection bool   `json:"hasReflection"`
}

type WeeklySummaryView struct {
	FromDate         string             `json:"fromDate"`
	ToDate           string             `json:"toDate"`
	CompletedDays    int                `json:"completedDays"`
	AssignedDays     int                `json:"assignedDays"`
	CheckinDays      int                `json:"checkinDays"`
	CompletionRate   float64            `json:"completionRate"`
	StreakCurrent    int                `json:"streakCurrent"`
	StreakBest       int                `json:"streakBest"`
	GentleSummary    string             `json:"gentleSummary"`
	ExperimentBucket string             `json:"experimentBucket"`
	Days             []WeeklyDaySummary `json:"days"`
}

type PathTrackerMetricsSummary struct {
	UsersWithSteps      int64   `json:"usersWithSteps"`
	TotalSteps          int64   `json:"totalSteps"`
	CompletedSteps      int64   `json:"completedSteps"`
	CompletionRate      float64 `json:"completionRate"`
	D1RetentionEligible int64   `json:"d1RetentionEligible"`
	D1RetainedUsers     int64   `json:"d1RetainedUsers"`
	D1RetentionRate     float64 `json:"d1RetentionRate"`
	D7RetentionEligible int64   `json:"d7RetentionEligible"`
	D7RetainedUsers     int64   `json:"d7RetainedUsers"`
	D7RetentionRate     float64 `json:"d7RetentionRate"`
}

type PathTrackerTrendPoint struct {
	Date           string  `json:"date"`
	AssignedSteps  int64   `json:"assignedSteps"`
	CompletedSteps int64   `json:"completedSteps"`
	CompletionRate float64 `json:"completionRate"`
}

type PathTrackerBucketComparison struct {
	Bucket         string  `json:"bucket"`
	UsersWithSteps int64   `json:"usersWithSteps"`
	TotalSteps     int64   `json:"totalSteps"`
	CompletedSteps int64   `json:"completedSteps"`
	CompletionRate float64 `json:"completionRate"`
}

type PathTrackerSegmentComparison struct {
	Segment        string  `json:"segment"`
	UsersWithSteps int64   `json:"usersWithSteps"`
	TotalSteps     int64   `json:"totalSteps"`
	CompletedSteps int64   `json:"completedSteps"`
	CompletionRate float64 `json:"completionRate"`
}

type PathTrackerAnalytics struct {
	Days              int                            `json:"days"`
	FromDate          string                         `json:"fromDate"`
	ToDate            string                         `json:"toDate"`
	Trend             []PathTrackerTrendPoint        `json:"trend"`
	BucketComparison  []PathTrackerBucketComparison  `json:"bucketComparison"`
	SegmentComparison []PathTrackerSegmentComparison `json:"segmentComparison"`
	Alerts            PathTrackerAlertSignals        `json:"alerts"`
}

type PathTrackerAlertSignals struct {
	FallbackRate1h         float64 `json:"fallbackRate1h"`
	FallbackSamples1h      int64   `json:"fallbackSamples1h"`
	FallbackThreshold      float64 `json:"fallbackThreshold"`
	FallbackTriggered      bool    `json:"fallbackTriggered"`
	GenerateErrorRate15m   float64 `json:"generateErrorRate15m"`
	GenerateAttempts15m    int64   `json:"generateAttempts15m"`
	GenerateErrors15m      int64   `json:"generateErrors15m"`
	GenerateThreshold      float64 `json:"generateThreshold"`
	GenerateErrorTriggered bool    `json:"generateErrorTriggered"`
}

type AssistantResult struct {
	Reply string `json:"reply"`
}

type stepCandidate struct {
	Format       string
	Difficulty   string
	Title        string
	Instructions []string
	Tone         string
	Actions      []PathStepAction
}

type trajectoryProfile struct {
	Phase            string
	Segment          string
	Assigned30d      int64
	Completed30d     int64
	CompletionRate30 float64
}

type pathTrackerGenerateRuntimeStats struct {
	mu       sync.Mutex
	attempts []time.Time
	errors   []time.Time
}

var generateRuntimeStats = &pathTrackerGenerateRuntimeStats{}
var pathTrackerAlertNotifier = &pathTrackerAlertState{
	lastSentAt: make(map[string]time.Time),
}

func RecordPathTrackerGenerateResult(success bool) {
	generateRuntimeStats.Record(success)
}

type pathTrackerAlertState struct {
	mu         sync.Mutex
	lastSentAt map[string]time.Time
}

func (s *pathTrackerAlertState) shouldSend(alertKey string, cooldown time.Duration) bool {
	now := time.Now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()

	last := s.lastSentAt[alertKey]
	if !last.IsZero() && now.Sub(last) < cooldown {
		return false
	}
	s.lastSentAt[alertKey] = now
	return true
}

func (r *pathTrackerGenerateRuntimeStats) Record(success bool) {
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()

	r.attempts = append(r.attempts, now)
	if !success {
		r.errors = append(r.errors, now)
	}
	r.prune(now)
}

func (r *pathTrackerGenerateRuntimeStats) Stats(window time.Duration) (attempts int64, failures int64, rate float64) {
	now := time.Now().UTC()
	cutoff := now.Add(-window)
	r.mu.Lock()
	defer r.mu.Unlock()

	r.prune(now)
	for _, ts := range r.attempts {
		if !ts.Before(cutoff) {
			attempts++
		}
	}
	for _, ts := range r.errors {
		if !ts.Before(cutoff) {
			failures++
		}
	}
	if attempts > 0 {
		rate = (float64(failures) / float64(attempts)) * 100.0
	}
	return attempts, failures, rate
}

func (r *pathTrackerGenerateRuntimeStats) prune(now time.Time) {
	cutoff := now.Add(-time.Hour)
	filter := func(items []time.Time) []time.Time {
		out := items[:0]
		for _, ts := range items {
			if !ts.Before(cutoff) {
				out = append(out, ts)
			}
		}
		return out
	}
	r.attempts = filter(r.attempts)
	r.errors = filter(r.errors)
}

func NewPathTrackerService(db *gorm.DB) *PathTrackerService {
	return &PathTrackerService{
		db:    db,
		polza: GetPolzaService(),
	}
}

func (s *PathTrackerService) IsEnabled() bool {
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", "PATH_TRACKER_ENABLED").First(&setting).Error; err != nil {
		return true
	}
	return !isFalseLike(setting.Value)
}

func (s *PathTrackerService) MaybeEmitMonitoringAlerts() {
	alerts, err := s.buildAlertSignals()
	if err != nil {
		log.Printf("[PathTracker][Alert] failed to build signals: %v", err)
		return
	}

	webhookURL := strings.TrimSpace(s.getSystemSetting("PATH_TRACKER_ALERT_WEBHOOK_URL"))
	if webhookURL == "" {
		if alerts.FallbackTriggered || alerts.GenerateErrorTriggered {
			log.Printf("[PathTracker][Alert] no webhook configured fallback_rate_1h=%.2f generate_error_rate_15m=%.2f",
				alerts.FallbackRate1h, alerts.GenerateErrorRate15m)
		}
		return
	}

	cooldown := 10 * time.Minute
	if alerts.FallbackTriggered && pathTrackerAlertNotifier.shouldSend("fallback_rate", cooldown) {
		payload := map[string]any{
			"alertType":      "path_tracker_fallback_rate_high",
			"severity":       "warning",
			"threshold":      alerts.FallbackThreshold,
			"currentValue":   alerts.FallbackRate1h,
			"samples":        alerts.FallbackSamples1h,
			"windowMinutes":  60,
			"generatedAtUTC": time.Now().UTC().Format(time.RFC3339),
		}
		s.sendPathTrackerAlertWebhook(webhookURL, payload)
	}

	if alerts.GenerateErrorTriggered && pathTrackerAlertNotifier.shouldSend("generate_error_rate", cooldown) {
		payload := map[string]any{
			"alertType":      "path_tracker_generate_error_rate_high",
			"severity":       "critical",
			"threshold":      alerts.GenerateThreshold,
			"currentValue":   alerts.GenerateErrorRate15m,
			"errors":         alerts.GenerateErrors15m,
			"attempts":       alerts.GenerateAttempts15m,
			"windowMinutes":  15,
			"generatedAtUTC": time.Now().UTC().Format(time.RFC3339),
		}
		s.sendPathTrackerAlertWebhook(webhookURL, payload)
	}
}

func (s *PathTrackerService) GetToday(userID uint) (*TodayView, error) {
	user, dateLocal, _, err := s.resolveUserAndDate(userID, "")
	if err != nil {
		return nil, err
	}

	var checkin models.DailyCheckin
	hasCheckin := s.db.Where("user_id = ? AND date_local = ?", userID, dateLocal).First(&checkin).Error == nil

	var step models.DailyStep
	hasStep := s.db.Where("user_id = ? AND date_local = ?", userID, dateLocal).First(&step).Error == nil

	state := s.ensureState(userID)
	phase := strings.TrimSpace(state.TrajectoryPhase)
	if phase == "" {
		phase = "reentry"
	}
	segment := strings.TrimSpace(state.ExperienceSegment)
	if segment == "" {
		segment = "gentle_recovery"
	}
	view := &TodayView{
		Date:          dateLocal,
		Role:          normalizeRole(user.Role),
		HasCheckin:    hasCheckin,
		HasReflection: false,
		State: map[string]any{
			"streakCurrent":     state.StreakCurrent,
			"streakBest":        state.StreakBest,
			"loadLevel":         strings.TrimSpace(state.LoadLevel),
			"trajectoryPhase":   phase,
			"experienceSegment": segment,
			"lastFormat":        strings.TrimSpace(state.LastFormat),
			"experimentBucket":  experimentBucket(userID),
		},
	}
	if hasCheckin {
		view.Checkin = &checkin
	}
	if hasStep {
		stepView, err := buildDailyStepView(step, dateLocal)
		if err == nil {
			view.Step = stepView
		}
		s.ensureViewedEvent(step.ID)
		var reflectionCount int64
		s.db.Model(&models.DailyStepEvent{}).Where("daily_step_id = ? AND event_type = ?", step.ID, "reflected").Count(&reflectionCount)
		view.HasReflection = reflectionCount > 0
	}

	return view, nil
}

func (s *PathTrackerService) SaveCheckin(userID uint, input CheckinInput) (*models.DailyCheckin, error) {
	if !isValidAvailableMinutes(input.AvailableMinutes) {
		return nil, fmt.Errorf("available_minutes must be 3, 5, or 10")
	}
	user, dateLocal, timezone, err := s.resolveUserAndDate(userID, input.Timezone)
	if err != nil {
		return nil, err
	}

	checkin := models.DailyCheckin{
		UserID:           userID,
		DateLocal:        dateLocal,
		MoodCode:         strings.TrimSpace(strings.ToLower(input.MoodCode)),
		EnergyCode:       strings.TrimSpace(strings.ToLower(input.EnergyCode)),
		AvailableMinutes: input.AvailableMinutes,
		FreeText:         strings.TrimSpace(input.FreeText),
		Timezone:         timezone,
	}

	var existing models.DailyCheckin
	if err := s.db.Where("user_id = ? AND date_local = ?", userID, dateLocal).First(&existing).Error; err == nil {
		existing.MoodCode = checkin.MoodCode
		existing.EnergyCode = checkin.EnergyCode
		existing.AvailableMinutes = checkin.AvailableMinutes
		existing.FreeText = checkin.FreeText
		existing.Timezone = checkin.Timezone
		if err := s.db.Save(&existing).Error; err != nil {
			return nil, err
		}
		return &existing, nil
	}

	if err := s.db.Create(&checkin).Error; err != nil {
		return nil, err
	}
	log.Printf("[PathTracker] checkin saved user=%d role=%s date=%s minutes=%d", user.ID, user.Role, dateLocal, input.AvailableMinutes)
	return &checkin, nil
}

func (s *PathTrackerService) GenerateStep(userID uint) (*DailyStepView, error) {
	user, dateLocal, _, err := s.resolveUserAndDate(userID, "")
	if err != nil {
		return nil, err
	}

	var existing models.DailyStep
	if err := s.db.Where("user_id = ? AND date_local = ?", userID, dateLocal).First(&existing).Error; err == nil {
		return buildDailyStepView(existing, dateLocal)
	}

	var checkin models.DailyCheckin
	if err := s.db.Where("user_id = ? AND date_local = ?", userID, dateLocal).First(&checkin).Error; err != nil {
		return nil, ErrCheckinRequired
	}

	state := s.ensureState(userID)
	missedDays := daysSince(state.LastActiveDate, dateLocal)
	loadLevel := s.deriveLoadLevel(checkin, state, missedDays, userID, dateLocal)
	trajectory := s.buildTrajectoryProfile(userID, dateLocal, missedDays)
	role := normalizeRole(user.Role)
	candidates := s.BuildDailyCandidateSet(role, checkin.AvailableMinutes, loadLevel)
	candidates = s.ApplyGuardrails(candidates, loadLevel, missedDays, state.LastFormat)
	candidates = s.ApplyTrajectoryAdaptation(candidates, role, trajectory, loadLevel, checkin.AvailableMinutes)
	if len(candidates) == 0 {
		candidates = s.FallbackCandidateSet(role, checkin.AvailableMinutes)
	}
	chosen := pickCandidate(candidates, userID, dateLocal)
	suggestedServiceID, suggestedServiceTitle := s.pickSuggestedService(role, loadLevel, missedDays, userID, dateLocal, state)

	content, source := s.GenerateNarrativeWithLLM(role, checkin, chosen)
	content.SuggestedServiceID = suggestedServiceID
	content.SuggestedServiceTitle = suggestedServiceTitle
	if source == models.PathTrackerGenerationTemplate {
		log.Printf("[PathTracker] using template fallback user=%d role=%s date=%s", userID, role, dateLocal)
	}

	contentJSON, _ := json.Marshal(content)
	step := models.DailyStep{
		UserID:            userID,
		DateLocal:         dateLocal,
		Role:              role,
		TrajectoryPhase:   trajectory.Phase,
		ExperienceSegment: trajectory.Segment,
		Format:            chosen.Format,
		Difficulty:        chosen.Difficulty,
		ContentJSON:       string(contentJSON),
		GenerationSource:  source,
		Status:            models.PathTrackerStepStatusAssigned,
	}
	if err := s.db.Create(&step).Error; err != nil {
		return nil, err
	}

	state.LoadLevel = loadLevel
	if strings.TrimSpace(state.TrajectoryPhase) != trajectory.Phase {
		state.LastPhaseShiftDate = dateLocal
	}
	state.TrajectoryPhase = trajectory.Phase
	state.ExperienceSegment = trajectory.Segment
	state.LastSuggestedDate = dateLocal
	state.LastSuggestedService = suggestedServiceID
	_ = s.db.Save(&state).Error
	s.emitStepEvent(step.ID, "viewed", map[string]any{
		"date":              dateLocal,
		"initial":           true,
		"trajectoryPhase":   trajectory.Phase,
		"experienceSegment": trajectory.Segment,
		"completionRate30":  trajectory.CompletionRate30,
		"suggestedService":  suggestedServiceID,
		"experimentBucket":  experimentBucket(userID),
	})

	log.Printf("[PathTracker] step generated metric=path_tracker_step_generated user=%d role=%s date=%s format=%s phase=%s segment=%s fallback=%v",
		userID, role, dateLocal, chosen.Format, trajectory.Phase, trajectory.Segment, source == models.PathTrackerGenerationTemplate)
	return buildDailyStepView(step, dateLocal)
}

func (s *PathTrackerService) CompleteStep(userID uint, stepID uint) (*DailyStepView, error) {
	var step models.DailyStep
	if stepID > 0 {
		if err := s.db.Where("id = ? AND user_id = ?", stepID, userID).First(&step).Error; err != nil {
			return nil, ErrStepNotFound
		}
	} else {
		_, dateLocal, _, err := s.resolveUserAndDate(userID, "")
		if err != nil {
			return nil, err
		}
		if err := s.db.Where("user_id = ? AND date_local = ?", userID, dateLocal).First(&step).Error; err != nil {
			return nil, ErrStepNotFound
		}
	}

	if step.Status != models.PathTrackerStepStatusCompleted {
		now := time.Now().UTC()
		step.Status = models.PathTrackerStepStatusCompleted
		step.CompletedAt = &now
		if err := s.db.Save(&step).Error; err != nil {
			return nil, err
		}
		s.emitStepEvent(step.ID, "completed", map[string]any{
			"at":               now.Format(time.RFC3339),
			"experimentBucket": experimentBucket(userID),
		})
	}

	state := s.ensureState(userID)
	today := step.DateLocal
	if state.LastActiveDate != today {
		yesterday := shiftDate(today, -1)
		if state.LastActiveDate == yesterday {
			state.StreakCurrent++
		} else {
			state.StreakCurrent = 1
		}
	}
	if state.StreakCurrent > state.StreakBest {
		state.StreakBest = state.StreakCurrent
	}
	state.LastActiveDate = today
	state.LastFormat = step.Format
	_ = s.db.Save(&state).Error

	log.Printf("[PathTracker] complete metric=path_tracker_step_completed user=%d step=%d date=%s streak=%d experiment=%s",
		userID, step.ID, step.DateLocal, state.StreakCurrent, experimentBucket(userID))
	return buildDailyStepView(step, step.DateLocal)
}

func (s *PathTrackerService) ReflectStep(userID, stepID uint, resultMood, reflectionText string) (string, error) {
	var step models.DailyStep
	if err := s.db.Where("id = ? AND user_id = ?", stepID, userID).First(&step).Error; err != nil {
		return "", ErrStepNotFound
	}
	payload := map[string]any{
		"resultMood": strings.TrimSpace(strings.ToLower(resultMood)),
		"text":       strings.TrimSpace(reflectionText),
	}
	s.emitStepEvent(step.ID, "reflected", payload)

	reply := buildReflectionReply(payload["resultMood"].(string))
	return reply, nil
}

func (s *PathTrackerService) AssistantHelp(userID, stepID uint, requestType, message string) (*AssistantResult, error) {
	var step models.DailyStep
	if err := s.db.Where("id = ? AND user_id = ?", stepID, userID).First(&step).Error; err != nil {
		return nil, ErrStepNotFound
	}
	var content StepContent
	_ = json.Unmarshal([]byte(step.ContentJSON), &content)

	reply := s.generateAssistantReply(step, content, requestType, message)
	eventType := "assistant_help"
	if strings.TrimSpace(strings.ToLower(requestType)) == "alternative" {
		eventType = "alternative_requested"
	}
	s.emitStepEvent(step.ID, eventType, map[string]any{
		"requestType": requestType,
		"message":     strings.TrimSpace(message),
	})
	return &AssistantResult{Reply: reply}, nil
}

func (s *PathTrackerService) GetWeeklySummary(userID uint) (*WeeklySummaryView, error) {
	_, today, _, err := s.resolveUserAndDate(userID, "")
	if err != nil {
		return nil, err
	}
	fromDate := shiftDate(today, -6)

	var checkins []models.DailyCheckin
	if err := s.db.Where("user_id = ? AND date_local >= ? AND date_local <= ?", userID, fromDate, today).
		Find(&checkins).Error; err != nil {
		return nil, err
	}
	checkinsByDate := make(map[string]models.DailyCheckin, len(checkins))
	for _, c := range checkins {
		checkinsByDate[c.DateLocal] = c
	}

	var steps []models.DailyStep
	if err := s.db.Where("user_id = ? AND date_local >= ? AND date_local <= ?", userID, fromDate, today).
		Find(&steps).Error; err != nil {
		return nil, err
	}
	stepsByDate := make(map[string]models.DailyStep, len(steps))
	stepIDs := make([]uint, 0, len(steps))
	for _, st := range steps {
		stepsByDate[st.DateLocal] = st
		stepIDs = append(stepIDs, st.ID)
	}

	reflectionByStepID := map[uint]bool{}
	if len(stepIDs) > 0 {
		var events []models.DailyStepEvent
		if err := s.db.Where("daily_step_id IN ? AND event_type = ?", stepIDs, "reflected").Find(&events).Error; err == nil {
			for _, ev := range events {
				reflectionByStepID[ev.DailyStepID] = true
			}
		}
	}

	days := make([]WeeklyDaySummary, 0, 7)
	completedDays := 0
	assignedDays := 0
	checkinDays := 0
	for i := 0; i < 7; i++ {
		date := shiftDate(fromDate, i)
		_, hasCheckin := checkinsByDate[date]
		if hasCheckin {
			checkinDays++
		}
		step, hasStep := stepsByDate[date]
		status := ""
		completed := false
		hasReflection := false
		if hasStep {
			assignedDays++
			status = step.Status
			completed = step.Status == models.PathTrackerStepStatusCompleted
			hasReflection = reflectionByStepID[step.ID]
			if completed {
				completedDays++
			}
		}
		days = append(days, WeeklyDaySummary{
			Date:          date,
			HasCheckin:    hasCheckin,
			StepStatus:    status,
			Completed:     completed,
			HasReflection: hasReflection,
		})
	}

	completionRate := 0.0
	if assignedDays > 0 {
		completionRate = (float64(completedDays) / float64(assignedDays)) * 100.0
	}
	state := s.ensureState(userID)
	gentleSummary := "Неделя в движении: ты продолжаешь идти небольшими шагами."
	if completedDays >= 5 {
		gentleSummary = "Сильная неделя: устойчивость уже заметна, продолжай в том же темпе."
	} else if completedDays <= 2 {
		gentleSummary = "Мягкий ритм тоже прогресс. Держи фокус на одном выполнимом шаге в день."
	}

	return &WeeklySummaryView{
		FromDate:         fromDate,
		ToDate:           today,
		CompletedDays:    completedDays,
		AssignedDays:     assignedDays,
		CheckinDays:      checkinDays,
		CompletionRate:   completionRate,
		StreakCurrent:    state.StreakCurrent,
		StreakBest:       state.StreakBest,
		GentleSummary:    gentleSummary,
		ExperimentBucket: experimentBucket(userID),
		Days:             days,
	}, nil
}

func (s *PathTrackerService) GetMetricsSummary() (*PathTrackerMetricsSummary, error) {
	summary := &PathTrackerMetricsSummary{}
	if err := s.db.Model(&models.DailyStep{}).Count(&summary.TotalSteps).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&models.DailyStep{}).Where("status = ?", models.PathTrackerStepStatusCompleted).Count(&summary.CompletedSteps).Error; err != nil {
		return nil, err
	}
	if summary.TotalSteps > 0 {
		summary.CompletionRate = (float64(summary.CompletedSteps) / float64(summary.TotalSteps)) * 100.0
	}

	type firstStepRow struct {
		UserID    uint
		FirstDate string
	}
	var rows []firstStepRow
	if err := s.db.Raw("SELECT user_id, MIN(date_local) AS first_date FROM daily_steps GROUP BY user_id").Scan(&rows).Error; err != nil {
		return nil, err
	}
	summary.UsersWithSteps = int64(len(rows))
	for _, row := range rows {
		d1 := shiftDate(row.FirstDate, 1)
		d7 := shiftDate(row.FirstDate, 7)

		if row.FirstDate <= shiftDate(time.Now().UTC().Format("2006-01-02"), -1) {
			summary.D1RetentionEligible++
			var count int64
			_ = s.db.Model(&models.DailyStep{}).Where("user_id = ? AND date_local = ?", row.UserID, d1).Count(&count).Error
			if count > 0 {
				summary.D1RetainedUsers++
			}
		}
		if row.FirstDate <= shiftDate(time.Now().UTC().Format("2006-01-02"), -7) {
			summary.D7RetentionEligible++
			var count int64
			_ = s.db.Model(&models.DailyStep{}).Where("user_id = ? AND date_local = ?", row.UserID, d7).Count(&count).Error
			if count > 0 {
				summary.D7RetainedUsers++
			}
		}
	}
	if summary.D1RetentionEligible > 0 {
		summary.D1RetentionRate = (float64(summary.D1RetainedUsers) / float64(summary.D1RetentionEligible)) * 100.0
	}
	if summary.D7RetentionEligible > 0 {
		summary.D7RetentionRate = (float64(summary.D7RetainedUsers) / float64(summary.D7RetentionEligible)) * 100.0
	}
	return summary, nil
}

func (s *PathTrackerService) GetAnalytics(days int) (*PathTrackerAnalytics, error) {
	if days <= 0 {
		days = 14
	}
	if days > 90 {
		days = 90
	}
	today := time.Now().UTC().Format("2006-01-02")
	fromDate := shiftDate(today, -(days - 1))

	var trendRows []struct {
		Date           string
		AssignedSteps  int64
		CompletedSteps int64
	}
	if err := s.db.Raw(`
		SELECT date_local AS date,
		       COUNT(*) AS assigned_steps,
		       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed_steps
		FROM daily_steps
		WHERE date_local >= ? AND date_local <= ?
		GROUP BY date_local
		ORDER BY date_local ASC
	`, models.PathTrackerStepStatusCompleted, fromDate, today).Scan(&trendRows).Error; err != nil {
		return nil, err
	}

	trendMap := map[string]PathTrackerTrendPoint{}
	for _, row := range trendRows {
		rate := 0.0
		if row.AssignedSteps > 0 {
			rate = (float64(row.CompletedSteps) / float64(row.AssignedSteps)) * 100.0
		}
		trendMap[row.Date] = PathTrackerTrendPoint{
			Date:           row.Date,
			AssignedSteps:  row.AssignedSteps,
			CompletedSteps: row.CompletedSteps,
			CompletionRate: rate,
		}
	}

	trend := make([]PathTrackerTrendPoint, 0, days)
	for i := 0; i < days; i++ {
		date := shiftDate(fromDate, i)
		if p, ok := trendMap[date]; ok {
			trend = append(trend, p)
		} else {
			trend = append(trend, PathTrackerTrendPoint{
				Date:           date,
				AssignedSteps:  0,
				CompletedSteps: 0,
				CompletionRate: 0,
			})
		}
	}

	var bucketRows []struct {
		Bucket         string
		UsersWithSteps int64
		TotalSteps     int64
		CompletedSteps int64
	}
	if err := s.db.Raw(`
		SELECT CASE WHEN MOD(user_id, 2) = 0 THEN 'weekly_summary_v1' ELSE 'control' END AS bucket,
		       COUNT(DISTINCT user_id) AS users_with_steps,
		       COUNT(*) AS total_steps,
		       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed_steps
		FROM daily_steps
		WHERE date_local >= ? AND date_local <= ?
		GROUP BY bucket
		ORDER BY bucket ASC
	`, models.PathTrackerStepStatusCompleted, fromDate, today).Scan(&bucketRows).Error; err != nil {
		return nil, err
	}

	comparison := make([]PathTrackerBucketComparison, 0, len(bucketRows))
	for _, row := range bucketRows {
		rate := 0.0
		if row.TotalSteps > 0 {
			rate = (float64(row.CompletedSteps) / float64(row.TotalSteps)) * 100.0
		}
		comparison = append(comparison, PathTrackerBucketComparison{
			Bucket:         row.Bucket,
			UsersWithSteps: row.UsersWithSteps,
			TotalSteps:     row.TotalSteps,
			CompletedSteps: row.CompletedSteps,
			CompletionRate: rate,
		})
	}

	ensureBucket := func(bucket string) {
		for _, row := range comparison {
			if row.Bucket == bucket {
				return
			}
		}
		comparison = append(comparison, PathTrackerBucketComparison{Bucket: bucket})
	}
	ensureBucket("control")
	ensureBucket("weekly_summary_v1")

	var segmentRows []struct {
		Segment        string
		UsersWithSteps int64
		TotalSteps     int64
		CompletedSteps int64
	}
	if err := s.db.Raw(`
		SELECT COALESCE(NULLIF(experience_segment, ''), 'unknown') AS segment,
		       COUNT(DISTINCT user_id) AS users_with_steps,
		       COUNT(*) AS total_steps,
		       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed_steps
		FROM daily_steps
		WHERE date_local >= ? AND date_local <= ?
		GROUP BY segment
		ORDER BY segment ASC
	`, models.PathTrackerStepStatusCompleted, fromDate, today).Scan(&segmentRows).Error; err != nil {
		return nil, err
	}
	segments := make([]PathTrackerSegmentComparison, 0, len(segmentRows))
	for _, row := range segmentRows {
		rate := 0.0
		if row.TotalSteps > 0 {
			rate = (float64(row.CompletedSteps) / float64(row.TotalSteps)) * 100.0
		}
		segments = append(segments, PathTrackerSegmentComparison{
			Segment:        row.Segment,
			UsersWithSteps: row.UsersWithSteps,
			TotalSteps:     row.TotalSteps,
			CompletedSteps: row.CompletedSteps,
			CompletionRate: rate,
		})
	}

	alerts, err := s.buildAlertSignals()
	if err != nil {
		return nil, err
	}

	return &PathTrackerAnalytics{
		Days:              days,
		FromDate:          fromDate,
		ToDate:            today,
		Trend:             trend,
		BucketComparison:  comparison,
		SegmentComparison: segments,
		Alerts:            alerts,
	}, nil
}

func (s *PathTrackerService) buildAlertSignals() (PathTrackerAlertSignals, error) {
	const (
		fallbackThreshold = 20.0
		errorThreshold    = 5.0
	)

	sinceFallback := time.Now().UTC().Add(-1 * time.Hour)
	var totalGenerated int64
	if err := s.db.Model(&models.DailyStep{}).Where("created_at >= ?", sinceFallback).Count(&totalGenerated).Error; err != nil {
		return PathTrackerAlertSignals{}, err
	}

	var fallbackGenerated int64
	if err := s.db.Model(&models.DailyStep{}).
		Where("created_at >= ? AND generation_source = ?", sinceFallback, models.PathTrackerGenerationTemplate).
		Count(&fallbackGenerated).Error; err != nil {
		return PathTrackerAlertSignals{}, err
	}

	fallbackRate := 0.0
	if totalGenerated > 0 {
		fallbackRate = (float64(fallbackGenerated) / float64(totalGenerated)) * 100.0
	}

	attempts15m, failures15m, errorRate15m := generateRuntimeStats.Stats(15 * time.Minute)

	return PathTrackerAlertSignals{
		FallbackRate1h:         fallbackRate,
		FallbackSamples1h:      totalGenerated,
		FallbackThreshold:      fallbackThreshold,
		FallbackTriggered:      totalGenerated > 0 && fallbackRate > fallbackThreshold,
		GenerateErrorRate15m:   errorRate15m,
		GenerateAttempts15m:    attempts15m,
		GenerateErrors15m:      failures15m,
		GenerateThreshold:      errorThreshold,
		GenerateErrorTriggered: attempts15m > 0 && errorRate15m > errorThreshold,
	}, nil
}

func (s *PathTrackerService) getSystemSetting(key string) string {
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", key).First(&setting).Error; err != nil {
		return ""
	}
	return strings.TrimSpace(setting.Value)
}

func (s *PathTrackerService) sendPathTrackerAlertWebhook(webhookURL string, payload map[string]any) {
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[PathTracker][Alert] marshal payload error: %v", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[PathTracker][Alert] build request error: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[PathTracker][Alert] webhook call failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		log.Printf("[PathTracker][Alert] webhook non-2xx status: %d", resp.StatusCode)
		return
	}

	log.Printf("[PathTracker][Alert] webhook sent type=%v", payload["alertType"])
}

func (s *PathTrackerService) BuildDailyCandidateSet(role string, minutes int, loadLevel string) []stepCandidate {
	tone := toneByRole(role)
	actions := []PathStepAction{
		{ID: "simplify", Label: "Упростить"},
		{ID: "alternative", Label: "Другой формат"},
		{ID: "deepen", Label: "Углубить"},
	}
	candidates := []stepCandidate{
		{Format: "practice", Difficulty: "low", Title: "3 спокойных дыхательных цикла", Instructions: []string{"Сядь ровно и расслабь плечи.", "Сделай 3 медленных вдоха-выдоха через нос.", "После каждого выдоха коротко замечай состояние тела."}, Tone: tone, Actions: actions},
		{Format: "text", Difficulty: "low", Title: "Короткое осмысленное чтение", Instructions: []string{"Открой маленький текст на сегодня.", "Прочитай 3-5 предложений без спешки.", "Запиши одну мысль, которую хочешь удержать в дне."}, Tone: tone, Actions: actions},
		{Format: "audio", Difficulty: "medium", Title: "Аудио-пауза на восстановление", Instructions: []string{"Включи короткий аудио-фрагмент.", "Слушай без параллельных задач.", "После завершения сделай 20 секунд тишины."}, Tone: tone, Actions: actions},
		{Format: "communication", Difficulty: "medium", Title: "Тёплый контакт", Instructions: []string{"Выбери одного близкого человека.", "Отправь короткое поддерживающее сообщение.", "Отметь, как изменилось внутреннее состояние."}, Tone: tone, Actions: actions},
		{Format: "service", Difficulty: "high", Title: "Маленький акт служения", Instructions: []string{"Выбери одно простое полезное действие для других.", "Выполни его без ожидания реакции.", "Зафиксируй, что дало это действие внутри."}, Tone: tone, Actions: actions},
	}

	switch normalizeRole(role) {
	case models.RoleInGoodness:
		candidates[1].Title = "Мини-ритуал устойчивости"
	case models.RoleYogi:
		candidates[0].Title = "Точечная дыхательная техника"
		candidates[4].Title = "Практика дисциплины"
	case models.RoleDevotee:
		candidates[3].Title = "Контакт с общиной"
		candidates[4].Title = "Действие в духе служения"
	}

	filtered := make([]stepCandidate, 0, len(candidates))
	for _, c := range candidates {
		if minutes <= 3 && (c.Difficulty == "high" || c.Format == "service") {
			continue
		}
		if minutes <= 5 && c.Difficulty == "high" {
			continue
		}
		filtered = append(filtered, c)
	}
	if len(filtered) == 0 {
		filtered = append(filtered, candidates[0])
	}
	return filtered
}

func (s *PathTrackerService) ApplyGuardrails(candidates []stepCandidate, loadLevel string, missedDays int, lastFormat string) []stepCandidate {
	if len(candidates) == 0 {
		return candidates
	}

	filtered := make([]stepCandidate, 0, len(candidates))
	for _, c := range candidates {
		if (loadLevel == models.PathTrackerLoadLow || missedDays >= 2) && c.Difficulty != "low" {
			continue
		}
		filtered = append(filtered, c)
	}
	if len(filtered) == 0 {
		filtered = append(filtered, candidates[0])
	}

	// Small variety guardrail: prefer a different format if possible.
	if lastFormat != "" && len(filtered) > 1 {
		withoutLast := make([]stepCandidate, 0, len(filtered))
		for _, c := range filtered {
			if c.Format != lastFormat {
				withoutLast = append(withoutLast, c)
			}
		}
		if len(withoutLast) > 0 {
			return withoutLast
		}
	}
	return filtered
}

func (s *PathTrackerService) ApplyTrajectoryAdaptation(candidates []stepCandidate, role string, profile trajectoryProfile, loadLevel string, minutes int) []stepCandidate {
	if len(candidates) == 0 {
		return candidates
	}

	switch profile.Segment {
	case "gentle_recovery":
		lowOnly := make([]stepCandidate, 0, len(candidates))
		for _, c := range candidates {
			if c.Difficulty == "low" {
				lowOnly = append(lowOnly, c)
			}
		}
		if len(lowOnly) > 0 {
			return lowOnly
		}
	case "advanced_flow":
		if minutes >= 10 && loadLevel != models.PathTrackerLoadLow {
			preferred := []string{"practice", "audio"}
			switch role {
			case models.RoleDevotee:
				preferred = []string{"service", "communication"}
			case models.RoleInGoodness:
				preferred = []string{"practice", "text"}
			}

			prioritized := make([]stepCandidate, 0, len(candidates))
			rest := make([]stepCandidate, 0, len(candidates))
			for _, c := range candidates {
				if containsString(preferred, c.Format) {
					prioritized = append(prioritized, c)
				} else {
					rest = append(rest, c)
				}
			}
			if len(prioritized) > 0 {
				return append(prioritized, rest...)
			}
		}
	}

	return candidates
}

func (s *PathTrackerService) FallbackCandidateSet(role string, minutes int) []stepCandidate {
	base := stepCandidate{
		Format:       "practice",
		Difficulty:   "low",
		Title:        "Мягкая пауза на сегодня",
		Instructions: []string{"Остановись на минуту.", "Сделай 3 спокойных вдоха-выдоха.", "Выбери одно доброе действие на оставшийся день."},
		Tone:         toneByRole(role),
		Actions: []PathStepAction{
			{ID: "simplify", Label: "Упростить"},
			{ID: "alternative", Label: "Другой формат"},
			{ID: "deepen", Label: "Углубить"},
		},
	}
	if minutes >= 10 {
		base.Instructions = append(base.Instructions, "Побудь 2 минуты в тишине после практики.")
	}
	return []stepCandidate{base}
}

func (s *PathTrackerService) GenerateNarrativeWithLLM(role string, checkin models.DailyCheckin, candidate stepCandidate) (StepContent, string) {
	fallback := s.FallbackTemplate(candidate, role)
	if s.polza == nil || !s.polza.HasApiKey() {
		return fallback, models.PathTrackerGenerationTemplate
	}

	system := "Ты помощник сервиса Path Tracker. Верни строго JSON без markdown: " +
		`{"title":"...","motivation":"...","instructions":["..."],"fallbackText":"...","actions":[{"id":"simplify","label":"Упростить"},{"id":"alternative","label":"Другой формат"},{"id":"deepen","label":"Углубить"}],"tone":"...","suggestedServiceId":"","suggestedServiceTitle":""}` +
		" Инструкции короткие, поддерживающий тон, без осуждения."
	userPrompt := fmt.Sprintf("Роль=%s; mood=%s; energy=%s; minutes=%d; format=%s; difficulty=%s; baseTitle=%s; baseInstructions=%s",
		role, checkin.MoodCode, checkin.EnergyCode, checkin.AvailableMinutes, candidate.Format, candidate.Difficulty, candidate.Title, strings.Join(candidate.Instructions, " | "))

	content, err := s.polza.SendMessage(s.polza.GetFastModel(), []map[string]string{
		{"role": "system", "content": system},
		{"role": "user", "content": userPrompt},
	})
	if err != nil {
		return fallback, models.PathTrackerGenerationTemplate
	}
	parsed, err := parseStepContent(content)
	if err != nil {
		return fallback, models.PathTrackerGenerationTemplate
	}
	if parsed.Title == "" || len(parsed.Instructions) == 0 {
		return fallback, models.PathTrackerGenerationTemplate
	}
	return parsed, models.PathTrackerGenerationLLM
}

func (s *PathTrackerService) FallbackTemplate(candidate stepCandidate, role string) StepContent {
	return StepContent{
		Title:        candidate.Title,
		Motivation:   motivationByRole(role),
		Instructions: candidate.Instructions,
		FallbackText: "Если сейчас трудно, сократи практику до одной маленькой части и заверши её спокойно.",
		Actions:      candidate.Actions,
		Tone:         candidate.Tone,
	}
}

func (s *PathTrackerService) pickSuggestedService(role, loadLevel string, missedDays int, userID uint, dateLocal string, state models.PathTrackerState) (string, string) {
	// Never push new sections during overload/recovery days.
	if loadLevel == models.PathTrackerLoadLow || missedDays >= 2 {
		return "", ""
	}
	if state.LastSuggestedDate == dateLocal {
		return "", ""
	}

	pool := []string{"multimedia", "news", "education", "services"}
	switch normalizeRole(role) {
	case models.RoleYogi:
		pool = []string{"services", "education", "multimedia", "video_circles"}
	case models.RoleDevotee:
		pool = []string{"seva", "news", "video_circles", "multimedia"}
	case models.RoleInGoodness:
		pool = []string{"education", "services", "multimedia", "news"}
	}
	if len(pool) == 0 {
		return "", ""
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(fmt.Sprintf("suggest:%d:%s", userID, dateLocal)))
	idx := int(h.Sum32()) % len(pool)
	serviceID := pool[idx]
	return serviceID, suggestedServiceTitle(serviceID)
}

func (s *PathTrackerService) deriveLoadLevel(checkin models.DailyCheckin, state models.PathTrackerState, missedDays int, userID uint, dateLocal string) string {
	if missedDays >= 2 {
		return models.PathTrackerLoadLow
	}
	energy := strings.TrimSpace(strings.ToLower(checkin.EnergyCode))
	if energy == "low" || energy == "tired" || energy == "exhausted" {
		return models.PathTrackerLoadLow
	}

	var recent []models.DailyStep
	_ = s.db.Where("user_id = ? AND date_local < ?", userID, dateLocal).
		Order("date_local desc").
		Limit(3).
		Find(&recent).Error
	completed := 0
	for _, st := range recent {
		if st.Status == models.PathTrackerStepStatusCompleted {
			completed++
		}
	}
	if completed >= 2 && (energy == "high" || energy == "good") {
		return models.PathTrackerLoadHigh
	}
	if state.LoadLevel == models.PathTrackerLoadLow && completed == 0 {
		return models.PathTrackerLoadLow
	}
	return models.PathTrackerLoadMedium
}

func (s *PathTrackerService) ensureState(userID uint) models.PathTrackerState {
	var state models.PathTrackerState
	if err := s.db.Where("user_id = ?", userID).First(&state).Error; err != nil {
		state = models.PathTrackerState{
			UserID:            userID,
			LoadLevel:         models.PathTrackerLoadMedium,
			TrajectoryPhase:   "reentry",
			ExperienceSegment: "gentle_recovery",
			StreakCurrent:     0,
			StreakBest:        0,
		}
		_ = s.db.Create(&state).Error
	}
	return state
}

func (s *PathTrackerService) ensureViewedEvent(stepID uint) {
	var count int64
	s.db.Model(&models.DailyStepEvent{}).
		Where("daily_step_id = ? AND event_type = ?", stepID, "viewed").
		Count(&count)
	if count == 0 {
		s.emitStepEvent(stepID, "viewed", map[string]any{"source": "today"})
	}
}

func (s *PathTrackerService) emitStepEvent(stepID uint, eventType string, payload map[string]any) {
	raw := "{}"
	if payload != nil {
		if b, err := json.Marshal(payload); err == nil {
			raw = string(b)
		}
	}
	event := models.DailyStepEvent{
		DailyStepID: stepID,
		EventType:   eventType,
		PayloadJSON: raw,
	}
	_ = s.db.Create(&event).Error
}

func (s *PathTrackerService) resolveUserAndDate(userID uint, overrideTimezone string) (models.User, string, string, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return user, "", "", err
	}
	timezone := strings.TrimSpace(overrideTimezone)
	if timezone == "" {
		timezone = strings.TrimSpace(user.Timezone)
	}
	if timezone == "" {
		timezone = "UTC"
	}
	now := nowInTimezone(timezone)
	return user, now.Format("2006-01-02"), timezone, nil
}

func (s *PathTrackerService) generateAssistantReply(step models.DailyStep, content StepContent, requestType string, message string) string {
	rt := strings.TrimSpace(strings.ToLower(requestType))
	if rt == "" {
		rt = "explain"
	}

	if s.polza != nil && s.polza.HasApiKey() {
		system := "Ты контекстный помощник шага дня. Отвечай кратко, по делу, без уводов в длинный диалог."
		stepInfo := fmt.Sprintf("Шаг: %s. Формат: %s. Инструкции: %s", content.Title, step.Format, strings.Join(content.Instructions, " | "))
		query := fmt.Sprintf("Тип запроса: %s. Пользователь пишет: %s. Дай один полезный ответ в 2-4 предложениях.", rt, strings.TrimSpace(message))
		reply, err := s.polza.SendMessage(s.polza.GetFastModel(), []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": stepInfo},
			{"role": "user", "content": query},
		})
		if err == nil && strings.TrimSpace(reply) != "" {
			return strings.TrimSpace(reply)
		}
	}

	switch rt {
	case "simplify":
		return "Сделай только первый пункт шага и зафиксируй результат одной фразой. Этого достаточно на сегодня."
	case "alternative":
		return "Замени текущий формат на короткое чтение: 2 минуты текста и одна мысль, которую возьмёшь в день."
	case "deepen":
		return "Добавь один дополнительный цикл: после базового шага побудь 60 секунд в тишине и отметь главное ощущение."
	case "support":
		return "Нормально двигаться маленькими шагами. Заверши одну простую часть и считай день успешным."
	default:
		return "Цель шага: дать спокойное и выполнимое действие на сегодня. Выполни базовую инструкцию и отметь, как изменилось состояние."
	}
}

func (s *PathTrackerService) buildTrajectoryProfile(userID uint, dateLocal string, missedDays int) trajectoryProfile {
	fromDate := shiftDate(dateLocal, -29)
	var row struct {
		Assigned  int64
		Completed int64
	}
	_ = s.db.Raw(`
		SELECT COUNT(*) AS assigned,
		       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed
		FROM daily_steps
		WHERE user_id = ? AND date_local >= ? AND date_local <= ?
	`, models.PathTrackerStepStatusCompleted, userID, fromDate, dateLocal).Scan(&row).Error

	rate := 0.0
	if row.Assigned > 0 {
		rate = (float64(row.Completed) / float64(row.Assigned)) * 100.0
	}

	phase := "reentry"
	if missedDays >= 3 {
		phase = "reentry"
	} else if row.Completed >= 20 && rate >= 70 {
		phase = "deepening"
	} else if row.Completed >= 8 && rate >= 40 {
		phase = "stability"
	}

	segment := "steady_builder"
	if missedDays >= 5 || rate < 25 {
		segment = "gentle_recovery"
	} else if rate >= 60 && row.Completed >= 12 {
		segment = "advanced_flow"
	}

	return trajectoryProfile{
		Phase:            phase,
		Segment:          segment,
		Assigned30d:      row.Assigned,
		Completed30d:     row.Completed,
		CompletionRate30: rate,
	}
}

func buildDailyStepView(step models.DailyStep, dateLocal string) (*DailyStepView, error) {
	var content StepContent
	if err := json.Unmarshal([]byte(step.ContentJSON), &content); err != nil {
		return nil, err
	}
	duration := extractDurationFromInstructions(content.Instructions)
	return &DailyStepView{
		StepID:                step.ID,
		Date:                  dateLocal,
		Role:                  step.Role,
		TrajectoryPhase:       strings.TrimSpace(step.TrajectoryPhase),
		ExperienceSegment:     strings.TrimSpace(step.ExperienceSegment),
		DurationMin:           duration,
		Format:                step.Format,
		Title:                 content.Title,
		Instructions:          content.Instructions,
		FallbackText:          content.FallbackText,
		Actions:               content.Actions,
		Tone:                  content.Tone,
		Status:                step.Status,
		GenerationSource:      step.GenerationSource,
		SuggestedServiceID:    content.SuggestedServiceID,
		SuggestedServiceTitle: content.SuggestedServiceTitle,
	}, nil
}

func containsString(items []string, target string) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

func parseStepContent(raw string) (StepContent, error) {
	trimmed := strings.TrimSpace(raw)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)

	start := strings.Index(trimmed, "{")
	end := strings.LastIndex(trimmed, "}")
	if start >= 0 && end > start {
		trimmed = trimmed[start : end+1]
	}

	var out StepContent
	if err := json.Unmarshal([]byte(trimmed), &out); err != nil {
		return out, err
	}
	return out, nil
}

func pickCandidate(candidates []stepCandidate, userID uint, dateLocal string) stepCandidate {
	if len(candidates) == 0 {
		return stepCandidate{}
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(fmt.Sprintf("%d:%s", userID, dateLocal)))
	idx := int(h.Sum32()) % len(candidates)
	return candidates[idx]
}

func nowInTimezone(timezone string) time.Time {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.Now().UTC()
	}
	return time.Now().In(loc)
}

func normalizeRole(role string) string {
	value := strings.TrimSpace(strings.ToLower(role))
	switch value {
	case models.RoleInGoodness, models.RoleYogi, models.RoleDevotee:
		return value
	default:
		return models.RoleUser
	}
}

func daysSince(prevDate, currentDate string) int {
	if strings.TrimSpace(prevDate) == "" {
		return 99
	}
	prev, err1 := time.Parse("2006-01-02", prevDate)
	curr, err2 := time.Parse("2006-01-02", currentDate)
	if err1 != nil || err2 != nil {
		return 99
	}
	return int(curr.Sub(prev).Hours() / 24)
}

func shiftDate(date string, deltaDays int) string {
	d, err := time.Parse("2006-01-02", date)
	if err != nil {
		return date
	}
	return d.AddDate(0, 0, deltaDays).Format("2006-01-02")
}

func isFalseLike(value string) bool {
	v := strings.TrimSpace(strings.ToLower(value))
	return v == "0" || v == "false" || v == "off" || v == "no" || v == "disabled"
}

func isValidAvailableMinutes(v int) bool {
	return v == 3 || v == 5 || v == 10
}

func toneByRole(role string) string {
	switch normalizeRole(role) {
	case models.RoleInGoodness:
		return "supportive-structured"
	case models.RoleYogi:
		return "supportive-precise"
	case models.RoleDevotee:
		return "supportive-meaningful"
	default:
		return "supportive-gentle"
	}
}

func motivationByRole(role string) string {
	switch normalizeRole(role) {
	case models.RoleInGoodness:
		return "Небольшая регулярность сегодня укрепит устойчивость завтра."
	case models.RoleYogi:
		return "Короткая точная практика даёт стабильный прогресс."
	case models.RoleDevotee:
		return "Маленькое действие в духе служения укрепляет внутренний смысл дня."
	default:
		return "Один спокойный шаг сегодня важнее идеального плана."
	}
}

func buildReflectionReply(resultMood string) string {
	switch strings.TrimSpace(strings.ToLower(resultMood)) {
	case "better", "light", "calm":
		return "Отлично. Закрепи это состояние одним коротким намерением на остаток дня."
	case "same":
		return "Это нормально. Даже нейтральный результат поддерживает устойчивую привычку."
	case "worse", "heavy":
		return "Спасибо, что отметил это. На следующем шаге выбирай самый мягкий формат и минимальный объём."
	default:
		return "Спасибо за отметку. Ты завершил важный шаг дня."
	}
}

func extractDurationFromInstructions(instructions []string) int {
	if len(instructions) == 0 {
		return 5
	}
	for _, line := range instructions {
		for _, token := range strings.Fields(line) {
			n, err := strconv.Atoi(strings.Trim(token, ".,:;"))
			if err == nil && (n == 3 || n == 5 || n == 10) {
				return n
			}
		}
	}
	return 5
}

func suggestedServiceTitle(serviceID string) string {
	switch serviceID {
	case "multimedia":
		return "Мультимедиа"
	case "news":
		return "Новости"
	case "education":
		return "Обучение"
	case "services":
		return "Услуги"
	case "seva":
		return "Сева"
	case "video_circles":
		return "Видео Кружки"
	default:
		return ""
	}
}

func experimentBucket(userID uint) string {
	if userID%2 == 0 {
		return "weekly_summary_v1"
	}
	return "control"
}
