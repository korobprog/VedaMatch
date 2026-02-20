package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
)

func newRoomSupportIntegrationApp(handler *RoomHandler, userID uint) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if userID > 0 {
			c.Locals("userID", userID)
		}
		return c.Next()
	})
	app.Get("/rooms/support-config", handler.GetSupportConfig)
	app.Get("/support/config", handler.GetUnifiedSupportConfig)
	return app
}

func TestRoomSupportConfig_IntegrationAuthRequired(t *testing.T) {
	handler := NewRoomHandler()
	app := newRoomSupportIntegrationApp(handler, 0)

	req := httptest.NewRequest("GET", "/rooms/support-config", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestRoomSupportConfig_IntegrationDefaults(t *testing.T) {
	handler := NewRoomHandler()
	app := newRoomSupportIntegrationApp(handler, 101)
	t.Setenv("ROOMS_SUPPORT_ENABLED", "true")
	t.Setenv("ROOMS_SUPPORT_PROJECT_ID", "42")
	t.Setenv("ROOMS_SUPPORT_DEFAULT_AMOUNT", "20")
	t.Setenv("ROOMS_SUPPORT_PROMPT_COOLDOWN_HOURS", "24")

	req := httptest.NewRequest("GET", "/rooms/support-config", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, true, payload["enabled"])
	require.EqualValues(t, 42, int(payload["projectId"].(float64)))
	require.EqualValues(t, 20, int(payload["defaultAmount"].(float64)))
	require.EqualValues(t, 24, int(payload["cooldownHours"].(float64)))
}

func TestRoomSupportConfig_IntegrationDisabled(t *testing.T) {
	handler := NewRoomHandler()
	app := newRoomSupportIntegrationApp(handler, 101)
	t.Setenv("ROOMS_SUPPORT_ENABLED", "false")
	t.Setenv("ROOMS_SUPPORT_PROJECT_ID", "42")

	req := httptest.NewRequest("GET", "/rooms/support-config", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, false, payload["enabled"])
}

func TestRoomSupportConfig_IntegrationInvalidProjectWhenEnabled(t *testing.T) {
	handler := NewRoomHandler()
	app := newRoomSupportIntegrationApp(handler, 101)
	t.Setenv("ROOMS_SUPPORT_ENABLED", "true")
	t.Setenv("ROOMS_SUPPORT_PROJECT_ID", "0")

	req := httptest.NewRequest("GET", "/rooms/support-config", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, false, payload["enabled"])
}

func TestUnifiedSupportConfig_IntegrationForServiceQuery(t *testing.T) {
	handler := NewRoomHandler()
	app := newRoomSupportIntegrationApp(handler, 101)
	t.Setenv("SEVA_SUPPORT_ENABLED", "true")
	t.Setenv("SEVA_SUPPORT_PROJECT_ID", "77")
	t.Setenv("SEVA_SUPPORT_DEFAULT_AMOUNT", "30")

	req := httptest.NewRequest("GET", "/support/config?service=seva", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, "seva", payload["service"])
	require.EqualValues(t, 77, int(payload["projectId"].(float64)))
	require.EqualValues(t, 30, int(payload["defaultAmount"].(float64)))
}

func TestUnifiedSupportConfig_IntegrationForMultimediaService(t *testing.T) {
	handler := NewRoomHandler()
	app := newRoomSupportIntegrationApp(handler, 101)
	t.Setenv("MULTIMEDIA_SUPPORT_ENABLED", "true")
	t.Setenv("MULTIMEDIA_SUPPORT_PROJECT_ID", "88")
	t.Setenv("MULTIMEDIA_SUPPORT_DEFAULT_AMOUNT", "15")

	req := httptest.NewRequest("GET", "/support/config?service=multimedia", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var payload map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
	require.Equal(t, "multimedia", payload["service"])
	require.EqualValues(t, 88, int(payload["projectId"].(float64)))
	require.EqualValues(t, 15, int(payload["defaultAmount"].(float64)))
}
