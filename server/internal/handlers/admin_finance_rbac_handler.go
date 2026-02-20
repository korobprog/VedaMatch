package handlers

import (
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type AdminFinanceRBACHandler struct{}

func NewAdminFinanceRBACHandler() *AdminFinanceRBACHandler {
	return &AdminFinanceRBACHandler{}
}

type financePermissionMutationRequest struct {
	UserID     uint   `json:"userId"`
	Permission string `json:"permission"`
}

func normalizeAdminPermission(raw string) string {
	return strings.TrimSpace(strings.ToLower(raw))
}

func hasAdminPermission(userID uint, role string, permission string) bool {
	if userID == 0 {
		return false
	}
	if strings.TrimSpace(strings.ToLower(role)) == models.RoleSuperadmin {
		return true
	}
	permission = normalizeAdminPermission(permission)
	if !models.IsValidAdminPermission(permission) {
		return false
	}
	var count int64
	err := database.DB.Model(&models.AdminPermissionGrant{}).
		Where("user_id = ? AND permission = ?", userID, permission).
		Count(&count).Error
	if err != nil {
		return false
	}
	return count > 0
}

func requireAdminPermission(c *fiber.Ctx, permission string) (uint, error) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return 0, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	role := middleware.GetUserRole(c)
	if !models.IsAdminRole(role) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
	}
	if !hasAdminPermission(userID, role, permission) {
		return 0, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Missing required admin permission: " + permission})
	}
	return userID, nil
}

func (h *AdminFinanceRBACHandler) ListFinancePermissions(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}

	var grants []models.AdminPermissionGrant
	if err := database.DB.Order("created_at DESC").Find(&grants).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch finance permissions"})
	}

	type adminSummary struct {
		ID            uint   `json:"id"`
		Email         string `json:"email"`
		Role          string `json:"role"`
		KarmicName    string `json:"karmicName"`
		SpiritualName string `json:"spiritualName"`
	}
	var admins []adminSummary
	if err := database.DB.Model(&models.User{}).
		Select("id, email, role, karmic_name, spiritual_name").
		Where("role IN ?", []string{models.RoleAdmin, models.RoleSuperadmin}).
		Order("id ASC").
		Scan(&admins).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch admins"})
	}

	return c.JSON(fiber.Map{
		"admins": admins,
		"grants": grants,
	})
}

func (h *AdminFinanceRBACHandler) GrantFinancePermission(c *fiber.Ctx) error {
	actorID, err := requireAdminUserID(c)
	if err != nil {
		return err
	}
	if strings.TrimSpace(strings.ToLower(middleware.GetUserRole(c))) != models.RoleSuperadmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only superadmin can grant finance permissions"})
	}

	var body financePermissionMutationRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	permission := normalizeAdminPermission(body.Permission)
	if body.UserID == 0 || !models.IsValidAdminPermission(permission) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "userId and valid permission are required"})
	}

	var target models.User
	if err := database.DB.Select("id", "role").First(&target, body.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Target user not found"})
	}
	if !models.IsAdminRole(target.Role) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Permission can only be granted to admin users"})
	}

	grant := models.AdminPermissionGrant{UserID: body.UserID, Permission: permission, GrantedBy: actorID}
	if err := database.DB.Where("user_id = ? AND permission = ?", body.UserID, permission).FirstOrCreate(&grant).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not grant permission"})
	}

	return c.JSON(fiber.Map{"ok": true, "grant": grant})
}

func (h *AdminFinanceRBACHandler) RevokeFinancePermission(c *fiber.Ctx) error {
	if _, err := requireAdminUserID(c); err != nil {
		return err
	}
	if strings.TrimSpace(strings.ToLower(middleware.GetUserRole(c))) != models.RoleSuperadmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only superadmin can revoke finance permissions"})
	}

	var body financePermissionMutationRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	permission := normalizeAdminPermission(body.Permission)
	if body.UserID == 0 || !models.IsValidAdminPermission(permission) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "userId and valid permission are required"})
	}

	if err := database.DB.Where("user_id = ? AND permission = ?", body.UserID, permission).Delete(&models.AdminPermissionGrant{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not revoke permission"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

func (h *AdminFinanceRBACHandler) GetMyFinancePermissions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	role := middleware.GetUserRole(c)
	if !models.IsAdminRole(role) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
	}

	permissions := []string{}
	if strings.TrimSpace(strings.ToLower(role)) == models.RoleSuperadmin {
		permissions = append(permissions, string(models.AdminPermissionFinanceManager), string(models.AdminPermissionFinanceApprover))
	} else {
		var grants []models.AdminPermissionGrant
		if err := database.DB.Where("user_id = ?", userID).Find(&grants).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch permissions"})
		}
		for _, g := range grants {
			permissions = append(permissions, g.Permission)
		}
	}

	return c.JSON(fiber.Map{
		"userId":      userID,
		"role":        role,
		"permissions": permissions,
	})
}

func mustParseUintParam(c *fiber.Ctx, name string) (uint, error) {
	value := strings.TrimSpace(c.Params(name))
	if value == "" {
		return 0, fiber.NewError(fiber.StatusBadRequest, "missing parameter: "+name)
	}
	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil || parsed == 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid parameter: "+name)
	}
	return uint(parsed), nil
}
