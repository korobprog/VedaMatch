package handlers

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestNormalizeMathaParamPrecedence(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString(normalizeMathaParam(c))
	})

	cases := []struct {
		name string
		url  string
		want string
	}{
		{name: "matha priority", url: "/?matha=a&madh=b&math=c", want: "a"},
		{name: "madh fallback", url: "/?madh=b&math=c", want: "b"},
		{name: "math fallback", url: "/?math=c", want: "c"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tc.url, nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test failed: %v", err)
			}
			body, _ := io.ReadAll(resp.Body)
			got := string(body)
			if got != tc.want {
				t.Fatalf("normalizeMathaParam got %q, want %q", got, tc.want)
			}
		})
	}
}
