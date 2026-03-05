package services

import (
	"errors"
	"fmt"
	"os"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	defaultShopPlanBasicPrice = 0
	defaultShopPlanBasicLimit = 20
	defaultShopPlanProPrice   = 299
	defaultShopPlanProLimit   = 200
	defaultShopPlanPlusPrice  = 699
	defaultShopPlanPlusLimit  = 0
)

var (
	ErrShopPlanNotFound          = errors.New("shop plan not found")
	ErrShopSubscriptionForbidden = errors.New("forbidden")
	ErrShopProductLimitReached   = errors.New("shop product limit reached")
)

type ShopPlanStatus struct {
	PlanCode          models.ShopPlanCode      `json:"planCode"`
	PlanTitle         string                   `json:"planTitle"`
	ProductsLimit     int                      `json:"productsLimit"`
	CurrentProducts   int64                    `json:"currentProducts"`
	CanCreateProducts bool                     `json:"canCreateProducts"`
	Subscription      *models.ShopSubscription `json:"subscription,omitempty"`
}

type ShopPlanPurchaseResult struct {
	Subscription *models.ShopSubscription `json:"subscription"`
	Wallet       *models.WalletResponse   `json:"wallet"`
	Status       *ShopPlanStatus          `json:"status"`
}

type ShopPlanService struct {
	db     *gorm.DB
	wallet *WalletService
}

func NewShopPlanService(walletService *WalletService) *ShopPlanService {
	if walletService == nil {
		walletService = NewWalletService()
	}
	return &ShopPlanService{db: database.DB, wallet: walletService}
}

func (s *ShopPlanService) EnsureDefaultTariffs() error {
	defaults := []models.ShopPlanTariff{
		{
			Code:          models.ShopPlanCodeBasic,
			PriceLkm:      s.getIntSetting("SHOP_PLAN_BASIC_PRICE_LKM", defaultShopPlanBasicPrice),
			ProductsLimit: s.getIntSetting("SHOP_PLAN_BASIC_PRODUCTS_LIMIT", defaultShopPlanBasicLimit),
			PriorityRank:  0,
			PromoSlots:    0,
			IsActive:      true,
		},
		{
			Code:          models.ShopPlanCodePro,
			PriceLkm:      s.getIntSetting("SHOP_PLAN_PRO_PRICE_LKM", defaultShopPlanProPrice),
			ProductsLimit: s.getIntSetting("SHOP_PLAN_PRO_PRODUCTS_LIMIT", defaultShopPlanProLimit),
			PriorityRank:  10,
			PromoSlots:    0,
			IsActive:      true,
		},
		{
			Code:          models.ShopPlanCodePlus,
			PriceLkm:      s.getIntSetting("SHOP_PLAN_PLUS_PRICE_LKM", defaultShopPlanPlusPrice),
			ProductsLimit: s.getIntSetting("SHOP_PLAN_PLUS_PRODUCTS_LIMIT", defaultShopPlanPlusLimit),
			PriorityRank:  20,
			PromoSlots:    0,
			IsActive:      true,
		},
	}

	for _, item := range defaults {
		var existing models.ShopPlanTariff
		err := s.db.Where("code = ?", item.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if createErr := s.db.Create(&item).Error; createErr != nil {
				return createErr
			}
			continue
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *ShopPlanService) ListTariffs() ([]models.ShopPlanTariff, error) {
	var tariffs []models.ShopPlanTariff
	err := s.db.Where("is_active = ?", true).Order("priority_rank ASC, id ASC").Find(&tariffs).Error
	return tariffs, err
}

func (s *ShopPlanService) GetMyPlanStatus(shopID uint) (*ShopPlanStatus, error) {
	plan, sub, err := s.ResolveActivePlanForShop(shopID)
	if err != nil {
		return nil, err
	}

	var productsCount int64
	if err := s.db.Model(&models.Product{}).Where("shop_id = ?", shopID).Count(&productsCount).Error; err != nil {
		return nil, err
	}

	limit := plan.ProductsLimit
	canCreate := limit == 0 || int(productsCount) < limit
	return &ShopPlanStatus{
		PlanCode:          plan.Code,
		PlanTitle:         s.planTitle(plan.Code),
		ProductsLimit:     limit,
		CurrentProducts:   productsCount,
		CanCreateProducts: canCreate,
		Subscription:      sub,
	}, nil
}

func (s *ShopPlanService) Purchase(shopID uint, ownerID uint, planCode models.ShopPlanCode) (*ShopPlanPurchaseResult, error) {
	plan, err := s.findActivePlan(planCode)
	if err != nil {
		return nil, err
	}

	var shop models.Shop
	if err := s.db.Select("id", "owner_id").First(&shop, shopID).Error; err != nil {
		return nil, err
	}
	if shop.OwnerID != ownerID {
		return nil, ErrShopSubscriptionForbidden
	}

	now := time.Now().UTC()
	startsAt := now
	endsAt := now.Add(30 * 24 * time.Hour)

	var current models.ShopSubscription
	err = s.db.Where("shop_id = ? AND status = ? AND ends_at > ?", shopID, models.ShopSubscriptionStatusActive, now).
		Order("ends_at DESC").First(&current).Error
	if err == nil {
		if current.EndsAt.After(now) {
			startsAt = current.EndsAt
		}
		endsAt = startsAt.Add(30 * 24 * time.Hour)
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	charged := plan.PriceLkm
	dedupKey := fmt.Sprintf("shop_plan_purchase:%d:%s:%s", shopID, plan.Code, now.Format("20060102150405.000000000"))
	if charged > 0 {
		if spendErr := s.wallet.SpendWithOptions(ownerID, charged, dedupKey, fmt.Sprintf("Shop plan purchase: %s", plan.Code), SpendOptions{AllowBonus: false}); spendErr != nil {
			return nil, spendErr
		}
	}

	sub := &models.ShopSubscription{
		ShopID:     shopID,
		OwnerID:    ownerID,
		PlanCode:   plan.Code,
		Status:     models.ShopSubscriptionStatusActive,
		StartsAt:   startsAt,
		EndsAt:     endsAt,
		AutoRenew:  false,
		ChargedLkm: charged,
		DedupKey:   dedupKey,
	}
	if err := s.db.Create(sub).Error; err != nil {
		if charged > 0 {
			_ = s.wallet.Refund(ownerID, charged, "Shop plan purchase rollback", nil)
		}
		return nil, err
	}

	if err := s.syncShopPlanCache(shopID, plan); err != nil {
		return nil, err
	}

	walletSnapshot, err := s.wallet.GetBalance(ownerID)
	if err != nil {
		return nil, err
	}
	status, err := s.GetMyPlanStatus(shopID)
	if err != nil {
		return nil, err
	}

	if err := s.db.Create(&models.ShopBillingLog{
		EventType: models.ShopBillingEventSubscriptionPurchase,
		ShopID:    shopID,
		AmountLkm: charged,
		DedupKey:  dedupKey,
		MetaJSON:  fmt.Sprintf(`{"planCode":"%s"}`, plan.Code),
	}).Error; err != nil {
		return nil, err
	}
	_ = GetMetricsService().Increment(MetricShopSubscriptionsPurchasedTotal, 1)

	return &ShopPlanPurchaseResult{
		Subscription: sub,
		Wallet:       walletSnapshot,
		Status:       status,
	}, nil
}

func (s *ShopPlanService) CancelAutoRenew(shopID uint, ownerID uint) error {
	var shop models.Shop
	if err := s.db.Select("id", "owner_id").First(&shop, shopID).Error; err != nil {
		return err
	}
	if shop.OwnerID != ownerID {
		return ErrShopSubscriptionForbidden
	}
	return errors.New("not_supported")
}

func (s *ShopPlanService) ResolveActivePlanForShop(shopID uint) (*models.ShopPlanTariff, *models.ShopSubscription, error) {
	now := time.Now().UTC()
	var sub models.ShopSubscription
	err := s.db.Where("shop_id = ? AND status = ? AND starts_at <= ? AND ends_at > ?", shopID, models.ShopSubscriptionStatusActive, now, now).
		Order("ends_at DESC").First(&sub).Error
	if err == nil {
		plan, planErr := s.findActivePlan(sub.PlanCode)
		if planErr != nil {
			return nil, nil, planErr
		}
		return plan, &sub, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, err
	}

	plan, planErr := s.findActivePlan(models.ShopPlanCodeBasic)
	if planErr != nil {
		return nil, nil, planErr
	}
	return plan, nil, nil
}

func (s *ShopPlanService) EnsureProductLimitBeforeCreate(shopID uint) error {
	plan, _, err := s.ResolveActivePlanForShop(shopID)
	if err != nil {
		return err
	}
	if plan.ProductsLimit == 0 {
		return nil
	}
	var productsCount int64
	if err := s.db.Model(&models.Product{}).Where("shop_id = ?", shopID).Count(&productsCount).Error; err != nil {
		return err
	}
	if productsCount >= int64(plan.ProductsLimit) {
		_ = GetMetricsService().Increment(MetricShopPlanLimitBlockTotal, 1)
		return ErrShopProductLimitReached
	}
	return nil
}

func (s *ShopPlanService) EnsureProductLimitBeforeActivate(shopID uint, productID uint) error {
	plan, _, err := s.ResolveActivePlanForShop(shopID)
	if err != nil {
		return err
	}
	if plan.ProductsLimit == 0 {
		return nil
	}
	var activeProducts int64
	if err := s.db.Model(&models.Product{}).Where("shop_id = ? AND status = ? AND id <> ?", shopID, models.ProductStatusActive, productID).Count(&activeProducts).Error; err != nil {
		return err
	}
	if activeProducts+1 > int64(plan.ProductsLimit) {
		_ = GetMetricsService().Increment(MetricShopPlanLimitBlockTotal, 1)
		return ErrShopProductLimitReached
	}
	return nil
}

func (s *ShopPlanService) ExpireAndSync(now time.Time) (int, error) {
	now = now.UTC()
	var affected []models.ShopSubscription
	if err := s.db.Where("status = ? AND ends_at <= ?", models.ShopSubscriptionStatusActive, now).Find(&affected).Error; err != nil {
		return 0, err
	}
	if len(affected) == 0 {
		return 0, nil
	}

	result := s.db.Model(&models.ShopSubscription{}).
		Where("status = ? AND ends_at <= ?", models.ShopSubscriptionStatusActive, now).
		Updates(map[string]interface{}{"status": models.ShopSubscriptionStatusExpired, "updated_at": now})
	if result.Error != nil {
		return 0, result.Error
	}

	basic, err := s.findActivePlan(models.ShopPlanCodeBasic)
	if err != nil {
		return 0, err
	}
	for _, sub := range affected {
		_ = s.syncShopPlanCache(sub.ShopID, basic)
	}

	return int(result.RowsAffected), nil
}

func StartShopSubscriptionScheduler(walletService *WalletService) {
	if GlobalScheduler == nil {
		return
	}
	service := NewShopPlanService(walletService)
	GlobalScheduler.RegisterTask("shop_subscription_expiry", 10, func() {
		if _, err := service.ExpireAndSync(time.Now().UTC()); err != nil {
			fmt.Printf("[ShopPlanService] expire_and_sync_error=%v\n", err)
		}
	})
}

func (s *ShopPlanService) syncShopPlanCache(shopID uint, plan *models.ShopPlanTariff) error {
	if plan == nil {
		return nil
	}
	return s.db.Model(&models.Shop{}).Where("id = ?", shopID).Updates(map[string]interface{}{
		"current_plan_code":  plan.Code,
		"plan_priority_rank": plan.PriorityRank,
	}).Error
}

func (s *ShopPlanService) findActivePlan(code models.ShopPlanCode) (*models.ShopPlanTariff, error) {
	var plan models.ShopPlanTariff
	if err := s.db.Where("code = ? AND is_active = ?", code, true).First(&plan).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopPlanNotFound
		}
		return nil, err
	}
	return &plan, nil
}

func (s *ShopPlanService) getIntSetting(key string, fallback int) int {
	value := strings.TrimSpace("")
	if s.db != nil {
		var setting models.SystemSetting
		if err := s.db.Where("key = ?", key).First(&setting).Error; err == nil {
			value = strings.TrimSpace(setting.Value)
		}
	}
	if value == "" {
		value = strings.TrimSpace(os.Getenv(key))
	}
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	if parsed < 0 {
		return fallback
	}
	return parsed
}

func (s *ShopPlanService) planTitle(code models.ShopPlanCode) string {
	switch code {
	case models.ShopPlanCodeBasic:
		return "Basic"
	case models.ShopPlanCodePro:
		return "Pro Shop"
	case models.ShopPlanCodePlus:
		return "Plus Shop"
	default:
		return strings.TrimSpace(string(code))
	}
}
