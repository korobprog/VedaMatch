package handlers

import "testing"

func TestNormalizeDiagnosticsToken(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		maxLen int
		want   string
	}{
		{name: "basic", input: "ICE Failed", maxLen: 32, want: "ice_failed"},
		{name: "trims punctuation", input: "  peer.state/disconnected  ", maxLen: 32, want: "peer_state_disconnected"},
		{name: "max len", input: "this-is-a-very-long-diagnostic-event-name", maxLen: 16, want: "this_is_a_very_l"},
		{name: "empty", input: "   ", maxLen: 16, want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeDiagnosticsToken(tt.input, tt.maxLen); got != tt.want {
				t.Fatalf("normalizeDiagnosticsToken(%q)=%q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestSanitizeDiagnosticsMetadata(t *testing.T) {
	metadata := sanitizeDiagnosticsMetadata(map[string]interface{}{
		" networkType ": "wifi",
		"ice-policy":    "relay",
		"count":         3,
		"skip_map":      map[string]string{"a": "b"},
		"empty":         "   ",
	})

	if len(metadata) != 3 {
		t.Fatalf("expected 3 metadata items, got %d: %#v", len(metadata), metadata)
	}
	if metadata["networktype"] != "wifi" {
		t.Fatalf("expected normalized networktype metadata, got %#v", metadata["networktype"])
	}
	if metadata["ice_policy"] != "relay" {
		t.Fatalf("expected normalized ice_policy metadata, got %#v", metadata["ice_policy"])
	}
	if metadata["count"] != 3 {
		t.Fatalf("expected count metadata, got %#v", metadata["count"])
	}
}
