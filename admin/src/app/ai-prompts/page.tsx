'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Loader2,
    AlertCircle,
    X,
    Save,
    Globe,
    Users,
    Sparkles
} from 'lucide-react';
import api from '@/lib/api';

interface AIPrompt {
    ID: number;
    name: string;
    content: string;
    scope: string;
    scopeValue: string;
    priority: number;
    isActive: boolean;
    description: string;
    CreatedAt: string;
    UpdatedAt: string;
}

interface ScopeOption {
    value: string;
    label: string;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

const scopeIcons: Record<string, React.ReactNode> = {
    global: <Globe className="w-4 h-4" />,
    sampradaya: <Sparkles className="w-4 h-4" />,
    identity: <Users className="w-4 h-4" />,
    diet: <Sparkles className="w-4 h-4" />,
    guna: <Sparkles className="w-4 h-4" />,
    yogaStyle: <Sparkles className="w-4 h-4" />,
};

const scopeColors: Record<string, string> = {
    global: 'bg-blue-100 text-blue-700 border-blue-200',
    sampradaya: 'bg-purple-100 text-purple-700 border-purple-200',
    identity: 'bg-green-100 text-green-700 border-green-200',
    diet: 'bg-orange-100 text-orange-700 border-orange-200',
    guna: 'bg-pink-100 text-pink-700 border-pink-200',
    yogaStyle: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export default function AIPromptsPage() {
    const [search, setSearch] = useState('');
    const [scopeFilter, setScopeFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const { data: prompts, error, mutate } = useSWR<AIPrompt[]>(
        `/admin/prompts?search=${search}&scope=${scopeFilter}`,
        fetcher
    );

    const { data: options } = useSWR<{ scopes: ScopeOption[], sampradayas: string[] }>(
        '/admin/prompts/options',
        fetcher
    );

    const [formData, setFormData] = useState({
        name: '',
        content: '',
        scope: 'global',
        scopeValue: '',
        priority: 0,
        isActive: true,
        description: '',
    });

    useEffect(() => {
        if (editingPrompt) {
            setFormData({
                name: editingPrompt.name,
                content: editingPrompt.content,
                scope: editingPrompt.scope,
                scopeValue: editingPrompt.scopeValue,
                priority: editingPrompt.priority,
                isActive: editingPrompt.isActive,
                description: editingPrompt.description,
            });
        } else {
            setFormData({
                name: '',
                content: '',
                scope: 'global',
                scopeValue: '',
                priority: 0,
                isActive: true,
                description: '',
            });
        }
    }, [editingPrompt]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(-1);

        try {
            if (editingPrompt) {
                await api.put(`/admin/prompts/${editingPrompt.ID}`, formData);
            } else {
                await api.post('/admin/prompts', formData);
            }
            mutate();
            setShowModal(false);
            setEditingPrompt(null);
        } catch (err) {
            console.error('Failed to save prompt', err);
            alert('Ошибка сохранения промта');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggle = async (promptId: number) => {
        setActionLoading(promptId);
        try {
            await api.post(`/admin/prompts/${promptId}/toggle`);
            mutate();
        } catch (err) {
            console.error('Failed to toggle prompt', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (promptId: number) => {
        if (!confirm('Удалить этот промпт?')) return;

        setActionLoading(promptId);
        try {
            await api.delete(`/admin/prompts/${promptId}`);
            mutate();
        } catch (err) {
            console.error('Failed to delete prompt', err);
        } finally {
            setActionLoading(null);
        }
    };

    const openCreateModal = () => {
        setEditingPrompt(null);
        setShowModal(true);
    };

    const openEditModal = (prompt: AIPrompt) => {
        setEditingPrompt(prompt);
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Prompts</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">
                        Управление системными промтами для персонализации ИИ
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm font-semibold border border-[var(--primary)]/20">
                        {prompts?.length || 0} промтов
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Добавить
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Поиск по названию..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    />
                </div>
                <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                >
                    <option value="">Все области</option>
                    {options?.scopes?.map((scope) => (
                        <option key={scope.value} value={scope.value}>
                            {scope.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Prompts List */}
            {error ? (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Ошибка загрузки промтов</p>
                    <button onClick={() => mutate()} className="mt-4 text-sm underline">
                        Повторить
                    </button>
                </div>
            ) : !prompts ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {prompts.map((prompt) => (
                            <motion.div
                                key={prompt.ID}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-lg truncate">
                                                {prompt.name}
                                            </h3>
                                            <span
                                                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border ${scopeColors[prompt.scope] || scopeColors.global
                                                    }`}
                                            >
                                                {scopeIcons[prompt.scope]}
                                                {prompt.scope}
                                                {prompt.scopeValue && `: ${prompt.scopeValue}`}
                                            </span>
                                            <span className="text-xs text-[var(--muted-foreground)]">
                                                Приоритет: {prompt.priority}
                                            </span>
                                        </div>
                                        {prompt.description && (
                                            <p className="text-sm text-[var(--muted-foreground)] mb-2">
                                                {prompt.description}
                                            </p>
                                        )}
                                        <div className="bg-[var(--secondary)] rounded-xl p-3 mt-2">
                                            <p className="text-sm whitespace-pre-wrap line-clamp-3">
                                                {prompt.content}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleToggle(prompt.ID)}
                                            disabled={actionLoading === prompt.ID}
                                            className={`p-2 rounded-lg transition-all ${prompt.isActive
                                                ? 'text-emerald-500 hover:bg-emerald-50'
                                                : 'text-gray-400 hover:bg-gray-50'
                                                }`}
                                            title={prompt.isActive ? 'Отключить' : 'Включить'}
                                        >
                                            {actionLoading === prompt.ID ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : prompt.isActive ? (
                                                <ToggleRight className="w-5 h-5" />
                                            ) : (
                                                <ToggleLeft className="w-5 h-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(prompt)}
                                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-all"
                                            title="Редактировать"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(prompt.ID)}
                                            disabled={actionLoading === prompt.ID}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                            title="Удалить"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {prompts.length === 0 && (
                        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>Нет промтов. Создайте первый!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-[var(--card)] rounded-3xl shadow-2xl z-50 flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                                <h2 className="text-xl font-bold">
                                    {editingPrompt ? 'Редактировать промт' : 'Новый промт'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-[var(--secondary)] rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Название *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="Например: Гаудия Вайшнавизм"
                                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Область применения</label>
                                        <select
                                            value={formData.scope}
                                            onChange={(e) => setFormData({ ...formData, scope: e.target.value, scopeValue: '' })}
                                            className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                                        >
                                            {options?.scopes?.map((scope) => (
                                                <option key={scope.value} value={scope.value}>
                                                    {scope.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.scope !== 'global' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Значение</label>
                                            {formData.scope === 'sampradaya' ? (
                                                <select
                                                    value={formData.scopeValue}
                                                    onChange={(e) => setFormData({ ...formData, scopeValue: e.target.value })}
                                                    className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer"
                                                >
                                                    <option value="">Выберите сампрадаю</option>
                                                    {options?.sampradayas?.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={formData.scopeValue}
                                                    onChange={(e) => setFormData({ ...formData, scopeValue: e.target.value })}
                                                    placeholder="Значение для фильтрации"
                                                    className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Приоритет</label>
                                        <input
                                            type="number"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                                        />
                                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                            Чем выше, тем раньше применяется
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 pt-7">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-4 h-4 rounded"
                                            />
                                            <span className="text-sm font-medium">Активен</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Описание (для админа)</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Краткое описание назначения промта"
                                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Текст промта *</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        required
                                        rows={6}
                                        placeholder="Ты — VedicAI, духовный помощник. Отвечай на вопросы о ведической философии..."
                                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none resize-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-[var(--secondary)] transition-all"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading === -1}
                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {actionLoading === -1 ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {editingPrompt ? 'Сохранить' : 'Создать'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
