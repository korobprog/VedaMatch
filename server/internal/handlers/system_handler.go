package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

type SystemHandler struct{}

func NewSystemHandler() *SystemHandler {
	return &SystemHandler{}
}

func (h *SystemHandler) GetPortalBlueprint(c *fiber.Ctx) error {
	role := strings.TrimSpace(strings.ToLower(c.Params("role")))
	blueprint := GetPortalBlueprintForRole(role)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"blueprint": blueprint,
	})
}

func (h *SystemHandler) GetGodModeMathFilters(c *fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"mathFilters": GetAllGodModeMathFilters(),
	})
}
