package handlers

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CafeHandler handles cafe-related HTTP requests
type CafeHandler struct {
	cafeService  *services.CafeService
	dishService  *services.DishService
	orderService *services.CafeOrderService
}

const maxCafePhotoUploadSize = 10 * 1024 * 1024 // 10MB

func clampQueryInt(c *fiber.Ctx, key string, def int, min int, max int) int {
	value := c.QueryInt(key, def)
	if value < min {
		return min
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

func parseCafeBoolQuery(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func isAllowedCafeImageContentType(contentType string) bool {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	return strings.HasPrefix(contentType, "image/")
}

func isValidDishType(dishType models.DishType) bool {
	switch dishType {
	case models.DishTypeFood, models.DishTypeDrink, models.DishTypeDessert, models.DishTypeSnack, models.DishTypeCombo:
		return true
	default:
		return false
	}
}

func safeImageExtension(filename string) string {
	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(filepath.Base(filename))))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif":
		return ext
	default:
		return ".jpg"
	}
}

func isCafeNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return true
	}
	return strings.Contains(strings.ToLower(err.Error()), "not found")
}

func isBonusPercentValidationError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(strings.ToLower(err.Error()), "maxbonuslkmpercent")
}

func requireCafeUserID(c *fiber.Ctx) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	return userID, nil
}

// NewCafeHandler creates a new cafe handler instance
func NewCafeHandler() *CafeHandler {
	mapService := services.NewMapService(database.DB)
	cafeService := services.NewCafeService(database.DB, mapService)
	dishService := services.NewDishService(database.DB)
	orderService := services.NewCafeOrderService(database.DB, dishService)

	return &CafeHandler{
		cafeService:  cafeService,
		dishService:  dishService,
		orderService: orderService,
	}
}

// ===== Cafe CRUD =====

// CreateCafe creates a new cafe
// POST /api/cafes
func (h *CafeHandler) UploadCafePhoto(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No photo provided",
		})
	}
	contentType := file.Header.Get("Content-Type")
	if !isAllowedCafeImageContentType(contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Only image uploads are allowed",
		})
	}
	if file.Size <= 0 || file.Size > maxCafePhotoUploadSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Image must be between 1 byte and 10MB",
		})
	}
	ext := safeImageExtension(file.Filename)
	opened, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Could not open upload",
		})
	}
	sniffBuf := make([]byte, 512)
	readN, readErr := opened.Read(sniffBuf)
	_ = opened.Close()
	if readErr != nil && !errors.Is(readErr, io.EOF) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Could not read upload",
		})
	}
	if readN > 0 {
		contentType = http.DetectContentType(sniffBuf[:readN])
	}
	if !isAllowedCafeImageContentType(contentType) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Only image uploads are allowed",
		})
	}

	// 1. Try S3 Storage
	s3Service := services.GetS3Service()
	if s3Service != nil {
		fileContent, err := file.Open()
		if err == nil {
			defer fileContent.Close()
			fileName := fmt.Sprintf("cafes/u%d_%d%s", userID, time.Now().UnixNano(), ext)

			imageURL, err := s3Service.UploadFile(c.UserContext(), fileContent, fileName, contentType, file.Size)
			if err == nil {
				return c.JSON(fiber.Map{
					"url": imageURL,
				})
			}
		}
	}

	// 2. Fallback to Local Storage
	uploadsDir := "./uploads/cafes"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create upload directory",
		})
	}

	filename := fmt.Sprintf("cafe_u%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not save photo",
		})
	}

	imageURL := "/uploads/cafes/" + filename
	return c.JSON(fiber.Map{
		"url": imageURL,
	})
}

func (h *CafeHandler) CreateCafe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}
	userRole := middleware.GetUserRole(c)

	var req models.CafeCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	cafe, err := h.cafeService.CreateCafe(userID, userRole, req)
	if err != nil {
		log.Printf("[CafeHandler] Error creating cafe: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create cafe"})
	}

	return c.Status(fiber.StatusCreated).JSON(cafe)
}

// GetMyCafe returns the cafe owned by the current user
// GET /api/cafes/my
func (h *CafeHandler) GetMyCafe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	cafe, err := h.cafeService.GetMyCafe(userID)
	if err != nil {
		if !isCafeNotFoundError(err) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get cafe", "hasCafe": false})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cafe not found", "hasCafe": false})
	}

	return c.JSON(fiber.Map{
		"cafe":    cafe,
		"hasCafe": true,
	})
}

// GetCafe returns a cafe by ID
// GET /api/cafes/:id
func (h *CafeHandler) GetCafe(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	cafe, err := h.cafeService.GetCafe(uint(cafeID))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get cafe"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cafe not found"})
	}
	h.cafeService.IncrementViews(uint(cafeID))

	return c.JSON(cafe)
}

// GetCafeBySlug returns a cafe by slug
// GET /api/cafes/slug/:slug
func (h *CafeHandler) GetCafeBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")

	cafe, err := h.cafeService.GetCafeBySlug(slug)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get cafe"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cafe not found"})
	}

	h.cafeService.IncrementViews(cafe.ID)
	return c.JSON(cafe)
}

// ListCafes returns a list of cafes
// GET /api/cafes
func (h *CafeHandler) ListCafes(c *fiber.Ctx) error {
	filters := models.CafeFilters{
		City:   strings.TrimSpace(c.Query("city")),
		Search: strings.TrimSpace(c.Query("search")),
		Sort:   strings.TrimSpace(c.Query("sort")),
		Page:   clampQueryInt(c, "page", 1, 1, 100000),
		Limit:  clampQueryInt(c, "limit", 20, 1, 100),
	}

	if status := strings.ToLower(strings.TrimSpace(c.Query("status"))); status != "" {
		filters.Status = models.CafeStatus(status)
	}
	if c.Query("min_rating") != "" {
		if rating, err := strconv.ParseFloat(c.Query("min_rating"), 64); err == nil {
			filters.MinRating = &rating
		}
	}
	if parseCafeBoolQuery(c.Query("has_delivery")) {
		hasDelivery := true
		filters.HasDelivery = &hasDelivery
	}
	if raw := strings.TrimSpace(c.Query("isVedaMatch")); raw != "" {
		if parsed, err := strconv.ParseBool(raw); err == nil {
			filters.IsVedaMatch = &parsed
		}
	}
	cafes, err := h.cafeService.ListCafes(filters)
	if err != nil {
		log.Printf("[CafeHandler] Error listing cafes: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list cafes"})
	}

	return c.JSON(cafes)
}

// UpdateCafe updates a cafe
// PUT /api/cafes/:id
func (h *CafeHandler) UpdateCafe(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	// Check ownership
	if !h.cafeService.IsCafeOwner(uint(cafeID), userID) {
		isStaff, role := h.cafeService.IsStaff(uint(cafeID), userID)
		if !isStaff || role != models.CafeStaffRoleAdmin {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
		}
	}

	var req models.CafeUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	cafe, err := h.cafeService.UpdateCafe(uint(cafeID), req)
	if err != nil {
		log.Printf("[CafeHandler] Error updating cafe: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update cafe"})
	}

	return c.JSON(cafe)
}

// DeleteCafe deletes a cafe
// DELETE /api/cafes/:id
func (h *CafeHandler) DeleteCafe(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	// Check ownership only
	if !h.cafeService.IsCafeOwner(uint(cafeID), userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only owner can delete cafe"})
	}

	if err := h.cafeService.DeleteCafe(uint(cafeID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete cafe"})
	}

	return c.JSON(fiber.Map{"message": "Cafe deleted"})
}

// ===== Tables =====

// CreateTable creates a new table
// POST /api/cafes/:id/tables
func (h *CafeHandler) CreateTable(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	// Check staff access
	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req models.CafeTableCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	table, err := h.cafeService.CreateTable(uint(cafeID), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create table"})
	}

	return c.Status(fiber.StatusCreated).JSON(table)
}

// GetTables returns all tables for a cafe
// GET /api/cafes/:id/tables
func (h *CafeHandler) GetTables(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	tables, err := h.cafeService.GetTables(uint(cafeID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get tables"})
	}

	return c.JSON(tables)
}

// UpdateTable updates a table
// PUT /api/cafes/:id/tables/:tableId
func (h *CafeHandler) UpdateTable(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	tableID, err := strconv.ParseUint(c.Params("tableId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid table ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.tableBelongsToCafe(uint(cafeID), uint(tableID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify table"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Table not found"})
	}

	var req models.CafeTableUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	table, err := h.cafeService.UpdateTable(uint(tableID), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update table"})
	}

	return c.JSON(table)
}

// UpdateFloorLayout updates multiple table positions
// PUT /api/cafes/:id/floor-layout
func (h *CafeHandler) UpdateFloorLayout(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req models.CafeFloorLayoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.cafeService.UpdateFloorLayout(uint(cafeID), req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update layout"})
	}

	return c.JSON(fiber.Map{"message": "Floor layout updated"})
}

// DeleteTable deletes a table
// DELETE /api/cafes/:id/tables/:tableId
func (h *CafeHandler) DeleteTable(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	tableID, err := strconv.ParseUint(c.Params("tableId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid table ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.tableBelongsToCafe(uint(cafeID), uint(tableID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify table"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Table not found"})
	}

	if err := h.cafeService.DeleteTable(uint(tableID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete table"})
	}

	return c.JSON(fiber.Map{"message": "Table deleted"})
}

// ScanQRCode handles QR code scanning
// GET /api/cafes/scan/:qrCode
func (h *CafeHandler) ScanQRCode(c *fiber.Ctx) error {
	qrCode := c.Params("qrCode")

	result, err := h.cafeService.GetTableByQRCode(qrCode)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid QR code"})
	}

	return c.JSON(result)
}

// ===== Menu =====

// GetMenu returns the full menu for a cafe
// GET /api/cafes/:id/menu
func (h *CafeHandler) GetMenu(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	menu, err := h.dishService.GetFullMenu(uint(cafeID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get menu"})
	}

	return c.JSON(menu)
}

// GetFeaturedDishes returns featured dishes
// GET /api/cafes/:id/featured
func (h *CafeHandler) GetFeaturedDishes(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	limit := clampQueryInt(c, "limit", 10, 1, 50)

	dishes, err := h.dishService.GetFeaturedDishes(uint(cafeID), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get featured dishes"})
	}

	return c.JSON(dishes)
}

// ===== Categories =====

// CreateCategory creates a new category
// POST /api/cafes/:id/categories
func (h *CafeHandler) CreateCategory(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req models.DishCategoryCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	category, err := h.dishService.CreateCategory(uint(cafeID), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create category"})
	}

	return c.Status(fiber.StatusCreated).JSON(category)
}

// GetCategories returns all categories for a cafe
// GET /api/cafes/:id/categories
func (h *CafeHandler) GetCategories(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	includeInactive := parseCafeBoolQuery(c.Query("include_inactive"))
	categories, err := h.dishService.GetCategories(uint(cafeID), includeInactive)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get categories"})
	}

	return c.JSON(categories)
}

// UpdateCategory updates a category
// PUT /api/cafes/:id/categories/:categoryId
func (h *CafeHandler) UpdateCategory(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	categoryID, err := strconv.ParseUint(c.Params("categoryId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.categoryBelongsToCafe(uint(cafeID), uint(categoryID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify category"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Category not found"})
	}

	var req models.DishCategoryUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	category, err := h.dishService.UpdateCategory(uint(categoryID), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update category"})
	}

	return c.JSON(category)
}

// DeleteCategory deletes a category
// DELETE /api/cafes/:id/categories/:categoryId
func (h *CafeHandler) DeleteCategory(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	categoryID, err := strconv.ParseUint(c.Params("categoryId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.categoryBelongsToCafe(uint(cafeID), uint(categoryID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify category"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Category not found"})
	}

	if err := h.dishService.DeleteCategory(uint(categoryID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete category"})
	}

	return c.JSON(fiber.Map{"message": "Category deleted"})
}

// ===== Dishes =====

// CreateDish creates a new dish
// POST /api/cafes/:id/dishes
func (h *CafeHandler) CreateDish(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req models.DishCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	dish, err := h.dishService.CreateDish(uint(cafeID), req)
	if err != nil {
		if isBonusPercentValidationError(err) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create dish"})
	}

	return c.Status(fiber.StatusCreated).JSON(dish)
}

// GetDish returns a dish by ID
// GET /api/cafes/:id/dishes/:dishId
func (h *CafeHandler) GetDish(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	dishID, err := strconv.ParseUint(c.Params("dishId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid dish ID"})
	}
	belongs, err := h.dishBelongsToCafe(uint(cafeID), uint(dishID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify dish"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dish not found"})
	}

	dish, err := h.dishService.GetDish(uint(dishID))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get dish"})
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dish not found"})
	}

	return c.JSON(dish)
}

// ListDishes returns a list of dishes
// GET /api/cafes/:id/dishes
func (h *CafeHandler) ListDishes(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	filters := models.DishFilters{
		CafeID: uint(cafeID),
		Search: c.Query("search"),
		Sort:   c.Query("sort"),
		Page:   clampQueryInt(c, "page", 1, 1, 100000),
		Limit:  clampQueryInt(c, "limit", 20, 1, 100),
	}

	if rawCategoryID := strings.TrimSpace(c.Query("category_id")); rawCategoryID != "" {
		catID, parseErr := strconv.ParseUint(rawCategoryID, 10, 32)
		if parseErr != nil || catID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category_id"})
		}
		catIDUint := uint(catID)
		filters.CategoryID = &catIDUint
	}
	if rawDishType := strings.ToLower(strings.TrimSpace(c.Query("type"))); rawDishType != "" {
		dishType := models.DishType(rawDishType)
		if !isValidDishType(dishType) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid dish type"})
		}
		filters.Type = dishType
	}
	if parseCafeBoolQuery(c.Query("vegetarian")) {
		v := true
		filters.IsVegetarian = &v
	}
	if parseCafeBoolQuery(c.Query("vegan")) {
		v := true
		filters.IsVegan = &v
	}
	dishes, err := h.dishService.ListDishes(filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list dishes"})
	}

	return c.JSON(dishes)
}

// UpdateDish updates a dish
// PUT /api/cafes/:id/dishes/:dishId
func (h *CafeHandler) UpdateDish(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	dishID, err := strconv.ParseUint(c.Params("dishId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid dish ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.dishBelongsToCafe(uint(cafeID), uint(dishID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify dish"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dish not found"})
	}

	var req models.DishUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	dish, err := h.dishService.UpdateDish(uint(dishID), req)
	if err != nil {
		if isBonusPercentValidationError(err) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update dish"})
	}

	return c.JSON(dish)
}

// DeleteDish deletes a dish
// DELETE /api/cafes/:id/dishes/:dishId
func (h *CafeHandler) DeleteDish(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	dishID, err := strconv.ParseUint(c.Params("dishId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid dish ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, []models.CafeStaffRole{models.CafeStaffRoleAdmin, models.CafeStaffRoleManager}) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.dishBelongsToCafe(uint(cafeID), uint(dishID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify dish"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Dish not found"})
	}

	if err := h.dishService.DeleteDish(uint(dishID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete dish"})
	}

	return c.JSON(fiber.Map{"message": "Dish deleted"})
}

// ===== Stop List =====

// UpdateStopList updates dish availability
// POST /api/cafes/:id/stop-list
func (h *CafeHandler) UpdateStopList(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, nil) { // Any staff can update stop-list
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	var req models.StopListUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.dishService.UpdateStopList(uint(cafeID), req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update stop-list"})
	}

	return c.JSON(fiber.Map{"message": "Stop-list updated"})
}

// GetStopList returns unavailable dishes
// GET /api/cafes/:id/stop-list
func (h *CafeHandler) GetStopList(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, nil) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	dishes, err := h.dishService.GetStopList(uint(cafeID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get stop-list"})
	}

	return c.JSON(dishes)
}

// ===== Waiter Calls =====

// CreateWaiterCall creates a waiter call
// POST /api/cafes/:id/waiter-call
func (h *CafeHandler) CreateWaiterCall(c *fiber.Ctx) error {
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	var userID *uint
	uid := middleware.GetUserID(c)
	if uid != 0 {
		userID = &uid
	}

	var req models.WaiterCallRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	call, err := h.cafeService.CreateWaiterCall(uint(cafeID), userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create waiter call"})
	}

	return c.Status(fiber.StatusCreated).JSON(call)
}

// GetActiveWaiterCalls returns active waiter calls
// GET /api/cafes/:id/waiter-calls
func (h *CafeHandler) GetActiveWaiterCalls(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, nil) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}

	calls, err := h.cafeService.GetActiveWaiterCalls(uint(cafeID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get waiter calls"})
	}

	return c.JSON(calls)
}

// AcknowledgeWaiterCall acknowledges a waiter call
// POST /api/cafes/:id/waiter-calls/:callId/acknowledge
func (h *CafeHandler) AcknowledgeWaiterCall(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	callID, err := strconv.ParseUint(c.Params("callId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid call ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, nil) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.waiterCallBelongsToCafe(uint(cafeID), uint(callID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify waiter call"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Waiter call not found"})
	}

	if err := h.cafeService.AcknowledgeWaiterCall(uint(callID), userID); err != nil {
		if errors.Is(err, services.ErrWaiterCallNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Waiter call not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to acknowledge call"})
	}

	return c.JSON(fiber.Map{"message": "Call acknowledged"})
}

// CompleteWaiterCall completes a waiter call
// POST /api/cafes/:id/waiter-calls/:callId/complete
func (h *CafeHandler) CompleteWaiterCall(c *fiber.Ctx) error {
	userID, err := requireCafeUserID(c)
	if err != nil {
		return err
	}
	cafeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid cafe ID"})
	}
	callID, err := strconv.ParseUint(c.Params("callId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid call ID"})
	}

	if !h.hasStaffAccess(uint(cafeID), userID, nil) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized"})
	}
	belongs, err := h.waiterCallBelongsToCafe(uint(cafeID), uint(callID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify waiter call"})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Waiter call not found"})
	}

	if err := h.cafeService.CompleteWaiterCall(uint(callID)); err != nil {
		if errors.Is(err, services.ErrWaiterCallNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Waiter call not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to complete call"})
	}

	return c.JSON(fiber.Map{"message": "Call completed"})
}

// ===== Helper =====

func (h *CafeHandler) hasStaffAccess(cafeID, userID uint, requiredRoles []models.CafeStaffRole) bool {
	if h.cafeService.IsCafeOwner(cafeID, userID) {
		return true
	}

	isStaff, role := h.cafeService.IsStaff(cafeID, userID)
	if !isStaff {
		return false
	}

	if len(requiredRoles) == 0 {
		return true // Any staff role is OK
	}

	for _, r := range requiredRoles {
		if role == r {
			return true
		}
	}

	return false
}

func (h *CafeHandler) categoryBelongsToCafe(cafeID, categoryID uint) (bool, error) {
	var count int64
	if err := database.DB.Model(&models.DishCategory{}).
		Where("id = ? AND cafe_id = ?", categoryID, cafeID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h *CafeHandler) dishBelongsToCafe(cafeID, dishID uint) (bool, error) {
	var count int64
	if err := database.DB.Model(&models.Dish{}).
		Where("id = ? AND cafe_id = ?", dishID, cafeID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h *CafeHandler) tableBelongsToCafe(cafeID, tableID uint) (bool, error) {
	var count int64
	if err := database.DB.Model(&models.CafeTable{}).
		Where("id = ? AND cafe_id = ?", tableID, cafeID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h *CafeHandler) waiterCallBelongsToCafe(cafeID, callID uint) (bool, error) {
	var count int64
	if err := database.DB.Model(&models.WaiterCall{}).
		Where("id = ? AND cafe_id = ?", callID, cafeID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
