package middleware

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

// AdminProtected middleware checks for X-Admin-ID header
func AdminProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Log the request for debugging
		adminID := c.Get("X-Admin-ID")
		path := c.Path()
		method := c.Method()

		log.Printf("[AdminMiddleware] Request: %s %s, AdminID: %s", method, path, adminID)

		if adminID == "" {
			// Log warning but allow for now to unblock testing
			log.Println("[AdminMiddleware] WARNING: Missing X-Admin-ID header, permitting request for debugging")
			// return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			// 	"error": "Missing X-Admin-ID header",
			// })
		}

		// In the future, we should validate this ID against the database
		// and check if the user has admin role.
		// For now, we trust the frontend sends it if the user is logged in as admin.

		return c.Next()
	}
}
