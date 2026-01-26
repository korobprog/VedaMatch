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
                <h1 className="text-2xl font-bold text-gray-800">Multimedia Hub</h1>
                <button
                    onClick={() => { setEditItem(null); setShowModal(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    <Plus className="w-5 h-5" /> Add {tab.slice(0, -1)}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {tabs.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center gap-3">
                            <t.icon className="w-8 h-8 text-indigo-500" />
                            <div>
                                <p className="text-2xl font-bold">{t.count || 0}</p>
                                <p className="text-gray-500 text-sm">{t.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as TabType)}
                        className={`px-4 py-2 font-medium ${tab === t.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Artist</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Madh</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Views</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filtered.map((t: MediaTrack) => (
                        <tr key={t.ID} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{t.title}</td>
                            <td className="px-4 py-3 text-gray-500">{t.artist}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${t.mediaType === 'audio' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                    {t.mediaType}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{t.madh || '-'}</td>
                            <td className="px-4 py-3 text-gray-500">{t.viewCount}</td>
                            <td className="px-4 py-3 flex gap-2">
                                <button onClick={() => onEdit(t)} className="text-blue-600 hover:text-blue-800"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => onDelete(t.ID)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RadioTable({ stations, search, onEdit, onDelete }: any) {
    const filtered = stations.filter((s: RadioStation) => s.name?.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stream URL</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Live</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filtered.map((s: RadioStation) => (
                        <tr key={s.ID} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{s.streamUrl}</td>
                            <td className="px-4 py-3">{s.isLive ? <span className="text-green-600">●</span> : <span className="text-gray-400">○</span>}</td>
                            <td className="px-4 py-3 flex gap-2">
                                <button onClick={() => onEdit(s)} className="text-blue-600"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => onDelete(s.ID)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TVTable({ channels, search, onEdit, onDelete }: any) {
    const filtered = channels.filter((c: TVChannel) => c.name?.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Live</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filtered.map((c: TVChannel) => (
                        <tr key={c.ID} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{c.name}</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{c.streamType}</span></td>
                            <td className="px-4 py-3">{c.isLive ? <span className="text-green-600">●</span> : <span className="text-gray-400">○</span>}</td>
                            <td className="px-4 py-3 flex gap-2">
                                <button onClick={() => onEdit(c)} className="text-blue-600"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => onDelete(c.ID)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CategoriesTable({ categories, search, onEdit, onDelete }: any) {
    const filtered = categories.filter((c: MediaCategory) => c.name?.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Slug</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filtered.map((c: MediaCategory) => (
                        <tr key={c.ID} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">{c.type}</span></td>
                            <td className="px-4 py-3 flex gap-2">
                                <button onClick={() => onEdit(c)} className="text-blue-600"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => onDelete(c.ID)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MediaModal({ type, item, onClose, onSave }: { type: TabType; item: any; onClose: () => void; onSave: () => void }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(item || {});

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{item ? 'Edit' : 'Add'} {type.slice(0, -1)}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {type === 'tracks' && (
                        <>
                            <input placeholder="Title" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded p-2" required />
                            <input placeholder="Artist" value={form.artist || ''} onChange={e => setForm({ ...form, artist: e.target.value })} className="w-full border rounded p-2" />
                            <select value={form.mediaType || 'audio'} onChange={e => setForm({ ...form, mediaType: e.target.value })} className="w-full border rounded p-2">
                                <option value="audio">Audio</option>
                                <option value="video">Video</option>
                            </select>
                            <input placeholder="URL" value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full border rounded p-2" required />
                            <input placeholder="Thumbnail URL" value={form.thumbnailUrl || ''} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} className="w-full border rounded p-2" />
                            <input placeholder="Madh" value={form.madh || ''} onChange={e => setForm({ ...form, madh: e.target.value })} className="w-full border rounded p-2" />
                        </>
                    )}
                    {type === 'radio' && (
                        <>
                            <input placeholder="Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded p-2" required />
                            <input placeholder="Stream URL" value={form.streamUrl || ''} onChange={e => setForm({ ...form, streamUrl: e.target.value })} className="w-full border rounded p-2" required />
                            <input placeholder="Logo URL" value={form.logoUrl || ''} onChange={e => setForm({ ...form, logoUrl: e.target.value })} className="w-full border rounded p-2" />
                            <input placeholder="Madh" value={form.madh || ''} onChange={e => setForm({ ...form, madh: e.target.value })} className="w-full border rounded p-2" />
                        </>
                    )}
                    {type === 'tv' && (
                        <>
                            <input placeholder="Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded p-2" required />
                            <input placeholder="Stream URL" value={form.streamUrl || ''} onChange={e => setForm({ ...form, streamUrl: e.target.value })} className="w-full border rounded p-2" required />
                            <select value={form.streamType || 'youtube'} onChange={e => setForm({ ...form, streamType: e.target.value })} className="w-full border rounded p-2">
                                <option value="youtube">YouTube</option>
                                <option value="vimeo">Vimeo</option>
                                <option value="rtmp">RTMP</option>
                            </select>
                            <input placeholder="Logo URL" value={form.logoUrl || ''} onChange={e => setForm({ ...form, logoUrl: e.target.value })} className="w-full border rounded p-2" />
                        </>
                    )}
                    {type === 'categories' && (
                        <>
                            <input placeholder="Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded p-2" required />
                            <input placeholder="Slug" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full border rounded p-2" required />
                            <select value={form.type || 'bhajan'} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded p-2">
                                <option value="bhajan">Bhajan</option>
                                <option value="lecture">Lecture</option>
                                <option value="kirtan">Kirtan</option>
                                <option value="film">Film</option>
                            </select>
                        </>
                    )}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
