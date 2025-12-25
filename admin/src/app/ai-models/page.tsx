'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    RefreshCw,
    Play,
    Trash2,
    Zap,
    MessageSquare,
    Image as ImageIcon,
    Mic,
    Video,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Activity,
    Star,
    X,
    Sparkles,
    TestTube,
    Database
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const categoryIcons = {
    text: MessageSquare,
    image: ImageIcon,
    audio: Mic,
    video: Video,
};

const categoryLabels = {
    text: 'Текст',
    image: 'Картинки',
    audio: 'Аудио',
    video: 'Видео',
};

export default function AiModelsPage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isBulkTesting, setIsBulkTesting] = useState(false);
    const [isDisablingOffline, setIsDisablingOffline] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [showRecommendations, setShowRecommendations] = useState(false);

    const { data: models, error, mutate } = useSWR(
        `/admin/ai-models?search=${search}&category=${category}`,
        fetcher
    );

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await api.post('/admin/ai-models/sync');
            mutate();
        } catch (err) {
            console.error('Failed to sync models', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleBulkTest = async () => {
        setIsBulkTesting(true);
        try {
            await api.post('/admin/ai-models/bulk-test');
            mutate();
        } catch (err) {
            console.error('Failed to bulk test models', err);
        } finally {
            setIsBulkTesting(false);
        }
    };

    const handleDisableOffline = async () => {
        if (!confirm('Отключить все оффлайн модели?')) return;
        setIsDisablingOffline(true);
        try {
            const res = await api.post('/admin/ai-models/disable-offline');
            alert(`Отключено моделей: ${res.data.disabled}`);
            mutate();
        } catch (err) {
            console.error('Failed to disable offline models', err);
        } finally {
            setIsDisablingOffline(false);
        }
    };

    const handleToggleEnabled = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isEnabled: !currentStatus });
            mutate();
        } catch (err) {
            console.error('Failed to toggle model status', err);
        }
    };

    const handleToggleRecommended = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isRecommended: !currentStatus });
            mutate();
        } catch (err) {
            console.error('Failed to toggle recommendation status', err);
        }
    };

    const handleToggleRagEnabled = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isRagEnabled: !currentStatus });
            mutate();
        } catch (err) {
            console.error('Failed to toggle RAG status', err);
        }
    };

    const handleTestModel = async (id: number) => {
        setTestingId(id);
        try {
            await api.post(`/admin/ai-models/${id}/test`);
            mutate();
        } catch (err) {
            console.error('Failed to test model', err);
        } finally {
            setTestingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту модель из списка?')) return;
        try {
            await api.delete(`/admin/ai-models/${id}`);
            mutate();
        } catch (err) {
            console.error('Failed to delete model', err);
        }
    };

    const handleMarkOld = async (id: number) => {
        try {
            await api.put(`/admin/ai-models/${id}`, { isNew: false });
            mutate();
        } catch (err) {
            console.error('Failed to update model', err);
        }
    };

    // Get recommended models
    const recommendedModels = models?.filter((m: any) => m.isRecommended) || [];

    // Get fast models (online and response time < 3s)
    const fastModels = models?.filter((m: any) =>
        m.lastTestStatus === 'online' && m.lastResponseTime > 0 && m.lastResponseTime < 3000
    ).sort((a: any, b: any) => a.lastResponseTime - b.lastResponseTime).slice(0, 5) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Управление доступными ИИ моделями и мониторинг</p>
                    {models && models.length > 0 && models[0].lastSyncDate && (
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-mono">
                            Последняя синхронизация: {new Date(models[0].lastSyncDate).toLocaleString()}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setShowRecommendations(true)}
                        className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <Sparkles className="w-4 h-4" />
                        Рекомендации
                    </button>
                    <button
                        onClick={handleDisableOffline}
                        disabled={isDisablingOffline}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                        {isDisablingOffline ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Откл. оффлайн
                    </button>
                    <button
                        onClick={handleBulkTest}
                        disabled={isBulkTesting}
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {isBulkTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                        Массовый тест
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Синхронизировать
                    </button>
                </div>
            </div>

            {/* Recommendations Modal */}
            <AnimatePresence>
                {showRecommendations && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowRecommendations(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--card)] rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Рекомендации по моделям</h2>
                                        <p className="text-sm text-[var(--muted-foreground)]">Выберите лучшие модели для ваших пользователей</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRecommendations(false)}
                                    className="p-2 hover:bg-[var(--secondary)] rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Fast Models Section */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Самые быстрые модели
                                </h3>
                                {fastModels.length > 0 ? (
                                    <div className="space-y-2">
                                        {fastModels.map((model: any, idx: number) => (
                                            <div
                                                key={model.ID}
                                                className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-emerald-600">#{idx + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-sm">{model.name}</p>
                                                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{model.provider}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600">{(model.lastResponseTime / 1000).toFixed(2)}s</p>
                                                    <p className="text-[10px] text-[var(--muted-foreground)]">{categoryLabels[model.category as keyof typeof categoryLabels]}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--muted-foreground)] p-4 bg-[var(--secondary)] rounded-xl text-center">
                                        Нет данных. Запустите массовый тест для получения рекомендаций.
                                    </p>
                                )}
                            </div>

                            {/* Recommended Models Section */}
                            <div>
                                <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Star className="w-4 h-4" />
                                    Отмеченные как рекомендуемые ({recommendedModels.length})
                                </h3>
                                {recommendedModels.length > 0 ? (
                                    <div className="space-y-2">
                                        {recommendedModels.map((model: any) => (
                                            <div
                                                key={model.ID}
                                                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                                    <div>
                                                        <p className="font-semibold text-sm">{model.name}</p>
                                                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{model.provider}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${model.isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {model.isEnabled ? 'Активна' : 'Выкл'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleRecommended(model.ID, model.isRecommended)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                        title="Убрать из рекомендуемых"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--muted-foreground)] p-4 bg-[var(--secondary)] rounded-xl text-center">
                                        Нет рекомендуемых моделей. Отметьте модели звёздочкой в таблице.
                                    </p>
                                )}
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>Совет:</strong> Рекомендуемые модели будут отображаться пользователям в первую очередь.
                                    Выбирайте модели с быстрым откликом и стабильной работой.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters Bar */}
            <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Поиск по названию или ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer min-w-[150px]"
                    >
                        <option value="">Все типы</option>
                        <option value="text">Текст</option>
                        <option value="image">Картинки</option>
                        <option value="audio">Аудио</option>
                        <option value="video">Видео</option>
                    </select>
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Ошибка загрузки моделей</p>
                    <button onClick={() => mutate()} className="mt-4 text-sm underline">Попробовать снова</button>
                </div>
            ) : !models ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Модель</th>
                                    <th className="px-6 py-4 font-semibold">Тип</th>
                                    <th className="px-6 py-4 font-semibold">Статус</th>
                                    <th className="px-6 py-4 font-semibold">Рек.</th>
                                    <th className="px-6 py-4 font-semibold">RAG</th>
                                    <th className="px-6 py-4 font-semibold">Мониторинг</th>
                                    <th className="px-6 py-4 font-semibold text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                <AnimatePresence>
                                    {models.map((model: any) => {
                                        const Icon = categoryIcons[model.category as keyof typeof categoryIcons] || MessageSquare;
                                        return (
                                            <motion.tr
                                                key={model.ID}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-[var(--secondary)]/50 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 bg-[var(--secondary)] rounded-xl flex items-center justify-center text-[var(--primary)] border border-[var(--border)]">
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            {model.isNew && (
                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); handleMarkOld(model.ID); }}
                                                                    className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border-2 border-[var(--card)] cursor-pointer hover:scale-110 transition-transform"
                                                                    title="Новая модель! Нажмите, чтобы убрать пометку"
                                                                >
                                                                    <Zap className="w-2.5 h-2.5 fill-current" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{model.name}</p>
                                                            <p className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase">{model.provider}</p>
                                                            {model.isNew && <span className="text-[9px] text-amber-600 font-bold uppercase tracking-tighter bg-amber-50 px-1 rounded">New</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium px-2.5 py-1 bg-[var(--secondary)] rounded-full border border-[var(--border)]">
                                                        {categoryLabels[model.category as keyof typeof categoryLabels] || model.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleEnabled(model.ID, model.isEnabled)}
                                                            className={`relative w-10 h-5 rounded-full transition-colors ${model.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                        >
                                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${model.isEnabled ? 'right-1' : 'left-1'}`} />
                                                        </button>
                                                        <span className={`text-xs font-semibold ${model.isEnabled ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}`}>
                                                            {model.isEnabled ? 'Активна' : 'Выкл'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleToggleRecommended(model.ID, model.isRecommended)}
                                                        className={`p-2 rounded-lg transition-all ${model.isRecommended ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                                        title={model.isRecommended ? 'Убрать из рекомендуемых' : 'Добавить в рекомендуемые'}
                                                    >
                                                        <Star className={`w-5 h-5 ${model.isRecommended ? 'fill-amber-500' : ''}`} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleToggleRagEnabled(model.ID, model.isRagEnabled)}
                                                        className={`p-2 rounded-lg transition-all ${model.isRagEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                                        title={model.isRagEnabled ? 'Отключить RAG' : 'Включить RAG'}
                                                    >
                                                        <Database className={`w-5 h-5 ${model.isRagEnabled ? 'fill-blue-500' : ''}`} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            {model.lastTestStatus === 'online' ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                            ) : model.lastTestStatus === 'offline' ? (
                                                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                                                            ) : (
                                                                <Activity className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                                                            )}
                                                            <span className="text-xs font-medium">
                                                                {model.lastTestStatus === 'online' ? 'Доступна' :
                                                                    model.lastTestStatus === 'offline' ? 'Оффлайн' :
                                                                        model.lastTestStatus === 'error' ? 'Ошибка' : 'Нет данных'}
                                                            </span>
                                                        </div>
                                                        {model.lastResponseTime > 0 && (
                                                            <p className="text-[10px] text-[var(--muted-foreground)]">
                                                                Задержка: <span className={model.lastResponseTime < 2000 ? 'text-emerald-500' : 'text-amber-500'}>
                                                                    {(model.lastResponseTime / 1000).toFixed(2)}s
                                                                </span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleTestModel(model.ID)}
                                                            disabled={testingId === model.ID}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Протестировать скорость"
                                                        >
                                                            {testingId === model.ID ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Play className="w-4 h-4 fill-current" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(model.ID)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Удалить из списка"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                    {models.length === 0 && (
                        <div className="p-12 text-center text-[var(--muted-foreground)]">
                            Модели не найдены. Попробуйте синхронизировать с API.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
