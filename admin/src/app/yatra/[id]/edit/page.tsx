'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/lib/auth';

interface Yatra {
    id: number;
    title: string;
    description: string;
    theme: string;
    status: string;
    startDate: string;
    endDate: string;
    startCity: string;
    endCity: string;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number;
    endLongitude: number;
    maxParticipants: number;
    language: string;
    difficulty: string;
    requirements?: string;
    cost?: number;
    currency?: string;
}

const THEMES = [
    { value: 'pilgrimage', label: '🙏 Паломничество' },
    { value: 'meditation', label: '🧘 Медитация' },
    { value: 'yoga', label: '🧘‍♀️ Йога' },
    { value: 'cultural', label: '🏛️ Культурный' },
    { value: 'nature', label: '🌿 Природа' },
    { value: 'spiritual_retreat', label: '✨ Духовный ретрит' },
    { value: 'temple_tour', label: '🛕 Храмовый тур' },
    { value: 'ashram_visit', label: '🏡 Посещение ашрама' },
    { value: 'other', label: '📌 Другое' }
];

const LANGUAGES = [
    { value: 'ru', label: '🇷🇺 Русский' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'hi', label: '🇮🇳 हिन्दी' },
    { value: 'bn', label: '🇧🇩 বাংলা' }
];

const DIFFICULTIES = [
    { value: 'easy', label: '😊 Легкий' },
    { value: 'moderate', label: '💪 Средний' },
    { value: 'challenging', label: '🔥 Сложный' }
];

const CURRENCIES = ['RUB', 'USD', 'INR', 'EUR'];

export default function EditYatraPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        theme: 'pilgrimage',
        startDate: '',
        endDate: '',
        startCity: '',
        endCity: '',
        startLatitude: 0,
        startLongitude: 0,
        endLatitude: 0,
        endLongitude: 0,
        maxParticipants: 10,
        language: 'ru',
        difficulty: 'moderate',
        requirements: '',
        cost: 0,
        currency: 'RUB'
    });

    useEffect(() => {
        fetchYatra();
    }, [params.id]);

    const fetchYatra = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/yatra/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch yatra');

            const data: Yatra = await response.json();
            setFormData({
                title: data.title || '',
                description: data.description || '',
                theme: data.theme || 'pilgrimage',
                startDate: data.startDate ? data.startDate.split('T')[0] : '',
                endDate: data.endDate ? data.endDate.split('T')[0] : '',
                startCity: data.startCity || '',
                endCity: data.endCity || '',
                startLatitude: data.startLatitude || 0,
                startLongitude: data.startLongitude || 0,
                endLatitude: data.endLatitude || 0,
                endLongitude: data.endLongitude || 0,
                maxParticipants: data.maxParticipants || 10,
                language: data.language || 'ru',
                difficulty: data.difficulty || 'moderate',
                requirements: data.requirements || '',
                cost: data.cost || 0,
                currency: data.currency || 'RUB'
            });
        } catch (err) {
            console.error('Error fetching yatra:', err);
            setError('Не удалось загрузить данные тура');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/yatra/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    startLatitude: parseFloat(String(formData.startLatitude)),
                    startLongitude: parseFloat(String(formData.startLongitude)),
                    endLatitude: parseFloat(String(formData.endLatitude)),
                    endLongitude: parseFloat(String(formData.endLongitude)),
                    maxParticipants: parseInt(String(formData.maxParticipants)),
                    cost: parseFloat(String(formData.cost)),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update yatra');
            }

            alert('Тур успешно обновлён!');
            router.push(`/yatra/${params.id}`);
        } catch (err: any) {
            console.error('Error updating yatra:', err);
            setError(err.message || 'Не удалось обновить тур');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Загрузка тура...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <Link href={`/yatra/${params.id}`} className="text-emerald-400 hover:text-emerald-300 text-sm mb-2 inline-flex items-center gap-1">
                    <span>←</span> Назад к туру
                </Link>
                <h1 className="text-3xl font-bold text-white mt-2 flex items-center gap-3">
                    <span className="text-emerald-400">✏️</span> Редактирование тура
                </h1>
                <p className="text-slate-400 mt-1">Измените данные тура и сохраните изменения</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <div className="text-red-400 font-semibold">Ошибка</div>
                        <div className="text-red-300 text-sm">{error}</div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-emerald-400">📝</span> Основная информация
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Название тура <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="Введите название тура..."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Описание <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={5}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                                placeholder="Опишите тур подробно..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Тема</label>
                            <select
                                name="theme"
                                value={formData.theme}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                {THEMES.map(theme => (
                                    <option key={theme.value} value={theme.value}>{theme.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Язык</label>
                            <select
                                name="language"
                                value={formData.language}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Сложность</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                {DIFFICULTIES.map(diff => (
                                    <option key={diff.value} value={diff.value}>{diff.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Макс. участников</label>
                            <input
                                type="number"
                                name="maxParticipants"
                                value={formData.maxParticipants}
                                onChange={handleChange}
                                min={1}
                                max={100}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-emerald-400">📅</span> Даты проведения
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Дата начала <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Дата окончания <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-emerald-400">🗺️</span> Маршрут
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Город начала <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="startCity"
                                value={formData.startCity}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="Например: Москва"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Город окончания <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="endCity"
                                value={formData.endCity}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                placeholder="Например: Вриндаван"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                                <p className="text-slate-400 text-sm">
                                    💡 Координаты опциональны. Если не указаны, будут определены автоматически по названию города.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Широта начала</label>
                            <input
                                type="number"
                                name="startLatitude"
                                value={formData.startLatitude}
                                onChange={handleChange}
                                step="0.000001"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Долгота начала</label>
                            <input
                                type="number"
                                name="startLongitude"
                                value={formData.startLongitude}
                                onChange={handleChange}
                                step="0.000001"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Широта окончания</label>
                            <input
                                type="number"
                                name="endLatitude"
                                value={formData.endLatitude}
                                onChange={handleChange}
                                step="0.000001"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Долгота окончания</label>
                            <input
                                type="number"
                                name="endLongitude"
                                value={formData.endLongitude}
                                onChange={handleChange}
                                step="0.000001"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Cost */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-emerald-400">💰</span> Стоимость
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Стоимость</label>
                            <input
                                type="number"
                                name="cost"
                                value={formData.cost}
                                onChange={handleChange}
                                min={0}
                                step="0.01"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Валюта</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                {CURRENCIES.map(curr => (
                                    <option key={curr} value={curr}>{curr}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Requirements */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-emerald-400">📋</span> Требования к участникам
                    </h2>

                    <textarea
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Опишите требования к участникам (опционально)..."
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-4">
                    <Link
                        href={`/yatra/${params.id}`}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                    >
                        Отмена
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <span>💾</span> Сохранить изменения
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
