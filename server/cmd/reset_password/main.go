package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Initialize database connection
	database.Connect()

	email := "korobprog@gmail.com"
	newPassword := "password"

	log.Printf("Resetting password for user: %s", email)

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Update user password
	result := database.DB.Model(&models.User{}).Where("email = ?", email).Update("password", string(hashedPassword))
	if result.Error != nil {
		log.Fatalf("Failed to update password: %v", result.Error)
	}

	if result.RowsAffected == 0 {
		log.Fatalf("User not found with email: %s", email)
	}

	log.Printf("Password successfully reset for %s. New password: %s", email, newPassword)
}
