'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Trash2,
    Edit3,
    Eye,
    Loader2,
    AlertCircle,
    Archive,
    Clock,
    ShoppingBag,
    Image as ImageIcon
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const getApiOrigin = (): string => String(api.defaults.baseURL || '').replace(/\/api(?:\/.*)?$/, '');

const resolveMediaUrl = (rawUrl?: string | null): string => {
    if (!rawUrl) return '';

    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) return '';

    const httpIndex = trimmedUrl.indexOf('http://');
    const httpsIndex = trimmedUrl.indexOf('https://');
    const protocolIndexes = [httpIndex, httpsIndex].filter((index) => index >= 0);
    const firstProtocolIndex = protocolIndexes.length > 0 ? Math.min(...protocolIndexes) : -1;
    const normalizedUrl = firstProtocolIndex > 0 ? trimmedUrl.slice(firstProtocolIndex) : trimmedUrl;

    if (/^https?:\/\/rvlautoai\.ru\/uploads\//i.test(normalizedUrl)) {
        return '';
    }

    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        return normalizedUrl;
    }

    if (normalizedUrl.startsWith('//')) {
        return `https:${normalizedUrl}`;
    }

    const apiOrigin = getApiOrigin();
    if (!apiOrigin) {
        return normalizedUrl;
    }

    return normalizedUrl.startsWith('/') ? `${apiOrigin}${normalizedUrl}` : `${apiOrigin}/${normalizedUrl}`;
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    active: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
    archived: <Archive className="w-3 h-3" />,
};

export default function AdsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [category, setCategory] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ id: number; open: boolean }>({ id: 0, open: false });
    const [rejectReason, setRejectReason] = useState('');

    const { data, error, mutate } = useSWR(
        `/admin/ads?search=${search}&status=${status}&category=${category}`,
        fetcher
    );

    const { data: stats } = useSWR('/admin/ads/stats', fetcher);

    const handleUpdateStatus = async (adId: number, newStatus: string, comment?: string) => {
        setActionLoading(adId.toString());
        try {
            await api.put(`/admin/ads/${adId}/status`, { status: newStatus, comment: comment || '' });
            mutate();
        } catch (err) {
            console.error('Failed to update status', err);
        } finally {
            setActionLoading(null);
            setRejectModal({ id: 0, open: false });
            setRejectReason('');
        }
    };

    const handleDelete = async (adId: number) => {
        if (!confirm('Вы уверены, что хотите удалить это объявление навсегда?')) return;
        setActionLoading(adId.toString());
        try {
            await api.delete(`/admin/ads/${adId}`);
            mutate();
        } catch (err) {
            console.error('Failed to delete', err);
        } finally {
            setActionLoading(null);
        }
    };

    const ads = data?.ads || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-[var(--primary)]" />
                        Ads Management
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Moderate and manage marketplace ads</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]">
                        <p className="text-2xl font-bold">{stats.total || 0}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Total</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-800">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
                        <p className="text-xs text-yellow-600">Pending</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800">
                        <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
                        <p className="text-xs text-green-600">Active</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-200 dark:border-red-800">
                        <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
                        <p className="text-xs text-red-600">Rejected</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/10 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-600">{stats.archived || 0}</p>
                        <p className="text-xs text-gray-600">Archived</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="rejected">Rejected</option>
                        <option value="archived">Archived</option>
                    </select>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        <option value="yoga_wellness">Yoga & Wellness</option>
                        <option value="ayurveda">Ayurveda</option>
                        <option value="spiritual">Spiritual</option>
                        <option value="goods">Goods</option>
                        <option value="services">Services</option>
                        <option value="housing">Housing</option>
                        <option value="education">Education</option>
                        <option value="events">Events</option>
                    </select>
                </div>
            </div>

            {/* Ads Table */}
            {error ? (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Failed to load ads</p>
                    <button onClick={() => mutate()} className="mt-4 text-sm underline">Try again</button>
                </div>
            ) : !data ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Ad</th>
                                    <th className="px-6 py-4 font-semibold">Author</th>
                                    <th className="px-6 py-4 font-semibold">Category</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {ads.map((ad: any) => {
                                        const previewPhotoUrl = resolveMediaUrl(ad.photos?.[0]?.photoUrl);

                                        return (
                                            <motion.tr
                                                key={ad.ID}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-[var(--secondary)]/50 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-[var(--secondary)] rounded-xl flex items-center justify-center overflow-hidden border border-[var(--border)]">
                                                            {previewPhotoUrl ? (
                                                                <img src={previewPhotoUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-5 h-5 text-[var(--muted-foreground)]" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm line-clamp-1">{ad.title}</p>
                                                            <p className="text-xs text-[var(--muted-foreground)]">{ad.city} • {ad.adType}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm">{ad.author?.spiritualName || ad.author?.karmicName || 'Unknown'}</p>
                                                    <p className="text-xs text-[var(--muted-foreground)]">ID: {ad.userId}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium bg-[var(--secondary)] px-2 py-1 rounded-lg">
                                                        {ad.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${statusColors[ad.status] || ''}`}>
                                                        {statusIcons[ad.status]}
                                                        {ad.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {ad.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(ad.ID, 'active')}
                                                                    disabled={actionLoading === ad.ID.toString()}
                                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all disabled:opacity-30"
                                                                    title="Approve"
                                                                >
                                                                    <CheckCircle className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectModal({ id: ad.ID, open: true })}
                                                                    disabled={actionLoading === ad.ID.toString()}
                                                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all disabled:opacity-30"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="w-5 h-5" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {ad.status === 'active' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(ad.ID, 'archived')}
                                                                disabled={actionLoading === ad.ID.toString()}
                                                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-30"
                                                                title="Archive"
                                                            >
                                                                <Archive className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(ad.ID)}
                                                            disabled={actionLoading === ad.ID.toString()}
                                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                                                            title="Delete"
                                                        >
                                                            {actionLoading === ad.ID.toString() ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {ads.length === 0 && (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No ads found matching your filters.
                        </div>
                    )}
                </div>
            )}

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectModal.open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setRejectModal({ id: 0, open: false })}
                            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] p-6 rounded-2xl shadow-xl z-50 w-full max-w-md border border-[var(--border)]"
                        >
                            <h3 className="text-lg font-bold mb-4">Reject Ad</h3>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none h-24 focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setRejectModal({ id: 0, open: false })}
                                    className="px-4 py-2 rounded-xl text-sm hover:bg-[var(--secondary)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(rejectModal.id, 'rejected', rejectReason)}
                                    className="px-4 py-2 rounded-xl text-sm bg-red-600 text-white hover:bg-red-700"
                                >
                                    Reject
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
