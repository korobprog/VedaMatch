'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    User as UserIcon, MapPin, Heart,
    Sparkles, GraduationCap, Loader2,
    Save, ChevronLeft
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        const data = localStorage.getItem('admin_data');
        if (!data) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(data));
        setLoading(false);
    }, [router]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.put('/update-profile', user);
            const updatedUser = response.data.user;

            // Keep token
            const oldData = JSON.parse(localStorage.getItem('admin_data') || '{}');
            localStorage.setItem('admin_data', JSON.stringify({ ...oldData, ...updatedUser }));

            setUser(updatedUser);
            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="p-2 hover:bg-[var(--primary)]/10 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold">My Profile</h1>
                </div>

                <form onSubmit={handleUpdate} className="grid md:grid-cols-3 gap-8">
                    {/* Sidebar/Avatar area */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] text-center">
                            <div className="w-32 h-32 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[var(--primary)]/20">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <UserIcon className="w-16 h-16 text-[var(--primary)]" />
                                )}
                            </div>
                            <h2 className="text-xl font-bold">{user.spiritualName || user.karmicName}</h2>
                            <p className="text-[var(--muted-foreground)] text-sm">{user.email}</p>
                            <div className="mt-4 inline-block px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold rounded-full uppercase tracking-wider">
                                {user.role}
                            </div>
                        </div>

                        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                        {success && <div className="p-4 bg-green-50 text-green-600 rounded-xl text-sm">{success}</div>}
                    </div>

                    {/* Main form area */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-6">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Karmic Name</label>
                                    <input
                                        type="text"
                                        value={user.karmicName || ''}
                                        onChange={e => setUser({ ...user, karmicName: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Spiritual Name</label>
                                    <input
                                        type="text"
                                        value={user.spiritualName || ''}
                                        onChange={e => setUser({ ...user, spiritualName: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Country</label>
                                    <input
                                        type="text"
                                        value={user.country || ''}
                                        onChange={e => setUser({ ...user, country: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">City</label>
                                    <input
                                        type="text"
                                        value={user.city || ''}
                                        onChange={e => setUser({ ...user, city: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Diet</label>
                                <div className="flex gap-4">
                                    {['Vegan', 'Vegetarian', 'Prasad'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setUser({ ...user, diet: opt })}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${user.diet === opt
                                                    ? 'bg-[var(--primary)] text-white'
                                                    : 'bg-[var(--secondary)] hover:bg-[var(--primary)]/10'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-[var(--primary)] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[var(--primary)]/90 transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
