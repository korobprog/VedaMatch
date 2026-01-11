package models

import (
	"testing"
	"time"
)

func TestNewsSourceTypeConstants(t *testing.T) {
	// Verify all source types are defined correctly
	if NewsSourceTypeVK != "vk" {
		t.Errorf("Expected NewsSourceTypeVK to be 'vk', got '%s'", NewsSourceTypeVK)
	}
	if NewsSourceTypeTelegram != "telegram" {
		t.Errorf("Expected NewsSourceTypeTelegram to be 'telegram', got '%s'", NewsSourceTypeTelegram)
	}
	if NewsSourceTypeRSS != "rss" {
		t.Errorf("Expected NewsSourceTypeRSS to be 'rss', got '%s'", NewsSourceTypeRSS)
	}
	if NewsSourceTypeURL != "url" {
		t.Errorf("Expected NewsSourceTypeURL to be 'url', got '%s'", NewsSourceTypeURL)
	}
}

func TestNewsSourceModeConstants(t *testing.T) {
	if NewsSourceModeAutoPublish != "auto_publish" {
		t.Errorf("Expected NewsSourceModeAutoPublish to be 'auto_publish', got '%s'", NewsSourceModeAutoPublish)
	}
	if NewsSourceModeDraft != "draft" {
		t.Errorf("Expected NewsSourceModeDraft to be 'draft', got '%s'", NewsSourceModeDraft)
	}
}

func TestNewsItemStatusConstants(t *testing.T) {
	if NewsItemStatusDraft != "draft" {
		t.Errorf("Expected NewsItemStatusDraft to be 'draft', got '%s'", NewsItemStatusDraft)
	}
	if NewsItemStatusPublished != "published" {
		t.Errorf("Expected NewsItemStatusPublished to be 'published', got '%s'", NewsItemStatusPublished)
	}
	if NewsItemStatusArchived != "archived" {
		t.Errorf("Expected NewsItemStatusArchived to be 'archived', got '%s'", NewsItemStatusArchived)
	}
	if NewsItemStatusDeleted != "deleted" {
		t.Errorf("Expected NewsItemStatusDeleted to be 'deleted', got '%s'", NewsItemStatusDeleted)
	}
}

func TestNewsItemToResponse_Russian(t *testing.T) {
	now := time.Now()
	newsItem := &NewsItem{
		SourceID:    1,
		TitleRu:     "Заголовок на русском",
		TitleEn:     "Title in English",
		SummaryRu:   "Краткое описание на русском",
		SummaryEn:   "Summary in English",
		ContentRu:   "Контент на русском языке",
		ContentEn:   "Content in English",
		ImageURL:    "https://example.com/image.jpg",
		Tags:        "yoga,meditation",
		Category:    "spiritual",
		Status:      NewsItemStatusPublished,
		IsImportant: true,
		PublishedAt: &now,
		ViewsCount:  100,
	}
	newsItem.ID = 1

	response := newsItem.ToResponse("ru")

	if response.Title != "Заголовок на русском" {
		t.Errorf("Expected Russian title, got '%s'", response.Title)
	}
	if response.Summary != "Краткое описание на русском" {
		t.Errorf("Expected Russian summary, got '%s'", response.Summary)
	}
	if response.Content != "Контент на русском языке" {
		t.Errorf("Expected Russian content, got '%s'", response.Content)
	}
	if response.ID != 1 {
		t.Errorf("Expected ID 1, got %d", response.ID)
	}
	if response.IsImportant != true {
		t.Error("Expected IsImportant to be true")
	}
}

func TestNewsItemToResponse_English(t *testing.T) {
	newsItem := &NewsItem{
		SourceID:  1,
		TitleRu:   "Заголовок на русском",
		TitleEn:   "Title in English",
		SummaryRu: "Краткое описание на русском",
		SummaryEn: "Summary in English",
		ContentRu: "Контент на русском языке",
		ContentEn: "Content in English",
	}

	response := newsItem.ToResponse("en")

	if response.Title != "Title in English" {
		t.Errorf("Expected English title, got '%s'", response.Title)
	}
	if response.Summary != "Summary in English" {
		t.Errorf("Expected English summary, got '%s'", response.Summary)
	}
	if response.Content != "Content in English" {
		t.Errorf("Expected English content, got '%s'", response.Content)
	}
}

func TestNewsItemToResponse_FallbackToRussian(t *testing.T) {
	newsItem := &NewsItem{
		SourceID:  1,
		TitleRu:   "Заголовок на русском",
		TitleEn:   "", // Empty English title
		SummaryRu: "Краткое описание на русском",
		SummaryEn: "", // Empty English summary
		ContentRu: "Контент на русском языке",
		ContentEn: "", // Empty English content
	}

	response := newsItem.ToResponse("en")

	// Should fallback to Russian when English is empty
	if response.Title != "Заголовок на русском" {
		t.Errorf("Expected fallback to Russian title, got '%s'", response.Title)
	}
	if response.Summary != "Краткое описание на русском" {
		t.Errorf("Expected fallback to Russian summary, got '%s'", response.Summary)
	}
	if response.Content != "Контент на русском языке" {
		t.Errorf("Expected fallback to Russian content, got '%s'", response.Content)
	}
}

func TestNewsItemToResponse_WithSource(t *testing.T) {
	source := &NewsSource{
		Name: "Test Source",
	}
	newsItem := &NewsItem{
		SourceID:  1,
		Source:    source,
		TitleRu:   "Test Title",
		SummaryRu: "Test Summary",
		ContentRu: "Test Content",
	}

	response := newsItem.ToResponse("ru")

	if response.SourceName != "Test Source" {
		t.Errorf("Expected SourceName 'Test Source', got '%s'", response.SourceName)
	}
}
