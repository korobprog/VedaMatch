package main

import (
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"
	"rag-agent-server/internal/middleware"
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

	// Seed Gemini models if not present
	database.SeedGeminiModels()

	// Initialize Services
	services.InitScheduler()

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
	mediaHandler := handlers.NewMediaHandler(hub)
	datingHandler := handlers.NewDatingHandler(aiChatService)
	typingHandler := handlers.NewTypingHandler(hub)
	ragHandler := handlers.NewRAGHandler(services.NewRAGPipelineService(database.DB))
	chatHandler := handlers.NewChatHandler()

	// Restore scheduler state from database
	aiHandler.RestoreScheduler()

	// Routes
	api := app.Group("/api")

	// Admin Routes (Protected - should ideally have middleware)
	admin := api.Group("/admin", middleware.AdminProtected())
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
	admin.Post("/ai-models/auto-optimize", aiHandler.AutoOptimizeModels)
	admin.Post("/ai-models/schedule", aiHandler.HandleSchedule)
	admin.Post("/ai-models/:id/toggle-auto", aiHandler.ToggleAutoRouting)

	api.Post("/register", authHandler.Register)
	api.Post("/login", authHandler.Login)

	// WebSocket Route (with ID in URL) - Moved outside protected group
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
			Send:   make(chan websocket.WSMessage, 256),
		}
		hub.Register <- client

		go client.WritePump()
		client.ReadPump()
	}))

	// Public AI Routes (Legacy/Frontend Compat)
	api.Post("/v1/chat/completions", chatHandler.HandleChat)
	api.Get("/v1/models", aiHandler.GetClientModels)

	// Protected Routes
	protected := api.Group("/", middleware.Protected())

	protected.Post("/messages", messageHandler.SendMessage)
	protected.Get("/messages/:userId/:recipientId", messageHandler.GetMessages)

	protected.Put("/update-profile", authHandler.UpdateProfile)
	protected.Put("/update-location", authHandler.UpdateLocation)
	protected.Put("/update-coordinates", authHandler.UpdateLocationCoordinates)
	protected.Get("/location/nearby", authHandler.GetNearbyUsers)
	protected.Get("/location/by-city", authHandler.SearchByCity)
	protected.Get("/location/by-country", authHandler.GetUsersByCountry)
	protected.Get("/contacts", authHandler.GetContacts)
	protected.Post("/heartbeat", authHandler.Heartbeat)
	protected.Post("/upload-avatar", authHandler.UploadAvatar)
	protected.Post("/friends/add", authHandler.AddFriend)
	protected.Post("/friends/remove", authHandler.RemoveFriend)
	protected.Get("/friends", authHandler.GetFriends)
	protected.Post("/blocks/add", authHandler.BlockUser)
	protected.Post("/blocks/remove", authHandler.UnblockUser)
	protected.Get("/blocks", authHandler.GetBlockedUsers)
	log.Println("Registering /api/messages routes...")
	protected.Post("/typing", typingHandler.SetTyping)

	// Room Routes
	protected.Post("/rooms", roomHandler.CreateRoom)
	protected.Get("/rooms", roomHandler.GetRooms)
	protected.Post("/rooms/invite", roomHandler.InviteUser)
	protected.Post("/rooms/remove", roomHandler.RemoveUser)
	protected.Post("/rooms/role", roomHandler.UpdateMemberRole)
	protected.Get("/rooms/:id/members", roomHandler.GetRoomMembers)
	protected.Get("/rooms/:id/summary", messageHandler.GetRoomSummary)
	protected.Put("/rooms/:id", roomHandler.UpdateRoom)
	protected.Put("/rooms/:id/settings", roomHandler.UpdateRoomSettings)
	protected.Post("/rooms/:id/image", roomHandler.UpdateRoomImage)

	// Media Routes
	protected.Post("/media/upload/:userId", mediaHandler.UploadPhoto)
	protected.Get("/media/:userId", mediaHandler.ListPhotos)
	protected.Delete("/media/:id", mediaHandler.DeletePhoto)
	protected.Post("/media/:id/set-profile", mediaHandler.SetProfilePhoto)

	// Message Media Routes
	protected.Post("/messages/media", mediaHandler.UploadMessageMedia)

	// Dating Routes
	protected.Get("/dating/stats", datingHandler.GetDatingStats)
	protected.Get("/dating/cities", datingHandler.GetDatingCities)
	protected.Get("/dating/candidates", datingHandler.GetCandidates)
	protected.Post("/dating/compatibility/:userId/:candidateId", datingHandler.GetCompatibility)
	protected.Get("/dating/profile/:id", datingHandler.GetDatingProfile)
	protected.Put("/dating/profile/:id", datingHandler.UpdateDatingProfile)
	protected.Post("/dating/favorites", datingHandler.AddToFavorites)
	protected.Get("/dating/favorites", datingHandler.GetFavorites)
	protected.Get("/dating/liked-me", datingHandler.GetWhoLikedMe)
	protected.Get("/dating/notifications", datingHandler.GetNotifications)
	protected.Delete("/dating/favorites/:id", datingHandler.RemoveFromFavorites)

	// RAG Routes
	protected.Post("/rag/documents/upload", ragHandler.UploadDocument)
	protected.Get("/rag/documents", ragHandler.ListDocuments)
	protected.Get("/rag/documents/:id", ragHandler.GetDocument)
	protected.Delete("/rag/documents/:id", ragHandler.DeleteDocument)
	protected.Post("/rag/query", ragHandler.QueryDocuments)
	protected.Get("/rag/statistics", ragHandler.GetStatistics)
	protected.Post("/rag/sessions", ragHandler.CreateChatSession)
	protected.Get("/rag/sessions", ragHandler.ListChatSessions)

	log.Println("Routes registered.")

	// Static files for avatars
	app.Static("/uploads", "./uploads")

	// chatHandler initialization moved up

	// Start Server
	port := ":8081"
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(port))
}
