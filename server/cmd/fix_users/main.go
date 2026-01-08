package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found, assuming env vars are set")
	}

	database.Connect()

	// 1. Enable Dating and Profile Complete for ALL users
	err := database.DB.Model(&models.User{}).Where("1=1").Updates(map[string]interface{}{
		"dating_enabled":      true,
		"is_profile_complete": true,
	}).Error
	if err != nil {
		log.Printf("Error updating flags: %v", err)
	} else {
		log.Println("Successfully enabled dating and profile_complete for all users.")
	}

	// 2. Cluster users into cities so they can see each other with the default filter
	// Cluster 1: Moscow
	moscowEmails := []string{
		"arjuna@test.com", "radha@test.com", "hari@test.com", "partha@test.com", "lila@test.com",
	}
	err = database.DB.Model(&models.User{}).Where("email IN ?", moscowEmails).Updates(map[string]interface{}{
		"city":    "Moscow",
		"country": "Russia",
	}).Error
	if err != nil {
		log.Printf("Error updating Moscow cluster: %v", err)
	}

	// Cluster 2: Vrindavan
	vrindavanEmails := []string{
		"sita@test.com", "yamuna@test.com", "ekalavya@test.com", "satyabhama@test.com", "amrita@test.com",
	}
	err = database.DB.Model(&models.User{}).Where("email IN ?", vrindavanEmails).Updates(map[string]interface{}{
		"city":    "Vrindavan",
		"country": "India",
	}).Error
	if err != nil {
		log.Printf("Error updating Vrindavan cluster: %v", err)
	}

	// Cluster 3: New York (Rest)
	nyEmails := []string{
		"john@test.com", "mirabai@test.com", "ananda@test.com", "jaya@test.com", "jagannath@test.com",
	}
	err = database.DB.Model(&models.User{}).Where("email IN ?", nyEmails).Updates(map[string]interface{}{
		"city":    "New York",
		"country": "USA",
	}).Error
	if err != nil {
		log.Printf("Error updating NY cluster: %v", err)
	}

	log.Println("User clustering completed. You should now see contacts in these cities.")
}
