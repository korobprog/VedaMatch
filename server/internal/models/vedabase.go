package models

import "time"

// UserBookmark is a per-user saved verse position in a scripture book.
// Synced server-side so bookmarks follow the user across devices/services.
type UserBookmark struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;uniqueIndex:idx_user_bookmark" json:"user_id"`
	BookCode  string    `gorm:"type:varchar(20);uniqueIndex:idx_user_bookmark" json:"book_code"`
	Canto     int       `gorm:"uniqueIndex:idx_user_bookmark" json:"canto"`
	Chapter   int       `gorm:"uniqueIndex:idx_user_bookmark" json:"chapter"`
	Verse     string    `gorm:"type:varchar(20);uniqueIndex:idx_user_bookmark" json:"verse"`
	Language  string    `gorm:"type:varchar(10);default:'ru'" json:"language"`
	BookName  string    `gorm:"type:varchar(255)" json:"book_name"`
	Note      string    `gorm:"type:text" json:"note"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserReadingProgress stores the last-read position per user per book (upserted).
type UserReadingProgress struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"uniqueIndex:idx_user_progress" json:"user_id"`
	BookCode  string    `gorm:"type:varchar(20);uniqueIndex:idx_user_progress" json:"book_code"`
	Canto     int       `json:"canto"`
	Chapter   int       `json:"chapter"`
	Verse     string    `gorm:"type:varchar(20)" json:"verse"`
	Language  string    `gorm:"type:varchar(10);default:'ru'" json:"language"`
	UpdatedAt time.Time `json:"updated_at"`
}
