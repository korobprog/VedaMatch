package services

import (
	"testing"
	"unicode/utf8"
)

func TestTruncateTextRuneAware(t *testing.T) {
	t.Parallel()

	input := "Приветмир"
	got := truncateText(input, 6)
	if got != "Привет..." {
		t.Fatalf("unexpected truncate result: %q", got)
	}
	if !utf8.ValidString(got) {
		t.Fatalf("truncated text must be valid UTF-8")
	}

	if got := truncateText("abc", 10); got != "abc" {
		t.Fatalf("short text should stay unchanged, got %q", got)
	}
}

func TestParseNewsClassificationResponse(t *testing.T) {
	t.Parallel()

	response := "Category: Spiritual\nTags: [bhakti, meditation, kirtan]"
	category, tags := parseNewsClassificationResponse(response)
	if category != "spiritual" {
		t.Fatalf("category=%q, want spiritual", category)
	}
	if len(tags) != 3 || tags[0] != "bhakti" || tags[1] != "meditation" || tags[2] != "kirtan" {
		t.Fatalf("unexpected tags: %#v", tags)
	}
}

func TestIsNewsQueryAndExtractQuery(t *testing.T) {
	t.Parallel()

	if !IsNewsQuery("  Какие новости сегодня?  ") {
		t.Fatalf("expected news query detection")
	}
	if IsNewsQuery("как дела") {
		t.Fatalf("expected non-news query")
	}

	if got := ExtractNewsSearchQuery("  Новости про йогу  "); got != "йогу" {
		t.Fatalf("query=%q, want йогу", got)
	}
	if got := ExtractNewsSearchQuery("unknown prefix text"); got != "" {
		t.Fatalf("query=%q, want empty", got)
	}
}
