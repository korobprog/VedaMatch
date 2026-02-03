package services

import (
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// YatraAdminService handles admin operations on yatras
type YatraAdminService struct {
	db                  *gorm.DB
	yatraService        *YatraService
	notificationService *AdminNotificationService
}

// NewYatraAdminService creates a new yatra admin service
func NewYatraAdminService(db *gorm.DB, yatraService *YatraService, notificationService *AdminNotificationService) *YatraAdminService {
	return &YatraAdminService{
		db:                  db,
		yatraService:        yatraService,
		notificationService: notificationService,
	}
}

// AdminYatraFilters for filtering yatras in admin panel
type AdminYatraFilters struct {
	models.YatraFilters
	IncludeDrafts    bool
	IncludeCancelled bool
	IncludeCompleted bool
	ReportedOnly     bool
}

// YatraStats contains overall statistics about yatras
type YatraStats struct {
	TotalYatras       int     `json:"totalYatras"`
	DraftYatras       int     `json:"draftYatras"`
	OpenYatras        int     `json:"openYatras"`
	ActiveYatras      int     `json:"activeYatras"`
	CompletedYatras   int     `json:"completedYatras"`
	CancelledYatras   int     `json:"cancelledYatras"`
	TotalOrganizers   int     `json:"totalOrganizers"`
	TotalParticipants int     `json:"totalParticipants"`
	AverageRating     float64 `json:"averageRating"`
	PendingReports    int     `json:"pendingReports"`
}

// GetAllYatras returns all yatras (including drafts, cancelled) with admin filters
func (s *YatraAdminService) GetAllYatras(filters AdminYatraFilters) ([]models.Yatra, int64, error) {
	query := s.db.Model(&models.Yatra{})

	// Apply standard filters
	if filters.Theme != "" {
		query = query.Where("theme = ?", filters.Theme)
	}
	if filters.OrganizerID != nil {
		query = query.Where("organizer_id = ?", *filters.OrganizerID)
	}
	if filters.City != "" {
		query = query.Where("start_city ILIKE ? OR end_city ILIKE ?",
			"%"+filters.City+"%", "%"+filters.City+"%")
	}
	if filters.Search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%")
	}

	// Admin-specific filters
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	} else {
		// Include all statuses for admin (unlike public API)
		var allowedStatuses []models.YatraStatus

		if filters.IncludeDrafts {
			allowedStatuses = append(allowedStatuses, models.YatraStatusDraft)
		}
		if filters.IncludeCancelled {
			allowedStatuses = append(allowedStatuses, models.YatraStatusCancelled)
		}
		if filters.IncludeCompleted {
			allowedStatuses = append(allowedStatuses, models.YatraStatusCompleted)
		}

		// Always include open and active
		allowedStatuses = append(allowedStatuses,
			models.YatraStatusOpen,
			models.YatraStatusFull,
			models.YatraStatusActive,
		)

		if len(allowedStatuses) > 0 {
			query = query.Where("status IN ?", allowedStatuses)
		}
	}

	if filters.ReportedOnly {
		query = query.Where("id IN (?)",
			s.db.Model(&models.YatraReport{}).
				Select("target_id").
				Where("target_type = ? AND status IN ?",
					models.ReportTargetYatra,
					[]models.YatraReportStatus{models.ReportStatusPending, models.ReportStatusReviewing}))
	}

	// Count total
	var total int64
	query.Count(&total)

	// Pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var yatras []models.Yatra
	err := query.Preload("Organizer").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&yatras).Error

	return yatras, total, err
}

// GetYatraStats returns overall statistics
func (s *YatraAdminService) GetYatraStats() (*YatraStats, error) {
	stats := &YatraStats{}

	// Count by status
	s.db.Model(&models.Yatra{}).Count(new(int64)).Scan(&stats.TotalYatras)
	s.db.Model(&models.Yatra{}).Where("status = ?", models.YatraStatusDraft).Count(new(int64)).Scan(&stats.DraftYatras)
	s.db.Model(&models.Yatra{}).Where("status = ?", models.YatraStatusOpen).Count(new(int64)).Scan(&stats.OpenYatras)
	s.db.Model(&models.Yatra{}).Where("status = ?", models.YatraStatusActive).Count(new(int64)).Scan(&stats.ActiveYatras)
	s.db.Model(&models.Yatra{}).Where("status = ?", models.YatraStatusCompleted).Count(new(int64)).Scan(&stats.CompletedYatras)
	s.db.Model(&models.Yatra{}).Where("status = ?", models.YatraStatusCancelled).Count(new(int64)).Scan(&stats.CancelledYatras)

	// Count unique organizers
	s.db.Model(&models.Yatra{}).Distinct("organizer_id").Count(new(int64)).Scan(&stats.TotalOrganizers)

	// Count total approved participants
	s.db.Model(&models.YatraParticipant{}).
		Where("status = ?", models.YatraParticipantApproved).
		Count(new(int64)).Scan(&stats.TotalParticipants)

	// Average rating
	var avgResult struct {
		Avg float64
	}
	s.db.Model(&models.YatraReview{}).
		Select("COALESCE(AVG(overall_rating), 0) as avg").
		Scan(&avgResult)
	stats.AverageRating = avgResult.Avg

	// Pending reports
	s.db.Model(&models.YatraReport{}).
		Where("status IN ?", []models.YatraReportStatus{models.ReportStatusPending, models.ReportStatusReviewing}).
		Count(new(int64)).Scan(&stats.PendingReports)

	return stats, nil
}

// ApproveYatra approves a draft yatra (admin override)
func (s *YatraAdminService) ApproveYatra(yatraID, adminID uint, notes string) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return errors.New("yatra not found")
	}

	if yatra.Status != models.YatraStatusDraft {
		return errors.New("only draft yatras can be approved")
	}

	// Update to open status
	if err := s.db.Model(&yatra).Update("status", models.YatraStatusOpen).Error; err != nil {
		return err
	}

	log.Printf("[YatraAdminService] Admin %d approved yatra %d", adminID, yatraID)

	// TODO: Send notification to organizer
	// template: "yatra_approved"

	return nil
}

// RejectYatra rejects a draft yatra with reason
func (s *YatraAdminService) RejectYatra(yatraID, adminID uint, reason string) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return errors.New("yatra not found")
	}

	// Change status to cancelled
	if err := s.db.Model(&yatra).Update("status", models.YatraStatusCancelled).Error; err != nil {
		return err
	}

	log.Printf("[YatraAdminService] Admin %d rejected yatra %d: %s", adminID, yatraID, reason)

	// TODO: Send notification to organizer
	// template: "yatra_rejected" with {{reason}}

	return nil
}

// ForceCancelYatra cancels a yatra regardless of status (admin power)
func (s *YatraAdminService) ForceCancelYatra(yatraID, adminID uint, reason string) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return errors.New("yatra not found")
	}

	if yatra.Status == models.YatraStatusCancelled || yatra.Status == models.YatraStatusCompleted {
		return errors.New("yatra is already cancelled or completed")
	}

	if err := s.db.Model(&yatra).Update("status", models.YatraStatusCancelled).Error; err != nil {
		return err
	}

	log.Printf("[YatraAdminService] Admin %d force-cancelled yatra %d: %s", adminID, yatraID, reason)

	// Notify organizer and all participants
	// TODO: Send bulk notification

	// Check if cancelled close to start date
	daysUntilStart := int(time.Until(yatra.StartDate).Hours() / 24)
	if daysUntilStart > 0 && daysUntilStart < 7 {
		// Create high-priority notification
		if s.notificationService != nil {
			s.notificationService.CreateNotification(models.AdminNotificationCreateRequest{
				Type:    models.NotificationYatraCancelled,
				Message: fmt.Sprintf("Yatra '%s' cancelled %d days before start", yatra.Title, daysUntilStart),
				LinkTo:  fmt.Sprintf("/admin/yatra/%d", yatraID),
				YatraID: &yatraID,
				UserID:  &yatra.OrganizerID,
			})
		}
	}

	return nil
}

// UpdateYatra allows admin to edit any yatra field
func (s *YatraAdminService) UpdateYatra(yatraID, adminID uint, updates map[string]interface{}) (*models.Yatra, error) {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return nil, errors.New("yatra not found")
	}

	// Admin can update anything (no ownership check)
	if err := s.db.Model(&yatra).Updates(updates).Error; err != nil {
		return nil, err
	}

	log.Printf("[YatraAdminService] Admin %d updated yatra %d", adminID, yatraID)

	s.db.Preload("Organizer").First(&yatra, yatraID)
	return &yatra, nil
}

// RemoveParticipant removes a participant (admin can remove anyone)
func (s *YatraAdminService) RemoveParticipant(yatraID, participantID, adminID uint, reason string) error {
	var participant models.YatraParticipant
	if err := s.db.First(&participant, participantID).Error; err != nil {
		return errors.New("participant not found")
	}

	if participant.YatraID != yatraID {
		return errors.New("participant does not belong to this yatra")
	}

	// Delete participant
	if err := s.db.Delete(&participant).Error; err != nil {
		return err
	}

	// Remove from chat room
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err == nil && yatra.ChatRoomID != nil {
		s.db.Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, participant.UserID).
			Delete(&models.RoomMember{})
	}

	// Update participant count
	s.yatraService.updateParticipantCount(yatraID)

	log.Printf("[YatraAdminService] Admin %d removed participant %d from yatra %d: %s",
		adminID, participantID, yatraID, reason)

	return nil
}

// GetYatraParticipants returns all participants of a yatra (admin view)
func (s *YatraAdminService) GetYatraParticipants(yatraID uint) ([]models.YatraParticipant, error) {
	var participants []models.YatraParticipant
	err := s.db.Where("yatra_id = ?", yatraID).
		Preload("User").
		Order("created_at ASC").
		Find(&participants).Error

	return participants, err
}
