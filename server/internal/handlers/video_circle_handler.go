package handlers

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type VideoCircleHandler struct {
	service VideoCircleService
}

type VideoCircleService interface {
	ListCircles(userID uint, role string, params models.VideoCircleListParams) (*models.VideoCircleListResponse, error)
	CreateCircle(userID uint, role string, req models.VideoCircleCreateRequest) (*models.VideoCircleResponse, error)
	ListMyCircles(userID uint, page, limit int) (*models.VideoCircleListResponse, error)
	DeleteCircle(circleID, userID uint, role string) error
	UpdateCircle(circleID, userID uint, role string, req models.VideoCircleUpdateRequest) (*models.VideoCircleResponse, error)
	RepublishCircle(circleID, userID uint, role string, req models.VideoCircleRepublishRequest) (*models.VideoCircleResponse, error)
	AddInteraction(circleID, userID uint, req models.VideoCircleInteractionRequest) (*models.VideoCircleInteractionResponse, error)
	ApplyBoost(circleID, userID uint, role string, req models.VideoBoostRequest) (*models.VideoBoostResponse, error)
	ListTariffs() ([]models.VideoTariff, error)
	CreateTariff(req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error)
	UpdateTariff(id uint, req models.VideoTariffUpsertRequest, updatedBy uint) (*models.VideoTariff, error)
}

func NewVideoCircleHandler() *VideoCircleHandler {
	return &VideoCircleHandler{service: services.NewVideoCircleService()}
}

func NewVideoCircleHandlerWithService(service VideoCircleService) *VideoCircleHandler {
	return &VideoCircleHandler{service: service}
}

func (h *VideoCircleHandler) GetVideoCircles(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	params := models.VideoCircleListParams{
		City:      strings.TrimSpace(c.Query("city")),
		Matha:     normalizeMathaParam(c),
		Category:  strings.TrimSpace(c.Query("category")),
		Status:    strings.TrimSpace(c.Query("status")),
		Scope:     strings.TrimSpace(c.Query("scope")),
		RoleScope: parseRoleScopeParam(c),
		Sort:      strings.TrimSpace(c.Query("sort")),
		Page:      c.QueryInt("page", 1),
		Limit:     c.QueryInt("limit", 20),
	}

	result, err := h.service.ListCircles(userID, middleware.GetUserRole(c), params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

func (h *VideoCircleHandler) CreateVideoCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.VideoCircleCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	result, err := h.service.CreateCircle(userID, middleware.GetUserRole(c), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(result)
}

func (h *VideoCircleHandler) UploadAndCreateVideoCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	videoFile, err := c.FormFile("video")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Video file is required"})
	}
	if videoFile.Size > 250*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Video size exceeds 250MB"})
	}
	videoContentType := strings.ToLower(strings.TrimSpace(videoFile.Header.Get("Content-Type")))
	if !strings.HasPrefix(videoContentType, "video/") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid video content type"})
	}

	mediaURL, err := saveUploadedCircleFile(c, videoFile, "video")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	thumbnailURL := ""
	thumbFile, thumbErr := c.FormFile("thumbnail")
	if thumbErr == nil && thumbFile != nil {
		thumbContentType := strings.ToLower(strings.TrimSpace(thumbFile.Header.Get("Content-Type")))
		if !strings.HasPrefix(thumbContentType, "image/") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid thumbnail content type"})
		}
		thumbnailURL, err = saveUploadedCircleFile(c, thumbFile, "thumbnail")
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	} else {
		if generated, genErr := tryGenerateCircleThumbnail(mediaURL); genErr == nil && generated != "" {
			thumbnailURL = generated
		}
	}

	durationSec := 60
	if durationSecParam := c.FormValue("durationSec"); durationSecParam != "" {
		if parsed, parseErr := strconv.Atoi(durationSecParam); parseErr == nil {
			durationSec = parsed
		}
	}

	var expiresAt *time.Time
	if expiresAtRaw := strings.TrimSpace(c.FormValue("expiresAt")); expiresAtRaw != "" {
		if parsed, parseErr := time.Parse(time.RFC3339, expiresAtRaw); parseErr == nil {
			expiresAt = &parsed
		}
	}

	req := models.VideoCircleCreateRequest{
		MediaURL:     mediaURL,
		ThumbnailURL: thumbnailURL,
		City:         strings.TrimSpace(c.FormValue("city")),
		Matha:        strings.TrimSpace(c.FormValue("matha")),
		Category:     strings.TrimSpace(c.FormValue("category")),
		DurationSec:  durationSec,
		ExpiresAt:    expiresAt,
	}

	result, err := h.service.CreateCircle(userID, middleware.GetUserRole(c), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(result)
}

func (h *VideoCircleHandler) GetMyVideoCircles(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	result, err := h.service.ListMyCircles(userID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

func (h *VideoCircleHandler) DeleteVideoCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	if err := h.service.DeleteCircle(uint(circleID64), userID, middleware.GetUserRole(c)); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *VideoCircleHandler) UpdateVideoCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	var req models.VideoCircleUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.service.UpdateCircle(uint(circleID64), userID, middleware.GetUserRole(c), req)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) RepublishVideoCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	var req models.VideoCircleRepublishRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.service.RepublishCircle(uint(circleID64), userID, middleware.GetUserRole(c), req)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) AddInteraction(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	var req models.VideoCircleInteractionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.service.AddInteraction(uint(circleID64), userID, req)
	if err != nil {
		if errors.Is(err, services.ErrCircleExpired) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Circle expired",
				"code":  "CIRCLE_EXPIRED",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) AddInteractionLegacy(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.VideoCircleInteractionLegacyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.CircleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "circleId is required"})
	}

	resp, err := h.service.AddInteraction(req.CircleID, userID, models.VideoCircleInteractionRequest{
		Type:   req.Type,
		Action: req.Action,
	})
	if err != nil {
		if errors.Is(err, services.ErrCircleExpired) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Circle expired",
				"code":  "CIRCLE_EXPIRED",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) BoostCircle(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	circleID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid circle id"})
	}

	var req models.VideoBoostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.service.ApplyBoost(uint(circleID64), userID, middleware.GetUserRole(c), req)
	if err != nil {
		if errors.Is(err, services.ErrCircleExpired) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Circle expired",
				"code":  "CIRCLE_EXPIRED",
			})
		}
		if errors.Is(err, services.ErrInsufficientLKM) {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error": "Недостаточно LKM",
				"code":  "INSUFFICIENT_LKM",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

func (h *VideoCircleHandler) GetTariffs(c *fiber.Ctx) error {
	tariffs, err := h.service.ListTariffs()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"tariffs": tariffs})
}

func (h *VideoCircleHandler) CreateTariff(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var req models.VideoTariffUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item, err := h.service.CreateTariff(req, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *VideoCircleHandler) UpdateTariff(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	id64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid tariff id"})
	}

	var req models.VideoTariffUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item, err := h.service.UpdateTariff(uint(id64), req, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(item)
}

func normalizeMathaParam(c *fiber.Ctx) string {
	matha := strings.TrimSpace(c.Query("matha"))
	if matha != "" {
		return matha
	}
	matha = strings.TrimSpace(c.Query("madh"))
	if matha != "" {
		return matha
	}
	return strings.TrimSpace(c.Query("math"))
}

func parseRoleScopeParam(c *fiber.Ctx) []string {
	raw := strings.TrimSpace(c.Query("role_scope"))
	if raw == "" {
		return nil
	}

	allowed := map[string]struct{}{
		models.RoleUser:       {},
		models.RoleInGoodness: {},
		models.RoleYogi:       {},
		models.RoleDevotee:    {},
	}

	parts := strings.Split(raw, ",")
	seen := make(map[string]struct{}, len(parts))
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		role := strings.ToLower(strings.TrimSpace(part))
		if role == "" {
			continue
		}
		if _, ok := allowed[role]; !ok {
			continue
		}
		if _, exists := seen[role]; exists {
			continue
		}
		seen[role] = struct{}{}
		result = append(result, role)
	}

	return result
}

func saveUploadedCircleFile(c *fiber.Ctx, fileHeader *multipart.FileHeader, fileKind string) (string, error) {
	s3Service := services.GetS3Service()
	if s3Service != nil {
		reader, err := fileHeader.Open()
		if err != nil {
			return "", err
		}
		defer reader.Close()

		ext := filepath.Ext(fileHeader.Filename)
		key := fmt.Sprintf("video-circles/%s/%d_%d%s", fileKind, time.Now().Unix(), time.Now().UnixNano(), ext)
		contentType := fileHeader.Header.Get("Content-Type")
		url, err := s3Service.UploadFile(c.UserContext(), reader, key, contentType, fileHeader.Size)
		if err == nil {
			return url, nil
		}
	}

	localDir := "./uploads/video-circles/" + fileKind
	if err := os.MkdirAll(localDir, 0755); err != nil {
		return "", err
	}

	ext := filepath.Ext(fileHeader.Filename)
	filename := fmt.Sprintf("%d_%d%s", time.Now().Unix(), time.Now().UnixNano(), ext)
	localPath := filepath.Join(localDir, filename)
	if err := c.SaveFile(fileHeader, localPath); err != nil {
		return "", err
	}

	return strings.TrimPrefix(localPath, "."), nil
}

func tryGenerateCircleThumbnail(mediaURL string) (string, error) {
	localPath := strings.TrimSpace(mediaURL)
	if !strings.HasPrefix(localPath, "/uploads/") {
		return "", errors.New("thumbnail generation skipped for non-local media")
	}

	inputPath := "." + localPath
	outputDir := "./uploads/video-circles/thumbnail"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", err
	}
	outputPath := filepath.Join(outputDir, fmt.Sprintf("thumb_%d.jpg", time.Now().UnixNano()))

	thumbnailService := services.NewThumbnailService()
	if err := thumbnailService.GenerateThumbnail(inputPath, outputPath, services.DefaultThumbnailConfig()); err != nil {
		return "", err
	}

	s3Service := services.GetS3Service()
	if s3Service != nil {
		key := fmt.Sprintf("video-circles/thumbnail/thumb_%d.jpg", time.Now().UnixNano())
		if url, err := thumbnailService.GenerateAndUploadThumbnail(context.Background(), inputPath, key); err == nil {
			_ = os.Remove(outputPath)
			return url, nil
		}
	}

	return strings.TrimPrefix(outputPath, "."), nil
}
