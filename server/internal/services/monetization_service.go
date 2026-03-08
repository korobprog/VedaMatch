package services

import (
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

const (
	MonetizationSourceDB     = "db"
	MonetizationSourceLegacy = "legacy_system_settings"
	MonetizationSourceSeed   = "seed_fallback"
)

type MonetizationOverview struct {
	Sections []MonetizationSection `json:"sections"`
}

type MonetizationSection struct {
	SectionCode   string               `json:"sectionCode"`
	Title         string               `json:"title"`
	Status        string               `json:"status"`
	Source        string               `json:"source"`
	Editable      bool                 `json:"editable"`
	LastUpdatedAt *time.Time           `json:"lastUpdatedAt,omitempty"`
	Items         []MonetizationItem   `json:"items"`
	Actions       []MonetizationAction `json:"actions,omitempty"`
}

type MonetizationItem struct {
	Key   string         `json:"key"`
	Label string         `json:"label"`
	Value any            `json:"value,omitempty"`
	Meta  map[string]any `json:"meta,omitempty"`
}

type MonetizationAction struct {
	Label string `json:"label"`
	Path  string `json:"path"`
	Kind  string `json:"kind"`
}

type ServiceTariffSummary struct {
	TariffID         uint   `json:"tariffId"`
	ServiceID        uint   `json:"serviceId"`
	ServiceTitle     string `json:"serviceTitle"`
	ServiceStatus    string `json:"serviceStatus"`
	OwnerID          uint   `json:"ownerId"`
	OwnerDisplayName string `json:"ownerDisplayName"`
	TariffName       string `json:"tariffName"`
	Price            int    `json:"price"`
	Currency         string `json:"currency"`
	DurationMinutes  int    `json:"durationMinutes"`
	SessionsCount    int    `json:"sessionsCount"`
	ValidityDays     int    `json:"validityDays"`
	IsActive         bool   `json:"isActive"`
	IsDefault        bool   `json:"isDefault"`
}

type MonetizationProUpdateRequest struct {
	Plans []models.ProPlanConfig `json:"plans"`
}

type MonetizationChatTranscribeUpdateRequest struct {
	IsEnabled               bool `json:"isEnabled"`
	FreeMinPerWeek          int  `json:"freeMinPerWeek"`
	PricePerMinLkm          int  `json:"pricePerMinLkm"`
	LongAudioThresholdMin   int  `json:"longAudioThresholdMin"`
	LongAudioPricePerMinLkm int  `json:"longAudioPricePerMinLkm"`
	MinChargeLkm            int  `json:"minChargeLkm"`
}

type MonetizationYatraBillingUpdateRequest struct {
	IsEnabled   bool `json:"isEnabled"`
	DailyFeeLkm int  `json:"dailyFeeLkm"`
}

type MonetizationServiceFeeUpdateRequest struct {
	IsEnabled      bool `json:"isEnabled"`
	PercentBps     int  `json:"percentBps"`
	CapLkm         int  `json:"capLkm"`
	ApplyNoShow    bool `json:"applyNoShow"`
	RolloutPercent int  `json:"rolloutPercent"`
}

type MonetizationMarketFeeUpdateRequest struct {
	IsEnabled      bool       `json:"isEnabled"`
	PercentBps     int        `json:"percentBps"`
	CapLkm         int        `json:"capLkm"`
	EffectiveFrom  *time.Time `json:"effectiveFrom"`
	RolloutPercent int        `json:"rolloutPercent"`
}

type MonetizationCafeFeeUpdateRequest struct {
	IsEnabled      bool       `json:"isEnabled"`
	PercentBps     int        `json:"percentBps"`
	CapLkm         int        `json:"capLkm"`
	MinOrderLkm    int        `json:"minOrderLkm"`
	EffectiveFrom  *time.Time `json:"effectiveFrom"`
	RolloutPercent int        `json:"rolloutPercent"`
}

type MonetizationShopPlansUpdateRequest struct {
	Plans []models.ShopPlanTariff `json:"plans"`
}

type MonetizationShopPromotionsUpdateRequest struct {
	Tariffs []models.ShopPromotionTariff `json:"tariffs"`
}

type MonetizationService struct {
	db         *gorm.DB
	lkmService *LKMTopupService
}

func NewMonetizationService() *MonetizationService {
	return &MonetizationService{
		db:         database.DB,
		lkmService: NewLKMTopupService(),
	}
}

func (s *MonetizationService) GetOverview() (*MonetizationOverview, error) {
	sections := make([]MonetizationSection, 0, 10)

	lkmSection, err := s.buildLKMSection()
	if err != nil {
		return nil, err
	}
	sections = append(sections, lkmSection)

	sections = append(sections,
		s.buildProSection(),
		s.buildServiceFeeSection(),
		s.buildMarketFeeSection(),
		s.buildCafeFeeSection(),
		s.buildShopPlansSection(),
		s.buildShopPromotionsSection(),
		s.buildChatTranscribeSection(),
		s.buildYatraBillingSection(),
		s.buildServiceTariffsSection(),
	)

	return &MonetizationOverview{Sections: sections}, nil
}

func (s *MonetizationService) ListServiceTariffs(serviceID uint, ownerID uint, active *bool, search string) ([]ServiceTariffSummary, error) {
	query := s.db.Table("service_tariffs AS st").
		Select(`
			st.id AS tariff_id,
			st.service_id,
			s.title AS service_title,
			s.status AS service_status,
			s.owner_id,
			COALESCE(NULLIF(u.spiritual_name, ''), NULLIF(u.karmic_name, ''), u.email) AS owner_display_name,
			st.name AS tariff_name,
			st.price,
			st.currency,
			st.duration_minutes,
			st.sessions_count,
			st.validity_days,
			st.is_active,
			st.is_default
		`).
		Joins("JOIN services s ON s.id = st.service_id").
		Joins("JOIN users u ON u.id = s.owner_id").
		Where("st.deleted_at IS NULL AND s.deleted_at IS NULL")

	if serviceID > 0 {
		query = query.Where("st.service_id = ?", serviceID)
	}
	if ownerID > 0 {
		query = query.Where("s.owner_id = ?", ownerID)
	}
	if active != nil {
		query = query.Where("st.is_active = ?", *active)
	}
	if trimmed := strings.TrimSpace(search); trimmed != "" {
		like := "%" + strings.ToLower(trimmed) + "%"
		query = query.Where("LOWER(s.title) LIKE ? OR LOWER(st.name) LIKE ? OR LOWER(COALESCE(u.spiritual_name, u.karmic_name, u.email)) LIKE ?", like, like, like)
	}

	var items []ServiceTariffSummary
	err := query.Order("s.title ASC, st.is_default DESC, st.sort_order ASC, st.price ASC").Scan(&items).Error
	return items, err
}

func (s *MonetizationService) UpdateProConfig(adminID uint, req MonetizationProUpdateRequest) error {
	if len(req.Plans) == 0 {
		return gorm.ErrInvalidData
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		seen := make(map[string]struct{}, len(req.Plans))
		for _, item := range req.Plans {
			code := strings.TrimSpace(item.Code)
			title := strings.TrimSpace(item.Title)
			if code == "" || title == "" || item.Days <= 0 || item.PriceLkm < 0 {
				return gorm.ErrInvalidData
			}
			seen[code] = struct{}{}
			payload := models.ProPlanConfig{
				Code:      code,
				Days:      item.Days,
				PriceLkm:  item.PriceLkm,
				Title:     title,
				Badge:     strings.TrimSpace(item.Badge),
				IsPopular: item.IsPopular,
				IsEnabled: item.IsEnabled,
				UpdatedBy: &adminID,
			}
			if err := tx.Where("code = ?", code).Assign(payload).FirstOrCreate(&models.ProPlanConfig{}).Error; err != nil {
				return err
			}
		}
		var existing []models.ProPlanConfig
		if err := tx.Find(&existing).Error; err != nil {
			return err
		}
		for _, item := range existing {
			if _, ok := seen[item.Code]; !ok {
				if err := tx.Model(&models.ProPlanConfig{}).Where("id = ?", item.ID).Update("is_enabled", false).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (s *MonetizationService) UpdateChatTranscribeConfig(adminID uint, req MonetizationChatTranscribeUpdateRequest) error {
	payload := models.ChatTranscribeBillingConfigModel{
		SingletonKey:            "default",
		IsEnabled:               req.IsEnabled,
		FreeMinPerWeek:          req.FreeMinPerWeek,
		PricePerMinLkm:          req.PricePerMinLkm,
		LongAudioThresholdMin:   req.LongAudioThresholdMin,
		LongAudioPricePerMinLkm: req.LongAudioPricePerMinLkm,
		MinChargeLkm:            req.MinChargeLkm,
		UpdatedBy:               &adminID,
	}
	return s.db.Where("singleton_key = ?", "default").Assign(payload).FirstOrCreate(&models.ChatTranscribeBillingConfigModel{}).Error
}

func (s *MonetizationService) UpdateYatraBillingConfig(adminID uint, req MonetizationYatraBillingUpdateRequest) error {
	payload := models.YatraBillingConfigModel{
		SingletonKey: "default",
		IsEnabled:    req.IsEnabled,
		DailyFeeLkm:  req.DailyFeeLkm,
		UpdatedBy:    &adminID,
	}
	return s.db.Where("singleton_key = ?", "default").Assign(payload).FirstOrCreate(&models.YatraBillingConfigModel{}).Error
}

func (s *MonetizationService) UpdateServiceFeeConfig(adminID uint, req MonetizationServiceFeeUpdateRequest) error {
	payload := models.ServiceFeeConfigModel{
		SingletonKey:   "default",
		IsEnabled:      req.IsEnabled,
		PercentBps:     req.PercentBps,
		CapLkm:         req.CapLkm,
		ApplyNoShow:    req.ApplyNoShow,
		RolloutPercent: req.RolloutPercent,
		UpdatedBy:      &adminID,
	}
	return s.db.Where("singleton_key = ?", "default").Assign(payload).FirstOrCreate(&models.ServiceFeeConfigModel{}).Error
}

func (s *MonetizationService) UpdateMarketFeeConfig(adminID uint, req MonetizationMarketFeeUpdateRequest) error {
	payload := models.MarketFeeConfigModel{
		SingletonKey:   "default",
		IsEnabled:      req.IsEnabled,
		PercentBps:     req.PercentBps,
		CapLkm:         req.CapLkm,
		EffectiveFrom:  req.EffectiveFrom,
		RolloutPercent: req.RolloutPercent,
		UpdatedBy:      &adminID,
	}
	return s.db.Where("singleton_key = ?", "default").Assign(payload).FirstOrCreate(&models.MarketFeeConfigModel{}).Error
}

func (s *MonetizationService) UpdateCafeFeeConfig(adminID uint, req MonetizationCafeFeeUpdateRequest) error {
	payload := models.CafeFeeConfigModel{
		SingletonKey:   "default",
		IsEnabled:      req.IsEnabled,
		PercentBps:     req.PercentBps,
		CapLkm:         req.CapLkm,
		MinOrderLkm:    req.MinOrderLkm,
		EffectiveFrom:  req.EffectiveFrom,
		RolloutPercent: req.RolloutPercent,
		UpdatedBy:      &adminID,
	}
	return s.db.Where("singleton_key = ?", "default").Assign(payload).FirstOrCreate(&models.CafeFeeConfigModel{}).Error
}

func (s *MonetizationService) UpdateShopPlans(adminID uint, req MonetizationShopPlansUpdateRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range req.Plans {
			code := strings.TrimSpace(string(item.Code))
			if code == "" || item.PriceLkm < 0 || item.ProductsLimit < 0 {
				return gorm.ErrInvalidData
			}
			payload := models.ShopPlanTariff{
				Code:          item.Code,
				PriceLkm:      item.PriceLkm,
				ProductsLimit: item.ProductsLimit,
				PriorityRank:  item.PriorityRank,
				PromoSlots:    item.PromoSlots,
				IsActive:      item.IsActive,
				UpdatedBy:     &adminID,
			}
			if err := tx.Where("code = ?", item.Code).Assign(payload).FirstOrCreate(&models.ShopPlanTariff{}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *MonetizationService) UpdateShopPromotions(adminID uint, req MonetizationShopPromotionsUpdateRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range req.Tariffs {
			code := strings.TrimSpace(string(item.Code))
			if code == "" || item.PriceLkm < 0 || item.DurationMinutes <= 0 {
				return gorm.ErrInvalidData
			}
			payload := models.ShopPromotionTariff{
				Code:            item.Code,
				Scope:           item.Scope,
				PriceLkm:        item.PriceLkm,
				DurationMinutes: item.DurationMinutes,
				IsActive:        item.IsActive,
				UpdatedBy:       &adminID,
			}
			if err := tx.Where("code = ?", item.Code).Assign(payload).FirstOrCreate(&models.ShopPromotionTariff{}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *MonetizationService) buildLKMSection() (MonetizationSection, error) {
	cfg, err := s.lkmService.GetAdminConfig()
	if err != nil {
		return MonetizationSection{}, err
	}
	return MonetizationSection{
		SectionCode: "lkm_topup",
		Title:       "LKM Top-up",
		Status:      "active",
		Source:      MonetizationSourceDB,
		Editable:    true,
		Items: []MonetizationItem{
			{Key: "nominal_rate", Label: "Nominal rate", Value: cfg.GlobalConfig.NominalRubPerLKM},
			{Key: "gateways", Label: "Gateways", Value: cfg.Gateways},
			{Key: "regions", Label: "Region configs", Value: cfg.RegionConfigs},
			{Key: "packages", Label: "Packages", Value: cfg.Packages},
			{Key: "processing_costs", Label: "Processing costs", Value: cfg.ProcessingCosts},
			{Key: "fx_rates", Label: "FX rates", Value: cfg.FXRates},
			{Key: "risk_tiers", Label: "Risk tiers", Value: cfg.RiskTiers},
		},
		Actions: []MonetizationAction{
			{Label: "Open LKM config", Path: "/payments", Kind: "route"},
		},
	}, nil
}

func (s *MonetizationService) buildProSection() MonetizationSection {
	var rows []models.ProPlanConfig
	source := MonetizationSourceSeed
	if err := s.db.Order("days ASC, id ASC").Find(&rows).Error; err == nil && len(rows) > 0 {
		source = MonetizationSourceDB
	}
	plans := make([]MonetizationItem, 0, len(rows))
	var lastUpdated *time.Time
	active := false
	for _, item := range rows {
		if lastUpdated == nil || item.UpdatedAt.After(*lastUpdated) {
			t := item.UpdatedAt
			lastUpdated = &t
		}
		if item.IsEnabled {
			active = true
		}
		plans = append(plans, MonetizationItem{
			Key:   item.Code,
			Label: item.Title,
			Value: item.PriceLkm,
			Meta: map[string]any{
				"days":      item.Days,
				"badge":     item.Badge,
				"isPopular": item.IsPopular,
				"isEnabled": item.IsEnabled,
			},
		})
	}
	return MonetizationSection{
		SectionCode:   "pro",
		Title:         "PRO",
		Status:        ternaryStatus(active, len(rows) > 0),
		Source:        source,
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items:         plans,
	}
}

func (s *MonetizationService) buildChatTranscribeSection() MonetizationSection {
	cfg := ResolveChatTranscribeBillingConfig()
	var lastUpdated *time.Time
	if cfg.ConfigSource == MonetizationSourceDB {
		var model models.ChatTranscribeBillingConfigModel
		if err := s.db.Where("singleton_key = ?", "default").First(&model).Error; err == nil {
			t := model.UpdatedAt
			lastUpdated = &t
		}
	}
	return MonetizationSection{
		SectionCode:   "chat_transcribe",
		Title:         "Chat Transcribe",
		Status:        ternaryStatus(cfg.Enabled, true),
		Source:        mapConfigSource(cfg.ConfigSource),
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items: []MonetizationItem{
			{Key: "enabled", Label: "Enabled", Value: cfg.Enabled},
			{Key: "free_min_per_week", Label: "Free min / week", Value: cfg.FreeMinPerWeek},
			{Key: "price_per_min_lkm", Label: "Price per min (LKM)", Value: cfg.PricePerMinLKM},
			{Key: "long_audio_threshold_min", Label: "Long audio threshold", Value: cfg.LongAudioThresholdMin},
			{Key: "long_audio_price_per_min_lkm", Label: "Long audio price / min", Value: cfg.LongAudioPricePerMinLKM},
			{Key: "min_charge_lkm", Label: "Min charge", Value: cfg.MinChargeLKM},
		},
	}
}

func (s *MonetizationService) buildYatraBillingSection() MonetizationSection {
	cfg := NewYatraService(s.db, nil).loadYatraBillingConfig()
	var lastUpdated *time.Time
	var source string
	var model models.YatraBillingConfigModel
	if err := s.db.Where("singleton_key = ?", "default").First(&model).Error; err == nil {
		t := model.UpdatedAt
		lastUpdated = &t
		source = MonetizationSourceDB
	} else if hasSystemSetting(s.db, "YATRA_BILLING_ENABLED") || hasSystemSetting(s.db, "YATRA_DAILY_FEE_LKM") {
		source = MonetizationSourceLegacy
	} else {
		source = MonetizationSourceSeed
	}
	return MonetizationSection{
		SectionCode:   "yatra_billing",
		Title:         "Yatra Billing",
		Status:        ternaryStatus(cfg.Enabled, true),
		Source:        source,
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items: []MonetizationItem{
			{Key: "enabled", Label: "Enabled", Value: cfg.Enabled},
			{Key: "daily_fee_lkm", Label: "Daily fee (LKM)", Value: cfg.DailyFeeLkm},
		},
	}
}

func (s *MonetizationService) buildServiceFeeSection() MonetizationSection {
	cfg := ResolveServiceFeeConfig()
	lastUpdated := s.singletonUpdatedAt(&models.ServiceFeeConfigModel{})
	return MonetizationSection{
		SectionCode:   "services_fee",
		Title:         "Services Fee",
		Status:        ternaryStatus(cfg.Enabled, true),
		Source:        mapConfigSource(cfg.ConfigSource),
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items: []MonetizationItem{
			{Key: "enabled", Label: "Enabled", Value: cfg.Enabled},
			{Key: "percent_bps", Label: "Percent (bps)", Value: cfg.PercentBps},
			{Key: "cap_lkm", Label: "Cap (LKM)", Value: cfg.CapLkm},
			{Key: "apply_no_show", Label: "Apply no-show", Value: cfg.ApplyNoShow},
			{Key: "rollout_percent", Label: "Rollout %", Value: cfg.RolloutPercent},
		},
	}
}

func (s *MonetizationService) buildMarketFeeSection() MonetizationSection {
	cfg := ResolveMarketFeeConfig()
	lastUpdated := s.singletonUpdatedAt(&models.MarketFeeConfigModel{})
	return MonetizationSection{
		SectionCode:   "market_fee",
		Title:         "Market Fee",
		Status:        ternaryStatus(cfg.Enabled, true),
		Source:        mapConfigSource(cfg.ConfigSource),
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items: []MonetizationItem{
			{Key: "enabled", Label: "Enabled", Value: cfg.Enabled},
			{Key: "percent_bps", Label: "Percent (bps)", Value: cfg.PercentBps},
			{Key: "cap_lkm", Label: "Cap (LKM)", Value: cfg.CapLkm},
			{Key: "rollout_percent", Label: "Rollout %", Value: cfg.RolloutPercent},
			{Key: "effective_from", Label: "Effective from", Value: cfg.EffectiveFrom},
		},
	}
}

func (s *MonetizationService) buildCafeFeeSection() MonetizationSection {
	cfg := ResolveCafeFeeConfig()
	lastUpdated := s.singletonUpdatedAt(&models.CafeFeeConfigModel{})
	return MonetizationSection{
		SectionCode:   "cafe_fee",
		Title:         "Cafe Fee",
		Status:        ternaryStatus(cfg.Enabled, true),
		Source:        mapConfigSource(cfg.ConfigSource),
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items: []MonetizationItem{
			{Key: "enabled", Label: "Enabled", Value: cfg.Enabled},
			{Key: "percent_bps", Label: "Percent (bps)", Value: cfg.PercentBps},
			{Key: "cap_lkm", Label: "Cap (LKM)", Value: cfg.CapLkm},
			{Key: "min_order_lkm", Label: "Min order (LKM)", Value: cfg.MinOrderLkm},
			{Key: "rollout_percent", Label: "Rollout %", Value: cfg.RolloutPercent},
			{Key: "effective_from", Label: "Effective from", Value: cfg.EffectiveFrom},
		},
	}
}

func (s *MonetizationService) buildShopPlansSection() MonetizationSection {
	var items []models.ShopPlanTariff
	_ = s.db.Order("priority_rank ASC, code ASC").Find(&items).Error
	sectionItems := make([]MonetizationItem, 0, len(items))
	var active bool
	var lastUpdated *time.Time
	for _, item := range items {
		if lastUpdated == nil || item.UpdatedAt.After(*lastUpdated) {
			t := item.UpdatedAt
			lastUpdated = &t
		}
		if item.IsActive {
			active = true
		}
		sectionItems = append(sectionItems, MonetizationItem{
			Key:   string(item.Code),
			Label: string(item.Code),
			Value: item.PriceLkm,
			Meta: map[string]any{
				"productsLimit": item.ProductsLimit,
				"priorityRank":  item.PriorityRank,
				"promoSlots":    item.PromoSlots,
				"isActive":      item.IsActive,
			},
		})
	}
	return MonetizationSection{
		SectionCode:   "shop_plans",
		Title:         "Shop Plans",
		Status:        ternaryStatus(active, len(items) > 0),
		Source:        MonetizationSourceDB,
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items:         sectionItems,
	}
}

func (s *MonetizationService) buildShopPromotionsSection() MonetizationSection {
	var items []models.ShopPromotionTariff
	_ = s.db.Order("scope ASC, code ASC").Find(&items).Error
	sectionItems := make([]MonetizationItem, 0, len(items))
	var active bool
	var lastUpdated *time.Time
	for _, item := range items {
		if lastUpdated == nil || item.UpdatedAt.After(*lastUpdated) {
			t := item.UpdatedAt
			lastUpdated = &t
		}
		if item.IsActive {
			active = true
		}
		sectionItems = append(sectionItems, MonetizationItem{
			Key:   string(item.Code),
			Label: string(item.Code),
			Value: item.PriceLkm,
			Meta: map[string]any{
				"scope":           item.Scope,
				"durationMinutes": item.DurationMinutes,
				"isActive":        item.IsActive,
			},
		})
	}
	return MonetizationSection{
		SectionCode:   "shop_promotions",
		Title:         "Shop Promotions",
		Status:        ternaryStatus(active, len(items) > 0),
		Source:        MonetizationSourceDB,
		Editable:      true,
		LastUpdatedAt: lastUpdated,
		Items:         sectionItems,
	}
}

func (s *MonetizationService) buildServiceTariffsSection() MonetizationSection {
	items, _ := s.ListServiceTariffs(0, 0, nil, "")
	return MonetizationSection{
		SectionCode: "service_tariffs_summary",
		Title:       "Services Tariffs Summary",
		Status:      ternaryStatus(len(items) > 0, len(items) > 0),
		Source:      MonetizationSourceDB,
		Editable:    false,
		Items: []MonetizationItem{
			{Key: "count", Label: "Tariffs count", Value: len(items)},
		},
		Actions: []MonetizationAction{
			{Label: "Manage inside service cards", Path: "/settings", Kind: "info"},
		},
	}
}

func ternaryStatus(active bool, exists bool) string {
	if !exists {
		return "needs_migration"
	}
	if active {
		return "active"
	}
	return "disabled"
}

func mapConfigSource(source string) string {
	switch strings.TrimSpace(source) {
	case MonetizationSourceDB:
		return MonetizationSourceDB
	case "env":
		return MonetizationSourceLegacy
	case "none", "default", "":
		return MonetizationSourceSeed
	default:
		return MonetizationSourceLegacy
	}
}

func hasSystemSetting(db *gorm.DB, key string) bool {
	if db == nil {
		return false
	}
	var count int64
	if err := db.Model(&models.SystemSetting{}).Where("key = ?", key).Count(&count).Error; err != nil {
		return false
	}
	return count > 0
}

func (s *MonetizationService) singletonUpdatedAt(model any) *time.Time {
	if s.db == nil {
		return nil
	}
	type updatedModel struct {
		UpdatedAt time.Time
	}
	var row updatedModel
	if err := s.db.Model(model).Select("updated_at").Order("updated_at DESC").Limit(1).Scan(&row).Error; err != nil || row.UpdatedAt.IsZero() {
		return nil
	}
	t := row.UpdatedAt
	return &t
}
