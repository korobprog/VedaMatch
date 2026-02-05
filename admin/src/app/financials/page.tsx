'use client';

import { useMemo } from 'react';
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
        </div>
    );
}
