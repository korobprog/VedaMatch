package database

import (
	"log"
	"rag-agent-server/internal/models"
	"time"
)

// SeedGeminiModels adds Gemini models if they don't exist
func SeedGeminiModels() {
	geminiModels := []models.AiModel{
		{
			ModelID:              "gemini-2.5-flash",
			Name:                 "Gemini 2.5 Flash",
			Provider:             "Google",
			Category:             "text",
			IsEnabled:            true,
			IsNew:                false,
			LastSyncDate:         time.Now(),
			IsRecommended:        true,
			LatencyTier:          "fast",
			IntelligenceTier:     "smart",
			IsAutoRoutingEnabled: true,
		},
		{
			ModelID:              "gemini-2.5-flash-lite",
			Name:                 "Gemini 2.5 Flash Lite",
			Provider:             "Google",
			Category:             "text",
			IsEnabled:            true,
			IsNew:                false,
			LastSyncDate:         time.Now(),
			IsRecommended:        false,
			LatencyTier:          "fast",
			IntelligenceTier:     "standard",
			IsAutoRoutingEnabled: true,
		},
	}

	for _, m := range geminiModels {
		var existing models.AiModel
		if err := DB.Where("model_id = ?", m.ModelID).First(&existing).Error; err != nil {
			// Not found, create it
			if err := DB.Create(&m).Error; err != nil {
				log.Printf("[Seed] Error creating model %s: %v", m.ModelID, err)
			} else {
				log.Printf("[Seed] Created Gemini model: %s", m.ModelID)
			}
		} else {
			// Model exists - ensure AutoRouting is enabled for Gemini
			if !existing.IsAutoRoutingEnabled || !existing.IsEnabled {
				DB.Model(&existing).Updates(map[string]interface{}{
					"is_enabled":              true,
					"is_auto_routing_enabled": true,
					"provider":                "Google",
				})
				log.Printf("[Seed] Updated Gemini model %s: AutoRouting enabled", m.ModelID)
			}
		}
	}
}

// SeedSystemSettings adds default system settings
func SeedSystemSettings() {
	settings := []models.SystemSetting{
		{
			Key:   "DEFAULT_ASTRO_MODEL",
			Value: "gemini-2.5-flash",
		},
		{
			Key:   "LM_GEMINI",
			Value: "", // User will fill this in admin panel or .env fallback will work
		},
		{
			Key:   "ROUTEWAY_API_KEY",
			Value: "", // Routeway.ai API key for unified LLM access
		},
		{
			Key:   "ROUTEWAY_API_URL",
			Value: "https://api.routeway.ai/v1/chat/completions",
		},
		{
			Key:   "calls.feedback.enabled",
			Value: "true",
		},
		{
			Key:   "calls.support_transfer.enabled",
			Value: "true",
		},
		{
			Key:   "calls.support.wallet_user_id",
			Value: "",
		},
		{
			Key:   "PATH_TRACKER_ENABLED",
			Value: "true",
		},
		{
			Key:   "PATH_TRACKER_ALERT_WEBHOOK_URL",
			Value: "",
		},
		{
			Key:   "PATH_TRACKER_ROLLOUT_PERCENT",
			Value: "100",
		},
		{
			Key:   "PATH_TRACKER_ROLLOUT_ALLOWLIST",
			Value: "",
		},
		{
			Key:   "PATH_TRACKER_ROLLOUT_DENYLIST",
			Value: "",
		},
		{
			Key:   "PATH_TRACKER_PHASE3_EXPERIMENT",
			Value: "off",
		},
		{
			Key:   "CHANNELS_V1_ENABLED",
			Value: "true",
		},
		{
			Key:   "CHANNELS_V1_ROLLOUT_PERCENT",
			Value: "100",
		},
		{
			Key:   "CHANNELS_V1_ROLLOUT_ALLOWLIST",
			Value: "",
		},
		{
			Key:   "CHANNELS_V1_ROLLOUT_DENYLIST",
			Value: "",
		},
		{
			Key:   "SERVICES_PLATFORM_FEE_ENABLED",
			Value: "true",
		},
		{
			Key:   "SERVICES_PLATFORM_FEE_PERCENT_BPS",
			Value: "800",
		},
		{
			Key:   "SERVICES_PLATFORM_FEE_CAP_LKM",
			Value: "300",
		},
		{
			Key:   "SERVICES_PLATFORM_FEE_APPLY_NO_SHOW",
			Value: "true",
		},
		{
			Key:   "SERVICES_PLATFORM_FEE_ROLLOUT_PERCENT",
			Value: "20",
		},
		{
			Key:   "CAFE_PLATFORM_FEE_ENABLED",
			Value: "false",
		},
		{
			Key:   "CAFE_PLATFORM_FEE_PERCENT_BPS",
			Value: "800",
		},
		{
			Key:   "CAFE_PLATFORM_FEE_CAP_LKM",
			Value: "250",
		},
		{
			Key:   "CAFE_PLATFORM_FEE_MIN_ORDER_LKM",
			Value: "100",
		},
		{
			Key:   "CAFE_PLATFORM_FEE_EFFECTIVE_FROM",
			Value: "",
		},
		{
			Key:   "CAFE_PLATFORM_FEE_ROLLOUT_PERCENT",
			Value: "0",
		},
		{
			Key:   "MARKET_PLATFORM_FEE_ENABLED",
			Value: "true",
		},
		{
			Key:   "MARKET_PLATFORM_FEE_PERCENT_BPS",
			Value: "800",
		},
		{
			Key:   "MARKET_PLATFORM_FEE_CAP_LKM",
			Value: "300",
		},
		{
			Key:   "MARKET_PLATFORM_FEE_EFFECTIVE_FROM",
			Value: "",
		},
		{
			Key:   "MARKET_PLATFORM_FEE_ROLLOUT_PERCENT",
			Value: "100",
		},
		{
			Key:   "SHOP_PLAN_BASIC_PRICE_LKM",
			Value: "0",
		},
		{
			Key:   "SHOP_PLAN_BASIC_PRODUCTS_LIMIT",
			Value: "20",
		},
		{
			Key:   "SHOP_PLAN_PRO_PRICE_LKM",
			Value: "299",
		},
		{
			Key:   "SHOP_PLAN_PRO_PRODUCTS_LIMIT",
			Value: "200",
		},
		{
			Key:   "SHOP_PLAN_PLUS_PRICE_LKM",
			Value: "699",
		},
		{
			Key:   "SHOP_PLAN_PLUS_PRODUCTS_LIMIT",
			Value: "0",
		},
		{
			Key:   "SHOP_PRODUCT_PROMO_24H_PRICE_LKM",
			Value: "15",
		},
		{
			Key:   "SHOP_PRODUCT_PROMO_24H_DURATION_MIN",
			Value: "1440",
		},
		{
			Key:   "SHOP_PRODUCT_PROMO_7D_PRICE_LKM",
			Value: "60",
		},
		{
			Key:   "SHOP_PRODUCT_PROMO_7D_DURATION_MIN",
			Value: "10080",
		},
		{
			Key:   "SHOP_PRODUCT_PROMO_30D_PRICE_LKM",
			Value: "180",
		},
		{
			Key:   "SHOP_PRODUCT_PROMO_30D_DURATION_MIN",
			Value: "43200",
		},
		{
			Key:   "SHOP_GEO_BOOST_24H_PRICE_LKM",
			Value: "20",
		},
		{
			Key:   "SHOP_GEO_BOOST_24H_DURATION_MIN",
			Value: "1440",
		},
		{
			Key:   "SADHU_SANGA_LANGUAGE_LABELS_ENABLED",
			Value: "true",
		},
		{
			Key:   "SADHU_SANGA_PREACHER_BIO_ENABLED",
			Value: "true",
		},
		{
			Key:   "SADHU_SANGA_PREACHER_BIO_ROLLOUT_PERCENT",
			Value: "100",
		},
		{
			Key:   "SADHU_SANGA_PREACHER_BIO_ROLLOUT_ALLOWLIST",
			Value: "",
		},
		{
			Key:   "SADHU_SANGA_PREACHER_BIO_ROLLOUT_DENYLIST",
			Value: "",
		},
		{
			Key:   "SADHU_SANGA_MATH_FILTER_ENABLED",
			Value: "true",
		},
		{
			Key:   "SADHU_SANGA_MATH_FILTER_ROLLOUT_PERCENT",
			Value: "100",
		},
		{
			Key:   "SADHU_SANGA_MATH_FILTER_ROLLOUT_ALLOWLIST",
			Value: "",
		},
		{
			Key:   "SADHU_SANGA_MATH_FILTER_ROLLOUT_DENYLIST",
			Value: "",
		},
		{
			Key:   "PRO_ENABLED",
			Value: "true",
		},
		{
			Key:   "PRO_PLAN_7D_LKM",
			Value: "99",
		},
		{
			Key:   "PRO_PLAN_30D_LKM",
			Value: "299",
		},
		{
			Key:   "PRO_PLAN_90D_LKM",
			Value: "799",
		},
		{
			Key:   "PRO_LKM_SUBSCRIPTIONS_ENABLED",
			Value: "true",
		},
		{
			Key:   "SADHU_SANGA_LIVE_RETENTION_ENABLED",
			Value: "true",
		},
		{
			Key:   "SADHU_SANGA_LIVE_RETENTION_DAYS",
			Value: "7",
		},
		{
			Key:   "SADHU_SANGA_YOUTUBE_AUTOPUBLISH_ENABLED",
			Value: "false",
		},
		{
			Key:   "YOUTUBE_ENABLED",
			Value: "false",
		},
		{
			Key:   "YOUTUBE_AUTO_PUBLISH_ENABLED",
			Value: "false",
		},
		{
			Key:   "YOUTUBE_OAUTH_CLIENT_ID",
			Value: "",
		},
		{
			Key:   "YOUTUBE_OAUTH_CLIENT_SECRET",
			Value: "",
		},
		{
			Key:   "YOUTUBE_OAUTH_REFRESH_TOKEN",
			Value: "",
		},
		{
			Key:   "YOUTUBE_UPLOAD_CHANNEL_ID",
			Value: "",
		},
		{
			Key:   "YOUTUBE_DEFAULT_PRIVACY",
			Value: "public",
		},
		{
			Key:   "YOUTUBE_DEFAULT_CATEGORY_ID",
			Value: "22",
		},
		{
			Key:   "YOUTUBE_TITLE_TEMPLATE",
			Value: "{{title}} | Садху Санга",
		},
		{
			Key:   "YOUTUBE_DESCRIPTION_TEMPLATE",
			Value: "{{title}}\n\nЯзык трансляции: {{language}}\n#sadhu #sanga",
		},
		{
			Key:   "YOUTUBE_DEFAULT_TAGS",
			Value: "sadhu,sanga,lecture",
		},
		{
			Key:   "YOUTUBE_PUBLISH_DELAY_MINUTES",
			Value: "0",
		},
		{
			Key:   "FEED_V2_ENABLED",
			Value: "false",
		},
		{
			Key:   "FEED_V2_ROLLOUT_PERCENT",
			Value: "5",
		},
		{
			Key:   "FEED_RANK_WEIGHTS_JSON",
			Value: `{"recency":0.62,"engagement":0.24,"proBoost":0.14}`,
		},
		{
			Key:   "FEED_CACHE_TTL_SEC",
			Value: "90",
		},
		{
			Key:   "FEED_CIRCLE_MIX_RATIO",
			Value: "0.35",
		},
		{
			Key:   "EDU_TUTOR_ENABLED",
			Value: "true",
		},
		{
			Key:   "EDU_TUTOR_MEMORY_ENABLED",
			Value: "true",
		},
		{
			Key:   "EDU_TUTOR_EXTRACTOR_ENABLED",
			Value: "true",
		},
		{
			Key:   "EDU_TUTOR_RETENTION_DAYS",
			Value: "180",
		},
		{
			Key:   "EDU_TUTOR_RETENTION_SWEEP_MINUTES",
			Value: "360",
		},
		{
			Key:   "EDU_TUTOR_ALLOWED_DOMAINS",
			Value: "education",
		},
		{
			Key:   "CHANNELS_PROMOTED_DAILY_CAP",
			Value: "3",
		},
		{
			Key:   "CHANNELS_PROMOTED_AD_COOLDOWN_HOURS",
			Value: "6",
		},
		{
			Key:   "CHANNELS_PROMOTED_INSERT_EVERY",
			Value: "4",
		},
		{
			Key:   "FCM_SENDER_MODE",
			Value: "auto",
		},
		{
			Key:   "GOOGLE_APPLICATION_CREDENTIALS",
			Value: "",
		},
		{
			Key:   "FIREBASE_PROJECT_ID",
			Value: "",
		},
		{
			Key:   "FIREBASE_SERVICE_ACCOUNT_JSON",
			Value: "",
		},
		{
			Key:   "TELEGRAM_AUTH_ENABLED",
			Value: "true",
		},
		{
			Key:   "TELEGRAM_AUTH_BOT_TOKEN",
			Value: "",
		},
		{
			Key:   "TELEGRAM_AUTH_MAX_AGE_SEC",
			Value: "300",
		},
		{
			Key:   "TELEGRAM_AUTH_CIS_LANG_CODES",
			Value: "ru,uk,be,kk,uz,ky,tg,hy,az,mo",
		},
		{
			Key:   "SUPPORT_TELEGRAM_BOT_TOKEN",
			Value: "",
		},
		{
			Key:   "SUPPORT_TELEGRAM_WEBHOOK_SECRET",
			Value: "",
		},
		{
			Key:   "SUPPORT_TELEGRAM_OPERATOR_CHAT_ID",
			Value: "",
		},
		{
			Key:   "SUPPORT_TELEGRAM_BOT_URL",
			Value: "https://t.me/vedamatch_bot",
		},
		{
			Key:   "SUPPORT_LKM_WEBAPP_URL_RU",
			Value: "https://lkm.vedamatch.ru/?tg=1",
		},
		{
			Key:   "SUPPORT_LKM_WEBAPP_URL_GLOBAL",
			Value: "https://lkm.vedamatch.com/?tg=1",
		},
		{
			Key:   "SUPPORT_LKM_OFFICE_TEXT_RU",
			Value: "LKM офис",
		},
		{
			Key:   "SUPPORT_LKM_OFFICE_TEXT_EN",
			Value: "LKM Office",
		},
		{
			Key:   "SUPPORT_LKM_OFFICE_TEXT_HI",
			Value: "LKM ऑफिस",
		},
		{
			Key:   "SUPPORT_DOWNLOAD_IOS_URL",
			Value: "",
		},
		{
			Key:   "SUPPORT_DOWNLOAD_ANDROID_URL",
			Value: "",
		},
		{
			Key:   "ANDROID_TESTERS_VERSION_CODE",
			Value: "",
		},
		{
			Key:   "ANDROID_TESTERS_MIN_SUPPORTED_VERSION_CODE",
			Value: "",
		},
		{
			Key:   "ANDROID_TESTERS_PUBLISHED_AT",
			Value: "",
		},
		{
			Key:   "SUPPORT_CHANNEL_URL",
			Value: "",
		},
		{
			Key:   "SUPPORT_AI_ENABLED",
			Value: "true",
		},
		{
			Key:   "SUPPORT_AI_CONFIDENCE_THRESHOLD",
			Value: "0.55",
		},
		{
			Key:   "SUPPORT_AI_ESCALATION_KEYWORDS",
			Value: "оператор,не помогло,жалоба,support,human",
		},
		{
			Key:   "SUPPORT_LANG_MODE",
			Value: "auto_ru_en_hi",
		},
		{
			Key:   "SUPPORT_APP_ENTRY_ENABLED",
			Value: "true",
		},
		{
			Key:   "SUPPORT_APP_ENTRY_ROLLOUT_PERCENT",
			Value: "100",
		},
		{
			Key:   "SUPPORT_INAPP_TICKET_FORCE_DISABLE",
			Value: "false",
		},
		{
			Key:   "SUPPORT_SLA_TEXT_RU",
			Value: "AI отвечает сразу, оператор в рабочее время — до 4 часов.",
		},
		{
			Key:   "SUPPORT_SLA_TEXT_EN",
			Value: "AI replies instantly, operator response during business hours is within 4 hours.",
		},
		{
			Key:   "SUPPORT_SLA_TEXT_HI",
			Value: "AI तुरंत जवाब देता है, और कार्य समय में ऑपरेटर 4 घंटे के भीतर जवाब देता है।",
		},
		{
			Key:   "SUPPORT_AUTO_REPLY_RU",
			Value: "Спасибо! Мы получили обращение и уже работаем над ответом.",
		},
		{
			Key:   "SUPPORT_AUTO_REPLY_EN",
			Value: "Thanks! We received your request and are already working on a response.",
		},
		{
			Key:   "SUPPORT_AUTO_REPLY_HI",
			Value: "धन्यवाद! हमने आपका अनुरोध प्राप्त कर लिया है और जवाब तैयार कर रहे हैं।",
		},
		{
			Key:   "support.rooms.enabled",
			Value: "true",
		},
		{
			Key:   "support.seva.enabled",
			Value: "true",
		},
		{
			Key:   "support.rooms.default_amount",
			Value: "20",
		},
		{
			Key:   "support.seva.default_amount",
			Value: "20",
		},
		{
			Key:   "support.rooms.cooldown_hours",
			Value: "24",
		},
		{
			Key:   "support.seva.cooldown_hours",
			Value: "24",
		},
		{
			Key:   "support.rooms.platform_contribution_enabled",
			Value: "true",
		},
		{
			Key:   "support.seva.platform_contribution_enabled",
			Value: "true",
		},
		{
			Key:   "support.rooms.platform_contribution_default",
			Value: "5",
		},
		{
			Key:   "support.seva.platform_contribution_default",
			Value: "5",
		},
		{
			Key:   "support.rooms.project_id",
			Value: "",
		},
		{
			Key:   "support.seva.project_id",
			Value: "",
		},
		{
			Key:   "LEGAL_OPERATOR_FULL_NAME",
			Value: "Self-employed service operator (RF, NPD)",
		},
		{
			Key:   "LEGAL_SUPPORT_EMAIL",
			Value: "support@vedamatch.ru",
		},
		{
			Key:   "LEGAL_PRIVACY_EMAIL",
			Value: "privacy@vedamatch.ru",
		},
		{
			Key:   "LEGAL_LEGAL_EMAIL",
			Value: "legal@vedamatch.ru",
		},
		{
			Key:   "LEGAL_RETENTION_ACCOUNT_DAYS",
			Value: "30",
		},
		{
			Key:   "LEGAL_RETENTION_MEDIA_DAYS",
			Value: "30",
		},
		{
			Key:   "LEGAL_RETENTION_LOG_DAYS",
			Value: "365",
		},
		{
			Key:   "LEGAL_RETENTION_LEGAL_TAX_DAYS",
			Value: "1825",
		},
		{
			Key:   "lkm.expense.single_approval_limit",
			Value: "500",
		},
		{
			Key:   "YATRA_BILLING_ENABLED",
			Value: "false",
		},
		{
			Key:   "YATRA_DAILY_FEE_LKM",
			Value: "10",
		},
		{
			Key:   "CHAT_TRANSCRIBE_BILLING_ENABLED",
			Value: "true",
		},
		{
			Key:   "CHAT_TRANSCRIBE_FREE_MIN_PER_WEEK",
			Value: "5",
		},
		{
			Key:   "CHAT_TRANSCRIBE_PRICE_PER_MIN_LKM",
			Value: "3",
		},
		{
			Key:   "CHAT_TRANSCRIBE_LONG_AUDIO_THRESHOLD_MIN",
			Value: "5",
		},
		{
			Key:   "CHAT_TRANSCRIBE_LONG_AUDIO_PRICE_PER_MIN_LKM",
			Value: "2",
		},
		{
			Key:   "CHAT_TRANSCRIBE_MIN_CHARGE_LKM",
			Value: "1",
		},
	}

	for _, s := range settings {
		var existing models.SystemSetting
		if err := DB.Where("key = ?", s.Key).First(&existing).Error; err != nil {
			DB.Create(&s)
			log.Printf("[Seed] Created system setting: %s", s.Key)
		}
	}
}

func SeedLKMAccounts() {
	accounts := []models.LKMAccount{
		{Code: "rooms_fund", Name: "Rooms Fund", IsActive: true},
		{Code: "seva_fund", Name: "Seva Fund", IsActive: true},
		{Code: "platform_fund", Name: "Platform Fund", IsActive: true},
		{Code: "refund_reserve", Name: "Refund Reserve", IsActive: true},
		{Code: "user_wallet", Name: "User Wallet (Virtual)", IsActive: true},
		{Code: "external_expense", Name: "External Expense Sink", IsActive: true},
	}

	for _, account := range accounts {
		var existing models.LKMAccount
		if err := DB.Where("code = ?", account.Code).First(&existing).Error; err != nil {
			if err := DB.Create(&account).Error; err != nil {
				log.Printf("[Seed] Error creating LKM account %s: %v", account.Code, err)
			} else {
				log.Printf("[Seed] Created LKM account: %s", account.Code)
			}
		}
	}
}

// SeedLibrary populates the library with default books
func SeedLibrary() {
	books := []models.ScriptureBook{
		{
			Code:          "bg",
			NameEn:        "Bhagavad Gita As It Is",
			NameRu:        "Бхагавад-гита",
			DescriptionEn: "The Song of God. A dialogue between Krishna and Arjuna before the battle.",
			DescriptionRu: "Песнь Бога. Диалог между Кришной и Арджуной перед битвой на Курукшетре.",
		},
		{
			Code:          "sb",
			NameEn:        "Srimad Bhagavatam",
			NameRu:        "Шримад-Бхагаватам",
			DescriptionEn: "The beautiful story of the Personality of Godhead.",
			DescriptionRu: "Прекрасная история о Личности Бога - амала-пурана.",
		},
		{
			Code:          "cc",
			NameEn:        "Sri Caitanya Caritamrta",
			NameRu:        "Шри Чайтанья-чаритамрита",
			DescriptionEn: "The life and teachings of Sri Caitanya Mahaprabhu.",
			DescriptionRu: "Жизнь и учение Шри Чайтаньи Махапрабху.",
		},
		{
			Code:          "iso",
			NameEn:        "Sri Isopanisad",
			NameRu:        "Шри Ишопанишад",
			DescriptionEn: "Knowledge that brings one nearer to the Supreme Personality of Godhead.",
			DescriptionRu: "Знание, приближающее к Верховной Личности Бога.",
		},
		{
			Code:          "nod",
			NameEn:        "Nectar of Devotion",
			NameRu:        "Нектар преданности",
			DescriptionEn: "The complete science of Bhakti-yoga.",
			DescriptionRu: "Полная наука бхакти-йоги.",
		},
		{
			Code:          "noi",
			NameEn:        "Nectar of Instruction",
			NameRu:        "Нектар наставлений",
			DescriptionEn: "Eleven lessons in the ancient science of Bhakti-yoga.",
			DescriptionRu: "Одиннадцать уроков древней науки бхакти-йоги.",
		},
	}

	for _, b := range books {
		var existing models.ScriptureBook
		if err := DB.Where("code = ?", b.Code).First(&existing).Error; err != nil {
			if err := DB.Create(&b).Error; err != nil {
				log.Printf("[Seed] Error creating book %s: %v", b.Code, err)
			} else {
				log.Printf("[Seed] Created Scripture Book: %s", b.Code)
			}
		}
	}
}

// SeedWallets creates wallets for users who don't have one yet
// Initial balance: 1000 Лакшми
func SeedWallets() {
	// Get all users without a wallet
	var usersWithoutWallet []models.User

	// Find users who don't have a wallet
	subQuery := DB.Table("wallets").Select("user_id")
	if err := DB.Where("id NOT IN (?)", subQuery).Find(&usersWithoutWallet).Error; err != nil {
		log.Printf("[Seed] Error finding users without wallets: %v", err)
		return
	}

	if len(usersWithoutWallet) == 0 {
		return
	}

	// Create wallets for each user
	created := 0
	for _, user := range usersWithoutWallet {
		userID := user.ID // Create local copy for pointer
		wallet := models.Wallet{
			UserID:      &userID,
			Type:        models.WalletTypePersonal,
			Balance:     1000, // Initial balance: 1000 Лакшми
			TotalEarned: 0,
			TotalSpent:  0,
		}

		if err := DB.Create(&wallet).Error; err != nil {
			log.Printf("[Seed] Error creating wallet for user %d: %v", user.ID, err)
		} else {
			created++
		}
	}

	if created > 0 {
		log.Printf("[Seed] Created %d wallets with 1000 Лакшми each", created)
	}
}
