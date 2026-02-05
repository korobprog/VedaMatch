package services

import (
	"errors"
	"log"
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"
)

// BookingService handles booking operations
type BookingService struct {
	walletService   *WalletService
	serviceService  *ServiceService
	referralService *ReferralService
}

// NewBookingService creates a new booking service
func NewBookingService(walletService *WalletService, serviceService *ServiceService, referralService *ReferralService) *BookingService {
	return &BookingService{
		walletService:   walletService,
		serviceService:  serviceService,
		referralService: referralService,
	}
}

// Create creates a new booking
func (s *BookingService) Create(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error) {
	// Get service
	service, err := s.serviceService.GetByID(serviceID)
	if err != nil {
		return nil, errors.New("service not found")
	}

	// Check if service is active
	if service.Status != models.ServiceStatusActive {
		return nil, errors.New("service is not available for booking")
	}

	// Get tariff
	var tariff models.ServiceTariff
	if err := database.DB.First(&tariff, req.TariffID).Error; err != nil {
		return nil, errors.New("tariff not found")
	}

	if tariff.ServiceID != serviceID {
		return nil, errors.New("tariff does not belong to this service")
	}

	// Check if client has enough balance (if paid)
	if service.AccessType == models.ServiceAccessPaid && tariff.Price > 0 {
		wallet, err := s.walletService.GetBalance(clientID)
		if err != nil {
			return nil, err
		}
		if wallet.Balance < tariff.Price {
			return nil, errors.New("insufficient LakshMoney balance")
		}
	}

	// Calculate end time
	duration := tariff.DurationMinutes
	if duration == 0 {
		duration = 60
	}
	endAt := req.ScheduledAt.Add(time.Duration(duration) * time.Minute)

	// Check for conflicts (same service, overlapping time)
	var conflictCount int64
	database.DB.Model(&models.ServiceBooking{}).
		Where("service_id = ? AND status IN (?, ?) AND scheduled_at < ? AND end_at > ?",
			serviceID,
			models.BookingStatusPending, models.BookingStatusConfirmed,
			endAt, req.ScheduledAt).
		Count(&conflictCount)

	if conflictCount > 0 {
		return nil, errors.New("time slot is already booked")
	}

	// Create booking
	booking := models.ServiceBooking{
		ServiceID:       serviceID,
		TariffID:        req.TariffID,
		ClientID:        clientID,
		ScheduledAt:     req.ScheduledAt,
		DurationMinutes: duration,
		EndAt:           endAt,
		Status:          models.BookingStatusPending,
		PricePaid:       tariff.Price,
		ClientNote:      req.ClientNote,
	}

	if err := database.DB.Create(&booking).Error; err != nil {
		return nil, err
	}

	// Hold LakshMoney from client (if paid service)
	// Funds are frozen until booking is completed or cancelled
	if service.AccessType == models.ServiceAccessPaid && tariff.Price > 0 {
		err := s.walletService.HoldFunds(
			clientID,
			tariff.Price,
			booking.ID,
			"Бронирование: "+service.Title,
		)
		if err != nil {
			// Rollback booking
			database.DB.Delete(&booking)
			return nil, errors.New("payment hold failed: " + err.Error())
		}
	}

	// Referral Activation: If this is the user's first spend/hold, activate their referral
	if s.referralService != nil {
		go func(uid uint) {
			if err := s.referralService.ProcessActivation(uid); err != nil {
				log.Printf("[Referral] Activation failed for user %d during booking: %v", uid, err)
			}
		}(clientID)
	}

	// Increment bookings count
	database.DB.Model(service).Update("bookings_count", service.BookingsCount+1)

	// Load relations
	database.DB.Preload("Service.Owner").Preload("Tariff").Preload("Client").First(&booking, booking.ID)

	log.Printf("[Booking] Created booking %d for service %d by user %d", booking.ID, serviceID, clientID)

	// Send push notification to service owner
	go func() {
		var client models.User
		database.DB.First(&client, clientID)
		clientName := client.KarmicName
		if clientName == "" {
			clientName = "Клиент"
		}
		GetPushService().SendNewBookingToProvider(
			service.OwnerID,
			booking.ID,
			service.Title,
			clientName,
			booking.ScheduledAt,
		)
	}()

	return &booking, nil
}

// Confirm confirms a pending booking
func (s *BookingService) Confirm(bookingID, ownerID uint, req models.BookingActionRequest) (*models.ServiceBooking, error) {
	var booking models.ServiceBooking
	if err := database.DB.Preload("Service").First(&booking, bookingID).Error; err != nil {
		return nil, errors.New("booking not found")
	}

	if booking.Service.OwnerID != ownerID {
		return nil, errors.New("not authorized")
	}

	if booking.Status != models.BookingStatusPending {
		return nil, errors.New("booking is not pending")
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":        models.BookingStatusConfirmed,
		"confirmed_at":  &now,
		"provider_note": req.Note,
	}

	if err := database.DB.Model(&booking).Updates(updates).Error; err != nil {
		return nil, err
	}

	log.Printf("[Booking] Confirmed booking %d", bookingID)

	// Send push notification to client
	go func() {
		GetPushService().SendBookingConfirmedToClient(
			booking.ClientID,
			booking.ID,
			booking.Service.Title,
			booking.ScheduledAt,
		)
	}()

	// Create chat room between client and provider
	go func() {
		room := models.Room{
			Name:        "Консультация: " + booking.Service.Title,
			Description: "Чат для консультации",
			OwnerID:     booking.Service.OwnerID,
			IsPublic:    false,
		}
		if err := database.DB.Create(&room).Error; err != nil {
			log.Printf("[Booking] Failed to create chat room: %v", err)
			return
		}

		// Add both users to the room
		database.DB.Create(&models.RoomMember{
			RoomID: room.ID,
			UserID: booking.Service.OwnerID,
			Role:   "admin",
		})
		database.DB.Create(&models.RoomMember{
			RoomID: room.ID,
			UserID: booking.ClientID,
			Role:   "member",
		})

		// Update booking with chat room ID
		database.DB.Model(&models.ServiceBooking{}).Where("id = ?", bookingID).Update("chat_room_id", room.ID)

		log.Printf("[Booking] Created chat room %d for booking %d", room.ID, bookingID)
	}()

	database.DB.Preload("Service.Owner").Preload("Tariff").Preload("Client").First(&booking, bookingID)
	return &booking, nil
}

// Cancel cancels a booking
func (s *BookingService) Cancel(bookingID, userID uint, req models.BookingActionRequest) (*models.ServiceBooking, error) {
	var booking models.ServiceBooking
	if err := database.DB.Preload("Service").First(&booking, bookingID).Error; err != nil {
		return nil, errors.New("booking not found")
	}

	// Check authorization: either client or owner can cancel
	isOwner := booking.Service.OwnerID == userID
	isClient := booking.ClientID == userID

	if !isOwner && !isClient {
		return nil, errors.New("not authorized")
	}

	if booking.Status == models.BookingStatusCompleted || booking.Status == models.BookingStatusCancelled {
		return nil, errors.New("booking cannot be cancelled")
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":       models.BookingStatusCancelled,
		"cancelled_at": &now,
		"cancelled_by": &userID,
	}

	if isOwner {
		updates["provider_note"] = req.Reason
	} else {
		updates["client_note"] = req.Reason
	}

	if err := database.DB.Model(&booking).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Refund hold if cancelled (money was frozen, not transferred)
	if booking.PricePaid > 0 {
		if err := s.walletService.RefundHold(
			booking.ClientID,
			booking.PricePaid,
			booking.ID,
			"Отмена бронирования: "+req.Reason,
		); err != nil {
			log.Printf("[Booking] Failed to refund hold for booking %d: %v", bookingID, err)
		}
	}

	log.Printf("[Booking] Cancelled booking %d by user %d", bookingID, userID)

	// Send push notifications
	go func() {
		if isOwner {
			// Provider cancelled - notify client
			GetPushService().SendBookingCancelledToClient(
				booking.ClientID,
				booking.ID,
				booking.Service.Title,
				req.Reason,
			)
		} else {
			// Client cancelled - notify provider
			var client models.User
			database.DB.First(&client, booking.ClientID)
			clientName := client.KarmicName
			if clientName == "" {
				clientName = "Клиент"
			}
			GetPushService().SendBookingCancelledToProvider(
				booking.Service.OwnerID,
				booking.ID,
				booking.Service.Title,
				clientName,
			)
		}
	}()

	database.DB.Preload("Service.Owner").Preload("Tariff").Preload("Client").First(&booking, bookingID)
	return &booking, nil
}

// Complete marks a booking as completed
func (s *BookingService) Complete(bookingID, ownerID uint, req models.BookingActionRequest) (*models.ServiceBooking, error) {
	var booking models.ServiceBooking
	if err := database.DB.Preload("Service").First(&booking, bookingID).Error; err != nil {
		return nil, errors.New("booking not found")
	}

	if booking.Service.OwnerID != ownerID {
		return nil, errors.New("not authorized")
	}

	if booking.Status != models.BookingStatusConfirmed {
		return nil, errors.New("booking must be confirmed first")
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":        models.BookingStatusCompleted,
		"completed_at":  &now,
		"provider_note": req.Note,
	}

	if err := database.DB.Model(&booking).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Release held funds to provider
	if booking.PricePaid > 0 {
		if err := s.walletService.ReleaseFunds(
			booking.ClientID,
			booking.PricePaid,
			booking.ID,
			booking.Service.OwnerID,
			"Оплата услуги: "+booking.Service.Title,
		); err != nil {
			log.Printf("[Booking] Failed to release funds for booking %d: %v", bookingID, err)
			// Don't fail completion, just log
		}
	}

	log.Printf("[Booking] Completed booking %d", bookingID)

	// Send push notification to client
	go func() {
		var owner models.User
		database.DB.First(&owner, booking.Service.OwnerID)
		providerName := owner.KarmicName
		if providerName == "" {
			providerName = "специалиста"
		}
		GetPushService().SendBookingCompleted(
			booking.ClientID,
			booking.ID,
			booking.Service.Title,
			providerName,
		)
	}()

	database.DB.Preload("Service.Owner").Preload("Tariff").Preload("Client").First(&booking, bookingID)
	return &booking, nil
}

// MarkNoShow marks that the client didn't show up
func (s *BookingService) MarkNoShow(bookingID, ownerID uint) (*models.ServiceBooking, error) {
	var booking models.ServiceBooking
	if err := database.DB.Preload("Service").First(&booking, bookingID).Error; err != nil {
		return nil, errors.New("booking not found")
	}

	if booking.Service.OwnerID != ownerID {
		return nil, errors.New("not authorized")
	}

	if booking.Status != models.BookingStatusConfirmed {
		return nil, errors.New("booking must be confirmed")
	}

	if err := database.DB.Model(&booking).Update("status", models.BookingStatusNoShow).Error; err != nil {
		return nil, err
	}

	// Release funds to provider on no-show (client penalty)
	if booking.PricePaid > 0 {
		if err := s.walletService.ReleaseFunds(
			booking.ClientID,
			booking.PricePaid,
			booking.ID,
			booking.Service.OwnerID,
			"Неявка клиента: "+booking.Service.Title,
		); err != nil {
			log.Printf("[Booking] Failed to release funds for no-show booking %d: %v", bookingID, err)
		}
	}

	log.Printf("[Booking] Marked booking %d as no-show", bookingID)

	database.DB.Preload("Service.Owner").Preload("Tariff").Preload("Client").First(&booking, bookingID)
	return &booking, nil
}

// GetMyBookings returns bookings where user is the client
func (s *BookingService) GetMyBookings(clientID uint, filters models.BookingFilters) (*models.BookingListResponse, error) {
	query := database.DB.Where("client_id = ?", clientID)

	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.ServiceID != nil {
		query = query.Where("service_id = ?", *filters.ServiceID)
	}
	if filters.DateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			query = query.Where("scheduled_at >= ?", dateFrom)
		}
	}
	if filters.DateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			query = query.Where("scheduled_at < ?", dateTo.Add(24*time.Hour))
		}
	}

	var total int64
	query.Model(&models.ServiceBooking{}).Count(&total)

	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var bookings []models.ServiceBooking
	err := query.
		Preload("Service.Owner").
		Preload("Tariff").
		Order("scheduled_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&bookings).Error

	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.BookingListResponse{
		Bookings:   bookings,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// GetIncomingBookings returns bookings for services owned by the user
func (s *BookingService) GetIncomingBookings(ownerID uint, filters models.BookingFilters) (*models.BookingListResponse, error) {
	// Get all service IDs owned by this user
	var serviceIDs []uint
	database.DB.Model(&models.Service{}).Where("owner_id = ?", ownerID).Pluck("id", &serviceIDs)

	if len(serviceIDs) == 0 {
		return &models.BookingListResponse{
			Bookings:   []models.ServiceBooking{},
			Total:      0,
			Page:       1,
			Limit:      20,
			TotalPages: 0,
		}, nil
	}

	query := database.DB.Where("service_id IN ?", serviceIDs)

	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.ServiceID != nil {
		query = query.Where("service_id = ?", *filters.ServiceID)
	}
	if filters.DateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			query = query.Where("scheduled_at >= ?", dateFrom)
		}
	}
	if filters.DateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			query = query.Where("scheduled_at < ?", dateTo.Add(24*time.Hour))
		}
	}

	var total int64
	query.Model(&models.ServiceBooking{}).Count(&total)

	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var bookings []models.ServiceBooking
	err := query.
		Preload("Service").
		Preload("Tariff").
		Preload("Client").
		Order("scheduled_at ASC").
		Offset(offset).
		Limit(limit).
		Find(&bookings).Error

	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.BookingListResponse{
		Bookings:   bookings,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// GetUpcoming returns upcoming bookings categorized by time
func (s *BookingService) GetUpcoming(ownerID uint) (*models.UpcomingBookingsResponse, error) {
	var serviceIDs []uint
	database.DB.Model(&models.Service{}).Where("owner_id = ?", ownerID).Pluck("id", &serviceIDs)

	response := &models.UpcomingBookingsResponse{
		Today:    []models.ServiceBooking{},
		Tomorrow: []models.ServiceBooking{},
		ThisWeek: []models.ServiceBooking{},
		Pending:  []models.ServiceBooking{},
	}

	if len(serviceIDs) == 0 {
		return response, nil
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.Add(24 * time.Hour)
	dayAfterTomorrow := tomorrow.Add(24 * time.Hour)
	endOfWeek := today.Add(7 * 24 * time.Hour)

	// Today's confirmed bookings
	database.DB.Where("service_id IN ? AND status = ? AND scheduled_at >= ? AND scheduled_at < ?",
		serviceIDs, models.BookingStatusConfirmed, today, tomorrow).
		Preload("Client").Preload("Tariff").
		Order("scheduled_at ASC").
		Find(&response.Today)

	// Tomorrow's confirmed bookings
	database.DB.Where("service_id IN ? AND status = ? AND scheduled_at >= ? AND scheduled_at < ?",
		serviceIDs, models.BookingStatusConfirmed, tomorrow, dayAfterTomorrow).
		Preload("Client").Preload("Tariff").
		Order("scheduled_at ASC").
		Find(&response.Tomorrow)

	// This week (after tomorrow)
	database.DB.Where("service_id IN ? AND status = ? AND scheduled_at >= ? AND scheduled_at < ?",
		serviceIDs, models.BookingStatusConfirmed, dayAfterTomorrow, endOfWeek).
		Preload("Client").Preload("Tariff").
		Order("scheduled_at ASC").
		Find(&response.ThisWeek)

	// Pending (awaiting confirmation)
	database.DB.Where("service_id IN ? AND status = ?",
		serviceIDs, models.BookingStatusPending).
		Preload("Client").Preload("Tariff").
		Order("created_at DESC").
		Find(&response.Pending)

	return response, nil
}
