package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrLKMTopupNotAllowedOnMobile = errors.New("top-up is not allowed on mobile")
	ErrLKMInvalidAmount           = errors.New("invalid top-up amount for selected region")
	ErrLKMQuoteExpired            = errors.New("quote is expired")
	ErrLKMQuoteNotFound           = errors.New("quote not found")
	ErrLKMQuoteAlreadyUsed        = errors.New("quote already used")
	ErrLKMUnsupportedCurrency     = errors.New("unsupported currency")
	ErrLKMGatewayDisabled         = errors.New("selected payment gateway is disabled")
	ErrLKMTopupNotFound           = errors.New("top-up not found")
)

const (
	defaultLKMQuoteTTL = 10 * time.Minute
	currencyRUB        = "RUB"
)

type LKMTopupService struct {
	db            *gorm.DB
	walletService *WalletService
	now           func() time.Time
	quoteTTL      time.Duration
}

type LKMQuoteRequest struct {
	LKMAmount         int    `json:"lkmAmount"`
	GatewayCode       string `json:"gatewayCode"`
	PaymentMethod     string `json:"paymentMethod"`
	Region            string `json:"region"`
	Currency          string `json:"currency"`
	Channel           string `json:"channel"`
	DeviceFingerprint string `json:"deviceFingerprint"`
}

type LKMQuoteResponse struct {
	QuoteID          string    `json:"quoteId"`
	ReceiveLKM       int       `json:"receiveLkm"`
	TotalPayAmount   float64   `json:"totalPayAmount"`
	PayCurrency      string    `json:"payCurrency"`
	FXRate           float64   `json:"fxRate"`
	QuoteExpiresAt   time.Time `json:"quoteExpiresAt"`
	NominalRub       float64   `json:"nominalRub"`
	NominalRubPerLKM float64   `json:"nominalRubPerLkm"`
	ProcessingRub    float64   `json:"processingCostRub"`
	TotalRub         float64   `json:"totalRub"`
	GatewayCode      string    `json:"gatewayCode"`
	PaymentMethod    string    `json:"paymentMethod"`
	Region           string    `json:"region"`
	Disclaimer       string    `json:"disclaimer"`
}

type LKMPackageView struct {
	LKMAmount        int     `json:"lkmAmount"`
	ReceiveLKM       int     `json:"receiveLkm"`
	TotalPayAmount   float64 `json:"totalPayAmount"`
	PayCurrency      string  `json:"payCurrency"`
	FXRate           float64 `json:"fxRate"`
	NominalRub       float64 `json:"nominalRub"`
	NominalRubPerLKM float64 `json:"nominalRubPerLkm"`
	ProcessingRub    float64 `json:"processingCostRub"`
	TotalRub         float64 `json:"totalRub"`
}

type LKMPackageResponse struct {
	Region           string           `json:"region"`
	Currency         string           `json:"currency"`
	GatewayCode      string           `json:"gatewayCode"`
	PaymentMethod    string           `json:"paymentMethod"`
	NominalRubPerLKM float64          `json:"nominalRubPerLkm"`
	CustomMinLKM     int              `json:"customMinLkm"`
	CustomMaxLKM     int              `json:"customMaxLkm"`
	CustomStepLKM    int              `json:"customStepLkm"`
	Packages         []LKMPackageView `json:"packages"`
	Disclaimer       string           `json:"disclaimer"`
}

type LKMCreateTopupRequest struct {
	QuoteID           string `json:"quoteId"`
	Channel           string `json:"channel"`
	DeviceFingerprint string `json:"deviceFingerprint"`
}

type LKMTopupResponse struct {
	TopupID        string    `json:"topupId"`
	QuoteID        string    `json:"quoteId"`
	Status         string    `json:"status"`
	RiskAction     string    `json:"riskAction"`
	ReceiveLKM     int       `json:"receiveLkm"`
	TotalPayAmount float64   `json:"totalPayAmount"`
	PayCurrency    string    `json:"payCurrency"`
	GatewayCode    string    `json:"gatewayCode"`
	PaymentMethod  string    `json:"paymentMethod"`
	CreatedAt      time.Time `json:"createdAt"`
}

type LKMWebhookRequest struct {
	EventID           string          `json:"eventId"`
	TopupID           string          `json:"topupId"`
	Status            string          `json:"status"`
	ExternalPaymentID string          `json:"externalPaymentId"`
	Payload           json.RawMessage `json:"payload"`
}

type LKMAdminConfig struct {
	GlobalConfig    models.LKMTopupGlobalConfig       `json:"globalConfig"`
	Gateways        []models.LKMPaymentGateway        `json:"gateways"`
	RegionConfigs   []models.LKMRegionConfig          `json:"regionConfigs"`
	Packages        []models.LKMPackageConfig         `json:"packages"`
	ProcessingCosts []models.LKMPaymentProcessingCost `json:"processingCosts"`
	FXRates         []models.LKMManualFXRate          `json:"fxRates"`
	RiskTiers       []models.LKMTopupRiskTier         `json:"riskTiers"`
}

type lkmPricing struct {
	gatewayCode       string
	paymentMethod     string
	currency          string
	fxRate            float64
	nominalRubPerLKM  float64
	nominalRub        float64
	processingCostRub float64
	totalRub          float64
	totalPayAmount    float64
}

func NewLKMTopupService() *LKMTopupService {
	return NewLKMTopupServiceWithDB(database.DB, NewWalletService())
}

func NewLKMTopupServiceWithDB(db *gorm.DB, walletService *WalletService) *LKMTopupService {
	if db == nil {
		db = database.DB
	}
	if walletService == nil {
		walletService = NewWalletService()
	}
	if db != nil {
		_ = database.SeedLKMTopupWithDB(db)
	}
	return &LKMTopupService{
		db:            db,
		walletService: walletService,
		now:           time.Now,
		quoteTTL:      defaultLKMQuoteTTL,
	}
}

func (s *LKMTopupService) ensureDB() error {
	if s.db == nil {
		return errors.New("database is not initialized")
	}
	return nil
}

func (s *LKMTopupService) defaultDisclaimer() string {
	return "В итог уже включены processing costs платежного метода"
}

func normalizeCurrency(raw string, region models.LKMRegion) string {
	currency := strings.ToUpper(strings.TrimSpace(raw))
	if currency != "" {
		return currency
	}
	if region == models.LKMRegionCIS {
		return currencyRUB
	}
	return "USD"
}

func normalizeRegion(rawRegion string, host string) models.LKMRegion {
	switch strings.ToLower(strings.TrimSpace(rawRegion)) {
	case "cis", "ru", "russia", "by", "kz", "kg", "uz", "tj", "am", "az", "md", "tm":
		return models.LKMRegionCIS
	case "non_cis", "non-cis", "noncis", "intl", "international", "global":
		return models.LKMRegionNonCIS
	}

	hostValue := strings.ToLower(strings.TrimSpace(host))
	if strings.Contains(hostValue, ".ru") {
		return models.LKMRegionCIS
	}

	return models.LKMRegionNonCIS
}

func normalizePaymentMethod(raw string) string {
	method := strings.ToLower(strings.TrimSpace(raw))
	if method == "" {
		return "default"
	}
	return method
}

func NormalizeTopupChannel(raw string) string {
	channel := strings.ToLower(strings.TrimSpace(raw))
	switch channel {
	case "mobile", "ios", "android", "native_app", "app":
		return "mobile"
	case "bot", "telegram", "telegram_bot":
		return "bot"
	case "web", "":
		return "web"
	default:
		return channel
	}
}

func IsMobileTopupChannel(raw string) bool {
	return NormalizeTopupChannel(raw) == "mobile"
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func (s *LKMTopupService) resolveGatewayTx(tx *gorm.DB, requestedCode string, region models.LKMRegion) (models.LKMPaymentGateway, error) {
	code := strings.ToLower(strings.TrimSpace(requestedCode))
	if code != "" {
		var gateway models.LKMPaymentGateway
		if err := tx.Where("code = ?", code).First(&gateway).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return models.LKMPaymentGateway{}, ErrLKMGatewayDisabled
			}
			return models.LKMPaymentGateway{}, err
		}
		if !gateway.IsEnabled {
			return models.LKMPaymentGateway{}, ErrLKMGatewayDisabled
		}
		return gateway, nil
	}

	preferred := []string{"yookassa", "stripe"}
	if region == models.LKMRegionNonCIS {
		preferred = []string{"stripe", "yookassa"}
	}
	for _, candidate := range preferred {
		var gateway models.LKMPaymentGateway
		err := tx.Where("code = ? AND is_enabled = true", candidate).First(&gateway).Error
		if err == nil {
			return gateway, nil
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return models.LKMPaymentGateway{}, err
		}
	}

	var fallback models.LKMPaymentGateway
	if err := tx.Where("is_enabled = true").Order("code ASC").First(&fallback).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.LKMPaymentGateway{}, ErrLKMGatewayDisabled
		}
		return models.LKMPaymentGateway{}, err
	}
	return fallback, nil
}

func (s *LKMTopupService) resolveProcessingCostTx(tx *gorm.DB, gatewayCode string, paymentMethod string, region models.LKMRegion) (models.LKMPaymentProcessingCost, error) {
	method := normalizePaymentMethod(paymentMethod)

	var cost models.LKMPaymentProcessingCost
	err := tx.Where(
		"gateway_code = ? AND payment_method = ? AND region = ? AND is_enabled = true",
		gatewayCode, method, region,
	).First(&cost).Error
	if err == nil {
		return cost, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.LKMPaymentProcessingCost{}, err
	}

	if method != "default" {
		err = tx.Where(
			"gateway_code = ? AND payment_method = ? AND region = ? AND is_enabled = true",
			gatewayCode, "default", region,
		).First(&cost).Error
		if err == nil {
			return cost, nil
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return models.LKMPaymentProcessingCost{}, err
		}
	}

	return models.LKMPaymentProcessingCost{
		GatewayCode:   gatewayCode,
		PaymentMethod: method,
		Region:        region,
		Percent:       0,
		FixedRub:      0,
		IsEnabled:     true,
	}, nil
}

func (s *LKMTopupService) resolveFXRateTx(tx *gorm.DB, currency string) (float64, error) {
	if currency == currencyRUB {
		return 1, nil
	}
	var fx models.LKMManualFXRate
	if err := tx.Where("currency = ? AND is_active = true", currency).First(&fx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrLKMUnsupportedCurrency
		}
		return 0, err
	}
	if fx.RubPerUnit <= 0 {
		return 0, ErrLKMUnsupportedCurrency
	}
	return fx.RubPerUnit, nil
}

func (s *LKMTopupService) getGlobalConfigTx(tx *gorm.DB) (*models.LKMTopupGlobalConfig, error) {
	var cfg models.LKMTopupGlobalConfig
	if err := tx.Where("singleton_key = ?", "default").First(&cfg).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &models.LKMTopupGlobalConfig{
				SingletonKey:     "default",
				NominalRubPerLKM: 1,
			}, nil
		}
		return nil, err
	}
	if cfg.NominalRubPerLKM <= 0 {
		cfg.NominalRubPerLKM = 1
	}
	return &cfg, nil
}

func (s *LKMTopupService) buildPricingTx(tx *gorm.DB, lkmAmount int, gatewayCode string, paymentMethod string, region models.LKMRegion, currency string) (*lkmPricing, error) {
	gateway, err := s.resolveGatewayTx(tx, gatewayCode, region)
	if err != nil {
		return nil, err
	}

	method := normalizePaymentMethod(paymentMethod)
	cost, err := s.resolveProcessingCostTx(tx, gateway.Code, method, region)
	if err != nil {
		return nil, err
	}

	payCurrency := normalizeCurrency(currency, region)
	fxRate, err := s.resolveFXRateTx(tx, payCurrency)
	if err != nil {
		return nil, err
	}

	globalCfg, err := s.getGlobalConfigTx(tx)
	if err != nil {
		return nil, err
	}
	nominalRubPerLKM := globalCfg.NominalRubPerLKM
	nominalRub := round2(float64(lkmAmount) * nominalRubPerLKM)
	processingRub := round2((nominalRub * cost.Percent / 100) + cost.FixedRub)
	totalRub := round2(nominalRub + processingRub)

	totalPay := totalRub
	if payCurrency != currencyRUB {
		totalPay = round2(totalRub / fxRate)
	}

	return &lkmPricing{
		gatewayCode:       gateway.Code,
		paymentMethod:     method,
		currency:          payCurrency,
		fxRate:            fxRate,
		nominalRubPerLKM:  nominalRubPerLKM,
		nominalRub:        nominalRub,
		processingCostRub: processingRub,
		totalRub:          totalRub,
		totalPayAmount:    totalPay,
	}, nil
}

func (s *LKMTopupService) getRegionConfigTx(tx *gorm.DB, region models.LKMRegion) (*models.LKMRegionConfig, error) {
	var cfg models.LKMRegionConfig
	if err := tx.Where("region = ?", region).First(&cfg).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			defaultMin := 499
			if region == models.LKMRegionCIS {
				defaultMin = 199
			}
			return &models.LKMRegionConfig{
				Region:        region,
				CustomMinLKM:  defaultMin,
				CustomMaxLKM:  450000,
				CustomStepLKM: 50,
			}, nil
		}
		return nil, err
	}
	return &cfg, nil
}

func (s *LKMTopupService) listActivePackagesTx(tx *gorm.DB, region models.LKMRegion) ([]models.LKMPackageConfig, error) {
	var packages []models.LKMPackageConfig
	if err := tx.Where("region = ? AND is_active = true", region).
		Order("sort_order ASC, lkm_amount ASC").
		Find(&packages).Error; err != nil {
		return nil, err
	}
	return packages, nil
}

func isValidCustomAmount(amount int, cfg *models.LKMRegionConfig) bool {
	if cfg == nil {
		return false
	}
	if amount < cfg.CustomMinLKM || amount > cfg.CustomMaxLKM {
		return false
	}
	if cfg.CustomStepLKM <= 1 {
		return true
	}
	return amount%cfg.CustomStepLKM == 0
}

func (s *LKMTopupService) validateAmountTx(tx *gorm.DB, region models.LKMRegion, lkmAmount int) (*models.LKMRegionConfig, error) {
	if lkmAmount <= 0 {
		return nil, ErrLKMInvalidAmount
	}

	cfg, err := s.getRegionConfigTx(tx, region)
	if err != nil {
		return nil, err
	}
	packages, err := s.listActivePackagesTx(tx, region)
	if err != nil {
		return nil, err
	}
	for _, pkg := range packages {
		if pkg.LKMAmount == lkmAmount {
			return cfg, nil
		}
	}
	if !isValidCustomAmount(lkmAmount, cfg) {
		return nil, ErrLKMInvalidAmount
	}
	return cfg, nil
}

func (s *LKMTopupService) GetPackages(regionRaw string, currency string, gatewayCode string, paymentMethod string, host string) (*LKMPackageResponse, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}

	region := normalizeRegion(regionRaw, host)

	var response *LKMPackageResponse
	err := s.db.Transaction(func(tx *gorm.DB) error {
		cfg, err := s.getRegionConfigTx(tx, region)
		if err != nil {
			return err
		}
		globalCfg, err := s.getGlobalConfigTx(tx)
		if err != nil {
			return err
		}
		packages, err := s.listActivePackagesTx(tx, region)
		if err != nil {
			return err
		}

		views := make([]LKMPackageView, 0, len(packages))
		lastGatewayCode := strings.ToLower(strings.TrimSpace(gatewayCode))
		lastPaymentMethod := normalizePaymentMethod(paymentMethod)
		payCurrency := normalizeCurrency(currency, region)

		for _, pkg := range packages {
			pricing, pricingErr := s.buildPricingTx(tx, pkg.LKMAmount, gatewayCode, paymentMethod, region, payCurrency)
			if pricingErr != nil {
				return pricingErr
			}
			lastGatewayCode = pricing.gatewayCode
			lastPaymentMethod = pricing.paymentMethod
			payCurrency = pricing.currency

			views = append(views, LKMPackageView{
				LKMAmount:        pkg.LKMAmount,
				ReceiveLKM:       pkg.LKMAmount,
				TotalPayAmount:   pricing.totalPayAmount,
				PayCurrency:      pricing.currency,
				FXRate:           pricing.fxRate,
				NominalRub:       pricing.nominalRub,
				NominalRubPerLKM: pricing.nominalRubPerLKM,
				ProcessingRub:    pricing.processingCostRub,
				TotalRub:         pricing.totalRub,
			})
		}

		response = &LKMPackageResponse{
			Region:           string(region),
			Currency:         payCurrency,
			GatewayCode:      lastGatewayCode,
			PaymentMethod:    lastPaymentMethod,
			NominalRubPerLKM: globalCfg.NominalRubPerLKM,
			CustomMinLKM:     cfg.CustomMinLKM,
			CustomMaxLKM:     cfg.CustomMaxLKM,
			CustomStepLKM:    cfg.CustomStepLKM,
			Packages:         views,
			Disclaimer:       s.defaultDisclaimer(),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return response, nil
}

func (s *LKMTopupService) CreateQuote(userID uint, req LKMQuoteRequest, host string) (*LKMQuoteResponse, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}
	if userID == 0 {
		return nil, errors.New("user is required")
	}

	region := normalizeRegion(req.Region, host)
	payCurrency := normalizeCurrency(req.Currency, region)

	var quoteResponse *LKMQuoteResponse
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if _, err := s.validateAmountTx(tx, region, req.LKMAmount); err != nil {
			return err
		}

		pricing, err := s.buildPricingTx(tx, req.LKMAmount, req.GatewayCode, req.PaymentMethod, region, payCurrency)
		if err != nil {
			return err
		}

		expiresAt := s.now().UTC().Add(s.quoteTTL)
		quoteID := uuid.NewString()

		record := models.LKMQuote{
			QuoteID:              quoteID,
			UserID:               userID,
			GatewayCode:          pricing.gatewayCode,
			PaymentMethod:        pricing.paymentMethod,
			Region:               region,
			PayCurrency:          pricing.currency,
			ReceiveLKM:           req.LKMAmount,
			NominalRub:           pricing.nominalRub,
			ProcessingCostRub:    pricing.processingCostRub,
			TotalRub:             pricing.totalRub,
			TotalPayAmount:       pricing.totalPayAmount,
			FXRateRubPerCurrency: pricing.fxRate,
			ExpiresAt:            expiresAt,
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		quoteResponse = &LKMQuoteResponse{
			QuoteID:          quoteID,
			ReceiveLKM:       req.LKMAmount,
			TotalPayAmount:   pricing.totalPayAmount,
			PayCurrency:      pricing.currency,
			FXRate:           pricing.fxRate,
			QuoteExpiresAt:   expiresAt,
			NominalRub:       pricing.nominalRub,
			NominalRubPerLKM: pricing.nominalRubPerLKM,
			ProcessingRub:    pricing.processingCostRub,
			TotalRub:         pricing.totalRub,
			GatewayCode:      pricing.gatewayCode,
			PaymentMethod:    pricing.paymentMethod,
			Region:           string(region),
			Disclaimer:       s.defaultDisclaimer(),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return quoteResponse, nil
}

func (s *LKMTopupService) resolveRiskTierTx(tx *gorm.DB, lkmAmount int) (*models.LKMTopupRiskTier, error) {
	var tiers []models.LKMTopupRiskTier
	if err := tx.Where("is_enabled = true").
		Order("sort_order ASC, min_lkm ASC").
		Find(&tiers).Error; err != nil {
		return nil, err
	}
	for _, tier := range tiers {
		if lkmAmount >= tier.MinLKM && lkmAmount <= tier.MaxLKM {
			found := tier
			return &found, nil
		}
	}
	return nil, errors.New("risk tier is not configured for amount")
}

func (s *LKMTopupService) CreateTopupFromQuote(userID uint, req LKMCreateTopupRequest) (*LKMTopupResponse, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}
	if userID == 0 {
		return nil, errors.New("user is required")
	}
	if IsMobileTopupChannel(req.Channel) {
		return nil, ErrLKMTopupNotAllowedOnMobile
	}

	quoteID := strings.TrimSpace(req.QuoteID)
	if quoteID == "" {
		return nil, ErrLKMQuoteNotFound
	}

	var response *LKMTopupResponse
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var quote models.LKMQuote
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("quote_id = ?", quoteID).
			First(&quote).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLKMQuoteNotFound
			}
			return err
		}
		if quote.UserID != userID {
			return ErrLKMQuoteNotFound
		}
		if quote.UsedAt != nil {
			return ErrLKMQuoteAlreadyUsed
		}
		if s.now().UTC().After(quote.ExpiresAt.UTC()) {
			return ErrLKMQuoteExpired
		}

		tier, err := s.resolveRiskTierTx(tx, quote.ReceiveLKM)
		if err != nil {
			return err
		}

		now := s.now().UTC()
		usedAt := now
		if err := tx.Model(&quote).Update("used_at", usedAt).Error; err != nil {
			return err
		}

		topupID := uuid.NewString()
		channel := NormalizeTopupChannel(req.Channel)
		deviceFingerprint := strings.TrimSpace(req.DeviceFingerprint)
		record := models.LKMTopup{
			TopupID:              topupID,
			UserID:               userID,
			QuoteRefID:           quote.ID,
			QuoteID:              quote.QuoteID,
			GatewayCode:          quote.GatewayCode,
			PaymentMethod:        quote.PaymentMethod,
			Region:               quote.Region,
			PayCurrency:          quote.PayCurrency,
			ReceiveLKM:           quote.ReceiveLKM,
			NominalRub:           quote.NominalRub,
			ProcessingCostRub:    quote.ProcessingCostRub,
			TotalRub:             quote.TotalRub,
			TotalPayAmount:       quote.TotalPayAmount,
			FXRateRubPerCurrency: quote.FXRateRubPerCurrency,
			Channel:              channel,
			DeviceFingerprint:    deviceFingerprint,
			Status:               models.LKMTopupStatusPendingPayment,
			RiskAction:           tier.Action,
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		response = &LKMTopupResponse{
			TopupID:        record.TopupID,
			QuoteID:        record.QuoteID,
			Status:         string(record.Status),
			RiskAction:     string(record.RiskAction),
			ReceiveLKM:     record.ReceiveLKM,
			TotalPayAmount: record.TotalPayAmount,
			PayCurrency:    record.PayCurrency,
			GatewayCode:    record.GatewayCode,
			PaymentMethod:  record.PaymentMethod,
			CreatedAt:      record.CreatedAt,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return response, nil
}

func isPaidWebhookStatus(status string) bool {
	value := strings.ToLower(strings.TrimSpace(status))
	return value == "paid" || value == "succeeded" || value == "success" || value == "captured"
}

func (s *LKMTopupService) evaluateEnhancedRiskTx(tx *gorm.DB, topup *models.LKMTopup) (bool, string, error) {
	if topup == nil {
		return false, "invalid_topup", errors.New("top-up is nil")
	}

	dayAgo := s.now().UTC().Add(-24 * time.Hour)
	var recentCount int64
	if err := tx.Model(&models.LKMTopup{}).
		Where("user_id = ? AND created_at >= ?", topup.UserID, dayAgo).
		Count(&recentCount).Error; err != nil {
		return false, "velocity_check_failed", err
	}
	if recentCount > 5 {
		return false, "velocity_limit_exceeded", nil
	}

	var historicalRisk int64
	if err := tx.Model(&models.LKMTopup{}).
		Where("user_id = ? AND id <> ? AND status IN ?", topup.UserID, topup.ID, []models.LKMTopupStatus{
			models.LKMTopupStatusManualReview,
			models.LKMTopupStatusRejected,
		}).Count(&historicalRisk).Error; err != nil {
		return false, "history_check_failed", err
	}
	if historicalRisk > 0 {
		return false, "history_flagged", nil
	}

	return true, "", nil
}

func (s *LKMTopupService) HandleWebhook(gatewayCode string, req LKMWebhookRequest) (*models.LKMTopup, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}
	cleanGatewayCode := strings.ToLower(strings.TrimSpace(gatewayCode))
	if cleanGatewayCode == "" {
		cleanGatewayCode = "unknown"
	}
	eventID := strings.TrimSpace(req.EventID)
	topupID := strings.TrimSpace(req.TopupID)
	if topupID == "" {
		return nil, ErrLKMTopupNotFound
	}
	if eventID == "" {
		eventID = uuid.NewString()
	}

	payloadBytes := req.Payload
	if len(payloadBytes) == 0 {
		payloadBytes = []byte("{}")
	}

	var result models.LKMTopup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var existingEvent models.LKMTopupWebhookEvent
		if err := tx.Where("gateway_code = ? AND event_id = ?", cleanGatewayCode, eventID).
			First(&existingEvent).Error; err == nil {
			if loadErr := tx.Where("topup_id = ?", existingEvent.TopupID).First(&result).Error; loadErr != nil {
				return loadErr
			}
			return nil
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		var topup models.LKMTopup
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("topup_id = ?", topupID).
			First(&topup).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLKMTopupNotFound
			}
			return err
		}

		event := models.LKMTopupWebhookEvent{
			GatewayCode: cleanGatewayCode,
			EventID:     eventID,
			TopupID:     topup.TopupID,
			Status:      strings.ToLower(strings.TrimSpace(req.Status)),
			PayloadJSON: string(payloadBytes),
		}
		if event.Status == "" {
			event.Status = "unknown"
		}
		if err := tx.Create(&event).Error; err != nil {
			return err
		}

		if !isPaidWebhookStatus(event.Status) {
			now := s.now().UTC()
			if err := tx.Model(&event).Update("processed_at", now).Error; err != nil {
				return err
			}
			result = topup
			return nil
		}

		now := s.now().UTC()
		updates := map[string]interface{}{
			"status":              models.LKMTopupStatusPaid,
			"paid_at":             now,
			"external_payment_id": strings.TrimSpace(req.ExternalPaymentID),
			"risk_reason":         "",
		}

		switch topup.RiskAction {
		case models.LKMRiskActionManual:
			updates["status"] = models.LKMTopupStatusManualReview
			updates["risk_reason"] = "manual_tier"
		case models.LKMRiskActionEnhanced:
			passed, reason, riskErr := s.evaluateEnhancedRiskTx(tx, &topup)
			if riskErr != nil {
				return riskErr
			}
			if !passed {
				updates["status"] = models.LKMTopupStatusManualReview
				updates["risk_reason"] = reason
			}
		default:
			// Auto tier path.
		}

		nextStatus, _ := updates["status"].(models.LKMTopupStatus)
		if nextStatus == "" {
			nextStatus = models.LKMTopupStatusPaid
		}
		if nextStatus == models.LKMTopupStatusPaid {
			dedupKey := fmt.Sprintf("lkm_topup:%s", topup.TopupID)
			processed, err := s.walletService.CreditTx(tx, topup.UserID, topup.ReceiveLKM, dedupKey, "LKM top-up credit")
			if err != nil {
				return err
			}
			creditedAt := now
			updates["status"] = models.LKMTopupStatusCredited
			if processed || topup.CreditedAt == nil {
				updates["credited_at"] = creditedAt
			}
			updates["risk_reason"] = ""
		}

		if err := tx.Model(&topup).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", topup.ID).First(&result).Error; err != nil {
			return err
		}

		processedAt := s.now().UTC()
		if err := tx.Model(&event).Update("processed_at", processedAt).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *LKMTopupService) GetAdminConfig() (*LKMAdminConfig, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}

	cfg := &LKMAdminConfig{}
	if err := s.db.Where("singleton_key = ?", "default").First(&cfg.GlobalConfig).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		cfg.GlobalConfig = models.LKMTopupGlobalConfig{
			SingletonKey:     "default",
			NominalRubPerLKM: 1,
		}
	}
	if cfg.GlobalConfig.NominalRubPerLKM <= 0 {
		cfg.GlobalConfig.NominalRubPerLKM = 1
	}

	if err := s.db.Order("code ASC").Find(&cfg.Gateways).Error; err != nil {
		return nil, err
	}
	if err := s.db.Order("region ASC").Find(&cfg.RegionConfigs).Error; err != nil {
		return nil, err
	}
	if err := s.db.Order("region ASC, sort_order ASC, lkm_amount ASC").Find(&cfg.Packages).Error; err != nil {
		return nil, err
	}
	if err := s.db.Order("gateway_code ASC, payment_method ASC, region ASC").Find(&cfg.ProcessingCosts).Error; err != nil {
		return nil, err
	}
	if err := s.db.Order("currency ASC").Find(&cfg.FXRates).Error; err != nil {
		return nil, err
	}
	if err := s.db.Order("sort_order ASC, min_lkm ASC").Find(&cfg.RiskTiers).Error; err != nil {
		return nil, err
	}

	return cfg, nil
}

func (s *LKMTopupService) UpdateAdminConfig(input LKMAdminConfig, adminID uint) error {
	if err := s.ensureDB(); err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		nominalRubPerLKM := input.GlobalConfig.NominalRubPerLKM
		if nominalRubPerLKM <= 0 {
			currentCfg, cfgErr := s.getGlobalConfigTx(tx)
			if cfgErr != nil {
				return cfgErr
			}
			nominalRubPerLKM = currentCfg.NominalRubPerLKM
			if nominalRubPerLKM <= 0 {
				nominalRubPerLKM = 1
			}
		}
		if err := tx.Where("singleton_key = ?", "default").
			Assign(models.LKMTopupGlobalConfig{
				SingletonKey:     "default",
				NominalRubPerLKM: nominalRubPerLKM,
			}).
			FirstOrCreate(&models.LKMTopupGlobalConfig{}, models.LKMTopupGlobalConfig{SingletonKey: "default"}).Error; err != nil {
			return err
		}

		for _, gateway := range input.Gateways {
			code := strings.ToLower(strings.TrimSpace(gateway.Code))
			if code == "" {
				continue
			}
			if err := tx.Where("code = ?", code).
				Assign(models.LKMPaymentGateway{
					Code:      code,
					Name:      strings.TrimSpace(gateway.Name),
					IsEnabled: gateway.IsEnabled,
				}).
				FirstOrCreate(&models.LKMPaymentGateway{}, models.LKMPaymentGateway{Code: code}).Error; err != nil {
				return err
			}
		}

		for _, regionCfg := range input.RegionConfigs {
			region := normalizeRegion(string(regionCfg.Region), "")
			if err := tx.Where("region = ?", region).
				Assign(models.LKMRegionConfig{
					Region:        region,
					CustomMinLKM:  regionCfg.CustomMinLKM,
					CustomMaxLKM:  regionCfg.CustomMaxLKM,
					CustomStepLKM: regionCfg.CustomStepLKM,
				}).
				FirstOrCreate(&models.LKMRegionConfig{}, models.LKMRegionConfig{Region: region}).Error; err != nil {
				return err
			}
		}

		for _, pkg := range input.Packages {
			region := normalizeRegion(string(pkg.Region), "")
			if pkg.LKMAmount <= 0 {
				continue
			}
			if err := tx.Where("region = ? AND lkm_amount = ?", region, pkg.LKMAmount).
				Assign(models.LKMPackageConfig{
					Region:    region,
					LKMAmount: pkg.LKMAmount,
					SortOrder: pkg.SortOrder,
					IsActive:  pkg.IsActive,
				}).
				FirstOrCreate(&models.LKMPackageConfig{}, models.LKMPackageConfig{
					Region:    region,
					LKMAmount: pkg.LKMAmount,
				}).Error; err != nil {
				return err
			}
		}

		for _, cost := range input.ProcessingCosts {
			code := strings.ToLower(strings.TrimSpace(cost.GatewayCode))
			if code == "" {
				continue
			}
			region := normalizeRegion(string(cost.Region), "")
			method := normalizePaymentMethod(cost.PaymentMethod)
			if err := tx.Where("gateway_code = ? AND payment_method = ? AND region = ?", code, method, region).
				Assign(models.LKMPaymentProcessingCost{
					GatewayCode:   code,
					PaymentMethod: method,
					Region:        region,
					Percent:       cost.Percent,
					FixedRub:      cost.FixedRub,
					IsEnabled:     cost.IsEnabled,
				}).
				FirstOrCreate(&models.LKMPaymentProcessingCost{}, models.LKMPaymentProcessingCost{
					GatewayCode:   code,
					PaymentMethod: method,
					Region:        region,
				}).Error; err != nil {
				return err
			}
		}

		for _, fx := range input.FXRates {
			currency := strings.ToUpper(strings.TrimSpace(fx.Currency))
			if currency == "" {
				continue
			}
			lastUpdatedBy := fx.LastUpdatedBy
			if adminID > 0 {
				lastUpdatedBy = &adminID
			}
			if err := tx.Where("currency = ?", currency).
				Assign(models.LKMManualFXRate{
					Currency:      currency,
					RubPerUnit:    fx.RubPerUnit,
					IsActive:      fx.IsActive,
					LastUpdatedBy: lastUpdatedBy,
				}).
				FirstOrCreate(&models.LKMManualFXRate{}, models.LKMManualFXRate{Currency: currency}).Error; err != nil {
				return err
			}
		}

		for _, tier := range input.RiskTiers {
			name := strings.TrimSpace(tier.Name)
			if name == "" {
				continue
			}
			action := tier.Action
			if action == "" {
				action = models.LKMRiskActionAuto
			}
			if err := tx.Where("name = ?", name).
				Assign(models.LKMTopupRiskTier{
					Name:      name,
					Action:    action,
					MinLKM:    tier.MinLKM,
					MaxLKM:    tier.MaxLKM,
					SortOrder: tier.SortOrder,
					IsEnabled: tier.IsEnabled,
				}).
				FirstOrCreate(&models.LKMTopupRiskTier{}, models.LKMTopupRiskTier{Name: name}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *LKMTopupService) ListTopups(status string, limit int) ([]models.LKMTopup, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	query := s.db.Order("created_at DESC").Limit(limit)
	cleanStatus := strings.TrimSpace(status)
	if cleanStatus != "" {
		query = query.Where("status = ?", cleanStatus)
	}
	var topups []models.LKMTopup
	if err := query.Find(&topups).Error; err != nil {
		return nil, err
	}
	return topups, nil
}

func (s *LKMTopupService) ListUserTopups(userID uint, status string, page int, limit int) ([]models.LKMTopup, int64, error) {
	if err := s.ensureDB(); err != nil {
		return nil, 0, err
	}
	if userID == 0 {
		return nil, 0, errors.New("user is required")
	}
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	query := s.db.Model(&models.LKMTopup{}).Where("user_id = ?", userID)
	cleanStatus := strings.TrimSpace(status)
	if cleanStatus != "" {
		query = query.Where("status = ?", cleanStatus)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	var items []models.LKMTopup
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *LKMTopupService) ApproveManualTopup(topupID string, adminID uint, note string) (*models.LKMTopup, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}
	cleanTopupID := strings.TrimSpace(topupID)
	if cleanTopupID == "" {
		return nil, ErrLKMTopupNotFound
	}

	var result models.LKMTopup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var topup models.LKMTopup
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("topup_id = ?", cleanTopupID).
			First(&topup).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLKMTopupNotFound
			}
			return err
		}

		if topup.Status != models.LKMTopupStatusManualReview && topup.Status != models.LKMTopupStatusPaid {
			return errors.New("top-up is not awaiting manual approval")
		}

		dedupKey := fmt.Sprintf("lkm_topup:%s", topup.TopupID)
		if _, err := s.walletService.CreditTx(tx, topup.UserID, topup.ReceiveLKM, dedupKey, "LKM top-up credit (manual review)"); err != nil {
			return err
		}

		now := s.now().UTC()
		reviewNote := strings.TrimSpace(note)
		if err := tx.Model(&topup).Updates(map[string]interface{}{
			"status":         models.LKMTopupStatusCredited,
			"credited_at":    now,
			"reviewed_by_id": adminID,
			"reviewed_at":    now,
			"review_note":    reviewNote,
			"risk_reason":    "",
		}).Error; err != nil {
			return err
		}

		if err := tx.Where("id = ?", topup.ID).First(&result).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *LKMTopupService) RejectTopup(topupID string, adminID uint, note string) (*models.LKMTopup, error) {
	if err := s.ensureDB(); err != nil {
		return nil, err
	}

	cleanTopupID := strings.TrimSpace(topupID)
	if cleanTopupID == "" {
		return nil, ErrLKMTopupNotFound
	}

	var result models.LKMTopup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var topup models.LKMTopup
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("topup_id = ?", cleanTopupID).
			First(&topup).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLKMTopupNotFound
			}
			return err
		}

		now := s.now().UTC()
		if err := tx.Model(&topup).Updates(map[string]interface{}{
			"status":         models.LKMTopupStatusRejected,
			"reviewed_by_id": adminID,
			"reviewed_at":    now,
			"review_note":    strings.TrimSpace(note),
		}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", topup.ID).First(&result).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}
