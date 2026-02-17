package handlers

import (
	"errors"
	"fmt"
	"log"
	"mime"
	"net/mail"
	"os"
	"path/filepath"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strings"
	"time"
	"unicode/utf8"

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

func resolveProfileRoleForUpdate(currentRole string, requestedRole string) string {
	currentNormalized := strings.TrimSpace(strings.ToLower(currentRole))
	if models.IsAdminRole(currentNormalized) {
		return currentNormalized
	}

	requestedNormalized := strings.TrimSpace(strings.ToLower(requestedRole))
	if requestedNormalized == "" {
		return normalizePortalRole(currentRole)
	}
	if models.IsAdminRole(requestedNormalized) {
		return normalizePortalRole(currentRole)
	}
	if models.IsPortalRole(requestedNormalized) {
		return requestedNormalized
	}

	return normalizePortalRole(currentRole)
}

func isAdminRoleRequested(role string) bool {
	return models.IsAdminRole(strings.TrimSpace(strings.ToLower(role)))
}

func applyPortalRoleAndGodMode(user *models.User, role string, godModeEnabled bool) {
	user.Role = normalizePortalRole(role)
	user.GodModeEnabled = godModeEnabled
}

func resolveGodModeForUpdate(currentValue bool, requestedValue bool, currentRole string) bool {
	currentRole = strings.TrimSpace(strings.ToLower(currentRole))
	if models.IsAdminRole(currentRole) {
		return requestedValue
	}
	return currentValue
}

func sanitizeUsers(users []models.User) {
	for i := range users {
		users[i].Password = ""
	}
}

func sanitizeAvatarExtension(filename string) string {
	ext := strings.ToLower(strings.TrimSpace(filepath.Ext(filename)))
	if ext == "" || len(ext) > 10 || !strings.HasPrefix(ext, ".") {
		return ""
	}
	for _, r := range ext[1:] {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') {
			return ""
		}
	}
	return ext
}

func isAllowedAvatarExtension(ext string) bool {
	switch strings.ToLower(strings.TrimSpace(ext)) {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif":
		return true
	default:
		return false
	}
}

func isAllowedAvatarContentType(contentType string) bool {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	return strings.HasPrefix(contentType, "image/")
}

func buildTokenPairResponse(message string, user models.User, sessionID uint, accessToken string, accessTokenExpiresAt time.Time, refreshToken string, refreshTokenExpiresAt time.Time) fiber.Map {
	response := fiber.Map{
		"message": message,
		"token":   accessToken, // Legacy compatibility for existing clients.
		"user":    user,
	}

	if sessionID > 0 {
		response["accessToken"] = accessToken
		response["refreshToken"] = refreshToken
		response["accessTokenExpiresAt"] = accessTokenExpiresAt.UTC().Format(time.RFC3339)
		response["refreshTokenExpiresAt"] = refreshTokenExpiresAt.UTC().Format(time.RFC3339)
		response["sessionId"] = sessionID
	}

	return response
}

func validateRegistrationCredentials(email, password string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)
	if email == "" || password == "" {
		return errors.New("Email and password are required")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return errors.New("Invalid email format")
	}
	if utf8.RuneCountInString(password) < 8 {
		return errors.New("Password must be at least 8 characters")
	}
	return nil
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
	// God mode cannot be set from public registration payload.
	applyPortalRoleAndGodMode(&user, registerData.Role, false)

	if err := validateRegistrationCredentials(user.Email, user.Password); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
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

	authNow := time.Now().UTC()
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

	if config.AuthRefreshV1Enabled() {
		session, refreshToken, sessionErr := createAuthSession(user.ID, registerData.DeviceID, authNow)
		if sessionErr != nil {
			log.Printf("[AUTH] Failed to create auth session: %v", sessionErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not create auth session",
			})
		}

		accessToken, accessExpiresAt, tokenErr := buildAccessToken(user, session.ID, authNow)
		if tokenErr != nil {
			log.Printf("[AUTH] Failed to generate access token: %v", tokenErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not generate token",
			})
		}

		return c.Status(fiber.StatusCreated).JSON(buildTokenPairResponse(
			"User registered successfully",
			user,
			session.ID,
			accessToken,
			accessExpiresAt,
			refreshToken,
			session.ExpiresAt,
		))
	}

	// Legacy auth flow when refresh sessions are disabled.
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
		"exp":    authNow.Add(time.Hour * 24 * 7).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Printf("[AUTH] Failed to generate token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not generate token",
		})
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

	authNow := time.Now().UTC()
	if config.AuthRefreshV1Enabled() {
		session, refreshToken, sessionErr := createAuthSession(user.ID, loginData.DeviceID, authNow)
		if sessionErr != nil {
			log.Printf("[AUTH] Failed to create auth session: %v", sessionErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not create auth session",
			})
		}

		accessToken, accessExpiresAt, tokenErr := buildAccessToken(user, session.ID, authNow)
		if tokenErr != nil {
			log.Printf("[AUTH] Failed to generate access token: %v", tokenErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not generate token",
			})
		}

		return c.Status(fiber.StatusOK).JSON(buildTokenPairResponse(
			"Login successful",
			user,
			session.ID,
			accessToken,
			accessExpiresAt,
			refreshToken,
			session.ExpiresAt,
		))
	}

	// Legacy auth flow when refresh sessions are disabled.
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
		"exp":    authNow.Add(time.Hour * 24 * 7).Unix(),
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

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	if !config.AuthRefreshV1Enabled() {
		middleware.SetErrorCode(c, "auth_refresh_disabled")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "refresh endpoint is disabled",
		})
	}

	var req struct {
		RefreshToken string `json:"refreshToken"`
		SessionID    uint   `json:"sessionId"`
		DeviceID     string `json:"deviceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		middleware.SetErrorCode(c, "auth_refresh_bad_json")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	refreshToken := strings.TrimSpace(req.RefreshToken)
	if refreshToken == "" {
		_ = services.GetMetricsService().Increment(services.MetricAuthRefreshFail, 1)
		middleware.SetErrorCode(c, "auth_refresh_missing_token")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "refreshToken is required",
		})
	}

	now := time.Now().UTC()
	refreshHash := hashRefreshToken(refreshToken)
	deviceID := strings.TrimSpace(req.DeviceID)

	var session models.AuthSession
	if err := database.DB.Where("refresh_token_hash = ?", refreshHash).First(&session).Error; err != nil {
		_ = services.GetMetricsService().Increment(services.MetricAuthRefreshFail, 1)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			middleware.SetErrorCode(c, "auth_refresh_invalid_token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid refresh token",
			})
		}
		log.Printf("[AUTH] Failed to lookup refresh session by token hash: %v", err)
		middleware.SetErrorCode(c, "auth_refresh_lookup_failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate refresh token",
		})
	}

	if req.SessionID > 0 && req.SessionID != session.ID {
		_ = services.GetMetricsService().Increment(services.MetricAuthRefreshFail, 1)
		middleware.SetErrorCode(c, "auth_refresh_invalid_session")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid session",
		})
	}

	if session.RevokedAt != nil || !session.ExpiresAt.After(now) {
		_ = services.GetMetricsService().Increment(services.MetricAuthRefreshFail, 1)
		middleware.SetErrorCode(c, "auth_refresh_expired")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Refresh session expired",
		})
	}

	var user models.User
	if err := database.DB.First(&user, session.UserID).Error; err != nil {
		_ = services.GetMetricsService().Increment(services.MetricAuthRefreshFail, 1)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			middleware.SetErrorCode(c, "auth_refresh_user_not_found")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Session user not found",
			})
		}
		log.Printf("[AUTH] Failed to load user %d for refresh session %d: %v", session.UserID, session.ID, err)
		middleware.SetErrorCode(c, "auth_refresh_user_lookup_failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate session user",
		})
	}
	if user.IsBlocked {
		_ = services.GetMetricsService().Increment(services.MetricAuthRefreshFail, 1)
		middleware.SetErrorCode(c, "auth_refresh_user_blocked")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User is blocked",
		})
	}

	newRefreshToken, err := rotateAuthSession(&session, deviceID, now)
	if err != nil {
		log.Printf("[AUTH] Failed to rotate refresh session %d: %v", session.ID, err)
		middleware.SetErrorCode(c, "auth_refresh_rotate_failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not rotate refresh session",
		})
	}

	accessToken, accessExpiresAt, err := buildAccessToken(user, session.ID, now)
	if err != nil {
		log.Printf("[AUTH] Failed to generate rotated access token: %v", err)
		middleware.SetErrorCode(c, "auth_refresh_access_token_failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not generate token",
		})
	}

	user.Password = ""
	_ = services.GetMetricsService().Increment(services.MetricAuthRefreshSuccess, 1)

	return c.Status(fiber.StatusOK).JSON(buildTokenPairResponse(
		"Token refreshed",
		user,
		session.ID,
		accessToken,
		accessExpiresAt,
		newRefreshToken,
		session.ExpiresAt,
	))
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	if !config.AuthRefreshV1Enabled() {
		return c.JSON(fiber.Map{"ok": true})
	}

	var req struct {
		RefreshToken string `json:"refreshToken"`
		SessionID    uint   `json:"sessionId"`
	}
	if err := c.BodyParser(&req); err != nil {
		middleware.SetErrorCode(c, "auth_logout_bad_json")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	sessionID := req.SessionID
	if sessionID == 0 {
		sessionID = middleware.GetSessionID(c)
	}

	refreshToken := strings.TrimSpace(req.RefreshToken)
	if refreshToken == "" && sessionID == 0 {
		middleware.SetErrorCode(c, "auth_logout_missing_subject")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "sessionId or refreshToken is required",
		})
	}

	userID := middleware.GetUserID(c)
	now := time.Now().UTC()

	query := database.DB.Model(&models.AuthSession{}).Where("revoked_at IS NULL")
	if userID > 0 {
		query = query.Where("user_id = ?", userID)
	}
	if refreshToken != "" {
		query = query.Where("refresh_token_hash = ?", hashRefreshToken(refreshToken))
	} else {
		query = query.Where("id = ?", sessionID)
	}

	result := query.Updates(map[string]interface{}{
		"revoked_at": now,
		"updated_at": now,
	})
	if result.Error != nil {
		middleware.SetErrorCode(c, "auth_logout_revoke_failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not revoke session",
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"revoked": result.RowsAffected,
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
	// Preserve privileged flags and avoid accidental role downgrades when role is omitted/invalid.
	user.Role = resolveProfileRoleForUpdate(user.Role, updateData.Role)
	// Non-admin users are never allowed to escalate GodMode through profile payload.
	user.GodModeEnabled = resolveGodModeForUpdate(user.GodModeEnabled, updateData.GodModeEnabled, user.Role)

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
		PushToken  string `json:"pushToken"`
		Platform   string `json:"platform"`
		Provider   string `json:"provider"`
		DeviceID   string `json:"deviceId"`
		AppVersion string `json:"appVersion"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	token := strings.TrimSpace(body.PushToken)
	if err := database.DB.Model(&models.User{}).Where("id = ?", userId).Update("push_token", token).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update push token"})
	}

	if token == "" {
		// Legacy clients may clear token by sending empty string.
		return c.JSON(fiber.Map{"message": "Push token cleared"})
	}

	_, _, err := services.GetPushService().UpsertUserDeviceToken(uint(userId), services.UserDeviceTokenInput{
		Token:      token,
		Provider:   body.Provider,
		Platform:   body.Platform,
		DeviceID:   body.DeviceID,
		AppVersion: body.AppVersion,
	})
	if err != nil {
		log.Printf("[AUTH] Failed to dual-write push token for user %d: %v", userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update push token"})
	}

	return c.JSON(fiber.Map{"message": "Push token updated"})
}

func (h *AuthHandler) RegisterPushToken(c *fiber.Ctx) error {
	var body struct {
		Token      string `json:"token"`
		PushToken  string `json:"pushToken"`
		Platform   string `json:"platform"`
		Provider   string `json:"provider"`
		DeviceID   string `json:"deviceId"`
		AppVersion string `json:"appVersion"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	token := strings.TrimSpace(body.Token)
	if token == "" {
		token = strings.TrimSpace(body.PushToken)
	}
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token is required"})
	}

	tokenRecord, isNew, err := services.GetPushService().UpsertUserDeviceToken(uint(userID), services.UserDeviceTokenInput{
		Token:      token,
		Provider:   body.Provider,
		Platform:   body.Platform,
		DeviceID:   body.DeviceID,
		AppVersion: body.AppVersion,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not register push token"})
	}

	// Legacy compatibility write.
	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Update("push_token", token).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update legacy push token"})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"tokenId": tokenRecord.ID,
		"isNew":   isNew,
	})
}

func (h *AuthHandler) UnregisterPushToken(c *fiber.Ctx) error {
	var body struct {
		Token     string `json:"token"`
		PushToken string `json:"pushToken"`
		DeviceID  string `json:"deviceId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	token := strings.TrimSpace(body.Token)
	if token == "" {
		token = strings.TrimSpace(body.PushToken)
	}
	deviceID := strings.TrimSpace(body.DeviceID)

	if token == "" && deviceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token or deviceId is required"})
	}

	invalidated, err := services.GetPushService().UnregisterUserDeviceToken(uint(userID), token, deviceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not unregister push token"})
	}

	if token != "" {
		if err := database.DB.Model(&models.User{}).Where("id = ? AND push_token = ?", userID, token).Update("push_token", "").Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update legacy push token"})
		}
	}

	return c.JSON(fiber.Map{
		"ok":          true,
		"invalidated": invalidated,
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

	user.LastSeen = time.Now().UTC().Format(time.RFC3339)
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
	ext := sanitizeAvatarExtension(file.Filename)
	if !isAllowedAvatarExtension(ext) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unsupported avatar file extension"})
	}
	contentType := strings.TrimSpace(file.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = mime.TypeByExtension(ext)
	}
	if !isAllowedAvatarContentType(contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only image avatars are supported"})
	}

	timestamp := time.Now().UnixNano()

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			// avatars/userId_timestamp.ext to avoid caching issues + uniqueness
			fileName := fmt.Sprintf("avatars/%d_%d%s", userId, timestamp, ext)

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
	if _, err := os.Stat(uploadDir); err != nil {
		if !os.IsNotExist(err) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to access avatar storage"})
		}
		if mkErr := os.MkdirAll(uploadDir, 0755); mkErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to prepare avatar storage"})
		}
	}

	filename := fmt.Sprintf("%d_%d%s", userId, timestamp, ext)
	avatarPath := filepath.Join(uploadDir, filename)

	if err := c.SaveFile(file, avatarPath); err != nil {
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
	if body.FriendID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "friendId is required"})
	}
	if body.FriendID == userId {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot add yourself as friend"})
	}
	var friendUser models.User
	if err := database.DB.Select("id").First(&friendUser, body.FriendID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Friend user not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not validate friend user"})
	}

	// Check if already friends
	var count int64
	if err := database.DB.Model(&models.Friend{}).Where("user_id = ? AND friend_id = ?", userId, body.FriendID).Count(&count).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check friendship"})
	}
	if count > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Already friends"})
	}

	friendship := models.Friend{
		UserID:   userId,
		FriendID: body.FriendID,
	}

	if err := database.DB.Create(&friendship).Error; err != nil {
		if isDuplicateKeyError(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Already friends"})
		}
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
	if body.FriendID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "friendId is required"})
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
	if len(friendIDs) == 0 {
		return c.Status(fiber.StatusOK).JSON([]models.User{})
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

	var user models.User
	if err := database.DB.Select("id", "role").First(&user, userId).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load user"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	if !models.IsAdminRole(user.Role) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	var totalUsers int64
	if err := database.DB.Debug().Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		log.Printf("[AdminStats] CRITICAL SQL ERROR counting total users: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	var totalReferrals int64
	var activeReferrals int64
	var pendingReferrals int64

	if err := database.DB.Debug().Model(&models.User{}).Where("referrer_id IS NOT NULL").Count(&totalReferrals).Error; err != nil {
		log.Printf("[AdminStats] CRITICAL SQL ERROR counting total referrals: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
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
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

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
	if body.BlockedID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "blockedId is required"})
	}
	if body.BlockedID == userId {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot block yourself"})
	}
	var blockedUser models.User
	if err := database.DB.Select("id").First(&blockedUser, body.BlockedID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Blocked user not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not validate blocked user"})
	}
	var existingBlockCount int64
	if err := database.DB.Model(&models.Block{}).Where("user_id = ? AND blocked_id = ?", userId, body.BlockedID).Count(&existingBlockCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check block status"})
	}
	if existingBlockCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User is already blocked"})
	}

	block := models.Block{
		UserID:    userId,
		BlockedID: body.BlockedID,
	}

	if err := database.DB.Create(&block).Error; err != nil {
		if isDuplicateKeyError(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User is already blocked"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not block user"})
	}

	// Also remove friendship if exists
	if err := database.DB.Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userId, body.BlockedID, body.BlockedID, userId).Delete(&models.Friend{}).Error; err != nil {
		log.Printf("[AUTH] Failed to remove friendship while blocking user %d -> %d: %v", userId, body.BlockedID, err)
	}

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
	if body.BlockedID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "blockedId is required"})
	}

	result := database.DB.Where("user_id = ? AND blocked_id = ?", userId, body.BlockedID).Delete(&models.Block{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not unblock user"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Block not found"})
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
