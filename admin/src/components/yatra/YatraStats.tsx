'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth';

interface Stats {
    totalYatras: number;
    draftYatras: number;
    openYatras: number;
    activeYatras: number;
    completedYatras: number;
    cancelledYatras: number;
    pendingReports: number;
}

export function YatraStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Требуется авторизация. Пожалуйста, войдите в систему.');
                setLoading(false);
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите заново.');
                return;
            }

            if (response.status === 403) {
                setError('Недостаточно прав. Требуется роль администратора.');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
            }

            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-12"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <div className="flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <span>{error}</span>
                    {error.includes('авторизация') || error.includes('Сессия') ? (
                        <a href="/login" className="ml-auto text-red-600 hover:underline font-medium">
                            Войти →
                        </a>
                    ) : (
                        <button onClick={fetchStats} className="ml-auto text-red-600 hover:underline font-medium">
                            Повторить
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const statCards = [
        { label: 'Total Yatras', value: stats.totalYatras, color: 'blue' },
        { label: 'Draft', value: stats.draftYatras, color: 'gray' },
        { label: 'Open', value: stats.openYatras, color: 'green' },
        { label: 'Active', value: stats.activeYatras, color: 'blue' },
        { label: 'Completed', value: stats.completedYatras, color: 'purple' },
        { label: 'Cancelled', value: stats.cancelledYatras, color: 'red' },
        { label: '⚠️ Pending Reports', value: stats.pendingReports, color: 'red' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {statCards.map((stat) => (
                <div key={stat.label} className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">{stat.label}</div>
                    <div className={`text-2xl font-bold mt-1 text-${stat.color}-600`}>
                        {stat.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
