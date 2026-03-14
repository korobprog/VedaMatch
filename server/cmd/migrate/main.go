package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

func main() {
	log.Println("Running database migrations...")

	// Auto migrate all models
	err := database.DB.AutoMigrate(
		&models.User{},
		&models.Friend{},
		&models.FriendRequest{},
		&models.BlockedUser{},
		&models.Media{},
		&models.Message{},
		&models.Room{},
		&models.AuthSession{},
		&models.UserDeviceToken{},
	)
	if err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Migrations completed successfully!")
}
