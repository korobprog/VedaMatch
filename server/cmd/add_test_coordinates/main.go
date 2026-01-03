package main

import (
	"log"
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	// Координаты для городов (широта, долгота)
	cityCoordinates := map[string][2]float64{
		"Moscow":      {55.7558, 37.6173},
		"Vrindavan":   {27.5650, 77.7000},
		"Los Angeles": {34.0522, -118.2437},
		"Madrid":      {40.4168, -3.7038},
		"Tokyo":       {35.6762, 139.6503},
		"Krakow":      {50.0647, 19.9450},
		"Berlin":      {52.5200, 13.4050},
		"Rome":        {41.9028, 12.4964},
		"Toronto":     {43.6532, -79.3832},
		"Kyiv":        {50.4501, 30.5234},
	}

	var users []models.User
	if err := database.DB.Where("city != ''").Find(&users).Error; err != nil {
		log.Fatal("Error fetching users:", err)
	}

	updatedCount := 0
	for _, user := range users {
		if coords, exists := cityCoordinates[user.City]; exists {
			user.Latitude = &coords[0]
			user.Longitude = &coords[1]

			if err := database.DB.Save(&user).Error; err != nil {
				log.Printf("Error updating user %s: %v", user.Email, err)
				continue
			}

			log.Printf("✅ Updated %s: %s (%.4f, %.4f)", user.Email, user.City, coords[0], coords[1])
			updatedCount++
		} else {
			log.Printf("⚠️  No coordinates for %s, city: %s", user.Email, user.City)
		}
	}

	log.Printf("\n📊 Summary: Updated %d users with coordinates", updatedCount)

	// Тест поиска поблизости
	log.Println("\n🔍 Testing nearby users search from Moscow...")
	moscowLat := 55.7558
	moscowLon := 37.6173

	type UserWithDistance struct {
		models.User
		Distance float64 `json:"distance"`
	}

	var nearbyUsers []UserWithDistance
	for _, user := range users {
		if user.Latitude == nil || user.Longitude == nil {
			continue
		}

		distance := calculateDistance(moscowLat, moscowLon, *user.Latitude, *user.Longitude)
		if distance <= 5000 { // 5000 km radius
			nearbyUsers = append(nearbyUsers, UserWithDistance{
				User:     user,
				Distance: distance,
			})
		}
	}

	log.Printf("Found %d users within 5000km of Moscow:", len(nearbyUsers))
	for _, u := range nearbyUsers {
		log.Printf("  - %s (%s): %.1f km away", u.SpiritualName, u.City, u.Distance)
	}
}

func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers

	dLat := deg2rad(lat2 - lat1)
	dLon := deg2rad(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(deg2rad(lat1))*math.Cos(deg2rad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

func deg2rad(deg float64) float64 {
	return deg * (math.Pi / 180)
}
