package handlers

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"

	"github.com/gofiber/fiber/v2"
)

type TagHandler struct{}

func NewTagHandler() *TagHandler {
	return &TagHandler{}
}

func (h *TagHandler) SearchTags(c *fiber.Ctx) error {
	query := c.Query("q")
	tagType := c.Query("type")

	var tags []models.Tag
	db := database.DB

	if query != "" {
		db = db.Where("name ILIKE ?", "%"+query+"%")
	}
	if tagType != "" {
		db = db.Where("type = ?", tagType)
	}

	if err := db.Find(&tags).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch tags",
		})
	}

	return c.JSON(tags)
}

func (h *TagHandler) CreateTag(c *fiber.Ctx) error {
	var tag models.Tag
	if err := c.BodyParser(&tag); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if tag.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Tag name is required",
		})
	}

	if err := database.DB.Create(&tag).Error; err != nil {
		// Might be a duplicate
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create tag",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(tag)
}

func (h *TagHandler) AddTagToUser(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var body struct {
		TagID uint `json:"tagId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	userTag := models.UserTag{
		UserID: userId,
		TagID:  body.TagID,
	}

	if err := database.DB.Create(&userTag).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not add tag to user",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(userTag)
}

func (h *TagHandler) RemoveTagFromUser(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	tagId, err := c.ParamsInt("tagId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tag ID",
		})
	}

	if err := database.DB.Where("user_id = ? AND tag_id = ?", userId, tagId).Delete(&models.UserTag{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not remove tag from user",
		})
	}

	return c.SendStatus(fiber.StatusOK)
}
