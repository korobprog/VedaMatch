package services

import "testing"

func TestCalculateSpendAllocation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		amount      int
		regular     int
		bonus       int
		opts        SpendOptions
		wantRegular int
		wantBonus   int
	}{
		{
			name:        "bonus disabled",
			amount:      100,
			regular:     100,
			bonus:       100,
			opts:        SpendOptions{AllowBonus: false},
			wantRegular: 100,
			wantBonus:   0,
		},
		{
			name:        "bonus limited to percent",
			amount:      100,
			regular:     100,
			bonus:       100,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 40},
			wantRegular: 60,
			wantBonus:   40,
		},
		{
			name:        "bonus shifts when regular is low",
			amount:      100,
			regular:     10,
			bonus:       100,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 0,
			wantBonus:   100,
		},
		{
			name:        "max percent defaults to 100 when bonus enabled",
			amount:      50,
			regular:     0,
			bonus:       50,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 0},
			wantRegular: 0,
			wantBonus:   50,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := calculateSpendAllocation(tc.amount, tc.regular, tc.bonus, tc.opts)
			if err != nil {
				t.Fatalf("calculateSpendAllocation returned error: %v", err)
			}
			if got.RegularAmount != tc.wantRegular || got.BonusAmount != tc.wantBonus {
				t.Fatalf("allocation = regular:%d bonus:%d, want regular:%d bonus:%d",
					got.RegularAmount, got.BonusAmount, tc.wantRegular, tc.wantBonus)
			}
		})
	}
}
