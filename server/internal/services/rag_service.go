package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"rag-agent-server/internal/models"
	"time"
)

// TODO: Move these to environment variables
const (
	GeminiAPIKey    = "AIzaSyC2ObRpfHRwbA00PTZPS6WdZ8tYHW2KFqE"
	GeminiUploadURL = "https://generativelanguage.googleapis.com/upload/v1beta/files"
	// Ensure this store ID is correct or make it dynamic
	GeminiImportURL = "https://generativelanguage.googleapis.com/v1beta/fileSearchStores/my-store-tva5a8g0mgj3:importFile"
)

type RAGService struct{}

type UploadResponse struct {
	File struct {
		Name        string `json:"name"`
		DisplayName string `json:"displayName"`
		Uri         string `json:"uri"`
	} `json:"file"`
}

func (s *RAGService) UploadProfile(user models.User) error {
	// 1. Format Profile Data
	profileText := fmt.Sprintf(`Профиль пользователя:
Имя (кармическое): %s
Духовное имя: %s
Email: %s
Пол: %s
Страна: %s
Город: %s
Дата рождения: %s
Идентичность: %s
Диета: %s
Традиция (мадх): %s
Наставник: %s`,
		user.KarmicName, user.SpiritualName, user.Email, user.Gender, user.Country,
		user.City, user.Dob, user.Identity, user.Diet, user.Madh, user.Mentor)

	// 2. Upload to Google Gemini (Upload File)
	// Note: The example uses 'upload/v1beta/files' with raw body.
	// For simplicity, we assume text/plain.

	req, err := http.NewRequest("POST", GeminiUploadURL+"?key="+GeminiAPIKey, bytes.NewBufferString(profileText))
	if err != nil {
		return fmt.Errorf("failed to create upload request: %v", err)
	}
	req.Header.Set("Content-Type", "text/plain") // Or application/json if using 'multipart' but the example used raw text?
	// The n8n example: Content-Type: raw, rawContentType: text/plain.
	// BUT n8n "Upload Profile to RAG" node (httpRequest) sends body: "={{ $json.profileData }}" which is verifyable string.
	// So it is a simple POST with body.
	// Wait, the n8n node 130 (Upload Profile to RAG) has "url": ".../upload/v1beta/files"
	// but the body is JUST the text content? Usually upload API requires metadata?
	// Let's assume standard "media" upload or "resumable" upload.
	// The URL `.../upload/v1beta/files` suggests the media upload endpoint.
	// However, usually you need to provide metadata JSON AND the file content.
	// In the n8n node:
	// "contentType": "raw", "rawContentType": "text/plain".
	// This usually works for simple uploads if the API supports it.
	// Documentation says: POST https://generativelanguage.googleapis.com/upload/v1beta/files
	// Headers: X-Goog-Upload-Protocol: multipart (or resumable).
	// If n8n works with just raw body, maybe it's doing something smart or using a simplified endpoint?
	// Actually, the n8n node configuration `type: n8n-nodes-base.httpRequest` suggests it just sends the request as configured.
	// Let's try sending as raw text.

	// Also need to add X-Goog-Upload-Protocol? The n8n node doesn't seem to set it implicitly, maybe default is fine.
	// BUT, standard Google Upload API usually maps the body to the file content if Content-Type is set.
	// Let's add a display name metadata if possible? The n8n node DOES NOT send metadata.
	// It just sends the text.
	// Let's try to mimic that.

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upload file: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return fmt.Errorf("rag upload failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var uploadResp UploadResponse
	if err := json.Unmarshal(bodyBytes, &uploadResp); err != nil {
		return fmt.Errorf("failed to parse upload response: %v", err)
	}

	log.Printf("File uploaded to Gemini: %s (%s)", uploadResp.File.Name, uploadResp.File.Uri)

	// 3. Import to RAG Store
	// Endpoint: .../fileSearchStores/...:importFile
	// Body: { "fileName": "files/..." } (Wait, `file.name` from upload response is usually `files/...`)

	importBody := map[string]string{
		"fileName": uploadResp.File.Name, // This should be "files/ID"
	}
	importJson, _ := json.Marshal(importBody)

	importReq, err := http.NewRequest("POST", GeminiImportURL+"?key="+GeminiAPIKey, bytes.NewBuffer(importJson))
	if err != nil {
		return fmt.Errorf("failed to create import request: %v", err)
	}
	importReq.Header.Set("Content-Type", "application/json")

	importResp, err := client.Do(importReq)
	if err != nil {
		return fmt.Errorf("failed to import file: %v", err)
	}
	defer importResp.Body.Close()

	importRespBytes, _ := ioutil.ReadAll(importResp.Body)
	if importResp.StatusCode != 200 {
		return fmt.Errorf("rag import failed with status %d: %s", importResp.StatusCode, string(importRespBytes))
	}

	log.Println("File imported to RAG Store successfully")
	return nil
}
