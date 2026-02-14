package services

import (
	"testing"

	"rag-agent-server/internal/models"

	"github.com/google/uuid"
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
