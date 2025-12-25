'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/login', { email, password });
            const user = response.data.user;

            if (user.role === 'admin' || user.role === 'superadmin') {
                localStorage.setItem('admin_data', JSON.stringify(user));
                router.push('/dashboard');
            } else {
                setError('Access denied. Admin privileges required.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[var(--primary)]/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-[var(--primary)]/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-[var(--card)] p-8 rounded-2xl border border-[var(--border)] shadow-2xl relative overflow-hidden">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-[var(--primary)]/10 rounded-2xl">
                            <ShieldCheck className="w-12 h-12 text-[var(--primary)]" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Portal</h1>
                        <p className="text-[var(--muted-foreground)]">Enter your credentials to manage the system</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] font-semibold py-3 rounded-xl transition-all h-12 flex items-center justify-center disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
