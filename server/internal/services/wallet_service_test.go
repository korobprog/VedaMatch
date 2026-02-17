package services

import (
	"math"
	"testing"

	"rag-agent-server/internal/models"
)

// ==================== calculateSpendAllocation ====================

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
		wantErr     bool
	}{
		// === Basic scenarios ===
		{
			name:        "bonus disabled — all from regular",
			amount:      100,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: false},
			wantRegular: 100,
			wantBonus:   0,
		},
		{
			name:        "bonus enabled — limited to percent",
			amount:      100,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 40},
			wantRegular: 60,
			wantBonus:   40,
		},
		{
			name:        "bonus enabled — max 100% uses both balances",
			amount:      100,
			regular:     50,
			bonus:       50,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 50,
			wantBonus:   50,
		},
		{
			name:        "bonus enabled — shifts when regular is low",
			amount:      100,
			regular:     10,
			bonus:       100,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 0,
			wantBonus:   100,
		},
		{
			name:        "max percent defaults to 100 when bonus enabled and percent is 0",
			amount:      50,
			regular:     0,
			bonus:       50,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 0},
			wantRegular: 0,
			wantBonus:   50,
		},

		// === MaxBonusAmount cap ===
		{
			name:        "MaxBonusAmount caps bonus usage",
			amount:      100,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100, MaxBonusAmount: 30},
			wantRegular: 70,
			wantBonus:   30,
		},
		{
			name:        "MaxBonusAmount smaller than percent-based cap",
			amount:      100,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 50, MaxBonusAmount: 20},
			wantRegular: 80,
			wantBonus:   20,
		},
		{
			name:        "MaxBonusAmount larger than percent-based cap — percent wins",
			amount:      100,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 30, MaxBonusAmount: 50},
			wantRegular: 70,
			wantBonus:   30,
		},

		// === Zero and edge cases ===
		{
			name:    "zero amount — should error",
			amount:  0,
			regular: 100,
			bonus:   100,
			opts:    SpendOptions{AllowBonus: true},
			wantErr: true,
		},
		{
			name:    "negative amount — should error",
			amount:  -10,
			regular: 100,
			bonus:   100,
			opts:    SpendOptions{AllowBonus: true},
			wantErr: true,
		},
		{
			name:        "zero bonus balance — all from regular",
			amount:      100,
			regular:     200,
			bonus:       0,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 100,
			wantBonus:   0,
		},
		{
			name:        "zero regular balance — all from bonus",
			amount:      50,
			regular:     0,
			bonus:       100,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 0,
			wantBonus:   50,
		},
		{
			name:        "exact amounts — no leftover",
			amount:      100,
			regular:     100,
			bonus:       0,
			opts:        SpendOptions{AllowBonus: false},
			wantRegular: 100,
			wantBonus:   0,
		},

		// === Bonus shift scenarios (when regular < required) ===
		{
			name:        "partial shift — not enough regular for initial allocation",
			amount:      100,
			regular:     30,
			bonus:       100,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 50},
			wantRegular: 50,
			wantBonus:   50,
		},
		{
			name:        "shift is capped by MaxBonusPercent",
			amount:      100,
			regular:     10,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 30},
			wantRegular: 70,
			wantBonus:   30,
		},
		{
			name:        "shift is capped by available bonus balance",
			amount:      100,
			regular:     10,
			bonus:       20,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 80,
			wantBonus:   20,
		},

		// === Small amounts ===
		{
			name:        "spend 1 LKM from regular only",
			amount:      1,
			regular:     1,
			bonus:       0,
			opts:        SpendOptions{AllowBonus: false},
			wantRegular: 1,
			wantBonus:   0,
		},
		{
			name:        "spend 1 LKM from bonus only",
			amount:      1,
			regular:     0,
			bonus:       1,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 100},
			wantRegular: 0,
			wantBonus:   1,
		},

		// === Rounding scenarios ===
		{
			name:        "33 percent of 100 is truncated to int (33 not 34)",
			amount:      100,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 33},
			wantRegular: 67,
			wantBonus:   33,
		},
		{
			name:        "1 percent of 99 = 0, everything from regular",
			amount:      99,
			regular:     200,
			bonus:       200,
			opts:        SpendOptions{AllowBonus: true, MaxBonusPercent: 1},
			wantRegular: 99,
			wantBonus:   0,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := calculateSpendAllocation(tc.amount, tc.regular, tc.bonus, tc.opts)
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error but got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.RegularAmount != tc.wantRegular || got.BonusAmount != tc.wantBonus {
				t.Fatalf("allocation = regular:%d bonus:%d, want regular:%d bonus:%d",
					got.RegularAmount, got.BonusAmount, tc.wantRegular, tc.wantBonus)
			}
			if got.TotalAmount != tc.amount {
				t.Fatalf("TotalAmount = %d, want %d", got.TotalAmount, tc.amount)
			}
			// Invariant: regular + bonus = total
			if got.RegularAmount+got.BonusAmount != got.TotalAmount {
				t.Fatalf("invariant broken: regular(%d) + bonus(%d) != total(%d)",
					got.RegularAmount, got.BonusAmount, got.TotalAmount)
			}
		})
	}
}

// ==================== normalizeSpendOptions ====================

func TestNormalizeSpendOptions(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		input       SpendOptions
		wantPercent int
		wantAmount  int
	}{
		{
			name:        "bonus disabled — reset percent and amount",
			input:       SpendOptions{AllowBonus: false, MaxBonusPercent: 50, MaxBonusAmount: 100},
			wantPercent: 0,
			wantAmount:  0,
		},
		{
			name:        "bonus enabled with 0 percent — defaults to 100",
			input:       SpendOptions{AllowBonus: true, MaxBonusPercent: 0},
			wantPercent: 100,
			wantAmount:  0,
		},
		{
			name:        "bonus enabled with valid percent — keeps value",
			input:       SpendOptions{AllowBonus: true, MaxBonusPercent: 40},
			wantPercent: 40,
			wantAmount:  0,
		},
		{
			name:        "negative percent clamped to 0",
			input:       SpendOptions{AllowBonus: true, MaxBonusPercent: -10},
			wantPercent: 100, // clamped to 0 first, then defaults to 100 since AllowBonus=true
			wantAmount:  0,
		},
		{
			name:        "percent above 100 clamped to 100",
			input:       SpendOptions{AllowBonus: true, MaxBonusPercent: 150},
			wantPercent: 100,
			wantAmount:  0,
		},
		{
			name:        "negative MaxBonusAmount clamped to 0",
			input:       SpendOptions{AllowBonus: true, MaxBonusPercent: 50, MaxBonusAmount: -5},
			wantPercent: 50,
			wantAmount:  0,
		},
		{
			name:        "all zero with bonus disabled",
			input:       SpendOptions{AllowBonus: false},
			wantPercent: 0,
			wantAmount:  0,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result := normalizeSpendOptions(tc.input)
			if result.MaxBonusPercent != tc.wantPercent {
				t.Errorf("MaxBonusPercent = %d, want %d", result.MaxBonusPercent, tc.wantPercent)
			}
			if result.MaxBonusAmount != tc.wantAmount {
				t.Errorf("MaxBonusAmount = %d, want %d", result.MaxBonusAmount, tc.wantAmount)
			}
		})
	}
}

// ==================== minInt ====================

func TestMinInt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		a, b, want int
	}{
		{10, 20, 10},
		{20, 10, 10},
		{0, 0, 0},
		{-1, 1, -1},
		{100, 100, 100},
	}

	for _, tc := range tests {
		got := minInt(tc.a, tc.b)
		if got != tc.want {
			t.Errorf("minInt(%d, %d) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}

// ==================== Allocation Invariants ====================

func TestSpendAllocationInvariants(t *testing.T) {
	t.Parallel()

	// Table of various balance/options combinations.
	// All should satisfy: regular + bonus = total.
	inputs := []struct {
		amount, regular, bonus int
		opts                   SpendOptions
	}{
		{100, 100, 100, SpendOptions{AllowBonus: true, MaxBonusPercent: 100}},
		{100, 50, 50, SpendOptions{AllowBonus: true, MaxBonusPercent: 50}},
		{100, 0, 100, SpendOptions{AllowBonus: true, MaxBonusPercent: 100}},
		{100, 100, 0, SpendOptions{AllowBonus: true, MaxBonusPercent: 100}},
		{100, 200, 200, SpendOptions{AllowBonus: true, MaxBonusPercent: 25}},
		{100, 200, 200, SpendOptions{AllowBonus: true, MaxBonusPercent: 100, MaxBonusAmount: 10}},
		{50, 30, 30, SpendOptions{AllowBonus: true, MaxBonusPercent: 100}},
		{1, 0, 1, SpendOptions{AllowBonus: true, MaxBonusPercent: 100}},
		{1, 1, 0, SpendOptions{AllowBonus: false}},
	}

	for _, in := range inputs {
		alloc, err := calculateSpendAllocation(in.amount, in.regular, in.bonus, in.opts)
		if err != nil {
			t.Errorf("unexpected error for amount=%d reg=%d bonus=%d: %v",
				in.amount, in.regular, in.bonus, err)
			continue
		}

		// Invariant 1: sum = total
		if alloc.RegularAmount+alloc.BonusAmount != alloc.TotalAmount {
			t.Errorf("broken invariant: regular(%d)+bonus(%d) != total(%d) for amount=%d",
				alloc.RegularAmount, alloc.BonusAmount, alloc.TotalAmount, in.amount)
		}

		// Invariant 2: bonus never exceeds available
		if alloc.BonusAmount > in.bonus {
			t.Errorf("bonus(%d) > available(%d) for amount=%d", alloc.BonusAmount, in.bonus, in.amount)
		}

		// Invariant 3: regular never exceeds available
		if alloc.RegularAmount > in.regular {
			t.Errorf("regular(%d) > available(%d) for amount=%d", alloc.RegularAmount, in.regular, in.amount)
		}

		// Invariant 4: bonus is non-negative
		if alloc.BonusAmount < 0 {
			t.Errorf("bonus is negative: %d", alloc.BonusAmount)
		}

		// Invariant 5: regular is non-negative
		if alloc.RegularAmount < 0 {
			t.Errorf("regular is negative: %d", alloc.RegularAmount)
		}
	}
}

func TestCalculateTotalPages(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		total int64
		limit int
		want  int
	}{
		{name: "zero total keeps one page", total: 0, limit: 20, want: 1},
		{name: "exact division", total: 100, limit: 20, want: 5},
		{name: "with remainder", total: 101, limit: 20, want: 6},
		{name: "invalid limit defaults to one page", total: 10, limit: 0, want: 1},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := calculateTotalPages(tc.total, tc.limit); got != tc.want {
				t.Fatalf("calculateTotalPages(%d, %d) = %d, want %d", tc.total, tc.limit, got, tc.want)
			}
		})
	}

	expected := int64(math.MaxInt64 / 2)
	if math.MaxInt64%2 != 0 {
		expected++
	}
	maxInt := int64(^uint(0) >> 1)
	if expected > maxInt {
		expected = maxInt
	}
	if got := calculateTotalPages(math.MaxInt64, 2); got != int(expected) {
		t.Fatalf("calculateTotalPages(maxInt64,2) = %d, want %d", got, expected)
	}
}

func TestAllocationFromExistingSpendTransaction(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name            string
		existing        models.WalletTransaction
		requestedAmount int
		wantRegular     int
		wantBonus       int
		wantTotal       int
		wantErr         bool
	}{
		{
			name: "matching amount",
			existing: models.WalletTransaction{
				Amount:      100,
				BonusAmount: 40,
			},
			requestedAmount: 100,
			wantRegular:     60,
			wantBonus:       40,
			wantTotal:       100,
		},
		{
			name: "different requested amount is rejected",
			existing: models.WalletTransaction{
				Amount:      100,
				BonusAmount: 40,
			},
			requestedAmount: 90,
			wantErr:         true,
		},
		{
			name: "negative existing bonus is clamped",
			existing: models.WalletTransaction{
				Amount:      50,
				BonusAmount: -5,
			},
			requestedAmount: 50,
			wantRegular:     50,
			wantBonus:       0,
			wantTotal:       50,
		},
		{
			name: "existing bonus above amount is clamped",
			existing: models.WalletTransaction{
				Amount:      30,
				BonusAmount: 50,
			},
			requestedAmount: 30,
			wantRegular:     0,
			wantBonus:       30,
			wantTotal:       30,
		},
		{
			name: "invalid existing amount",
			existing: models.WalletTransaction{
				Amount:      0,
				BonusAmount: 0,
			},
			requestedAmount: 0,
			wantErr:         true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := allocationFromExistingSpendTransaction(tc.existing, tc.requestedAmount)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.RegularAmount != tc.wantRegular || got.BonusAmount != tc.wantBonus || got.TotalAmount != tc.wantTotal {
				t.Fatalf("unexpected allocation: %+v", got)
			}
		})
	}
}
