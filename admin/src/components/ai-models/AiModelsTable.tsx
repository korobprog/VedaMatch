import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    ImageIcon,
    Mic,
    Video,
    Zap,
    Wand2,
    Star,
    Database,
    CheckCircle2,
    XCircle,
    Activity,
    Play,
    Loader2,
    Trash2
} from 'lucide-react';
import React from 'react';

// Reusing interfaces - in a real app these should be in a types file
export interface Model {
    ID: number;
    model_id: string;
    name: string;
    provider: string;
    category: string;
    isEnabled: boolean;
    isNew: boolean;
    isRecommended: boolean;
    isRagEnabled: boolean;
    isAutoRoutingEnabled: boolean;
    lastTestStatus: string;
    lastResponseTime: number;
    lastSyncDate?: string;
}

interface AiModelsTableProps {
    models: Model[];
    isLoading: boolean;
    error: any;
    onRetry: () => void;
    onToggleEnabled: (id: number, status: boolean) => void;
    onToggleAutoMagic: (id: number) => void;
    onToggleRecommended: (id: number, status: boolean) => void;
    onToggleRagEnabled: (id: number, status: boolean) => void;
    onTestModel: (id: number) => void;
    onDelete: (id: number) => void;
    onMarkOld: (id: number) => void;
    testingId: number | null;
    categoryLabels: Record<string, string>;
}

const categoryIcons: any = {
    text: MessageSquare,
    image: ImageIcon,
    audio: Mic,
    video: Video,
};

export const AiModelsTable: React.FC<AiModelsTableProps> = ({
    models,
    isLoading,
    error,
    onRetry,
    onToggleEnabled,
    onToggleAutoMagic,
    onToggleRecommended,
    onToggleRagEnabled,
    onTestModel,
    onDelete,
    onMarkOld,
    testingId,
    categoryLabels
}) => {
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500">
                <XCircle className="w-12 h-12 mb-4" />
                <p className="font-semibold">Ошибка загрузки моделей</p>
                <button onClick={onRetry} className="mt-4 text-sm underline">Попробовать снова</button>
            </div>
        );
    }

    if (!models && isLoading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Модель</th>
                            <th className="px-6 py-4 font-semibold">Тип</th>
                            <th className="px-6 py-4 font-semibold">Статус</th>
                            <th className="px-6 py-4 font-semibold">Auto</th>
                            <th className="px-6 py-4 font-semibold">Рек.</th>
                            <th className="px-6 py-4 font-semibold">RAG</th>
                            <th className="px-6 py-4 font-semibold">Мониторинг</th>
                            <th className="px-6 py-4 font-semibold text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        <AnimatePresence>
                            {(models || []).map((model) => {
                                const Icon = categoryIcons[model.category] || MessageSquare;
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
                                                            onClick={(e) => { e.stopPropagation(); onMarkOld(model.ID); }}
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
                                                {categoryLabels[model.category] || model.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onToggleEnabled(model.ID, model.isEnabled)}
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
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => onToggleAutoMagic(model.ID)}
                                                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${model.isAutoRoutingEnabled
                                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200'
                                                        : 'bg-[var(--secondary)] text-[var(--muted-foreground)] opacity-30 hover:opacity-100 hover:text-purple-500 hover:bg-purple-50'
                                                        }`}
                                                    title={model.isAutoRoutingEnabled ? "Auto-Magic Включен (Нажмите чтобы выключить)" : "Auto-Magic Выключен (Нажмите чтобы включить)"}
                                                >
                                                    <Wand2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => onToggleRecommended(model.ID, model.isRecommended)}
                                                className={`p-2 rounded-lg transition-all ${model.isRecommended ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                                title={model.isRecommended ? 'Убрать из рекомендуемых' : 'Добавить в рекомендуемые'}
                                            >
                                                <Star className={`w-5 h-5 ${model.isRecommended ? 'fill-amber-500' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => onToggleRagEnabled(model.ID, model.isRagEnabled)}
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
                                                    onClick={() => onTestModel(model.ID)}
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
                                                    onClick={() => onDelete(model.ID)}
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
            {(!models || models.length === 0) && !isLoading && !error && (
                <div className="p-12 text-center text-[var(--muted-foreground)]">
                    Модели не найдены. Попробуйте синхронизировать с API.
                </div>
            )}
        </div>
    );
};
