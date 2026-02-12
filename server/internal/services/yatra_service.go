package services

import (
	"errors"
	"log"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// YatraService handles yatra (pilgrimage) and shelter operations
type YatraService struct {
	db         *gorm.DB
	mapService *MapService
}

// NewYatraService creates a new yatra service instance
func NewYatraService(db *gorm.DB, mapService *MapService) *YatraService {
	return &YatraService{
		db:         db,
		mapService: mapService,
	}
}

// ==================== YATRA CRUD ====================

// CreateYatra creates a new yatra/tour
func (s *YatraService) CreateYatra(organizerID uint, req models.YatraCreateRequest) (*models.Yatra, error) {
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.StartDate = strings.TrimSpace(req.StartDate)
	req.EndDate = strings.TrimSpace(req.EndDate)
	req.StartCity = strings.TrimSpace(req.StartCity)
	req.StartAddress = strings.TrimSpace(req.StartAddress)
	req.EndCity = strings.TrimSpace(req.EndCity)
	req.Requirements = strings.TrimSpace(req.Requirements)
	req.Accommodation = strings.TrimSpace(req.Accommodation)
	req.Transportation = strings.TrimSpace(req.Transportation)
	req.Language = strings.TrimSpace(req.Language)
	req.CoverImageURL = strings.TrimSpace(req.CoverImageURL)
	if req.Title == "" {
		return nil, errors.New("title is required")
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start date format")
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end date format")
	}

	if endDate.Before(startDate) {
		return nil, errors.New("end date must be after start date")
	}
	if req.MaxParticipants < 0 || req.MinParticipants < 0 {
		return nil, errors.New("participant limits must be non-negative")
	}

	// Geocode start location if needed
	startLat := req.StartLatitude
	startLng := req.StartLongitude
	if s.mapService != nil && (startLat == nil || startLng == nil) && req.StartCity != "" {
		if geocoded, err := s.mapService.GeocodeCity(req.StartCity); err == nil {
			startLat = &geocoded.Latitude
			startLng = &geocoded.Longitude
		}
	}

	// Geocode end location if needed
	endLat := req.EndLatitude
	endLng := req.EndLongitude
	if s.mapService != nil && (endLat == nil || endLng == nil) && req.EndCity != "" {
		if geocoded, err := s.mapService.GeocodeCity(req.EndCity); err == nil {
			endLat = &geocoded.Latitude
			endLng = &geocoded.Longitude
		}
	}

	yatra := &models.Yatra{
		OrganizerID:     organizerID,
		Title:           req.Title,
		Description:     req.Description,
		Theme:           req.Theme,
		StartDate:       startDate,
		EndDate:         endDate,
		StartCity:       req.StartCity,
		StartAddress:    req.StartAddress,
		StartLatitude:   startLat,
		StartLongitude:  startLng,
		EndCity:         req.EndCity,
		EndLatitude:     endLat,
		EndLongitude:    endLng,
		RoutePoints:     req.RoutePoints,
		MaxParticipants: req.MaxParticipants,
		MinParticipants: req.MinParticipants,
		Requirements:    req.Requirements,
		CostEstimate:    req.CostEstimate,
		Accommodation:   req.Accommodation,
		Transportation:  req.Transportation,
		Language:        req.Language,
		CoverImageURL:   req.CoverImageURL,
		Status:          models.YatraStatusOpen, // Default to open so it appears in lists
	}

	if yatra.MaxParticipants == 0 {
		yatra.MaxParticipants = 20
	}
	if yatra.MinParticipants == 0 {
		yatra.MinParticipants = 1
	}
	if yatra.MinParticipants > yatra.MaxParticipants {
		return nil, errors.New("min participants cannot exceed max participants")
	}
	if yatra.Language == "" {
		yatra.Language = "en"
	}

	if err := s.db.Create(yatra).Error; err != nil {
		return nil, err
	}

	return yatra, nil
}

// GetYatra retrieves a yatra by ID with organizer info
func (s *YatraService) GetYatra(yatraID uint) (*models.Yatra, error) {
	var yatra models.Yatra
	err := s.db.Preload("Organizer").
		Preload("Participants", "status = ?", models.YatraParticipantApproved).
		Preload("Participants.User").
		First(&yatra, yatraID).Error
	if err != nil {
		return nil, err
	}

	// Increment views
	if err := s.db.Model(&yatra).UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error; err != nil {
		log.Printf("[YatraService] Failed to increment yatra views yatra_id=%d: %v", yatraID, err)
	}

	return &yatra, nil
}

// ListYatras returns a paginated list of yatras
func (s *YatraService) ListYatras(filters models.YatraFilters) ([]models.Yatra, int64, error) {
	filters.City = strings.TrimSpace(filters.City)
	filters.Language = strings.TrimSpace(filters.Language)
	filters.Search = strings.TrimSpace(filters.Search)
	filters.StartAfter = strings.TrimSpace(filters.StartAfter)
	filters.StartBefore = strings.TrimSpace(filters.StartBefore)

	query := s.db.Model(&models.Yatra{})

	// Apply filters
	if filters.Theme != "" {
		query = query.Where("theme = ?", filters.Theme)
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	} else {
		// By default show only open yatras
		query = query.Where("status IN ?", []models.YatraStatus{
			models.YatraStatusOpen,
			models.YatraStatusFull,
		})
	}
	if filters.OrganizerID != nil {
		query = query.Where("organizer_id = ?", *filters.OrganizerID)
	}
	if filters.City != "" {
		query = query.Where("start_city ILIKE ? OR end_city ILIKE ?",
			"%"+filters.City+"%", "%"+filters.City+"%")
	}
	if filters.Language != "" {
		query = query.Where("language = ?", filters.Language)
	}
	if filters.Search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%")
	}
	if filters.StartAfter != "" {
		if date, err := time.Parse("2006-01-02", filters.StartAfter); err == nil {
			query = query.Where("start_date >= ?", date)
		}
	}
	if filters.StartBefore != "" {
		if date, err := time.Parse("2006-01-02", filters.StartBefore); err == nil {
			query = query.Where("start_date <= ?", date)
		}
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var yatras []models.Yatra
	err := query.Preload("Organizer").
		Order("start_date ASC").
		Offset(offset).Limit(limit).
		Find(&yatras).Error

	return yatras, total, err
}

// UpdateYatra updates a yatra
func (s *YatraService) UpdateYatra(yatraID uint, organizerID uint, updates map[string]interface{}) (*models.Yatra, error) {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return nil, err
	}

	// Check ownership
	if yatra.OrganizerID != organizerID {
		return nil, errors.New("not authorized to update this yatra")
	}

	if err := s.db.Model(&yatra).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &yatra, nil
}

// PublishYatra changes status from draft to open
func (s *YatraService) PublishYatra(yatraID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized")
	}

	if yatra.Status != models.YatraStatusDraft {
		return errors.New("yatra is not in draft status")
	}

	return s.db.Model(&yatra).Update("status", models.YatraStatusOpen).Error
}

// DeleteYatra soft deletes a yatra
func (s *YatraService) DeleteYatra(yatraID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized to delete this yatra")
	}

	return s.db.Delete(&yatra).Error
}

// ==================== PARTICIPANTS ====================

// JoinYatra creates a join request for a yatra
func (s *YatraService) JoinYatra(yatraID uint, userID uint, req models.YatraJoinRequest) (*models.YatraParticipant, error) {
	var participant models.YatraParticipant
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		// Check if yatra is open
		if yatra.Status != models.YatraStatusOpen {
			return errors.New("yatra is not accepting participants")
		}

		// Check if already a participant
		var existing models.YatraParticipant
		if err := tx.Where("yatra_id = ? AND user_id = ?", yatraID, userID).First(&existing).Error; err == nil {
			return errors.New("already applied to this yatra")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		// Check if user is the organizer
		if yatra.OrganizerID == userID {
			return errors.New("organizer cannot join their own yatra")
		}

		var approvedCount int64
		if err := tx.Model(&models.YatraParticipant{}).
			Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
			Count(&approvedCount).Error; err != nil {
			return err
		}
		if int(approvedCount) >= yatra.MaxParticipants {
			_ = tx.Model(&models.Yatra{}).Where("id = ? AND status = ?", yatraID, models.YatraStatusOpen).
				Update("status", models.YatraStatusFull).Error
			return errors.New("yatra is full")
		}

		participant = models.YatraParticipant{
			YatraID:          yatraID,
			UserID:           userID,
			Status:           models.YatraParticipantPending,
			Role:             models.YatraRoleMember,
			Message:          strings.TrimSpace(req.Message),
			EmergencyContact: strings.TrimSpace(req.EmergencyContact),
		}

		return tx.Create(&participant).Error
	})
	if err != nil {
		return nil, err
	}

	return &participant, nil
}

// ApproveParticipant approves a participant request
func (s *YatraService) ApproveParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var approvedUserID uint
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		if yatra.OrganizerID != organizerID {
			return errors.New("not authorized")
		}

		var participant models.YatraParticipant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&participant, participantID).Error; err != nil {
			return err
		}

		if participant.YatraID != yatraID {
			return errors.New("participant does not belong to this yatra")
		}
		if participant.Status == models.YatraParticipantApproved {
			approvedUserID = participant.UserID
			return nil
		}

		var approvedCount int64
		if err := tx.Model(&models.YatraParticipant{}).
			Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
			Count(&approvedCount).Error; err != nil {
			return err
		}
		if int(approvedCount) >= yatra.MaxParticipants {
			_ = tx.Model(&models.Yatra{}).Where("id = ? AND status = ?", yatraID, models.YatraStatusOpen).
				Update("status", models.YatraStatusFull).Error
			return errors.New("yatra is full")
		}

		now := time.Now()
		if err := tx.Model(&participant).Updates(map[string]interface{}{
			"status":      models.YatraParticipantApproved,
			"reviewed_at": now,
			"reviewed_by": organizerID,
		}).Error; err != nil {
			return err
		}
		approvedUserID = participant.UserID
		return nil
	})
	if err != nil {
		return err
	}

	// Update participant count
	s.updateParticipantCount(yatraID)

	// Create or add to chat room
	if approvedUserID != 0 {
		s.addParticipantToChat(yatraID, approvedUserID)
	}

	return nil
}

// RejectParticipant rejects a participant request
func (s *YatraService) RejectParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized")
	}

	var participant models.YatraParticipant
	if err := s.db.First(&participant, participantID).Error; err != nil {
		return err
	}
	if participant.YatraID != yatraID {
		return errors.New("participant does not belong to this yatra")
	}

	now := time.Now()
	return s.db.Model(&models.YatraParticipant{}).Where("id = ? AND yatra_id = ?", participantID, yatraID).
		Updates(map[string]interface{}{
			"status":      models.YatraParticipantRejected,
			"reviewed_at": now,
			"reviewed_by": organizerID,
		}).Error
}

// RemoveParticipant removes a participant from the yatra
func (s *YatraService) RemoveParticipant(yatraID uint, participantID uint, organizerID uint) error {
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return err
	}

	if yatra.OrganizerID != organizerID {
		return errors.New("not authorized")
	}

	var participant models.YatraParticipant
	if err := s.db.First(&participant, participantID).Error; err != nil {
		return err
	}
	if participant.YatraID != yatraID {
		return errors.New("participant does not belong to this yatra")
	}

	// Delete from yatra participants
	if err := s.db.Delete(&participant).Error; err != nil {
		return err
	}

	// Remove from chat room
	if yatra.ChatRoomID != nil {
		s.db.Where("room_id = ? AND user_id = ?", *yatra.ChatRoomID, participant.UserID).
			Delete(&models.RoomMember{})
	}

	s.updateParticipantCount(yatraID)
	return nil
}

// GetPendingParticipants returns pending join requests
func (s *YatraService) GetPendingParticipants(yatraID uint) ([]models.YatraParticipant, error) {
	var participants []models.YatraParticipant
	err := s.db.Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantPending).
		Preload("User").
		Order("created_at ASC").
		Find(&participants).Error
	return participants, err
}

// GetMyYatras returns yatras where user is organizer or participant
func (s *YatraService) GetMyYatras(userID uint) (organized []models.Yatra, participating []models.Yatra, err error) {
	// Organized yatras
	err = s.db.Where("organizer_id = ?", userID).
		Order("start_date DESC").
		Find(&organized).Error
	if err != nil {
		return
	}

	// Participating yatras
	var participantRecords []models.YatraParticipant
	err = s.db.Where("user_id = ? AND status = ?", userID, models.YatraParticipantApproved).
		Find(&participantRecords).Error
	if err != nil {
		return
	}

	if len(participantRecords) > 0 {
		var yatraIDs []uint
		for _, p := range participantRecords {
			yatraIDs = append(yatraIDs, p.YatraID)
		}
		err = s.db.Where("id IN ?", yatraIDs).
			Order("start_date DESC").
			Find(&participating).Error
	}

	return
}

// ==================== HELPERS ====================

func (s *YatraService) updateParticipantCount(yatraID uint) {
	var count int64
	if err := s.db.Model(&models.YatraParticipant{}).
		Where("yatra_id = ? AND status = ?", yatraID, models.YatraParticipantApproved).
		Count(&count).Error; err != nil {
		log.Printf("[YatraService] Failed to count participants yatra_id=%d: %v", yatraID, err)
		return
	}

	if err := s.db.Model(&models.Yatra{}).Where("id = ?", yatraID).
		Update("participant_count", count).Error; err != nil {
		log.Printf("[YatraService] Failed to update participant count yatra_id=%d: %v", yatraID, err)
		return
	}

	// Keep status in sync with capacity.
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err == nil {
		if int(count) >= yatra.MaxParticipants && yatra.Status == models.YatraStatusOpen {
			if err := s.db.Model(&yatra).Update("status", models.YatraStatusFull).Error; err != nil {
				log.Printf("[YatraService] Failed to mark yatra full yatra_id=%d: %v", yatraID, err)
			}
		} else if int(count) < yatra.MaxParticipants && yatra.Status == models.YatraStatusFull {
			if err := s.db.Model(&yatra).Update("status", models.YatraStatusOpen).Error; err != nil {
				log.Printf("[YatraService] Failed to reopen yatra yatra_id=%d: %v", yatraID, err)
			}
		}
	}
}

func (s *YatraService) addParticipantToChat(yatraID uint, userID uint) {
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var yatra models.Yatra
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&yatra, yatraID).Error; err != nil {
			return err
		}

		// Create chat room once under lock.
		if yatra.ChatRoomID == nil {
			room := &models.Room{
				Name:        yatra.Title + " - Group Chat",
				Description: "Group chat for " + yatra.Title,
				OwnerID:     yatra.OrganizerID,
				IsPublic:    false,
				YatraID:     &yatraID, // Link room to yatra for proper UI handling
			}
			if err := tx.Create(room).Error; err != nil {
				return err
			}

			if err := tx.Model(&yatra).Update("chat_room_id", room.ID).Error; err != nil {
				return err
			}
			yatra.ChatRoomID = &room.ID

			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.RoomMember{
				RoomID: room.ID,
				UserID: yatra.OrganizerID,
				Role:   "admin",
			}).Error; err != nil {
				return err
			}
		}

		if yatra.ChatRoomID == nil {
			return errors.New("chat room id is missing")
		}

		return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.RoomMember{
			RoomID: *yatra.ChatRoomID,
			UserID: userID,
			Role:   "member",
		}).Error
	}); err != nil {
		log.Printf("[YatraService] Failed to add participant to chat yatra_id=%d user_id=%d: %v", yatraID, userID, err)
	}
}

// GetYatraMarkers returns yatra markers for map display
func (s *YatraService) GetYatraMarkers(bbox models.MapBoundingBox, limit int) ([]models.MapMarker, int) {
	var yatras []models.Yatra
	query := s.db.Model(&models.Yatra{}).
		Where("status IN ?", []models.YatraStatus{models.YatraStatusOpen, models.YatraStatusFull}).
		Where("start_latitude IS NOT NULL AND start_longitude IS NOT NULL").
		Where("start_latitude >= ? AND start_latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("start_longitude >= ? AND start_longitude <= ?", bbox.LngMin, bbox.LngMax)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Printf("[YatraService] Error counting yatra markers: %v", err)
		return nil, 0
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&yatras).Error; err != nil {
		log.Printf("[YatraService] Error getting yatra markers: %v", err)
		return nil, 0
	}

	markers := make([]models.MapMarker, len(yatras))
	for i, yatra := range yatras {
		markers[i] = models.MapMarker{
			ID:        yatra.ID,
			Type:      "yatra",
			Title:     yatra.Title,
			Subtitle:  yatra.StartCity + " → " + yatra.EndCity,
			Latitude:  *yatra.StartLatitude,
			Longitude: *yatra.StartLongitude,
			AvatarURL: yatra.CoverImageURL,
			Category:  string(yatra.Theme),
			Status:    string(yatra.Status),
		}
	}

	truncated := 0
	if int(total) > len(markers) {
		truncated = int(total) - len(markers)
	}

	return markers, truncated
}

// ==================== YATRA REVIEWS ====================

// GetYatraReviews returns reviews for a yatra with pagination
func (s *YatraService) GetYatraReviews(yatraID uint, page, limit int) ([]models.YatraReview, int64, float64, error) {
	var reviews []models.YatraReview
	var total int64

	query := s.db.Model(&models.YatraReview{}).Where("yatra_id = ?", yatraID)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, 0, err
	}

	// Calculate average rating
	var avgResult struct {
		Avg float64
	}
	if err := s.db.Model(&models.YatraReview{}).
		Where("yatra_id = ?", yatraID).
		Select("COALESCE(AVG(overall_rating), 0) as avg").
		Scan(&avgResult).Error; err != nil {
		return nil, 0, 0, err
	}

	// Pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Fetch reviews with author
	err := s.db.Where("yatra_id = ?", yatraID).
		Preload("Author").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&reviews).Error

	return reviews, total, avgResult.Avg, err
}

// CreateYatraReview creates a review for a completed yatra
func (s *YatraService) CreateYatraReview(yatraID uint, authorID uint, req models.YatraReviewCreateRequest) (*models.YatraReview, error) {
	// Check if yatra exists and is completed
	var yatra models.Yatra
	if err := s.db.First(&yatra, yatraID).Error; err != nil {
		return nil, errors.New("yatra not found")
	}

	if yatra.Status != models.YatraStatusCompleted {
		return nil, errors.New("can only review completed yatras")
	}

	// Check if user was a participant
	var participant models.YatraParticipant
	err := s.db.Where("yatra_id = ? AND user_id = ? AND status = ?",
		yatraID, authorID, models.YatraParticipantApproved).First(&participant).Error
	if err != nil {
		return nil, errors.New("only participants can review this yatra")
	}

	// Check if already reviewed
	var existing models.YatraReview
	if err := s.db.Where("yatra_id = ? AND author_id = ?", yatraID, authorID).First(&existing).Error; err == nil {
		return nil, errors.New("you have already reviewed this yatra")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Set default recommendation
	recommendation := true
	if req.Recommendation != nil {
		recommendation = *req.Recommendation
	}

	review := &models.YatraReview{
		YatraID:             yatraID,
		AuthorID:            authorID,
		OverallRating:       req.OverallRating,
		OrganizerRating:     req.OrganizerRating,
		RouteRating:         req.RouteRating,
		AccommodationRating: req.AccommodationRating,
		ValueRating:         req.ValueRating,
		Comment:             strings.TrimSpace(req.Comment),
		Photos:              req.Photos,
		Recommendation:      recommendation,
	}

	if err := s.db.Create(review).Error; err != nil {
		return nil, err
	}

	// Load author for response
	if err := s.db.Preload("Author").First(review, review.ID).Error; err != nil {
		return nil, err
	}

	return review, nil
}

// GetOrganizerStats returns statistics for an organizer
func (s *YatraService) GetOrganizerStats(userID uint) (*models.OrganizerStats, error) {
	stats := &models.OrganizerStats{}

	// Count organized yatras (completed)
	var organizedCompleted int64
	s.db.Model(&models.Yatra{}).
		Where("organizer_id = ? AND status = ?", userID, models.YatraStatusCompleted).
		Count(&organizedCompleted)
	stats.OrganizedCount = int(organizedCompleted)

	// If no organized yatras, also count open/full ones
	if stats.OrganizedCount == 0 {
		var totalCount int64
		s.db.Model(&models.Yatra{}).
			Where("organizer_id = ?", userID).
			Count(&totalCount)
		stats.OrganizedCount = int(totalCount)
	}

	// Get average rating from reviews of user's yatras
	var avgResult struct {
		Avg float64
	}
	s.db.Model(&models.YatraReview{}).
		Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
		Where("yatras.organizer_id = ?", userID).
		Select("COALESCE(AVG(yatra_reviews.organizer_rating), 0) as avg").
		Scan(&avgResult)
	stats.AverageRating = avgResult.Avg

	// If no organizer ratings, use overall ratings
	if stats.AverageRating == 0 {
		s.db.Model(&models.YatraReview{}).
			Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
			Where("yatras.organizer_id = ?", userID).
			Select("COALESCE(AVG(yatra_reviews.overall_rating), 0) as avg").
			Scan(&avgResult)
		stats.AverageRating = avgResult.Avg
	}

	// Count total participants across all organized yatras
	var participantCount int64
	s.db.Model(&models.YatraParticipant{}).
		Joins("JOIN yatras ON yatras.id = yatra_participants.yatra_id").
		Where("yatras.organizer_id = ? AND yatra_participants.status = ?",
			userID, models.YatraParticipantApproved).
		Count(&participantCount)
	stats.TotalParticipants = int(participantCount)

	// Count recommendations
	var recommendCount int64
	s.db.Model(&models.YatraReview{}).
		Joins("JOIN yatras ON yatras.id = yatra_reviews.yatra_id").
		Where("yatras.organizer_id = ? AND yatra_reviews.recommendation = ?", userID, true).
		Count(&recommendCount)
	stats.Recommendations = int(recommendCount)

	return stats, nil
}

// GetUserParticipation returns user's participation record for a yatra
func (s *YatraService) GetUserParticipation(yatraID uint, userID uint) (*models.YatraParticipant, error) {
	var participant models.YatraParticipant
	// Use silent logger to avoid "record not found" spam
	err := s.db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).
		Where("yatra_id = ? AND user_id = ?", yatraID, userID).
		Preload("User").
		First(&participant).Error
	if err != nil {
		return nil, err
	}
	return &participant, nil
}
