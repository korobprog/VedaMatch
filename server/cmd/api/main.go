package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"
	"strconv"

	"rag-agent-server/internal/websocket"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	fiberwebsocket "github.com/gofiber/websocket/v2"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	log.Println("Server Version: 1.2 (Migration Fix Applied)")

	// Initialize Database
	database.Connect()

	// Seed Gemini models if not present
	database.SeedGeminiModels()

	// Seed default AI prompts if not present
	database.SeedDefaultPrompts()

	// Seed system settings
	database.SeedSystemSettings()

	// Seed demo ads if not present
	database.SeedDemoAds()

	// Initialize Services
	services.InitScheduler()

	// Start News Scheduler (background job for fetching news from sources)
	services.StartNewsScheduler()

	// Initialize Fiber App
	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000,http://localhost:3001,http://localhost:8081,https://vedamatch.ru,https://www.vedamatch.ru,https://api.vedamatch.ru,https://admin.vedamatch.ru",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Requested-With",
		AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

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
	promptHandler := handlers.NewPromptHandler()
	adsHandler := handlers.NewAdsHandler()
	tagHandler := handlers.NewTagHandler()
	openRouterHandler := handlers.NewOpenRouterHandler()
	newsHandler := handlers.NewNewsHandler()
	shopHandler := handlers.NewShopHandler()
	productHandler := handlers.NewProductHandler()
	orderHandler := handlers.NewOrderHandler()
	educationHandler := handlers.NewEducationHandler(services.NewEducationService(database.DB))

	// Restore scheduler state from database
	aiHandler.RestoreScheduler()

	// Routes
	api := app.Group("/api")

	// Library Routes
	library := api.Group("/library")
	library.Get("/books", handlers.GetLibraryBooks)
	library.Get("/books/:id", handlers.GetLibraryBookDetails) // supports id or code
	library.Get("/books/:bookCode/chapters", handlers.GetLibraryChapters)
	library.Get("/verses", handlers.GetLibraryVerses) // ?bookCode=bg&chapter=1
	library.Get("/search", handlers.SearchLibrary)

	// Education Routes (Public)
	education := api.Group("/education")
	education.Get("/courses", educationHandler.GetCourses)
	education.Get("/courses/:id", educationHandler.GetCourseDetails)

	// Public News Routes
	api.Get("/news", newsHandler.GetNews)
	api.Get("/news/latest", newsHandler.GetLatestNews)
	api.Get("/news/categories", newsHandler.GetNewsCategories)

	// Public Shop Routes
	api.Get("/shops", shopHandler.GetShops)
	api.Get("/shops/categories", shopHandler.GetShopCategories) // Must come before /shops/:id
	api.Get("/shops/:id", shopHandler.GetShop)
	api.Get("/shops/:shopId/products", productHandler.GetShopProducts)

	// Public Product Routes
	api.Get("/products", productHandler.GetProducts)
	api.Get("/products/categories", productHandler.GetProductCategories) // Must come before /products/:id
	api.Get("/products/:id", productHandler.GetProduct)

	// Protected Routes
	protected := api.Group("/", middleware.Protected())

	// Protected News Routes
	protected.Post("/news/sources/:id/subscribe", newsHandler.SubscribeToSource)
	protected.Delete("/news/sources/:id/subscribe", newsHandler.UnsubscribeFromSource)
	protected.Get("/news/subscriptions", newsHandler.GetSubscriptions)
	protected.Post("/news/sources/:id/favorite", newsHandler.AddToFavorites)
	protected.Delete("/news/sources/:id/favorite", newsHandler.RemoveFromFavorites)
	protected.Get("/news/favorites", newsHandler.GetFavorites)

	// Public News Item (Wildcard) - Must come after specific paths
	api.Get("/news/:id", newsHandler.GetNewsItem)

	// Public Ads Routes
	api.Get("/ads", adsHandler.GetAds)
	api.Get("/ads/categories", adsHandler.GetAdCategories)
	api.Get("/ads/cities", adsHandler.GetAdCities)
	api.Get("/ads/stats", adsHandler.GetAdStats)
	api.Get("/ads/:id", adsHandler.GetAd)

	// Library Routes

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

	// RAG Management
	admin.Get("/rag/corpora", adminHandler.ListGeminiCorpora)
	admin.Post("/rag/corpora", adminHandler.CreateGeminiCorpus)

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
	admin.Get("/ai-models/gemini-keys", aiHandler.GetGeminiKeyStatus)

	// AI Prompt Management Routes
	admin.Get("/prompts", promptHandler.GetPrompts)
	admin.Get("/prompts/options", promptHandler.GetScopeOptions)
	admin.Get("/prompts/:id", promptHandler.GetPrompt)
	admin.Post("/prompts", promptHandler.CreatePrompt)
	admin.Put("/prompts/:id", promptHandler.UpdatePrompt)
	admin.Delete("/prompts/:id", promptHandler.DeletePrompt)
	admin.Post("/prompts/:id/toggle", promptHandler.TogglePromptActive)

	// Admin Ads Management Routes
	admin.Get("/ads", adsHandler.GetAdminAds)
	admin.Get("/ads/stats", adsHandler.GetAdminStats)
	admin.Put("/ads/:id/status", adsHandler.UpdateAdStatus)
	admin.Put("/ads/:id", adsHandler.AdminUpdateAd)
	admin.Delete("/ads/:id", adsHandler.AdminDeleteAd)

	// Admin News Management Routes
	// IMPORTANT: Specific routes MUST come before parameterized routes (:id)
	admin.Get("/news", newsHandler.GetAdminNews)
	admin.Get("/news/stats", newsHandler.GetNewsStats)
	admin.Get("/news/sources", newsHandler.GetSources)
	admin.Post("/news/sources", newsHandler.CreateSource)
	admin.Get("/news/sources/:id", newsHandler.GetSource)
	admin.Put("/news/sources/:id", newsHandler.UpdateSource)
	admin.Delete("/news/sources/:id", newsHandler.DeleteSource)
	admin.Post("/news/sources/:id/toggle", newsHandler.ToggleSourceActive)
	admin.Post("/news/sources/:id/fetch", newsHandler.FetchSourceNow)
	admin.Get("/news/:id", newsHandler.GetAdminNewsItem)
	admin.Post("/news", newsHandler.CreateNews)
	admin.Put("/news/:id", newsHandler.UpdateNews)
	admin.Delete("/news/:id", newsHandler.DeleteNews)
	admin.Post("/news/:id/publish", newsHandler.PublishNews)
	admin.Post("/news/:id/process", newsHandler.ProcessNewsAI)

	// Admin Education Management Routes
	admin.Get("/education/courses", educationHandler.AdminGetCourses)
	admin.Post("/education/courses", educationHandler.CreateCourse)
	admin.Put("/education/courses/:id", educationHandler.UpdateCourse)
	admin.Post("/education/modules", educationHandler.CreateModule)
	admin.Post("/education/questions", educationHandler.CreateQuestion)
	admin.Get("/education/modules/:moduleId/exams", educationHandler.GetModuleExams)

	// OpenRouter Management Routes
	admin.Get("/openrouter/status", openRouterHandler.GetStatus)
	admin.Get("/openrouter/models", openRouterHandler.GetModels)
	admin.Get("/openrouter/settings", openRouterHandler.GetSettings)
	admin.Put("/openrouter/settings", openRouterHandler.UpdateSettings)
	admin.Post("/openrouter/test", openRouterHandler.TestConnection)
	admin.Post("/openrouter/test-routing", openRouterHandler.TestSmartRouting)
	admin.Get("/openrouter/recommendations", openRouterHandler.GetModelRecommendations)

	// Admin Shop Management Routes
	admin.Get("/shops", shopHandler.AdminGetShops)
	admin.Get("/shops/stats", shopHandler.AdminGetShopStats)
	admin.Put("/shops/:id/moderate", shopHandler.AdminModerateShop)

	api.Post("/register", authHandler.Register)
	api.Post("/login", authHandler.Login)

	// Public AI Routes (Legacy/Frontend Compat)
	api.Post("/v1/chat/completions", chatHandler.HandleChat)
	api.Get("/v1/models", aiHandler.GetClientModels)

	// Protected Routes
	protected = api.Group("/", middleware.Protected())

	protected.Post("/messages", messageHandler.SendMessage)
	protected.Get("/messages/:userId/:recipientId", messageHandler.GetMessages)

	// Education Routes (Protected)
	protected.Get("/education/modules/:moduleId/exams", educationHandler.GetModuleExams)
	protected.Post("/education/modules/:moduleId/submit", educationHandler.SubmitExam)

	protected.Put("/update-profile", authHandler.UpdateProfile)
	protected.Put("/update-push-token", authHandler.UpdatePushToken)
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

	// Tag Routes
	protected.Get("/tags", tagHandler.SearchTags)
	protected.Post("/tags", tagHandler.CreateTag)
	protected.Post("/users/tags", tagHandler.AddTagToUser)
	protected.Delete("/users/tags/:tagId", tagHandler.RemoveTagFromUser)

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
	protected.Get("/dating/likes/:userId", datingHandler.GetFavoriteCount)
	protected.Get("/dating/is-favorited", datingHandler.CheckIsFavorited)
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

	// Ads Routes
	protected.Post("/ads/upload-photo", adsHandler.UploadAdPhoto)
	protected.Post("/ads", adsHandler.CreateAd)
	protected.Get("/ads/user/favorites", adsHandler.GetFavorites)
	protected.Get("/ads/user/my", adsHandler.GetMyAds)
	protected.Put("/ads/:id", adsHandler.UpdateAd)
	protected.Delete("/ads/:id", adsHandler.DeleteAd)
	protected.Post("/ads/:id/favorite", adsHandler.ToggleFavorite)
	protected.Post("/ads/:id/report", adsHandler.ReportAd)
	protected.Post("/ads/:id/contact", adsHandler.ContactSeller)

	// Shop Routes (Sattva Market - Seller)
	protected.Post("/shops/upload-logo", shopHandler.UploadShopPhoto)
	protected.Post("/shops/upload-cover", shopHandler.UploadShopPhoto)
	protected.Get("/shops/my", shopHandler.GetMyShop)
	protected.Get("/shops/can-create", shopHandler.CanCreateShop)
	protected.Post("/shops", shopHandler.CreateShop)
	protected.Put("/shops/:id", shopHandler.UpdateShop)
	protected.Get("/shops/seller/stats", shopHandler.GetSellerStats)

	// Product Routes (Sattva Market - Seller)
	protected.Post("/products/upload-photo", productHandler.UploadProductPhoto)
	protected.Get("/products/my", productHandler.GetMyProducts)
	protected.Post("/products", productHandler.CreateProduct)
	protected.Put("/products/:id", productHandler.UpdateProduct)
	protected.Delete("/products/:id", productHandler.DeleteProduct)
	protected.Put("/products/:id/stock", productHandler.UpdateStock)
	protected.Post("/products/:id/favorite", productHandler.ToggleFavorite)
	protected.Post("/products/:id/reviews", productHandler.AddReview)

	// Order Routes (Sattva Market - Buyer)
	protected.Post("/orders", orderHandler.CreateOrder)
	protected.Get("/orders/my", orderHandler.GetMyOrders)
	protected.Get("/orders/:id", orderHandler.GetOrder)
	protected.Post("/orders/:id/cancel", orderHandler.CancelOrder)

	// Order Routes (Sattva Market - Seller)
	protected.Get("/orders/seller", orderHandler.GetSellerOrders)
	protected.Put("/orders/:id/status", orderHandler.UpdateOrderStatus)
	protected.Get("/orders/:id/contact-buyer", orderHandler.ContactBuyer)

	// WebSocket Route
	api.Use("/ws", func(c *fiber.Ctx) error {
		if fiberwebsocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return c.SendStatus(fiber.StatusUpgradeRequired)
	})

	api.Get("/ws/:id", fiberwebsocket.New(func(c *fiberwebsocket.Conn) {
		// Get userId from params
		userIdParam := c.Params("id")
		userId, err := strconv.ParseUint(userIdParam, 10, 32)
		if err != nil {
			log.Println("Invalid user ID for WebSocket:", userIdParam)
			return
		}

		client := &websocket.Client{
			Hub:    hub,
			Conn:   c,
			UserID: uint(userId),
			Send:   make(chan websocket.WSMessage, 256),
		}

		client.Hub.Register <- client
		go client.WritePump()
		client.ReadPump()
	}))

	// Static files for avatars
	app.Static("/uploads", "./uploads")

	// chatHandler initialization moved up

	// Start Server
	port := ":8081"
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(port))
}
