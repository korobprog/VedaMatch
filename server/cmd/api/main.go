package main

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/handlers"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/workers"
	"strconv"
	"time"

	"rag-agent-server/internal/websocket"
	"strings"

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

	defaultAllowedOrigins := []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3005",
		"http://localhost:3006",
		"http://127.0.0.1:3005",
		"http://127.0.0.1:3006",
		"http://localhost:8081",
		"https://vedamatch.ru",
		"https://www.vedamatch.ru",
		"https://api.vedamatch.ru",
		"https://admin.vedamatch.ru",
		"https://lkm.vedamatch.ru",
		"https://lkm.vedamatch.com",
	}
	allowedOrigins, allowedOriginsMap := buildAllowedOrigins(defaultAllowedOrigins)

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
	database.SeedMapTestData()

	// Initialize Services
	services.InitScheduler()
	videoCircleService := services.NewVideoCircleService()
	if err := videoCircleService.EnsureDefaultTariffs(); err != nil {
		log.Printf("[VideoCircles] failed to ensure default tariffs: %v", err)
	}
	services.StartVideoCircleExpiryScheduler()
	services.StartChannelPostScheduler()

	// Start News Scheduler (background job for fetching news from sources)
	services.StartNewsScheduler()
	// Start Room Notification Scheduler
	services.StartRoomNotificationScheduler()
	// Start Education Tutor retention scheduler (memory cleanup by retention policy)
	services.StartEducationTutorRetentionScheduler()

	// Start Booking Reminder Worker
	workers.StartBookingReminderWorker()

	// Start Donation Auto-Confirm Worker (confirms donations after 24h cooling-off period)
	workers.StartDonationConfirmWorker()

	// Start Charity Report Worker (monitors reporting deadlines and sends warnings)
	workers.StartCharityReportWorker()

	// Start Yatra billing worker (daily LKM charging, pause/resume).
	workers.StartYatraBillingWorker()

	// Start Video Transcoding Worker (background job for video processing)
	transcodingWorker := workers.StartWorkerInBackground(2) // 2 concurrent workers
	defer transcodingWorker.Stop()

	// Initialize Fiber App with increased body limit for video uploads
	app := fiber.New(fiber.Config{
		StrictRouting:     false,                  // Allow /path and /path/ to be treated the same
		BodyLimit:         2 * 1024 * 1024 * 1024, // 2GB for video uploads
		StreamRequestBody: true,                   // Stream large uploads instead of buffering in memory
		// Custom error handler with SECURE CORS validation
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			origin := normalizeAllowedOrigin(c.Get("Origin"))
			if allowedOriginsMap[origin] {
				// Only set headers if Origin is explicitly allowed
				c.Set("Vary", "Origin")
				c.Set("Access-Control-Allow-Origin", origin)
				c.Set("Access-Control-Allow-Credentials", "true")
			}

			code := fiber.StatusInternalServerError
			message := strings.TrimSpace(err.Error())
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
				if strings.TrimSpace(e.Message) != "" {
					message = strings.TrimSpace(e.Message)
				}
			}
			if message == "" {
				message = "Internal server error"
			}

			requestID := middleware.GetRequestID(c)
			if requestID == "" {
				requestID = strings.TrimSpace(c.Get("X-Request-ID"))
			}

			errorCode := middleware.GetErrorCode(c)
			if errorCode == "" {
				errorCode = errorCodeFromStatus(code)
				middleware.SetErrorCode(c, errorCode)
			}

			return c.Status(code).JSON(fiber.Map{
				"error":     message,
				"errorCode": errorCode,
				"requestId": requestID,
			})
		},
	})

	// CORS Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(allowedOrigins, ","),
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With,X-Admin-ID,X-CSRF-Token",
		AllowCredentials: true,
	}))

	app.Use(middleware.RequestID())
	app.Use(logger.New())
	app.Use(middleware.ErrorLog())

	// Universal Links & App Links support
	app.Get("/.well-known/apple-app-site-association", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "application/json")
		return c.SendString(`{
			"applinks": {
				"apps": [],
				"details": [
					{
						"appID": "YOUR_APPLE_TEAM_ID.com.ragagent",
						"paths": ["/register/*", "/portal/*", "/invite-friends", "/wallet", "/login/*"]
					}
				]
			}
		}`)
	})

	app.Get("/.well-known/assetlinks.json", func(c *fiber.Ctx) error {
		return c.JSON([]map[string]interface{}{
			{
				"relation": []string{"delegate_permission/common.handle_all_urls"},
				"target": map[string]interface{}{
					"namespace":                "android_app",
					"package_name":             "com.ragagent",
					"sha256_cert_fingerprints": []string{"YOUR_ANDROID_SHA256_FINGERPRINT"},
				},
			},
		})
	})

	// Services
	aiChatService := services.NewAiChatService()
	walletService := services.NewWalletService()
	lkmTopupService := services.NewLKMTopupServiceWithDB(database.DB, walletService)
	referralService := services.NewReferralService(walletService)
	serviceService := services.NewServiceService()
	calendarService := services.NewCalendarService()
	bookingService := services.NewBookingService(walletService, serviceService, referralService)
	charityService := services.NewCharityService(walletService)
	hub := websocket.NewHub()
	go hub.Run()

	// Ensure all existing users have invite codes
	go func() {
		if err := referralService.GenerateInviteCodesForExistingUsers(); err != nil {
			log.Printf("[Referral] Static code generation failed: %v", err)
		}
	}()

	// Handlers
	authHandler := handlers.NewAuthHandler(walletService, referralService)
	messageHandler := handlers.NewMessageHandler(aiChatService, hub, walletService, referralService)
	roomHandler := handlers.NewRoomHandler()
	roomSFUHandler := handlers.NewRoomSFUHandler()
	adminHandler := handlers.NewAdminHandler()
	adminFinancialHandler := handlers.NewAdminFinancialHandler()
	adminFinanceRBACHandler := handlers.NewAdminFinanceRBACHandler()
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
	educationTutorHandler := handlers.NewEducationTutorHandler(services.NewEducationTutorService(database.DB))
	turnHandler := handlers.NewTurnHandler()
	userHandler := handlers.NewUserHandler()
	mapHandler := handlers.NewMapHandler()
	cafeHandler := handlers.NewCafeHandler()
	cafeOrderHandler := handlers.NewCafeOrderHandler()
	multimediaHandler := handlers.NewMultimediaHandler()
	yatraHandler := handlers.NewYatraHandler()
	yatraAdminHandler := handlers.NewYatraAdminHandler()
	walletHandler := handlers.NewWalletHandler(walletService)
	referralHandler := handlers.NewReferralHandler(referralService)
	serviceHandler := handlers.NewServiceHandler()
	bookingHandler := handlers.NewBookingHandler(bookingService, calendarService)
	charityHandler := handlers.NewCharityHandler(charityService)
	systemHandler := handlers.NewSystemHandler()
	videoCircleHandler := handlers.NewVideoCircleHandler()
	pathTrackerHandler := handlers.NewPathTrackerHandler()
	channelHandler := handlers.NewChannelHandler()
	supportHandler := handlers.NewSupportHandler()
	lkmTopupHandler := handlers.NewLKMTopupHandler(lkmTopupService)
	// bookHandler removed, using library functions directly

	// Restore scheduler states from database
	aiHandler.RestoreScheduler()
	multimediaHandler.RestoreRadioScheduler()

	// Routes
	api := app.Group("/api")

	// Auth Routes (Public)
	api.Post("/register", middleware.RateLimitByIP("auth_register", 15, 10*time.Minute), authHandler.Register)
	api.Post("/login", middleware.RateLimitByIP("auth_login", 30, 10*time.Minute), authHandler.Login)
	api.Post("/auth/refresh", middleware.RateLimitByIdentity("auth_refresh", 90, 5*time.Minute), authHandler.Refresh)
	api.Post("/auth/logout", middleware.OptionalAuth(), middleware.RateLimitByIdentity("auth_logout", 120, 5*time.Minute), authHandler.Logout)
	api.Post("/integrations/telegram/support/webhook", supportHandler.TelegramWebhook)
	api.Post("/lkm/webhook/:gatewayCode", lkmTopupHandler.Webhook)

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

	// Public Dating Routes
	api.Get("/dating/presentation", datingHandler.GetDatingPresentation)

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

	// Public Video Circle Tariffs
	api.Get("/video-tariffs", videoCircleHandler.GetTariffs)
	api.Get("/feed", middleware.OptionalAuth(), channelHandler.GetFeed)
	api.Get("/channels", channelHandler.ListPublicChannels)
	api.Get("/channels/my", middleware.Protected(), channelHandler.ListMyChannels)
	api.Get("/channels/:id", middleware.OptionalAuth(), channelHandler.GetChannel)
	api.Get("/channels/:id/posts", middleware.OptionalAuth(), channelHandler.ListPosts)
	api.Post("/channels/:id/posts/:postId/cta-click", middleware.OptionalAuth(), channelHandler.TrackCTAClick)
	api.Post("/channels/promoted-ads/:adId/click", middleware.OptionalAuth(), channelHandler.TrackPromotedAdClick)
	api.Get("/channels/:id/showcases", middleware.OptionalAuth(), channelHandler.ListShowcases)
	api.Get("/support/config", middleware.OptionalAuth(), supportHandler.GetPublicConfig)
	api.Post("/support/uploads", middleware.OptionalAuth(), supportHandler.UploadAttachment)
	api.Post("/support/tickets", middleware.OptionalAuth(), supportHandler.CreateTicket)

	// Public Yatra Travel Routes (Spiritual Pilgrimage Service)
	// IMPORTANT: Must be registered BEFORE protected group
	api.Get("/yatra", yatraHandler.ListYatras)
	api.Get("/yatra/organizer/:userId/stats", yatraHandler.GetOrganizerStats)
	api.Get("/yatra/:id", yatraHandler.GetYatra)
	api.Get("/yatra/:id/reviews", yatraHandler.GetYatraReviews)
	api.Get("/shelter", yatraHandler.ListShelters)
	api.Get("/shelter/:id", yatraHandler.GetShelter)
	api.Get("/shelter/:id/reviews", yatraHandler.GetShelterReviews)

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

	// Protected Support Routes (in-app tickets)
	protected.Get("/support/tickets", supportHandler.ListMyTickets)
	protected.Get("/support/tickets/:id/messages", supportHandler.GetMyTicketMessages)
	protected.Post("/support/tickets/:id/messages", supportHandler.PostMyTicketMessage)
	protected.Post("/support/tickets/:id/read", supportHandler.MarkMyTicketRead)
	protected.Get("/support/unread-count", supportHandler.GetMyUnreadCount)

	// Admin Routes (Protected - should ideally have middleware)
	admin := api.Group("/admin", middleware.Protected(), middleware.AdminProtected())
	admin.Get("/users", adminHandler.GetUsers)
	admin.Post("/users/:id/toggle-block", adminHandler.ToggleBlockUser)
	admin.Put("/users/:id/role", adminHandler.UpdateUserRole)
	admin.Post("/admins", adminHandler.AddAdmin)
	admin.Get("/stats", adminHandler.GetStats)
	admin.Get("/channels/metrics", channelHandler.GetMetrics)
	admin.Get("/path-tracker/metrics", pathTrackerHandler.GetMetricsSummary)
	admin.Get("/path-tracker/analytics", pathTrackerHandler.GetAnalytics)
	admin.Get("/path-tracker/ops", pathTrackerHandler.GetOpsSnapshot)
	admin.Get("/path-tracker/alerts", pathTrackerHandler.GetAlertEvents)
	admin.Get("/path-tracker/alerts/export", pathTrackerHandler.ExportAlertEventsCSV)
	admin.Post("/path-tracker/alerts/:id/retry", pathTrackerHandler.RetryAlertEvent)
	admin.Post("/path-tracker/alerts/retry-failed", pathTrackerHandler.RetryFailedAlerts)
	admin.Get("/dating/profiles", adminHandler.GetDatingProfiles)
	admin.Post("/dating/profiles/:id/flag", adminHandler.FlagDatingProfile)
	admin.Get("/settings", adminHandler.GetSystemSettings)
	admin.Post("/settings", adminHandler.UpdateSystemSettings)
	admin.Post("/push/test", adminHandler.SendTestPush)
	admin.Get("/push/health", adminHandler.GetPushHealth)
	admin.Get("/push/health/yatra", adminHandler.GetYatraPushHealth)
	admin.Get("/platform/health", adminHandler.GetPlatformHealth)
	admin.Get("/education/tutor/metrics", adminHandler.GetEducationTutorMetrics)
	admin.Get("/financials/stats", adminFinancialHandler.GetFinancialStats)
	admin.Get("/funds/summary", adminFinancialHandler.GetFundsSummary)
	admin.Get("/funds/ledger", adminFinancialHandler.GetFundsLedger)
	admin.Get("/funds/ledger/export.csv", adminFinancialHandler.ExportFundsLedgerCSV)
	admin.Get("/funds/expenses", adminFinancialHandler.ListExpenseRequests)
	admin.Post("/funds/expenses", adminFinancialHandler.CreateExpenseRequest)
	admin.Post("/funds/expenses/:id/approve", adminFinancialHandler.ApproveExpenseRequest)
	admin.Post("/funds/expenses/:id/reject", adminFinancialHandler.RejectExpenseRequest)
	admin.Get("/funds/permissions", adminFinanceRBACHandler.ListFinancePermissions)
	admin.Get("/funds/permissions/me", adminFinanceRBACHandler.GetMyFinancePermissions)
	admin.Post("/funds/permissions/grant", adminFinanceRBACHandler.GrantFinancePermission)
	admin.Post("/funds/permissions/revoke", adminFinanceRBACHandler.RevokeFinancePermission)
	admin.Get("/lkm/config", lkmTopupHandler.GetAdminConfig)
	admin.Put("/lkm/config", lkmTopupHandler.UpdateAdminConfig)
	admin.Get("/lkm/preview", lkmTopupHandler.AdminPreview)
	admin.Get("/lkm/topups", lkmTopupHandler.ListTopups)
	admin.Post("/lkm/topups/:topupId/approve", lkmTopupHandler.ApproveTopup)
	admin.Post("/lkm/topups/:topupId/reject", lkmTopupHandler.RejectTopup)
	admin.Post("/lkm/topups/:topupId/mark-paid", lkmTopupHandler.MarkTopupPaid)

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
	admin.Post("/geocode-users", adminHandler.GeocodeAllUsers)

	// Admin Wallet Management (God Mode)
	// Referral & Wallet Analytics
	admin.Get("/referrals/stats", adminHandler.GetReferralGlobalStats)
	admin.Get("/referrals/leaderboard", adminHandler.GetReferralLeaderboard)
	admin.Get("/wallet/global-stats", adminHandler.GetGlobalWalletStats)

	admin.Get("/wallet/:userId", adminHandler.GetUserWallet)
	admin.Get("/wallet/:userId/transactions", adminHandler.GetUserTransactions)
	admin.Post("/wallet/charge", adminHandler.AdminChargeWallet)
	admin.Post("/wallet/seize", adminHandler.AdminSeizeWallet)
	admin.Post("/wallet/:userId/activate", adminHandler.ActivateUserPendingBalance)

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

	// Admin Video Circle Tariffs
	admin.Post("/video-tariffs", videoCircleHandler.CreateTariff)
	admin.Put("/video-tariffs/:id", videoCircleHandler.UpdateTariff)

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

	// Admin Yatra Travel Management Routes
	// Yatra management
	admin.Get("/yatra", yatraAdminHandler.GetAllYatras)
	admin.Get("/yatra/stats", yatraAdminHandler.GetYatraStats)
	admin.Put("/yatra/:id", yatraAdminHandler.UpdateYatra)
	admin.Post("/yatra/:id/approve", yatraAdminHandler.ApproveYatra)
	admin.Post("/yatra/:id/reject", yatraAdminHandler.RejectYatra)
	admin.Post("/yatra/:id/cancel", yatraAdminHandler.ForceCancelYatra)
	admin.Get("/yatra/:id/participants", yatraAdminHandler.GetYatraParticipants)
	admin.Delete("/yatra/:id/participants/:participantId", yatraAdminHandler.RemoveParticipant)

	// Organizer management
	admin.Get("/organizers", yatraAdminHandler.GetOrganizers)
	admin.Get("/organizers/:id/stats", yatraAdminHandler.GetOrganizerStats)
	admin.Post("/organizers/:id/block", yatraAdminHandler.BlockOrganizer)
	admin.Delete("/organizers/:id/block", yatraAdminHandler.UnblockOrganizer)

	// Reports management
	admin.Get("/yatra-reports", yatraAdminHandler.GetReports)
	admin.Get("/yatra-reports/:id", yatraAdminHandler.GetReport)
	admin.Put("/yatra-reports/:id", yatraAdminHandler.UpdateReport)
	admin.Post("/yatra-reports/:id/resolve", yatraAdminHandler.ResolveReport)
	admin.Post("/yatra-reports/:id/dismiss", yatraAdminHandler.DismissReport)

	// Analytics
	admin.Get("/yatra/analytics/top-organizers", yatraAdminHandler.GetTopOrganizers)
	admin.Get("/yatra/analytics/geography", yatraAdminHandler.GetGeography)
	admin.Get("/yatra/analytics/themes", yatraAdminHandler.GetThemes)
	admin.Get("/yatra/analytics/trends", yatraAdminHandler.GetTrends)

	// Notifications
	admin.Get("/notifications", yatraAdminHandler.GetNotifications)
	admin.Post("/notifications/:id/read", yatraAdminHandler.MarkNotificationRead)

	// Templates & Broadcast
	admin.Get("/yatra/templates", yatraAdminHandler.GetTemplates)
	admin.Post("/yatra/templates", yatraAdminHandler.CreateTemplate)
	admin.Put("/yatra/templates/:id", yatraAdminHandler.UpdateTemplate)
	admin.Delete("/yatra/templates/:id", yatraAdminHandler.DeleteTemplate)
	admin.Post("/yatra/broadcast", yatraAdminHandler.BroadcastEmail)

	// Support Bot Management
	admin.Get("/support/metrics", supportHandler.GetSupportMetrics)
	admin.Get("/support/conversations", supportHandler.ListConversations)
	admin.Get("/support/conversations/:id/messages", supportHandler.GetConversationMessages)
	admin.Post("/support/conversations/:id/resolve", supportHandler.ResolveConversation)
	admin.Post("/support/send-direct", supportHandler.SendDirect)
	admin.Get("/support/faq", supportHandler.ListFAQ)
	admin.Post("/support/faq", supportHandler.CreateFAQ)
	admin.Put("/support/faq/:id", supportHandler.UpdateFAQ)
	admin.Delete("/support/faq/:id", supportHandler.DeleteFAQ)

	// Register Video Routes (new HLS video platform)
	handlers.RegisterVideoRoutes(app)

	// Other Protected Routes
	protected.Post("/messages", messageHandler.SendMessage)
	protected.Get("/messages/history", messageHandler.GetMessagesHistory)
	protected.Get("/messages/:userId/:recipientId", messageHandler.GetMessages)

	// Education Routes (Protected)
	protected.Get("/education/modules/:moduleId/exams", educationHandler.GetModuleExams)
	protected.Post("/education/modules/:moduleId/submit", educationHandler.SubmitExam)
	protected.Get("/education/tutor/status", educationTutorHandler.GetStatus)
	protected.Post("/education/tutor/turn", educationTutorHandler.TutorTurn)
	protected.Get("/education/tutor/weak-topics", educationTutorHandler.GetWeakTopics)
	protected.Delete("/education/tutor/memory", educationTutorHandler.ClearMemory)

	protected.Put("/update-profile", authHandler.UpdateProfile)
	protected.Post("/account/deletion-request", authHandler.RequestAccountDeletion)
	protected.Delete("/account", authHandler.DeleteAccount)
	protected.Put("/update-push-token", authHandler.UpdatePushToken)
	protected.Post("/push-tokens/register", authHandler.RegisterPushToken)
	protected.Post("/push-tokens/unregister", authHandler.UnregisterPushToken)
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
	protected.Get("/system/portal-blueprint/:role", systemHandler.GetPortalBlueprint)
	protected.Get("/system/god-mode-math-filters", systemHandler.GetGodModeMathFilters)
	protected.Get("/path-tracker/today", pathTrackerHandler.GetToday)
	protected.Get("/path-tracker/weekly-summary", pathTrackerHandler.GetWeeklySummary)
	protected.Get("/path-tracker/metrics-summary", pathTrackerHandler.GetMetricsSummary)
	protected.Get("/path-tracker/unlock-status", pathTrackerHandler.GetUnlockStatus)
	protected.Post("/path-tracker/checkin", pathTrackerHandler.SaveCheckin)
	protected.Post("/path-tracker/generate-step", pathTrackerHandler.GenerateStep)
	protected.Post("/path-tracker/complete", pathTrackerHandler.CompleteStep)
	protected.Post("/path-tracker/reflect", pathTrackerHandler.ReflectStep)
	protected.Post("/path-tracker/assistant", pathTrackerHandler.AssistantHelp)
	protected.Post("/path-tracker/unlock-opened", pathTrackerHandler.MarkUnlockOpened)

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
	protected.Get("/rooms/support-config", roomHandler.GetSupportConfig)
	protected.Get("/support/config", roomHandler.GetUnifiedSupportConfig)
	protected.Get("/rooms/:id", roomHandler.GetRoom)
	protected.Post("/rooms/:id/join", roomHandler.JoinRoom)
	protected.Post("/rooms/leave", roomHandler.LeaveRoom)
	protected.Post("/rooms/invite", roomHandler.InviteUser)
	protected.Post("/rooms/:id/invite-link", roomHandler.CreateInviteLink)
	protected.Post("/rooms/join-by-token", roomHandler.JoinByToken)
	protected.Post("/rooms/remove", roomHandler.RemoveUser)
	protected.Post("/rooms/role", roomHandler.UpdateMemberRole)
	protected.Get("/rooms/:id/members", roomHandler.GetRoomMembers)
	protected.Get("/rooms/:id/summary", messageHandler.GetRoomSummary)
	protected.Put("/rooms/:id", roomHandler.UpdateRoom)
	protected.Put("/rooms/:id/settings", roomHandler.UpdateRoomSettings)
	protected.Post("/rooms/:id/image", roomHandler.UpdateRoomImage)
	protected.Get("/rooms/:id/sfu/config", roomSFUHandler.GetRoomConfig)
	protected.Post("/rooms/:id/sfu/token", roomSFUHandler.IssueRoomToken)

	// Channels (Release 1)
	protected.Post("/channels", channelHandler.CreateChannel)
	protected.Get("/channels/prompts/status", channelHandler.GetPromptStatus)
	protected.Post("/channels/prompts/:promptKey/dismiss", channelHandler.DismissPrompt)
	protected.Patch("/channels/:id", channelHandler.UpdateChannel)
	protected.Patch("/channels/:id/branding", channelHandler.UpdateBranding)
	protected.Post("/channels/:id/members", channelHandler.AddMember)
	protected.Get("/channels/:id/members", channelHandler.ListMembers)
	protected.Patch("/channels/:id/members/:userId", channelHandler.UpdateMemberRole)
	protected.Delete("/channels/:id/members/:userId", channelHandler.RemoveMember)
	protected.Post("/channels/:id/posts", channelHandler.CreatePost)
	protected.Patch("/channels/:id/posts/:postId", channelHandler.UpdatePost)
	protected.Post("/channels/:id/posts/:postId/pin", channelHandler.PinPost)
	protected.Delete("/channels/:id/posts/:postId/pin", channelHandler.UnpinPost)
	protected.Post("/channels/:id/posts/:postId/publish", channelHandler.PublishPost)
	protected.Post("/channels/:id/posts/:postId/schedule", channelHandler.SchedulePost)
	protected.Post("/channels/:id/showcases", channelHandler.CreateShowcase)
	protected.Patch("/channels/:id/showcases/:showcaseId", channelHandler.UpdateShowcase)
	protected.Delete("/channels/:id/showcases/:showcaseId", channelHandler.DeleteShowcase)

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
	protected.Get("/rag/domains", ragHandler.GetDomains)
	protected.Post("/rag/documents/upload", ragHandler.UploadDocument)
	protected.Get("/rag/documents", ragHandler.ListDocuments)
	protected.Get("/rag/documents/:id", ragHandler.GetDocument)
	protected.Delete("/rag/documents/:id", ragHandler.DeleteDocument)
	protected.Post("/rag/query", ragHandler.QueryDocuments)
	protected.Post("/rag/query-hybrid", ragHandler.QueryHybrid)
	protected.Get("/rag/sources/:id", ragHandler.GetSource)
	protected.Get("/rag/statistics", ragHandler.GetStatistics)
	protected.Post("/rag/sessions", ragHandler.CreateChatSession)
	protected.Get("/rag/sessions", ragHandler.ListChatSessions)

	// Multimedia Routes (Protected - User Features)
	protected.Post("/multimedia/suggest", multimediaHandler.CreateSuggestion)
	protected.Get("/multimedia/favorites", multimediaHandler.GetFavorites)
	protected.Post("/multimedia/tracks/:id/favorite", multimediaHandler.AddToFavorites)
	protected.Delete("/multimedia/tracks/:id/favorite", multimediaHandler.RemoveFromFavorites)
	protected.Get("/multimedia/playlists", multimediaHandler.GetPlaylists)
	protected.Post("/multimedia/playlists", multimediaHandler.CreatePlaylist)
	protected.Get("/multimedia/playlists/:id", multimediaHandler.GetPlaylistDetails)
	protected.Post("/multimedia/playlists/:id/items", multimediaHandler.AddTrackToPlaylist)
	protected.Delete("/multimedia/playlists/:id/items/:trackId", multimediaHandler.RemoveTrackFromPlaylist)

	// Video Circles
	protected.Post("/video-circles", videoCircleHandler.CreateVideoCircle)
	protected.Post("/video-circles/upload", videoCircleHandler.UploadAndCreateVideoCircle)
	protected.Get("/video-circles", videoCircleHandler.GetVideoCircles)
	protected.Get("/video-circles/my", videoCircleHandler.GetMyVideoCircles)
	protected.Patch("/video-circles/:id", videoCircleHandler.UpdateVideoCircle)
	protected.Post("/video-circles/:id/interactions", videoCircleHandler.AddInteraction)
	protected.Post("/interactions", videoCircleHandler.AddInteractionLegacy)
	protected.Post("/video-circles/:id/boost", videoCircleHandler.BoostCircle)
	protected.Post("/video-circles/:id/republish", videoCircleHandler.RepublishVideoCircle)
	protected.Delete("/video-circles/:id", videoCircleHandler.DeleteVideoCircle)

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
	protected.Get("/orders/seller", orderHandler.GetSellerOrders)
	protected.Get("/orders/:id", orderHandler.GetOrder)
	protected.Post("/orders/:id/cancel", orderHandler.CancelOrder)

	// Order Routes (Sattva Market - Seller)
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

	// Protected Yatra Routes (public routes are registered before protected middleware)
	protected.Get("/yatra/my", yatraHandler.GetMyYatras)
	protected.Post("/yatra", yatraHandler.CreateYatra)
	protected.Put("/yatra/:id", yatraHandler.UpdateYatra)
	protected.Delete("/yatra/:id", yatraHandler.DeleteYatra)
	protected.Post("/yatra/:id/publish", yatraHandler.PublishYatra)
	protected.Post("/yatra/:id/stop", yatraHandler.StopYatra)
	protected.Post("/yatra/:id/join", yatraHandler.JoinYatra)
	protected.Get("/yatra/:id/chat", yatraHandler.GetYatraChatAccess)
	protected.Post("/yatra/:id/broadcast", yatraHandler.BroadcastYatra)
	protected.Get("/yatra/:id/my-participation", yatraHandler.GetMyParticipation)
	protected.Get("/yatra/:id/participants/pending", yatraHandler.GetPendingParticipants)
	protected.Post("/yatra/:id/participants/:participantId/approve", yatraHandler.ApproveParticipant)
	protected.Post("/yatra/:id/participants/:participantId/reject", yatraHandler.RejectParticipant)
	protected.Delete("/yatra/:id/participants/:participantId", yatraHandler.RemoveParticipant)
	protected.Post("/yatra/:id/reviews", yatraHandler.CreateYatraReview)
	protected.Post("/yatra/upload", yatraHandler.UploadPhoto)

	// Yatra Reports (user can report tours/organizers)
	protected.Post("/yatra/:id/report", yatraAdminHandler.CreateYatraReport)
	protected.Post("/organizer/:id/report", yatraAdminHandler.CreateOrganizerReport)

	// Protected Shelter Routes
	protected.Get("/shelter/my", yatraHandler.GetMyShelters)
	protected.Post("/shelter", yatraHandler.CreateShelter)
	protected.Put("/shelter/:id", yatraHandler.UpdateShelter)
	protected.Delete("/shelter/:id", yatraHandler.DeleteShelter)
	protected.Post("/shelter/:id/reviews", yatraHandler.CreateShelterReview)
	protected.Delete("/shelter/:id/reviews/:reviewId", yatraHandler.DeleteShelterReview)
	protected.Post("/shelter/upload", yatraHandler.UploadPhoto)

	// ==================== SERVICES CONSTRUCTOR ====================
	// Public Services Routes
	api.Get("/services", serviceHandler.List)
	protected.Post("/services/upload", serviceHandler.UploadPhoto)

	// Protected Services Routes (moved up to avoid conflict with :id)
	protected.Get("/services/my", serviceHandler.GetMyServices)

	api.Get("/services/:id", serviceHandler.GetByID)
	api.Get("/services/:id/tariffs", serviceHandler.GetTariffs)
	api.Get("/services/:id/schedule", serviceHandler.GetSchedules)
	api.Get("/services/:id/schedule/weekly", serviceHandler.GetWeeklySchedule)
	api.Get("/services/:id/slots", bookingHandler.GetSlots)
	protected.Post("/services", serviceHandler.Create)
	protected.Put("/services/:id", serviceHandler.Update)
	protected.Delete("/services/:id", serviceHandler.Delete)
	protected.Post("/services/:id/publish", serviceHandler.Publish)
	protected.Post("/services/:id/pause", serviceHandler.Pause)

	// Service Tariffs (Protected - Owner only)
	protected.Post("/services/:id/tariffs", serviceHandler.AddTariff)
	protected.Put("/tariffs/:id", serviceHandler.UpdateTariff)
	protected.Delete("/tariffs/:id", serviceHandler.DeleteTariff)

	// Service Schedule (Protected - Owner only)
	protected.Post("/services/:id/schedule", serviceHandler.AddSchedule)
	protected.Put("/services/:id/schedule/weekly", serviceHandler.UpdateWeeklySchedule)
	protected.Delete("/schedule/:id", serviceHandler.DeleteSchedule)

	// Bookings
	protected.Post("/services/:id/book", bookingHandler.Book)
	protected.Get("/bookings/my", bookingHandler.GetMyBookings)
	protected.Get("/bookings/incoming", bookingHandler.GetIncomingBookings)
	protected.Get("/bookings/upcoming", bookingHandler.GetUpcoming)
	protected.Put("/bookings/:id/confirm", bookingHandler.Confirm)
	protected.Put("/bookings/:id/cancel", bookingHandler.Cancel)
	protected.Put("/bookings/:id/complete", bookingHandler.Complete)
	protected.Put("/bookings/:id/no-show", bookingHandler.NoShow)

	// Calendar
	protected.Get("/calendar/busy", bookingHandler.GetBusyTimes)

	// Wallet (Лакшми)
	protected.Get("/lkm/packages", lkmTopupHandler.GetPackages)
	protected.Post("/lkm/quote", lkmTopupHandler.CreateQuote)
	protected.Get("/lkm/topups", lkmTopupHandler.GetMyTopups)
	protected.Post("/lkm/topups", lkmTopupHandler.CreateTopup)
	protected.Get("/wallet", walletHandler.GetBalance)
	protected.Get("/wallet/transactions", walletHandler.GetTransactions)
	protected.Get("/wallet/stats", walletHandler.GetStats)
	protected.Post("/wallet/transfer", walletHandler.Transfer)

	// Referral System (Самбандха)
	protected.Get("/referral/invite", referralHandler.GetMyInviteLink)
	protected.Get("/referral/stats", referralHandler.GetMyReferralStats)
	protected.Get("/referral/list", referralHandler.GetMyReferrals)
	api.Get("/referral/validate/:code", referralHandler.ValidateInviteCode) // Public endpoint

	// Charity System (Seva)
	// Public Routes
	charity := api.Group("/charity")
	charity.Get("/projects", charityHandler.GetProjects)
	charity.Get("/organizations", charityHandler.GetOrganizations)

	// Protected Routes
	protected.Post("/charity/organizations", charityHandler.CreateOrganization)
	protected.Post("/charity/projects", charityHandler.CreateProject)
	protected.Post("/charity/donate", charityHandler.Donate)
	protected.Post("/charity/refund/:id", charityHandler.RefundDonation)  // NEW: Refund donation within 24h
	protected.Get("/charity/my-donations", charityHandler.GetMyDonations) // NEW: Get user's donations
	protected.Post("/charity/evidence", charityHandler.UploadEvidence)

	// Public Charity Routes (Evidence Wall & Karma Feed)
	api.Get("/charity/evidence/:projectId", charityHandler.GetProjectEvidence) // Get project evidence
	api.Get("/charity/karma-feed", charityHandler.GetKarmaFeed)                // Get recent donations for karma ticker

	// Admin Charity Routes
	admin.Get("/charity/stats", charityHandler.GetCharityStats)
	admin.Get("/charity/organizations", charityHandler.GetPendingOrganizations)
	admin.Post("/charity/organizations/:id/approve", charityHandler.ApproveOrganization)
	admin.Post("/charity/organizations/:id/reject", charityHandler.RejectOrganization)
	admin.Get("/charity/projects", charityHandler.GetPendingProjects)
	admin.Post("/charity/projects/:id/approve", charityHandler.ApproveProject)
	admin.Post("/charity/projects/:id/reject", charityHandler.RejectProject)

	// WebSocket Route
	api.Use("/ws", middleware.RateLimitByIP("ws_upgrade", 60, time.Minute), func(c *fiber.Ctx) error {
		if !fiberwebsocket.IsWebSocketUpgrade(c) {
			return c.SendStatus(fiber.StatusUpgradeRequired)
		}

		tokenString := c.Query("token")
		if strings.TrimSpace(tokenString) == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing token"})
		}

		claims, err := middleware.ParseAccessToken(tokenString)
		if err != nil || claims == nil || claims.UserID == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token"})
		}

		c.Locals("userId", claims.UserID)
		return c.Next()
	})

	api.Get("/ws/:id", fiberwebsocket.New(func(c *fiberwebsocket.Conn) {
		// Get validated userID from locals (set in middleware) calls
		// Note: We still keep :id in path for client compatibility but IGNORE it for security
		// or verify it matches the token. Ideally, we should remove :id from path in v2.

		userIDValue := c.Locals("userId")
		userId, ok := userIDValue.(uint)
		if !ok || userId == 0 {
			log.Printf("[WS-Security] Missing or invalid userId in websocket locals: %T", userIDValue)
			_ = c.Close()
			return
		}

		// Optional: Verify path param matches token (strict mode)
		paramId, _ := strconv.ParseUint(c.Params("id"), 10, 32)
		if uint(paramId) != userId {
			log.Printf("[WS-Security] Path ID %d DOES NOT MATCH Token ID %d. Using Token ID.", paramId, userId)
		}

		client := &websocket.Client{
			Hub:    hub,
			Conn:   c,
			UserID: userId,
			Send:   make(chan websocket.WSMessage, 256),
		}

		client.Hub.Register <- client
		go client.WritePump()
		client.ReadPump()
	}))

	// Static files for avatars
	app.Static("/uploads", "./uploads")

	// Start Server
	port := resolveListenPort("8000")
	log.Printf("Server starting on port %s", port)
	if err := app.Listen(port); err != nil {
		log.Printf("Server stopped with error: %v", err)
	}
}

func buildAllowedOrigins(defaults []string) ([]string, map[string]bool) {
	originsSet := make(map[string]bool, len(defaults))
	ordered := make([]string, 0, len(defaults))
	addOrigin := func(origin string) {
		normalized := normalizeAllowedOrigin(origin)
		if normalized == "" {
			return
		}
		if normalized == "*" {
			log.Printf("Ignoring wildcard ALLOWED_ORIGINS entry because credentials are enabled")
			return
		}
		normalized = strings.TrimSuffix(normalized, "/")
		if originsSet[normalized] {
			return
		}
		originsSet[normalized] = true
		ordered = append(ordered, normalized)
	}

	for _, origin := range defaults {
		addOrigin(origin)
	}

	for _, origin := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		addOrigin(origin)
	}

	return ordered, originsSet
}

func normalizeAllowedOrigin(origin string) string {
	normalized := strings.TrimSpace(origin)
	if normalized == "" {
		return ""
	}
	return strings.TrimSuffix(normalized, "/")
}

func resolveListenPort(defaultPort string) string {
	portValue := strings.TrimSpace(os.Getenv("PORT"))
	if portValue == "" {
		return ":" + defaultPort
	}
	portValue = strings.TrimPrefix(portValue, ":")
	portNumber, err := strconv.Atoi(portValue)
	if err != nil || portNumber <= 0 || portNumber > 65535 {
		log.Printf("Invalid PORT value %q, falling back to %s", portValue, defaultPort)
		return ":" + defaultPort
	}
	return fmt.Sprintf(":%d", portNumber)
}

func errorCodeFromStatus(status int) string {
	switch status {
	case fiber.StatusBadRequest:
		return "bad_request"
	case fiber.StatusUnauthorized:
		return "unauthorized"
	case fiber.StatusForbidden:
		return "forbidden"
	case fiber.StatusNotFound:
		return "not_found"
	case fiber.StatusConflict:
		return "conflict"
	case fiber.StatusTooManyRequests:
		return "rate_limited"
	case fiber.StatusInternalServerError:
		return "internal_error"
	case fiber.StatusBadGateway:
		return "bad_gateway"
	case fiber.StatusServiceUnavailable:
		return "service_unavailable"
	case fiber.StatusGatewayTimeout:
		return "gateway_timeout"
	default:
		if status >= 500 {
			return "server_error"
		}
		if status >= 400 {
			return "client_error"
		}
		return ""
	}
}
