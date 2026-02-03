package services

import (
	"log"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// AdminNotificationService handles admin notifications
type AdminNotificationService struct {
	db *gorm.DB
}

// NewAdminNotificationService creates a new notification service
func NewAdminNotificationService(db *gorm.DB) *AdminNotificationService {
	return &AdminNotificationService{db: db}
}

// CreateNotification creates a new admin notification
func (s *AdminNotificationService) CreateNotification(req models.AdminNotificationCreateRequest) error {
	notification := &models.AdminNotification{
		Type:     req.Type,
		Message:  req.Message,
		LinkTo:   req.LinkTo,
		YatraID:  req.YatraID,
		ReportID: req.ReportID,
		UserID:   req.UserID,
		Read:     false,
	}

	if err := s.db.Create(notification).Error; err != nil {
		log.Printf("[AdminNotificationService] Failed to create notification: %v", err)
		return err
	}

	log.Printf("[AdminNotificationService] Created notification: %s", notification.Message)
	return nil
}

// GetNotifications returns all admin notifications with pagination
func (s *AdminNotificationService) GetNotifications(unreadOnly bool, page, limit int) ([]models.AdminNotification, int64, error) {
	query := s.db.Model(&models.AdminNotification{})

	if unreadOnly {
		query = query.Where("read = ?", false)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	var notifications []models.AdminNotification
	err := query.Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&notifications).Error

	return notifications, total, err
}

// MarkAsRead marks a notification as read
func (s *AdminNotificationService) MarkAsRead(notificationID, adminID uint) error {
	now := time.Now()
	return s.db.Model(&models.AdminNotification{}).
		Where("id = ?", notificationID).
		Updates(map[string]interface{}{
			"read":    true,
			"read_at": now,
			"read_by": adminID,
		}).Error
}

// MarkAllAsRead marks all notifications as read
func (s *AdminNotificationService) MarkAllAsRead(adminID uint) error {
	now := time.Now()
	return s.db.Model(&models.AdminNotification{}).
		Where("read = ?", false).
		Updates(map[string]interface{}{
			"read":    true,
			"read_at": now,
			"read_by": adminID,
		}).Error
}

// GetUnreadCount returns count of unread notifications
func (s *AdminNotificationService) GetUnreadCount() (int64, error) {
	var count int64
	err := s.db.Model(&models.AdminNotification{}).
		Where("read = ?", false).
		Count(&count).Error
	return count, err
}

// DeleteNotification soft deletes a notification
func (s *AdminNotificationService) DeleteNotification(notificationID uint) error {
	return s.db.Delete(&models.AdminNotification{}, notificationID).Error
}

// CleanupOldNotifications deletes read notifications older than specified days
func (s *AdminNotificationService) CleanupOldNotifications(daysOld int) error {
	cutoffDate := time.Now().AddDate(0, 0, -daysOld)
	return s.db.Where("read = ? AND read_at < ?", true, cutoffDate).
		Delete(&models.AdminNotification{}).Error
}
