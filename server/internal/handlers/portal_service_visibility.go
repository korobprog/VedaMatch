package handlers

import (
	"encoding/json"
	"errors"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"sort"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var portalServiceCatalog = []string{
	"path_tracker",
	"contacts",
	"chat",
	"rooms",
	"calls",
	"dating",
	"cafe",
	"shops",
	"ads",
	"library",
	"education",
	"multimedia",
	"video_circles",
	"channels",
	"sadhu_sanga",
	"ekadashi_calendar",
	"feed",
	"news",
	"map",
	"dhama",
	"support",
	"history",
	"settings",
	"travel",
	"services",
	"services_catalog",
	"connect",
	"seva",
}

var portalServiceCatalogSet = func() map[string]struct{} {
	index := make(map[string]struct{}, len(portalServiceCatalog))
	for _, serviceID := range portalServiceCatalog {
		index[serviceID] = struct{}{}
	}
	return index
}()

type portalServiceVisibilityAdminItem struct {
	ServiceID          string `json:"serviceId"`
	Mode               string `json:"mode"`
	TesterAllowlist    []uint `json:"testerAllowlist"`
	MaintenanceMessage string `json:"maintenanceMessage"`
	IsDefault          bool   `json:"isDefault"`
}

type portalServiceVisibilityAdminRequest struct {
	Items []portalServiceVisibilityAdminItem `json:"items"`
}

type portalServiceVisibilityRuntimeItem struct {
	Mode               string `json:"mode"`
	Visible            bool   `json:"visible"`
	MaintenanceMessage string `json:"maintenanceMessage,omitempty"`
}

func normalizePortalServiceID(serviceID string) string {
	return strings.TrimSpace(strings.ToLower(serviceID))
}

func isValidPortalServiceID(serviceID string) bool {
	_, ok := portalServiceCatalogSet[normalizePortalServiceID(serviceID)]
	return ok
}

func normalizePortalServiceMode(mode string) string {
	switch strings.TrimSpace(strings.ToLower(mode)) {
	case models.PortalServiceModeVisible:
		return models.PortalServiceModeVisible
	case models.PortalServiceModeBeta:
		return models.PortalServiceModeBeta
	case models.PortalServiceModeHidden:
		return models.PortalServiceModeHidden
	default:
		return ""
	}
}

func serializePortalAllowlist(ids []uint) (string, error) {
	if len(ids) == 0 {
		return "", nil
	}
	uniq := make(map[uint]struct{}, len(ids))
	normalized := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		if _, ok := uniq[id]; ok {
			continue
		}
		uniq[id] = struct{}{}
		normalized = append(normalized, id)
	}
	sort.Slice(normalized, func(i, j int) bool { return normalized[i] < normalized[j] })
	if len(normalized) == 0 {
		return "", nil
	}
	encoded, err := json.Marshal(normalized)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func parsePortalAllowlist(raw string) ([]uint, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []uint{}, nil
	}

	if strings.HasPrefix(trimmed, "[") {
		var fromJSON []uint
		if err := json.Unmarshal([]byte(trimmed), &fromJSON); err != nil {
			return nil, err
		}
		encoded, err := serializePortalAllowlist(fromJSON)
		if err != nil {
			return nil, err
		}
		if encoded == "" {
			return []uint{}, nil
		}
		var normalized []uint
		if err := json.Unmarshal([]byte(encoded), &normalized); err != nil {
			return nil, err
		}
		return normalized, nil
	}

	parts := strings.Split(trimmed, ",")
	values := make([]uint, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		parsed, err := strconv.ParseUint(value, 10, 64)
		if err != nil {
			return nil, err
		}
		values = append(values, uint(parsed))
	}
	encoded, err := serializePortalAllowlist(values)
	if err != nil {
		return nil, err
	}
	if encoded == "" {
		return []uint{}, nil
	}
	var normalized []uint
	if err := json.Unmarshal([]byte(encoded), &normalized); err != nil {
		return nil, err
	}
	return normalized, nil
}

func normalizePortalMaintenanceMessage(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func loadPortalServiceVisibilityRows() ([]models.PortalServiceVisibility, error) {
	var rows []models.PortalServiceVisibility
	if err := database.DB.Order("service_id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func buildPortalVisibilityByServiceID(rows []models.PortalServiceVisibility) map[string]models.PortalServiceVisibility {
	result := make(map[string]models.PortalServiceVisibility, len(rows))
	for _, row := range rows {
		result[normalizePortalServiceID(row.ServiceID)] = row
	}
	return result
}

func buildPortalServiceVisibilityAdminItems(rows []models.PortalServiceVisibility) ([]portalServiceVisibilityAdminItem, error) {
	byID := buildPortalVisibilityByServiceID(rows)
	items := make([]portalServiceVisibilityAdminItem, 0, len(portalServiceCatalog))
	for _, serviceID := range portalServiceCatalog {
		row, ok := byID[serviceID]
		if !ok {
			items = append(items, portalServiceVisibilityAdminItem{
				ServiceID:          serviceID,
				Mode:               models.PortalServiceModeVisible,
				TesterAllowlist:    []uint{},
				MaintenanceMessage: "",
				IsDefault:          true,
			})
			continue
		}
		allowlist, err := parsePortalAllowlist(row.TesterAllowlist)
		if err != nil {
			return nil, err
		}
		message := ""
		if row.MaintenanceMessage != nil {
			message = strings.TrimSpace(*row.MaintenanceMessage)
		}
		items = append(items, portalServiceVisibilityAdminItem{
			ServiceID:          serviceID,
			Mode:               normalizePortalServiceMode(row.Mode),
			TesterAllowlist:    allowlist,
			MaintenanceMessage: message,
			IsDefault:          false,
		})
	}
	return items, nil
}

func buildPortalServiceVisibilityRuntimeMap(userID uint, role string, rows []models.PortalServiceVisibility) (map[string]portalServiceVisibilityRuntimeItem, error) {
	byID := buildPortalVisibilityByServiceID(rows)
	result := make(map[string]portalServiceVisibilityRuntimeItem, len(portalServiceCatalog))
	isAdmin := models.IsAdminRole(role)
	for _, serviceID := range portalServiceCatalog {
		entry := portalServiceVisibilityRuntimeItem{
			Mode:    models.PortalServiceModeVisible,
			Visible: true,
		}
		row, ok := byID[serviceID]
		if !ok {
			result[serviceID] = entry
			continue
		}
		mode := normalizePortalServiceMode(row.Mode)
		if mode == "" {
			mode = models.PortalServiceModeVisible
		}
		entry.Mode = mode
		if row.MaintenanceMessage != nil {
			entry.MaintenanceMessage = strings.TrimSpace(*row.MaintenanceMessage)
		}
		if isAdmin {
			entry.Visible = true
			result[serviceID] = entry
			continue
		}
		switch mode {
		case models.PortalServiceModeHidden:
			entry.Visible = false
		case models.PortalServiceModeBeta:
			allowlist, err := parsePortalAllowlist(row.TesterAllowlist)
			if err != nil {
				return nil, err
			}
			entry.Visible = false
			for _, candidate := range allowlist {
				if candidate == userID {
					entry.Visible = true
					break
				}
			}
		default:
			entry.Visible = true
		}
		result[serviceID] = entry
	}
	return result, nil
}

func IsPortalServiceVisible(serviceID string, userID uint) (bool, string, error) {
	normalizedID := normalizePortalServiceID(serviceID)
	if !isValidPortalServiceID(normalizedID) {
		return false, "", errors.New("unknown portal service id")
	}
	rows, err := loadPortalServiceVisibilityRows()
	if err != nil {
		return false, "", err
	}
	runtimeMap, err := buildPortalServiceVisibilityRuntimeMap(userID, "", rows)
	if err != nil {
		return false, "", err
	}
	item, ok := runtimeMap[normalizedID]
	if !ok {
		return true, "", nil
	}
	return item.Visible, item.MaintenanceMessage, nil
}

func (h *AdminHandler) GetPortalServiceVisibility(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	rows, err := loadPortalServiceVisibilityRows()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch portal service visibility"})
	}
	items, err := buildPortalServiceVisibilityAdminItems(rows)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not decode portal service visibility"})
	}

	return c.JSON(fiber.Map{
		"items": items,
	})
}

func (h *AdminHandler) UpdatePortalServiceVisibility(c *fiber.Ctx) error {
	adminID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}

	var payload portalServiceVisibilityAdminRequest
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	seen := make(map[string]struct{}, len(payload.Items))
	for _, item := range payload.Items {
		serviceID := normalizePortalServiceID(item.ServiceID)
		mode := normalizePortalServiceMode(item.Mode)
		if serviceID == "" || !isValidPortalServiceID(serviceID) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unknown portal service id: " + item.ServiceID})
		}
		if mode == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid mode for service: " + serviceID})
		}
		if _, ok := seen[serviceID]; ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Duplicate portal service id: " + serviceID})
		}
		seen[serviceID] = struct{}{}
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range payload.Items {
			serviceID := normalizePortalServiceID(item.ServiceID)
			mode := normalizePortalServiceMode(item.Mode)
			allowlist := item.TesterAllowlist
			if mode != models.PortalServiceModeBeta {
				allowlist = []uint{}
			}

			serializedAllowlist, err := serializePortalAllowlist(allowlist)
			if err != nil {
				return err
			}
			message := normalizePortalMaintenanceMessage(item.MaintenanceMessage)

			// Empty visible config falls back to implicit default by deleting override.
			if mode == models.PortalServiceModeVisible && serializedAllowlist == "" && message == nil {
				if err := tx.Delete(&models.PortalServiceVisibility{}, "service_id = ?", serviceID).Error; err != nil {
					return err
				}
				continue
			}

			record := models.PortalServiceVisibility{
				ServiceID:          serviceID,
				Mode:               mode,
				TesterAllowlist:    serializedAllowlist,
				MaintenanceMessage: message,
				UpdatedByUserID:    &adminID,
			}

			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "service_id"}},
				DoUpdates: clause.AssignmentColumns([]string{"mode", "tester_allowlist", "maintenance_message", "updated_by_user_id", "updated_at"}),
			}).Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save portal service visibility"})
	}

	rows, err := loadPortalServiceVisibilityRows()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Visibility saved but refresh failed"})
	}
	items, err := buildPortalServiceVisibilityAdminItems(rows)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Visibility saved but response build failed"})
	}

	return c.JSON(fiber.Map{
		"message": "Portal service visibility updated",
		"items":   items,
	})
}

func (h *SystemHandler) GetPortalServiceVisibility(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	role := middleware.GetUserRole(c)

	rows, err := loadPortalServiceVisibilityRows()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch portal service visibility"})
	}
	items, err := buildPortalServiceVisibilityRuntimeMap(userID, role, rows)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not build portal service visibility"})
	}

	return c.JSON(fiber.Map{
		"services": items,
	})
}
