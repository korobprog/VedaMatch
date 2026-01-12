package middleware

import (
	"log"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Protected verifies the JWT token
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenString := c.Get("Authorization")

		// Fallback to query parameter (e.g., for WebSockets)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			log.Println("[Auth] Missing authorization header")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		// Remove "Bearer " prefix
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			log.Println("[Auth] JWT_SECRET not configured")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Server configuration error",
			})
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			log.Printf("[Auth] Invalid token: %v", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Println("[Auth] Invalid token claims")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		userId := claims["userId"]
		if userId == nil {
			log.Println("[Auth] Missing userId in token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// Store userId in context
		c.Locals("userId", userId)

		// Store userRole in context (if present in token)
		if role, ok := claims["role"].(string); ok {
			c.Locals("userRole", role)
		} else {
			c.Locals("userRole", "user") // Default role
		}

		return c.Next()
	}
}

// GetUserID extracts userId from context
func GetUserID(c *fiber.Ctx) uint {
	userId := c.Locals("userId")
	if userId == nil {
		return 0
	}

	switch v := userId.(type) {
	case float64:
		return uint(v)
	case string:
		id, _ := strconv.ParseUint(v, 10, 64)
		return uint(id)
	default:
		return 0
	}
}

// GetUserRole extracts userRole from context
func GetUserRole(c *fiber.Ctx) string {
	role := c.Locals("userRole")
	if role == nil {
		return "user"
	}
	if r, ok := role.(string); ok {
		return r
	}
	return "user"
}
