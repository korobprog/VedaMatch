'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    Wallet,
    TrendingUp,
    ShieldCheck,
    BarChart3,
    Heart,
    ArrowUpRight,
    Loader2,
    Coins,
    Banknote,
    Activity,
    Lock,
    PieChart
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function FinancialsPage() {
    const { data: stats, error, isLoading } = useSWR('/admin/financials/stats', fetcher);
    const { data: roomsFund } = useSWR('/admin/funds/summary?service=rooms', fetcher);
    const { data: sevaFund } = useSWR('/admin/funds/summary?service=seva', fetcher);
    const { data: ledgerData } = useSWR('/admin/funds/ledger?service=all&limit=12&page=1', fetcher);
    const { data: permissionsData, mutate: mutatePermissions } = useSWR('/admin/funds/permissions', fetcher);

    const [selectedUserId, setSelectedUserId] = useState<number>(0);
    const [selectedPermission, setSelectedPermission] = useState('finance_manager');
    const [permLoading, setPermLoading] = useState(false);

    const financialCards = useMemo(() => [
        {
            label: 'Всего Обязательств',
            value: stats?.totalLiabilities || 0,
            icon: Wallet,
            color: 'bg-red-500',
            description: 'Активные + Замороженные LKM'
        },
        {
            label: 'Реальный Доход (DEPOSIT)',
            value: stats?.totalRealIncome || 0,
            icon: TrendingUp,
            color: 'bg-emerald-500',
            description: 'Сумма всех физических пополнений'
        },
        {
            label: 'Заблокировано (Pending)',
            value: stats?.totalPendingBalances || 0,
            icon: Lock,
            color: 'bg-amber-500',
            description: 'Бонусы к разморозке'
        },
        {
            label: 'Ликвидность Системы',
            value: stats ? (stats.totalRealIncome - stats.totalLiabilities) : 0,
            icon: ShieldCheck,
            color: 'bg-blue-500',
            description: 'Реальные деньги vs Обязательства'
        }
    ], [stats]);

    const balanceSplit = useMemo(() => [
        { label: 'Активные', value: stats?.totalActiveBalances || 0, color: 'text-emerald-500' },
        { label: 'Замороженные (Hold)', value: stats?.totalFrozenBalances || 0, color: 'text-blue-500' },
        { label: 'Бонусы (Pending)', value: stats?.totalPendingBalances || 0, color: 'text-amber-500' }
    ], [stats]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-red-500">
                <p>Не удалось загрузить финансовую аналитику. Проверьте соединение с сервером.</p>
            </div>
        );
    }

    const handleGrantPermission = async () => {
        if (!selectedUserId || !selectedPermission) return;
        setPermLoading(true);
        try {
            await api.post('/admin/funds/permissions/grant', {
                userId: selectedUserId,
                permission: selectedPermission,
            });
            await mutatePermissions();
        } finally {
            setPermLoading(false);
        }
    };

    const handleRevokePermission = async (userId: number, permission: string) => {
        setPermLoading(true);
        try {
            await api.post('/admin/funds/permissions/revoke', {
                userId,
                permission,
            });
            await mutatePermissions();
        } finally {
            setPermLoading(false);
        }
    };

    return (
        <div className="space-y-10 pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Финансовый Дашборд (P&L)</h1>
                    <p className="text-[var(--muted-foreground)] mt-2">Мониторинг экономики экосистемы Vedamatch и фондов Сева.</p>
                </div>
                <div className="flex gap-3">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold border border-amber-500/20">
                        ФАЗА: MVP (GAME)
                    </span>
                </div>
            </div>

            {/* Main Financial Metrics */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold">Основные показатели</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {financialCards.map((card, idx) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${card.color} bg-opacity-20 text-${card.color.split('-')[1]}-500 group-hover:scale-110 transition-transform`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-[var(--muted-foreground)] text-sm font-medium">{card.label}</h3>
                            <p className="text-3xl font-bold mt-1 tracking-tight">
                                {card.value.toLocaleString('ru-RU')}
                                <span className="text-sm font-normal text-[var(--muted-foreground)] ml-1">LKM</span>
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">{card.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Charity Funds List */}
                <div className="lg:col-span-2 bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 rounded-xl">
                                <Heart className="w-5 h-5 text-pink-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Благотворительные фонды (Seva)</h2>
                                <p className="text-sm text-[var(--muted-foreground)]">Балансы целевых кошельков сообщества</p>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats?.charityFunds?.map((fund: any) => (
                                <div key={fund.name} className="flex items-center justify-between p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                            {fund.name.split('_').pop()?.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{fund.name.replace('FUND_', '')}</p>
                                            <p className="text-[10px] text-[var(--muted-foreground)]">Целевой счет</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-500">+{fund.balance.toLocaleString('ru-RU')} LKM</p>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.charityFunds || stats.charityFunds.length === 0) && (
                                <div className="col-span-2 py-10 text-center text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-2xl">
                                    Активных фондов пока не обнаружено.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Economic Breakdown */}
                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/20 rounded-xl">
                                <PieChart className="w-5 h-5 text-indigo-500" />
                            </div>
                            <h2 className="text-xl font-bold">Структура балансов</h2>
                        </div>

                        <div className="space-y-6">
                            {balanceSplit.map((item) => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--muted-foreground)]">{item.label}</span>
                                        <span className={`font-bold ${item.color}`}>{item.value.toLocaleString('ru-RU')} LKM</span>
                                    </div>
                                    <div className="h-2 bg-[var(--secondary)] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: stats?.totalLiabilities ? `${(item.value / (stats.totalLiabilities + stats.totalPendingBalances)) * 100}%` : '0%' }}
                                            className={`h-full ${item.color.replace('text', 'bg')}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <div className="flex gap-3">
                                <Activity className="w-5 h-5 text-blue-500 shrink-0" />
                                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                                    Уровень ликвидности показывает способность системы обеспечить обязательства реальными активами.
                                    Положительное значение означает избыток резервов.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button className="mt-8 w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <Banknote className="w-5 h-5" />
                        Экспорт отчета P&L
                    </button>
                </div>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold">Касса сервисов</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
                        <h3 className="text-lg font-bold">Rooms Fund</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">Баланс по сервису Комнаты</p>
                        <div className="mt-4 space-y-2 text-sm">
                            <p>Income: <span className="font-semibold text-emerald-500">{(roomsFund?.income || 0).toLocaleString('ru-RU')} LKM</span></p>
                            <p>Expense: <span className="font-semibold text-red-500">{(roomsFund?.expense || 0).toLocaleString('ru-RU')} LKM</span></p>
                            <p>Net: <span className="font-semibold">{(roomsFund?.net || 0).toLocaleString('ru-RU')} LKM</span></p>
                        </div>
                    </div>

                    <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
                        <h3 className="text-lg font-bold">Seva Fund</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">Баланс по сервису Seva</p>
                        <div className="mt-4 space-y-2 text-sm">
                            <p>Income: <span className="font-semibold text-emerald-500">{(sevaFund?.income || 0).toLocaleString('ru-RU')} LKM</span></p>
                            <p>Expense: <span className="font-semibold text-red-500">{(sevaFund?.expense || 0).toLocaleString('ru-RU')} LKM</span></p>
                            <p>Net: <span className="font-semibold">{(sevaFund?.net || 0).toLocaleString('ru-RU')} LKM</span></p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Журнал операций (последние 12)</h2>
                    <a
                        href="/api/admin/funds/ledger/export.csv?service=all"
                        className="text-sm text-[var(--primary)] hover:underline"
                    >
                        Экспорт CSV
                    </a>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-[var(--secondary)]/40">
                            <tr>
                                <th className="text-left px-4 py-3">Дата</th>
                                <th className="text-left px-4 py-3">Сервис</th>
                                <th className="text-left px-4 py-3">Trigger</th>
                                <th className="text-left px-4 py-3">Счет</th>
                                <th className="text-left px-4 py-3">Тип</th>
                                <th className="text-right px-4 py-3">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(ledgerData?.items || []).map((row: any) => (
                                <tr key={row.id} className="border-t border-[var(--border)]">
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleString('ru-RU')}</td>
                                    <td className="px-4 py-3">{row.sourceService}</td>
                                    <td className="px-4 py-3">{row.sourceTrigger}</td>
                                    <td className="px-4 py-3">{row.accountCode}</td>
                                    <td className="px-4 py-3">{row.entryType}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{Number(row.amount || 0).toLocaleString('ru-RU')} LKM</td>
                                </tr>
                            ))}
                            {(ledgerData?.items || []).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                                        Операции пока отсутствуют.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">RBAC финансов</h2>
                <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                            value={selectedUserId || ''}
                            onChange={(e) => setSelectedUserId(Number(e.target.value))}
                        >
                            <option value="">Выберите админа</option>
                            {(permissionsData?.admins || []).map((admin: any) => (
                                <option key={admin.id} value={admin.id}>
                                    {admin.email} ({admin.role})
                                </option>
                            ))}
                        </select>

                        <select
                            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                            value={selectedPermission}
                            onChange={(e) => setSelectedPermission(e.target.value)}
                        >
                            <option value="finance_manager">finance_manager</option>
                            <option value="finance_approver">finance_approver</option>
                        </select>

                        <button
                            className="rounded-xl bg-[var(--primary)] text-white px-4 py-2 disabled:opacity-50"
                            disabled={permLoading || !selectedUserId}
                            onClick={handleGrantPermission}
                        >
                            Выдать право
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[var(--secondary)]/40">
                                <tr>
                                    <th className="text-left px-4 py-3">User ID</th>
                                    <th className="text-left px-4 py-3">Permission</th>
                                    <th className="text-left px-4 py-3">Granted By</th>
                                    <th className="text-left px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(permissionsData?.grants || []).map((grant: any) => (
                                    <tr key={grant.id} className="border-t border-[var(--border)]">
                                        <td className="px-4 py-3">{grant.userId}</td>
                                        <td className="px-4 py-3">{grant.permission}</td>
                                        <td className="px-4 py-3">{grant.grantedBy}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                className="text-red-500 hover:underline disabled:opacity-50"
                                                disabled={permLoading}
                                                onClick={() => handleRevokePermission(grant.userId, grant.permission)}
                                            >
                                                Отозвать
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(permissionsData?.grants || []).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                                            Нет выданных permission.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}
