'use client';

import { useMemo, useState } from 'react';
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
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
    Legend,
} from 'recharts';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function DashboardPage() {
    const [alertStatusFilter, setAlertStatusFilter] = useState<string>('');
    const [alertTypeFilter, setAlertTypeFilter] = useState<string>('');
    const [alertSortBy, setAlertSortBy] = useState<string>('createdAt');
    const [alertSortDir, setAlertSortDir] = useState<string>('desc');
    const [retryBusyId, setRetryBusyId] = useState<number | null>(null);
    const [bulkRetryBusy, setBulkRetryBusy] = useState(false);
    const [alertsPage, setAlertsPage] = useState(1);
    const alertsPageSize = 12;

    const { data: stats, error } = useSWR('/admin/stats', fetcher);
    const { data: trackerMetrics } = useSWR('/admin/path-tracker/metrics', fetcher);
    const { data: trackerAnalytics } = useSWR('/admin/path-tracker/analytics?days=14', fetcher);
    const { data: trackerOps } = useSWR('/admin/path-tracker/ops', fetcher);
    const alertsKey = `/admin/path-tracker/alerts?page=${alertsPage}&pageSize=${alertsPageSize}&status=${encodeURIComponent(alertStatusFilter)}&type=${encodeURIComponent(alertTypeFilter)}&sortBy=${encodeURIComponent(alertSortBy)}&sortDir=${encodeURIComponent(alertSortDir)}`;
    const { data: trackerAlerts, mutate: mutateTrackerAlerts } = useSWR(alertsKey, fetcher);

    const retryAlert = async (id: number) => {
        setRetryBusyId(id);
        try {
            await api.post(`/admin/path-tracker/alerts/${id}/retry`);
            await mutateTrackerAlerts();
        } finally {
            setRetryBusyId(null);
        }
    };

    const retryFailedLastHour = async () => {
        setBulkRetryBusy(true);
        try {
            await api.post('/admin/path-tracker/alerts/retry-failed?minutes=60&limit=50');
            await mutateTrackerAlerts();
        } finally {
            setBulkRetryBusy(false);
        }
    };

    const exportAlertsCsv = async () => {
        if (typeof window === 'undefined') return;
        const adminDataRaw = localStorage.getItem('admin_data');
        const adminData = adminDataRaw ? JSON.parse(adminDataRaw) : null;
        const token = adminData?.token;

        const params = new URLSearchParams({
            page: String(alertsPage),
            pageSize: String(alertsPageSize),
            status: alertStatusFilter,
            type: alertTypeFilter,
            sortBy: alertSortBy,
            sortDir: alertSortDir,
        });

        const base = String(api.defaults.baseURL || '');
        const url = `${base}/admin/path-tracker/alerts/export?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `path_tracker_alerts_page_${alertsPage}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);
    };

    const totalAlerts = Number(trackerAlerts?.total || 0);
    const totalPages = Math.max(1, Math.ceil(totalAlerts / alertsPageSize));

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

            {/* Path Tracker Metrics */}
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-6">
                <div>
                    <h2 className="text-xl font-bold">Path Tracker MVP</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Completion and early retention snapshot</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Completion Rate</p>
                        <p className="text-2xl font-bold mt-2">{Number(trackerMetrics?.completionRate || 0).toFixed(1)}%</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {trackerMetrics?.completedSteps || 0} / {trackerMetrics?.totalSteps || 0} steps
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">D1 Retention</p>
                        <p className="text-2xl font-bold mt-2">{Number(trackerMetrics?.d1RetentionRate || 0).toFixed(1)}%</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {trackerMetrics?.d1RetainedUsers || 0} / {trackerMetrics?.d1RetentionEligible || 0} users
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">D7 Retention</p>
                        <p className="text-2xl font-bold mt-2">{Number(trackerMetrics?.d7RetentionRate || 0).toFixed(1)}%</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {trackerMetrics?.d7RetainedUsers || 0} / {trackerMetrics?.d7RetentionEligible || 0} users
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                    <p className="text-sm text-[var(--muted-foreground)]">
                        Users with steps: <span className="font-semibold text-[var(--foreground)]">{trackerMetrics?.usersWithSteps || 0}</span>
                    </p>
                </div>
            </div>

            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-4">
                <div>
                    <h2 className="text-xl font-bold">Path Tracker Ops</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Operational rollout and delivery snapshot</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Feature Enabled</p>
                        <p className="text-xl font-bold mt-2">{trackerOps?.enabled ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Rollout</p>
                        <p className="text-xl font-bold mt-2">{Number(trackerOps?.rolloutPercent || 0).toFixed(0)}%</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">allow {trackerOps?.allowlistCount || 0} / deny {trackerOps?.denylistCount || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Webhook</p>
                        <p className="text-xl font-bold mt-2">{trackerOps?.alertWebhookConfigured ? 'Configured' : 'Missing'}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">sent 1h: {trackerOps?.recentSentAlerts1h || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Failed Alerts (1h)</p>
                        <p className="text-xl font-bold mt-2">{trackerOps?.recentFailedAlerts1h || 0}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">phase3: {trackerOps?.phase3ExperimentMode || 'off'}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">updated {trackerOps?.updatedAt || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Path Tracker Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">Path Tracker Trend (14d)</h2>
                        <p className="text-sm text-[var(--muted-foreground)]">Assigned/completed steps and completion rate by day</p>
                    </div>
                    <div className="min-h-[280px]">
                        <ResponsiveContainer width="100%" height={280} minWidth={0}>
                            <LineChart data={trackerAnalytics?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="assignedSteps" name="Assigned" stroke="#3B82F6" strokeWidth={2} dot={false} />
                                <Line yAxisId="left" type="monotone" dataKey="completedSteps" name="Completed" stroke="#22C55E" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion %" stroke="#F97316" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">A/B Bucket Compare</h2>
                        <p className="text-sm text-[var(--muted-foreground)]">control vs weekly_summary_v1 completion rate</p>
                    </div>
                    <div className="min-h-[280px]">
                        <ResponsiveContainer width="100%" height={280} minWidth={0}>
                            <BarChart data={trackerAnalytics?.bucketComparison || []}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completionRate" name="Completion %" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(trackerAnalytics?.bucketComparison || []).map((bucket: any) => (
                            <div key={bucket.bucket} className="rounded-xl border border-[var(--border)] p-3 bg-[var(--background)]/40">
                                <p className="text-xs text-[var(--muted-foreground)] uppercase">{bucket.bucket}</p>
                                <p className="text-lg font-bold mt-1">{Number(bucket.completionRate || 0).toFixed(1)}%</p>
                                <p className="text-xs text-[var(--muted-foreground)] mt-1">{bucket.completedSteps || 0} / {bucket.totalSteps || 0} steps</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">Segment Comparison</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(trackerAnalytics?.segmentComparison || []).map((segment: any) => (
                                <div key={segment.segment} className="rounded-xl border border-[var(--border)] p-3 bg-[var(--background)]/40">
                                    <p className="text-xs text-[var(--muted-foreground)] uppercase">{segment.segment}</p>
                                    <p className="text-lg font-bold mt-1">{Number(segment.completionRate || 0).toFixed(1)}%</p>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{segment.completedSteps || 0} / {segment.totalSteps || 0} steps</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Path Tracker Alerts */}
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-4">
                <div>
                    <h2 className="text-xl font-bold">Path Tracker Alerts</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Runtime alert signals for rollout safety</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Fallback Rate (1h)</p>
                            <span className={`text-xs font-semibold ${trackerAnalytics?.alerts?.fallbackTriggered ? 'text-red-500' : 'text-emerald-500'}`}>
                                {trackerAnalytics?.alerts?.fallbackTriggered ? 'ALERT' : 'OK'}
                            </span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{Number(trackerAnalytics?.alerts?.fallbackRate1h || 0).toFixed(1)}%</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            threshold {Number(trackerAnalytics?.alerts?.fallbackThreshold || 20).toFixed(1)}%, samples {trackerAnalytics?.alerts?.fallbackSamples1h || 0}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--background)]/40">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Generate Error Rate (15m)</p>
                            <span className={`text-xs font-semibold ${trackerAnalytics?.alerts?.generateErrorTriggered ? 'text-red-500' : 'text-emerald-500'}`}>
                                {trackerAnalytics?.alerts?.generateErrorTriggered ? 'ALERT' : 'OK'}
                            </span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{Number(trackerAnalytics?.alerts?.generateErrorRate15m || 0).toFixed(1)}%</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            threshold {Number(trackerAnalytics?.alerts?.generateThreshold || 5).toFixed(1)}%, errors {trackerAnalytics?.alerts?.generateErrors15m || 0} / attempts {trackerAnalytics?.alerts?.generateAttempts15m || 0}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-4">
                <div>
                    <h2 className="text-xl font-bold">Path Tracker Alert History</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Recent alert delivery events</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        value={alertStatusFilter}
                        onChange={(e) => {
                            setAlertStatusFilter(e.target.value);
                            setAlertsPage(1);
                        }}
                        className="bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 outline-none"
                    >
                        <option value="">All statuses</option>
                        <option value="sent">sent</option>
                        <option value="failed">failed</option>
                        <option value="skipped">skipped</option>
                    </select>
                    <select
                        value={alertTypeFilter}
                        onChange={(e) => {
                            setAlertTypeFilter(e.target.value);
                            setAlertsPage(1);
                        }}
                        className="bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 outline-none"
                    >
                        <option value="">All alert types</option>
                        <option value="path_tracker_fallback_rate_high">fallback_rate_high</option>
                        <option value="path_tracker_generate_error_rate_high">generate_error_rate_high</option>
                    </select>
                    <select
                        value={alertSortBy}
                        onChange={(e) => {
                            setAlertSortBy(e.target.value);
                            setAlertsPage(1);
                        }}
                        className="bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 outline-none"
                    >
                        <option value="createdAt">Sort by createdAt</option>
                        <option value="deliveryStatus">Sort by deliveryStatus</option>
                    </select>
                    <select
                        value={alertSortDir}
                        onChange={(e) => {
                            setAlertSortDir(e.target.value);
                            setAlertsPage(1);
                        }}
                        className="bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 outline-none"
                    >
                        <option value="desc">desc</option>
                        <option value="asc">asc</option>
                    </select>
                    <button
                        className="rounded-lg border border-[var(--border)] text-sm px-3 py-2 hover:bg-[var(--secondary)] transition-all"
                        onClick={() => mutateTrackerAlerts()}
                    >
                        Refresh
                    </button>
                    <button
                        className="rounded-lg border border-[var(--border)] text-sm px-3 py-2 hover:bg-[var(--secondary)] transition-all"
                        onClick={exportAlertsCsv}
                    >
                        Export CSV
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        className="rounded-lg border border-[var(--border)] text-sm px-3 py-2 hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
                        onClick={retryFailedLastHour}
                        disabled={bulkRetryBusy}
                    >
                        {bulkRetryBusy ? 'Retrying failed...' : 'Retry failed (1h)'}
                    </button>
                    <span className="text-xs text-[var(--muted-foreground)]">
                        Page {alertsPage} / {totalPages} · total {totalAlerts}
                    </span>
                    <button
                        className="rounded-lg border border-[var(--border)] text-xs px-3 py-2 hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
                        onClick={() => setAlertsPage((p) => Math.max(1, p - 1))}
                        disabled={alertsPage <= 1}
                    >
                        Prev
                    </button>
                    <button
                        className="rounded-lg border border-[var(--border)] text-xs px-3 py-2 hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
                        onClick={() => setAlertsPage((p) => Math.min(totalPages, p + 1))}
                        disabled={alertsPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                                <th className="py-2 pr-3">Time (UTC)</th>
                                <th className="py-2 pr-3">Type</th>
                                <th className="py-2 pr-3">Severity</th>
                                <th className="py-2 pr-3">Current / Threshold</th>
                                <th className="py-2 pr-3">Window</th>
                                <th className="py-2 pr-3">Delivery</th>
                                <th className="py-2 pr-3">Error</th>
                                <th className="py-2 pr-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(trackerAlerts?.events || []).map((event: any) => (
                                <tr key={event.id} className="border-b border-[var(--border)]/40">
                                    <td className="py-2 pr-3 whitespace-nowrap">{event.createdAt || '-'}</td>
                                    <td className="py-2 pr-3">{event.alertType || '-'}</td>
                                    <td className="py-2 pr-3">{event.severity || '-'}</td>
                                    <td className="py-2 pr-3">{event.currentValue || '-'} / {event.threshold || '-'}</td>
                                    <td className="py-2 pr-3">{event.windowMinutes || 0}m</td>
                                    <td className="py-2 pr-3">
                                        <span className={`text-xs font-semibold ${
                                            event.deliveryStatus === 'sent'
                                                ? 'text-emerald-500'
                                                : event.deliveryStatus === 'failed'
                                                    ? 'text-red-500'
                                                    : 'text-amber-500'
                                        }`}>
                                            {event.deliveryStatus || 'unknown'}
                                        </span>
                                        {event.deliveryCode ? <span className="ml-2 text-xs text-[var(--muted-foreground)]">({event.deliveryCode})</span> : null}
                                    </td>
                                    <td className="py-2 pr-3 max-w-[220px]">
                                        {event.errorText ? (
                                            <span
                                                className="text-xs text-[var(--muted-foreground)] truncate inline-block max-w-[220px]"
                                                title={event.errorText}
                                            >
                                                {event.errorText}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {event.deliveryStatus !== 'sent' ? (
                                            <button
                                                className="text-xs rounded-md border border-[var(--border)] px-2 py-1 hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
                                                onClick={() => retryAlert(event.id)}
                                                disabled={retryBusyId === event.id}
                                            >
                                                {retryBusyId === event.id ? 'Retrying...' : 'Retry'}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
