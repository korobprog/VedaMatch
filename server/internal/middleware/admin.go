package middleware

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

// AdminProtected middleware checks if user has admin role (requires Protected middleware before)
func AdminProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := GetUserRole(c)
		path := c.Path()
		method := c.Method()

		log.Printf("[AdminMiddleware] Request: %s %s, Role: %s", method, path, role)

		if role != "admin" && role != "superadmin" {
			log.Printf("[AdminMiddleware] Forbidden access attempt by role: %s", role)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Admin access required",
			})
		}

		return c.Next()
	}
}
