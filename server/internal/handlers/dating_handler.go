package handlers

import (
	"errors"
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"regexp"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DatingHandler struct {
	aiService       *services.AiChatService
	domainAssistant *services.DomainAssistantService
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
	query := database.DB.Preload("Photos").Where("dating_enabled = ? AND is_profile_complete = ?", true, true)

	// Simple filtering
	// Parse query params
	gender := c.Query("gender")
	city := c.Query("city")
	madh := c.Query("madh")
	yogaStyle := c.Query("yogaStyle")
	guna := c.Query("guna")
	identity := c.Query("identity")
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

	// Use a struct with pointers for partial updates (handles zero values and correct mapping)
	var updates struct {
		Bio            *string `json:"bio"`
		Interests      *string `json:"interests"`
		LookingFor     *string `json:"lookingFor"`
		MaritalStatus  *string `json:"maritalStatus"`
		Dob            *string `json:"dob"`
		BirthTime      *string `json:"birthTime"`
		BirthPlaceLink *string `json:"birthPlaceLink"`
		City           *string `json:"city"`

		Madh               *string `json:"madh"`
		YogaStyle          *string `json:"yogaStyle"`
		Guna               *string `json:"guna"`
		Identity           *string `json:"identity"`
		Intentions         *string `json:"intentions"`
		Skills             *string `json:"skills"`
		Industry           *string `json:"industry"`
		LookingForBusiness *string `json:"lookingForBusiness"`
		DatingEnabled      *bool   `json:"datingEnabled"`
		IsProfileComplete  *bool   `json:"isProfileComplete"`
	}

	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	// Map to snake_case column names for GORM
	updateMap := make(map[string]interface{})
	if updates.Bio != nil {
		updateMap["bio"] = *updates.Bio
	}
	if updates.Interests != nil {
		updateMap["interests"] = *updates.Interests
	}
	if updates.LookingFor != nil {
		updateMap["looking_for"] = *updates.LookingFor
	}
	if updates.MaritalStatus != nil {
		updateMap["marital_status"] = *updates.MaritalStatus
	}
	if updates.Dob != nil {
		updateMap["dob"] = *updates.Dob
	}
	if updates.BirthTime != nil {
		updateMap["birth_time"] = *updates.BirthTime
	}
	if updates.BirthPlaceLink != nil {
		updateMap["birth_place_link"] = *updates.BirthPlaceLink
	}
	if updates.City != nil {
		updateMap["city"] = *updates.City
	}
	if updates.Madh != nil {
		updateMap["madh"] = *updates.Madh
	}
	if updates.YogaStyle != nil {
		updateMap["yoga_style"] = *updates.YogaStyle
	}
	if updates.Guna != nil {
		updateMap["guna"] = *updates.Guna
	}
	if updates.Identity != nil {
		updateMap["identity"] = *updates.Identity
	}
	if updates.Intentions != nil {
		updateMap["intentions"] = *updates.Intentions
	}
	if updates.Skills != nil {
		updateMap["skills"] = *updates.Skills
	}
	if updates.Industry != nil {
		updateMap["industry"] = *updates.Industry
	}
	if updates.LookingForBusiness != nil {
		updateMap["looking_for_business"] = *updates.LookingForBusiness
	}
	if updates.DatingEnabled != nil {
		updateMap["dating_enabled"] = *updates.DatingEnabled
	}
	if updates.IsProfileComplete != nil {
		updateMap["is_profile_complete"] = *updates.IsProfileComplete
	}

	if len(updateMap) == 0 {
		return c.JSON(user)
	}

	if err := database.DB.Model(&user).Updates(updateMap).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update profile"})
	}
	if err := database.DB.Preload("Photos").First(&user, user.ID).Error; err != nil {
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
	// Preload Photos to ensure they are available for the preview
	if err := database.DB.Preload("Photos").First(&user, userID).Error; err != nil {
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
	if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND city != ?", true, "").Distinct().Pluck("city", &cities).Error; err != nil {
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
	if err := database.DB.Model(&models.User{}).Where("dating_enabled = ?", true).Count(&totalCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch total stats"})
	}

	// Profiles in specific city
	if city != "" {
		if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND city = ?", true, city).Count(&cityCount).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch city stats"})
		}
	}

	// New profiles in last 24h
	twentyFourHoursAgo := time.Now().UTC().Add(-24 * time.Hour)
	if err := database.DB.Model(&models.User{}).Where("dating_enabled = ? AND created_at > ?", true, twentyFourHoursAgo).Count(&newCount).Error; err != nil {
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
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{"error": "Not implemented"})
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
