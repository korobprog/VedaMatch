package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// ServiceService handles service-related operations
type ServiceService struct{}

// NewServiceService creates a new service service
func NewServiceService() *ServiceService {
	return &ServiceService{}
}

func isValidServiceStatus(status models.ServiceStatus) bool {
	switch status {
	case models.ServiceStatusDraft, models.ServiceStatusActive, models.ServiceStatusPaused, models.ServiceStatusArchived:
		return true
	default:
		return false
	}
}

func validateTimeRangeHHMM(startTime, endTime string) (string, string, error) {
	startTime = strings.TrimSpace(startTime)
	endTime = strings.TrimSpace(endTime)

	startParsed, err := time.Parse("15:04", startTime)
	if err != nil {
		return "", "", errors.New("timeStart must be in HH:MM format")
	}
	endParsed, err := time.Parse("15:04", endTime)
	if err != nil {
		return "", "", errors.New("timeEnd must be in HH:MM format")
	}
	if !endParsed.After(startParsed) {
		return "", "", errors.New("timeEnd must be after timeStart")
	}

	return startTime, endTime, nil
}

func validateDayOfWeek(day int) error {
	if day < 0 || day > 6 {
		return fmt.Errorf("day_of_week out of range: %d", day)
	}
	return nil
}

func normalizeTimezone(timezone string) (string, error) {
	timezone = strings.TrimSpace(timezone)
	if timezone == "" {
		return "Europe/Moscow", nil
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return "", fmt.Errorf("invalid timezone: %s", timezone)
	}
	return timezone, nil
}

func settingInt(settings map[string]interface{}, key string, fallback int) int {
	val, ok := settings[key]
	if !ok {
		return fallback
	}

	switch v := val.(type) {
	case float64:
		return int(v)
	case int:
		return v
	case int64:
		return int(v)
	case json.Number:
		if parsed, err := v.Int64(); err == nil {
			return int(parsed)
		}
	}

	return fallback
}

// Create creates a new service
func (s *ServiceService) Create(ownerID uint, ownerRole string, req models.ServiceCreateRequest) (*models.Service, error) {
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.CoverImageURL = strings.TrimSpace(req.CoverImageURL)
	req.Language = strings.TrimSpace(req.Language)
	req.Formats = strings.TrimSpace(req.Formats)
	req.ChannelLink = strings.TrimSpace(req.ChannelLink)
	req.OfflineAddress = strings.TrimSpace(req.OfflineAddress)
	if req.Title == "" {
		return nil, errors.New("title is required")
	}

	service := models.Service{
		OwnerID:        ownerID,
		IsVedaMatch:    strings.EqualFold(ownerRole, models.RoleSuperadmin),
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

	// Increment views atomically.
	if err := database.DB.Model(&service).UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error; err != nil {
		log.Printf("[Service] Failed to increment views for service %d: %v", service.ID, err)
	}

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
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, errors.New("title is required")
		}
		updates["title"] = title
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.CoverImageURL != nil {
		updates["cover_image_url"] = strings.TrimSpace(*req.CoverImageURL)
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.Language != nil {
		updates["language"] = strings.TrimSpace(*req.Language)
	}
	if req.Formats != nil {
		updates["formats"] = strings.TrimSpace(*req.Formats)
	}
	if req.ScheduleType != nil {
		updates["schedule_type"] = *req.ScheduleType
	}
	if req.Channel != nil {
		updates["channel"] = *req.Channel
	}
	if req.ChannelLink != nil {
		updates["channel_link"] = strings.TrimSpace(*req.ChannelLink)
	}
	if req.OfflineAddress != nil {
		updates["offline_address"] = strings.TrimSpace(*req.OfflineAddress)
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
		if !isValidServiceStatus(*req.Status) {
			return nil, errors.New("invalid service status")
		}
		updates["status"] = *req.Status
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&service).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// Reload with relations without mutating view counters.
	var updated models.Service
	if err := database.DB.
		Preload("Owner").
		Preload("Tariffs", "is_active = ?", true).
		Preload("Schedules", "is_active = ?", true).
		First(&updated, serviceID).Error; err != nil {
		return nil, err
	}

	return &updated, nil
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
	if filters.IsVedaMatch != nil {
		query = query.Where("is_veda_match = ?", *filters.IsVedaMatch)
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

	req.Name = strings.TrimSpace(req.Name)
	req.Includes = strings.TrimSpace(req.Includes)
	if req.Name == "" {
		return nil, errors.New("tariff name is required")
	}
	if req.Price < 0 {
		return nil, errors.New("tariff price must be non-negative")
	}
	if req.DurationMinutes < 0 {
		return nil, errors.New("durationMinutes must be non-negative")
	}
	if req.SessionsCount < 0 {
		return nil, errors.New("sessionsCount must be non-negative")
	}
	if req.ValidityDays < 0 {
		return nil, errors.New("validityDays must be non-negative")
	}
	if req.MaxBonusLkmPercent < 0 || req.MaxBonusLkmPercent > 100 {
		return nil, errors.New("maxBonusLkmPercent must be between 0 and 100")
	}

	tariff := models.ServiceTariff{
		ServiceID:          serviceID,
		Name:               req.Name,
		Price:              req.Price,
		Currency:           "LKM",
		MaxBonusLkmPercent: req.MaxBonusLkmPercent,
		DurationMinutes:    req.DurationMinutes,
		SessionsCount:      req.SessionsCount,
		ValidityDays:       req.ValidityDays,
		Includes:           req.Includes,
		IsDefault:          req.IsDefault,
		IsActive:           true,
		SortOrder:          req.SortOrder,
	}

	if tariff.SessionsCount == 0 {
		tariff.SessionsCount = 1
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Keep "only one default tariff per service" atomic.
		if tariff.IsDefault {
			if err := tx.Model(&models.ServiceTariff{}).
				Where("service_id = ?", serviceID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Create(&tariff).Error
	}); err != nil {
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
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, errors.New("tariff name is required")
		}
		updates["name"] = name
	}
	if req.Price != nil {
		if *req.Price < 0 {
			return nil, errors.New("tariff price must be non-negative")
		}
		updates["price"] = *req.Price
	}
	if req.MaxBonusLkmPercent != nil {
		if *req.MaxBonusLkmPercent < 0 || *req.MaxBonusLkmPercent > 100 {
			return nil, errors.New("maxBonusLkmPercent must be between 0 and 100")
		}
		updates["max_bonus_lkm_percent"] = *req.MaxBonusLkmPercent
	}
	if req.DurationMinutes != nil {
		if *req.DurationMinutes < 0 {
			return nil, errors.New("durationMinutes must be non-negative")
		}
		updates["duration_minutes"] = *req.DurationMinutes
	}
	if req.SessionsCount != nil {
		if *req.SessionsCount < 1 {
			return nil, errors.New("sessionsCount must be at least 1")
		}
		updates["sessions_count"] = *req.SessionsCount
	}
	if req.ValidityDays != nil {
		if *req.ValidityDays < 0 {
			return nil, errors.New("validityDays must be non-negative")
		}
		updates["validity_days"] = *req.ValidityDays
	}
	if req.Includes != nil {
		updates["includes"] = strings.TrimSpace(*req.Includes)
	}
	if req.IsDefault != nil {
		updates["is_default"] = *req.IsDefault
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if len(updates) == 0 {
		return &tariff, nil
	}

	var updated models.ServiceTariff
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if req.IsDefault != nil && *req.IsDefault {
			if err := tx.Model(&models.ServiceTariff{}).
				Where("service_id = ?", tariff.ServiceID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&models.ServiceTariff{}).
			Where("id = ?", tariffID).
			Updates(updates).Error; err != nil {
			return err
		}

		return tx.First(&updated, tariffID).Error
	}); err != nil {
		return nil, err
	}

	return &updated, nil
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

	startTime, endTime, err := validateTimeRangeHHMM(req.TimeStart, req.TimeEnd)
	if err != nil {
		return nil, err
	}
	if req.MaxParticipants < 0 {
		return nil, errors.New("maxParticipants must be non-negative")
	}
	if req.SlotDuration < 0 {
		return nil, errors.New("slotDuration must be non-negative")
	}
	if req.BufferMinutes < 0 {
		return nil, errors.New("bufferMinutes must be non-negative")
	}

	var dayOfWeek *int
	if req.DayOfWeek != nil {
		day := *req.DayOfWeek
		if err := validateDayOfWeek(day); err != nil {
			return nil, err
		}
		dayOfWeek = &day
	}

	req.SpecificDate = strings.TrimSpace(req.SpecificDate)
	var specificDate *time.Time
	if req.SpecificDate != "" {
		parsedDate, err := time.Parse("2006-01-02", req.SpecificDate)
		if err != nil {
			return nil, errors.New("specificDate must be in YYYY-MM-DD format")
		}
		specificDate = &parsedDate
	}

	if dayOfWeek == nil && specificDate == nil {
		return nil, errors.New("dayOfWeek or specificDate is required")
	}
	if dayOfWeek != nil && specificDate != nil {
		return nil, errors.New("provide either dayOfWeek or specificDate, not both")
	}

	timezone, err := normalizeTimezone(req.Timezone)
	if err != nil {
		return nil, err
	}

	schedule := models.ServiceSchedule{
		ServiceID:       serviceID,
		DayOfWeek:       dayOfWeek,
		SpecificDate:    specificDate,
		TimeStart:       startTime,
		TimeEnd:         endTime,
		MaxParticipants: req.MaxParticipants,
		SlotDuration:    req.SlotDuration,
		BufferMinutes:   req.BufferMinutes,
		IsActive:        true,
		Timezone:        timezone,
	}

	if schedule.MaxParticipants == 0 {
		schedule.MaxParticipants = 1
	}
	if schedule.SlotDuration == 0 {
		schedule.SlotDuration = 60
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
	if err := database.DB.Model(&models.ServiceTariff{}).
		Where("service_id = ? AND is_active = ?", serviceID, true).
		Count(&tariffCount).Error; err != nil {
		return err
	}

	if tariffCount == 0 {
		return errors.New("service must have at least one active tariff")
	}

	return database.DB.Model(&service).Update("status", models.ServiceStatusActive).Error
}

// GetWeeklySchedule returns weekly schedule configuration
func (s *ServiceService) GetWeeklySchedule(serviceID uint) (*models.WeeklyScheduleResponse, error) {
	var service models.Service
	if err := database.DB.Preload("Schedules", "is_active = ?", true).First(&service, serviceID).Error; err != nil {
		return nil, err
	}

	response := &models.WeeklyScheduleResponse{
		WeeklySlots:  make(map[string]models.WeeklyDayConfig),
		SlotDuration: 60,
	}

	// Parse settings
	if service.Settings != "" {
		var settings map[string]interface{}
		if err := json.Unmarshal([]byte(service.Settings), &settings); err == nil {
			response.SlotDuration = settingInt(settings, "slotDuration", response.SlotDuration)
			response.BreakBetween = settingInt(settings, "breakBetween", response.BreakBetween)
			response.MaxBookingsPerDay = settingInt(settings, "maxBookingsPerDay", response.MaxBookingsPerDay)
		}
	}
	if response.SlotDuration <= 0 {
		response.SlotDuration = 60
	}
	if response.BreakBetween < 0 {
		response.BreakBetween = 0
	}
	if response.MaxBookingsPerDay < 0 {
		response.MaxBookingsPerDay = 0
	}

	// Group slots by day
	for _, schedule := range service.Schedules {
		if schedule.DayOfWeek == nil {
			continue
		}
		dayStr := serviceDayIndexToKey(*schedule.DayOfWeek)
		if dayStr == "" {
			dayStr = fmt.Sprintf("%d", *schedule.DayOfWeek)
		}

		config := response.WeeklySlots[dayStr]
		config.Enabled = true
		config.Slots = append(config.Slots, models.TimeSlot{
			StartTime: schedule.TimeStart,
			EndTime:   schedule.TimeEnd,
		})
		response.WeeklySlots[dayStr] = config
	}

	return response, nil
}

// UpdateWeeklySchedule updates weekly schedule configuration
func (s *ServiceService) UpdateWeeklySchedule(serviceID, ownerID uint, req models.WeeklyScheduleRequest) error {
	var service models.Service
	if err := database.DB.First(&service, serviceID).Error; err != nil {
		return err
	}

	if service.OwnerID != ownerID {
		return errors.New("not authorized")
	}
	if req.BreakBetween != nil && *req.BreakBetween < 0 {
		return errors.New("breakBetween must be non-negative")
	}
	if req.MaxBookingsPerDay != nil && *req.MaxBookingsPerDay < 0 {
		return errors.New("maxBookingsPerDay must be non-negative")
	}

	settings := make(map[string]interface{})
	if service.Settings != "" {
		if err := json.Unmarshal([]byte(service.Settings), &settings); err != nil {
			return err
		}
	}

	slotDuration := settingInt(settings, "slotDuration", 60)
	if slotDuration <= 0 {
		slotDuration = 60
	}
	settings["slotDuration"] = slotDuration

	bufferMinutes := settingInt(settings, "breakBetween", 0)
	if req.BreakBetween != nil {
		bufferMinutes = *req.BreakBetween
	}
	if bufferMinutes < 0 {
		bufferMinutes = 0
	}
	settings["breakBetween"] = bufferMinutes

	maxBookingsPerDay := settingInt(settings, "maxBookingsPerDay", 0)
	if req.MaxBookingsPerDay != nil {
		maxBookingsPerDay = *req.MaxBookingsPerDay
	}
	if maxBookingsPerDay < 0 {
		maxBookingsPerDay = 0
	}
	settings["maxBookingsPerDay"] = maxBookingsPerDay

	defaultTimezone, err := normalizeTimezone("")
	if err != nil {
		return err
	}

	schedulesToCreate := make([]models.ServiceSchedule, 0)
	for dayStr, config := range req.WeeklySlots {
		if !config.Enabled {
			continue
		}

		dayInt, err := parseServiceDayKey(dayStr)
		if err != nil {
			return err
		}
		if err := validateDayOfWeek(dayInt); err != nil {
			return err
		}

		for _, slot := range config.Slots {
			startTime, endTime, err := validateTimeRangeHHMM(slot.StartTime, slot.EndTime)
			if err != nil {
				return fmt.Errorf("%s: %w", dayStr, err)
			}

			dayOfWeek := dayInt
			schedulesToCreate = append(schedulesToCreate, models.ServiceSchedule{
				ServiceID:     serviceID,
				DayOfWeek:     &dayOfWeek,
				TimeStart:     startTime,
				TimeEnd:       endTime,
				SlotDuration:  slotDuration,
				BufferMinutes: bufferMinutes,
				IsActive:      true,
				Timezone:      defaultTimezone,
			})
		}
	}

	settingsBytes, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&service).Update("settings", string(settingsBytes)).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.ServiceSchedule{}).
			Where("service_id = ? AND day_of_week IS NOT NULL", serviceID).
			Update("is_active", false).Error; err != nil {
			return err
		}

		if len(schedulesToCreate) > 0 {
			if err := tx.Create(&schedulesToCreate).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func parseServiceDayKey(dayStr string) (int, error) {
	normalized := strings.ToLower(strings.TrimSpace(dayStr))
	switch normalized {
	case "monday":
		return 1, nil
	case "tuesday":
		return 2, nil
	case "wednesday":
		return 3, nil
	case "thursday":
		return 4, nil
	case "friday":
		return 5, nil
	case "saturday":
		return 6, nil
	case "sunday":
		return 0, nil
	default:
		dayInt, err := strconv.Atoi(normalized)
		if err != nil {
			return 0, fmt.Errorf("invalid day_of_week: %s", dayStr)
		}
		return dayInt, nil
	}
}

func serviceDayIndexToKey(day int) string {
	switch day {
	case 1:
		return "monday"
	case 2:
		return "tuesday"
	case 3:
		return "wednesday"
	case 4:
		return "thursday"
	case 5:
		return "friday"
	case 6:
		return "saturday"
	case 0:
		return "sunday"
	default:
		return ""
	}
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
