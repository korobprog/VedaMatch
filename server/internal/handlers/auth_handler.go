package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"path/filepath"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	ragService          *services.RAGService
	mapService          *services.MapService
	walletService       *services.WalletService
	referralService     *services.ReferralService
	telegramAuthService *services.TelegramAuthService
	webSocialAuthBridge *services.WebSocialAuthBridgeService
	proService          *services.ProService
}

func NewAuthHandler(walletService *services.WalletService, referralService *services.ReferralService) *AuthHandler {
	return &AuthHandler{
		ragService:          services.NewRAGService(),
		mapService:          services.NewMapService(database.DB),
		walletService:       walletService,
		referralService:     referralService,
		telegramAuthService: services.NewTelegramAuthService(database.DB),
		webSocialAuthBridge: services.NewWebSocialAuthBridgeService(),
		proService:          services.NewProService(walletService),
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

func resolveGodModeForUpdate(currentValue bool, _ bool, currentRole string) bool {
	currentRole = strings.TrimSpace(strings.ToLower(currentRole))
	if models.IsAdminRole(currentRole) {
		return true
	}
	return currentValue
}

func sanitizeUsers(users []models.User) {
	for i := range users {
		sanitizeUser(&users[i])
	}
}

func sanitizeUser(user *models.User) {
	if user == nil {
		return
	}
	user.Password = ""
	user.NicknameDisplay = services.NicknameDisplay(user.Nickname)
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

func buildDeletedUserPlaceholder(userID uint, now time.Time) string {
	return fmt.Sprintf("deleted_%d_%d", userID, now.Unix())
}

func deleteUserAccountData(userID uint) (models.User, []models.Media, error) {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return user, nil, err
	}

	var userMedia []models.Media
	if err := database.DB.Where("user_id = ?", userID).Find(&userMedia).Error; err != nil {
		return user, nil, err
	}

	now := time.Now().UTC()
	placeholder := buildDeletedUserPlaceholder(userID, now)
	deletedEmail := fmt.Sprintf("%s@deleted.local", placeholder)

	txErr := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.AuthSession{}).
			Where("user_id = ? AND revoked_at IS NULL", userID).
			Updates(map[string]interface{}{"revoked_at": now, "updated_at": now}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.UserDeviceToken{}).
			Where("user_id = ? AND invalidated_at IS NULL", userID).
			Updates(map[string]interface{}{"invalidated_at": now, "updated_at": now}).Error; err != nil {
			return err
		}

		if err := tx.Where("user_id = ? OR friend_id = ?", userID, userID).Delete(&models.Friend{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? OR blocked_id = ?", userID, userID).Delete(&models.Block{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserTag{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserPortalLayout{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserNewsSubscription{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserNewsFavorite{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? OR candidate_id = ?", userID, userID).Delete(&models.DatingFavorite{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", userID).Delete(&models.Media{}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"karmic_name":          placeholder,
			"spiritual_name":       "",
			"email":                deletedEmail,
			"password":             "",
			"gender":               "",
			"country":              "",
			"city":                 "",
			"latitude":             nil,
			"longitude":            nil,
			"identity":             "",
			"diet":                 "",
			"madh":                 "",
			"yoga_style":           "",
			"guna":                 "",
			"mentor":               "",
			"dob":                  "",
			"bio":                  "",
			"interests":            "",
			"looking_for":          "",
			"intentions":           "",
			"skills":               "",
			"industry":             "",
			"looking_for_business": "",
			"marital_status":       "",
			"birth_time":           "",
			"birth_place_link":     "",
			"dating_enabled":       false,
			"is_profile_complete":  false,
			"rag_file_id":          "",
			"avatar_url":           "",
			"push_token":           "",
			"device_id":            "",
			"yatra":                "",
			"timezone":             "",
			"updated_at":           now,
		}).Error; err != nil {
			return err
		}

		if err := tx.Delete(&user).Error; err != nil {
			return err
		}
		return nil
	})
	if txErr != nil {
		return user, userMedia, txErr
	}

	return user, userMedia, nil
}

func cleanupDeletedUserUploads(user models.User, userMedia []models.Media) {
	for _, media := range userMedia {
		if err := removeLocalUploadByURL(media.URL); err != nil {
			log.Printf("[AUTH] failed to remove local media after account deletion user=%d url=%s err=%v", user.ID, media.URL, err)
		}
	}
	if err := removeLocalUploadByURL(user.AvatarURL); err != nil {
		log.Printf("[AUTH] failed to remove avatar after account deletion user=%d url=%s err=%v", user.ID, user.AvatarURL, err)
	}
}

func removeLocalUploadByURL(mediaURL string) error {
	url := strings.TrimSpace(mediaURL)
	if url == "" {
		return nil
	}
	if !strings.HasPrefix(url, "/uploads/") {
		return nil
	}
	relative := strings.TrimPrefix(url, "/")
	localPath := filepath.Clean("./" + relative)
	if !strings.HasPrefix(localPath, "uploads"+string(filepath.Separator)) {
		return fmt.Errorf("unsafe local upload path: %s", mediaURL)
	}
	if err := os.Remove(localPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
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

func buildAuthResponsePayload(message string, user models.User, deviceID string) (fiber.Map, error) {
	authNow := time.Now().UTC()
	if config.AuthRefreshV1Enabled() {
		session, refreshToken, sessionErr := createAuthSession(user.ID, deviceID, authNow)
		if sessionErr != nil {
			log.Printf("[AUTH] Failed to create auth session: %v", sessionErr)
			return nil, errors.New("Could not create auth session")
		}

		accessToken, accessExpiresAt, tokenErr := buildAccessToken(user, session.ID, authNow)
		if tokenErr != nil {
			log.Printf("[AUTH] Failed to generate access token: %v", tokenErr)
			return nil, errors.New("Could not generate token")
		}

		return buildTokenPairResponse(
			message,
			user,
			session.ID,
			accessToken,
			accessExpiresAt,
			refreshToken,
			session.ExpiresAt,
		), nil
	}

	// Legacy auth flow when refresh sessions are disabled.
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		log.Println("[AUTH] JWT_SECRET not configured")
		return nil, errors.New("Server configuration error")
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
		return nil, errors.New("Could not generate token")
	}

	return fiber.Map{
		"message": message,
		"token":   tokenString,
		"user":    user,
	}, nil
}

func issueAuthResponse(c *fiber.Ctx, statusCode int, message string, user models.User, deviceID string) error {
	response, err := buildAuthResponsePayload(message, user, deviceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(statusCode).JSON(response)
}

func (h *AuthHandler) issueAuthResponseWithTelegramMobileState(c *fiber.Ctx, statusCode int, message string, user models.User, deviceID string, mobileAuthState string) error {
	response, err := buildAuthResponsePayload(message, user, deviceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	normalizedState := strings.TrimSpace(mobileAuthState)
	if normalizedState != "" {
		if h.telegramAuthService == nil {
			h.telegramAuthService = services.NewTelegramAuthService(database.DB)
		}

		rawPayload, marshalErr := json.Marshal(response)
		if marshalErr != nil {
			log.Printf("[AUTH] Failed to marshal Telegram mobile auth payload: %v", marshalErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not prepare Telegram mobile auth payload",
			})
		}

		if _, completeErr := h.telegramAuthService.CompleteMobileAuthState(normalizedState, rawPayload); completeErr != nil {
			return respondTelegramMobileAuthError(c, completeErr)
		}
	}

	return c.Status(statusCode).JSON(response)
}

func respondTelegramAuthError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrTelegramAuthDisabled):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":     "Telegram auth is disabled",
			"errorCode": "TELEGRAM_AUTH_DISABLED",
		})
	case errors.Is(err, services.ErrTelegramAuthBotTokenMissing):
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":     "Telegram auth bot token is not configured",
			"errorCode": "TELEGRAM_AUTH_BOT_TOKEN_MISSING",
		})
	case errors.Is(err, services.ErrTelegramInitDataExpired):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":     "Telegram initData is expired",
			"errorCode": "TELEGRAM_INIT_DATA_EXPIRED",
		})
	case errors.Is(err, services.ErrTelegramInitDataReplay):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":     "Telegram initData replay detected",
			"errorCode": "TELEGRAM_INIT_DATA_REPLAY",
		})
	case errors.Is(err, services.ErrTelegramInitDataInvalid):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":     "Telegram initData is invalid",
			"errorCode": "TELEGRAM_INIT_DATA_INVALID",
		})
	default:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":     "Telegram auth failed",
			"errorCode": "TELEGRAM_AUTH_FAILED",
		})
	}
}

func telegramInitDataFingerprint(raw string) string {
	normalized := strings.TrimSpace(raw)
	if normalized == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(normalized))
	return fmt.Sprintf("%x", sum[:6])
}

func respondTelegramMobileAuthError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrTelegramMobileAuthStateExpired):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":     "Telegram mobile auth session expired",
			"errorCode": "TELEGRAM_MOBILE_AUTH_EXPIRED",
		})
	case errors.Is(err, services.ErrTelegramMobileAuthStateNotReady):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Telegram mobile auth is not ready yet",
			"errorCode": "TELEGRAM_MOBILE_AUTH_NOT_READY",
		})
	case errors.Is(err, services.ErrTelegramMobileAuthStateConsumed):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Telegram mobile auth session is already consumed",
			"errorCode": "TELEGRAM_MOBILE_AUTH_CONSUMED",
		})
	case errors.Is(err, services.ErrTelegramMobileAuthDeviceMismatch):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":     "Telegram mobile auth device mismatch",
			"errorCode": "TELEGRAM_MOBILE_AUTH_DEVICE_MISMATCH",
		})
	case errors.Is(err, services.ErrTelegramMobileAuthStateInvalid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "Telegram mobile auth state is invalid",
			"errorCode": "TELEGRAM_MOBILE_AUTH_STATE_INVALID",
		})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":     "Telegram mobile auth failed",
			"errorCode": "TELEGRAM_MOBILE_AUTH_FAILED",
		})
	}
}

func validateAuthCredentials(email, password string) bool {
	return strings.TrimSpace(email) != "" && strings.TrimSpace(password) != ""
}

type googleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Locale        string `json:"locale"`
	Audience      string `json:"aud"`
}

var googleIDTokenVerifier = verifyGoogleIDToken

var (
	errGoogleAuthClientIDsMissing  = errors.New("google auth client IDs are not configured")
	errGoogleTokenAudienceMissing  = errors.New("google token payload missing aud")
	errGoogleTokenAudienceMismatch = errors.New("google token audience mismatch")
)

type vkUserInfo struct {
	UserID     int64
	Email      string
	FirstName  string
	LastName   string
	ScreenName string
}

var vkAccessTokenVerifier = verifyVKAccessToken
var vkCodeExchanger = exchangeVKCode
var vkWebCodeExchanger = exchangeVKWebCode

type vkAndroidCodeExchangeInput struct {
	Code         string
	CodeVerifier string
	VKDeviceID   string
	State        string
}

type vkAuthRequest struct {
	AccessToken  string `json:"accessToken"`
	Code         string `json:"code"`
	DeviceID     string `json:"deviceId"`
	Email        string `json:"email"`
	Platform     string `json:"platform"`
	State        string `json:"state"`
	CodeVerifier string `json:"codeVerifier"`
	VKDeviceID   string `json:"vkDeviceId"`
}

var vkAndroidCodeExchanger = exchangeVKAndroidCode

type linkedAuthProvider string

const (
	authProviderGoogle   linkedAuthProvider = "google"
	authProviderVK       linkedAuthProvider = "vk"
	authProviderTelegram linkedAuthProvider = "telegram"
)

type linkedProviderStatus struct {
	Provider linkedAuthProvider `json:"provider"`
	Linked   bool               `json:"linked"`
	Label    string             `json:"label,omitempty"`
	LinkedAt string             `json:"linkedAt,omitempty"`
}

type linkedAuthProvidersResponse struct {
	Providers    []linkedProviderStatus `json:"providers"`
	HasPassword  bool                   `json:"hasPassword"`
	MethodCount  int                    `json:"methodCount"`
	CanUnlinkAny bool                   `json:"canUnlinkAny"`
}

func parseGoogleEmailVerified(raw string) bool {
	value := strings.TrimSpace(strings.ToLower(raw))
	return value == "true" || value == "1" || value == "yes"
}

func normalizeGoogleLocale(locale string) string {
	normalized := strings.TrimSpace(strings.ToLower(locale))
	switch {
	case strings.HasPrefix(normalized, "ru"):
		return "ru"
	case strings.HasPrefix(normalized, "hi"):
		return "hi"
	default:
		return "en"
	}
}

func normalizeTelegramLocale(locale string) string {
	normalized := strings.TrimSpace(strings.ToLower(locale))
	switch {
	case strings.HasPrefix(normalized, "ru"),
		strings.HasPrefix(normalized, "uk"),
		strings.HasPrefix(normalized, "be"),
		strings.HasPrefix(normalized, "kk"),
		strings.HasPrefix(normalized, "uz"),
		strings.HasPrefix(normalized, "ky"),
		strings.HasPrefix(normalized, "tg"),
		strings.HasPrefix(normalized, "hy"),
		strings.HasPrefix(normalized, "az"),
		strings.HasPrefix(normalized, "mo"):
		return "ru"
	case strings.HasPrefix(normalized, "hi"):
		return "hi"
	default:
		return "en"
	}
}

func splitCSVEnv(raw string) []string {
	items := strings.Split(raw, ",")
	result := make([]string, 0, len(items))
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func resolveGoogleAllowedClientIDs() []string {
	envKeys := []string{
		"AUTH_GOOGLE_ALLOWED_CLIENT_IDS",
		"GOOGLE_LKM_WEB_CLIENT_ID",
		"GOOGLE_WEB_CLIENT_ID",
		"GOOGLE_IOS_CLIENT_ID",
		"GOOGLE_ANDROID_CLIENT_ID_DEBUG",
		"GOOGLE_ANDROID_CLIENT_ID_RELEASE",
	}

	seen := make(map[string]struct{}, len(envKeys))
	result := make([]string, 0, len(envKeys))
	for _, key := range envKeys {
		for _, value := range splitCSVEnv(os.Getenv(key)) {
			if _, exists := seen[value]; exists {
				continue
			}
			seen[value] = struct{}{}
			result = append(result, value)
		}
	}

	return result
}

func resolveGoogleLKMWebClientID() string {
	for _, key := range []string{"GOOGLE_LKM_WEB_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID"} {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func normalizeWebAuthOrigin(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	if parsed.Scheme != "https" && parsed.Scheme != "http" {
		return ""
	}
	if parsed.Host == "" || parsed.User != nil {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host
}

func resolveAllowedLKMWebOrigins() map[string]struct{} {
	defaults := []string{
		"https://lkm.vedamatch.ru",
		"https://lkm.vedamatch.com",
		"https://social.vedamatch.ru",
		"https://social.vedamatch.com",
		"http://localhost:3005",
		"http://127.0.0.1:3005",
		"http://localhost:3006",
		"http://127.0.0.1:3006",
	}

	allowed := make(map[string]struct{}, len(defaults))
	for _, origin := range defaults {
		if normalized := normalizeWebAuthOrigin(origin); normalized != "" {
			allowed[normalized] = struct{}{}
		}
	}

	for _, item := range splitCSVEnv(os.Getenv("LKM_WEB_ALLOWED_ORIGINS")) {
		if normalized := normalizeWebAuthOrigin(item); normalized != "" {
			allowed[normalized] = struct{}{}
		}
	}

	return allowed
}

func isAllowedLKMWebOrigin(origin string) bool {
	normalized := normalizeWebAuthOrigin(origin)
	if normalized == "" {
		return false
	}
	_, ok := resolveAllowedLKMWebOrigins()[normalized]
	return ok
}

func resolveVKWebRedirectURI() string {
	if value := strings.TrimSpace(os.Getenv("VK_WEB_REDIRECT_URI")); value != "" {
		return value
	}

	apiBaseURL := strings.TrimSpace(os.Getenv("NEXT_PUBLIC_API_URL"))
	if apiBaseURL != "" {
		parsed, err := url.Parse(apiBaseURL)
		if err == nil && parsed.Scheme != "" && parsed.Host != "" {
			return parsed.Scheme + "://" + parsed.Host + "/auth/vk/web/callback"
		}
	}

	return "https://api.vedamatch.ru/auth/vk/web/callback"
}

func resolveVKWebScope() string {
	if scope := strings.TrimSpace(os.Getenv("VK_WEB_SCOPE")); scope != "" {
		return scope
	}
	if scope := strings.TrimSpace(os.Getenv("VK_SCOPE")); scope != "" {
		return scope
	}
	return "email"
}

func isVKWebAuthConfigured() bool {
	return config.AuthVKEnabled() &&
		strings.TrimSpace(os.Getenv("VK_WEB_CLIENT_ID")) != "" &&
		strings.TrimSpace(os.Getenv("VK_WEB_CLIENT_SECRET")) != "" &&
		strings.TrimSpace(resolveVKWebRedirectURI()) != ""
}

func validateGoogleAudience(audience string) error {
	allowedClientIDs := resolveGoogleAllowedClientIDs()
	if len(allowedClientIDs) == 0 {
		return errGoogleAuthClientIDsMissing
	}

	actualAudience := strings.TrimSpace(audience)
	if actualAudience == "" {
		return errGoogleTokenAudienceMissing
	}

	for _, allowedAudience := range allowedClientIDs {
		if actualAudience == allowedAudience {
			return nil
		}
	}

	return fmt.Errorf("%w: %s", errGoogleTokenAudienceMismatch, actualAudience)
}

func verifyGoogleIDToken(idToken string) (*googleTokenInfo, error) {
	token := strings.TrimSpace(idToken)
	if token == "" {
		return nil, errors.New("idToken is required")
	}

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(token)
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create google tokeninfo request: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google token verification request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google token verification failed status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload googleTokenInfo
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse google tokeninfo response: %w", err)
	}
	if strings.TrimSpace(payload.Sub) == "" {
		return nil, errors.New("google token payload missing sub")
	}

	return &payload, nil
}

func buildGoogleFallbackEmail(sub string) string {
	trimmed := strings.TrimSpace(strings.ToLower(sub))
	if trimmed == "" {
		trimmed = strconv.FormatInt(time.Now().UTC().UnixNano(), 10)
	}
	return fmt.Sprintf("google_%s@oauth.vedamatch.local", trimmed)
}

func verifyVKAccessToken(accessToken string) (*vkUserInfo, error) {
	token := strings.TrimSpace(accessToken)
	if token == "" {
		return nil, errors.New("accessToken is required")
	}

	endpoint := "https://api.vk.com/method/users.get?access_token=" + url.QueryEscape(token) + "&v=5.199&fields=screen_name"
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create vk users.get request: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("vk users.get request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("vk users.get failed status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Response []struct {
			ID         int64  `json:"id"`
			FirstName  string `json:"first_name"`
			LastName   string `json:"last_name"`
			ScreenName string `json:"screen_name"`
		} `json:"response"`
		Error *struct {
			Code int    `json:"error_code"`
			Msg  string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse vk users.get response: %w", err)
	}
	if payload.Error != nil {
		return nil, fmt.Errorf("vk users.get error %d: %s", payload.Error.Code, payload.Error.Msg)
	}
	if len(payload.Response) == 0 || payload.Response[0].ID == 0 {
		return nil, errors.New("vk users.get returned empty user")
	}

	user := payload.Response[0]
	return &vkUserInfo{
		UserID:     user.ID,
		FirstName:  strings.TrimSpace(user.FirstName),
		LastName:   strings.TrimSpace(user.LastName),
		ScreenName: strings.TrimSpace(user.ScreenName),
	}, nil
}

func buildVKFallbackEmail(userID int64) string {
	if userID <= 0 {
		return fmt.Sprintf("vk_%d@oauth.vedamatch.local", time.Now().UTC().UnixNano())
	}
	return fmt.Sprintf("vk_%d@oauth.vedamatch.local", userID)
}

func buildTelegramFallbackEmail(userID int64) string {
	if userID <= 0 {
		return fmt.Sprintf("telegram_%d@oauth.vedamatch.local", time.Now().UTC().UnixNano())
	}
	return fmt.Sprintf("telegram_%d@oauth.vedamatch.local", userID)
}

func currentAuthUser(c *fiber.Ctx) (*models.User, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return nil, fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fiber.NewError(fiber.StatusUnauthorized, "User not found")
		}
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Could not load user")
	}
	if user.IsBlocked {
		return nil, fiber.NewError(fiber.StatusUnauthorized, "User is blocked")
	}

	return &user, nil
}

func isPasswordAuthAvailable(user models.User) bool {
	password := strings.TrimSpace(user.Password)
	email := strings.TrimSpace(strings.ToLower(user.Email))
	if password == "" || email == "" {
		return false
	}
	return !strings.HasSuffix(email, "@oauth.vedamatch.local")
}

func linkedAuthMethodCount(user models.User) int {
	count := 0
	if isPasswordAuthAvailable(user) {
		count++
	}
	if strings.TrimSpace(user.GoogleSub) != "" {
		count++
	}
	if user.VKUserID != nil && *user.VKUserID > 0 {
		count++
	}
	if user.TelegramUserID != nil && *user.TelegramUserID > 0 {
		count++
	}
	return count
}

func authProviderStatuses(user models.User) []linkedProviderStatus {
	providers := []linkedProviderStatus{
		{Provider: authProviderGoogle},
		{Provider: authProviderVK},
		{Provider: authProviderTelegram},
	}

	if strings.TrimSpace(user.GoogleSub) != "" {
		providers[0].Linked = true
		providers[0].Label = strings.TrimSpace(user.GoogleEmail)
		if user.GoogleLinkedAt != nil {
			providers[0].LinkedAt = user.GoogleLinkedAt.UTC().Format(time.RFC3339)
		}
	}

	if user.VKUserID != nil && *user.VKUserID > 0 {
		providers[1].Linked = true
		providers[1].Label = strings.TrimSpace(user.VKEmail)
		if user.VKLinkedAt != nil {
			providers[1].LinkedAt = user.VKLinkedAt.UTC().Format(time.RFC3339)
		}
	}

	if user.TelegramUserID != nil && *user.TelegramUserID > 0 {
		providers[2].Linked = true
		if username := strings.TrimSpace(user.TelegramUsername); username != "" {
			providers[2].Label = "@" + strings.TrimPrefix(username, "@")
		} else {
			providers[2].Label = strings.TrimSpace(strings.TrimSpace(user.TelegramFirstName + " " + user.TelegramLastName))
		}
		if user.TelegramLinkedAt != nil {
			providers[2].LinkedAt = user.TelegramLinkedAt.UTC().Format(time.RFC3339)
		}
	}

	return providers
}

func buildLinkedAuthProvidersResponse(user models.User) linkedAuthProvidersResponse {
	methodCount := linkedAuthMethodCount(user)
	return linkedAuthProvidersResponse{
		Providers:    authProviderStatuses(user),
		HasPassword:  isPasswordAuthAvailable(user),
		MethodCount:  methodCount,
		CanUnlinkAny: methodCount > 1,
	}
}

func parseLinkedAuthProvider(raw string) (linkedAuthProvider, bool) {
	switch linkedAuthProvider(strings.TrimSpace(strings.ToLower(raw))) {
	case authProviderGoogle:
		return authProviderGoogle, true
	case authProviderVK:
		return authProviderVK, true
	case authProviderTelegram:
		return authProviderTelegram, true
	default:
		return "", false
	}
}

func isProviderLinked(user models.User, provider linkedAuthProvider) bool {
	switch provider {
	case authProviderGoogle:
		return strings.TrimSpace(user.GoogleSub) != ""
	case authProviderVK:
		return user.VKUserID != nil && *user.VKUserID > 0
	case authProviderTelegram:
		return user.TelegramUserID != nil && *user.TelegramUserID > 0
	default:
		return false
	}
}

func clearProviderFields(updates map[string]interface{}, provider linkedAuthProvider) {
	switch provider {
	case authProviderGoogle:
		updates["google_sub"] = ""
		updates["google_email"] = ""
		updates["google_linked_at"] = nil
	case authProviderVK:
		updates["vk_user_id"] = nil
		updates["vk_email"] = ""
		updates["vk_linked_at"] = nil
	case authProviderTelegram:
		updates["telegram_user_id"] = nil
		updates["telegram_username"] = ""
		updates["telegram_first_name"] = ""
		updates["telegram_last_name"] = ""
		updates["telegram_linked_at"] = nil
	}
}

func resolveVKAccessToken(req vkAuthRequest) (string, string, error) {
	accessToken := strings.TrimSpace(req.AccessToken)
	email := strings.TrimSpace(req.Email)
	if accessToken != "" {
		return accessToken, email, nil
	}

	var (
		exchangedAccessToken string
		exchangedEmail       string
		exchangeErr          error
	)

	if req.Platform == "android" {
		exchangedAccessToken, exchangedEmail, _, exchangeErr = vkAndroidCodeExchanger(vkAndroidCodeExchangeInput{
			Code:         strings.TrimSpace(req.Code),
			CodeVerifier: strings.TrimSpace(req.CodeVerifier),
			VKDeviceID:   strings.TrimSpace(req.VKDeviceID),
			State:        strings.TrimSpace(req.State),
		})
	} else {
		exchangedAccessToken, exchangedEmail, _, exchangeErr = vkCodeExchanger(strings.TrimSpace(req.Code))
	}
	if exchangeErr != nil {
		return "", "", exchangeErr
	}
	if email == "" {
		email = strings.TrimSpace(exchangedEmail)
	}
	return strings.TrimSpace(exchangedAccessToken), email, nil
}

func exchangeVKCodeWithConfig(code string, clientID string, clientSecret string, redirectURI string) (accessToken string, email string, userID int64, err error) {
	clientID = strings.TrimSpace(clientID)
	clientSecret = strings.TrimSpace(clientSecret)
	redirectURI = strings.TrimSpace(redirectURI)
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return "", "", 0, errors.New("VK env config is incomplete")
	}

	query := url.Values{}
	query.Set("client_id", clientID)
	query.Set("client_secret", clientSecret)
	query.Set("redirect_uri", redirectURI)
	query.Set("code", strings.TrimSpace(code))

	endpoint := "https://oauth.vk.com/access_token?" + query.Encode()
	req, reqErr := http.NewRequest(http.MethodGet, endpoint, nil)
	if reqErr != nil {
		return "", "", 0, fmt.Errorf("failed to create vk access_token request: %w", reqErr)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, doErr := client.Do(req)
	if doErr != nil {
		return "", "", 0, fmt.Errorf("vk access_token request failed: %w", doErr)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return "", "", 0, fmt.Errorf("vk access_token failed status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		AccessToken string `json:"access_token"`
		Email       string `json:"email"`
		UserID      int64  `json:"user_id"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if unmarshalErr := json.Unmarshal(body, &payload); unmarshalErr != nil {
		return "", "", 0, fmt.Errorf("failed to parse vk access_token response: %w", unmarshalErr)
	}
	if payload.Error != "" {
		if payload.ErrorDesc != "" {
			return "", "", 0, fmt.Errorf("vk access_token error %s: %s", payload.Error, payload.ErrorDesc)
		}
		return "", "", 0, fmt.Errorf("vk access_token error: %s", payload.Error)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return "", "", 0, errors.New("vk access_token is empty")
	}

	return strings.TrimSpace(payload.AccessToken), strings.TrimSpace(payload.Email), payload.UserID, nil
}

func exchangeVKCode(code string) (accessToken string, email string, userID int64, err error) {
	return exchangeVKCodeWithConfig(
		code,
		os.Getenv("VK_CLIENT_ID"),
		os.Getenv("VK_CLIENT_SECRET"),
		os.Getenv("VK_REDIRECT_URI"),
	)
}

type vkWebCodeExchangeInput struct {
	Code         string
	CodeVerifier string
	VKDeviceID   string
}

func exchangeVKWebCode(input vkWebCodeExchangeInput) (accessToken string, email string, userID int64, err error) {
	clientID := strings.TrimSpace(os.Getenv("VK_WEB_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("VK_WEB_CLIENT_SECRET"))
	code := strings.TrimSpace(input.Code)
	codeVerifier := strings.TrimSpace(input.CodeVerifier)
	vkDeviceID := strings.TrimSpace(input.VKDeviceID)

	if clientID == "" || clientSecret == "" {
		return "", "", 0, errors.New("VK web env config is incomplete")
	}
	if code == "" || codeVerifier == "" || vkDeviceID == "" {
		return "", "", 0, errors.New("VK web code exchange payload is incomplete")
	}

	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("code", code)
	form.Set("code_verifier", codeVerifier)
	form.Set("device_id", vkDeviceID)
	form.Set("grant_type", "authorization_code")
	form.Set("redirect_uri", resolveVKWebRedirectURI())

	req, reqErr := http.NewRequest(http.MethodPost, "https://id.vk.com/oauth2/auth", strings.NewReader(form.Encode()))
	if reqErr != nil {
		return "", "", 0, fmt.Errorf("failed to create vk web auth request: %w", reqErr)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, doErr := client.Do(req)
	if doErr != nil {
		return "", "", 0, fmt.Errorf("vk web auth request failed: %w", doErr)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return "", "", 0, fmt.Errorf("vk web auth failed status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		AccessToken string `json:"access_token"`
		Email       string `json:"email"`
		UserID      int64  `json:"user_id"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if unmarshalErr := json.Unmarshal(body, &payload); unmarshalErr != nil {
		return "", "", 0, fmt.Errorf("failed to parse vk web auth response: %w", unmarshalErr)
	}
	if payload.Error != "" {
		if payload.ErrorDesc != "" {
			return "", "", 0, fmt.Errorf("vk web auth error %s: %s", payload.Error, payload.ErrorDesc)
		}
		return "", "", 0, fmt.Errorf("vk web auth error: %s", payload.Error)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return "", "", 0, errors.New("vk web access_token is empty")
	}

	return strings.TrimSpace(payload.AccessToken), strings.TrimSpace(payload.Email), payload.UserID, nil
}

func generatePKCECodeVerifier() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func buildPKCECodeChallenge(codeVerifier string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(codeVerifier)))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func exchangeVKAndroidCode(input vkAndroidCodeExchangeInput) (accessToken string, email string, userID int64, err error) {
	clientID := strings.TrimSpace(os.Getenv("VK_ANDROID_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("VK_ANDROID_CLIENT_SECRET"))
	code := strings.TrimSpace(input.Code)
	codeVerifier := strings.TrimSpace(input.CodeVerifier)
	vkDeviceID := strings.TrimSpace(input.VKDeviceID)
	state := strings.TrimSpace(input.State)

	if clientID == "" || clientSecret == "" {
		return "", "", 0, errors.New("VK android env config is incomplete")
	}
	if code == "" || codeVerifier == "" || vkDeviceID == "" {
		return "", "", 0, errors.New("VK android code exchange payload is incomplete")
	}

	redirectURI := fmt.Sprintf("vk%s://vk.ru/blank.html", clientID)
	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("code", code)
	form.Set("code_verifier", codeVerifier)
	form.Set("device_id", vkDeviceID)
	form.Set("grant_type", "authorization_code")
	form.Set("redirect_uri", redirectURI)
	if state != "" {
		form.Set("state", state)
	}

	req, reqErr := http.NewRequest(http.MethodPost, "https://id.vk.com/oauth2/auth", strings.NewReader(form.Encode()))
	if reqErr != nil {
		return "", "", 0, fmt.Errorf("failed to create vk android auth request: %w", reqErr)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, doErr := client.Do(req)
	if doErr != nil {
		return "", "", 0, fmt.Errorf("vk android auth request failed: %w", doErr)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return "", "", 0, fmt.Errorf("vk android auth failed status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		AccessToken string `json:"access_token"`
		Email       string `json:"email"`
		UserID      int64  `json:"user_id"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if unmarshalErr := json.Unmarshal(body, &payload); unmarshalErr != nil {
		return "", "", 0, fmt.Errorf("failed to parse vk android auth response: %w", unmarshalErr)
	}
	if payload.Error != "" {
		if payload.ErrorDesc != "" {
			return "", "", 0, fmt.Errorf("vk android auth error %s: %s", payload.Error, payload.ErrorDesc)
		}
		return "", "", 0, fmt.Errorf("vk android auth error: %s", payload.Error)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return "", "", 0, errors.New("vk android access_token is empty")
	}

	return strings.TrimSpace(payload.AccessToken), strings.TrimSpace(payload.Email), payload.UserID, nil
}

func updateUserDeviceID(user *models.User, deviceID string) {
	if user == nil {
		return
	}
	value := strings.TrimSpace(deviceID)
	if value == "" || value == user.DeviceID {
		return
	}
	user.DeviceID = value
	if err := database.DB.Model(user).Update("device_id", user.DeviceID).Error; err != nil {
		log.Printf("[AUTH] Failed to update device_id for user %d: %v", user.ID, err)
	}
}

func createAuthUser(user *models.User) error {
	if user == nil {
		return errors.New("user is nil")
	}

	if strings.TrimSpace(user.InviteCode) == "" {
		user.InviteCode = services.GenerateInviteCode()
	}

	query := database.DB
	if strings.TrimSpace(user.GoogleSub) == "" {
		query = query.Omit("GoogleSub")
	}

	return query.Create(user).Error
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

	nicknameService := services.NewNicknameService(database.DB)
	nickname, nicknameSetManually, nicknameErr := nicknameService.AssignForRegistration(user.Nickname, user.Email, user.KarmicName)
	if nicknameErr != nil {
		status := fiber.StatusUnprocessableEntity
		message := "Invalid nickname"
		errorCode := "NICKNAME_INVALID"
		if errors.Is(nicknameErr, services.ErrNicknameTaken) {
			status = fiber.StatusConflict
			message = "Nickname already exists"
			errorCode = "NICKNAME_TAKEN"
		}
		return c.Status(status).JSON(fiber.Map{
			"error":     message,
			"errorCode": errorCode,
		})
	}
	user.Nickname = nickname
	user.NicknameSetManually = nicknameSetManually

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

	// Update registration logic to handle device ID provided from frontend
	if registerData.DeviceID != "" {
		user.DeviceID = registerData.DeviceID
	}

	// 1. Save to Database
	result := createAuthUser(&user)
	if result != nil {
		log.Printf("[AUTH] Registration failed: %v", result)
		if errors.Is(result, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(result.Error()), "duplicate") {
			lowerErr := strings.ToLower(result.Error())
			if strings.Contains(lowerErr, "nickname") {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error":     "Nickname already exists",
					"errorCode": "NICKNAME_TAKEN",
				})
			}
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Email already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create user",
		})
	}

	sanitizeUser(&user)

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

	return issueAuthResponse(c, fiber.StatusCreated, "User registered successfully", user, registerData.DeviceID)
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

	if !validateAuthCredentials(loginData.Email, loginData.Password) {
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

	passwordMatched, shouldMigratePassword := verifyPasswordWithLegacyFallback(user.Password, loginData.Password)
	if !passwordMatched {
		log.Printf("[AUTH] Login failed: invalid password for %s", loginData.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid password",
		})
	}
	if shouldMigratePassword {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(loginData.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("[AUTH] Failed to migrate legacy password hash for user %d: %v", user.ID, err)
		} else {
			if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("password", string(hashedPassword)).Error; err != nil {
				log.Printf("[AUTH] Failed to persist migrated password hash for user %d: %v", user.ID, err)
			} else {
				user.Password = string(hashedPassword)
				log.Printf("[AUTH] Migrated legacy password format to bcrypt for user %d", user.ID)
			}
		}
	}

	updateUserDeviceID(&user, loginData.DeviceID)
	if h.proService != nil {
		if err := h.proService.SyncEntitlement(user.ID); err != nil {
			log.Printf("[AUTH] Failed to sync PRO entitlement user=%d err=%v", user.ID, err)
		} else {
			_ = database.DB.First(&user, user.ID).Error
		}
	}

	sanitizeUser(&user)
	return issueAuthResponse(c, fiber.StatusOK, "Login successful", user, loginData.DeviceID)
}

func (h *AuthHandler) GetLinkedAuthProviders(c *fiber.Ctx) error {
	user, authErr := currentAuthUser(c)
	if authErr != nil {
		return c.Status(authErr.(*fiber.Error).Code).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(buildLinkedAuthProvidersResponse(*user))
}

func (h *AuthHandler) GoogleLink(c *fiber.Ctx) error {
	if !config.AuthGoogleEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Google auth is disabled",
		})
	}

	user, authErr := currentAuthUser(c)
	if authErr != nil {
		return c.Status(authErr.(*fiber.Error).Code).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	var req struct {
		IDToken string `json:"idToken"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	tokenInfo, err := googleIDTokenVerifier(req.IDToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid Google token",
		})
	}
	if err := validateGoogleAudience(tokenInfo.Audience); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Google token audience is not allowed",
		})
	}

	googleSub := strings.TrimSpace(tokenInfo.Sub)
	if googleSub == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Google token payload missing sub",
		})
	}

	googleEmail := strings.TrimSpace(strings.ToLower(tokenInfo.Email))
	if googleEmail == "" {
		googleEmail = buildGoogleFallbackEmail(googleSub)
	}

	var existing models.User
	if err := database.DB.Where("google_sub = ?", googleSub).First(&existing).Error; err == nil && existing.ID != user.ID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Google account is already linked to another user",
			"errorCode": "AUTH_PROVIDER_CONFLICT",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate Google account",
		})
	}

	now := time.Now().UTC()
	updates := map[string]interface{}{
		"google_sub":       googleSub,
		"google_email":     googleEmail,
		"google_linked_at": now,
	}
	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not link Google account",
		})
	}

	user.GoogleSub = googleSub
	user.GoogleEmail = googleEmail
	user.GoogleLinkedAt = &now
	sanitizeUser(user)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":   "Google account linked",
		"user":      user,
		"providers": buildLinkedAuthProvidersResponse(*user),
	})
}

func (h *AuthHandler) VKLink(c *fiber.Ctx) error {
	if !config.AuthVKEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "VK auth is disabled",
		})
	}

	user, authErr := currentAuthUser(c)
	if authErr != nil {
		return c.Status(authErr.(*fiber.Error).Code).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	var req vkAuthRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	req.AccessToken = strings.TrimSpace(req.AccessToken)
	req.Code = strings.TrimSpace(req.Code)
	req.Email = strings.TrimSpace(req.Email)
	req.Platform = strings.TrimSpace(strings.ToLower(req.Platform))
	req.State = strings.TrimSpace(req.State)
	req.CodeVerifier = strings.TrimSpace(req.CodeVerifier)
	req.VKDeviceID = strings.TrimSpace(req.VKDeviceID)
	if req.AccessToken == "" && req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "accessToken or code is required",
		})
	}

	accessToken, email, exchangeErr := resolveVKAccessToken(req)
	if exchangeErr != nil {
		log.Printf("[AUTH] VK link exchange failed: %v", exchangeErr)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid VK code",
		})
	}

	vkUser, err := vkAccessTokenVerifier(accessToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid VK token",
		})
	}

	var existing models.User
	if err := database.DB.Where("vk_user_id = ?", vkUser.UserID).First(&existing).Error; err == nil && existing.ID != user.ID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "VK account is already linked to another user",
			"errorCode": "AUTH_PROVIDER_CONFLICT",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate VK account",
		})
	}

	normalizedEmail := strings.TrimSpace(strings.ToLower(email))
	if normalizedEmail == "" {
		normalizedEmail = strings.TrimSpace(strings.ToLower(vkUser.Email))
	}

	now := time.Now().UTC()
	vkUserID := vkUser.UserID
	updates := map[string]interface{}{
		"vk_user_id":   vkUserID,
		"vk_email":     normalizedEmail,
		"vk_linked_at": now,
	}
	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not link VK account",
		})
	}

	user.VKUserID = &vkUserID
	user.VKEmail = normalizedEmail
	user.VKLinkedAt = &now
	sanitizeUser(user)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":   "VK account linked",
		"user":      user,
		"providers": buildLinkedAuthProvidersResponse(*user),
	})
}

func (h *AuthHandler) TelegramLinkStart(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	user, authErr := currentAuthUser(c)
	if authErr != nil {
		return c.Status(authErr.(*fiber.Error).Code).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	var req struct {
		DeviceID string `json:"deviceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	state, err := h.telegramAuthService.CreateMobileAuthStateForPurpose(req.DeviceID, user.ID, "link")
	if err != nil {
		log.Printf("[AUTH] Telegram link start failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not initialize Telegram link",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"state":     state.State,
		"launchUrl": h.telegramAuthService.ResolveMobileAuthLaunchURL(state.State),
		"expiresAt": state.ExpiresAt.UTC().Format(time.RFC3339),
	})
}

func (h *AuthHandler) TelegramLink(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	user, authErr := currentAuthUser(c)
	if authErr != nil {
		return c.Status(authErr.(*fiber.Error).Code).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	var req struct {
		State    string `json:"state"`
		DeviceID string `json:"deviceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	rawPayload, err := h.telegramAuthService.ConsumeMobileAuthState(req.State, req.DeviceID)
	if err != nil {
		return respondTelegramMobileAuthError(c, err)
	}

	var payload struct {
		TelegramUserID    int64  `json:"telegramUserId"`
		TelegramUsername  string `json:"telegramUsername"`
		TelegramFirstName string `json:"telegramFirstName"`
		TelegramLastName  string `json:"telegramLastName"`
	}
	if unmarshalErr := json.Unmarshal(rawPayload, &payload); unmarshalErr != nil || payload.TelegramUserID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Telegram mobile auth payload is invalid",
		})
	}

	var existing models.User
	if err := database.DB.Where("telegram_user_id = ?", payload.TelegramUserID).First(&existing).Error; err == nil && existing.ID != user.ID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Telegram account is already linked to another user",
			"errorCode": "AUTH_PROVIDER_CONFLICT",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate Telegram account",
		})
	}

	now := time.Now().UTC()
	telegramUserID := payload.TelegramUserID
	updates := map[string]interface{}{
		"telegram_user_id":    telegramUserID,
		"telegram_username":   strings.TrimSpace(payload.TelegramUsername),
		"telegram_first_name": strings.TrimSpace(payload.TelegramFirstName),
		"telegram_last_name":  strings.TrimSpace(payload.TelegramLastName),
		"telegram_linked_at":  now,
	}
	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not link Telegram account",
		})
	}

	user.TelegramUserID = &telegramUserID
	user.TelegramUsername = strings.TrimSpace(payload.TelegramUsername)
	user.TelegramFirstName = strings.TrimSpace(payload.TelegramFirstName)
	user.TelegramLastName = strings.TrimSpace(payload.TelegramLastName)
	user.TelegramLinkedAt = &now
	sanitizeUser(user)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":   "Telegram account linked",
		"user":      user,
		"providers": buildLinkedAuthProvidersResponse(*user),
	})
}

func (h *AuthHandler) TelegramMiniAppMobileLink(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	var req struct {
		InitData        string `json:"initData"`
		MobileAuthState string `json:"mobileAuthState"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	if strings.TrimSpace(req.InitData) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "initData is required",
		})
	}
	state := strings.TrimSpace(req.MobileAuthState)
	if state == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "mobileAuthState is required",
		})
	}

	entry, err := h.telegramAuthService.LoadMobileAuthState(state)
	if err != nil {
		return respondTelegramMobileAuthError(c, err)
	}
	if entry.Purpose != "link" || entry.TargetUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Telegram mobile link session is invalid",
		})
	}

	telegramUser, err := h.telegramAuthService.VerifyMiniAppInitDataWithPurpose(req.InitData, "miniapp_mobile_link")
	if err != nil {
		return respondTelegramAuthError(c, err)
	}

	var existing models.User
	if err := database.DB.Where("telegram_user_id = ?", telegramUser.ID).First(&existing).Error; err == nil && existing.ID != entry.TargetUserID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Telegram account is already linked to another user",
			"errorCode": "TELEGRAM_LINK_CONFLICT",
		})
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate Telegram link",
		})
	}

	linkPayload, marshalErr := json.Marshal(fiber.Map{
		"telegramUserId":    telegramUser.ID,
		"telegramUsername":  telegramUser.Username,
		"telegramFirstName": telegramUser.FirstName,
		"telegramLastName":  telegramUser.LastName,
	})
	if marshalErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not prepare Telegram link payload",
		})
	}

	if _, err := h.telegramAuthService.CompleteMobileAuthState(state, linkPayload); err != nil {
		return respondTelegramMobileAuthError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Telegram mobile link is ready",
	})
}

func (h *AuthHandler) UnlinkAuthProvider(c *fiber.Ctx) error {
	user, authErr := currentAuthUser(c)
	if authErr != nil {
		return c.Status(authErr.(*fiber.Error).Code).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	provider, ok := parseLinkedAuthProvider(c.Params("provider"))
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Unsupported auth provider",
		})
	}
	if !isProviderLinked(*user, provider) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Auth provider is not linked",
		})
	}
	if linkedAuthMethodCount(*user) <= 1 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Cannot unlink the last available sign-in method",
			"errorCode": "AUTH_PROVIDER_LAST_METHOD",
		})
	}

	updates := make(map[string]interface{})
	clearProviderFields(updates, provider)
	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not unlink auth provider",
		})
	}

	switch provider {
	case authProviderGoogle:
		user.GoogleSub = ""
		user.GoogleEmail = ""
		user.GoogleLinkedAt = nil
	case authProviderVK:
		user.VKUserID = nil
		user.VKEmail = ""
		user.VKLinkedAt = nil
	case authProviderTelegram:
		user.TelegramUserID = nil
		user.TelegramUsername = ""
		user.TelegramFirstName = ""
		user.TelegramLastName = ""
		user.TelegramLinkedAt = nil
	}
	sanitizeUser(user)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":   "Auth provider unlinked",
		"user":      user,
		"providers": buildLinkedAuthProvidersResponse(*user),
	})
}

func (h *AuthHandler) SocialAuthConfig(c *fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"google": fiber.Map{
			"enabled":  config.AuthGoogleEnabled(),
			"clientId": resolveGoogleLKMWebClientID(),
		},
		"vk": fiber.Map{
			"enabled": isVKWebAuthConfigured(),
		},
	})
}

func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	_ = services.GetMetricsService().Increment(services.MetricAuthGoogleAttemptTotal, 1)
	if !config.AuthGoogleEnabled() {
		_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Google auth is disabled",
		})
	}

	var req struct {
		IDToken  string `json:"idToken"`
		DeviceID string `json:"deviceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	tokenInfo, err := googleIDTokenVerifier(req.IDToken)
	if err != nil {
		_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
		log.Printf("[AUTH] Google token verification failed: %v", err)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid Google token",
		})
	}
	if err := validateGoogleAudience(tokenInfo.Audience); err != nil {
		_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
		log.Printf("[AUTH] Google token audience validation failed: %v", err)
		if errors.Is(err, errGoogleAuthClientIDsMissing) {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "Google auth is not configured",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid Google token",
		})
	}

	now := time.Now().UTC()
	googleSub := strings.TrimSpace(tokenInfo.Sub)
	googleEmail := strings.TrimSpace(strings.ToLower(tokenInfo.Email))
	emailVerified := parseGoogleEmailVerified(tokenInfo.EmailVerified)
	if googleEmail == "" {
		googleEmail = buildGoogleFallbackEmail(googleSub)
	}

	var user models.User
	foundBySub := false

	if err := database.DB.Where("google_sub = ?", googleSub).First(&user).Error; err == nil {
		foundBySub = true
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
		log.Printf("[AUTH] Google login lookup by sub failed sub=%s: %v", googleSub, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not resolve Google account",
		})
	}

	if !foundBySub && emailVerified {
		if err := database.DB.Where("email = ?", googleEmail).First(&user).Error; err == nil {
			if strings.TrimSpace(user.GoogleSub) != "" && user.GoogleSub != googleSub {
				_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Google account is already linked to another user",
				})
			}
			updates := map[string]interface{}{
				"google_sub":       googleSub,
				"google_email":     googleEmail,
				"google_linked_at": now,
			}
			if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
				_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
				log.Printf("[AUTH] Google login link existing user failed user=%d sub=%s: %v", user.ID, googleSub, err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Could not link Google account",
				})
			}
			user.GoogleSub = googleSub
			user.GoogleEmail = googleEmail
			user.GoogleLinkedAt = &now
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
			log.Printf("[AUTH] Google login lookup by email failed email=%s: %v", googleEmail, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not resolve Google account by email",
			})
		}
	}

	if user.ID == 0 {
		passwordRaw := fmt.Sprintf("google:%s:%d", googleSub, now.UnixNano())
		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(passwordRaw), bcrypt.DefaultCost)
		if hashErr != nil {
			_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
			log.Printf("[AUTH] Google login hash password failed: %v", hashErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not create Google user",
			})
		}

		karmicName := strings.TrimSpace(tokenInfo.Name)
		if karmicName == "" {
			karmicName = "Google User"
		}
		spiritualName := strings.TrimSpace(strings.TrimSpace(tokenInfo.GivenName + " " + tokenInfo.FamilyName))
		if spiritualName == "" {
			spiritualName = "Guest"
		}

		newUser := models.User{
			Email:          googleEmail,
			Password:       string(hashedPassword),
			KarmicName:     karmicName,
			SpiritualName:  spiritualName,
			Role:           models.RoleUser,
			GoogleSub:      googleSub,
			GoogleEmail:    googleEmail,
			GoogleLinkedAt: &now,
			Language:       normalizeGoogleLocale(tokenInfo.Locale),
		}

		nicknameService := services.NewNicknameService(database.DB)
		nickname, nicknameSetManually, nicknameErr := nicknameService.AssignForRegistration("", newUser.Email, newUser.KarmicName)
		if nicknameErr != nil {
			_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
			log.Printf("[AUTH] Google login assign nickname failed email=%s: %v", newUser.Email, nicknameErr)
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"error": "Could not assign nickname",
			})
		}
		newUser.Nickname = nickname
		newUser.NicknameSetManually = nicknameSetManually

		if req.DeviceID != "" {
			newUser.DeviceID = strings.TrimSpace(req.DeviceID)
		}

		if err := createAuthUser(&newUser); err != nil {
			_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
			log.Printf("[AUTH] Google login create user failed email=%s sub=%s: %v", newUser.Email, googleSub, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not create Google user",
			})
		}

		if _, walletErr := h.walletService.GetOrCreateWallet(newUser.ID); walletErr != nil {
			log.Printf("[AUTH] Failed to create wallet for Google user %d: %v", newUser.ID, walletErr)
		}

		user = newUser
	}

	if user.IsBlocked {
		_ = services.GetMetricsService().Increment(services.MetricAuthGoogleFailTotal, 1)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User is blocked",
		})
	}

	updateUserDeviceID(&user, req.DeviceID)
	if h.proService != nil {
		if err := h.proService.SyncEntitlement(user.ID); err != nil {
			log.Printf("[AUTH] Failed to sync PRO entitlement for google login user=%d err=%v", user.ID, err)
		} else {
			_ = database.DB.First(&user, user.ID).Error
		}
	}

	sanitizeUser(&user)
	_ = services.GetMetricsService().Increment(services.MetricAuthGoogleSuccessTotal, 1)
	return issueAuthResponse(c, fiber.StatusOK, "Google login successful", user, req.DeviceID)
}

func (h *AuthHandler) buildVKLoginPayload(accessToken string, email string, deviceID string) (fiber.Map, *fiber.Error) {
	vkUser, err := vkAccessTokenVerifier(accessToken)
	if err != nil {
		log.Printf("[AUTH] VK token verification failed: %v", err)
		return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid VK token")
	}

	now := time.Now().UTC()
	var user models.User
	foundByVK := false
	if err := database.DB.Where("vk_user_id = ?", vkUser.UserID).First(&user).Error; err == nil {
		foundByVK = true
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("[AUTH] VK login lookup by vk_user_id failed vk=%d: %v", vkUser.UserID, err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Could not resolve VK account")
	}

	candidateEmail := strings.TrimSpace(strings.ToLower(email))
	if candidateEmail == "" {
		candidateEmail = strings.TrimSpace(strings.ToLower(vkUser.Email))
	}

	if !foundByVK && candidateEmail != "" {
		normalizedEmail := candidateEmail
		if err := database.DB.Where("email = ?", normalizedEmail).First(&user).Error; err == nil {
			if user.VKUserID != nil && *user.VKUserID != 0 && *user.VKUserID != vkUser.UserID {
				return nil, fiber.NewError(fiber.StatusConflict, "VK account is already linked to another user")
			}
			vkUserID := vkUser.UserID
			updates := map[string]interface{}{
				"vk_user_id":   vkUserID,
				"vk_email":     normalizedEmail,
				"vk_linked_at": now,
			}
			if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
				log.Printf("[AUTH] VK login link existing user failed user=%d vk=%d: %v", user.ID, vkUser.UserID, err)
				return nil, fiber.NewError(fiber.StatusInternalServerError, "Could not link VK account")
			}
			user.VKUserID = &vkUserID
			user.VKEmail = normalizedEmail
			user.VKLinkedAt = &now
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[AUTH] VK login lookup by email failed email=%s: %v", normalizedEmail, err)
			return nil, fiber.NewError(fiber.StatusInternalServerError, "Could not resolve VK account by email")
		}
	}

	if user.ID == 0 {
		passwordRaw := fmt.Sprintf("vk:%d:%d", vkUser.UserID, now.UnixNano())
		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(passwordRaw), bcrypt.DefaultCost)
		if hashErr != nil {
			log.Printf("[AUTH] VK login hash password failed vk=%d: %v", vkUser.UserID, hashErr)
			return nil, fiber.NewError(fiber.StatusInternalServerError, "Could not create VK user")
		}

		normalizedEmail := candidateEmail
		if normalizedEmail == "" {
			normalizedEmail = buildVKFallbackEmail(vkUser.UserID)
		}
		karmicName := strings.TrimSpace(strings.TrimSpace(vkUser.FirstName + " " + vkUser.LastName))
		if karmicName == "" {
			if vkUser.ScreenName != "" {
				karmicName = vkUser.ScreenName
			} else {
				karmicName = "VK User"
			}
		}
		spiritualName := strings.TrimSpace(vkUser.FirstName)
		if spiritualName == "" {
			spiritualName = "Guest"
		}

		vkUserID := vkUser.UserID
		newUser := models.User{
			Email:         normalizedEmail,
			Password:      string(hashedPassword),
			KarmicName:    karmicName,
			SpiritualName: spiritualName,
			Role:          models.RoleUser,
			VKUserID:      &vkUserID,
			VKEmail:       normalizedEmail,
			VKLinkedAt:    &now,
			Language:      "ru",
		}

		nicknameService := services.NewNicknameService(database.DB)
		nickname, nicknameSetManually, nicknameErr := nicknameService.AssignForRegistration("", newUser.Email, newUser.KarmicName)
		if nicknameErr != nil {
			log.Printf("[AUTH] VK login assign nickname failed email=%s: %v", newUser.Email, nicknameErr)
			return nil, fiber.NewError(fiber.StatusUnprocessableEntity, "Could not assign nickname")
		}
		newUser.Nickname = nickname
		newUser.NicknameSetManually = nicknameSetManually

		if strings.TrimSpace(deviceID) != "" {
			newUser.DeviceID = strings.TrimSpace(deviceID)
		}

		if err := createAuthUser(&newUser); err != nil {
			log.Printf("[AUTH] VK login create user failed email=%s vk=%d: %v", newUser.Email, vkUser.UserID, err)
			return nil, fiber.NewError(fiber.StatusInternalServerError, "Could not create VK user")
		}

		if _, walletErr := h.walletService.GetOrCreateWallet(newUser.ID); walletErr != nil {
			log.Printf("[AUTH] Failed to create wallet for VK user %d: %v", newUser.ID, walletErr)
		}

		user = newUser
	}

	if user.IsBlocked {
		return nil, fiber.NewError(fiber.StatusUnauthorized, "User is blocked")
	}

	updateUserDeviceID(&user, deviceID)
	if h.proService != nil {
		if err := h.proService.SyncEntitlement(user.ID); err != nil {
			log.Printf("[AUTH] Failed to sync PRO entitlement for vk login user=%d err=%v", user.ID, err)
		} else {
			_ = database.DB.First(&user, user.ID).Error
		}
	}

	sanitizeUser(&user)
	payload, payloadErr := buildAuthResponsePayload("VK login successful", user, deviceID)
	if payloadErr != nil {
		log.Printf("[AUTH] VK auth payload build failed user=%d err=%v", user.ID, payloadErr)
		return nil, fiber.NewError(fiber.StatusInternalServerError, payloadErr.Error())
	}
	return payload, nil
}

func renderWebSocialAuthPopup(c *fiber.Ctx, targetOrigin string, message fiber.Map) error {
	originJSON, err := json.Marshal(strings.TrimSpace(targetOrigin))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Could not prepare auth popup response")
	}
	messageJSON, err := json.Marshal(message)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Could not prepare auth popup payload")
	}

	c.Type("html", "utf-8")
	return c.SendString(
		"<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>VedaMatch Auth</title></head><body>" +
			"<script>(function(){const targetOrigin=" + string(originJSON) + ";const message=" + string(messageJSON) + ";" +
			"const doneText=message.status==='success'?'Авторизация завершена. Можно закрыть окно.':'Авторизация завершилась с ошибкой. Закройте окно и попробуйте снова.';" +
			"try{if(window.opener&&!window.opener.closed){window.opener.postMessage(message,targetOrigin);window.close();return;}}catch(error){}" +
			"document.body.style.fontFamily='system-ui,sans-serif';document.body.style.padding='24px';document.body.textContent=doneText;})();</script>" +
			"</body></html>",
	)
}

func renderMobileDeepLinkRedirectPage(c *fiber.Ctx, deepLink string, statusText string) error {
	deepLinkJSON, err := json.Marshal(strings.TrimSpace(deepLink))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Could not prepare deep link redirect")
	}
	statusJSON, err := json.Marshal(strings.TrimSpace(statusText))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Could not prepare redirect status")
	}

	c.Type("html", "utf-8")
	return c.SendString(
		"<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>VedaMatch</title></head><body>" +
			"<script>(function(){const deepLink=" + string(deepLinkJSON) + ";const statusText=" + string(statusJSON) + ";" +
			"document.body.style.fontFamily='system-ui,sans-serif';document.body.style.padding='24px';document.body.style.lineHeight='1.5';" +
			"document.body.innerHTML='<h1 style=\"font-size:24px;margin-bottom:12px;\">'+statusText+'</h1><p style=\"margin-bottom:16px;\">Если приложение не открылось автоматически, нажмите кнопку ниже.</p><p><a id=\"open-app\" href=\"'+deepLink+'\" style=\"display:inline-block;padding:12px 18px;border-radius:12px;background:#0B57D0;color:#fff;text-decoration:none;font-weight:600;\">Открыть VedaMatch</a></p>';" +
			"window.setTimeout(function(){window.location.replace(deepLink);},120);" +
			"})();</script></body></html>",
	)
}

func (h *AuthHandler) VKWebStart(c *fiber.Ctx) error {
	if h.webSocialAuthBridge == nil {
		h.webSocialAuthBridge = services.NewWebSocialAuthBridgeService()
	}
	if !isVKWebAuthConfigured() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "VK web auth is not configured",
		})
	}

	targetOrigin := normalizeWebAuthOrigin(c.Query("origin"))
	if !isAllowedLKMWebOrigin(targetOrigin) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid origin",
		})
	}

	deviceID := strings.TrimSpace(c.Query("deviceId"))
	codeVerifier, codeVerifierErr := generatePKCECodeVerifier()
	if codeVerifierErr != nil {
		log.Printf("[AUTH] VK web auth code verifier generation failed: %v", codeVerifierErr)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not initialize VK web auth",
		})
	}

	state, err := h.webSocialAuthBridge.CreateState("vk", deviceID, targetOrigin, codeVerifier)
	if err != nil {
		log.Printf("[AUTH] VK web auth start failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not initialize VK web auth",
		})
	}

	query := url.Values{}
	query.Set("client_id", strings.TrimSpace(os.Getenv("VK_WEB_CLIENT_ID")))
	query.Set("redirect_uri", resolveVKWebRedirectURI())
	query.Set("response_type", "code")
	query.Set("scope", resolveVKWebScope())
	query.Set("state", state.State)
	query.Set("code_challenge", buildPKCECodeChallenge(codeVerifier))
	query.Set("code_challenge_method", "S256")

	return c.Redirect("https://id.vk.com/authorize?"+query.Encode(), fiber.StatusFound)
}

func (h *AuthHandler) VKWebCallback(c *fiber.Ctx) error {
	if h.webSocialAuthBridge == nil {
		h.webSocialAuthBridge = services.NewWebSocialAuthBridgeService()
	}
	stateValue := strings.TrimSpace(c.Query("state"))
	state, stateErr := h.webSocialAuthBridge.ConsumeState("vk", stateValue)
	if stateErr != nil {
		log.Printf("[AUTH] VK web callback invalid state=%q err=%v", stateValue, stateErr)
		return c.Status(fiber.StatusBadRequest).SendString("VK web auth session is invalid or expired")
	}

	authCode := strings.TrimSpace(c.Query("code"))
	vkDeviceID := strings.TrimSpace(c.Query("device_id"))
	authErr := strings.TrimSpace(c.Query("error"))
	if authErr != "" {
		return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
			"source":   "vedamatch:lkm-social-auth",
			"provider": "vk",
			"status":   "error",
			"error":    authErr,
		})
	}
	if authCode == "" {
		return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
			"source":   "vedamatch:lkm-social-auth",
			"provider": "vk",
			"status":   "error",
			"error":    "missing_code",
		})
	}
	if vkDeviceID == "" {
		return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
			"source":   "vedamatch:lkm-social-auth",
			"provider": "vk",
			"status":   "error",
			"error":    "missing_device_id",
		})
	}
	if strings.TrimSpace(state.CodeVerifier) == "" {
		return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
			"source":   "vedamatch:lkm-social-auth",
			"provider": "vk",
			"status":   "error",
			"error":    "missing_code_verifier",
		})
	}

	accessToken, email, _, err := vkWebCodeExchanger(vkWebCodeExchangeInput{
		Code:         authCode,
		CodeVerifier: state.CodeVerifier,
		VKDeviceID:   vkDeviceID,
	})
	if err != nil {
		log.Printf("[AUTH] VK web callback exchange failed: %v", err)
		return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
			"source":   "vedamatch:lkm-social-auth",
			"provider": "vk",
			"status":   "error",
			"error":    "exchange_failed",
		})
	}

	authPayload, authPayloadErr := h.buildVKLoginPayload(accessToken, email, state.DeviceID)
	if authPayloadErr != nil {
		log.Printf("[AUTH] VK web callback auth failed: %v", authPayloadErr)
		return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
			"source":   "vedamatch:lkm-social-auth",
			"provider": "vk",
			"status":   "error",
			"error":    authPayloadErr.Message,
		})
	}

	return renderWebSocialAuthPopup(c, state.TargetOrigin, fiber.Map{
		"source":      "vedamatch:lkm-social-auth",
		"provider":    "vk",
		"status":      "success",
		"authPayload": authPayload,
	})
}

func (h *AuthHandler) VKLogin(c *fiber.Ctx) error {
	if !config.AuthVKEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "VK auth is disabled",
		})
	}

	var req vkAuthRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	req.AccessToken = strings.TrimSpace(req.AccessToken)
	req.Code = strings.TrimSpace(req.Code)
	req.Email = strings.TrimSpace(req.Email)
	req.Platform = strings.TrimSpace(strings.ToLower(req.Platform))
	req.State = strings.TrimSpace(req.State)
	req.CodeVerifier = strings.TrimSpace(req.CodeVerifier)
	req.VKDeviceID = strings.TrimSpace(req.VKDeviceID)
	if req.AccessToken == "" && req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "accessToken or code is required",
		})
	}

	accessToken, email, exchangeErr := resolveVKAccessToken(req)
	if exchangeErr != nil {
		log.Printf("[AUTH] VK code exchange failed: %v", exchangeErr)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid VK code",
		})
	}

	payload, payloadErr := h.buildVKLoginPayload(accessToken, email, req.DeviceID)
	if payloadErr != nil {
		return c.Status(payloadErr.Code).JSON(fiber.Map{
			"error": payloadErr.Message,
		})
	}
	return c.Status(fiber.StatusOK).JSON(payload)
}

func (h *AuthHandler) VKCallback(c *fiber.Ctx) error {
	state := strings.TrimSpace(c.Query("state"))
	authCode := strings.TrimSpace(c.Query("code"))
	authErr := strings.TrimSpace(c.Query("error"))

	deepLinkQuery := url.Values{}
	if state != "" {
		deepLinkQuery.Set("state", state)
	}

	if authErr != "" {
		deepLinkQuery.Set("error", authErr)
		deepLink := "vedamatch://auth/vk/callback?" + deepLinkQuery.Encode()
		return c.Redirect(deepLink, fiber.StatusFound)
	}

	if authCode == "" {
		deepLinkQuery.Set("error", "missing_code")
		deepLink := "vedamatch://auth/vk/callback?" + deepLinkQuery.Encode()
		return c.Redirect(deepLink, fiber.StatusFound)
	}

	accessToken, email, _, err := vkCodeExchanger(authCode)
	if err != nil {
		log.Printf("[AUTH] VK callback exchange failed: %v", err)
		deepLinkQuery.Set("error", "exchange_failed")
		deepLink := "vedamatch://auth/vk/callback?" + deepLinkQuery.Encode()
		return c.Redirect(deepLink, fiber.StatusFound)
	}

	deepLinkQuery.Set("access_token", accessToken)
	if email != "" {
		deepLinkQuery.Set("email", email)
	}

	deepLink := "vedamatch://auth/vk/callback?" + deepLinkQuery.Encode()
	return c.Redirect(deepLink, fiber.StatusFound)
}

func (h *AuthHandler) TelegramMobileCallback(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	state := strings.TrimSpace(c.Query("state"))
	authErr := strings.TrimSpace(c.Query("error"))

	deepLinkQuery := url.Values{}
	if state != "" {
		deepLinkQuery.Set("state", state)
	}
	if authErr != "" {
		deepLinkQuery.Set("error", authErr)
	}

	deepLink := h.telegramAuthService.ResolveMobileAuthNativeDeepLink(state)
	if deepLinkQuery.Encode() != "" {
		deepLink = "vedamatch://auth/telegram/callback?" + deepLinkQuery.Encode()
	}

	statusText := "Авторизация завершена. Возвращаемся в приложение VedaMatch..."
	if authErr != "" {
		statusText = "Авторизация завершилась с ошибкой. Вернитесь в приложение VedaMatch и попробуйте снова."
	}

	return renderMobileDeepLinkRedirectPage(c, deepLink, statusText)
}

func (h *AuthHandler) TelegramMiniAppLogin(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	var req struct {
		InitData        string `json:"initData"`
		DeviceID        string `json:"deviceId"`
		MobileAuthState string `json:"mobileAuthState"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	if strings.TrimSpace(req.InitData) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "initData is required",
		})
	}

	telegramUser, err := h.telegramAuthService.VerifyMiniAppInitDataWithPurpose(req.InitData, "miniapp_login")
	if err != nil {
		log.Printf(
			"[AUTH] Telegram miniapp login verify failed err=%v init_hash=%s mobile_state=%t device_id=%t host=%s origin=%s referer=%s ua=%q",
			err,
			telegramInitDataFingerprint(req.InitData),
			strings.TrimSpace(req.MobileAuthState) != "",
			strings.TrimSpace(req.DeviceID) != "",
			c.Hostname(),
			strings.TrimSpace(c.Get("Origin")),
			strings.TrimSpace(c.Get("Referer")),
			strings.TrimSpace(c.Get("User-Agent")),
		)
		return respondTelegramAuthError(c, err)
	}

	now := time.Now().UTC()
	var user models.User
	if err := database.DB.Where("telegram_user_id = ?", telegramUser.ID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			passwordRaw := fmt.Sprintf("telegram:%d:%d", telegramUser.ID, now.UnixNano())
			hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(passwordRaw), bcrypt.DefaultCost)
			if hashErr != nil {
				log.Printf("[AUTH] Telegram miniapp login hash password failed telegram_user_id=%d: %v", telegramUser.ID, hashErr)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Could not create Telegram user",
				})
			}

			karmicName := strings.TrimSpace(strings.TrimSpace(telegramUser.FirstName + " " + telegramUser.LastName))
			if karmicName == "" {
				if telegramUser.Username != "" {
					karmicName = telegramUser.Username
				} else {
					karmicName = "Telegram User"
				}
			}

			spiritualName := strings.TrimSpace(telegramUser.FirstName)
			if spiritualName == "" {
				spiritualName = "Guest"
			}

			telegramUserID := telegramUser.ID
			newUser := models.User{
				Email:             buildTelegramFallbackEmail(telegramUser.ID),
				Password:          string(hashedPassword),
				KarmicName:        karmicName,
				SpiritualName:     spiritualName,
				Role:              models.RoleUser,
				TelegramUserID:    &telegramUserID,
				TelegramUsername:  telegramUser.Username,
				TelegramFirstName: telegramUser.FirstName,
				TelegramLastName:  telegramUser.LastName,
				TelegramLinkedAt:  &now,
				Language:          normalizeTelegramLocale(telegramUser.LanguageCode),
			}

			nicknameService := services.NewNicknameService(database.DB)
			nickname, nicknameSetManually, nicknameErr := nicknameService.AssignForRegistration("", newUser.Email, newUser.KarmicName)
			if nicknameErr != nil {
				log.Printf("[AUTH] Telegram miniapp login assign nickname failed telegram_user_id=%d: %v", telegramUser.ID, nicknameErr)
				return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
					"error": "Could not assign nickname",
				})
			}
			newUser.Nickname = nickname
			newUser.NicknameSetManually = nicknameSetManually

			if strings.TrimSpace(req.DeviceID) != "" {
				newUser.DeviceID = strings.TrimSpace(req.DeviceID)
			}

			if err := createAuthUser(&newUser); err != nil {
				log.Printf("[AUTH] Telegram miniapp login create user failed telegram_user_id=%d: %v", telegramUser.ID, err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Could not create Telegram user",
				})
			}

			if h.walletService != nil {
				if _, walletErr := h.walletService.GetOrCreateWallet(newUser.ID); walletErr != nil {
					log.Printf("[AUTH] Failed to create wallet for Telegram user %d: %v", newUser.ID, walletErr)
				}
			}

			user = newUser
		} else {
			log.Printf("[AUTH] Telegram miniapp login lookup failed telegram_user_id=%d: %v", telegramUser.ID, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not resolve Telegram account",
			})
		}
	}

	if user.IsBlocked {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User is blocked",
		})
	}

	updates := map[string]interface{}{
		"telegram_username":   telegramUser.Username,
		"telegram_first_name": telegramUser.FirstName,
		"telegram_last_name":  telegramUser.LastName,
		"telegram_linked_at":  now,
	}
	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		log.Printf("[AUTH] Telegram miniapp login profile sync failed user=%d: %v", user.ID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update Telegram profile",
		})
	}

	user.TelegramUsername = telegramUser.Username
	user.TelegramFirstName = telegramUser.FirstName
	user.TelegramLastName = telegramUser.LastName
	user.TelegramLinkedAt = &now

	updateUserDeviceID(&user, req.DeviceID)
	if h.proService != nil {
		if err := h.proService.SyncEntitlement(user.ID); err != nil {
			log.Printf("[AUTH] Failed to sync PRO entitlement for telegram login user=%d err=%v", user.ID, err)
		} else {
			_ = database.DB.First(&user, user.ID).Error
		}
	}
	sanitizeUser(&user)
	return h.issueAuthResponseWithTelegramMobileState(
		c,
		fiber.StatusOK,
		"Telegram login successful",
		user,
		req.DeviceID,
		req.MobileAuthState,
	)
}

func (h *AuthHandler) TelegramMobileAuthStart(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	var req struct {
		DeviceID string `json:"deviceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	state, err := h.telegramAuthService.CreateMobileAuthState(req.DeviceID)
	if err != nil {
		log.Printf("[AUTH] Telegram mobile auth start failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not initialize Telegram mobile auth",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"state":     state.State,
		"launchUrl": h.telegramAuthService.ResolveMobileAuthLaunchURL(state.State),
		"expiresAt": state.ExpiresAt.UTC().Format(time.RFC3339),
	})
}

func (h *AuthHandler) TelegramMobileAuthContext(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	entry, err := h.telegramAuthService.LoadMobileAuthState(c.Params("state"))
	if err != nil {
		return respondTelegramMobileAuthError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"state":   entry.State,
		"purpose": entry.Purpose,
		"status":  entry.Status,
	})
}

func (h *AuthHandler) TelegramMobileAuthComplete(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	var req struct {
		State       string          `json:"state"`
		AuthPayload json.RawMessage `json:"authPayload"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	if err := services.ValidateTelegramMobileAuthPayload(req.AuthPayload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	entry, err := h.telegramAuthService.CompleteMobileAuthState(req.State, req.AuthPayload)
	if err != nil {
		return respondTelegramMobileAuthError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"state":    entry.State,
		"deepLink": h.telegramAuthService.ResolveMobileAuthDeepLink(entry.State),
	})
}

func (h *AuthHandler) TelegramMobileAuthExchange(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	var req struct {
		State    string `json:"state"`
		DeviceID string `json:"deviceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	payload, err := h.telegramAuthService.ConsumeMobileAuthState(req.State, req.DeviceID)
	if err != nil {
		return respondTelegramMobileAuthError(c, err)
	}

	c.Type("json")
	return c.Send(payload)
}

func (h *AuthHandler) TelegramMiniAppLink(c *fiber.Ctx) error {
	if h.telegramAuthService == nil {
		h.telegramAuthService = services.NewTelegramAuthService(database.DB)
	}

	var req struct {
		InitData        string `json:"initData"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		DeviceID        string `json:"deviceId"`
		MobileAuthState string `json:"mobileAuthState"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}
	if strings.TrimSpace(req.InitData) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "initData is required",
		})
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if !validateAuthCredentials(req.Email, req.Password) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	telegramUser, err := h.telegramAuthService.VerifyMiniAppInitDataWithPurpose(req.InitData, "miniapp_link")
	if err != nil {
		return respondTelegramAuthError(c, err)
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid credentials",
			})
		}
		log.Printf("[AUTH] Telegram miniapp link user lookup failed email=%s: %v", req.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not load user",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	if user.IsBlocked {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User is blocked",
		})
	}

	var existing models.User
	err = database.DB.Where("telegram_user_id = ?", telegramUser.ID).First(&existing).Error
	if err == nil && existing.ID != user.ID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":     "Telegram account is already linked to another user",
			"errorCode": "TELEGRAM_LINK_CONFLICT",
		})
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("[AUTH] Telegram miniapp link conflict lookup failed telegram_user_id=%d: %v", telegramUser.ID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not validate Telegram link",
		})
	}

	now := time.Now().UTC()
	telegramUserID := telegramUser.ID
	updates := map[string]interface{}{
		"telegram_user_id":    telegramUserID,
		"telegram_username":   telegramUser.Username,
		"telegram_first_name": telegramUser.FirstName,
		"telegram_last_name":  telegramUser.LastName,
		"telegram_linked_at":  now,
	}

	deviceID := strings.TrimSpace(req.DeviceID)
	if deviceID != "" && deviceID != user.DeviceID {
		updates["device_id"] = deviceID
		user.DeviceID = deviceID
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		log.Printf("[AUTH] Telegram miniapp link update failed user=%d: %v", user.ID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not link Telegram account",
		})
	}

	user.TelegramUserID = &telegramUserID
	user.TelegramUsername = telegramUser.Username
	user.TelegramFirstName = telegramUser.FirstName
	user.TelegramLastName = telegramUser.LastName
	user.TelegramLinkedAt = &now
	sanitizeUser(&user)

	return h.issueAuthResponseWithTelegramMobileState(
		c,
		fiber.StatusOK,
		"Telegram linked and login successful",
		user,
		req.DeviceID,
		req.MobileAuthState,
	)
}

func verifyPasswordWithLegacyFallback(storedPassword string, providedPassword string) (bool, bool) {
	if storedPassword == "" || providedPassword == "" {
		return false, false
	}

	if isLikelyBcryptHash(storedPassword) {
		return bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(providedPassword)) == nil, false
	}

	if storedPassword == providedPassword {
		return true, true
	}

	return false, false
}

func isLikelyBcryptHash(storedPassword string) bool {
	if len(storedPassword) != 60 {
		return false
	}

	return strings.HasPrefix(storedPassword, "$2a$") ||
		strings.HasPrefix(storedPassword, "$2b$") ||
		strings.HasPrefix(storedPassword, "$2y$")
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

	sanitizeUser(&user)
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
		DeviceID     string `json:"deviceId"`
		PushToken    string `json:"pushToken"`
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
	requestedPushToken := strings.TrimSpace(req.PushToken)
	requestedDeviceID := strings.TrimSpace(req.DeviceID)

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

	var pushInvalidated int64
	if userID > 0 && (requestedPushToken != "" || requestedDeviceID != "") {
		invalidated, err := services.GetPushService().UnregisterUserDeviceToken(userID, requestedPushToken, requestedDeviceID)
		if err != nil {
			log.Printf("[AUTH] Failed to unregister push token on logout (user=%d): %v", userID, err)
		} else {
			pushInvalidated = invalidated
		}
	}

	return c.JSON(fiber.Map{
		"ok":              true,
		"revoked":         result.RowsAffected,
		"pushInvalidated": pushInvalidated,
	})
}

func (h *AuthHandler) RequestAccountDeletion(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
			"code":  "unauthorized",
		})
	}

	effectiveAt := time.Now().UTC().Format(time.RFC3339)
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"success":     true,
		"status":      "scheduled",
		"effectiveAt": effectiveAt,
	})
}

func (h *AuthHandler) DeleteAccount(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
			"code":  "unauthorized",
		})
	}

	user, userMedia, err := deleteUserAccountData(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
				"code":  "user_not_found",
			})
		}
		log.Printf("[AUTH] account deletion failed for user=%d: %v", userID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not delete account",
			"code":  "account_deletion_failed",
		})
	}

	cleanupDeletedUserUploads(user, userMedia)

	return c.JSON(fiber.Map{
		"success": true,
		"status":  "deleted",
	})
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	requestID := strings.TrimSpace(c.Get("X-Request-ID"))
	if requestID == "" {
		requestID = "n/a"
	}
	userId := middleware.GetUserID(c)
	log.Printf("[UpdateProfile] begin rid=%s user=%d", requestID, userId)

	var updateData struct {
		models.User
		// Additional fields for coordinates from frontend
		Latitude      *float64 `json:"latitude"`
		Longitude     *float64 `json:"longitude"`
		NicknameInput *string  `json:"nickname"`
	}
	if err := c.BodyParser(&updateData); err != nil {
		log.Printf("[UpdateProfile] parse_error rid=%s user=%d err=%v", requestID, userId, err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if userId == 0 {
		log.Printf("[UpdateProfile] unauthorized rid=%s", requestID)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		log.Printf("[UpdateProfile] user_lookup_failed rid=%s user=%d err=%v", requestID, userId, err)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	normalizedKarmicName := strings.TrimSpace(updateData.KarmicName)
	normalizedSpiritualName := strings.TrimSpace(updateData.SpiritualName)
	if normalizedKarmicName == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "Karmic name is required",
			"code":  "profile_name_required",
			"field": "karmicName",
		})
	}

	// Check if city changed
	cityChanged := updateData.City != "" && updateData.City != user.City

	updates := map[string]interface{}{
		"karmic_name":          normalizedKarmicName,
		"spiritual_name":       normalizedSpiritualName,
		"gender":               strings.TrimSpace(updateData.Gender),
		"country":              strings.TrimSpace(updateData.Country),
		"city":                 strings.TrimSpace(updateData.City),
		"identity":             strings.TrimSpace(updateData.Identity),
		"diet":                 strings.TrimSpace(updateData.Diet),
		"madh":                 strings.TrimSpace(updateData.Madh),
		"yoga_style":           strings.TrimSpace(updateData.YogaStyle),
		"guna":                 strings.TrimSpace(updateData.Guna),
		"mentor":               strings.TrimSpace(updateData.Mentor),
		"dob":                  strings.TrimSpace(updateData.Dob),
		"bio":                  strings.TrimSpace(updateData.Bio),
		"interests":            strings.TrimSpace(updateData.Interests),
		"looking_for":          strings.TrimSpace(updateData.LookingFor),
		"intentions":           strings.TrimSpace(updateData.Intentions),
		"skills":               strings.TrimSpace(updateData.Skills),
		"industry":             strings.TrimSpace(updateData.Industry),
		"looking_for_business": strings.TrimSpace(updateData.LookingForBusiness),
		"dating_enabled":       updateData.DatingEnabled,
		"yatra":                strings.TrimSpace(updateData.Yatra),
		"timezone":             strings.TrimSpace(updateData.Timezone),
		"marital_status":       strings.TrimSpace(updateData.MaritalStatus),
		"birth_time":           strings.TrimSpace(updateData.BirthTime),
		"is_profile_complete":  true,
	}

	if updateData.NicknameInput != nil {
		nicknameService := services.NewNicknameService(database.DB)
		normalizedNickname := services.NormalizeNickname(*updateData.NicknameInput)
		if normalizedNickname != "" && normalizedNickname != user.Nickname {
			if err := services.ValidateNickname(normalizedNickname); err != nil {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
					"error": "Invalid nickname",
					"code":  "nickname_invalid",
					"field": "nickname",
				})
			}
			now := time.Now().UTC()
			if user.NicknameCooldownUntil != nil && now.Before(*user.NicknameCooldownUntil) {
				return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
					"error":        "Nickname change cooldown active",
					"code":         "nickname_cooldown_active",
					"field":        "nickname",
					"retryAfterAt": user.NicknameCooldownUntil,
				})
			}
			uniqueNickname, err := nicknameService.EnsureUnique(normalizedNickname)
			if err != nil {
				if errors.Is(err, services.ErrNicknameTaken) {
					return c.Status(fiber.StatusConflict).JSON(fiber.Map{
						"error": "Nickname already taken",
						"code":  "nickname_taken",
						"field": "nickname",
					})
				}
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Could not update nickname",
					"code":  "nickname_update_failed",
					"field": "nickname",
				})
			}
			if uniqueNickname != normalizedNickname {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "Nickname already taken",
					"code":  "nickname_taken",
					"field": "nickname",
				})
			}

			cooldown := now.Add(30 * 24 * time.Hour)
			updates["nickname"] = normalizedNickname
			updates["nickname_set_manually"] = true
			updates["nickname_changed_at"] = now
			updates["nickname_change_cooldown_until"] = cooldown

			user.Nickname = normalizedNickname
			user.NicknameSetManually = true
			user.NicknameChangedAt = &now
			user.NicknameCooldownUntil = &cooldown
		}
	}

	// Check if role changed and apply cooldown
	if updateData.Role != "" && updateData.Role != user.Role {
		now := time.Now().UTC()
		if user.RoleCooldownUntil != nil && now.Before(*user.RoleCooldownUntil) {
			daysLeft := int((*user.RoleCooldownUntil).Sub(now) / (24 * time.Hour))
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":        "Role change cooldown active",
				"code":         "role_cooldown_active",
				"field":        "role",
				"retryAfterAt": user.RoleCooldownUntil,
				"daysLeft":     daysLeft,
			})
		}

		// Apply 30 days cooldown for role change
		roleCooldown := now.Add(30 * 24 * time.Hour)
		updates["role_changed_at"] = now
		updates["role_change_cooldown_until"] = roleCooldown

		user.Role = resolveProfileRoleForUpdate(updateData.Role, updateData.Role)
		user.RoleChangedAt = &now
		user.RoleCooldownUntil = &roleCooldown
	}

	user.KarmicName = normalizedKarmicName
	user.SpiritualName = normalizedSpiritualName
	user.Gender = strings.TrimSpace(updateData.Gender)
	user.Country = strings.TrimSpace(updateData.Country)
	user.City = strings.TrimSpace(updateData.City)
	user.Identity = strings.TrimSpace(updateData.Identity)
	user.Diet = strings.TrimSpace(updateData.Diet)
	user.Madh = strings.TrimSpace(updateData.Madh)
	user.YogaStyle = strings.TrimSpace(updateData.YogaStyle)
	user.Guna = strings.TrimSpace(updateData.Guna)
	user.Mentor = strings.TrimSpace(updateData.Mentor)
	user.Dob = strings.TrimSpace(updateData.Dob)
	user.Bio = strings.TrimSpace(updateData.Bio)
	user.Interests = strings.TrimSpace(updateData.Interests)
	user.LookingFor = strings.TrimSpace(updateData.LookingFor)
	user.Intentions = strings.TrimSpace(updateData.Intentions)
	user.Skills = strings.TrimSpace(updateData.Skills)
	user.Industry = strings.TrimSpace(updateData.Industry)
	user.LookingForBusiness = strings.TrimSpace(updateData.LookingForBusiness)
	user.DatingEnabled = updateData.DatingEnabled
	user.Yatra = strings.TrimSpace(updateData.Yatra)
	user.Timezone = strings.TrimSpace(updateData.Timezone)
	user.MaritalStatus = strings.TrimSpace(updateData.MaritalStatus)
	user.BirthTime = strings.TrimSpace(updateData.BirthTime)
	user.IsProfileComplete = true
	// Preserve privileged flags and avoid accidental role downgrades when role is omitted/invalid.
	user.Role = resolveProfileRoleForUpdate(user.Role, updateData.Role)
	updates["role"] = user.Role
	// Non-admin users are never allowed to escalate GodMode through profile payload.
	user.GodModeEnabled = resolveGodModeForUpdate(user.GodModeEnabled, updateData.GodModeEnabled, user.Role)
	updates["god_mode_enabled"] = user.GodModeEnabled

	// Handle coordinates
	if updateData.Latitude != nil && updateData.Longitude != nil {
		// Use coordinates from frontend (from autocomplete)
		user.Latitude = updateData.Latitude
		user.Longitude = updateData.Longitude
		updates["latitude"] = updateData.Latitude
		updates["longitude"] = updateData.Longitude
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
			updates["city"] = geocoded.City
			if updateData.Country == "" {
				user.Country = geocoded.Country
				updates["country"] = geocoded.Country
			}
			user.Latitude = &geocoded.Latitude
			user.Longitude = &geocoded.Longitude
			updates["latitude"] = &geocoded.Latitude
			updates["longitude"] = &geocoded.Longitude
			log.Printf("[Profile] Geocoded city '%s' -> '%s' (%f, %f)", updateData.City, geocoded.City, geocoded.Latitude, geocoded.Longitude)
		}
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		log.Printf("[UpdateProfile] save_failed rid=%s user=%d requested_role=%q err=%v", requestID, userId, updateData.Role, err)
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") || strings.Contains(strings.ToLower(err.Error()), "unique constraint") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Profile data conflicts with existing account",
				"code":  "profile_conflict",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not update profile",
			"code":  "profile_update_failed",
		})
	}
	if h.proService != nil {
		if err := h.proService.SyncEntitlement(user.ID); err != nil {
			log.Printf("[UpdateProfile] pro_sync_failed rid=%s user=%d err=%v", requestID, user.ID, err)
		} else {
			_ = database.DB.First(&user, user.ID).Error
		}
	}

	log.Printf("[UpdateProfile] success rid=%s user=%d role=%s city=%q", requestID, userId, user.Role, user.City)
	sanitizeUser(&user)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

func (h *AuthHandler) UpdateNickname(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var payload struct {
		Nickname string `json:"nickname"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "Cannot parse JSON",
			"errorCode": "INVALID_PAYLOAD",
		})
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":     "User not found",
				"errorCode": "USER_NOT_FOUND",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":     "Could not load user",
			"errorCode": "USER_LOAD_FAILED",
		})
	}

	nicknameService := services.NewNicknameService(database.DB)
	if err := nicknameService.UpdateNickname(&user, payload.Nickname); err != nil {
		switch {
		case errors.Is(err, services.ErrNicknameInvalid):
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"error":     "Invalid nickname",
				"errorCode": "NICKNAME_INVALID",
			})
		case errors.Is(err, services.ErrNicknameTaken):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":     "Nickname already taken",
				"errorCode": "NICKNAME_TAKEN",
			})
		case errors.Is(err, services.ErrNicknameCooldown):
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":        "Nickname change cooldown active",
				"errorCode":    "NICKNAME_COOLDOWN_ACTIVE",
				"retryAfterAt": user.NicknameCooldownUntil,
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":     "Could not update nickname",
				"errorCode": "NICKNAME_UPDATE_FAILED",
			})
		}
	}

	sanitizeUser(&user)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Nickname updated",
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

	const heartbeatWriteThrottle = 5 * time.Minute
	now := time.Now().UTC()

	var user models.User
	if err := database.DB.Select("id", "last_seen").First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	shouldWrite := true
	if lastSeenRaw := strings.TrimSpace(user.LastSeen); lastSeenRaw != "" {
		if lastSeenAt, err := time.Parse(time.RFC3339, lastSeenRaw); err == nil {
			if now.Sub(lastSeenAt.UTC()) < heartbeatWriteThrottle {
				shouldWrite = false
			}
		}
	}

	if shouldWrite {
		if err := database.DB.Model(&models.User{}).
			Where("id = ?", user.ID).
			Update("last_seen", now.Format(time.RFC3339)).Error; err != nil {
			log.Printf("[AUTH] Failed to update heartbeat last_seen for user %d: %v", user.ID, err)
		}
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

// SendFriendRequest creates a new friend request
func (h *AuthHandler) SendFriendRequest(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		ReceiverID uint `json:"receiverId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.ReceiverID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "receiverId is required"})
	}
	if body.ReceiverID == userId {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot send friend request to yourself"})
	}

	// Validate receiver exists
	var receiver models.User
	if err := database.DB.Select("id").First(&receiver, body.ReceiverID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Receiver user not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not validate receiver user"})
	}

	// Check if already friends
	var friendCount int64
	if err := database.DB.Model(&models.Friend{}).Where("user_id = ? AND friend_id = ?", userId, body.ReceiverID).Or("user_id = ? AND friend_id = ?", body.ReceiverID, userId).Count(&friendCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check friendship status"})
	}
	if friendCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Already friends"})
	}

	// Check if request already exists
	var requestCount int64
	if err := database.DB.Model(&models.FriendRequest{}).Where("sender_id = ? AND receiver_id = ? AND status = ?", userId, body.ReceiverID, models.FriendRequestStatusPending).Count(&requestCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check existing requests"})
	}
	if requestCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Friend request already sent"})
	}

	// Create friend request
	request := models.FriendRequest{
		SenderID:   userId,
		ReceiverID: body.ReceiverID,
		Status:     models.FriendRequestStatusPending,
	}

	if err := database.DB.Create(&request).Error; err != nil {
		if isDuplicateKeyError(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Friend request already exists"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not send friend request"})
	}

	// Send push notification to receiver
	go func() {
		var sender models.User
		if err := database.DB.Select("karmic_name", "spiritual_name").First(&sender, userId).Error; err == nil {
			senderName := sender.KarmicName
			if sender.SpiritualName != "" {
				senderName = sender.SpiritualName
			}
			pushService := services.GetPushService()
			if pushService != nil {
				_ = pushService.SendFriendRequestNotification(body.ReceiverID, senderName)
			}
		}
	}()

	return c.Status(fiber.StatusCreated).JSON(request)
}

// GetFriendRequests returns incoming friend requests for the current user
func (h *AuthHandler) GetFriendRequests(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var requests []models.FriendRequest
	if err := database.DB.Where("receiver_id = ? AND status = ?", userId, models.FriendRequestStatusPending).Preload("Sender").Find(&requests).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch friend requests"})
	}

	// Get sender details
	var senderIDs []uint
	for _, req := range requests {
		senderIDs = append(senderIDs, req.SenderID)
	}

	var senders []models.User
	if len(senderIDs) > 0 {
		if err := database.DB.Where("id IN ?", senderIDs).Find(&senders).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch sender details"})
		}
	}

	// Build response with sender info
	type FriendRequestWithSender struct {
		ID         uint   `json:"id"`
		SenderID   uint   `json:"senderId"`
		SenderName string `json:"senderName"`
		AvatarURL  string `json:"avatarUrl"`
		City       string `json:"city"`
		Country    string `json:"country"`
		CreatedAt  string `json:"createdAt"`
	}

	response := make([]FriendRequestWithSender, 0, len(requests))
	for _, req := range requests {
		senderName := ""
		avatarURL := ""
		city := ""
		country := ""
		for _, sender := range senders {
			if sender.ID == req.SenderID {
				senderName = sender.KarmicName
				if sender.SpiritualName != "" {
					senderName = sender.SpiritualName
				}
				avatarURL = sender.AvatarURL
				city = sender.City
				country = sender.Country
				break
			}
		}
		response = append(response, FriendRequestWithSender{
			ID:         req.ID,
			SenderID:   req.SenderID,
			SenderName: senderName,
			AvatarURL:  avatarURL,
			City:       city,
			Country:    country,
			CreatedAt:  req.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// AcceptFriendRequest accepts a friend request
func (h *AuthHandler) AcceptFriendRequest(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RequestID uint `json:"requestId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RequestID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "requestId is required"})
	}

	// Find and validate request
	var request models.FriendRequest
	if err := database.DB.First(&request, body.RequestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Friend request not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not find friend request"})
	}

	// Check if user is the receiver
	if request.ReceiverID != userId {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized to accept this request"})
	}

	// Check if already friends
	var friendCount int64
	if err := database.DB.Model(&models.Friend{}).Where("user_id = ? AND friend_id = ?", request.SenderID, userId).Or("user_id = ? AND friend_id = ?", userId, request.SenderID).Count(&friendCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not check friendship status"})
	}
	if friendCount > 0 {
		// Already friends, just delete the request
		database.DB.Delete(&request)
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Already friends"})
	}

	// Update request status
	request.Status = models.FriendRequestStatusAccepted
	if err := database.DB.Save(&request).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update request status"})
	}

	// Create bidirectional friendship
	friendship1 := models.Friend{
		UserID:   request.SenderID,
		FriendID: userId,
	}
	friendship2 := models.Friend{
		UserID:   userId,
		FriendID: request.SenderID,
	}

	if err := database.DB.Create(&friendship1).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create friendship"})
	}
	if err := database.DB.Create(&friendship2).Error; err != nil {
		// Rollback first friendship
		database.DB.Delete(&friendship1)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create friendship"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Friend request accepted"})
}

// RejectFriendRequest rejects a friend request
func (h *AuthHandler) RejectFriendRequest(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RequestID uint `json:"requestId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RequestID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "requestId is required"})
	}

	// Find and validate request
	var request models.FriendRequest
	if err := database.DB.First(&request, body.RequestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Friend request not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not find friend request"})
	}

	// Check if user is the receiver
	if request.ReceiverID != userId {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized to reject this request"})
	}

	// Update request status
	request.Status = models.FriendRequestStatusRejected
	if err := database.DB.Save(&request).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update request status"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Friend request rejected"})
}

// CancelFriendRequest cancels a sent friend request
func (h *AuthHandler) CancelFriendRequest(c *fiber.Ctx) error {
	userId := middleware.GetUserID(c)
	if userId == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RequestID uint `json:"requestId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RequestID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "requestId is required"})
	}

	// Find and validate request
	var request models.FriendRequest
	if err := database.DB.First(&request, body.RequestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Friend request not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not find friend request"})
	}

	// Check if user is the sender
	if request.SenderID != userId {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized to cancel this request"})
	}

	// Delete the request
	if err := database.DB.Delete(&request).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not cancel friend request"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Friend request cancelled"})
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

	// Legacy behavior: when no query params are provided, return full list as before.
	// Contacts V2 behavior is activated only when at least one query param is present.
	hasV2Query := c.Query("limit") != "" ||
		c.Query("cursor") != "" ||
		c.Query("tab") != "" ||
		c.Query("q") != "" ||
		c.Query("city") != "" ||
		c.Query("cities") != ""
	if !hasV2Query && config.ContactsLegacyModeEnabled() {
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

	const (
		defaultLimit = 50
		maxLimit     = 100
	)
	limit := defaultLimit
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			if parsed > 0 {
				if parsed > maxLimit {
					limit = maxLimit
				} else {
					limit = parsed
				}
			}
		}
	}

	var cursor uint
	if rawCursor := strings.TrimSpace(c.Query("cursor")); rawCursor != "" {
		parsed, err := strconv.ParseUint(rawCursor, 10, 64)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cursor"})
		}
		cursor = uint(parsed)
	}

	tab := strings.ToLower(strings.TrimSpace(c.Query("tab", "all")))
	if tab != "all" && tab != "friends" && tab != "blocked" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tab. Supported values: all, friends, blocked"})
	}

	q := strings.ToLower(strings.TrimSpace(c.Query("q")))
	var cities []string
	if city := strings.TrimSpace(c.Query("city")); city != "" {
		cities = append(cities, strings.ToLower(city))
	}
	if cityList := strings.TrimSpace(c.Query("cities")); cityList != "" {
		for _, city := range strings.Split(cityList, ",") {
			normalized := strings.ToLower(strings.TrimSpace(city))
			if normalized == "" {
				continue
			}
			cities = append(cities, normalized)
		}
	}
	if len(cities) > 1 {
		unique := make(map[string]struct{}, len(cities))
		deduped := make([]string, 0, len(cities))
		for _, city := range cities {
			if _, ok := unique[city]; ok {
				continue
			}
			unique[city] = struct{}{}
			deduped = append(deduped, city)
		}
		cities = deduped
	}

	var friendIDs []uint
	var blockedIDs []uint

	if tab == "friends" {
		if err := database.DB.Model(&models.Friend{}).
			Where("user_id = ?", userId).
			Pluck("friend_id", &friendIDs).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch friends"})
		}
		if len(friendIDs) == 0 {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"items":      []models.User{},
				"hasMore":    false,
				"nextCursor": nil,
				"total":      0,
			})
		}
	}
	if tab == "blocked" {
		if err := database.DB.Model(&models.Block{}).
			Where("user_id = ?", userId).
			Pluck("blocked_id", &blockedIDs).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch blocked users"})
		}
		if len(blockedIDs) == 0 {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"items":      []models.User{},
				"hasMore":    false,
				"nextCursor": nil,
				"total":      0,
			})
		}
	}

	applyFilters := func(query *gorm.DB, includeCursor bool) *gorm.DB {
		query = query.Where("id <> ?", userId)

		switch tab {
		case "friends":
			query = query.Where("id IN ?", friendIDs)
		case "blocked":
			query = query.Where("id IN ?", blockedIDs)
		}

		if q != "" {
			like := "%" + q + "%"
			query = query.Where(
				"LOWER(karmic_name) LIKE ? OR LOWER(spiritual_name) LIKE ? OR LOWER(nickname) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country) LIKE ? OR LOWER(yatra) LIKE ?",
				like, like, like, like, like, like,
			)
		}
		if len(cities) > 0 {
			query = query.Where("LOWER(city) IN ?", cities)
		}
		if includeCursor && cursor > 0 {
			query = query.Where("id < ?", cursor)
		}
		return query
	}

	totalQuery := applyFilters(database.DB.Model(&models.User{}), false)
	var total int64
	if err := totalQuery.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not count contacts"})
	}

	var users []models.User
	query := applyFilters(database.DB.Model(&models.User{}), true).
		Order("id DESC").
		Limit(limit + 1)
	if err := query.Find(&users).Error; err != nil {
		log.Printf("[ContactsV2] Error fetching contacts page: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch contacts"})
	}

	hasMore := len(users) > limit
	if hasMore {
		users = users[:limit]
	}
	var nextCursor interface{}
	if hasMore && len(users) > 0 {
		nextCursor = users[len(users)-1].ID
	}
	sanitizeUsers(users)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"items":      users,
		"hasMore":    hasMore,
		"nextCursor": nextCursor,
		"total":      total,
	})
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
