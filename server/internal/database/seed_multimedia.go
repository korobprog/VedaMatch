package database

import (
	"log"
	"rag-agent-server/internal/models"
)

func SeedMultimedia() {
	log.Println("[Seed] Seeding Multimedia Hub data...")

	// Seed Categories
	categories := []models.MediaCategory{
		{Name: "Bhajans", Slug: "bhajans", Type: "bhajan", Description: "Devotional songs", IsActive: true, SortOrder: 1},
		{Name: "Lectures", Slug: "lectures", Type: "lecture", Description: "Spiritual lectures", IsActive: true, SortOrder: 2},
		{Name: "Kirtans", Slug: "kirtans", Type: "kirtan", Description: "Group chanting", IsActive: true, SortOrder: 3},
		{Name: "Films", Slug: "films", Type: "film", Description: "Spiritual films", IsActive: true, SortOrder: 4},
	}
	for _, c := range categories {
		var existing models.MediaCategory
		if DB.Where("slug = ?", c.Slug).First(&existing).Error != nil {
			DB.Create(&c)
		}
	}

	// Seed Radio Stations
	radioStations := []models.RadioStation{
		{
			Name:        "Mayapur 24/7",
			Description: "Live kirtan from Mayapur",
			StreamURL:   "https://radiomayapur.radioca.st/stream/",
			LogoURL:     "https://radiomayapur.com/logo.png",
			Madh:        "iskcon",
			StreamType:  "external",
			IsLive:      true,
			IsActive:    true,
			SortOrder:   1,
		},
		{
			Name:        "ISKCON Desire Tree",
			Description: "24/7 spiritual radio",
			StreamURL:   "https://cast5.asurahosting.com/proxy/harekrsn/stream",
			LogoURL:     "https://iskcondesiretree.com/logo.png",
			Madh:        "iskcon",
			StreamType:  "external",
			IsLive:      true,
			IsActive:    true,
			SortOrder:   2,
		},
	}
	for _, r := range radioStations {
		var existing models.RadioStation
		if DB.Where("name = ?", r.Name).First(&existing).Error != nil {
			DB.Create(&r)
		}
	}

	// Seed TV Channels
	tvChannels := []models.TVChannel{
		{
			Name:        "Mayapur TV",
			Description: "Live from Sri Dham Mayapur",
			StreamURL:   "https://www.youtube.com/embed/live_stream?channel=UCypj9Vvizo4cCERfDFIG3zw",
			StreamType:  "youtube",
			Madh:        "iskcon",
			IsLive:      true,
			IsActive:    true,
			SortOrder:   1,
		},
	}
	for _, t := range tvChannels {
		var existing models.TVChannel
		if DB.Where("name = ?", t.Name).First(&existing).Error != nil {
			DB.Create(&t)
		}
	}

	log.Println("[Seed] Multimedia Hub seeding complete")
}
