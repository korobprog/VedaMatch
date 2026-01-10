package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type OpenRouterHandler struct{}

func NewOpenRouterHandler() *OpenRouterHandler {
	return &OpenRouterHandler{}
}

// GetStatus returns the OpenRouter worker status and configuration
func (h *OpenRouterHandler) GetStatus(c *fiber.Ctx) error {
	orService := services.GetOpenRouterService()

	// Get worker status
	status, err := orService.GetWorkerStatus()
	if err != nil {
		return c.JSON(fiber.Map{
			"status":     "offline",
			"error":      err.Error(),
			"workerUrl":  orService.GetWorkerURL(),
			"configured": orService.HasWorkerURL(),
		})
	}

	// Get models info
	fastModel, reasoningModel := orService.GetModels()

	return c.JSON(fiber.Map{
		"status":     "online",
		"workerUrl":  orService.GetWorkerURL(),
		"configured": orService.HasWorkerURL(),
		"health":     status,
		"models": fiber.Map{
			"fast":      fastModel,
			"reasoning": reasoningModel,
		},
	})
}

// GetModels returns available OpenRouter models
func (h *OpenRouterHandler) GetModels(c *fiber.Ctx) error {
	orService := services.GetOpenRouterService()

	models, err := orService.ListModels()
	if err != nil {
		log.Printf("[OpenRouter] Failed to list models: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "Failed to fetch models from OpenRouter",
		})
	}

	return c.JSON(fiber.Map{
		"data":  models,
		"count": len(models),
	})
}

// GetSettings returns current OpenRouter settings from database
func (h *OpenRouterHandler) GetSettings(c *fiber.Ctx) error {
	settings := make(map[string]string)

	// Get all OpenRouter related settings
	var dbSettings []models.SystemSetting
	database.DB.Where("key LIKE ?", "OPENROUTER_%").Find(&dbSettings)

	for _, s := range dbSettings {
		settings[s.Key] = s.Value
	}

	// Get worker URL
	orService := services.GetOpenRouterService()
	settings["OPENROUTER_WORKER_URL"] = orService.GetWorkerURL()

	return c.JSON(fiber.Map{
		"settings":   settings,
		"configured": orService.HasWorkerURL(),
	})
}

// UpdateSettings updates OpenRouter settings
func (h *OpenRouterHandler) UpdateSettings(c *fiber.Ctx) error {
	var body struct {
		WorkerURL       string `json:"workerUrl"`
		FastModel       string `json:"fastModel"`
		ReasoningModel  string `json:"reasoningModel"`
		RateLimitPerMin int    `json:"rateLimitPerMin"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update worker URL in service
	if body.WorkerURL != "" {
		services.GetOpenRouterService().SetWorkerURL(body.WorkerURL)

		// Save to database
		database.DB.Where(models.SystemSetting{Key: "OPENROUTER_WORKER_URL"}).
			Assign(models.SystemSetting{Value: body.WorkerURL}).
			FirstOrCreate(&models.SystemSetting{})
	}

	// Save model settings
	if body.FastModel != "" {
		database.DB.Where(models.SystemSetting{Key: "OPENROUTER_FAST_MODEL"}).
			Assign(models.SystemSetting{Value: body.FastModel}).
			FirstOrCreate(&models.SystemSetting{})
	}

	if body.ReasoningModel != "" {
		database.DB.Where(models.SystemSetting{Key: "OPENROUTER_REASONING_MODEL"}).
			Assign(models.SystemSetting{Value: body.ReasoningModel}).
			FirstOrCreate(&models.SystemSetting{})
	}

	if body.RateLimitPerMin > 0 {
		database.DB.Where(models.SystemSetting{Key: "OPENROUTER_RATE_LIMIT"}).
			Assign(models.SystemSetting{Value: string(rune(body.RateLimitPerMin))}).
			FirstOrCreate(&models.SystemSetting{})
	}

	log.Printf("[OpenRouter] Settings updated: workerUrl=%s, fastModel=%s, reasoningModel=%s",
		body.WorkerURL, body.FastModel, body.ReasoningModel)

	// Update models in service runtime
	if body.FastModel != "" || body.ReasoningModel != "" {
		services.GetOpenRouterService().SetModels(body.FastModel, body.ReasoningModel)
	}

	return c.JSON(fiber.Map{
		"message": "Settings updated successfully",
	})
}

// TestConnection tests the connection to OpenRouter worker
func (h *OpenRouterHandler) TestConnection(c *fiber.Ctx) error {
	orService := services.GetOpenRouterService()

	status, err := orService.GetWorkerStatus()
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
func (h *OpenRouterHandler) TestSmartRouting(c *fiber.Ctx) error {
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

	orService := services.GetOpenRouterService()

	model := body.Model
	if model == "" {
		model = "auto" // Let worker decide
	}

	response, err := orService.SendMessage(model, messages)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"response": response,
		"query":    body.Query,
		"model":    model,
	})
}

// GetModelRecommendations returns recommended models for different use cases
func (h *OpenRouterHandler) GetModelRecommendations(c *fiber.Ctx) error {
	recommendations := []fiber.Map{
		{
			"category":    "fast",
			"name":        "Быстрые модели",
			"description": "Для простых вопросов и чата",
			"models": []fiber.Map{
				{"id": "deepseek/deepseek-chat", "name": "DeepSeek V3", "price": "$0.10/1M tokens"},
				{"id": "qwen/qwen-2.5-32b-instruct", "name": "Qwen 2.5 32B", "price": "$0.08/1M tokens"},
				{"id": "meta-llama/llama-3.1-70b-instruct", "name": "Llama 3.1 70B", "price": "$0.12/1M tokens"},
			},
		},
		{
			"category":    "reasoning",
			"name":        "Думающие модели",
			"description": "Для сложных задач, кода, анализа",
			"models": []fiber.Map{
				{"id": "deepseek/deepseek-r1", "name": "DeepSeek R1", "price": "$0.55/1M tokens"},
				{"id": "openai/o1-mini", "name": "OpenAI o1-mini", "price": "$3.00/1M tokens"},
				{"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "price": "$3.00/1M tokens"},
			},
		},
		{
			"category":    "balanced",
			"name":        "Сбалансированные",
			"description": "Универсальные модели",
			"models": []fiber.Map{
				{"id": "openai/gpt-4o", "name": "GPT-4o", "price": "$2.50/1M tokens"},
				{"id": "google/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "price": "$0.10/1M tokens"},
			},
		},
	}

	return c.JSON(fiber.Map{
		"recommendations": recommendations,
	})
}
