package observability

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type CallDiagnosticsSample struct {
	Subsystem   string
	Event       string
	Result      string
	Severity    string
	Mode        string
	Platform    string
	NetworkType string
	DurationSec int
}

type CallFeedbackSample struct {
	Mode        string
	Platform    string
	NetworkType string
	Rating      int
	DurationSec int
	Reasons     []string
}

var (
	realtimeCallLabelPattern = regexp.MustCompile(`[^a-z0-9]+`)

	realtimeCallEventsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_call_events_total",
		Help: "Total realtime and call observability events grouped by subsystem, event, result, severity, mode, platform, and network type.",
	}, []string{"subsystem", "event", "result", "severity", "mode", "platform", "network_type"})

	realtimeCallFeedbackTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_call_feedback_total",
		Help: "Total submitted call quality feedback grouped by rating, platform, and network type.",
	}, []string{"rating", "platform", "network_type"})

	realtimeCallQualityIssuesTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_call_quality_issues_total",
		Help: "Total submitted call quality issue reasons grouped by issue, platform, and network type.",
	}, []string{"issue", "platform", "network_type"})

	realtimeCallDurationSeconds = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "realtime_call_duration_seconds",
		Help:    "Observed call duration in seconds grouped by mode, platform, and network type.",
		Buckets: []float64{5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600},
	}, []string{"mode", "platform", "network_type"})
)

func ObserveRealtimeCallEvent(subsystem, event, result, severity, mode, platform, networkType string) {
	realtimeCallEventsTotal.WithLabelValues(
		normalizeSubsystem(subsystem),
		normalizeLabelToken(event, "unknown", 48),
		normalizeLabelToken(result, "unknown", 48),
		normalizeSeverity(severity),
		normalizeMode(mode),
		normalizePlatform(platform),
		normalizeNetworkType(networkType),
	).Inc()
}

func ObserveCallDiagnostics(sample CallDiagnosticsSample) {
	ObserveRealtimeCallEvent(
		sample.Subsystem,
		sample.Event,
		sample.Result,
		sample.Severity,
		sample.Mode,
		sample.Platform,
		sample.NetworkType,
	)

	if sample.DurationSec > 0 {
		realtimeCallDurationSeconds.WithLabelValues(
			normalizeMode(sample.Mode),
			normalizePlatform(sample.Platform),
			normalizeNetworkType(sample.NetworkType),
		).Observe(float64(sample.DurationSec))
	}
}

func ObserveCallFeedback(sample CallFeedbackSample) {
	platform := normalizePlatform(sample.Platform)
	networkType := normalizeNetworkType(sample.NetworkType)

	rating := sample.Rating
	if rating < 1 {
		rating = 1
	}
	if rating > 5 {
		rating = 5
	}

	realtimeCallFeedbackTotal.WithLabelValues(
		strconv.Itoa(rating),
		platform,
		networkType,
	).Inc()

	for _, reason := range sample.Reasons {
		normalized := normalizeFeedbackIssue(reason)
		if normalized == "" {
			continue
		}
		realtimeCallQualityIssuesTotal.WithLabelValues(normalized, platform, networkType).Inc()
	}

	if sample.DurationSec > 0 {
		realtimeCallDurationSeconds.WithLabelValues(
			normalizeMode(sample.Mode),
			platform,
			networkType,
		).Observe(float64(sample.DurationSec))
	}
}

func normalizeSubsystem(value string) string {
	switch normalizeLabelToken(value, "call", 32) {
	case "turn", "sfu", "signaling", "client", "call":
		return normalizeLabelToken(value, "call", 32)
	default:
		return "call"
	}
}

func normalizeSeverity(value string) string {
	switch normalizeLabelToken(value, "info", 16) {
	case "critical", "error", "warning", "info":
		return normalizeLabelToken(value, "info", 16)
	default:
		return "info"
	}
}

func normalizeMode(value string) string {
	switch normalizeLabelToken(value, "unknown", 16) {
	case "p2p", "room", "sfu":
		return normalizeLabelToken(value, "unknown", 16)
	default:
		return "unknown"
	}
}

func normalizePlatform(value string) string {
	switch normalizeLabelToken(value, "unknown", 16) {
	case "ios", "android", "web", "server":
		return normalizeLabelToken(value, "unknown", 16)
	default:
		return "unknown"
	}
}

func normalizeNetworkType(value string) string {
	switch normalizeLabelToken(value, "unknown", 24) {
	case "wifi", "cellular", "ethernet", "vpn", "unknown":
		return normalizeLabelToken(value, "unknown", 24)
	default:
		return "unknown"
	}
}

func normalizeFeedbackIssue(value string) string {
	switch normalizeLabelToken(value, "", 32) {
	case "audio_quality", "video_quality", "connection_stability", "latency", "echo", "other":
		return normalizeLabelToken(value, "", 32)
	default:
		return ""
	}
}

func normalizeLabelToken(value, fallback string, maxLen int) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return fallback
	}
	normalized := realtimeCallLabelPattern.ReplaceAllString(trimmed, "_")
	normalized = strings.Trim(normalized, "_")
	if normalized == "" {
		return fallback
	}
	if maxLen > 0 && len(normalized) > maxLen {
		normalized = strings.Trim(normalized[:maxLen], "_")
	}
	if normalized == "" {
		return fallback
	}
	return normalized
}
