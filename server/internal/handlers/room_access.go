package handlers

import (
	"errors"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"time"

	"gorm.io/gorm"
)

var (
	errRoomUnauthorized = errors.New("room_unauthorized")
	errRoomForbidden    = errors.New("room_forbidden")
	errRoomNotFound     = errors.New("room_not_found")
)

func loadRoomByID(roomID uint) (*models.Room, error) {
	if roomID == 0 {
		return nil, errRoomNotFound
	}

	var room models.Room
	if err := database.DB.First(&room, roomID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errRoomNotFound
		}
		return nil, err
	}
	return &room, nil
}

func getActorRoleInRoom(roomID uint, actorID uint) (string, error) {
	if roomID == 0 || actorID == 0 {
		return "", nil
	}

	var member models.RoomMember
	if err := database.DB.Where("room_id = ? AND user_id = ?", roomID, actorID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}

	return models.NormalizeRoomRole(member.Role), nil
}

func ensureRoomAccess(room *models.Room, actorID uint, needMember bool) (string, error) {
	if room == nil || room.ID == 0 {
		return "", errRoomNotFound
	}
	if actorID == 0 {
		return "", errRoomUnauthorized
	}

	role, err := getActorRoleInRoom(room.ID, actorID)
	if err != nil {
		return "", err
	}
	isMember := role != ""

	if !room.IsPublic || needMember {
		if !isMember {
			_ = services.GetMetricsService().Increment(services.MetricRoomAuthForbiddenTotal, 1)
			return "", errRoomForbidden
		}
	}

	return role, nil
}

func getRoomMemberUserIDs(roomID uint) ([]uint, error) {
	if roomID == 0 {
		return nil, nil
	}

	var userIDs []uint
	if err := database.DB.Model(&models.RoomMember{}).
		Where("room_id = ?", roomID).
		Pluck("user_id", &userIDs).Error; err != nil {
		return nil, err
	}

	seen := make(map[uint]struct{}, len(userIDs))
	deduped := make([]uint, 0, len(userIDs))
	for _, userID := range userIDs {
		if userID == 0 {
			continue
		}
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		deduped = append(deduped, userID)
	}

	return deduped, nil
}

func hardDeleteRoomMember(roomID uint, userID uint) (int64, error) {
	result := database.DB.Unscoped().
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Delete(&models.RoomMember{})
	if result.Error != nil {
		return 0, result.Error
	}
	return result.RowsAffected, nil
}

func inviteOrRestoreRoomMember(roomID uint, userID uint, role string) (created bool, err error) {
	if !models.IsValidRoomRole(role) {
		return false, errors.New("invalid room role")
	}

	var member models.RoomMember
	findErr := database.DB.Unscoped().
		Where("room_id = ? AND user_id = ?", roomID, userID).
		First(&member).Error
	if errors.Is(findErr, gorm.ErrRecordNotFound) {
		member = models.RoomMember{
			RoomID: roomID,
			UserID: userID,
			Role:   role,
		}
		if err := database.DB.Create(&member).Error; err != nil {
			return false, err
		}
		return true, nil
	}
	if findErr != nil {
		return false, findErr
	}

	if !member.DeletedAt.Valid {
		return false, nil
	}

	if err := database.DB.Unscoped().Model(&models.RoomMember{}).
		Where("id = ?", member.ID).
		Updates(map[string]interface{}{
			"role":       role,
			"deleted_at": nil,
			"updated_at": time.Now(),
		}).Error; err != nil {
		return false, err
	}

	return true, nil
}
