package handlers

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

// GetLibraryBooks returns a list of all books
func GetLibraryBooks(c *fiber.Ctx) error {
	var books []models.ScriptureBook
	if err := database.DB.Order("id asc").Find(&books).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch books"})
	}
	return c.JSON(books)
}

// GetLibraryBookDetails returns details of a book, including chapters (or cantos if applicable)
// For now, we just return book metadata. Frontend can ask for chapters separate or we aggregate.
func GetLibraryBookDetails(c *fiber.Ctx) error {
	bookID := c.Params("id")
	var book models.ScriptureBook

	// Try finding by ID first, then by Code
	if err := database.DB.Where("id = ?", bookID).First(&book).Error; err != nil {
		if err := database.DB.Where("code = ?", bookID).First(&book).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Book not found"})
		}
	}

	return c.JSON(book)
}

// GetLibraryChapters returns unique chapters/cantos for a book
func GetLibraryChapters(c *fiber.Ctx) error {
	bookCode := c.Params("bookCode")

	// We might need to group by Canto and Chapter
	type ChapterInfo struct {
		Canto   int `json:"canto"`
		Chapter int `json:"chapter"`
	}

	var chapters []ChapterInfo

	if err := database.DB.Model(&models.ScriptureVerse{}).
		Where("book_code = ?", bookCode).
		Distinct("canto", "chapter").
		Order("canto asc, chapter asc").
		Find(&chapters).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch chapters"})
	}

	return c.JSON(chapters)
}

// GetLibraryVerses returns verses for a book/chapter
func GetLibraryVerses(c *fiber.Ctx) error {
	bookCode := c.Query("bookCode")
	chapter := c.Query("chapter")
	canto := c.Query("canto")

	query := database.DB.Model(&models.ScriptureVerse{})

	if bookCode != "" {
		query = query.Where("book_code = ?", bookCode)
	}
	if chapter != "" {
		query = query.Where("chapter = ?", chapter)
	}
	if canto != "" {
		query = query.Where("canto = ?", canto)
	}
	language := c.Query("language")

	if language != "" {
		query = query.Where("language = ?", language)
	}

	var verses []models.ScriptureVerse
	if err := query.Order("id asc").Find(&verses).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch verses"})
	}

	return c.JSON(verses)
}

// SearchLibrary searches through verses
func SearchLibrary(c *fiber.Ctx) error {
	q := c.Query("q")
	if q == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query parameter 'q' is required"})
	}

	var verses []models.ScriptureVerse
	// Search in translation, synonym, purport, etc.
	searchTerm := "%" + q + "%"
	if err := database.DB.Where(
		"translation ILIKE ? OR purport ILIKE ? OR synonyms ILIKE ?",
		searchTerm, searchTerm, searchTerm,
	).Limit(50).Find(&verses).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Search failed"})
	}

	return c.JSON(verses)
}
