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
	}

	for _, s := range settings {
		var existing models.SystemSetting
		if err := DB.Where("key = ?", s.Key).First(&existing).Error; err != nil {
			DB.Create(&s)
			log.Printf("[Seed] Created system setting: %s", s.Key)
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
