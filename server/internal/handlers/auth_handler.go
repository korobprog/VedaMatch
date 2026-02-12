package handlers

import (
	"errors"
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
	"gorm.io/gorm"
)

type AuthHandler struct {
	ragService      *services.RAGService
	mapService      *services.MapService
	walletService   *services.WalletService
	referralService *services.ReferralService
}

func NewAuthHandler(walletService *services.WalletService, referralService *services.ReferralService) *AuthHandler {
	return &AuthHandler{
		ragService:      services.NewRAGService(),
		mapService:      services.NewMapService(database.DB),
		walletService:   walletService,
		referralService: referralService,
	}
}

func normalizePortalRole(role string) string {
	normalized := strings.TrimSpace(strings.ToLower(role))
	if models.IsPortalRole(normalized) {
		return normalized
	}
	return models.RoleUser
}

func isAdminRoleRequested(role string) bool {
	return models.IsAdminRole(strings.TrimSpace(strings.ToLower(role)))
}

func applyPortalRoleAndGodMode(user *models.User, role string, godModeEnabled bool) {
	user.Role = normalizePortalRole(role)
	user.GodModeEnabled = godModeEnabled
}

func sanitizeUsers(users []models.User) {
	for i := range users {
		users[i].Password = ""
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var registerData struct {
		models.User
		InviteCode string `json:"inviteCode"` // Optional invite code from referrer
	}
	if err := c.BodyParser(&registerData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	user := registerData.User
	user.Email = strings.TrimSpace(strings.ToLower(user.Email))
	if isAdminRoleRequested(registerData.Role) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin role cannot be assigned via public registration",
		})
	}
	applyPortalRoleAndGodMode(&user, registerData.Role, registerData.GodModeEnabled)

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

	// Generate invite code for the new user
	user.InviteCode = services.GenerateInviteCode()

	// Update registration logic to handle device ID provided from frontend
	if registerData.DeviceID != "" {
		user.DeviceID = registerData.DeviceID
	}

	// 1. Save to Database
	result := database.DB.Create(&user)
	if result.Error != nil {
		log.Printf("[AUTH] Registration failed: %v", result.Error)
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(result.Error.Error()), "duplicate") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Email already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create user",
		})
	}

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
		"role":   user.Role,
		"exp":    time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Printf("[AUTH] Failed to generate token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not generate token",
		})
	}

	user.Password = ""

	// Create wallet for the new user (initial 0 Active / 50 Pending LKM)
	_, err = h.walletService.GetOrCreateWallet(user.ID)
	if err != nil {
		log.Printf("[AUTH] Failed to create wallet for user %d: %v", user.ID, err)
		// We don't fail registration if wallet creation fails, but we log it
	}

	// Link referral if invite code was provided
	if registerData.InviteCode != "" {
		if err := h.referralService.LinkReferral(user.ID, registerData.InviteCode); err != nil {
			log.Printf("[AUTH] Failed to link referral for user %d: %v", user.ID, err)
			// Don't fail registration, just log
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"token":   tokenString,
		"user":    user,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var loginData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		DeviceID string `json:"deviceId"`
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
		log.Printf("[AUTH] Login failed: user not found (%s). Error: %v", loginData.Email, result.Error)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or user not found",
		})
	}

	log.Printf("[AUTH] User found for login: %s (ID: %d, Role: %s)", user.Email, user.ID, user.Role)

	// Compare passwords
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginData.Password))
	if err != nil {
		log.Printf("[AUTH] Login failed: invalid password for %s", loginData.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid password",
		})
	}

	// Update DeviceID if provided
	if loginData.DeviceID != "" && loginData.DeviceID != user.DeviceID {
		user.DeviceID = loginData.DeviceID
		if err := database.DB.Model(&user).Update("device_id", user.DeviceID).Error; err != nil {
			log.Printf("[AUTH] Failed to update device_id for user %d: %v", user.ID, err)
		}
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
		"role":   user.Role,
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
	var updateData struct {
		models.User
		// Additional fields for coordinates from frontend
		Latitude  *float64 `json:"latitude"`
		Longitude *float64 `json:"longitude"`
	}
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

	// Check if city changed
	cityChanged := updateData.City != "" && updateData.City != user.City

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
	user.Bio = updateData.Bio
	user.Interests = updateData.Interests
	user.LookingFor = updateData.LookingFor
	user.Intentions = updateData.Intentions
	user.Skills = updateData.Skills
	user.Industry = updateData.Industry
	user.LookingForBusiness = updateData.LookingForBusiness
	user.DatingEnabled = updateData.DatingEnabled
	user.Yatra = updateData.Yatra
	user.Timezone = updateData.Timezone
	user.MaritalStatus = updateData.MaritalStatus
	user.BirthTime = updateData.BirthTime
	user.IsProfileComplete = true
	applyPortalRoleAndGodMode(&user, updateData.Role, updateData.GodModeEnabled)

	// Handle coordinates
	if updateData.Latitude != nil && updateData.Longitude != nil {
		// Use coordinates from frontend (from autocomplete)
		user.Latitude = updateData.Latitude
		user.Longitude = updateData.Longitude
		log.Printf("[Profile] Using coordinates from frontend: %f, %f", *updateData.Latitude, *updateData.Longitude)
	} else if cityChanged && h.mapService != nil {
		// City changed but no coordinates provided - geocode it
		geocoded, err := h.mapService.GeocodeCity(updateData.City)
		if err != nil {
			log.Printf("[Profile] Geocoding failed for city '%s': %v", updateData.City, err)
			// Don't fail the request, just log the error
		} else {
			// Use normalized city name and coordinates
			user.City = geocoded.City
			if updateData.Country == "" {
				user.Country = geocoded.Country
			}
			user.Latitude = &geocoded.Latitude
			user.Longitude = &geocoded.Longitude
			log.Printf("[Profile] Geocoded city '%s' -> '%s' (%f, %f)", updateData.City, geocoded.City, geocoded.Latitude, geocoded.Longitude)
		}
	}

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

func (h *AuthHandler) UpdatePushToken(c *fiber.Ctx) error {
	var body struct {
		PushToken string `json:"pushToken"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userId).Update("push_token", body.PushToken).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update push token"})
	}

	return c.JSON(fiber.Map{"message": "Push token updated"})
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
	if err := database.DB.Model(&user).Update("last_seen", user.LastSeen).Error; err != nil {
		log.Printf("[AUTH] Failed to update heartbeat last_seen for user %d: %v", user.ID, err)
	}

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
				if err := database.DB.Model(&models.User{}).Where("id = ?", userId).Update("avatar_url", avatarURL).Error; err != nil {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update avatar URL"})
				}
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
	if err := database.DB.Model(&models.User{}).Where("id = ?", userId).Update("avatar_url", avatarURL).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update avatar URL"})
	}

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

	// Check if already friends
	var count int64
	database.DB.Model(&models.Friend{}).Where("user_id = ? AND friend_id = ?", userId, body.FriendID).Count(&count)
	if count > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Already friends"})
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
	sanitizeUsers(users)

	return c.Status(fiber.StatusOK).JSON(users)
}

func (h *AuthHandler) AdminStats(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Check if the user is an admin (assuming admin status is stored in the user model or can be checked)
	// For now, let's assume any logged-in user can access this for testing, or add an admin check later.
	// Example:
	// var user models.User
	// if err := database.DB.First(&user, userId).Error; err != nil {
	// 	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	// }
	// if !user.IsAdmin {
	// 	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	// }

	var totalUsers int64
	if err := database.DB.Debug().Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		log.Printf("[AdminStats] CRITICAL SQL ERROR counting total users: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error: " + err.Error()})
	}

	var totalReferrals int64
	var activeReferrals int64
	var pendingReferrals int64

	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL").Count(&totalReferrals).Error; err != nil {
		log.Printf("[AdminStats] CRITICAL SQL ERROR counting total referrals: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error: " + err.Error()})
	}

	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL AND referral_status = ?", models.ReferralStatusActivated).Count(&activeReferrals).Error; err != nil {
		log.Printf("[AdminStats] SQL Warning counting active referrals: %v", err)
	}

	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL AND referral_status = ?", models.ReferralStatusPending).Count(&pendingReferrals).Error; err != nil {
		log.Printf("[AdminStats] SQL Warning counting pending referrals: %v", err)
	}

	var totalEarnedByReferrers int64
	if err := database.DB.Debug().Model(&models.WalletTransaction{}).
		Where("description LIKE ?", "%Реферальный бонус%").
		Select("COALESCE(SUM(amount), 0)").Scan(&totalEarnedByReferrers).Error; err != nil {
		log.Printf("[AdminStats] SQL Warning calculating total earned: %v", err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"totalUsers":             totalUsers,
		"totalReferrals":         totalReferrals,
		"activeReferrals":        activeReferrals,
		"pendingReferrals":       pendingReferrals,
		"totalEarnedByReferrers": totalEarnedByReferrers,
	})
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
	sanitizeUsers(users)

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
	sanitizeUsers(users)

	return c.Status(fiber.StatusOK).JSON(users)
}
