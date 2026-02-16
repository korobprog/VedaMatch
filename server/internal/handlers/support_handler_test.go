package handlers

import "testing"

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

type fixedErr string

func (e fixedErr) Error() string { return string(e) }

func assertErr(value string) error {
	return fixedErr(value)
}
