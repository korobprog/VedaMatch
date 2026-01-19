package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	var users []models.User
	query := database.DB.Model(&models.User{})

	// Search
	search := c.Query("search")
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(karmic_name) LIKE ? OR LOWER(spiritual_name) LIKE ? OR LOWER(email) LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	// Filter by Role
	role := c.Query("role")
	if role != "" {
		query = query.Where("role = ?", role)
	}

	// Filter by Status
	status := c.Query("status")
	switch status {
	case "blocked":
		query = query.Where("is_blocked = ?", true)
	case "active":
		query = query.Where("is_blocked = ?", false)
	}

	if err := query.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch users"})
	}

	// Clear passwords
	for i := range users {
		users[i].Password = ""
	}

	return c.JSON(users)
}

func (h *AdminHandler) ToggleBlockUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	user.IsBlocked = !user.IsBlocked
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update user status"})
	}

	return c.JSON(fiber.Map{
		"message":   "User status updated",
		"isBlocked": user.IsBlocked,
	})
}

func (h *AdminHandler) AddAdmin(c *fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"` // admin or superadmin
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if body.Role != "admin" && body.Role != "superadmin" {
		body.Role = "admin"
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not hash password"})
	}

	newAdmin := models.User{
		Email:             strings.TrimSpace(strings.ToLower(body.Email)),
		Password:          string(hashedPassword),
		Role:              body.Role,
		IsProfileComplete: true,
	}

	if err := database.DB.Create(&newAdmin).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create admin user"})
	}

	newAdmin.Password = ""
	return c.Status(fiber.StatusCreated).JSON(newAdmin)
}

func (h *AdminHandler) UpdateUserRole(c *fiber.Ctx) error {
	userID := c.Params("id")
	var body struct {
		Role string `json:"role"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if body.Role != "user" && body.Role != "admin" && body.Role != "superadmin" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("role", body.Role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update role"})
	}

	return c.JSON(fiber.Map{"message": "Role updated successfully"})
}

func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	var totalUsers int64
	var blockedUsers int64
	var admins int64

	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("is_blocked = ?", true).Count(&blockedUsers)
	database.DB.Model(&models.User{}).Where("role IN ?", []string{"admin", "superadmin"}).Count(&admins)

	return c.JSON(fiber.Map{
		"totalUsers":   totalUsers,
		"blockedUsers": blockedUsers,
		"admins":       admins,
		"activeUsers":  totalUsers - blockedUsers,
	})
}

// Dating Management

func (h *AdminHandler) GetDatingProfiles(c *fiber.Ctx) error {
	var users []models.User
	query := database.DB.Where("dating_enabled = ?", true)

	// Search
	search := c.Query("search")
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(karmic_name) LIKE ? OR LOWER(spiritual_name) LIKE ? OR LOWER(email) LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	if err := query.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch dating profiles"})
	}

	for i := range users {
		users[i].Password = ""
	}

	return c.JSON(users)
}

func (h *AdminHandler) FlagDatingProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	var body struct {
		IsFlagged  bool   `json:"isFlagged"`
		FlagReason string `json:"flagReason"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"is_flagged":  body.IsFlagged,
		"flag_reason": body.FlagReason,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update flag status"})
	}

	return c.JSON(fiber.Map{"message": "Profile flag updated"})
}

// System Settings

func (h *AdminHandler) GetSystemSettings(c *fiber.Ctx) error {
	var settings []models.SystemSetting
	if err := database.DB.Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch settings"})
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	// Always ensure API_OPEN_AI is present for the UI even if only in env
	if _, ok := settingsMap["API_OPEN_AI"]; !ok {
		settingsMap["API_OPEN_AI"] = strings.Repeat("*", len(os.Getenv("API_OPEN_AI")))
	}

	// Scan all environment variables for GEMINI_ keys to capture backups not yet in DB
	for _, env := range os.Environ() {
		pair := strings.SplitN(env, "=", 2)
		key := pair[0]
		val := pair[1]

		if strings.HasPrefix(key, "GEMINI_API_KEY") {
			// Only add if not already in settingsMap (DB takes precedence or we just want to ensure it's shown)
			if _, ok := settingsMap[key]; !ok {
				if val != "" {
					settingsMap[key] = strings.Repeat("*", len(val))
				}
			}
		}
	}

	// Ensure GEMINI_CORPUS_ID is present
	if _, ok := settingsMap["GEMINI_CORPUS_ID"]; !ok {
		settingsMap["GEMINI_CORPUS_ID"] = os.Getenv("GEMINI_CORPUS_ID")
	}

	return c.JSON(settingsMap)
}

func (h *AdminHandler) UpdateSystemSettings(c *fiber.Ctx) error {
	var updates map[string]string
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	for k, v := range updates {
		var setting models.SystemSetting
		database.DB.Where("key = ?", k).FirstOrCreate(&setting, models.SystemSetting{Key: k})
		setting.Value = v
		database.DB.Save(&setting)

		// Special case: update env for current session if it's API_OPEN_AI
		if k == "API_OPEN_AI" && v != "" {
			os.Setenv("API_OPEN_AI", v)
		}
		// Also update Gemini keys in env
		if strings.HasPrefix(k, "GEMINI_API_KEY") && v != "" {
			os.Setenv(k, v)
		}
		if k == "GEMINI_CORPUS_ID" {
			os.Setenv(k, v)
		}
	}

	return c.JSON(fiber.Map{"message": "Settings updated"})
}

// RAG Management Methods

func (h *AdminHandler) ListGeminiCorpora(c *fiber.Ctx) error {
	keyName := c.Query("key_name")
	if keyName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "key_name is required"})
	}

	// 1. Get API Key
	var apiKey string
	// Try DB first
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", keyName).First(&setting).Error; err == nil {
		apiKey = setting.Value
	}
	// Fallback to Env
	if apiKey == "" {
		apiKey = os.Getenv(keyName)
	}

	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("API Key '%s' not found", keyName)})
	}

	// 2. Call Google API (via Proxy if set)
	baseURL := os.Getenv("GEMINI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}

	client := &http.Client{Timeout: 30 * time.Second}
	url := fmt.Sprintf("%s/v1beta/corpora?key=%s", baseURL, apiKey)

	resp, err := client.Get(url)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to connect to Gemini API: " + err.Error()})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error":   "Gemini API Error",
			"status":  resp.StatusCode,
			"details": string(body),
		})
	}

	// 3. Return Raw JSON
	var data interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse JSON response"})
	}

	return c.JSON(data)
}

func (h *AdminHandler) CreateGeminiCorpus(c *fiber.Ctx) error {
	var body struct {
		KeyName     string `json:"keyName"`
		DisplayName string `json:"displayName"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if body.KeyName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "keyName is required"})
	}

	// 1. Get API Key
	var apiKey string
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", body.KeyName).First(&setting).Error; err == nil {
		apiKey = setting.Value
	}
	if apiKey == "" {
		apiKey = os.Getenv(body.KeyName)
	}
	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "API Key not found"})
	}

	// 2. Create Corpus
	baseURL := os.Getenv("GEMINI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}

	client := &http.Client{Timeout: 30 * time.Second}
	url := fmt.Sprintf("%s/v1beta/corpora?key=%s", baseURL, apiKey)

	payload := map[string]string{
		"displayName": body.DisplayName,
	}
	if payload["displayName"] == "" {
		payload["displayName"] = "New Corpus " + time.Now().Format("2006-01-02 15:04")
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to connect to Gemini API"})
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error":   "Failed to create corpus",
			"details": string(respBody),
		})
	}

	var data interface{}
	json.Unmarshal(respBody, &data)

	return c.JSON(data)
}

// GeocodeAllUsers geocodes all users who have a city but no coordinates
// POST /api/admin/geocode-users
func (h *AdminHandler) GeocodeAllUsers(c *fiber.Ctx) error {
	mapService := services.NewMapService(database.DB)

	// Find all users with city but without coordinates
	var users []models.User
	if err := database.DB.Where("city IS NOT NULL AND city != '' AND (latitude IS NULL OR longitude IS NULL)").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch users"})
	}

	if len(users) == 0 {
		return c.JSON(fiber.Map{
			"message":  "No users need geocoding",
			"geocoded": 0,
			"failed":   0,
		})
	}

	geocoded := 0
	failed := 0
	results := make([]fiber.Map, 0)

	for _, user := range users {
		result, err := mapService.GeocodeCity(user.City)
		if err != nil {
			failed++
			results = append(results, fiber.Map{
				"userId": user.ID,
				"email":  user.Email,
				"city":   user.City,
				"status": "failed",
				"error":  err.Error(),
			})
			continue
		}

		// Update user with coordinates
		user.City = result.City
		if user.Country == "" {
			user.Country = result.Country
		}
		user.Latitude = &result.Latitude
		user.Longitude = &result.Longitude

		if err := database.DB.Save(&user).Error; err != nil {
			failed++
			results = append(results, fiber.Map{
				"userId": user.ID,
				"email":  user.Email,
				"city":   user.City,
				"status": "db_error",
				"error":  err.Error(),
			})
			continue
		}

		geocoded++
		results = append(results, fiber.Map{
			"userId":    user.ID,
			"email":     user.Email,
			"city":      result.City,
			"country":   result.Country,
			"latitude":  result.Latitude,
			"longitude": result.Longitude,
			"status":    "success",
		})

		// Small delay to avoid rate limiting
		time.Sleep(200 * time.Millisecond)
	}

	return c.JSON(fiber.Map{
		"message":  "Geocoding complete",
		"total":    len(users),
		"geocoded": geocoded,
		"failed":   failed,
		"results":  results,
	})
}
