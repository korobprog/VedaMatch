package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"rag-agent-server/internal/services"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	requestIDLocalKey = "requestID"
	errorCodeLocalKey = "errorCode"

	errorLogSuppressionWindow       = time.Minute
	errorLogSuppressionTTL          = 10 * time.Minute
	errorLogSuppressionCleanupEvery = time.Minute
)

type errorLogSuppressionState struct {
	windowStart time.Time
	lastSeenAt  time.Time
	suppressed  int
}

var (
	errorLogSuppressionMu        sync.Mutex
	errorLogSuppressionByReqKey  = make(map[string]*errorLogSuppressionState)
	errorLogSuppressionCleanupAt time.Time
)

func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := strings.TrimSpace(c.Get("X-Request-ID"))
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Locals(requestIDLocalKey, requestID)
		c.Set("X-Request-ID", requestID)
		return c.Next()
	}
}

func ErrorLog() fiber.Handler {
	return func(c *fiber.Ctx) error {
		startedAt := time.Now()
		err := c.Next()

		status := c.Response().StatusCode()
		if err != nil {
			if fiberErr, ok := err.(*fiber.Error); ok && fiberErr.Code > 0 {
				status = fiberErr.Code
			}
			if status <= 0 {
				status = fiber.StatusInternalServerError
			}
		}

		if status >= 400 {
			if status >= 500 {
				_ = services.GetMetricsService().Increment(services.MetricHTTP5xxTotal, 1)
			} else {
				_ = services.GetMetricsService().Increment(services.MetricHTTP4xxTotal, 1)
			}
			if status == fiber.StatusTooManyRequests {
				_ = services.GetMetricsService().Increment(services.MetricRateLimitedTotal, 1)
			}

			requestID := GetRequestID(c)
			errorCode := GetErrorCode(c)
			if errorCode == "" {
				errorCode = defaultErrorCode(status)
			}
			route := c.Path()
			latencyMs := time.Since(startedAt).Milliseconds()
			userID := GetUserID(c)
			clientIP := strings.TrimSpace(c.IP())
			now := time.Now()

			shouldLog, suppressedPrev := shouldLogRequestError(status, route, clientIP, errorCode, now)
			if !shouldLog {
				return err
			}
			if suppressedPrev > 0 {
				log.Printf(
					"[HTTP] request_error_suppressed route=%s status=%d userId=%d errorCode=%s ip=%s suppressed=%d",
					route, status, userID, errorCode, clientIP, suppressedPrev,
				)
			}

			log.Printf(
				"[HTTP] request_error route=%s status=%d userId=%d errorCode=%s requestId=%s ip=%s latency_ms=%d",
				route, status, userID, errorCode, requestID, clientIP, latencyMs,
			)
		}

		return err
	}
}

func GetRequestID(c *fiber.Ctx) string {
	value := c.Locals(requestIDLocalKey)
	requestID, _ := value.(string)
	return strings.TrimSpace(requestID)
}

func SetErrorCode(c *fiber.Ctx, code string) {
	c.Locals(errorCodeLocalKey, strings.TrimSpace(code))
}

func GetErrorCode(c *fiber.Ctx) string {
	value := c.Locals(errorCodeLocalKey)
	code, _ := value.(string)
	return strings.TrimSpace(code)
}

func defaultErrorCode(status int) string {
	switch status {
	case fiber.StatusBadRequest:
		return "bad_request"
	case fiber.StatusUnauthorized:
		return "unauthorized"
	case fiber.StatusForbidden:
		return "forbidden"
	case fiber.StatusNotFound:
		return "not_found"
	case fiber.StatusConflict:
		return "conflict"
	case fiber.StatusTooManyRequests:
		return "rate_limited"
	case fiber.StatusInternalServerError:
		return "internal_error"
	case fiber.StatusBadGateway:
		return "bad_gateway"
	case fiber.StatusServiceUnavailable:
		return "service_unavailable"
	case fiber.StatusGatewayTimeout:
		return "gateway_timeout"
	default:
		if status >= 500 {
			return "server_error"
		}
		if status >= 400 {
			return "client_error"
		}
		return ""
	}
}

func generateRequestID() string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return hex.EncodeToString([]byte(time.Now().UTC().Format("20060102150405.000000000")))
	}
	return hex.EncodeToString(bytes[:])
}

func shouldLogRequestError(status int, route, clientIP, errorCode string, now time.Time) (bool, int) {
	// Suppress only repeating unauthorized errors which are the most spammy.
	if status != fiber.StatusUnauthorized {
		return true, 0
	}

	key := fmt.Sprintf("%d|%s|%s|%s", status, route, clientIP, errorCode)

	errorLogSuppressionMu.Lock()
	defer errorLogSuppressionMu.Unlock()

	if errorLogSuppressionCleanupAt.IsZero() || now.After(errorLogSuppressionCleanupAt) {
		for stateKey, state := range errorLogSuppressionByReqKey {
			if now.Sub(state.lastSeenAt) > errorLogSuppressionTTL {
				delete(errorLogSuppressionByReqKey, stateKey)
			}
		}
		errorLogSuppressionCleanupAt = now.Add(errorLogSuppressionCleanupEvery)
	}

	state, exists := errorLogSuppressionByReqKey[key]
	if !exists {
		errorLogSuppressionByReqKey[key] = &errorLogSuppressionState{
			windowStart: now,
			lastSeenAt:  now,
			suppressed:  0,
		}
		return true, 0
	}

	state.lastSeenAt = now
	if now.Sub(state.windowStart) < errorLogSuppressionWindow {
		state.suppressed++
		return false, 0
	}

	suppressedPrev := state.suppressed
	state.windowStart = now
	state.suppressed = 0
	return true, suppressedPrev
}

func resetErrorLogSuppressionState() {
	errorLogSuppressionMu.Lock()
	defer errorLogSuppressionMu.Unlock()

	errorLogSuppressionByReqKey = make(map[string]*errorLogSuppressionState)
	errorLogSuppressionCleanupAt = time.Time{}
}
