package models

import "gorm.io/gorm"

// MetricCounter stores cumulative application counters for product analytics.
type MetricCounter struct {
	gorm.Model
	Key   string `json:"key" gorm:"type:varchar(120);uniqueIndex;not null"`
	Value int64  `json:"value" gorm:"not null;default:0"`
}
