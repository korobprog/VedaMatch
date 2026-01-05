import {
    CalendarClock,
    Wand2,
    Sparkles,
    XCircle,
    TestTube,
    RefreshCw,
    Loader2,
    Search
} from 'lucide-react';
import React from 'react';

interface AiModelsToolbarProps {
    search: string;
    setSearch: (val: string) => void;
    category: string;
    setCategory: (val: string) => void;
    lastSyncDate?: string;
    onShowSchedule: () => void;
    onAutoOptimize: () => void;
    isOptimizing: boolean;
    onShowRecommendations: () => void;
    onDisableOffline: () => void;
    isDisablingOffline: boolean;
    onBulkTest: () => void;
    isBulkTesting: boolean;
    onSync: () => void;
    isSyncing: boolean;
}

export const AiModelsToolbar: React.FC<AiModelsToolbarProps> = ({
    search,
    setSearch,
    category,
    setCategory,
    lastSyncDate,
    onShowSchedule,
    onAutoOptimize,
    isOptimizing,
    onShowRecommendations,
    onDisableOffline,
    isDisablingOffline,
    onBulkTest,
    isBulkTesting,
    onSync,
    isSyncing,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Управление доступными ИИ моделями и мониторинг</p>
                    {lastSyncDate && (
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-mono">
                            Последняя синхронизация: {new Date(lastSyncDate).toLocaleString()}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={onShowSchedule}
                        className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20"
                        title="Настройки планировщика"
                    >
                        <CalendarClock className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onAutoOptimize}
                        disabled={isOptimizing}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
                    >
                        {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        Auto-Magic
                    </button>
                    <button
                        onClick={onShowRecommendations}
                        className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <Sparkles className="w-4 h-4" />
                        Рекомендации
                    </button>
                    <button
                        onClick={onDisableOffline}
                        disabled={isDisablingOffline}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                        {isDisablingOffline ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Откл. оффлайн
                    </button>
                    <button
                        onClick={onBulkTest}
                        disabled={isBulkTesting}
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {isBulkTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                        Массовый тест
                    </button>
                    <button
                        onClick={onSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50"
                        title="Синхронизировать"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                </div>
            </div>

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
        </div>
    );
};
