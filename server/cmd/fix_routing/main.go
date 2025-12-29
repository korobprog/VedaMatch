package main

import (
	"log"

	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Correct DSN based on server config
	dsn := "host=localhost user=raguser password=ragpassword dbname=ragdb port=5435 sslmode=disable"

	// Check if env vars override
	if os.Getenv("DATABASE_URL") != "" {
		dsn = os.Getenv("DATABASE_URL")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Enable Auto-Routing for ALL image models
	log.Println("Enabling Auto-Routing for all Image models...")
	result := db.Exec("UPDATE ai_models SET is_auto_routing_enabled = true, is_enabled = true WHERE category = 'image'")
	if result.Error != nil {
		log.Printf("Error updating image models: %v", result.Error)
	} else {
		log.Printf("Updated %d image models to enabled/auto-routing", result.RowsAffected)
	}

	// Force enable Pollinations specifically to be sure
	db.Exec("UPDATE ai_models SET is_auto_routing_enabled = true, is_enabled = true WHERE provider = 'PollinationsAI'")

	// FORCE ENABLE GEMINI and ensure provider is Google
	log.Println("Enabling Gemini models...")
	db.Exec("UPDATE ai_models SET is_auto_routing_enabled = true, is_enabled = true, provider = 'Google' WHERE model_id LIKE 'gemini%'")

	log.Println("Done!")
}
