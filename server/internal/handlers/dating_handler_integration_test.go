package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupDatingHandlerIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(postgres.Open(integrationPostgresDSN()), &gorm.Config{})
	if err != nil {
		t.Skipf("skipping dating handler integration test: postgres not available: %v", err)
	}

	require.NoError(t, db.AutoMigrate(
		&models.User{},
		&models.Friend{},
		&models.DatingPost{},
		&models.DatingProfileApproval{},
		&models.DatingModerationEvent{},
		&models.DatingModerationJob{},
		&models.DatingMeetingInvite{},
	))

	tx := db.Begin()
	require.NoError(t, tx.Error)
	database.DB = tx
	services.ResetPushServiceForTests()

	t.Cleanup(func() {
		_ = tx.Rollback().Error
		services.ResetPushServiceForTests()
	})

	return tx
}

func newDatingHandlerTestApp(handler *DatingHandler) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if userID := strings.TrimSpace(c.Get("X-Test-User-ID")); userID != "" {
			c.Locals("userID", userID)
		}
		return c.Next()
	})
	app.Get("/api/dating/approval-requests", handler.GetIncomingApprovalRequests)
	app.Post("/api/dating/profile/:id/submit", handler.SubmitDatingProfile)
	app.Post("/api/dating/profile/:id/approvals/request", handler.RequestProfileApprovals)
	app.Post("/api/dating/profile/:id/approvals/:approvalId/respond", handler.RespondToProfileApproval)
	app.Post("/api/dating/posts", handler.CreateDatingPost)
	app.Patch("/api/dating/posts/:id", handler.UpdateDatingPost)
	app.Post("/api/dating/meeting-invites", handler.CreateMeetingInvite)
	app.Get("/api/dating/meeting-invites", handler.ListMeetingInvites)
	app.Post("/api/dating/meeting-invites/:id/respond", handler.RespondMeetingInvite)
	return app
}

func newDatingAdminTestApp(handler *AdminHandler) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if userID := strings.TrimSpace(c.Get("X-Test-User-ID")); userID != "" {
			c.Locals("userID", userID)
		}
		if role := strings.TrimSpace(c.Get("X-Test-User-Role")); role != "" {
			c.Locals("userRole", role)
		}
		return c.Next()
	})
	app.Get("/api/admin/dating/reviews", handler.GetDatingReviews)
	app.Post("/api/admin/dating/reviews/:userId/decision", handler.ModerateDatingReview)
	return app
}

func createDatingIntegrationUser(t *testing.T, suffix string) models.User {
	t.Helper()
	user := models.User{
		Email:                   fmt.Sprintf("dating-it-%s-%d@vedamatch.local", suffix, time.Now().UnixNano()),
		Password:                "hash",
		KarmicName:              "Dating Test",
		SpiritualName:           "Bhakta Test",
		Role:                    models.RoleUser,
		IsProfileComplete:       true,
		DatingEnabled:           true,
		DatingPublicationStatus: string(models.DatingPublicationPendingFriendApproval),
		ChildrenIntent:          "want",
		ElementalPrimary:        "air",
		LoveLanguages:           "quality_time",
		InviteCode:              fmt.Sprintf("DU%06d", time.Now().UnixNano()%1000000),
	}
	require.NoError(t, database.DB.Create(&user).Error)
	return user
}

func createDatingReadyProfileUser(t *testing.T, suffix string) models.User {
	t.Helper()
	user := createDatingIntegrationUser(t, suffix)
	user.Bio = "Meaningful spiritual life"
	user.Interests = "Kirtan, books, travel"
	user.LookingFor = "Serious relationship"
	user.MaritalStatus = "single"
	user.Dob = "1994-01-10"
	user.BirthTime = "08:45"
	user.BirthPlaceLink = "Moscow"
	user.City = "Moscow"
	user.MeetingPreferences = "personal,event"
	require.NoError(t, database.DB.Save(&user).Error)
	return user
}

func TestDatingHandler_GetIncomingApprovalRequests_CountOnlyPending(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingIntegrationUser(t, "owner")
	approver := createDatingIntegrationUser(t, "approver")
	otherOwner := createDatingIntegrationUser(t, "other-owner")
	thirdOwner := createDatingIntegrationUser(t, "third-owner")

	require.NoError(t, database.DB.Create(&models.DatingProfileApproval{
		UserID:     owner.ID,
		ApproverID: approver.ID,
		Status:     models.DatingApprovalPending,
	}).Error)
	require.NoError(t, database.DB.Create(&models.DatingProfileApproval{
		UserID:     otherOwner.ID,
		ApproverID: approver.ID,
		Status:     models.DatingApprovalPending,
	}).Error)
	require.NoError(t, database.DB.Create(&models.DatingProfileApproval{
		UserID:     otherOwner.ID,
		ApproverID: approver.ID + 1000,
		Status:     models.DatingApprovalPending,
	}).Error)
	require.NoError(t, database.DB.Create(&models.DatingProfileApproval{
		UserID:     thirdOwner.ID,
		ApproverID: approver.ID,
		Status:     models.DatingApprovalRejected,
		Note:       "old response",
	}).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest("GET", "/api/dating/approval-requests?status=pending&countOnly=true", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", approver.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		Count int `json:"count"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, 2, body.Count)
}

func TestDatingHandler_GetIncomingApprovalRequests_InvalidStatusRejected(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	approver := createDatingIntegrationUser(t, "bad-status-approver")

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest("GET", "/api/dating/approval-requests?status=unknown", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", approver.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestDatingHandler_RespondToProfileApproval_ApprovesPending(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingIntegrationUser(t, "respond-owner")
	approver := createDatingIntegrationUser(t, "respond-approver")

	approval := models.DatingProfileApproval{
		UserID:     owner.ID,
		ApproverID: approver.ID,
		Status:     models.DatingApprovalPending,
	}
	require.NoError(t, database.DB.Create(&approval).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"POST",
		fmt.Sprintf("/api/dating/profile/%d/approvals/%d/respond", owner.ID, approval.ID),
		bytes.NewBufferString(`{"status":"approved","note":"Looks good"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", approver.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.DatingProfileApproval
	require.NoError(t, database.DB.First(&refreshed, approval.ID).Error)
	require.Equal(t, models.DatingApprovalApproved, refreshed.Status)
	require.Equal(t, "Looks good", refreshed.Note)
	require.NotNil(t, refreshed.RespondedAt)
}

func TestDatingHandler_RespondToProfileApproval_EnqueuesAIModerationAfterThirdApproval(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingIntegrationUser(t, "queue-owner")
	approverA := createDatingIntegrationUser(t, "queue-approver-a")
	approverB := createDatingIntegrationUser(t, "queue-approver-b")
	approverC := createDatingIntegrationUser(t, "queue-approver-c")

	require.NoError(t, database.DB.Create(&models.DatingProfileApproval{
		UserID: owner.ID, ApproverID: approverA.ID, Status: models.DatingApprovalApproved,
	}).Error)
	require.NoError(t, database.DB.Create(&models.DatingProfileApproval{
		UserID: owner.ID, ApproverID: approverB.ID, Status: models.DatingApprovalApproved,
	}).Error)
	pendingApproval := models.DatingProfileApproval{
		UserID: owner.ID, ApproverID: approverC.ID, Status: models.DatingApprovalPending,
	}
	require.NoError(t, database.DB.Create(&pendingApproval).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"POST",
		fmt.Sprintf("/api/dating/profile/%d/approvals/%d/respond", owner.ID, pendingApproval.ID),
		bytes.NewBufferString(`{"status":"approved","note":"third approval"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", approverC.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, owner.ID).Error)
	require.Equal(t, string(models.DatingPublicationPendingAIReview), refreshed.DatingPublicationStatus)

	var job models.DatingModerationJob
	require.NoError(t, database.DB.Where("user_id = ?", owner.ID).Order("created_at DESC").First(&job).Error)
	require.Equal(t, models.DatingModerationTriggerApprovalsCompleted, job.Trigger)
	require.Equal(t, models.DatingModerationJobPending, job.Status)
	require.Nil(t, job.PostID)
}

func TestDatingHandler_SubmitDatingProfile_CreatesPendingFriendApprovals(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingReadyProfileUser(t, "submit-owner")
	friendA := createDatingIntegrationUser(t, "submit-friend-a")
	friendB := createDatingIntegrationUser(t, "submit-friend-b")
	friendC := createDatingIntegrationUser(t, "submit-friend-c")

	require.NoError(t, database.DB.Create(&[]models.Friend{
		{UserID: owner.ID, FriendID: friendA.ID},
		{UserID: owner.ID, FriendID: friendB.ID},
		{UserID: owner.ID, FriendID: friendC.ID},
	}).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/dating/profile/%d/submit", owner.ID), nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", owner.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		Status        string `json:"status"`
		ApprovedCount int    `json:"approvedCount"`
		PendingCount  int    `json:"pendingCount"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, string(models.DatingPublicationPendingFriendApproval), body.Status)
	require.Equal(t, 0, body.ApprovedCount)
	require.Equal(t, 3, body.PendingCount)

	var approvals []models.DatingProfileApproval
	require.NoError(t, database.DB.Where("user_id = ?", owner.ID).Find(&approvals).Error)
	require.Len(t, approvals, 3)
}

func TestDatingHandler_RequestProfileApprovals_CreatesOnlyRequestedFriends(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingReadyProfileUser(t, "request-owner")
	friendA := createDatingIntegrationUser(t, "request-friend-a")
	friendB := createDatingIntegrationUser(t, "request-friend-b")
	friendC := createDatingIntegrationUser(t, "request-friend-c")

	require.NoError(t, database.DB.Create(&[]models.Friend{
		{UserID: owner.ID, FriendID: friendA.ID},
		{UserID: owner.ID, FriendID: friendB.ID},
		{UserID: owner.ID, FriendID: friendC.ID},
	}).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"POST",
		fmt.Sprintf("/api/dating/profile/%d/approvals/request", owner.ID),
		bytes.NewBufferString(fmt.Sprintf(`{"approverIds":[%d,%d]}`, friendA.ID, friendC.ID)),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", owner.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var approvals []models.DatingProfileApproval
	require.NoError(t, database.DB.Where("user_id = ?", owner.ID).Order("approver_id ASC").Find(&approvals).Error)
	require.Len(t, approvals, 2)
	require.Equal(t, friendA.ID, approvals[0].ApproverID)
	require.Equal(t, friendC.ID, approvals[1].ApproverID)
}

func TestAdminHandler_ModerateDatingReview_PublishesProfile(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	admin := createDatingIntegrationUser(t, "admin")
	admin.Role = models.RoleAdmin
	require.NoError(t, database.DB.Save(&admin).Error)

	target := createDatingReadyProfileUser(t, "moderation-target")
	target.DatingPublicationStatus = string(models.DatingPublicationPendingAdminReview)
	target.DatingStatusReason = "Needs admin review"
	require.NoError(t, database.DB.Save(&target).Error)

	app := newDatingAdminTestApp(NewAdminHandler())
	req := httptest.NewRequest(
		"POST",
		fmt.Sprintf("/api/admin/dating/reviews/%d/decision", target.ID),
		bytes.NewBufferString(`{"action":"publish","note":"Published by admin integration test"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", admin.ID))
	req.Header.Set("X-Test-User-Role", models.RoleAdmin)

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.User
	require.NoError(t, database.DB.First(&refreshed, target.ID).Error)
	require.Equal(t, string(models.DatingPublicationPublished), refreshed.DatingPublicationStatus)
	require.Equal(t, "Published by admin integration test", refreshed.DatingStatusReason)

	var event models.DatingModerationEvent
	require.NoError(t, database.DB.Where("user_id = ?", target.ID).Order("created_at DESC").First(&event).Error)
	require.Equal(t, models.DatingModerationPublish, event.Outcome)
}

func TestDatingHandler_CreateMeetingInvite_Created(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	inviter := createDatingIntegrationUser(t, "invite-inviter")
	invitee := createDatingIntegrationUser(t, "invite-invitee")

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"POST",
		"/api/dating/meeting-invites",
		bytes.NewBufferString(fmt.Sprintf(`{"inviteeId":%d,"placeType":"personal","message":"Let's meet after Sunday program"}`, invitee.ID)),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", inviter.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var stored models.DatingMeetingInvite
	require.NoError(t, database.DB.Where("inviter_id = ? AND invitee_id = ?", inviter.ID, invitee.ID).First(&stored).Error)
	require.Equal(t, "personal", stored.PlaceType)
	require.Equal(t, models.DatingMeetingInvitePending, stored.Status)
}

func TestDatingHandler_CreateDatingPost_EnqueuesModerationJob(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingReadyProfileUser(t, "post-owner")

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"POST",
		"/api/dating/posts",
		bytes.NewBufferString(`{"body":"Sunday program reflections","mediaUrl":"https://example.com/photo.jpg"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", owner.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var post models.DatingPost
	require.NoError(t, database.DB.Where("user_id = ?", owner.ID).Order("created_at DESC").First(&post).Error)

	var job models.DatingModerationJob
	require.NoError(t, database.DB.Where("user_id = ? AND post_id = ?", owner.ID, post.ID).First(&job).Error)
	require.Equal(t, models.DatingModerationTriggerPostCreated, job.Trigger)
	require.Equal(t, models.DatingModerationJobPending, job.Status)
}

func TestDatingHandler_UpdateDatingPost_EnqueuesModerationJob(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	owner := createDatingReadyProfileUser(t, "post-update-owner")
	post := models.DatingPost{
		UserID:   owner.ID,
		Body:     "Old text",
		Status:   models.DatingPostActive,
		MediaURL: "",
	}
	require.NoError(t, database.DB.Create(&post).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"PATCH",
		fmt.Sprintf("/api/dating/posts/%d", post.ID),
		bytes.NewBufferString(`{"body":"Updated temple meeting note","mediaUrl":""}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", owner.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var job models.DatingModerationJob
	require.NoError(t, database.DB.Where("user_id = ? AND post_id = ?", owner.ID, post.ID).Order("created_at DESC").First(&job).Error)
	require.Equal(t, models.DatingModerationTriggerPostUpdated, job.Trigger)
	require.Equal(t, models.DatingModerationJobPending, job.Status)
}

func TestDatingHandler_ListMeetingInvites_ReturnsOwnedInvites(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	inviter := createDatingIntegrationUser(t, "list-inviter")
	invitee := createDatingIntegrationUser(t, "list-invitee")
	thirdUser := createDatingIntegrationUser(t, "list-third")

	require.NoError(t, database.DB.Create(&[]models.DatingMeetingInvite{
		{InviterID: inviter.ID, InviteeID: invitee.ID, PlaceType: "personal", Message: "One", Status: models.DatingMeetingInvitePending},
		{InviterID: thirdUser.ID, InviteeID: inviter.ID, PlaceType: "event", Message: "Two", Status: models.DatingMeetingInviteAccepted},
		{InviterID: thirdUser.ID, InviteeID: invitee.ID, PlaceType: "public_place", Message: "Hidden", Status: models.DatingMeetingInvitePending},
	}).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest("GET", "/api/dating/meeting-invites", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", inviter.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var invites []models.DatingMeetingInvite
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&invites))
	require.Len(t, invites, 2)
}

func TestDatingHandler_RespondMeetingInvite_AcceptsInvite(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	inviter := createDatingIntegrationUser(t, "respond-inviter")
	invitee := createDatingIntegrationUser(t, "respond-invitee")

	invite := models.DatingMeetingInvite{
		InviterID: inviter.ID,
		InviteeID: invitee.ID,
		PlaceType: "personal",
		Message:   "Meet in person",
		Status:    models.DatingMeetingInvitePending,
	}
	require.NoError(t, database.DB.Create(&invite).Error)

	app := newDatingHandlerTestApp(NewDatingHandler(nil))
	req := httptest.NewRequest(
		"POST",
		fmt.Sprintf("/api/dating/meeting-invites/%d/respond", invite.ID),
		bytes.NewBufferString(`{"status":"accepted"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", invitee.ID))

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var refreshed models.DatingMeetingInvite
	require.NoError(t, database.DB.First(&refreshed, invite.ID).Error)
	require.Equal(t, models.DatingMeetingInviteAccepted, refreshed.Status)
	require.NotNil(t, refreshed.RespondedAt)
}

func TestAdminHandler_GetDatingReviews_FiltersStatuses(t *testing.T) {
	setupDatingHandlerIntegrationDB(t)
	admin := createDatingIntegrationUser(t, "reviews-admin")
	admin.Role = models.RoleAdmin
	require.NoError(t, database.DB.Save(&admin).Error)

	pendingAdmin := createDatingReadyProfileUser(t, "reviews-pending-admin")
	pendingAdmin.DatingPublicationStatus = string(models.DatingPublicationPendingAdminReview)
	require.NoError(t, database.DB.Save(&pendingAdmin).Error)

	flagged := createDatingReadyProfileUser(t, "reviews-flagged")
	flagged.DatingPublicationStatus = string(models.DatingPublicationFlaggedAfterPublish)
	require.NoError(t, database.DB.Save(&flagged).Error)

	published := createDatingReadyProfileUser(t, "reviews-published")
	published.DatingPublicationStatus = string(models.DatingPublicationPublished)
	require.NoError(t, database.DB.Save(&published).Error)

	app := newDatingAdminTestApp(NewAdminHandler())
	req := httptest.NewRequest("GET", "/api/admin/dating/reviews?statuses=pending_admin_review,flagged_after_publish", nil)
	req.Header.Set("X-Test-User-ID", fmt.Sprintf("%d", admin.ID))
	req.Header.Set("X-Test-User-Role", models.RoleAdmin)

	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var users []models.User
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&users))
	require.Len(t, users, 2)
	statuses := map[string]struct{}{}
	for _, user := range users {
		statuses[user.DatingPublicationStatus] = struct{}{}
	}
	_, hasPendingAdmin := statuses[string(models.DatingPublicationPendingAdminReview)]
	_, hasFlagged := statuses[string(models.DatingPublicationFlaggedAfterPublish)]
	require.True(t, hasPendingAdmin)
	require.True(t, hasFlagged)
}
