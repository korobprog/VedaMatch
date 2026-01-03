package main

import (
	"log"
	"rag-agent-server/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found")
	}

	database.Connect()

	// Add latitude and longitude columns to users table
	err := database.DB.Exec(`
		ALTER TABLE users
		ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
		ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)
	`).Error

	if err != nil {
		log.Printf("Error adding columns: %v", err)
		return
	}

	log.Println("Migration completed: Added latitude and longitude columns to users table")
}
