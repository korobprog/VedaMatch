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
