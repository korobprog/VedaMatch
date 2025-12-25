'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    Users,
    UserPlus,
    UserMinus,
    ShieldCheck,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function DashboardPage() {
    const { data: stats, error } = useSWR('/admin/stats', fetcher);

    const cards = useMemo(() => [
        {
            label: 'Total Users',
            value: stats?.totalUsers || 0,
            icon: Users,
            color: 'bg-blue-500',
            trend: '+12%',
            isUp: true
        },
        {
            label: 'Active Users',
            value: stats?.activeUsers || 0,
            icon: Activity,
            color: 'bg-emerald-500',
            trend: '+5%',
            isUp: true
        },
        {
            label: 'Blocked Users',
            value: stats?.blockedUsers || 0,
            icon: UserMinus,
            color: 'bg-red-500',
            trend: '-2%',
            isUp: false
        },
        {
            label: 'Administrators',
            value: stats?.admins || 0,
            icon: ShieldCheck,
            color: 'bg-purple-500',
            trend: '0%',
            isUp: true
        },
    ], [stats]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-[var(--muted-foreground)] mt-2">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${card.color} bg-opacity-10 text-${card.color.split('-')[1]}-500 group-hover:scale-110 transition-transform`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-medium ${card.isUp ? 'text-emerald-500' : 'text-red-500'} bg-opacity-10 py-1 px-2 rounded-full`}>
                                {card.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {card.trend}
                            </div>
                        </div>
                        <h3 className="text-[var(--muted-foreground)] text-sm font-medium">{card.label}</h3>
                        <p className="text-3xl font-bold mt-1 tracking-tight">{card.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Charts Mockup */}
                <div className="lg:col-span-2 bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold">User Growth</h2>
                            <p className="text-sm text-[var(--muted-foreground)]">System activity over the last 30 days</p>
                        </div>
                        <select className="bg-[var(--secondary)] border-none rounded-lg text-sm px-3 py-2 outline-none">
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                            <option>Last 12 months</option>
                        </select>
                    </div>

                    <div className="h-64 flex items-end gap-2 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 95, 75, 60, 85, 45].map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: 0.5 + i * 0.05, duration: 1 }}
                                className="flex-1 bg-[var(--primary)]/20 hover:bg-[var(--primary)] rounded-t-lg transition-all relative group"
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {h * 10}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-[var(--muted-foreground)] px-2">
                        <span>Jan</span>
                        <span>Mar</span>
                        <span>May</span>
                        <span>Jul</span>
                        <span>Sep</span>
                        <span>Nov</span>
                    </div>
                </div>

                {/* Recent Activity Mockup */}
                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
                    <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
                    <div className="space-y-6">
                        {[
                            { user: 'Bhakta John', action: 'Registered', time: '2m ago', icon: UserPlus, color: 'text-blue-500' },
                            { user: 'Admin Rama', action: 'Blocked user #432', time: '45m ago', icon: ShieldCheck, color: 'text-purple-500' },
                            { user: 'Krishna Das', action: 'Updated profile', time: '2h ago', icon: TrendingUp, color: 'text-emerald-500' },
                            { user: 'System', action: 'Database backup', time: '5h ago', icon: Activity, color: 'text-orange-500' },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className={`w-10 h-10 rounded-full bg-[var(--secondary)] flex items-center justify-center shrink-0 ${item.color}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{item.user}</p>
                                    <p className="text-xs text-[var(--muted-foreground)]">{item.action}</p>
                                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-8 py-3 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--secondary)] transition-all">
                        View All Logs
                    </button>
                </div>
            </div>
        </div>
    );
}
