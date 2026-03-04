package services

import (
	"testing"
	"time"
)

func TestCalculateCafePlatformFee(t *testing.T) {
	cfg := CafeFeeConfig{
		Enabled:     true,
		PercentBps:  1000, // 10%
		CapLkm:      250,
		MinOrderLkm: 100,
	}

	fee, payout := CalculateCafePlatformFee(1800, cfg)
	if fee != 180 || payout != 1620 {
		t.Fatalf("unexpected fee/payout for normal case: got fee=%d payout=%d", fee, payout)
	}

	fee, payout = CalculateCafePlatformFee(5000, cfg)
	if fee != 250 || payout != 4750 {
		t.Fatalf("unexpected fee/payout for cap case: got fee=%d payout=%d", fee, payout)
	}

	fee, payout = CalculateCafePlatformFee(90, cfg)
	if fee != 0 || payout != 90 {
		t.Fatalf("unexpected fee/payout for min-order case: got fee=%d payout=%d", fee, payout)
	}

	disabled := cfg
	disabled.Enabled = false
	fee, payout = CalculateCafePlatformFee(1800, disabled)
	if fee != 0 || payout != 1800 {
		t.Fatalf("unexpected fee/payout for disabled case: got fee=%d payout=%d", fee, payout)
	}
}

func TestCafeFeeRolloutEligibility(t *testing.T) {
	cfg := CafeFeeConfig{RolloutPercent: 20}
	if !isCafeFeeRolloutEligible(5, cfg) {
		t.Fatalf("user with bucket 5 should be eligible for rollout 20")
	}
	if isCafeFeeRolloutEligible(55, cfg) {
		t.Fatalf("user with bucket 55 should not be eligible for rollout 20")
	}
}

func TestIsCafeFeeEnabledAt(t *testing.T) {
	now := time.Now().UTC()
	cfg := CafeFeeConfig{
		Enabled:        true,
		RolloutPercent: 100,
	}

	if !isCafeFeeEnabledAt(cfg, 42, now) {
		t.Fatalf("fee should be enabled for user with 100%% rollout and no effective_from")
	}

	future := now.Add(2 * time.Hour)
	cfg.EffectiveFrom = &future
	if isCafeFeeEnabledAt(cfg, 42, now) {
		t.Fatalf("fee should be disabled before effective_from")
	}
}
