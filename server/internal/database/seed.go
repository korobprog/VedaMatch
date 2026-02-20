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
			Value: "",
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
			Key:   "SUPPORT_DOWNLOAD_IOS_URL",
			Value: "",
		},
		{
			Key:   "SUPPORT_DOWNLOAD_ANDROID_URL",
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
			Value: "auto_ru_en",
		},
		{
			Key:   "SUPPORT_APP_ENTRY_ENABLED",
			Value: "false",
		},
		{
			Key:   "SUPPORT_APP_ENTRY_ROLLOUT_PERCENT",
			Value: "10",
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
			Key:   "SUPPORT_AUTO_REPLY_RU",
			Value: "Спасибо! Мы получили обращение и уже работаем над ответом.",
		},
		{
			Key:   "SUPPORT_AUTO_REPLY_EN",
			Value: "Thanks! We received your request and are already working on a response.",
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
