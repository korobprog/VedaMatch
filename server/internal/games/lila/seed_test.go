package lila

import (
	"strings"
	"testing"

	"rag-agent-server/internal/models"
)

func TestResolveStoreSpendTotalsRejectsMissingConfiguredPrice(t *testing.T) {
	t.Parallel()

	_, _, err := resolveStoreSpendTotals(models.LilaStoreItem{
		Code:        "lotus_frame_basic",
		CanUseBonus: true,
		PriceBonus:  0,
	}, models.LilaCurrencyTypeBonus, 1, "store item")
	if err == nil {
		t.Fatalf("expected config error for zero bonus price")
	}
	if !strings.Contains(err.Error(), "bonus price is not configured") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRepairStoreItemUpdatesRepairsEnabledZeroPrices(t *testing.T) {
	t.Parallel()

	updates := repairStoreItemUpdates(
		models.LilaStoreItem{
			Code:        "guru_shishya_gift_pack",
			CanUseBonus: true,
			CanUseReal:  true,
			PriceBonus:  0,
			PriceReal:   0,
		},
		models.LilaStoreItem{
			Code:       "guru_shishya_gift_pack",
			Type:       "gift",
			NameRu:     "Пакет Гуру-Шья",
			PriceBonus: 25,
			PriceReal:  99,
		},
	)

	if got := updates["price_bonus"]; got != 25 {
		t.Fatalf("expected price_bonus=25, got %#v", got)
	}
	if got := updates["price_real"]; got != 99 {
		t.Fatalf("expected price_real=99, got %#v", got)
	}
	if got := updates["type"]; got != "gift" {
		t.Fatalf("expected type repair, got %#v", got)
	}
	if got := updates["name_ru"]; got != "Пакет Гуру-Шья" {
		t.Fatalf("expected name_ru repair, got %#v", got)
	}
}

func TestRepairStoreItemUpdatesRepairsFullyDisabledBrokenRow(t *testing.T) {
	t.Parallel()

	updates := repairStoreItemUpdates(
		models.LilaStoreItem{
			Code:        "lotus_frame_basic",
			CanUseBonus: false,
			CanUseReal:  false,
			PriceBonus:  0,
			PriceReal:   0,
		},
		models.LilaStoreItem{
			Code:        "lotus_frame_basic",
			Type:        "cosmetic",
			CanUseBonus: true,
			CanUseReal:  false,
			PriceBonus:  50,
		},
	)

	if got := updates["can_use_bonus"]; got != true {
		t.Fatalf("expected can_use_bonus=true, got %#v", got)
	}
	if got := updates["can_use_real"]; got != false {
		t.Fatalf("expected can_use_real=false, got %#v", got)
	}
	if got := updates["price_bonus"]; got != 50 {
		t.Fatalf("expected price_bonus=50, got %#v", got)
	}
}

func TestRepairPassSeasonUpdatesRepairsMissingPremiumPrice(t *testing.T) {
	t.Parallel()

	updates := repairPassSeasonUpdates(
		models.LilaPassSeason{
			Code:             "sadhana-001",
			PremiumPriceReal: 0,
		},
		models.LilaPassSeason{
			Code:             "sadhana-001",
			NameRu:           "Садхана: Вриндаван",
			PremiumPriceReal: 299,
		},
	)

	if got := updates["premium_price_real"]; got != 299 {
		t.Fatalf("expected premium_price_real=299, got %#v", got)
	}
	if got := updates["name_ru"]; got != "Садхана: Вриндаван" {
		t.Fatalf("expected name_ru repair, got %#v", got)
	}
}
