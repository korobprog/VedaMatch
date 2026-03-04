package middleware

import (
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const (
	metricsEnabledEnvKey     = "METRICS_ENABLED"
	metricsBearerTokenEnvKey = "METRICS_BEARER_TOKEN"
)

var (
	metricsUUIDPattern     = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
	metricsHexTokenPattern = regexp.MustCompile(`^[0-9a-fA-F]{16,}$`)

	httpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests grouped by method, route and status class.",
	}, []string{"method", "route", "status_class"})

	httpRequestDurationSeconds = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "HTTP request duration in seconds grouped by method, route and status class.",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "route", "status_class"})

	httpInFlightRequests = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "http_in_flight_requests",
		Help: "Current number of in-flight HTTP requests.",
	})
)

func MetricsEnabled() bool {
	value := strings.TrimSpace(os.Getenv(metricsEnabledEnvKey))
	switch strings.ToLower(value) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func MetricsEndpoint() fiber.Handler {
	httpHandler := adaptor.HTTPHandler(promhttp.HandlerFor(
		prometheus.DefaultGatherer,
		promhttp.HandlerOpts{
			// Do not fail the whole scrape when one collector reports an error.
			// This keeps /metrics available for monitoring and exposes collection
			// errors inline in the payload.
			ErrorHandling: promhttp.ContinueOnError,
		},
	))

	return func(c *fiber.Ctx) error {
		if !MetricsEnabled() {
			return c.SendStatus(fiber.StatusNotFound)
		}

		expectedToken := strings.TrimSpace(os.Getenv(metricsBearerTokenEnvKey))
		if expectedToken == "" {
			return c.SendStatus(fiber.StatusServiceUnavailable)
		}

		if parseMetricsBearerToken(c.Get("Authorization")) != expectedToken {
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		return httpHandler(c)
	}
}

func PrometheusHTTPMetrics() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !MetricsEnabled() {
			return c.Next()
		}

		if c.Path() == "/metrics" {
			return c.Next()
		}

		start := time.Now()
		httpInFlightRequests.Inc()
		defer httpInFlightRequests.Dec()

		err := c.Next()
		statusCode := resolveStatusCode(c, err)
		statusClass := statusCodeClass(statusCode)

		routePath := ""
		route := c.Route()
		if route != nil {
			routePath = route.Path
		}
		normalizedRoute := normalizeMetricsRoute(routePath, c.Path(), statusCode)

		method := strings.ToUpper(strings.TrimSpace(c.Method()))
		if method == "" {
			method = "UNKNOWN"
		}

		httpRequestsTotal.WithLabelValues(method, normalizedRoute, statusClass).Inc()
		httpRequestDurationSeconds.WithLabelValues(method, normalizedRoute, statusClass).Observe(time.Since(start).Seconds())

		return err
	}
}

func parseMetricsBearerToken(authHeader string) string {
	header := strings.TrimSpace(authHeader)
	if header == "" {
		return ""
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 {
		return ""
	}

	if !strings.EqualFold(strings.TrimSpace(parts[0]), "bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}

func resolveStatusCode(c *fiber.Ctx, err error) int {
	statusCode := c.Response().StatusCode()
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok && fiberErr.Code > 0 {
			return fiberErr.Code
		}
		if statusCode <= 0 {
			return fiber.StatusInternalServerError
		}
	}
	if statusCode <= 0 {
		return fiber.StatusOK
	}
	return statusCode
}

func statusCodeClass(statusCode int) string {
	class := statusCode / 100
	if class < 1 || class > 5 {
		return "unknown"
	}
	return strconv.Itoa(class) + "xx"
}

func normalizeMetricsRoute(routePath, requestPath string, statusCode int) string {
	route := normalizePath(routePath)
	if route != "" && route != "/*" && route != "*" {
		return route
	}

	if statusCode == fiber.StatusNotFound {
		return "/__not_found__"
	}

	path := normalizePath(requestPath)
	if path == "" {
		return "/"
	}

	parts := splitPath(path)
	if len(parts) == 0 {
		return "/"
	}

	if len(parts) > 5 {
		parts = append(parts[:5], "__tail__")
	}

	for idx, part := range parts {
		if isDynamicMetricsPathPart(part) {
			parts[idx] = ":id"
		}
	}

	return "/" + strings.Join(parts, "/")
}

func normalizePath(path string) string {
	value := strings.TrimSpace(path)
	if value == "" {
		return ""
	}
	if !strings.HasPrefix(value, "/") {
		value = "/" + value
	}
	if len(value) > 1 {
		value = strings.TrimSuffix(value, "/")
	}
	return value
}

func splitPath(path string) []string {
	raw := strings.Split(strings.Trim(path, "/"), "/")
	parts := make([]string, 0, len(raw))
	for _, part := range raw {
		if part == "" {
			continue
		}
		parts = append(parts, part)
	}
	return parts
}

func isDynamicMetricsPathPart(part string) bool {
	if part == "" {
		return false
	}

	if strings.HasPrefix(part, ":") {
		return true
	}

	if _, err := strconv.ParseInt(part, 10, 64); err == nil {
		return true
	}

	if metricsUUIDPattern.MatchString(part) {
		return true
	}

	return metricsHexTokenPattern.MatchString(part)
}
