package services

import "testing"

func TestCalculateServicePlatformFee_PercentOnly(t *testing.T) {
	cfg := ServiceFeeConfig{
		Enabled:    true,
		PercentBps: 800,
		CapLkm:     300,
	}

	fee, net := CalculateServicePlatformFee(1000, cfg)
	if fee != 80 {
		t.Fatalf("expected fee=80, got %d", fee)
	}
	if net != 920 {
		t.Fatalf("expected provider net=920, got %d", net)
	}
}

func TestCalculateServicePlatformFee_WithCap(t *testing.T) {
	cfg := ServiceFeeConfig{
		Enabled:    true,
		PercentBps: 800,
		CapLkm:     300,
	}

	fee, net := CalculateServicePlatformFee(10000, cfg)
	if fee != 300 {
		t.Fatalf("expected fee=300, got %d", fee)
	}
	if net != 9700 {
		t.Fatalf("expected provider net=9700, got %d", net)
	}
}
