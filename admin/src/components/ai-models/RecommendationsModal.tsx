import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap, Star } from 'lucide-react';
import React from 'react';

interface Model {
    ID: number;
    model_id: string;
    name: string;
    provider: string;
    category: string;
    isEnabled: boolean;
    isRecommended: boolean;
    lastResponseTime: number;
    lastTestStatus: string;
}

interface RecommendationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    models: Model[]; // Using any[] for now as types might be loose, but ideally strictly typed.
    onToggleRecommended: (id: number, status: boolean) => void;
    categoryLabels: Record<string, string>;
}

export const RecommendationsModal: React.FC<RecommendationsModalProps> = ({
    isOpen,
    onClose,
    models,
    onToggleRecommended,
    categoryLabels,
}) => {
    // Get recommended models
    const recommendedModels = models.filter((m) => m.isRecommended) || [];

    // Get fast models (online and response time < 3s)
    const fastModels = models.filter((m) =>
        m.lastTestStatus === 'online' && m.lastResponseTime > 0 && m.lastResponseTime < 3000
    ).sort((a, b) => a.lastResponseTime - b.lastResponseTime).slice(0, 5) || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
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
                                onClick={onClose}
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
                                    {fastModels.map((model, idx) => (
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
                                                <p className="text-[10px] text-[var(--muted-foreground)]">{categoryLabels[model.category] || model.category}</p>
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
                                    {recommendedModels.map((model) => (
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
                                                    onClick={() => onToggleRecommended(model.ID, model.isRecommended)}
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
    );
};
