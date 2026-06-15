package handlers

import (
	"context"
	"log"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetVedabaseBookmarks returns the authenticated user's bookmarks (newest first).
func GetVedabaseBookmarks(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var bookmarks []models.UserBookmark
	if err := database.DB.Where("user_id = ?", userID).
		Order("created_at desc").
		Find(&bookmarks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch bookmarks"})
	}

	return c.JSON(bookmarks)
}

// CreateVedabaseBookmark upserts a bookmark for the authenticated user.
func CreateVedabaseBookmark(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		BookCode string `json:"book_code"`
		Canto    int    `json:"canto"`
		Chapter  int    `json:"chapter"`
		Verse    string `json:"verse"`
		Language string `json:"language"`
		BookName string `json:"book_name"`
		Note     string `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.BookCode == "" || body.Verse == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "book_code and verse are required"})
	}
	if body.Language == "" {
		body.Language = "ru"
	}

	bookmark := models.UserBookmark{
		UserID:   userID,
		BookCode: body.BookCode,
		Canto:    body.Canto,
		Chapter:  body.Chapter,
		Verse:    body.Verse,
		Language: body.Language,
		BookName: body.BookName,
		Note:     body.Note,
	}

	// Upsert on the natural key so re-bookmarking the same verse just updates the note.
	if err := database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "book_code"}, {Name: "canto"}, {Name: "chapter"}, {Name: "verse"}},
		DoUpdates: clause.AssignmentColumns([]string{"language", "book_name", "note", "updated_at"}),
	}).Create(&bookmark).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save bookmark"})
	}

	return c.Status(fiber.StatusCreated).JSON(bookmark)
}

// DeleteVedabaseBookmark removes a bookmark owned by the authenticated user.
func DeleteVedabaseBookmark(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")
	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.UserBookmark{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete bookmark"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Bookmark not found"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// GetVedabaseProgress returns reading progress, optionally for a single book (?bookCode=).
func GetVedabaseProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	query := database.DB.Where("user_id = ?", userID)
	if bookCode := c.Query("bookCode"); bookCode != "" {
		var progress models.UserReadingProgress
		if err := query.Where("book_code = ?", bookCode).First(&progress).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.JSON(nil)
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch progress"})
		}
		return c.JSON(progress)
	}

	var progress []models.UserReadingProgress
	if err := query.Order("updated_at desc").Find(&progress).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch progress"})
	}
	return c.JSON(progress)
}

// UpsertVedabaseProgress saves the last-read position for a user/book.
func UpsertVedabaseProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		BookCode string `json:"book_code"`
		Canto    int    `json:"canto"`
		Chapter  int    `json:"chapter"`
		Verse    string `json:"verse"`
		Language string `json:"language"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.BookCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "book_code is required"})
	}
	if body.Language == "" {
		body.Language = "ru"
	}

	progress := models.UserReadingProgress{
		UserID:   userID,
		BookCode: body.BookCode,
		Canto:    body.Canto,
		Chapter:  body.Chapter,
		Verse:    body.Verse,
		Language: body.Language,
	}

	if err := database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "book_code"}},
		DoUpdates: clause.AssignmentColumns([]string{"canto", "chapter", "verse", "language", "updated_at"}),
	}).Create(&progress).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save progress"})
	}

	return c.JSON(progress)
}

// TriggerVedabaseScrape kicks off a background crawl of vedabase.ru into the shared
// Scripture tables. Admin-only. Returns immediately; the crawl runs asynchronously.
func TriggerVedabaseScrape(c *fiber.Ctx) error {
	book := c.Query("book", "bg")

	go func(code string) {
		scraper := services.NewVedabaseScraper(database.DB)
		stats, err := scraper.ScrapeBook(context.Background(), code)
		if err != nil {
			log.Printf("[vedabase] admin-triggered scrape of %q failed: %v", code, err)
			return
		}
		log.Printf("[vedabase] admin-triggered scrape of %q done: %d chapters, %d verses", code, stats.Chapters, stats.Verses)
	}(book)

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"status": "started",
		"book":   book,
	})
}
