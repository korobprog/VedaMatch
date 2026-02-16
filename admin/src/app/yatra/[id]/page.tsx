'use client';

import { getApiBaseURL } from '@/lib/api';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { YatraStatusBadge } from '@/components/yatra/YatraStatusBadge';
import { YatraApprovalModal } from '@/components/yatra/YatraApprovalModal';
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
    participantCount: number;
    maxParticipants: number;
    language: string;
    difficulty: string;
    organizer: {
        id: number;
        karmicName: string;
        spiritualName: string;
        email: string;
    };
    coverImageURL?: string;
    createdAt: string;
}

interface Participant {
    id: number;
    status: string;
    joinedAt: string;
    user: {
        id: number;
        karmicName: string;
        spiritualName: string;
        email: string;
    };
}

export default function YatraDetailPage() {
    const params = useParams();
    const [yatra, setYatra] = useState<Yatra | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showParticipants, setShowParticipants] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'cancel' | null>(null);

    useEffect(() => {
        fetchYatra();
    }, [params.id]);

    const fetchYatra = async () => {
        try {
            const yatraRes = await fetch(`${getApiBaseURL()}/yatra/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!yatraRes.ok) throw new Error('Failed to fetch yatra');
            const yatraData = await yatraRes.json();
            setYatra(yatraData);

            const participantsRes = await fetch(`${getApiBaseURL()}/admin/yatra/${params.id}/participants`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (participantsRes.ok) {
                const participantsData = await participantsRes.json();
                setParticipants(participantsData);
            }
        } catch (error) {
            console.error('Error fetching yatra:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveParticipant = async (participantId: number) => {
        if (!confirm('Are you sure you want to remove this participant?')) return;

        const reason = prompt('Reason for removal (required):');
        if (!reason) return;

        try {
            const response = await fetch(`${getApiBaseURL()}/admin/yatra/${params.id}/participants/${participantId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) throw new Error('Failed to remove participant');

            alert('Participant removed successfully');
            fetchYatra();
        } catch (error) {
            console.error('Error removing participant:', error);
            alert('Failed to remove participant');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Loading yatra...</p>
                </div>
            </div>
        );
    }

    if (!yatra) {
        return (
            <div className="p-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                    <p className="text-slate-300">Yatra not found</p>
                </div>
            </div>
        );
    }

    const approvedCount = participants.filter(p => p.status === 'approved').length;
    const pendingCount = participants.filter(p => p.status === 'pending').length;

    return (
        <>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Link href="/yatra" className="text-emerald-400 hover:text-emerald-300 text-sm mb-2 inline-flex items-center gap-1">
                            <span>←</span> Назад к турам
                        </Link>
                        <h1 className="text-3xl font-bold text-white mt-2">{yatra.title}</h1>
                        <p className="text-slate-400 mt-1 capitalize">{yatra.theme.replace(/_/g, ' ')} • {yatra.language.toUpperCase()}</p>
                    </div>
                    <YatraStatusBadge status={yatra.status} />
                </div>

                {/* Cover Image */}
                {yatra.coverImageURL && (
                    <div className="rounded-xl overflow-hidden border border-slate-700">
                        <img
                            src={yatra.coverImageURL}
                            alt={yatra.title}
                            className="w-full h-64 object-cover"
                        />
                    </div>
                )}

                {/* Main Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <span className="text-emerald-400">📝</span> Описание
                            </h2>
                            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{yatra.description}</p>
                        </div>

                        {/* Route */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-emerald-400">🗺️</span> Маршрут
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                                    <span className="text-2xl">📍</span>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wide">Начало</div>
                                        <div className="text-white font-semibold">{yatra.startCity}</div>
                                        {yatra.startLatitude !== 0 && (
                                            <div className="text-xs text-slate-500">{yatra.startLatitude}, {yatra.startLongitude}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <div className="text-slate-500">↓</div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                                    <span className="text-2xl">🏁</span>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wide">Конец</div>
                                        <div className="text-white font-semibold">{yatra.endCity}</div>
                                        {yatra.endLatitude !== 0 && (
                                            <div className="text-xs text-slate-500">{yatra.endLatitude}, {yatra.endLongitude}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="text-emerald-400">👥</span> Участники ({approvedCount}/{yatra.maxParticipants})
                                </h2>
                                <button
                                    onClick={() => setShowParticipants(!showParticipants)}
                                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                                >
                                    {showParticipants ? 'Скрыть' : 'Показать'} ({participants.length})
                                </button>
                            </div>

                            {pendingCount > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                                    <p className="text-amber-400 text-sm flex items-center gap-2">
                                        <span>⚠️</span> {pendingCount} ожидают подтверждения
                                    </p>
                                </div>
                            )}

                            {showParticipants && participants.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-700/50 border-b border-slate-600">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-slate-300 font-medium">Участник</th>
                                                <th className="px-4 py-3 text-left text-slate-300 font-medium">Статус</th>
                                                <th className="px-4 py-3 text-left text-slate-300 font-medium">Дата</th>
                                                <th className="px-4 py-3 text-right text-slate-300 font-medium">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {participants.map((p) => (
                                                <tr key={p.id} className="hover:bg-slate-700/30">
                                                    <td className="px-4 py-3">
                                                        <Link href={`/users/${p.user.id}`} className="text-emerald-400 hover:text-emerald-300">
                                                            {p.user.karmicName} {p.user.spiritualName}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                p.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                                    'bg-slate-500/20 text-slate-400'
                                                            }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">
                                                        {new Date(p.joinedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleRemoveParticipant(p.id)}
                                                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                                                        >
                                                            Удалить
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Info & Actions */}
                    <div className="space-y-6">
                        {/* Info Card */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-emerald-400">ℹ️</span> Детали
                            </h3>
                            <dl className="space-y-4">
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                    <dt className="text-xs text-slate-400 uppercase tracking-wide mb-1">Организатор</dt>
                                    <dd>
                                        <Link href={`/organizers/${yatra.organizer.id}`} className="text-emerald-400 hover:text-emerald-300 font-semibold">
                                            {yatra.organizer.karmicName} {yatra.organizer.spiritualName}
                                        </Link>
                                    </dd>
                                </div>
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                    <dt className="text-xs text-slate-400 uppercase tracking-wide mb-1">Даты проведения</dt>
                                    <dd className="text-white font-semibold">
                                        {new Date(yatra.startDate).toLocaleDateString('ru-RU')} — {new Date(yatra.endDate).toLocaleDateString('ru-RU')}
                                    </dd>
                                </div>
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                    <dt className="text-xs text-slate-400 uppercase tracking-wide mb-1">Сложность</dt>
                                    <dd className="text-white font-semibold capitalize">{yatra.difficulty}</dd>
                                </div>
                                <div className="bg-slate-700/30 rounded-lg p-3">
                                    <dt className="text-xs text-slate-400 uppercase tracking-wide mb-1">Дата создания</dt>
                                    <dd className="text-slate-300">{new Date(yatra.createdAt).toLocaleDateString('ru-RU')}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Admin Actions */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-emerald-400">⚡</span> Действия админа
                            </h3>
                            <div className="space-y-3">
                                {yatra.status === 'draft' && (
                                    <>
                                        <button
                                            onClick={() => setSelectedAction('approve')}
                                            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span>✅</span> Одобрить тур
                                        </button>
                                        <button
                                            onClick={() => setSelectedAction('reject')}
                                            className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span>❌</span> Отклонить тур
                                        </button>
                                    </>
                                )}
                                {(yatra.status === 'open' || yatra.status === 'active') && (
                                    <button
                                        onClick={() => setSelectedAction('cancel')}
                                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>🚫</span> Отменить тур
                                    </button>
                                )}
                                <Link
                                    href={`/yatra/${yatra.id}/edit`}
                                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>✏️</span> Редактировать
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedAction && (
                <YatraApprovalModal
                    yatra={yatra}
                    actionType={selectedAction}
                    onClose={(refresh) => {
                        setSelectedAction(null);
                        if (refresh) fetchYatra();
                    }}
                />
            )}
        </>
    );
}
