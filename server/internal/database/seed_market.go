package database

import (
	"log"
	"rag-agent-server/internal/models"
)

// SeedMarket creates demo shops and products
func SeedMarket() {
	var count int64
	DB.Model(&models.Shop{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("[Seed] Seeding Sattva Market...")

	// 1. Find a user to be shop owner
	var user models.User
	if err := DB.First(&user).Error; err != nil {
		log.Println("[Seed] No users found, skipping market seed")
		return
	}

	// 2. Create Shops
	shops := []models.Shop{
		{
			OwnerID:     user.ID,
			Name:        "Ведическая Лавка",
			Slug:        "vedic-lavka",
			Description: "Лучшие благовония и аюрведа из Индии",
			Category:    "ayurveda",
			City:        "Москва",
			Address:     "ул. Тверская, 12",
			Rating:      4.8,
			Status:      "active",
		},
		{
			OwnerID:     user.ID,
			Name:        "Книжный Мир Мудрости",
			Slug:        "wisdom-books",
			Description: "Священные тексты и современная литература",
			Category:    "books",
			City:        "Санкт-Петербург",
			Address:     "Лиговский пр., 10",
			Rating:      5.0,
			Status:      "active",
		},
	}

	for i := range shops {
		DB.Create(&shops[i])
	}

	// 3. Create Products
	products := []models.Product{
		{
			ShopID:           shops[0].ID,
			Name:             "Благовония 'Наг Чампа'",
			Slug:             "nag-champa-incense",
			ShortDescription: "Классические индийские благовония с ароматом плюмерии и сандала",
			Category:         "incense",
			BasePrice:        250,
			Currency:         "RUB",
			Stock:            100,
			Status:           "active",
			Rating:           4.9,
			ReviewsCount:     12,
		},
		{
			ShopID:           shops[0].ID,
			Name:             "Масло Брахми (100мл)",
			Slug:             "brahmi-oil-100",
			ShortDescription: "Аюрведическое масло для улучшения памяти и концентрации",
			Category:         "ayurveda",
			BasePrice:        650,
			Currency:         "RUB",
			Stock:            45,
			Status:           "active",
			Rating:           4.7,
			ReviewsCount:     8,
		},
		{
			ShopID:           shops[1].ID,
			Name:             "Бхагавад-гита",
			Slug:             "bhagavad-gita-as-it-is",
			ShortDescription: "Полное издание с комментариями Шрилы Прабхупады",
			Category:         "books",
			BasePrice:        900,
			Currency:         "RUB",
			Stock:            150,
			Status:           "active",
			Rating:           5.0,
			ReviewsCount:     150,
		},
	}

	for i := range products {
		DB.Create(&products[i])
	}

	log.Printf("[Seed] Seeded %d shops and %d products", len(shops), len(products))
}
