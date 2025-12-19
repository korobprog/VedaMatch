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
	messageHandler := handlers.NewMessageHandler()

	// Routes
	api := app.Group("/api")
	api.Post("/register", authHandler.Register)
	api.Post("/login", authHandler.Login)
	api.Put("/update-profile/:id", authHandler.UpdateProfile)
	api.Get("/contacts", authHandler.GetContacts)
	api.Post("/heartbeat/:id", authHandler.Heartbeat)
	api.Post("/upload-avatar/:id", authHandler.UploadAvatar)
	api.Post("/friends/add", authHandler.AddFriend)
	api.Post("/friends/remove", authHandler.RemoveFriend)
	api.Get("/friends/:id", authHandler.GetFriends)
	api.Post("/blocks/add", authHandler.BlockUser)
	api.Post("/blocks/remove", authHandler.UnblockUser)
	api.Get("/blocks/:id", authHandler.GetBlockedUsers)
	log.Println("Registering /api/messages routes...")
	api.Post("/messages", messageHandler.SendMessage)
	api.Get("/messages/:userId/:recipientId", messageHandler.GetMessages)
	log.Println("Routes registered.")

	// Static files for avatars
	app.Static("/uploads", "./uploads")

	chatHandler := handlers.NewChatHandler()
	// Use /v1 prefix to match frontend expectation
	api.Post("/v1/chat/completions", chatHandler.HandleChat)
	api.Get("/v1/models", chatHandler.HandleModels)

	// Start Server
	port := ":8081"
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(port))
}
