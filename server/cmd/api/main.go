package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/websocket"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	ws "github.com/gofiber/websocket/v2"
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

	// Services
	aiChatService := services.NewAiChatService()
	hub := websocket.NewHub()
	go hub.Run()

	// Handlers
	authHandler := handlers.NewAuthHandler()
	messageHandler := handlers.NewMessageHandler(aiChatService, hub)
	roomHandler := handlers.NewRoomHandler()
	adminHandler := handlers.NewAdminHandler()
	aiHandler := handlers.NewAiHandler()
	mediaHandler := handlers.NewMediaHandler()
	datingHandler := handlers.NewDatingHandler(aiChatService)

	// Routes
	api := app.Group("/api")

	// Admin Routes (Protected - should ideally have middleware)
	admin := api.Group("/admin")
	admin.Get("/users", adminHandler.GetUsers)
	admin.Post("/users/:id/toggle-block", adminHandler.ToggleBlockUser)
	admin.Put("/users/:id/role", adminHandler.UpdateUserRole)
	admin.Post("/admins", adminHandler.AddAdmin)
	admin.Get("/stats", adminHandler.GetStats)
	admin.Get("/dating/profiles", adminHandler.GetDatingProfiles)
	admin.Post("/dating/profiles/:id/flag", adminHandler.FlagDatingProfile)
	admin.Get("/settings", adminHandler.GetSystemSettings)
	admin.Post("/settings", adminHandler.UpdateSystemSettings)

	// AI Model Management Routes
	admin.Get("/ai-models", aiHandler.GetAdminModels)
	admin.Post("/ai-models/sync", aiHandler.SyncModels)
	admin.Put("/ai-models/:id", aiHandler.UpdateModel)
	admin.Delete("/ai-models/:id", aiHandler.DeleteModel)
	admin.Post("/ai-models/:id/test", aiHandler.TestModel)
	admin.Post("/ai-models/bulk-test", aiHandler.BulkTestModels)
	admin.Post("/ai-models/disable-offline", aiHandler.DisableOfflineModels)

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

	// WebSocket Route
	api.Get("/ws/:id", ws.New(func(c *ws.Conn) {
		// userId from path parameter
		userIdStr := c.Params("id")
		var userId uint
		fmt.Sscanf(userIdStr, "%d", &userId)

		if userId == 0 {
			c.Close()
			return
		}

		client := &websocket.Client{
			Hub:    hub,
			Conn:   c,
			UserID: userId,
			Send:   make(chan models.Message, 256),
		}
		hub.Register <- client

		go client.WritePump()
		client.ReadPump()
	}))

	// Room Routes
	api.Post("/rooms", roomHandler.CreateRoom)
	api.Get("/rooms", roomHandler.GetRooms)
	api.Post("/rooms/invite", roomHandler.InviteUser)
	api.Post("/rooms/remove", roomHandler.RemoveUser)
	api.Post("/rooms/role", roomHandler.UpdateMemberRole)
	api.Get("/rooms/:id/members", roomHandler.GetRoomMembers)
	api.Get("/rooms/:id/summary", messageHandler.GetRoomSummary)
	api.Put("/rooms/:id", roomHandler.UpdateRoom)
	api.Put("/rooms/:id/settings", roomHandler.UpdateRoomSettings)
	api.Post("/rooms/:id/image", roomHandler.UpdateRoomImage)

	// Media Routes
	api.Post("/media/upload/:userId", mediaHandler.UploadPhoto)
	api.Get("/media/:userId", mediaHandler.ListPhotos)
	api.Delete("/media/:id", mediaHandler.DeletePhoto)
	api.Post("/media/:id/set-profile", mediaHandler.SetProfilePhoto)

	// Dating Routes
	api.Get("/dating/stats", datingHandler.GetDatingStats)
	api.Get("/dating/cities", datingHandler.GetDatingCities)
	api.Get("/dating/candidates", datingHandler.GetCandidates)
	api.Post("/dating/compatibility/:userId/:candidateId", datingHandler.GetCompatibility)
	api.Get("/dating/profile/:id", datingHandler.GetDatingProfile)
	api.Put("/dating/profile/:id", datingHandler.UpdateDatingProfile)
	api.Post("/dating/favorites", datingHandler.AddToFavorites)
	api.Get("/dating/favorites", datingHandler.GetFavorites)
	api.Delete("/dating/favorites/:id", datingHandler.RemoveFromFavorites)

	log.Println("Routes registered.")

	// Static files for avatars
	app.Static("/uploads", "./uploads")

	chatHandler := handlers.NewChatHandler()
	// Use /v1 prefix to match frontend expectation
	api.Post("/v1/chat/completions", chatHandler.HandleChat)
	api.Get("/v1/models", aiHandler.GetClientModels)

	// Start Server
	port := ":8081"
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(port))
}
