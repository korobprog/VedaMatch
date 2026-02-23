package middleware

import (
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
)

func TestShouldLogRequestErrorUnauthorizedSuppression(t *testing.T) {
	resetErrorLogSuppressionState()

	route := "/api/admin/notifications"
	ip := "10.0.1.14"
	code := "unauthorized"
	start := time.Unix(1700000000, 0)

	shouldLog, suppressedPrev := shouldLogRequestError(fiber.StatusUnauthorized, route, ip, code, start)
	if !shouldLog || suppressedPrev != 0 {
		t.Fatalf("first unauthorized request should log once; got shouldLog=%v suppressedPrev=%d", shouldLog, suppressedPrev)
	}

	shouldLog, suppressedPrev = shouldLogRequestError(fiber.StatusUnauthorized, route, ip, code, start.Add(10*time.Second))
	if shouldLog || suppressedPrev != 0 {
		t.Fatalf("second unauthorized request in window should be suppressed; got shouldLog=%v suppressedPrev=%d", shouldLog, suppressedPrev)
	}

	shouldLog, suppressedPrev = shouldLogRequestError(fiber.StatusUnauthorized, route, ip, code, start.Add(20*time.Second))
	if shouldLog || suppressedPrev != 0 {
		t.Fatalf("third unauthorized request in window should be suppressed; got shouldLog=%v suppressedPrev=%d", shouldLog, suppressedPrev)
	}

	shouldLog, suppressedPrev = shouldLogRequestError(fiber.StatusUnauthorized, route, ip, code, start.Add(61*time.Second))
	if !shouldLog || suppressedPrev != 2 {
		t.Fatalf("request after window should log with suppressed count=2; got shouldLog=%v suppressedPrev=%d", shouldLog, suppressedPrev)
	}
}

func TestShouldLogRequestErrorNonUnauthorizedAlwaysLogs(t *testing.T) {
	resetErrorLogSuppressionState()

	shouldLog, suppressedPrev := shouldLogRequestError(fiber.StatusNotFound, "/api/missing", "10.0.1.14", "not_found", time.Now())
	if !shouldLog || suppressedPrev != 0 {
		t.Fatalf("non-401 error should always log; got shouldLog=%v suppressedPrev=%d", shouldLog, suppressedPrev)
	}

	shouldLog, suppressedPrev = shouldLogRequestError(fiber.StatusNotFound, "/api/missing", "10.0.1.14", "not_found", time.Now().Add(10*time.Second))
	if !shouldLog || suppressedPrev != 0 {
		t.Fatalf("non-401 error should always log repeatedly; got shouldLog=%v suppressedPrev=%d", shouldLog, suppressedPrev)
	}
}
