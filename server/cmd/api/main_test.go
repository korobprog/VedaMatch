package main

import (
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestBuildAllowedOrigins(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", " https://api.example.com ,https://api.example.com/,*,http://localhost:3000 ")

	defaults := []string{
		"http://localhost:3000",
		"https://app.example.com/",
	}
	ordered, set := buildAllowedOrigins(defaults)

	if len(ordered) != 3 {
		t.Fatalf("expected 3 unique origins, got %d (%v)", len(ordered), ordered)
	}
	if !set["http://localhost:3000"] {
		t.Fatalf("expected localhost origin in set")
	}
	if !set["https://app.example.com"] {
		t.Fatalf("expected normalized default origin in set")
	}
	if !set["https://api.example.com"] {
		t.Fatalf("expected env origin in set")
	}
	if set["*"] {
		t.Fatalf("wildcard origin must be ignored when credentials are enabled")
	}
}

func TestNormalizeAllowedOrigin(t *testing.T) {
	if got := normalizeAllowedOrigin(" https://api.example.com/ "); got != "https://api.example.com" {
		t.Fatalf("unexpected normalized origin: %q", got)
	}
	if got := normalizeAllowedOrigin("   "); got != "" {
		t.Fatalf("expected empty normalized origin, got %q", got)
	}
}

func TestResolveListenPort(t *testing.T) {
	t.Setenv("PORT", "")
	if got := resolveListenPort("8000"); got != ":8000" {
		t.Fatalf("expected :8000, got %q", got)
	}

	t.Setenv("PORT", "9001")
	if got := resolveListenPort("8000"); got != ":9001" {
		t.Fatalf("expected :9001, got %q", got)
	}

	t.Setenv("PORT", ":7000")
	if got := resolveListenPort("8000"); got != ":7000" {
		t.Fatalf("expected :7000, got %q", got)
	}

	t.Setenv("PORT", "bad")
	if got := resolveListenPort("8000"); got != ":8000" {
		t.Fatalf("expected fallback :8000, got %q", got)
	}
}

func TestErrorCodeFromStatus(t *testing.T) {
	if got := errorCodeFromStatus(fiber.StatusBadRequest); got != "bad_request" {
		t.Fatalf("unexpected code for 400: %q", got)
	}
	if got := errorCodeFromStatus(499); got != "client_error" {
		t.Fatalf("unexpected code for 499: %q", got)
	}
	if got := errorCodeFromStatus(599); got != "server_error" {
		t.Fatalf("unexpected code for 599: %q", got)
	}
}
