package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	defaultAccessTokenTTLMinutes = 15
	defaultRefreshTokenTTLDays   = 30
)

func resolveAccessTokenTTL() time.Duration {
	raw := strings.TrimSpace(os.Getenv("AUTH_ACCESS_TOKEN_TTL_MINUTES"))
	if raw == "" {
		return defaultAccessTokenTTLMinutes * time.Minute
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < 5 {
		return defaultAccessTokenTTLMinutes * time.Minute
	}
	return time.Duration(parsed) * time.Minute
}

func resolveRefreshTokenTTL() time.Duration {
	raw := strings.TrimSpace(os.Getenv("AUTH_REFRESH_TOKEN_TTL_DAYS"))
	if raw == "" {
		return defaultRefreshTokenTTLDays * 24 * time.Hour
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < 7 {
		return defaultRefreshTokenTTLDays * 24 * time.Hour
	}
	return time.Duration(parsed) * 24 * time.Hour
}

func sanitizeDeviceID(deviceID string) string {
	deviceID = strings.TrimSpace(deviceID)
	if deviceID == "" {
		return ""
	}
	runes := []rune(deviceID)
	if len(runes) > 128 {
		return string(runes[:128])
	}
	return deviceID
}

func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(token)))
	return hex.EncodeToString(sum[:])
}

func generateRefreshToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	return token, hashRefreshToken(token), nil
}

func getJWTSecret() (string, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET not configured")
	}
	return secret, nil
}

func buildAccessToken(user models.User, sessionID uint, now time.Time) (string, time.Time, error) {
	secret, err := getJWTSecret()
	if err != nil {
		return "", time.Time{}, err
	}

	expiresAt := now.Add(resolveAccessTokenTTL())
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId":    user.ID,
		"email":     user.Email,
		"role":      user.Role,
		"sessionId": sessionID,
		"iat":       now.Unix(),
		"exp":       expiresAt.Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

func createAuthSession(userID uint, deviceID string, now time.Time) (*models.AuthSession, string, error) {
	refreshToken, refreshHash, err := generateRefreshToken()
	if err != nil {
		return nil, "", err
	}
	refreshTokenTTL := resolveRefreshTokenTTL()

	lastUsedAt := now
	session := &models.AuthSession{
		UserID:           userID,
		DeviceID:         sanitizeDeviceID(deviceID),
		RefreshTokenHash: refreshHash,
		ExpiresAt:        now.Add(refreshTokenTTL),
		LastUsedAt:       &lastUsedAt,
	}

	if err := database.DB.Create(session).Error; err != nil {
		return nil, "", err
	}

	return session, refreshToken, nil
}

func rotateAuthSession(session *models.AuthSession, deviceID string, now time.Time) (string, error) {
	if session == nil || session.ID == 0 {
		return "", fmt.Errorf("invalid auth session")
	}
	refreshTokenTTL := resolveRefreshTokenTTL()

	newRefreshToken, newRefreshHash, err := generateRefreshToken()
	if err != nil {
		return "", err
	}

	updates := map[string]interface{}{
		"refresh_token_hash": newRefreshHash,
		"expires_at":         now.Add(refreshTokenTTL),
		"last_used_at":       now,
		"revoked_at":         nil,
	}
	if sanitized := sanitizeDeviceID(deviceID); sanitized != "" {
		updates["device_id"] = sanitized
	}

	if err := database.DB.Model(&models.AuthSession{}).
		Where("id = ? AND revoked_at IS NULL", session.ID).
		Updates(updates).Error; err != nil {
		return "", err
	}

	session.RefreshTokenHash = newRefreshHash
	session.ExpiresAt = now.Add(refreshTokenTTL)
	session.RevokedAt = nil
	lastUsedAt := now
	session.LastUsedAt = &lastUsedAt
	if sanitized := sanitizeDeviceID(deviceID); sanitized != "" {
		session.DeviceID = sanitized
	}

	return newRefreshToken, nil
}
