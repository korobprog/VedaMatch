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

    const normalizedPath = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    if (/^\/[^/]+\.(?:jpg|jpeg|png|webp|gif|heic|heif)$/i.test(normalizedPath)) {
        return `${apiOrigin}/uploads/avatars${normalizedPath}`;
    }

    return `${apiOrigin}${normalizedPath}`;
};

export default function DatingManagementPage() {
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [brokenMediaUrls, setBrokenMediaUrls] = useState<Record<string, true>>({});
    const [reviewTab, setReviewTab] = useState<'admin' | 'ai' | 'flagged' | 'published'>('admin');
    const selectedAvatarCandidate = resolveMediaUrl(selectedProfile?.avatarUrl);
    const selectedAvatarUrl = selectedAvatarCandidate && !brokenMediaUrls[selectedAvatarCandidate]
        ? selectedAvatarCandidate
        : '';

    const markMediaBroken = (url?: string) => {
        if (!url) return;
        setBrokenMediaUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
    };

    const statusParam = reviewTab === 'admin'
        ? 'pending_admin_review'
        : reviewTab === 'ai'
            ? 'pending_ai_review'
            : reviewTab === 'flagged'
                ? 'flagged_after_publish'
                : 'published';

    const { data: profiles, error, mutate } = useSWR(
        `/admin/dating/reviews?statuses=${statusParam}`,
        fetcher
    );
    const { data: selectedProfileDetail, isLoading: selectedProfileLoading } = useSWR(
        selectedProfile?.ID ? `/admin/dating/reviews/${selectedProfile.ID}` : null,
        fetcher
    );
    const detailProfile = selectedProfileDetail?.profile || selectedProfile;
    const detailApprovals = Array.isArray(selectedProfileDetail?.approvals) ? selectedProfileDetail.approvals : [];
    const detailModerationEvents = Array.isArray(selectedProfileDetail?.moderationEvents) ? selectedProfileDetail.moderationEvents : [];

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

    const handleModerationAction = async (userId: number, action: 'publish' | 'reject' | 'flag') => {
        setActionLoading(`${userId}:${action}`);
        try {
            await api.post(`/admin/dating/reviews/${userId}/decision`, {
                action,
                note: action === 'publish'
                    ? 'Approved by admin'
                    : action === 'reject'
                        ? 'Rejected by admin moderation'
                        : 'Flagged by admin moderation',
            });
            mutate();
        } catch (err) {
            console.error('Failed moderation action', err);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredProfiles = Array.isArray(profiles)
        ? profiles.filter((user: any) => {
            const query = search.trim().toLowerCase();
            if (!query) return true;
            return [user.spiritualName, user.karmicName, user.email, user.interests, user.city]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        })
        : [];

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
                        {filteredProfiles.length || 0} Profiles
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
                <div className="flex flex-wrap gap-2">
                    {[
                        ['admin', 'Pending admin fallback'],
                        ['ai', 'Pending AI review'],
                        ['flagged', 'Published / flagged'],
                        ['published', 'Published'],
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setReviewTab(id as any)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border ${reviewTab === id ? 'bg-pink-500 text-white border-pink-500' : 'bg-[var(--secondary)] border-[var(--border)]'}`}
                        >
                            {label}
                        </button>
                    ))}
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
                    {filteredProfiles.map((user: any) => {
                        const suspicious = isSuspicious(user.bio) || isSuspicious(user.interests);
                        const flagged = user.isFlagged;
                        const avatarCandidate = resolveMediaUrl(user.avatarUrl);
                        const avatarUrl = avatarCandidate && !brokenMediaUrls[avatarCandidate] ? avatarCandidate : '';

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
                                            <img
                                                src={avatarUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                onError={() => markMediaBroken(avatarUrl)}
                                            />
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
                                            <p className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] mb-1">Status</p>
                                            <p className="text-xs font-semibold text-[var(--foreground)]">{user.datingPublicationStatus || 'draft'}</p>
                                            <p className="text-[10px] text-[var(--muted-foreground)] mt-1 truncate">{user.datingStatusReason || 'No moderation note yet'}</p>
                                        </div>
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
                                    <button
                                        onClick={() => handleModerationAction(user.ID, 'publish')}
                                        disabled={actionLoading === `${user.ID}:publish`}
                                        className="p-2.5 rounded-xl bg-emerald-500 text-white"
                                        title="Publish"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleModerationAction(user.ID, 'reject')}
                                        disabled={actionLoading === `${user.ID}:reject`}
                                        className="p-2.5 rounded-xl bg-amber-500 text-white"
                                        title="Reject"
                                    >
                                        <UserX className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {profiles && filteredProfiles.length === 0 && (
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
                                            <img
                                                src={selectedAvatarUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                onError={() => markMediaBroken(selectedAvatarUrl)}
                                            />
                                        ) : '👤'}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-16 p-8 space-y-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold">{detailProfile?.spiritualName || detailProfile?.karmicName}</h2>
                                        <span className="px-2 py-1 bg-[var(--secondary)] rounded-lg text-[10px] uppercase font-bold text-[var(--muted-foreground)]">
                                            {detailProfile?.gender}
                                        </span>
                                    </div>
                                    <p className="text-[var(--muted-foreground)] flex items-center gap-2 mt-1">
                                        <Mail className="w-4 h-4" /> {detailProfile?.email}
                                    </p>
                                </div>

                                {selectedProfileLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                                    </div>
                                ) : (
                                <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold text-pink-500 uppercase mb-1">Astro</p>
                                        <div className="space-y-1">
                                            <p className="text-sm">📅 {detailProfile?.dob || 'Not set'}</p>
                                            <p className="text-sm">🕒 {detailProfile?.birthTime || 'Not set'}</p>
                                            <p className="text-xs text-[var(--muted-foreground)] truncate">📍 {detailProfile?.birthPlaceLink || 'Not set'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Lifestyle</p>
                                        <div className="space-y-1">
                                            <p className="text-sm">🌱 {detailProfile?.diet || 'N/A'}</p>
                                            <p className="text-sm">☸️ {detailProfile?.madh || 'N/A'}</p>
                                            <p className="text-xs text-[var(--muted-foreground)] truncate">💍 {detailProfile?.maritalStatus || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold text-emerald-500 uppercase mb-2">Union Signals</p>
                                        <div className="space-y-1 text-sm">
                                            <p>Children: {detailProfile?.childrenIntent || 'N/A'}</p>
                                            <p>Love languages: {detailProfile?.loveLanguages || 'N/A'}</p>
                                            <p>Elements: {[detailProfile?.elementalPrimary, detailProfile?.elementalSecondary].filter(Boolean).join(' / ') || 'N/A'}</p>
                                            <p>Meetings: {detailProfile?.meetingPreferences || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold text-sky-500 uppercase mb-2">Publication</p>
                                        <div className="space-y-1 text-sm">
                                            <p>Status: {detailProfile?.datingPublicationStatus || 'draft'}</p>
                                            <p>Reason: {detailProfile?.datingStatusReason || 'No moderation note yet'}</p>
                                            <p>Last AI/admin note: {detailProfile?.datingLastModerationNote || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-[var(--muted-foreground)]">About Me</label>
                                        <div className={`p-4 rounded-2xl border ${isSuspicious(detailProfile?.bio) ? 'bg-amber-50 border-amber-200' : 'bg-[var(--secondary)]/20 border-[var(--border)]'}`}>
                                            <p className="text-sm leading-relaxed">{detailProfile?.bio}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-[var(--muted-foreground)]">Looking For</label>
                                        <div className="p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]">
                                            <p className="text-sm leading-relaxed">{detailProfile?.lookingFor}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold uppercase text-[var(--muted-foreground)] mb-2">Friend approvals</p>
                                        <div className="space-y-2 max-h-48 overflow-auto pr-1">
                                            {detailApprovals.length === 0 ? (
                                                <p className="text-sm text-[var(--muted-foreground)]">No approvals yet</p>
                                            ) : detailApprovals.map((approval: any) => (
                                                <div key={approval.ID} className="rounded-xl border border-[var(--border)] p-3">
                                                    <p className="text-sm font-semibold">{approval.approver?.spiritualName || approval.approver?.karmicName || `User ${approval.approverId}`}</p>
                                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{approval.status}</p>
                                                    {approval.note ? <p className="text-xs mt-1">{approval.note}</p> : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold uppercase text-[var(--muted-foreground)] mb-2">Moderation history</p>
                                        <div className="space-y-2 max-h-48 overflow-auto pr-1">
                                            {detailModerationEvents.length === 0 ? (
                                                <p className="text-sm text-[var(--muted-foreground)]">No moderation events yet</p>
                                            ) : detailModerationEvents.map((event: any) => (
                                                <div key={event.ID} className="rounded-xl border border-[var(--border)] p-3">
                                                    <p className="text-sm font-semibold">{event.outcome}</p>
                                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{event.actorType} · {event.severity || 'normal'}</p>
                                                    {event.reason ? <p className="text-xs mt-1">{event.reason}</p> : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold uppercase text-[var(--muted-foreground)] mb-2">Social links</p>
                                        <div className="space-y-2">
                                            {detailProfile?.datingSocialLinks?.length ? detailProfile.datingSocialLinks.map((link: any, index: number) => (
                                                <div key={`${link.platform}-${index}`} className="text-sm break-all">
                                                    <span className="font-semibold">{link.platform || 'link'}:</span> {link.url}
                                                </div>
                                            )) : <p className="text-sm text-[var(--muted-foreground)]">No social links</p>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]">
                                        <p className="text-xs font-bold uppercase text-[var(--muted-foreground)] mb-2">Profile posts</p>
                                        <div className="space-y-2 max-h-48 overflow-auto pr-1">
                                            {detailProfile?.datingPosts?.length ? detailProfile.datingPosts.map((post: any) => (
                                                <div key={post.ID} className="rounded-xl border border-[var(--border)] p-3">
                                                    <p className="text-sm">{post.body}</p>
                                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">{post.status}</p>
                                                    {post.moderationReason ? <p className="text-xs mt-1">{post.moderationReason}</p> : null}
                                                </div>
                                            )) : <p className="text-sm text-[var(--muted-foreground)]">No profile posts</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => handleToggleFlag(detailProfile.ID, detailProfile.isFlagged)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg ${detailProfile.isFlagged ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                            }`}
                                    >
                                        {detailProfile.isFlagged ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                        {detailProfile.isFlagged ? 'Looks Good (Unflag)' : 'Flag as Inappropriate'}
                                    </button>
                                    <button
                                        onClick={() => handleModerationAction(detailProfile.ID, 'publish')}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg bg-emerald-500 text-white"
                                    >
                                        <UserCheck className="w-5 h-5" />
                                        Publish
                                    </button>
                                    <button
                                        onClick={() => handleModerationAction(detailProfile.ID, 'reject')}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg bg-amber-500 text-white"
                                    >
                                        <UserX className="w-5 h-5" />
                                        Reject
                                    </button>
                                </div>
                                </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
