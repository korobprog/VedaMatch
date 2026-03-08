package services

import (
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	proStatusActive  = "active"
	proStatusTrial   = "trial"
	proStatusExpired = "expired"

	defaultProPlan7dPrice  = 99
	defaultProPlan30dPrice = 299
	defaultProPlan90dPrice = 799
)

var (
	ErrProDisabled          = errors.New("pro subscriptions are disabled")
	ErrProPlanNotFound      = errors.New("pro plan not found")
	ErrProAlreadyFreeByRole = errors.New("pro already enabled by role")
	ErrProInsufficientLKM   = errors.New("insufficient lkm")
)

type ProPlan struct {
	Code      string `json:"code"`
	Days      int    `json:"days"`
	PriceLKM  int    `json:"priceLkm"`
	Title     string `json:"title"`
	Badge     string `json:"badge,omitempty"`
	IsPopular bool   `json:"isPopular"`
}

type ProStatus struct {
	IsProEffective      bool                        `json:"isProEffective"`
	Source              string                      `json:"source"`
	RoleFree            bool                        `json:"roleFree"`
	CurrentSubscription *models.UserProSubscription `json:"currentSubscription,omitempty"`
	RemainingDays       int                         `json:"remainingDays"`
}

type ProPurchaseResult struct {
	Status *ProStatus             `json:"status"`
	Wallet *models.WalletResponse `json:"wallet"`
}

type ProService struct {
	db      *gorm.DB
	wallet  *WalletService
	metrics *MetricsService
}

func NewProService(walletService *WalletService) *ProService {
	if walletService == nil {
		walletService = NewWalletService()
	}
	return &ProService{
		db:      database.DB,
		wallet:  walletService,
		metrics: GetMetricsService(),
	}
}

func StartProSubscriptionScheduler(walletService *WalletService) {
	if GlobalScheduler == nil {
		return
	}
	service := NewProService(walletService)

	// One-time guard for legacy users with stale god_mode_enabled.
	if err := service.EnforceLegacyEntitlements(); err != nil {
		log.Printf("[ProService] legacy entitlement sync failed: %v", err)
	}

	GlobalScheduler.RegisterTask("pro_subscription_expiry", 10, func() {
		expired, err := service.ExpireAndSync(time.Now().UTC())
		if err != nil {
			log.Printf("[ProService] expire_and_sync_error=%v", err)
			return
		}
		if expired > 0 {
			log.Printf("[ProService] subscriptions_expired=%d", expired)
		}
	})
}

func (s *ProService) GetPlans() []ProPlan {
	if s.db != nil {
		var configs []models.ProPlanConfig
		if err := s.db.Where("is_enabled = ?", true).Order("days ASC, id ASC").Find(&configs).Error; err == nil && len(configs) > 0 {
			plans := make([]ProPlan, 0, len(configs))
			for _, item := range configs {
				plans = append(plans, ProPlan{
					Code:      item.Code,
					Days:      item.Days,
					PriceLKM:  item.PriceLkm,
					Title:     item.Title,
					Badge:     item.Badge,
					IsPopular: item.IsPopular,
				})
			}
			return plans
		}
	}

	plans := []ProPlan{
		{
			Code:     "pro_7d",
			Days:     7,
			PriceLKM: s.getPlanPrice("PRO_PLAN_7D_LKM", defaultProPlan7dPrice),
			Title:    "PRO 7 дней",
			Badge:    "Старт",
		},
		{
			Code:      "pro_30d",
			Days:      30,
			PriceLKM:  s.getPlanPrice("PRO_PLAN_30D_LKM", defaultProPlan30dPrice),
			Title:     "PRO 30 дней",
			Badge:     "Популярный",
			IsPopular: true,
		},
		{
			Code:     "pro_90d",
			Days:     90,
			PriceLKM: s.getPlanPrice("PRO_PLAN_90D_LKM", defaultProPlan90dPrice),
			Title:    "PRO 90 дней",
			Badge:    "Выгодно",
		},
	}
	return plans
}

func (s *ProService) GetStatus(userID uint) (*ProStatus, error) {
	if userID == 0 {
		return nil, errors.New("invalid user id")
	}

	var user models.User
	if err := s.db.Select("id", "role").First(&user, userID).Error; err != nil {
		return nil, err
	}

	isRoleFree := models.IsAdminRole(strings.TrimSpace(strings.ToLower(user.Role)))
	if isRoleFree {
		return &ProStatus{
			IsProEffective: true,
			Source:         "role",
			RoleFree:       true,
			RemainingDays:  -1,
		}, nil
	}

	now := time.Now().UTC()
	var subscription models.UserProSubscription
	err := s.db.Model(&models.UserProSubscription{}).
		Where("user_id = ? AND status IN ? AND starts_at <= ? AND ends_at >= ?", userID, []string{proStatusActive, proStatusTrial}, now, now).
		Order("ends_at DESC").
		First(&subscription).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &ProStatus{IsProEffective: false, Source: "none", RoleFree: false, RemainingDays: 0}, nil
		}
		return nil, err
	}

	remaining := int(time.Until(subscription.EndsAt).Hours() / 24)
	if remaining < 0 {
		remaining = 0
	}

	return &ProStatus{
		IsProEffective:      true,
		Source:              "subscription",
		RoleFree:            false,
		CurrentSubscription: &subscription,
		RemainingDays:       remaining,
	}, nil
}

func (s *ProService) Purchase(userID uint, planCode string) (*ProPurchaseResult, error) {
	if !s.isProEnabled() {
		return nil, ErrProDisabled
	}
	if userID == 0 {
		return nil, errors.New("invalid user id")
	}

	_ = s.metrics.Increment(MetricProPurchaseAttemptTotal, 1)

	plan, ok := s.resolvePlanByCode(planCode)
	if !ok {
		return nil, ErrProPlanNotFound
	}

	var user models.User
	if err := s.db.Select("id", "role").First(&user, userID).Error; err != nil {
		return nil, err
	}
	if models.IsAdminRole(strings.TrimSpace(strings.ToLower(user.Role))) {
		return nil, ErrProAlreadyFreeByRole
	}

	dedupKey := fmt.Sprintf("pro_purchase:%d:%s:%s", userID, plan.Code, time.Now().UTC().Format("20060102150405.000000000"))
	description := fmt.Sprintf("PRO subscription purchase: %s", plan.Code)
	spendErr := s.wallet.SpendWithOptions(userID, plan.PriceLKM, dedupKey, description, SpendOptions{AllowBonus: false})
	if spendErr != nil {
		if strings.Contains(strings.ToLower(spendErr.Error()), "insufficient balance") {
			_ = s.metrics.Increment(MetricProPurchaseInsufficientLKMTotal, 1)
			return nil, ErrProInsufficientLKM
		}
		return nil, spendErr
	}

	if err := s.extendSubscription(userID, plan); err != nil {
		return nil, err
	}
	if err := s.SyncEntitlement(userID); err != nil {
		return nil, err
	}

	status, err := s.GetStatus(userID)
	if err != nil {
		return nil, err
	}
	walletSnapshot, err := s.wallet.GetBalance(userID)
	if err != nil {
		return nil, err
	}

	_ = s.metrics.Increment(MetricProPurchaseSuccessTotal, 1)

	return &ProPurchaseResult{
		Status: status,
		Wallet: walletSnapshot,
	}, nil
}

func (s *ProService) SyncEntitlement(userID uint) error {
	if userID == 0 {
		return errors.New("invalid user id")
	}

	var user models.User
	if err := s.db.Select("id", "role", "god_mode_enabled", "current_plan").First(&user, userID).Error; err != nil {
		return err
	}

	effective := false
	if models.IsAdminRole(strings.TrimSpace(strings.ToLower(user.Role))) {
		effective = true
	} else {
		now := time.Now().UTC()
		var count int64
		if err := s.db.Model(&models.UserProSubscription{}).
			Where("user_id = ? AND status IN ? AND starts_at <= ? AND ends_at >= ?", userID, []string{proStatusActive, proStatusTrial}, now, now).
			Count(&count).Error; err != nil {
			return err
		}
		effective = count > 0
	}

	updates := map[string]interface{}{
		"god_mode_enabled": effective,
	}

	currentPlan := strings.TrimSpace(strings.ToLower(user.CurrentPlan))
	if effective {
		if models.IsAdminRole(strings.TrimSpace(strings.ToLower(user.Role))) {
			updates["current_plan"] = "admin"
		} else if !strings.Contains(currentPlan, "pro") {
			updates["current_plan"] = "pro"
		}
	} else if strings.Contains(currentPlan, "pro") || currentPlan == "admin" {
		updates["current_plan"] = "trial"
	}

	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return err
	}

	_ = s.metrics.Increment(MetricProEntitlementSyncTotal, 1)
	return nil
}

func (s *ProService) ExpireAndSync(now time.Time) (int, error) {
	now = now.UTC()
	var userIDs []uint
	if err := s.db.Model(&models.UserProSubscription{}).
		Where("status IN ? AND ends_at < ?", []string{proStatusActive, proStatusTrial}, now).
		Distinct("user_id").
		Pluck("user_id", &userIDs).Error; err != nil {
		return 0, err
	}

	if len(userIDs) == 0 {
		return 0, nil
	}

	result := s.db.Model(&models.UserProSubscription{}).
		Where("status IN ? AND ends_at < ?", []string{proStatusActive, proStatusTrial}, now).
		Updates(map[string]interface{}{"status": proStatusExpired, "updated_at": now})
	if result.Error != nil {
		return 0, result.Error
	}

	for _, userID := range userIDs {
		if err := s.SyncEntitlement(userID); err != nil {
			log.Printf("[ProService] sync entitlement failed user=%d err=%v", userID, err)
		}
	}

	expired := int(result.RowsAffected)
	if expired > 0 {
		_ = s.metrics.Increment(MetricProExpiredTotal, int64(expired))
	}
	return expired, nil
}

func (s *ProService) EnforceLegacyEntitlements() error {
	// Admin/superadmin always have PRO entitlement.
	if err := s.db.Model(&models.User{}).
		Where("LOWER(role) IN ?", []string{"admin", "superadmin"}).
		Update("god_mode_enabled", true).Error; err != nil {
		return err
	}

	// For non-admin users, entitlement comes only from active subscription.
	var users []models.User
	if err := s.db.Select("id").
		Where("LOWER(role) NOT IN ?", []string{"admin", "superadmin"}).
		Find(&users).Error; err != nil {
		return err
	}
	for _, user := range users {
		if err := s.SyncEntitlement(user.ID); err != nil {
			log.Printf("[ProService] legacy sync failed user=%d err=%v", user.ID, err)
		}
	}
	return nil
}

func (s *ProService) resolvePlanByCode(planCode string) (ProPlan, bool) {
	needle := strings.TrimSpace(strings.ToLower(planCode))
	for _, plan := range s.GetPlans() {
		if strings.ToLower(plan.Code) == needle {
			return plan, true
		}
	}
	return ProPlan{}, false
}

func (s *ProService) extendSubscription(userID uint, plan ProPlan) error {
	now := time.Now().UTC()
	var sub models.UserProSubscription
	err := s.db.Model(&models.UserProSubscription{}).
		Where("user_id = ? AND status IN ?", userID, []string{proStatusActive, proStatusTrial}).
		Order("ends_at DESC").
		First(&sub).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	anchor := now
	if err == nil && sub.EndsAt.After(now) {
		anchor = sub.EndsAt
	}
	newEndsAt := anchor.Add(time.Duration(plan.Days) * 24 * time.Hour)

	if err == nil {
		updates := map[string]interface{}{
			"plan_code":  plan.Code,
			"status":     proStatusActive,
			"ends_at":    newEndsAt,
			"updated_at": now,
		}
		if sub.StartsAt.IsZero() {
			updates["starts_at"] = now
		}
		if err := s.db.Model(&models.UserProSubscription{}).Where("id = ?", sub.ID).Updates(updates).Error; err != nil {
			return err
		}
		return nil
	}

	fresh := models.UserProSubscription{
		UserID:    userID,
		PlanCode:  plan.Code,
		Status:    proStatusActive,
		StartsAt:  now,
		EndsAt:    newEndsAt,
		AutoRenew: false,
	}
	return s.db.Create(&fresh).Error
}

func (s *ProService) isProEnabled() bool {
	if s.db != nil {
		var count int64
		if err := s.db.Model(&models.ProPlanConfig{}).Where("is_enabled = ?", true).Count(&count).Error; err == nil && count > 0 {
			return true
		}
	}

	proEnabled := strings.TrimSpace(strings.ToLower(s.settingValue("PRO_ENABLED", "true")))
	proSubscriptionsEnabled := strings.TrimSpace(strings.ToLower(s.settingValue("PRO_LKM_SUBSCRIPTIONS_ENABLED", "true")))
	if isProFalseLike(proEnabled) || isProFalseLike(proSubscriptionsEnabled) {
		return false
	}
	return true
}

func isProFalseLike(value string) bool {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "0", "false", "no", "off", "disabled":
		return true
	default:
		return false
	}
}

func (s *ProService) getPlanPrice(key string, fallback int) int {
	value := strings.TrimSpace(s.settingValue(key, ""))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func (s *ProService) settingValue(key, fallback string) string {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return fallback
	}

	var setting models.SystemSetting
	if err := s.db.Where("key = ?", trimmed).First(&setting).Error; err == nil {
		if value := strings.TrimSpace(setting.Value); value != "" {
			return value
		}
	}
	return strings.TrimSpace(fallback)
}

func sortProPlans(plans []ProPlan) {
	sort.SliceStable(plans, func(i, j int) bool {
		if plans[i].Days == plans[j].Days {
			return plans[i].PriceLKM < plans[j].PriceLKM
		}
		return plans[i].Days < plans[j].Days
	})
}
