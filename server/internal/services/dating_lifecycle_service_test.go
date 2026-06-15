package services

import (
	"context"
	"strings"
	"testing"

	"rag-agent-server/internal/models"
)

func TestDatingLifecycleValidateSocialLinksRejectsUnknownDomains(t *testing.T) {
	svc := &DatingLifecycleService{}
	reasons := svc.ValidateSocialLinks([]models.DatingSocialLink{
		{Platform: "vk", URL: "https://example.com/user"},
	})
	if len(reasons) == 0 {
		t.Fatalf("expected invalid social link to be rejected")
	}
}

func TestDatingScorePrioritizesSameCityAndSharedSignals(t *testing.T) {
	current := &models.User{
		City:               "Moscow",
		ChildrenIntent:     "want",
		Intentions:         "family,seva",
		MeetingPreferences: "personal,event",
		LoveLanguages:      "quality_time,acts_of_service",
		ElementalPrimary:   "air",
		Interests:          "kirtan,travel",
	}
	nearby := &models.User{
		City:               "Moscow",
		ChildrenIntent:     "want",
		Intentions:         "family",
		MeetingPreferences: "personal",
		LoveLanguages:      "quality_time",
		ElementalPrimary:   "air",
		Interests:          "travel",
	}
	remote := &models.User{
		City:               "Delhi",
		ChildrenIntent:     "undecided",
		Intentions:         "business",
		MeetingPreferences: "public_place",
		LoveLanguages:      "receiving_gifts",
		ElementalPrimary:   "fire",
		Interests:          "finance",
	}
	if datingScore(current, nearby) <= datingScore(current, remote) {
		t.Fatalf("expected nearby candidate to score higher")
	}
}

func TestDatingLifecycleValidateProfileRequiresStructuredUnionFields(t *testing.T) {
	svc := &DatingLifecycleService{}
	reasons := svc.ValidateProfile(&models.User{
		Bio:            "About me",
		Interests:      "Kirtan",
		LookingFor:     "Family",
		MaritalStatus:  "Single",
		Dob:            "1995-05-12",
		BirthTime:      "09:30",
		BirthPlaceLink: "Moscow",
		City:           "Moscow",
	})
	expected := []string{
		"childrenIntent is required",
		"elementalPrimary is required",
		"At least one love language is required",
	}
	for _, want := range expected {
		if !containsReason(reasons, want) {
			t.Fatalf("expected reason %q in %v", want, reasons)
		}
	}
}

func TestDatingLifecycleRunAIModerationRejectsHighRiskHeuristicsWithoutDB(t *testing.T) {
	svc := &DatingLifecycleService{}
	result, err := svc.RunAIModeration(context.Background(), &models.User{
		Bio:            "escort casino spam",
		Interests:      "crypto deals",
		LookingFor:     "18+ fun",
		ChildrenIntent: "want",
	})
	if err != nil {
		t.Fatalf("RunAIModeration error: %v", err)
	}
	if result == nil {
		t.Fatalf("expected moderation result")
	}
	if result.Outcome != models.DatingModerationReject {
		t.Fatalf("outcome=%s want=%s", result.Outcome, models.DatingModerationReject)
	}
	if len(result.Flags) < 3 {
		t.Fatalf("expected multiple heuristic flags, got %v", result.Flags)
	}
}

func TestDatingLifecycleRunAIModerationNeedsReviewWhenNoAI(t *testing.T) {
	// With no heuristic flags but no AI service available, a profile must not
	// auto-publish: it should fall back to manual admin review.
	svc := &DatingLifecycleService{}
	result, err := svc.RunAIModeration(context.Background(), &models.User{
		Bio:                "I like kirtan and service",
		Interests:          "Pilgrimage, books, yoga",
		LookingFor:         "Meaningful relationship",
		LookingForBusiness: "Volunteer initiatives",
		ChildrenIntent:     "want",
		MeetingPreferences: "personal,event",
	})
	if err != nil {
		t.Fatalf("RunAIModeration error: %v", err)
	}
	if result == nil {
		t.Fatalf("expected moderation result")
	}
	if result.Outcome != models.DatingModerationNeedsAdminReview {
		t.Fatalf("outcome=%s want=%s", result.Outcome, models.DatingModerationNeedsAdminReview)
	}
}

func TestDatingLifecycleValidateProfileRequiresPhoto(t *testing.T) {
	svc := &DatingLifecycleService{}
	complete := models.User{
		Bio:              "About me",
		Interests:        "Kirtan",
		LookingFor:       "Family",
		MaritalStatus:    "Single",
		Dob:              "1995-05-12",
		BirthTime:        "09:30",
		BirthPlaceLink:   "Moscow",
		City:             "Moscow",
		ChildrenIntent:   "want",
		ElementalPrimary: "air",
		LoveLanguages:    "quality_time",
	}

	// No photos and no DB -> photo requirement must be reported.
	reasons := svc.ValidateProfile(&complete)
	if !containsReason(reasons, "At least one photo is required") {
		t.Fatalf("expected photo requirement in %v", reasons)
	}

	// With a preloaded photo the profile is fully valid.
	withPhoto := complete
	withPhoto.Photos = []models.Media{{UserID: 1}}
	if reasons := svc.ValidateProfile(&withPhoto); len(reasons) != 0 {
		t.Fatalf("expected no validation reasons, got %v", reasons)
	}
}

func containsReason(reasons []string, want string) bool {
	for _, reason := range reasons {
		if strings.TrimSpace(reason) == want {
			return true
		}
	}
	return false
}
