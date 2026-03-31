package lila

import (
	"context"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

type defaultQuestionSeed struct {
	Question models.LilaQuestion
}

func SeedDefaultCatalog(ctx context.Context, db *gorm.DB) error {
	if db == nil {
		return nil
	}

	now := time.Now()
	defaultQuestions := []models.LilaQuestion{
		{
			Slug:             "krishna-time-devourer",
			Type:             models.LilaQuestionTypeSingleChoice,
			Category:         "shastra_vidya",
			Difficulty:       models.LilaDifficultyTamas,
			Status:           models.LilaQuestionStatusActive,
			AllowedModesJSON: marshalJSON([]models.LilaGameMode{models.LilaGameModeDharmaDuel, models.LilaGameModeSabha, models.LilaGameModeSurvivalSamsara}),
			PromptRu:         "Кто произнес слова: \"Я есть время, великий разрушитель миров\"?",
			PromptEn:         "Who spoke the words: \"I am time, the great destroyer of worlds\"?",
			PromptHi:         "ये शब्द किसने कहे: \"मैं काल हूं, लोकों का महान संहारक\"?",
			OptionsRuJSON:    marshalJSON([]string{"Кришна", "Арджуна", "Бхишма", "Карана"}),
			OptionsEnJSON:    marshalJSON([]string{"Krishna", "Arjuna", "Bhishma", "Karna"}),
			OptionsHiJSON:    marshalJSON([]string{"कृष्ण", "अर्जुन", "भीष्म", "कर्ण"}),
			ExplanationRu:    "Это слова Господа Кришны в Бхагавад-гите.",
			ExplanationEn:    "These are the words of Lord Krishna in the Bhagavad Gita.",
			ExplanationHi:    "यह श्रीकृष्ण के भगवद्गीता के शब्द हैं।",
			CorrectOption:    "Кришна",
			AssetKind:        "none",
			PublishedAt:      &now,
		},
		{
			Slug:             "arjuna-horse-name",
			Type:             models.LilaQuestionTypeSingleChoice,
			Category:         "itihasa_gyaan",
			Difficulty:       models.LilaDifficultyRajas,
			Status:           models.LilaQuestionStatusActive,
			AllowedModesJSON: marshalJSON([]models.LilaGameMode{models.LilaGameModeDharmaDuel, models.LilaGameModeSabha}),
			PromptRu:         "Как звали коня Арджуны?",
			PromptEn:         "What was Arjuna's horse called?",
			PromptHi:         "अर्जुन के घोड़े का नाम क्या था?",
			OptionsRuJSON:    marshalJSON([]string{"Саинья", "Уччайхшрава", "Швета", "Капила"}),
			OptionsEnJSON:    marshalJSON([]string{"Sainya", "Uchchaihshravas", "Shveta", "Kapila"}),
			OptionsHiJSON:    marshalJSON([]string{"सैन्य", "उच्चैःश्रवा", "श्वेत", "कपिल"}),
			ExplanationRu:    "В эпической традиции упоминается конь Швета.",
			ExplanationEn:    "The epic tradition mentions the horse Shveta.",
			ExplanationHi:    "महाकाव्य परंपरा में श्वेत का उल्लेख मिलता है।",
			CorrectOption:    "Швета",
			AssetKind:        "none",
			PublishedAt:      &now,
		},
		{
			Slug:             "ahimsa-meaning",
			Type:             models.LilaQuestionTypeSingleChoice,
			Category:         "sanskrit_challenge",
			Difficulty:       models.LilaDifficultyTamas,
			Status:           models.LilaQuestionStatusActive,
			AllowedModesJSON: marshalJSON([]models.LilaGameMode{models.LilaGameModeDharmaDuel, models.LilaGameModeSabha, models.LilaGameModeSurvivalSamsara}),
			PromptRu:         "Что означает слово «Ахимса»?",
			PromptEn:         "What does the word 'Ahimsa' mean?",
			PromptHi:         "‘अहिंसा’ शब्द का क्या अर्थ है?",
			OptionsRuJSON:    marshalJSON([]string{"Ненасилие", "Милосердие", "Молчание", "Пост"}),
			OptionsEnJSON:    marshalJSON([]string{"Non-violence", "Mercy", "Silence", "Fasting"}),
			OptionsHiJSON:    marshalJSON([]string{"अहिंसा", "करुणा", "मौन", "उपवास"}),
			ExplanationRu:    "Ахимса означает ненасилие.",
			ExplanationEn:    "Ahimsa means non-violence.",
			ExplanationHi:    "अहिंसा का अर्थ है हिंसा का अभाव।",
			CorrectOption:    "Ненасилие",
			AssetKind:        "none",
			PublishedAt:      &now,
		},
	}

	for _, question := range defaultQuestions {
		var existing models.LilaQuestion
		if err := db.WithContext(ctx).Where("slug = ?", question.Slug).First(&existing).Error; err == nil {
			continue
		}
		if err := db.WithContext(ctx).Create(&question).Error; err != nil {
			return err
		}
	}

	defaultStore := []models.LilaStoreItem{
		{
			Code:          "lotus_frame_basic",
			Type:          "cosmetic",
			NameRu:        "Рамка Лотоса",
			NameEn:        "Lotus Frame",
			NameHi:        "कमल फ्रेम",
			DescriptionRu: "Базовая рамка профиля с мотивом лотоса.",
			DescriptionEn: "A basic profile frame with lotus styling.",
			DescriptionHi: "कमल शैली वाली मूल प्रोफ़ाइल फ्रेम।",
			PriceBonus:    50,
			PriceReal:     0,
			CanUseBonus:   true,
			CanUseReal:    false,
			IsFeatured:    true,
			Status:        models.LilaQuestionStatusActive,
		},
		{
			Code:          "sadhana_pass_premium",
			Type:          "pass",
			NameRu:        "Садхана-Пасс",
			NameEn:        "Sadhana Pass",
			NameHi:        "साधना पास",
			DescriptionRu: "Премиальный сезонный пропуск Лила.",
			DescriptionEn: "Premium seasonal pass for Lila.",
			DescriptionHi: "लिला के लिए प्रीमियम सीज़न पास।",
			PriceBonus:    0,
			PriceReal:     299,
			CanUseBonus:   false,
			CanUseReal:    true,
			IsFeatured:    true,
			Status:        models.LilaQuestionStatusActive,
		},
		{
			Code:          "bhakti_premium_monthly",
			Type:          "subscription",
			NameRu:        "Бхакти-Премиум",
			NameEn:        "Bhakti Premium",
			NameHi:        "भक्ति प्रीमियम",
			DescriptionRu: "Ежемесячная подписка с премиум-возможностями и наградами.",
			DescriptionEn: "Monthly subscription with premium features and rewards.",
			DescriptionHi: "प्रीमियम सुविधाओं और पुरस्कारों वाली मासिक सदस्यता।",
			PriceBonus:    0,
			PriceReal:     299,
			CanUseBonus:   false,
			CanUseReal:    true,
			IsFeatured:    true,
			Status:        models.LilaQuestionStatusActive,
		},
		{
			Code:          "guru_shishya_gift_pack",
			Type:          "gift",
			NameRu:        "Пакет Гуру-Шья",
			NameEn:        "Guru-Shishya Gift Pack",
			NameHi:        "गुरु-शिष्य गिफ्ट पैक",
			DescriptionRu: "Подарочный пакет для обмена в комьюнити.",
			DescriptionEn: "Gift bundle for community sharing.",
			DescriptionHi: "समुदाय के साथ साझा करने के लिए उपहार बंडल।",
			PriceBonus:    25,
			PriceReal:     99,
			CanUseBonus:   true,
			CanUseReal:    true,
			IsFeatured:    false,
			Status:        models.LilaQuestionStatusActive,
		},
	}

	for _, item := range defaultStore {
		var existing models.LilaStoreItem
		if err := db.WithContext(ctx).Where("code = ?", item.Code).First(&existing).Error; err == nil {
			continue
		}
		if err := db.WithContext(ctx).Create(&item).Error; err != nil {
			return err
		}
	}

	defaultSeason := models.LilaPassSeason{
		Code:              "sadhana-001",
		NameRu:            "Садхана: Вриндаван",
		NameEn:            "Sadhana: Vrindavan",
		NameHi:            "साधना: वृन्दावन",
		DescriptionRu:     "Первый сезон Лила с наградами за знания и участие.",
		DescriptionEn:     "The first Lila season with rewards for knowledge and participation.",
		DescriptionHi:     "ज्ञान और भागीदारी के लिए पुरस्कारों वाला पहला लिला सीज़न।",
		Status:            models.LilaPassStatusActive,
		StartsAt:          now.AddDate(0, -1, 0),
		EndsAt:            now.AddDate(0, 1, 0),
		PremiumPriceReal:  299,
		DailyBonusJSON:    marshalJSON(map[string]interface{}{"bonusLkm": 10, "questXp": 20}),
		PremiumRewardJSON: marshalJSON(map[string]interface{}{"title": "Защитник Дхармы", "frame": "lotus_gold"}),
	}
	var existingSeason models.LilaPassSeason
	if err := db.WithContext(ctx).Where("code = ?", defaultSeason.Code).First(&existingSeason).Error; err != nil {
		if err := db.WithContext(ctx).Create(&defaultSeason).Error; err != nil {
			return err
		}
	}

	return nil
}
