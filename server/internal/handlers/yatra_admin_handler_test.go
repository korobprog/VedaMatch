package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestParseBoundedQueryInt(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"page":  parseBoundedQueryInt(c, "page", 1, 1, 100),
			"limit": parseBoundedQueryInt(c, "limit", 20, 1, 50),
		})
	})

	req := httptest.NewRequest("GET", "/?page=0&limit=999", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	defer resp.Body.Close()

	var payload map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["page"] != 1 {
		t.Fatalf("expected clamped page=1, got %d", payload["page"])
	}
	if payload["limit"] != 50 {
		t.Fatalf("expected clamped limit=50, got %d", payload["limit"])
	}
}

func TestParseBoundedQueryInt_TrimsValue(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"page": parseBoundedQueryInt(c, "page", 1, 1, 100),
		})
	})

	req := httptest.NewRequest("GET", "/?page=%202%20", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	defer resp.Body.Close()

	var payload map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if payload["page"] != 2 {
		t.Fatalf("expected parsed page=2, got %d", payload["page"])
	}
}

func TestParseYatraAdminBoolQuery(t *testing.T) {
	if !parseYatraAdminBoolQuery("TRUE") {
		t.Fatalf("expected TRUE to parse as true")
	}
	if !parseYatraAdminBoolQuery("1") {
		t.Fatalf("expected 1 to parse as true")
	}
	if parseYatraAdminBoolQuery("off") {
		t.Fatalf("expected off to parse as false")
	}
}

func TestRequireYatraReporterUserID_AllowsAuthenticatedUser(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		c.Locals("userID", uint(42))
		id, err := requireYatraReporterUserID(c)
		if err != nil {
			return err
		}
		return c.JSON(fiber.Map{"userId": id})
	})

	req := httptest.NewRequest("GET", "/", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestRequireYatraAdminUserID_RequiresAdminRole(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		c.Locals("userID", uint(7))
		c.Locals("userRole", "user")
		_, err := requireYatraAdminUserID(c)
		return err
	})

	req := httptest.NewRequest("GET", "/", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}
