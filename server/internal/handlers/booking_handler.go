package handlers

import (
	"fmt"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type bookingService interface {
	Create(serviceID, clientID uint, req models.BookingCreateRequest) (*models.ServiceBooking, error)
	GetMyBookings(clientID uint, filters models.BookingFilters) (*models.BookingListResponse, error)
	GetIncomingBookings(ownerID uint, filters models.BookingFilters) (*models.BookingListResponse, error)
	GetUpcoming(ownerID uint) (*models.UpcomingBookingsResponse, error)
	Confirm(bookingID, ownerID uint, req models.BookingActionRequest) (*models.ServiceBooking, error)
	Cancel(bookingID, userID uint, req models.BookingActionRequest) (*models.ServiceBooking, error)
	Complete(bookingID, ownerID uint, req models.BookingActionRequest) (*models.ServiceBooking, error)
	MarkNoShow(bookingID, ownerID uint) (*models.ServiceBooking, error)
	GetBookingForUser(bookingID, userID uint) (*models.ServiceBooking, error)
}

type bookingCalendarService interface {
	GetSlotsForRange(serviceID uint, dateFrom, dateTo, timezone string) ([]models.SlotsResponse, error)
	GetAvailableSlots(serviceID uint, date, timezone string) (*models.SlotsResponse, error)
	GetBusyTimes(userID uint, dateFrom, dateTo string) ([]models.ServiceBooking, error)
}

// BookingHandler handles booking-related HTTP requests
type BookingHandler struct {
	bookingService  bookingService
	calendarService bookingCalendarService
}

// NewBookingHandler creates a new booking handler
func NewBookingHandler(bookingService bookingService, calendarService bookingCalendarService) *BookingHandler {
	return &BookingHandler{
		bookingService:  bookingService,
		calendarService: calendarService,
	}
}

// Book creates a new booking
// POST /api/services/:id/book
func (h *BookingHandler) Book(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	serviceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid service ID",
		})
	}

	var body struct {
		TariffID        uint   `json:"tariffId"`
		ScheduledAt     string `json:"scheduledAt"` // ISO format
		ClientNote      string `json:"clientNote"`
		Source          string `json:"source"`
		SourcePostID    *uint  `json:"sourcePostId"`
		SourceChannelID *uint  `json:"sourceChannelId"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	scheduledAt, err := time.Parse(time.RFC3339, body.ScheduledAt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid date format, use ISO 8601",
		})
	}

	req := models.BookingCreateRequest{
		TariffID:        body.TariffID,
		ScheduledAt:     scheduledAt,
		ClientNote:      body.ClientNote,
		Source:          body.Source,
		SourcePostID:    body.SourcePostID,
		SourceChannelID: body.SourceChannelID,
	}

	booking, err := h.bookingService.Create(uint(serviceID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(booking)
}

// GetMyBookings returns bookings where user is the client
// GET /api/bookings/my
func (h *BookingHandler) GetMyBookings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	filters := models.BookingFilters{
		Status:   models.BookingStatus(c.Query("status")),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	if page, err := strconv.Atoi(c.Query("page", "1")); err == nil {
		filters.Page = page
	}
	if limit, err := strconv.Atoi(c.Query("limit", "20")); err == nil {
		filters.Limit = limit
	}
	if serviceID, err := strconv.ParseUint(c.Query("serviceId"), 10, 32); err == nil {
		sid := uint(serviceID)
		filters.ServiceID = &sid
	}

	result, err := h.bookingService.GetMyBookings(userID, filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetIncomingBookings returns bookings for services owned by user
// GET /api/bookings/incoming
func (h *BookingHandler) GetIncomingBookings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	filters := models.BookingFilters{
		Status:   models.BookingStatus(c.Query("status")),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	if page, err := strconv.Atoi(c.Query("page", "1")); err == nil {
		filters.Page = page
	}
	if limit, err := strconv.Atoi(c.Query("limit", "20")); err == nil {
		filters.Limit = limit
	}

	result, err := h.bookingService.GetIncomingBookings(userID, filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetUpcoming returns upcoming bookings categorized by time
// GET /api/bookings/upcoming
func (h *BookingHandler) GetUpcoming(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	result, err := h.bookingService.GetUpcoming(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// Confirm confirms a pending booking
// PUT /api/bookings/:id/confirm
func (h *BookingHandler) Confirm(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	bookingID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid booking ID",
		})
	}

	var req models.BookingActionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	booking, err := h.bookingService.Confirm(uint(bookingID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(booking)
}

// Cancel cancels a booking
// PUT /api/bookings/:id/cancel
func (h *BookingHandler) Cancel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	bookingID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid booking ID",
		})
	}

	var req models.BookingActionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	booking, err := h.bookingService.Cancel(uint(bookingID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(booking)
}

// Complete marks a booking as completed
// PUT /api/bookings/:id/complete
func (h *BookingHandler) Complete(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	bookingID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid booking ID",
		})
	}

	var req models.BookingActionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	booking, err := h.bookingService.Complete(uint(bookingID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(booking)
}

// NoShow marks that the client didn't show up
// PUT /api/bookings/:id/no-show
func (h *BookingHandler) NoShow(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	bookingID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid booking ID",
		})
	}

	booking, err := h.bookingService.MarkNoShow(uint(bookingID), userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(booking)
}

// ==================== CALENDAR/SLOTS ====================

// GetSlots returns available slots for a service on a given date
// GET /api/services/:id/slots
func (h *BookingHandler) GetSlots(c *fiber.Ctx) error {
	serviceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid service ID",
		})
	}

	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	timezone := c.Query("timezone", "Europe/Moscow")

	// Check if range query
	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")

	if dateFrom != "" && dateTo != "" {
		slots, err := h.calendarService.GetSlotsForRange(uint(serviceID), dateFrom, dateTo, timezone)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(fiber.Map{
			"serviceId": serviceID,
			"dateFrom":  dateFrom,
			"dateTo":    dateTo,
			"days":      slots,
		})
	}

	slots, err := h.calendarService.GetAvailableSlots(uint(serviceID), date, timezone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(slots)
}

// GetBusyTimes returns busy times for a service owner
// GET /api/calendar/busy
func (h *BookingHandler) GetBusyTimes(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")

	if dateFrom == "" {
		dateFrom = time.Now().Format("2006-01-02")
	}
	if dateTo == "" {
		dateTo = time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02")
	}

	bookings, err := h.calendarService.GetBusyTimes(userID, dateFrom, dateTo)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"dateFrom": dateFrom,
		"dateTo":   dateTo,
		"bookings": bookings,
	})
}

// ExportBookingICS returns calendar event in ICS format.
// GET /api/bookings/:id/calendar.ics
func (h *BookingHandler) ExportBookingICS(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	bookingID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid booking ID"})
	}

	booking, err := h.bookingService.GetBookingForUser(uint(bookingID), userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if booking.Service == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "service data is unavailable"})
	}

	nowUTC := time.Now().UTC().Format("20060102T150405Z")
	startUTC := booking.ScheduledAt.UTC().Format("20060102T150405Z")
	endUTC := booking.EndAt.UTC().Format("20060102T150405Z")

	summary := escapeICSLine(strings.TrimSpace(booking.Service.Title))
	if summary == "" {
		summary = "Sadhu Sanga Seminar"
	}

	descriptionParts := []string{
		"Booking #" + strconv.FormatUint(uint64(booking.ID), 10),
	}
	if note := strings.TrimSpace(booking.ClientNote); note != "" {
		descriptionParts = append(descriptionParts, "Note: "+note)
	}
	if link := strings.TrimSpace(booking.MeetingLink); link != "" {
		descriptionParts = append(descriptionParts, "Meeting: "+link)
	}
	description := escapeICSLine(strings.Join(descriptionParts, "\\n"))

	location := strings.TrimSpace(booking.Service.OfflineAddress)
	locationEscaped := escapeICSLine(location)

	uid := fmt.Sprintf("booking-%d@vedicai", booking.ID)
	ics := strings.Builder{}
	ics.WriteString("BEGIN:VCALENDAR\r\n")
	ics.WriteString("VERSION:2.0\r\n")
	ics.WriteString("PRODID:-//VedaMatch//Sadhu Sanga//EN\r\n")
	ics.WriteString("CALSCALE:GREGORIAN\r\n")
	ics.WriteString("METHOD:PUBLISH\r\n")
	ics.WriteString("BEGIN:VEVENT\r\n")
	ics.WriteString("UID:" + uid + "\r\n")
	ics.WriteString("DTSTAMP:" + nowUTC + "\r\n")
	ics.WriteString("DTSTART:" + startUTC + "\r\n")
	ics.WriteString("DTEND:" + endUTC + "\r\n")
	ics.WriteString("SUMMARY:" + summary + "\r\n")
	ics.WriteString("DESCRIPTION:" + description + "\r\n")
	if locationEscaped != "" {
		ics.WriteString("LOCATION:" + locationEscaped + "\r\n")
	}
	ics.WriteString("END:VEVENT\r\n")
	ics.WriteString("END:VCALENDAR\r\n")

	filename := fmt.Sprintf("booking-%d.ics", booking.ID)
	c.Set("Content-Type", "text/calendar; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.SendString(ics.String())
}

func escapeICSLine(value string) string {
	v := strings.TrimSpace(value)
	if v == "" {
		return ""
	}
	v = strings.ReplaceAll(v, "\\", "\\\\")
	v = strings.ReplaceAll(v, ";", "\\;")
	v = strings.ReplaceAll(v, ",", "\\,")
	v = strings.ReplaceAll(v, "\r\n", "\\n")
	v = strings.ReplaceAll(v, "\n", "\\n")
	v = strings.ReplaceAll(v, "\r", "\\n")
	return v
}
