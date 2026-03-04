package middleware

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type AccessClaims struct {
	UserID    uint
	UserRole  string
	SessionID uint
}

const (
	authLogSuppressionWindow       = time.Minute
	authLogSuppressionTTL          = 10 * time.Minute
	authLogSuppressionCleanupEvery = time.Minute
)

type authLogSuppressionState struct {
	windowStart time.Time
	lastSeenAt  time.Time
	suppressed  int
}

var (
	authLogSuppressionMu        sync.Mutex
	authLogSuppressionByReqKey  = make(map[string]*authLogSuppressionState)
	authLogSuppressionCleanupAt time.Time
)

func parseBearerToken(raw string) string {
	token := strings.TrimSpace(raw)
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}
	return token
}

func parseUintClaim(claims jwt.MapClaims, key string) (uint, bool) {
	value, exists := claims[key]
	if !exists || value == nil {
		return 0, false
	}

	switch v := value.(type) {
	case float64:
		if v <= 0 {
			return 0, false
		}
		return uint(v), true
	case int:
		if v <= 0 {
			return 0, false
		}
		return uint(v), true
	case int64:
		if v <= 0 {
			return 0, false
		}
		return uint(v), true
	case uint:
		if v == 0 {
			return 0, false
		}
		return v, true
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(v), 10, 64)
		if err != nil || parsed == 0 {
			return 0, false
		}
		return uint(parsed), true
	default:
		return 0, false
	}
}

func parseStringClaim(claims jwt.MapClaims, key string) string {
	value, exists := claims[key]
	if !exists || value == nil {
		return ""
	}
	asString, _ := value.(string)
	return strings.TrimSpace(asString)
}

func jwtSecret() (string, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET not configured")
	}
	return secret, nil
}

func ParseAccessToken(tokenString string) (*AccessClaims, error) {
	tokenString = parseBearerToken(tokenString)
	if tokenString == "" {
		return nil, fmt.Errorf("missing token")
	}

	secret, err := jwtSecret()
	if err != nil {
		return nil, err
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	userID, ok := parseUintClaim(claims, "userId")
	if !ok {
		return nil, fmt.Errorf("missing userId claim")
	}

	userRole := parseStringClaim(claims, "role")
	if userRole == "" {
		userRole = models.RoleUser
	}

	sessionID, _ := parseUintClaim(claims, "sessionId")
	return &AccessClaims{
		UserID:    userID,
		UserRole:  userRole,
		SessionID: sessionID,
	}, nil
}

func applyAccessClaims(c *fiber.Ctx, claims *AccessClaims) {
	if claims == nil {
		return
	}
	c.Locals("userID", claims.UserID)
	c.Locals("userRole", claims.UserRole)
	if claims.SessionID > 0 {
		c.Locals("sessionID", claims.SessionID)
	}
}

func isActiveAuthSession(userID uint, sessionID uint) (bool, error) {
	if userID == 0 || sessionID == 0 {
		return true, nil
	}

	var count int64
	err := database.DB.Model(&models.AuthSession{}).
		Where("id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?", sessionID, userID, time.Now().UTC()).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Protected verifies the JWT token
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Telegram support webhook must stay public: Telegram cannot send JWT auth headers.
		path := strings.TrimSuffix(c.Path(), "/")
		if path == "/api/integrations/telegram/support/webhook" {
			return c.Next()
		}

		tokenString := c.Get("Authorization")

		// Fallback to query parameter (e.g., for WebSockets)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			logAuthFailure(c, "missing_authorization_header", "")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		claims, err := ParseAccessToken(tokenString)
		if err != nil {
			logAuthFailure(c, "invalid_token", err.Error())
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		if claims.SessionID > 0 {
			active, sessionErr := isActiveAuthSession(claims.UserID, claims.SessionID)
			if sessionErr != nil {
				log.Printf("[AUTH] Session state check failed user=%d session=%d err=%v", claims.UserID, claims.SessionID, sessionErr)
				return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
					"error": "Auth service unavailable",
				})
			}
			if !active {
				logAuthFailure(c, "revoked_session", "")
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Session revoked",
				})
			}
		}

		applyAccessClaims(c, claims)

		return c.Next()
	}
}

// OptionalAuth parses JWT token if provided and stores user context.
// If token is missing or invalid, request continues as anonymous.
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenString := c.Get("Authorization")
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			return c.Next()
		}

		claims, err := ParseAccessToken(tokenString)
		if err != nil {
			return c.Next()
		}

		if claims.SessionID > 0 {
			active, sessionErr := isActiveAuthSession(claims.UserID, claims.SessionID)
			if sessionErr != nil || !active {
				return c.Next()
			}
		}

		applyAccessClaims(c, claims)

		return c.Next()
	}
}

// GetUserID extracts userID from context
func GetUserID(c *fiber.Ctx) uint {
	userID := c.Locals("userID")
	if userID == nil {
		return 0
	}

	switch v := userID.(type) {
	case uint:
		return v
	case int:
		if v <= 0 {
			return 0
		}
		return uint(v)
	case int64:
		if v <= 0 {
			return 0
		}
		return uint(v)
	case float64:
		return uint(v)
	case string:
		id, _ := strconv.ParseUint(v, 10, 64)
		return uint(id)
	default:
		return 0
	}
}

// GetSessionID extracts sessionID from context.
func GetSessionID(c *fiber.Ctx) uint {
	sessionID := c.Locals("sessionID")
	if sessionID == nil {
		return 0
	}

	switch v := sessionID.(type) {
	case uint:
		return v
	case int:
		if v <= 0 {
			return 0
		}
		return uint(v)
	case int64:
		if v <= 0 {
			return 0
		}
		return uint(v)
	case float64:
		if v <= 0 {
			return 0
		}
		return uint(v)
	case string:
		id, _ := strconv.ParseUint(strings.TrimSpace(v), 10, 64)
		return uint(id)
	default:
		return 0
	}
}

// GetUserRole extracts userRole from context
func GetUserRole(c *fiber.Ctx) string {
	role := c.Locals("userRole")
	if role == nil {
		return models.RoleUser
	}
	if r, ok := role.(string); ok {
		return r
	}
	return models.RoleUser
}

func logAuthFailure(c *fiber.Ctx, reason, details string) {
	route := c.Path()
	clientIP := strings.TrimSpace(c.IP())
	now := time.Now()

	shouldLog, suppressedPrev := shouldLogAuthFailure(reason, route, clientIP, now)
	if !shouldLog {
		return
	}

	if suppressedPrev > 0 {
		log.Printf(
			"[Auth] auth_error_suppressed route=%s reason=%s ip=%s suppressed=%d",
			route, reason, clientIP, suppressedPrev,
		)
	}

	if details == "" {
		log.Printf("[Auth] %s route=%s ip=%s", reason, route, clientIP)
		return
	}
	log.Printf("[Auth] %s route=%s ip=%s details=%s", reason, route, clientIP, details)
}

func shouldLogAuthFailure(reason, route, clientIP string, now time.Time) (bool, int) {
	key := fmt.Sprintf("%s|%s|%s", reason, route, clientIP)

	authLogSuppressionMu.Lock()
	defer authLogSuppressionMu.Unlock()

	if authLogSuppressionCleanupAt.IsZero() || now.After(authLogSuppressionCleanupAt) {
		for stateKey, state := range authLogSuppressionByReqKey {
			if now.Sub(state.lastSeenAt) > authLogSuppressionTTL {
				delete(authLogSuppressionByReqKey, stateKey)
			}
		}
		authLogSuppressionCleanupAt = now.Add(authLogSuppressionCleanupEvery)
	}

	state, exists := authLogSuppressionByReqKey[key]
	if !exists {
		authLogSuppressionByReqKey[key] = &authLogSuppressionState{
			windowStart: now,
			lastSeenAt:  now,
			suppressed:  0,
		}
		return true, 0
	}

	state.lastSeenAt = now
	if now.Sub(state.windowStart) < authLogSuppressionWindow {
		state.suppressed++
		return false, 0
	}

	suppressedPrev := state.suppressed
	state.windowStart = now
	state.suppressed = 0
	return true, suppressedPrev
}

func resetAuthLogSuppressionState() {
	authLogSuppressionMu.Lock()
	defer authLogSuppressionMu.Unlock()

	authLogSuppressionByReqKey = make(map[string]*authLogSuppressionState)
	authLogSuppressionCleanupAt = time.Time{}
}
