package database

import (
	"log"
	"rag-agent-server/internal/models"
	"time"
)

// SeedMapTestData seeds test data for the map feature
func SeedMapTestData() {
	log.Println("[Seed] Checking map test data...")

	// 1. Prepare Users (always ensures they have coordinates)
	testUsers := []models.User{
		{KarmicName: "Андрей Тестов", SpiritualName: "Адитья Дас", Email: "aditya.test@vedamatch.ru", Country: "Россия", City: "Москва", Latitude: floatPtr(55.7558), Longitude: floatPtr(37.6173), Identity: "devotee", DatingEnabled: true},
		{KarmicName: "Мария Иванова", SpiritualName: "Малати Деви Даси", Email: "malati.test@vedamatch.ru", Country: "Россия", City: "Санкт-Петербург", Latitude: floatPtr(59.9343), Longitude: floatPtr(30.3351), Identity: "devotee", DatingEnabled: true},
		{KarmicName: "Дмитрий Петров", SpiritualName: "Дханешвара Дас", Email: "dhaneshvara.test@vedamatch.ru", Country: "Россия", City: "Екатеринбург", Latitude: floatPtr(56.8389), Longitude: floatPtr(60.6057), Identity: "yoga_teacher"},
		{KarmicName: "Елена Сидорова", SpiritualName: "Экатерина Деви Даси", Email: "ekaterina.test@vedamatch.ru", Country: "Россия", City: "Новосибирск", Latitude: floatPtr(55.0084), Longitude: floatPtr(82.9357), Identity: "devotee", DatingEnabled: true},
		{KarmicName: "Сергей Козлов", SpiritualName: "Шьямасундара Дас", Email: "shyam.test@vedamatch.ru", Country: "Россия", City: "Казань", Latitude: floatPtr(55.7961), Longitude: floatPtr(49.1064), Identity: "yoga_teacher"},
	}

	createdUserIDs := make([]uint, 0)
	for _, u := range testUsers {
		var existing models.User
		if err := DB.Where("email = ?", u.Email).First(&existing).Error; err == nil {
			// Update existing user with coordinates if they don't have them
			if existing.Latitude == nil || existing.Longitude == nil {
				existing.Latitude = u.Latitude
				existing.Longitude = u.Longitude
				DB.Save(&existing)
				log.Printf("[Seed] Updated test user coordinates: %s", u.SpiritualName)
			}
			createdUserIDs = append(createdUserIDs, existing.ID)
		} else {
			// Create new user
			if err := DB.Create(&u).Error; err != nil {
				log.Printf("[Seed] Error creating user %s: %v", u.Email, err)
			} else {
				createdUserIDs = append(createdUserIDs, u.ID)
				log.Printf("[Seed] Created test user: %s", u.SpiritualName)
			}
		}
	}

	if len(createdUserIDs) == 0 {
		log.Println("[Seed] CRITICAL: No users available for seeding shops/ads")
		return
	}

	// 2. Prepare Shops
	testShops := []models.Shop{
		{OwnerID: createdUserIDs[0], Name: "Вриндаван Store (Тест)", Slug: "vrindavan-store-test", Category: models.ShopCategoryAyurveda, City: "Москва", Latitude: floatPtr(55.7612), Longitude: floatPtr(37.6140), Status: models.ShopStatusActive},
		{OwnerID: createdUserIDs[0], Name: "Govinda's Kitchen (Тест)", Slug: "govindas-kitchen-test", Category: models.ShopCategoryFood, City: "Санкт-Петербург", Latitude: floatPtr(59.9305), Longitude: floatPtr(30.3438), Status: models.ShopStatusActive},
		{OwnerID: createdUserIDs[0], Name: "Мантра Shop (Тест)", Slug: "mantra-shop-test", Category: models.ShopCategoryMusicalInstr, City: "Екатеринбург", Latitude: floatPtr(56.8356), Longitude: floatPtr(60.6128), Status: models.ShopStatusActive},
	}

	for i, shop := range testShops {
		// Use different owners if available
		if i < len(createdUserIDs) {
			shop.OwnerID = createdUserIDs[i]
		}

		var existing models.Shop
		if err := DB.Where("slug = ?", shop.Slug).First(&existing).Error; err != nil {
			if err := DB.Create(&shop).Error; err != nil {
				log.Printf("[Seed] Error creating shop %s: %v", shop.Name, err)
			} else {
				log.Printf("[Seed] Created test shop: %s", shop.Name)
			}
		}
	}

	// 3. Prepare Ads
	testAds := []models.Ad{
		{UserID: createdUserIDs[0], AdType: models.AdTypeOffering, Category: models.AdCategorySpiritual, Title: "Йога в Москве (Тест)", City: "Москва", Latitude: floatPtr(55.7489), Longitude: floatPtr(37.6208), Status: models.AdStatusActive, ExpiresAt: time.Now().AddDate(0, 1, 0).Format(time.RFC3339)},
		{UserID: createdUserIDs[0], AdType: models.AdTypeLooking, Category: models.AdCategoryHousing, Title: "Ищу соседа (Тест)", City: "Санкт-Петербург", Latitude: floatPtr(59.9661), Longitude: floatPtr(30.3108), Status: models.AdStatusActive, ExpiresAt: time.Now().AddDate(0, 1, 0).Format(time.RFC3339)},
	}

	for i, ad := range testAds {
		// Use different users if available
		if i < len(createdUserIDs) {
			ad.UserID = createdUserIDs[i]
		}

		var existing models.Ad
		if err := DB.Where("title = ? AND user_id = ?", ad.Title, ad.UserID).First(&existing).Error; err != nil {
			if err := DB.Create(&ad).Error; err != nil {
				log.Printf("[Seed] Error creating ad %s: %v", ad.Title, err)
			} else {
				log.Printf("[Seed] Created test ad: %s", ad.Title)
			}
		}
	}

	log.Println("[Seed] Map test data process finished")
}

func floatPtr(f float64) *float64 {
	return &f
}
