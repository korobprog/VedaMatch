'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, Trash2, Edit3, Loader2, Radio, Tv, Music, Film,
    Upload, CheckCircle, XCircle, Eye, Clock
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

type TabType = 'tracks' | 'radio' | 'tv' | 'categories';

interface MediaTrack {
    ID: number;
    title: string;
    artist: string;
    mediaType: string;
    duration: number;
    url: string;
    thumbnailUrl: string;
    madh: string;
    isActive: boolean;
    isFeatured: boolean;
    viewCount: number;
    CreatedAt: string;
}

interface RadioStation {
    ID: number;
    name: string;
    streamUrl: string;
    logoUrl: string;
    madh: string;
    isLive: boolean;
    isActive: boolean;
}

interface TVChannel {
    ID: number;
    name: string;
    streamUrl: string;
    streamType: string;
    logoUrl: string;
    isLive: boolean;
    isActive: boolean;
}

interface MediaCategory {
    ID: number;
    name: string;
    slug: string;
    type: string;
    isActive: boolean;
}

const MADH_OPTIONS = [
    { id: '', label: 'All' },
    { id: 'iskcon', label: 'ISKCON' },
    { id: 'gaudiya', label: 'Gaudiya Math' },
    { id: 'srivaishnava', label: 'Sri Vaishnava' },
    { id: 'vedic', label: 'Vedic' },
];

export default function MultimediaPage() {
    const [tab, setTab] = useState<TabType>('tracks');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { data: stats } = useSWR('/admin/multimedia/stats', fetcher);
    const { data: tracks, mutate: mutateTracks } = useSWR('/multimedia/tracks?limit=50', fetcher);
    const { data: radio, mutate: mutateRadio } = useSWR('/multimedia/radio', fetcher);
    const { data: tv, mutate: mutateTV } = useSWR('/multimedia/tv', fetcher);
    const { data: categories, mutate: mutateCategories } = useSWR('/multimedia/categories', fetcher);

    const handleDelete = async (type: string, id: number) => {
        if (!confirm('Delete this item?')) return;
        setActionLoading(`delete-${id}`);
        try {
            await api.delete(`/admin/multimedia/${type}/${id}`);
            if (type === 'tracks') mutateTracks();
            if (type === 'radio') mutateRadio();
            if (type === 'tv') mutateTV();
            if (type === 'categories') mutateCategories();
        } catch (e) {
            console.error(e);
        }
        setActionLoading(null);
    };

    const handleEdit = (item: any) => {
        setEditItem(item);
        setShowModal(true);
    };

    const tabs = [
        { id: 'tracks', label: 'Tracks', icon: Music, count: stats?.totalTracks },
        { id: 'radio', label: 'Radio', icon: Radio, count: stats?.totalRadioStations },
        { id: 'tv', label: 'TV', icon: Tv, count: stats?.totalTVChannels },
        { id: 'categories', label: 'Categories', icon: Film, count: stats?.totalCategories },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Multimedia Hub</h1>
                <button
                    onClick={() => { setEditItem(null); setShowModal(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" /> Add {tab === 'categories' ? 'Category' : tab === 'radio' ? 'Radio' : tab.slice(0, -1).toUpperCase()}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {tabs.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                <t.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{t.count || 0}</p>
                                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">{t.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as TabType)}
                        className={`px-4 py-2 font-semibold transition-colors ${tab === t.id
                            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-slate-500" />
                <input
                    type="text"
                    placeholder="Search by title, artist or name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            {/* Content */}
            {tab === 'tracks' && (
                <TracksTable
                    tracks={tracks?.tracks || []}
                    search={search}
                    onEdit={handleEdit}
                    onDelete={(id: number) => handleDelete('tracks', id)}
                    actionLoading={actionLoading}
                />
            )}
            {tab === 'radio' && (
                <RadioTable
                    stations={radio || []}
                    search={search}
                    onEdit={handleEdit}
                    onDelete={(id: number) => handleDelete('radio', id)}
                    actionLoading={actionLoading}
                />
            )}
            {tab === 'tv' && (
                <TVTable
                    channels={tv || []}
                    search={search}
                    onEdit={handleEdit}
                    onDelete={(id: number) => handleDelete('tv', id)}
                    actionLoading={actionLoading}
                />
            )}
            {tab === 'categories' && (
                <CategoriesTable
                    categories={categories || []}
                    search={search}
                    onEdit={handleEdit}
                    onDelete={(id: number) => handleDelete('categories', id)}
                    actionLoading={actionLoading}
                />
            )}

            {showModal && (
                <MediaModal
                    type={tab}
                    item={editItem}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        mutateTracks();
                        mutateRadio();
                        mutateTV();
                        mutateCategories();
                    }}
                />
            )}
        </div>
    );
}

function TracksTable({ tracks, search, onEdit, onDelete, actionLoading }: any) {
    const filtered = tracks.filter((t: MediaTrack) =>
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.artist?.toLowerCase().includes(search.toLowerCase())
    );
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Artist</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Madh</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Views</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filtered.map((t: MediaTrack) => (
                            <tr key={t.ID} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{t.title}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{t.artist}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.mediaType === 'audio' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                                        {t.mediaType}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{t.madh || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{t.viewCount}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-3 text-sm">
                                    <button onClick={() => onEdit(t)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(t.ID)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RadioTable({ stations, search, onEdit, onDelete }: any) {
    const filtered = stations.filter((s: RadioStation) => s.name?.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Stream URL</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Live</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filtered.map((s: RadioStation) => (
                            <tr key={s.ID} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{s.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">{s.streamUrl}</td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    {s.isLive ? <span className="text-green-600 dark:text-green-400">● Live</span> : <span className="text-gray-400 dark:text-slate-500">○ Offline</span>}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-3 text-sm">
                                    <button onClick={() => onEdit(s)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(s.ID)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TVTable({ channels, search, onEdit, onDelete }: any) {
    const filtered = channels.filter((c: TVChannel) => c.name?.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Live</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filtered.map((c: TVChannel) => (
                            <tr key={c.ID} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-900/50 text-gray-700 dark:text-slate-300 rounded text-xs font-semibold">
                                        {c.streamType}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    {c.isLive ? <span className="text-green-600 dark:text-green-400">● Live</span> : <span className="text-gray-400 dark:text-slate-500">○ Offline</span>}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-3 text-sm">
                                    <button onClick={() => onEdit(c)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(c.ID)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CategoriesTable({ categories, search, onEdit, onDelete }: any) {
    const filtered = categories.filter((c: MediaCategory) => c.name?.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Slug</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {filtered.map((c: MediaCategory) => (
                            <tr key={c.ID} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{c.slug}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                        {c.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-3 text-sm">
                                    <button onClick={() => onEdit(c)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(c.ID)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MediaModal({ type, item, onClose, onSave }: { type: TabType; item: any; onClose: () => void; onSave: () => void }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState(item || {});

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'images');

        try {
            const res = await api.post('/admin/multimedia/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setForm({ ...form, [field]: res.data.url });
        } catch (e) {
            console.error('Upload Error:', e);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (item?.ID) {
                await api.put(`/admin/multimedia/${type}/${item.ID}`, form);
            } else {
                await api.post(`/admin/multimedia/${type}`, form);
            }
            onSave();
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {item ? 'Edit' : 'Add'} {type.slice(0, -1)}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Explicitly setting text-gray-900 for light mode and text-white for dark mode for all inputs */}
                    {type === 'tracks' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Title</label>
                                <input placeholder="Enter title" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Artist</label>
                                <input placeholder="Artist name" value={form.artist || ''} onChange={e => setForm({ ...form, artist: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Media Type</label>
                                <select value={form.mediaType || 'audio'} onChange={e => setForm({ ...form, mediaType: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="audio">Audio</option>
                                    <option value="video">Video</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Source URL</label>
                                <input placeholder="https://..." value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Thumbnail URL</label>
                                <div className="flex gap-2">
                                    <input placeholder="Image URL" value={form.thumbnailUrl || ''} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg hover:bg-indigo-100 transition-colors">
                                        <Upload className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} />
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'thumbnailUrl')} />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Madh (Optional)</label>
                                <select value={form.madh || ''} onChange={e => setForm({ ...form, madh: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                    {MADH_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    {type === 'radio' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Station Name</label>
                                <input placeholder="Enter station name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Stream URL</label>
                                <input placeholder="https://..." value={form.streamUrl || ''} onChange={e => setForm({ ...form, streamUrl: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Logo URL</label>
                                <div className="flex gap-2">
                                    <input placeholder="Logo image URL" value={form.logoUrl || ''} onChange={e => setForm({ ...form, logoUrl: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg hover:bg-indigo-100 transition-colors">
                                        <Upload className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} />
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrl')} />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Madh (Optional)</label>
                                <select value={form.madh || ''} onChange={e => setForm({ ...form, madh: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                    {MADH_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    {type === 'tv' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Channel Name</label>
                                <input placeholder="Enter channel name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Stream URL</label>
                                <input placeholder="Stream URL (YouTube id or HLS)" value={form.streamUrl || ''} onChange={e => setForm({ ...form, streamUrl: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Stream Type</label>
                                <select value={form.streamType || 'youtube'} onChange={e => setForm({ ...form, streamType: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="youtube">YouTube</option>
                                    <option value="hls">HLS / IP TV</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Logo URL</label>
                                <div className="flex gap-2">
                                    <input placeholder="Logo image URL" value={form.logoUrl || ''} onChange={e => setForm({ ...form, logoUrl: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg hover:bg-indigo-100 transition-colors">
                                        <Upload className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} />
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrl')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                    {type === 'categories' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Category Name</label>
                                <input placeholder="e.g. Bhajans" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Slug</label>
                                <input placeholder="e.g. bhajansh" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Type</label>
                                <select value={form.type || 'audio'} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="audio">Audio</option>
                                    <option value="video">Video</option>
                                    <option value="radio">Radio</option>
                                    <option value="tv">TV</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Thumbnail URL</label>
                                <div className="flex gap-2">
                                    <input placeholder="Logo/Image URL" value={form.thumbnailUrl || ''} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg hover:bg-indigo-100 transition-colors">
                                        <Upload className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} />
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'thumbnailUrl')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition-all">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
