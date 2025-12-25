package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

type MediaHandler struct{}

func NewMediaHandler() *MediaHandler {
	return &MediaHandler{}
}

func (h *MediaHandler) UploadPhoto(c *fiber.Ctx) error {
	userID := c.Params("userId")

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No photo provided",
		})
	}

	uploadsDir := "./uploads/media"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("u%s_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/media/" + filename
	media := models.Media{
		UserID:    uint(parseUint(userID)),
		URL:       imageURL,
		IsProfile: false,
	}

	if err := database.DB.Create(&media).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save media to database",
		})
	}

	return c.JSON(media)
}

func (h *MediaHandler) ListPhotos(c *fiber.Ctx) error {
	userID := c.Params("userId")
	var media []models.Media
	if err := database.DB.Where("user_id = ?", userID).Find(&media).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch media",
		})
	}

	return c.JSON(media)
}

func (h *MediaHandler) DeletePhoto(c *fiber.Ctx) error {
	mediaID := c.Params("id")
	var media models.Media
	if err := database.DB.First(&media, mediaID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Photo not found",
		})
	}

	// Remove from DB
	if err := database.DB.Delete(&media).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not delete from database",
		})
	}

	// Remove from disk (optional but good)
	_ = os.Remove("." + media.URL)

	return c.SendStatus(fiber.StatusOK)
}

func (h *MediaHandler) SetProfilePhoto(c *fiber.Ctx) error {
	mediaID := c.Params("id")
	var media models.Media
	if err := database.DB.First(&media, mediaID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Photo not found",
		})
	}

	// Reset all photos for this user
	database.DB.Model(&models.Media{}).Where("user_id = ?", media.UserID).Update("is_profile", false)

	// Set this one as profile
	media.IsProfile = true
	database.DB.Save(&media)

	// Update User table as well (for convenience)
	database.DB.Model(&models.User{}).Where("id = ?", media.UserID).Update("avatar_url", media.URL)

	return c.JSON(media)
}

func parseUint(s string) uint {
	var n uint
	fmt.Sscanf(s, "%d", &n)
	return n
}
