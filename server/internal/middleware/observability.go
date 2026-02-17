package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	requestIDLocalKey = "requestID"
	errorCodeLocalKey = "errorCode"
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
			requestID := GetRequestID(c)
			errorCode := GetErrorCode(c)
			if errorCode == "" {
				errorCode = defaultErrorCode(status)
			}
			route := c.Path()
			latencyMs := time.Since(startedAt).Milliseconds()
			userID := GetUserID(c)

			log.Printf(
				"[HTTP] request_error route=%s status=%d userId=%d errorCode=%s requestId=%s latency_ms=%d",
				route, status, userID, errorCode, requestID, latencyMs,
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
