package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"rag-agent-server/internal/websocket"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type MediaHandler struct {
	hub *websocket.Hub
}

func NewMediaHandler(hub *websocket.Hub) *MediaHandler {
	return &MediaHandler{hub: hub}
}

func (h *MediaHandler) UploadPhoto(c *fiber.Ctx) error {
	userID := c.Params("userId")

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No photo provided",
		})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			ext := filepath.Ext(file.Filename)
			fileName := fmt.Sprintf("media/u%s_%d%s", userID, time.Now().Unix(), ext)
			contentType := file.Header.Get("Content-Type")

			imageURL, err := s3Service.UploadFile(c.Context(), fileContent, fileName, contentType)
			if err == nil {
				media := models.Media{
					UserID:    uint(parseUint(userID)),
					URL:       imageURL,
					IsProfile: false,
				}
				if err := database.DB.Create(&media).Error; err == nil {
					return c.JSON(media)
				}
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := "./uploads/media"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("u%s_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/media/" + filename
	media := models.Media{
		UserID:    uint(parseUint(userID)),
		URL:       imageURL,
		IsProfile: false,
	}

	if err := database.DB.Create(&media).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save media to database",
		})
	}

	return c.JSON(media)
}

func (h *MediaHandler) ListPhotos(c *fiber.Ctx) error {
	userID := c.Params("userId")
	var media []models.Media
	if err := database.DB.Where("user_id = ?", userID).Find(&media).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch media",
		})
	}

	return c.JSON(media)
}

func (h *MediaHandler) DeletePhoto(c *fiber.Ctx) error {
	mediaID := c.Params("id")
	var media models.Media
	if err := database.DB.First(&media, mediaID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Photo not found",
		})
	}

	// 1. Remove from S3 if needed
	s3Service := services.GetS3Service()
	if s3Service != nil && strings.HasPrefix(media.URL, "http") {
		// Extract key from URL
		// Example: https://bucket.s3.endpoint.com/media/u1_123.jpg
		// Key: media/u1_123.jpg
		publicURL := os.Getenv("S3_PUBLIC_URL")
		if strings.HasPrefix(media.URL, publicURL) {
			key := strings.TrimPrefix(media.URL, publicURL+"/")
			s3Service.DeleteFile(c.Context(), key)
		}
	}

	// 2. Remove from disk if it's a local file
	if strings.HasPrefix(media.URL, "/uploads") {
		_ = os.Remove("." + media.URL)
	}

	// 3. Remove from DB
	if err := database.DB.Delete(&media).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not delete from database",
		})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *MediaHandler) SetProfilePhoto(c *fiber.Ctx) error {
	mediaID := c.Params("id")
	var media models.Media
	if err := database.DB.First(&media, mediaID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Photo not found",
		})
	}

	// Reset all photos for this user
	database.DB.Model(&models.Media{}).Where("user_id = ?", media.UserID).Update("is_profile", false)

	// Set this one as profile
	media.IsProfile = true
	database.DB.Save(&media)

	// Update User table as well (for convenience)
	database.DB.Model(&models.User{}).Where("id = ?", media.UserID).Update("avatar_url", media.URL)

	return c.JSON(media)
}

func parseUint(s string) uint {
	var n uint
	fmt.Sscanf(s, "%d", &n)
	return n
}

// UploadMessageMedia uploads a media file (image, audio, document) and creates a message
func (h *MediaHandler) UploadMessageMedia(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file provided",
		})
	}

	mediaType := c.FormValue("type") // 'image', 'audio', 'document'
	senderID := c.FormValue("senderId")
	recipientID := c.FormValue("recipientId")
	roomID := c.FormValue("roomId")

	if mediaType == "" || senderID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "type and senderId are required",
		})
	}

	allowedTypes := map[string][]string{
		"image":    {"image/jpeg", "image/png", "image/gif", "image/webp"},
		"audio":    {"audio/mpeg", "audio/mp4", "audio/wav", "audio/webm"},
		"document": {"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"},
	}

	maxSize := map[string]int64{
		"image":    10 * 1024 * 1024,
		"audio":    5 * 1024 * 1024,
		"document": 20 * 1024 * 1024,
	}

	mimeTypes, ok := allowedTypes[mediaType]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid media type",
		})
	}

	contentType := file.Header.Get("Content-Type")
	if !contains(mimeTypes, contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid file type %s for media type %s", contentType, mediaType),
		})
	}

	maxBytes := maxSize[mediaType]
	if file.Size > maxBytes {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("File size exceeds limit of %d MB", maxBytes/(1024*1024)),
		})
	}

	s3Service := services.GetS3Service()
	if s3Service == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "S3 service not initialized",
		})
	}

	fileContent, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not open file",
		})
	}
	defer fileContent.Close()

	ext := filepath.Ext(file.Filename)
	fileName := fmt.Sprintf("messages/%s/u%s_%d%s", mediaType, senderID, time.Now().Unix(), ext)

	fileURL, err := s3Service.UploadFile(c.Context(), fileContent, fileName, contentType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Could not upload file to S3: %v", err),
		})
	}

	msg := models.Message{
		SenderID: parseUint(senderID),
		Content:  fileURL,
		Type:     mediaType,
		FileName: file.Filename,
		FileSize: file.Size,
		MimeType: contentType,
	}

	if recipientID != "" {
		msg.RecipientID = parseUint(recipientID)
	}
	if roomID != "" {
		roomIDUint, _ := strconv.ParseUint(roomID, 10, 32)
		msg.RoomID = uint(roomIDUint)
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save message",
		})
	}

	if h.hub != nil {
		h.hub.Broadcast(msg)
	}

	return c.JSON(msg)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
