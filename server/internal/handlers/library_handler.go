package handlers

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

// SeeInitialBooks seeds default books if not present
func SeeInitialBooks(c *fiber.Ctx) error {
	var count int64
	database.DB.Model(&models.ScriptureBook{}).Count(&count)
	if count == 0 {
		books := []models.ScriptureBook{
			{Code: "bg", NameEn: "Bhagavad Gita As It Is", NameRu: "Бхагавад-гита", DescriptionEn: "The universal message of Lord Krishna.", DescriptionRu: "Универсальное послание Господа Кришны."},
			{Code: "sb", NameEn: "Srimad Bhagavatam", NameRu: "Шримад Бхагаватам", DescriptionEn: "The ripened fruit of the tree of Vedic knowledge.", DescriptionRu: "Зрелый плод древа ведического знания."},
		}
		database.DB.Create(&books)

		// Seed initial verses
		verses := []models.ScriptureVerse{
			{
				BookCode: "bg", Chapter: 1, Verse: "1",
				Devanagari:  "धृतराष्ट्र उवाच\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥ १ ॥",
				Translation: "Дхритараштра спросил: О Санджая, что сделали мои сыновья и сыновья Панду, когда, горя желанием вступить в бой, собрались в месте паломничества, на поле Курукшетра?",
				Purport:     "Бхагавад-гита — это широко читаемая теистическая наука, обобщенная в Гита-махатмье. Там говорится, что нужно читать Бхагавад-гиту очень внимательно, с помощью человека, который является преданным Господа Кришны.",
			},
			{
				BookCode: "bg", Chapter: 1, Verse: "2",
				Devanagari:  "सञ्जय उवाच\nदृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा ।\nआचार्यमुपसङ्गम्य राजा वचनमब्रवीत् ॥ २ ॥",
				Translation: "Санджая сказал: Оглядев боевые порядки армии сыновей Панду, царь Дурьйодхана подошел к своему учителю и произнес такие слова.",
			},
		}
		database.DB.Create(&verses)
	}
	return c.SendStatus(fiber.StatusOK)
}

// GetLibraryBooks returns a list of all books
func GetLibraryBooks(c *fiber.Ctx) error {
	var count int64
	database.DB.Model(&models.ScriptureBook{}).Count(&count)
	if count == 0 {
		books := []models.ScriptureBook{
			{Code: "bg", NameEn: "Bhagavad Gita As It Is", NameRu: "Бхагавад-гита", DescriptionEn: "The universal message of Lord Krishna.", DescriptionRu: "Универсальное послание Господа Кришны."},
			{Code: "sb", NameEn: "Srimad Bhagavatam", NameRu: "Шримад Бхагаватам", DescriptionEn: "The ripened fruit of the tree of Vedic knowledge.", DescriptionRu: "Зрелый плод древа ведического знания."},
		}
		database.DB.Create(&books)
	}

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

// GetLibraryChapters returns unique chapters/cantos for a book with titles
func GetLibraryChapters(c *fiber.Ctx) error {
	bookCode := c.Params("bookCode")

	type ChapterInfo struct {
		Canto        int    `json:"canto"`
		Chapter      int    `json:"chapter"`
		CantoTitle   string `json:"canto_title"`
		ChapterTitle string `json:"chapter_title"`
	}

	var chapters []ChapterInfo

	// Try fetching from structure tables first (preferred)
	if err := database.DB.Table("scripture_chapters").
		Select("scripture_chapters.canto, scripture_chapters.chapter, "+
			"COALESCE(scripture_cantos.title_ru, scripture_cantos.title_en, '') as canto_title, "+
			"COALESCE(scripture_chapters.title_ru, scripture_chapters.title_en, '') as chapter_title").
		Joins("LEFT JOIN scripture_cantos ON scripture_cantos.book_code = scripture_chapters.book_code AND scripture_cantos.canto = scripture_chapters.canto").
		Where("scripture_chapters.book_code = ?", bookCode).
		Order("scripture_chapters.canto asc, scripture_chapters.chapter asc").
		Scan(&chapters).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch chapters from structure: " + err.Error()})
	}

	// If no structure data found, fallback to scripture_verses (legacy or books being parsed)
	if len(chapters) == 0 {
		database.DB.Table("scripture_verses").
			Select("scripture_verses.canto, scripture_verses.chapter, "+
				"COALESCE(scripture_cantos.title_ru, scripture_cantos.title_en, '') as canto_title, "+
				"COALESCE(scripture_chapters.title_ru, scripture_chapters.title_en, '') as chapter_title").
			Joins("LEFT JOIN scripture_cantos ON scripture_cantos.book_code = scripture_verses.book_code AND scripture_cantos.canto = scripture_verses.canto").
			Joins("LEFT JOIN scripture_chapters ON scripture_chapters.book_code = scripture_verses.book_code AND scripture_chapters.canto = scripture_verses.canto AND scripture_chapters.chapter = scripture_verses.chapter").
			Where("scripture_verses.book_code = ?", bookCode).
			Group("scripture_verses.canto, scripture_verses.chapter, scripture_cantos.title_ru, scripture_cantos.title_en, scripture_chapters.title_ru, scripture_chapters.title_en").
			Order("scripture_verses.canto asc, scripture_verses.chapter asc").
			Scan(&chapters)
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

// ExportLibraryBook returns all verses for a book, optionally filtered by language
func ExportLibraryBook(c *fiber.Ctx) error {
	bookCode := c.Params("bookCode")
	language := c.Query("language") // "ru", "en", or empty for both

	query := database.DB.Model(&models.ScriptureVerse{}).Where("book_code = ?", bookCode)

	if language != "" {
		query = query.Where("language = ?", language)
	}

	var verses []models.ScriptureVerse
	if err := query.Order("canto asc, chapter asc, id asc").Find(&verses).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to export book data"})
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
