/**
 * Wallet Service - API для работы с кошельком Лакшми
 */
import apiClient from '../lib/apiClient';
import i18n from '../i18n';

// ==================== TYPES ====================

export type TransactionType = 'credit' | 'debit' | 'bonus' | 'refund' | 'hold' | 'release' | 'admin_charge' | 'admin_seize';

export interface WalletResponse {
    id: number;
    userId: number;
    balance: number;
    bonusBalance: number;
    pendingBalance: number;   // Pending (locked until activation)
    frozenBalance: number;    // Frozen (held for bookings)
    frozenBonusBalance: number;
    currency: string;
    currencyName: string;
    totalEarned: number;
    totalSpent: number;
}

export interface WalletTransaction {
    id: number;
    createdAt: string;
    walletId: number;
    type: TransactionType;
    amount: number;
    bonusAmount?: number;
    description: string;
    bookingId?: number;
    relatedWalletId?: number;
    balanceAfter: number;
}

export interface TransactionFilters {
    type?: TransactionType;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export interface TransactionListResponse {
    transactions: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface WalletStatsResponse {
    balance: number;
    bonusBalance: number;
    totalBalance: number;
    totalEarned: number;
    totalSpent: number;
    thisMonthIn: number;
    thisMonthOut: number;
    pendingIn?: number;
    pendingOut?: number;
}

export interface TransferRequest {
    toUserId: number;
    amount: number;
    description?: string;
    bookingId?: number;
}

// ==================== CONSTANTS ====================

export const CURRENCY_SYMBOL = '₿';
export const CURRENCY_CODE = 'LKM';

const normalizeWalletLanguage = (language?: string): 'ru' | 'en' | 'hi' => {
    const lower = String(language || '').trim().toLowerCase();
    if (lower.startsWith('ru')) {
        return 'ru';
    }
    if (lower.startsWith('hi')) {
        return 'hi';
    }
    return 'en';
};

const TRANSACTION_TYPE_LABELS_BY_LANGUAGE: Record<'ru' | 'en' | 'hi', Record<TransactionType, string>> = {
    ru: {
        credit: 'Пополнение',
        debit: 'Списание',
        bonus: 'Бонус',
        refund: 'Возврат',
        hold: 'Заморозка',
        release: 'Списание из холда',
        admin_charge: 'Начисление (Админ)',
        admin_seize: 'Списание (Админ)',
    },
    en: {
        credit: 'Credit',
        debit: 'Debit',
        bonus: 'Bonus',
        refund: 'Refund',
        hold: 'Hold',
        release: 'Release from hold',
        admin_charge: 'Admin credit',
        admin_seize: 'Admin debit',
    },
    hi: {
        credit: 'जमा',
        debit: 'कटौती',
        bonus: 'बोनस',
        refund: 'रिफंड',
        hold: 'होल्ड',
        release: 'होल्ड से कटौती',
        admin_charge: 'एडमिन जमा',
        admin_seize: 'एडमिन कटौती',
    },
};

const getWalletLocale = (language?: string): string => {
    const normalized = normalizeWalletLanguage(language);
    if (normalized === 'ru') return 'ru-RU';
    if (normalized === 'hi') return 'hi-IN';
    return 'en-US';
};

export function getCurrencyName(language: string = 'ru'): string {
    const normalized = normalizeWalletLanguage(language);
    if (normalized === 'ru') return 'Лакшмани';
    if (normalized === 'hi') return 'लक्ष्ममनी';
    return 'LakshMoney';
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = TRANSACTION_TYPE_LABELS_BY_LANGUAGE.ru;

export function getTransactionTypeLabel(type: TransactionType, language: string = 'ru'): string {
    return TRANSACTION_TYPE_LABELS_BY_LANGUAGE[normalizeWalletLanguage(language)][type];
}

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
    credit: '#4CAF50',       // Green
    debit: '#F44336',        // Red
    bonus: '#FF9800',        // Orange (Amber)
    refund: '#2196F3',       // Blue
    hold: '#9E9E9E',         // Gray
    release: '#F44336',      // Red
    admin_charge: '#FFD700', // Gold
    admin_seize: '#FF5722',  // Deep Orange
};

// ==================== API FUNCTIONS ====================

/**
 * Get wallet balance
 */
export async function getWalletBalance(): Promise<WalletResponse> {
    const response = await apiClient.get('/wallet');
    return response.data;
}

/**
 * Get transaction history
 */
export async function getTransactions(
    filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
    const response = await apiClient.get('/wallet/transactions', { params: filters });
    return response.data;
}

/**
 * Get wallet statistics
 */
export async function getWalletStats(): Promise<WalletStatsResponse> {
    const response = await apiClient.get('/wallet/stats');
    return response.data;
}

/**
 * Transfer Лакшми to another user
 */
export async function transferLakshmi(
    data: TransferRequest
): Promise<{ success: boolean; wallet: WalletResponse }> {
    try {
        const response = await apiClient.post('/wallet/transfer', data);
        return response.data;
    } catch (error: any) {
        const normalized = normalizeWalletLanguage(i18n.language);
        const fallback = normalized === 'ru'
            ? 'Не удалось выполнить перевод'
            : normalized === 'hi'
                ? 'ट्रांसफ़र पूरा नहीं हो सका'
                : 'Failed to transfer';
        throw new Error(error?.response?.data?.error || fallback);
    }
}

// ==================== HELPERS ====================

/**
 * Format balance for display
 */
export function formatBalance(amount: number, language: string = 'ru'): string {
    return `${amount.toLocaleString(getWalletLocale(language))} ${CURRENCY_CODE}`;
}

/**
 * Format balance with symbol
 */
export function formatBalanceWithSymbol(amount: number, language: string = 'ru'): string {
    return `${amount.toLocaleString(getWalletLocale(language))} ${CURRENCY_SYMBOL}`;
}

export interface TransactionAmountParts {
    regularPart: number;
    bonusPart: number;
}

/**
 * Split transaction amount into regular and bonus parts.
 */
export function getTransactionAmountParts(amount: number, bonusAmount?: number): TransactionAmountParts {
    const bonusPart = Math.max(0, bonusAmount ?? 0);
    const regularPart = Math.max(0, amount - bonusPart);
    return { regularPart, bonusPart };
}

/**
 * Bonus transaction definition for history filtering.
 */
export function isBonusTransaction(transaction: Pick<WalletTransaction, 'type' | 'bonusAmount'>): boolean {
    return (transaction.bonusAmount ?? 0) > 0 || transaction.type === 'bonus';
}

/**
 * Get transaction sign (+/-)
 */
export function getTransactionSign(type: TransactionType): '+' | '-' | '⎔' {
    if (type === 'credit' || type === 'bonus' || type === 'refund' || type === 'admin_charge') {
        return '+';
    }
    if (type === 'hold') {
        return '⎔'; // Hold icon (neutral)
    }
    return '-';
}

/**
 * Format transaction amount with sign
 */
export function formatTransactionAmount(type: TransactionType, amount: number, language: string = 'ru'): string {
    const sign = getTransactionSign(type);
    return `${sign}${amount.toLocaleString(getWalletLocale(language))} ${CURRENCY_CODE}`;
}

/**
 * Format transaction date
 */
export function formatTransactionDate(dateString: string, language: string = 'ru'): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(getWalletLocale(language), {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
