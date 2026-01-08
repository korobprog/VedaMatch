package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// PromptHandler handles AI prompt CRUD operations
type PromptHandler struct{}

// NewPromptHandler creates a new PromptHandler
func NewPromptHandler() *PromptHandler {
	return &PromptHandler{}
}

// GetPrompts returns all prompts for admin panel
func (h *PromptHandler) GetPrompts(c *fiber.Ctx) error {
	var prompts []models.AIPrompt

	query := database.DB.Order("priority DESC, created_at DESC")

	// Optional filters
	if scope := c.Query("scope"); scope != "" {
		query = query.Where("scope = ?", scope)
	}
	if isActive := c.Query("isActive"); isActive != "" {
		active := isActive == "true"
		query = query.Where("is_active = ?", active)
	}
	if search := c.Query("search"); search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm)
	}

	if err := query.Find(&prompts).Error; err != nil {
		log.Printf("[PromptHandler] Error fetching prompts: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch prompts",
		})
	}

	return c.JSON(prompts)
}

// GetPrompt returns a single prompt by ID
func (h *PromptHandler) GetPrompt(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid prompt ID",
		})
	}

	var prompt models.AIPrompt
	if err := database.DB.First(&prompt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Prompt not found",
		})
	}

	return c.JSON(prompt)
}

// CreatePromptRequest is the request body for creating a prompt
type CreatePromptRequest struct {
	Name        string `json:"name"`
	Content     string `json:"content"`
	Scope       string `json:"scope"`
	ScopeValue  string `json:"scopeValue"`
	Priority    int    `json:"priority"`
	IsActive    bool   `json:"isActive"`
	Description string `json:"description"`
}

// CreatePrompt creates a new AI prompt
func (h *PromptHandler) CreatePrompt(c *fiber.Ctx) error {
	var req CreatePromptRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name is required",
		})
	}
	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content is required",
		})
	}

	prompt := models.AIPrompt{
		Name:        req.Name,
		Content:     req.Content,
		Scope:       models.PromptScope(req.Scope),
		ScopeValue:  req.ScopeValue,
		Priority:    req.Priority,
		IsActive:    req.IsActive,
		Description: req.Description,
	}

	if prompt.Scope == "" {
		prompt.Scope = models.ScopeGlobal
	}

	if err := database.DB.Create(&prompt).Error; err != nil {
		log.Printf("[PromptHandler] Error creating prompt: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create prompt",
		})
	}

	log.Printf("[PromptHandler] Created prompt: ID=%d, Name=%s, Scope=%s", prompt.ID, prompt.Name, prompt.Scope)
	return c.Status(fiber.StatusCreated).JSON(prompt)
}

// UpdatePromptRequest is the request body for updating a prompt
type UpdatePromptRequest struct {
	Name        *string `json:"name"`
	Content     *string `json:"content"`
	Scope       *string `json:"scope"`
	ScopeValue  *string `json:"scopeValue"`
	Priority    *int    `json:"priority"`
	IsActive    *bool   `json:"isActive"`
	Description *string `json:"description"`
}

// UpdatePrompt updates an existing AI prompt
func (h *PromptHandler) UpdatePrompt(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid prompt ID",
		})
	}

	var prompt models.AIPrompt
	if err := database.DB.First(&prompt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Prompt not found",
		})
	}

	var req UpdatePromptRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update fields if provided
	if req.Name != nil {
		prompt.Name = *req.Name
	}
	if req.Content != nil {
		prompt.Content = *req.Content
	}
	if req.Scope != nil {
		prompt.Scope = models.PromptScope(*req.Scope)
	}
	if req.ScopeValue != nil {
		prompt.ScopeValue = *req.ScopeValue
	}
	if req.Priority != nil {
		prompt.Priority = *req.Priority
	}
	if req.IsActive != nil {
		prompt.IsActive = *req.IsActive
	}
	if req.Description != nil {
		prompt.Description = *req.Description
	}

	if err := database.DB.Save(&prompt).Error; err != nil {
		log.Printf("[PromptHandler] Error updating prompt: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update prompt",
		})
	}

	log.Printf("[PromptHandler] Updated prompt: ID=%d, Name=%s", prompt.ID, prompt.Name)
	return c.JSON(prompt)
}

// DeletePrompt deletes an AI prompt
func (h *PromptHandler) DeletePrompt(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid prompt ID",
		})
	}

	var prompt models.AIPrompt
	if err := database.DB.First(&prompt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Prompt not found",
		})
	}

	if err := database.DB.Delete(&prompt).Error; err != nil {
		log.Printf("[PromptHandler] Error deleting prompt: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete prompt",
		})
	}

	log.Printf("[PromptHandler] Deleted prompt: ID=%d, Name=%s", id, prompt.Name)
	return c.JSON(fiber.Map{
		"message": "Prompt deleted successfully",
	})
}

// TogglePromptActive toggles the active status of a prompt
func (h *PromptHandler) TogglePromptActive(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid prompt ID",
		})
	}

	var prompt models.AIPrompt
	if err := database.DB.First(&prompt, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Prompt not found",
		})
	}

	prompt.IsActive = !prompt.IsActive

	if err := database.DB.Save(&prompt).Error; err != nil {
		log.Printf("[PromptHandler] Error toggling prompt: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to toggle prompt",
		})
	}

	log.Printf("[PromptHandler] Toggled prompt: ID=%d, IsActive=%v", id, prompt.IsActive)
	return c.JSON(prompt)
}

// GetUserPrompts returns prompts applicable to a specific user based on their profile
func (h *PromptHandler) GetUserPrompts(c *fiber.Ctx) error {
	userID := c.Params("userId")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	// Fetch user profile
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Build query for applicable prompts
	var prompts []models.AIPrompt

	// Get all active prompts ordered by priority
	if err := database.DB.Where("is_active = ?", true).
		Order("priority DESC").
		Find(&prompts).Error; err != nil {
		log.Printf("[PromptHandler] Error fetching user prompts: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch prompts",
		})
	}

	// Filter prompts applicable to this user
	applicablePrompts := filterPromptsForUser(prompts, &user)

	return c.JSON(applicablePrompts)
}

// GetScopeOptions returns available scope options for the admin UI
func (h *PromptHandler) GetScopeOptions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"scopes":      models.GetScopeOptions(),
		"sampradayas": models.GetSampradayaOptions(),
	})
}

// filterPromptsForUser filters prompts based on user profile
func filterPromptsForUser(prompts []models.AIPrompt, user *models.User) []models.AIPrompt {
	var result []models.AIPrompt

	for _, prompt := range prompts {
		if isPromptApplicable(prompt, user) {
			result = append(result, prompt)
		}
	}

	return result
}

// isPromptApplicable checks if a prompt applies to a user
func isPromptApplicable(prompt models.AIPrompt, user *models.User) bool {
	switch prompt.Scope {
	case models.ScopeGlobal:
		return true
	case models.ScopeSampradaya:
		return user.Madh == prompt.ScopeValue
	case models.ScopeIdentity:
		return user.Identity == prompt.ScopeValue
	case models.ScopeDiet:
		return user.Diet == prompt.ScopeValue
	case models.ScopeGuna:
		return user.Guna == prompt.ScopeValue
	case models.ScopeYogaStyle:
		return user.YogaStyle == prompt.ScopeValue
	default:
		return false
	}
}

// BuildSystemPromptForUser builds a combined system prompt for a user
func BuildSystemPromptForUser(userID uint) string {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		log.Printf("[PromptHandler] User not found for prompt building: %v", err)
		return ""
	}

	var prompts []models.AIPrompt
	if err := database.DB.Where("is_active = ?", true).
		Order("priority DESC").
		Find(&prompts).Error; err != nil {
		log.Printf("[PromptHandler] Error fetching prompts: %v", err)
		return ""
	}

	applicablePrompts := filterPromptsForUser(prompts, &user)

	if len(applicablePrompts) == 0 {
		return ""
	}

	// Combine prompts with separators
	var parts []string
	for _, p := range applicablePrompts {
		if p.Content != "" {
			parts = append(parts, p.Content)
		}
	}

	return strings.Join(parts, "\n\n")
}
