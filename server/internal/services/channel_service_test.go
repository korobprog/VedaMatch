package services

import (
	"testing"

	"rag-agent-server/internal/models"
)

func TestValidateChannelCTAPayload(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		ctaType models.ChannelPostCTAType
		payload string
		wantErr bool
	}{
		{
			name:    "none without payload",
			ctaType: models.ChannelPostCTATypeNone,
			payload: "",
			wantErr: false,
		},
		{
			name:    "none with payload is invalid",
			ctaType: models.ChannelPostCTATypeNone,
			payload: `{"serviceId":1}`,
			wantErr: true,
		},
		{
			name:    "book_service valid payload",
			ctaType: models.ChannelPostCTATypeBookService,
			payload: `{"serviceId": 123}`,
			wantErr: false,
		},
		{
			name:    "book_service missing serviceId",
			ctaType: models.ChannelPostCTATypeBookService,
			payload: `{"foo":"bar"}`,
			wantErr: true,
		},
		{
			name:    "order_products valid payload",
			ctaType: models.ChannelPostCTATypeOrderProducts,
			payload: `{"shopId": 10, "items":[{"productId": 1, "quantity": 2}]}`,
			wantErr: false,
		},
		{
			name:    "order_products missing items",
			ctaType: models.ChannelPostCTATypeOrderProducts,
			payload: `{"shopId": 10}`,
			wantErr: true,
		},
		{
			name:    "order_products invalid quantity",
			ctaType: models.ChannelPostCTATypeOrderProducts,
			payload: `{"shopId": 10, "items":[{"productId": 1, "quantity": 0}]}`,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateChannelCTAPayload(tc.ctaType, tc.payload)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestExtractPositiveUint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		value     interface{}
		wantValue uint
		wantOK    bool
	}{
		{name: "float64", value: float64(5), wantValue: 5, wantOK: true},
		{name: "int64", value: int64(7), wantValue: 7, wantOK: true},
		{name: "string", value: "42", wantValue: 42, wantOK: true},
		{name: "zero string", value: "0", wantValue: 0, wantOK: false},
		{name: "negative int", value: -1, wantValue: 0, wantOK: false},
		{name: "unsupported", value: true, wantValue: 0, wantOK: false},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, ok := extractPositiveUint(tc.value)
			if ok != tc.wantOK {
				t.Fatalf("expected ok=%v, got %v", tc.wantOK, ok)
			}
			if got != tc.wantValue {
				t.Fatalf("expected value=%d, got %d", tc.wantValue, got)
			}
		})
	}
}

func TestParseChannelIntWithDefault(t *testing.T) {
	t.Parallel()

	if got := parseChannelIntWithDefault("25", 100); got != 25 {
		t.Fatalf("expected 25, got %d", got)
	}
	if got := parseChannelIntWithDefault("bad", 100); got != 100 {
		t.Fatalf("expected fallback 100, got %d", got)
	}
	if got := parseChannelIntWithDefault("", 5); got != 5 {
		t.Fatalf("expected fallback 5, got %d", got)
	}
}

func TestParseUintAllowlist(t *testing.T) {
	t.Parallel()

	set := parseUintAllowlist("1, 2, abc, 0, 2, 10")
	if len(set) != 3 {
		t.Fatalf("expected 3 ids, got %d", len(set))
	}
	if _, ok := set[1]; !ok {
		t.Fatalf("expected id 1 in set")
	}
	if _, ok := set[2]; !ok {
		t.Fatalf("expected id 2 in set")
	}
	if _, ok := set[10]; !ok {
		t.Fatalf("expected id 10 in set")
	}
}

func TestNormalizePromptKey(t *testing.T) {
	t.Parallel()

	if got := normalizePromptKey("  CHANNELS_TIP  "); got != "channels_tip" {
		t.Fatalf("expected channels_tip, got %q", got)
	}
	if got := normalizePromptKey("   "); got != "" {
		t.Fatalf("expected empty key, got %q", got)
	}
	longKey := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	if got := normalizePromptKey(longKey); len(got) != 120 {
		t.Fatalf("expected trimmed key length 120, got %d", len(got))
	}
}
