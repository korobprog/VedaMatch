package models

import (
	"time"

	"gorm.io/gorm"
)

// Series represents a TV series or multi-episode content
type Series struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Title         string         `gorm:"size:255;not null" json:"title"`
	Description   string         `gorm:"type:text" json:"description"`
	CoverImageURL string         `gorm:"size:500" json:"coverImageURL"`
	Year          int            `json:"year"`
	Genre         string         `gorm:"size:100" json:"genre"`
	Language      string         `gorm:"size:10" json:"language"`
	IsActive      bool           `gorm:"default:true" json:"isActive"`
	IsFeatured    bool           `gorm:"default:false" json:"isFeatured"`
	SortOrder     int            `gorm:"default:0" json:"sortOrder"`
	ViewCount     int            `gorm:"default:0" json:"viewCount"`
	Seasons       []Season       `gorm:"foreignKey:SeriesID" json:"seasons,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// Season represents a season within a series
type Season struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	SeriesID  uint           `gorm:"not null;index" json:"seriesID"`
	Number    int            `gorm:"not null" json:"number"` // Season number: 1, 2, 3...
	Title     string         `gorm:"size:255" json:"title"`  // Optional: "Season 1 - The Beginning"
	SortOrder int            `gorm:"default:0" json:"sortOrder"`
	Episodes  []Episode      `gorm:"foreignKey:SeasonID" json:"episodes,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Episode represents a single episode within a season
type Episode struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	SeasonID     uint           `gorm:"not null;index" json:"seasonID"`
	Number       int            `gorm:"not null" json:"number"` // Episode number: 1, 2, 3...
	Title        string         `gorm:"size:255" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	VideoURL     string         `gorm:"size:500;not null" json:"videoURL"`
	ThumbnailURL string         `gorm:"size:500" json:"thumbnailURL"`
	Duration     int            `json:"duration"` // Duration in seconds
	SortOrder    int            `gorm:"default:0" json:"sortOrder"`
	IsActive     bool           `gorm:"default:true" json:"isActive"`
	ViewCount    int            `gorm:"default:0" json:"viewCount"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName for Series
func (Series) TableName() string {
	return "series"
}

// TableName for Season
func (Season) TableName() string {
	return "seasons"
}

// TableName for Episode
func (Episode) TableName() string {
	return "episodes"
}
