'use client';

import { useState, useEffect } from 'react';
import { usePolza } from '@/hooks/usePolza';
import {
    Settings,
    Zap,
    Brain,
    RefreshCw,
    Play,
    CheckCircle,
    XCircle,
    Loader2,
    ExternalLink,
    Key,
    Eye,
    EyeOff
} from 'lucide-react';

export default function PolzaPage() {
    const {
        status,
        statusLoading,
        models,
        modelsCount,
        recommendations,
        isTesting,
        isUpdating,
        testResult,
        updateSettings,
        testConnection,
        testSmartRouting,
        refresh
    } = usePolza();

    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [fastModel, setFastModel] = useState('');
    const [reasoningModel, setReasoningModel] = useState('');
    const [testQuery, setTestQuery] = useState('');
    const [activeTab, setActiveTab] = useState('settings');

    useEffect(() => {
        if (status?.models?.fast) setFastModel(status.models.fast);
        if (status?.models?.reasoning) setReasoningModel(status.models.reasoning);
    }, [status]);

    const handleSaveSettings = async () => {
        await updateSettings({
            apiKey: apiKey || undefined,
            fastModel: fastModel || undefined,
            reasoningModel: reasoningModel || undefined,
        });
        setApiKey(''); // Clear after save
    };

    const handleTestRouting = async () => {
        if (!testQuery.trim()) return;
        await testSmartRouting(testQuery);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Polza AI</h1>
                    <p className="text-[var(--muted-foreground)]">
                        400+ моделей в одном API • Оплата в рублях
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--secondary)]"
                >
                    <RefreshCw className="w-4 h-4" />
                    Обновить
                </button>
            </div>

            {/* Status Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5" />
                    Статус подключения
                </h2>
                {statusLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Загрузка...
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-2">
                            {status?.status === 'online' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="font-medium">
                                {status?.status === 'online' ? 'Подключено' : 'Не подключено'}
                            </span>
                        </div>

                        <div>
                            <span className="text-sm text-[var(--muted-foreground)]">API Key:</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${status?.configured
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                {status?.configured ? 'Настроен' : 'Не настроен'}
                            </span>
                        </div>

                        <div>
                            <span className="text-sm text-[var(--muted-foreground)]">Моделей:</span>
                            <span className="ml-2 font-medium">{modelsCount || '400+'}</span>
                        </div>

                        <button
                            onClick={() => testConnection()}
                            disabled={isTesting}
                            className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--secondary)] disabled:opacity-50"
                        >
                            {isTesting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Проверить
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[var(--border)]">
                {['settings', 'models', 'routing'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === tab
                            ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        {tab === 'settings' && 'Настройки'}
                        {tab === 'models' && `Модели (${(!isNaN(Number(modelsCount)) && modelsCount !== null) ? modelsCount : '400+'})`}
                        {tab === 'routing' && 'Тест роутинга'}
                    </button>
                ))}
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    {/* API Key Input */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                            <Key className="w-5 h-5 text-yellow-500" />
                            API Ключ Polza.ai
                        </h3>
                        <p className="text-sm text-[var(--muted-foreground)] mb-4">
                            Получите ключ на <a href="https://polza.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">polza.ai</a>
                        </p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    placeholder="sk-polza-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    autoComplete="off"
                                    suppressHydrationWarning
                                    className="w-full px-3 py-2 pr-10 border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--secondary)] rounded"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        {status?.configured && (
                            <p className="text-sm text-green-600 mt-2">
                                ✓ API ключ уже настроен. Введите новый чтобы заменить.
                            </p>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                Быстрая модель
                            </h3>
                            <p className="text-sm text-[var(--muted-foreground)] mb-4">
                                Для простых вопросов (~93% запросов)
                            </p>
                            <input
                                type="text"
                                placeholder="gpt-4o-mini"
                                value={fastModel}
                                onChange={(e) => setFastModel(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono text-sm mb-2"
                            />
                            <div className="text-sm text-[var(--muted-foreground)]">
                                Рекомендовано:
                                {recommendations?.find((r: any) => r.category === 'fast')?.models?.map((m: any) => (
                                    <button
                                        key={m.id}
                                        className="ml-1 px-2 py-1 rounded hover:bg-[var(--secondary)] text-xs"
                                        onClick={() => setFastModel(m.id)}
                                    >
                                        {m.name} ({m.price})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                                <Brain className="w-5 h-5 text-purple-500" />
                                Думающая модель
                            </h3>
                            <p className="text-sm text-[var(--muted-foreground)] mb-4">
                                Для сложных задач (~7% запросов)
                            </p>
                            <input
                                type="text"
                                placeholder="deepseek/deepseek-r1"
                                value={reasoningModel}
                                onChange={(e) => setReasoningModel(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono text-sm mb-2"
                            />
                            <div className="text-sm text-[var(--muted-foreground)]">
                                Рекомендовано:
                                {recommendations?.find((r: any) => r.category === 'reasoning')?.models?.map((m: any) => (
                                    <button
                                        key={m.id}
                                        className="ml-1 px-2 py-1 rounded hover:bg-[var(--secondary)] text-xs"
                                        onClick={() => setReasoningModel(m.id)}
                                    >
                                        {m.name} ({m.price})
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        disabled={isUpdating}
                        className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                        Сохранить настройки
                    </button>
                </div>
            )}

            {/* Models Tab */}
            {activeTab === 'models' && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                    <h3 className="text-lg font-semibold mb-2">Доступные модели Polza.ai</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                        {modelsCount || '400+'} моделей доступно через Polza API
                    </p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {models?.slice(0, 50).map((model: any) => (
                            <div
                                key={model.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                            >
                                <div>
                                    <span className="font-mono text-sm">{model.id}</span>
                                    {model.owned_by && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[var(--secondary)]">
                                            {model.owned_by}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="p-1 hover:bg-[var(--secondary)] rounded"
                                        onClick={() => setFastModel(model.id)}
                                        title="Установить как быструю модель"
                                    >
                                        <Zap className="w-4 h-4 text-yellow-500" />
                                    </button>
                                    <button
                                        className="p-1 hover:bg-[var(--secondary)] rounded"
                                        onClick={() => setReasoningModel(model.id)}
                                        title="Установить как думающую модель"
                                    >
                                        <Brain className="w-4 h-4 text-purple-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Routing Test Tab */}
            {activeTab === 'routing' && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                    <h3 className="text-lg font-semibold mb-2">Тест умного роутинга</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                        Проверьте, как система классифицирует запросы
                    </p>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="Введите тестовый запрос..."
                            value={testQuery}
                            onChange={(e) => setTestQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTestRouting()}
                            className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                        />
                        <button
                            onClick={handleTestRouting}
                            disabled={isTesting || !testQuery.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50"
                        >
                            {isTesting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Тест
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                            <h4 className="font-medium mb-2">→ Быстрая модель (простые):</h4>
                            <ul className="list-disc list-inside text-[var(--muted-foreground)]">
                                <li>Привет, как дела?</li>
                                <li>Какая сегодня погода?</li>
                                <li>Короткие вопросы</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">→ Думающая модель (сложные):</h4>
                            <ul className="list-disc list-inside text-[var(--muted-foreground)]">
                                <li>Докажи теорему Пифагора</li>
                                <li>Напиши код функции сортировки</li>
                                <li>Длинные запросы (300+ символов)</li>
                            </ul>
                        </div>
                    </div>

                    {testResult && (
                        <div className="p-4 rounded-lg bg-[var(--secondary)]">
                            <h4 className="font-medium mb-2">Результат:</h4>
                            <p className="text-sm whitespace-pre-wrap">{testResult.response}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Info Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                <h3 className="text-lg font-semibold mb-4">Преимущества Polza.ai</h3>
                <div className="grid md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">💰</div>
                        <h4 className="font-medium">Оплата в ₽</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Без комиссий и конвертации
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">🚀</div>
                        <h4 className="font-medium">400+ моделей</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Один API для всех
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">🔄</div>
                        <h4 className="font-medium">Кэширование</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Экономия до 90%
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">🇷🇺</div>
                        <h4 className="font-medium">Без VPN</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Работает в РФ
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <a
                    href="https://docs.polza.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Документация Polza.ai
                </a>
            </div>
        </div>
    );
}
