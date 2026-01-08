'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface KeyStatus {
    index: number;
    keyPrefix: string;
    keyName: string;
    status: string;
    statusCode: number;
    message: string;
    testedAt: string;
    usagePercent: number;
    resetInMinutes: number;
    resetTime: string;
    isUsable: boolean;
}

interface KeysResponse {
    keys: KeyStatus[];
    totalKeys: number;
    working: number;
    leaked: number;
    invalid: number;
    rateLimited: number;
    usableCount: number;
    baseURL: string;
    resetInMinutes: number;
    resetTimeFormatted: string;
    resetTimeUTC: string;
}

export default function GeminiKeysPage() {
    const [data, setData] = useState<KeysResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchKeys = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/admin/ai-models/gemini-keys');
            setData(res.data);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'working':
                return 'bg-green-500';
            case 'rate_limited':
                return 'bg-yellow-500';
            case 'leaked':
                return 'bg-red-500';
            case 'invalid':
                return 'bg-gray-500';
            default:
                return 'bg-gray-400';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'working':
                return 'Работает ✓';
            case 'rate_limited':
                return 'Лимит ⏳';
            case 'leaked':
                return 'Скомпром. ✗';
            case 'invalid':
                return 'Недейств. ✗';
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">🔑 Мониторинг Gemini API Ключей</h1>
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-32 bg-gray-700 rounded mb-4"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">🔑 Мониторинг Gemini API Ключей</h1>
                <div className="bg-red-900/50 text-red-200 p-4 rounded-lg">
                    Ошибка: {error}
                </div>
                <button
                    onClick={fetchKeys}
                    className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Повторить
                </button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">🔑 Мониторинг Gemini API Ключей</h1>
                <div className="flex gap-2">
                    <Link
                        href="/ai-models"
                        className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                    >
                        ← AI Модели
                    </Link>
                    <button
                        onClick={fetchKeys}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                        🔄 Обновить
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold">{data.totalKeys}</div>
                    <div className="text-gray-400 text-sm">Всего ключей</div>
                </div>
                <div className="bg-green-900/50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-400">{data.working}</div>
                    <div className="text-gray-400 text-sm">Работающих</div>
                </div>
                <div className="bg-yellow-900/50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-yellow-400">{data.rateLimited}</div>
                    <div className="text-gray-400 text-sm">Превышен лимит</div>
                </div>
                <div className="bg-red-900/50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-red-400">{data.leaked}</div>
                    <div className="text-gray-400 text-sm">Скомпром.</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-gray-400">{data.invalid}</div>
                    <div className="text-gray-400 text-sm">Недейств.</div>
                </div>
            </div>

            {/* Reset Timer */}
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-semibold">⏱️ Сброс квот</div>
                        <div className="text-gray-400 text-sm">Лимиты обновляются в полночь по PST (Тихоокеанское время)</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">{data.resetTimeFormatted}</div>
                        <div className="text-gray-400 text-sm">до сброса</div>
                    </div>
                </div>
            </div>

            {/* Proxy URL */}
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <div className="text-sm text-gray-400 mb-1">Base URL (прокси):</div>
                <code className="text-green-400 break-all">{data.baseURL}</code>
            </div>

            {/* Keys List */}
            <div className="space-y-3">
                {data.keys.map((key) => (
                    <div
                        key={key.index}
                        className={`bg-gray-800 p-4 rounded-lg border-l-4 ${key.isUsable ? 'border-green-500' : 'border-gray-600'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 text-sm">#{key.index}</span>
                                <span className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">
                                    {key.keyName}
                                </span>
                                <span className="font-mono text-xs text-gray-500">
                                    {key.keyPrefix}
                                </span>
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                    key.status
                                )}`}
                            >
                                {getStatusBadge(key.status)}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Использование</span>
                                <span>{key.usagePercent}%</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${key.usagePercent >= 100
                                        ? 'bg-red-500'
                                        : key.usagePercent >= 80
                                            ? 'bg-yellow-500'
                                            : 'bg-green-500'
                                        }`}
                                    style={{ width: `${Math.min(key.usagePercent, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="text-sm text-gray-400">{key.message}</div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Легенда статусов:</div>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Работает</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Превышен лимит (ждите сброса)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Скомпрометирован (требует замены)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span>Недействителен</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
