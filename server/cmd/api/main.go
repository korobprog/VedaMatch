package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/workers"
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

	log.Println("Server Version: 1.6 (Manual CORS Fix)")

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

	// Seed map test data (users, shops, ads with coordinates)
	// database.SeedMapTestData()

	// Initialize Services
	services.InitScheduler()

	// Start News Scheduler (background job for fetching news from sources)
	services.StartNewsScheduler()
	// Start Room Notification Scheduler
	services.StartRoomNotificationScheduler()

	// Start Video Transcoding Worker (background job for video processing)
	transcodingWorker := workers.StartWorkerInBackground(2) // 2 concurrent workers
	defer transcodingWorker.Stop()

	// Initialize Fiber App with increased body limit for video uploads
	app := fiber.New(fiber.Config{
		StrictRouting:     false,                  // Allow /path and /path/ to be treated the same
		BodyLimit:         2 * 1024 * 1024 * 1024, // 2GB for video uploads
		StreamRequestBody: true,                   // Stream large uploads instead of buffering in memory
		// Custom error handler to ensure CORS headers are always present
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Set CORS headers even on errors
			c.Set("Access-Control-Allow-Origin", c.Get("Origin"))
			c.Set("Access-Control-Allow-Credentials", "true")

			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// CORS Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://localhost:3001, http://localhost:3005, http://127.0.0.1:3005, http://localhost:8081, https://vedamatch.ru, https://www.vedamatch.ru, https://api.vedamatch.ru, https://admin.vedamatch.ru",
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With,X-Admin-ID",
		AllowCredentials: true,
	}))

	app.Use(logger.New())

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
	polzaHandler := handlers.NewPolzaHandler()
	newsHandler := handlers.NewNewsHandler()
	shopHandler := handlers.NewShopHandler()
	productHandler := handlers.NewProductHandler()
	orderHandler := handlers.NewOrderHandler()
	educationHandler := handlers.NewEducationHandler(services.NewEducationService(database.DB))
	turnHandler := handlers.NewTurnHandler()
	userHandler := handlers.NewUserHandler()
	mapHandler := handlers.NewMapHandler()
	cafeHandler := handlers.NewCafeHandler()
	cafeOrderHandler := handlers.NewCafeOrderHandler()
	multimediaHandler := handlers.NewMultimediaHandler()
	// bookHandler removed, using library functions directly

	// Restore scheduler states from database
	aiHandler.RestoreScheduler()
	multimediaHandler.RestoreRadioScheduler()

	// Routes
	api := app.Group("/api")

	// Auth Routes (Public)
	api.Post("/register", authHandler.Register)
	api.Post("/login", authHandler.Login)

	// Library Routes
	library := api.Group("/library")
	library.Get("/books", handlers.GetLibraryBooks)
	library.Get("/books/:id", handlers.GetLibraryBookDetails) // supports id or code
	library.Get("/books/:bookCode/chapters", handlers.GetLibraryChapters)
	library.Get("/verses", handlers.GetLibraryVerses) // ?bookCode=bg&chapter=1
	library.Get("/books/:bookCode/export", handlers.ExportLibraryBook)
	library.Post("/init", handlers.SeeInitialBooks) // Temporary for seeding
	library.Get("/search", handlers.SearchLibrary)

	// Education Routes (Public)
	education := api.Group("/education")
	education.Get("/courses", educationHandler.GetCourses)
	education.Get("/courses/:id", educationHandler.GetCourseDetails)

	// Public News Routes
	api.Get("/news", newsHandler.GetNews)
	api.Get("/news/latest", newsHandler.GetLatestNews)
	api.Get("/news/categories", newsHandler.GetNewsCategories)
	// Public News Item moved after protected routes to avoid conflict with /subscriptions and /favorites
	// api.Get("/news/:id", newsHandler.GetNewsItem)

	// Public Shop Routes
	api.Get("/shops/my", middleware.Protected(), shopHandler.GetMyShop)
	api.Get("/shops", shopHandler.GetShops)
	api.Get("/shops/categories", shopHandler.GetShopCategories) // Must come before /shops/:id
	api.Get("/shops/:id", shopHandler.GetShop)
	api.Get("/shops/:shopId/products", productHandler.GetShopProducts)

	// Public Product Routes
	api.Get("/products/my", middleware.Protected(), productHandler.GetMyProducts)
	api.Get("/products", productHandler.GetProducts)
	api.Get("/products/categories", productHandler.GetProductCategories) // Must come before /products/:id
	api.Get("/products/:id", productHandler.GetProduct)
	api.Get("/products/:id/reviews", productHandler.GetProductReviews)

	// Public Map Routes
	mapRoutes := api.Group("/map")
	mapRoutes.Get("/markers", mapHandler.GetMarkers)
	mapRoutes.Get("/summary", mapHandler.GetSummary)
	mapRoutes.Get("/config", mapHandler.GetTileConfig)
	mapRoutes.Get("/autocomplete", mapHandler.Autocomplete)
	mapRoutes.Post("/route", mapHandler.GetRoute)

	// Public Ads Routes
	api.Get("/ads", adsHandler.GetAds)
	api.Get("/ads/categories", adsHandler.GetAdCategories)
	api.Get("/ads/cities", adsHandler.GetAdCities)
	api.Get("/ads/stats", adsHandler.GetAdStats)
	api.Get("/ads/:id", adsHandler.GetAd)

	// Public Cafe Routes (Sattva Cafe)
	api.Get("/cafes/my", middleware.Protected(), cafeHandler.GetMyCafe)
	api.Get("/cafes", cafeHandler.ListCafes)
	api.Get("/cafes/scan/:qrCode", cafeHandler.ScanQRCode)
	api.Get("/cafes/slug/:slug", cafeHandler.GetCafeBySlug)
	api.Get("/cafes/:id", cafeHandler.GetCafe)
	api.Get("/cafes/:id/menu", cafeHandler.GetMenu)
	api.Get("/cafes/:id/featured", cafeHandler.GetFeaturedDishes)
	api.Get("/cafes/:id/tables", cafeHandler.GetTables)
	api.Get("/cafes/:id/categories", cafeHandler.GetCategories)
	api.Get("/cafes/:id/dishes", cafeHandler.ListDishes)
	api.Get("/cafes/:id/dishes/:dishId", cafeHandler.GetDish)

	// Public Multimedia Hub Routes (Sattva Media)
	multimedia := api.Group("/multimedia")
	multimedia.Get("/categories", multimediaHandler.GetCategories)
	multimedia.Get("/tracks", multimediaHandler.GetTracks)
	multimedia.Get("/tracks/:id", multimediaHandler.GetTrack)
	multimedia.Get("/radio", multimediaHandler.GetRadioStations)
	multimedia.Get("/radio/:id", multimediaHandler.GetRadioStation)
	multimedia.Get("/tv", multimediaHandler.GetTVChannels)
	multimedia.Get("/tv/:id", multimediaHandler.GetTVChannel)

	// Public Series Routes (for React Native)
	publicSeriesHandler := handlers.NewSeriesHandler()
	multimedia.Get("/series", publicSeriesHandler.GetAllSeries)
	multimedia.Get("/series/:id", publicSeriesHandler.GetSeriesDetails)

	// Public AI Routes (Legacy/Frontend Compat)
	api.Post("/v1/chat/completions", chatHandler.HandleChat)
	api.Get("/v1/models", aiHandler.GetClientModels)

	// Protected Routes (Apply Protected middleware to all following routes)
	protected := api.Group("/", middleware.Protected())

	// Protected News Routes
	protected.Post("/news/sources/:id/subscribe", newsHandler.SubscribeToSource)
	protected.Delete("/news/sources/:id/subscribe", newsHandler.UnsubscribeFromSource)
	protected.Get("/news/subscriptions", newsHandler.GetSubscriptions)
	protected.Post("/news/sources/:id/favorite", newsHandler.AddToFavorites)
	protected.Delete("/news/sources/:id/favorite", newsHandler.RemoveFromFavorites)
	protected.Get("/news/favorites", newsHandler.GetFavorites)

	// Public News Item (Must come after specified routes like subscriptions/favorites)
	api.Get("/news/:id", newsHandler.GetNewsItem)

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

	// Admin Map Routes
	admin.Get("/map/markers", mapHandler.AdminGetAllMarkers)
	admin.Get("/map/config", mapHandler.GetMarkerConfig)
	admin.Post("/map/config", mapHandler.UpdateMarkerConfig)
	admin.Post("/map/markers/:type/:id/toggle", mapHandler.ToggleMarkerVisibility)
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

	// Polza AI Management Routes (replaced OpenRouter)
	admin.Get("/polza/status", polzaHandler.GetStatus)
	admin.Get("/polza/models", polzaHandler.GetModels)
	admin.Get("/polza/settings", polzaHandler.GetSettings)
	admin.Put("/polza/settings", polzaHandler.UpdateSettings)
	admin.Post("/polza/test", polzaHandler.TestConnection)
	admin.Post("/polza/test-routing", polzaHandler.TestSmartRouting)
	admin.Get("/polza/recommendations", polzaHandler.GetModelRecommendations)

	// Admin Map Management Routes
	admin.Get("/map/markers", mapHandler.AdminGetAllMarkers)
	admin.Get("/map/config", mapHandler.GetMarkerConfig)
	admin.Post("/geocode-users", adminHandler.GeocodeAllUsers)

	// Admin Shop Management Routes
	admin.Get("/shops", shopHandler.AdminGetShops)
	admin.Get("/shops/stats", shopHandler.AdminGetShopStats)
	admin.Put("/shops/:id/moderate", shopHandler.AdminModerateShop)

	// Admin Multimedia Hub Management Routes
	admin.Get("/multimedia/stats", multimediaHandler.GetStats)
	admin.Get("/multimedia/suggestions", multimediaHandler.GetPendingSuggestions)
	admin.Post("/multimedia/suggestions/:id/review", multimediaHandler.ReviewSuggestion)
	admin.Post("/multimedia/upload", multimediaHandler.UploadMedia)
	admin.Post("/multimedia/presign", multimediaHandler.GetPresignedURL) // For large file direct S3 upload
	// Categories
	admin.Post("/multimedia/categories", multimediaHandler.CreateCategory)
	admin.Put("/multimedia/categories/:id", multimediaHandler.UpdateCategory)
	admin.Delete("/multimedia/categories/:id", multimediaHandler.DeleteCategory)
	// Tracks
	admin.Post("/multimedia/tracks", multimediaHandler.CreateTrack)
	admin.Put("/multimedia/tracks/:id", multimediaHandler.UpdateTrack)
	admin.Delete("/multimedia/tracks/:id", multimediaHandler.DeleteTrack)
	// Radio
	admin.Post("/multimedia/radio", multimediaHandler.CreateRadioStation)
	admin.Put("/multimedia/radio/:id", multimediaHandler.UpdateRadioStation)
	admin.Delete("/multimedia/radio/:id", multimediaHandler.DeleteRadioStation)
	// TV
	admin.Post("/multimedia/tv", multimediaHandler.CreateTVChannel)
	admin.Put("/multimedia/tv/:id", multimediaHandler.UpdateTVChannel)
	admin.Delete("/multimedia/tv/:id", multimediaHandler.DeleteTVChannel)

	// Series (TV Shows, Multi-episode content)
	seriesHandler := handlers.NewSeriesHandler()
	admin.Get("/series", seriesHandler.GetAllSeries)
	admin.Get("/series/stats", seriesHandler.GetSeriesStats)

	// S3 Import (Must come before /series/:id)
	admin.Get("/series/s3-files", seriesHandler.ListS3Files)
	admin.Post("/series/s3-import", seriesHandler.ImportS3Episodes)

	// Bulk upload
	admin.Post("/series/parse-filenames", seriesHandler.ParseFilenames)
	admin.Post("/series/bulk-episodes", seriesHandler.BulkCreateEpisodes)

	admin.Get("/series/:id", seriesHandler.GetSeriesDetails)
	admin.Post("/series", seriesHandler.CreateSeries)
	admin.Put("/series/:id", seriesHandler.UpdateSeries)
	admin.Delete("/series/:id", seriesHandler.DeleteSeries)
	// Seasons
	admin.Post("/series/:seriesId/seasons", seriesHandler.CreateSeason)
	admin.Put("/seasons/:seasonId", seriesHandler.UpdateSeason)
	admin.Delete("/seasons/:seasonId", seriesHandler.DeleteSeason)
	// Episodes
	admin.Post("/seasons/:seasonId/episodes", seriesHandler.CreateEpisode)
	admin.Put("/episodes/:episodeId", seriesHandler.UpdateEpisode)
	admin.Delete("/episodes/:episodeId", seriesHandler.DeleteEpisode)
	admin.Post("/episodes/reorder", seriesHandler.ReorderEpisodes)

	// Register Video Routes (new HLS video platform)
	handlers.RegisterVideoRoutes(app)

	// Other Protected Routes
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

	// WebRTC Config
	protected.Get("/turn-credentials", turnHandler.GetTurnCredentials)

	// User Portal Layout Routes
	protected.Get("/user/portal-layout", userHandler.GetPortalLayout)
	protected.Put("/user/portal-layout", userHandler.SavePortalLayout)

	// User Profile Route (public profile by ID)
	protected.Get("/users/:id", userHandler.GetUserById)

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
	protected.Get("/rooms/:id", roomHandler.GetRoom)
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

	// Multimedia Routes (Protected - User Features)
	protected.Post("/multimedia/suggest", multimediaHandler.CreateSuggestion)
	protected.Get("/multimedia/favorites", multimediaHandler.GetFavorites)
	protected.Post("/multimedia/tracks/:id/favorite", multimediaHandler.AddToFavorites)
	protected.Delete("/multimedia/tracks/:id/favorite", multimediaHandler.RemoveFromFavorites)

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
	protected.Get("/shops/can-create", shopHandler.CanCreateShop)
	protected.Post("/shops", shopHandler.CreateShop)
	protected.Put("/shops/:id", shopHandler.UpdateShop)
	protected.Get("/shops/seller/stats", shopHandler.GetSellerStats)

	// Product Routes (Sattva Market - Seller)
	protected.Post("/products/upload-photo", productHandler.UploadProductPhoto)
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

	// Cafe Routes (Sattva Cafe - Owner/Admin)
	protected.Post("/cafes/upload", cafeHandler.UploadCafePhoto)
	protected.Post("/cafes", cafeHandler.CreateCafe)
	protected.Put("/cafes/:id", cafeHandler.UpdateCafe)
	protected.Delete("/cafes/:id", cafeHandler.DeleteCafe)
	// Cafe Tables
	protected.Post("/cafes/:id/tables", cafeHandler.CreateTable)
	protected.Put("/cafes/:id/tables/:tableId", cafeHandler.UpdateTable)
	protected.Delete("/cafes/:id/tables/:tableId", cafeHandler.DeleteTable)
	protected.Put("/cafes/:id/floor-layout", cafeHandler.UpdateFloorLayout)
	// Cafe Menu Management
	protected.Post("/cafes/:id/categories", cafeHandler.CreateCategory)
	protected.Put("/cafes/:id/categories/:categoryId", cafeHandler.UpdateCategory)
	protected.Delete("/cafes/:id/categories/:categoryId", cafeHandler.DeleteCategory)
	protected.Post("/cafes/:id/dishes", cafeHandler.CreateDish)
	protected.Put("/cafes/:id/dishes/:dishId", cafeHandler.UpdateDish)
	protected.Delete("/cafes/:id/dishes/:dishId", cafeHandler.DeleteDish)
	protected.Get("/cafes/:id/stop-list", cafeHandler.GetStopList)
	protected.Post("/cafes/:id/stop-list", cafeHandler.UpdateStopList)
	// Waiter Calls
	protected.Post("/cafes/:id/waiter-call", cafeHandler.CreateWaiterCall)
	protected.Get("/cafes/:id/waiter-calls", cafeHandler.GetActiveWaiterCalls)
	protected.Post("/cafes/:id/waiter-calls/:callId/acknowledge", cafeHandler.AcknowledgeWaiterCall)
	protected.Post("/cafes/:id/waiter-calls/:callId/complete", cafeHandler.CompleteWaiterCall)

	// Cafe Orders (Sattva Cafe)
	protected.Post("/cafe-orders", cafeOrderHandler.CreateOrder)
	protected.Get("/cafe-orders/my", cafeOrderHandler.GetMyOrders)
	protected.Get("/cafe-orders/:id", cafeOrderHandler.GetOrder)
	protected.Put("/cafe-orders/:id/status", cafeOrderHandler.UpdateOrderStatus)
	protected.Post("/cafe-orders/:id/cancel", cafeOrderHandler.CancelOrder)
	protected.Post("/cafe-orders/:id/pay", cafeOrderHandler.MarkAsPaid)
	protected.Post("/cafe-orders/:id/repeat", cafeOrderHandler.RepeatOrder)
	protected.Put("/cafe-orders/:id/items/:itemId/status", cafeOrderHandler.UpdateItemStatus)
	// Cafe Orders for Staff
	protected.Get("/cafes/:id/orders", cafeOrderHandler.ListOrders)
	protected.Get("/cafes/:id/orders/active", cafeOrderHandler.GetActiveOrders)
	protected.Get("/cafes/:id/orders/stats", cafeOrderHandler.GetOrderStats)

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

	// Start Server
	port := ":8081"
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(port))
}
