'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MapPin,
    Users,
    Store,
    Tag,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff,
    RefreshCw,
    Globe,
    TrendingUp,
    Settings,
    CheckCircle
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const markerTypeColors: Record<string, string> = {
    user: 'bg-purple-100 text-purple-800 border-purple-200',
    shop: 'bg-green-100 text-green-800 border-green-200',
    ad: 'bg-blue-100 text-blue-800 border-blue-200',
};

const markerTypeIcons: Record<string, React.ReactNode> = {
    user: <Users className="w-3 h-3" />,
    shop: <Store className="w-3 h-3" />,
    ad: <Tag className="w-3 h-3" />,
};

interface MapMarker {
    id: number;
    type: 'user' | 'shop' | 'ad';
    title: string;
    subtitle?: string;
    latitude: number;
    longitude: number;
    avatarUrl?: string;
    category?: string;
    rating?: number;
    status?: string;
}

interface MapCluster {
    city: string;
    latitude: number;
    longitude: number;
    userCount: number;
    shopCount: number;
    adCount: number;
    total: number;
}

interface MapConfig {
    style?: string;
    maxZoom?: number;
    markers: Record<string, { color: string; icon: string }>;
    cluster: {
        colors: {
            small: string;
            medium: string;
            large: string;
        };
    };
}

export default function MapPage() {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditingConfig, setIsEditingConfig] = useState(false);
    const [editedConfig, setEditedConfig] = useState<MapConfig | null>(null);

    // Fetch all markers (admin view)
    const { data: markersData, error: markersError, mutate: mutateMarkers } = useSWR(
        `/admin/map/markers?type=${typeFilter}&search=${search}`,
        fetcher
    );

    // Fetch clusters/summary
    const { data: summaryData, error: summaryError, mutate: mutateSummary } = useSWR(
        '/map/summary',
        fetcher
    );

    // Fetch map config
    const { data: configData, mutate: mutateConfig } = useSWR('/map/config', fetcher);

    const markers: MapMarker[] = markersData?.markers || [];
    const clusters: MapCluster[] = summaryData?.clusters || [];

    const stats = clusters.reduce(
        (acc, cluster) => ({
            total: acc.total + (cluster.total || 0),
            users: acc.users + (cluster.userCount || 0),
            shops: acc.shops + (cluster.shopCount || 0),
            ads: acc.ads + (cluster.adCount || 0),
            cities: acc.cities + 1,
        }),
        { total: 0, users: 0, shops: 0, ads: 0, cities: 0 }
    );

    const handleStartEditConfig = () => {
        setEditedConfig(configData);
        setIsEditingConfig(true);
    };

    const handleSaveConfig = async () => {
        if (!editedConfig) return;
        setActionLoading('save-config');
        try {
            await api.post('/admin/map/config', editedConfig);
            setIsEditingConfig(false);
            await mutateConfig();
        } catch (e) {
            console.error('Failed to save config', e);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRefresh = async () => {
        setActionLoading('refresh');
        try {
            await mutateMarkers();
            await mutateSummary();
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleVisibility = async (type: string, id: number) => {
        setActionLoading(`toggle-${type}-${id}`);
        try {
            await api.post(`/admin/map/markers/${type}/${id}/toggle`);
            await mutateMarkers();
        } catch (e) {
            console.error('Failed to toggle visibility', e);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-[var(--primary)]" />
                        Map Management
                    </h1>
                    <p className="text-[var(--muted-foreground)] mt-1">View and manage map markers and locations</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={actionLoading === 'refresh'}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${actionLoading === 'refresh' ? 'animate-spin' : ''}`} />
                    Refresh Data
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-[var(--primary)]" />
                        <p className="text-xs text-[var(--muted-foreground)]">Total Markers</p>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-purple-600">Users</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{stats.users}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Store className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-green-600">Shops</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{stats.shops}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-blue-600">Ads</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.ads}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                        <p className="text-xs text-orange-600">Cities</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{stats.cities}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Search by title or city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                    >
                        <option value="">All Types</option>
                        <option value="user">Users</option>
                        <option value="shop">Shops</option>
                        <option value="ad">Ads</option>
                    </select>
                </div>
            </div>

            {/* City Clusters */}
            <div className="bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[var(--primary)]" />
                    Community by City
                </h2>
                {summaryError ? (
                    <div className="text-center py-8 text-red-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p>Failed to load clusters</p>
                    </div>
                ) : !summaryData ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clusters.map((cluster, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-[var(--secondary)] p-4 rounded-xl flex justify-between items-center"
                            >
                                <div>
                                    <p className="font-semibold">{cluster.city || 'Unknown'}</p>
                                    <p className="text-xs text-[var(--muted-foreground)]">
                                        {cluster.total} markers
                                    </p>
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <span className="flex items-center gap-1 text-purple-600">
                                        <Users className="w-3 h-3" />
                                        {cluster.userCount}
                                    </span>
                                    <span className="flex items-center gap-1 text-green-600">
                                        <Store className="w-3 h-3" />
                                        {cluster.shopCount}
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-600">
                                        <Tag className="w-3 h-3" />
                                        {cluster.adCount}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        {clusters.length === 0 && (
                            <div className="col-span-full text-center py-8 text-[var(--muted-foreground)]">
                                No clusters found
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Markers Table */}
            {markersError ? (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Failed to load markers</p>
                    <button onClick={() => mutateMarkers()} className="mt-4 text-sm underline">Try again</button>
                </div>
            ) : !markersData ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Marker</th>
                                    <th className="px-6 py-4 font-semibold">Type</th>
                                    <th className="px-6 py-4 font-semibold">Location</th>
                                    <th className="px-6 py-4 font-semibold">Coordinates</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {markers.map((marker) => (
                                        <motion.tr
                                            key={`${marker.type}-${marker.id}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-[var(--secondary)]/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[var(--secondary)] rounded-xl flex items-center justify-center overflow-hidden border border-[var(--border)]">
                                                        {marker.avatarUrl ? (
                                                            <img src={marker.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <MapPin className="w-5 h-5 text-[var(--muted-foreground)]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm line-clamp-1">{marker.title}</p>
                                                        {marker.category && (
                                                            <p className="text-xs text-[var(--muted-foreground)]">{marker.category}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${markerTypeColors[marker.type] || ''}`}>
                                                    {markerTypeIcons[marker.type]}
                                                    {marker.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm">{marker.subtitle || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-mono text-[var(--muted-foreground)]">
                                                    {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleVisibility(marker.type, marker.id)}
                                                        disabled={!!actionLoading}
                                                        className={`p-2 rounded-lg transition-all ${marker.status === 'hidden'
                                                            ? 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
                                                            : 'text-blue-600 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100'
                                                            }`}
                                                        title={marker.status === 'hidden' ? "Show Marker" : "Hide Marker"}
                                                    >
                                                        {actionLoading === `toggle-${marker.type}-${marker.id}` ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : marker.status === 'hidden' ? (
                                                            <EyeOff className="w-5 h-5" />
                                                        ) : (
                                                            <Eye className="w-5 h-5" />
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

                    {markers.length === 0 && (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No markers found matching your filters.
                        </div>
                    )}
                </div>
            )}

            {/* Map Config Info */}
            {configData && (
                <div className="bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Map Configuration</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-[var(--muted-foreground)]">Tile Provider</p>
                            <p className="font-semibold">Geoapify</p>
                        </div>
                        <div>
                            <p className="text-[var(--muted-foreground)]">Style</p>
                            <p className="font-semibold">{configData.style || 'carto'}</p>
                        </div>
                        <div>
                            <p className="text-[var(--muted-foreground)]">Max Zoom</p>
                            <p className="font-semibold">{configData.maxZoom || 19}</p>
                        </div>
                        <div>
                            <p className="text-[var(--muted-foreground)]">API Status</p>
                            <p className="font-semibold text-green-600">Active</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Settings Form */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Map Visual Configuration</h2>
                            <p className="text-sm text-[var(--muted-foreground)]">Customize marker icons and colors</p>
                        </div>
                    </div>
                    {!isEditingConfig ? (
                        <button
                            onClick={handleStartEditConfig}
                            className="px-4 py-2 border border-[var(--border)] rounded-xl hover:bg-[var(--secondary)] transition-all flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Edit Configuration
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditingConfig(false)}
                                className="px-4 py-2 border border-[var(--border)] rounded-xl hover:bg-[var(--secondary)] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                disabled={actionLoading === 'save-config'}
                                className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                            >
                                {actionLoading === 'save-config' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>

                {isEditingConfig && editedConfig ? (
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Marker Types */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Marker Styles
                            </h3>
                            {['user', 'shop', 'ad'].map((type) => (
                                <div key={type} className="p-4 rounded-xl border border-[var(--border)] space-y-3">
                                    <div className="flex items-center justify-between capitalize font-medium">
                                        <span>{type} Marker</span>
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                            style={{ backgroundColor: editedConfig.markers[type].color }}
                                        >
                                            {type === 'user' ? <Users size={16} /> : type === 'shop' ? <Store size={16} /> : <Tag size={16} />}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-[var(--muted-foreground)] block mb-1">Color (Hex)</label>
                                            <input
                                                type="text"
                                                value={editedConfig.markers[type].color}
                                                onChange={(e) => {
                                                    setEditedConfig(prev => {
                                                        if (!prev) return prev;
                                                        return {
                                                            ...prev,
                                                            markers: {
                                                                ...prev.markers,
                                                                [type]: {
                                                                    ...prev.markers[type],
                                                                    color: e.target.value,
                                                                },
                                                            },
                                                        };
                                                    });
                                                }}
                                                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-mono transition-all focus:ring-2 focus:ring-[var(--primary)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[var(--muted-foreground)] block mb-1">Icon Name</label>
                                            <input
                                                type="text"
                                                value={editedConfig.markers[type].icon}
                                                onChange={(e) => {
                                                    setEditedConfig(prev => {
                                                        if (!prev) return prev;
                                                        return {
                                                            ...prev,
                                                            markers: {
                                                                ...prev.markers,
                                                                [type]: {
                                                                    ...prev.markers[type],
                                                                    icon: e.target.value,
                                                                },
                                                            },
                                                        };
                                                    });
                                                }}
                                                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm transition-all focus:ring-2 focus:ring-[var(--primary)]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cluster Config */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Cluster Styles
                            </h3>
                            <div className="p-4 rounded-xl border border-[var(--border)] space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg mb-2">
                                        Эти цвета влияют на отображение кластеров на мобильных устройствах при отдалении карты.
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted-foreground)] block mb-1">Small Cluster Color</label>
                                        <input
                                            type="text"
                                            value={editedConfig.cluster.colors.small}
                                            onChange={(e) => {
                                                setEditedConfig(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        cluster: {
                                                            ...prev.cluster,
                                                            colors: {
                                                                ...prev.cluster.colors,
                                                                small: e.target.value,
                                                            },
                                                        },
                                                    };
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted-foreground)] block mb-1">Medium Cluster Color</label>
                                        <input
                                            type="text"
                                            value={editedConfig.cluster.colors.medium}
                                            onChange={(e) => {
                                                setEditedConfig(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        cluster: {
                                                            ...prev.cluster,
                                                            colors: {
                                                                ...prev.cluster.colors,
                                                                medium: e.target.value,
                                                            },
                                                        },
                                                    };
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted-foreground)] block mb-1">Large Cluster Color</label>
                                        <input
                                            type="text"
                                            value={editedConfig.cluster.colors.large}
                                            onChange={(e) => {
                                                setEditedConfig(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        cluster: {
                                                            ...prev.cluster,
                                                            colors: {
                                                                ...prev.cluster.colors,
                                                                large: e.target.value,
                                                            },
                                                        },
                                                    };
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[var(--secondary)] rounded-2xl p-12 text-center">
                        <Settings className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium mb-2">Centralized Map Configuration</h3>
                        <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
                            Click 'Edit Configuration' to customize icons, colors, and visual styles for the map service across all platforms.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
