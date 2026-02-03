package services

import (
	"errors"
	"log"
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

// ServiceService handles service-related operations
type ServiceService struct{}

// NewServiceService creates a new service service
func NewServiceService() *ServiceService {
	return &ServiceService{}
}

// Create creates a new service
func (s *ServiceService) Create(ownerID uint, req models.ServiceCreateRequest) (*models.Service, error) {
	service := models.Service{
		OwnerID:        ownerID,
		Title:          req.Title,
		Description:    req.Description,
		CoverImageURL:  req.CoverImageURL,
		Category:       req.Category,
		Language:       req.Language,
		Formats:        req.Formats,
		ScheduleType:   req.ScheduleType,
		Channel:        req.Channel,
		ChannelLink:    req.ChannelLink,
		OfflineAddress: req.OfflineAddress,
		OfflineLat:     req.OfflineLat,
		OfflineLng:     req.OfflineLng,
		AccessType:     req.AccessType,
		Status:         models.ServiceStatusDraft,
	}

	// Set defaults
	if service.Language == "" {
		service.Language = "ru"
	}

	if err := database.DB.Create(&service).Error; err != nil {
		return nil, err
	}

	log.Printf("[Service] Created service %d: %s by user %d", service.ID, service.Title, ownerID)
	return &service, nil
}

// GetByID retrieves a service by ID with relations
func (s *ServiceService) GetByID(id uint) (*models.Service, error) {
	var service models.Service
	err := database.DB.
		Preload("Owner").
		Preload("Tariffs", "is_active = ?", true).
		Preload("Schedules", "is_active = ?", true).
		First(&service, id).Error

	if err != nil {
		return nil, err
	}

	// Increment views
	go database.DB.Model(&service).Update("views_count", service.ViewsCount+1)

	return &service, nil
}

// Update updates a service
func (s *ServiceService) Update(serviceID, ownerID uint, req models.ServiceUpdateRequest) (*models.Service, error) {
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return nil, err
	}

	// Check ownership
	if service.OwnerID != ownerID {
		return nil, errors.New("not authorized to update this service")
	}

	// Update fields if provided
	updates := make(map[string]interface{})

	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.CoverImageURL != nil {
		updates["cover_image_url"] = *req.CoverImageURL
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.Language != nil {
		updates["language"] = *req.Language
	}
	if req.Formats != nil {
		updates["formats"] = *req.Formats
	}
	if req.ScheduleType != nil {
		updates["schedule_type"] = *req.ScheduleType
	}
	if req.Channel != nil {
		updates["channel"] = *req.Channel
	}
	if req.ChannelLink != nil {
		updates["channel_link"] = *req.ChannelLink
	}
	if req.OfflineAddress != nil {
		updates["offline_address"] = *req.OfflineAddress
	}
	if req.OfflineLat != nil {
		updates["offline_lat"] = *req.OfflineLat
	}
	if req.OfflineLng != nil {
		updates["offline_lng"] = *req.OfflineLng
	}
	if req.AccessType != nil {
		updates["access_type"] = *req.AccessType
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&service).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// Reload with relations
	return s.GetByID(serviceID)
}

// Delete soft-deletes a service
func (s *ServiceService) Delete(serviceID, ownerID uint) error {
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return err
	}

	if service.OwnerID != ownerID {
		return errors.New("not authorized to delete this service")
	}

	return database.DB.Delete(&service).Error
}

// List returns paginated list of services with filters
func (s *ServiceService) List(filters models.ServiceFilters) (*models.ServiceListResponse, error) {
	query := database.DB.Where("status = ?", models.ServiceStatusActive)

	// Apply filters
	if filters.Category != "" {
		query = query.Where("category = ?", filters.Category)
	}
	if filters.OwnerID != nil {
		query = query.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.ScheduleType != "" {
		query = query.Where("schedule_type = ?", filters.ScheduleType)
	}
	if filters.Channel != "" {
		query = query.Where("channel = ?", filters.Channel)
	}
	if filters.AccessType != "" {
		query = query.Where("access_type = ?", filters.AccessType)
	}
	if filters.Language != "" {
		query = query.Where("language = ?", filters.Language)
	}
	if filters.Search != "" {
		searchPattern := "%" + filters.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Geo filter (for offline services)
	if filters.NearLat != nil && filters.NearLng != nil {
		radius := 50.0 // Default 50km
		if filters.RadiusKm != nil {
			radius = *filters.RadiusKm
		}
		// Haversine formula approximation
		query = query.Where(`
			offline_lat IS NOT NULL AND offline_lng IS NOT NULL AND
			(6371 * acos(cos(radians(?)) * cos(radians(offline_lat)) * 
			cos(radians(offline_lng) - radians(?)) + sin(radians(?)) * 
			sin(radians(offline_lat)))) <= ?
		`, *filters.NearLat, *filters.NearLng, *filters.NearLat, radius)
	}

	// Count total
	var total int64
	if err := query.Model(&models.Service{}).Count(&total).Error; err != nil {
		return nil, err
	}

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

	// Fetch services with owner
	var services []models.Service
	if err := query.
		Preload("Owner").
		Preload("Tariffs", "is_active = ?", true).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&services).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.ServiceListResponse{
		Services:   services,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// GetMyServices returns services owned by a user
func (s *ServiceService) GetMyServices(ownerID uint) ([]models.Service, error) {
	var services []models.Service
	err := database.DB.
		Where("owner_id = ?", ownerID).
		Preload("Tariffs").
		Preload("Schedules").
		Order("created_at DESC").
		Find(&services).Error

	return services, err
}

// ==================== TARIFF OPERATIONS ====================

// AddTariff adds a tariff to a service
func (s *ServiceService) AddTariff(serviceID, ownerID uint, req models.TariffCreateRequest) (*models.ServiceTariff, error) {
	// Verify ownership
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return nil, err
	}
	if service.OwnerID != ownerID {
		return nil, errors.New("not authorized")
	}

	tariff := models.ServiceTariff{
		ServiceID:       serviceID,
		Name:            req.Name,
		Price:           req.Price,
		Currency:        "LKS",
		DurationMinutes: req.DurationMinutes,
		SessionsCount:   req.SessionsCount,
		ValidityDays:    req.ValidityDays,
		Includes:        req.Includes,
		IsDefault:       req.IsDefault,
		IsActive:        true,
		SortOrder:       req.SortOrder,
	}

	if tariff.SessionsCount == 0 {
		tariff.SessionsCount = 1
	}

	// If this is the default, unset other defaults
	if tariff.IsDefault {
		database.DB.Model(&models.ServiceTariff{}).
			Where("service_id = ?", serviceID).
			Update("is_default", false)
	}

	if err := database.DB.Create(&tariff).Error; err != nil {
		return nil, err
	}

	return &tariff, nil
}

// GetTariffs returns all tariffs for a service
func (s *ServiceService) GetTariffs(serviceID uint) ([]models.ServiceTariff, error) {
	var tariffs []models.ServiceTariff
	err := database.DB.
		Where("service_id = ? AND is_active = ?", serviceID, true).
		Order("sort_order ASC, price ASC").
		Find(&tariffs).Error
	return tariffs, err
}

// UpdateTariff updates a tariff
func (s *ServiceService) UpdateTariff(tariffID, ownerID uint, req models.TariffUpdateRequest) (*models.ServiceTariff, error) {
	var tariff models.ServiceTariff
	if err := database.DB.Preload("Service").First(&tariff, tariffID).Error; err != nil {
		return nil, err
	}

	if tariff.Service.OwnerID != ownerID {
		return nil, errors.New("not authorized")
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.DurationMinutes != nil {
		updates["duration_minutes"] = *req.DurationMinutes
	}
	if req.SessionsCount != nil {
		updates["sessions_count"] = *req.SessionsCount
	}
	if req.ValidityDays != nil {
		updates["validity_days"] = *req.ValidityDays
	}
	if req.Includes != nil {
		updates["includes"] = *req.Includes
	}
	if req.IsDefault != nil {
		if *req.IsDefault {
			// Unset other defaults first
			database.DB.Model(&models.ServiceTariff{}).
				Where("service_id = ?", tariff.ServiceID).
				Update("is_default", false)
		}
		updates["is_default"] = *req.IsDefault
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&tariff).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	database.DB.First(&tariff, tariffID)
	return &tariff, nil
}

// DeleteTariff soft-deletes a tariff
func (s *ServiceService) DeleteTariff(tariffID, ownerID uint) error {
	var tariff models.ServiceTariff
	if err := database.DB.Preload("Service").First(&tariff, tariffID).Error; err != nil {
		return err
	}

	if tariff.Service.OwnerID != ownerID {
		return errors.New("not authorized")
	}

	return database.DB.Delete(&tariff).Error
}

// ==================== SCHEDULE OPERATIONS ====================

// AddSchedule adds a schedule slot to a service
func (s *ServiceService) AddSchedule(serviceID, ownerID uint, req models.ScheduleCreateRequest) (*models.ServiceSchedule, error) {
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return nil, err
	}
	if service.OwnerID != ownerID {
		return nil, errors.New("not authorized")
	}

	schedule := models.ServiceSchedule{
		ServiceID:       serviceID,
		DayOfWeek:       req.DayOfWeek,
		TimeStart:       req.TimeStart,
		TimeEnd:         req.TimeEnd,
		MaxParticipants: req.MaxParticipants,
		SlotDuration:    req.SlotDuration,
		BufferMinutes:   req.BufferMinutes,
		IsActive:        true,
		Timezone:        req.Timezone,
	}

	if schedule.MaxParticipants == 0 {
		schedule.MaxParticipants = 1
	}
	if schedule.SlotDuration == 0 {
		schedule.SlotDuration = 60
	}
	if schedule.Timezone == "" {
		schedule.Timezone = "Europe/Moscow"
	}

	if err := database.DB.Create(&schedule).Error; err != nil {
		return nil, err
	}

	return &schedule, nil
}

// GetSchedules returns all schedules for a service
func (s *ServiceService) GetSchedules(serviceID uint) ([]models.ServiceSchedule, error) {
	var schedules []models.ServiceSchedule
	err := database.DB.
		Where("service_id = ? AND is_active = ?", serviceID, true).
		Order("day_of_week ASC, time_start ASC").
		Find(&schedules).Error
	return schedules, err
}

// DeleteSchedule deactivates a schedule
func (s *ServiceService) DeleteSchedule(scheduleID, ownerID uint) error {
	var schedule models.ServiceSchedule
	if err := database.DB.Preload("Service").First(&schedule, scheduleID).Error; err != nil {
		return err
	}

	if schedule.Service.OwnerID != ownerID {
		return errors.New("not authorized")
	}

	return database.DB.Model(&schedule).Update("is_active", false).Error
}

// Publish changes service status to active
func (s *ServiceService) Publish(serviceID, ownerID uint) error {
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return err
	}

	if service.OwnerID != ownerID {
		return errors.New("not authorized")
	}

	// Validate service has at least one tariff
	var tariffCount int64
	database.DB.Model(&models.ServiceTariff{}).
		Where("service_id = ? AND is_active = ?", serviceID, true).
		Count(&tariffCount)

	if tariffCount == 0 {
		return errors.New("service must have at least one active tariff")
	}

	return database.DB.Model(&service).Update("status", models.ServiceStatusActive).Error
}

// Pause changes service status to paused
func (s *ServiceService) Pause(serviceID, ownerID uint) error {
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return err
	}

	if service.OwnerID != ownerID {
		return errors.New("not authorized")
	}

	return database.DB.Model(&service).Update("status", models.ServiceStatusPaused).Error
}
