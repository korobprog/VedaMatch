'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Wallet,
    Plus,
    Minus,
    History,
    Loader2,
    AlertCircle,
    CheckCircle,
    Clock,
    Lock,
    Unlock,
    ArrowDown,
    ArrowUp,
    Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Transaction type styling
const TRANSACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof ArrowDown }> = {
    credit: { label: 'Пополнение', color: 'text-emerald-500', icon: ArrowDown },
    debit: { label: 'Списание', color: 'text-red-500', icon: ArrowUp },
    bonus: { label: 'Бонус', color: 'text-amber-500', icon: Sparkles },
    refund: { label: 'Возврат', color: 'text-blue-500', icon: ArrowDown },
    hold: { label: 'Заморозка', color: 'text-gray-500', icon: Lock },
    release: { label: 'Разморозка', color: 'text-emerald-500', icon: Unlock },
    admin_charge: { label: 'Начисление (Админ)', color: 'text-amber-600', icon: Plus },
    admin_seize: { label: 'Списание (Админ)', color: 'text-red-600', icon: Minus },
};

interface WalletData {
    id: number;
    userId: number;
    balance: number;
    pendingBalance: number;
    frozenBalance: number;
    totalEarned: number;
    totalSpent: number;
}

interface Transaction {
    id: number;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
    balanceAfter: number;
    adminId?: number;
    reason?: string;
}

interface UserData {
    ID: number;
    spiritualName?: string;
    karmicName?: string;
    email: string;
}

export default function UserWalletPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params?.id as string;

    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch user data
    const { data: user, error: userError } = useSWR<UserData>(
        userId ? `/admin/users?search=id:${userId}` : null,
        async (url: string) => {
            const res = await api.get(url);
            const users = res.data;
            return users?.find((u: UserData) => u.ID === parseInt(userId)) || null;
        }
    );

    // Fetch wallet data
    const { data: wallet, error: walletError, mutate: mutateWallet } = useSWR<WalletData>(
        userId ? `/admin/wallet/${userId}` : null,
        fetcher
    );

    // Fetch transactions
    const { data: transactionsData, mutate: mutateTransactions } = useSWR<{ transactions: Transaction[] }>(
        userId ? `/admin/wallet/${userId}/transactions?limit=50` : null,
        fetcher
    );

    const transactions = transactionsData?.transactions || [];

    const handleCharge = async () => {
        if (!amount || parseInt(amount) <= 0) return;
        setActionLoading('charge');
        try {
            await api.post('/admin/wallet/charge', {
                userId: parseInt(userId),
                amount: parseInt(amount),
                reason: reason || 'Начисление администратором',
            });
            setSuccessMessage(`Успешно начислено ${amount} LKM`);
            setShowSuccess(true);
            setAmount('');
            setReason('');
            mutateWallet();
            mutateTransactions();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to charge wallet', err);
            alert('Ошибка при начислении');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSeize = async () => {
        if (!amount || parseInt(amount) <= 0) return;
        if (!confirm(`Вы уверены, что хотите списать ${amount} LKM?`)) return;

        setActionLoading('seize');
        try {
            await api.post('/admin/wallet/seize', {
                userId: parseInt(userId),
                amount: parseInt(amount),
                reason: reason || 'Списание администратором',
            });
            setSuccessMessage(`Успешно списано ${amount} LKM`);
            setShowSuccess(true);
            setAmount('');
            setReason('');
            mutateWallet();
            mutateTransactions();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            console.error('Failed to seize from wallet', err);
            alert(err?.response?.data?.error || 'Ошибка при списании');
        } finally {
            setActionLoading(null);
        }
    };

    const handleActivatePending = async () => {
        if (!wallet?.pendingBalance) return;
        if (!confirm(`Активировать ${wallet.pendingBalance} LKM из заблокированного баланса?`)) return;

        setActionLoading('activate');
        try {
            await api.post(`/admin/wallet/${userId}/activate`);
            setSuccessMessage(`Активировано ${wallet.pendingBalance} LKM`);
            setShowSuccess(true);
            mutateWallet();
            mutateTransactions();
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to activate pending balance', err);
            alert('Ошибка при активации');
        } finally {
            setActionLoading(null);
        }
    };

    const userName = user?.spiritualName || user?.karmicName || user?.email || `User #${userId}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/users"
                    className="p-2 rounded-xl bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-amber-500" />
                        Кошелёк: {userName}
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-sm">
                        Управление балансом пользователя (God Mode)
                    </p>
                </div>
            </div>

            {/* Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        {successMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading State */}
            {!wallet && !walletError && (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            )}

            {/* Error State */}
            {walletError && (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Не удалось загрузить кошелёк</p>
                    <button onClick={() => mutateWallet()} className="mt-4 text-sm underline">
                        Попробовать снова
                    </button>
                </div>
            )}

            {wallet && (
                <>
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Active Balance */}
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <Wallet className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Активный баланс</span>
                            </div>
                            <p className="text-4xl font-black">{wallet.balance.toLocaleString('ru-RU')}</p>
                            <p className="text-xs opacity-70 mt-1">LKM (Лакшмани)</p>
                        </div>

                        {/* Pending Balance */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-[var(--muted-foreground)]">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Заблокировано</span>
                            </div>
                            <p className="text-4xl font-black text-gray-500">{wallet.pendingBalance.toLocaleString('ru-RU')}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">Ожидает активации</p>
                            {wallet.pendingBalance > 0 && (
                                <button
                                    onClick={handleActivatePending}
                                    disabled={actionLoading === 'activate'}
                                    className="mt-3 w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading === 'activate' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Unlock className="w-4 h-4" />
                                    )}
                                    Активировать
                                </button>
                            )}
                        </div>

                        {/* Frozen Balance */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-[var(--muted-foreground)]">
                                <Lock className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Заморожено</span>
                            </div>
                            <p className="text-4xl font-black text-blue-500">{wallet.frozenBalance.toLocaleString('ru-RU')}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">Холд (бронирования)</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                <ArrowDown className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Всего получено</p>
                                <p className="text-2xl font-bold text-emerald-500">+{wallet.totalEarned.toLocaleString('ru-RU')}</p>
                            </div>
                        </div>
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                <ArrowUp className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Всего потрачено</p>
                                <p className="text-2xl font-bold text-red-500">-{wallet.totalSpent.toLocaleString('ru-RU')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            God Mode: Управление балансом
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-2">
                                    Сумма (LKM)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="100"
                                    className="w-full bg-[var(--secondary)] border-none rounded-xl py-3 px-4 text-lg font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-2">
                                    Причина (для аудита)
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Бонус за активность / Корректировка баланса / ..."
                                    className="w-full bg-[var(--secondary)] border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleCharge}
                                disabled={!amount || parseInt(amount) <= 0 || actionLoading === 'charge'}
                                className="flex-1 py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'charge' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5" />
                                )}
                                Начислить
                            </button>
                            <button
                                onClick={handleSeize}
                                disabled={!amount || parseInt(amount) <= 0 || actionLoading === 'seize'}
                                className="flex-1 py-3 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'seize' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Minus className="w-5 h-5" />
                                )}
                                Списать
                            </button>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)]">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <History className="w-5 h-5 text-[var(--muted-foreground)]" />
                                История транзакций
                            </h2>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {transactions.length === 0 ? (
                                <div className="p-12 text-center text-[var(--muted-foreground)]">
                                    Нет транзакций
                                </div>
                            ) : (
                                transactions.map((tx) => {
                                    const config = TRANSACTION_CONFIG[tx.type] || TRANSACTION_CONFIG.credit;
                                    const Icon = config.icon;
                                    const isPositive = ['credit', 'bonus', 'refund', 'admin_charge', 'release'].includes(tx.type);

                                    return (
                                        <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-[var(--secondary)]/50 transition-colors">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                                <Icon className={`w-5 h-5 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate">{config.label}</p>
                                                <p className="text-xs text-[var(--muted-foreground)] truncate">
                                                    {tx.description || tx.reason || '-'}
                                                </p>
                                                <p className="text-[10px] text-[var(--muted-foreground)]">
                                                    {new Date(tx.createdAt).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {isPositive ? '+' : '-'}{tx.amount.toLocaleString('ru-RU')}
                                                </p>
                                                <p className="text-[10px] text-[var(--muted-foreground)]">
                                                    Баланс: {tx.balanceAfter?.toLocaleString('ru-RU') || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
