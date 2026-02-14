import {
  formatTransactionAmount,
  getTransactionAmountParts,
  getTransactionSign,
  isBonusTransaction,
  formatBalance,
  formatBalanceWithSymbol,
  formatTransactionDate,
  getCurrencyName,
  CURRENCY_CODE,
  CURRENCY_SYMBOL,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS,
  TransactionType,
} from '../../services/walletService';

// ==================== Constants ====================

describe('walletService constants', () => {
  it('defines LKM currency code', () => {
    expect(CURRENCY_CODE).toBe('LKM');
  });

  it('defines currency symbol', () => {
    expect(CURRENCY_SYMBOL).toBeDefined();
    expect(typeof CURRENCY_SYMBOL).toBe('string');
    expect(CURRENCY_SYMBOL.length).toBeGreaterThan(0);
  });

  it('has labels for all transaction types', () => {
    const types: TransactionType[] = ['credit', 'debit', 'bonus', 'refund', 'hold', 'release', 'admin_charge', 'admin_seize'];
    types.forEach((type) => {
      expect(TRANSACTION_TYPE_LABELS[type]).toBeDefined();
      expect(typeof TRANSACTION_TYPE_LABELS[type]).toBe('string');
    });
  });

  it('has colors for all transaction types', () => {
    const types: TransactionType[] = ['credit', 'debit', 'bonus', 'refund', 'hold', 'release', 'admin_charge', 'admin_seize'];
    types.forEach((type) => {
      expect(TRANSACTION_TYPE_COLORS[type]).toBeDefined();
      expect(TRANSACTION_TYPE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

// ==================== getCurrencyName ====================

describe('getCurrencyName', () => {
  it('returns Russian name for ru locale', () => {
    expect(getCurrencyName('ru')).toBe('Лакшмани');
  });

  it('returns English name for en locale', () => {
    expect(getCurrencyName('en')).toBe('LakshMoney');
  });

  it('returns English name for unknown locale', () => {
    expect(getCurrencyName('fr')).toBe('LakshMoney');
  });

  it('defaults to Russian when no argument', () => {
    expect(getCurrencyName()).toBe('Лакшмани');
  });
});

// ==================== getTransactionAmountParts ====================

describe('getTransactionAmountParts', () => {
  it('splits amount into regular and bonus parts', () => {
    expect(getTransactionAmountParts(30, 12)).toEqual({
      regularPart: 18,
      bonusPart: 12,
    });
  });

  it('handles missing bonus amount', () => {
    expect(getTransactionAmountParts(30)).toEqual({
      regularPart: 30,
      bonusPart: 0,
    });
  });

  it('handles undefined bonus amount', () => {
    expect(getTransactionAmountParts(100, undefined)).toEqual({
      regularPart: 100,
      bonusPart: 0,
    });
  });

  it('handles zero bonus amount', () => {
    expect(getTransactionAmountParts(50, 0)).toEqual({
      regularPart: 50,
      bonusPart: 0,
    });
  });

  it('keeps regular part non-negative when bonus exceeds amount', () => {
    const result = getTransactionAmountParts(30, 40);
    expect(result.regularPart).toBe(0);
    expect(result.bonusPart).toBe(40);
  });

  it('handles zero total amount with zero bonus', () => {
    expect(getTransactionAmountParts(0, 0)).toEqual({
      regularPart: 0,
      bonusPart: 0,
    });
  });

  it('handles zero total amount with undefined bonus', () => {
    expect(getTransactionAmountParts(0)).toEqual({
      regularPart: 0,
      bonusPart: 0,
    });
  });

  it('handles full bonus amount equal to total', () => {
    expect(getTransactionAmountParts(100, 100)).toEqual({
      regularPart: 0,
      bonusPart: 100,
    });
  });

  it('handles negative bonus amount (clamped to 0)', () => {
    const result = getTransactionAmountParts(50, -5);
    expect(result.bonusPart).toBe(0);
    expect(result.regularPart).toBe(50);
  });

  it('handles large amounts', () => {
    const result = getTransactionAmountParts(1000000, 500000);
    expect(result.regularPart).toBe(500000);
    expect(result.bonusPart).toBe(500000);
  });
});

// ==================== getTransactionSign ====================

describe('getTransactionSign', () => {
  it('returns plus sign for incoming transaction types', () => {
    expect(getTransactionSign('credit')).toBe('+');
    expect(getTransactionSign('bonus')).toBe('+');
    expect(getTransactionSign('refund')).toBe('+');
    expect(getTransactionSign('admin_charge')).toBe('+');
  });

  it('returns hold sign for hold type', () => {
    expect(getTransactionSign('hold')).toBe('⎔');
  });

  it('returns minus sign for outgoing transaction types', () => {
    expect(getTransactionSign('debit')).toBe('-');
    expect(getTransactionSign('release')).toBe('-');
    expect(getTransactionSign('admin_seize')).toBe('-');
  });
});

// ==================== formatTransactionAmount ====================

describe('formatTransactionAmount', () => {
  it('formats credit amount with plus sign', () => {
    expect(formatTransactionAmount('credit', 100)).toContain('+');
    expect(formatTransactionAmount('credit', 100)).toContain('LKM');
  });

  it('formats debit amount with minus sign', () => {
    expect(formatTransactionAmount('debit', 50)).toContain('-');
    expect(formatTransactionAmount('debit', 50)).toContain('LKM');
  });

  it('formats bonus with plus sign', () => {
    expect(formatTransactionAmount('bonus', 200)).toContain('+');
    expect(formatTransactionAmount('bonus', 200)).toContain('LKM');
  });

  it('formats hold with hold sign', () => {
    expect(formatTransactionAmount('hold', 10)).toContain('⎔');
  });

  it('formats release as outgoing', () => {
    expect(formatTransactionAmount('release', 10)).toBe('-10 LKM');
  });

  it('formats admin_charge with plus', () => {
    const result = formatTransactionAmount('admin_charge', 500);
    expect(result).toContain('+');
    expect(result).toContain('500');
  });

  it('formats admin_seize with minus', () => {
    const result = formatTransactionAmount('admin_seize', 300);
    expect(result).toContain('-');
    expect(result).toContain('300');
  });

  it('formats zero amount', () => {
    const result = formatTransactionAmount('credit', 0);
    expect(result).toContain('0');
    expect(result).toContain('LKM');
  });
});

// ==================== isBonusTransaction ====================

describe('isBonusTransaction', () => {
  it('detects bonus type transaction', () => {
    expect(isBonusTransaction({ type: 'bonus', bonusAmount: 0 })).toBe(true);
  });

  it('detects transaction with bonusAmount > 0', () => {
    expect(isBonusTransaction({ type: 'debit', bonusAmount: 5 })).toBe(true);
  });

  it('returns false for regular-only debit', () => {
    expect(isBonusTransaction({ type: 'debit', bonusAmount: 0 })).toBe(false);
  });

  it('returns false for credit without bonus', () => {
    expect(isBonusTransaction({ type: 'credit' })).toBe(false);
  });

  it('returns false for hold without bonus', () => {
    expect(isBonusTransaction({ type: 'hold', bonusAmount: 0 })).toBe(false);
  });

  it('detects refund with bonus component', () => {
    expect(isBonusTransaction({ type: 'refund', bonusAmount: 10 })).toBe(true);
  });

  it('returns false for release without bonus', () => {
    expect(isBonusTransaction({ type: 'release', bonusAmount: 0 })).toBe(false);
  });

  it('detects admin_charge with bonus', () => {
    expect(isBonusTransaction({ type: 'admin_charge', bonusAmount: 25 })).toBe(true);
  });
});

// ==================== formatBalance ====================

describe('formatBalance', () => {
  it('formats zero balance', () => {
    expect(formatBalance(0)).toContain('0');
    expect(formatBalance(0)).toContain('LKM');
  });

  it('formats positive balance', () => {
    expect(formatBalance(100)).toContain('100');
    expect(formatBalance(100)).toContain('LKM');
  });

  it('formats large balance with localized grouping', () => {
    const result = formatBalance(1000000);
    expect(result).toContain('LKM');
    // Contains the number (format may vary by locale)
    expect(result).toBeDefined();
  });
});

// ==================== formatBalanceWithSymbol ====================

describe('formatBalanceWithSymbol', () => {
  it('contains currency symbol', () => {
    const result = formatBalanceWithSymbol(100);
    expect(result).toContain(CURRENCY_SYMBOL);
  });

  it('formats zero with symbol', () => {
    const result = formatBalanceWithSymbol(0);
    expect(result).toContain('0');
    expect(result).toContain(CURRENCY_SYMBOL);
  });
});

// ==================== formatTransactionDate ====================

describe('formatTransactionDate', () => {
  it('formats ISO date string', () => {
    const result = formatTransactionDate('2026-02-14T14:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats different date', () => {
    const result = formatTransactionDate('2025-12-25T10:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ==================== Integration-like scenarios ====================

describe('LKM Payment System — Integration Scenarios', () => {
  it('displays correct sign and formatted amount for complete booking cycle', () => {
    // Hold
    const holdResult = formatTransactionAmount('hold', 100);
    expect(holdResult).toContain('⎔');

    // Release (payment goes through)
    const releaseResult = formatTransactionAmount('release', 100);
    expect(releaseResult).toContain('-');

    // Credit (provider receives)
    const creditResult = formatTransactionAmount('credit', 100);
    expect(creditResult).toContain('+');
  });

  it('correctly identifies bonus vs regular parts in mixed transaction', () => {
    const tx = { type: 'debit' as TransactionType, bonusAmount: 30 };
    expect(isBonusTransaction(tx)).toBe(true);

    const parts = getTransactionAmountParts(100, 30);
    expect(parts.regularPart).toBe(70);
    expect(parts.bonusPart).toBe(30);
  });

  it('handles refund with bonus component correctly', () => {
    const sign = getTransactionSign('refund');
    expect(sign).toBe('+');

    const parts = getTransactionAmountParts(50, 20);
    expect(parts.regularPart).toBe(30);
    expect(parts.bonusPart).toBe(20);
  });

  it('admin charge/seize are correctly signed', () => {
    expect(getTransactionSign('admin_charge')).toBe('+');
    expect(getTransactionSign('admin_seize')).toBe('-');
  });
});
