package models

import "time"

type AdminPermission string

const (
	AdminPermissionFinanceManager  AdminPermission = "finance_manager"
	AdminPermissionFinanceApprover AdminPermission = "finance_approver"
)

func IsValidAdminPermission(value string) bool {
	switch AdminPermission(value) {
	case AdminPermissionFinanceManager, AdminPermissionFinanceApprover:
		return true
	default:
		return false
	}
}

type AdminPermissionGrant struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	UserID     uint   `gorm:"index:idx_admin_permission_user_perm,unique;not null" json:"userId"`
	Permission string `gorm:"index:idx_admin_permission_user_perm,unique;size:64;not null" json:"permission"`
	GrantedBy  uint   `gorm:"index;not null" json:"grantedBy"`
}
