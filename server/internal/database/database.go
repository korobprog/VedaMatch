package database

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/models"
	"time"

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

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to configure DB pool: %v", err)
	}
	sqlDB.SetMaxOpenConns(40)
	sqlDB.SetMaxIdleConns(20)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

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
		&models.User{}, &models.AuthSession{}, &models.Friend{}, &models.Message{}, &models.Block{},
		&models.AdminPermissionGrant{},
		&models.Room{}, &models.RoomMember{}, &models.RoomInviteToken{}, &models.AiModel{}, &models.Media{},
		&models.Channel{}, &models.ChannelMember{}, &models.ChannelPost{}, &models.ChannelShowcase{},
		&models.ChannelPostReaction{}, &models.ChannelPostComment{},
		&models.ChannelPostDelivery{},
		&models.ChannelSmartPushPreference{},
		&models.ChannelLiveSession{}, &models.ChannelLiveViewer{}, &models.ChannelLiveModeration{},
		&models.ChannelPromotedAdImpression{},
		&models.OrgType{}, &models.OrgProfile{}, &models.UserOrgMatch{}, &models.UserProSubscription{},
		&models.FeedPost{}, &models.FeedMediaAsset{}, &models.FeedItem{}, &models.FeedCursorState{},
		&models.FeedPostReaction{}, &models.FeedPostComment{},
		&models.UserDeviceToken{}, &models.PushDeliveryEvent{},
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
		&models.EducationWeakTopic{},
		&models.EducationTutorLatencyEvent{},
		// RAG models
		&models.Document{}, &models.Chunk{},
		&models.ChatSession{}, &models.ChatMessage{},
		&models.AssistantDocument{}, &models.DomainSyncState{},
		// Telegram support models
		&models.SupportContact{}, &models.SupportConversation{},
		&models.SupportMessage{}, &models.SupportOperatorRelay{},
		&models.SupportFAQItem{}, &models.SupportTelegramUpdate{},
		&models.SupportQuestionVote{},
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
		&models.UserPlaylist{}, &models.UserPlaylistItem{},
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
		&models.YatraReview{}, &models.YatraBillingEvent{},
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
		// Unified service support ledger
		&models.LKMAccount{}, &models.LKMLedgerEntry{},
		&models.LKMExpenseRequest{}, &models.LKMApprovalEvent{},
		// LKM top-up module
		&models.LKMTopupGlobalConfig{}, &models.LKMPaymentGateway{}, &models.LKMRegionConfig{},
		&models.LKMPackageConfig{}, &models.LKMPaymentProcessingCost{},
		&models.LKMManualFXRate{}, &models.LKMTopupRiskTier{},
		&models.LKMQuote{}, &models.LKMTopup{}, &models.LKMTopupWebhookEvent{},
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

	// Idempotency for personal channel post fanout.
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_post_delivery_unique
		ON channel_post_deliveries (post_id, user_id, delivery_type)`)

	// Channel post reactions/comments query paths.
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_channel_post_comments_post_created_desc
		ON channel_post_comments (post_id, created_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_channel_live_sessions_status_started
		ON channel_live_sessions (status, started_at DESC)`)
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_live_sessions_one_live_per_channel
		ON channel_live_sessions (channel_id)
		WHERE status = 'live' AND deleted_at IS NULL`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_media_tracks_sadhu_live_expiry
		ON media_tracks (source_context, retention_expires_at)
		WHERE source_context = 'sadhu_live_archive' AND deleted_at IS NULL`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_media_tracks_youtube_queue
		ON media_tracks (youtube_status, youtube_next_retry_at, updated_at DESC)
		WHERE source_context = 'sadhu_live_archive' AND deleted_at IS NULL`)

	// Message history pagination indexes
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_room_id_id_desc
		ON messages (room_id, id DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient_id_desc
		ON messages (sender_id, recipient_id, id DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_recipient_sender_id_desc
		ON messages (recipient_id, sender_id, id DESC)`)

	// Hot-path feed/news/services indexes.
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_channel_posts_status_published_created
		ON channel_posts (status, published_at DESC, created_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_services_status_created_desc
		ON services (status, created_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_news_items_status_important_published
		ON news_items (status, is_important DESC, published_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_channel_promoted_ad_impressions_user_placement_created
		ON channel_promoted_ad_impressions (user_id, placement, created_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_feed_items_user_time
		ON feed_items (user_id, published_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_feed_items_user_rank
		ON feed_items (user_id, source_rank DESC, published_at DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_posts_org_type_published
		ON posts (org_type_id, published_at DESC, id DESC)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_posts_status_published
		ON posts (status, published_at DESC, id DESC)`)

	// Contacts search indexes.
	DB.Exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_users_contacts_search_trgm
		ON users USING GIN (LOWER(
			coalesce(karmic_name, '') || ' ' ||
			coalesce(spiritual_name, '') || ' ' ||
			coalesce(nickname, '') || ' ' ||
			coalesce(city, '') || ' ' ||
			coalesce(country, '') || ' ' ||
			coalesce(yatra, '')
		) gin_trgm_ops)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_users_city_lower
		ON users (LOWER(city))`)
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_unique_lower
		ON users (LOWER(nickname))
		WHERE nickname IS NOT NULL AND nickname <> ''`)

	backfillRoomOwnerMemberships()
	backfillUserNicknames()

	// Backfill support conversation channel for legacy rows created before channel field existed.
	DB.Exec(`UPDATE support_conversations
		SET channel = 'telegram'
		WHERE channel IS NULL OR channel = ''`)

	// Hybrid RAG assistant indexes (FTS + de-dup upsert key)
	DB.Exec(`ALTER TABLE assistant_documents
		ADD COLUMN IF NOT EXISTS search_vector tsvector
		GENERATED ALWAYS AS (
			to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
		) STORED`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_assistant_documents_search_vector
		ON assistant_documents USING GIN (search_vector)`)
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_documents_unique
		ON assistant_documents (domain, source_type, source_id, language, visibility_scope, user_id)`)

	// FIX: Ensure wallets.user_id is nullable (Postgres sometimes keeps NOT NULL after migration)
	DB.Exec("ALTER TABLE wallets ALTER COLUMN user_id DROP NOT NULL")

	InitializeSuperAdmin()
	SeedMarket()
	SeedServices()
	SeedEducation()
	SeedMultimedia()
	FixMultimediaLiveSources()
	SeedTravel()
	SeedWallets()
	SeedCharity() // Initialize platform wallet and charity settings
	SeedLKMAccounts()
	SeedLKMTopup()
	backfillUserNicknames()
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

func backfillRoomOwnerMemberships() {
	if DB == nil {
		return
	}

	if err := DB.Exec(`
		INSERT INTO room_members (created_at, updated_at, room_id, user_id, role)
		SELECT NOW(), NOW(), r.id, r.owner_id, 'owner'
		FROM rooms r
		WHERE r.owner_id > 0
		ON CONFLICT (room_id, user_id) DO UPDATE
		SET role = 'owner', deleted_at = NULL, updated_at = NOW()
	`).Error; err != nil {
		log.Printf("[Migration] Failed to backfill room owner memberships: %v", err)
		return
	}

	if err := DB.Exec(`
		UPDATE room_members rm
		SET role = 'owner', updated_at = NOW()
		FROM rooms r
		WHERE rm.room_id = r.id
		  AND rm.user_id = r.owner_id
		  AND rm.deleted_at IS NULL
		  AND rm.role <> 'owner'
	`).Error; err != nil {
		log.Printf("[Migration] Failed to normalize owner room role: %v", err)
	}
}

func backfillUserNicknames() {
	if DB == nil {
		return
	}

	err := DB.Exec(`
		UPDATE users
		SET nickname = LOWER(
			LEFT(
				COALESCE(
					NULLIF(
						BTRIM(
							REGEXP_REPLACE(
								REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9._]+', '_', 'g'),
								'[._]{2,}',
								'_',
								'g'
							),
							'._'
						),
						''
					),
					'u'
				),
				12
			) || '_' || id::text
		),
		nickname_set_manually = false
		WHERE nickname IS NULL OR nickname = ''
	`).Error
	if err != nil {
		log.Printf("[Migration] Failed to backfill user nicknames: %v", err)
		return
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
