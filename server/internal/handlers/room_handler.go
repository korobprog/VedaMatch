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

type RoomHandler struct{}

func NewRoomHandler() *RoomHandler {
	return &RoomHandler{}
}

func (h *RoomHandler) CreateRoom(c *fiber.Ctx) error {
	var room models.Room
	if err := c.BodyParser(&room); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if room.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Room name is required",
		})
	}

	// Save room to DB
	if err := database.DB.Create(&room).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create room",
		})
	}

	// Add creator as admin
	member := models.RoomMember{
		RoomID: room.ID,
		UserID: room.OwnerID,
		Role:   "admin",
	}
	database.DB.Create(&member)

	return c.Status(fiber.StatusCreated).JSON(room)
}

func (h *RoomHandler) GetRooms(c *fiber.Ctx) error {
	var rooms []models.Room
	// For now, return all public rooms
	if err := database.DB.Where("is_public = ?", true).Find(&rooms).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch rooms",
		})
	}

	return c.Status(fiber.StatusOK).JSON(rooms)
}

func (h *RoomHandler) InviteUser(c *fiber.Ctx) error {
	var body struct {
		RoomID uint `json:"roomId"`
		UserID uint `json:"userId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Check if already a member
	var existing models.RoomMember
	if err := database.DB.Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "User is already a member of this room",
		})
	}

	member := models.RoomMember{
		RoomID: body.RoomID,
		UserID: body.UserID,
		Role:   "member",
	}

	if err := database.DB.Create(&member).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not invite user",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(member)
}

func (h *RoomHandler) GetRoomMembers(c *fiber.Ctx) error {
	roomID := c.Params("id")
	var members []models.RoomMember
	if err := database.DB.Where("room_id = ?", roomID).Find(&members).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch members",
		})
	}

	var userIDs []uint
	memberMap := make(map[uint]string)
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
		memberMap[m.UserID] = m.Role
	}

	var users []models.User
	if err := database.DB.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch member details",
		})
	}

	var response []map[string]interface{}
	for _, user := range users {
		response = append(response, map[string]interface{}{
			"user": user,
			"role": memberMap[user.ID],
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

func (h *RoomHandler) UpdateMemberRole(c *fiber.Ctx) error {
	var body struct {
		RoomID uint   `json:"roomId"`
		UserID uint   `json:"userId"`
		Role   string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if body.Role != "admin" && body.Role != "member" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role",
		})
	}

	if err := database.DB.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).
		Update("role", body.Role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update role",
		})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *RoomHandler) RemoveUser(c *fiber.Ctx) error {
	var body struct {
		RoomID uint `json:"roomId"`
		UserID uint `json:"userId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Delete member
	if err := database.DB.Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).Delete(&models.RoomMember{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not remove user",
		})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *RoomHandler) UpdateRoomImage(c *fiber.Ctx) error {
	roomID := c.Params("id")

	// Get uploaded file
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No image provided",
		})
	}

	// Create uploads/rooms directory if it doesn't exist
	uploadsDir := "./uploads/rooms"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("room_%s_%d%s", roomID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	// Save file
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save image",
		})
	}

	// Update database
	imageURL := "/uploads/rooms/" + filename
	if err := database.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("image_url", imageURL).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update room",
		})
	}

	return c.JSON(fiber.Map{
		"imageUrl": imageURL,
	})
}

func (h *RoomHandler) UpdateRoom(c *fiber.Ctx) error {
	roomID := c.Params("id")

	var body struct {
		ImageUrl string `json:"imageUrl"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Update room in database
	if err := database.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("image_url", body.ImageUrl).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update room",
		})
	}

	return c.JSON(fiber.Map{
		"imageUrl": body.ImageUrl,
	})
}
