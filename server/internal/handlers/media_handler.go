package handlers

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
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

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
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
			s3Service.DeleteFile(c.UserContext(), key)
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
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file provided",
		})
	}

	mediaType := c.FormValue("type") // 'image', 'audio', 'document'
	recipientIDRaw := strings.TrimSpace(c.FormValue("recipientId"))
	roomIDRaw := strings.TrimSpace(c.FormValue("roomId"))
	duration := c.FormValue("duration") // Audio duration in seconds

	if mediaType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "type is required",
		})
	}

	var recipientID uint
	var roomID uint
	if recipientIDRaw != "" {
		parsedRecipientID, parseErr := parseRequiredPositiveUint(recipientIDRaw)
		if parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid recipientId"})
		}
		recipientID = parsedRecipientID
	}
	if roomIDRaw != "" {
		parsedRoomID, parseErr := parseRequiredPositiveUint(roomIDRaw)
		if parseErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid roomId"})
		}
		roomID = parsedRoomID
	}
	if recipientID == 0 && roomID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "recipientId or roomId is required",
		})
	}
	if recipientID != 0 && roomID != 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "recipientId and roomId are mutually exclusive",
		})
	}

	allowedTypes := map[string][]string{
		"image":    {"image/jpeg", "image/png", "image/gif", "image/webp"},
		"audio":    {"audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/x-wav"},
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

	contentType := normalizeUploadedContentType(mediaType, file.Header.Get("Content-Type"), file.Filename)
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

	var fileURL string
	var uploadErr error
	senderID := strconv.FormatUint(uint64(actorID), 10)

	roomName := ""
	var roomMemberIDs []uint
	if roomID != 0 {
		room, roomErr := loadRoomByID(roomID)
		if roomErr != nil {
			return respondRoomLoadError(c, roomErr)
		}
		if _, accessErr := ensureRoomAccess(room, actorID, true); accessErr != nil {
			return respondRoomAccessError(c, accessErr)
		}
		memberIDs, membersErr := getRoomMemberUserIDs(roomID)
		if membersErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not resolve room members",
			})
		}
		roomMemberIDs = memberIDs
		roomName = room.Name
	}

	s3Service := services.GetS3Service()

	if s3Service != nil {
		fileContent, err := file.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not open file",
			})
		}
		defer fileContent.Close()

		ext := filepath.Ext(file.Filename)
		fileName := fmt.Sprintf("messages/%s/u%s_%d%s", mediaType, senderID, time.Now().Unix(), ext)

		fileURL, uploadErr = s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
		if uploadErr == nil {
			log.Printf("[Media] File uploaded to S3: %s", fileURL)
		} else {
			log.Printf("[Media] S3 upload failed: %v, falling back to local storage", uploadErr)
		}
	}

	if fileURL == "" {
		uploadsDir := "./uploads/media/messages"
		if err := os.MkdirAll(uploadsDir, 0755); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not create upload directory",
			})
		}

		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("u%s_%d%s", senderID, time.Now().Unix(), ext)
		filePath := filepath.Join(uploadsDir, filename)

		if err := c.SaveFile(file, filePath); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Could not save file locally",
			})
		}

		fileURL = "/uploads/media/messages/" + filename
		log.Printf("[Media] File saved locally: %s", fileURL)
	}

	msg := models.Message{
		SenderID: actorID,
		Content:  fileURL,
		Type:     mediaType,
		FileName: file.Filename,
		FileSize: file.Size,
		MimeType: contentType,
	}

	if mediaType == "audio" && duration != "" {
		durationInt, err := strconv.Atoi(duration)
		if err == nil {
			msg.Duration = durationInt
		}
	}

	msg.RecipientID = recipientID
	msg.RoomID = roomID

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save message",
		})
	}

	services.GetMessagePushService().Dispatch(msg, services.MessagePushOptions{
		RoomName:      roomName,
		RoomMemberIDs: roomMemberIDs,
	})

	if h.hub != nil {
		if msg.RoomID != 0 {
			h.hub.Broadcast(msg, roomMemberIDs...)
			if len(roomMemberIDs) > 0 {
				_ = services.GetMetricsService().Increment(services.MetricRoomWSDeliveryTotal, int64(len(roomMemberIDs)))
			}
		} else {
			h.hub.Broadcast(msg)
		}
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

func normalizeUploadedContentType(mediaType, rawContentType, fileName string) string {
	contentType := strings.ToLower(strings.TrimSpace(rawContentType))
	if idx := strings.Index(contentType, ";"); idx != -1 {
		contentType = strings.TrimSpace(contentType[:idx])
	}
	if contentType != "" {
		switch contentType {
		case "audio/x-m4a", "audio/m4a":
			return "audio/mp4"
		case "audio/x-wav":
			return "audio/wav"
		}
		return contentType
	}

	ext := strings.ToLower(filepath.Ext(fileName))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".mp3":
		return "audio/mpeg"
	case ".m4a":
		return "audio/mp4"
	case ".wav":
		return "audio/wav"
	case ".webm":
		return "audio/webm"
	case ".aac":
		return "audio/aac"
	case ".pdf":
		return "application/pdf"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case ".txt":
		return "text/plain"
	}

	if mediaType == "audio" {
		return "audio/mp4"
	}
	return "application/octet-stream"
}
