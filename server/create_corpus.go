package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	apiKey := "AIzaSyAe4RDAkcIgPmMi1EA-LDUuqEQIsz7YPCI"
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/corpora?key=%s", apiKey)

	data := map[string]string{
		"display_name": "User Profiles Store",
	}
	jsonData, _ := json.Marshal(data)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Error making request: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Body: %s\n", string(body))
}
