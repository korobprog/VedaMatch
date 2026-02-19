package middleware

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type rateLimitBucket struct {
	Count      int
	WindowFrom time.Time
}

type inMemoryRateLimiter struct {
	mu      sync.Mutex
	buckets map[string]rateLimitBucket
}

var globalRateLimiter = &inMemoryRateLimiter{
	buckets: make(map[string]rateLimitBucket),
}

func (l *inMemoryRateLimiter) allow(key string, limit int, window time.Duration) (bool, time.Duration) {
	if limit <= 0 || window <= 0 {
		return true, 0
	}

	now := time.Now().UTC()

	l.mu.Lock()
	defer l.mu.Unlock()

	bucket := l.buckets[key]
	if bucket.WindowFrom.IsZero() || now.Sub(bucket.WindowFrom) >= window {
		bucket = rateLimitBucket{Count: 0, WindowFrom: now}
	}

	if bucket.Count >= limit {
		retryAfter := window - now.Sub(bucket.WindowFrom)
		if retryAfter < 0 {
			retryAfter = 0
		}
		l.buckets[key] = bucket
		return false, retryAfter
	}

	bucket.Count++
	l.buckets[key] = bucket
	l.compact(now, window)
	return true, 0
}

func (l *inMemoryRateLimiter) compact(now time.Time, window time.Duration) {
	// Keep memory bounded when old keys accumulate (IPs, user IDs, etc.).
	if len(l.buckets) < 5000 {
		return
	}
	for key, bucket := range l.buckets {
		if now.Sub(bucket.WindowFrom) > window*2 {
			delete(l.buckets, key)
		}
	}
}

func buildRateLimitKey(scope string, subject string) string {
	normalizedScope := strings.TrimSpace(strings.ToLower(scope))
	if normalizedScope == "" {
		normalizedScope = "global"
	}
	normalizedSubject := strings.TrimSpace(strings.ToLower(subject))
	if normalizedSubject == "" {
		normalizedSubject = "unknown"
	}
	return normalizedScope + ":" + normalizedSubject
}

func rateLimitHandler(scope string, limit int, window time.Duration, subjectFn func(c *fiber.Ctx) string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		subject := subjectFn(c)
		key := buildRateLimitKey(scope, subject)
		allowed, retryAfter := globalRateLimiter.allow(key, limit, window)
		if allowed {
			return c.Next()
		}

		retryAfterSeconds := int(retryAfter.Seconds())
		if retryAfterSeconds <= 0 {
			retryAfterSeconds = 1
		}

		c.Set("Retry-After", strconv.Itoa(retryAfterSeconds))
		SetErrorCode(c, "rate_limited")

		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":             "Too many requests. Please retry later.",
			"errorCode":         "rate_limited",
			"retryAfterSeconds": retryAfterSeconds,
			"requestId":         GetRequestID(c),
		})
	}
}

// RateLimitByIP limits requests by source IP.
func RateLimitByIP(scope string, limit int, window time.Duration) fiber.Handler {
	return rateLimitHandler(scope, limit, window, func(c *fiber.Ctx) string {
		return "ip:" + strings.TrimSpace(c.IP())
	})
}

// RateLimitByIdentity limits requests by authenticated user when possible, falling back to source IP.
func RateLimitByIdentity(scope string, limit int, window time.Duration) fiber.Handler {
	return rateLimitHandler(scope, limit, window, func(c *fiber.Ctx) string {
		userID := GetUserID(c)
		if userID > 0 {
			return "user:" + strconv.FormatUint(uint64(userID), 10)
		}
		return "ip:" + strings.TrimSpace(c.IP())
	})
}
