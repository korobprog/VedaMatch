package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type ScriptureChapter struct {
	BookCode string
	Canto    int
	Chapter  int
	TitleEn  string
	TitleRu  string
}

func main() {
	dsn := "host=localhost user=raguser password=ragpassword dbname=ragdb port=5435 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var chapters []ScriptureChapter
	db.Table("scripture_chapters").Where("book_code = ? AND canto = ?", "sb", 1).Order("chapter asc").Limit(20).Find(&chapters)

	fmt.Println("--- SB Canto 1 Chapters ---")
	for _, ch := range chapters {
		fmt.Printf("Ch %d: %s\n", ch.Chapter, ch.TitleRu)
	}
}
