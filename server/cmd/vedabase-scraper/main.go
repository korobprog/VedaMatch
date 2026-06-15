package main

import (
	"context"
	"flag"
	"log"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/services"

	"github.com/joho/godotenv"
)

// Standalone crawler that populates the shared Scripture* tables from vedabase.ru.
//
//	go run ./cmd/vedabase-scraper --book=bg
//	go run ./cmd/vedabase-scraper --book=sb --delay=1s
func main() {
	bookFlag := flag.String("book", "bg", "book code(s) to scrape, comma-separated (e.g. bg,sb)")
	delayFlag := flag.Duration("delay", 750*time.Millisecond, "delay between requests (politeness throttle)")
	flag.Parse()

	// Load .env if present (mirrors the API server bootstrap).
	_ = godotenv.Load()

	database.Connect()

	scraper := services.NewVedabaseScraper(database.DB)
	scraper.SetDelay(*delayFlag)

	ctx := context.Background()
	codes := strings.Split(*bookFlag, ",")
	for _, raw := range codes {
		code := strings.TrimSpace(raw)
		if code == "" {
			continue
		}
		log.Printf("[vedabase] scraping book %q ...", code)
		start := time.Now()
		stats, err := scraper.ScrapeBook(ctx, code)
		if err != nil {
			log.Printf("[vedabase] book %q failed after %s: %v", code, time.Since(start).Round(time.Second), err)
			continue
		}
		log.Printf("[vedabase] book %q done in %s: %d chapters, %d verses",
			code, time.Since(start).Round(time.Second), stats.Chapters, stats.Verses)
	}
}
