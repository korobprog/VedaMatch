package handlers

import (
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"

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

	// Ensure Gemini keys are present for UI
	geminiKeys := []string{"GEMINI_API_KEY", "GEMINI_API_KEY_BACKUP_1", "GEMINI_API_KEY_BACKUP_2", "GEMINI_API_KEY_BACKUP_3", "GEMINI_API_KEY_BACKUP_4"}
	for _, key := range geminiKeys {
		if _, ok := settingsMap[key]; !ok {
			envVal := os.Getenv(key)
			if envVal != "" {
				settingsMap[key] = strings.Repeat("*", len(envVal))
			}
		}
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
	}

	return c.JSON(fiber.Map{"message": "Settings updated"})
}
