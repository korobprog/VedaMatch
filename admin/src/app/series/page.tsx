'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit3, Trash2, ChevronDown, ChevronUp, Film, Upload,
    GripVertical, X, Save, FolderOpen, Layers, Cloud, Check
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface Episode {
    id: number;
    seasonID: number;
    number: number;
    title: string;
    videoURL: string;
    thumbnailURL: string;
    duration: number;
    isActive: boolean;
}

interface Season {
    id: number;
    seriesID: number;
    number: number;
    title: string;
    episodes: Episode[];
}

interface Series {
    id: number;
    title: string;
    description: string;
    coverImageURL: string;
    year: number;
    genre: string;
    isActive: boolean;
    isFeatured: boolean;
    seasons: Season[];
}

export default function SeriesPage() {
    const [activeTab, setActiveTab] = useState<'list' | 'bulk'>('list');
    const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
    const [showSeriesModal, setShowSeriesModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showS3Modal, setShowS3Modal] = useState(false);
    const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);

    const { data: seriesData, mutate } = useSWR('/admin/series', fetcher);
    const { data: statsData } = useSWR('/admin/series/stats', fetcher);

    const series: Series[] = seriesData?.series || [];
    const stats = statsData || { totalSeries: 0, totalSeasons: 0, totalEpisodes: 0 };

    const handleDeleteSeries = async (id: number) => {
        if (!confirm('Delete this series and ALL its seasons/episodes?')) return;
        await api.delete(`/admin/series/${id}`);
        mutate();
    };

    const toggleSeason = (seasonId: number) => {
        setExpandedSeasons(prev =>
            prev.includes(seasonId)
                ? prev.filter(id => id !== seasonId)
                : [...prev, seasonId]
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">TV Series</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                        {stats.totalSeries} series • {stats.totalSeasons} seasons • {stats.totalEpisodes} episodes
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowS3Modal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                        <Cloud className="w-4 h-4" />
                        Import from S3
                    </button>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => { setSelectedSeries(null); setShowSeriesModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Series
                    </button>
                </div>
            </div>

            {/* Series List */}
            <div className="space-y-4">
                {series.map((s) => (
                    <SeriesCard
                        key={s.id}
                        series={s}
                        onEdit={() => { setSelectedSeries(s); setShowSeriesModal(true); }}
                        onDelete={() => handleDeleteSeries(s.id)}
                        expandedSeasons={expandedSeasons}
                        toggleSeason={toggleSeason}
                        mutate={mutate}
                    />
                ))}

                {series.length === 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center">
                        <Film className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 dark:text-slate-300">No series yet</h3>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">Create your first series or use bulk upload</p>
                    </div>
                )}
            </div>

            {/* Series Modal */}
            <AnimatePresence>
                {showSeriesModal && (
                    <SeriesModal
                        series={selectedSeries}
                        onClose={() => setShowSeriesModal(false)}
                        onSave={() => { setShowSeriesModal(false); mutate(); }}
                    />
                )}
            </AnimatePresence>

            {/* Bulk Upload Modal */}
            <AnimatePresence>
                {showBulkModal && (
                    <BulkUploadModal
                        series={series}
                        onClose={() => setShowBulkModal(false)}
                        onComplete={() => { setShowBulkModal(false); mutate(); }}
                    />
                )}
            </AnimatePresence>

            {/* S3 Import Modal */}
            <AnimatePresence>
                {showS3Modal && (
                    <S3ImportModal
                        series={series}
                        onClose={() => setShowS3Modal(false)}
                        onComplete={() => { setShowS3Modal(false); mutate(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ==================== SERIES CARD ====================

function SeriesCard({ series, onEdit, onDelete, expandedSeasons, toggleSeason, mutate }: {
    series: Series;
    onEdit: () => void;
    onDelete: () => void;
    expandedSeasons: number[];
    toggleSeason: (id: number) => void;
    mutate: () => void;
}) {
    const [showAddSeason, setShowAddSeason] = useState(false);

    const handleAddSeason = async () => {
        await api.post(`/admin/series/${series.id}/seasons`, { number: (series.seasons?.length || 0) + 1 });
        mutate();
        setShowAddSeason(false);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Series Header */}
            <div className="flex items-center gap-4 p-4">
                {series.coverImageURL ? (
                    <img src={series.coverImageURL} alt={series.title} className="w-20 h-28 object-cover rounded-lg" />
                ) : (
                    <div className="w-20 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Film className="w-8 h-8 text-white" />
                    </div>
                )}

                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{series.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2">{series.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-slate-500">
                        {series.year && <span>{series.year}</span>}
                        {series.genre && <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded">{series.genre}</span>}
                        <span>{series.seasons?.length || 0} сезонов</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={onEdit} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors">
                        <Edit3 className="w-5 h-5" />
                    </button>
                    <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Seasons */}
            <div className="border-t border-gray-100 dark:border-slate-700">
                {series.seasons?.map((season) => (
                    <SeasonSection
                        key={season.id}
                        season={season}
                        isExpanded={expandedSeasons.includes(season.id)}
                        onToggle={() => toggleSeason(season.id)}
                        mutate={mutate}
                    />
                ))}

                {/* Add Season Button */}
                <button
                    onClick={handleAddSeason}
                    className="w-full p-3 text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Добавить сезон
                </button>
            </div>
        </div>
    );
}

// ==================== SEASON SECTION ====================

function SeasonSection({ season, isExpanded, onToggle, mutate }: {
    season: Season;
    isExpanded: boolean;
    onToggle: () => void;
    mutate: () => void;
}) {
    const [showAddEpisode, setShowAddEpisode] = useState(false);
    const [episodeForm, setEpisodeForm] = useState({ title: '', videoURL: '' });
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Get presigned URL
            const presignRes = await api.post('/admin/multimedia/presign', {
                filename: file.name,
                folder: 'series',
                contentType: file.type || 'video/mp4'
            });

            const { uploadUrl, finalUrl } = presignRes.data;

            // Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'video/mp4',
                    'x-amz-acl': 'public-read'
                }
            });

            setEpisodeForm(prev => ({ ...prev, videoURL: finalUrl }));
        } catch (err) {
            console.error(err);
            alert('Upload failed: ' + (err as any).message);
        }
        setUploading(false);
    };

    const handleAddEpisode = async () => {
        await api.post(`/admin/seasons/${season.id}/episodes`, {
            ...episodeForm,
            number: (season.episodes?.length || 0) + 1
        });
        mutate();
        setShowAddEpisode(false);
        setEpisodeForm({ title: '', videoURL: '' });
    };

    const handleDeleteEpisode = async (episodeId: number) => {
        if (!confirm('Delete this episode?')) return;
        await api.delete(`/admin/episodes/${episodeId}`);
        mutate();
    };

    return (
        <div className="border-t border-gray-100 dark:border-slate-700">
            {/* Season Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-slate-300">
                        Сезон {season.number}
                        {season.title && `: ${season.title}`}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                        ({season.episodes?.length || 0} серий)
                    </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Episodes */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50 dark:bg-slate-900/50"
                    >
                        <div className="p-3 space-y-2">
                            {season.episodes?.map((episode) => (
                                <div
                                    key={episode.id}
                                    className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg"
                                >
                                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                                    <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded text-sm font-medium">
                                        {episode.number}
                                    </span>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-700 dark:text-slate-300 text-sm">{episode.title || `Серия ${episode.number}`}</div>
                                        <div className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-md">{episode.videoURL}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEpisode(episode.id)}
                                        className="p-1 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {/* Add Episode Form */}
                            {showAddEpisode ? (
                                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                                    <input
                                        type="text"
                                        placeholder="Название серии"
                                        value={episodeForm.title}
                                        onChange={e => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                                        className="flex-1 p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                    />
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="URL видео"
                                            value={episodeForm.videoURL}
                                            onChange={e => setEpisodeForm({ ...episodeForm, videoURL: e.target.value })}
                                            className="flex-1 p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                        />
                                        <label className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded cursor-pointer transition-colors" title="Upload Video">
                                            {uploading ? (
                                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                            )}
                                            <input
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                    <button onClick={handleAddEpisode} disabled={uploading} className="p-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                                        <Save className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setShowAddEpisode(false)} className="p-2 text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAddEpisode(true)}
                                    className="w-full p-2 text-sm text-gray-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Добавить серию
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ==================== SERIES MODAL ====================

function SeriesModal({ series, onClose, onSave }: {
    series: Series | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [form, setForm] = useState({
        title: series?.title || '',
        description: series?.description || '',
        coverImageURL: series?.coverImageURL || '',
        year: series?.year || new Date().getFullYear(),
        genre: series?.genre || '',
        isActive: series?.isActive ?? true,
        isFeatured: series?.isFeatured ?? false,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (series?.id) {
                await api.put(`/admin/series/${series.id}`, form);
            } else {
                await api.post('/admin/series', form);
            }
            onSave();
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {series ? 'Edit Series' : 'New Series'}
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cover Image URL</label>
                            <input
                                type="text"
                                value={form.coverImageURL}
                                onChange={e => setForm({ ...form, coverImageURL: e.target.value })}
                                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Year</label>
                                <input
                                    type="number"
                                    value={form.year}
                                    onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Genre</label>
                                <input
                                    type="text"
                                    value={form.genre}
                                    onChange={e => setForm({ ...form, genre: e.target.value })}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-300">Active</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.isFeatured}
                                    onChange={e => setForm({ ...form, isFeatured: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-300">Featured</span>
                            </label>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-400">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ==================== BULK UPLOAD MODAL ====================

function BulkUploadModal({ series, onClose, onComplete }: {
    series: Series[];
    onClose: () => void;
    onComplete: () => void;
}) {
    const [step, setStep] = useState<'select' | 'preview' | 'uploading'>('select');
    const [selectedSeriesId, setSelectedSeriesId] = useState<number>(0);
    const [files, setFiles] = useState<File[]>([]);
    const [parsedEpisodes, setParsedEpisodes] = useState<any[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList) return;

        const filesArray = Array.from(fileList);
        setFiles(filesArray);

        // Parse filenames
        const filenames = filesArray.map(f => f.name);
        const res = await api.post('/admin/series/parse-filenames', { filenames });

        // Merge with file objects
        const parsed = res.data.parsed.map((p: any, i: number) => ({
            ...p,
            file: filesArray[i],
            videoURL: '' // Will be set after upload
        }));

        setParsedEpisodes(parsed);
        setStep('preview');
    };

    const handleUpload = async () => {
        setStep('uploading');

        for (let i = 0; i < parsedEpisodes.length; i++) {
            const ep = parsedEpisodes[i];

            // Get presigned URL
            const presignRes = await api.post('/admin/multimedia/presign', {
                filename: ep.file.name,
                folder: 'series',
                contentType: ep.file.type || 'video/mp4'
            });

            const { uploadUrl, finalUrl } = presignRes.data;

            // Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: ep.file,
                headers: {
                    'Content-Type': ep.file.type || 'video/mp4',
                    'x-amz-acl': 'public-read'
                }
            });

            // Update episode with URL
            parsedEpisodes[i].videoURL = finalUrl;
            setUploadProgress(Math.round(((i + 1) / parsedEpisodes.length) * 100));
        }

        // Create episodes in bulk
        await api.post('/admin/series/bulk-episodes', {
            seriesId: selectedSeriesId,
            episodes: parsedEpisodes.map(ep => ({
                season: ep.season || 1,
                episode: ep.episode,
                title: ep.title,
                videoURL: ep.videoURL,
                filename: ep.filename
            }))
        });

        onComplete();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Upload Episodes</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Upload multiple episodes at once. Files will be parsed automatically.
                    </p>
                </div>

                <div className="p-6">
                    {step === 'select' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Select Series *</label>
                                <select
                                    value={selectedSeriesId}
                                    onChange={e => setSelectedSeriesId(parseInt(e.target.value))}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                >
                                    <option value={0}>-- Select a series --</option>
                                    {series.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedSeriesId > 0 && (
                                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center">
                                    <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-600 dark:text-slate-400 mb-2">
                                        Select video files to upload
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
                                        Filename format: S01E01.mp4, Episode_01.mp4, etc.
                                    </p>
                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg cursor-pointer">
                                        <Upload className="w-4 h-4" />
                                        Select Files
                                        <input
                                            type="file"
                                            multiple
                                            accept="video/*"
                                            onChange={handleFilesSelected}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-slate-400">
                                {parsedEpisodes.length} files detected. Review and edit before uploading:
                            </p>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {parsedEpisodes.map((ep, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                        <span className="w-16 text-xs text-gray-400">S{ep.season || 1}E{ep.episode || i + 1}</span>
                                        <input
                                            type="text"
                                            value={ep.title}
                                            onChange={e => {
                                                const updated = [...parsedEpisodes];
                                                updated[i].title = e.target.value;
                                                setParsedEpisodes(updated);
                                            }}
                                            placeholder="Episode title"
                                            className="flex-1 p-1 text-sm border rounded dark:bg-slate-600 dark:border-slate-500 text-gray-900 dark:text-white"
                                        />
                                        <span className="text-xs text-gray-400 truncate max-w-32">{ep.filename}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setStep('select')} className="px-4 py-2 text-gray-600 dark:text-slate-400">
                                    Back
                                </button>
                                <button
                                    onClick={handleUpload}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
                                >
                                    Upload All
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'uploading' && (
                        <div className="text-center py-8">
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mb-4">
                                <div
                                    className="bg-indigo-500 h-3 rounded-full transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-gray-600 dark:text-slate-400">
                                Uploading... {uploadProgress}%
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-400">
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ==================== S3 IMPORT MODAL ====================

interface S3File {
    key: string;
    filename: string;
    url: string;
    size: number;
    season: number;
    episode: number;
    title: string;
}

function S3ImportModal({ series, onClose, onComplete }: {
    series: Series[];
    onClose: () => void;
    onComplete: () => void;
}) {
    const [step, setStep] = useState<'select' | 'preview' | 'importing'>('select');
    const [selectedSeriesId, setSelectedSeriesId] = useState<number>(0);
    const [prefix, setPrefix] = useState('series/');
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<S3File[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [importProgress, setImportProgress] = useState(0);

    const loadS3Files = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/series/s3-files?prefix=${encodeURIComponent(prefix)}`);
            setFiles(res.data.files || []);
            // Select all by default
            setSelectedFiles(new Set((res.data.files || []).map((_: S3File, i: number) => i)));
            setStep('preview');
        } catch (err) {
            console.error(err);
            alert('Failed to load S3 files');
        }
        setLoading(false);
    };

    const toggleFile = (index: number) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedFiles(newSelected);
    };

    const selectAll = () => {
        setSelectedFiles(new Set(files.map((_, i) => i)));
    };

    const deselectAll = () => {
        setSelectedFiles(new Set());
    };

    const handleImport = async () => {
        if (selectedSeriesId === 0) {
            alert('Please select a series');
            return;
        }

        const filesToImport = files.filter((_, i) => selectedFiles.has(i));
        if (filesToImport.length === 0) {
            alert('Please select at least one file');
            return;
        }

        setStep('importing');

        try {
            await api.post('/admin/series/s3-import', {
                seriesId: selectedSeriesId,
                files: filesToImport
            });
            setImportProgress(100);
            setTimeout(() => {
                onComplete();
            }, 500);
        } catch (err) {
            console.error(err);
            alert('Import failed: ' + (err as any).message);
            setStep('preview');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import from S3</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Import existing video files from S3 storage into a series
                    </p>
                </div>

                <div className="p-6">
                    {step === 'select' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Select Series *</label>
                                <select
                                    value={selectedSeriesId}
                                    onChange={e => setSelectedSeriesId(parseInt(e.target.value))}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                >
                                    <option value={0}>-- Select a series --</option>
                                    {series.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">S3 Prefix (folder)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={prefix}
                                        onChange={e => setPrefix(e.target.value)}
                                        placeholder="series/"
                                        className="flex-1 p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
                                    />
                                    <button
                                        onClick={loadS3Files}
                                        disabled={loading || selectedSeriesId === 0}
                                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Cloud className="w-4 h-4" />
                                        )}
                                        Browse
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                    Common prefixes: series/, videos/, mahabharat/
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600 dark:text-slate-400">
                                    {files.length} video files found. {selectedFiles.size} selected.
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={selectAll} className="text-xs text-indigo-500 hover:text-indigo-600">
                                        Select All
                                    </button>
                                    <button onClick={deselectAll} className="text-xs text-gray-400 hover:text-gray-500">
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-80 overflow-y-auto space-y-1 border rounded-lg p-2 dark:border-slate-600">
                                {files.map((file, i) => (
                                    <div
                                        key={i}
                                        onClick={() => toggleFile(i)}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedFiles.has(i)
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                                                : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedFiles.has(i)
                                                ? 'bg-indigo-500 border-indigo-500'
                                                : 'border-gray-300 dark:border-slate-500'
                                            }`}>
                                            {selectedFiles.has(i) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="w-12 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                            S{file.season || 1}E{file.episode || (i + 1)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-700 dark:text-slate-300 truncate">{file.filename}</div>
                                            <div className="text-xs text-gray-400 dark:text-slate-500">{formatSize(file.size)}</div>
                                        </div>
                                    </div>
                                ))}

                                {files.length === 0 && (
                                    <div className="text-center p-8 text-gray-400">
                                        No video files found in this prefix
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between">
                                <button onClick={() => setStep('select')} className="px-4 py-2 text-gray-600 dark:text-slate-400">
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={selectedFiles.size === 0}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                                >
                                    Import {selectedFiles.size} Episodes
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center py-8">
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mb-4">
                                <div
                                    className="bg-indigo-500 h-3 rounded-full transition-all"
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>
                            <p className="text-gray-600 dark:text-slate-400">
                                Importing episodes...
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-400">
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
