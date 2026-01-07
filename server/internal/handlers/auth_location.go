package handlers

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func (h *AuthHandler) UpdateLocation(c *fiber.Ctx) error {
	type LocationUpdate struct {
		Country   string   `json:"country"`
		City      string   `json:"city"`
		Latitude  *float64 `json:"latitude"`
		Longitude *float64 `json:"longitude"`
	}

	var updateData LocationUpdate
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	userId := c.Locals("userId")
	if userId == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	user.Country = strings.TrimSpace(updateData.Country)
	user.City = strings.TrimSpace(updateData.City)
	user.Latitude = updateData.Latitude
	user.Longitude = updateData.Longitude

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update location",
		})
	}

	user.Password = ""
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Location updated successfully",
		"user":    user,
	})
}
