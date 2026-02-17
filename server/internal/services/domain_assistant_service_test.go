package services

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"rag-agent-server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func TestRouteDomains(t *testing.T) {
	svc := &DomainAssistantService{}

	tests := []struct {
		name      string
		query     string
		explicit  []string
		expected  []string
		hasIntent bool
	}{
		{
			name:      "single domain",
			query:     "Покажи товары и цены в магазине",
			expected:  []string{"market"},
			hasIntent: true,
		},
		{
			name:      "multi domain",
			query:     "Есть новости и объявления про услуги",
			expected:  []string{"services", "news", "ads"},
			hasIntent: true,
		},
		{
			name:      "unknown intent",
			query:     "как дела сегодня",
			expected:  nil,
			hasIntent: false,
		},
		{
			name:      "explicit domains normalize",
			explicit:  []string{"products", "Booking", "news"},
			expected:  []string{"market", "services", "news"},
			hasIntent: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, hasIntent := svc.routeDomains(tc.query, tc.explicit)
			if hasIntent != tc.hasIntent {
				t.Fatalf("hasIntent mismatch: got=%v expected=%v", hasIntent, tc.hasIntent)
			}
			if len(got) != len(tc.expected) {
				t.Fatalf("domains count mismatch: got=%v expected=%v", got, tc.expected)
			}
			for i := range got {
				if got[i] != tc.expected[i] {
					t.Fatalf("domains mismatch: got=%v expected=%v", got, tc.expected)
				}
			}
		})
	}
}

func TestRouteDomains_AvoidsShortKeywordSubstringFalsePositives(t *testing.T) {
	svc := &DomainAssistantService{}
	got, hasIntent := svc.routeDomains("Как построить roadmap команды?", nil)
	if hasIntent {
		t.Fatalf("expected hasIntent=false for substring-only short keyword match, got domains=%v", got)
	}
	if len(got) != 0 {
		t.Fatalf("expected no routed domains, got %v", got)
	}
}

func TestContainsDomainKeywordDA_ShortAsciiRequiresTokenBoundary(t *testing.T) {
	if containsDomainKeywordDA("roadmap planning", "map") {
		t.Fatalf("expected no match for short keyword inside larger token")
	}
	if !containsDomainKeywordDA("show map markers", "map") {
		t.Fatalf("expected token-boundary match for short keyword")
	}
	if !containsDomainKeywordDA("latest ad now", "ad") {
		t.Fatalf("expected short ascii keyword token match")
	}
}

func TestFuseRRF(t *testing.T) {
	docA := models.AssistantDocument{ID: uuid.New(), Title: "A"}
	docB := models.AssistantDocument{ID: uuid.New(), Title: "B"}
	docC := models.AssistantDocument{ID: uuid.New(), Title: "C"}

	fts := []rankedDocument{
		{Doc: docA, FTSScore: 0.9},
		{Doc: docB, FTSScore: 0.8},
	}
	vector := []rankedDocument{
		{Doc: docA, VectorScore: 0.95},
		{Doc: docC, VectorScore: 0.85},
	}

	fused := fuseRRF(fts, vector, 60)
	if len(fused) != 3 {
		t.Fatalf("expected 3 fused docs, got %d", len(fused))
	}

	if fused[0].Doc.ID != docA.ID {
		t.Fatalf("expected docA ranked first due to overlap, got %s", fused[0].Doc.Title)
	}

	if fused[1].Doc.ID != docB.ID && fused[1].Doc.ID != docC.ID {
		t.Fatalf("expected docB or docC at rank 2, got %s", fused[1].Doc.Title)
	}
}

func TestIsRecordNotFound(t *testing.T) {
	if !isRecordNotFound(gorm.ErrRecordNotFound) {
		t.Fatalf("expected direct gorm.ErrRecordNotFound to match")
	}

	wrapped := fmt.Errorf("wrapped: %w", gorm.ErrRecordNotFound)
	if !isRecordNotFound(wrapped) {
		t.Fatalf("expected wrapped gorm.ErrRecordNotFound to match")
	}

	if isRecordNotFound(errors.New("other error")) {
		t.Fatalf("did not expect non-not-found error to match")
	}
}

func TestTrimToRuneAware(t *testing.T) {
	in := "Приветмир"
	got := trimTo(in, 6)
	want := "Привет"
	if got != want {
		t.Fatalf("unexpected trimTo result: got=%q want=%q", got, want)
	}
}

func TestMakeSnippetRuneAware(t *testing.T) {
	in := "абвгдежз"
	got := makeSnippet(in, 5)
	want := "абвгд..."
	if got != want {
		t.Fatalf("unexpected snippet: got=%q want=%q", got, want)
	}
}

func TestSyncDomainUnknownDomain(t *testing.T) {
	svc := &DomainAssistantService{}
	err := svc.syncDomain(context.Background(), "unknown_domain", time.Now())
	if err == nil {
		t.Fatalf("expected unknown domain error")
	}
	if !errors.Is(err, ErrUnknownAssistantDomain) {
		t.Fatalf("expected ErrUnknownAssistantDomain, got %v", err)
	}
}

func TestShouldFallbackToLikeSearch(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "missing search vector column",
			err:  errors.New("pq: column assistant_documents.search_vector does not exist"),
			want: true,
		},
		{
			name: "missing tsquery function",
			err:  errors.New("SQL logic error: no such function: plainto_tsquery"),
			want: true,
		},
		{
			name: "generic db error",
			err:  errors.New("connection reset by peer"),
			want: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := shouldFallbackToLikeSearch(tc.err)
			if got != tc.want {
				t.Fatalf("unexpected fallback decision for %q: got=%v want=%v", tc.name, got, tc.want)
			}
		})
	}
}

func TestEscapeLikePatternDA(t *testing.T) {
	got := escapeLikePatternDA(`100%_match\value`)
	want := `100\%\_match\\value`
	if got != want {
		t.Fatalf("unexpected escaped pattern: got=%q want=%q", got, want)
	}
}

func TestAllowedDomainSetBlankConfigFallsBackToDefault(t *testing.T) {
	t.Setenv("RAG_ALLOWED_DOMAINS", " , \t, ")

	svc := &DomainAssistantService{}
	allowed := svc.allowedDomainSet()
	if len(allowed) == 0 {
		t.Fatalf("expected non-empty fallback allowed domains")
	}
	if !allowed["market"] || !allowed["services"] {
		t.Fatalf("expected MVP defaults to be enabled on invalid config, got %v", allowed)
	}
}

func TestAllowedDomainSetAllowsCustomDomain(t *testing.T) {
	t.Setenv("RAG_ALLOWED_DOMAINS", "rag_test,market")

	svc := &DomainAssistantService{}
	allowed := svc.allowedDomainSet()
	if !allowed["rag_test"] {
		t.Fatalf("expected custom domain to be preserved, got %v", allowed)
	}
}

func TestRouteDomainsExplicitEmptyNoIntent(t *testing.T) {
	svc := &DomainAssistantService{}
	got, hasIntent := svc.routeDomains("ignored", []string{"   ", "\t"})
	if hasIntent {
		t.Fatalf("expected hasIntent=false for empty explicit values")
	}
	if len(got) != 0 {
		t.Fatalf("expected no domains, got %v", got)
	}
}

func TestBuildAssistantContextExplicitUnknownNoFallback(t *testing.T) {
	t.Setenv("RAG_ALLOWED_DOMAINS", "market,services,news")

	svc := &DomainAssistantService{rrfK: defaultHybridRRFK}
	resp, err := svc.BuildAssistantContext(context.Background(), DomainContextRequest{
		Query:   "Любой вопрос",
		Domains: []string{"unknown_domain"},
		TopK:    5,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Domains) != 0 {
		t.Fatalf("expected no selected domains for unknown explicit domain, got %v", resp.Domains)
	}
	if resp.RetrieverPath != "router" {
		t.Fatalf("retriever path=%q, want router", resp.RetrieverPath)
	}
	if !resp.NeedsDomainData {
		t.Fatalf("expected NeedsDomainData=true for explicit domain request")
	}
}

func TestSyncDomainPrivateNoop(t *testing.T) {
	svc := &DomainAssistantService{}
	if err := svc.syncDomain(context.Background(), "private", time.Now().UTC()); err != nil {
		t.Fatalf("private domain sync should be noop, got error: %v", err)
	}
}
