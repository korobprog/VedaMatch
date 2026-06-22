package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DatingHandler struct {
	aiService       *services.AiChatService
	domainAssistant *services.DomainAssistantService
	lifecycle       *services.DatingLifecycleService
}

func parsePositiveUint(raw string) (uint, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, errors.New("value is required")
	}

	parsed, err := strconv.ParseUint(raw, 10, 32)
	if err != nil || parsed == 0 {
		return 0, errors.New("invalid positive uint")
	}
	return uint(parsed), nil
}

func requireDatingUserID(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	return userID, nil
}

func NewDatingHandler(aiService *services.AiChatService) *DatingHandler {
	return &DatingHandler{
		aiService:       aiService,
		domainAssistant: services.GetDomainAssistantService(),
		lifecycle:       services.NewDatingLifecycleService(database.DB, aiService),
	}
}

func buildSynastryRAGQuery(user models.User, candidate models.User) string {
	userName := strings.TrimSpace(firstNonEmptyDating(user.SpiritualName, user.KarmicName))
	candidateName := strings.TrimSpace(firstNonEmptyDating(candidate.SpiritualName, candidate.KarmicName))

	return strings.TrimSpace(fmt.Sprintf(
		`ведическая астрология джйотиш синастрия совместимость
критерии: гуна милан, варна, накшатры, раши, 7 дом, упай, семейная гармония
профиль A: %s, дата рождения %s, время %s, место %s, традиция %s, интересы %s
профиль B: %s, дата рождения %s, время %s, место %s, традиция %s, интересы %s`,
		userName, strings.TrimSpace(user.Dob), strings.TrimSpace(user.BirthTime), strings.TrimSpace(user.BirthPlaceLink), strings.TrimSpace(user.Madh), strings.TrimSpace(user.Interests),
		candidateName, strings.TrimSpace(candidate.Dob), strings.TrimSpace(candidate.BirthTime), strings.TrimSpace(candidate.BirthPlaceLink), strings.TrimSpace(candidate.Madh), strings.TrimSpace(candidate.Interests),
	))
}

func buildSynastryRAGBlock(ctxResp *services.DomainContextResponse) string {
	if ctxResp == nil || len(ctxResp.Sources) == 0 {
		return ""
	}

	limit := 5
	if len(ctxResp.Sources) < limit {
		limit = len(ctxResp.Sources)
	}

	var b strings.Builder
	b.WriteString("RAG-контекст по ведическим источникам:\n")
	for i := 0; i < limit; i++ {
		src := ctxResp.Sources[i]
		title := strings.TrimSpace(src.Title)
		if title == "" {
			title = fmt.Sprintf("%s/%s", src.Domain, src.SourceType)
		}
		b.WriteString(fmt.Sprintf("[%d] %s: %s\n", i+1, title, strings.TrimSpace(src.Snippet)))
	}
	b.WriteString("Используйте контекст как справку по терминам и принципам, но анализ делайте персонально по данным двух профилей.")

	return strings.TrimSpace(b.String())
}

func firstNonEmptyDating(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func (h *DatingHandler) GetCandidates(c *fiber.Ctx) error {
	var candidates []models.User
	query := database.DB.
		Preload("Photos").
		Preload("DatingSocialLinks").
		Preload("DatingPosts", func(db *gorm.DB) *gorm.DB {
			return db.Where("status = ?", models.DatingPostActive).Order("created_at DESC").Limit(3)
		}).
		Where("dating_enabled = ? AND is_profile_complete = ? AND dating_publication_status = ?", true, true, string(models.DatingPublicationPublished))

	// Simple filtering
	// Parse query params
	gender := c.Query("gender")
	city := c.Query("city")
	madh := c.Query("madh")
	yogaStyle := c.Query("yogaStyle")
	guna := c.Query("guna")
	identity := c.Query("identity")
	childrenIntent := c.Query("childrenIntent")
	loveLanguage := c.Query("loveLanguage")
	element := c.Query("element")
	meetingPreference := c.Query("meetingPreference")
	mode := c.Query("mode", "family") // family, business, friendship, seva
	isNew := c.QueryBool("isNew", false)
	skills := c.Query("skills")
	industry := c.Query("industry")
	minAge := c.QueryInt("minAge", 0)
	maxAge := c.QueryInt("maxAge", 0)
	userID := strings.TrimSpace(c.Query("userId"))

	// Apply mode filter
	if mode != "" {
		query = query.Where("intentions ILIKE ?", "%"+mode+"%")
	}

	// Apply skills and industry for business mode
	if skills != "" {
		query = query.Where("skills ILIKE ?", "%"+skills+"%")
	}
	if industry != "" {
		query = query.Where("industry ILIKE ?", "%"+industry+"%")
	}

	// Get current user to determine opposite gender default for family mode
	var currentUser models.User
	if userID != "" {
		if parsedUserID, parseErr := parsePositiveUint(userID); parseErr == nil {
			if err := database.DB.First(&currentUser, parsedUserID).Error; err == nil {
				// If no gender specified, default to opposite ONLY in family mode
				if gender == "" && mode == "family" {
					switch currentUser.Gender {
					case "Male":
						gender = "Female"
					case "Female":
						gender = "Male"
					}
				}
				// Exclude the user themselves
				query = query.Where("id != ?", parsedUserID)
			}
		}
	}

	// Apply Gender Filter - usually relevant for family, but might be for others too
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

	if yogaStyle != "" {
		query = query.Where("yoga_style = ?", yogaStyle)
	}

	if guna != "" {
		query = query.Where("guna = ?", guna)
	}

	if identity != "" {
		query = query.Where("identity = ?", identity)
	}
	if childrenIntent != "" {
		query = query.Where("children_intent = ?", childrenIntent)
	}
	if loveLanguage != "" {
		query = query.Where("love_languages ILIKE ?", "%"+loveLanguage+"%")
	}
	if element != "" {
		query = query.Where("elemental_primary = ? OR elemental_secondary = ?", element, element)
	}
	if meetingPreference != "" {
		query = query.Where("meeting_preferences ILIKE ?", "%"+meetingPreference+"%")
	}

	// Apply Age Filter (assuming Dob is YYYY-MM-DD or compatible string)
	// We need to calculate date thresholds.
	// Older people have smaller Dob strings.
	// MinAge 20 => Born BEFORE (Today - 20 years) => Dob <= Date(Today - 20)
	// MaxAge 30 => Born AFTER (Today - 30 years)  => Dob >= Date(Today - 30)

	now := time.Now().UTC()
	if isNew {
		twentyFourHoursAgo := now.Add(-24 * time.Hour)
		query = query.Where("created_at > ?", twentyFourHoursAgo)
	}

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

	if currentUser.ID != 0 {
		services.SortUsersByDatingScore(&currentUser, candidates)
	}

	return c.JSON(candidates)
}

func (h *DatingHandler) GetCompatibility(c *fiber.Ctx) error {
	userID, err := parsePositiveUint(c.Params("userId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	candidateID, err := parsePositiveUint(c.Params("candidateId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid candidate ID"})
	}
	if userID == candidateID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot calculate compatibility with yourself"})
	}

	// Check cache first
	var cached models.DatingCompatibility
	if err := database.DB.Where("user_id = ? AND candidate_id = ?", userID, candidateID).Order("created_at DESC").First(&cached).Error; err == nil {
		lowerCached := strings.ToLower(strings.TrimSpace(cached.CompatibilityText))
		if !strings.Contains(lowerCached, "не найдено достаточно данных") {
			return c.JSON(fiber.Map{
				"compatibility": cached.CompatibilityText,
			})
		}
	}

	var user, candidate models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	if err := database.DB.First(&candidate, candidateID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Candidate not found"})
	}

	if h.aiService == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "AI service not available"})
	}

	var ragCtx *services.DomainContextResponse
	if h.domainAssistant != nil &&
		h.domainAssistant.IsDomainAssistantEnabled() &&
		h.domainAssistant.IsHybridEnabled() {
		ctxResp, ragErr := h.domainAssistant.BuildAssistantContext(c.Context(), services.DomainContextRequest{
			Query:          buildSynastryRAGQuery(user, candidate),
			Domains:        []string{"library", "dating"},
			TopK:           6,
			UserID:         userID,
			IncludePrivate: true,
			StrictRouting:  false,
		})
		if ragErr == nil && ctxResp != nil && len(ctxResp.Sources) > 0 {
			ragCtx = ctxResp
		}
	}
	ragBlock := buildSynastryRAGBlock(ragCtx)

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
Если точных данных рождения недостаточно для строгого расчета, явно обозначь ограничение и дай вероятностный практичный разбор.
НЕ отвечай одной фразой "не найдено достаточно данных".
СТРОГО ЗАПРЕЩЕНО: Не генерируй аудио, ссылки или HTML-теги. ТОЛЬКО ТЕКСТ. Не используй TTS.

Данные для анализа:
---
ПОЛЬЗОВАТЕЛЬ 1 (Вы):
- Духовное имя: %s
- Интересы: %s
- Традиция: %s
- Дата рождения: %s
- Время рождения: %s
- Место рождения: %s
- О себе: %s

ПОЛЬЗОВАТЕЛЬ 2 (Кандидат):
- Духовное имя: %s
- Интересы: %s
- Традиция: %s
- Дата рождения: %s
- Время рождения: %s
- Место рождения: %s
- О себе: %s
---

%s`,
		user.SpiritualName,
		user.SpiritualName, user.Interests, user.Madh, user.Dob, user.BirthTime, user.BirthPlaceLink, user.Bio,
		candidate.SpiritualName, candidate.Interests, candidate.Madh, candidate.Dob, candidate.BirthTime, candidate.BirthPlaceLink, candidate.Bio,
		ragBlock)

	resp, err := h.aiService.GeneratePromptOnlyResponse(prompt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Clean up response from potential hallucinations (audio tags, etc.)
	// This removes <audio ...> tags and any lines starting with http
	compatibilityAI := cleanResponse(resp)
	if h.domainAssistant != nil && ragCtx != nil && len(ragCtx.Sources) > 0 {
		compatibilityAI = h.domainAssistant.AppendSources(compatibilityAI, ragCtx)
	}

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
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	userID := c.Params("id")
	paramUserID, parseErr := strconv.ParseUint(userID, 10, 32)
	if parseErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	if uint(paramUserID) != authUserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	var payload map[string]interface{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	updateMap := make(map[string]interface{})
	stringFields := map[string]string{
		"bio":                     "bio",
		"interests":               "interests",
		"lookingFor":              "looking_for",
		"maritalStatus":           "marital_status",
		"dob":                     "dob",
		"birthTime":               "birth_time",
		"birthPlaceLink":          "birth_place_link",
		"city":                    "city",
		"madh":                    "madh",
		"yogaStyle":               "yoga_style",
		"guna":                    "guna",
		"identity":                "identity",
		"skills":                  "skills",
		"industry":                "industry",
		"lookingForBusiness":      "looking_for_business",
		"childrenIntent":          "children_intent",
		"elementalPrimary":        "elemental_primary",
		"elementalSecondary":      "elemental_secondary",
		"datingPublicationStatus": "dating_publication_status",
		"datingStatusReason":      "dating_status_reason",
	}
	for jsonKey, column := range stringFields {
		if value, ok := payload[jsonKey]; ok {
			updateMap[column] = strings.TrimSpace(fmt.Sprintf("%v", value))
		}
	}

	csvFields := map[string]string{
		"intentions":         "intentions",
		"loveLanguages":      "love_languages",
		"meetingPreferences": "meeting_preferences",
	}
	for jsonKey, column := range csvFields {
		if raw, ok := payload[jsonKey]; ok {
			switch typed := raw.(type) {
			case []interface{}:
				values := make([]string, 0, len(typed))
				for _, item := range typed {
					values = append(values, fmt.Sprintf("%v", item))
				}
				updateMap[column] = strings.Join(values, ",")
			default:
				updateMap[column] = strings.TrimSpace(fmt.Sprintf("%v", raw))
			}
		}
	}
	if raw, ok := payload["datingEnabled"]; ok {
		if typed, ok := raw.(bool); ok {
			updateMap["dating_enabled"] = typed
		}
	}
	if raw, ok := payload["isProfileComplete"]; ok {
		if typed, ok := raw.(bool); ok {
			updateMap["is_profile_complete"] = typed
		}
	}

	if len(updateMap) == 0 {
		if err := h.lifecycle.LoadProfileRelations(&user); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load profile"})
		}
		return c.JSON(user)
	}

	if err := database.DB.Model(&user).Updates(updateMap).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update profile"})
	}
	if socialLinksRaw, ok := payload["socialLinks"]; ok {
		var links []models.DatingSocialLink
		rawJSON, _ := json.Marshal(socialLinksRaw)
		if err := json.Unmarshal(rawJSON, &links); err == nil {
			if err := h.lifecycle.SaveSocialLinks(user.ID, links); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update social links"})
			}
		}
	}
	if err := h.lifecycle.LoadProfileRelations(&user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load updated profile"})
	}

	return c.JSON(user)
}

func (h *DatingHandler) AddToFavorites(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}

	var body struct {
		UserID             uint   `json:"userId"`
		CandidateID        uint   `json:"candidateId"`
		CompatibilityScore string `json:"compatibilityScore"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	body.UserID = authUserID
	if body.CandidateID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "candidateId is required"})
	}
	if body.CandidateID == body.UserID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot favorite yourself"})
	}

	var candidate models.User
	if err := database.DB.Select("id").First(&candidate, body.CandidateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Candidate not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load candidate"})
	}

	var existing models.DatingFavorite
	if err := database.DB.Where("user_id = ? AND candidate_id = ?", body.UserID, body.CandidateID).First(&existing).Error; err == nil {
		return c.JSON(existing)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check favorites"})
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
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}

	var favorites []models.DatingFavorite
	if err := database.DB.Preload("Candidate").Preload("Candidate.Photos").Where("user_id = ?", authUserID).Find(&favorites).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch favorites"})
	}

	return c.JSON(favorites)
}

func (h *DatingHandler) GetDatingProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	var user models.User
	if err := database.DB.Preload("Photos").Preload("DatingSocialLinks").Preload("DatingPosts", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	return c.JSON(user)
}

func (h *DatingHandler) RemoveFromFavorites(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	id := c.Params("id")

	var favorite models.DatingFavorite
	if err := database.DB.First(&favorite, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Favorite not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load favorite"})
	}
	if favorite.UserID != authUserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	if err := database.DB.Delete(&favorite).Error; err != nil {
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

	// Remove lines that start with URLs.
	lines := strings.Split(resp, "\n")
	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
			continue
		}
		filtered = append(filtered, line)
	}

	return strings.TrimSpace(strings.Join(filtered, "\n"))
}

func (h *DatingHandler) GetDatingCities(c *fiber.Ctx) error {
	var cities []string
	if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND dating_publication_status = ? AND city != ?", true, string(models.DatingPublicationPublished), "").Distinct().Pluck("city", &cities).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch cities"})
	}
	return c.JSON(cities)
}

func (h *DatingHandler) GetDatingStats(c *fiber.Ctx) error {
	var totalCount int64
	var cityCount int64
	var newCount int64

	city := strings.TrimSpace(c.Query("city"))

	// Total active dating profiles
	if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND dating_publication_status = ?", true, string(models.DatingPublicationPublished)).Count(&totalCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch total stats"})
	}

	// Profiles in specific city
	if city != "" {
		if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND dating_publication_status = ? AND city = ?", true, string(models.DatingPublicationPublished), city).Count(&cityCount).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch city stats"})
		}
	}

	// New profiles in last 24h
	twentyFourHoursAgo := time.Now().UTC().Add(-24 * time.Hour)
	if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND dating_publication_status = ? AND created_at > ?", true, string(models.DatingPublicationPublished), twentyFourHoursAgo).Count(&newCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch new stats"})
	}

	return c.JSON(fiber.Map{
		"total": totalCount,
		"city":  cityCount,
		"new":   newCount,
	})
}

// GetFavoriteCount returns how many people added this profile to favorites
func (h *DatingHandler) GetFavoriteCount(c *fiber.Ctx) error {
	userID, err := parsePositiveUint(c.Params("userId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "userId is required"})
	}

	var count int64
	if err := database.DB.Model(&models.DatingFavorite{}).Where("candidate_id = ?", userID).Count(&count).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not count favorites"})
	}

	return c.JSON(fiber.Map{
		"count": count,
	})
}

// GetWhoLikedMe returns users who added you to their favorites
func (h *DatingHandler) GetWhoLikedMe(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}

	var favorites []models.DatingFavorite
	if err := database.DB.Where("candidate_id = ?", authUserID).Find(&favorites).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch likes"})
	}

	likerIDs := make([]uint, 0, len(favorites))
	seen := make(map[uint]struct{}, len(favorites))
	for _, fav := range favorites {
		if _, ok := seen[fav.UserID]; ok {
			continue
		}
		seen[fav.UserID] = struct{}{}
		likerIDs = append(likerIDs, fav.UserID)
	}
	if len(likerIDs) == 0 {
		return c.JSON([]models.User{})
	}

	var users []models.User
	if err := database.DB.Preload("Photos").Where("id IN ?", likerIDs).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load users"})
	}

	return c.JSON(users)
}

// CheckIsFavorited checks if current user has favorited a candidate
func (h *DatingHandler) CheckIsFavorited(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	candidateID, err := parsePositiveUint(c.Query("candidateId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "candidateId is required"})
	}

	var count int64
	database.DB.Model(&models.DatingFavorite{}).Where("user_id = ? AND candidate_id = ?", authUserID, candidateID).Count(&count)

	return c.JSON(fiber.Map{
		"isFavorited": count > 0,
	})
}

func (h *DatingHandler) GetNotifications(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	var events []models.DatingModerationEvent
	if err := database.DB.Where("user_id = ?", authUserID).Order("created_at DESC").Limit(20).Find(&events).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load notifications"})
	}
	var user models.User
	if err := database.DB.First(&user, authUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	state, err := h.lifecycle.GetPublicationState(&user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load publication state"})
	}
	return c.JSON(fiber.Map{
		"publication": state,
		"events":      events,
	})
}

func (h *DatingHandler) SubmitDatingProfile(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	paramUserID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	if paramUserID != authUserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	var user models.User
	if err := database.DB.First(&user, authUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	state, err := h.lifecycle.SubmitProfile(context.Background(), &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(state)
}

func (h *DatingHandler) GetPublicationStatus(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	paramUserID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	if paramUserID != authUserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	var user models.User
	if err := database.DB.First(&user, authUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	state, err := h.lifecycle.GetPublicationState(&user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load publication status"})
	}
	return c.JSON(state)
}

func (h *DatingHandler) GetProfileApprovals(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	paramUserID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	if paramUserID != authUserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	approvals, err := h.lifecycle.ListApprovals(authUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load approvals"})
	}
	var friendRelations []models.Friend
	if err := database.DB.Where("user_id = ?", authUserID).Find(&friendRelations).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load friends"})
	}
	friendIDs := make([]uint, 0, len(friendRelations))
	for _, relation := range friendRelations {
		friendIDs = append(friendIDs, relation.FriendID)
	}
	var friends []models.User
	if len(friendIDs) > 0 {
		if err := database.DB.Select("id", "karmic_name", "spiritual_name", "avatar_url", "city").Where("id IN ?", friendIDs).Find(&friends).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load friends"})
		}
	}
	var user models.User
	if err := database.DB.First(&user, authUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	state, err := h.lifecycle.GetPublicationState(&user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load publication state"})
	}
	return c.JSON(fiber.Map{
		"approvals":   approvals,
		"friends":     friends,
		"publication": state,
	})
}

func (h *DatingHandler) GetIncomingApprovalRequests(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	statusFilter := strings.TrimSpace(c.Query("status"))
	countOnly := c.QueryBool("countOnly", false)
	if statusFilter != "" {
		switch models.DatingApprovalStatus(statusFilter) {
		case models.DatingApprovalPending, models.DatingApprovalApproved, models.DatingApprovalRejected:
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid approval status"})
		}
	}

	query := database.DB.Where("approver_id = ?", authUserID)
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}
	if countOnly {
		var count int64
		if err := query.Model(&models.DatingProfileApproval{}).Count(&count).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not count incoming approval requests"})
		}
		return c.JSON(fiber.Map{"count": count})
	}

	var approvals []models.DatingProfileApproval
	if err := query.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "karmic_name", "spiritual_name", "avatar_url", "city")
		}).
		Order("created_at DESC").
		Find(&approvals).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load incoming approval requests"})
	}
	return c.JSON(approvals)
}

func (h *DatingHandler) RequestProfileApprovals(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	paramUserID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	if paramUserID != authUserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}
	var body struct {
		ApproverIDs []uint `json:"approverIds"`
	}
	_ = c.BodyParser(&body)
	approvals, err := h.lifecycle.RequestApprovals(authUserID, body.ApproverIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not request approvals"})
	}
	return c.JSON(approvals)
}

func (h *DatingHandler) RespondToProfileApproval(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	approvalID, err := parsePositiveUint(c.Params("approvalId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid approval ID"})
	}
	var body struct {
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	status := models.DatingApprovalStatus(strings.TrimSpace(body.Status))
	if status != models.DatingApprovalApproved && status != models.DatingApprovalRejected {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}
	approval, err := h.lifecycle.RespondApproval(context.Background(), approvalID, authUserID, status, body.Note)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update approval"})
	}
	return c.JSON(approval)
}

func (h *DatingHandler) ListDatingPosts(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	targetUserID := authUserID
	if raw := strings.TrimSpace(c.Query("userId")); raw != "" {
		if parsed, err := parsePositiveUint(raw); err == nil {
			targetUserID = parsed
		}
	}
	query := database.DB.Where("user_id = ?", targetUserID).Order("created_at DESC")
	if targetUserID != authUserID {
		query = query.Where("status = ?", models.DatingPostActive)
	}
	var posts []models.DatingPost
	if err := query.Find(&posts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load posts"})
	}
	return c.JSON(posts)
}

func (h *DatingHandler) CreateDatingPost(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	var body struct {
		Body     string `json:"body"`
		MediaURL string `json:"mediaUrl"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	post := models.DatingPost{
		UserID:   authUserID,
		Body:     strings.TrimSpace(body.Body),
		MediaURL: strings.TrimSpace(body.MediaURL),
		Status:   models.DatingPostActive,
	}
	if post.Body == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "body is required"})
	}
	if err := database.DB.Create(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create post"})
	}
	if err := h.lifecycle.EnqueuePostModeration(authUserID, post.ID, models.DatingModerationTriggerPostCreated); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not schedule post moderation"})
	}
	return c.Status(fiber.StatusCreated).JSON(post)
}

func (h *DatingHandler) UpdateDatingPost(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	postID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}
	var post models.DatingPost
	if err := database.DB.Where("id = ? AND user_id = ?", postID, authUserID).First(&post).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Post not found"})
	}
	var body struct {
		Body     string `json:"body"`
		MediaURL string `json:"mediaUrl"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	post.Body = strings.TrimSpace(body.Body)
	post.MediaURL = strings.TrimSpace(body.MediaURL)
	post.Status = models.DatingPostActive
	post.ModerationReason = ""
	post.ModeratedAt = nil
	if err := database.DB.Save(&post).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update post"})
	}
	if err := h.lifecycle.EnqueuePostModeration(authUserID, post.ID, models.DatingModerationTriggerPostUpdated); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not schedule post moderation"})
	}
	return c.JSON(post)
}

func (h *DatingHandler) DeleteDatingPost(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	postID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}
	if err := database.DB.Where("id = ? AND user_id = ?", postID, authUserID).Delete(&models.DatingPost{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete post"})
	}
	return c.SendStatus(fiber.StatusOK)
}

type datingChatRequestProfileResponse struct {
	ID            uint   `json:"ID"`
	Id            uint   `json:"id"`
	DisplayName   string `json:"displayName"`
	SpiritualName string `json:"spiritualName,omitempty"`
	KarmicName    string `json:"karmicName,omitempty"`
	Nickname      string `json:"nickname,omitempty"`
	AvatarURL     string `json:"avatarUrl,omitempty"`
	City          string `json:"city,omitempty"`
	Country       string `json:"country,omitempty"`
}

type datingChatRequestResponse struct {
	ID          uint                              `json:"ID"`
	Id          uint                              `json:"id"`
	RequesterID uint                              `json:"requesterId"`
	RecipientID uint                              `json:"recipientId"`
	Message     string                            `json:"message"`
	Status      models.DatingChatRequestStatus    `json:"status"`
	Direction   string                            `json:"direction,omitempty"`
	Requester   *datingChatRequestProfileResponse `json:"requester,omitempty"`
	Recipient   *datingChatRequestProfileResponse `json:"recipient,omitempty"`
	CreatedAt   time.Time                         `json:"createdAt"`
	RespondedAt *time.Time                        `json:"respondedAt,omitempty"`
}

func datingChatRequestDisplayName(user models.User) string {
	return strings.TrimSpace(firstNonEmptyDating(user.SpiritualName, user.KarmicName, user.Nickname, user.Email))
}

func buildDatingChatRequestProfile(user models.User) *datingChatRequestProfileResponse {
	if user.ID == 0 {
		return nil
	}
	return &datingChatRequestProfileResponse{
		ID:            user.ID,
		Id:            user.ID,
		DisplayName:   datingChatRequestDisplayName(user),
		SpiritualName: user.SpiritualName,
		KarmicName:    user.KarmicName,
		Nickname:      user.Nickname,
		AvatarURL:     user.AvatarURL,
		City:          user.City,
		Country:       user.Country,
	}
}

func buildDatingChatRequestResponse(request models.DatingChatRequest, viewerID uint) datingChatRequestResponse {
	direction := ""
	if viewerID != 0 {
		if request.RecipientID == viewerID {
			direction = "incoming"
		} else if request.RequesterID == viewerID {
			direction = "outgoing"
		}
	}
	return datingChatRequestResponse{
		ID:          request.ID,
		Id:          request.ID,
		RequesterID: request.RequesterID,
		RecipientID: request.RecipientID,
		Message:     request.Message,
		Status:      request.Status,
		Direction:   direction,
		Requester:   buildDatingChatRequestProfile(request.Requester),
		Recipient:   buildDatingChatRequestProfile(request.Recipient),
		CreatedAt:   request.CreatedAt,
		RespondedAt: request.RespondedAt,
	}
}

func preloadDatingChatRequestProfiles(query *gorm.DB) *gorm.DB {
	return query.Preload("Requester").Preload("Recipient")
}

func (h *DatingHandler) CreateDatingChatRequest(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}

	var body struct {
		RecipientID uint   `json:"recipientId"`
		Message     string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	body.Message = strings.TrimSpace(body.Message)
	if body.RecipientID == 0 || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "recipientId and message are required"})
	}
	if body.RecipientID == authUserID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot create a request to yourself"})
	}

	var recipient models.User
	if err := database.DB.
		Where("id = ? AND dating_enabled = ? AND is_profile_complete = ? AND dating_publication_status = ?", body.RecipientID, true, true, string(models.DatingPublicationPublished)).
		First(&recipient).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Recipient profile not found"})
	}

	var existing models.DatingChatRequest
	existingErr := preloadDatingChatRequestProfiles(database.DB).
		Where(
			"((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)) AND status IN ?",
			authUserID, body.RecipientID, body.RecipientID, authUserID,
			[]models.DatingChatRequestStatus{models.DatingChatRequestPending, models.DatingChatRequestAccepted},
		).
		Order("created_at DESC").
		First(&existing).Error
	if existingErr == nil {
		return c.JSON(buildDatingChatRequestResponse(existing, authUserID))
	}
	if !errors.Is(existingErr, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check existing request"})
	}

	request := models.DatingChatRequest{
		RequesterID: authUserID,
		RecipientID: body.RecipientID,
		Message:     body.Message,
		Status:      models.DatingChatRequestPending,
	}
	if err := database.DB.Create(&request).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create chat request"})
	}
	if err := preloadDatingChatRequestProfiles(database.DB).First(&request, request.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load chat request"})
	}
	if push := services.GetPushService(); push != nil {
		_ = push.SendToUser(request.RecipientID, services.PushMessage{
			Title: "Union chat request",
			Body:  request.Message,
			Data: map[string]string{
				"screen":    "Dating",
				"requestId": fmt.Sprintf("%d", request.ID),
			},
			Priority: "high",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(buildDatingChatRequestResponse(request, authUserID))
}

func (h *DatingHandler) ListDatingChatRequests(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}

	direction := strings.ToLower(strings.TrimSpace(c.Query("direction", "incoming")))
	query := preloadDatingChatRequestProfiles(database.DB).Order("created_at DESC")
	switch direction {
	case "incoming":
		query = query.Where("recipient_id = ?", authUserID)
	case "outgoing":
		query = query.Where("requester_id = ?", authUserID)
	case "all":
		query = query.Where("requester_id = ? OR recipient_id = ?", authUserID, authUserID)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid direction"})
	}

	if rawStatus := strings.ToLower(strings.TrimSpace(c.Query("status"))); rawStatus != "" {
		status := models.DatingChatRequestStatus(rawStatus)
		switch status {
		case models.DatingChatRequestPending, models.DatingChatRequestAccepted, models.DatingChatRequestRejected, models.DatingChatRequestCanceled:
			query = query.Where("status = ?", status)
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
		}
	}

	var requests []models.DatingChatRequest
	if err := query.Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load chat requests"})
	}
	items := make([]datingChatRequestResponse, 0, len(requests))
	for _, request := range requests {
		items = append(items, buildDatingChatRequestResponse(request, authUserID))
	}
	return c.JSON(fiber.Map{"items": items})
}

func (h *DatingHandler) RespondDatingChatRequest(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	requestID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request ID"})
	}
	action := strings.ToLower(strings.TrimSpace(c.Params("action")))
	if action != "accept" && action != "reject" && action != "cancel" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid action"})
	}

	var request models.DatingChatRequest
	if err := preloadDatingChatRequestProfiles(database.DB).First(&request, requestID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Chat request not found"})
	}
	if request.Status != models.DatingChatRequestPending {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Chat request is already processed"})
	}
	if action == "cancel" {
		if request.RequesterID != authUserID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only requester can cancel this request"})
		}
		request.Status = models.DatingChatRequestCanceled
	} else {
		if request.RecipientID != authUserID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only recipient can respond to this request"})
		}
		if action == "accept" {
			request.Status = models.DatingChatRequestAccepted
		} else {
			request.Status = models.DatingChatRequestRejected
		}
	}

	now := time.Now().UTC()
	request.RespondedAt = &now
	if err := database.DB.Save(&request).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update chat request"})
	}
	if err := preloadDatingChatRequestProfiles(database.DB).First(&request, request.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load chat request"})
	}
	return c.JSON(buildDatingChatRequestResponse(request, authUserID))
}

func (h *DatingHandler) CreateMeetingInvite(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	var body struct {
		InviteeID uint   `json:"inviteeId"`
		PlaceType string `json:"placeType"`
		Message   string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	invite := models.DatingMeetingInvite{
		InviterID: authUserID,
		InviteeID: body.InviteeID,
		PlaceType: strings.TrimSpace(body.PlaceType),
		Message:   strings.TrimSpace(body.Message),
		Status:    models.DatingMeetingInvitePending,
	}
	if invite.InviteeID == 0 || invite.PlaceType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "inviteeId and placeType are required"})
	}
	if err := database.DB.Create(&invite).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create meeting invite"})
	}
	if push := services.GetPushService(); push != nil {
		_ = push.SendToUser(invite.InviteeID, services.PushMessage{
			Title: "Union meeting invite",
			Body:  invite.Message,
			Data: map[string]string{
				"screen":   "Dating",
				"inviteId": fmt.Sprintf("%d", invite.ID),
			},
			Priority: "high",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(invite)
}

func (h *DatingHandler) ListMeetingInvites(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	var invites []models.DatingMeetingInvite
	if err := database.DB.Where("inviter_id = ? OR invitee_id = ?", authUserID, authUserID).Order("created_at DESC").Find(&invites).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load meeting invites"})
	}
	return c.JSON(invites)
}

func (h *DatingHandler) RespondMeetingInvite(c *fiber.Ctx) error {
	authUserID, authErr := requireDatingUserID(c)
	if authErr != nil {
		return authErr
	}
	inviteID, err := parsePositiveUint(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid invite ID"})
	}
	var invite models.DatingMeetingInvite
	if err := database.DB.Where("id = ? AND invitee_id = ?", inviteID, authUserID).First(&invite).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invite not found"})
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	status := models.DatingMeetingInviteStatus(strings.TrimSpace(body.Status))
	if status != models.DatingMeetingInviteAccepted && status != models.DatingMeetingInviteRejected {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}
	now := time.Now().UTC()
	invite.Status = status
	invite.RespondedAt = &now
	if err := database.DB.Save(&invite).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update invite"})
	}
	return c.JSON(invite)
}

// GetDatingPresentation returns public stats and top photos for landing page
func (h *DatingHandler) GetDatingPresentation(c *fiber.Ctx) error {
	modes := []string{"family", "business", "friendship", "seva"}
	result := make(map[string]interface{})

	type ProfileInfo struct {
		AvatarURL string `json:"avatarUrl" gorm:"column:avatar_url"`
		Skills    string `json:"skills" gorm:"column:skills"`
		FavCount  int64  `json:"-" gorm:"column:fav_count"`
	}

	for _, mode := range modes {
		var total int64
		query := database.DB.Model(&models.User{}).Where("dating_enabled = ?", true)

		if mode == "family" {
			// Include people specifically looking for family OR people with no intentions set (default)
			query = query.Where("intentions = ? OR intentions LIKE ? OR intentions IS NULL", "", "%family%")
		} else {
			query = query.Where("intentions LIKE ?", "%"+mode+"%")
		}
		query.Count(&total)

		var profiles []ProfileInfo
		pQuery := database.DB.Table("users").
			Select("users.avatar_url, users.skills, count(dating_favorites.id) as fav_count").
			Joins("left join dating_favorites on dating_favorites.candidate_id = users.id").
			Where("users.dating_enabled = ? AND (users.avatar_url IS NOT NULL AND users.avatar_url != ?)", true, "")

		if mode == "family" {
			pQuery = pQuery.Where("(users.intentions = ? OR users.intentions LIKE ? OR users.intentions IS NULL)", "", "%family%")
		} else {
			pQuery = pQuery.Where("users.intentions LIKE ?", "%"+mode+"%")
		}

		err := pQuery.Group("users.id, users.avatar_url, users.skills").
			Order("fav_count DESC").
			Limit(10).
			Scan(&profiles).Error

		modeData := fiber.Map{
			"profiles":   profiles,
			"totalCount": total,
		}

		// Add gender breakdown for family mode
		if mode == "family" {
			var males, females int64
			database.DB.Model(&models.User{}).Where("dating_enabled = ? AND (intentions = ? OR intentions LIKE ? OR intentions IS NULL) AND gender = ?", true, "", "%family%", "Male").Count(&males)
			database.DB.Model(&models.User{}).Where("dating_enabled = ? AND (intentions = ? OR intentions LIKE ? OR intentions IS NULL) AND gender = ?", true, "", "%family%", "Female").Count(&females)
			modeData["totalMale"] = males
			modeData["totalFemale"] = females
		}

		if err == nil {
			result[mode] = modeData
		}
	}

	return c.JSON(result)
}
