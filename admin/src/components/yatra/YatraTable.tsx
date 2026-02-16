'use client';

import { getApiBaseURL } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { YatraStatusBadge } from './YatraStatusBadge';
import { YatraApprovalModal } from './YatraApprovalModal';
import { getAuthToken } from '@/lib/auth';

interface Yatra {
    id: number;
    title: string;
    theme: string;
    status: string;
    startDate: string;
    endDate: string;
    startCity: string;
    endCity: string;
    participantCount: number;
    maxParticipants: number;
    organizer: {
        id: number;
        karmicName: string;
        spiritualName: string;
    };
    createdAt: string;
}

interface YatraTableProps {
    filters: any;
    onPageChange: (page: number) => void;
}

export function YatraTable({ filters, onPageChange }: YatraTableProps) {
    const [yatras, setYatras] = useState<Yatra[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYatra, setSelectedYatra] = useState<Yatra | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | null>(null);

    useEffect(() => {
        fetchYatras();
    }, [filters]);

    const fetchYatras = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                setError('Требуется авторизация. Пожалуйста, войдите в систему.');
                return;
            }

            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.theme) params.append('theme', filters.theme);
            if (filters.search) params.append('search', filters.search);
            if (filters.includeDrafts) params.append('include_drafts', 'true');
            if (filters.includeCancelled) params.append('include_cancelled', 'true');
            if (filters.includeCompleted) params.append('include_completed', 'true');
            if (filters.reportedOnly) params.append('reported_only', 'true');
            params.append('page', filters.page.toString());
            params.append('limit', '20');

            const response = await fetch(`${getApiBaseURL()}/admin/yatra?${params}`, {
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
            setYatras(data.yatras || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('Error fetching yatras:', err);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить список туров');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (yatra: Yatra, action: 'approve' | 'reject' | 'cancel') => {
        setSelectedYatra(yatra);
        setActionType(action);
    };

    const handleCloseModal = (refresh?: boolean) => {
        setSelectedYatra(null);
        setActionType(null);
        if (refresh) {
            fetchYatras();
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading yatras...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-semibold">Ошибка загрузки</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                    {error.includes('авторизация') || error.includes('Сессия') ? (
                        <a href="/login" className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">
                            Войти
                        </a>
                    ) : (
                        <button onClick={fetchYatras} className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">
                            Повторить
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Yatras ({total})
                    </h2>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tour
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Organizer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dates
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Participants
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {yatras.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No yatras found. Try adjusting your filters.
                                    </td>
                                </tr>
                            ) : (
                                yatras.map((yatra) => (
                                    <tr key={yatra.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/yatra/${yatra.id}`}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                {yatra.title}
                                            </Link>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {yatra.startCity} → {yatra.endCity}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {yatra.theme}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/organizers/${yatra.organizer.id}`}
                                                className="text-gray-900 hover:text-blue-600"
                                            >
                                                {yatra.organizer.karmicName} {yatra.organizer.spiritualName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div>{new Date(yatra.startDate).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-400">
                                                to {new Date(yatra.endDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {yatra.participantCount} / {yatra.maxParticipants}
                                        </td>
                                        <td className="px-6 py-4">
                                            <YatraStatusBadge status={yatra.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {yatra.status === 'draft' && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(yatra, 'approve')}
                                                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(yatra, 'reject')}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {(yatra.status === 'open' || yatra.status === 'active') && (
                                                <button
                                                    onClick={() => handleAction(yatra, 'cancel')}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <Link
                                                href={`/yatra/${yatra.id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 20 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            Showing {(filters.page - 1) * 20 + 1} - {Math.min(filters.page * 20, total)} of {total}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => onPageChange(filters.page - 1)}
                                disabled={filters.page === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => onPageChange(filters.page + 1)}
                                disabled={filters.page * 20 >= total}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedYatra && actionType && (
                <YatraApprovalModal
                    yatra={selectedYatra}
                    actionType={actionType}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}
