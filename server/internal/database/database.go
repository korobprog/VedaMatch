package database

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	var err error

	// Get database connection parameters from environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5435")
	dbUser := getEnv("DB_USER", "raguser")
	dbPassword := getEnv("DB_PASSWORD", "ragpassword")
	dbName := getEnv("DB_NAME", "ragdb")

	// Build PostgreSQL DSN
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to Database")

	// Auto Migrate - Stage 1: Independent Tables required for foreign keys
	// We migrate ScriptureBook first so we can seed it before ScriptureVerse tries to create an FK to it
	err = DB.AutoMigrate(
		&models.ScriptureBook{},
	)
	if err != nil {
		log.Printf("[Migration] Failed to migrate ScriptureBook: %v", err)
	}

	// Seed Library (Books) immediately so subsequent migrations with FKs succeed
	SeedLibrary()

	// Auto Migrate - Stage 2: All other tables
	err = DB.AutoMigrate(
		// Core models
		&models.User{}, &models.Friend{}, &models.Message{}, &models.Block{},
		&models.Room{}, &models.RoomMember{}, &models.AiModel{}, &models.Media{},
		&models.Channel{}, &models.ChannelMember{}, &models.ChannelPost{}, &models.ChannelShowcase{},
		&models.SystemSetting{}, &models.MetricCounter{}, &models.UserDismissedPrompt{},
		&models.DatingFavorite{}, &models.DatingCompatibility{},
		&models.AIPrompt{}, &models.UserPortalLayout{},
		// Ads models
		&models.Ad{}, &models.AdPhoto{}, &models.AdFavorite{}, &models.AdReport{},
		// Library models
		&models.ScriptureCanto{}, &models.ScriptureChapter{},
		&models.ScriptureVerse{}, // Dependent on ScriptureBook
		// Tags
		&models.Tag{}, &models.UserTag{},
		// News models
		&models.NewsSource{}, &models.NewsItem{},
		&models.UserNewsSubscription{}, &models.UserNewsFavorite{},
		// Sattva Market models
		&models.Shop{}, &models.ShopReview{},
		&models.Product{}, &models.ProductVariant{}, &models.ProductImage{},
		&models.ProductReview{}, &models.ProductFavorite{},
		&models.Order{}, &models.OrderItem{},
		// Education models
		&models.EducationCourse{}, &models.EducationModule{},
		&models.ExamQuestion{}, &models.AnswerOption{},
		&models.UserExamAttempt{}, &models.UserModuleProgress{},
		// RAG models
		&models.Document{}, &models.Chunk{},
		&models.ChatSession{}, &models.ChatMessage{},
		// Cafe models
		&models.Cafe{}, &models.CafeStaff{}, &models.CafeTable{},
		&models.CafeReview{}, &models.WaiterCall{},
		&models.DishCategory{}, &models.Dish{},
		&models.DishIngredient{}, &models.DishModifier{},
		&models.CafeOrder{}, &models.CafeOrderItem{},
		&models.CafeOrderItemModifier{}, &models.TableReservation{},
		// Multimedia Hub models
		&models.MediaCategory{}, &models.MediaTrack{},
		&models.RadioStation{}, &models.TVChannel{},
		&models.UserMediaSuggestion{}, &models.UserMediaFavorite{},
		&models.UserMediaHistory{},
		&models.VideoCircle{}, &models.VideoCircleInteraction{},
		&models.VideoTariff{}, &models.VideoCircleBillingLog{},
		// Video-specific models
		&models.VideoQuality{}, &models.VideoSubtitle{},
		&models.UserVideoProgress{}, &models.VideoTranscodingJob{},
		// Series models (TV shows, multi-episode content)
		&models.Series{}, &models.Season{}, &models.Episode{},
		// Yatra Travel models (pilgrimage service)
		&models.Yatra{}, &models.YatraParticipant{},
		&models.Shelter{}, &models.ShelterReview{},
		&models.YatraReview{},
		// Yatra Admin models (moderation)
		&models.YatraReport{}, &models.OrganizerBlock{},
		&models.AdminNotification{}, &models.ModerationTemplate{},
		// Services (universal service constructor)
		&models.Service{}, &models.ServiceTariff{},
		&models.ServiceSchedule{}, &models.ServiceBooking{},
		// Wallet (Лакшми currency)
		&models.Wallet{}, &models.WalletTransaction{},
		// Charity (Seva module)
		&models.CharityOrganization{}, &models.CharityProject{},
		&models.CharityDonation{}, &models.CharityEvidence{},
		&models.CharityKarmaNote{}, &models.CharitySettings{},
		// Path Tracker
		&models.DailyCheckin{}, &models.DailyStep{},
		&models.DailyStepEvent{}, &models.PathTrackerAlertEvent{}, &models.PathTrackerUnlock{}, &models.PathTrackerState{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Println("Database Migrated")

	// Partial unique index for like toggle (only one like per user per circle)
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_video_circle_like_unique
		ON video_circle_interactions (circle_id, user_id, type)
		WHERE type = 'like'`)

	// One pinned post per channel.
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_single_pinned_post
		ON channel_posts (channel_id)
		WHERE is_pinned = true`)

	// FIX: Ensure wallets.user_id is nullable (Postgres sometimes keeps NOT NULL after migration)
	DB.Exec("ALTER TABLE wallets ALTER COLUMN user_id DROP NOT NULL")

	InitializeSuperAdmin()
	SeedMarket()
	SeedEducation()
	SeedMultimedia()
	SeedTravel()
	SeedWallets()
	SeedCharity() // Initialize platform wallet and charity settings
}

func InitializeSuperAdmin() {
	email := os.Getenv("SUPERADMIN_EMAIL")
	password := os.Getenv("SUPERADMIN_PASSWORD")

	if email == "" || password == "" {
		log.Println("[AUTH] Superadmin credentials not set in environment, skipping initialization")
		return
	}

	log.Printf("[AUTH] Attempting to initialize superadmin from environment: %s", email)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[AUTH] Failed to hash superadmin password: %v", err)
		return
	}

	var admin models.User
	result := DB.Where("email = ?", email).First(&admin)

	if result.Error == nil {
		log.Printf("[AUTH] User %s found. Updating role to superadmin and syncing password.", email)
		DB.Model(&admin).Updates(map[string]interface{}{
			"role":                models.RoleSuperadmin,
			"password":            string(hashedPassword),
			"is_profile_complete": true,
		})
		return
	}

	// Create new superadmin
	admin = models.User{
		Email:             email,
		Password:          string(hashedPassword),
		Role:              models.RoleSuperadmin,
		KarmicName:        "Super",
		SpiritualName:     "Admin",
		IsProfileComplete: true,
	}

	if err := DB.Create(&admin).Error; err != nil {
		log.Printf("[AUTH] Failed to create superadmin: %v", err)
	} else {
		log.Printf("[AUTH] Superadmin %s created successfully", email)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
