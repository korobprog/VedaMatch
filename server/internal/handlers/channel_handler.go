package handlers

import (
	"errors"
	"mime/multipart"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type channelService interface {
	IsFeatureEnabledForUser(userID uint) bool
	CreateChannel(ownerID uint, req models.ChannelCreateRequest) (*models.Channel, error)
	ListPublicChannels(filters services.ChannelListFilters) (*models.ChannelListResponse, error)
	ListMyChannels(ownerID uint, filters services.ChannelListFilters) (*models.ChannelListResponse, error)
	GetSadhuSangaRecommendations(viewerID uint, filters services.ChannelListFilters, limit int) (*models.ChannelRecommendationsResponse, error)
	GetSadhuSangaFacets(viewerID uint) (*models.ChannelFacetsResponse, error)
	GetPreacherProfile(channelID, viewerID uint) (*models.PreacherProfileDTO, error)
	UpsertPreacherProfile(channelID, actorID uint, req models.PreacherProfileUpsertRequest) (*models.PreacherProfileDTO, error)
	GetRoadmap(channelID, viewerID uint) (*models.ChannelRoadmapResponse, error)
	CreateRoadmapPoint(channelID, actorID uint, req models.ChannelRoadmapCreateRequest) (*models.ChannelRoadmapPoint, error)
	UpdateRoadmapPoint(channelID, pointID, actorID uint, req models.ChannelRoadmapUpdateRequest) (*models.ChannelRoadmapPoint, error)
	DeleteRoadmapPoint(channelID, pointID, actorID uint) error
	SetCurrentRoadmapPoint(channelID, pointID, actorID uint) (*models.ChannelRoadmapPoint, error)
	ReorderRoadmapPoints(channelID, actorID uint, orderedIDs []uint) error
	GetChannelByID(channelID uint, viewerID uint) (*models.Channel, error)
	FollowChannel(channelID, followerID uint) (*models.ChannelMember, error)
	UnfollowChannel(channelID, followerID uint) error
	GetFollowStatus(channelID, viewerID uint) (bool, int64, error)
	GetPreacherAnalytics(channelID, actorID uint) (*models.ChannelPreacherAnalyticsResponse, error)
	GetLiveSession(channelID, viewerID uint) (*models.ChannelLiveSessionSummary, error)
	CreateLiveSession(channelID, actorID uint, req models.ChannelLiveSessionUpsertRequest) (*models.ChannelLiveSessionSummary, error)
	UpdateLiveSession(channelID, liveID, actorID uint, req models.ChannelLiveSessionUpsertRequest) (*models.ChannelLiveSessionSummary, error)
	StartLiveSession(channelID, liveID, actorID uint) (*models.ChannelLiveSessionSummary, error)
	EndLiveSession(channelID, liveID, actorID uint) (*models.ChannelLiveSessionSummary, error)
	CancelLiveSession(channelID, liveID, actorID uint) (*models.ChannelLiveSessionSummary, error)
	JoinLiveSession(channelID, liveID, actorID uint, req models.ChannelLiveJoinRequest) (*models.ChannelLiveJoinResponse, error)
	LeaveLiveSession(channelID, liveID, actorID uint) error
	ListLiveParticipants(channelID, liveID, actorID uint) (*models.ChannelLiveParticipantsResponse, error)
	ModerateLiveParticipant(channelID, liveID, actorID uint, req models.ChannelLiveModerationRequest) (*models.ChannelLiveParticipantsResponse, error)
	GetSadhuSangaPushPreference(userID uint) (*models.ChannelSmartPushPreferenceResponse, error)
	UpsertSadhuSangaPushPreference(userID uint, req models.ChannelSmartPushPreferenceUpsertRequest) (*models.ChannelSmartPushPreferenceResponse, error)
	GetViewerRole(channelID uint, viewerID uint) (models.ChannelMemberRole, error)
	UpdateChannel(channelID, actorID uint, req models.ChannelUpdateRequest) (*models.Channel, error)
	UpdateChannelBranding(channelID, actorID uint, req models.ChannelBrandingUpdateRequest) (*models.Channel, error)
	UploadChannelCover(channelID, actorID uint, fileHeader *multipart.FileHeader) (*models.Channel, error)
	UploadPostMedia(channelID, actorID uint, fileHeader *multipart.FileHeader) (*models.ChannelPostMediaUploadResponse, error)
	AddMember(channelID, actorID uint, req models.ChannelMemberAddRequest) (*models.ChannelMember, error)
	ListMembers(channelID, actorID uint) ([]models.ChannelMember, error)
	UpdateMemberRole(channelID, actorID, memberUserID uint, role models.ChannelMemberRole) (*models.ChannelMember, error)
	RemoveMember(channelID, actorID, memberUserID uint) error
	CreatePost(channelID, actorID uint, req models.ChannelPostCreateRequest) (*models.ChannelPost, error)
	ListPosts(channelID, viewerID uint, page, limit int, includeDraft bool) (*models.ChannelPostListResponse, models.ChannelMemberRole, error)
	UpdatePost(channelID, postID, actorID uint, req models.ChannelPostUpdateRequest) (*models.ChannelPost, error)
	PinPost(channelID, postID, actorID uint) (*models.ChannelPost, error)
	UnpinPost(channelID, postID, actorID uint) (*models.ChannelPost, error)
	PublishPost(channelID, postID, actorID uint) (*models.ChannelPost, error)
	SchedulePost(channelID, postID, actorID uint, scheduledAt time.Time) (*models.ChannelPost, error)
	TrackCTAClick(channelID, postID, viewerID uint) error
	TrackPostView(channelID, postID, viewerID uint) error
	SetPostReaction(channelID, postID, userID uint, emoji string) (*models.ChannelPost, error)
	RemovePostReaction(channelID, postID, userID uint) (*models.ChannelPost, error)
	ListPostComments(channelID, postID, viewerID uint, limit int, cursorID uint) ([]models.ChannelPostComment, error)
	AddPostComment(channelID, postID, userID uint, body string) (*models.ChannelPostComment, error)
	TrackPostShare(channelID, postID, viewerID uint) error
	TrackPromotedAdClick(adID uint, viewerID uint) error
	GetFeed(filters services.ChannelFeedFilters) (*models.ChannelFeedResponse, error)
	CreateShowcase(channelID, actorID uint, req models.ChannelShowcaseCreateRequest) (*models.ChannelShowcase, error)
	ListShowcases(channelID, viewerID uint) ([]models.ChannelShowcase, error)
	UpdateShowcase(channelID, showcaseID, actorID uint, req models.ChannelShowcaseUpdateRequest) (*models.ChannelShowcase, error)
	DeleteShowcase(channelID, showcaseID, actorID uint) error
	GetMetricsSnapshot() (map[string]int64, error)
	DismissPrompt(userID uint, promptKey string, postID *uint) error
	GetPromptDismissStatus(userID uint, promptKeys []string) (map[string]bool, error)
}

type ChannelHandler struct {
	service channelService
}

func NewChannelHandler() *ChannelHandler {
	return NewChannelHandlerWithService(services.NewChannelService())
}

func NewChannelHandlerWithService(service channelService) *ChannelHandler {
	return &ChannelHandler{service: service}
}

func (h *ChannelHandler) ensureFeatureEnabled(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if !h.service.IsFeatureEnabledForUser(userID) {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Channels feature is disabled"})
	}
	return nil
}

func (h *ChannelHandler) CreateChannel(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	channel, err := h.service.CreateChannel(userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(channel)
}

func (h *ChannelHandler) ListPublicChannels(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	page := parseQueryIntWithDefault(c, "page", 1)
	limit := parseQueryIntWithDefault(c, "limit", 20)
	search := strings.TrimSpace(c.Query("search"))
	city := strings.TrimSpace(c.Query("city"))
	language := strings.TrimSpace(c.Query("language"))
	topic := strings.TrimSpace(c.Query("topic"))
	viewerID := middleware.GetUserID(c)
	sadhuSanga := parseQueryBoolWithDefault(c, "sadhuSanga", false)

	result, err := h.service.ListPublicChannels(services.ChannelListFilters{
		Search:     search,
		City:       city,
		Language:   language,
		Topic:      topic,
		Page:       page,
		Limit:      limit,
		ViewerID:   viewerID,
		SadhuSanga: sadhuSanga,
	})
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(result)
}

func (h *ChannelHandler) ListMyChannels(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	page := parseQueryIntWithDefault(c, "page", 1)
	limit := parseQueryIntWithDefault(c, "limit", 20)
	search := strings.TrimSpace(c.Query("search"))

	result, err := h.service.ListMyChannels(userID, services.ChannelListFilters{
		Search:   search,
		Page:     page,
		Limit:    limit,
		ViewerID: userID,
	})
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(result)
}

func (h *ChannelHandler) GetSadhuSangaRecommendations(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	limit := parseQueryIntWithDefault(c, "limit", 3)
	if limit > 20 {
		limit = 20
	}
	search := strings.TrimSpace(c.Query("search"))
	city := strings.TrimSpace(c.Query("city"))
	language := strings.TrimSpace(c.Query("language"))
	topic := strings.TrimSpace(c.Query("topic"))

	result, err := h.service.GetSadhuSangaRecommendations(userID, services.ChannelListFilters{
		Search:   search,
		City:     city,
		Language: language,
		Topic:    topic,
		ViewerID: userID,
	}, limit)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(result)
}

func (h *ChannelHandler) GetSadhuSangaFacets(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	result, err := h.service.GetSadhuSangaFacets(userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(result)
}

func (h *ChannelHandler) GetPreacherProfile(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	viewerID := middleware.GetUserID(c)
	profile, err := h.service.GetPreacherProfile(channelID, viewerID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(profile)
}

func (h *ChannelHandler) UpdatePreacherProfile(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	var req models.PreacherProfileUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	profile, err := h.service.UpsertPreacherProfile(channelID, actorID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(profile)
}

func (h *ChannelHandler) GetRoadmap(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	viewerID := middleware.GetUserID(c)
	result, err := h.service.GetRoadmap(channelID, viewerID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(result)
}

func (h *ChannelHandler) CreateRoadmapPoint(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	var req models.ChannelRoadmapCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	point, err := h.service.CreateRoadmapPoint(channelID, actorID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(point)
}

func (h *ChannelHandler) UpdateRoadmapPoint(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	pointID, err := parseUintParam(c, "pointId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid point ID"})
	}

	var req models.ChannelRoadmapUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	point, err := h.service.UpdateRoadmapPoint(channelID, pointID, actorID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(point)
}

func (h *ChannelHandler) DeleteRoadmapPoint(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	pointID, err := parseUintParam(c, "pointId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid point ID"})
	}

	if err := h.service.DeleteRoadmapPoint(channelID, pointID, actorID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{
		"ok":        true,
		"channelId": channelID,
		"pointId":   pointID,
	})
}

func (h *ChannelHandler) SetCurrentRoadmapPoint(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	pointID, err := parseUintParam(c, "pointId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid point ID"})
	}

	point, err := h.service.SetCurrentRoadmapPoint(channelID, pointID, actorID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(point)
}

func (h *ChannelHandler) ReorderRoadmapPoints(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	var req models.ChannelRoadmapReorderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.ReorderRoadmapPoints(channelID, actorID, req.OrderedIDs); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{
		"ok":        true,
		"channelId": channelID,
	})
}

func (h *ChannelHandler) GetChannel(c *fiber.Ctx) error {
	return h.getChannelWithViewer(c, middleware.GetUserID(c))
}

func (h *ChannelHandler) GetChannelPublic(c *fiber.Ctx) error {
	return h.getChannelWithViewer(c, 0)
}

func (h *ChannelHandler) getChannelWithViewer(c *fiber.Ctx, viewerID uint) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	channel, err := h.service.GetChannelByID(channelID, viewerID)
	if err != nil {
		return respondChannelError(c, err)
	}

	role, err := h.service.GetViewerRole(channel.ID, viewerID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(fiber.Map{
		"channel":    channel,
		"viewerRole": role,
	})
}

func (h *ChannelHandler) FollowChannel(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	member, err := h.service.FollowChannel(channelID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"ok":        true,
		"channelId": channelID,
		"member":    member,
	})
}

func (h *ChannelHandler) UnfollowChannel(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	if err := h.service.UnfollowChannel(channelID, userID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{
		"ok":        true,
		"channelId": channelID,
	})
}

func (h *ChannelHandler) GetFollowStatus(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	isFollowing, followersCount, err := h.service.GetFollowStatus(channelID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{
		"channelId":      channelID,
		"isFollowing":    isFollowing,
		"followersCount": followersCount,
	})
}

func (h *ChannelHandler) GetPreacherAnalytics(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	analytics, err := h.service.GetPreacherAnalytics(channelID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(analytics)
}

func (h *ChannelHandler) GetLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	session, err := h.service.GetLiveSession(channelID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	if session == nil {
		return c.JSON(fiber.Map{"session": nil, "liveStatus": "none"})
	}
	return c.JSON(fiber.Map{"session": session, "liveStatus": session.Status})
}

func (h *ChannelHandler) CreateLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	var req models.ChannelLiveSessionUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	session, err := h.service.CreateLiveSession(channelID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(session)
}

func (h *ChannelHandler) UpdateLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	var req models.ChannelLiveSessionUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	session, err := h.service.UpdateLiveSession(channelID, liveID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(session)
}

func (h *ChannelHandler) StartLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	session, err := h.service.StartLiveSession(channelID, liveID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(session)
}

func (h *ChannelHandler) EndLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	session, err := h.service.EndLiveSession(channelID, liveID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(session)
}

func (h *ChannelHandler) CancelLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	session, err := h.service.CancelLiveSession(channelID, liveID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(session)
}

func (h *ChannelHandler) JoinLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	var req models.ChannelLiveJoinRequest
	if err := c.BodyParser(&req); err != nil && !strings.Contains(strings.ToLower(err.Error()), "empty") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	response, err := h.service.JoinLiveSession(channelID, liveID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(response)
}

func (h *ChannelHandler) LeaveLiveSession(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	if err := h.service.LeaveLiveSession(channelID, liveID, userID); err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *ChannelHandler) ListLiveParticipants(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}
	response, err := h.service.ListLiveParticipants(channelID, liveID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(response)
}

func (h *ChannelHandler) ModerateLiveParticipant(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	liveID, err := parseUintParam(c, "liveId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid live ID"})
	}

	var req models.ChannelLiveModerationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	response, err := h.service.ModerateLiveParticipant(channelID, liveID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(response)
}

func (h *ChannelHandler) GetSadhuSangaPushPreference(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	preference, err := h.service.GetSadhuSangaPushPreference(userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(preference)
}

func (h *ChannelHandler) UpdateSadhuSangaPushPreference(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelSmartPushPreferenceUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	preference, err := h.service.UpsertSadhuSangaPushPreference(userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(preference)
}

func (h *ChannelHandler) UpdateChannel(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	channel, err := h.service.UpdateChannel(channelID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(channel)
}

func (h *ChannelHandler) UpdateBranding(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelBrandingUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	channel, err := h.service.UpdateChannelBranding(channelID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(channel)
}

func (h *ChannelHandler) UploadCover(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	fileHeader, err := c.FormFile("cover")
	if err != nil || fileHeader == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cover file is required"})
	}

	channel, err := h.service.UploadChannelCover(channelID, userID, fileHeader)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(channel)
}

func (h *ChannelHandler) UploadPostMedia(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	fileHeader, err := c.FormFile("media")
	if err != nil || fileHeader == nil {
		fileHeader, err = c.FormFile("file")
	}
	if err != nil || fileHeader == nil {
		fileHeader, err = c.FormFile("image")
	}
	if err != nil || fileHeader == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "media file is required"})
	}

	result, err := h.service.UploadPostMedia(channelID, userID, fileHeader)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(result)
}

func (h *ChannelHandler) AddMember(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelMemberAddRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	member, err := h.service.AddMember(channelID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(member)
}

func (h *ChannelHandler) ListMembers(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	userID := middleware.GetUserID(c)
	members, err := h.service.ListMembers(channelID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	result := make([]models.ChannelMemberResponse, 0, len(members))
	for _, member := range members {
		var userInfo *models.ChannelMemberUserInfo
		if member.User != nil {
			userInfo = &models.ChannelMemberUserInfo{
				ID:              member.User.ID,
				SpiritualName:   member.User.SpiritualName,
				KarmicName:      member.User.KarmicName,
				AvatarURL:       member.User.AvatarURL,
				Nickname:        member.User.Nickname,
				NicknameDisplay: services.NicknameDisplay(member.User.Nickname),
			}
		}

		result = append(result, models.ChannelMemberResponse{
			ID:        member.ID,
			ChannelID: member.ChannelID,
			UserID:    member.UserID,
			Role:      member.Role,
			CreatedAt: member.CreatedAt,
			UpdatedAt: member.UpdatedAt,
			UserInfo:  userInfo,
		})
	}

	return c.JSON(fiber.Map{"members": result})
}

func (h *ChannelHandler) UpdateMemberRole(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	memberUserID, err := parseUintParam(c, "userId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid member userId"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var req models.ChannelMemberRoleUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	member, err := h.service.UpdateMemberRole(channelID, userID, memberUserID, req.Role)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(member)
}

func (h *ChannelHandler) RemoveMember(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	memberUserID, err := parseUintParam(c, "userId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid member userId"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if err := h.service.RemoveMember(channelID, userID, memberUserID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) CreatePost(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelPostCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	post, err := h.service.CreatePost(channelID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(post)
}

func (h *ChannelHandler) ListPosts(c *fiber.Ctx) error {
	return h.listPostsWithViewer(c, middleware.GetUserID(c))
}

func (h *ChannelHandler) ListPostsPublic(c *fiber.Ctx) error {
	return h.listPostsWithViewer(c, 0)
}

func (h *ChannelHandler) listPostsWithViewer(c *fiber.Ctx, viewerID uint) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	page := parseQueryIntWithDefault(c, "page", 1)
	limit := parseQueryIntWithDefault(c, "limit", 20)
	includeDraft := c.QueryBool("includeDraft", false)

	response, role, err := h.service.ListPosts(channelID, viewerID, page, limit, includeDraft)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{
		"posts":      response.Posts,
		"total":      response.Total,
		"page":       response.Page,
		"limit":      response.Limit,
		"totalPages": response.TotalPages,
		"viewerRole": role,
	})
}

func (h *ChannelHandler) UpdatePost(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var req models.ChannelPostUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	post, err := h.service.UpdatePost(channelID, postID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(post)
}

func (h *ChannelHandler) PinPost(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	post, err := h.service.PinPost(channelID, postID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(post)
}

func (h *ChannelHandler) UnpinPost(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	post, err := h.service.UnpinPost(channelID, postID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(post)
}

func (h *ChannelHandler) PublishPost(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	post, err := h.service.PublishPost(channelID, postID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(post)
}

func (h *ChannelHandler) SchedulePost(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var req models.ChannelPostScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	post, err := h.service.SchedulePost(channelID, postID, userID, req.ScheduledAt)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(post)
}

func (h *ChannelHandler) TrackCTAClick(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	viewerID := middleware.GetUserID(c)
	if err := h.service.TrackCTAClick(channelID, postID, viewerID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) TrackPostView(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "channelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	viewerID := middleware.GetUserID(c)
	if err := h.service.TrackPostView(channelID, postID, viewerID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) SetPostReaction(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "channelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Emoji string `json:"emoji"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	post, err := h.service.SetPostReaction(channelID, postID, userID, req.Emoji)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(post)
}

func (h *ChannelHandler) RemovePostReaction(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "channelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	post, err := h.service.RemovePostReaction(channelID, postID, userID)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.JSON(post)
}

func (h *ChannelHandler) ListPostComments(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "channelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}
	viewerID := middleware.GetUserID(c)

	limit := parseQueryIntWithDefault(c, "limit", 20)
	var cursorID uint
	cursorRaw := strings.TrimSpace(c.Query("cursor"))
	if cursorRaw != "" {
		parsed, parseErr := strconv.ParseUint(cursorRaw, 10, 32)
		if parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cursor"})
		}
		cursorID = uint(parsed)
	}

	comments, err := h.service.ListPostComments(channelID, postID, viewerID, limit, cursorID)
	if err != nil {
		return respondChannelError(c, err)
	}

	var nextCursor *uint
	if len(comments) == limit {
		lastID := comments[len(comments)-1].ID
		nextCursor = &lastID
	}

	return c.JSON(fiber.Map{
		"comments":   comments,
		"nextCursor": nextCursor,
	})
}

func (h *ChannelHandler) AddPostComment(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "channelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Body string `json:"body"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	comment, err := h.service.AddPostComment(channelID, postID, userID, req.Body)
	if err != nil {
		return respondChannelError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(comment)
}

func (h *ChannelHandler) TrackPostShare(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "channelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	postID, err := parseUintParam(c, "postId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid post ID"})
	}

	viewerID := middleware.GetUserID(c)
	if err := h.service.TrackPostShare(channelID, postID, viewerID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) TrackPromotedAdClick(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	adID, err := parseUintParam(c, "adId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ad ID"})
	}

	viewerID := middleware.GetUserID(c)
	if err := h.service.TrackPromotedAdClick(adID, viewerID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) GetFeed(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	viewerID := middleware.GetUserID(c)
	page := parseQueryIntWithDefault(c, "page", 1)
	limit := parseQueryIntWithDefault(c, "limit", 20)
	search := strings.TrimSpace(c.Query("search"))
	filters := services.ChannelFeedFilters{
		Search:   search,
		Page:     page,
		Limit:    limit,
		ViewerID: viewerID,
	}

	if channelIDStr := c.Query("channelId"); channelIDStr != "" {
		channelID, err := strconv.ParseUint(channelIDStr, 10, 32)
		if err != nil || channelID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channelId"})
		}
		channelIDUint := uint(channelID)
		filters.ChannelID = &channelIDUint
	}

	feed, err := h.service.GetFeed(filters)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(feed)
}

func (h *ChannelHandler) CreateShowcase(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelShowcaseCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item, err := h.service.CreateShowcase(channelID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *ChannelHandler) ListShowcases(c *fiber.Ctx) error {
	return h.listShowcasesWithViewer(c, middleware.GetUserID(c))
}

func (h *ChannelHandler) ListShowcasesPublic(c *fiber.Ctx) error {
	return h.listShowcasesWithViewer(c, 0)
}

func (h *ChannelHandler) listShowcasesWithViewer(c *fiber.Ctx, viewerID uint) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}

	items, err := h.service.ListShowcases(channelID, viewerID)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"showcases": items})
}

func (h *ChannelHandler) UpdateShowcase(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	showcaseID, err := parseUintParam(c, "showcaseId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid showcase ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ChannelShowcaseUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item, err := h.service.UpdateShowcase(channelID, showcaseID, userID, req)
	if err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(item)
}

func (h *ChannelHandler) DeleteShowcase(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	showcaseID, err := parseUintParam(c, "showcaseId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid showcase ID"})
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.DeleteShowcase(channelID, showcaseID, userID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) GetMetrics(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	snapshot, err := h.service.GetMetricsSnapshot()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(snapshot)
}

func (h *ChannelHandler) DismissPrompt(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	promptKey := strings.TrimSpace(c.Params("promptKey"))
	var req struct {
		PostID *uint `json:"postId"`
	}
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}
	}

	if err := h.service.DismissPrompt(userID, promptKey, req.PostID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *ChannelHandler) GetPromptStatus(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	rawKeys := strings.TrimSpace(c.Query("keys"))
	if rawKeys == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "keys query is required"})
	}

	keys := make([]string, 0)
	for _, part := range strings.Split(rawKeys, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		keys = append(keys, part)
	}
	if len(keys) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "keys query is required"})
	}

	status, err := h.service.GetPromptDismissStatus(userID, keys)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": status})
}

func parseUintParam(c *fiber.Ctx, key string) (uint, error) {
	raw := strings.TrimSpace(c.Params(key))
	value, err := strconv.ParseUint(raw, 10, 32)
	if err != nil || value == 0 {
		return 0, errors.New("invalid uint param")
	}
	return uint(value), nil
}

func parseQueryIntWithDefault(c *fiber.Ctx, key string, def int) int {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return def
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return def
	}
	return value
}

func parseQueryBoolWithDefault(c *fiber.Ctx, key string, def bool) bool {
	raw := strings.ToLower(strings.TrimSpace(c.Query(key)))
	if raw == "" {
		return def
	}
	switch raw {
	case "1", "true", "yes", "on", "enabled":
		return true
	case "0", "false", "no", "off", "disabled":
		return false
	default:
		return def
	}
}

func respondChannelError(c *fiber.Ctx, err error) error {
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case errors.Is(err, services.ErrChannelsDisabled):
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrChannelNotFound), errors.Is(err, services.ErrChannelPostNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrChannelRoadmapPoint):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrChannelLiveNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrChannelForbidden):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrPostEditWindow):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "POST_EDIT_WINDOW_EXPIRED",
		})
	case errors.Is(err, services.ErrInvalidPayload), errors.Is(err, services.ErrInvalidPostStatus):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	case strings.Contains(msg, "not found"):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case strings.Contains(msg, "forbidden"), strings.Contains(msg, "not authorized"), strings.Contains(msg, "unauthorized"):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	default:
		if strings.Contains(msg, "already exists") ||
			strings.Contains(msg, "conflict") ||
			strings.Contains(msg, "cannot cancel active") ||
			strings.Contains(msg, "status transition") ||
			strings.Contains(msg, "only active live session can be ended") ||
			strings.Contains(msg, "is not active") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		if strings.Contains(msg, "invalid") ||
			strings.Contains(msg, "required") ||
			strings.Contains(msg, "too large") ||
			strings.Contains(msg, "empty") ||
			strings.Contains(msg, "unsupported") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
}
