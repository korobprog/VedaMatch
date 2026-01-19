package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type PolzaHandler struct{}

func NewPolzaHandler() *PolzaHandler {
	return &PolzaHandler{}
}

// GetStatus returns the Polza API status and configuration
func (h *PolzaHandler) GetStatus(c *fiber.Ctx) error {
	polzaService := services.GetPolzaService()

	// Test connection
	status, err := polzaService.TestConnection()
	if err != nil {
		return c.JSON(fiber.Map{
			"status":     "offline",
			"error":      err.Error(),
			"configured": polzaService.HasApiKey(),
		})
	}

	// Get models info
	fastModel, reasoningModel := polzaService.GetModels()

	return c.JSON(fiber.Map{
		"status":     "online",
		"configured": polzaService.HasApiKey(),
		"health":     status,
		"models": fiber.Map{
			"fast":      fastModel,
			"reasoning": reasoningModel,
		},
	})
}

// GetModels returns available Polza models
func (h *PolzaHandler) GetModels(c *fiber.Ctx) error {
	polzaService := services.GetPolzaService()

	models, err := polzaService.ListModels()
	if err != nil {
		log.Printf("[Polza] Failed to list models: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "Failed to fetch models from Polza.ai",
		})
	}

	return c.JSON(fiber.Map{
		"data":  models,
		"count": len(models),
	})
}

// GetSettings returns current Polza settings from database
func (h *PolzaHandler) GetSettings(c *fiber.Ctx) error {
	settings := make(map[string]string)

	// Get all Polza related settings
	var dbSettings []models.SystemSetting
	database.DB.Where("key LIKE ?", "POLZA_%").Find(&dbSettings)

	for _, s := range dbSettings {
		// Mask API key for security
		if s.Key == "POLZA_API_KEY" && s.Value != "" {
			settings[s.Key] = "sk-***" + s.Value[len(s.Value)-4:]
		} else {
			settings[s.Key] = s.Value
		}
	}

	polzaService := services.GetPolzaService()
	fastModel, reasoningModel := polzaService.GetModels()
	settings["POLZA_FAST_MODEL"] = fastModel
	settings["POLZA_REASONING_MODEL"] = reasoningModel

	return c.JSON(fiber.Map{
		"settings":   settings,
		"configured": polzaService.HasApiKey(),
	})
}

// UpdateSettings updates Polza settings
func (h *PolzaHandler) UpdateSettings(c *fiber.Ctx) error {
	var body struct {
		ApiKey         string `json:"apiKey"`
		FastModel      string `json:"fastModel"`
		ReasoningModel string `json:"reasoningModel"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	polzaService := services.GetPolzaService()

	// Update API key
	if body.ApiKey != "" {
		// Save to database
		database.DB.Where(models.SystemSetting{Key: "POLZA_API_KEY"}).
			Assign(models.SystemSetting{Value: body.ApiKey}).
			FirstOrCreate(&models.SystemSetting{})

		// Update in service
		polzaService.SetApiKey(body.ApiKey)
	}

	// Save model settings
	if body.FastModel != "" {
		database.DB.Where(models.SystemSetting{Key: "POLZA_FAST_MODEL"}).
			Assign(models.SystemSetting{Value: body.FastModel}).
			FirstOrCreate(&models.SystemSetting{})
	}

	if body.ReasoningModel != "" {
		database.DB.Where(models.SystemSetting{Key: "POLZA_REASONING_MODEL"}).
			Assign(models.SystemSetting{Value: body.ReasoningModel}).
			FirstOrCreate(&models.SystemSetting{})
	}

	// Update models in service runtime
	if body.FastModel != "" || body.ReasoningModel != "" {
		polzaService.SetModels(body.FastModel, body.ReasoningModel)
	}

	log.Printf("[Polza] Settings updated: hasApiKey=%v, fastModel=%s, reasoningModel=%s",
		body.ApiKey != "", body.FastModel, body.ReasoningModel)

	return c.JSON(fiber.Map{
		"message": "Settings updated successfully",
	})
}

// TestConnection tests the connection to Polza API
func (h *PolzaHandler) TestConnection(c *fiber.Ctx) error {
	polzaService := services.GetPolzaService()
	// Reload settings from DB before testing
	polzaService.ReloadFromDB()

	status, err := polzaService.TestConnection()
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"status":  status,
	})
}

// TestSmartRouting tests the smart routing with a sample query
func (h *PolzaHandler) TestSmartRouting(c *fiber.Ctx) error {
	var body struct {
		Query string `json:"query"`
		Model string `json:"model"` // optional, to force a specific model
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if body.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Query is required",
		})
	}

	messages := []map[string]string{
		{"role": "user", "content": body.Query},
	}

	polzaService := services.GetPolzaService()
	// Reload settings from DB before testing
	polzaService.ReloadFromDB()

	log.Printf("[Polza Handler] TestSmartRouting: hasApiKey=%v, query=%s", polzaService.HasApiKey(), body.Query)

	if !polzaService.HasApiKey() {
		log.Printf("[Polza Handler] ERROR: No API key configured")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "API ключ Polza.ai не настроен. Введите ключ в настройках выше.",
		})
	}

	model := body.Model
	if model == "" {
		model = "auto" // Let service decide
	}

	log.Printf("[Polza Handler] Making request with model=%s", model)
	response, err := polzaService.SendMessage(model, messages)
	if err != nil {
		log.Printf("[Polza Handler] ERROR: SendMessage failed: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": err.Error(),
			"hint":  "Проверьте правильность API ключа и доступность Polza.ai",
		})
	}

	return c.JSON(fiber.Map{
		"response": response,
		"query":    body.Query,
		"model":    model,
	})
}

// GetModelRecommendations returns recommended models for different use cases
func (h *PolzaHandler) GetModelRecommendations(c *fiber.Ctx) error {
	recommendations := []fiber.Map{
		{
			"category":    "fast",
			"name":        "Быстрые модели",
			"description": "Для простых вопросов и чата",
			"models": []fiber.Map{
				{"id": "gpt-4o-mini", "name": "GPT-4o Mini", "price": "~25 ₽/1M токенов"},
				{"id": "deepseek/deepseek-chat", "name": "DeepSeek V3", "price": "~8 ₽/1M токенов"},
				{"id": "xiaomi/mimo-v2-flash", "name": "Xiaomi MiMo-V2-Flash", "price": "~8 ₽/1M токенов"},
			},
		},
		{
			"category":    "reasoning",
			"name":        "Думающие модели",
			"description": "Для сложных задач, кода, анализа",
			"models": []fiber.Map{
				{"id": "deepseek/deepseek-r1", "name": "DeepSeek R1", "price": "~55 ₽/1M токенов"},
				{"id": "gpt-4.1", "name": "GPT-4.1", "price": "~169 ₽/1M токенов"},
				{"id": "claude-3-haiku", "name": "Claude 3 Haiku", "price": "~200 ₽/1M токенов"},
			},
		},
		{
			"category":    "balanced",
			"name":        "Сбалансированные",
			"description": "Универсальные модели",
			"models": []fiber.Map{
				{"id": "gpt-4o", "name": "GPT-4o", "price": "~250 ₽/1M токенов"},
				{"id": "gpt-5.2-codex", "name": "GPT-5.2 Codex", "price": "~148 ₽/1M токенов"},
			},
		},
	}

	return c.JSON(fiber.Map{
		"recommendations": recommendations,
	})
}
