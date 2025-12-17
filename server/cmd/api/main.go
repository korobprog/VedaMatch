package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize Database
	database.Connect()

	// Initialize Fiber App
	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Handlers
	authHandler := handlers.NewAuthHandler()

	// Routes
	api := app.Group("/api")
	api.Post("/register", authHandler.Register)
	api.Post("/login", authHandler.Login)

	chatHandler := handlers.NewChatHandler()
	// Use /v1 prefix to match frontend expectation
	api.Post("/v1/chat/completions", chatHandler.HandleChat)
	api.Get("/v1/models", chatHandler.HandleModels)

	// Start Server
	port := ":8081"
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(port))
}
