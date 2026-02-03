package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

func main() {
	// Initialize database connection
	database.Connect()

	email := "korobprog@gmail.com"
	log.Printf("Searching for user with email: %s", email)

	var user models.User
	result := database.DB.Where("email = ?", email).First(&user)

	if result.Error != nil {
		log.Fatalf("User not found: %v", result.Error)
	}

	log.Printf("User found: ID=%d, Role=%s. Updating to admin...", user.ID, user.Role)

	// Update role to admin (or superadmin if you prefer, based on your system)
	// The frontend check looks for 'admin'
	updates := map[string]interface{}{
		"role": "admin",
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		log.Fatalf("Failed to update user role: %v", err)
	}

	log.Printf("Successfully updated user %s to role 'admin'", email)
}
