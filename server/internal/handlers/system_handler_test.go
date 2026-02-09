package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
)

func TestGetPortalBlueprint_HasHeroServicesAndDescription(t *testing.T) {
	app := fiber.New()
	handler := NewSystemHandler()
	app.Get("/system/portal-blueprint/:role", handler.GetPortalBlueprint)

	req := httptest.NewRequest("GET", "/system/portal-blueprint/devotee", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		Blueprint PortalBlueprint `json:"blueprint"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body.Blueprint.Description)
	require.NotEmpty(t, body.Blueprint.HeroServices)
}

func TestGetGodModeMathFilters_ReturnsAllMathFilters(t *testing.T) {
	app := fiber.New()
	handler := NewSystemHandler()
	app.Get("/system/god-mode-math-filters", handler.GetGodModeMathFilters)

	req := httptest.NewRequest("GET", "/system/god-mode-math-filters", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body struct {
		MathFilters []MathFilter `json:"mathFilters"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.NotEmpty(t, body.MathFilters)
	for _, mf := range body.MathFilters {
		require.NotEmpty(t, mf.MathID)
		require.NotEmpty(t, mf.Filters)
	}
}
