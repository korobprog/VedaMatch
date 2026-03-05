package services

import (
	"errors"
	"testing"
	"time"
)

func TestComputeChatTranscribeAudioMinutes(t *testing.T) {
	tests := []struct {
		name     string
		seconds  int
		expected int
	}{
		{name: "zero fallback", seconds: 0, expected: 1},
		{name: "under minute", seconds: 1, expected: 1},
		{name: "exact minute", seconds: 60, expected: 1},
		{name: "round up", seconds: 61, expected: 2},
		{name: "five minutes and one second", seconds: 301, expected: 6},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := ComputeChatTranscribeAudioMinutes(tc.seconds); got != tc.expected {
				t.Fatalf("expected %d, got %d", tc.expected, got)
			}
		})
	}
}

func TestCalculateChatTranscribeBillingQuote_WeeklyFreeQuota(t *testing.T) {
	cfg := ChatTranscribeBillingConfig{
		Enabled:                 true,
		FreeMinPerWeek:          5,
		PricePerMinLKM:          3,
		LongAudioThresholdMin:   5,
		LongAudioPricePerMinLKM: 2,
		MinChargeLKM:            1,
	}

	quote := CalculateChatTranscribeBillingQuote(cfg, 3, 1)
	if quote.FreeMinutesUsed != 3 {
		t.Fatalf("expected freeMinutesUsed=3, got %d", quote.FreeMinutesUsed)
	}
	if quote.PaidMinutes != 0 {
		t.Fatalf("expected paidMinutes=0, got %d", quote.PaidMinutes)
	}
	if quote.ChargedLkm != 0 {
		t.Fatalf("expected chargedLkm=0, got %d", quote.ChargedLkm)
	}
	if quote.TariffType != ChatTranscribeTariffTypeFree {
		t.Fatalf("expected tariffType=%s, got %s", ChatTranscribeTariffTypeFree, quote.TariffType)
	}
}

func TestCalculateChatTranscribeBillingQuote_StandardTariffAfterQuota(t *testing.T) {
	cfg := ChatTranscribeBillingConfig{
		Enabled:                 true,
		FreeMinPerWeek:          5,
		PricePerMinLKM:          3,
		LongAudioThresholdMin:   5,
		LongAudioPricePerMinLKM: 2,
		MinChargeLKM:            1,
	}

	quote := CalculateChatTranscribeBillingQuote(cfg, 4, 5)
	if quote.FreeMinutesUsed != 0 {
		t.Fatalf("expected freeMinutesUsed=0, got %d", quote.FreeMinutesUsed)
	}
	if quote.PaidMinutes != 4 {
		t.Fatalf("expected paidMinutes=4, got %d", quote.PaidMinutes)
	}
	if quote.PricePerMinuteLkm != 3 {
		t.Fatalf("expected pricePerMinuteLkm=3, got %d", quote.PricePerMinuteLkm)
	}
	if quote.ChargedLkm != 12 {
		t.Fatalf("expected chargedLkm=12, got %d", quote.ChargedLkm)
	}
	if quote.TariffType != ChatTranscribeTariffTypeStandard {
		t.Fatalf("expected tariffType=%s, got %s", ChatTranscribeTariffTypeStandard, quote.TariffType)
	}
}

func TestCalculateChatTranscribeBillingQuote_LongAudioTariff(t *testing.T) {
	cfg := ChatTranscribeBillingConfig{
		Enabled:                 true,
		FreeMinPerWeek:          5,
		PricePerMinLKM:          3,
		LongAudioThresholdMin:   5,
		LongAudioPricePerMinLKM: 2,
		MinChargeLKM:            1,
	}

	quote := CalculateChatTranscribeBillingQuote(cfg, 6, 5)
	if quote.PricePerMinuteLkm != 2 {
		t.Fatalf("expected pricePerMinuteLkm=2, got %d", quote.PricePerMinuteLkm)
	}
	if quote.ChargedLkm != 12 {
		t.Fatalf("expected chargedLkm=12, got %d", quote.ChargedLkm)
	}
	if quote.TariffType != ChatTranscribeTariffTypeLongAudio {
		t.Fatalf("expected tariffType=%s, got %s", ChatTranscribeTariffTypeLongAudio, quote.TariffType)
	}
}

func TestCalculateChatTranscribeBillingQuote_MinCharge(t *testing.T) {
	cfg := ChatTranscribeBillingConfig{
		Enabled:                 true,
		FreeMinPerWeek:          0,
		PricePerMinLKM:          0,
		LongAudioThresholdMin:   5,
		LongAudioPricePerMinLKM: 0,
		MinChargeLKM:            1,
	}

	quote := CalculateChatTranscribeBillingQuote(cfg, 1, 0)
	if quote.PaidMinutes != 1 {
		t.Fatalf("expected paidMinutes=1, got %d", quote.PaidMinutes)
	}
	if quote.ChargedLkm != 1 {
		t.Fatalf("expected min chargedLkm=1, got %d", quote.ChargedLkm)
	}
}

func TestBuildChatTranscribeWeekKeyUTC(t *testing.T) {
	ts := time.Date(2026, time.January, 1, 10, 0, 0, 0, time.FixedZone("VLAD", 10*3600))
	weekKey := BuildChatTranscribeWeekKeyUTC(ts)
	if weekKey == "" {
		t.Fatal("expected non-empty week key")
	}
}

func TestBuildChatTranscribeDedupKeys(t *testing.T) {
	charge, refund := BuildChatTranscribeDedupKeys(7, 42)
	if charge != "transcribe_charge:7:42" {
		t.Fatalf("unexpected charge dedup: %s", charge)
	}
	if refund != "transcribe_refund:7:42" {
		t.Fatalf("unexpected refund dedup: %s", refund)
	}
}

func TestIsInsufficientLKMError(t *testing.T) {
	if !isInsufficientLKMError(errors.New("insufficient balance")) {
		t.Fatal("expected insufficient error to be recognized")
	}
	if isInsufficientLKMError(errors.New("network timeout")) {
		t.Fatal("expected non-insufficient error to be false")
	}
}
