package database

import (
	"log"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

func SeedLKMTopup() {
	if DB == nil {
		return
	}
	if err := SeedLKMTopupWithDB(DB); err != nil {
		log.Printf("[Seed][LKMTopup] failed: %v", err)
	}
}

func SeedLKMTopupWithDB(db *gorm.DB) error {
	if err := db.Where("singleton_key = ?", "default").
		Assign(models.LKMTopupGlobalConfig{
			NominalRubPerLKM: 1,
		}).
		FirstOrCreate(&models.LKMTopupGlobalConfig{}, models.LKMTopupGlobalConfig{SingletonKey: "default"}).Error; err != nil {
		return err
	}

	defaultGateways := []models.LKMPaymentGateway{
		{Code: "yookassa", Name: "YooKassa", IsEnabled: true},
		{Code: "stripe", Name: "Stripe", IsEnabled: true},
	}
	for _, gateway := range defaultGateways {
		if err := db.Where("code = ?", gateway.Code).
			Assign(models.LKMPaymentGateway{
				Code:      gateway.Code,
				Name:      gateway.Name,
				IsEnabled: gateway.IsEnabled,
			}).
			FirstOrCreate(&models.LKMPaymentGateway{}, models.LKMPaymentGateway{Code: gateway.Code}).Error; err != nil {
			return err
		}
	}

	regionConfigs := []models.LKMRegionConfig{
		{Region: models.LKMRegionCIS, CustomMinLKM: 199, CustomMaxLKM: 450000, CustomStepLKM: 50},
		{Region: models.LKMRegionNonCIS, CustomMinLKM: 499, CustomMaxLKM: 450000, CustomStepLKM: 50},
	}
	for _, cfg := range regionConfigs {
		if err := db.Where("region = ?", cfg.Region).
			Assign(models.LKMRegionConfig{
				Region:        cfg.Region,
				CustomMinLKM:  cfg.CustomMinLKM,
				CustomMaxLKM:  cfg.CustomMaxLKM,
				CustomStepLKM: cfg.CustomStepLKM,
			}).
			FirstOrCreate(&models.LKMRegionConfig{}, models.LKMRegionConfig{Region: cfg.Region}).Error; err != nil {
			return err
		}
	}

	cisPackages := []int{199, 499, 999, 1999, 3999}
	nonCisPackages := []int{499, 999, 1999, 3999}
	for idx, amount := range cisPackages {
		if err := upsertLKMPackage(db, models.LKMRegionCIS, amount, idx+1); err != nil {
			return err
		}
	}
	for idx, amount := range nonCisPackages {
		if err := upsertLKMPackage(db, models.LKMRegionNonCIS, amount, idx+1); err != nil {
			return err
		}
	}

	defaultCosts := []models.LKMPaymentProcessingCost{
		{GatewayCode: "yookassa", PaymentMethod: "default", Region: models.LKMRegionCIS, Percent: 0, FixedRub: 0, IsEnabled: true},
		{GatewayCode: "stripe", PaymentMethod: "default", Region: models.LKMRegionNonCIS, Percent: 0, FixedRub: 0, IsEnabled: true},
	}
	for _, cost := range defaultCosts {
		if err := db.Where("gateway_code = ? AND payment_method = ? AND region = ?", cost.GatewayCode, cost.PaymentMethod, cost.Region).
			Assign(models.LKMPaymentProcessingCost{
				GatewayCode:   cost.GatewayCode,
				PaymentMethod: cost.PaymentMethod,
				Region:        cost.Region,
				Percent:       cost.Percent,
				FixedRub:      cost.FixedRub,
				IsEnabled:     cost.IsEnabled,
			}).
			FirstOrCreate(&models.LKMPaymentProcessingCost{}, models.LKMPaymentProcessingCost{
				GatewayCode:   cost.GatewayCode,
				PaymentMethod: cost.PaymentMethod,
				Region:        cost.Region,
			}).Error; err != nil {
			return err
		}
	}

	if err := db.Where("currency = ?", "RUB").
		Assign(models.LKMManualFXRate{
			Currency:   "RUB",
			RubPerUnit: 1,
			IsActive:   true,
		}).
		FirstOrCreate(&models.LKMManualFXRate{}, models.LKMManualFXRate{Currency: "RUB"}).Error; err != nil {
		return err
	}

	riskTiers := []models.LKMTopupRiskTier{
		{
			Name:      "auto_small",
			Action:    models.LKMRiskActionAuto,
			MinLKM:    199,
			MaxLKM:    49950,
			SortOrder: 1,
			IsEnabled: true,
		},
		{
			Name:      "enhanced_medium",
			Action:    models.LKMRiskActionEnhanced,
			MinLKM:    50000,
			MaxLKM:    149950,
			SortOrder: 2,
			IsEnabled: true,
		},
		{
			Name:      "manual_large",
			Action:    models.LKMRiskActionManual,
			MinLKM:    150000,
			MaxLKM:    450000,
			SortOrder: 3,
			IsEnabled: true,
		},
	}
	for _, tier := range riskTiers {
		if err := db.Where("name = ?", tier.Name).
			Assign(models.LKMTopupRiskTier{
				Name:      tier.Name,
				Action:    tier.Action,
				MinLKM:    tier.MinLKM,
				MaxLKM:    tier.MaxLKM,
				SortOrder: tier.SortOrder,
				IsEnabled: tier.IsEnabled,
			}).
			FirstOrCreate(&models.LKMTopupRiskTier{}, models.LKMTopupRiskTier{Name: tier.Name}).Error; err != nil {
			return err
		}
	}

	return nil
}

func upsertLKMPackage(db *gorm.DB, region models.LKMRegion, amount int, order int) error {
	return db.Where("region = ? AND lkm_amount = ?", region, amount).
		Assign(models.LKMPackageConfig{
			Region:    region,
			LKMAmount: amount,
			SortOrder: order,
			IsActive:  true,
		}).
		FirstOrCreate(&models.LKMPackageConfig{}, models.LKMPackageConfig{
			Region:    region,
			LKMAmount: amount,
		}).Error
}
