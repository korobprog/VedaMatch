'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    Users,
    TrendingUp,
    Gift,
    Wallet,
    ArrowUpRight,
    Loader2,
    Trophy,
    Target,
    Zap,
    Coins,
    UserCheck,
    Clock
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function ReferralsPage() {
    const { data: stats, error: statsError } = useSWR('/admin/referrals/stats', fetcher);
    const { data: leaderboard, error: lbError } = useSWR('/admin/referrals/leaderboard', fetcher);
    const { data: walletStats, error: wsError } = useSWR('/admin/wallet/global-stats', fetcher);

    const statCards = useMemo(() => [
        {
            label: 'Total Referrals',
            value: stats?.totalReferrals || 0,
            icon: Users,
            color: 'bg-blue-500',
            description: 'Users joined via invite'
        },
        {
            label: 'Active Referrals',
            value: stats?.activeReferrals || 0,
            icon: UserCheck,
            color: 'bg-emerald-500',
            description: 'Follow-up actions made'
        },
        {
            label: 'Activation Rate',
            value: stats?.activationRate ? `${stats.activationRate.toFixed(1)}%` : '0%',
            icon: Target,
            color: 'bg-purple-500',
            description: 'Efficiency of invites'
        },
        {
            label: 'Referral Rewards',
            value: stats?.totalEarnedByReferrers || 0,
            icon: Gift,
            color: 'bg-amber-500',
            description: 'Total LKM gifted to inviters'
        }
    ], [stats]);

    const walletCards = useMemo(() => [
        {
            label: 'LKM in Circulation',
            value: walletStats?.circulationLKM || 0,
            icon: Coins,
            color: 'bg-indigo-500',
            description: 'Active + Frozen balances'
        },
        {
            label: 'Total LKM Issued',
            value: walletStats?.totalIssuedLKM || 0,
            icon: TrendingUp,
            color: 'bg-pink-500',
            description: 'Total creation by system'
        },
        {
            label: 'Total LKM Spent',
            value: walletStats?.totalSpentLKM || 0,
            icon: Zap,
            color: 'bg-orange-500',
            description: 'Burned via services'
        },
        {
            label: 'Pending Rewards',
            value: walletStats?.totalPendingLKM || 0,
            icon: Clock,
            color: 'bg-cyan-500',
            description: 'Locked welcome bonuses'
        }
    ], [walletStats]);

    if (statsError || lbError || wsError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-red-500">
                <p>Failed to load analytics. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Referrals & Wallet Analytics</h1>
                <p className="text-[var(--muted-foreground)] mt-2">Monitor system economy and user growth through invitations.</p>
            </div>

            {/* Referral Stats */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold">Referral Performance</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((card, idx) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${card.color} bg-opacity-20 text-${card.color.split('-')[1]}-500 group-hover:scale-110 transition-transform`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-[var(--muted-foreground)] text-sm font-medium">{card.label}</h3>
                            <p className="text-3xl font-bold mt-1 tracking-tight">{card.value}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">{card.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Wallet Stats */}
            <section className="space-y-6">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold">LKM Economy</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {walletCards.map((card, idx) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + idx * 0.1 }}
                            className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${card.color} bg-opacity-20 text-${card.color.split('-')[1]}-50 group-hover:scale-110 transition-transform`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-[var(--muted-foreground)] text-sm font-medium">{card.label}</h3>
                            <p className="text-3xl font-bold mt-1 tracking-tight">{card.value} <span className="text-sm font-normal text-[var(--muted-foreground)]">LKM</span></p>
                            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">{card.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leaderboard */}
                <div className="lg:col-span-2 bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-xl">
                                <Trophy className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Top Inviters</h2>
                                <p className="text-sm text-[var(--muted-foreground)]">Community builders by referral revenue</p>
                            </div>
                        </div>
                    </div>

                    {!leaderboard ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-[var(--muted-foreground)] text-xs uppercase text-left border-b border-[var(--border)]">
                                    <th className="pb-4 font-semibold">User</th>
                                    <th className="pb-4 font-semibold text-center">Invited</th>
                                    <th className="pb-4 font-semibold text-center">Active</th>
                                    <th className="pb-4 font-semibold text-right">Earned (LKM)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {leaderboard.map((user: any, idx: number) => (
                                    <tr key={user.id} className="group hover:bg-[var(--secondary)]/50 transition-colors">
                                        <td className="py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[var(--secondary)] rounded-full border border-[var(--border)] flex items-center justify-center text-xs font-bold shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{user.spiritualName || user.karmicName}</p>
                                                <p className="text-[10px] text-[var(--muted-foreground)]">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center text-sm">{user.totalInvited}</td>
                                        <td className="py-4 text-center">
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold">
                                                {user.activeInvited}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right font-bold text-[var(--primary)]">
                                            +{user.totalEarned}
                                        </td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-[var(--muted-foreground)]">
                                            No referrals yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Info Card */}
                <div className="bg-[var(--primary)] text-white p-8 rounded-3xl shadow-xl shadow-[var(--primary)]/20 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Economic Pulse</h2>
                        <p className="text-white/80 text-sm leading-relaxed mb-6">
                            LKM (LakshMoney) circulation tracks the health of the internal economy.
                            The more active referrals, the faster the community grows.
                        </p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-sm text-white/70">Welcome Bonus</span>
                                <span className="font-bold">50 LKM</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-sm text-white/70">Invite Reward</span>
                                <span className="font-bold">100 LKM</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-white/70">Current Phase</span>
                                <span className="font-bold uppercase tracking-widest text-xs bg-white text-[var(--primary)] px-2 py-0.5 rounded">MVP</span>
                            </div>
                        </div>
                    </div>

                    <button className="mt-8 w-full bg-white text-[var(--primary)] py-4 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-lg active:scale-95">
                        Download Report
                    </button>
                </div>
            </div>
        </div>
    );
}
