package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"rag-agent-server/internal/models"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var datingAllowedSocialDomains = map[string]string{
	"vk.com":            "vk",
	"www.vk.com":        "vk",
	"t.me":              "telegram",
	"instagram.com":     "instagram",
	"www.instagram.com": "instagram",
	"youtube.com":       "youtube",
	"www.youtube.com":   "youtube",
	"facebook.com":      "facebook",
	"www.facebook.com":  "facebook",
	"x.com":             "x",
	"www.x.com":         "x",
}

type DatingLifecycleService struct {
	db                 *gorm.DB
	aiService          *AiChatService
	adminNotifications *AdminNotificationService
	push               *PushNotificationService
}

type DatingPublicationState struct {
	Status             models.DatingPublicationStatus `json:"status"`
	Reason             string                         `json:"reason,omitempty"`
	RequiredApprovals  int                            `json:"requiredApprovals"`
	ApprovedCount      int                            `json:"approvedCount"`
	PendingCount       int                            `json:"pendingCount"`
	FriendsCount       int                            `json:"friendsCount"`
	NeedsAdminFallback bool                           `json:"needsAdminFallback"`
}

type DatingAIModerationResult struct {
	Outcome models.DatingModerationOutcome `json:"outcome"`
	Reason  string                         `json:"reason,omitempty"`
	Flags   []string                       `json:"flags,omitempty"`
}

func NewDatingLifecycleService(db *gorm.DB, aiService *AiChatService) *DatingLifecycleService {
	return &DatingLifecycleService{
		db:                 db,
		aiService:          aiService,
		adminNotifications: NewAdminNotificationService(db),
		push:               GetPushService(),
	}
}

func splitDatingCSV(raw string) []string {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}

func joinDatingCSV(values []string) string {
	uniq := map[string]struct{}{}
	cleaned := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := uniq[trimmed]; ok {
			continue
		}
		uniq[trimmed] = struct{}{}
		cleaned = append(cleaned, trimmed)
	}
	return strings.Join(cleaned, ",")
}

func (s *DatingLifecycleService) requiredApprovals() int {
	return 3
}

func (s *DatingLifecycleService) moderationMaxAttempts() int {
	return 3
}

func (s *DatingLifecycleService) loadFriendIDs(userID uint) ([]uint, error) {
	var friends []models.Friend
	if err := s.db.Where("user_id = ?", userID).Find(&friends).Error; err != nil {
		return nil, err
	}
	result := make([]uint, 0, len(friends))
	for _, friend := range friends {
		result = append(result, friend.FriendID)
	}
	return result, nil
}

func (s *DatingLifecycleService) ValidateProfile(user *models.User) []string {
	reasons := make([]string, 0)
	if user == nil {
		return []string{"Profile not found"}
	}
	requiredText := map[string]string{
		"bio":            user.Bio,
		"interests":      user.Interests,
		"lookingFor":     user.LookingFor,
		"maritalStatus":  user.MaritalStatus,
		"dob":            user.Dob,
		"birthTime":      user.BirthTime,
		"birthPlaceLink": user.BirthPlaceLink,
		"city":           user.City,
	}
	for key, value := range requiredText {
		if strings.TrimSpace(value) == "" {
			reasons = append(reasons, fmt.Sprintf("%s is required", key))
		}
	}
	if strings.TrimSpace(user.ChildrenIntent) == "" {
		reasons = append(reasons, "childrenIntent is required")
	}
	if strings.TrimSpace(user.ElementalPrimary) == "" {
		reasons = append(reasons, "elementalPrimary is required")
	}
	if len(splitDatingCSV(user.LoveLanguages)) == 0 {
		reasons = append(reasons, "At least one love language is required")
	}
	if !s.userHasPhoto(user) {
		reasons = append(reasons, "At least one photo is required")
	}
	return reasons
}

// userHasPhoto reports whether the user has at least one uploaded photo.
// It prefers preloaded Photos but falls back to a DB count when the relation
// was not eager-loaded by the caller (e.g. the submit handler).
func (s *DatingLifecycleService) userHasPhoto(user *models.User) bool {
	if len(user.Photos) > 0 {
		return true
	}
	if s.db == nil || user.ID == 0 {
		return false
	}
	var photoCount int64
	if err := s.db.Model(&models.Media{}).Where("user_id = ?", user.ID).Count(&photoCount).Error; err != nil {
		return false
	}
	return photoCount > 0
}

func (s *DatingLifecycleService) ListApprovals(userID uint) ([]models.DatingProfileApproval, error) {
	var approvals []models.DatingProfileApproval
	if err := s.db.Preload("Approver").Where("user_id = ?", userID).Order("created_at DESC").Find(&approvals).Error; err != nil {
		return nil, err
	}
	return approvals, nil
}

func (s *DatingLifecycleService) GetPublicationState(user *models.User) (*DatingPublicationState, error) {
	approvals, err := s.ListApprovals(user.ID)
	if err != nil {
		return nil, err
	}
	friends, err := s.loadFriendIDs(user.ID)
	if err != nil {
		return nil, err
	}
	approvedCount := 0
	pendingCount := 0
	for _, approval := range approvals {
		switch approval.Status {
		case models.DatingApprovalApproved:
			approvedCount++
		case models.DatingApprovalPending:
			pendingCount++
		}
	}
	return &DatingPublicationState{
		Status:             models.DatingPublicationStatus(strings.TrimSpace(user.DatingPublicationStatus)),
		Reason:             strings.TrimSpace(user.DatingStatusReason),
		RequiredApprovals:  s.requiredApprovals(),
		ApprovedCount:      approvedCount,
		PendingCount:       pendingCount,
		FriendsCount:       len(friends),
		NeedsAdminFallback: len(friends) < s.requiredApprovals(),
	}, nil
}

func normalizeSocialPlatform(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", err
	}
	host := strings.ToLower(strings.TrimSpace(parsed.Host))
	if host == "" {
		return "", fmt.Errorf("missing host")
	}
	if platform, ok := datingAllowedSocialDomains[host]; ok {
		return platform, nil
	}
	return "", fmt.Errorf("unsupported social domain")
}

func (s *DatingLifecycleService) ValidateSocialLinks(links []models.DatingSocialLink) []string {
	reasons := make([]string, 0)
	for _, link := range links {
		if strings.TrimSpace(link.URL) == "" {
			continue
		}
		platform, err := normalizeSocialPlatform(link.URL)
		if err != nil {
			reasons = append(reasons, fmt.Sprintf("Social link %q is not allowed", link.URL))
			continue
		}
		if strings.TrimSpace(link.Platform) == "" {
			continue
		}
		if platform != strings.TrimSpace(link.Platform) {
			reasons = append(reasons, fmt.Sprintf("Social link %q does not match platform %s", link.URL, link.Platform))
		}
	}
	return reasons
}

func (s *DatingLifecycleService) RequestApprovals(userID uint, approverIDs []uint) ([]models.DatingProfileApproval, error) {
	friendIDs, err := s.loadFriendIDs(userID)
	if err != nil {
		return nil, err
	}
	if len(approverIDs) == 0 {
		approverIDs = friendIDs
	}
	if len(approverIDs) == 0 {
		return nil, nil
	}

	friendSet := map[uint]struct{}{}
	for _, friendID := range friendIDs {
		friendSet[friendID] = struct{}{}
	}

	uniq := map[uint]struct{}{}
	for _, approverID := range approverIDs {
		if approverID == 0 || approverID == userID {
			continue
		}
		if _, ok := friendSet[approverID]; !ok {
			continue
		}
		uniq[approverID] = struct{}{}
	}

	for approverID := range uniq {
		var approval models.DatingProfileApproval
		err := s.db.Where("user_id = ? AND approver_id = ?", userID, approverID).First(&approval).Error
		if err == nil {
			if approval.Status == models.DatingApprovalRejected {
				approval.Status = models.DatingApprovalPending
				approval.Note = ""
				approval.RespondedAt = nil
				if saveErr := s.db.Save(&approval).Error; saveErr != nil {
					return nil, saveErr
				}
				if s.push != nil {
					_ = s.push.SendToUser(approverID, PushMessage{
						Title: "Dating approval request",
						Body:  "A friend asked you to review a Union profile.",
						Data: map[string]string{
							"screen":     "UnionApprovals",
							"userId":     fmt.Sprintf("%d", userID),
							"approvalId": fmt.Sprintf("%d", approval.ID),
						},
						Priority: "high",
					})
				}
			}
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			return nil, err
		}
		approval = models.DatingProfileApproval{
			UserID:     userID,
			ApproverID: approverID,
			Status:     models.DatingApprovalPending,
		}
		if createErr := s.db.Create(&approval).Error; createErr != nil {
			return nil, createErr
		}

		if s.push != nil {
			_ = s.push.SendToUser(approverID, PushMessage{
				Title: "Dating approval request",
				Body:  "A friend asked you to review a Union profile.",
				Data: map[string]string{
					"screen":     "UnionApprovals",
					"userId":     fmt.Sprintf("%d", userID),
					"approvalId": fmt.Sprintf("%d", approval.ID),
				},
				Priority: "high",
			})
		}
	}

	return s.ListApprovals(userID)
}

func (s *DatingLifecycleService) SubmitProfile(ctx context.Context, user *models.User) (*DatingPublicationState, error) {
	reasons := s.ValidateProfile(user)
	links := make([]models.DatingSocialLink, 0)
	if err := s.db.Where("user_id = ?", user.ID).Find(&links).Error; err == nil {
		reasons = append(reasons, s.ValidateSocialLinks(links)...)
	}
	if len(reasons) > 0 {
		reasonText := strings.Join(reasons, "; ")
		now := time.Now().UTC()
		if err := s.db.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]any{
			"dating_publication_status": string(models.DatingPublicationDraft),
			"dating_status_reason":      reasonText,
			"dating_submitted_at":       now,
			"is_profile_complete":       false,
		}).Error; err != nil {
			return nil, err
		}
		user.DatingPublicationStatus = string(models.DatingPublicationDraft)
		user.DatingStatusReason = reasonText
		return s.GetPublicationState(user)
	}

	friendIDs, err := s.loadFriendIDs(user.ID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	status := models.DatingPublicationPendingFriendApproval
	reason := "Waiting for 3 friend approvals"
	if len(friendIDs) < s.requiredApprovals() {
		status = models.DatingPublicationPendingAdminReview
		reason = "Not enough friends for 3 approvals. Sent to admin review."
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]any{
		"dating_enabled":            true,
		"is_profile_complete":       true,
		"dating_publication_status": string(status),
		"dating_status_reason":      reason,
		"dating_submitted_at":       now,
	}).Error; err != nil {
		return nil, err
	}
	user.DatingPublicationStatus = string(status)
	user.DatingStatusReason = reason
	user.DatingSubmittedAt = &now

	if status == models.DatingPublicationPendingAdminReview {
		_ = s.adminNotifications.CreateNotification(models.AdminNotificationCreateRequest{
			Type:    models.NotificationHighPriorityIssue,
			Message: fmt.Sprintf("Union profile %d requires admin fallback review", user.ID),
			LinkTo:  "/dating",
			UserID:  &user.ID,
		})
	} else {
		if _, err := s.RequestApprovals(user.ID, friendIDs); err != nil {
			return nil, err
		}
	}

	if s.push != nil {
		_ = s.push.SendToUser(user.ID, PushMessage{
			Title: "Union profile submitted",
			Body:  reason,
			Data: map[string]string{
				"screen": "EditDatingProfile",
				"status": string(status),
			},
			Priority: "high",
		})
	}

	return s.GetPublicationState(user)
}

func extractJSONText(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return raw
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		return raw[start : end+1]
	}
	return raw
}

func (s *DatingLifecycleService) RunAIModeration(ctx context.Context, user *models.User) (*DatingAIModerationResult, error) {
	links := make([]models.DatingSocialLink, 0)
	posts := make([]models.DatingPost, 0)
	if s.db != nil {
		_ = s.db.Where("user_id = ?", user.ID).Find(&links).Error
		_ = s.db.Where("user_id = ?", user.ID).Order("created_at DESC").Limit(5).Find(&posts).Error
	}

	flags := s.ValidateSocialLinks(links)
	heuristicsBlacklist := []string{"porn", "escort", "crypto", "nude", "18+", "drugs", "weapon", "casino", "spam"}
	checkText := strings.ToLower(strings.Join([]string{user.Bio, user.Interests, user.LookingFor, user.LookingForBusiness}, " "))
	for _, post := range posts {
		checkText += " " + strings.ToLower(post.Body)
	}
	for _, token := range heuristicsBlacklist {
		if strings.Contains(checkText, token) {
			flags = append(flags, fmt.Sprintf("Sensitive token detected: %s", token))
		}
	}
	if len(flags) > 0 {
		outcome := models.DatingModerationNeedsAdminReview
		if len(flags) > 2 {
			outcome = models.DatingModerationReject
		}
		return &DatingAIModerationResult{
			Outcome: outcome,
			Reason:  strings.Join(flags, "; "),
			Flags:   flags,
		}, nil
	}

	if s.aiService == nil {
		return &DatingAIModerationResult{
			Outcome: models.DatingModerationNeedsAdminReview,
			Reason:  "AI service unavailable",
			Flags:   []string{"AI service unavailable"},
		}, nil
	}

	payload := map[string]any{
		"bio":                user.Bio,
		"interests":          user.Interests,
		"lookingFor":         user.LookingFor,
		"lookingForBusiness": user.LookingForBusiness,
		"childrenIntent":     user.ChildrenIntent,
		"meetingPreferences": splitDatingCSV(user.MeetingPreferences),
		"socialLinksCount":   len(links),
		"postsCount":         len(posts),
	}
	payloadJSON, _ := json.Marshal(payload)
	prompt := fmt.Sprintf(`You are moderating a dating profile for a spiritual community app.
Return JSON only with fields "outcome", "reason", "flags".
Allowed outcomes: "pass", "needs_admin_review", "reject".
Be strict for scam, explicit sexual solicitation, dangerous links, hate or spam.
Profile: %s`, string(payloadJSON))

	resp, err := s.aiService.GenerateSimpleResponse(prompt)
	if err != nil {
		return &DatingAIModerationResult{
			Outcome: models.DatingModerationNeedsAdminReview,
			Reason:  "AI moderation unavailable",
			Flags:   []string{"AI moderation unavailable"},
		}, nil
	}

	var parsed DatingAIModerationResult
	if unmarshalErr := json.Unmarshal([]byte(extractJSONText(resp)), &parsed); unmarshalErr != nil || parsed.Outcome == "" {
		return &DatingAIModerationResult{
			Outcome: models.DatingModerationNeedsAdminReview,
			Reason:  "AI response could not be parsed",
			Flags:   []string{"AI response could not be parsed"},
		}, nil
	}
	return &parsed, nil
}

func (s *DatingLifecycleService) persistModeration(userID uint, postID *uint, event *DatingAIModerationResult) error {
	if event == nil {
		return nil
	}
	return s.db.Create(&models.DatingModerationEvent{
		UserID:    userID,
		PostID:    postID,
		ActorType: models.DatingModerationActorAI,
		Outcome:   event.Outcome,
		Severity:  "normal",
		Reason:    strings.TrimSpace(event.Reason),
	}).Error
}

func (s *DatingLifecycleService) notifyProfileModerationUpdate(userID uint, outcome models.DatingModerationOutcome, reason string) {
	if s.push == nil {
		return
	}
	body := "Your Union profile has been published."
	if outcome != models.DatingModerationPass {
		body = strings.TrimSpace(reason)
		if body == "" {
			body = "Your Union profile needs moderator review."
		}
	}
	_ = s.push.SendToUser(userID, PushMessage{
		Title: "Union moderation update",
		Body:  body,
		Data: map[string]string{
			"screen": "EditDatingProfile",
			"status": string(outcome),
		},
		Priority: "high",
	})
}

func (s *DatingLifecycleService) markProfilePendingAdminReview(userID uint, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "Your Union profile needs moderator review."
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]any{
		"dating_publication_status":   string(models.DatingPublicationPendingAdminReview),
		"dating_status_reason":        reason,
		"dating_last_moderation_note": reason,
	}).Error; err != nil {
		return err
	}
	_ = s.adminNotifications.CreateNotification(models.AdminNotificationCreateRequest{
		Type:    models.NotificationHighPriorityIssue,
		Message: fmt.Sprintf("Union profile %d requires moderation: %s", userID, reason),
		LinkTo:  "/dating",
		UserID:  &userID,
	})
	s.notifyProfileModerationUpdate(userID, models.DatingModerationNeedsAdminReview, reason)
	return nil
}

func (s *DatingLifecycleService) applyProfileModerationResult(userID uint, result *DatingAIModerationResult) error {
	if result == nil {
		return nil
	}
	if err := s.persistModeration(userID, nil, result); err != nil {
		return err
	}

	now := time.Now().UTC()
	updateMap := map[string]any{
		"dating_last_moderation_note": strings.TrimSpace(result.Reason),
		"dating_status_reason":        strings.TrimSpace(result.Reason),
	}
	switch result.Outcome {
	case models.DatingModerationPass:
		updateMap["dating_publication_status"] = string(models.DatingPublicationPublished)
		updateMap["dating_published_at"] = now
		updateMap["dating_status_reason"] = "Published after AI review"
	case models.DatingModerationReject:
		updateMap["dating_publication_status"] = string(models.DatingPublicationRejected)
	case models.DatingModerationNeedsAdminReview:
		updateMap["dating_publication_status"] = string(models.DatingPublicationPendingAdminReview)
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(updateMap).Error; err != nil {
		return err
	}

	if result.Outcome != models.DatingModerationPass {
		_ = s.adminNotifications.CreateNotification(models.AdminNotificationCreateRequest{
			Type:    models.NotificationHighPriorityIssue,
			Message: fmt.Sprintf("Union profile %d requires moderation: %s", userID, result.Reason),
			LinkTo:  "/dating",
			UserID:  &userID,
		})
	}
	s.notifyProfileModerationUpdate(userID, result.Outcome, result.Reason)
	return nil
}

func (s *DatingLifecycleService) applyPostModerationResult(userID uint, postID uint, result *DatingAIModerationResult) error {
	if result == nil {
		return nil
	}

	now := time.Now().UTC()
	reason := strings.TrimSpace(result.Reason)
	postUpdates := map[string]any{
		"moderated_at":      &now,
		"moderation_reason": reason,
	}
	switch result.Outcome {
	case models.DatingModerationPass:
		postUpdates["status"] = string(models.DatingPostActive)
		postUpdates["moderation_reason"] = ""
	case models.DatingModerationReject:
		postUpdates["status"] = string(models.DatingPostRejected)
	default:
		postUpdates["status"] = string(models.DatingPostPendingReview)
	}
	if err := s.db.Model(&models.DatingPost{}).Where("id = ? AND user_id = ?", postID, userID).Updates(postUpdates).Error; err != nil {
		return err
	}
	postRef := postID
	if err := s.persistModeration(userID, &postRef, result); err != nil {
		return err
	}
	if result.Outcome == models.DatingModerationPass {
		return nil
	}
	return s.markProfilePendingAdminReview(userID, "Dating post requires moderation: "+reason)
}

func (s *DatingLifecycleService) enqueueModerationJob(userID uint, postID *uint, trigger models.DatingModerationJobTrigger) error {
	if s.db == nil {
		return nil
	}

	activeStatuses := []models.DatingModerationJobStatus{
		models.DatingModerationJobPending,
		models.DatingModerationJobRetrying,
		models.DatingModerationJobProcessing,
	}
	query := s.db.Where("user_id = ? AND trigger = ? AND status IN ?", userID, trigger, activeStatuses)
	if postID == nil {
		query = query.Where("post_id IS NULL")
	} else {
		query = query.Where("post_id = ?", *postID)
	}

	var existing models.DatingModerationJob
	err := query.First(&existing).Error
	if err == nil {
		return nil
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	now := time.Now().UTC()
	job := models.DatingModerationJob{
		UserID:      userID,
		PostID:      postID,
		Trigger:     trigger,
		Status:      models.DatingModerationJobPending,
		MaxAttempts: s.moderationMaxAttempts(),
		NextRunAt:   &now,
	}
	return s.db.Create(&job).Error
}

func (s *DatingLifecycleService) EnqueuePostModeration(userID uint, postID uint, trigger models.DatingModerationJobTrigger) error {
	postRef := postID
	return s.enqueueModerationJob(userID, &postRef, trigger)
}

func (s *DatingLifecycleService) handleCompletedApprovals(ctx context.Context, userID uint) error {
	return s.enqueueModerationJob(userID, nil, models.DatingModerationTriggerApprovalsCompleted)
}

func (s *DatingLifecycleService) claimNextModerationJob() (*models.DatingModerationJob, error) {
	if s.db == nil {
		return nil, gorm.ErrRecordNotFound
	}

	now := time.Now().UTC()
	var claimed models.DatingModerationJob
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("status IN ?", []models.DatingModerationJobStatus{models.DatingModerationJobPending, models.DatingModerationJobRetrying}).
			Where("next_run_at IS NULL OR next_run_at <= ?", now).
			Order("next_run_at ASC NULLS FIRST").
			Order("created_at ASC").
			First(&claimed).Error; err != nil {
			return err
		}
		claimed.Status = models.DatingModerationJobProcessing
		claimed.Attempt++
		claimed.LastError = ""
		claimed.NextRunAt = nil
		return tx.Save(&claimed).Error
	})
	if err != nil {
		return nil, err
	}
	return &claimed, nil
}

func (s *DatingLifecycleService) completeModerationJob(jobID uint) error {
	return s.db.Model(&models.DatingModerationJob{}).Where("id = ?", jobID).Updates(map[string]any{
		"status":      string(models.DatingModerationJobCompleted),
		"last_error":  "",
		"next_run_at": nil,
	}).Error
}

func (s *DatingLifecycleService) scheduleModerationRetry(job *models.DatingModerationJob, err error) error {
	if job == nil {
		return nil
	}

	updates := map[string]any{
		"last_error": strings.TrimSpace(err.Error()),
	}
	if job.Attempt >= job.MaxAttempts {
		updates["status"] = string(models.DatingModerationJobFailed)
		updates["next_run_at"] = nil
		return s.db.Model(&models.DatingModerationJob{}).Where("id = ?", job.ID).Updates(updates).Error
	}

	delay := time.Duration(job.Attempt*30) * time.Second
	if delay > 5*time.Minute {
		delay = 5 * time.Minute
	}
	nextRunAt := time.Now().UTC().Add(delay)
	updates["status"] = string(models.DatingModerationJobRetrying)
	updates["next_run_at"] = &nextRunAt
	return s.db.Model(&models.DatingModerationJob{}).Where("id = ?", job.ID).Updates(updates).Error
}

func (s *DatingLifecycleService) processModerationJob(ctx context.Context, job *models.DatingModerationJob) error {
	if job == nil {
		return nil
	}

	switch job.Trigger {
	case models.DatingModerationTriggerApprovalsCompleted:
		var user models.User
		if err := s.db.First(&user, job.UserID).Error; err != nil {
			return err
		}
		result, err := s.RunAIModeration(ctx, &user)
		if err != nil {
			return err
		}
		return s.applyProfileModerationResult(job.UserID, result)
	case models.DatingModerationTriggerPostCreated, models.DatingModerationTriggerPostUpdated:
		if job.PostID == nil || *job.PostID == 0 {
			return fmt.Errorf("moderation post id is required")
		}
		var user models.User
		if err := s.db.First(&user, job.UserID).Error; err != nil {
			return err
		}
		result, err := s.RunAIModeration(ctx, &user)
		if err != nil {
			return err
		}
		return s.applyPostModerationResult(job.UserID, *job.PostID, result)
	default:
		return fmt.Errorf("unsupported moderation trigger: %s", job.Trigger)
	}
}

func (s *DatingLifecycleService) ProcessDueModerationJobs(ctx context.Context, limit int) (int, error) {
	if limit < 1 {
		limit = 1
	}

	processed := 0
	for processed < limit {
		job, err := s.claimNextModerationJob()
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return processed, nil
			}
			return processed, err
		}
		if err := s.processModerationJob(ctx, job); err != nil {
			if retryErr := s.scheduleModerationRetry(job, err); retryErr != nil {
				return processed, retryErr
			}
			processed++
			continue
		}
		if err := s.completeModerationJob(job.ID); err != nil {
			return processed, err
		}
		processed++
	}
	return processed, nil
}

func (s *DatingLifecycleService) RespondApproval(ctx context.Context, approvalID, approverID uint, status models.DatingApprovalStatus, note string) (*models.DatingProfileApproval, error) {
	var approval models.DatingProfileApproval
	if err := s.db.Where("id = ? AND approver_id = ?", approvalID, approverID).First(&approval).Error; err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	approval.Status = status
	approval.Note = strings.TrimSpace(note)
	approval.RespondedAt = &now
	if err := s.db.Save(&approval).Error; err != nil {
		return nil, err
	}

	if status == models.DatingApprovalApproved {
		var count int64
		if err := s.db.Model(&models.DatingProfileApproval{}).
			Where("user_id = ? AND status = ?", approval.UserID, models.DatingApprovalApproved).
			Count(&count).Error; err != nil {
			return nil, err
		}
		if int(count) >= s.requiredApprovals() {
			updateResult := s.db.Model(&models.User{}).
				Where("id = ? AND dating_publication_status = ?", approval.UserID, string(models.DatingPublicationPendingFriendApproval)).
				Updates(map[string]any{
					"dating_publication_status": string(models.DatingPublicationPendingAIReview),
					"dating_status_reason":      "Friend approvals completed. Running AI review.",
				})
			if updateResult.Error != nil {
				return nil, updateResult.Error
			}
			if updateResult.RowsAffected > 0 {
				if err := s.handleCompletedApprovals(ctx, approval.UserID); err != nil {
					return nil, err
				}
			}
		} else if s.push != nil {
			_ = s.push.SendToUser(approval.UserID, PushMessage{
				Title: "Union approval update",
				Body:  "A friend approved your Union profile.",
				Data: map[string]string{
					"screen": "EditDatingProfile",
				},
				Priority: "high",
			})
		}
	}
	return &approval, nil
}

func (s *DatingLifecycleService) ModerateProfile(userID uint, adminID uint, action models.DatingModerationOutcome, note string) error {
	now := time.Now().UTC()
	updateMap := map[string]any{
		"dating_last_moderation_note": strings.TrimSpace(note),
		"dating_status_reason":        strings.TrimSpace(note),
	}
	switch action {
	case models.DatingModerationPublish:
		updateMap["dating_publication_status"] = string(models.DatingPublicationPublished)
		updateMap["dating_published_at"] = now
	case models.DatingModerationReject:
		updateMap["dating_publication_status"] = string(models.DatingPublicationRejected)
	case models.DatingModerationFlag:
		updateMap["dating_publication_status"] = string(models.DatingPublicationFlaggedAfterPublish)
	case models.DatingModerationNeedsAdminReview:
		updateMap["dating_publication_status"] = string(models.DatingPublicationPendingAdminReview)
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(updateMap).Error; err != nil {
		return err
	}
	if err := s.db.Create(&models.DatingModerationEvent{
		UserID:      userID,
		ActorType:   models.DatingModerationActorAdmin,
		Outcome:     action,
		Severity:    "high",
		Reason:      strings.TrimSpace(note),
		DetailsJSON: fmt.Sprintf(`{"adminId":%d}`, adminID),
	}).Error; err != nil {
		return err
	}
	if s.push != nil {
		_ = s.push.SendToUser(userID, PushMessage{
			Title: "Union moderation decision",
			Body:  strings.TrimSpace(note),
			Data: map[string]string{
				"screen": "EditDatingProfile",
				"status": string(action),
			},
			Priority: "high",
		})
	}
	return nil
}

func (s *DatingLifecycleService) ListModerationQueue(statuses []models.DatingPublicationStatus) ([]models.User, error) {
	query := s.db.Preload("DatingSocialLinks").Preload("DatingPosts").Where("dating_enabled = ?", true)
	if len(statuses) > 0 {
		raw := make([]string, 0, len(statuses))
		for _, status := range statuses {
			raw = append(raw, string(status))
		}
		query = query.Where("dating_publication_status IN ?", raw)
	}
	var users []models.User
	if err := query.Order("updated_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *DatingLifecycleService) SaveSocialLinks(userID uint, links []models.DatingSocialLink) error {
	if err := s.db.Where("user_id = ?", userID).Delete(&models.DatingSocialLink{}).Error; err != nil {
		return err
	}
	if len(links) == 0 {
		return nil
	}
	for i := range links {
		links[i].ID = 0
		links[i].UserID = userID
		if strings.TrimSpace(links[i].Platform) == "" {
			if platform, err := normalizeSocialPlatform(links[i].URL); err == nil {
				links[i].Platform = platform
			}
		}
	}
	return s.db.Create(&links).Error
}

func (s *DatingLifecycleService) LoadProfileRelations(user *models.User) error {
	if user == nil {
		return nil
	}
	return s.db.Preload("Photos").Preload("DatingSocialLinks").Preload("DatingPosts", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).First(user, user.ID).Error
}

func SortUsersByDatingScore(currentUser *models.User, users []models.User) {
	if currentUser == nil {
		return
	}
	sort.SliceStable(users, func(i, j int) bool {
		a := datingScore(currentUser, &users[i])
		b := datingScore(currentUser, &users[j])
		return a > b
	})
}

func datingScore(currentUser *models.User, candidate *models.User) int {
	if currentUser == nil || candidate == nil {
		return 0
	}
	score := 0
	if currentUser.City != "" && strings.EqualFold(strings.TrimSpace(currentUser.City), strings.TrimSpace(candidate.City)) {
		score += 50
	}
	if currentUser.Latitude != nil && currentUser.Longitude != nil && candidate.Latitude != nil && candidate.Longitude != nil {
		latDelta := *currentUser.Latitude - *candidate.Latitude
		lngDelta := *currentUser.Longitude - *candidate.Longitude
		distancePenalty := int((latDelta*latDelta + lngDelta*lngDelta) * 100)
		score += max(0, 40-distancePenalty)
	}
	if currentUser.ChildrenIntent != "" && currentUser.ChildrenIntent == candidate.ChildrenIntent {
		score += 15
	}
	if hasCSVOverlap(currentUser.Intentions, candidate.Intentions) {
		score += 15
	}
	if hasCSVOverlap(currentUser.MeetingPreferences, candidate.MeetingPreferences) {
		score += 12
	}
	if hasCSVOverlap(currentUser.LoveLanguages, candidate.LoveLanguages) {
		score += 8
	}
	if currentUser.ElementalPrimary != "" && currentUser.ElementalPrimary == candidate.ElementalPrimary {
		score += 5
	}
	if hasCSVOverlap(currentUser.Interests, candidate.Interests) {
		score += 4
	}
	return score
}

func hasCSVOverlap(left string, right string) bool {
	lv := splitDatingCSV(strings.ReplaceAll(left, ";", ","))
	rv := splitDatingCSV(strings.ReplaceAll(right, ";", ","))
	if len(lv) == 0 || len(rv) == 0 {
		return false
	}
	set := map[string]struct{}{}
	for _, item := range lv {
		set[strings.ToLower(item)] = struct{}{}
	}
	for _, item := range rv {
		if _, ok := set[strings.ToLower(item)]; ok {
			return true
		}
	}
	return false
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
