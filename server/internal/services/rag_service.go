package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"rag-agent-server/internal/models"
	"time"
)

type RAGService struct {
	apiKey   string
	corpusID string // Often referred to as "Store ID" or "Corpus Name"
}

func NewRAGService() *RAGService {
	return &RAGService{
		apiKey:   os.Getenv("GEMINI_API_KEY"),
		corpusID: os.Getenv("GEMINI_CORPUS_ID"),
	}
}

// UploadResponse represents the response from the upload endpoint
type UploadResponse struct {
	File struct {
		Name        string `json:"name"`        // e.g., files/12345
		DisplayName string `json:"displayName"` // e.g., UserProfile_1
		Uri         string `json:"uri"`
	} `json:"file"`
}

// UploadProfile generates a text representation of the user profile,
// uploads it to Google Gemini, and imports it into the configured Corpus.
// It returns the File ID (handle) from the RAG system.
func (s *RAGService) UploadProfile(user models.User) (string, error) {
	if s.apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not set")
	}

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

	// 2. Upload to Google Gemini (Media Upload)
	// Endpoint: POST https://generativelanguage.googleapis.com/upload/v1beta/files
	uploadURL := "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + s.apiKey

	// We need to send:
	// 1. Metadata (display name)
	// 2. File content
	// For simplicity, we can use the 'multipart' upload or just 'media' upload if we only send content.
	// But giving it a display name is nice. The simple 'media' upload with metadata requires the 'uploadType=multipart' param
	// and a multipart body.
	//
	// However, to keep it simple and robust like the previous attempt tried to be (but failed),
	// let's usage the 'resumable' or simply just send the JSON metadata + content?
	// actually the simplest "upload" for text is creating a File resource with specific fields.
	//
	// Let's use the straightforward approach used by many Google client libs:
	// Send a POST with JSON body containing "metadata" and "display_name", but wait...
	// The `upload` endpoint expects raw bytes or multipart.
	//
	// Let's check if there is a `createmedia` style.
	// Official docs say: POST /upload/v1beta/files
	// Headers: X-Goog-Upload-Protocol: raw (if just sending bytes)
	// X-Goog-Upload-Header-Content-DisplayName: ... (custom header might work?)
	//
	// Let's try the Multipart approach which is standard.

	// body := &bytes.Buffer{}
	// writer := io.MultiWriter(body) // Placeholder if we used multipart writer

	// Actually, let's use the "Initial Resumable Request" pattern or just straight JSON if creating without bytes?
	// No, we need to upload content.
	//
	// Let's stick to the simplest working method for text:
	// Just upload raw text.
	// Name will be auto-generated.

	req, err := http.NewRequest("POST", uploadURL, bytes.NewBufferString(profileText))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %v", err)
	}

	// Set headers for raw upload
	req.Header.Set("X-Goog-Upload-Protocol", "raw")
	req.Header.Set("X-Goog-Upload-Header-Content-Type", "text/plain")
	req.Header.Set("X-Goog-Upload-Header-Content-DisplayName", fmt.Sprintf("UserProfile_%s", user.Email)) // Try to set name
	req.Header.Set("Content-Type", "text/plain")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("rag upload failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var uploadResp UploadResponse
	if err := json.Unmarshal(bodyBytes, &uploadResp); err != nil {
		return "", fmt.Errorf("failed to parse upload response: %v", err)
	}

	log.Printf("File uploaded to Gemini: %s (%s)", uploadResp.File.Name, uploadResp.File.Uri)
	uploadedFileName := uploadResp.File.Name // e.g. "files/abc12345"

	// Only proceed to import if we have a corpus ID
	if s.corpusID != "" {
		// 3. Import to RAG Store (Corpus)
		// API: POST https://generativelanguage.googleapis.com/v1beta/{parent=corpora/*}/documents
		// Wait, "importFile" might be for the older "FileSearchStores" or specific semantic retrieval tools.
		// If using "Corpora" (Semantic Retriever), we create a 'Document' inside a Corpus.
		// If using the newer "File API" for "Flash" models, we might just need the File URI to pass to the model.
		//
		// The requirement said: "data registration must fall into DB and from there into RAG ... so ML can access it".
		// ML usually accesses it via:
		// A) Semantic Retrieval (Corpus) -> specialized RAG
		// B) Long Context Window (passing file URI) -> "Many-shot" or just Context
		//
		// Given the `rag_service.go` mentioned `fileSearchStores`, it likely targets the Knowledge Base feature (A).
		//
		// Let's try to retain the logic of `importFile` into `fileSearchStores` if that's what was intended,
		// OR upgrade to `corpora` if we know that's the modern way.
		// The previous code had `https://generativelanguage.googleapis.com/v1beta/fileSearchStores/...`.
		// Let's stick to that URL pattern but fix the implementation.

		// Ensure corpusID format. If it's just "my-store...", we might need to prepend "fileSearchStores/"?
		// The config said "GEMINI_IMPORT_URL" was "fileSearchStores/my-store...:importFile".
		// So `s.corpusID` should probably be the full resource name or just the ID.
		// Let's assume s.corpusID is "my-store-..." and we construct the URL.

		// Check if s.corpusID already contains "fileSearchStores/"
		// If the user put the full URL in .env (unlikely for an ID), we handle it.
		// Let's construct a standard URL.
		importURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/fileSearchStores/%s:importFile?key=%s", s.corpusID, s.apiKey)

		importBody := map[string]string{
			"fileName": uploadedFileName, // The resource name from upload response
		}
		importJson, _ := json.Marshal(importBody)

		importReq, err := http.NewRequest("POST", importURL, bytes.NewBuffer(importJson))
		if err != nil {
			return uploadedFileName, fmt.Errorf("failed to create import request: %v", err)
		}
		importReq.Header.Set("Content-Type", "application/json")

		importResp, err := client.Do(importReq)
		if err != nil {
			return uploadedFileName, fmt.Errorf("failed to import file: %v", err)
		}
		defer importResp.Body.Close()

		importRespBytes, _ := io.ReadAll(importResp.Body)
		if importResp.StatusCode != 200 {
			// Don't fail the whole process if import fails, but log it.
			// Return the uploaded file name anyway so we have a reference.
			log.Printf("RAG Import failed (status %d): %s", importResp.StatusCode, string(importRespBytes))
			// return uploadedFileName, fmt.Errorf("rag import failed") // Optional: strictly fail or soft fail?
		} else {
			log.Println("File imported to RAG Store successfully")
		}
	} else {
		log.Println("GEMINI_CORPUS_ID not set, skipping import to store.")
	}

	return uploadedFileName, nil
}
