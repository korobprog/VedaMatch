package handlers

import (
	"errors"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type ChannelHandler struct {
	service *services.ChannelService
}

func NewChannelHandler() *ChannelHandler {
	return &ChannelHandler{service: services.NewChannelService()}
}

func (h *ChannelHandler) ensureFeatureEnabled(c *fiber.Ctx) error {
	if !h.service.IsFeatureEnabled() {
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(channel)
}

func (h *ChannelHandler) ListPublicChannels(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := strings.TrimSpace(c.Query("search"))

	result, err := h.service.ListPublicChannels(services.ChannelListFilters{
		Search: search,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := strings.TrimSpace(c.Query("search"))

	result, err := h.service.ListMyChannels(userID, services.ChannelListFilters{
		Search: search,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
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

	role, _ := h.service.GetViewerRole(channel.ID, viewerID)
	return c.JSON(fiber.Map{
		"channel":    channel,
		"viewerRole": role,
	})
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

func (h *ChannelHandler) AddMember(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	channelID, err := parseUintParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channel ID"})
	}
	userID := middleware.GetUserID(c)

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
				ID:            member.User.ID,
				SpiritualName: member.User.SpiritualName,
				KarmicName:    member.User.KarmicName,
				AvatarURL:     member.User.AvatarURL,
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

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
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

func (h *ChannelHandler) GetFeed(c *fiber.Ctx) error {
	if err := h.ensureFeatureEnabled(c); err != nil {
		return err
	}

	viewerID := middleware.GetUserID(c)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := strings.TrimSpace(c.Query("search"))
	filters := services.ChannelFeedFilters{
		Search:   search,
		Page:     page,
		Limit:    limit,
		ViewerID: viewerID,
	}

	if channelIDStr := c.Query("channelId"); channelIDStr != "" {
		channelID, err := strconv.ParseUint(channelIDStr, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid channelId"})
		}
		channelIDUint := uint(channelID)
		filters.ChannelID = &channelIDUint
	}

	feed, err := h.service.GetFeed(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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

	if err := h.service.DeleteShowcase(channelID, showcaseID, userID); err != nil {
		return respondChannelError(c, err)
	}

	return c.JSON(fiber.Map{"success": true})
}

func parseUintParam(c *fiber.Ctx, key string) (uint, error) {
	raw := strings.TrimSpace(c.Params(key))
	value, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(value), nil
}

func respondChannelError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrChannelsDisabled):
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrChannelNotFound), errors.Is(err, services.ErrChannelPostNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrChannelForbidden):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, services.ErrInvalidPayload), errors.Is(err, services.ErrInvalidPostStatus):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	default:
		if strings.Contains(strings.ToLower(err.Error()), "invalid") || strings.Contains(strings.ToLower(err.Error()), "required") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
}
