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
    Loader2,
    Route,
    Zap,
    Brain
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
        GEMINI_API_KEY_BACKUP_1: '',
        GEMINI_API_KEY_BACKUP_2: '',
        GEMINI_API_KEY_BACKUP_3: '',
        GEMINI_API_KEY_BACKUP_4: '',
        DEFAULT_ASTRO_MODEL: 'gpt-4o',
        ROUTEWAY_API_KEY: '',
        ROUTEWAY_API_URL: 'https://api.routeway.ai/v1/chat/completions',
        OPENROUTER_API_KEY: '',
        OPENROUTER_WORKER_URL: '',
        OPENROUTER_FAST_MODEL: 'deepseek/deepseek-chat',
        OPENROUTER_REASONING_MODEL: 'deepseek/deepseek-r1',
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

    // RAG Management State
    const [selectedKey, setSelectedKey] = useState('GEMINI_API_KEY');
    const [corpora, setCorpora] = useState<any[]>([]);
    const [loadingCorpora, setLoadingCorpora] = useState(false);
    const [newCorpusName, setNewCorpusName] = useState('');
    const [creatingCorpus, setCreatingCorpus] = useState(false);

    const fetchCorpora = async () => {
        if (!selectedKey) return;
        setLoadingCorpora(true);
        try {
            const res = await api.get(`/admin/rag/corpora?key_name=${selectedKey}`);
            if (res.data && res.data.corpora) {
                setCorpora(res.data.corpora);
            } else {
                setCorpora([]);
            }
        } catch (err) {
            console.error('Failed to fetch corpora', err);
            alert('Failed to fetch corpora. Check API Key permission.');
        } finally {
            setLoadingCorpora(false);
        }
    };

    const createCorpus = async () => {
        if (!newCorpusName) return;
        setCreatingCorpus(true);
        try {
            const res = await api.post('/admin/rag/corpora', {
                keyName: selectedKey,
                displayName: newCorpusName
            });
            setNewCorpusName('');
            fetchCorpora(); // Refresh list
            alert(`Corpus created: ${res.data.name}`);
        } catch (err) {
            console.error('Failed to create corpus', err);
            alert('Failed to create corpus.');
        } finally {
            setCreatingCorpus(false);
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

                                    {/* Primary Gemini Key */}
                                    <div className="p-4 bg-[var(--secondary)]/50 rounded-2xl border border-[var(--border)] space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-blue-500" />
                                            <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">Gemini API Key (Primary)</label>
                                        </div>
                                        <input
                                            type="password"
                                            value={settings.GEMINI_API_KEY || ''}
                                            onChange={(e) => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
                                            placeholder="Enter Google Gemini API Key"
                                            className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                        />
                                        <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                            Primary key for Gemini models.
                                        </p>
                                    </div>

                                    {/* Dynamic Backup Keys */}
                                    {Object.keys(settings)
                                        .filter(key => key.startsWith('GEMINI_API_KEY_BACKUP_'))
                                        .sort((a, b) => {
                                            const numA = parseInt(a.replace('GEMINI_API_KEY_BACKUP_', '')) || 0;
                                            const numB = parseInt(b.replace('GEMINI_API_KEY_BACKUP_', '')) || 0;
                                            return numA - numB;
                                        })
                                        .map((key) => (
                                            <div key={key} className="p-4 bg-[var(--secondary)]/50 rounded-2xl border border-[var(--border)] space-y-3 relative group">
                                                <div className="flex items-center gap-2">
                                                    <Key className="w-4 h-4 text-blue-300" />
                                                    <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">
                                                        {key.replace(/_/g, ' ')}
                                                    </label>
                                                </div>
                                                <input
                                                    type="password"
                                                    value={settings[key] || ''}
                                                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                                                    placeholder={`Enter ${key}`}
                                                    className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                                />
                                            </div>
                                        ))}

                                    <button
                                        onClick={() => {
                                            const backups = Object.keys(settings).filter(k => k.startsWith('GEMINI_API_KEY_BACKUP_'));
                                            let nextNum = 1;
                                            if (backups.length > 0) {
                                                const nums = backups.map(k => parseInt(k.replace('GEMINI_API_KEY_BACKUP_', '')) || 0);
                                                nextNum = Math.max(...nums) + 1;
                                            }
                                            setSettings({ ...settings, [`GEMINI_API_KEY_BACKUP_${nextNum}`]: '' });
                                        }}
                                        className="w-full py-3 border border-dashed border-[var(--border)] rounded-xl text-sm font-bold text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" /> Add New Backup Key
                                    </button>

                                    {/* Routeway API Section */}
                                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-2xl border border-purple-500/20 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-purple-500" />
                                            <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">Routeway API Key</label>
                                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">70+ MODELS</span>
                                        </div>
                                        <input
                                            type="password"
                                            value={settings.ROUTEWAY_API_KEY || ''}
                                            onChange={(e) => setSettings({ ...settings, ROUTEWAY_API_KEY: e.target.value })}
                                            placeholder="Enter Routeway API Key"
                                            className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                        <input
                                            type="text"
                                            value={settings.ROUTEWAY_API_URL || 'https://api.routeway.ai/v1/chat/completions'}
                                            onChange={(e) => setSettings({ ...settings, ROUTEWAY_API_URL: e.target.value })}
                                            placeholder="https://api.routeway.ai/v1/chat/completions"
                                            className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 font-mono text-xs"
                                        />
                                        <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                            Unified API for 70+ models. Models with :free suffix are free (20 RPM / 200 RPD limit).
                                        </p>
                                    </div>

                                    {/* OpenRouter API Section */}
                                    <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Route className="w-4 h-4 text-orange-500" />
                                            <label className="text-sm font-bold uppercase text-[var(--muted-foreground)]">OpenRouter Configuration</label>
                                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold">SMART ROUTING</span>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">API Key</label>
                                            <input
                                                type="password"
                                                value={settings.OPENROUTER_API_KEY || ''}
                                                onChange={(e) => setSettings({ ...settings, OPENROUTER_API_KEY: e.target.value })}
                                                placeholder="Enter OpenRouter API Key"
                                                className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Worker URL (Cloudflare Proxy)</label>
                                            <input
                                                type="text"
                                                value={settings.OPENROUTER_WORKER_URL || ''}
                                                onChange={(e) => setSettings({ ...settings, OPENROUTER_WORKER_URL: e.target.value })}
                                                placeholder="https://openrouter-proxy.your-subdomain.workers.dev"
                                                className="w-full bg-[var(--background)] border-none rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 font-mono text-xs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase flex items-center gap-1">
                                                    <Zap className="w-3 h-3 text-yellow-500" /> Fast Model
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.OPENROUTER_FAST_MODEL || 'deepseek/deepseek-chat'}
                                                    onChange={(e) => setSettings({ ...settings, OPENROUTER_FAST_MODEL: e.target.value })}
                                                    placeholder="deepseek/deepseek-chat"
                                                    className="w-full bg-[var(--background)] border-none rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-yellow-500/20 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase flex items-center gap-1">
                                                    <Brain className="w-3 h-3 text-purple-500" /> Reasoning Model
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.OPENROUTER_REASONING_MODEL || 'deepseek/deepseek-r1'}
                                                    onChange={(e) => setSettings({ ...settings, OPENROUTER_REASONING_MODEL: e.target.value })}
                                                    placeholder="deepseek/deepseek-r1"
                                                    className="w-full bg-[var(--background)] border-none rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                                                />
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                            Smart routing: 93% запросов → Fast Model, 7% сложных → Reasoning Model. Safety-net автоматически переключает на R1 если нужно.
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
                                            <optgroup label="OpenAI">
                                                <option value="gpt-4o">GPT-4o</option>
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            </optgroup>
                                            <optgroup label="Google">
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                            </optgroup>
                                            <optgroup label="Anthropic">
                                                <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                                                <option value="claude-sonnet-4">Claude Sonnet 4</option>
                                            </optgroup>
                                            <optgroup label="Routeway Free (20 RPM)">
                                                <option value="deepseek-r1:free">DeepSeek R1 (Free)</option>
                                                <option value="deepseek-v3.1:free">DeepSeek V3.1 (Free)</option>
                                                <option value="llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</option>
                                                <option value="mistral-nemo-instruct:free">Mistral Nemo (Free)</option>
                                                <option value="kimi-k2-0905:free">Kimi K2 (Free)</option>
                                                <option value="glm-4.6:free">GLM 4.6 (Free)</option>
                                            </optgroup>
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
                                        <div className="space-y-4">
                                            {/* Current Corpus ID */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Current Corpus ID</label>
                                                <input
                                                    type="text"
                                                    value={settings.GEMINI_CORPUS_ID || ''}
                                                    onChange={(e) => setSettings({ ...settings, GEMINI_CORPUS_ID: e.target.value })}
                                                    className="w-full bg-[var(--background)] border-none rounded-lg py-2 px-3 text-xs font-mono outline-none focus:ring-2 focus:ring-[var(--primary)]/20 shadow-inner"
                                                    placeholder="No Corpus ID configured"
                                                />
                                                <p className="text-[10px] text-[var(--muted-foreground)]">
                                                    This ID must be accessible by the active API Key.
                                                </p>
                                            </div>

                                            {/* Corpus Manager */}
                                            <div className="p-4 bg-[var(--background)]/50 rounded-xl border border-[var(--border)] space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-indigo-500" /> Corpus Manager
                                                    </h3>
                                                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded font-bold">BETA</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <select
                                                        className="bg-[var(--background)] border border-[var(--border)] text-xs p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                        value={selectedKey}
                                                        onChange={(e) => setSelectedKey(e.target.value)}
                                                    >
                                                        <option value="GEMINI_API_KEY">Primary Key</option>
                                                        {Object.keys(settings)
                                                            .filter(key => key.startsWith('GEMINI_API_KEY_BACKUP_'))
                                                            .sort((a, b) => {
                                                                const numA = parseInt(a.replace('GEMINI_API_KEY_BACKUP_', '')) || 0;
                                                                const numB = parseInt(b.replace('GEMINI_API_KEY_BACKUP_', '')) || 0;
                                                                return numA - numB;
                                                            })
                                                            .map(key => (
                                                                <option key={key} value={key}>{key.replace('GEMINI_API_KEY_', '').replace(/_/g, ' ')}</option>
                                                            ))
                                                        }
                                                    </select>

                                                    <button
                                                        onClick={fetchCorpora}
                                                        disabled={loadingCorpora}
                                                        className="bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                                                    >
                                                        {loadingCorpora ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                                                        Fetch Corpora
                                                    </button>
                                                </div>

                                                {corpora.length > 0 && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)]">Available Corpora (Click to Select)</p>
                                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                            {corpora.map((c: any) => (
                                                                <div
                                                                    key={c.name}
                                                                    onClick={() => setSettings({ ...settings, GEMINI_CORPUS_ID: c.name.replace('corpora/', '') })}
                                                                    className={`text-xs p-2.5 rounded-lg cursor-pointer flex justify-between items-center transition-all border border-transparent ${settings.GEMINI_CORPUS_ID === c.name.replace('corpora/', '')
                                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                                                        : 'bg-[var(--background)] hover:bg-indigo-500/5 hover:border-indigo-500/20'
                                                                        }`}
                                                                >
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="font-bold truncate">{c.displayName || 'Untitled'}</span>
                                                                        <span className="font-mono text-[10px] text-[var(--muted-foreground)] opacity-70 truncate">
                                                                            {c.name.replace('corpora/', '')}
                                                                        </span>
                                                                    </div>
                                                                    {settings.GEMINI_CORPUS_ID === c.name.replace('corpora/', '') && (
                                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                                                    <input
                                                        placeholder="New Corpus Name"
                                                        className="flex-1 bg-[var(--background)] border border-[var(--border)] text-xs p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        value={newCorpusName}
                                                        onChange={(e) => setNewCorpusName(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={createCorpus}
                                                        disabled={creatingCorpus || !newCorpusName}
                                                        className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 shadow-md shadow-emerald-500/20"
                                                    >
                                                        {creatingCorpus ? 'Creating...' : 'Create'}
                                                    </button>
                                                </div>
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

