package main

import (
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	database.Connect()

	var users []models.User
	database.DB.Find(&users)

	fmt.Printf("Total users: %d\n", len(users))
	for _, u := range users {
		fmt.Printf("ID: %d, Name: %s, Dating: %v, Avatar: %s\n", u.ID, u.SpiritualName, u.DatingEnabled, u.AvatarURL)
	}
}
