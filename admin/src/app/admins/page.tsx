'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    ShieldAlert,
    UserPlus,
    Mail,
    Lock,
    ShieldCheck,
    Trash2,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function AdminsPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('admin');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const { data: admins, mutate } = useSWR('/admin/users?role=admin&role=superadmin', fetcher);

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await api.post('/admin/admins', { email, password, role });
            setSuccess(true);
            setEmail('');
            setPassword('');
            mutate();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Administrators</h1>
                    <p className="text-[var(--muted-foreground)] mt-2">Manage privileged users and system access</p>
                </div>
                <div className="p-4 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl">
                    <ShieldAlert className="w-8 h-8" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Admin Form */}
                <div className="lg:col-span-1">
                    <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm sticky top-24">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <UserPlus className="w-5 h-5" /> Add New Admin
                        </h2>

                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        placeholder="admin@vedicai.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block ml-1">Temporary Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block ml-1">Access Level</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRole('admin')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${role === 'admin'
                                                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                                                : 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-transparent'
                                            }`}
                                    >
                                        ADMIN
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('superadmin')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${role === 'superadmin'
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-transparent'
                                            }`}
                                    >
                                        SUPER ADMIN
                                    </button>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-xs px-1">{error}</p>}
                            {success && (
                                <p className="text-emerald-500 text-xs px-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Admin created successfully
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[var(--foreground)] text-[var(--background)] py-3 rounded-xl font-bold mt-4 hover:opacity-90 transition-all flex items-center justify-center h-12"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Admins List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold px-1">Active Administrators</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {admins?.map((admin: any) => (
                            <motion.div
                                key={admin.ID}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[var(--card)] p-5 rounded-3xl border border-[var(--border)] shadow-sm flex items-center gap-4 group"
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${admin.role === 'superadmin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{admin.email}</p>
                                    <p className="text-xs text-[var(--muted-foreground)]">Role: {admin.role.toUpperCase()}</p>
                                </div>
                                <button className="p-2 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:hidden">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
