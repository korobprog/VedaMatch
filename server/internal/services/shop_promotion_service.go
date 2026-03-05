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

var (
	ErrShopPromotionTariffNotFound = errors.New("shop promotion tariff not found")
	ErrShopPromotionForbidden      = errors.New("forbidden")
)

type ShopPromotionService struct {
	db     *gorm.DB
	wallet *WalletService
}

type PromotionPurchaseResult struct {
	ChargedLkm    int       `json:"chargedLkm"`
	BalanceBefore int       `json:"balanceBefore"`
	BalanceAfter  int       `json:"balanceAfter"`
	StartsAt      time.Time `json:"startsAt"`
	EndsAt        time.Time `json:"endsAt"`
}

func NewShopPromotionService(walletService *WalletService) *ShopPromotionService {
	if walletService == nil {
		walletService = NewWalletService()
	}
	return &ShopPromotionService{db: database.DB, wallet: walletService}
}

func (s *ShopPromotionService) EnsureDefaultTariffs() error {
	defaults := []models.ShopPromotionTariff{
		{
			Code:            models.ShopPromotionTariffCodeProduct24h,
			Scope:           models.ShopPromotionScopeProduct,
			PriceLkm:        s.getIntSetting("SHOP_PRODUCT_PROMO_24H_PRICE_LKM", 15),
			DurationMinutes: s.getIntSetting("SHOP_PRODUCT_PROMO_24H_DURATION_MIN", 1440),
			IsActive:        true,
		},
		{
			Code:            models.ShopPromotionTariffCodeProduct7d,
			Scope:           models.ShopPromotionScopeProduct,
			PriceLkm:        s.getIntSetting("SHOP_PRODUCT_PROMO_7D_PRICE_LKM", 60),
			DurationMinutes: s.getIntSetting("SHOP_PRODUCT_PROMO_7D_DURATION_MIN", 10080),
			IsActive:        true,
		},
		{
			Code:            models.ShopPromotionTariffCodeProduct30d,
			Scope:           models.ShopPromotionScopeProduct,
			PriceLkm:        s.getIntSetting("SHOP_PRODUCT_PROMO_30D_PRICE_LKM", 180),
			DurationMinutes: s.getIntSetting("SHOP_PRODUCT_PROMO_30D_DURATION_MIN", 43200),
			IsActive:        true,
		},
		{
			Code:            models.ShopPromotionTariffCodeCity24h,
			Scope:           models.ShopPromotionScopeCity,
			PriceLkm:        s.getIntSetting("SHOP_GEO_BOOST_24H_PRICE_LKM", 20),
			DurationMinutes: s.getIntSetting("SHOP_GEO_BOOST_24H_DURATION_MIN", 1440),
			IsActive:        true,
		},
	}

	for _, item := range defaults {
		var existing models.ShopPromotionTariff
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

func (s *ShopPromotionService) ListTariffs() ([]models.ShopPromotionTariff, error) {
	var tariffs []models.ShopPromotionTariff
	err := s.db.Where("is_active = ?", true).Order("scope ASC, code ASC").Find(&tariffs).Error
	return tariffs, err
}

func (s *ShopPromotionService) PromoteProduct(productID uint, ownerID uint, tariffCode models.ShopPromotionTariffCode) (*PromotionPurchaseResult, error) {
	var product models.Product
	if err := s.db.Select("id", "shop_id").First(&product, productID).Error; err != nil {
		return nil, err
	}
	var shop models.Shop
	if err := s.db.Select("id", "owner_id").First(&shop, product.ShopID).Error; err != nil {
		return nil, err
	}
	if shop.OwnerID != ownerID {
		return nil, ErrShopPromotionForbidden
	}

	tariff, err := s.getActiveTariff(tariffCode)
	if err != nil {
		return nil, err
	}
	if tariff.Scope != models.ShopPromotionScopeProduct {
		return nil, errors.New("invalid tariff scope")
	}

	now := time.Now().UTC()
	startAt := now
	var last models.ProductPromotion
	err = s.db.Where("product_id = ? AND status = ?", productID, models.ShopPromotionStatusActive).
		Order("ends_at DESC").First(&last).Error
	if err == nil && last.EndsAt.After(now) {
		startAt = last.EndsAt
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	endAt := startAt.Add(time.Duration(tariff.DurationMinutes) * time.Minute)

	walletBefore, err := s.wallet.GetOrCreateWallet(ownerID)
	if err != nil {
		return nil, err
	}
	charged := tariff.PriceLkm
	dedupKey := fmt.Sprintf("shop_product_promo:%d:%s:%d", productID, tariff.Code, time.Now().UnixNano())
	if charged > 0 {
		if spendErr := s.wallet.Spend(ownerID, charged, dedupKey, fmt.Sprintf("Shop product promotion: %s", tariff.Code)); spendErr != nil {
			return nil, spendErr
		}
	}

	rec := models.ProductPromotion{
		ProductID:     productID,
		ShopID:        shop.ID,
		OwnerID:       ownerID,
		Status:        models.ShopPromotionStatusActive,
		TariffCode:    tariff.Code,
		StartsAt:      startAt,
		EndsAt:        endAt,
		ChargedLkm:    charged,
		BalanceBefore: walletBefore.Balance,
		BalanceAfter:  walletBefore.Balance - charged,
		DedupKey:      dedupKey,
	}
	if err := s.db.Create(&rec).Error; err != nil {
		if charged > 0 {
			_ = s.wallet.Refund(ownerID, charged, "Shop product promotion rollback", nil)
		}
		return nil, err
	}

	if err := s.db.Create(&models.ShopBillingLog{
		EventType: models.ShopBillingEventProductPromoPurchase,
		ShopID:    shop.ID,
		ProductID: &productID,
		AmountLkm: charged,
		DedupKey:  dedupKey,
		MetaJSON:  fmt.Sprintf(`{"tariffCode":"%s","startsAt":"%s","endsAt":"%s"}`, tariff.Code, startAt.Format(time.RFC3339), endAt.Format(time.RFC3339)),
	}).Error; err != nil {
		return nil, err
	}
	_ = GetMetricsService().Increment(MetricShopProductPromotionsPurchasedTotal, 1)

	walletAfter, err := s.wallet.GetOrCreateWallet(ownerID)
	if err != nil {
		return nil, err
	}

	return &PromotionPurchaseResult{
		ChargedLkm:    charged,
		BalanceBefore: walletBefore.Balance,
		BalanceAfter:  walletAfter.Balance,
		StartsAt:      startAt,
		EndsAt:        endAt,
	}, nil
}

func (s *ShopPromotionService) ApplyShopGeoBoost(shopID uint, ownerID uint, tariffCode models.ShopPromotionTariffCode) (*PromotionPurchaseResult, error) {
	var shop models.Shop
	if err := s.db.Select("id", "owner_id", "city").First(&shop, shopID).Error; err != nil {
		return nil, err
	}
	if shop.OwnerID != ownerID {
		return nil, ErrShopPromotionForbidden
	}

	tariff, err := s.getActiveTariff(tariffCode)
	if err != nil {
		return nil, err
	}
	if tariff.Scope != models.ShopPromotionScopeCity {
		return nil, errors.New("invalid tariff scope")
	}

	now := time.Now().UTC()
	startAt := now
	var last models.ShopGeoBoost
	err = s.db.Where("shop_id = ? AND status = ?", shopID, models.ShopPromotionStatusActive).
		Order("ends_at DESC").First(&last).Error
	if err == nil && last.EndsAt.After(now) {
		startAt = last.EndsAt
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	endAt := startAt.Add(time.Duration(tariff.DurationMinutes) * time.Minute)

	walletBefore, err := s.wallet.GetOrCreateWallet(ownerID)
	if err != nil {
		return nil, err
	}
	charged := tariff.PriceLkm
	dedupKey := fmt.Sprintf("shop_city_boost:%d:%s:%d", shopID, tariff.Code, time.Now().UnixNano())
	if charged > 0 {
		if spendErr := s.wallet.Spend(ownerID, charged, dedupKey, fmt.Sprintf("Shop city boost: %s", tariff.Code)); spendErr != nil {
			return nil, spendErr
		}
	}

	rec := models.ShopGeoBoost{
		ShopID:        shopID,
		OwnerID:       ownerID,
		City:          strings.TrimSpace(shop.City),
		Status:        models.ShopPromotionStatusActive,
		TariffCode:    tariff.Code,
		StartsAt:      startAt,
		EndsAt:        endAt,
		ChargedLkm:    charged,
		BalanceBefore: walletBefore.Balance,
		BalanceAfter:  walletBefore.Balance - charged,
		DedupKey:      dedupKey,
	}
	if err := s.db.Create(&rec).Error; err != nil {
		if charged > 0 {
			_ = s.wallet.Refund(ownerID, charged, "Shop geo boost rollback", nil)
		}
		return nil, err
	}

	if err := s.db.Model(&models.Shop{}).Where("id = ?", shopID).Update("geo_boost_active_until", endAt).Error; err != nil {
		return nil, err
	}

	if err := s.db.Create(&models.ShopBillingLog{
		EventType: models.ShopBillingEventGeoBoostPurchase,
		ShopID:    shop.ID,
		AmountLkm: charged,
		DedupKey:  dedupKey,
		MetaJSON:  fmt.Sprintf(`{"tariffCode":"%s","city":"%s","startsAt":"%s","endsAt":"%s"}`, tariff.Code, shop.City, startAt.Format(time.RFC3339), endAt.Format(time.RFC3339)),
	}).Error; err != nil {
		return nil, err
	}
	_ = GetMetricsService().Increment(MetricShopGeoBoostsPurchasedTotal, 1)

	walletAfter, err := s.wallet.GetOrCreateWallet(ownerID)
	if err != nil {
		return nil, err
	}

	return &PromotionPurchaseResult{
		ChargedLkm:    charged,
		BalanceBefore: walletBefore.Balance,
		BalanceAfter:  walletAfter.Balance,
		StartsAt:      startAt,
		EndsAt:        endAt,
	}, nil
}

func (s *ShopPromotionService) ExpirePromotionsAndBoosts(now time.Time) (int, error) {
	now = now.UTC()
	resultPromotions := s.db.Model(&models.ProductPromotion{}).
		Where("status = ? AND ends_at <= ?", models.ShopPromotionStatusActive, now).
		Updates(map[string]interface{}{"status": models.ShopPromotionStatusExpired, "updated_at": now})
	if resultPromotions.Error != nil {
		return 0, resultPromotions.Error
	}

	var expiredBoosts []models.ShopGeoBoost
	if err := s.db.Where("status = ? AND ends_at <= ?", models.ShopPromotionStatusActive, now).Find(&expiredBoosts).Error; err != nil {
		return 0, err
	}

	resultBoosts := s.db.Model(&models.ShopGeoBoost{}).
		Where("status = ? AND ends_at <= ?", models.ShopPromotionStatusActive, now).
		Updates(map[string]interface{}{"status": models.ShopPromotionStatusExpired, "updated_at": now})
	if resultBoosts.Error != nil {
		return 0, resultBoosts.Error
	}

	for _, boost := range expiredBoosts {
		var nextActive models.ShopGeoBoost
		err := s.db.Where("shop_id = ? AND status = ? AND ends_at > ?", boost.ShopID, models.ShopPromotionStatusActive, now).
			Order("ends_at DESC").First(&nextActive).Error
		if err == nil {
			_ = s.db.Model(&models.Shop{}).Where("id = ?", boost.ShopID).Update("geo_boost_active_until", nextActive.EndsAt).Error
			continue
		}
		_ = s.db.Model(&models.Shop{}).Where("id = ?", boost.ShopID).Update("geo_boost_active_until", nil).Error
	}

	return int(resultPromotions.RowsAffected + resultBoosts.RowsAffected), nil
}

func StartShopPromotionExpiryScheduler(walletService *WalletService) {
	if GlobalScheduler == nil {
		return
	}
	service := NewShopPromotionService(walletService)
	GlobalScheduler.RegisterTask("shop_promotion_expiry", 10, func() {
		if _, err := service.ExpirePromotionsAndBoosts(time.Now().UTC()); err != nil {
			fmt.Printf("[ShopPromotionService] expire_error=%v\n", err)
		}
	})
}

func (s *ShopPromotionService) getActiveTariff(code models.ShopPromotionTariffCode) (*models.ShopPromotionTariff, error) {
	var tariff models.ShopPromotionTariff
	if err := s.db.Where("code = ? AND is_active = ?", code, true).First(&tariff).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopPromotionTariffNotFound
		}
		return nil, err
	}
	return &tariff, nil
}

func (s *ShopPromotionService) getIntSetting(key string, fallback int) int {
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
