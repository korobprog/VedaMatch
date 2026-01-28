package models

import (
	"time"
)

type ScriptureBook struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Code          string    `gorm:"type:varchar(20);uniqueIndex" json:"code"`
	NameEn        string    `gorm:"type:varchar(255)" json:"name_en"`
	NameRu        string    `gorm:"type:varchar(255)" json:"name_ru"`
	DescriptionEn string    `gorm:"type:text" json:"description_en"`
	DescriptionRu string    `gorm:"type:text" json:"description_ru"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ScriptureCanto struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	BookCode  string    `gorm:"type:varchar(20);index" json:"book_code"`
	Canto     int       `gorm:"index" json:"canto"`
	TitleEn   string    `gorm:"type:varchar(255)" json:"title_en"`
	TitleRu   string    `gorm:"type:varchar(255)" json:"title_ru"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ScriptureChapter struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	BookCode  string    `gorm:"type:varchar(20);index" json:"book_code"`
	Canto     int       `gorm:"index" json:"canto"`
	Chapter   int       `gorm:"index" json:"chapter"`
	TitleEn   string    `gorm:"type:varchar(255)" json:"title_en"`
	TitleRu   string    `gorm:"type:varchar(255)" json:"title_ru"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ScriptureVerse struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	BookCode        string        `gorm:"type:varchar(20);index" json:"book_code"`
	Book            ScriptureBook `gorm:"foreignKey:BookCode;references:Code" json:"book,omitempty"`
	Canto           int           `gorm:"index" json:"canto"`
	Chapter         int           `gorm:"index" json:"chapter"`
	Verse           string        `gorm:"type:varchar(20);index" json:"verse"`
	Language        string        `gorm:"type:varchar(10);default:'en'" json:"language"`
	Devanagari      string        `gorm:"type:text" json:"devanagari"`
	Transliteration string        `gorm:"type:text" json:"transliteration"`
	Synonyms        string        `gorm:"type:text" json:"synonyms"`
	Translation     string        `gorm:"type:text" json:"translation"`
	Purport         string        `gorm:"type:text" json:"purport"`
	SourceURL       string        `gorm:"type:text" json:"source_url"`
	VerseReference  string        `gorm:"type:varchar(50)" json:"verse_reference"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}
