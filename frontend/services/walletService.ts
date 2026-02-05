/**
 * Wallet Service - API для работы с кошельком Лакшми
 */
import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';

// ==================== TYPES ====================

export type TransactionType = 'credit' | 'debit' | 'bonus' | 'refund' | 'hold' | 'release' | 'admin_charge' | 'admin_seize';

export interface WalletResponse {
    id: number;
    userId: number;
    balance: number;
    pendingBalance: number;   // Pending (locked until activation)
    frozenBalance: number;    // Frozen (held for bookings)
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

export function getCurrencyName(language: string = 'ru'): string {
    return language === 'ru' ? 'Лакшмани' : 'LakshMoney';
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    credit: 'Пополнение',
    debit: 'Списание',
    bonus: 'Бонус',
    refund: 'Возврат',
    hold: 'Заморозка',
    release: 'Разморозка',
    admin_charge: 'Начисление (Админ)',
    admin_seize: 'Списание (Админ)',
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
    credit: '#4CAF50',       // Green
    debit: '#F44336',        // Red
    bonus: '#FF9800',        // Orange (Amber)
    refund: '#2196F3',       // Blue
    hold: '#9E9E9E',         // Gray
    release: '#4CAF50',      // Green
    admin_charge: '#FFD700', // Gold
    admin_seize: '#FF5722',  // Deep Orange
};

// ==================== API FUNCTIONS ====================

/**
 * Get wallet balance
 */
export async function getWalletBalance(): Promise<WalletResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/wallet`, { headers });

    if (!response.ok) {
        throw new Error('Failed to fetch wallet');
    }

    return response.json();
}

/**
 * Get transaction history
 */
export async function getTransactions(
    filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
    const headers = await getAuthHeaders();

    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `${API_PATH}/wallet/transactions${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
}

/**
 * Get wallet statistics
 */
export async function getWalletStats(): Promise<WalletStatsResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/wallet/stats`, { headers });

    if (!response.ok) throw new Error('Failed to fetch wallet stats');
    return response.json();
}

/**
 * Transfer Лакшми to another user
 */
export async function transferLakshmi(
    data: TransferRequest
): Promise<{ success: boolean; wallet: WalletResponse }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/wallet/transfer`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transfer');
    }

    return response.json();
}

// ==================== HELPERS ====================

/**
 * Format balance for display
 */
export function formatBalance(amount: number): string {
    return `${amount.toLocaleString('ru-RU')} ${CURRENCY_CODE}`;
}

/**
 * Format balance with symbol
 */
export function formatBalanceWithSymbol(amount: number): string {
    return `${amount.toLocaleString('ru-RU')} ${CURRENCY_SYMBOL}`;
}

/**
 * Get transaction sign (+/-)
 */
export function getTransactionSign(type: TransactionType): '+' | '-' | '⎔' {
    if (type === 'credit' || type === 'bonus' || type === 'refund' || type === 'admin_charge' || type === 'release') {
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
export function formatTransactionAmount(type: TransactionType, amount: number): string {
    const sign = getTransactionSign(type);
    return `${sign}${amount.toLocaleString('ru-RU')} ${CURRENCY_CODE}`;
}

/**
 * Format transaction date
 */
export function formatTransactionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
