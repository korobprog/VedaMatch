'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Heart,
    Flag,
    ShieldAlert,
    UserX,
    UserCheck,
    Mail,
    MapPin,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Eye,
    Trash2
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Simple blacklisted words for demo moderation
const BLACKLIST = ['porn', 'sexy', 'money', 'crypto', 'scam', 'dating site', '18+', 'drugs', 'weapons'];

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

export default function DatingManagementPage() {
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const selectedAvatarUrl = resolveMediaUrl(selectedProfile?.avatarUrl);

    const { data: profiles, error, mutate } = useSWR(
        `/admin/dating/profiles?search=${search}`,
        fetcher
    );

    const handleToggleFlag = async (userId: number, currentFlagged: boolean) => {
        setActionLoading(userId.toString());
        try {
            await api.post(`/admin/dating/profiles/${userId}/flag`, {
                isFlagged: !currentFlagged,
                flagReason: !currentFlagged ? 'Moderated by Admin' : ''
            });
            mutate();
        } catch (err) {
            console.error('Failed to toggle flag', err);
        } finally {
            setActionLoading(null);
        }
    };

    const isSuspicious = (text: string) => {
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return BLACKLIST.some(word => lowerText.includes(word));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Union Management</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Moderate and manage community union profiles</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-pink-500/10 text-pink-500 rounded-full text-sm font-semibold border border-pink-500/20">
                        <Heart className="w-4 h-4 inline mr-2" />
                        {profiles?.length || 0} Registered Profiles
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Search by name, email, interests..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    />
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Failed to load profiles</p>
                    <button onClick={() => mutate()} className="mt-4 text-sm underline">Try again</button>
                </div>
            ) : !profiles ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((user: any) => {
                        const suspicious = isSuspicious(user.bio) || isSuspicious(user.interests);
                        const flagged = user.isFlagged;
                        const avatarUrl = resolveMediaUrl(user.avatarUrl);

                        return (
                            <motion.div
                                key={user.ID}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`group relative bg-[var(--card)] rounded-3xl border-2 transition-all p-5 flex flex-col gap-4 shadow-sm hover:shadow-md ${flagged ? 'border-red-500 bg-red-50/50' :
                                        suspicious ? 'border-amber-400 bg-amber-50/20' :
                                            'border-[var(--border)] hover:border-[var(--primary)]/50'
                                    }`}
                            >
                                {flagged && (
                                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg animate-pulse">
                                        Flagged
                                    </div>
                                )}
                                {suspicious && !flagged && (
                                    <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg">
                                        Suspicious
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-[var(--secondary)] rounded-2xl flex items-center justify-center font-bold text-2xl text-[var(--primary)] border border-[var(--border)] overflow-hidden shrink-0">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            user.spiritualName?.[0] || user.karmicName?.[0] || '?'
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg truncate">{user.spiritualName || user.karmicName}</h3>
                                        <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 truncate">
                                            <Mail className="w-3 h-3" /> {user.email}
                                        </p>
                                        <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 truncate mt-1">
                                            <MapPin className="w-3 h-3" /> {user.city}, {user.country}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 flex-1">
                                    <div className="p-3 bg-[var(--secondary)]/50 rounded-2xl">
                                        <p className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] mb-1">Tradition & Interest</p>
                                        <p className="text-xs font-semibold text-[var(--foreground)]">{user.madh || 'N/A'}</p>
                                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1 truncate">{user.interests}</p>
                                    </div>
                                    <div className="p-3 bg-[var(--secondary)]/50 rounded-2xl">
                                        <p className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] mb-1">Bio</p>
                                        <p className="text-xs text-[var(--foreground)] line-clamp-3 italic">
                                            "{user.bio || 'No bio provided'}"
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                                    <button
                                        onClick={() => setSelectedProfile(user)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--secondary)] hover:bg-[var(--border)] rounded-xl text-xs font-bold transition-all"
                                    >
                                        <Eye className="w-4 h-4" /> Full View
                                    </button>
                                    <button
                                        onClick={() => handleToggleFlag(user.ID, flagged)}
                                        disabled={actionLoading === user.ID.toString()}
                                        className={`p-2.5 rounded-xl transition-all ${flagged ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                            }`}
                                        title={flagged ? 'Unflag profile' : 'Flag profile'}
                                    >
                                        {actionLoading === user.ID.toString() ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : flagged ? (
                                            <ShieldAlert className="w-4 h-4" />
                                        ) : (
                                            <Flag className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {profiles && profiles.length === 0 && (
                <div className="p-24 bg-[var(--card)] rounded-3xl border-2 border-dashed border-[var(--border)] text-center">
                    <Heart className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
                    <p className="text-[var(--muted-foreground)] font-medium">No dating profiles found matching your search.</p>
                </div>
            )}

            {/* Profile View Modal */}
            <AnimatePresence>
                {selectedProfile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--card)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)]"
                        >
                            <div className="relative h-48 bg-gradient-to-r from-pink-500 to-indigo-600">
                                <button
                                    onClick={() => setSelectedProfile(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
                                >
                                    <AlertCircle className="w-5 h-5 rotate-45" />
                                </button>
                                <div className="absolute -bottom-12 left-8 p-1 bg-[var(--card)] rounded-3xl border-4 border-[var(--card)]">
                                    <div className="w-24 h-24 bg-[var(--secondary)] rounded-2xl flex items-center justify-center text-4xl overflow-hidden">
                                        {selectedAvatarUrl ? (
                                            <img src={selectedAvatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : '👤'}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-16 p-8 space-y-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold">{selectedProfile.spiritualName || selectedProfile.karmicName}</h2>
                                        <span className="px-2 py-1 bg-[var(--secondary)] rounded-lg text-[10px] uppercase font-bold text-[var(--muted-foreground)]">
                                            {selectedProfile.gender}
                                        </span>
                                    </div>
                                    <p className="text-[var(--muted-foreground)] flex items-center gap-2 mt-1">
                                        <Mail className="w-4 h-4" /> {selectedProfile.email}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold text-pink-500 uppercase mb-1">Astro</p>
                                        <div className="space-y-1">
                                            <p className="text-sm">📅 {selectedProfile.dob || 'Not set'}</p>
                                            <p className="text-sm">🕒 {selectedProfile.birthTime || 'Not set'}</p>
                                            <p className="text-xs text-[var(--muted-foreground)] truncate">📍 {selectedProfile.birthPlaceLink || 'Not set'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Lifestyle</p>
                                        <div className="space-y-1">
                                            <p className="text-sm">🌱 {selectedProfile.diet || 'N/A'}</p>
                                            <p className="text-sm">☸️ {selectedProfile.madh || 'N/A'}</p>
                                            <p className="text-xs text-[var(--muted-foreground)] truncate">💍 {selectedProfile.maritalStatus || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-[var(--muted-foreground)]">About Me</label>
                                        <div className={`p-4 rounded-2xl border ${isSuspicious(selectedProfile.bio) ? 'bg-amber-50 border-amber-200' : 'bg-[var(--secondary)]/20 border-[var(--border)]'}`}>
                                            <p className="text-sm leading-relaxed">{selectedProfile.bio}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-[var(--muted-foreground)]">Looking For</label>
                                        <div className="p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]">
                                            <p className="text-sm leading-relaxed">{selectedProfile.lookingFor}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => handleToggleFlag(selectedProfile.ID, selectedProfile.isFlagged)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg ${selectedProfile.isFlagged ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                            }`}
                                    >
                                        {selectedProfile.isFlagged ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                        {selectedProfile.isFlagged ? 'Looks Good (Unflag)' : 'Flag as Inappropriate'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
