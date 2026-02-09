'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    MoreVertical,
    UserX,
    UserCheck,
    Shield,
    Mail,
    MapPin,
    Loader2,
    AlertCircle,
    Flag,
    Heart,
    Wallet,
    Tablet,
    ShieldAlert
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function UsersPage() {
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { data: users, error, mutate } = useSWR(
        `/admin/users?search=${search}&role=${role}&status=${status}`,
        fetcher
    );

    const deviceCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        users?.forEach((u: any) => {
            if (u.deviceId) {
                counts[u.deviceId] = (counts[u.deviceId] || 0) + 1;
            }
        });
        return counts;
    }, [users]);

    const handleToggleBlock = async (userId: number, isBlocked: boolean) => {
        setActionLoading(userId.toString());
        try {
            await api.post(`/admin/users/${userId}/toggle-block`);
            mutate(); // Refresh data
        } catch (err) {
            console.error('Failed to toggle block status', err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Manage and monitor all system users</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm font-semibold border border-[var(--primary)]/20">
                        {users?.length || 0} Total
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Search by name, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                    >
                        <option value="">All Roles</option>
                        <option value="user">Users</option>
                        <option value="admin">Admins</option>
                        <option value="superadmin">Super Admins</option>
                    </select>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Failed to load users</p>
                    <button onClick={() => mutate()} className="mt-4 text-sm underline">Try again</button>
                </div>
            ) : !users ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">User</th>
                                    <th className="px-6 py-4 font-semibold">Location</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold">Union</th>
                                    <th className="px-6 py-4 font-semibold">Device</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {users.map((user: any) => (
                                        <motion.tr
                                            key={user.ID}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-[var(--secondary)]/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[var(--secondary)] rounded-full flex items-center justify-center font-bold text-[var(--primary)] border border-[var(--border)]">
                                                        {user.spiritualName?.[0] || user.karmicName?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{user.spiritualName || user.karmicName || 'Anonymous'}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-[var(--muted-foreground)]" />
                                                    {user.city || 'Unknown'}, {user.country || 'N/A'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => {
                                                        const newRole = e.target.value;
                                                        api.put(`/admin/users/${user.ID}/role`, { role: newRole }).then(() => mutate());
                                                    }}
                                                    disabled={user.role === 'superadmin'}
                                                    className={`text-[10px] font-bold uppercase py-1 px-2 rounded-lg border bg-transparent outline-none cursor-pointer ${user.role === 'superadmin' ? 'text-purple-600 border-purple-200' :
                                                        user.role === 'admin' ? 'text-blue-600 border-blue-200' :
                                                            'text-gray-600 border-gray-200'
                                                        }`}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="superadmin">Super Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.datingEnabled ? (
                                                    <Link
                                                        href={`/dating?search=${user.email}`}
                                                        className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${user.isFlagged ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                                                            }`}
                                                    >
                                                        {user.isFlagged ? <Flag className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
                                                        {user.isFlagged ? 'Flagged' : 'Profile'}
                                                    </Link>
                                                ) : (
                                                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Not Active</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.deviceId ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-mono text-[var(--muted-foreground)] truncate max-w-[100px]" title={user.deviceId}>
                                                            {user.deviceId.substring(0, 8)}...
                                                        </span>
                                                        {deviceCounts[user.deviceId] > 1 && (
                                                            <span className="flex items-center gap-1 text-[9px] text-amber-500 font-bold uppercase mt-1">
                                                                <ShieldAlert className="w-3 h-3" /> Suspicious Device
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.isBlocked ? (
                                                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                                        <AlertCircle className="w-3 h-3" /> Blocked
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                                        <UserCheck className="w-3 h-3" /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/users/${user.ID}/wallet`}
                                                        className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                                                        title="Manage wallet"
                                                    >
                                                        <Wallet className="w-5 h-5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleToggleBlock(user.ID, user.isBlocked)}
                                                        disabled={actionLoading === user.ID.toString() || user.role === 'superadmin'}
                                                        className={`p-2 rounded-lg transition-all ${user.isBlocked
                                                            ? 'text-emerald-500 hover:bg-emerald-50'
                                                            : 'text-red-500 hover:bg-red-50'
                                                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                        title={user.isBlocked ? 'Unblock user' : 'Block user'}
                                                    >
                                                        {actionLoading === user.ID.toString() ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : user.isBlocked ? (
                                                            <UserCheck className="w-5 h-5" />
                                                        ) : (
                                                            <UserX className="w-5 h-5" />
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

                    {/* Mobile View Cards */}
                    <div className="md:hidden divide-y divide-[var(--border)]">
                        {users.map((user: any) => (
                            <div key={user.ID} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[var(--secondary)] rounded-2xl flex items-center justify-center font-bold text-[var(--primary)] border border-[var(--border)]">
                                        {user.spiritualName?.[0] || user.karmicName?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{user.spiritualName || user.karmicName}</h3>
                                        <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-[var(--secondary)] rounded-md">
                                                {user.role}
                                            </span>
                                            {user.isBlocked && (
                                                <span className="text-[10px] font-bold text-red-500 uppercase">Blocked</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleBlock(user.ID, user.isBlocked)}
                                    disabled={actionLoading === user.ID.toString() || user.role === 'superadmin'}
                                    className={`p-3 rounded-xl ${user.isBlocked ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                                        } disabled:opacity-30`}
                                >
                                    {user.isBlocked ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                                </button>
                            </div>
                        ))}
                    </div>

                    {users.length === 0 && (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            No users found matching your filters.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
