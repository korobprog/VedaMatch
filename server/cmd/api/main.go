package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
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

	// Start Server
	log.Println("Server starting on port 8080")
	log.Fatal(app.Listen(":8080"))
}
