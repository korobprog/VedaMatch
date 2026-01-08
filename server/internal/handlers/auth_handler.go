package handlers

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
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

	// Generate JWT token
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("[AUTH] JWT_SECRET not configured")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.ID,
		"email":  user.Email,
		"exp":    time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Printf("[AUTH] Failed to generate token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not generate token",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Login successful",
		"token":   tokenString,
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

	userId := middleware.GetUserID(c)
	if userId == 0 {
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

	// Update fields
	user.KarmicName = updateData.KarmicName
	user.SpiritualName = updateData.SpiritualName
	user.Gender = updateData.Gender
	user.Country = updateData.Country
	user.City = updateData.City
	user.Identity = updateData.Identity
	user.Diet = updateData.Diet
	user.Madh = updateData.Madh
	user.YogaStyle = updateData.YogaStyle
	user.Guna = updateData.Guna
	user.Mentor = updateData.Mentor
	user.Dob = updateData.Dob
	user.IsProfileComplete = true // Mark as complete since we are updating profile

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update profile",
		})
	}

	user.Password = ""
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

func (h *AuthHandler) Heartbeat(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	user.LastSeen = time.Now().Format(time.RFC3339)
	database.DB.Model(&user).Update("last_seen", user.LastSeen)

	return c.SendStatus(fiber.StatusOK)
}

func (h *AuthHandler) UploadAvatar(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No avatar file provided"})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			// avatars/userId_timestamp.ext to avoid caching issues + uniqueness
			fileName := fmt.Sprintf("avatars/%d_%d%s", userId, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			avatarURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				log.Printf("[S3] Avatar uploaded: %s", avatarURL)
				database.DB.Model(&models.User{}).Where("id = ?", userId).Update("avatar_url", avatarURL)
				return c.Status(fiber.StatusOK).JSON(fiber.Map{
					"avatarUrl": avatarURL,
				})
			}
			log.Printf("[S3] Error uploading: %v. Falling back to local.", err)
		}
	}

	// 2. Fallback to Local Storage
	uploadDir := "./uploads/avatars"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	filename := fmt.Sprintf("%d_%s", userId, file.Filename)
	filepath := fmt.Sprintf("%s/%s", uploadDir, filename)

	if err := c.SaveFile(file, filepath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save avatar"})
	}

	avatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	database.DB.Model(&models.User{}).Where("id = ?", userId).Update("avatar_url", avatarURL)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"avatarUrl": avatarURL,
	})
}

func (h *AuthHandler) AddFriend(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var body struct {
		FriendID uint `json:"friendId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	friendship := models.Friend{
		UserID:   userId,
		FriendID: body.FriendID,
	}

	if err := database.DB.Create(&friendship).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not add friend"})
	}

	return c.Status(fiber.StatusCreated).JSON(friendship)
}

func (h *AuthHandler) RemoveFriend(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var body struct {
		FriendID uint `json:"friendId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Where("user_id = ? AND friend_id = ?", userId, body.FriendID).Delete(&models.Friend{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not remove friend"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *AuthHandler) GetFriends(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

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
		log.Printf("[Contacts] Error fetching contacts: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch contacts",
		})
	}
	log.Printf("[Contacts] Returning %d contacts to client", len(users))

	return c.Status(fiber.StatusOK).JSON(users)
}

func (h *AuthHandler) BlockUser(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		BlockedID uint `json:"blockedId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	block := models.Block{
		UserID:    userId,
		BlockedID: body.BlockedID,
	}

	if err := database.DB.Create(&block).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not block user"})
	}

	// Also remove friendship if exists
	database.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userId, body.BlockedID, body.BlockedID, userId).Delete(&models.Friend{})

	return c.Status(fiber.StatusCreated).JSON(block)
}

func (h *AuthHandler) UnblockUser(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		BlockedID uint `json:"blockedId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := database.DB.Where("user_id = ? AND blocked_id = ?", userId, body.BlockedID).Delete(&models.Block{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not unblock user"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *AuthHandler) GetBlockedUsers(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

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
