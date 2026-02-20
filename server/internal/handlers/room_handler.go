package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RoomHandler struct{}

type roomListItem struct {
	models.Room
	MembersCount int64  `json:"membersCount"`
	MyRole       string `json:"myRole,omitempty"`
	IsMember     bool   `json:"isMember"`
	CanJoin      bool   `json:"canJoin"`
}

type roomMemberUserSummary struct {
	ID            uint   `json:"ID"`
	KarmicName    string `json:"karmicName"`
	SpiritualName string `json:"spiritualName"`
	Email         string `json:"email"`
	AvatarURL     string `json:"avatarUrl"`
}

type roomSupportConfigResponse struct {
	Enabled                     bool   `json:"enabled"`
	ProjectID                   int    `json:"projectId"`
	DefaultAmount               int    `json:"defaultAmount"`
	CooldownHours               int    `json:"cooldownHours"`
	PlatformContributionEnabled bool   `json:"platformContributionEnabled"`
	PlatformContributionDefault int    `json:"platformContributionDefault"`
	ConfigSource                string `json:"configSource"`
	TitleKey                    string `json:"titleKey"`
	DescriptionKey              string `json:"descriptionKey"`
}

func NewRoomHandler() *RoomHandler {
	return &RoomHandler{}
}

func (h *RoomHandler) CreateRoom(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsPublic    bool   `json:"isPublic"`
		AiEnabled   bool   `json:"aiEnabled"`
		ImageURL    string `json:"imageUrl"`
		StartTime   string `json:"startTime"`
		Location    string `json:"location"`
		Language    string `json:"language"`
		BookCode    string `json:"bookCode"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Room name is required"})
	}

	room := models.Room{
		Name:        name,
		Description: strings.TrimSpace(body.Description),
		OwnerID:     userID,
		IsPublic:    body.IsPublic,
		AiEnabled:   body.AiEnabled,
		ImageURL:    strings.TrimSpace(body.ImageURL),
		StartTime:   strings.TrimSpace(body.StartTime),
		Location:    strings.TrimSpace(body.Location),
		Language:    strings.TrimSpace(body.Language),
		BookCode:    strings.TrimSpace(body.BookCode),
	}
	if room.BookCode != "" {
		room.CurrentChapter = 1
		room.CurrentVerse = 1
	}

	if err := database.DB.Create(&room).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create room"})
	}

	ownerMember := models.RoomMember{
		RoomID: room.ID,
		UserID: userID,
		Role:   models.RoomRoleOwner,
	}
	if err := database.DB.Create(&ownerMember).Error; err != nil {
		_ = database.DB.Unscoped().Delete(&room).Error
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create room owner membership"})
	}

	return c.Status(fiber.StatusCreated).JSON(room)
}

func (h *RoomHandler) GetRooms(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var rooms []models.Room
	if err := database.DB.
		Table("rooms").
		Select("rooms.*").
		Joins("LEFT JOIN room_members rm ON rm.room_id = rooms.id AND rm.user_id = ?", userID).
		Where("rooms.is_public = ? OR rm.id IS NOT NULL", true).
		Order("rooms.created_at DESC").
		Find(&rooms).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch rooms"})
	}

	if len(rooms) == 0 {
		return c.Status(fiber.StatusOK).JSON([]roomListItem{})
	}

	roomIDs := make([]uint, 0, len(rooms))
	for _, room := range rooms {
		roomIDs = append(roomIDs, room.ID)
	}

	type memberCountRow struct {
		RoomID       uint
		MembersCount int64 `gorm:"column:members_count"`
	}
	var countRows []memberCountRow
	if err := database.DB.
		Table("room_members").
		Select("room_id, COUNT(*) AS members_count").
		Where("room_id IN ?", roomIDs).
		Group("room_id").
		Scan(&countRows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch room member counts"})
	}
	membersCountByRoom := make(map[uint]int64, len(countRows))
	for _, row := range countRows {
		membersCountByRoom[row.RoomID] = row.MembersCount
	}

	var myMemberships []models.RoomMember
	if err := database.DB.Where("user_id = ? AND room_id IN ?", userID, roomIDs).Find(&myMemberships).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch room memberships"})
	}
	myRoleByRoom := make(map[uint]string, len(myMemberships))
	for _, m := range myMemberships {
		myRoleByRoom[m.RoomID] = models.NormalizeRoomRole(m.Role)
	}

	response := make([]roomListItem, 0, len(rooms))
	for _, room := range rooms {
		myRole := myRoleByRoom[room.ID]
		isMember := myRole != ""
		response = append(response, roomListItem{
			Room:         room,
			MembersCount: membersCountByRoom[room.ID],
			MyRole:       myRole,
			IsMember:     isMember,
			CanJoin:      room.IsPublic && !isMember,
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

func (h *RoomHandler) GetRoom(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	role, err := ensureRoomAccess(room, userID, false)
	if err != nil {
		return respondRoomAccessError(c, err)
	}

	var membersCount int64
	if err := database.DB.Model(&models.RoomMember{}).Where("room_id = ?", room.ID).Count(&membersCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch room details"})
	}

	return c.JSON(roomListItem{
		Room:         *room,
		MembersCount: membersCount,
		MyRole:       role,
		IsMember:     role != "",
		CanJoin:      room.IsPublic && role == "",
	})
}

func (h *RoomHandler) InviteUser(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RoomID uint `json:"roomId"`
		UserID uint `json:"userId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RoomID == 0 || body.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "roomId and userId are required"})
	}

	room, err := loadRoomByID(body.RoomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if !models.CanManageRoomMembers(actorRole) {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only owner/admin can invite users"})
	}

	var targetUser models.User
	if err := database.DB.Select("id").First(&targetUser, body.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not validate target user"})
	}

	var existingActive models.RoomMember
	if err := database.DB.Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).First(&existingActive).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User is already a member of this room"})
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not invite user"})
	}

	created, err := inviteOrRestoreRoomMember(body.RoomID, body.UserID, models.RoomRoleMember)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not invite user"})
	}
	if !created {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User is already a member of this room"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"ok":     true,
		"roomId": body.RoomID,
		"userId": body.UserID,
		"role":   models.RoomRoleMember,
	})
}

func (h *RoomHandler) GetRoomMembers(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}
	if _, err := ensureRoomAccess(room, actorID, true); err != nil {
		return respondRoomAccessError(c, err)
	}

	var members []models.RoomMember
	if err := database.DB.Where("room_id = ?", roomID).Order("created_at ASC").Find(&members).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch members"})
	}
	if len(members) == 0 {
		return c.JSON([]fiber.Map{})
	}

	userIDs := make([]uint, 0, len(members))
	roleByUser := make(map[uint]string, len(members))
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
		roleByUser[m.UserID] = models.NormalizeRoomRole(m.Role)
	}

	var users []models.User
	if err := database.DB.
		Select("id", "karmic_name", "spiritual_name", "email", "avatar_url").
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch member details"})
	}

	userByID := make(map[uint]roomMemberUserSummary, len(users))
	for _, user := range users {
		userByID[user.ID] = roomMemberUserSummary{
			ID:            user.ID,
			KarmicName:    user.KarmicName,
			SpiritualName: user.SpiritualName,
			Email:         user.Email,
			AvatarURL:     user.AvatarURL,
		}
	}

	response := make([]fiber.Map, 0, len(members))
	for _, member := range members {
		if user, ok := userByID[member.UserID]; ok {
			response = append(response, fiber.Map{
				"user": user,
				"role": roleByUser[member.UserID],
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

func (h *RoomHandler) UpdateMemberRole(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RoomID uint   `json:"roomId"`
		UserID uint   `json:"userId"`
		Role   string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RoomID == 0 || body.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "roomId and userId are required"})
	}

	targetRole := models.NormalizeRoomRole(body.Role)
	if targetRole != models.RoomRoleAdmin && targetRole != models.RoomRoleMember {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}

	room, err := loadRoomByID(body.RoomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if actorRole != models.RoomRoleOwner {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only room owner can update roles"})
	}
	if body.UserID == room.OwnerID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Owner role cannot be changed"})
	}

	var member models.RoomMember
	if err := database.DB.Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update role"})
	}

	if models.NormalizeRoomRole(member.Role) == models.RoomRoleOwner {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Owner role cannot be changed"})
	}

	if err := database.DB.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).
		Update("role", targetRole).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update role"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"ok":     true,
		"roomId": body.RoomID,
		"userId": body.UserID,
		"role":   targetRole,
	})
}

func (h *RoomHandler) RemoveUser(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RoomID uint `json:"roomId"`
		UserID uint `json:"userId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RoomID == 0 || body.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "roomId and userId are required"})
	}

	room, err := loadRoomByID(body.RoomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if !models.CanManageRoomMembers(actorRole) {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only owner/admin can remove members"})
	}

	var targetMember models.RoomMember
	if err := database.DB.Where("room_id = ? AND user_id = ?", body.RoomID, body.UserID).First(&targetMember).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not remove user"})
	}

	targetRole := models.NormalizeRoomRole(targetMember.Role)
	if targetRole == models.RoomRoleOwner {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Owner cannot be removed"})
	}
	if actorRole == models.RoomRoleAdmin && targetRole != models.RoomRoleMember {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Admin can remove only members"})
	}

	rowsAffected, err := hardDeleteRoomMember(body.RoomID, body.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not remove user"})
	}
	if rowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"ok": true})
}

func (h *RoomHandler) JoinRoom(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return respondRoomLoadError(c, err)
	}

	if !room.IsPublic {
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Room is private"})
	}

	role, err := getActorRoleInRoom(room.ID, actorID)
	if err != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not join room"})
	}
	if role != "" {
		return c.JSON(fiber.Map{
			"ok":       true,
			"joined":   false,
			"roomId":   room.ID,
			"roomName": room.Name,
			"myRole":   role,
		})
	}

	created, err := inviteOrRestoreRoomMember(room.ID, actorID, models.RoomRoleMember)
	if err != nil {
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not join room"})
	}

	if created {
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinSuccessTotal, 1)
	}

	return c.JSON(fiber.Map{
		"ok":       true,
		"joined":   created,
		"roomId":   room.ID,
		"roomName": room.Name,
		"myRole":   models.RoomRoleMember,
	})
}

func (h *RoomHandler) LeaveRoom(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		RoomID uint `json:"roomId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	if body.RoomID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "roomId is required"})
	}

	room, err := loadRoomByID(body.RoomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	role, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if role == models.RoomRoleOwner {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Owner cannot leave room"})
	}

	rowsAffected, err := hardDeleteRoomMember(body.RoomID, actorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not leave room"})
	}
	if rowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Membership not found"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

func (h *RoomHandler) GetSupportConfig(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	cfg := services.ResolveSupportConfig("rooms")

	return c.JSON(roomSupportConfigResponse{
		Enabled:                     cfg.Enabled,
		ProjectID:                   cfg.ProjectID,
		DefaultAmount:               cfg.DefaultAmount,
		CooldownHours:               cfg.CooldownHours,
		PlatformContributionEnabled: cfg.PlatformContributionEnabled,
		PlatformContributionDefault: cfg.PlatformContributionDefault,
		ConfigSource:                cfg.ConfigSource,
		TitleKey:                    "chat.roomsSupportTitle",
		DescriptionKey:              "chat.roomsSupportBenefit1",
	})
}

func (h *RoomHandler) GetUnifiedSupportConfig(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	service := strings.TrimSpace(c.Query("service"))
	cfg := services.ResolveSupportConfig(service)
	return c.JSON(cfg)
}

func (h *RoomHandler) CreateInviteLink(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if actorRole != models.RoomRoleOwner && actorRole != models.RoomRoleAdmin {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only owner/admin can create invite links"})
	}

	var body struct {
		ExpiresInHours *int `json:"expiresInHours"`
		MaxUses        *int `json:"maxUses"`
	}
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}
	}

	expiresInHours := 24 * 7
	if body.ExpiresInHours != nil {
		if *body.ExpiresInHours <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "expiresInHours must be positive"})
		}
		expiresInHours = *body.ExpiresInHours
		if expiresInHours > 24*90 {
			expiresInHours = 24 * 90
		}
	}

	maxUses := 20
	if body.MaxUses != nil {
		if *body.MaxUses <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "maxUses must be positive"})
		}
		maxUses = *body.MaxUses
		if maxUses > 10000 {
			maxUses = 10000
		}
	}

	expiresAt := time.Now().Add(time.Duration(expiresInHours) * time.Hour)
	plainToken, tokenHash, err := generateRoomInviteToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create invite token"})
	}

	invite := models.RoomInviteToken{
		RoomID:    room.ID,
		CreatedBy: actorID,
		TokenHash: tokenHash,
		ExpiresAt: &expiresAt,
		MaxUses:   uint(maxUses),
	}
	if err := database.DB.Create(&invite).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save invite token"})
	}

	return c.JSON(fiber.Map{
		"ok":          true,
		"roomId":      room.ID,
		"roomName":    room.Name,
		"inviteToken": plainToken,
		"inviteLink":  fmt.Sprintf("vedamatch://rooms/join/%s", plainToken),
		"expiresAt":   expiresAt,
		"maxUses":     maxUses,
	})
}

func (h *RoomHandler) JoinByToken(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var body struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	rawToken := strings.TrimSpace(body.Token)
	if rawToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token is required"})
	}

	now := time.Now()
	tokenHash := hashRoomInviteToken(rawToken)

	var invite models.RoomInviteToken
	if err := database.DB.Where("token_hash = ? AND revoked_at IS NULL", tokenHash).First(&invite).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[RoomInvite] join_by_token_failed actor_id=%d reason=token_not_found", actorID)
			_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invite token not found"})
		}
		log.Printf("[RoomInvite] join_by_token_failed actor_id=%d reason=token_lookup_error error=%v", actorID, err)
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not process invite token"})
	}

	if invite.ExpiresAt != nil && now.After(*invite.ExpiresAt) {
		log.Printf("[RoomInvite] join_by_token_failed room_id=%d actor_id=%d reason=token_expired", invite.RoomID, actorID)
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "Invite token expired"})
	}
	if invite.MaxUses > 0 && invite.UsedCount >= invite.MaxUses {
		log.Printf("[RoomInvite] join_by_token_failed room_id=%d actor_id=%d reason=token_usage_limit", invite.RoomID, actorID)
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Invite token usage limit reached"})
	}

	room, err := loadRoomByID(invite.RoomID)
	if err != nil {
		log.Printf("[RoomInvite] join_by_token_failed room_id=%d actor_id=%d reason=room_load_failed error=%v", invite.RoomID, actorID, err)
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return respondRoomLoadError(c, err)
	}

	role, err := getActorRoleInRoom(room.ID, actorID)
	if err != nil {
		log.Printf("[RoomInvite] join_by_token_failed room_id=%d actor_id=%d reason=role_lookup_failed error=%v", room.ID, actorID, err)
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not join room"})
	}
	if role != "" {
		return c.JSON(fiber.Map{
			"ok":       true,
			"joined":   false,
			"roomId":   room.ID,
			"roomName": room.Name,
			"myRole":   role,
		})
	}

	joined := false
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		var locked models.RoomInviteToken
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, invite.ID).Error; err != nil {
			return err
		}
		if !locked.IsActive(now) {
			return fiber.ErrConflict
		}

		var member models.RoomMember
		findErr := tx.Unscoped().Where("room_id = ? AND user_id = ?", room.ID, actorID).First(&member).Error
		switch {
		case errors.Is(findErr, gorm.ErrRecordNotFound):
			member = models.RoomMember{RoomID: room.ID, UserID: actorID, Role: models.RoomRoleMember}
			if err := tx.Create(&member).Error; err != nil {
				return err
			}
			joined = true
		case findErr != nil:
			return findErr
		default:
			if member.DeletedAt.Valid {
				if err := tx.Unscoped().Model(&models.RoomMember{}).
					Where("id = ?", member.ID).
					Updates(map[string]interface{}{
						"role":       models.RoomRoleMember,
						"deleted_at": nil,
						"updated_at": time.Now(),
					}).Error; err != nil {
					return err
				}
				joined = true
			}
		}

		if joined {
			if err := tx.Model(&models.RoomInviteToken{}).
				Where("id = ?", locked.ID).
				Update("used_count", gorm.Expr("used_count + ?", 1)).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Printf("[RoomInvite] join_by_token_failed room_id=%d actor_id=%d reason=transaction_failed error=%v", room.ID, actorID, err)
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinFailTotal, 1)
		if errors.Is(err, fiber.ErrConflict) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Invite token is no longer active"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not join room"})
	}

	if joined {
		_ = services.GetMetricsService().Increment(services.MetricRoomJoinSuccessTotal, 1)
	}
	log.Printf("[RoomInvite] join_by_token_success room_id=%d actor_id=%d joined=%t", room.ID, actorID, joined)

	return c.JSON(fiber.Map{
		"ok":       true,
		"joined":   joined,
		"roomId":   room.ID,
		"roomName": room.Name,
		"myRole":   models.RoomRoleMember,
	})
}

func (h *RoomHandler) UpdateRoomImage(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}

	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if actorRole != models.RoomRoleOwner {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only room owner can update room image"})
	}

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No image provided"})
	}

	roomIDStr := strconv.FormatUint(uint64(roomID), 10)

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("rooms/%s_%d%s", roomIDStr, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				if err := database.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("image_url", imageURL).Error; err != nil {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update room in database"})
				}
				return c.JSON(fiber.Map{"imageUrl": imageURL})
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := "./uploads/rooms"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create upload directory"})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("room_%s_%d%s", roomIDStr, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save image"})
	}

	imageURL := "/uploads/rooms/" + filename
	if err := database.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("image_url", imageURL).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update room"})
	}

	return c.JSON(fiber.Map{"imageUrl": imageURL})
}

func (h *RoomHandler) UpdateRoom(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}
	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if actorRole != models.RoomRoleOwner {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only room owner can update room"})
	}

	var updates models.Room
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	updates.OwnerID = room.OwnerID
	if err := database.DB.Model(&models.Room{}).Where("id = ?", roomID).Updates(&updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update room"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *RoomHandler) UpdateRoomSettings(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	roomID, err := parseRoomIDParam(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid room id"})
	}

	room, err := loadRoomByID(roomID)
	if err != nil {
		return respondRoomLoadError(c, err)
	}
	actorRole, err := ensureRoomAccess(room, actorID, true)
	if err != nil {
		return respondRoomAccessError(c, err)
	}
	if actorRole != models.RoomRoleOwner {
		_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only room owner can update room settings"})
	}

	var body struct {
		Name           *string `json:"name"`
		Description    *string `json:"description"`
		StartTime      *string `json:"startTime"`
		IsPublic       *bool   `json:"isPublic"`
		AiEnabled      *bool   `json:"aiEnabled"`
		BookCode       *string `json:"bookCode"`
		CurrentChapter *int    `json:"currentChapter"`
		CurrentVerse   *int    `json:"currentVerse"`
		Language       *string `json:"language"`
		ShowPurport    *bool   `json:"showPurport"`
		ImageURL       *string `json:"imageUrl"`
		Location       *string `json:"location"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	updates := make(map[string]interface{})
	if body.Name != nil {
		updates["name"] = strings.TrimSpace(*body.Name)
	}
	if body.Description != nil {
		updates["description"] = strings.TrimSpace(*body.Description)
	}
	if body.StartTime != nil {
		updates["start_time"] = strings.TrimSpace(*body.StartTime)
		updates["notification_sent"] = false
	}
	if body.IsPublic != nil {
		updates["is_public"] = *body.IsPublic
	}
	if body.AiEnabled != nil {
		updates["ai_enabled"] = *body.AiEnabled
	}
	if body.BookCode != nil {
		updates["book_code"] = strings.TrimSpace(*body.BookCode)
	}
	if body.CurrentChapter != nil {
		updates["current_chapter"] = *body.CurrentChapter
	}
	if body.CurrentVerse != nil {
		updates["current_verse"] = *body.CurrentVerse
	}
	if body.Language != nil {
		updates["language"] = strings.TrimSpace(*body.Language)
	}
	if body.ImageURL != nil {
		updates["image_url"] = strings.TrimSpace(*body.ImageURL)
	}
	if body.Location != nil {
		updates["location"] = strings.TrimSpace(*body.Location)
	}
	if body.ShowPurport != nil {
		updates["show_purport"] = *body.ShowPurport
	}

	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No settings to update"})
	}

	if err := database.DB.Model(&models.Room{}).Where("id = ?", roomID).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update room settings"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func parseRoomIDParam(c *fiber.Ctx) (uint, error) {
	raw := strings.TrimSpace(c.Params("id"))
	if raw == "" {
		return 0, errors.New("missing room id")
	}
	parsed, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || parsed == 0 {
		return 0, errors.New("invalid room id")
	}
	return uint(parsed), nil
}

func respondRoomLoadError(c *fiber.Ctx, err error) error {
	if errors.Is(err, errRoomNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Room not found"})
	}
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not load room"})
}

func respondRoomAccessError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, errRoomUnauthorized):
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	case errors.Is(err, errRoomForbidden):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	case errors.Is(err, errRoomNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Room not found"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not process room access"})
	}
}

func generateRoomInviteToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	token := base64.RawURLEncoding.EncodeToString(buf)
	return token, hashRoomInviteToken(token), nil
}

func hashRoomInviteToken(token string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(token)))
	return hex.EncodeToString(sum[:])
}
