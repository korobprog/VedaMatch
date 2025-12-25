package handlers

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	ragService *services.RAGService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		ragService: services.NewRAGService(),
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var user models.User
	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	user.Email = strings.TrimSpace(strings.ToLower(user.Email))

	if user.Email == "" || user.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not hash password",
		})
	}
	user.Password = string(hashedPassword)

	// 1. Save to Database
	result := database.DB.Create(&user)
	if result.Error != nil {
		log.Printf("[AUTH] Registration failed: %v", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create user",
		})
	}

	user.Password = ""
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"user":    user,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var loginData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&loginData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	loginData.Email = strings.TrimSpace(strings.ToLower(loginData.Email))

	if loginData.Email == "" || loginData.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	// Find user by email
	var user models.User
	result := database.DB.Where("email = ?", loginData.Email).First(&user)
	if result.Error != nil {
		log.Printf("[AUTH] Login failed: user not found (%s)", loginData.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or user not found",
		})
	}

	// Compare passwords
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginData.Password))
	if err != nil {
		log.Printf("[AUTH] Login failed: invalid password for %s", loginData.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid password",
		})
	}

	user.Password = ""
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Login successful",
		"user":    user,
	})
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	var updateData models.User
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	userId := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Update fields
	user.KarmicName = updateData.KarmicName
	user.SpiritualName = updateData.SpiritualName
	user.Gender = updateData.Gender
	user.Country = updateData.Country
	user.City = updateData.City
	user.Identity = updateData.Identity
	user.Diet = updateData.Diet
	user.Madh = updateData.Madh
	user.Mentor = updateData.Mentor
	user.Dob = updateData.Dob
	user.IsProfileComplete = true // Mark as complete since we are updating profile

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update profile",
		})
	}

	// Async update RAG
	go func(u models.User) {
		fileID, err := h.ragService.UploadProfile(u)
		if err != nil {
			log.Printf("Error uploading profile to RAG for user %d: %v", u.ID, err)
		} else {
			u.RagFileID = fileID
			database.DB.Model(&u).Update("rag_file_id", fileID)
		}
	}(user)

	user.Password = ""
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

func (h *AuthHandler) Heartbeat(c *fiber.Ctx) error {
	userId := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	user.LastSeen = time.Now().Format(time.RFC3339)
	database.DB.Model(&user).Update("last_seen", user.LastSeen)

	return c.SendStatus(fiber.StatusOK)
}

func (h *AuthHandler) UploadAvatar(c *fiber.Ctx) error {
	userId := c.Params("id")
	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No avatar file provided"})
	}

	// Create uploads directory if not exists
	uploadDir := "./uploads/avatars"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	filename := fmt.Sprintf("%s_%s", userId, file.Filename)
	filepath := fmt.Sprintf("%s/%s", uploadDir, filename)

	if err := c.SaveFile(file, filepath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save avatar"})
	}

	// Update user avatar URL
	avatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	database.DB.Model(&models.User{}).Where("id = ?", userId).Update("avatar_url", avatarURL)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"avatarUrl": avatarURL,
	})
}

func (h *AuthHandler) AddFriend(c *fiber.Ctx) error {
	var body struct {
		UserID   uint `json:"userId"`
		FriendID uint `json:"friendId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	friendship := models.Friend{
		UserID:   body.UserID,
		FriendID: body.FriendID,
	}

	if err := database.DB.Create(&friendship).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not add friend"})
	}

	return c.Status(fiber.StatusCreated).JSON(friendship)
}

func (h *AuthHandler) RemoveFriend(c *fiber.Ctx) error {
	var body struct {
		UserID   uint `json:"userId"`
		FriendID uint `json:"friendId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Where("user_id = ? AND friend_id = ?", body.UserID, body.FriendID).Delete(&models.Friend{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not remove friend"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *AuthHandler) GetFriends(c *fiber.Ctx) error {
	userId := c.Params("id")
	var friends []models.Friend
	if err := database.DB.Where("user_id = ?", userId).Find(&friends).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch friends"})
	}

	var friendIDs []uint
	for _, f := range friends {
		friendIDs = append(friendIDs, f.FriendID)
	}

	var users []models.User
	if err := database.DB.Where("id IN ?", friendIDs).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch friend details"})
	}

	return c.Status(fiber.StatusOK).JSON(users)
}

func (h *AuthHandler) GetContacts(c *fiber.Ctx) error {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch contacts",
		})
	}

	return c.Status(fiber.StatusOK).JSON(users)
}

func (h *AuthHandler) BlockUser(c *fiber.Ctx) error {
	var body struct {
		UserID    uint `json:"userId"`
		BlockedID uint `json:"blockedId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	block := models.Block{
		UserID:    body.UserID,
		BlockedID: body.BlockedID,
	}

	if err := database.DB.Create(&block).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not block user"})
	}

	// Also remove friendship if exists
	database.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		body.UserID, body.BlockedID, body.BlockedID, body.UserID).Delete(&models.Friend{})

	return c.Status(fiber.StatusCreated).JSON(block)
}

func (h *AuthHandler) UnblockUser(c *fiber.Ctx) error {
	var body struct {
		UserID    uint `json:"userId"`
		BlockedID uint `json:"blockedId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Where("user_id = ? AND blocked_id = ?", body.UserID, body.BlockedID).Delete(&models.Block{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not unblock user"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *AuthHandler) GetBlockedUsers(c *fiber.Ctx) error {
	userId := c.Params("id")
	var blocks []models.Block
	if err := database.DB.Where("user_id = ?", userId).Find(&blocks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch blocked users"})
	}

	var blockedIDs []uint
	for _, b := range blocks {
		blockedIDs = append(blockedIDs, b.BlockedID)
	}

	if len(blockedIDs) == 0 {
		return c.Status(fiber.StatusOK).JSON([]models.User{})
	}

	var users []models.User
	if err := database.DB.Where("id IN ?", blockedIDs).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch blocked user details"})
	}

	return c.Status(fiber.StatusOK).JSON(users)
}
