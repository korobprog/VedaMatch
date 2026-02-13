package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ServiceHandler handles service-related HTTP requests
type ServiceHandler struct {
	serviceService *services.ServiceService
}

// NewServiceHandler creates a new service handler
func NewServiceHandler() *ServiceHandler {
	return &ServiceHandler{
		serviceService: services.NewServiceService(),
	}
}

// List returns paginated list of active services
// GET /api/services
func (h *ServiceHandler) List(c *fiber.Ctx) error {
	filters := models.ServiceFilters{
		Category:     models.ServiceCategory(c.Query("category")),
		ScheduleType: models.ServiceScheduleType(c.Query("scheduleType")),
		Channel:      models.ServiceChannel(c.Query("channel")),
		AccessType:   models.ServiceAccessType(c.Query("accessType")),
		Language:     c.Query("language"),
		Search:       c.Query("search"),
	}

	if page, err := strconv.Atoi(c.Query("page", "1")); err == nil {
		filters.Page = page
	}
	if limit, err := strconv.Atoi(c.Query("limit", "20")); err == nil {
		filters.Limit = limit
	}
	if lat, err := strconv.ParseFloat(c.Query("nearLat"), 64); err == nil {
		filters.NearLat = &lat
	}
	if lng, err := strconv.ParseFloat(c.Query("nearLng"), 64); err == nil {
		filters.NearLng = &lng
	}
	if radius, err := strconv.ParseFloat(c.Query("radiusKm"), 64); err == nil {
		filters.RadiusKm = &radius
	}

	result, err := h.serviceService.List(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(result)
}

// GetByID returns a single service with details
// GET /api/services/:id
func (h *ServiceHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid service ID",
		})
	}

	service, err := h.serviceService.GetByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Service not found",
		})
	}

	return c.JSON(service)
}

// Create creates a new service
// POST /api/services
func (h *ServiceHandler) Create(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.ServiceCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	service, err := h.serviceService.Create(userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(service)
}

// Update updates a service
// PUT /api/services/:id
func (h *ServiceHandler) Update(c *fiber.Ctx) error {
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

	var req models.ServiceUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	service, err := h.serviceService.Update(uint(serviceID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(service)
}

// Delete soft-deletes a service
// DELETE /api/services/:id
func (h *ServiceHandler) Delete(c *fiber.Ctx) error {
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

	if err := h.serviceService.Delete(uint(serviceID), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true})
}

// GetMyServices returns services owned by current user
// GET /api/services/my
func (h *ServiceHandler) GetMyServices(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	services, err := h.serviceService.GetMyServices(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"services": services,
	})
}

// Publish changes service status to active
// POST /api/services/:id/publish
func (h *ServiceHandler) Publish(c *fiber.Ctx) error {
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

	if err := h.serviceService.Publish(uint(serviceID), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true, "status": "active"})
}

// Pause changes service status to paused
// POST /api/services/:id/pause
func (h *ServiceHandler) Pause(c *fiber.Ctx) error {
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

	if err := h.serviceService.Pause(uint(serviceID), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true, "status": "paused"})
}

// ==================== TARIFF HANDLERS ====================

// GetTariffs returns tariffs for a service
// GET /api/services/:id/tariffs
func (h *ServiceHandler) GetTariffs(c *fiber.Ctx) error {
	serviceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid service ID",
		})
	}

	tariffs, err := h.serviceService.GetTariffs(uint(serviceID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"tariffs": tariffs})
}

// AddTariff adds a tariff to a service
// POST /api/services/:id/tariffs
func (h *ServiceHandler) AddTariff(c *fiber.Ctx) error {
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

	var req models.TariffCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	tariff, err := h.serviceService.AddTariff(uint(serviceID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(tariff)
}

// UpdateTariff updates a tariff
// PUT /api/tariffs/:id
func (h *ServiceHandler) UpdateTariff(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	tariffID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tariff ID",
		})
	}

	var req models.TariffUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	tariff, err := h.serviceService.UpdateTariff(uint(tariffID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(tariff)
}

// DeleteTariff deactivates a tariff
// DELETE /api/tariffs/:id
func (h *ServiceHandler) DeleteTariff(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	tariffID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tariff ID",
		})
	}

	if err := h.serviceService.DeleteTariff(uint(tariffID), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true})
}

// ==================== SCHEDULE HANDLERS ====================

// GetSchedules returns schedules for a service
// GET /api/services/:id/schedule
func (h *ServiceHandler) GetSchedules(c *fiber.Ctx) error {
	serviceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid service ID",
		})
	}

	schedules, err := h.serviceService.GetSchedules(uint(serviceID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"schedules": schedules})
}

// AddSchedule adds a schedule slot to a service
// POST /api/services/:id/schedule
func (h *ServiceHandler) AddSchedule(c *fiber.Ctx) error {
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

	var req models.ScheduleCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	schedule, err := h.serviceService.AddSchedule(uint(serviceID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(schedule)
}

// DeleteSchedule deactivates a schedule
// DELETE /api/schedule/:id
func (h *ServiceHandler) DeleteSchedule(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	scheduleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	if err := h.serviceService.DeleteSchedule(uint(scheduleID), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true})
}

// GetWeeklySchedule returns weekly schedule configuration for a service
// GET /api/services/:id/schedule/weekly
func (h *ServiceHandler) GetWeeklySchedule(c *fiber.Ctx) error {
	serviceID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid service ID",
		})
	}

	config, err := h.serviceService.GetWeeklySchedule(uint(serviceID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(config)
}

// UpdateWeeklySchedule updates weekly schedule configuration
// PUT /api/services/:id/schedule/weekly
func (h *ServiceHandler) UpdateWeeklySchedule(c *fiber.Ctx) error {
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

	var req models.WeeklyScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := h.serviceService.UpdateWeeklySchedule(uint(serviceID), userID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true})
}

// UploadPhoto handles cover image upload for services
// POST /api/services/upload
func (h *ServiceHandler) UploadPhoto(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No photo file provided"})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("services/%d_%d%s", userID, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			photoURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				return c.JSON(fiber.Map{"photoUrl": photoURL})
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadDir := "./uploads/services"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	filename := fmt.Sprintf("%d_%d_%s", userID, time.Now().Unix(), file.Filename)
	filepath := filepath.Join(uploadDir, filename)

	if err := c.SaveFile(file, filepath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save photo"})
	}

	photoURL := fmt.Sprintf("/uploads/services/%s", filename)
	return c.JSON(fiber.Map{"photoUrl": photoURL})
}
