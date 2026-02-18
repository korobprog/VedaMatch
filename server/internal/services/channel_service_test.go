package services

import (
	"strings"
	"testing"
	"time"
	"unicode/utf8"

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
			name:    "book_service supports snake_case",
			ctaType: models.ChannelPostCTATypeBookService,
			payload: `{"service_id": 123}`,
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
			name:    "order_products supports snake_case",
			ctaType: models.ChannelPostCTATypeOrderProducts,
			payload: `{"shop_id": 10, "items":[{"product_id": 1, "quantity": 2}]}`,
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

func TestExtractPositiveUintRejectsOverflow(t *testing.T) {
	t.Parallel()

	if _, ok := extractPositiveUint(float64(1 << 40)); ok {
		t.Fatalf("expected overflow float64 to be rejected")
	}
	if _, ok := extractPositiveUint(int64(1 << 40)); ok {
		t.Fatalf("expected overflow int64 to be rejected")
	}
	if _, ok := extractPositiveUint(uint64(1 << 40)); ok {
		t.Fatalf("expected overflow uint64 to be rejected")
	}
}

func TestExtractPositiveUintFromMapAliases(t *testing.T) {
	t.Parallel()

	value, ok := extractPositiveUintFromMap(map[string]interface{}{
		"service_id": float64(22),
	}, "serviceId", "service_id")
	if !ok || value != 22 {
		t.Fatalf("expected alias extraction to return 22, got value=%d ok=%v", value, ok)
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

func TestIsUserEnabledByRollout(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		userID        uint
		denylist      map[uint]struct{}
		allowlist     map[uint]struct{}
		rollout       int
		expectEnabled bool
	}{
		{
			name:          "denylist blocks even if allowlisted",
			userID:        42,
			denylist:      map[uint]struct{}{42: {}},
			allowlist:     map[uint]struct{}{42: {}},
			rollout:       100,
			expectEnabled: false,
		},
		{
			name:          "allowlist enables listed user",
			userID:        15,
			allowlist:     map[uint]struct{}{15: {}},
			rollout:       0,
			expectEnabled: true,
		},
		{
			name:          "allowlist blocks non-listed user",
			userID:        16,
			allowlist:     map[uint]struct{}{15: {}},
			rollout:       100,
			expectEnabled: false,
		},
		{
			name:          "full rollout enables anonymous",
			userID:        0,
			rollout:       100,
			expectEnabled: true,
		},
		{
			name:          "partial rollout disables anonymous",
			userID:        0,
			rollout:       50,
			expectEnabled: false,
		},
		{
			name:          "percent rollout buckets by user id",
			userID:        42,
			rollout:       50,
			expectEnabled: true,
		},
		{
			name:          "percent rollout blocks out of bucket",
			userID:        99,
			rollout:       50,
			expectEnabled: false,
		},
		{
			name:          "zero rollout disables user",
			userID:        11,
			rollout:       0,
			expectEnabled: false,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := isUserEnabledByRollout(tc.userID, tc.denylist, tc.allowlist, tc.rollout)
			if got != tc.expectEnabled {
				t.Fatalf("expected %v, got %v", tc.expectEnabled, got)
			}
		})
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

	unicodeKey := strings.Repeat("й", 130)
	normalized := normalizePromptKey(unicodeKey)
	if !utf8.ValidString(normalized) {
		t.Fatalf("normalized key must stay valid UTF-8")
	}
	if len([]rune(normalized)) != 120 {
		t.Fatalf("expected 120 runes for unicode key, got %d", len([]rune(normalized)))
	}
}

func TestClampChannelInt(t *testing.T) {
	t.Parallel()

	if got := clampChannelInt(1, 2, 10); got != 2 {
		t.Fatalf("expected 2, got %d", got)
	}
	if got := clampChannelInt(20, 2, 10); got != 10 {
		t.Fatalf("expected 10, got %d", got)
	}
	if got := clampChannelInt(6, 2, 10); got != 6 {
		t.Fatalf("expected 6, got %d", got)
	}
}

func TestCalculateChannelTotalPages(t *testing.T) {
	t.Parallel()

	if got := calculateChannelTotalPages(0, 20); got != 1 {
		t.Fatalf("expected 1 page for empty dataset, got %d", got)
	}
	if got := calculateChannelTotalPages(41, 20); got != 3 {
		t.Fatalf("expected 3 pages for total=41 limit=20, got %d", got)
	}

	maxInt := int64(^uint(0) >> 1)
	if got := calculateChannelTotalPages(maxInt, 1); got != int(maxInt) {
		t.Fatalf("expected capped max int pages, got %d", got)
	}
}

func TestComputePromotedFetchLimit(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		feedLimit   int
		insertEvery int
		want        int
	}{
		{name: "default", feedLimit: 20, insertEvery: 4, want: 5},
		{name: "small feed", feedLimit: 3, insertEvery: 4, want: 1},
		{name: "clamp insert min", feedLimit: 20, insertEvery: 1, want: 10},
		{name: "clamp result max", feedLimit: 100, insertEvery: 2, want: 10},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := computePromotedFetchLimit(tc.feedLimit, tc.insertEvery); got != tc.want {
				t.Fatalf("expected %d, got %d", tc.want, got)
			}
		})
	}
}

func TestValidatePostUpdatePermission(t *testing.T) {
	t.Parallel()

	post := &models.ChannelPost{
		AuthorID: 11,
		Status:   models.ChannelPostStatusDraft,
	}

	tests := []struct {
		name    string
		role    models.ChannelMemberRole
		actorID uint
		post    *models.ChannelPost
		wantErr bool
	}{
		{
			name:    "owner can update any post",
			role:    models.ChannelMemberRoleOwner,
			actorID: 99,
			post:    post,
			wantErr: false,
		},
		{
			name:    "admin can update any post",
			role:    models.ChannelMemberRoleAdmin,
			actorID: 99,
			post:    post,
			wantErr: false,
		},
		{
			name:    "editor can update own draft",
			role:    models.ChannelMemberRoleEditor,
			actorID: 11,
			post: &models.ChannelPost{
				AuthorID: 11,
				Status:   models.ChannelPostStatusDraft,
			},
			wantErr: false,
		},
		{
			name:    "editor cannot update foreign post",
			role:    models.ChannelMemberRoleEditor,
			actorID: 12,
			post: &models.ChannelPost{
				AuthorID: 11,
				Status:   models.ChannelPostStatusDraft,
			},
			wantErr: true,
		},
		{
			name:    "editor cannot update published post",
			role:    models.ChannelMemberRoleEditor,
			actorID: 11,
			post: &models.ChannelPost{
				AuthorID: 11,
				Status:   models.ChannelPostStatusPublished,
			},
			wantErr: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validatePostUpdatePermission(tc.role, tc.actorID, tc.post)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestValidateSchedulePostRequest(t *testing.T) {
	t.Parallel()

	future := time.Now().Add(30 * time.Minute)

	tests := []struct {
		name       string
		status     models.ChannelPostStatus
		scheduled  time.Time
		shouldFail bool
	}{
		{
			name:       "draft with date is valid",
			status:     models.ChannelPostStatusDraft,
			scheduled:  future,
			shouldFail: false,
		},
		{
			name:       "scheduled with date is valid",
			status:     models.ChannelPostStatusScheduled,
			scheduled:  future,
			shouldFail: false,
		},
		{
			name:       "missing date is invalid",
			status:     models.ChannelPostStatusDraft,
			scheduled:  time.Time{},
			shouldFail: true,
		},
		{
			name:       "published post cannot be scheduled",
			status:     models.ChannelPostStatusPublished,
			scheduled:  future,
			shouldFail: true,
		},
		{
			name:       "past schedule is invalid",
			status:     models.ChannelPostStatusDraft,
			scheduled:  time.Now().Add(-2 * time.Minute),
			shouldFail: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateSchedulePostRequest(tc.status, tc.scheduled)
			if tc.shouldFail && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.shouldFail && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestValidatePinPostStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     models.ChannelPostStatus
		shouldFail bool
	}{
		{name: "published can be pinned", status: models.ChannelPostStatusPublished, shouldFail: false},
		{name: "draft cannot be pinned", status: models.ChannelPostStatusDraft, shouldFail: true},
		{name: "scheduled cannot be pinned", status: models.ChannelPostStatusScheduled, shouldFail: true},
		{name: "archived cannot be pinned", status: models.ChannelPostStatusArchived, shouldFail: true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validatePinPostStatus(tc.status)
			if tc.shouldFail && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.shouldFail && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestResolveDeliverPersonally(t *testing.T) {
	t.Parallel()

	trueValue := true
	falseValue := false

	if got := resolveDeliverPersonally(true, &trueValue); got {
		t.Fatalf("public channels must force deliverPersonally=false")
	}
	if got := resolveDeliverPersonally(false, nil); !got {
		t.Fatalf("private channels must default deliverPersonally=true")
	}
	if got := resolveDeliverPersonally(false, &falseValue); got {
		t.Fatalf("private channel explicit false should be respected")
	}
}

func TestBuildPersonalPushBody(t *testing.T) {
	t.Parallel()

	post := &models.ChannelPost{Content: ""}
	if got := buildPersonalPushBody(post); got == "" {
		t.Fatalf("fallback push body must not be empty")
	}

	longContent := strings.Repeat("а", 200)
	post.Content = longContent
	got := buildPersonalPushBody(post)
	if len([]rune(got)) != 143 { // 140 + "..."
		t.Fatalf("expected truncated content length 143, got %d", len([]rune(got)))
	}
}
