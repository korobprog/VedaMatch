package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	PathTrackerGenerationLLM      = "llm"
	PathTrackerGenerationTemplate = "template"

	PathTrackerStepStatusAssigned  = "assigned"
	PathTrackerStepStatusCompleted = "completed"
	PathTrackerStepStatusSkipped   = "skipped"

	PathTrackerLoadLow    = "low"
	PathTrackerLoadMedium = "medium"
	PathTrackerLoadHigh   = "high"
)

type DailyCheckin struct {
	gorm.Model
	UserID           uint   `json:"userId" gorm:"index;uniqueIndex:idx_daily_checkin_user_date"`
	DateLocal        string `json:"dateLocal" gorm:"index;uniqueIndex:idx_daily_checkin_user_date;size:10"`
	MoodCode         string `json:"moodCode" gorm:"size:32"`
	EnergyCode       string `json:"energyCode" gorm:"size:32"`
	AvailableMinutes int    `json:"availableMinutes"`
	FreeText         string `json:"freeText" gorm:"type:text"`
	Timezone         string `json:"timezone" gorm:"size:64"`
}

type DailyStep struct {
	gorm.Model
	UserID            uint       `json:"userId" gorm:"index;uniqueIndex:idx_daily_step_user_date"`
	DateLocal         string     `json:"dateLocal" gorm:"index;uniqueIndex:idx_daily_step_user_date;size:10"`
	Role              string     `json:"role" gorm:"size:32"`
	TrajectoryPhase   string     `json:"trajectoryPhase" gorm:"size:32;index"`
	ExperienceSegment string     `json:"experienceSegment" gorm:"size:32;index"`
	Format            string     `json:"format" gorm:"size:32"`
	Difficulty        string     `json:"difficulty" gorm:"size:16"`
	ContentJSON       string     `json:"contentJson" gorm:"type:jsonb"`
	GenerationSource  string     `json:"generationSource" gorm:"size:16"`
	Status            string     `json:"status" gorm:"size:16;index"`
	CompletedAt       *time.Time `json:"completedAt,omitempty"`
}

type DailyStepEvent struct {
	gorm.Model
	DailyStepID uint   `json:"dailyStepId" gorm:"index"`
	EventType   string `json:"eventType" gorm:"size:40;index"`
	PayloadJSON string `json:"payloadJson" gorm:"type:jsonb"`
}

type PathTrackerAlertEvent struct {
	gorm.Model
	AlertType      string `json:"alertType" gorm:"size:80;index"`
	Severity       string `json:"severity" gorm:"size:24;index"`
	Threshold      string `json:"threshold" gorm:"size:24"`
	CurrentValue   string `json:"currentValue" gorm:"size:24"`
	WindowMinutes  int    `json:"windowMinutes"`
	PayloadJSON    string `json:"payloadJson" gorm:"type:jsonb"`
	DeliveryStatus string `json:"deliveryStatus" gorm:"size:24;index"` // sent|failed|skipped
	DeliveryCode   int    `json:"deliveryCode"`
	ErrorText      string `json:"errorText" gorm:"type:text"`
}

type PathTrackerUnlock struct {
	gorm.Model
	UserID            uint   `json:"userId" gorm:"index;uniqueIndex:idx_path_tracker_unlock_user_service"`
	ServiceID         string `json:"serviceId" gorm:"size:40;uniqueIndex:idx_path_tracker_unlock_user_service;index"`
	Role              string `json:"role" gorm:"size:32"`
	FirstUnlockedDate string `json:"firstUnlockedDate" gorm:"size:10"`
	LastSuggestedDate string `json:"lastSuggestedDate" gorm:"size:10"`
	LastOpenedDate    string `json:"lastOpenedDate" gorm:"size:10"`
	OpenCount         int    `json:"openCount"`
}

type PathTrackerState struct {
	gorm.Model
	UserID               uint   `json:"userId" gorm:"uniqueIndex"`
	LastActiveDate       string `json:"lastActiveDate" gorm:"size:10"`
	StreakCurrent        int    `json:"streakCurrent"`
	StreakBest           int    `json:"streakBest"`
	LoadLevel            string `json:"loadLevel" gorm:"size:16"`
	TrajectoryPhase      string `json:"trajectoryPhase" gorm:"size:32"`
	ExperienceSegment    string `json:"experienceSegment" gorm:"size:32"`
	LastPhaseShiftDate   string `json:"lastPhaseShiftDate" gorm:"size:10"`
	LastFormat           string `json:"lastFormat" gorm:"size:32"`
	LastSuggestedDate    string `json:"lastSuggestedDate" gorm:"size:10"`
	LastSuggestedService string `json:"lastSuggestedService" gorm:"size:32"`
}
