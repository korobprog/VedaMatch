package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"

	"github.com/joho/godotenv"
)

// Use existing S3 images from your bucket or public URLs that work
var demoPhotoURLs = []string{
	"https://s3.twcstorage.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/ads/u2_1767866363.jpg", // Existing uploaded image
	"https://s3.twcstorage.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/ads/u2_1767866363.jpg",
	"https://s3.twcstorage.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/ads/u2_1767866363.jpg",
	"https://s3.twcstorage.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/ads/u2_1767866363.jpg",
	"https://s3.twcstorage.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/ads/u2_1767866363.jpg",
}

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	// 1. Get some users to act as authors
	var users []models.User
	database.DB.Limit(5).Find(&users)

	if len(users) == 0 {
		log.Fatal("No users found to seed ads. Please run seed_users first.")
	}

	// 2. Define demo ads with S3 URLs
	price1 := 5000.0
	price2 := 1500.0
	price3 := 0.0

	ads := []struct {
		ad       models.Ad
		photoURL string
	}{
		{
			ad: models.Ad{
				UserID:      users[0].ID,
				AdType:      models.AdTypeOffering,
				Category:    models.AdCategoryYogaWellness,
				Title:       "Hatha Yoga Classes in Vrindavan",
				Description: "Join our daily hatha yoga sessions in the heart of Vrindavan. Suitable for all levels. We focus on breathing, alignment, and spiritual connection.",
				Price:       &price1,
				Currency:    "INR",
				City:        "Vrindavan",
				Status:      models.AdStatusActive,
				ExpiresAt:   time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
				ShowProfile: true,
			},
			photoURL: demoPhotoURLs[0],
		},
		{
			ad: models.Ad{
				UserID:      users[1%len(users)].ID,
				AdType:      models.AdTypeLooking,
				Category:    models.AdCategoryAyurveda,
				Title:       "Looking for Ayurvedic Doctor",
				Description: "I am looking for an experienced Ayurvedic practitioner for a personal consultation regarding digestive issues. Prefer someone with knowledge of traditional pulse diagnosis.",
				Price:       &price2,
				Currency:    "RUB",
				City:        "Moscow",
				Status:      models.AdStatusActive,
				ExpiresAt:   time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
				ShowProfile: true,
			},
			photoURL: demoPhotoURLs[1],
		},
		{
			ad: models.Ad{
				UserID:      users[2%len(users)].ID,
				AdType:      models.AdTypeOffering,
				Category:    models.AdCategorySpiritual,
				Title:       "Free Bhagavad Gita Distribution",
				Description: "We are distributing free copies of Bhagavad Gita As It Is. If you want to dive into spiritual knowledge, please contact us. Pickup from the temple.",
				Price:       &price3,
				IsFree:      true,
				Currency:    "USD",
				City:        "Los Angeles",
				Status:      models.AdStatusActive,
				ExpiresAt:   time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
				ShowProfile: true,
			},
			photoURL: demoPhotoURLs[2],
		},
		{
			ad: models.Ad{
				UserID:      users[3%len(users)].ID,
				AdType:      models.AdTypeOffering,
				Category:    models.AdCategoryGoods,
				Title:       "Premium Sandalwood Mala",
				Description: "Hand-crafted premium sandalwood mala for meditation. 108 beads, high quality, wonderful scent. Imported from India.",
				Price:       &price2,
				Currency:    "EUR",
				City:        "Berlin",
				Status:      models.AdStatusActive,
				ExpiresAt:   time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
				ShowProfile: true,
			},
			photoURL: demoPhotoURLs[3],
		},
		{
			ad: models.Ad{
				UserID:       users[4%len(users)].ID,
				AdType:       models.AdTypeLooking,
				Category:     models.AdCategoryHousing,
				Title:        "Looking for a room in Mayapur",
				Description:  "I will be visiting Mayapur for the festival season and I'm looking for a clean, quiet room near the temple complex for 2 weeks.",
				IsNegotiable: true,
				City:         "Mayapur",
				Status:       models.AdStatusActive,
				ExpiresAt:    time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
				ShowProfile:  true,
			},
			photoURL: demoPhotoURLs[4],
		},
	}

	// 3. Delete old demo ads and create new ones with S3 photos
	for _, item := range ads {
		ad := item.ad

		// Delete existing ad and its photos
		var existingAd models.Ad
		if err := database.DB.Where("title = ?", ad.Title).First(&existingAd).Error; err == nil {
			database.DB.Where("ad_id = ?", existingAd.ID).Delete(&models.AdPhoto{})
			database.DB.Delete(&existingAd)
			log.Printf("[Seed] Deleted existing ad: %s", ad.Title)
		}

		// Create new ad
		if err := database.DB.Create(&ad).Error; err != nil {
			log.Printf("[Seed] Failed to create ad '%s': %v", ad.Title, err)
			continue
		}

		// Add photo
		if item.photoURL != "" {
			photo := models.AdPhoto{
				AdID:     ad.ID,
				PhotoURL: item.photoURL,
				Position: 0,
			}
			database.DB.Create(&photo)
			log.Printf("[Seed] Created ad with photo: %s", ad.Title)
		} else {
			log.Printf("[Seed] Created ad without photo: %s", ad.Title)
		}
	}

	log.Println("[Seed] Ads seeding completed!")
}
