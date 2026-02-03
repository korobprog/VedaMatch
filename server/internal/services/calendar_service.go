package services

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"
)

// CalendarService handles calendar and slot operations
type CalendarService struct{}

// NewCalendarService creates a new calendar service
func NewCalendarService() *CalendarService {
	return &CalendarService{}
}

// GetAvailableSlots returns available slots for a service on a given date
func (s *CalendarService) GetAvailableSlots(serviceID uint, date string, timezone string) (*models.SlotsResponse, error) {
	// Parse date
	targetDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, err
	}

	if timezone == "" {
		timezone = "Europe/Moscow"
	}

	// Load timezone
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}

	// Get day of week
	dayOfWeek := int(targetDate.Weekday())

	// Get schedules for this day
	var schedules []models.ServiceSchedule
	err = database.DB.
		Where("service_id = ? AND is_active = ? AND (day_of_week = ? OR (specific_date IS NOT NULL AND specific_date = ?))",
			serviceID, true, dayOfWeek, targetDate).
		Find(&schedules).Error

	if err != nil {
		return nil, err
	}

	// Get existing bookings for this day
	startOfDay := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 0, 0, 0, 0, loc)
	endOfDay := startOfDay.Add(24 * time.Hour)

	var existingBookings []models.ServiceBooking
	database.DB.
		Where("service_id = ? AND status IN (?, ?) AND scheduled_at >= ? AND scheduled_at < ?",
			serviceID, models.BookingStatusPending, models.BookingStatusConfirmed, startOfDay, endOfDay).
		Find(&existingBookings)

	// Build slots
	slots := []models.AvailableSlot{}

	for _, schedule := range schedules {
		// Parse schedule times
		startTime, err := time.Parse("15:04", schedule.TimeStart)
		if err != nil {
			continue
		}
		endTime, err := time.Parse("15:04", schedule.TimeEnd)
		if err != nil {
			continue
		}

		// Generate slots within the schedule window
		slotDuration := schedule.SlotDuration
		if slotDuration == 0 {
			slotDuration = 60
		}
		bufferMinutes := schedule.BufferMinutes

		currentTime := time.Date(
			targetDate.Year(), targetDate.Month(), targetDate.Day(),
			startTime.Hour(), startTime.Minute(), 0, 0, loc,
		)
		scheduleEnd := time.Date(
			targetDate.Year(), targetDate.Month(), targetDate.Day(),
			endTime.Hour(), endTime.Minute(), 0, 0, loc,
		)

		for currentTime.Add(time.Duration(slotDuration)*time.Minute).Before(scheduleEnd) ||
			currentTime.Add(time.Duration(slotDuration)*time.Minute).Equal(scheduleEnd) {

			slotEnd := currentTime.Add(time.Duration(slotDuration) * time.Minute)

			// Check if this slot is in the past
			if currentTime.Before(time.Now()) {
				currentTime = slotEnd.Add(time.Duration(bufferMinutes) * time.Minute)
				continue
			}

			// Count bookings overlapping with this slot
			bookedCount := 0
			for _, booking := range existingBookings {
				if booking.ScheduledAt.Before(slotEnd) && booking.EndAt.After(currentTime) {
					bookedCount++
				}
			}

			// Calculate available spots
			spotsAvailable := schedule.MaxParticipants - bookedCount
			if spotsAvailable > 0 {
				slots = append(slots, models.AvailableSlot{
					StartTime:      currentTime,
					EndTime:        slotEnd,
					SpotsAvailable: spotsAvailable,
					ScheduleID:     schedule.ID,
				})
			}

			currentTime = slotEnd.Add(time.Duration(bufferMinutes) * time.Minute)
		}
	}

	return &models.SlotsResponse{
		ServiceID: serviceID,
		Date:      date,
		Slots:     slots,
	}, nil
}

// GetSlotsForRange returns available slots for a date range
func (s *CalendarService) GetSlotsForRange(serviceID uint, dateFrom, dateTo, timezone string) ([]models.SlotsResponse, error) {
	startDate, err := time.Parse("2006-01-02", dateFrom)
	if err != nil {
		return nil, err
	}

	endDate, err := time.Parse("2006-01-02", dateTo)
	if err != nil {
		return nil, err
	}

	// Limit to 30 days
	maxEnd := startDate.Add(30 * 24 * time.Hour)
	if endDate.After(maxEnd) {
		endDate = maxEnd
	}

	var results []models.SlotsResponse

	currentDate := startDate
	for !currentDate.After(endDate) {
		slots, err := s.GetAvailableSlots(serviceID, currentDate.Format("2006-01-02"), timezone)
		if err == nil && len(slots.Slots) > 0 {
			results = append(results, *slots)
		}
		currentDate = currentDate.Add(24 * time.Hour)
	}

	return results, nil
}

// IsSlotAvailable checks if a specific time slot is available
func (s *CalendarService) IsSlotAvailable(serviceID uint, startTime time.Time, durationMinutes int) (bool, int, error) {
	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

	// Check if falls within any schedule
	dayOfWeek := int(startTime.Weekday())
	timeStr := startTime.Format("15:04")

	var matchingSchedules []models.ServiceSchedule
	database.DB.
		Where("service_id = ? AND is_active = ? AND day_of_week = ? AND time_start <= ? AND time_end >= ?",
			serviceID, true, dayOfWeek, timeStr, endTime.Format("15:04")).
		Find(&matchingSchedules)

	if len(matchingSchedules) == 0 {
		return false, 0, nil
	}

	schedule := matchingSchedules[0]

	// Count existing bookings
	var bookedCount int64
	database.DB.Model(&models.ServiceBooking{}).
		Where("service_id = ? AND status IN (?, ?) AND scheduled_at < ? AND end_at > ?",
			serviceID, models.BookingStatusPending, models.BookingStatusConfirmed, endTime, startTime).
		Count(&bookedCount)

	spotsAvailable := schedule.MaxParticipants - int(bookedCount)

	return spotsAvailable > 0, spotsAvailable, nil
}

// GetBusyTimes returns all busy time slots for a service owner
func (s *CalendarService) GetBusyTimes(ownerID uint, dateFrom, dateTo string) ([]models.ServiceBooking, error) {
	startDate, _ := time.Parse("2006-01-02", dateFrom)
	endDate, _ := time.Parse("2006-01-02", dateTo)
	endDate = endDate.Add(24 * time.Hour)

	// Get all services by owner
	var serviceIDs []uint
	database.DB.Model(&models.Service{}).Where("owner_id = ?", ownerID).Pluck("id", &serviceIDs)

	if len(serviceIDs) == 0 {
		return []models.ServiceBooking{}, nil
	}

	var bookings []models.ServiceBooking
	database.DB.
		Where("service_id IN ? AND status IN (?, ?) AND scheduled_at >= ? AND scheduled_at < ?",
			serviceIDs, models.BookingStatusPending, models.BookingStatusConfirmed, startDate, endDate).
		Preload("Client").
		Order("scheduled_at ASC").
		Find(&bookings)

	return bookings, nil
}
