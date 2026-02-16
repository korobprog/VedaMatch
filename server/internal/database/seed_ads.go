package database

import (
	"log"
	"rag-agent-server/internal/models"
	"time"
)

// SeedDemoAds creates demo ads for testing from existing users
func SeedDemoAds() {
	var count int64
	DB.Model(&models.Ad{}).Count(&count)
	if count > 0 {
		log.Printf("[Seed] Ads already exist (%d), skipping demo seed", count)
		return
	}

	// 1. Get some users to act as authors
	// We'll try to find users seeded by seed_users cmd
	var users []models.User
	DB.Limit(5).Find(&users)

	if len(users) < 3 {
		log.Println("[Seed] Not enough users to seed ads. Please run seed_users first.")
		return
	}

	// Define some demo ads
	price1 := 5000.0
	price2 := 15000.0

	demoAds := []models.Ad{
		{
			UserID:       users[0].ID,
			AdType:       models.AdTypeOffering,
			Category:     models.AdCategorySpiritual,
			Title:        "Srimad Bhagavatam - Complete Set (18 Volumes)",
			Description:  "A beautiful complete set of Srimad Bhagavatam by A.C. Bhaktivedanta Swami Prabhupada. Brand new, high quality printing.",
			Price:        &price1,
			Currency:     "RUB",
			IsNegotiable: true,
			IsFree:       false,
			City:         "Moscow",
			District:     "Center",
			Status:       models.AdStatusActive,
			ExpiresAt:    time.Now().AddDate(0, 0, 30).Format(time.RFC3339),
			Photos: []models.AdPhoto{
				{PhotoURL: "https://vedamatch.ru/uploads/travel/mayapur_temple.jpg", Position: 0},
			},
		},
		{
			UserID:       users[1].ID,
			AdType:       models.AdTypeLooking,
			Category:     models.AdCategoryHousing,
			Title:        "Looking for a room near the Temple",
			Description:  "I am looking for a clean, quiet room to rent for 3 months. Prefer single occupancy and close to vegetarian food outlets.",
			Price:        &price2,
			Currency:     "RUB",
			IsNegotiable: true,
			IsFree:       false,
			City:         "Saint Petersburg",
			District:     "Vasileostrovsky",
			Status:       models.AdStatusActive,
			ExpiresAt:    time.Now().AddDate(0, 0, 30).Format(time.RFC3339),
			Photos: []models.AdPhoto{
				{PhotoURL: "https://vedamatch.ru/uploads/travel/guest_house_room.jpg", Position: 0},
			},
		},
		{
			UserID:      users[2].ID,
			AdType:      models.AdTypeOffering,
			Category:    models.AdCategoryGoods,
			Title:       "Professional Yoga Mat (Purple)",
			Description: "Eco-friendly professional yoga mat, used only twice. Giving away for free to someone who will use it for daily practice.",
			IsFree:      true,
			City:        "Sochi",
			District:    "Adler",
			Status:      models.AdStatusActive,
			ExpiresAt:   time.Now().AddDate(0, 0, 30).Format(time.RFC3339),
			Photos: []models.AdPhoto{
				{PhotoURL: "https://vedamatch.ru/uploads/travel/room.jpg", Position: 0},
			},
		},
		{
			UserID:       users[0].ID,
			AdType:       models.AdTypeOffering,
			Category:     models.AdCategoryServices,
			Title:        "Ayurvedic Marma Therapy Consultation",
			Description:  "Personalized Ayurvedic consultation including pulse diagnosis and Marma therapy session. Helps with stress and digestive issues.",
			Price:        nil,
			Currency:     "RUB",
			IsNegotiable: true,
			IsFree:       false,
			City:         "Yekaterinburg",
			District:     "Center",
			Status:       models.AdStatusActive,
			ExpiresAt:    time.Now().AddDate(0, 0, 30).Format(time.RFC3339),
		},
	}

	for _, ad := range demoAds {
		if err := DB.Create(&ad).Error; err != nil {
			log.Printf("[Seed] Failed to create demo ad '%s': %v", ad.Title, err)
		} else {
			log.Printf("[Seed] Created demo ad: %s", ad.Title)
		}
	}

	log.Printf("[Seed] Seeded %d demo ads", len(demoAds))
}
