package services

import (
	"errors"
	"fmt"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ChatTranscribeTariffTypeFree      = "free"
	ChatTranscribeTariffTypeStandard  = "standard"
	ChatTranscribeTariffTypeLongAudio = "long_audio"
)

var ErrChatTranscribeInsufficientLKM = errors.New("insufficient_lkm")

type ChatTranscribeBilling struct {
	AudioMinutes         int    `json:"audioMinutes"`
	FreeMinutesUsed      int    `json:"freeMinutesUsed"`
	PaidMinutes          int    `json:"paidMinutes"`
	ChargedLkm           int    `json:"chargedLkm"`
	PricePerMinuteLkm    int    `json:"pricePerMinuteLkm"`
	TariffType           string `json:"tariffType"`
	WeeklyQuotaTotal     int    `json:"weeklyQuotaTotal"`
	WeeklyQuotaRemaining int    `json:"weeklyQuotaRemaining"`
}

type ChatTranscribeBillingService struct {
	walletService *WalletService
}

func NewChatTranscribeBillingService(walletService *WalletService) *ChatTranscribeBillingService {
	if walletService == nil {
		walletService = NewWalletService()
	}
	return &ChatTranscribeBillingService{
		walletService: walletService,
	}
}

func BuildChatTranscribeWeekKeyUTC(ts time.Time) string {
	year, week := ts.UTC().ISOWeek()
	return fmt.Sprintf("%04d-W%02d", year, week)
}

func ComputeChatTranscribeAudioMinutes(durationSec int) int {
	if durationSec <= 0 {
		return 1
	}
	minutes := durationSec / 60
	if durationSec%60 != 0 {
		minutes++
	}
	if minutes < 1 {
		return 1
	}
	return minutes
}

func CalculateChatTranscribeBillingQuote(cfg ChatTranscribeBillingConfig, audioMinutes int, usedThisWeek int) ChatTranscribeBilling {
	if audioMinutes < 1 {
		audioMinutes = 1
	}
	if usedThisWeek < 0 {
		usedThisWeek = 0
	}

	freeAvailable := cfg.FreeMinPerWeek - usedThisWeek
	if freeAvailable < 0 {
		freeAvailable = 0
	}

	freeMinutesUsed := audioMinutes
	if freeMinutesUsed > freeAvailable {
		freeMinutesUsed = freeAvailable
	}
	paidMinutes := audioMinutes - freeMinutesUsed

	pricePerMin := cfg.PricePerMinLKM
	tariffType := ChatTranscribeTariffTypeStandard
	if audioMinutes > cfg.LongAudioThresholdMin {
		pricePerMin = cfg.LongAudioPricePerMinLKM
		tariffType = ChatTranscribeTariffTypeLongAudio
	}
	if paidMinutes == 0 {
		tariffType = ChatTranscribeTariffTypeFree
	}

	charged := 0
	if paidMinutes > 0 {
		charged = paidMinutes * pricePerMin
		if charged < cfg.MinChargeLKM {
			charged = cfg.MinChargeLKM
		}
	}

	remaining := cfg.FreeMinPerWeek - (usedThisWeek + freeMinutesUsed)
	if remaining < 0 {
		remaining = 0
	}

	return ChatTranscribeBilling{
		AudioMinutes:         audioMinutes,
		FreeMinutesUsed:      freeMinutesUsed,
		PaidMinutes:          paidMinutes,
		ChargedLkm:           charged,
		PricePerMinuteLkm:    pricePerMin,
		TariffType:           tariffType,
		WeeklyQuotaTotal:     cfg.FreeMinPerWeek,
		WeeklyQuotaRemaining: remaining,
	}
}

func (s *ChatTranscribeBillingService) GetQuoteTx(tx *gorm.DB, userID uint, durationSec int) (ChatTranscribeBilling, string, error) {
	if tx == nil {
		return ChatTranscribeBilling{}, "", errors.New("transaction is required")
	}

	cfg := ResolveChatTranscribeBillingConfig()
	audioMinutes := ComputeChatTranscribeAudioMinutes(durationSec)
	weekKey := BuildChatTranscribeWeekKeyUTC(time.Now().UTC())

	var usage models.ChatTranscribeWeeklyUsage
	usedThisWeek := 0
	if err := tx.Where("user_id = ? AND week_key = ?", userID, weekKey).First(&usage).Error; err == nil {
		usedThisWeek = usage.FreeMinutesUsed
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return ChatTranscribeBilling{}, "", err
	}

	if !cfg.Enabled {
		billing := ChatTranscribeBilling{
			AudioMinutes:         audioMinutes,
			FreeMinutesUsed:      0,
			PaidMinutes:          0,
			ChargedLkm:           0,
			PricePerMinuteLkm:    0,
			TariffType:           ChatTranscribeTariffTypeFree,
			WeeklyQuotaTotal:     cfg.FreeMinPerWeek,
			WeeklyQuotaRemaining: maxChatTranscribeInt(0, cfg.FreeMinPerWeek-usedThisWeek),
		}
		return billing, weekKey, nil
	}

	return CalculateChatTranscribeBillingQuote(cfg, audioMinutes, usedThisWeek), weekKey, nil
}

type ChatTranscribeBillingApplyResult struct {
	Billing       ChatTranscribeBilling
	WeekKey       string
	ChargeDedup   string
	RefundDedup   string
	BillingActive bool
}

func (s *ChatTranscribeBillingService) ConsumeQuotaAndChargeTx(tx *gorm.DB, userID uint, messageID uint, durationSec int) (*ChatTranscribeBillingApplyResult, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}

	cfg := ResolveChatTranscribeBillingConfig()
	quote, weekKey, err := s.GetQuoteTx(tx, userID, durationSec)
	if err != nil {
		return nil, err
	}

	result := &ChatTranscribeBillingApplyResult{
		Billing:       quote,
		WeekKey:       weekKey,
		BillingActive: cfg.Enabled,
	}

	if !cfg.Enabled {
		return result, nil
	}

	if quote.FreeMinutesUsed > 0 {
		var usage models.ChatTranscribeWeeklyUsage
		usageErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND week_key = ?", userID, weekKey).
			First(&usage).Error
		if errors.Is(usageErr, gorm.ErrRecordNotFound) {
			usage = models.ChatTranscribeWeeklyUsage{
				UserID:          userID,
				WeekKey:         weekKey,
				FreeMinutesUsed: quote.FreeMinutesUsed,
			}
			if err := tx.Create(&usage).Error; err != nil {
				return nil, err
			}
		} else if usageErr != nil {
			return nil, usageErr
		} else {
			usage.FreeMinutesUsed += quote.FreeMinutesUsed
			if err := tx.Model(&usage).Update("free_minutes_used", usage.FreeMinutesUsed).Error; err != nil {
				return nil, err
			}
		}
	}

	if quote.ChargedLkm <= 0 {
		return result, nil
	}

	chargeDedup, refundDedup := BuildChatTranscribeDedupKeys(userID, messageID)
	result.ChargeDedup = chargeDedup
	result.RefundDedup = refundDedup

	processed, spendErr := s.walletService.SpendTx(tx, userID, quote.ChargedLkm, chargeDedup, "Chat transcription", SpendOptions{
		AllowBonus:      true,
		MaxBonusPercent: 100,
	})
	if spendErr != nil {
		if isInsufficientLKMError(spendErr) {
			return nil, ErrChatTranscribeInsufficientLKM
		}
		return nil, spendErr
	}
	if !processed {
		// Existing deduped charge, do not add duplicate charge metric on this run.
	}

	return result, nil
}

func (s *ChatTranscribeBillingService) RefundAndRollbackTx(tx *gorm.DB, userID uint, weekKey string, freeMinutes int, chargedLkm int, refundDedup string) error {
	if tx == nil {
		return errors.New("transaction is required")
	}

	if freeMinutes > 0 {
		var usage models.ChatTranscribeWeeklyUsage
		usageErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND week_key = ?", userID, weekKey).
			First(&usage).Error
		if usageErr == nil {
			next := usage.FreeMinutesUsed - freeMinutes
			if next < 0 {
				next = 0
			}
			if err := tx.Model(&usage).Update("free_minutes_used", next).Error; err != nil {
				return err
			}
		} else if !errors.Is(usageErr, gorm.ErrRecordNotFound) {
			return usageErr
		}
	}

	if chargedLkm > 0 {
		if _, err := s.walletService.CreditTx(tx, userID, chargedLkm, refundDedup, "Chat transcription refund"); err != nil {
			return err
		}
	}

	return nil
}

func isInsufficientLKMError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "insufficient")
}

func BuildChatTranscribeDedupKeys(userID uint, messageID uint) (string, string) {
	return fmt.Sprintf("transcribe_charge:%d:%d", userID, messageID), fmt.Sprintf("transcribe_refund:%d:%d", userID, messageID)
}

func maxChatTranscribeInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
