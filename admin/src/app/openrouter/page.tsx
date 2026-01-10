'use client';

import { useState, useEffect } from 'react';
import { useOpenRouter } from '@/hooks/useOpenRouter';
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
    Copy
} from 'lucide-react';

export default function OpenRouterPage() {
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
    } = useOpenRouter();

    const [workerUrl, setWorkerUrl] = useState('');
    const [fastModel, setFastModel] = useState('');
    const [reasoningModel, setReasoningModel] = useState('');
    const [testQuery, setTestQuery] = useState('');
    const [activeTab, setActiveTab] = useState('settings');

    useEffect(() => {
        if (status?.workerUrl) setWorkerUrl(status.workerUrl);
        if (status?.models?.fast) setFastModel(status.models.fast);
        if (status?.models?.reasoning) setReasoningModel(status.models.reasoning);
    }, [status]);

    const handleSaveSettings = async () => {
        await updateSettings({
            workerUrl: workerUrl || undefined,
            fastModel: fastModel || undefined,
            reasoningModel: reasoningModel || undefined,
        });
    };

    const handleTestRouting = async () => {
        if (!testQuery.trim()) return;
        await testSmartRouting(testQuery);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">OpenRouter</h1>
                    <p className="text-[var(--muted-foreground)]">
                        Умный роутинг между быстрой и думающей моделями
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
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${status?.health?.hasApiKey
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                {status?.health?.hasApiKey ? 'Настроен' : 'Не настроен'}
                            </span>
                        </div>

                        <div>
                            <span className="text-sm text-[var(--muted-foreground)]">Версия:</span>
                            <span className="ml-2">{status?.health?.version || 'N/A'}</span>
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
                        {tab === 'models' && `Модели (${modelsCount})`}
                        {tab === 'routing' && 'Тест роутинга'}
                    </button>
                ))}
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                        <h3 className="text-lg font-semibold mb-2">Worker URL</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mb-4">
                            URL вашего Cloudflare Worker для проксирования запросов
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="https://openrouter-proxy.your-subdomain.workers.dev"
                                value={workerUrl}
                                onChange={(e) => setWorkerUrl(e.target.value)}
                                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono text-sm"
                            />
                            <button
                                onClick={() => copyToClipboard(workerUrl)}
                                className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--secondary)]"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
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
                                placeholder="deepseek/deepseek-chat"
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
                                        {m.name}
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
                                        {m.name}
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
                    <h3 className="text-lg font-semibold mb-2">Доступные модели OpenRouter</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                        {modelsCount} моделей доступно через OpenRouter API
                    </p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {models?.slice(0, 50).map((model: any) => (
                            <div
                                key={model.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]"
                            >
                                <div>
                                    <span className="font-mono text-sm">{model.id}</span>
                                    {model.context_length && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[var(--secondary)]">
                                            {(model.context_length / 1000).toFixed(0)}k ctx
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
                <h3 className="text-lg font-semibold mb-4">Как это работает</h3>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">1️⃣</div>
                        <h4 className="font-medium">Быстрый фильтр</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Эвристики определяют тип запроса за 0мс
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">2️⃣</div>
                        <h4 className="font-medium">Роутинг</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            93% → быстрая, 7% → думающая модель
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--secondary)]">
                        <div className="text-2xl mb-2">3️⃣</div>
                        <h4 className="font-medium">Safety-net</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Переотправка на R1 если нужно подумать
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <a
                    href="https://openrouter.ai/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Документация OpenRouter
                </a>
            </div>
        </div>
    );
}
