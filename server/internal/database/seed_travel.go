package database

import (
	"log"
	"rag-agent-server/internal/models"
	"time"
)

// SeedTravel populates the database with demo Yatras and Shelters
func SeedTravel() {
	seedYatras()
	seedShelters()
}

func seedYatras() {
	var count int64
	if err := DB.Model(&models.Yatra{}).Count(&count).Error; err != nil {
		log.Printf("[Seed] Error checking Yatra count: %v", err)
		return
	}

	// if count > 0 {
	// 	return // Data already exists
	// }

	// Get a user to be the organizer
	var organizer models.User
	if err := DB.First(&organizer).Error; err != nil {
		log.Printf("[Seed] No users found to assign as organizer for Yatra")
		return // Cannot seed without user
	}

	now := time.Now()
	startDate1 := now.AddDate(0, 1, 0)       // Next month
	endDate1 := startDate1.AddDate(0, 0, 14) // 2 weeks long

	startDate2 := now.AddDate(0, 2, 0)
	endDate2 := startDate2.AddDate(0, 0, 10)

	lat1, lng1 := 27.5650, 77.5947 // Vrindavan
	lat2, lng2 := 23.4181, 88.3846 // Mayapur

	yatras := []models.Yatra{
		{
			OrganizerID:     organizer.ID,
			Title:           "Vrindavan Parikrama 2026",
			Description:     "Join us for an unforgettable spiritual journey through the holy land of Vrindavan. We will visit Govardhan, Radha Kunda, and major temples.",
			Theme:           models.YatraThemeVrindavan,
			StartDate:       startDate1,
			EndDate:         endDate1,
			StartCity:       "Vrindavan",
			StartLatitude:   &lat1,
			StartLongitude:  &lng1,
			EndCity:         "Vrindavan",
			EndLatitude:     &lat1,
			EndLongitude:    &lng1,
			MaxParticipants: 30,
			MinParticipants: 10,
			Requirements:    "Chanting beads, comfortable walking shoes.",
			CostEstimate:    "Approx $500 including accommodation and prasadam.",
			Accommodation:   "Guesthouses near ISKCON temple.",
			Transportation:  "Bus for local travel.",
			Language:        "English, Russian",
			Status:          models.YatraStatusOpen,
			RoutePoints:     `[{"name":"Krishna Balaram Mandir","description":"Meeting point"},{"name":"Govardhan Hill","description":"Parikrama start"},{"name":"Radha Kunda","description":"Sacred lake"}]`,
			CoverImageURL:   "/uploads/travel/vrindavan_parikrama.jpg",
		},
		{
			OrganizerID:     organizer.ID,
			Title:           "Mayapur Gaura Purnima Festival",
			Description:     "Celebrate Gaura Purnima in the holy dham of Mayapur. Kirtans, lectures, and parikrama.",
			Theme:           models.YatraThemeMayapur,
			StartDate:       startDate2,
			EndDate:         endDate2,
			StartCity:       "Kolkata",
			StartLatitude:   nil,
			StartLongitude:  nil,
			EndCity:         "Mayapur",
			EndLatitude:     &lat2,
			EndLongitude:    &lng2,
			MaxParticipants: 50,
			MinParticipants: 15,
			Requirements:    "Valid visa for India.",
			CostEstimate:    "Donation based.",
			Accommodation:   "Ashram dormitory.",
			Transportation:  "Train from Kolkata.",
			Language:        "English",
			Status:          models.YatraStatusOpen,
			RoutePoints:     `[{"name":"Kolkata Airport","description":"Arrival"},{"name":"Mayapur Chandrodaya Mandir","description":"Main festival"}]`,
			CoverImageURL:   "/uploads/travel/mayapur_festival.jpg",
		},
	}

	for _, y := range yatras {
		var existing models.Yatra
		if err := DB.Where("title = ?", y.Title).First(&existing).Error; err == nil {
			// Update existing
			existing.CoverImageURL = y.CoverImageURL
			existing.RoutePoints = y.RoutePoints
			DB.Save(&existing)
			log.Printf("[Seed] Updated Yatra Image: %s", y.Title)
		} else {
			if err := DB.Create(&y).Error; err != nil {
				log.Printf("[Seed] Error creating yatra %s: %v", y.Title, err)
			} else {
				log.Printf("[Seed] Created Yatra: %s", y.Title)
			}
		}
	}
}

func seedShelters() {
	var count int64
	if err := DB.Model(&models.Shelter{}).Count(&count).Error; err != nil {
		log.Printf("[Seed] Error checking Shelter count: %v", err)
		return
	}

	// if count > 0 {
	// 	return // Data already exists
	// }

	// Get a user to be the host
	var host models.User
	if err := DB.First(&host).Error; err != nil {
		log.Printf("[Seed] No users found to assign as host for Shelter")
		return // Cannot seed without user
	}

	lat1, lng1 := 27.5680, 77.5960 // Near ISKCON Vrindavan

	shelters := []models.Shelter{
		{
			HostID:         host.ID,
			Title:          "Krishna Balaram Guesthouse",
			Description:    "Peaceful guesthouse located just 2 minutes walking distance from ISKCON Krishna Balaram Temple. Clean rooms with attached bathroom.",
			Type:           models.ShelterTypeGuestHouse,
			City:           "Vrindavan",
			Country:        "India",
			Address:        "Raman Reti, Vrindavan, Mathura",
			Latitude:       &lat1,
			Longitude:      &lng1,
			NearTemple:     "ISKCON Vrindavan",
			Capacity:       20,
			Rooms:          10,
			PricePerNight:  "1200 INR",
			MinStay:        2,
			Amenities:      `["wifi", "ac", "hot_water", "prasadam"]`,
			VegetarianOnly: true,
			NoSmoking:      true,
			NoAlcohol:      true,
			HouseRules:     "Chanting is encouraged. Gates close at 9:30 PM.",
			WhatsApp:       "+919876543210",
			Status:         models.ShelterStatusActive,
			Rating:         4.8,
			ReviewsCount:   15,
			SevaExchange:   false,
			Photos:         `["/uploads/travel/guest_house_room_v2.jpg"]`,
		},
		{
			HostID:          host.ID,
			Title:           "Seva Ashram",
			Description:     "Simple ashram living for sincere seekers. We offer free accommodation in exchange for 4 hours of daily service in the garden or kitchen.",
			Type:            models.ShelterTypeAshram,
			City:            "Mayapur",
			Country:         "India",
			Address:         "Gauranga Nagar, Mayapur",
			NearTemple:      "Yogapith",
			Capacity:        5,
			Rooms:           2,
			PricePerNight:   "Free (Seva)",
			MinStay:         7,
			Amenities:       `["kitchen", "laundry"]`,
			VegetarianOnly:  true,
			NoSmoking:       true,
			NoAlcohol:       true,
			HouseRules:      "Morning program attendance required.",
			WhatsApp:        "+919988776655",
			Status:          models.ShelterStatusActive,
			Rating:          5.0,
			ReviewsCount:    8,
			SevaExchange:    true,
			SevaDescription: "Gardening, cleaning, or kitchen help required for 4 hours daily.",
			Photos:          `["/uploads/travel/ashram_living.jpg"]`,
		},
	}

	for _, s := range shelters {
		var existing models.Shelter
		if err := DB.Where("title = ?", s.Title).First(&existing).Error; err == nil {
			// Update existing
			existing.Photos = s.Photos
			DB.Save(&existing)
			log.Printf("[Seed] Updated Shelter Images: %s", s.Title)
		} else {
			if err := DB.Create(&s).Error; err != nil {
				log.Printf("[Seed] Error creating shelter %s: %v", s.Title, err)
			} else {
				log.Printf("[Seed] Created Shelter: %s", s.Title)
			}
		}
	}
}
