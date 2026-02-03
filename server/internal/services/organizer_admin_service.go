package services

import (
	"errors"
	"log"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// OrganizerAdminService handles organizer administration
type OrganizerAdminService struct {
	db                  *gorm.DB
	notificationService *AdminNotificationService
}

// NewOrganizerAdminService creates a new organizer admin service
func NewOrganizerAdminService(db *gorm.DB, notificationService *AdminNotificationService) *OrganizerAdminService {
	return &OrganizerAdminService{
		db:                  db,
		notificationService: notificationService,
	}
}

// OrganizerFilters for filtering organizers
type OrganizerFilters struct {
	BlockedOnly bool
	TopRated    bool
	MinYatras   int
	Page        int
	Limit       int
}

// OrganizerDetailedStats contains detailed statistics for an organizer
type OrganizerDetailedStats struct {
	models.OrganizerStats
	TotalReports    int    `json:"totalReports"`
	PendingReports  int    `json:"pendingReports"`
	IsBlocked       bool   `json:"isBlocked"`
	BlockReason     string `json:"blockReason"`
	TotalYatras     int    `json:"totalYatras"`
	ActiveYatras    int    `json:"activeYatras"`
	CompletedYatras int    `json:"completedYatras"`
	CancelledYatras int    `json:"cancelledYatras"`
}

// GetOrganizers returns list of organizers with stats
func (s *OrganizerAdminService) GetOrganizers(filters OrganizerFilters) ([]models.User, int64, error) {
	query := s.db.Model(&models.User{}).
		Select("users.*, COUNT(DISTINCT yatras.id) as yatra_count").
		Joins("LEFT JOIN yatras ON yatras.organizer_id = users.id").
		Group("users.id").
		Having("COUNT(DISTINCT yatras.id) > ?", filters.MinYatras)

	if filters.BlockedOnly {
		query = query.Where("users.id IN (?)",
			s.db.Model(&models.OrganizerBlock{}).
				Select("user_id").
				Where("is_active = ? AND (expires_at IS NULL OR expires_at > ?)", true, time.Now()))
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

	var organizers []models.User
	err := query.Order("yatra_count DESC").
		Offset(offset).Limit(limit).
		Find(&organizers).Error

	return organizers, total, err
}

// GetOrganizerStats returns detailed statistics for an organizer
func (s *OrganizerAdminService) GetOrganizerStats(userID uint) (*OrganizerDetailedStats, error) {
	stats := &OrganizerDetailedStats{}

	// Get basic yatra stats count по статусам
	s.db.Model(&models.Yatra{}).
		Where("organizer_id = ?", userID).
		Count(new(int64)).Scan(&stats.TotalYatras)

	s.db.Model(&models.Yatra{}).
		Where("organizer_id = ? AND status = ?", userID, models.YatraStatusOpen).
		Count(new(int64)).Scan(&stats.ActiveYatras)

	s.db.Model(&models.Yatra{}).
		Where("organizer_id = ? AND status = ?", userID, models.YatraStatusCompleted).
		Count(new(int64)).Scan(&stats.CompletedYatras)

	s.db.Model(&models.Yatra{}).
		Where("organizer_id = ? AND status = ?", userID, models.YatraStatusCancelled).
		Count(new(int64)).Scan(&stats.CancelledYatras)

	// Get ratings
	var avgResult struct {
		Avg float64
	}
	s.db.Model(&models.YatraReview{}).
		Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
		Where("yatras.organizer_id = ?", userID).
		Select("COALESCE(AVG(yatra_reviews.organizer_rating), 0) as avg").
		Scan(&avgResult)
	stats.AverageRating = avgResult.Avg

	// Get participants
	var participantCount int64
	s.db.Model(&models.YatraParticipant{}).
		Joins("JOIN yatras ON yatras.id = yatra_participants.yatra_id").
		Where("yatras.organizer_id = ? AND yatra_participants.status = ?",
			userID, models.YatraParticipantApproved).
		Count(&participantCount)
	stats.TotalParticipants = int(participantCount)

	// Get reports count
	var totalReports, pendingReports int64
	s.db.Model(&models.YatraReport{}).
		Where("target_type = ? AND target_id = ?", models.ReportTargetOrganizer, userID).
		Count(&totalReports)
	stats.TotalReports = int(totalReports)

	s.db.Model(&models.YatraReport{}).
		Where("target_type = ? AND target_id = ? AND status IN ?",
			models.ReportTargetOrganizer, userID,
			[]models.YatraReportStatus{models.ReportStatusPending, models.ReportStatusReviewing}).
		Count(&pendingReports)
	stats.PendingReports = int(pendingReports)

	// Check if blocked
	var block models.OrganizerBlock
	err := s.db.Where("user_id = ? AND is_active = ?", userID, true).
		First(&block).Error

	if err == nil && !block.IsExpired() {
		stats.IsBlocked = true
		stats.BlockReason = block.Reason
	}

	stats.OrganizedCount = stats.CompletedYatras

	return stats, nil
}

// BlockOrganizer blocks an organizer from creating yatras
func (s *OrganizerAdminService) BlockOrganizer(userID, adminID uint, reason string, durationDays *int) error {
	// Check if already blocked
	var existing models.OrganizerBlock
	err := s.db.Where("user_id = ? AND is_active = ?", userID, true).First(&existing).Error

	if err == nil && !existing.IsExpired() {
		return errors.New("organizer is already blocked")
	}

	// Calculate expiration
	var expiresAt *time.Time
	if durationDays != nil && *durationDays > 0 {
		expiry := time.Now().AddDate(0, 0, *durationDays)
		expiresAt = &expiry
	}

	block := &models.OrganizerBlock{
		UserID:    userID,
		BlockedBy: adminID,
		Reason:    reason,
		ExpiresAt: expiresAt,
		IsActive:  true,
	}

	if err := s.db.Create(block).Error; err != nil {
		return err
	}

	// Cancel all open/draft yatras
	s.db.Model(&models.Yatra{}).
		Where("organizer_id = ? AND status IN ?", userID,
			[]models.YatraStatus{models.YatraStatusDraft, models.YatraStatusOpen}).
		Update("status", models.YatraStatusCancelled)

	log.Printf("[OrganizerAdminService] Blocked organizer %d by admin %d", userID, adminID)

	// Send notification to organizer (TODO: implement email/push)

	return nil
}

// UnblockOrganizer removes the block from an organizer
func (s *OrganizerAdminService) UnblockOrganizer(userID, adminID uint) error {
	result := s.db.Model(&models.OrganizerBlock{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Updates(map[string]interface{}{
			"is_active": false,
		})

	if result.RowsAffected == 0 {
		return errors.New("organizer is not blocked")
	}

	log.Printf("[OrganizerAdminService] Unblocked organizer %d by admin %d", userID, adminID)
	return nil
}

// IsBlocked checks if an organizer is currently blocked
func (s *OrganizerAdminService) IsBlocked(userID uint) (bool, *models.OrganizerBlock, error) {
	var block models.OrganizerBlock
	err := s.db.Where("user_id = ? AND is_active = ?", userID, true).First(&block).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, nil
		}
		return false, nil, err
	}

	if block.IsExpired() {
		// Auto-deactivate expired block
		s.db.Model(&block).Update("is_active", false)
		return false, nil, nil
	}

	return true, &block, nil
}
