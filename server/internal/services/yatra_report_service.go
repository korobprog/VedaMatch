package services

import (
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// YatraReportService handles yatra and organizer reports
type YatraReportService struct {
	db                  *gorm.DB
	notificationService *AdminNotificationService
}

// NewYatraReportService creates a new report service
func NewYatraReportService(db *gorm.DB, notificationService *AdminNotificationService) *YatraReportService {
	return &YatraReportService{
		db:                  db,
		notificationService: notificationService,
	}
}

// CreateReport creates a new report
func (s *YatraReportService) CreateReport(userID uint, req models.YatraReportCreateRequest) (*models.YatraReport, error) {
	// Validate target exists
	switch req.TargetType {
	case models.ReportTargetYatra:
		var yatra models.Yatra
		if err := s.db.First(&yatra, req.TargetID).Error; err != nil {
			return nil, errors.New("yatra not found")
		}
	case models.ReportTargetOrganizer:
		var user models.User
		if err := s.db.First(&user, req.TargetID).Error; err != nil {
			return nil, errors.New("organizer not found")
		}
	default:
		return nil, errors.New("invalid target type")
	}

	// Check if user already reported this target
	var existing models.YatraReport
	err := s.db.Where("reporter_user_id = ? AND target_type = ? AND target_id = ? AND status IN ?",
		userID, req.TargetType, req.TargetID,
		[]models.YatraReportStatus{models.ReportStatusPending, models.ReportStatusReviewing}).
		First(&existing).Error

	if err == nil {
		return nil, errors.New("you have already reported this")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	report := &models.YatraReport{
		ReporterUserID: userID,
		TargetType:     req.TargetType,
		TargetID:       req.TargetID,
		Reason:         req.Reason,
		Description:    req.Description,
		Status:         models.ReportStatusPending,
	}

	if err := s.db.Create(report).Error; err != nil {
		return nil, err
	}

	// Preload reporter for response
	s.db.Preload("Reporter").First(report, report.ID)

	// Send notification to admins
	go s.notifyAdmins(report)

	return report, nil
}

// GetAllReports returns all reports with filters
func (s *YatraReportService) GetAllReports(filters models.YatraReportFilters) ([]models.YatraReport, int64, error) {
	query := s.db.Model(&models.YatraReport{})

	// Apply filters
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.TargetType != "" {
		query = query.Where("target_type = ?", filters.TargetType)
	}
	if filters.TargetID != nil {
		query = query.Where("target_id = ?", *filters.TargetID)
	}
	if filters.ReporterID != nil {
		query = query.Where("reporter_user_id = ?", *filters.ReporterID)
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

	var reports []models.YatraReport
	err := query.Preload("Reporter").
		Preload("Resolver").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&reports).Error

	return reports, total, err
}

// GetReport returns a single report with details
func (s *YatraReportService) GetReport(reportID uint) (*models.YatraReport, error) {
	var report models.YatraReport
	err := s.db.Preload("Reporter").
		Preload("Resolver").
		First(&report, reportID).Error

	if err != nil {
		return nil, err
	}

	// Load target details
	if report.TargetType == models.ReportTargetYatra {
		var yatra models.Yatra
		if err := s.db.Preload("Organizer").First(&yatra, report.TargetID).Error; err == nil {
			// Attach yatra info to report (you can add a field in response DTO)
			log.Printf("[ReportService] Report %d is about yatra: %s", report.ID, yatra.Title)
		}
	}

	return &report, nil
}

// UpdateReport updates report status and admin notes
func (s *YatraReportService) UpdateReport(reportID, adminID uint, req models.YatraReportUpdateRequest) (*models.YatraReport, error) {
	var report models.YatraReport
	if err := s.db.First(&report, reportID).Error; err != nil {
		return nil, errors.New("report not found")
	}

	updates := map[string]interface{}{}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.AdminNotes != "" {
		updates["admin_notes"] = req.AdminNotes
	}

	if err := s.db.Model(&report).Updates(updates).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Reporter").Preload("Resolver").First(&report, reportID)
	return &report, nil
}

// ResolveReport marks a report as resolved
func (s *YatraReportService) ResolveReport(reportID, adminID uint, notes string) error {
	var report models.YatraReport
	if err := s.db.First(&report, reportID).Error; err != nil {
		return errors.New("report not found")
	}

	now := time.Now()
	if err := s.db.Model(&report).Updates(map[string]interface{}{
		"status":      models.ReportStatusResolved,
		"admin_notes": notes,
		"resolved_by": adminID,
		"resolved_at": now,
	}).Error; err != nil {
		return err
	}

	// TODO: Send notification to reporter
	log.Printf("[ReportService] Report %d resolved by admin %d", reportID, adminID)

	return nil
}

// DismissReport marks a report as dismissed
func (s *YatraReportService) DismissReport(reportID, adminID uint, reason string) error {
	var report models.YatraReport
	if err := s.db.First(&report, reportID).Error; err != nil {
		return errors.New("report not found")
	}

	now := time.Now()
	if err := s.db.Model(&report).Updates(map[string]interface{}{
		"status":      models.ReportStatusDismissed,
		"admin_notes": reason,
		"resolved_by": adminID,
		"resolved_at": now,
	}).Error; err != nil {
		return err
	}

	log.Printf("[ReportService] Report %d dismissed by admin %d", reportID, adminID)
	return nil
}

// GetPendingReportsCount returns count of pending reports
func (s *YatraReportService) GetPendingReportsCount() (int64, error) {
	var count int64
	err := s.db.Model(&models.YatraReport{}).
		Where("status IN ?", []models.YatraReportStatus{
			models.ReportStatusPending,
			models.ReportStatusReviewing,
		}).Count(&count).Error
	return count, err
}

// notifyAdmins sends notification to admins about new report
func (s *YatraReportService) notifyAdmins(report *models.YatraReport) {
	if s.notificationService == nil {
		return
	}

	var message string
	var notifType models.AdminNotificationType
	linkTo := fmt.Sprintf("/admin/yatra/reports/%d", report.ID)

	if report.TargetType == models.ReportTargetYatra {
		notifType = models.NotificationYatraReport
		message = fmt.Sprintf("New report on yatra #%d: %s", report.TargetID, report.Reason)
	} else {
		notifType = models.NotificationOrganizerReport
		message = fmt.Sprintf("New report on organizer #%d: %s", report.TargetID, report.Reason)
	}

	req := models.AdminNotificationCreateRequest{
		Type:     notifType,
		Message:  message,
		LinkTo:   linkTo,
		ReportID: &report.ID,
	}

	if err := s.notificationService.CreateNotification(req); err != nil {
		log.Printf("[ReportService] Failed to create admin notification: %v", err)
	}
}
