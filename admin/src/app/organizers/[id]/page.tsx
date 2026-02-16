'use client';

import { getApiBaseURL } from '@/lib/api';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { YatraStatusBadge } from '@/components/yatra/YatraStatusBadge';
import { BlockOrganizerModal } from '../../../components/yatra/BlockOrganizerModal';
import { getAuthToken } from '@/lib/auth';

interface OrganizerStats {
    userId: number;
    name: string;
    email: string;
    totalYatras: number;
    draftYatras: number;
    openYatras: number;
    activeYatras: number;
    completedYatras: number;
    cancelledYatras: number;
    averageRating: number;
    totalReviews: number;
    totalParticipants: number;
    reportsCount: number;
    isBlocked: boolean;
    blockReason?: string;
    blockExpiry?: string;
}

interface Yatra {
    id: number;
    title: string;
    theme: string;
    status: string;
    startDate: string;
    endDate: string;
    participantCount: number;
    maxParticipants: number;
    createdAt: string;
}

export default function OrganizerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [stats, setStats] = useState<OrganizerStats | null>(null);
    const [yatras, setYatras] = useState<Yatra[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBlockModal, setShowBlockModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, [params.id]);

    const fetchData = async () => {
        try {
            // Fetch organizer stats
            const statsRes = await fetch(`${getApiBaseURL()}/admin/organizers/${params.id}/stats`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!statsRes.ok) throw new Error('Failed to fetch stats');
            const statsData = await statsRes.json();
            setStats(statsData);

            // Fetch organizer's yatras
            const yatrasRes = await fetch(`${getApiBaseURL()}/admin/yatra?organizer_id=${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (yatrasRes.ok) {
                const yatrasData = await yatrasRes.json();
                setYatras(yatrasData.yatras || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async () => {
        if (!confirm('Are you sure you want to unblock this organizer?')) return;

        try {
            const response = await fetch(`${getApiBaseURL()}/admin/organizers/${params.id}/block`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) throw new Error('Failed to unblock');

            alert('Organizer unblocked successfully!');
            fetchData();
        } catch (error) {
            console.error('Error unblocking:', error);
            alert('Failed to unblock organizer');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading organizer...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600">Organizer not found</p>
                    <Link href="/organizers" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                        ← Back to Organizers
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Link href="/organizers" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
                            ← Back to Organizers
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">{stats.name}</h1>
                        <p className="text-gray-600 mt-1">{stats.email}</p>
                    </div>
                    {stats.isBlocked ? (
                        <span className="px-4 py-2 text-sm font-semibold rounded-full bg-red-100 text-red-700">
                            🚫 BLOCKED
                        </span>
                    ) : (
                        <span className="px-4 py-2 text-sm font-semibold rounded-full bg-green-100 text-green-700">
                            ✅ ACTIVE
                        </span>
                    )}
                </div>

                {/* Block Status */}
                {stats.isBlocked && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="font-semibold text-red-900 mb-2">🚫 Blocked Organizer</h3>
                        <p className="text-sm text-red-800 mb-1">
                            <strong>Reason:</strong> {stats.blockReason || 'No reason provided'}
                        </p>
                        {stats.blockExpiry && (
                            <p className="text-sm text-red-800">
                                <strong>Expires:</strong> {new Date(stats.blockExpiry).toLocaleString()}
                            </p>
                        )}
                    </div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Total Tours</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.totalYatras}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Active</div>
                        <div className="text-2xl font-bold text-green-600">{stats.activeYatras}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Completed</div>
                        <div className="text-2xl font-bold text-purple-600">{stats.completedYatras}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Avg Rating</div>
                        <div className="text-2xl font-bold text-yellow-600">
                            ⭐ {stats.averageRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">{stats.totalReviews} reviews</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Participants</div>
                        <div className="text-2xl font-bold text-indigo-600">{stats.totalParticipants}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-sm text-gray-600">Reports</div>
                        <div className="text-2xl font-bold text-red-600">{stats.reportsCount}</div>
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Tour Status Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Draft</div>
                            <div className="text-lg font-semibold">{stats.draftYatras}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Open</div>
                            <div className="text-lg font-semibold">{stats.openYatras}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Active</div>
                            <div className="text-lg font-semibold">{stats.activeYatras}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Completed</div>
                            <div className="text-lg font-semibold">{stats.completedYatras}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Cancelled</div>
                            <div className="text-lg font-semibold">{stats.cancelledYatras}</div>
                        </div>
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Actions</h2>
                    <div className="flex flex-wrap gap-3">
                        {stats.isBlocked ? (
                            <button
                                onClick={handleUnblock}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                                ✅ Unblock Organizer
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowBlockModal(true)}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                                🚫 Block Organizer
                            </button>
                        )}
                        <Link
                            href={`/users/${stats.userId}`}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            👤 View User Profile
                        </Link>
                        {stats.reportsCount > 0 && (
                            <Link
                                href={`/yatra/reports?target_id=${stats.userId}&target_type=organizer`}
                                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                            >
                                ⚠️ View Reports ({stats.reportsCount})
                            </Link>
                        )}
                    </div>
                </div>

                {/* Tours List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-xl font-bold text-gray-900">
                            All Tours ({yatras.length})
                        </h2>
                    </div>

                    {yatras.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No tours found for this organizer.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Tour
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Dates
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Participants
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {yatras.map((yatra) => (
                                        <tr key={yatra.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/yatra/${yatra.id}`}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    {yatra.title}
                                                </Link>
                                                <div className="text-xs text-gray-500 mt-1">{yatra.theme}</div>
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
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/yatra/${yatra.id}`}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Block Modal */}
            {showBlockModal && (
                <BlockOrganizerModal
                    organizerId={stats.userId}
                    organizerName={stats.name}
                    onClose={(refresh?: boolean) => {
                        setShowBlockModal(false);
                        if (refresh) fetchData();
                    }}
                />
            )}
        </>
    );
}
