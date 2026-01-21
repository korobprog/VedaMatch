package main

import (
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

func main() {
	database.Connect()

	var settings []models.SystemSetting
	database.DB.Where("key LIKE ?", "POLZA%").Find(&settings)

	fmt.Println("=== POLZA Settings in DB ===")
	if len(settings) == 0 {
		fmt.Println("No POLZA settings found!")
	}
	for _, s := range settings {
		value := s.Value
		if s.Key == "POLZA_API_KEY" && len(value) > 10 {
			value = value[:10] + "..." + " (length: " + fmt.Sprint(len(s.Value)) + ")"
		}
		fmt.Printf("%s = %s\n", s.Key, value)
	}
}
