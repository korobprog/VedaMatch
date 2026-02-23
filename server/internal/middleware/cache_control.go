package middleware

import (
	"rag-agent-server/internal/config"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/etag"
)

// ConditionalCacheControl applies cache headers only when
// FF_HTTP_CONDITIONAL_CACHE is enabled.
func ConditionalCacheControl(cacheControl string) fiber.Handler {
	normalized := strings.TrimSpace(cacheControl)
	return func(c *fiber.Ctx) error {
		if !config.HTTPConditionalCacheEnabled() {
			return c.Next()
		}
		if normalized != "" {
			c.Set("Cache-Control", normalized)
		}
		return c.Next()
	}
}

// ConditionalETag enables ETag generation only when
// FF_HTTP_CONDITIONAL_CACHE is enabled.
func ConditionalETag() fiber.Handler {
	etagMiddleware := etag.New()
	return func(c *fiber.Ctx) error {
		if !config.HTTPConditionalCacheEnabled() {
			return c.Next()
		}
		return etagMiddleware(c)
	}
}
