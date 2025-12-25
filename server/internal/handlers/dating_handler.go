package handlers

import (
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"time"

	"regexp"

	"github.com/gofiber/fiber/v2"
)

type DatingHandler struct {
	aiService *services.AiChatService
}

func NewDatingHandler(aiService *services.AiChatService) *DatingHandler {
	return &DatingHandler{
		aiService: aiService,
	}
}

func (h *DatingHandler) GetCandidates(c *fiber.Ctx) error {
	var candidates []models.User
	query := database.DB.Where("dating_enabled = ? AND is_profile_complete = ?", true, true)

	// Simple filtering
	// Parse query params
	gender := c.Query("gender")
	city := c.Query("city")
	madh := c.Query("madh")
	minAge := c.QueryInt("minAge", 0)
	maxAge := c.QueryInt("maxAge", 0)
	userID := c.Query("userId")

	// Get current user to determine opposite gender default
	var currentUser models.User
	if userID != "" {
		if err := database.DB.First(&currentUser, userID).Error; err == nil {
			// If no gender specified, default to opposite
			if gender == "" {
				if currentUser.Gender == "Male" {
					gender = "Female"
				} else if currentUser.Gender == "Female" {
					gender = "Male"
				}
			}
			// Exclude the user themselves
			query = query.Where("id != ?", userID)
		}
	}

	// Apply Gender Filter
	if gender != "" {
		query = query.Where("gender = ?", gender)
	}

	// Apply City Filter
	if city != "" {
		// Case insensitive search might be better, but exact match for now as per previous code
		query = query.Where("city = ?", city)
	}

	// Apply Madh Filter
	if madh != "" {
		query = query.Where("madh = ?", madh)
	}

	// Apply Age Filter (assuming Dob is YYYY-MM-DD or compatible string)
	// We need to calculate date thresholds.
	// Older people have smaller Dob strings.
	// MinAge 20 => Born BEFORE (Today - 20 years) => Dob <= Date(Today - 20)
	// MaxAge 30 => Born AFTER (Today - 30 years)  => Dob >= Date(Today - 30)

	now := time.Now()

	if minAge > 0 {
		// Example: 2024 - 20 = 2004. Limit: 2004-12-25.
		// User born 2004-12-24 (Age 20) => "2004-12-24" <= "2004-12-25" (True)
		limitDate := now.AddDate(-minAge, 0, 0).Format("2006-01-02")
		query = query.Where("dob <= ?", limitDate)
	}

	if maxAge > 0 {
		// Example: 2024 - 30 = 1994. Limit: 1994-12-25.
		// User born 1995-01-01 (Age 29) => "1995-01-01" >= "1994-12-25" (True)
		// User born 1990-01-01 (Age 34) => "1990-01-01" >= "1994-12-25" (False)
		// We usually want inclusive for the whole year, but exact date is finer.
		// Let's use exact date for simplicity.
		// Actually standard age calculation:
		// Age = 30 means born between [Now-31, Now-30).
		// Let's stick to simple "At most X years old" => Born after Now - (X+1) years?
		// If MaxAge is 30, we want everyone who hasn't turned 31 yet.
		// So born AFTER (Now - 31 years).
		limitDate := now.AddDate(-(maxAge + 1), 0, 0).Format("2006-01-02")
		query = query.Where("dob > ?", limitDate)
	}

	if err := query.Find(&candidates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch candidates",
		})
	}

	return c.JSON(candidates)
}

func (h *DatingHandler) GetCompatibility(c *fiber.Ctx) error {
	userIDStr := c.Params("userId")
	candidateIDStr := c.Params("candidateId")

	var userID, candidateID uint
	fmt.Sscanf(userIDStr, "%d", &userID)
	fmt.Sscanf(candidateIDStr, "%d", &candidateID)

	// Check cache first
	var cached models.DatingCompatibility
	if err := database.DB.Where("user_id = ? AND candidate_id = ?", userID, candidateID).First(&cached).Error; err == nil {
		return c.JSON(fiber.Map{
			"compatibility": cached.CompatibilityText,
		})
	}

	var user, candidate models.User
	if err := database.DB.First(&user, userIDStr).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	if err := database.DB.First(&candidate, candidateIDStr).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Candidate not found"})
	}

	if h.aiService == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "AI service not available"})
	}

	prompt := fmt.Sprintf(`Ты — потомственный ведический астролог (Джйотиш).
Твоя задача — дать глубокий, но лаконичный анализ совместимости для %s.

Важное правило: Обращайся к вопрошающему и партнеру на "Вы". Пиши "Ваш союз", "Ваша совместимость", "Вам". Не используй третье лицо ("Их союз", "У них").

Структура ответа (начинай СРАЗУ с пункта 1, без приветствия):
1. **Астрологический срез**: Кратко (2-3 предложения) опиши ВАШ союз через призму 7-го дома (партнерство) и лунных знаков (Раши). Упомяни синастрию (Куты) и накшатры, если это уместно.
2. **Благословение звезд**: Ваша совместимость по гунам и варнам.
3. **Гармония сердец**: Как ваше служение дополняет друг друга 🪷.
4. **Практические советы**: 2-3 важных совета для развития ваших отношений, методов упай (коррекции) 📿.
5. **Заключение**: Теплое пожелание вам ❤️.

Используй термины джйотиш (Бхава, Раши, Накшатра) профессионально, но понятно.
ОБЯЗАТЕЛЬНО начни ответ сразу с текста анализа. НЕ пиши приветствие, оно будет добавлено автоматически.
СТРОГО ЗАПРЕЩЕНО: Не генерируй аудио, ссылки или HTML-теги. ТОЛЬКО ТЕКСТ. Не используй TTS.

Данные для анализа:
---
ПОЛЬЗОВАТЕЛЬ 1 (Кандидат):
- Духовное имя: %s
- Интересы: %s
- Традиция: %s
- Дата рождения: %s
- Время рождения: %s
- Место рождения: %s
- О себе: %s

ПОЛЬЗОВАТЕЛЬ 2 (Партнер):
- Духовное имя: %s
- Интересы: %s
- Традиция: %s
- Дата рождения: %s
- Время рождения: %s
- Место рождения: %s
- О себе: %s
---`,
		user.SpiritualName,
		user.SpiritualName, user.Interests, user.Madh, user.Dob, user.BirthTime, user.BirthPlaceLink, user.Bio,
		candidate.SpiritualName, candidate.Interests, candidate.Madh, candidate.Dob, candidate.BirthTime, candidate.BirthPlaceLink, candidate.Bio)

	resp, err := h.aiService.GenerateSimpleResponse(prompt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Clean up response from potential hallucinations (audio tags, etc.)
	// This removes <audio ...> tags and any lines starting with http
	compatibilityAI := cleanResponse(resp)

	// Manually prepend the greeting to ensure it's never truncated
	greeting := fmt.Sprintf("Харе Кришна, дорогой %s! 🌟\n\n", user.SpiritualName)
	compatibility := greeting + compatibilityAI

	// Save to cache
	newCache := models.DatingCompatibility{
		UserID:            userID,
		CandidateID:       candidateID,
		CompatibilityText: compatibility,
	}
	database.DB.Create(&newCache)

	return c.JSON(fiber.Map{
		"compatibility": compatibility,
	})
}

func (h *DatingHandler) UpdateDatingProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update profile"})
	}

	return c.JSON(user)
}

func (h *DatingHandler) AddToFavorites(c *fiber.Ctx) error {
	var body struct {
		UserID             uint   `json:"userId"`
		CandidateID        uint   `json:"candidateId"`
		CompatibilityScore string `json:"compatibilityScore"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	favorite := models.DatingFavorite{
		UserID:             body.UserID,
		CandidateID:        body.CandidateID,
		CompatibilityScore: body.CompatibilityScore,
	}

	if err := database.DB.Create(&favorite).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not add to favorites"})
	}

	return c.Status(fiber.StatusCreated).JSON(favorite)
}

func (h *DatingHandler) GetFavorites(c *fiber.Ctx) error {
	userID := c.Query("userId")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "userId is required"})
	}

	var favorites []models.DatingFavorite
	if err := database.DB.Preload("Candidate").Where("user_id = ?", userID).Find(&favorites).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch favorites"})
	}

	return c.JSON(favorites)
}

func (h *DatingHandler) RemoveFromFavorites(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := database.DB.Delete(&models.DatingFavorite{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not remove from favorites"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func cleanResponse(resp string) string {
	// Remove <audio> tags
	reAudio := regexp.MustCompile(`<audio.*?>.*?</audio>`)
	resp = reAudio.ReplaceAllString(resp, "")

	// Remove any remaining HTML tags to be safe (except maybe formatting like bold/italics if using markdown)
	// Actually we want markdown, so let's stick to specific removals
	reHtml := regexp.MustCompile(`<[^>]*>`)
	resp = reHtml.ReplaceAllString(resp, "")

	return resp
}

func (h *DatingHandler) GetDatingCities(c *fiber.Ctx) error {
	var cities []string
	// Fetch distinct cities where dating is enabled and profile is complete
	// We want only non-empty cities
	if err := database.DB.Model(&models.User{}).
		Where("dating_enabled = ? AND is_profile_complete = ? AND city != ?", true, true, "").
		Distinct("city").
		Pluck("city", &cities).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch cities"})
	}

	return c.JSON(cities)
}
