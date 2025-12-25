'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings as SettingsIcon,
    Bell,
    Shield,
    Database,
    Globe,
    Moon,
    Sun,
    Save,
    CheckCircle2,
    Cpu,
    Key,
    Sparkles,
    Loader2
} from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('Profile');
    const [admin, setAdmin] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<any>({
        API_OPEN_AI: '',
        GEMINI_API_KEY: '',
        DEFAULT_ASTRO_MODEL: 'gpt-4o',
    });

    useEffect(() => {
        const data = localStorage.getItem('admin_data');
        if (data) setAdmin(JSON.parse(data));

        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post('/admin/settings', settings);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save settings', err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { label: 'Profile', icon: Shield },
        { label: 'AI & API', icon: Cpu },
        { label: 'Notifications', icon: Bell },
        { label: 'Appearance', icon: Sun },
        { label: 'System', icon: SettingsIcon },
        { label: 'Database & RAG', icon: Database },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-[var(--muted-foreground)] mt-2">Configure system preferences and your account</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation Sidebar */}
                <div className="space-y-2">
                    {tabs.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setActiveTab(item.label)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.label
                                ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                                : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-8">
                        {activeTab === 'Profile' && (
                            <section className="space-y-4">
                                <h2 className="text-xl font-bold">Account Profile</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Spiritual Name</label>
                                        <input
                                            type="text"
                                            defaultValue={admin?.spiritualName || 'Admin'}
                                            className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Email Address</label>
                                        <input
                                            type="email"
                                            defaultValue={admin?.email || ''}
                                            className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 opacity-60"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'AI & API' && (
                            <section className="space-y-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-500" /> AI Service Configuration
                                </h2>

                                <div className="space-y-4">
                                    <div className="p-4 bg-[var(--secondary)]/50 rounded-2xl border border-[var(--border)] space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-amber-500" />
                                            <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">External AI API Key (API_OPEN_AI)</label>
                                        </div>
                                        <input
                                            type="password"
                                            value={settings.API_OPEN_AI}
                                            onChange={(e) => setSettings({ ...settings, API_OPEN_AI: e.target.value })}
                                            placeholder="Enter OpenAI/Proxy API Key"
                                            className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        />
                                        <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                            This key is used for compatibility analysis and chat services (RVFreeLLM compatible).
                                        </p>
                                    </div>

                                    <div className="p-4 bg-[var(--secondary)]/50 rounded-2xl border border-[var(--border)] space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-blue-500" />
                                            <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">Gemini API Key</label>
                                        </div>
                                        <input
                                            type="password"
                                            value={settings.GEMINI_API_KEY || ''}
                                            onChange={(e) => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
                                            placeholder="Enter Google Gemini API Key"
                                            className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        />
                                        <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                            Fallback key for Google models if primary provider fails.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-[var(--secondary)]/50 rounded-2xl border border-[var(--border)] space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-pink-500" />
                                            <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">Default Astro-Processor Model</label>
                                        </div>
                                        <select
                                            value={settings.DEFAULT_ASTRO_MODEL}
                                            onChange={(e) => setSettings({ ...settings, DEFAULT_ASTRO_MODEL: e.target.value })}
                                            className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 shadow-inner appearance-none"
                                        >
                                            <option value="gpt-4o">GPT-4o (Stable)</option>
                                            <option value="gpt5">GPT-5 (Perplexity)</option>
                                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                        )}

                        {(activeTab === 'Profile' || activeTab === 'Appearance' || activeTab === 'System') && (
                            <section className="space-y-4">
                                <h2 className="text-xl font-bold">Preferences</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[var(--secondary)] rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[var(--background)] rounded-lg">
                                                <Moon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">Dark Mode</p>
                                                <p className="text-xs text-[var(--muted-foreground)]">Switch between light and dark themes</p>
                                            </div>
                                        </div>
                                        <div className="w-12 h-6 bg-[var(--primary)] rounded-full relative cursor-pointer">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[var(--secondary)] rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[var(--background)] rounded-lg">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">System Language</p>
                                                <p className="text-xs text-[var(--muted-foreground)]">Default language for the dashboard</p>
                                            </div>
                                        </div>
                                        <select className="bg-transparent text-sm font-medium outline-none border-none">
                                            <option>Russian</option>
                                            <option>English</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'Database & RAG' && (
                            <section className="space-y-4">
                                <h2 className="text-xl font-bold">Database & RAG Settings</h2>
                                <div className="space-y-4">
                                    <div className="p-4 bg-[var(--secondary)] rounded-2xl space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Database className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">Google Gemini RAG</p>
                                                <p className="text-xs text-[var(--muted-foreground)]">Configure your vector database settings</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Corpus ID</label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    value="user-profiles-store-o1klt2dm6z8h"
                                                    className="w-full bg-[var(--background)] border-none rounded-lg py-2 px-3 text-xs font-mono outline-none opacity-70"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[var(--secondary)] rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-100 rounded-lg">
                                                    <Shield className="w-4 h-4 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">Auto-Sync Data</p>
                                                    <p className="text-xs text-[var(--muted-foreground)]">Automatically sync user profiles to RAG</p>
                                                </div>
                                            </div>
                                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                            {success && (
                                <p className="text-emerald-500 text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Changes saved successfully!
                                </p>
                            )}
                            <div className="flex-1"></div>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg min-w-[160px] justify-center"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

