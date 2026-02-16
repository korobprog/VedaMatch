package handlers

import (
	"strings"
	"testing"
)

func TestIsValidSupportContact(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{name: "valid email", value: "user@example.com", want: true},
		{name: "valid telegram", value: "@veda_support", want: true},
		{name: "invalid telegram short", value: "@abc", want: false},
		{name: "invalid plain", value: "hello", want: false},
		{name: "empty", value: "", want: false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got := isValidSupportContact(tt.value)
			if got != tt.want {
				t.Fatalf("isValidSupportContact(%q)=%v, want=%v", tt.value, got, tt.want)
			}
		})
	}
}

func TestIsUniqueViolation(t *testing.T) {
	if isUniqueViolation(nil) {
		t.Fatalf("nil error must not be unique violation")
	}
	if !isUniqueViolation(assertErr("duplicate key value violates unique constraint")) {
		t.Fatalf("expected unique violation on duplicate key text")
	}
	if !isUniqueViolation(assertErr("UNIQUE constraint failed: support_conversations.client_request_id")) {
		t.Fatalf("expected unique violation on sqlite-like unique message")
	}
	if isUniqueViolation(assertErr("network timeout")) {
		t.Fatalf("network timeout must not be unique violation")
	}
}

func TestSupportClientContextToOperatorLines(t *testing.T) {
	ctx := supportClientContext{
		Platform:    "android",
		OS:          "android",
		OSVersion:   "14",
		DeviceModel: "Samsung S23",
		AppVersion:  "2.3.1",
		AppBuild:    "2310",
	}

	lines := ctx.toOperatorLines()
	joined := strings.Join(lines, "\n")

	if !strings.Contains(joined, "device_platform: android") {
		t.Fatalf("expected platform line, got %q", joined)
	}
	if !strings.Contains(joined, "device_model: Samsung S23") {
		t.Fatalf("expected device model line, got %q", joined)
	}
	if !strings.Contains(joined, "app_version: 2.3.1") {
		t.Fatalf("expected app version line, got %q", joined)
	}
}

func TestBuildSupportAIInput_IncludesClientContext(t *testing.T) {
	input := buildSupportAIInput("Не работает кнопка", supportClientContext{
		Platform:    "android",
		OSVersion:   "14",
		DeviceModel: "Pixel 8",
		AppVersion:  "1.5.0",
	})

	if !strings.Contains(input, "Client context:") {
		t.Fatalf("expected context section, got %q", input)
	}
	if !strings.Contains(input, "platform=android") {
		t.Fatalf("expected platform in ai input, got %q", input)
	}
	if !strings.Contains(input, "app_version=1.5.0") {
		t.Fatalf("expected app version in ai input, got %q", input)
	}
}

type fixedErr string

func (e fixedErr) Error() string { return string(e) }

func assertErr(value string) error {
	return fixedErr(value)
}
