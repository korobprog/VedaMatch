'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

export default function AdminLoginPage() {
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
            const { user, token } = response.data;

            if (user.role !== 'admin' && user.role !== 'superadmin') {
                setError('Unauthorized. This portal is for administrators only.');
                return;
            }

            localStorage.setItem('admin_data', JSON.stringify({ ...user, token }));
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <ShieldCheck className="w-12 h-12 text-blue-400" />
                        </div>
                    </div>

                    <div className="text-center mb-8 text-white">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Portal</h1>
                        <p className="text-slate-400">Restricted Access Management</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1 text-slate-300">Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@vedicai.com"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1 text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-white"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all h-12 flex items-center justify-center disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authorize Login'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
