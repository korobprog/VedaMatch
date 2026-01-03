package main

import (
	"fmt"
	"log"
	"math"
	"rag-agent-server/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	type UserWithCoords struct {
		ID         uint
		Email      string
		KarmicName string
		City       string
		Country    string
		Latitude   *float64
		Longitude  *float64
	}

	var users []UserWithCoords
	if err := database.DB.Raw(`
		SELECT id, email, karmic_name, city, country, latitude, longitude
		FROM users
		WHERE latitude IS NOT NULL AND longitude IS NOT NULL
		ORDER BY id DESC
	`).Scan(&users).Error; err != nil {
		log.Fatal("Error fetching users:", err)
	}

	moscowLat := 55.7558
	moscowLon := 37.6173

	fmt.Printf("🔍 Testing nearby users search from Moscow (%.4f, %.4f)\n", moscowLat, moscowLon)
	fmt.Println("═════════════════════════════════════════════════════════════")

	nearbyCount := 0
	for _, user := range users {
		if user.Latitude == nil || user.Longitude == nil {
			continue
		}

		distance := calculateDistance(moscowLat, moscowLon, *user.Latitude, *user.Longitude)

		fmt.Printf("%-30s %-15s %-10s ",
			user.Email,
			user.City,
			fmt.Sprintf("%.1f km", distance),
		)

		if distance <= 5000 {
			fmt.Printf("✅ NEARBY")
			nearbyCount++
		} else {
			fmt.Printf("❌ FAR")
		}

		fmt.Println()

		// Show all within 10000km for verification
		if distance <= 10000 {
			fmt.Printf("   Lat: %.4f, Lon: %.4f\n", *user.Latitude, *user.Longitude)
		}
	}

	fmt.Println("═════════════════════════════════════════════════════════════")
	fmt.Printf("📊 Total users with coordinates: %d\n", len(users))
	fmt.Printf("📍 Users within 5000km of Moscow: %d\n", nearbyCount)
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
