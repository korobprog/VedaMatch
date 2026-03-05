package handlers

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"rag-agent-server/internal/config"
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

type MessageMediaPresignRequest struct {
	Type        string `json:"type"`
	RecipientID uint   `json:"recipientId"`
	RoomID      uint   `json:"roomId"`
	FileName    string `json:"fileName"`
	MimeType    string `json:"mimeType"`
	FileSize    int64  `json:"fileSize"`
	DurationSec int    `json:"durationSec"`
}

type MessageMediaFinalizeRequest struct {
	Type        string                 `json:"type"`
	RecipientID uint                   `json:"recipientId"`
	RoomID      uint                   `json:"roomId"`
	Content     string                 `json:"content"`
	FileName    string                 `json:"fileName"`
	FileSize    int64                  `json:"fileSize"`
	MimeType    string                 `json:"mimeType"`
	Duration    int                    `json:"duration"`
	Thumbnail   string                 `json:"thumbnail"`
	MapData     map[string]interface{} `json:"mapData"`
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

// PresignMessageMedia returns a presigned PUT URL for chat media upload (video_circle only).
func (h *MediaHandler) PresignMessageMedia(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !config.ChatVideoCircleEnabled() || !config.ChatVideoCirclePresignEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint disabled"})
	}

	var req MessageMediaPresignRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Type = strings.TrimSpace(strings.ToLower(req.Type))
	if req.Type != "video_circle" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only type=video_circle is supported"})
	}

	roomName, roomMemberIDs, err := h.resolveMessageTarget(actorID, req.RecipientID, req.RoomID)
	if err != nil {
		return err
	}
	_ = roomName
	_ = roomMemberIDs

	if req.DurationSec <= 0 || req.DurationSec > 60 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "durationSec must be between 1 and 60"})
	}
	if req.FileSize <= 0 || req.FileSize > 64*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "fileSize exceeds 64MB limit"})
	}

	mimeType := strings.TrimSpace(strings.ToLower(req.MimeType))
	if !isAllowedVideoCircleMimeType(mimeType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid mimeType for video_circle"})
	}

	if !services.IsMessageMediaCDNReady() {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "CDN is not configured for chat media",
			"code":  "CDN_NOT_CONFIGURED",
		})
	}

	s3Service := services.GetS3Service()
	if s3Service == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "S3 is not configured",
			"code":  "S3_NOT_CONFIGURED",
		})
	}

	ext := inferVideoCircleExtension(req.FileName, mimeType)
	objectKey := fmt.Sprintf("messages/video_circle/u%d_%d%s", actorID, time.Now().UnixNano(), ext)
	uploadURL, presignErr := s3Service.GeneratePresignedPutURL(
		c.UserContext(),
		objectKey,
		mimeType,
		req.FileSize,
		15*time.Minute,
	)
	if presignErr != nil {
		log.Printf("[MessageMedia] presign_failed actor=%d key=%s error=%v", actorID, objectKey, presignErr)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate upload URL"})
	}

	cdnBaseURL, _ := services.MessageMediaCDNConfig()
	finalURL := cdnBaseURL + "/" + objectKey

	return c.JSON(fiber.Map{
		"uploadUrl":     uploadURL,
		"finalUrl":      finalURL,
		"objectKey":     objectKey,
		"expiresInSec":  900,
		"requiredHeaders": fiber.Map{
			"Content-Type": mimeType,
		},
	})
}

// FinalizeMessageMedia creates a message after a successful direct upload.
func (h *MediaHandler) FinalizeMessageMedia(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	if !config.ChatVideoCircleEnabled() {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint disabled"})
	}

	var req MessageMediaFinalizeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Type = strings.TrimSpace(strings.ToLower(req.Type))
	if req.Type != "video_circle" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only type=video_circle is supported"})
	}

	roomName, roomMemberIDs, targetErr := h.resolveMessageTarget(actorID, req.RecipientID, req.RoomID)
	if targetErr != nil {
		return targetErr
	}

	if req.Duration <= 0 || req.Duration > 60 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "duration must be between 1 and 60"})
	}
	if req.FileSize <= 0 || req.FileSize > 64*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "fileSize exceeds 64MB limit"})
	}

	mimeType := strings.TrimSpace(strings.ToLower(req.MimeType))
	if !isAllowedVideoCircleMimeType(mimeType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid mimeType for video_circle"})
	}

	normalizedContent, err := services.NormalizeChatVideoCircleMediaURL(req.Content)
	if err != nil {
		status := fiber.StatusBadRequest
		if err == services.ErrMessageMediaCDNNotConfigured {
			status = fiber.StatusServiceUnavailable
		}
		return c.Status(status).JSON(fiber.Map{
			"error": "Invalid media URL",
			"code":  "MEDIA_URL_NOT_ALLOWED",
		})
	}

	thumbnail := strings.TrimSpace(req.Thumbnail)
	if thumbnail != "" {
		normalizedThumb, thumbErr := services.NormalizeChatVideoCircleMediaURL(thumbnail)
		if thumbErr != nil {
			thumbnail = ""
		} else {
			thumbnail = normalizedThumb
		}
	}

	msg := models.Message{
		SenderID:    actorID,
		RecipientID: req.RecipientID,
		RoomID:      req.RoomID,
		Content:     normalizedContent,
		Type:        req.Type,
		FileName:    strings.TrimSpace(req.FileName),
		FileSize:    req.FileSize,
		MimeType:    mimeType,
		Duration:    req.Duration,
		Thumbnail:   thumbnail,
		MapData:     req.MapData,
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save message"})
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

func (h *MediaHandler) resolveMessageTarget(actorID uint, recipientID uint, roomID uint) (string, []uint, error) {
	if recipientID == 0 && roomID == 0 {
		return "", nil, fiber.NewError(fiber.StatusBadRequest, "recipientId or roomId is required")
	}
	if recipientID != 0 && roomID != 0 {
		return "", nil, fiber.NewError(fiber.StatusBadRequest, "recipientId and roomId are mutually exclusive")
	}

	if roomID == 0 {
		return "", nil, nil
	}

	room, roomErr := loadRoomByID(roomID)
	if roomErr != nil {
		if errors.Is(roomErr, errRoomNotFound) {
			return "", nil, fiber.NewError(fiber.StatusNotFound, "Room not found")
		}
		return "", nil, fiber.NewError(fiber.StatusInternalServerError, "Could not load room")
	}

	if _, accessErr := ensureRoomAccess(room, actorID, true); accessErr != nil {
		switch {
		case errors.Is(accessErr, errRoomForbidden):
			return "", nil, fiber.NewError(fiber.StatusForbidden, "Forbidden")
		default:
			return "", nil, fiber.NewError(fiber.StatusInternalServerError, "Could not validate room access")
		}
	}

	roomMemberIDs, membersErr := getRoomMemberUserIDs(roomID)
	if membersErr != nil {
		return "", nil, fiber.NewError(fiber.StatusInternalServerError, "Could not resolve room members")
	}

	return room.Name, roomMemberIDs, nil
}

func isAllowedVideoCircleMimeType(mimeType string) bool {
	switch strings.TrimSpace(strings.ToLower(mimeType)) {
	case "video/mp4", "video/quicktime", "video/webm", "video/x-m4v":
		return true
	default:
		return false
	}
}

func inferVideoCircleExtension(fileName string, mimeType string) string {
	ext := strings.ToLower(strings.TrimSpace(filepath.Ext(fileName)))
	switch ext {
	case ".mp4", ".mov", ".webm", ".m4v":
		return ext
	}

	switch strings.TrimSpace(strings.ToLower(mimeType)) {
	case "video/quicktime":
		return ".mov"
	case "video/webm":
		return ".webm"
	case "video/x-m4v":
		return ".m4v"
	default:
		return ".mp4"
	}
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
