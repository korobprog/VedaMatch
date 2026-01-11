'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    CheckCircle,
    XCircle,
    Trash2,
    Edit3,
    Eye,
    Loader2,
    AlertCircle,
    Archive,
    Clock,
    Newspaper,
    Globe,
    Star,
    Send,
    X,
    Image as ImageIcon,
    Rss,
    Link2
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    published: 'bg-green-100 text-green-800 border-green-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
    deleted: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons: Record<string, React.ReactNode> = {
    draft: <Clock className="w-3 h-3" />,
    published: <CheckCircle className="w-3 h-3" />,
    archived: <Archive className="w-3 h-3" />,
    deleted: <XCircle className="w-3 h-3" />,
};

const sourceTypeIcons: Record<string, React.ReactNode> = {
    rss: <Rss className="w-4 h-4" />,
    url: <Link2 className="w-4 h-4" />,
    vk: <Globe className="w-4 h-4" />,
    telegram: <Send className="w-4 h-4" />,
};

interface NewsItem {
    ID: number;
    sourceId: number;
    titleRu: string;
    titleEn: string;
    summaryRu: string;
    summaryEn: string;
    contentRu: string;
    contentEn: string;
    imageUrl: string;
    tags: string;
    category: string;
    status: string;
    isImportant: boolean;
    publishedAt: string | null;
    viewsCount: number;
    CreatedAt: string;
    Source?: {
        ID: number;
        name: string;
        sourceType: string;
    };
}

interface NewsSource {
    ID: number;
    name: string;
    description: string;
    sourceType: string;
    url: string;
    vkGroupId: string;
    telegramId: string;
    isActive: boolean;
    fetchInterval: number;
    mode: string;
    autoTranslate: boolean;
    styleTransfer: boolean;
    defaultTags: string;
    lastFetchedAt: string | null;
    lastError: string | null;
    tgParserType: string;
    targetMadh: string;
    targetYoga: string;
    targetIdentity: string;
}

const MADH_OPTIONS = [
    { id: 'iskcon', label: 'ISKCON' },
    { id: 'gaudiya', label: 'Gaudiya Math' },
    { id: 'srivaishnava', label: 'Sri Vaishnava' },
    { id: 'vedic', label: 'Vedic' },
    { id: 'bvs-source', label: 'BVS Source' },
];

const YOGA_OPTIONS = [
    { id: 'bhakti', label: 'Bhakti Yoga' },
    { id: 'hatha', label: 'Hatha Yoga' },
    { id: 'kundalini', label: 'Kundalini' },
    { id: 'meditation', label: 'Meditation' },
    { id: 'kirtan', label: 'Kirtan' },
];

const IDENTITY_OPTIONS = [
    { id: 'brahmana', label: 'Brahmana' },
    { id: 'vaishya', label: 'Vaishya' },
    { id: 'seeker', label: 'Seeker' },
    { id: 'teacher', label: 'Teacher' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'leader', label: 'Leader' },
];

type TabType = 'news' | 'sources';

export default function NewsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('news');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Modals
    const [newsModal, setNewsModal] = useState<{ open: boolean; news: NewsItem | null }>({ open: false, news: null });
    const [sourceModal, setSourceModal] = useState<{ open: boolean; source: NewsSource | null }>({ open: false, source: null });

    // News data
    const { data: newsData, error: newsError, mutate: mutateNews } = useSWR(
        `/admin/news?search=${search}&status=${status}`,
        fetcher
    );

    // Sources data
    const { data: sourcesData, error: sourcesError, mutate: mutateSources } = useSWR(
        '/admin/news/sources',
        fetcher
    );

    // Stats
    const { data: stats } = useSWR('/admin/news/stats', fetcher);

    const news = newsData?.news || [];
    const sources = sourcesData?.sources || [];

    // ========== NEWS ACTIONS ==========
    const handlePublish = async (id: number) => {
        setActionLoading(id.toString());
        try {
            await api.post(`/admin/news/${id}/publish`);
            mutateNews();
        } catch (err) {
            console.error('Failed to publish', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteNews = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;
        setActionLoading(id.toString());
        try {
            await api.delete(`/admin/news/${id}`);
            mutateNews();
        } catch (err) {
            console.error('Failed to delete', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveNews = async (newsItem: Partial<NewsItem>) => {
        setActionLoading('save');
        try {
            if (newsModal.news?.ID) {
                await api.put(`/admin/news/${newsModal.news.ID}`, newsItem);
            } else {
                await api.post('/admin/news', newsItem);
            }
            mutateNews();
            setNewsModal({ open: false, news: null });
        } catch (err) {
            console.error('Failed to save news', err);
        } finally {
            setActionLoading(null);
        }
    };

    // ========== SOURCE ACTIONS ==========
    const handleToggleSource = async (id: number) => {
        setActionLoading(`source-${id}`);
        try {
            await api.post(`/admin/news/sources/${id}/toggle`);
            mutateSources();
        } catch (err) {
            console.error('Failed to toggle source', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteSource = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот источник?')) return;
        setActionLoading(`source-${id}`);
        try {
            await api.delete(`/admin/news/sources/${id}`);
            mutateSources();
        } catch (err) {
            console.error('Failed to delete source', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveSource = async (source: Partial<NewsSource>) => {
        setActionLoading('save');
        try {
            if (sourceModal.source?.ID) {
                await api.put(`/admin/news/sources/${sourceModal.source.ID}`, source);
            } else {
                await api.post('/admin/news/sources', source);
            }
            mutateSources();
            setSourceModal({ open: false, source: null });
        } catch (err) {
            console.error('Failed to save source', err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Newspaper className="w-8 h-8 text-[var(--primary)]" />
                        News Management
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Manage news articles and content sources</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'news' ? (
                        <button
                            onClick={() => setNewsModal({ open: true, news: null })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add News
                        </button>
                    ) : (
                        <button
                            onClick={() => setSourceModal({ open: true, source: null })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Source
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]">
                        <p className="text-2xl font-bold">{stats.totalNews || 0}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Total News</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800">
                        <p className="text-2xl font-bold text-green-600">{stats.publishedNews || 0}</p>
                        <p className="text-xs text-green-600">Published</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-800">
                        <p className="text-2xl font-bold text-yellow-600">{stats.draftNews || 0}</p>
                        <p className="text-xs text-yellow-600">Drafts</p>
                    </div>
                    <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]">
                        <p className="text-2xl font-bold">{stats.totalSources || 0}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Sources</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                        <p className="text-2xl font-bold text-blue-600">{stats.activeSources || 0}</p>
                        <p className="text-xs text-blue-600">Active Sources</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[var(--border)]">
                <button
                    onClick={() => setActiveTab('news')}
                    className={`px-4 py-3 font-medium border-b-2 transition-all ${activeTab === 'news'
                        ? 'border-[var(--primary)] text-[var(--primary)]'
                        : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                >
                    News Articles
                </button>
                <button
                    onClick={() => setActiveTab('sources')}
                    className={`px-4 py-3 font-medium border-b-2 transition-all ${activeTab === 'sources'
                        ? 'border-[var(--primary)] text-[var(--primary)]'
                        : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                >
                    Content Sources
                </button>
            </div>

            {/* Filters (for news tab) */}
            {activeTab === 'news' && (
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
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            )}

            {/* Content */}
            {activeTab === 'news' ? (
                <NewsTable
                    news={news}
                    loading={!newsData && !newsError}
                    error={newsError}
                    actionLoading={actionLoading}
                    onEdit={(n) => setNewsModal({ open: true, news: n })}
                    onPublish={handlePublish}
                    onDelete={handleDeleteNews}
                    onRetry={mutateNews}
                />
            ) : (
                <SourcesTable
                    sources={sources}
                    loading={!sourcesData && !sourcesError}
                    error={sourcesError}
                    actionLoading={actionLoading}
                    onEdit={(s) => setSourceModal({ open: true, source: s })}
                    onToggle={handleToggleSource}
                    onDelete={handleDeleteSource}
                    onRetry={mutateSources}
                />
            )}

            {/* News Modal */}
            <AnimatePresence>
                {newsModal.open && (
                    <NewsModal
                        news={newsModal.news}
                        sources={sources}
                        loading={actionLoading === 'save'}
                        onClose={() => setNewsModal({ open: false, news: null })}
                        onSave={handleSaveNews}
                    />
                )}
            </AnimatePresence>

            {/* Source Modal */}
            <AnimatePresence>
                {sourceModal.open && (
                    <SourceModal
                        source={sourceModal.source}
                        loading={actionLoading === 'save'}
                        onClose={() => setSourceModal({ open: false, source: null })}
                        onSave={handleSaveSource}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ========== NewsTable Component ==========
function NewsTable({
    news,
    loading,
    error,
    actionLoading,
    onEdit,
    onPublish,
    onDelete,
    onRetry,
}: {
    news: NewsItem[];
    loading: boolean;
    error: any;
    actionLoading: string | null;
    onEdit: (n: NewsItem) => void;
    onPublish: (id: number) => void;
    onDelete: (id: number) => void;
    onRetry: () => void;
}) {
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p className="font-semibold">Failed to load news</p>
                <button onClick={onRetry} className="mt-4 text-sm underline">Try again</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">News</th>
                            <th className="px-6 py-4 font-semibold">Source</th>
                            <th className="px-6 py-4 font-semibold">Category</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Views</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        <AnimatePresence>
                            {news.map((item) => (
                                <motion.tr
                                    key={item.ID}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="hover:bg-[var(--secondary)]/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-[var(--secondary)] rounded-xl flex items-center justify-center overflow-hidden border border-[var(--border)]">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Newspaper className="w-5 h-5 text-[var(--muted-foreground)]" />
                                                )}
                                            </div>
                                            <div className="max-w-[300px]">
                                                <p className="font-semibold text-sm line-clamp-1 flex items-center gap-2">
                                                    {item.titleRu}
                                                    {item.isImportant && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                                </p>
                                                <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">{item.summaryRu || 'No summary'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm">{item.Source?.name || 'Manual'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium bg-[var(--secondary)] px-2 py-1 rounded-lg">
                                            {item.category || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${statusColors[item.status] || ''}`}>
                                            {statusIcons[item.status]}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">
                                        {item.viewsCount}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            {item.status === 'draft' && (
                                                <button
                                                    onClick={() => onPublish(item.ID)}
                                                    disabled={actionLoading === item.ID.toString()}
                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all disabled:opacity-30"
                                                    title="Publish"
                                                >
                                                    <Send className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDelete(item.ID)}
                                                disabled={actionLoading === item.ID.toString()}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                                                title="Delete"
                                            >
                                                {actionLoading === item.ID.toString() ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {news.length === 0 && (
                <div className="p-12 text-center text-[var(--muted-foreground)]">
                    No news found. Click "Add News" to create your first article.
                </div>
            )}
        </div>
    );
}

// ========== SourcesTable Component ==========
function SourcesTable({
    sources,
    loading,
    error,
    actionLoading,
    onEdit,
    onToggle,
    onDelete,
    onRetry,
}: {
    sources: NewsSource[];
    loading: boolean;
    error: any;
    actionLoading: string | null;
    onEdit: (s: NewsSource) => void;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onRetry: () => void;
}) {
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p className="font-semibold">Failed to load sources</p>
                <button onClick={onRetry} className="mt-4 text-sm underline">Try again</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source) => (
                <motion.div
                    key={source.ID}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-lg transition-all"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${source.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {sourceTypeIcons[source.sourceType] || <Globe className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">{source.name}</h3>
                                <p className="text-xs text-[var(--muted-foreground)] uppercase">{source.sourceType}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onToggle(source.ID)}
                            disabled={actionLoading === `source-${source.ID}`}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${source.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {source.isActive ? 'Active' : 'Paused'}
                        </button>
                    </div>

                    <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-4">
                        {source.description || 'No description'}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-4">
                        <span className="bg-[var(--secondary)] px-2 py-1 rounded">
                            Mode: {source.mode}
                        </span>
                        <span className="bg-[var(--secondary)] px-2 py-1 rounded">
                            Every {Math.round(source.fetchInterval / 60)}min
                        </span>
                    </div>

                    {source.lastError && (
                        <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-4 line-clamp-2">
                            ⚠️ {source.lastError}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(source)}
                            className="flex-1 py-2 text-sm font-medium bg-[var(--secondary)] rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(source.ID)}
                            disabled={actionLoading === `source-${source.ID}`}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            ))}

            {sources.length === 0 && (
                <div className="col-span-full p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                    No sources configured. Click "Add Source" to add RSS, VK, or Telegram sources.
                </div>
            )}
        </div>
    );
}

// ========== NewsModal Component ==========
function NewsModal({
    news,
    sources,
    loading,
    onClose,
    onSave,
}: {
    news: NewsItem | null;
    sources: NewsSource[];
    loading: boolean;
    onClose: () => void;
    onSave: (data: Partial<NewsItem>) => void;
}) {
    const [formData, setFormData] = useState({
        titleRu: news?.titleRu || '',
        titleEn: news?.titleEn || '',
        summaryRu: news?.summaryRu || '',
        summaryEn: news?.summaryEn || '',
        contentRu: news?.contentRu || '',
        contentEn: news?.contentEn || '',
        imageUrl: news?.imageUrl || '',
        tags: news?.tags || '',
        category: news?.category || '',
        status: news?.status || 'draft',
        isImportant: news?.isImportant || false,
        sourceId: news?.sourceId || undefined,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] rounded-2xl shadow-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-auto border border-[var(--border)]"
            >
                <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">{news ? 'Edit News' : 'Create News'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--secondary)] rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Title (Russian) *</label>
                            <input
                                type="text"
                                value={formData.titleRu}
                                onChange={(e) => setFormData({ ...formData, titleRu: e.target.value })}
                                required
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Заголовок новости"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Title (English)</label>
                            <input
                                type="text"
                                value={formData.titleEn}
                                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="News title"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Summary (Russian)</label>
                            <textarea
                                value={formData.summaryRu}
                                onChange={(e) => setFormData({ ...formData, summaryRu: e.target.value })}
                                rows={2}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Краткое описание"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Summary (English)</label>
                            <textarea
                                value={formData.summaryEn}
                                onChange={(e) => setFormData({ ...formData, summaryEn: e.target.value })}
                                rows={2}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Short description"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Content (Russian) *</label>
                            <textarea
                                value={formData.contentRu}
                                onChange={(e) => setFormData({ ...formData, contentRu: e.target.value })}
                                required
                                rows={6}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Полный текст новости..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Content (English)</label>
                            <textarea
                                value={formData.contentEn}
                                onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                                rows={6}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Full news text..."
                            />
                        </div>
                    </div>

                    {/* Image, Category, Tags */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Image URL</label>
                            <input
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="spiritual, events, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Tags</label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="yoga, meditation"
                            />
                        </div>
                    </div>

                    {/* Status, Source, Important */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer"
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Source</label>
                            <select
                                value={formData.sourceId || ''}
                                onChange={(e) => setFormData({ ...formData, sourceId: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer"
                            >
                                <option value="">Manual Entry</option>
                                {sources.map((s) => (
                                    <option key={s.ID} value={s.ID}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isImportant}
                                    onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                                    className="w-5 h-5 rounded border-[var(--border)]"
                                />
                                <span className="text-sm font-medium">Mark as Important (Push)</span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--secondary)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {news ? 'Save Changes' : 'Create News'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </>
    );
}

// ========== SourceModal Component ==========
function SourceModal({
    source,
    loading,
    onClose,
    onSave,
}: {
    source: NewsSource | null;
    loading: boolean;
    onClose: () => void;
    onSave: (data: Partial<NewsSource>) => void;
}) {
    const [formData, setFormData] = useState({
        name: source?.name || '',
        description: source?.description || '',
        sourceType: source?.sourceType || 'rss',
        url: source?.url || '',
        vkGroupId: source?.vkGroupId || '',
        telegramId: source?.telegramId || '',
        isActive: source?.isActive ?? true,
        fetchInterval: source?.fetchInterval || 3600,
        mode: source?.mode || 'draft',
        autoTranslate: source?.autoTranslate ?? true,
        styleTransfer: source?.styleTransfer ?? true,
        defaultTags: source?.defaultTags || '',
        tgParserType: source?.tgParserType || 'bot',
        targetMadh: source?.targetMadh || '',
        targetYoga: source?.targetYoga || '',
        targetIdentity: source?.targetIdentity || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] rounded-2xl shadow-xl z-50 w-full max-w-lg max-h-[90vh] overflow-auto border border-[var(--border)]"
            >
                <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">{source ? 'Edit Source' : 'Add Source'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--secondary)] rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                            placeholder="Source name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20"
                            placeholder="Optional description"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Source Type *</label>
                        <select
                            value={formData.sourceType}
                            onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                            className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer"
                        >
                            <option value="rss">RSS Feed</option>
                            <option value="url">Direct URL</option>
                            <option value="vk">VKontakte Group</option>
                            <option value="telegram">Telegram Channel</option>
                        </select>
                    </div>

                    {/* Conditional fields based on source type */}
                    {(formData.sourceType === 'rss' || formData.sourceType === 'url') && (
                        <div>
                            <label className="block text-sm font-medium mb-2">URL *</label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="https://example.com/rss"
                            />
                        </div>
                    )}

                    {formData.sourceType === 'vk' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">VK Group ID</label>
                            <input
                                type="text"
                                value={formData.vkGroupId}
                                onChange={(e) => setFormData({ ...formData, vkGroupId: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="club12345678"
                            />
                        </div>
                    )}

                    {formData.sourceType === 'telegram' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase mb-2">Telegram Channel ID</label>
                                <input
                                    type="text"
                                    value={formData.telegramId}
                                    onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                                    className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                    placeholder="@channelname"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase mb-2">TG Parser Method</label>
                                <select
                                    value={formData.tgParserType}
                                    onChange={(e) => setFormData({ ...formData, tgParserType: e.target.value })}
                                    className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
                                >
                                    <option value="bot">Bot API (Requires Admin)</option>
                                    <option value="web">Web Scraper (Public Only)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Fetch Interval</label>
                            <select
                                value={formData.fetchInterval}
                                onChange={(e) => setFormData({ ...formData, fetchInterval: Number(e.target.value) })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer"
                            >
                                <option value={900}>Every 15 min</option>
                                <option value={1800}>Every 30 min</option>
                                <option value={3600}>Every hour</option>
                                <option value={7200}>Every 2 hours</option>
                                <option value={86400}>Once a day</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Mode</label>
                            <select
                                value={formData.mode}
                                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer"
                            >
                                <option value="draft">Save as Draft</option>
                                <option value="auto_publish">Auto-publish</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Default Tags</label>
                        <input
                            type="text"
                            value={formData.defaultTags}
                            onChange={(e) => setFormData({ ...formData, defaultTags: e.target.value })}
                            className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                            placeholder="news, updates"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Target Madh */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase">Target Madh</label>
                            <div className="bg-[var(--secondary)] rounded-xl p-3 max-h-40 overflow-y-auto border border-[var(--border)]">
                                {MADH_OPTIONS.map(opt => (
                                    <label key={opt.id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[var(--primary)] transition-all">
                                        <input
                                            type="checkbox"
                                            checked={formData.targetMadh.split(',').includes(opt.id)}
                                            onChange={(e) => {
                                                const current = formData.targetMadh.split(',').filter(x => x);
                                                const next = e.target.checked
                                                    ? [...current, opt.id]
                                                    : current.filter(x => x !== opt.id);
                                                setFormData({ ...formData, targetMadh: next.join(',') });
                                            }}
                                            className="rounded border-[var(--border)]"
                                        />
                                        <span className="text-xs">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Target Yoga */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase">Target Yoga Style</label>
                            <div className="bg-[var(--secondary)] rounded-xl p-3 max-h-40 overflow-y-auto border border-[var(--border)]">
                                {YOGA_OPTIONS.map(opt => (
                                    <label key={opt.id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[var(--primary)] transition-all">
                                        <input
                                            type="checkbox"
                                            checked={formData.targetYoga.split(',').includes(opt.id)}
                                            onChange={(e) => {
                                                const current = formData.targetYoga.split(',').filter(x => x);
                                                const next = e.target.checked
                                                    ? [...current, opt.id]
                                                    : current.filter(x => x !== opt.id);
                                                setFormData({ ...formData, targetYoga: next.join(',') });
                                            }}
                                            className="rounded border-[var(--border)]"
                                        />
                                        <span className="text-xs">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Target Identity */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase">Target Identity</label>
                            <div className="bg-[var(--secondary)] rounded-xl p-3 max-h-40 overflow-y-auto border border-[var(--border)]">
                                {IDENTITY_OPTIONS.map(opt => (
                                    <label key={opt.id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[var(--primary)] transition-all">
                                        <input
                                            type="checkbox"
                                            checked={formData.targetIdentity.split(',').includes(opt.id)}
                                            onChange={(e) => {
                                                const current = formData.targetIdentity.split(',').filter(x => x);
                                                const next = e.target.checked
                                                    ? [...current, opt.id]
                                                    : current.filter(x => x !== opt.id);
                                                setFormData({ ...formData, targetIdentity: next.join(',') });
                                            }}
                                            className="rounded border-[var(--border)]"
                                        />
                                        <span className="text-xs">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-5 h-5 rounded border-[var(--border)]"
                            />
                            <span className="text-sm">Active (enable automatic fetching)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.autoTranslate}
                                onChange={(e) => setFormData({ ...formData, autoTranslate: e.target.checked })}
                                className="w-5 h-5 rounded border-[var(--border)]"
                            />
                            <span className="text-sm">Auto-translate (RU ↔ EN)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.styleTransfer}
                                onChange={(e) => setFormData({ ...formData, styleTransfer: e.target.checked })}
                                className="w-5 h-5 rounded border-[var(--border)]"
                            />
                            <span className="text-sm">Style transfer (Sattva style)</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--secondary)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {source ? 'Save Changes' : 'Add Source'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </>
    );
}
