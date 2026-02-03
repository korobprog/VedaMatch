package handlers

import (
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"

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
	userID := c.Locals("userID").(uint)

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
	userID := c.Locals("userID").(uint)
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
	userID := c.Locals("userID").(uint)
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
	userID := c.Locals("userID").(uint)

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
	userID := c.Locals("userID").(uint)
	serviceID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	userID := c.Locals("userID").(uint)
	serviceID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	serviceID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	userID := c.Locals("userID").(uint)
	serviceID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	userID := c.Locals("userID").(uint)
	tariffID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	userID := c.Locals("userID").(uint)
	tariffID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	serviceID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	userID := c.Locals("userID").(uint)
	serviceID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

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
	userID := c.Locals("userID").(uint)
	scheduleID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

	if err := h.serviceService.DeleteSchedule(uint(scheduleID), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"success": true})
}
