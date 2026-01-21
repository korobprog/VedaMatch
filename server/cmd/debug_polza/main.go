package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"time"
)

func main() {
	// 1. Connect to DB to get key
	database.Connect()
	var setting models.SystemSetting
	if err := database.DB.Where("key = ?", "POLZA_API_KEY").First(&setting).Error; err != nil {
		fmt.Printf("ERROR: Could not find POLZA_API_KEY in DB: %v\n", err)
		return
	}
	apiKey := setting.Value
	fmt.Printf("Found API Key: %s... (len: %d)\n", apiKey[:5], len(apiKey))

	// 2. Prepare Request
	baseURL := "https://api.polza.ai/api/v1/chat/completions"
	model := "deepseek/deepseek-r1"

	requestBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": "Hello, are you working?"},
		},
	}
	jsonBody, _ := json.Marshal(requestBody)

	req, _ := http.NewRequest("POST", baseURL, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	fmt.Printf("Sending POST to %s\n", baseURL)
	fmt.Printf("Model: %s\n", model)

	// 3. Execute
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("FATAL: Request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// 4. Read Response
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("\n--- RESPONSE HEADERS ---\n")
	fmt.Printf("Status: %s\n", resp.Status)

	fmt.Printf("\n--- RESPONSE BODY ---\n")
	fmt.Println(string(body))
}
