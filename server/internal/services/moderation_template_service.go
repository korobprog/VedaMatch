package services

import (
	"errors"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

type ModerationTemplateService struct {
	db *gorm.DB
}

func NewModerationTemplateService(db *gorm.DB) *ModerationTemplateService {
	return &ModerationTemplateService{db: db}
}

// CreateTemplate creates a new email/notification template
func (s *ModerationTemplateService) CreateTemplate(req *models.ModerationTemplateCreateRequest) (*models.ModerationTemplate, error) {
	template := &models.ModerationTemplate{
		Name:     req.Name,
		Subject:  req.Subject,
		Body:     req.Body,
		Type:     req.Type,
		IsActive: true,
	}

	if err := s.db.Create(template).Error; err != nil {
		return nil, err
	}

	return template, nil
}

// GetTemplates returns all templates
func (s *ModerationTemplateService) GetTemplates() ([]models.ModerationTemplate, error) {
	var templates []models.ModerationTemplate
	if err := s.db.Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

// GetTemplateByID returns a template by ID
func (s *ModerationTemplateService) GetTemplateByID(id uint) (*models.ModerationTemplate, error) {
	var template models.ModerationTemplate
	if err := s.db.First(&template, id).Error; err != nil {
		return nil, err
	}
	return &template, nil
}

// UpdateTemplate updates an existing template
func (s *ModerationTemplateService) UpdateTemplate(id uint, req *models.ModerationTemplateUpdateRequest) (*models.ModerationTemplate, error) {
	template, err := s.GetTemplateByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		template.Name = req.Name
	}
	if req.Subject != "" {
		template.Subject = req.Subject
	}
	if req.Body != "" {
		template.Body = req.Body
	}
	if req.IsActive != nil {
		template.IsActive = *req.IsActive
	}

	if err := s.db.Save(template).Error; err != nil {
		return nil, err
	}

	return template, nil
}

// DeleteTemplate deletes a template
func (s *ModerationTemplateService) DeleteTemplate(id uint) error {
	return s.db.Delete(&models.ModerationTemplate{}, id).Error
}

// BroadcastEmail mock function - in real world this would send emails
// This is a placeholder for the broadcast functionality
func (s *ModerationTemplateService) BroadcastEmail(templateID uint, recipientFilter string) (int, error) {
	template, err := s.GetTemplateByID(templateID)
	if err != nil {
		return 0, err
	}

	// 1. Fetch Recipients based on filter
	// var users []models.User
	// query := s.db.Model(&models.User{})

	switch recipientFilter {
	case "all_organizers":
		// Example logic: Users who have created at least one yatra
		// For simplicity, let's assume all users for this MVP mock
		// In production: join with yatras table or check role
	case "active_organizers":
		// Users with active yatras
	case "blocked_organizers":
		// Users in blocked table
	}

	// Mocking the fetch
	// if err := query.Find(&users).Error; err != nil { return 0, err }

	// 2. Mock Send Loop
	// count := 0
	// for _, user := range users {
	//    sendEmail(user.Email, template.Subject, template.Body)
	//    count++
	// }

	// For MVP, we just return a success count without actually spamming real emails
	// We'll trust the AdminNotificationService is working, but for mass email
	// we usually use an external provider (SendGrid, AWS SES).
	// Here we return a dummy count.

	if !template.IsActive {
		return 0, errors.New("template is not active")
	}

	return 42, nil // Mock: "Sent to 42 users"
}
