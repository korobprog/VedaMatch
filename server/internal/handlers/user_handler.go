package handlers

import (
	"encoding/json"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// GetPortalLayout retrieves the user's portal layout from the server
func (h *UserHandler) GetPortalLayout(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var layout models.UserPortalLayout
	result := database.DB.Where("user_id = ?", userId).First(&layout)

	if result.Error != nil {
		// No layout found - return empty (client will use default)
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"layout": nil,
		})
	}

	// Parse JSON back to object
	var layoutData interface{}
	if err := json.Unmarshal([]byte(layout.LayoutJSON), &layoutData); err != nil {
		log.Printf("[PortalLayout] Error parsing layout JSON for user %d: %v", userId, err)
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"layout": nil,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"layout":       layoutData,
		"lastModified": layout.LastModified,
	})
}

// SavePortalLayout saves the user's portal layout to the server
func (h *UserHandler) SavePortalLayout(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var body struct {
		Layout interface{} `json:"layout"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if body.Layout == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Layout is required",
		})
	}

	// Convert layout to JSON string
	layoutBytes, err := json.Marshal(body.Layout)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not serialize layout",
		})
	}

	// Upsert layout
	var existingLayout models.UserPortalLayout
	result := database.DB.Where("user_id = ?", userId).First(&existingLayout)

	if result.Error != nil {
		// Create new
		newLayout := models.UserPortalLayout{
			UserID:       userId,
			LayoutJSON:   string(layoutBytes),
			LastModified: time.Now().UnixMilli(),
		}
		if err := database.DB.Create(&newLayout).Error; err != nil {
			log.Printf("[PortalLayout] Error creating layout for user %d: %v", userId, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not save layout",
			})
		}
		log.Printf("[PortalLayout] Created layout for user %d", userId)
	} else {
		// Update existing
		existingLayout.LayoutJSON = string(layoutBytes)
		existingLayout.LastModified = time.Now().UnixMilli()
		if err := database.DB.Save(&existingLayout).Error; err != nil {
			log.Printf("[PortalLayout] Error updating layout for user %d: %v", userId, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not update layout",
			})
		}
		log.Printf("[PortalLayout] Updated layout for user %d", userId)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":      "Layout saved successfully",
		"lastModified": time.Now().UnixMilli(),
	})
}

// GetUserById retrieves a user's public profile by their ID
func (h *UserHandler) GetUserById(c *fiber.Ctx) error {
	userIdParam := c.Params("id")
	if userIdParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	userId, err := strconv.ParseUint(userIdParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var user models.User
	result := database.DB.Where("id = ? AND is_blocked = ?", userId, false).First(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Return public profile info (excluding sensitive data)
	return c.JSON(fiber.Map{
		"ID":            user.ID,
		"karmicName":    user.KarmicName,
		"spiritualName": user.SpiritualName,
		"email":         user.Email,
		"avatarUrl":     user.AvatarURL,
		"identity":      user.Identity,
		"city":          user.City,
		"country":       user.Country,
		"latitude":      user.Latitude,
		"longitude":     user.Longitude,
		"yatra":         user.Yatra,
		"timezone":      user.Timezone,
		"lastSeen":      user.LastSeen,
	})
}
