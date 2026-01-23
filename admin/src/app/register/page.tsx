'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, Mail, Loader2, User as UserIcon,
    ChevronRight, ChevronLeft, MapPin,
    CheckCircle2, AlertCircle, Heart,
    Sparkles, GraduationCap
} from 'lucide-react';
import api from '@/lib/api';

const DATING_TRADITIONS = [
    'Brahma-Madhva-Gaudiya',
    'Sri Sampradaya (Ramanuja)',
    'Brahma Sampradaya (Madhvacharya)',
    'Rudra Sampradaya (Vishnuswami)',
    'Kumara Sampradaya (Nimbarka)',
    'Other'
];

const YOGA_STYLES = [
    'Bhakti', 'Hatha', 'Jnana', 'Karma', 'Ashtanga', 'Kriya', 'Other'
];

const GUNAS = [
    'Sattva (Goodness)', 'Rajas (Passion)', 'Tamas (Ignorance)', 'Transcendental'
];

const IDENTITY_OPTIONS = ['Yogi', 'In Goodness'];
const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];
const GENDER_OPTIONS = ['Male', 'Female'];

export default function RegisterPage() {
    const [phase, setPhase] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    // Form States
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        karmicName: '',
        spiritualName: '',
        gender: GENDER_OPTIONS[0],
        country: '',
        city: '',
        identity: IDENTITY_OPTIONS[0],
        diet: DIET_OPTIONS[2],
        madh: '',
        mentor: '',
        yogaStyle: '',
        guna: '',
        agreement: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handlePhase1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!formData.agreement) {
            setError('Please agree to the terms and conditions');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/register', {
                email: formData.email,
                password: formData.password
            });

            const { user, token } = response.data;
            localStorage.setItem('admin_data', JSON.stringify({ ...user, token }));
            setPhase(2);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePhase2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { email, password, confirmPassword, agreement, ...profileData } = formData;
            const response = await api.put('/update-profile', profileData);

            const adminData = localStorage.getItem('admin_data');
            if (adminData) {
                const parsed = JSON.parse(adminData);
                localStorage.setItem('admin_data', JSON.stringify({ ...parsed, ...response.data.user }));
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Profile update failed');
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl"
            >
                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-2xl relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--border)]">
                        <motion.div
                            className="h-full bg-[var(--primary)]"
                            initial={{ width: '0%' }}
                            animate={{ width: phase === 1 ? '50%' : '100%' }}
                        />
                    </div>

                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {phase === 1 ? 'Create Account' : 'Complete Profile'}
                            </h1>
                            <p className="text-[var(--muted-foreground)] mt-1">
                                {phase === 1 ? 'Join the VedaMatch community' : 'Tell us more about yourself'}
                            </p>
                        </div>
                        <div className="text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full">
                            Step {phase} of 2
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm flex items-center gap-3"
                        >
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            Registration complete! Redirecting...
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {phase === 1 ? (
                            <motion.form
                                key="phase1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handlePhase1}
                                className="space-y-5"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-medium ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="your@email.com"
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="••••••••"
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="••••••••"
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-1">
                                    <input
                                        type="checkbox"
                                        name="agreement"
                                        checked={formData.agreement}
                                        onChange={handleChange}
                                        className="mt-1 w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <span className="text-sm text-[var(--muted-foreground)] leading-tight">
                                        Agree to terms and conditions. Hare Krishna.
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Continue
                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                <div className="text-center mt-6">
                                    <p className="text-sm text-[var(--muted-foreground)]">
                                        Already have an account?{' '}
                                        <Link href="/login" className="text-[var(--primary)] font-bold hover:underline">
                                            Sign In
                                        </Link>
                                    </p>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="phase2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handlePhase2}
                                className="space-y-5"
                            >
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Karmic Name</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                            <input
                                                type="text"
                                                name="karmicName"
                                                value={formData.karmicName}
                                                onChange={handleChange}
                                                placeholder="John Doe"
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Spiritual Name</label>
                                        <div className="relative">
                                            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                            <input
                                                type="text"
                                                name="spiritualName"
                                                value={formData.spiritualName}
                                                onChange={handleChange}
                                                placeholder="Das Anu Das"
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                        >
                                            {GENDER_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Diet</label>
                                        <select
                                            name="diet"
                                            value={formData.diet}
                                            onChange={handleChange}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                        >
                                            {DIET_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">Country</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                            <input
                                                type="text"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                placeholder="India"
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1">City</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                placeholder="Mayapur"
                                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium ml-1">Spiritual Tradition</label>
                                    <select
                                        name="madh"
                                        value={formData.madh}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all outline-none"
                                    >
                                        <option value="">Select Tradition</option>
                                        {DATING_TRADITIONS.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setPhase(1)}
                                        className="w-full bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-[var(--foreground)] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Complete
                                                <CheckCircle2 className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
