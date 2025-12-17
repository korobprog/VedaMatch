package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

type ChatHandler struct{}

func NewChatHandler() *ChatHandler {
	return &ChatHandler{}
}

func (h *ChatHandler) HandleChat(c *fiber.Ctx) error {
	// Parse request body
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// Get API Key from env
	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		log.Println("Error: API_OPEN_AI is not set in environment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	// Prepare request to external API
	externalURL := "https://rvlautoai.ru/webhook/v1/chat/completions"
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal request",
		})
	}

	req, err := http.NewRequest("POST", externalURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create request",
		})
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error forwarding request to AI API: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "Failed to contact AI service",
		})
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read response",
		})
	}

	// Forward status code and body
	c.Status(resp.StatusCode)
	c.Set("Content-Type", "application/json")
	return c.Send(respBody)
}

func (h *ChatHandler) HandleModels(c *fiber.Ctx) error {
	// Get API Key from env
	apiKey := os.Getenv("API_OPEN_AI")
	if apiKey == "" {
		log.Println("Error: API_OPEN_AI is not set in environment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	// Get provider query parameter if present
	provider := c.Query("provider")
	externalURL := "https://rvlautoai.ru/webhook/v1/models"
	if provider != "" {
		externalURL += "?provider=" + provider
	}

	// Create GET request
	req, err := http.NewRequest("GET", externalURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create request",
		})
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error forwarding request to AI API: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "Failed to contact AI service",
		})
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read response",
		})
	}

	// Forward status code and body
	c.Status(resp.StatusCode)
	c.Set("Content-Type", "application/json")
	return c.Send(respBody)
}
