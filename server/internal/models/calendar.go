package models

import (
	"time"

	"gorm.io/gorm"
)

type CalendarEvent struct {
	gorm.Model
	ImportRunID        uint   `json:"importRunId" gorm:"index"`
	ImportVersion      string `json:"importVersion" gorm:"type:varchar(64);index"`
	OrganizationID     string `json:"organizationId" gorm:"type:varchar(64);not null;index"`
	OrganizationName   string `json:"organizationName" gorm:"type:varchar(120);not null"`
	ScopeKey           string `json:"scopeKey" gorm:"type:varchar(191);not null;index"`
	Date               string `json:"date" gorm:"type:char(10);not null;index"`
	OrganizationScope  string `json:"organizationScope" gorm:"type:varchar(64)"`
	PersonSlug         string `json:"personSlug" gorm:"type:varchar(120)"`
	ObservanceType     string `json:"observanceType" gorm:"type:varchar(32)"`
	Timezone           string `json:"timezone" gorm:"type:varchar(64)"`
	City               string `json:"city" gorm:"type:varchar(120)"`
	Country            string `json:"country" gorm:"type:varchar(120)"`
	EventType          string `json:"eventType" gorm:"type:varchar(32);not null;index"`
	Priority           int    `json:"priority" gorm:"default:0"`
	MarkerStyleKey     string `json:"markerStyleKey" gorm:"type:varchar(64)"`
	IsEkadashi         bool   `json:"isEkadashi" gorm:"default:false;index"`
	IsMahadvadashi     bool   `json:"isMahadvadashi" gorm:"default:false"`
	FastStartAt        string `json:"fastStartAt" gorm:"type:varchar(40)"`
	FastEndAt          string `json:"fastEndAt" gorm:"type:varchar(40)"`
	ParanaStartAt      string `json:"paranaStartAt" gorm:"type:varchar(40)"`
	ParanaEndAt        string `json:"paranaEndAt" gorm:"type:varchar(40)"`
	Title              string `json:"title" gorm:"type:text;not null"`
	Subtitle           string `json:"subtitle" gorm:"type:text"`
	Notes              string `json:"notes" gorm:"type:text"`
	DisplayTitle       string `json:"displayTitle" gorm:"type:text"`
	DisplaySubtitle    string `json:"displaySubtitle" gorm:"type:text"`
	ObservanceNotes    string `json:"observanceNotes" gorm:"type:text"`
	Source             string `json:"source" gorm:"type:varchar(64);not null"`
	SourceURL          string `json:"sourceUrl" gorm:"type:text"`
	SourceKind         string `json:"sourceKind" gorm:"type:varchar(32);not null;default:'imported'"`
	PublicationVersion string `json:"publicationVersion" gorm:"type:varchar(64);index"`
}

func (CalendarEvent) TableName() string {
	return "calendar_events"
}

type CalendarImportRun struct {
	gorm.Model
	OrganizationID string  `json:"organizationId" gorm:"type:varchar(64);not null;index"`
	ScopeKey       string  `json:"scopeKey" gorm:"type:varchar(191);not null;index"`
	ScopeMode      string  `json:"scopeMode" gorm:"type:varchar(32);not null"`
	City           string  `json:"city" gorm:"type:varchar(120)"`
	Country        string  `json:"country" gorm:"type:varchar(120)"`
	Timezone       string  `json:"timezone" gorm:"type:varchar(64)"`
	Source         string  `json:"source" gorm:"type:varchar(64);not null"`
	ImportVersion  string  `json:"importVersion" gorm:"type:varchar(64);not null;uniqueIndex"`
	Status         string  `json:"status" gorm:"type:varchar(32);not null;index"`
	RangeStart     string  `json:"rangeStart" gorm:"type:char(7);not null"`
	RangeEnd       string  `json:"rangeEnd" gorm:"type:char(7);not null"`
	ImportedCount  int     `json:"importedCount" gorm:"default:0"`
	CuratedCount   int     `json:"curatedCount" gorm:"default:0"`
	SnapshotCount  int     `json:"snapshotCount" gorm:"default:0"`
	ErrorMessage   string  `json:"errorMessage" gorm:"type:text"`
	PublishedAt    *string `json:"publishedAt" gorm:"type:varchar(40)"`
	FinishedAt     *string `json:"finishedAt" gorm:"type:varchar(40)"`
}

func (CalendarImportRun) TableName() string {
	return "calendar_import_runs"
}

type CalendarSourceSnapshot struct {
	gorm.Model
	ImportRunID    uint   `json:"importRunId" gorm:"not null;index"`
	OrganizationID string `json:"organizationId" gorm:"type:varchar(64);not null;index"`
	ScopeKey       string `json:"scopeKey" gorm:"type:varchar(191);not null;index"`
	ImportVersion  string `json:"importVersion" gorm:"type:varchar(64);not null;index"`
	Source         string `json:"source" gorm:"type:varchar(64);not null"`
	SourceURL      string `json:"sourceUrl" gorm:"type:text"`
	SnapshotMonth  string `json:"snapshotMonth" gorm:"type:char(7);index"`
	ContentType    string `json:"contentType" gorm:"type:varchar(64)"`
	Payload        string `json:"payload" gorm:"type:text"`
}

func (CalendarSourceSnapshot) TableName() string {
	return "calendar_source_snapshots"
}

type CalendarPublication struct {
	gorm.Model
	OrganizationID     string `json:"organizationId" gorm:"type:varchar(64);not null;index"`
	ScopeKey           string `json:"scopeKey" gorm:"type:varchar(191);not null;index"`
	ScopeMode          string `json:"scopeMode" gorm:"type:varchar(32);not null"`
	City               string `json:"city" gorm:"type:varchar(120)"`
	Country            string `json:"country" gorm:"type:varchar(120)"`
	Timezone           string `json:"timezone" gorm:"type:varchar(64)"`
	Source             string `json:"source" gorm:"type:varchar(64);not null"`
	PublicationVersion string `json:"publicationVersion" gorm:"type:varchar(64);not null;uniqueIndex"`
	ImportRunID        uint   `json:"importRunId" gorm:"not null;index"`
	IsActive           bool   `json:"isActive" gorm:"default:false;index"`
	RangeStart         string `json:"rangeStart" gorm:"type:char(7);not null"`
	RangeEnd           string `json:"rangeEnd" gorm:"type:char(7);not null"`
	EventsCount        int    `json:"eventsCount" gorm:"default:0"`
	LastSuccessAt      string `json:"lastSuccessAt" gorm:"type:varchar(40)"`
	LastError          string `json:"lastError" gorm:"type:text"`
}

func (CalendarPublication) TableName() string {
	return "calendar_publications"
}

type CalendarImportTarget struct {
	gorm.Model
	OrganizationID  string     `json:"organizationId" gorm:"type:varchar(64);not null;index"`
	ScopeKey        string     `json:"scopeKey" gorm:"type:varchar(191);not null;index"`
	ScopeMode       string     `json:"scopeMode" gorm:"type:varchar(32);not null"`
	City            string     `json:"city" gorm:"type:varchar(120)"`
	Country         string     `json:"country" gorm:"type:varchar(120)"`
	Timezone        string     `json:"timezone" gorm:"type:varchar(64)"`
	Source          string     `json:"source" gorm:"type:varchar(32);not null"`
	IsActive        bool       `json:"isActive" gorm:"default:true;index"`
	ImportStatus    string     `json:"importStatus" gorm:"type:varchar(32);not null;default:'missing';index"`
	LastSeenAt      *time.Time `json:"lastSeenAt"`
	LastImportedAt  *time.Time `json:"lastImportedAt"`
	NextImportDueAt *time.Time `json:"nextImportDueAt" gorm:"index"`
	LastError       string     `json:"lastError" gorm:"type:text"`
	LastImportRunID uint       `json:"lastImportRunId" gorm:"default:0"`
}

func (CalendarImportTarget) TableName() string {
	return "calendar_import_targets"
}
