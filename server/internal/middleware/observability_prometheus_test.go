package middleware

import (
	"io"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestMetricsEndpointAuthorization(t *testing.T) {
	previousEnabled, hadEnabled := os.LookupEnv(metricsEnabledEnvKey)
	previousToken, hadToken := os.LookupEnv(metricsBearerTokenEnvKey)
	t.Cleanup(func() {
		if hadEnabled {
			_ = os.Setenv(metricsEnabledEnvKey, previousEnabled)
		} else {
			_ = os.Unsetenv(metricsEnabledEnvKey)
		}
		if hadToken {
			_ = os.Setenv(metricsBearerTokenEnvKey, previousToken)
		} else {
			_ = os.Unsetenv(metricsBearerTokenEnvKey)
		}
	})

	_ = os.Setenv(metricsEnabledEnvKey, "true")
	_ = os.Setenv(metricsBearerTokenEnvKey, "test-token")

	app := fiber.New()
	app.Get("/metrics", MetricsEndpoint())

	req := httptest.NewRequest("GET", "/metrics", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request without authorization failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status %d without token, got %d", fiber.StatusUnauthorized, resp.StatusCode)
	}

	req = httptest.NewRequest("GET", "/metrics", nil)
	req.Header.Set("Authorization", "Bearer wrong-token")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("request with wrong authorization failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status %d with wrong token, got %d", fiber.StatusUnauthorized, resp.StatusCode)
	}

	req = httptest.NewRequest("GET", "/metrics", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("request with correct authorization failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status %d with correct token, got %d", fiber.StatusOK, resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	bodyText := string(body)
	if !strings.Contains(bodyText, "http_in_flight_requests") {
		t.Fatalf("expected metrics payload to contain http_in_flight_requests, got: %s", bodyText)
	}
}

func TestMetricsEndpointDisabled(t *testing.T) {
	previousEnabled, hadEnabled := os.LookupEnv(metricsEnabledEnvKey)
	previousToken, hadToken := os.LookupEnv(metricsBearerTokenEnvKey)
	t.Cleanup(func() {
		if hadEnabled {
			_ = os.Setenv(metricsEnabledEnvKey, previousEnabled)
		} else {
			_ = os.Unsetenv(metricsEnabledEnvKey)
		}
		if hadToken {
			_ = os.Setenv(metricsBearerTokenEnvKey, previousToken)
		} else {
			_ = os.Unsetenv(metricsBearerTokenEnvKey)
		}
	})

	_ = os.Setenv(metricsEnabledEnvKey, "false")
	_ = os.Setenv(metricsBearerTokenEnvKey, "test-token")

	app := fiber.New()
	app.Get("/metrics", MetricsEndpoint())

	req := httptest.NewRequest("GET", "/metrics", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected status %d when metrics disabled, got %d", fiber.StatusNotFound, resp.StatusCode)
	}
}

func TestNormalizeMetricsRoute(t *testing.T) {
	tests := []struct {
		name       string
		routePath  string
		request    string
		statusCode int
		want       string
	}{
		{
			name:       "uses route template when available",
			routePath:  "/api/users/:id",
			request:    "/api/users/123",
			statusCode: fiber.StatusOK,
			want:       "/api/users/:id",
		},
		{
			name:       "fallback 404 is collapsed",
			routePath:  "",
			request:    "/unknown/path/123",
			statusCode: fiber.StatusNotFound,
			want:       "/__not_found__",
		},
		{
			name:       "numeric id is normalized",
			routePath:  "",
			request:    "/api/orders/998877",
			statusCode: fiber.StatusOK,
			want:       "/api/orders/:id",
		},
		{
			name:       "uuid id is normalized",
			routePath:  "",
			request:    "/api/users/7f60ad3d-2fff-4a17-9f6b-3f74253f2aa8/profile",
			statusCode: fiber.StatusOK,
			want:       "/api/users/:id/profile",
		},
		{
			name:       "long paths are bounded",
			routePath:  "",
			request:    "/a/b/c/d/e/f/g",
			statusCode: fiber.StatusOK,
			want:       "/a/b/c/d/e/__tail__",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeMetricsRoute(tt.routePath, tt.request, tt.statusCode)
			if got != tt.want {
				t.Fatalf("normalizeMetricsRoute()=%q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseBearerToken(t *testing.T) {
	tests := []struct {
		header string
		want   string
	}{
		{header: "", want: ""},
		{header: "Basic abc", want: ""},
		{header: "Bearer abc", want: "abc"},
		{header: "bearer xyz", want: "xyz"},
		{header: "Bearer    token-with-spaces   ", want: "token-with-spaces"},
	}

	for _, tt := range tests {
		got := parseMetricsBearerToken(tt.header)
		if got != tt.want {
			t.Fatalf("parseMetricsBearerToken(%q)=%q, want %q", tt.header, got, tt.want)
		}
	}
}
